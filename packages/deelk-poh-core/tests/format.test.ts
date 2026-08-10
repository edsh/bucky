import { describe, expect, it } from 'vitest';
import {
  formatFuel,
  formatFuelFlow,
  formatFuelPerNauticalMile,
  formatHours,
  formatKnots,
  formatLitres,
  formatMinutes,
  formatNauticalMiles,
  formatUsGallons,
  roundKnots,
  roundLitres,
  roundMinutes,
  roundNauticalMiles,
  roundTo
} from '../src/format.js';

const NBSP = '\u00A0';

describe('Rundung (FR-021)', () => {
  it('rundet Kraftstoff auf 0,1 l', () => {
    expect(roundLitres(87.567)).toBe(87.6);
    expect(roundLitres(46.54)).toBe(46.5);
  });

  it('rundet Zeiten auf ganze Minuten, Strecken auf 0,1 NM, Geschwindigkeiten auf ganze Knoten', () => {
    expect(roundMinutes(6.15)).toBe(6);
    expect(roundMinutes(7.8)).toBe(8);
    expect(roundNauticalMiles(8.148)).toBe(8.1);
    expect(roundKnots(110.55)).toBe(111);
  });

  it('rundet halbe Werte kaufmännisch auf, auch wenn die Binärdarstellung darunter liegt', () => {
    expect(roundTo(2.675, 2)).toBe(2.68);
    expect(roundTo(1.005, 2)).toBe(1.01);
    expect(roundLitres(0.45)).toBe(0.5);
  });

  /**
   * Zwischen Zahl und Einheit steht ein geschütztes Leerzeichen: "87,6" allein
   * am Zeilenende wäre bei einer Kraftstoffangabe im schlimmsten Fall
   * irreführend (Issue #13).
   */
  it('schreibt Zahlen in deutscher Schreibweise mit Einheit', () => {
    expect(formatLitres(87.567)).toBe(`87,6${NBSP}l`);
    expect(formatLitres(4)).toBe(`4,0${NBSP}l`);
    expect(formatMinutes(23.6)).toBe(`24${NBSP}min`);
    expect(formatNauticalMiles(36.3)).toBe(`36,3${NBSP}NM`);
    expect(formatKnots(116)).toBe(`116${NBSP}kt`);
  });

  it('verwendet geschützte Leerzeichen auch in mehrteiligen Einheiten', () => {
    expect(formatUsGallons(5.8)).toBe(`5,8${NBSP}US${NBSP}gal`);
    expect(formatFuelFlow(22.1, 5.8)).toBe(`22,1${NBSP}l/h (5,8${NBSP}US${NBSP}gal/h)`);
    expect(formatFuel(87.567, 23.14)).toBe(`87,6${NBSP}l (23,1${NBSP}US${NBSP}gal)`);
    expect(formatHours(2.09)).toBe(`2${NBSP}h 05${NBSP}min`);
  });

  /** Verbrauch je Seemeile, zwei Nachkommastellen (Issue #12). */
  it('schreibt den Verbrauch je Seemeile in beiden Einheiten', () => {
    expect(formatFuelPerNauticalMile(0.1937, 0.0512)).toBe(
      `0,19${NBSP}l/NM (0,05${NBSP}US${NBSP}gal/NM)`
    );
  });
});
