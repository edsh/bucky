import type { Advisory, CalculationStep, PohSourceReference } from '../types.js';
import { PohCalculationError, outsideAirTemperatureOutOfRange } from '../errors.js';
import { interpolateGrid } from '../interpolate.js';
import {
  TAKEOFF_TABLE_ID,
  getObstacleLabel,
  getSourceReference,
  getTable,
  getTableNote
} from '../tables.js';
import { formatNumber, formatQuantity } from '../format.js';
import {
  ICAO_STANDARD_ATMOSPHERE_SOURCE,
  type PressureAltitudeResult
} from '../atmosphere/pressureAltitude.js';
import type { OutsideAirTemperatureResult } from '../atmosphere/temperature.js';
import { checkPressureAltitude } from '../fuel/input.js';
import { PREFLIGHT_CHECK_NOTICE } from '../fuel/notices.js';
import {
  MAX_TAILWIND_KT,
  OAT_KEY,
  PRESSURE_ALTITUDE_KEY,
  getTakeoffInputDomain,
  takeoffDistanceSchema,
  type TakeoffDistanceInput
} from './input.js';

/**
 * Roll- und Startstrecke nach Abb. 5-1a, einschließlich der Anmerkungen 2
 * bis 4.
 *
 * Das Modul liegt neben `fuel/` und nicht darin: Beide Rechnungen teilen keine
 * Zwischengrößen, sondern nur Eingaben — und die kommen von außen herein.
 */

/** Anteil, um den Anmerkung 2 die Strecken je Stufe ändert. */
const WIND_STEP_PCT = 10;

/** Gegenwindstufe der Anmerkung 2 in kt. */
const HEADWIND_STEP_KT = 9;

/** Rückenwindstufe der Anmerkung 2 in kt. */
const TAILWIND_STEP_KT = 2;

/**
 * Deckel der Gegenwindgutschrift. Anmerkung 2 nennt ihn nicht — sie schreibt
 * die Stufen ohne Ende fort. Geradlinig weitergerechnet wäre die Startstrecke
 * bei 90 kt Gegenwind null, und das ist keine Aussage, die das Handbuch trifft.
 * Bei der Hälfte zu enden ist die konservative Auslegung.
 */
const MAX_HEADWIND_CREDIT_PCT = 50;

/** Anmerkung 3: trockene Grasbahn. */
const DRY_GRASS_PCT = 15;

/** Anmerkung 4: feuchte Bahn, aufgeweichter Untergrund oder Schnee. */
const WET_OR_SNOW_PCT = 20;

export interface TakeoffDistanceResult {
  readonly pressureAltitude: PressureAltitudeResult;
  readonly outsideAirTemperature: OutsideAirTemperatureResult;
  /** Startlauf laut Tabelle in m, vor allen Zuschlägen. */
  readonly tableGroundRollM: number;
  /** Strecke über das Hindernis in m, vor allen Zuschlägen. */
  readonly tableOverObstacleM: number;
  /** Anteil aus Anmerkung 2; negativ bei Gegenwind, positiv bei Rückenwind. */
  readonly windAdjustmentPct: number;
  /** Wahr, sobald der Deckel der Gegenwindgutschrift greift. */
  readonly windAdjustmentCapped: boolean;
  readonly windAdjustedGroundRollM: number;
  readonly windAdjustedOverObstacleM: number;
  /** Anteil aus den Anmerkungen 3 und 4: 0, 15, 20 oder 35. */
  readonly surfaceAllowancePct: number;
  /** Derselbe Anteil **des Startlaufs**, in m — auf beide Strecken derselbe. */
  readonly surfaceAllowanceM: number;
  readonly groundRollM: number;
  readonly overObstacleM: number;
  /** Bezeichnung des Hindernisses im Wortlaut der Digitalisierung. */
  readonly obstacleLabel: string;
  /** Wahr bei gesetztem Zuschlag nach Anmerkung 4. */
  readonly isMinimumValue: boolean;
  readonly steps: readonly CalculationStep[];
  readonly source: PohSourceReference;
  /** Bedingungen, unter denen die Tabelle gilt, im Wortlaut. */
  readonly conditions: readonly string[];
  /** Die vier Anmerkungen des Handbuchs im Wortlaut. */
  readonly notes: readonly Advisory[];
  /** Hinweise zur Rechnung, etwa der Mindestwert aus Anmerkung 4. */
  readonly advisories: readonly Advisory[];
  readonly preflightCheckNotice: string;
}

