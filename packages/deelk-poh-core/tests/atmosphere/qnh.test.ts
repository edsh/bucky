import { describe, expect, it } from 'vitest';
import { toQnh } from '../../src/atmosphere/qnh.js';
import { PohCalculationError } from '../../src/errors.js';

/**
 * Der QNH geht in jede Druckhöhe ein und damit in Startstrecke und
 * Kraftstoffbedarf. Ein falscher Wert verschiebt beide still — deshalb steht
 * die Rechnung hier für sich auf dem Prüfstand, unabhängig von jedem
 * Onlinedienst.
 */
describe('toQnh', () => {
  it('gibt auf Meereshöhe den Druck unverändert zurück', () => {
    // Auf 0 ft ist der Stationsdruck bereits der QNH; die Formel darf ihn
    // nicht verändern.
    const ergebnis = toQnh(1013.25, 0);

    expect(ergebnis.qnhHpa).toBeCloseTo(1013.25, 10);
    expect(ergebnis.settableQnhHpa).toBe(1013);
  });

  it('führt den Standarddruck in Platzhöhe auf 1013,25 zurück', () => {
    // 978,1973 hPa ist der Druck, der bei Standardbedingungen in 971 ft
    // herrscht — der Rückweg muss dort wieder bei 1013,25 ankommen.
    const ergebnis = toQnh(978.1973, 971);

    expect(ergebnis.qnhHpa).toBeCloseTo(1013.25, 3);
  });

  it('rechnet die Probe aus quickstart.md nach', () => {
    const ergebnis = toQnh(987.9, 971);

    expect(ergebnis.qnhHpa).toBeCloseTo(1023.3, 2);
    expect(ergebnis.settableQnhHpa).toBe(1023);
  });

  it('gibt die Eingangsgrößen zum Nachvollziehen mit zurück', () => {
    // Ohne die Höhe ließe sich später nicht mehr sagen, worauf sich der Wert
    // bezog — und genau daran hängt seine Richtigkeit.
    const ergebnis = toQnh(987.9, 971);

    expect(ergebnis.stationPressureHpa).toBe(987.9);
    expect(ergebnis.elevationFt).toBe(971);
  });

  it('rundet nie auf, sondern immer ab', () => {
    // Die sichere Richtung: ein niedrigerer QNH ergibt eine größere Druckhöhe
    // und damit eine längere ausgewiesene Startstrecke.
    for (let druck = 940; druck <= 1010; druck += 0.37) {
      const ergebnis = toQnh(druck, 971);

      expect(ergebnis.settableQnhHpa).toBeLessThanOrEqual(ergebnis.qnhHpa);
      expect(ergebnis.settableQnhHpa).toBe(Math.trunc(ergebnis.qnhHpa));
      expect(Number.isInteger(ergebnis.settableQnhHpa)).toBe(true);
    }
  });

  it('rundet auch einen Wert knapp unterhalb der ganzen Zahl ab', () => {
    // Kaufmännisch gerundet ergäbe 1023,7 den Wert 1024. Die METAR-Praxis und
    // die sichere Richtung verlangen 1023.
    const knappDarunter = toQnh(987.5, 971);

    expect(knappDarunter.qnhHpa).toBeGreaterThan(1022.5);
    expect(knappDarunter.settableQnhHpa).toBe(Math.trunc(knappDarunter.qnhHpa));
  });

  it('nennt die Norm als Quelle und keine Seitenzahl', async () => {
    const { QNH_SOURCE } = await import('../../src/atmosphere/qnh.js');

    expect(QNH_SOURCE.kind).toBe('standard');
    expect(QNH_SOURCE).not.toHaveProperty('page');
  });

  describe('weist zurück, was physikalisch keinen Sinn ergibt', () => {
    it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
      'einen Druck von %s',
      (druck) => {
        expect(() => toQnh(druck, 971)).toThrow(PohCalculationError);
        expect(() => toQnh(druck, 971)).toThrow(/stationPressureHpa/);
      }
    );

    it.each([Number.NaN, Number.POSITIVE_INFINITY])('eine Höhe von %s', (hoehe) => {
      expect(() => toQnh(987.9, hoehe)).toThrow(PohCalculationError);
      expect(() => toQnh(987.9, hoehe)).toThrow(/elevationFt/);
    });

    it.each([-2001, 30001, 40000])('eine Höhe von %s ft', (hoehe) => {
      // Keine Tabellengrenze, sondern der Gültigkeitsbereich der
      // Troposphärenformel.
      let gefangen: unknown;
      try {
        toQnh(987.9, hoehe);
      } catch (fehler) {
        gefangen = fehler;
      }

      expect(gefangen).toBeInstanceOf(PohCalculationError);
      expect((gefangen as PohCalculationError).kind).toBe('OUT_OF_RANGE');
    });

    it('lässt die Ränder des Gültigkeitsbereichs zu', () => {
      expect(() => toQnh(987.9, -2000)).not.toThrow();
      expect(() => toQnh(987.9, 30000)).not.toThrow();
    });
  });

  it('prüft den Reglerbereich nicht — das entscheidet die Oberfläche', () => {
    // 700 hPa in Platzhöhe ergäben einen QNH weit unterhalb von 950. Der Kern
    // rechnet ihn trotzdem aus, so wie toPressureAltitude den Tabellenbereich
    // nicht prüft.
    const ergebnis = toQnh(700, 971);

    expect(ergebnis.qnhHpa).toBeLessThan(950);
  });
});
