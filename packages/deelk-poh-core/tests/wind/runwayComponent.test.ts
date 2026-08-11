import { describe, expect, it } from 'vitest';
import { toRunwayWindComponent } from '../../src/wind/runwayComponent.js';
import { PohCalculationError } from '../../src/errors.js';

/**
 * Die rechtweisenden Bahnrichtungen von EDSH. Sie stehen in der Anwendung im
 * Adapter (`apps/web/src/lib/weather/edsh.ts`) — hier nur als Prüfwerte, weil
 * die geprüfte Funktion selbst keinen Platz kennen darf.
 */
const BAHN_10 = 103;
const BAHN_28 = 283;

describe('toRunwayWindComponent: die drei Fälle, die das Vorzeichen festnageln', () => {
  it('Wind genau aus der Bahnrichtung ist voller Gegenwind', () => {
    const ergebnis = toRunwayWindComponent(BAHN_10, 20, BAHN_10);

    expect(ergebnis.headwindComponentKt).toBeCloseTo(20, 12);
    expect(ergebnis.crosswindComponentKt).toBeCloseTo(0, 12);
    expect(ergebnis.settableHeadwindComponentKt).toBe(20);
    expect(ergebnis.angleDeg).toBe(0);
  });

  it('Wind genau quer zur Bahn hat keine Längskomponente', () => {
    // 103° minus 90° = 13°.
    const ergebnis = toRunwayWindComponent(13, 20, BAHN_10);

    expect(ergebnis.headwindComponentKt).toBeCloseTo(0, 12);
    expect(ergebnis.crosswindComponentKt).toBeCloseTo(20, 12);
    expect(ergebnis.settableHeadwindComponentKt).toBe(0);
  });

  it('Wind genau von hinten ist voller Rückenwind', () => {
    const ergebnis = toRunwayWindComponent(BAHN_28, 20, BAHN_10);

    expect(ergebnis.headwindComponentKt).toBeCloseTo(-20, 12);
    expect(ergebnis.crosswindComponentKt).toBeCloseTo(0, 12);
    expect(ergebnis.settableHeadwindComponentKt).toBe(-20);
  });

  it('dieselbe Lage auf beiden Bahnen kehrt allein das Vorzeichen um', () => {
    const auf10 = toRunwayWindComponent(250, 12, BAHN_10);
    const auf28 = toRunwayWindComponent(250, 12, BAHN_28);

    expect(auf10.headwindComponentKt).toBeCloseTo(-auf28.headwindComponentKt, 12);
    // Die Querkomponente ist ein Betrag und bleibt deshalb gleich.
    expect(auf10.crosswindComponentKt).toBeCloseTo(auf28.crosswindComponentKt, 12);
  });
});

describe('toRunwayWindComponent: die Werte aus der Aufgabenliste', () => {
  it('250° mit 12 kt ergibt auf Bahn 28 einen Gegenwind von 10 kt', () => {
    const ergebnis = toRunwayWindComponent(250, 12, BAHN_28);

    expect(ergebnis.headwindComponentKt).toBeCloseTo(10.0640468, 6);
    expect(ergebnis.settableHeadwindComponentKt).toBe(10);
  });

  it('250° mit 12 kt ergibt auf Bahn 10 genau die untere Reglergrenze', () => {
    const ergebnis = toRunwayWindComponent(250, 12, BAHN_10);

    expect(ergebnis.headwindComponentKt).toBeCloseTo(-10.0640468, 6);
    // Der übernehmbare Wert ist −10 und liegt damit noch im Reglerbereich.
    // Wer gegen den ungerundeten Wert prüfte, sperrte diese Zeile zu Unrecht.
    expect(ergebnis.settableHeadwindComponentKt).toBe(-10);
  });

  it('250° mit 20 kt fällt auf Bahn 10 aus dem Reglerbereich heraus', () => {
    const ergebnis = toRunwayWindComponent(250, 20, BAHN_10);

    expect(ergebnis.headwindComponentKt).toBeCloseTo(-16.773, 3);
    expect(ergebnis.settableHeadwindComponentKt).toBe(-17);
  });
});