/**
 * Der Anteil aus Anmerkung 2, anteilig statt in vollen Stufen.
 *
 * Die Stufen werden **addiert** und nicht multipliziert: 18 kt Gegenwind
 * ergeben 20 %, nicht 19 %. Das folgt dem Wortlaut „für je 9 Knoten … um 10 %
 * verringern" — er beschreibt eine wiederholte Verringerung um denselben
 * Betrag, nicht eine wiederholte Verringerung des jeweils schon verringerten
 * Werts.
 */
function windAdjustmentPercent(windComponentKt: number): {
  readonly pct: number;
  readonly capped: boolean;
} {
  if (windComponentKt === 0) {
    return { pct: 0, capped: false };
  }
  if (windComponentKt < 0) {
    const tailwindKt = -windComponentKt;
    return { pct: (tailwindKt / TAILWIND_STEP_KT) * WIND_STEP_PCT, capped: false };
  }
  const credit = (windComponentKt / HEADWIND_STEP_KT) * WIND_STEP_PCT;
  return credit > MAX_HEADWIND_CREDIT_PCT
    ? { pct: -MAX_HEADWIND_CREDIT_PCT, capped: true }
    : { pct: -credit, capped: false };
}

/**
 * Rechnet Startlauf und Strecke über das Hindernis aus Abb. 5-1a.
 *
 * Druckhöhe und Umgebungstemperatur kommen als fertige Ergebnisobjekte
 * herein. Sie hier noch einmal zu bilden hieße, dieselbe Norm ein zweites Mal
 * anzuwenden — und genau das schließt Prinzip IV aus.
 *
 * Rundet nicht (C-03). Extrapoliert nicht (Prinzip I).
 */
