import { describe, expect, it } from 'vitest';
import { computeFuelPlan } from '../../src/fuel/fuelPlan.js';
import { USABLE_FUEL_L, USABLE_FUEL_US_GAL } from '../../src/tables.js';
import type { FlightPlanInput } from '../../src/fuel/input.js';

/**
 * Das Handbuch führt Kraftstoff in Litern **und** in US-Gallonen. Beide Spalten
 * werden übernommen, statt die Gallonen aus den Litern zu errechnen — die
 * Wertepaare des Originals sind gerundet und stimmen mit einer eigenen
 * Umrechnung nicht überall überein (FR-009).
 */

const LITER_JE_US_GALLONE = 3.785411784;

const input: FlightPlanInput = {
  departureElevationFt: 0,
  cruiseAltitudeAmslFt: 6000,
  qnhHpa: 1013.25,
  distanceNm: 250,
  powerSettingPct: 70,
  isaDeviationC: 0,
  windComponentKt: 0
};

describe('Kraftstoff in US-Gallonen', () => {
  it('nennt die ausfliegbare Menge so, wie das Handbuch sie schreibt', () => {
    // Genau hier liegt der Grund für die Entscheidung: 127,4 l ergäben
    // gerechnet 33,66 US gal, das Handbuch schreibt aber 33,6.
    expect(USABLE_FUEL_US_GAL).toBe(33.6);
    expect(USABLE_FUEL_L / LITER_JE_US_GALLONE).toBeCloseTo(33.66, 2);
    expect(USABLE_FUEL_US_GAL).not.toBe(Math.round((USABLE_FUEL_L / LITER_JE_US_GALLONE) * 10) / 10);
  });

  it('gibt jeden Posten in beiden Einheiten aus', () => {
    const result = computeFuelPlan(input);

    expect(result.breakdownUsGal.taxiTakeoffUsGal).toBe(1.1);
    expect(result.breakdownUsGal.totalUsGal).toBeGreaterThan(0);
    expect(result.usableFuelUsGal).toBe(USABLE_FUEL_US_GAL);
  });

  it('bleibt in der Größenordnung der Umrechnung, ohne sie zu verwenden', () => {
    const result = computeFuelPlan(input);
    const gerechnet = result.breakdown.totalL / LITER_JE_US_GALLONE;

    expect(result.breakdownUsGal.totalUsGal).toBeCloseTo(gerechnet, 0);
  });

  it('summiert die Gallonen aus denselben Posten wie die Liter', () => {
    const { breakdownUsGal } = computeFuelPlan(input);
    const summe =
      breakdownUsGal.taxiTakeoffUsGal + breakdownUsGal.climbUsGal + breakdownUsGal.cruiseUsGal;

    expect(breakdownUsGal.totalUsGal).toBeCloseTo(summe, 1);
  });
});
