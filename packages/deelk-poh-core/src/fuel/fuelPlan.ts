import type { Advisory, CalculationStep, SourceReference } from '../types.js';
import {
  ICAO_STANDARD_ATMOSPHERE_SOURCE,
  type PressureAltitudeResult
} from '../atmosphere/pressureAltitude.js';
import { CLIMB_TABLE_ID, USABLE_FUEL_L, USABLE_FUEL_US_GAL, getTableNote } from '../tables.js';
import { formatQuantity, roundLitres, roundUsGallons } from '../format.js';
import { buildAdvisories } from './advisories.js';
import { computeClimb } from './climb.js';
import { computeCruise } from './cruise.js';
import { computeCruiseCapability, type CruiseCapability } from './cruiseCapability.js';
import { validateFlightPlan, type FlightPlanInput } from './input.js';
import { PREFLIGHT_CHECK_NOTICE } from './notices.js';

/** Kraftstoffbedarf, aufgeschlüsselt nach den drei Flugabschnitten (FR-009). */
export interface FuelBreakdown {
  readonly taxiTakeoffL: number;
  readonly climbL: number;
  readonly cruiseL: number;
  readonly totalL: number;
}

/**
 * Derselbe Bedarf in US-Gallonen. Das Handbuch führt Kraftstoff durchgängig in
 * US gal; ohne diese Angabe müsste der Pilot beim Abgleich selbst umrechnen
 * (FR-009).
 */
export interface FuelBreakdownUsGal {
  readonly taxiTakeoffUsGal: number;
  readonly climbUsGal: number;
  readonly cruiseUsGal: number;
  readonly totalUsGal: number;
}

/**
 * Werte, die bei der Reiseflugrechnung ohnehin anfallen und für den Piloten
 * eigenständig aussagekräftig sind: Wie schnell fliegt die Maschine bei dieser
 * Lasteinstellung, und was verbraucht sie dabei in der Stunde? Sie stehen hier
 * eigens, damit ein Adapter sie nicht aus den Rechenschritten klauben muss.
 */
export interface CruisePerformance {
  /** Eigengeschwindigkeit in kt, nach der Temperaturkorrektur. */
  readonly ktas: number;
  /** Geschwindigkeit über Grund in kt, also KTAS abzüglich Gegenwind. */
  readonly groundSpeedKt: number;
  /** Verbrauch je Stunde in l, unmittelbar aus der Tabelle interpoliert. */
  readonly fuelFlowLph: number;
  /** Derselbe Verbrauch aus der eigenen US-gph-Spalte der Tabelle. */
  readonly fuelFlowUsGph: number;
  /** Reine Reiseflugzeit in h, ohne Steigflug. */
  readonly timeH: number;
}

export interface FuelPlanResult {
  readonly input: FlightPlanInput;
  /**
   * Die aus Höhe und QNH errechneten Druckhöhen (FR-007). Sie stehen hier
   * eigens, damit ein Adapter sie nicht aus den Rechenschritten heraussuchen
   * muss — und damit er sie nicht selbst errechnet (C-04).
   */
  readonly pressureAltitudes: {
    readonly departure: PressureAltitudeResult;
    readonly cruise: PressureAltitudeResult;
  };
  /** Geschwindigkeit und Stundenverbrauch im Reiseflug. */
  readonly cruisePerformance: CruisePerformance;
  /**
   * Was die Maschine unter diesen Bedingungen leistet, unabhängig vom
   * eingegebenen Vorhaben (Feature 006). Steht neben `cruisePerformance` und
   * nicht darin: Jene Größen gelten für die eingegebene Strecke, diese für die
   * Maschine.
   */
  readonly cruiseCapability: CruiseCapability;
  readonly steps: readonly CalculationStep[];
  /** Gerundete Ausgabewerte (FR-020, FR-021). */
  readonly breakdown: FuelBreakdown;
  /** Ungerundete Werte, damit Adapter selbst nichts nachrechnen müssen. */
  readonly exact: FuelBreakdown;
  readonly breakdownUsGal: FuelBreakdownUsGal;
  readonly usableFuelL: number;
  readonly usableFuelUsGal: number;
  readonly remainingFuelL: number;
  readonly remainingFuelUsGal: number;
  readonly exceedsUsableFuel: boolean;
  readonly advisories: readonly Advisory[];
  readonly sources: readonly SourceReference[];
  readonly preflightCheckNotice: string;
}