export function computeTakeoffDistance(input: unknown): TakeoffDistanceResult {
  const parsed = takeoffDistanceSchema.safeParse(input);
  if (!parsed.success) {
    throw new PohCalculationError(
      'INVALID_INPUT',
      `Die Eingabe für die Startstrecke ist unvollständig oder nicht als Zahl deutbar: ${parsed.error.issues
        .map((issue) => `${issue.path.join('.')} (${issue.message})`)
        .join(', ')}`
    );
  }
  const conditions = parsed.data as TakeoffDistanceInput;
  const { pressureAltitude, outsideAirTemperature } = conditions;
  const domain = getTakeoffInputDomain();

  // Reihenfolge: erst die Höhe, dann die Temperatur, dann der Wind. Sie folgt
  // der Ursachenkette — die Temperatur hängt an der Druckhöhe, der Wind an
  // nichts davon. Eine andere Reihenfolge nennte im Zweifel nicht die Ursache,
  // sondern nur den ersten Auffälligen.
  checkPressureAltitude('departureElevationFt', pressureAltitude, domain.pressureAltitudeFt);

  const oatC = outsideAirTemperature.outsideAirTemperatureC;
  if (oatC < domain.outsideAirTemperatureC.min || oatC > domain.outsideAirTemperatureC.max) {
    throw outsideAirTemperatureOutOfRange(
      'isaDeviationC',
      oatC,
      domain.outsideAirTemperatureC,
      pressureAltitude.pressureAltitudeFt,
      outsideAirTemperature.isaDeviationC,
      TAKEOFF_TABLE_ID
    );
  }

  if (conditions.windComponentKt < -MAX_TAILWIND_KT) {
    throw new PohCalculationError(
      'OUT_OF_RANGE',
      `Anmerkung 2 deckt Rückenwind nur bis ${formatQuantity(MAX_TAILWIND_KT, 0, 'kt')} ab; hier sind es ${formatQuantity(-conditions.windComponentKt, 0, 'kt')}. Darüber trifft das Flughandbuch keine Aussage, und der Zuschlag wird nicht fortgeschrieben.`,
      {
        field: 'windComponentKt',
        actual: conditions.windComponentKt,
        allowedRange: domain.windComponentKt,
        tableId: TAKEOFF_TABLE_ID
      }
    );
  }
  if (conditions.windComponentKt > domain.windComponentKt.max) {
    throw new PohCalculationError(
      'OUT_OF_RANGE',
      'Die Windkomponente liegt außerhalb des vorgesehenen Bereichs.',
      {
        field: 'windComponentKt',
        actual: conditions.windComponentKt,
        allowedRange: domain.windComponentKt
      }
    );
  }

  const source = getSourceReference(TAKEOFF_TABLE_ID);
  const lookup = interpolateGrid({
    tableId: TAKEOFF_TABLE_ID,
    axes: [
      {
        key: PRESSURE_ALTITUDE_KEY,
        value: pressureAltitude.pressureAltitudeFt,
        field: 'departureElevationFt',
        unit: 'ft'
      },
      {
        key: OAT_KEY,
        value: oatC,
        field: 'isaDeviationC',
        unit: '°C'
      }
    ],
    valueKeys: ['ground_roll', 'over_obstacle']
  });

  const tableGroundRollM = lookup.values['ground_roll'] as number;
  const tableOverObstacleM = lookup.values['over_obstacle'] as number;

  const wind = windAdjustmentPercent(conditions.windComponentKt);
  const windFactor = 1 + wind.pct / 100;
  const windAdjustedGroundRollM = tableGroundRollM * windFactor;
  const windAdjustedOverObstacleM = tableOverObstacleM * windFactor;

  // Additiv auf dieselbe Bezugsgröße, nicht 1,15 × 1,20: Beide Anmerkungen
  // beziehen ihren Aufschlag ausdrücklich auf „den Wert Startlauf". Nacheinander
  // zu multiplizieren bezöge den zweiten Zuschlag auf einen Startlauf, den das
  // Handbuch nicht meint — 35 % statt 38 %.
  const surfaceAllowancePct =
    (conditions.dryGrassRunway ? DRY_GRASS_PCT : 0) +
    (conditions.wetOrSnowRunway ? WET_OR_SNOW_PCT : 0);

  // Der Betrag wird **einmal** aus dem Startlauf gebildet und dann auf beide
  // Strecken geschlagen: Der zusätzlich gerollte Weg verschiebt den
  // Abhebepunkt, und damit verschiebt sich die gesamte Strecke um genau
  // diesen Betrag.
  const surfaceAllowanceM = (windAdjustedGroundRollM * surfaceAllowancePct) / 100;

  const groundRollM = windAdjustedGroundRollM + surfaceAllowanceM;
  const overObstacleM = windAdjustedOverObstacleM + surfaceAllowanceM;

  const steps: CalculationStep[] = [
    {
      id: 'takeoff.pressureAltitude',
      label: 'Druckhöhe des Startplatzes',
      inputs: {
        elevationFt: { value: pressureAltitude.elevationFt, unit: 'ft' },
        qnhHpa: { value: pressureAltitude.qnhHpa, unit: 'hPa' }
      },
      results: { pressureAltitudeFt: { value: pressureAltitude.pressureAltitudeFt, unit: 'ft' } },
      anchors: [],
      explanation: `${formatQuantity(pressureAltitude.elevationFt, 0, 'ft')} über dem Meeresspiegel bei einem QNH von ${formatQuantity(pressureAltitude.qnhHpa, 2, 'hPa')} ergeben ${formatQuantity(pressureAltitude.pressureAltitudeFt, 0, 'ft')} Druckhöhe. Gerechnet nach der barometrischen Höhenformel der ICAO-Standardatmosphäre: ${ICAO_STANDARD_ATMOSPHERE_SOURCE.formula}. Diese Größe stammt nicht aus dem Flughandbuch.`,
      sources: [ICAO_STANDARD_ATMOSPHERE_SOURCE]
    },
    {
      id: 'takeoff.outsideAirTemperature',
      label: 'Umgebungstemperatur am Startplatz',
      inputs: {
        pressureAltitudeFt: { value: pressureAltitude.pressureAltitudeFt, unit: 'ft' },
        isaDeviationC: { value: outsideAirTemperature.isaDeviationC, unit: '°C' }
      },
      results: {
        standardTemperatureC: {
          value: outsideAirTemperature.standardTemperatureC,
          unit: '°C'
        },
        outsideAirTemperatureC: { value: oatC, unit: '°C' }
      },
      anchors: [],
      explanation: `Die Tabelle ist nach der tatsächlichen Umgebungstemperatur aufgeschlüsselt, nicht nach der Abweichung von der Norm. In ${formatQuantity(pressureAltitude.pressureAltitudeFt, 0, 'ft')} Druckhöhe beträgt die Normtemperatur ${formatQuantity(outsideAirTemperature.standardTemperatureC, 1, '°C')}; mit ${formatQuantity(outsideAirTemperature.isaDeviationC, 0, '°C')} Abweichung ergeben sich ${formatQuantity(oatC, 1, '°C')}. Auch diese Größe stammt aus der Standardatmosphäre und nicht aus dem Flughandbuch.`,
      sources: [ICAO_STANDARD_ATMOSPHERE_SOURCE]
    },
    {
      id: 'takeoff.tableLookup',
      label: 'Roll- und Startstrecke bei Druckhöhe und Temperatur',
      inputs: {
        pressureAltitudeFt: { value: pressureAltitude.pressureAltitudeFt, unit: 'ft' },
        outsideAirTemperatureC: { value: oatC, unit: '°C' }
      },
      results: {
        groundRollM: { value: tableGroundRollM, unit: 'm' },
        overObstacleM: { value: tableOverObstacleM, unit: 'm' }
      },
      anchors: lookup.anchors,
      explanation: `Aus ${source.figure} abgelesen. Weil sowohl die Druckhöhe als auch die Temperatur zwischen Stützstellen liegen können, wird über beide Achsen zugleich interpoliert; die verwendeten Eckwerte stehen oben. Die Werte gelten für die Bedingungen der Tabelle — befestigte, ebene, trockene Bahn bei Windstille. Alles Weitere sind die Anmerkungen.`,
      sources: [source]
    }
  ];

  if (wind.pct !== 0) {
    steps.push({
      id: 'takeoff.windAdjustment',
      label: 'Zuschlag für Wind nach Anmerkung 2',
      inputs: {
        windComponentKt: { value: conditions.windComponentKt, unit: 'kt' },
        groundRollM: { value: tableGroundRollM, unit: 'm' },
        overObstacleM: { value: tableOverObstacleM, unit: 'm' }
      },
      results: {
        adjustmentPct: { value: wind.pct, unit: '%' },
        groundRollM: { value: windAdjustedGroundRollM, unit: 'm' },
        overObstacleM: { value: windAdjustedOverObstacleM, unit: 'm' }
      },
      anchors: [],
      explanation: windExplanation(conditions.windComponentKt, wind),
      sources: [source]
    });
  }

  if (surfaceAllowancePct > 0) {
    steps.push({
      id: 'takeoff.surfaceAllowance',
      label: 'Zuschlag für den Zustand der Bahn nach Anmerkung 3 und 4',
      inputs: {
        groundRollM: { value: windAdjustedGroundRollM, unit: 'm' },
        dryGrassPct: { value: conditions.dryGrassRunway ? DRY_GRASS_PCT : 0, unit: '%' },
        wetOrSnowPct: { value: conditions.wetOrSnowRunway ? WET_OR_SNOW_PCT : 0, unit: '%' }
      },
      results: {
        allowancePct: { value: surfaceAllowancePct, unit: '%' },
        allowanceM: { value: surfaceAllowanceM, unit: 'm' },
        groundRollM: { value: groundRollM, unit: 'm' },
        overObstacleM: { value: overObstacleM, unit: 'm' }
      },
      anchors: [],
      explanation: surfaceExplanation(conditions, windAdjustedGroundRollM, surfaceAllowanceM),
      sources: [source]
    });
  }

  const advisories: Advisory[] = [];
  if (conditions.wetOrSnowRunway) {
    advisories.push({
      id: 'takeoff.minimumValue',
      text: `Anmerkung 4 nennt ${formatQuantity(WET_OR_SNOW_PCT, 0, '%')} als Mindestzuschlag. Das Ergebnis ist damit ein Mindestwert: Je nach Zustand der Bahn ist mehr anzusetzen.`,
      source
    });
  }
  if (wind.capped) {
    advisories.push({
      id: 'takeoff.windCapped',
      text: `Die Gegenwindgutschrift ist bei ${formatQuantity(MAX_HEADWIND_CREDIT_PCT, 0, '%')} begrenzt. Anmerkung 2 schreibt ihre Stufen ohne Ende fort; geradlinig weitergerechnet ergäbe sich hier eine größere Gutschrift, die das Flughandbuch so nicht ausspricht.`
    });
  }

  const table = getTable(TAKEOFF_TABLE_ID);

  return {
    pressureAltitude,
    outsideAirTemperature,
    tableGroundRollM,
    tableOverObstacleM,
    windAdjustmentPct: wind.pct,
    windAdjustmentCapped: wind.capped,
    windAdjustedGroundRollM,
    windAdjustedOverObstacleM,
    surfaceAllowancePct,
    surfaceAllowanceM,
    groundRollM,
    overObstacleM,
    obstacleLabel: getObstacleLabel(TAKEOFF_TABLE_ID),
    isMinimumValue: conditions.wetOrSnowRunway,
    steps,
    source,
    conditions: table.conditions,
    notes: table.notes.map((_note, index) => ({
      id: `takeoff.note${index + 1}`,
      text: getTableNote(TAKEOFF_TABLE_ID, index + 1),
      source
    })),
    advisories,
    preflightCheckNotice: PREFLIGHT_CHECK_NOTICE
  };
}

