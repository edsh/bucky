import type { CalculationStep, PohSourceReference } from '../types.js';
import { PohCalculationError } from '../errors.js';
import { interpolate } from '../interpolate.js';
import { CRUISE_TABLE_ID, getSourceReference } from '../tables.js';
import { formatNumber } from '../format.js';
import type { ValidatedFlightPlan } from './input.js';

export interface CruiseComputation {
  /** KTAS laut Tabelle, vor der Temperaturkorrektur. */
  readonly tableKtas: number;
  /** KTAS nach der Temperaturkorrektur. */
  readonly ktas: number;
  readonly fuelFlowLph: number;
  /** Aus der eigenen US-gph-Spalte der Tabelle, nicht umgerechnet (FR-009). */
  readonly fuelFlowUsGph: number;
  readonly distanceNm: number;
  readonly groundSpeedKt: number;
  readonly timeH: number;
  readonly fuelL: number;
  readonly fuelUsGal: number;
  readonly steps: readonly CalculationStep[];
  readonly source: PohSourceReference;
}

/**
 * Temperaturkorrektur der KTAS: 1 % je 10 °C über ISA (Anmerkung 3 der
 * Reiseleistungstabelle, FR-013). Unterhalb der Normtemperatur unverändert.
 */
export function ktasTemperatureFactor(isaDeviationC: number): number {
  return isaDeviationC <= 0 ? 1 : 1 + (isaDeviationC / 10) * 0.01;
}

/**
 * Reiseflug (FR-014). Die Verbrauchsrate wird **nicht** temperaturkorrigiert:
 * Anmerkung 3 nennt ausdrücklich nur Geschwindigkeit und Reichweite.
 */
