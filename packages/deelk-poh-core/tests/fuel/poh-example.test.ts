import { describe, expect, it } from 'vitest';
import { climbTemperatureFactor } from '../../src/fuel/climb.js';
import { ktasTemperatureFactor } from '../../src/fuel/cruise.js';
import { roundKnots, roundLitres, roundNauticalMiles, roundTo } from '../../src/format.js';

/**
 * Fall C aus `specs/001-kraftstoffrechner-d-eelk/reference-calculation.md`.
 *
 * Das Handbuch rechnet auf Seite 5-3 bis 5-5 ein vollständiges Beispiel vor und
 * nennt jeden Zwischenwert. Es verwendet die Tabellen des Abschnitts 5a
 * (Propeller MTV-6-A/187-129), die für D-EELK nicht gelten — als Prüfung des
 * *Verfahrens* ist es dennoch die beste verfügbare Grundlage, weil die
 * Erwartungswerte vom Hersteller stammen und nicht von uns.
 *
 * Die vier 5a-Werte stehen bewusst hier als Zahlenkonstanten und nicht in
 * `data/poh/`: dort würden sie als anwendbare Tabelle gelten und FR-015
 * verletzen.
 */
const SECTION_5A = {
  climbFuelL: 3.3,
  climbDistanceNm: 7.6,
  ktas: 120,
  fuelFlowLph: 22.1
} as const;

const EXAMPLE = {
  distanceNm: 400,
  isaDeviationC: 20,
  windComponentKt: 10,
  taxiTakeoffL: 4
} as const;

/** Die im Handbuch abgedruckten Zwischenwerte und die Summe. */
const HANDBOOK = {
  climbFuelL: 4.0,
  climbDistanceNm: 9.1,
  ktas: 122,
  cruiseDistanceNm: 390.9,
  groundSpeedKt: 112,
  cruiseTimeH: 3.5,
  cruiseFuelL: 77.4,
  totalL: 85.4
} as const;

describe('Fall C — Rechenbeispiel des Handbuchs (Abschnitt 5a)', () => {
  /**
   * Das Handbuch rundet nach jedem Schritt. Nur so lässt sich seine Rechnung
   * Zeile für Zeile nachvollziehen — der Kern selbst rundet genau einmal
   * (FR-020), deshalb wird die Schrittfolge hier von Hand nachgebildet und nur
   * die Korrekturfaktoren und die Rundung aus dem Kern verwendet.
   */
  const climbFuelL = roundLitres(SECTION_5A.climbFuelL * climbTemperatureFactor(EXAMPLE.isaDeviationC));
  const climbDistanceNm = roundNauticalMiles(
    SECTION_5A.climbDistanceNm * climbTemperatureFactor(EXAMPLE.isaDeviationC)
  );
  const ktas = roundKnots(SECTION_5A.ktas * ktasTemperatureFactor(EXAMPLE.isaDeviationC));
  const cruiseDistanceNm = roundNauticalMiles(EXAMPLE.distanceNm - climbDistanceNm);
  const groundSpeedKt = roundKnots(ktas - EXAMPLE.windComponentKt);
  const cruiseTimeH = roundTo(cruiseDistanceNm / groundSpeedKt, 1);
  const cruiseFuelL = roundLitres(cruiseTimeH * SECTION_5A.fuelFlowLph);
  const totalL = roundLitres(EXAMPLE.taxiTakeoffL + climbFuelL + cruiseFuelL);

  it('trifft den korrigierten Steigflug-Kraftstoff', () => {
    expect(climbFuelL).toBe(HANDBOOK.climbFuelL);
  });

  it('trifft die korrigierte Steigflugstrecke', () => {
    expect(climbDistanceNm).toBe(HANDBOOK.climbDistanceNm);
  });

  it('trifft die korrigierte wahre Fluggeschwindigkeit', () => {
    expect(ktas).toBe(HANDBOOK.ktas);
  });

  it('trifft Reiseflugstrecke, Geschwindigkeit über Grund und Reiseflugzeit', () => {
    expect(cruiseDistanceNm).toBe(HANDBOOK.cruiseDistanceNm);
    expect(groundSpeedKt).toBe(HANDBOOK.groundSpeedKt);
    expect(cruiseTimeH).toBe(HANDBOOK.cruiseTimeH);
  });

  it('trifft den Reiseflug-Kraftstoff', () => {
    expect(cruiseFuelL).toBe(HANDBOOK.cruiseFuelL);
  });

  it('trifft die Gesamtsumme von 85,4 l', () => {
    expect(totalL).toBe(HANDBOOK.totalL);
  });

  it('bestätigt die 2 % des Beispiels als Ergebnis der 1-%-Regel für ISA+20', () => {
    expect(ktasTemperatureFactor(20)).toBeCloseTo(1.02, 10);
    expect(climbTemperatureFactor(20)).toBeCloseTo(1.2, 10);
  });
});