function windExplanation(
  windComponentKt: number,
  wind: { readonly pct: number; readonly capped: boolean }
): string {
  if (windComponentKt < 0) {
    const tailwindKt = -windComponentKt;
    return `${formatQuantity(tailwindKt, 0, 'kt')} Rückenwind: Anmerkung 2 nennt ${formatQuantity(WIND_STEP_PCT, 0, '%')} je ${formatQuantity(TAILWIND_STEP_KT, 0, 'kt')}, hier also ${formatNumber(wind.pct, 1)}\u00a0% mehr auf beide Strecken. Zwischenwerte werden anteilig gerechnet, mehrere Stufen addiert.`;
  }
  const grund = `${formatQuantity(windComponentKt, 0, 'kt')} Gegenwind: Anmerkung 2 nennt ${formatQuantity(WIND_STEP_PCT, 0, '%')} je ${formatQuantity(HEADWIND_STEP_KT, 0, 'kt')}`;
  return wind.capped
    ? `${grund}. Geradlinig ergäben sich ${formatNumber((windComponentKt / HEADWIND_STEP_KT) * WIND_STEP_PCT, 1)}\u00a0%; die Gutschrift bleibt bei ${formatQuantity(MAX_HEADWIND_CREDIT_PCT, 0, '%')} stehen, weil das Flughandbuch für stärkeren Wind keine Aussage trifft.`
    : `${grund}, hier also ${formatNumber(-wind.pct, 1)}\u00a0% weniger auf beide Strecken. Zwischenwerte werden anteilig gerechnet, mehrere Stufen addiert.`;
}

