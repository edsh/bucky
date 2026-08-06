import { describe, expect, it } from 'vitest';
import { computeFuelPlan } from '../../src/fuel/fuelPlan.js';
import { PohCalculationError } from '../../src/errors.js';
import type { FlightPlanInput } from '../../src/fuel/input.js';

const base: FlightPlanInput = {
  departureAltitudeFt: 1000,
  cruiseAltitudeFt: 6000,
  distanceNm: 400,
  powerSettingPct: 70,
  isaDeviationC: 20,
  windComponentKt: 10
};

function catchError(input: FlightPlanInput): PohCalculationError {
  try {
    computeFuelPlan(input);
  } catch (error) {
    return error as PohCalculationError;
  }
  throw new Error('hätte werfen müssen');
}

describe('Abbruchfälle während der Rechnung', () => {
  it('bricht ab, wenn die Strecke die Steigflugstrecke nicht übersteigt (V-05)', () => {
    const error = catchError({ ...base, distanceNm: 8 });

    expect(error.kind).toBe('NOT_COMPUTABLE');
    expect(error.field).toBe('distanceNm');
    expect(error.message).toContain('Steigflugstrecke');
  });

  it('bricht auch bei exakt gleicher Strecke ab', () => {
    // Steigflugstrecke bei diesen Eingaben: 8,64 NM.
    expect(catchError({ ...base, distanceNm: 8.64 }).kind).toBe('NOT_COMPUTABLE');
  });

  it('kann V-06 mit gültiger Eingabe nicht auslösen — die Prüfung bleibt trotzdem stehen', () => {
    // Die kleinste KTAS der Reiseleistungstabelle ist 95 kt, der stärkste
    // zulässige Gegenwind 50 kt. Eine Geschwindigkeit über Grund von null oder
    // weniger ist damit nicht erreichbar. Die Prüfung ist eine Absicherung
    // gegen künftige Änderungen des Wertebereichs, kein toter Zweig ohne Zweck.
    expect(() => computeFuelPlan({ ...base, windComponentKt: 50 })).not.toThrow();
    expect(computeFuelPlan({ ...base, windComponentKt: 50 }).exact.totalL).toBeGreaterThan(0);
  });

  it('rechnet knapp unterhalb der Grenze noch', () => {
    expect(() => computeFuelPlan({ ...base, distanceNm: 8.7 })).not.toThrow();
  });
});

describe('Warnung bei Überschreiten der ausfliegbaren Menge (FR-016)', () => {
  it('warnt, wenn der Bedarf die ausfliegbare Menge erreicht', () => {
    const result = computeFuelPlan({ ...base, distanceNm: 700 });

    expect(result.exceedsUsableFuel).toBe(true);
    expect(result.remainingFuelL).toBeLessThan(0);
  });

  it('vergleicht den ungerundeten Bedarf, damit die Warnung nicht wegrundet', () => {
    const result = computeFuelPlan({ ...base, distanceNm: 700 });

    expect(result.exact.totalL).toBeGreaterThan(result.usableFuelL);
  });
});

describe('Determinismus (Constitution-Prinzip I)', () => {
  it('liefert zweimal dieselbe Eingabe bitgleich dasselbe Ergebnis', () => {
    const first = computeFuelPlan(base);
    const second = computeFuelPlan(base);

    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });

  it('liefert für dasselbe Flugvorhaben unabhängig von der Feldreihenfolge dasselbe Ergebnis', () => {
    const reordered = {
      windComponentKt: base.windComponentKt,
      isaDeviationC: base.isaDeviationC,
      powerSettingPct: base.powerSettingPct,
      distanceNm: base.distanceNm,
      cruiseAltitudeFt: base.cruiseAltitudeFt,
      departureAltitudeFt: base.departureAltitudeFt
    };

    expect(computeFuelPlan(reordered).breakdown).toEqual(computeFuelPlan(base).breakdown);
  });
});

describe('Hinweise ohne Abbruch (FR-018 bis FR-020)', () => {
  it('weist immer auf fehlende Reserve, Temperaturkorrektur und Rundung hin', () => {
    const ids = computeFuelPlan(base).advisories.map((advisory) => advisory.id);

    expect(ids).toContain('noReserve');
    expect(ids).toContain('climbFuelTemperatureCorrection');
    expect(ids).toContain('roundingOnce');
    expect(ids).toContain('climbTableWeight');
  });

  it('gibt Anmerkung 4 erst über 75 % Last wieder', () => {
    // Das Raster kennt nur 50, 60, 70, 80, 90 und 100 % — über 75 % liegen
    // also genau 80, 90 und 100 %.
    const at70 = computeFuelPlan({ ...base, powerSettingPct: 70 });
    const at80 = computeFuelPlan({ ...base, powerSettingPct: 80 });

    expect(at70.advisories.map((entry) => entry.id)).not.toContain('highPowerSetting');
    expect(at80.advisories.map((entry) => entry.id)).toContain('highPowerSetting');
    expect(at80.advisories.find((entry) => entry.id === 'highPowerSetting')?.text).toContain(
      'nicht empfohlen'
    );
  });
});
