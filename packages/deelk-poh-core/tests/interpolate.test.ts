import { describe, expect, it } from 'vitest';
import { interpolate, interpolateGrid } from '../src/interpolate.js';
import { PohCalculationError } from '../src/errors.js';
import { CLIMB_TABLE_ID, CRUISE_TABLE_ID, TAKEOFF_TABLE_ID } from '../src/tables.js';

const climbQuery = {
  tableId: CLIMB_TABLE_ID,
  axisKey: 'pressure_altitude_ft',
  valueKeys: ['time_min', 'distance_nm', 'fuel_l'],
  field: 'cruiseAltitudeAmslFt',
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
      field: 'cruiseAltitudeAmslFt',
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
      expect(thrown.allowedRange).toEqual({ min: 0, max: 18000, unit: 'ft', step: 1 });
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

const takeoffQuery = {
  tableId: TAKEOFF_TABLE_ID,
  valueKeys: ['ground_roll', 'over_obstacle']
} as const;

/** Achsen der Startstreckentabelle in der Reihenfolge Höhe, Temperatur. */
function achsen(pressureAltitudeFt: number, oatC: number) {
  return [
    {
      key: 'pressure_altitude_ft',
      value: pressureAltitudeFt,
      field: 'departureElevationFt',
      unit: 'ft'
    },
    { key: 'oat_c', value: oatC, field: 'isaDeviationC', unit: '°C' }
  ] as const;
}

describe('interpolateGrid', () => {
  it('gibt bei exaktem Treffer beider Achsen den gedruckten Wert und einen Stützwert', () => {
    const result = interpolateGrid({ ...takeoffQuery, axes: achsen(0, 20) });

    expect(result.values['ground_roll']).toBe(204);
    expect(result.values['over_obstacle']).toBe(319);
    expect(result.anchors).toHaveLength(1);
    expect(result.fraction).toBe(0);
    expect(result.secondaryFraction).toBe(0);
  });

  it('liefert zwei Stützwerte, wenn nur eine Achse zwischen Stützstellen liegt', () => {
    const nurHoehe = interpolateGrid({ ...takeoffQuery, axes: achsen(500, 20) });
    const nurTemperatur = interpolateGrid({ ...takeoffQuery, axes: achsen(0, 15) });

    expect(nurHoehe.anchors).toHaveLength(2);
    expect(nurHoehe.fraction).toBeCloseTo(0.5, 10);
    expect(nurHoehe.secondaryFraction).toBe(0);

    expect(nurTemperatur.anchors).toHaveLength(2);
    expect(nurTemperatur.fraction).toBe(0);
    expect(nurTemperatur.secondaryFraction).toBeCloseTo(0.5, 10);
  });

  it('liefert vier Stützwerte, wenn beide Achsen zwischen Stützstellen liegen', () => {
    const result = interpolateGrid({ ...takeoffQuery, axes: achsen(500, 15) });

    expect(result.anchors).toHaveLength(4);
    // Jeder Stützwert trägt beide Achsenwerte — sonst ließe sich das Ergebnis
    // nicht gegen die gedruckte Tabelle halten.
    for (const anchor of result.anchors) {
      expect(anchor.at).toHaveProperty('pressureAltitudeFt');
      expect(anchor.at).toHaveProperty('oatC');
    }
    expect(new Set(result.anchors.map((anchor) => anchor.at['pressureAltitudeFt']))).toEqual(
      new Set([0, 1000])
    );
    expect(new Set(result.anchors.map((anchor) => anchor.at['oatC']))).toEqual(new Set([10, 20]));
  });

  it('mischt beide Achsen linear', () => {
    // Mittelwert der vier Eckwerte, weil beide Anteile genau 0,5 betragen.
    const ecken = [
      interpolateGrid({ ...takeoffQuery, axes: achsen(0, 10) }),
      interpolateGrid({ ...takeoffQuery, axes: achsen(0, 20) }),
      interpolateGrid({ ...takeoffQuery, axes: achsen(1000, 10) }),
      interpolateGrid({ ...takeoffQuery, axes: achsen(1000, 20) })
    ].map((eintrag) => eintrag.values['ground_roll'] as number);
    const erwartet = ecken.reduce((summe, wert) => summe + wert, 0) / 4;

    expect(interpolateGrid({ ...takeoffQuery, axes: achsen(500, 15) }).values['ground_roll']).toBeCloseTo(
      erwartet,
      10
    );
  });

  it('behandelt das ungleichabständige Temperaturraster richtig', () => {
    // Zwischen −20 und 0 °C liegen 20 °C, darüber je 10. Eine angenommene
    // Schrittweite ergäbe hier den falschen Nachbarn.
    const result = interpolateGrid({ ...takeoffQuery, axes: achsen(0, -10) });
    const unten = interpolateGrid({ ...takeoffQuery, axes: achsen(0, -20) }).values['ground_roll'] as number;
    const oben = interpolateGrid({ ...takeoffQuery, axes: achsen(0, 0) }).values['ground_roll'] as number;

    expect(result.secondaryFraction).toBeCloseTo(0.5, 10);
    expect(result.values['ground_roll']).toBeCloseTo((unten + oben) / 2, 10);
  });

  it('extrapoliert auf keiner der beiden Achsen', () => {
    expect(() => interpolateGrid({ ...takeoffQuery, axes: achsen(10001, 20) })).toThrow(
      PohCalculationError
    );
    expect(() => interpolateGrid({ ...takeoffQuery, axes: achsen(-1, 20) })).toThrow(
      PohCalculationError
    );
    expect(() => interpolateGrid({ ...takeoffQuery, axes: achsen(0, 51) })).toThrow(
      PohCalculationError
    );
    expect(() => interpolateGrid({ ...takeoffQuery, axes: achsen(0, -21) })).toThrow(
      PohCalculationError
    );
  });
});