/** Festbetrag für Anlassen, Rollen und Start (FR-011, Anmerkung 1). */
const TAXI_TAKEOFF_L = 4;

/** Derselbe Festbetrag, wie Anmerkung 1 ihn zusätzlich in US gal angibt. */
const TAXI_TAKEOFF_US_GAL = 1.1;

/** Prüfhinweis laut FR-006; er wird im Kern erzeugt, nicht im Adapter. */
export { PREFLIGHT_CHECK_NOTICE } from './notices.js';

/**
 * Berechnet den Kraftstoffbedarf für ein Flugvorhaben nach dem Verfahren des
 * POH. Einziger Rechenweg des Projekts (Constitution-Prinzip IV).
 */
export function computeFuelPlan(input: unknown): FuelPlanResult {
  const validated = validateFlightPlan(input);
  const { plan } = validated;
  const climb = computeClimb(validated);
  const cruise = computeCruise(validated, climb.corrected.distanceNm);
  const capability = computeCruiseCapability(plan);

  const totalL = TAXI_TAKEOFF_L + climb.corrected.fuelL + cruise.fuelL;
  const totalUsGal = TAXI_TAKEOFF_US_GAL + climb.corrected.fuelUsGal + cruise.fuelUsGal;
  const remainingExactL = USABLE_FUEL_L - totalL;

  const exact: FuelBreakdown = {
    taxiTakeoffL: TAXI_TAKEOFF_L,
    climbL: climb.corrected.fuelL,
    cruiseL: cruise.fuelL,
    totalL
  };

  const steps: CalculationStep[] = [
    pressureAltitudeStep('departure', 'Druckhöhe des Startplatzes', validated.departure),
    pressureAltitudeStep('cruise', 'Druckhöhe des Reiseflugs', validated.cruise),
    {
      id: 'startup.taxiTakeoff',
      label: 'Anlassen, Rollen und Start',
      inputs: {},
      results: { fuelL: { value: TAXI_TAKEOFF_L, unit: 'l' } },
      anchors: [],
      explanation: `Festbetrag laut Anmerkung 1 der Steigflugtabelle: „${getTableNote(CLIMB_TABLE_ID, 1)}"`,
      sources: [climb.source]
    },
    ...climb.steps,
    ...cruise.steps,
    // Ohne den Schritt `capability.pressureAltitude`: Er rechnet dieselbe
    // Druckhöhe aus denselben Eingaben wie `pressureAltitude.cruise` weiter
    // oben. Zweimal dasselbe im Rechenweg liest sich wie zwei Rechnungen.
    ...capability.steps.filter((step) => step.id !== 'capability.pressureAltitude'),
    {
      id: 'total.fuel',
      label: 'Gesamter Kraftstoffbedarf',
      inputs: {
        taxiTakeoffL: { value: TAXI_TAKEOFF_L, unit: 'l' },
        climbL: { value: climb.corrected.fuelL, unit: 'l' },
        cruiseL: { value: cruise.fuelL, unit: 'l' }
      },
      results: { fuelL: { value: totalL, unit: 'l' } },
      anchors: [],
      explanation:
        'Summe der drei Anteile. Erst hier wird gerundet — die Zwischenwerte gehen in voller Genauigkeit ein.',
      sources: [climb.source, cruise.source]
    },
    {
      id: 'total.usableFuelComparison',
      label: 'Gegenüberstellung zur ausfliegbaren Menge',
      inputs: {
        usableFuelL: { value: USABLE_FUEL_L, unit: 'l' },
        totalL: { value: totalL, unit: 'l' }
      },
      results: { remainingFuelL: { value: remainingExactL, unit: 'l' } },
      anchors: [],
      explanation: `Ausfliegbare Menge der Standardtanks abzüglich des Bedarfs. Der Rest ist keine Reserve — die 45-Minuten-Reserve ist darin nicht enthalten.`,
      sources: [cruise.source]
    }
  ];

  return {
    input: plan,
    pressureAltitudes: { departure: validated.departure, cruise: validated.cruise },
    cruisePerformance: {
      ktas: cruise.ktas,
      groundSpeedKt: cruise.groundSpeedKt,
      fuelFlowLph: cruise.fuelFlowLph,
      fuelFlowUsGph: cruise.fuelFlowUsGph,
      timeH: cruise.timeH
    },
    cruiseCapability: capability,
    steps,
    breakdown: {
      taxiTakeoffL: roundLitres(TAXI_TAKEOFF_L),
      climbL: roundLitres(climb.corrected.fuelL),
      cruiseL: roundLitres(cruise.fuelL),
      totalL: roundLitres(totalL)
    },
    exact,
    breakdownUsGal: {
      taxiTakeoffUsGal: roundUsGallons(TAXI_TAKEOFF_US_GAL),
      climbUsGal: roundUsGallons(climb.corrected.fuelUsGal),
      cruiseUsGal: roundUsGallons(cruise.fuelUsGal),
      totalUsGal: roundUsGallons(totalUsGal)
    },
    usableFuelL: USABLE_FUEL_L,
    usableFuelUsGal: USABLE_FUEL_US_GAL,
    remainingFuelL: roundLitres(remainingExactL),
    remainingFuelUsGal: roundUsGallons(USABLE_FUEL_US_GAL - totalUsGal),
    // Verglichen wird der ungerundete Bedarf: ein Ergebnis von 127,44 l würde
    // gerundet auf 127,4 l genau die Warnung verschlucken, die es auslösen soll.
    exceedsUsableFuel: totalL >= USABLE_FUEL_L,
    advisories: buildAdvisories(plan),
    // Die Norm-Referenz steht neben den Handbuchtabellen, aber getrennt von
    // ihnen: Der Prüfhinweis unten bezieht sich nur auf `kind: 'poh'`.
    sources: [ICAO_STANDARD_ATMOSPHERE_SOURCE, climb.source, cruise.source],
    preflightCheckNotice: PREFLIGHT_CHECK_NOTICE
  };
}

