import { describe, expect, it } from 'vitest';
import { computeFuelPlan } from '../../src/fuel/fuelPlan.js';
import type { FlightPlanInput } from '../../src/fuel/input.js';

/**
 * Die Schrittfolge aus `specs/001-kraftstoffrechner-d-eelk/data-model.md`,
 * seit Feature 004 um die beiden vorgelagerten Umrechnungsschritte und seit
 * Feature 006 um die beiden Schritte der Reiseleistungs-Übersicht erweitert.
 * Sie ist Teil der Zusage an den Piloten (FR-017): jeder Schritt ist die
 * kleinste Einheit, die sich von Hand gegen das Handbuch nachrechnen lässt.
 */
const ERWARTETE_SCHRITTE = [
  'pressureAltitude.departure',
  'pressureAltitude.cruise',
  'startup.taxiTakeoff',
  'climb.atDeparture',
  'climb.atCruise',
  'climb.difference',
  'climb.temperatureCorrection',
  'cruise.tableLookup',
  'cruise.ktasTemperatureCorrection',
  'cruise.distance',
  'cruise.groundSpeed',
  'cruise.time',
  'cruise.fuel',
  'capability.tableLookup',
  'capability.temperatureCorrection',
  'capability.fuelPerNm',
  'total.fuel',
  'total.usableFuelComparison'
] as const;

const eingaben: readonly FlightPlanInput[] = [
  {
    departureElevationFt: 1000,
    cruiseAltitudeAmslFt: 6000,
    qnhHpa: 1013.25,
    distanceNm: 400,
    powerSettingPct: 70,
    isaDeviationC: 20,
    windComponentKt: 10
  },
  {
    departureElevationFt: 1500,
    cruiseAltitudeAmslFt: 7000,
    qnhHpa: 1013.25,
    distanceNm: 250,
    powerSettingPct: 60,
    isaDeviationC: 5,
    windComponentKt: -5
  },
  {
    departureElevationFt: 0,
    cruiseAltitudeAmslFt: 18000,
    qnhHpa: 1013.25,
    distanceNm: 600,
    powerSettingPct: 50,
    isaDeviationC: -20,
    windComponentKt: 0
  }
];

describe('Schrittfolge (FR-017)', () => {
  it.each(eingaben)('enthält die achtzehn Schritte in der festgelegten Reihenfolge', (input) => {
    const ids = computeFuelPlan(input).steps.map((step) => step.id);

    expect(ids).toEqual([...ERWARTETE_SCHRITTE]);
  });

  it.each(eingaben)('trägt zu jedem Schritt eine Erläuterung und ein Ergebnis', (input) => {
    for (const step of computeFuelPlan(input).steps) {
      expect(step.label.length, `Schritt ${step.id} ohne Bezeichnung`).toBeGreaterThan(0);
      expect(step.explanation.length, `Schritt ${step.id} ohne Erläuterung`).toBeGreaterThan(0);
      expect(Object.keys(step.results).length, `Schritt ${step.id} ohne Ergebnis`).toBeGreaterThan(
        0
      );

      for (const [key, quantity] of Object.entries(step.results)) {
        expect(Number.isFinite(quantity.value), `${step.id}.${key} ist keine endliche Zahl`).toBe(
          true
        );
      }
    }
  });

  it('erklärt bei ISA-Abweichung unter null, warum nicht korrigiert wird', () => {
    const result = computeFuelPlan({ ...(eingaben[2] as FlightPlanInput) });
    const climb = result.steps.find((step) => step.id === 'climb.temperatureCorrection');

    expect(climb?.explanation).toContain('Keine Korrektur');
    expect(climb?.results['fuelL']?.value).toBe(
      result.steps.find((step) => step.id === 'climb.difference')?.results['fuelL']?.value
    );
  });
});
