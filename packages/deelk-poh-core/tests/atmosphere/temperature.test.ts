import { describe, expect, it } from 'vitest';
import { toOutsideAirTemperature } from '../../src/atmosphere/temperature.js';
import { ICAO_STANDARD_ATMOSPHERE_SOURCE } from '../../src/atmosphere/pressureAltitude.js';

describe('toOutsideAirTemperature', () => {
  it('gibt auf Meereshöhe die Normtemperatur von 15 °C', () => {
    const result = toOutsideAirTemperature(0, 0);

    expect(result.standardTemperatureC).toBeCloseTo(15, 10);
    expect(result.outsideAirTemperatureC).toBeCloseTo(15, 10);
  });

  it('folgt dem Temperaturgradienten der Standardatmosphäre', () => {
    // 0,0065 K/m × 0,3048 m/ft = 1,9812 K je 1000 ft.
    expect(toOutsideAirTemperature(1000, 0).standardTemperatureC).toBeCloseTo(13.0188, 6);
    expect(toOutsideAirTemperature(10000, 0).standardTemperatureC).toBeCloseTo(-4.812, 6);
  });

  it('bezieht sich auf die Druckhöhe von EDSH', () => {
    // 971 ft — die Zahl aus quickstart.md, Abschnitt 4.
    expect(toOutsideAirTemperature(971, 0).outsideAirTemperatureC).toBeCloseTo(13.08, 2);
  });

  it('schlägt die ISA-Abweichung unverändert auf', () => {
    const warm = toOutsideAirTemperature(0, 20);
    const kalt = toOutsideAirTemperature(0, -20);

    expect(warm.outsideAirTemperatureC).toBeCloseTo(35, 10);
    expect(kalt.outsideAirTemperatureC).toBeCloseTo(-5, 10);
    expect(warm.outsideAirTemperatureC - warm.standardTemperatureC).toBeCloseTo(20, 10);
  });

  it('reicht die Eingangsgrößen zum Nachvollziehen durch', () => {
    const result = toOutsideAirTemperature(5000, 7);

    expect(result.pressureAltitudeFt).toBe(5000);
    expect(result.isaDeviationC).toBe(7);
  });

  it('prüft den Tabellenbereich nicht, damit sie auch zur Anzeige taugt', () => {
    // 55 °C liegt außerhalb des Rasters der Startstreckentabelle. Ob das
    // zulässig ist, entscheidet die Rechnung — nicht die Herleitung.
    expect(() => toOutsideAirTemperature(0, 40)).not.toThrow();
    expect(toOutsideAirTemperature(0, 40).outsideAirTemperatureC).toBeCloseTo(55, 10);
  });

  it('trägt eine Quelle aus der Norm und keine Seitenzahl', () => {
    // Die Herleitung stammt nicht aus dem Flughandbuch; eine Seitenzahl
    // anzugeben wäre erfunden (Prinzip I).
    expect(ICAO_STANDARD_ATMOSPHERE_SOURCE.kind).toBe('standard');
    expect(ICAO_STANDARD_ATMOSPHERE_SOURCE).not.toHaveProperty('pohPages');
  });
});