function surfaceExplanation(
  conditions: TakeoffDistanceInput,
  referenceGroundRollM: number,
  allowanceM: number
): string {
  const teile: string[] = [];
  if (conditions.dryGrassRunway) {
    teile.push(`Anmerkung 3 nennt ${formatQuantity(DRY_GRASS_PCT, 0, '%')} für trockene Grasbahn`);
  }
  if (conditions.wetOrSnowRunway) {
    teile.push(
      `Anmerkung 4 nennt mindestens ${formatQuantity(WET_OR_SNOW_PCT, 0, '%')} für feuchte Bahn, aufgeweichten Untergrund oder Schnee`
    );
  }
  const zusammen =
    conditions.dryGrassRunway && conditions.wetOrSnowRunway
      ? ' Beide beziehen sich auf denselben Wert und werden deshalb addiert, nicht nacheinander multipliziert.'
      : '';
  return `${teile.join('; ')}. Beide Anmerkungen beziehen ihren Aufschlag ausdrücklich auf den Startlauf: ${formatQuantity(referenceGroundRollM, 0, 'm')} ergeben ${formatQuantity(allowanceM, 0, 'm')}, und dieser Betrag wird auf beide Strecken geschlagen — der zusätzlich gerollte Weg verschiebt den Abhebepunkt und damit die gesamte Strecke.${zusammen}`;
}
