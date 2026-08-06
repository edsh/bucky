import { describe, expect, it } from 'vitest';
import { computeFuelPlan } from '../../src/fuel/fuelPlan.js';
import type { CalculationStep } from '../../src/types.js';
import type { FlightPlanInput } from '../../src/fuel/input.js';

/**
 * Sollwerte aus `specs/001-kraftstoffrechner-d-eelk/reference-calculation.md`
 * (Aufgabe T008, SC-005, Zusicherung C-05). Sie sind von Hand aus den Tabellen
 * gerechnet worden, bevor eine Zeile dieses Kerns existierte.
 */

function stepOf(steps: readonly CalculationStep[], id: string): CalculationStep {
  const step = steps.find((entry) => entry.id === id);
  if (step === undefined) {
    throw new Error(`Schritt "${id}" fehlt im Ergebnis.`);
  }
  return step;
}

function resultOf(steps: readonly CalculationStep[], id: string, key: string): number {
  const quantity = stepOf(steps, id).results[key];
  if (quantity === undefined) {
    throw new Error(`Schritt "${id}" liefert keinen Wert "${key}".`);
  }
  return quantity.value;
}

describe('Fall A — alle Eingaben auf Stützstellen', () => {
  const input: FlightPlanInput = {
    departureAltitudeFt: 1000,
    cruiseAltitudeFt: 6000,
    distanceNm: 400,
    powerSettingPct: 70,
    isaDeviationC: 20,
    windComponentKt: 10
  };
  const result = computeFuelPlan(input);

  it('trifft die dreizehn Zwischenwerte des Sollwertdokuments', () => {
    const s = result.steps;

    expect(resultOf(s, 'startup.taxiTakeoff', 'fuelL')).toBe(4);

    expect(resultOf(s, 'climb.atDeparture', 'timeMin')).toBeCloseTo(1.1, 10);
    expect(resultOf(s, 'climb.atDeparture', 'distanceNm')).toBeCloseTo(1.3, 10);
    expect(resultOf(s, 'climb.atDeparture', 'fuelL')).toBeCloseTo(0.6, 10);

    expect(resultOf(s, 'climb.atCruise', 'timeMin')).toBeCloseTo(6.7, 10);
    expect(resultOf(s, 'climb.atCruise', 'distanceNm')).toBeCloseTo(8.5, 10);
    expect(resultOf(s, 'climb.atCruise', 'fuelL')).toBeCloseTo(3.7, 10);

    expect(resultOf(s, 'climb.difference', 'timeMin')).toBeCloseTo(5.6, 10);
    expect(resultOf(s, 'climb.difference', 'distanceNm')).toBeCloseTo(7.2, 10);
    expect(resultOf(s, 'climb.difference', 'fuelL')).toBeCloseTo(3.1, 10);

    expect(resultOf(s, 'climb.temperatureCorrection', 'timeMin')).toBeCloseTo(6.72, 10);
    expect(resultOf(s, 'climb.temperatureCorrection', 'distanceNm')).toBeCloseTo(8.64, 10);
    expect(resultOf(s, 'climb.temperatureCorrection', 'fuelL')).toBeCloseTo(3.72, 10);

    expect(resultOf(s, 'cruise.tableLookup', 'ktas')).toBe(116);
    expect(resultOf(s, 'cruise.tableLookup', 'fuelFlowLph')).toBe(22.1);

    expect(resultOf(s, 'cruise.ktasTemperatureCorrection', 'ktas')).toBeCloseTo(118.32, 10);
    expect(resultOf(s, 'cruise.distance', 'distanceNm')).toBeCloseTo(391.36, 10);
    expect(resultOf(s, 'cruise.groundSpeed', 'groundSpeedKt')).toBeCloseTo(108.32, 10);
    expect(resultOf(s, 'cruise.time', 'timeH')).toBeCloseTo(3.613, 4);
    expect(resultOf(s, 'cruise.fuel', 'fuelL')).toBeCloseTo(79.847, 3);
    expect(resultOf(s, 'total.fuel', 'fuelL')).toBeCloseTo(87.567, 3);
  });

  it('liefert den Sollwert 87,6 l und 39,8 l verbleibend', () => {
    expect(result.breakdown.taxiTakeoffL).toBe(4);
    expect(result.breakdown.climbL).toBe(3.7);
    expect(result.breakdown.cruiseL).toBe(79.8);
    expect(result.breakdown.totalL).toBe(87.6);
    expect(result.remainingFuelL).toBe(39.8);
    expect(result.exceedsUsableFuel).toBe(false);
  });

  it('nennt beide verwendeten Tabellen mit Quellenangabe (FR-005)', () => {
    const figures = result.sources.map((source) => source.figure).sort();
    expect(figures).toEqual(['Abb. 5-3a', 'Abb. 5-4a']);
    expect(result.sources[0]?.citation).toContain('Seite 5b-10');
  });

  it('gibt den Prüfhinweis mit (FR-006)', () => {
    expect(result.preflightCheckNotice).toContain('Original-Flughandbuch');
  });
});

