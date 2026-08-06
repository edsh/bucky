import { z } from 'zod';
import type { InputDomain, NumericRange, PowerSettingAvailability } from '../types.js';
import { PohCalculationError, outOfRange, pressureAltitudeOutOfRange } from '../errors.js';
import { toPressureAltitude, type PressureAltitudeResult } from '../atmosphere/pressureAltitude.js';
import { CLIMB_TABLE_ID, CRUISE_TABLE_ID, getTable } from '../tables.js';

/** Das vom Piloten erfasste Flugvorhaben. Alle Felder sind Pflicht (FR-008). */
export interface FlightPlanInput {
  /** Platzhöhe über dem Meeresspiegel in ft, wie sie auf der Karte steht. */
  readonly departureElevationFt: number;
  /** Reiseflughöhe über dem Meeresspiegel in ft. */
  readonly cruiseAltitudeAmslFt: number;
  /** Luftdruck auf Meereshöhe in hPa aus dem Wetterbericht. */
  readonly qnhHpa: number;
  /** Gesamtflugstrecke in NM. */
  readonly distanceNm: number;
  /** Lasteinstellung in Prozent. */
  readonly powerSettingPct: number;
  /** Abweichung von der ISA-Temperatur in °C. */
  readonly isaDeviationC: number;
  /** Windkomponente in kt, positiv = Gegenwind. */
  readonly windComponentKt: number;
}

/**
 * Grenzen, die nicht aus den Tabellen ablesbar sind, sondern in der
 * Spezifikation stehen (`data-model.md`, Abschnitt Flugvorhaben).
 */
const DEPARTURE_ELEVATION_RANGE: NumericRange = { min: 0, max: 10000, unit: 'ft', step: 10 };
const CRUISE_ALTITUDE_AMSL_RANGE: NumericRange = { min: 0, max: 18000, unit: 'ft', step: 100 };
const QNH_RANGE: NumericRange = { min: 950, max: 1050, unit: 'hPa', step: 1 };
/**
 * Die obere Grenze der Strecke ist großzügig: Die größte Reichweite der Tabelle
 * liegt darunter, ein längerer Flug scheitert ohnehin an der ausfliegbaren
 * Menge — und genau diese Rückmeldung ist erwünscht. Ein Regler braucht anders
 * als ein Textfeld aber ein Ende.
 */
const DISTANCE_RANGE: NumericRange = { min: 1, max: 900, unit: 'NM', step: 1 };
const ISA_DEVIATION_RANGE: NumericRange = { min: -30, max: 40, unit: '°C', step: 1 };
const WIND_COMPONENT_RANGE: NumericRange = { min: -50, max: 50, unit: 'kt', step: 1 };

const flightPlanSchema = z.object({
  departureElevationFt: z.number().finite(),
  cruiseAltitudeAmslFt: z.number().finite(),
  qnhHpa: z.number().finite(),
  distanceNm: z.number().finite(),
  powerSettingPct: z.number().finite(),
  isaDeviationC: z.number().finite(),
  windComponentKt: z.number().finite()
});

/** Das Höhenraster einer Tabelle, aufsteigend und ohne Wiederholungen. */
function pressureAltitudes(tableId: string): readonly number[] {
  const values = new Set<number>();
  for (const row of getTable(tableId).rows) {
    const altitude = row['pressure_altitude_ft'];
    if (typeof altitude === 'number') {
      values.add(altitude);
    }
  }
  return [...values].sort((a, b) => a - b);
}

/**
 * Die je Druckhöhe belegten Lasteinstellungen der Reiseleistungstabelle.
 * Abgeleitet, nicht fest verdrahtet: ändert sich die Datengrundlage, ändert
 * sich das Raster mit.
 */
export function getPowerSettingsByPressureAltitude(): readonly PowerSettingAvailability[] {
  const byAltitude = new Map<number, Set<number>>();
  for (const row of getTable(CRUISE_TABLE_ID).rows) {
    const altitude = row['pressure_altitude_ft'];
    const power = row['power_setting_pct'];
    if (typeof altitude !== 'number' || typeof power !== 'number') {
      continue;
    }
    const settings = byAltitude.get(altitude) ?? new Set<number>();
    settings.add(power);
    byAltitude.set(altitude, settings);
  }
  return [...byAltitude.entries()]
    .sort(([a], [b]) => a - b)
    .map(([pressureAltitudeFt, settings]) => ({
      pressureAltitudeFt,
      powerSettingsPct: [...settings].sort((a, b) => a - b)
    }));
}

/**
 * Das Höhenraster allein der Reiseleistungstabelle.
 *
 * Die Reiseleistungs-Übersicht (Feature 006) verwendet die Steigflugtabelle
 * nicht und darf deshalb nicht an deren Rand scheitern. Beide Raster reichen
 * derzeit von 0 bis 18 000 ft — die Unterscheidung ändert heute also keine
 * Zahl. Sie hält aber die Abhängigkeit dort, wo sie hingehört, falls sich eine
 * der beiden Tabellen einmal ändert.
 */