export function computeCruise(
  validated: ValidatedFlightPlan,
  climbDistanceNm: number
): CruiseComputation {
  const { plan } = validated;
  // Die Tabelle arbeitet mit der Druckhöhe (siehe computeClimb).
  const cruiseAltitudeFt = validated.cruise.pressureAltitudeFt;
  const source = getSourceReference(CRUISE_TABLE_ID);
  const lookup = interpolate({
    tableId: CRUISE_TABLE_ID,
    axisKey: 'pressure_altitude_ft',
    axisValue: cruiseAltitudeFt,
    valueKeys: ['ktas', 'fuel_flow_lph', 'fuel_flow_usgph'],
    where: { power_setting_pct: plan.powerSettingPct },
    field: 'cruiseAltitudeAmslFt',
    axisUnit: 'ft'
  });

  const tableKtas = lookup.values['ktas'] as number;
  const fuelFlowLph = lookup.values['fuel_flow_lph'] as number;
  const fuelFlowUsGph = lookup.values['fuel_flow_usgph'] as number;
  const factor = ktasTemperatureFactor(plan.isaDeviationC);
  const ktas = tableKtas * factor;

  const distanceNm = plan.distanceNm - climbDistanceNm;
  if (distanceNm <= 0) {
    throw new PohCalculationError(
      'NOT_COMPUTABLE',
      `Die Steigflugstrecke von ${formatNumber(climbDistanceNm, 1)} NM ist nicht kürzer als die Gesamtstrecke. Für den Reiseflug bleibt nichts übrig; das Handbuchverfahren setzt einen Reiseflugabschnitt voraus.`,
      { field: 'distanceNm', actual: plan.distanceNm }
    );
  }

  const groundSpeedKt = ktas - plan.windComponentKt;
  if (groundSpeedKt <= 0) {
    throw new PohCalculationError(
      'NOT_COMPUTABLE',
      `Der Gegenwind von ${formatNumber(plan.windComponentKt, 0)} kt erreicht oder übersteigt die Eigengeschwindigkeit von ${formatNumber(ktas, 0)} kt. Es käme keine Geschwindigkeit über Grund zustande.`,
      { field: 'windComponentKt', actual: plan.windComponentKt }
    );
  }

  const timeH = distanceNm / groundSpeedKt;
  const fuelL = timeH * fuelFlowLph;
  const fuelUsGal = timeH * fuelFlowUsGph;

  const steps: CalculationStep[] = [
    {
      id: 'cruise.tableLookup',
      label: 'Reiseleistung bei Reiseflug-Druckhöhe und Lasteinstellung',
      inputs: {
        cruiseAltitudeFt: { value: cruiseAltitudeFt, unit: 'ft' },
        powerSettingPct: { value: plan.powerSettingPct, unit: '%' }
      },
      results: {
        ktas: { value: tableKtas, unit: 'kt' },
        fuelFlowLph: { value: fuelFlowLph, unit: 'l/h' },
        fuelFlowUsGph: { value: fuelFlowUsGph, unit: 'US gal/h' }
      },
      anchors: lookup.anchors,
      explanation: `Aus ${source.figure} abgelesen. In den Bedarf geht ausschließlich die Verbrauchsrate ein — die Spalten für Reichweite und Flugdauer enthalten laut Anmerkung 2 bereits Rollen, Steigflug und Reserve und dürfen in einer Bedarfsrechnung nicht auftauchen. Als Auskunft über die Maschine stehen sie im Schritt „Reiseleistung, Reichweite und Flugdauer bei Druckhöhe und Lasteinstellung".`,
      sources: [source]
    },
    {
      id: 'cruise.ktasTemperatureCorrection',
      label: 'Temperaturkorrektur der wahren Fluggeschwindigkeit',
      inputs: {
        tableKtas: { value: tableKtas, unit: 'kt' },
        isaDeviationC: { value: plan.isaDeviationC, unit: '°C' },
        factor: { value: factor, unit: '' }
      },
      results: { ktas: { value: ktas, unit: 'kt' } },
      anchors: [],
      explanation:
        plan.isaDeviationC <= 0
          ? 'Keine Korrektur: Anmerkung 3 sieht nur einen Zuschlag über der Normtemperatur vor.'
          : `Faktor 1 + (${formatNumber(plan.isaDeviationC, 0)} °C / 10 °C) × 0,01 = ${formatNumber(factor, 4)}. Die Verbrauchsrate bleibt unverändert; Anmerkung 3 nennt nur Geschwindigkeit und Reichweite.`,
      sources: [source]
    },
    {
      id: 'cruise.distance',
      label: 'Reiseflugstrecke',
      inputs: {
        distanceNm: { value: plan.distanceNm, unit: 'NM' },
        climbDistanceNm: { value: climbDistanceNm, unit: 'NM' }
      },
      results: { distanceNm: { value: distanceNm, unit: 'NM' } },
      anchors: [],
      explanation: 'Gesamtstrecke abzüglich der korrigierten Steigflugstrecke.',
      sources: []
    },
    {
      id: 'cruise.groundSpeed',
      label: 'Geschwindigkeit über Grund',
      inputs: {
        ktas: { value: ktas, unit: 'kt' },
        windComponentKt: { value: plan.windComponentKt, unit: 'kt' }
      },
      results: { groundSpeedKt: { value: groundSpeedKt, unit: 'kt' } },
      anchors: [],
      explanation:
        'Wahre Fluggeschwindigkeit abzüglich der Windkomponente; Rückenwind zählt negativ und erhöht die Geschwindigkeit über Grund.',
      sources: []
    },
    {
      id: 'cruise.time',
      label: 'Reiseflugzeit',
      inputs: {
        distanceNm: { value: distanceNm, unit: 'NM' },
        groundSpeedKt: { value: groundSpeedKt, unit: 'kt' }
      },
      results: { timeH: { value: timeH, unit: 'h' } },
      anchors: [],
      explanation: 'Reiseflugstrecke geteilt durch die Geschwindigkeit über Grund.',
      sources: []
    },
    {
      id: 'cruise.fuel',
      label: 'Kraftstoff für den Reiseflug',
      inputs: {
        timeH: { value: timeH, unit: 'h' },
        fuelFlowLph: { value: fuelFlowLph, unit: 'l/h' },
        fuelFlowUsGph: { value: fuelFlowUsGph, unit: 'US gal/h' }
      },
      results: {
        fuelL: { value: fuelL, unit: 'l' },
        fuelUsGal: { value: fuelUsGal, unit: 'US gal' }
      },
      anchors: [],
      explanation: 'Reiseflugzeit mal Verbrauchsrate.',
      sources: [source]
    }
  ];

  return {
    tableKtas,
    ktas,
    fuelFlowLph,
    fuelFlowUsGph,
    distanceNm,
    groundSpeedKt,
    timeH,
    fuelL,
    fuelUsGal,
    steps,
    source
  };
}
