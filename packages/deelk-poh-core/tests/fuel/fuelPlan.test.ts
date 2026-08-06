import { describe, expect, it } from 'vitest';
import { computeFuelPlan } from '../../src/fuel/fuelPlan.js';
import { computeCruiseCapability } from '../../src/fuel/cruiseCapability.js';
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
    departureElevationFt: 1000,
    cruiseAltitudeAmslFt: 6000,
    qnhHpa: 1013.25,
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
    // Die Norm-Referenz der Druckhöhe steht daneben, zählt hier aber nicht mit:
    // sie hat weder Abbildung noch Seitenzahl (Constitution, Prinzip I).
    const poh = result.sources.filter((source) => source.kind === 'poh');
    const figures = poh.map((source) => source.figure).sort();

    expect(figures).toEqual(['Abb. 5-3a', 'Abb. 5-4a']);
    expect(poh[0]?.citation).toContain('Seite 5b-10');
  });

  it('gibt den Prüfhinweis mit (FR-006)', () => {
    expect(result.preflightCheckNotice).toContain('Original-Flughandbuch');
  });
});

describe('Fall B — mit Interpolation', () => {
  const input: FlightPlanInput = {
    departureElevationFt: 1500,
    cruiseAltitudeAmslFt: 7000,
    qnhHpa: 1013.25,
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

  it('weist Geschwindigkeit und Stundenverbrauch aus, deckungsgleich mit dem Rechenweg', () => {
    // Ohne diese Prüfung könnte die Kurzfassung stillschweigend von den
    // Schritten abweichen — sie stünde dann als zweite Wahrheit daneben.
    const { cruisePerformance } = result;
    expect(cruisePerformance.ktas).toBe(
      resultOf(result.steps, 'cruise.ktasTemperatureCorrection', 'ktas')
    );
    expect(cruisePerformance.groundSpeedKt).toBe(
      resultOf(result.steps, 'cruise.groundSpeed', 'groundSpeedKt')
    );
    expect(cruisePerformance.fuelFlowLph).toBe(
      resultOf(result.steps, 'cruise.tableLookup', 'fuelFlowLph')
    );
    expect(cruisePerformance.timeH).toBe(resultOf(result.steps, 'cruise.time', 'timeH'));

    // Der Stundenverbrauch stammt aus der eigenen US-gph-Spalte der Tabelle,
    // nicht aus einer Umrechnung der Liter (FR-009).
    expect(cruisePerformance.fuelFlowUsGph).toBe(
      resultOf(result.steps, 'cruise.tableLookup', 'fuelFlowUsGph')
    );
  });
});

describe('Abgrenzung von Bedarf und Auskunft (Feature 006)', () => {
  const input: FlightPlanInput = {
    departureElevationFt: 1000,
    cruiseAltitudeAmslFt: 6000,
    qnhHpa: 1013.25,
    distanceNm: 250,
    powerSettingPct: 70,
    isaDeviationC: 5,
    windComponentKt: -5
  };
  const result = computeFuelPlan(input);

  it('liefert dieselben Zahlen wie der unmittelbare Aufruf der Übersicht', () => {
    // Zwei Wege, eine Zahl (Prinzip IV). Ohne diese Prüfung könnte die
    // Einbettung stillschweigend von der eigenständigen Funktion abweichen.
    const direkt = computeCruiseCapability(input);

    expect(result.cruiseCapability.ktas).toBe(direkt.ktas);
    expect(result.cruiseCapability.fuelFlowLph).toBe(direkt.fuelFlowLph);
    expect(result.cruiseCapability.fuelFlowUsGph).toBe(direkt.fuelFlowUsGph);
    expect(result.cruiseCapability.maxRangeNm).toBe(direkt.maxRangeNm);
    expect(result.cruiseCapability.enduranceH).toBe(direkt.enduranceH);
  });

  it('lässt den Hinweis unberührt, dass der Rest keine Reserve ist (FR-007)', () => {
    const vergleich = stepOf(result.steps, 'total.usableFuelComparison');

    expect(vergleich.explanation).toContain('keine Reserve');
    expect(vergleich.explanation).toContain('45-Minuten-Reserve ist darin nicht enthalten');
  });

  it('trennt die Reserve der Übersicht von der Bedarfssumme', () => {
    // Die 45 Minuten stecken in den Tabellenwerten für Strecke und Dauer,
    // nicht in der aufsummierten Bedarfsmenge. Beide Aussagen stehen im
    // Ergebnis nebeneinander und dürfen sich nicht vermischen.
    expect(result.cruiseCapability.inclusionsNote).toContain('45 min');
    expect(result.exact.totalL).toBeLessThan(result.usableFuelL);
  });

  it('rechnet die Übersicht nicht in den Bedarf hinein', () => {
    expect(result.exact.totalL).toBeCloseTo(
      result.exact.taxiTakeoffL + result.exact.climbL + result.exact.cruiseL,
      10
    );
  });

  it('weist die Reiseflugzeit der eingegebenen Strecke getrennt von der Flugdauer aus', () => {
    expect(result.cruisePerformance.timeH).not.toBe(result.cruiseCapability.enduranceH);
    expect(result.cruiseCapability.enduranceH).toBeGreaterThan(result.cruisePerformance.timeH);
  });
});
