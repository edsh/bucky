import { describe, expect, it } from 'vitest';
import { computeCruiseCapability } from '../../src/fuel/cruiseCapability.js';
import { getTable } from '../../src/tables.js';
import { PohCalculationError } from '../../src/errors.js';

/**
 * Sollwerte werden aus der digitalisierten Tabelle gelesen, nicht
 * abgeschrieben: Der Test belegt, dass die Funktion die Tabelle wiedergibt,
 * und nicht, dass zwei Abschriften übereinstimmen (Prinzip I).
 */
const TABLE = getTable('5b-cruise-standard-1043kg');

/** Bei diesem QNH ist die Druckhöhe gleich der Höhe über dem Meeresspiegel. */
const STANDARD_QNH = 1013.25;

describe('Reiseleistung an den Stützstellen', () => {
  it('gibt jede Tabellenzeile unverändert wieder', () => {
    expect(TABLE.rows.length).toBeGreaterThan(0);

    for (const row of TABLE.rows) {
      const result = computeCruiseCapability({
        cruiseAltitudeAmslFt: row['pressure_altitude_ft'] as number,
        qnhHpa: STANDARD_QNH,
        powerSettingPct: row['power_setting_pct'] as number,
        isaDeviationC: 0
      });

      expect(result.pressureAltitude.pressureAltitudeFt).toBeCloseTo(
        row['pressure_altitude_ft'] as number,
        6
      );
      expect(result.tableKtas).toBe(row['ktas']);
      expect(result.ktas).toBe(row['ktas']);
      expect(result.fuelFlowLph).toBe(row['fuel_flow_lph']);
      expect(result.fuelFlowUsGph).toBe(row['fuel_flow_usgph']);
      expect(result.litresPerNm).toBeCloseTo(
        (row['fuel_flow_lph'] as number) / (row['ktas'] as number),
        10
      );
      expect(result.tableRangeNm).toBe(row['range_nm']);
      expect(result.maxRangeNm).toBe(row['range_nm']);
      expect(result.enduranceH).toBe(row['endurance_h']);
      expect(result.temperatureFactor).toBe(1);
    }
  });

  it('nennt die verwendete Tabelle mit Seitenzahl', () => {
    const result = computeCruiseCapability({
      cruiseAltitudeAmslFt: 6000,
      qnhHpa: STANDARD_QNH,
      powerSettingPct: 70,
      isaDeviationC: 0
    });

    expect(result.source.figure).toContain('5-4a');
    expect(result.source.pohPages.length).toBeGreaterThan(0);
    expect(result.source.pohPages).toContain('5b-14');
  });
});

describe('Zwischenwerte', () => {
  it('liegt bei einer Höhe zwischen zwei Stützstellen in allen fünf Werten dazwischen', () => {
    const lower = rowAt(2000, 70);
    const upper = rowAt(4000, 70);
    const result = computeCruiseCapability({
      cruiseAltitudeAmslFt: 3000,
      qnhHpa: STANDARD_QNH,
      powerSettingPct: 70,
      isaDeviationC: 0
    });

    between(result.tableKtas, lower['ktas'] as number, upper['ktas'] as number);
    between(result.fuelFlowLph, lower['fuel_flow_lph'] as number, upper['fuel_flow_lph'] as number);
    between(
      result.fuelFlowUsGph,
      lower['fuel_flow_usgph'] as number,
      upper['fuel_flow_usgph'] as number
    );
    between(result.tableRangeNm, lower['range_nm'] as number, upper['range_nm'] as number);
    between(result.enduranceH, lower['endurance_h'] as number, upper['endurance_h'] as number);
  });

  it('interpoliert nicht zwischen zwei Lasteinstellungen, sondern lehnt ab', () => {
    expect(() =>
      computeCruiseCapability({
        cruiseAltitudeAmslFt: 6000,
        qnhHpa: STANDARD_QNH,
        powerSettingPct: 65,
        isaDeviationC: 0
      })
    ).toThrow(PohCalculationError);
  });
});

