import type { Advisory, CalculationStep, SourceReference } from '../types.js';
import { CLIMB_TABLE_ID, USABLE_FUEL_L, getTableNote } from '../tables.js';
import { roundLitres } from '../format.js';
import { buildAdvisories } from './advisories.js';
import { computeClimb } from './climb.js';
import { computeCruise } from './cruise.js';
import { validateFlightPlan, type FlightPlanInput } from './input.js';

/** Kraftstoffbedarf, aufgeschlüsselt nach den drei Flugabschnitten (FR-009). */
export interface FuelBreakdown {
  readonly taxiTakeoffL: number;
  readonly climbL: number;
  readonly cruiseL: number;
  readonly totalL: number;
}

export interface FuelPlanResult {
  readonly input: FlightPlanInput;
  readonly steps: readonly CalculationStep[];
  /** Gerundete Ausgabewerte (FR-020, FR-021). */
  readonly breakdown: FuelBreakdown;
  /** Ungerundete Werte, damit Adapter selbst nichts nachrechnen müssen. */
  readonly exact: FuelBreakdown;
  readonly usableFuelL: number;
  readonly remainingFuelL: number;
  readonly exceedsUsableFuel: boolean;
  readonly advisories: readonly Advisory[];
  readonly sources: readonly SourceReference[];
  readonly preflightCheckNotice: string;
}

/** Festbetrag für Anlassen, Rollen und Start (FR-011, Anmerkung 1). */
const TAXI_TAKEOFF_L = 4;

/** Prüfhinweis laut FR-006; er wird im Kern erzeugt, nicht im Adapter. */
export const PREFLIGHT_CHECK_NOTICE =
  'Vor dem Flug gegen das Original-Flughandbuch prüfen. Dieses Ergebnis ersetzt das Handbuch nicht.';

/**
 * Berechnet den Kraftstoffbedarf für ein Flugvorhaben nach dem Verfahren des
 * POH. Einziger Rechenweg des Projekts (Constitution-Prinzip IV).
 */
export function computeFuelPlan(input: unknown): FuelPlanResult {
  const plan = validateFlightPlan(input);
  const climb = computeClimb(plan);
  const cruise = computeCruise(plan, climb.corrected.distanceNm);

  const totalL = TAXI_TAKEOFF_L + climb.corrected.fuelL + cruise.fuelL;
  const remainingExactL = USABLE_FUEL_L - totalL;

  const exact: FuelBreakdown = {
    taxiTakeoffL: TAXI_TAKEOFF_L,
    climbL: climb.corrected.fuelL,
    cruiseL: cruise.fuelL,
    totalL
  };

  const steps: CalculationStep[] = [
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
    steps,
    breakdown: {
      taxiTakeoffL: roundLitres(TAXI_TAKEOFF_L),
      climbL: roundLitres(climb.corrected.fuelL),
      cruiseL: roundLitres(cruise.fuelL),
      totalL: roundLitres(totalL)
    },
    exact,
    usableFuelL: USABLE_FUEL_L,
    remainingFuelL: roundLitres(remainingExactL),
    // Verglichen wird der ungerundete Bedarf: ein Ergebnis von 127,44 l würde
    // gerundet auf 127,4 l genau die Warnung verschlucken, die es auslösen soll.
    exceedsUsableFuel: totalL >= USABLE_FUEL_L,
    advisories: buildAdvisories(plan),
    sources: [climb.source, cruise.source],
    preflightCheckNotice: PREFLIGHT_CHECK_NOTICE
  };
}
