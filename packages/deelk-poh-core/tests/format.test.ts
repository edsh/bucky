import { describe, expect, it } from 'vitest';
import {
  formatKnots,
  formatLitres,
  formatLitresPerNauticalMile,
  formatMinutes,
  formatNauticalMiles,
  roundKnots,
  roundLitres,
  roundMinutes,
  roundNauticalMiles,
  roundTo
} from '../src/format.js';

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

  it('schreibt Zahlen in deutscher Schreibweise mit Einheit', () => {
    expect(formatLitres(87.567)).toBe('87,6 l');
    expect(formatLitres(4)).toBe('4,0 l');
    expect(formatLitresPerNauticalMile(0.1905)).toBe('0,19 l/NM');
    expect(formatMinutes(23.6)).toBe('24 min');
    expect(formatNauticalMiles(36.3)).toBe('36,3 NM');
    expect(formatKnots(116)).toBe('116 kt');
  });
});