describe('toRunwayWindComponent: Randfälle', () => {
  it('bei Windstille ist beides null, gleichgültig aus welcher Richtung', () => {
    for (const richtung of [0, 90, 180, 270, 359]) {
      const ergebnis = toRunwayWindComponent(richtung, 0, BAHN_10);

      expect(ergebnis.headwindComponentKt).toBe(0);
      expect(ergebnis.crosswindComponentKt).toBe(0);
      expect(ergebnis.settableHeadwindComponentKt).toBe(0);
    }
  });

  it('der Winkel wird auf −180 bis 180 gebracht, nicht auf 0 bis 360', () => {
    // 350° gegen eine Bahn von 010°: der kurze Weg sind −20°, nicht 340°.
    const ergebnis = toRunwayWindComponent(350, 20, 10);

    expect(ergebnis.angleDeg).toBe(-20);
    expect(ergebnis.headwindComponentKt).toBeGreaterThan(0);
  });

  it('der Winkel bleibt auch bei einer Windrichtung über 360 im Bereich', () => {
    const ergebnis = toRunwayWindComponent(730, 10, 10);

    expect(ergebnis.angleDeg).toBeGreaterThanOrEqual(-180);
    expect(ergebnis.angleDeg).toBeLessThanOrEqual(180);
    expect(ergebnis.headwindComponentKt).toBeCloseTo(10, 12);
  });

  it('exakt 180° Rückenwind ergibt −180 oder 180, aber vollen Rückenwind', () => {
    const ergebnis = toRunwayWindComponent(190, 15, 10);

    expect(Math.abs(ergebnis.angleDeg)).toBe(180);
    expect(ergebnis.headwindComponentKt).toBeCloseTo(-15, 12);
  });

  it('reicht die Eingangsgrößen zum Nachvollziehen durch', () => {
    const ergebnis = toRunwayWindComponent(250, 12, BAHN_28);

    expect(ergebnis.windFromDegTrue).toBe(250);
    expect(ergebnis.windSpeedKt).toBe(12);
    expect(ergebnis.runwayBearingDegTrue).toBe(BAHN_28);
  });
});

describe('toRunwayWindComponent: Fehler', () => {
  it.each([
    ['windFromDegTrue', [Number.NaN, 10, 103]],
    ['windSpeedKt', [250, Number.POSITIVE_INFINITY, 103]],
    ['runwayBearingDegTrue', [250, 10, Number.NaN]]
  ] as const)('weist eine nicht endliche Zahl in %s zurück', (feld, werte) => {
    const [richtung, geschwindigkeit, bahn] = werte;

    expect(() => toRunwayWindComponent(richtung, geschwindigkeit, bahn)).toThrowError(
      PohCalculationError
    );

    try {
      toRunwayWindComponent(richtung, geschwindigkeit, bahn);
    } catch (fehler) {
      expect((fehler as PohCalculationError).kind).toBe('INVALID_INPUT');
      expect((fehler as PohCalculationError).field).toBe(feld);
    }
  });

  it('weist eine negative Windgeschwindigkeit zurück', () => {
    // Eine Windgeschwindigkeit hat kein Vorzeichen — das trägt die Richtung.
    // Ohne diese Prüfung ergäbe −20 kt aus 103° einen Rückenwind von 20 kt,
    // und der sähe völlig plausibel aus.
    expect(() => toRunwayWindComponent(103, -20, 103)).toThrowError(PohCalculationError);

    try {
      toRunwayWindComponent(103, -20, 103);
    } catch (fehler) {
      expect((fehler as PohCalculationError).kind).toBe('INVALID_INPUT');
      expect((fehler as PohCalculationError).field).toBe('windSpeedKt');
      expect((fehler as PohCalculationError).actual).toBe(-20);
    }
  });
});