describe('Temperaturkorrektur', () => {
  const bedingungen = {
    cruiseAltitudeAmslFt: 6000,
    qnhHpa: STANDARD_QNH,
    powerSettingPct: 70
  };

  it('erhöht Geschwindigkeit und Strecke bei 20 °C über ISA um genau 2 %', () => {
    const norm = computeCruiseCapability({ ...bedingungen, isaDeviationC: 0 });
    const warm = computeCruiseCapability({ ...bedingungen, isaDeviationC: 20 });

    expect(warm.temperatureFactor).toBeCloseTo(1.02, 10);
    expect(warm.ktas).toBeCloseTo(norm.tableKtas * 1.02, 10);
    expect(warm.maxRangeNm).toBeCloseTo(norm.tableRangeNm * 1.02, 10);
  });

  it('lässt die Flugdauer und den Verbrauch je Stunde unberührt', () => {
    const norm = computeCruiseCapability({ ...bedingungen, isaDeviationC: 0 });
    const warm = computeCruiseCapability({ ...bedingungen, isaDeviationC: 20 });

    expect(warm.enduranceH).toBe(norm.enduranceH);
    expect(warm.fuelFlowLph).toBe(norm.fuelFlowLph);
    expect(warm.fuelFlowUsGph).toBe(norm.fuelFlowUsGph);
  });

  it('leitet Liter pro NM aus der temperaturkorrigierten Eigengeschwindigkeit ab', () => {
    const norm = computeCruiseCapability({ ...bedingungen, isaDeviationC: 0 });
    const warm = computeCruiseCapability({ ...bedingungen, isaDeviationC: 20 });

    expect(norm.litresPerNm).toBeCloseTo(norm.fuelFlowLph / norm.ktas, 10);
    expect(warm.litresPerNm).toBeCloseTo(warm.fuelFlowLph / warm.ktas, 10);
    expect(warm.litresPerNm).toBeLessThan(norm.litresPerNm);
  });

  it('korrigiert unterhalb der Normtemperatur nicht', () => {
    const kalt = computeCruiseCapability({ ...bedingungen, isaDeviationC: -25 });

    expect(kalt.temperatureFactor).toBe(1);
    expect(kalt.ktas).toBe(kalt.tableKtas);
    expect(kalt.maxRangeNm).toBe(kalt.tableRangeNm);
  });
});

describe('Die Reichweite ist nicht nachrechenbar', () => {
  /**
   * Der Fund aus research.md, Entscheidung 1: Die Tabellenwerte für Reichweite
   * und Flugdauer schließen den Steigflug ein. Wer die Strecke aus
   * Geschwindigkeit mal Zeit bildete, wiese systematisch zu wenig aus — die
   * gefährliche Richtung. Dieser Test schlägt fehl, sollte das jemand tun.
   */
  it('weicht in jeder Zeile von Geschwindigkeit mal Flugdauer ab, und zwar nach oben', () => {
    let geprueft = 0;

    for (const row of TABLE.rows) {
      const produkt = (row['ktas'] as number) * (row['endurance_h'] as number);
      const tabelle = row['range_nm'] as number;
      expect(tabelle).toBeGreaterThan(produkt);
      geprueft += 1;
    }

    expect(geprueft).toBe(TABLE.rows.length);
  });

  it('weist bei 0 ft und 100 % die 365 NM der Tabelle aus, nicht die 362,5 NM des Produkts', () => {
    const row = rowAt(0, 100);
    const result = computeCruiseCapability({
      cruiseAltitudeAmslFt: 0,
      qnhHpa: STANDARD_QNH,
      powerSettingPct: 100,
      isaDeviationC: 0
    });

    expect(result.maxRangeNm).toBe(row['range_nm']);
    expect(result.maxRangeNm).not.toBeCloseTo(result.ktas * result.enduranceH, 1);
  });
});

