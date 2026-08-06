import { describe, expect, it } from 'vitest';
import {
  ICAO_STANDARD_ATMOSPHERE_SOURCE,
  toPressureAltitude
} from '../../src/atmosphere/pressureAltitude.js';

const STANDARDDRUCK = 1013.25;

describe('Probe bei Standarddruck', () => {
  /**
   * Bei 1013,25 hPa ist die Druckhöhe definitionsgemäß gleich der Höhe über
   * dem Meeresspiegel (SC-002). Geprüft wird auf **exakte** Gleichheit, nicht
   * auf Nähe: Die naheliegende Schreibweise der Formel enthält die Differenz
   * 1 − (1 − x) und liefert hier 6999,999999999992 ft. Wenige Picofuß sind
   * physikalisch bedeutungslos, verschieben aber eine Höhe, die genau auf einer
   * Stützstelle liegt, in das Nachbarintervall der Tabelle. Dieser Test ist der
   * Wächter gegen ein Zurückfallen in jene Form.
   */
  for (const hoehe of [0, 85, 1000, 1500, 6000, 7000, 8000, 10000, 18000]) {
    it(`${hoehe} ft bleiben exakt ${hoehe} ft`, () => {
      const ergebnis = toPressureAltitude(hoehe, STANDARDDRUCK);
      expect(ergebnis.pressureAltitudeFt).toBe(hoehe);
    });
  }

  it('ist auch bei 18 000 ft exakt und nicht nur auf 0,01 ft genau', () => {
    // Mit dem gerundeten Literal 0,190263 statt 1/5,25588 käme hier
    // 17 999,99 ft heraus. Genau diesen Unterschied prüft dieser Fall.
    const ergebnis = toPressureAltitude(18000, STANDARDDRUCK);
    expect(Math.abs(ergebnis.pressureAltitudeFt - 18000)).toBeLessThan(1e-6);
  });
});

describe('Monotonie', () => {
  it('höherer Luftdruck senkt die Druckhöhe', () => {
    const tief = toPressureAltitude(1000, 990).pressureAltitudeFt;
    const mittel = toPressureAltitude(1000, 1013.25).pressureAltitudeFt;
    const hoch = toPressureAltitude(1000, 1030).pressureAltitudeFt;
    expect(tief).toBeGreaterThan(mittel);
    expect(mittel).toBeGreaterThan(hoch);
  });

  it('größere Höhe erhöht die Druckhöhe', () => {
    const unten = toPressureAltitude(500, 1000).pressureAltitudeFt;
    const oben = toPressureAltitude(5000, 1000).pressureAltitudeFt;
    expect(oben).toBeGreaterThan(unten);
  });
});

describe('nachgerechnete Randwerte (research.md, Punkt 4)', () => {
  const faelle: readonly [number, number, number][] = [
    [0, 1050, -989],
    [85, 1030, -369],
    [16000, 950, 17578],
    [18000, 950, 19553]
  ];

  for (const [hoehe, qnh, erwartet] of faelle) {
    it(`${hoehe} ft bei ${qnh} hPa ergibt ${erwartet} ft`, () => {
      const ergebnis = toPressureAltitude(hoehe, qnh);
      expect(Math.round(ergebnis.pressureAltitudeFt)).toBe(erwartet);
    });
  }
});

describe('Abstand zur Faustformel', () => {
  it('ist bei Standarddruck null', () => {
    expect(toPressureAltitude(1000, STANDARDDRUCK).deviationFromRuleOfThumbFt).toBeCloseTo(0, 9);
  });

  it('beträgt bei 6000 ft und QNH 1043 rund 123 ft', () => {
    // Der Wert aus research.md. Er belegt, dass die Faustformel keine
    // Rundungsfrage ist, sondern in der Größenordnung einer Stützstelle irrt.
    const ergebnis = toPressureAltitude(6000, 1043);
    expect(Math.round(Math.abs(ergebnis.deviationFromRuleOfThumbFt))).toBe(123);
  });
});

describe('Quellenangabe', () => {
  it('weist sich als Norm aus, nicht als Handbuchtabelle', () => {
    expect(ICAO_STANDARD_ATMOSPHERE_SOURCE.kind).toBe('standard');
    expect(ICAO_STANDARD_ATMOSPHERE_SOURCE.standard).toMatch(/ICAO Doc 7488/);
    expect(ICAO_STANDARD_ATMOSPHERE_SOURCE.citation).toMatch(/nicht aus dem Flughandbuch/);
  });
});
