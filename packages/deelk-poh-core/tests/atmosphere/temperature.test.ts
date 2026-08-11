import { describe, expect, it } from 'vitest';
import { toIsaDeviation, toOutsideAirTemperature } from '../../src/atmosphere/temperature.js';
import { PohCalculationError } from '../../src/errors.js';
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

describe('toIsaDeviation', () => {
  it('gibt auf Meereshöhe bei 15 °C keine Abweichung', () => {
    const result = toIsaDeviation(0, 15);

    expect(result.standardTemperatureC).toBeCloseTo(15, 10);
    expect(result.isaDeviationC).toBeCloseTo(0, 10);
    expect(result.settableIsaDeviationC).toBe(0);
  });

  it('rechnet die Druckhöhe von EDSH mit 29,2 °C auf gut 15,6 °C über ISA', () => {
    // Der Fall aus den Prüfdaten von Feature 027: 987,9 hPa in 971 ft ergeben
    // eine Druckhöhe von 699,44 ft, dort sind 13,61 °C die Norm.
    const result = toIsaDeviation(699.4393154069325, 29.2);

    expect(result.standardTemperatureC).toBeCloseTo(13.614270828, 8);
    expect(result.isaDeviationC).toBeCloseTo(15.585729172, 8);
    expect(result.settableIsaDeviationC).toBe(16);
  });

  it('rundet kaufmännisch und nicht in eine Richtung', () => {
    // Anders als beim QNH gibt es hier keine sichere Richtung: nach oben
    // verlängert sich die Startstrecke, nach unten schönt sich die
    // Reiseleistung.
    expect(toIsaDeviation(0, 15.5).settableIsaDeviationC).toBe(1);
    expect(toIsaDeviation(0, 14.4).settableIsaDeviationC).toBe(-1);
  });

  it('reicht die Eingangsgrößen zum Nachvollziehen durch', () => {
    const result = toIsaDeviation(5000, 12);

    expect(result.pressureAltitudeFt).toBe(5000);
    expect(result.outsideAirTemperatureC).toBe(12);
  });

  it('prüft den Reglerbereich nicht, damit sie auch zur Anzeige taugt', () => {
    // 90 °C über ISA ist kein Wetter, aber die Herleitung urteilt darüber
    // nicht — das entscheidet die Oberfläche am Reglerbereich.
    expect(() => toIsaDeviation(0, 105)).not.toThrow();
    expect(toIsaDeviation(0, 105).isaDeviationC).toBeCloseTo(90, 10);
  });

  it.each([
    ['pressureAltitudeFt', Number.NaN, 15],
    ['outsideAirTemperatureC', 0, Number.POSITIVE_INFINITY]
  ] as const)('weist eine nicht endliche Zahl in %s zurück', (feld, hoehe, temperatur) => {
    expect(() => toIsaDeviation(hoehe, temperatur)).toThrowError(PohCalculationError);

    try {
      toIsaDeviation(hoehe, temperatur);
    } catch (fehler) {
      expect((fehler as PohCalculationError).kind).toBe('INVALID_INPUT');
      expect((fehler as PohCalculationError).field).toBe(feld);
    }
  });
});

describe('Rundlauf zwischen ISA-Abweichung und Umgebungstemperatur', () => {
  /**
   * Dieselbe Bauart wie C-08 für Druckhöhe und QNH, und aus demselben Grund:
   * Die Probe kommt ohne eine zweite, selbst gerechnete Erwartung aus. Zwei
   * Richtungen derselben Beziehung, die auseinanderlaufen, fallen hier auf —
   * bei einem Vergleich gegen von Hand gerechnete Werte nicht unbedingt, weil
   * dieselbe falsche Konstante in beide einginge.
   */
  it('läuft über den ganzen Regler- und Höhenbereich auf neun Stellen zurück', () => {
    let geprueft = 0;

    for (const pressureAltitudeFt of [-1000, 0, 699.4393154069325, 2500, 5000, 8000, 12000]) {
      for (const isaDeviationC of [-30, -12, 0, 7, 15.5, 40]) {
        const hin = toOutsideAirTemperature(pressureAltitudeFt, isaDeviationC);
        const zurueck = toIsaDeviation(pressureAltitudeFt, hin.outsideAirTemperatureC);

        expect(
          zurueck.isaDeviationC,
          `${pressureAltitudeFt} ft / ${isaDeviationC} °C läuft nicht zurück`
        ).toBeCloseTo(isaDeviationC, 9);
        expect(zurueck.standardTemperatureC).toBeCloseTo(hin.standardTemperatureC, 12);
        geprueft += 1;
      }
    }

    expect(geprueft).toBe(42);
  });
});