/**
 * FR-008: Die Umrechnung bekommt einen eigenen Schritt, damit die Druckhöhe
 * nicht als unerklärte Zahl in der Tabelleninterpolation auftaucht. `anchors`
 * bleibt leer — es ist kein Tabellenwert beteiligt.
 */
function pressureAltitudeStep(
  suffix: 'departure' | 'cruise',
  label: string,
  result: PressureAltitudeResult
): CalculationStep {
  return {
    id: `pressureAltitude.${suffix}`,
    label,
    inputs: {
      elevationFt: { value: result.elevationFt, unit: 'ft' },
      qnhHpa: { value: result.qnhHpa, unit: 'hPa' }
    },
    results: { pressureAltitudeFt: { value: result.pressureAltitudeFt, unit: 'ft' } },
    anchors: [],
    explanation: `${formatQuantity(result.elevationFt, 0, 'ft')} über dem Meeresspiegel bei einem QNH von ${formatQuantity(result.qnhHpa, 2, 'hPa')} ergeben ${formatQuantity(result.pressureAltitudeFt, 0, 'ft')} Druckhöhe. Gerechnet nach der barometrischen Höhenformel der ICAO-Standardatmosphäre: ${ICAO_STANDARD_ATMOSPHERE_SOURCE.formula}. Diese Größe stammt nicht aus dem Flughandbuch.`,
    sources: [ICAO_STANDARD_ATMOSPHERE_SOURCE]
  };
}
