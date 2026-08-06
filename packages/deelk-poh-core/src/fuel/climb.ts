import type { CalculationStep, Quantity, SourceReference } from '../types.js';
import { interpolate, type InterpolationResult } from '../interpolate.js';
import { CLIMB_TABLE_ID, getSourceReference } from '../tables.js';
import { formatNumber } from '../format.js';
import type { FlightPlanInput } from './input.js';

/** Zeit, Strecke und Kraftstoff eines Steigflugabschnitts. */
export interface ClimbSegment {
  readonly timeMin: number;
  readonly distanceNm: number;
  readonly fuelL: number;
}

export interface ClimbComputation {
  /** Werte nach der Temperaturkorrektur — damit wird weitergerechnet. */
  readonly corrected: ClimbSegment;
  /** Werte vor der Temperaturkorrektur, reine Tabellendifferenz. */
  readonly difference: ClimbSegment;
  readonly temperatureFactor: number;
  readonly steps: readonly CalculationStep[];
  readonly source: SourceReference;
}

const CLIMB_VALUE_KEYS = ['time_min', 'distance_nm', 'fuel_l'] as const;

function lookup(altitude: number, field: keyof FlightPlanInput): InterpolationResult {
  return interpolate({
    tableId: CLIMB_TABLE_ID,
    axisKey: 'pressure_altitude_ft',
    axisValue: altitude,
    valueKeys: [...CLIMB_VALUE_KEYS],
    field,
    axisUnit: 'ft'
  });
}

function toSegment(values: Readonly<Record<string, number>>): ClimbSegment {
  return {
    timeMin: values['time_min'] as number,
    distanceNm: values['distance_nm'] as number,
    fuelL: values['fuel_l'] as number
  };
}

function segmentQuantities(segment: ClimbSegment): Readonly<Record<string, Quantity>> {
  return {
    timeMin: { value: segment.timeMin, unit: 'min' },
    distanceNm: { value: segment.distanceNm, unit: 'NM' },
    fuelL: { value: segment.fuelL, unit: 'l' }
  };
}

/**
 * Temperaturkorrektur des Steigflugs: stetig, nicht stufenweise (FR-012).
 * Unterhalb der Normtemperatur bleibt es beim Tabellenwert — das Handbuch
 * kennt nur einen Zuschlag nach oben, kein Abschlag nach unten.
 */
export function climbTemperatureFactor(isaDeviationC: number): number {
  return isaDeviationC <= 0 ? 1 : 1 + (isaDeviationC / 10) * 0.1;
}

/**
 * Steigflug nach dem Verfahren des POH (Seite 5-4): Tabellenwerte bei
 * Reiseflughöhe minus Tabellenwerte bei Platzhöhe (FR-010), anschließend
 * Temperaturkorrektur (FR-012).
 */
export function computeClimb(plan: FlightPlanInput): ClimbComputation {
  const source = getSourceReference(CLIMB_TABLE_ID);
  const atDeparture = lookup(plan.departureAltitudeFt, 'departureAltitudeFt');
  const atCruise = lookup(plan.cruiseAltitudeFt, 'cruiseAltitudeFt');

  const departure = toSegment(atDeparture.values);
  const cruise = toSegment(atCruise.values);
  const difference: ClimbSegment = {
    timeMin: cruise.timeMin - departure.timeMin,
    distanceNm: cruise.distanceNm - departure.distanceNm,
    fuelL: cruise.fuelL - departure.fuelL
  };

  const temperatureFactor = climbTemperatureFactor(plan.isaDeviationC);
  const corrected: ClimbSegment = {
    timeMin: difference.timeMin * temperatureFactor,
    distanceNm: difference.distanceNm * temperatureFactor,
    fuelL: difference.fuelL * temperatureFactor
  };

  const steps: CalculationStep[] = [
    {
      id: 'climb.atDeparture',
      label: 'Steigflugwerte bei der Platzhöhe des Startplatzes',
      inputs: { departureAltitudeFt: { value: plan.departureAltitudeFt, unit: 'ft' } },
      results: segmentQuantities(departure),
      anchors: atDeparture.anchors,
      explanation: `Aus ${source.figure} bei ${formatNumber(plan.departureAltitudeFt, 0)} ft abgelesen. Die Tabelle gibt die Werte ab dem Start an, nicht ab der Platzhöhe — deshalb wird dieser Anteil im nächsten Schritt abgezogen.`,
      sources: [source]
    },
    {
      id: 'climb.atCruise',
      label: 'Steigflugwerte bei der Reiseflughöhe',
      inputs: { cruiseAltitudeFt: { value: plan.cruiseAltitudeFt, unit: 'ft' } },
      results: segmentQuantities(cruise),
      anchors: atCruise.anchors,
      explanation: `Aus ${source.figure} bei ${formatNumber(plan.cruiseAltitudeFt, 0)} ft abgelesen.`,
      sources: [source]
    },
    {
      id: 'climb.difference',
      label: 'Steigflug von der Platzhöhe auf die Reiseflughöhe',
      inputs: {
        ...prefixed('atCruise', segmentQuantities(cruise)),
        ...prefixed('atDeparture', segmentQuantities(departure))
      },
      results: segmentQuantities(difference),
      anchors: [...atDeparture.anchors, ...atCruise.anchors],
      explanation:
        'Differenz der beiden Tabellenwerte. Das ist das Verfahren des Handbuchs (Seite 5-4): die Tabelle zählt ab Meereshöhe, gestiegen wird aber erst ab der Platzhöhe.',
      sources: [source]
    },
    {
      id: 'climb.temperatureCorrection',
      label: 'Temperaturkorrektur des Steigflugs',
      inputs: {
        ...segmentQuantities(difference),
        isaDeviationC: { value: plan.isaDeviationC, unit: '°C' },
        factor: { value: temperatureFactor, unit: '' }
      },
      results: segmentQuantities(corrected),
      anchors: [],
      explanation:
        plan.isaDeviationC <= 0
          ? 'Keine Korrektur: die Anmerkung 2 der Steigflugtabelle sieht nur einen Zuschlag über der Normtemperatur vor, keinen Abschlag darunter.'
          : `Faktor 1 + (${formatNumber(plan.isaDeviationC, 0)} °C / 10 °C) × 0,10 = ${formatNumber(temperatureFactor, 3)}. Anmerkung 2 nennt Zeit und Steigstrecke; der Kraftstoff wird mitkorrigiert, weil das Rechenbeispiel des Handbuchs so verfährt (FR-019).`,
      sources: [source]
    }
  ];

  return { corrected, difference, temperatureFactor, steps, source };
}

function prefixed(
  prefix: string,
  quantities: Readonly<Record<string, Quantity>>
): Readonly<Record<string, Quantity>> {
  const result: Record<string, Quantity> = {};
  for (const [key, quantity] of Object.entries(quantities)) {
    result[`${prefix}.${key}`] = quantity;
  }
  return result;
}