describe('Wortlaut des Handbuchs', () => {
  const result = computeCruiseCapability({
    cruiseAltitudeAmslFt: 6000,
    qnhHpa: STANDARD_QNH,
    powerSettingPct: 70,
    isaDeviationC: 0
  });

  it('führt Anmerkung 2 unverändert mit', () => {
    const note = TABLE.notes.find((entry) => entry.startsWith('2.'));
    expect(result.inclusionsNote).toBe(note);
  });

  it('nennt alle vier Bestandteile der Anmerkung', () => {
    expect(result.inclusionsNote).toContain('4 l');
    expect(result.inclusionsNote).toContain('Steigflug');
    expect(result.inclusionsNote).toContain('Kraftstoff');
    expect(result.inclusionsNote).toContain('45 min');
  });

  it('führt die Bedingung „Windstille" unverändert mit', () => {
    expect(result.windlessNote).toBe('Windstille');
    expect(TABLE.conditions).toContain(result.windlessNote);
  });

  it('trägt denselben Prüfhinweis wie das Gesamtergebnis', () => {
    expect(result.preflightCheckNotice).toContain('Original-Flughandbuch');
  });
});

describe('Ablehnungen', () => {
  it('lehnt eine Druckhöhe außerhalb des Rasters ab', () => {
    const fehler = fehlerVon({
      cruiseAltitudeAmslFt: 18000,
      qnhHpa: 950,
      powerSettingPct: 50,
      isaDeviationC: 0
    });

    expect(fehler.kind).toBe('PRESSURE_ALTITUDE_OUT_OF_RANGE');
  });

  it('lehnt 100 % bei 12 000 ft ab und nennt die dort verfügbaren Lasteinstellungen', () => {
    const fehler = fehlerVon({
      cruiseAltitudeAmslFt: 12000,
      qnhHpa: STANDARD_QNH,
      powerSettingPct: 100,
      isaDeviationC: 0
    });

    expect(fehler.kind).toBe('UNSUPPORTED_COMBINATION');
    expect(fehler.message).toContain('50, 60, 70, 80, 90');
  });

  it('lehnt eine ISA-Abweichung außerhalb des Bereichs ab', () => {
    const fehler = fehlerVon({
      cruiseAltitudeAmslFt: 6000,
      qnhHpa: STANDARD_QNH,
      powerSettingPct: 70,
      isaDeviationC: 60
    });

    expect(fehler.kind).toBe('OUT_OF_RANGE');
    expect(fehler.field).toBe('isaDeviationC');
  });

  it('kennt weder Strecke noch Wind und wirft deshalb dort nicht', () => {
    const result = computeCruiseCapability({
      cruiseAltitudeAmslFt: 6000,
      qnhHpa: STANDARD_QNH,
      powerSettingPct: 70,
      isaDeviationC: 0,
      distanceNm: 1,
      windComponentKt: 50,
      departureElevationFt: 5000
    });

    expect(result.ktas).toBeGreaterThan(0);
  });
});

/** Ruft auf und liefert den erwarteten Fehler; ohne Fehler schlägt der Test fehl. */
function fehlerVon(input: unknown): PohCalculationError {
  try {
    computeCruiseCapability(input);
  } catch (error) {
    expect(error).toBeInstanceOf(PohCalculationError);
    return error as PohCalculationError;
  }
  throw new Error('Der Aufruf hätte abgelehnt werden müssen, lieferte aber ein Ergebnis.');
}

function rowAt(pressureAltitudeFt: number, powerSettingPct: number): Record<string, number> {
  const row = TABLE.rows.find(
    (entry) =>
      entry['pressure_altitude_ft'] === pressureAltitudeFt &&
      entry['power_setting_pct'] === powerSettingPct
  );
  if (row === undefined) {
    throw new Error(`Zeile ${pressureAltitudeFt} ft / ${powerSettingPct} % fehlt in der Tabelle.`);
  }
  return row;
}

function between(value: number, a: number, b: number): void {
  const min = Math.min(a, b);
  const max = Math.max(a, b);
  expect(value).toBeGreaterThanOrEqual(min);
  expect(value).toBeLessThanOrEqual(max);
}