export function getCruisePressureAltitudeRange(): NumericRange {
  const grid = pressureAltitudes(CRUISE_TABLE_ID);
  return {
    min: grid[0] as number,
    max: grid[grid.length - 1] as number,
    unit: 'ft',
    step: 100
  };
}

/**
 * Gemeinsames Höhenraster von Steigflug- und Reiseleistungstabelle. Seit
 * Feature 004 begrenzt es nicht mehr die Eingabe, sondern die aus Höhe und QNH
 * **errechnete** Druckhöhe (FR-006). Die Eingabegrenzen beziehen sich auf die
 * Höhe über dem Meeresspiegel und können daher nicht aus dem Raster stammen.
 */
export function getPressureAltitudeRange(): NumericRange {
  const climb = pressureAltitudes(CLIMB_TABLE_ID);
  const cruise = pressureAltitudes(CRUISE_TABLE_ID);
  const min = Math.max(climb[0] as number, cruise[0] as number);
  const max = Math.min(climb[climb.length - 1] as number, cruise[cruise.length - 1] as number);
  return { min, max, unit: 'ft', step: 100 };
}

/**
 * Schrittweite der Lasteinstellung, aus dem Raster der Tabelle abgeleitet und
 * nicht angenommen. Ein festes Literal war hier zunächst 5 — das Handbuch führt
 * jedoch nur 50, 60, 70, 80, 90 und 100 %. Solange die Lasteinstellung eine
 * Auswahlliste war, fiel das nicht auf; als Regler böte sie sonst Werte an, die
 * in keiner Tabelle stehen und die der Kern anschließend ablehnen müsste.
 *
 * Ist das Raster ungleichmäßig, wird 1 zurückgegeben: Ein Regler, der Werte
 * überspringt, wäre irreführender als einer, der zu feine anbietet — und der
 * Kern prüft ohnehin gegen die Liste der tatsächlich verfügbaren Werte.
 */
function powerSettingStep(settings: readonly number[]): number {
  const eindeutig = [...new Set(settings)].sort((a, b) => a - b);
  const abstaende = eindeutig.slice(1).map((wert, index) => wert - (eindeutig[index] as number));
  const erster = abstaende[0];
  return erster !== undefined && abstaende.every((abstand) => abstand === erster) ? erster : 1;
}

/**
 * Die Wertebereiche der Eingabe, aus der Datengrundlage abgeleitet. Adapter
 * bauen ihre Formulare daraus, statt Grenzen selbst zu kennen (Prinzip IV).
 */
export function getFuelPlanInputDomain(): InputDomain {
  const availability = getPowerSettingsByPressureAltitude();
  const allSettings = availability.flatMap((entry) => [...entry.powerSettingsPct]);
  return {
    departureElevationFt: DEPARTURE_ELEVATION_RANGE,
    cruiseAltitudeAmslFt: CRUISE_ALTITUDE_AMSL_RANGE,
    qnhHpa: QNH_RANGE,
    distanceNm: DISTANCE_RANGE,
    powerSettingPct: {
      min: Math.min(...allSettings),
      max: Math.max(...allSettings),
      unit: '%',
      step: powerSettingStep(allSettings)
    },
    isaDeviationC: ISA_DEVIATION_RANGE,
    windComponentKt: WIND_COMPONENT_RANGE,
    powerSettingsByPressureAltitude: availability
  };
}

/**
 * Die beiden Stützstellen der Reiseleistungstabelle, die eine Höhe
 * einschließen. Bei exaktem Treffer beide gleich.
 */
export function bracketingAltitudes(altitude: number): readonly [number, number] {
  const grid = getPowerSettingsByPressureAltitude().map((entry) => entry.pressureAltitudeFt);
  let lower = grid[0] as number;
  let upper = grid[grid.length - 1] as number;
  for (const value of grid) {
    if (value <= altitude) {
      lower = value;
    }
    if (value >= altitude) {
      upper = value;
      break;
    }
  }
  return [lower, upper];
}

export function checkRange(field: keyof FlightPlanInput, value: number, range: NumericRange): void {
  if (value < range.min || value > range.max) {
    throw outOfRange(field, value, range);
  }
}

/**
 * Ein geprüftes Flugvorhaben samt der beiden daraus errechneten Druckhöhen.
 *
 * Die Umrechnung gehört in die Prüfung und nicht dahinter: Ob eine
 * Lasteinstellung überhaupt belegt ist, hängt an der Druckhöhe, nicht an der
 * Höhe über dem Meeresspiegel. Ohne dieses Ergebnis müsste `computeFuelPlan`
 * dieselbe Umrechnung ein zweites Mal vornehmen.
 */
export interface ValidatedFlightPlan {
  readonly plan: FlightPlanInput;
  readonly departure: PressureAltitudeResult;
  readonly cruise: PressureAltitudeResult;
}

