import { describe, expect, it } from 'vitest';
import { interpolate } from '../src/interpolate.js';
import { PohCalculationError } from '../src/errors.js';
import { CLIMB_TABLE_ID, CRUISE_TABLE_ID } from '../src/tables.js';

const climbQuery = {
  tableId: CLIMB_TABLE_ID,
  axisKey: 'pressure_altitude_ft',
  valueKeys: ['time_min', 'distance_nm', 'fuel_l'],
  field: 'cruiseAltitudeFt',
  axisUnit: 'ft'
} as const;

describe('interpolate', () => {
  it('gibt bei exakter Stützstelle den Tabellenwert unverändert zurück', () => {
    const result = interpolate({ ...climbQuery, axisValue: 6000 });

    expect(result.values['time_min']).toBe(6.7);
    expect(result.values['distance_nm']).toBe(8.5);
    expect(result.values['fuel_l']).toBe(3.7);
    expect(result.fraction).toBe(0);
    expect(result.anchors).toHaveLength(1);
  });

  it('interpoliert linear zwischen zwei Stützstellen', () => {
    const result = interpolate({ ...climbQuery, axisValue: 6500 });
    const lower = interpolate({ ...climbQuery, axisValue: 6000 }).values;
    const upper = interpolate({ ...climbQuery, axisValue: 7000 }).values;

    expect(result.fraction).toBeCloseTo(0.5, 10);
    for (const key of climbQuery.valueKeys) {
      const expected = ((lower[key] as number) + (upper[key] as number)) / 2;
      expect(result.values[key]).toBeCloseTo(expected, 10);
    }
  });

  it('nennt die beiden verwendeten Eckwerte samt Quellenangabe', () => {
    const result = interpolate({ ...climbQuery, axisValue: 6500 });

    expect(result.anchors).toHaveLength(2);
    expect(result.anchors[0]?.at['pressureAltitudeFt']).toBe(6000);
    expect(result.anchors[1]?.at['pressureAltitudeFt']).toBe(7000);
    expect(result.anchors[0]?.values['fuelL']).toBe(3.7);
    expect(result.anchors[0]?.source.figure).toBe('Abb. 5-3a');
    expect(result.anchors[0]?.source.citation).toContain('Abb. 5-3a');
  });

  it('führt die einschränkenden Spalten in der Stützstelle mit', () => {
    const result = interpolate({
      tableId: CRUISE_TABLE_ID,
      axisKey: 'pressure_altitude_ft',
      axisValue: 6000,
      valueKeys: ['ktas', 'fuel_flow_lph'],
      where: { power_setting_pct: 70 },
      field: 'cruiseAltitudeFt',
      axisUnit: 'ft'
    });

    expect(result.anchors[0]?.at).toEqual({ pressureAltitudeFt: 6000, powerSettingPct: 70 });
    expect(result.values['ktas']).toBe(116);
    expect(result.values['fuel_flow_lph']).toBe(22.1);
  });

  it('wirft OUT_OF_RANGE statt zu extrapolieren', () => {
    expect(() => interpolate({ ...climbQuery, axisValue: 20000 })).toThrowError(
      PohCalculationError
    );

    try {
      interpolate({ ...climbQuery, axisValue: 20000 });
      expect.unreachable('hätte werfen müssen');
    } catch (error) {
      const thrown = error as PohCalculationError;
      expect(thrown.kind).toBe('OUT_OF_RANGE');
      expect(thrown.allowedRange).toEqual({ min: 0, max: 18000, unit: 'ft' });
      expect(thrown.tableId).toBe(CLIMB_TABLE_ID);
      expect(thrown.message).toContain('18000');
    }
  });

  it('wirft UNSUPPORTED_COMBINATION, wenn die Einschränkung keine Zeilen lässt', () => {
    try {
      interpolate({
        tableId: CRUISE_TABLE_ID,
        axisKey: 'pressure_altitude_ft',
        axisValue: 6000,
        valueKeys: ['ktas'],
        where: { power_setting_pct: 65 },
        field: 'powerSettingPct',
        axisUnit: 'ft'
      });
      expect.unreachable('hätte werfen müssen');
    } catch (error) {
      expect((error as PohCalculationError).kind).toBe('UNSUPPORTED_COMBINATION');
    }
  });
});
