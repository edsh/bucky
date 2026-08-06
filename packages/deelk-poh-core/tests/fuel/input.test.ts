import { describe, expect, it } from 'vitest';
import {
  getFuelPlanInputDomain,
  getPowerSettingsByPressureAltitude,
  getPressureAltitudeRange,
  validateFlightPlan,
  type FlightPlanInput
} from '../../src/fuel/input.js';
import { PohCalculationError } from '../../src/errors.js';

const valid: FlightPlanInput = {
  departureElevationFt: 1000,
  cruiseAltitudeAmslFt: 6000,
  qnhHpa: 1013.25,
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
    const geprueft = validateFlightPlan(valid);
    expect(geprueft.plan).toEqual(valid);
  });

  it('liefert die beiden errechneten Druckhöhen mit (T019)', () => {
    // Bei Standarddruck sind sie den eingegebenen Höhen gleich; die Prüfung
    // rechnet also nicht heimlich etwas anderes.
    const geprueft = validateFlightPlan(valid);
    expect(geprueft.departure.pressureAltitudeFt).toBe(valid.departureElevationFt);
    expect(geprueft.cruise.pressureAltitudeFt).toBe(valid.cruiseAltitudeAmslFt);
  });

  it('lehnt eine Druckhöhe unterhalb des Tabellenbereichs ab, statt sie anzuheben (FR-006a)', () => {
    const thrown = expectThrows(
      { ...valid, departureElevationFt: 90, cruiseAltitudeAmslFt: 6000, qnhHpa: 1030 },
      'PRESSURE_ALTITUDE_OUT_OF_RANGE',
      'departureElevationFt'
    );
    expect(thrown.message).toContain('1030');
    expect(thrown.message).toContain('unter');
    expect(thrown.qnhHpa).toBe(1030);
  });

  it('weist ein fehlendes Feld zurück (FR-008)', () => {
    const { windComponentKt: _unused, ...incomplete } = valid;
    expectThrows(incomplete, 'INVALID_INPUT', 'windComponentKt');
  });

  it('weist eine Reiseflughöhe auf oder unter der Platzhöhe zurück (V-01)', () => {
    expectThrows(
      { ...valid, cruiseAltitudeAmslFt: 1000 },
      'INVALID_INPUT',
      'cruiseAltitudeAmslFt'
    );
    expectThrows({ ...valid, cruiseAltitudeAmslFt: 500 }, 'INVALID_INPUT', 'cruiseAltitudeAmslFt');
  });

  it('weist eine Höhe außerhalb des Tabellenrasters zurück (V-02)', () => {
    const thrown = expectThrows(
      { ...valid, cruiseAltitudeAmslFt: 20000 },
      'OUT_OF_RANGE',
      'cruiseAltitudeAmslFt'
    );
    expect(thrown.allowedRange).toEqual({ min: 0, max: 18000, unit: 'ft', step: 100 });
  });

  it('weist eine im Raster nicht belegte Kombination zurück (V-03)', () => {
    const thrown = expectThrows(
      { ...valid, cruiseAltitudeAmslFt: 12000, powerSettingPct: 100 },
      'UNSUPPORTED_COMBINATION',
      'powerSettingPct'
    );
    expect(thrown.message).toContain('12000 ft');
  });

  it('weist die Kombination auch zurück, wenn nur die obere Stützstelle sie nicht führt', () => {
    // 90 % gibt es bei 14000 ft, aber nicht bei 16000 ft — zwischen beiden
    // ließe sich nicht interpolieren.
    expectThrows(
      { ...valid, cruiseAltitudeAmslFt: 15000, powerSettingPct: 90 },
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

    // Die Höhengrenzen beziehen sich seit Feature 004 auf die Höhe über dem
    // Meeresspiegel und stammen daher nicht mehr aus dem Tabellenraster; das
    // Raster begrenzt nun die errechnete Druckhöhe (siehe FR-006).
    expect(domain.cruiseAltitudeAmslFt).toEqual({ min: 0, max: 18000, unit: 'ft', step: 100 });
    expect(domain.departureElevationFt).toEqual({ min: 0, max: 10000, unit: 'ft', step: 10 });
    expect(domain.qnhHpa).toEqual({ min: 950, max: 1050, unit: 'hPa', step: 1 });
    expect(domain.powerSettingPct).toEqual({ min: 50, max: 100, unit: '%', step: 5 });
    expect(domain.isaDeviationC).toEqual({ min: -30, max: 40, unit: '°C', step: 1 });
    expect(getPressureAltitudeRange()).toEqual({ min: 0, max: 18000, unit: 'ft', step: 100 });
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