/**
 * Prüft ein Flugvorhaben vollständig, bevor gerechnet wird (FR-008).
 * Reihenfolge: Struktur, dann Eingabegrenzen, dann Höhenverhältnis (V-01),
 * dann die errechneten Druckhöhen gegen das Tabellenraster (V-02, FR-006),
 * zuletzt die belegte Kombination (V-03).
 */
export function validateFlightPlan(input: unknown): ValidatedFlightPlan {
  const parsed = flightPlanSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new PohCalculationError(
      'INVALID_INPUT',
      'Das Flugvorhaben ist unvollständig oder enthält keine Zahl.',
      issue === undefined ? {} : { field: issue.path.join('.') }
    );
  }

  const plan: FlightPlanInput = parsed.data;
  const domain = getFuelPlanInputDomain();

  checkRange('departureElevationFt', plan.departureElevationFt, domain.departureElevationFt);
  checkRange('cruiseAltitudeAmslFt', plan.cruiseAltitudeAmslFt, domain.cruiseAltitudeAmslFt);
  checkRange('qnhHpa', plan.qnhHpa, domain.qnhHpa);
  checkRange('isaDeviationC', plan.isaDeviationC, domain.isaDeviationC);
  checkRange('windComponentKt', plan.windComponentKt, domain.windComponentKt);

  if (plan.distanceNm <= 0) {
    throw new PohCalculationError('INVALID_INPUT', 'Die Flugstrecke muss größer als null sein.', {
      field: 'distanceNm',
      actual: plan.distanceNm
    });
  }
  checkRange('distanceNm', plan.distanceNm, domain.distanceNm);

  // Beide Höhen werden mit demselben QNH umgerechnet; ihre Reihenfolge bleibt
  // dabei erhalten. Die Prüfung auf der Höhe über dem Meeresspiegel ist deshalb
  // gleichwertig zur früheren Prüfung auf der Druckhöhe.
  if (plan.cruiseAltitudeAmslFt <= plan.departureElevationFt) {
    throw new PohCalculationError(
      'INVALID_INPUT',
      'Die Reiseflughöhe muss über der Platzhöhe liegen; sonst liefert die Differenzbildung des Handbuchverfahrens kein Ergebnis.',
      { field: 'cruiseAltitudeAmslFt', actual: plan.cruiseAltitudeAmslFt }
    );
  }

  const departure = toPressureAltitude(plan.departureElevationFt, plan.qnhHpa);
  const cruise = toPressureAltitude(plan.cruiseAltitudeAmslFt, plan.qnhHpa);
  const pressureRange = getPressureAltitudeRange();
  checkPressureAltitude('departureElevationFt', departure, pressureRange);
  checkPressureAltitude('cruiseAltitudeAmslFt', cruise, pressureRange);

  checkPowerSetting(plan.powerSettingPct, cruise.pressureAltitudeFt);
  return { plan, departure, cruise };
}

/**
 * FR-006: Es wird abgelehnt, nicht auf den Tabellenrand zurückgefallen. Die
 * Begründung steht bei `pressureAltitudeOutOfRange`.
 *
 * Ausgeführt, damit die Reiseleistungs-Übersicht dieselbe Regel anwendet und
 * nicht eine zweite, auseinanderlaufende Fassung davon (Feature 006).
 */
export function checkPressureAltitude(
  field: keyof FlightPlanInput,
  result: PressureAltitudeResult,
  range: NumericRange
): void {
  if (result.pressureAltitudeFt < range.min || result.pressureAltitudeFt > range.max) {
    throw pressureAltitudeOutOfRange(
      field,
      result.pressureAltitudeFt,
      range,
      result.elevationFt,
      result.qnhHpa
    );
  }
}

/**
 * V-03: Die Lasteinstellung muss bei **beiden** die Reiseflughöhe
 * einschließenden Stützstellen belegt sein. Nur dann lässt sich zwischen zwei
 * echten Tabellenwerten interpolieren.
 *
 * Nimmt nur die beiden Größen entgegen, um die es geht: Die
 * Reiseleistungs-Übersicht (Feature 006) kennt kein vollständiges
 * Flugvorhaben, wendet aber dieselbe Regel an.
 */
export function checkPowerSetting(powerSettingPct: number, cruisePressureAltitudeFt: number): void {
  const availability = getPowerSettingsByPressureAltitude();
  const [lower, upper] = bracketingAltitudes(cruisePressureAltitudeFt);

  for (const altitude of new Set([lower, upper])) {
    const entry = availability.find((item) => item.pressureAltitudeFt === altitude);
    const available = entry === undefined ? [] : entry.powerSettingsPct;
    if (!available.includes(powerSettingPct)) {
      throw new PohCalculationError(
        'UNSUPPORTED_COMBINATION',
        `Die Reiseleistungstabelle enthält bei ${altitude} ft keine Lasteinstellung von ${powerSettingPct} %. Dort verfügbar: ${available.join(', ')} %.`,
        { field: 'powerSettingPct', actual: powerSettingPct, tableId: CRUISE_TABLE_ID }
      );
    }
  }
}