describe('Fall B — mit Interpolation', () => {
  const input: FlightPlanInput = {
    departureAltitudeFt: 1500,
    cruiseAltitudeFt: 7000,
    distanceNm: 250,
    powerSettingPct: 60,
    isaDeviationC: 5,
    windComponentKt: -5
  };
  const result = computeFuelPlan(input);

  it('trifft die Zwischenwerte des Sollwertdokuments', () => {
    const s = result.steps;

    expect(resultOf(s, 'climb.atDeparture', 'timeMin')).toBeCloseTo(1.65, 10);
    expect(resultOf(s, 'climb.atDeparture', 'distanceNm')).toBeCloseTo(1.95, 10);
    expect(resultOf(s, 'climb.atDeparture', 'fuelL')).toBeCloseTo(0.9, 10);

    expect(resultOf(s, 'climb.atCruise', 'timeMin')).toBeCloseTo(7.8, 10);
    expect(resultOf(s, 'climb.atCruise', 'distanceNm')).toBeCloseTo(10.1, 10);
    expect(resultOf(s, 'climb.atCruise', 'fuelL')).toBeCloseTo(4.4, 10);

    expect(resultOf(s, 'climb.difference', 'timeMin')).toBeCloseTo(6.15, 10);
    expect(resultOf(s, 'climb.difference', 'distanceNm')).toBeCloseTo(8.15, 10);
    expect(resultOf(s, 'climb.difference', 'fuelL')).toBeCloseTo(3.5, 10);

    expect(resultOf(s, 'climb.temperatureCorrection', 'timeMin')).toBeCloseTo(6.4575, 10);
    expect(resultOf(s, 'climb.temperatureCorrection', 'distanceNm')).toBeCloseTo(8.5575, 10);
    expect(resultOf(s, 'climb.temperatureCorrection', 'fuelL')).toBeCloseTo(3.675, 10);

    expect(resultOf(s, 'cruise.tableLookup', 'ktas')).toBeCloseTo(110, 10);
    expect(resultOf(s, 'cruise.tableLookup', 'fuelFlowLph')).toBeCloseTo(18.6, 10);

    expect(resultOf(s, 'cruise.ktasTemperatureCorrection', 'ktas')).toBeCloseTo(110.55, 10);
    expect(resultOf(s, 'cruise.distance', 'distanceNm')).toBeCloseTo(241.4425, 10);
    expect(resultOf(s, 'cruise.groundSpeed', 'groundSpeedKt')).toBeCloseTo(115.55, 10);
    expect(resultOf(s, 'cruise.time', 'timeH')).toBeCloseTo(2.08951, 5);
    expect(resultOf(s, 'cruise.fuel', 'fuelL')).toBeCloseTo(38.865, 3);
    expect(resultOf(s, 'total.fuel', 'fuelL')).toBeCloseTo(46.54, 3);
  });

  it('liefert den Sollwert 46,5 l und 80,9 l verbleibend', () => {
    expect(result.breakdown.totalL).toBe(46.5);
    expect(result.remainingFuelL).toBe(80.9);
    expect(result.exceedsUsableFuel).toBe(false);
  });

  it('interpoliert die Verbrauchsrate nicht weg — sie ist bei 6000 und 8000 ft gleich', () => {
    expect(resultOf(result.steps, 'cruise.tableLookup', 'fuelFlowLph')).toBe(18.6);
  });
});
