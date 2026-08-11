import { describe, expect, it } from 'vitest';
import {
  getOutsideAirTemperatureRange,
  ISA_DEVIATION_RANGE,
  toIsaDeviation,
  toOutsideAirTemperature
} from '../../src/atmosphere/temperature.js';
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

describe('getOutsideAirTemperatureRange', () => {
  it('gibt in Meereshöhe den um die Normtemperatur verschobenen Abweichungsbereich', () => {
    const range = getOutsideAirTemperatureRange(0);

    // 15 °C Normtemperatur ± dem Abweichungsbereich −30…40.
    expect(range.min).toBe(-15);
    expect(range.max).toBe(55);
    expect(range.unit).toBe('°C');
    expect(range.step).toBe(1);
  });

  it('wandert mit der Druckhöhe nach unten', () => {
    // Die Werte stammen aus derselben Norm wie die Druckhöhe: In 10 000 ft
    // liegt die Normtemperatur bei −4,81 °C, also rund 20 °C unter der in
    // Meereshöhe. Genau um diesen Betrag muss der Bereich wandern.
    expect(getOutsideAirTemperatureRange(5000)).toMatchObject({ min: -24, max: 45 });
    expect(getOutsideAirTemperatureRange(10000)).toMatchObject({ min: -34, max: 35 });
  });

  it('rundet nach innen und nicht kaufmännisch', () => {
    // Bei 700 ft ist die Normtemperatur 13,6132 °C; die ungerundeten Grenzen
    // lägen bei −16,3868 und 53,6132. Kaufmännisch gerundet ergäbe das
    // −16 und 54 — das obere Ende läge dann außerhalb des Abweichungsbereichs.
    const range = getOutsideAirTemperatureRange(700);

    expect(range.min).toBe(-16);
    expect(range.max).toBe(53);
  });

  it('hält an beiden Enden die Zusicherung, für die es die Funktion gibt', () => {
    // Der Daseinsgrund der Funktion: Jeder Wert, den ein ganzzahliger Regler
    // innerhalb dieses Bereichs annehmen kann, muss eine Abweichung ergeben,
    // die der Kern anschließend auch rechnen kann. Als Eigenschaft geprüft und
    // nicht als Einzelfall — ein Einzelfall würde genau die Höhe verfehlen, bei
    // der die Rundung kippt.
    let geprueft = 0;

    for (const pressureAltitudeFt of [-1000, 0, 700, 977.7826981696855, 2500, 5000, 8000, 12000]) {
      const range = getOutsideAirTemperatureRange(pressureAltitudeFt);

      for (const temperatureC of [range.min, range.min + 1, 0, range.max - 1, range.max]) {
        const abweichung = toIsaDeviation(pressureAltitudeFt, temperatureC).isaDeviationC;

        expect(
          abweichung,
          `${temperatureC} °C in ${pressureAltitudeFt} ft ergibt ${abweichung} °C und fällt aus dem Abweichungsbereich`
        ).toBeGreaterThanOrEqual(ISA_DEVIATION_RANGE.min);
        expect(abweichung).toBeLessThanOrEqual(ISA_DEVIATION_RANGE.max);
        geprueft += 1;
      }
    }

    expect(geprueft).toBe(40);
  });

  it('fällt einen Schritt außerhalb des Bereichs heraus', () => {
    // Die Gegenprobe: Wäre der Bereich zu eng gewählt, bliebe die Prüfung oben
    // trotzdem grün. Erst diese hier zeigt, dass er nicht enger ist als nötig.
    const pressureAltitudeFt = 700;
    const range = getOutsideAirTemperatureRange(pressureAltitudeFt);

    expect(toIsaDeviation(pressureAltitudeFt, range.min - 1).isaDeviationC).toBeLessThan(
      ISA_DEVIATION_RANGE.min
    );
    expect(toIsaDeviation(pressureAltitudeFt, range.max + 1).isaDeviationC).toBeGreaterThan(
      ISA_DEVIATION_RANGE.max
    );
  });
});
