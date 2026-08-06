import { describe, expect, it } from 'vitest';
import {
  getFuelPlanInputDomain,
  getPowerSettingsByPressureAltitude,
  validateFlightPlan,
  type FlightPlanInput
} from '../../src/fuel/input.js';
import { PohCalculationError } from '../../src/errors.js';

const valid: FlightPlanInput = {
  departureAltitudeFt: 1000,
  cruiseAltitudeFt: 6000,
  distanceNm: 400,
  powerSettingPct: 70,
  isaDeviationC: 20,
  windComponentKt: 10
};

function expectThrows(input: unknown, kind: string, field?: string): PohCalculationError {
  try {
    validateFlightPlan(input);
    expect.unreachable('hätte werfen müssen');
  } catch (error) {
    const thrown = error as PohCalculationError;
    expect(thrown.kind).toBe(kind);
    if (field !== undefined) {
      expect(thrown.field).toBe(field);
    }
    return thrown;
  }
  throw new Error('unerreichbar');
}

describe('validateFlightPlan', () => {
  it('lässt ein gültiges Flugvorhaben durch', () => {
    expect(validateFlightPlan(valid)).toEqual(valid);
  });

  it('weist ein fehlendes Feld zurück (FR-008)', () => {
    const { windComponentKt: _unused, ...incomplete } = valid;
    expectThrows(incomplete, 'INVALID_INPUT', 'windComponentKt');
  });

  it('weist eine Reiseflughöhe auf oder unter der Platzhöhe zurück (V-01)', () => {
    expectThrows({ ...valid, cruiseAltitudeFt: 1000 }, 'INVALID_INPUT', 'cruiseAltitudeFt');
    expectThrows({ ...valid, cruiseAltitudeFt: 500 }, 'INVALID_INPUT', 'cruiseAltitudeFt');
  });

  it('weist eine Höhe außerhalb des Tabellenrasters zurück (V-02)', () => {
    const thrown = expectThrows(
      { ...valid, cruiseAltitudeFt: 20000 },
      'OUT_OF_RANGE',
      'cruiseAltitudeFt'
    );
    expect(thrown.allowedRange).toEqual({ min: 0, max: 18000, unit: 'ft' });
  });

  it('weist eine im Raster nicht belegte Kombination zurück (V-03)', () => {
    const thrown = expectThrows(
      { ...valid, cruiseAltitudeFt: 12000, powerSettingPct: 100 },
      'UNSUPPORTED_COMBINATION',
      'powerSettingPct'
    );
    expect(thrown.message).toContain('12000 ft');
  });

  it('weist die Kombination auch zurück, wenn nur die obere Stützstelle sie nicht führt', () => {
    // 90 % gibt es bei 14000 ft, aber nicht bei 16000 ft — zwischen beiden
    // ließe sich nicht interpolieren.
    expectThrows(
      { ...valid, cruiseAltitudeFt: 15000, powerSettingPct: 90 },
      'UNSUPPORTED_COMBINATION',
      'powerSettingPct'
    );
  });

  it('weist eine Strecke von null oder weniger zurück', () => {
    expectThrows({ ...valid, distanceNm: 0 }, 'INVALID_INPUT', 'distanceNm');
  });
});

describe('getFuelPlanInputDomain', () => {
  it('leitet die Grenzen aus den Tabellen ab statt sie zu verdrahten', () => {
    const domain = getFuelPlanInputDomain();

    expect(domain.cruiseAltitudeFt).toEqual({ min: 0, max: 18000, unit: 'ft' });
    expect(domain.powerSettingPct).toEqual({ min: 50, max: 100, unit: '%' });
    expect(domain.isaDeviationC).toEqual({ min: -30, max: 40, unit: '°C' });
  });

  it('gibt das höhenabhängige Raster der Lasteinstellungen wieder', () => {
    const byAltitude = getPowerSettingsByPressureAltitude();
    const at = (altitude: number): readonly number[] =>
      byAltitude.find((entry) => entry.pressureAltitudeFt === altitude)?.powerSettingsPct ?? [];

    expect(at(0)).toContain(100);
    expect(at(8000)).toContain(100);
    expect(at(10000)).not.toContain(100);
    expect(Math.max(...at(10000))).toBe(90);
    expect(Math.max(...at(16000))).toBe(80);
  });
});
