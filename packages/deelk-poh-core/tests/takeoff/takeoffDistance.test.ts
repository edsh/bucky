import { describe, expect, it } from 'vitest';
import takeoffTable from '../../../../data/poh/d-eelk/tables/5b-takeoff-distance-m-1043kg.json' with { type: 'json' };
import { computeTakeoffDistance } from '../../src/takeoff/takeoffDistance.js';
import { toPressureAltitude } from '../../src/atmosphere/pressureAltitude.js';
import { toOutsideAirTemperature } from '../../src/atmosphere/temperature.js';
import { PohCalculationError } from '../../src/errors.js';
import { getTableNote, TAKEOFF_TABLE_ID } from '../../src/tables.js';

const STANDARD_QNH = 1013.25;

/**
 * Ruft die Rechnung mit unmittelbar gesetzter Druckhöhe und Temperatur auf.
 * Beide Größen kommen laut FR-009 von außen; der Test bildet sie deshalb
 * genauso, wie ein Adapter es täte.
 */
function rechne(options: {
  pressureAltitudeFt: number;
  oatC: number;
  windComponentKt?: number;
  dryGrassRunway?: boolean;
  wetOrSnowRunway?: boolean;
}) {
  const pressureAltitude = {
    elevationFt: options.pressureAltitudeFt,
    qnhHpa: STANDARD_QNH,
    pressureAltitudeFt: options.pressureAltitudeFt
  };
  return computeTakeoffDistance({
    pressureAltitude,
    outsideAirTemperature: {
      pressureAltitudeFt: options.pressureAltitudeFt,
      isaDeviationC: 0,
      standardTemperatureC: options.oatC,
      outsideAirTemperatureC: options.oatC
    },
    windComponentKt: options.windComponentKt ?? 0,
    dryGrassRunway: options.dryGrassRunway ?? false,
    wetOrSnowRunway: options.wetOrSnowRunway ?? false
  });
}

/** Der Weg, den ein Adapter geht: Platzhöhe und QNH hinein. */
function rechneAusEingaben(options: {
  elevationFt: number;
  qnhHpa?: number;
  isaDeviationC?: number;
  windComponentKt?: number;
  dryGrassRunway?: boolean;
  wetOrSnowRunway?: boolean;
}) {
  const pressureAltitude = toPressureAltitude(options.elevationFt, options.qnhHpa ?? STANDARD_QNH);
  return computeTakeoffDistance({
    pressureAltitude,
    outsideAirTemperature: toOutsideAirTemperature(
      pressureAltitude.pressureAltitudeFt,
      options.isaDeviationC ?? 0
    ),
    windComponentKt: options.windComponentKt ?? 0,
    dryGrassRunway: options.dryGrassRunway ?? false,
    wetOrSnowRunway: options.wetOrSnowRunway ?? false
  });
}

describe('computeTakeoffDistance: Tabellenwerte', () => {
  it('gibt an allen 77 Stützstellen genau die gedruckten Werte', () => {
    expect(takeoffTable.rows).toHaveLength(77);

    for (const row of takeoffTable.rows) {
      const result = rechne({
        pressureAltitudeFt: row.pressure_altitude_ft,
        oatC: row.oat_c
      });

      expect(
        result.tableGroundRollM,
        `Startlauf bei ${row.pressure_altitude_ft} ft / ${row.oat_c} °C`
      ).toBe(row.ground_roll);
      expect(
        result.tableOverObstacleM,
        `Hindernisstrecke bei ${row.pressure_altitude_ft} ft / ${row.oat_c} °C`
      ).toBe(row.over_obstacle);
      // Ohne Wind und auf befestigter Bahn bleibt der Tabellenwert stehen.
      expect(result.groundRollM).toBe(row.ground_roll);
      expect(result.overObstacleM).toBe(row.over_obstacle);
    }
  });

  it('interpoliert zwischen zwei Höhenstützstellen statt zu runden', () => {
    const unten = rechne({ pressureAltitudeFt: 0, oatC: 20 });
    const oben = rechne({ pressureAltitudeFt: 1000, oatC: 20 });
    const mitte = rechne({ pressureAltitudeFt: 500, oatC: 20 });

    expect(mitte.groundRollM).toBeGreaterThan(unten.groundRollM);
    expect(mitte.groundRollM).toBeLessThan(oben.groundRollM);
    expect(mitte.overObstacleM).toBeGreaterThan(unten.overObstacleM);
    expect(mitte.overObstacleM).toBeLessThan(oben.overObstacleM);
  });

  it('interpoliert auch im doppelt weiten Temperaturabschnitt richtig', () => {
    // Zwischen −20 und 0 °C liegen 20 °C, darüber je 10.
    const kalt = rechne({ pressureAltitudeFt: 0, oatC: -20 });
    const mild = rechne({ pressureAltitudeFt: 0, oatC: 0 });
    const dazwischen = rechne({ pressureAltitudeFt: 0, oatC: -10 });

    expect(dazwischen.groundRollM).toBeCloseTo((kalt.groundRollM + mild.groundRollM) / 2, 10);
  });

  it('rechnet EDSH aus Platzhöhe und QNH nach', () => {
    // 971 ft bei Standarddruck und ISA ± 0 — die Zahlen aus quickstart.md.
    const result = rechneAusEingaben({ elevationFt: 971 });

    expect(result.outsideAirTemperature.outsideAirTemperatureC).toBeCloseTo(13.08, 2);
    expect(result.groundRollM).toBeCloseTo(207.2, 1);
    expect(result.overObstacleM).toBeCloseTo(324.8, 1);
  });

  it('weist beim Nachschlagen alle vier berührten Stützwerte aus', () => {
    const result = rechneAusEingaben({ elevationFt: 971 });
    const lookup = result.steps.find((step) => step.id === 'takeoff.tableLookup');

    expect(lookup?.anchors).toHaveLength(4);
    expect(new Set(lookup?.anchors.map((anchor) => anchor.at['pressureAltitudeFt']))).toEqual(
      new Set([0, 1000])
    );
    expect(new Set(lookup?.anchors.map((anchor) => anchor.at['oatC']))).toEqual(new Set([10, 20]));
  });

  it('nennt Abbildung, Tabellenname, Seiten und den Prüfhinweis', () => {
    const result = rechne({ pressureAltitudeFt: 0, oatC: 20 });

    expect(result.source.figure).toBe('Abb. 5-1a');
    expect(result.source.tableName).toContain('Roll- und Startstrecke');
    expect(result.source.pohPages).toEqual(['5b-2', '5b-3']);
    expect(result.preflightCheckNotice).toContain('Original-Flughandbuch');
    expect(result.obstacleLabel).toContain('15');
  });

  it('führt die Bedingungen der Tabelle im Wortlaut mit', () => {
    const result = rechne({ pressureAltitudeFt: 0, oatC: 20 });

    expect(result.conditions).toEqual(takeoffTable.conditions);
  });
});

describe('computeTakeoffDistance: Ränder', () => {
  it('lehnt eine Druckhöhe über dem Tabellenrand ab und nennt Höhe und QNH', () => {
    try {
      rechneAusEingaben({ elevationFt: 12000 });
      expect.unreachable('Die Rechnung hätte scheitern müssen.');
    } catch (error) {
      expect(error).toBeInstanceOf(PohCalculationError);
      const fehler = error as PohCalculationError;
      expect(fehler.kind).toBe('PRESSURE_ALTITUDE_OUT_OF_RANGE');
      expect(fehler.message).toContain('12');
      expect(fehler.message).toContain('QNH');
      expect(fehler.allowedRange?.max).toBe(10000);
    }
  });

  it('lehnt eine hergeleitete Temperatur außerhalb des Rasters ab und nennt beide Ursachen', () => {
    try {
      // ISA + 40 auf Meereshöhe ergibt 55 °C.
      rechneAusEingaben({ elevationFt: 0, isaDeviationC: 40 });
      expect.unreachable('Die Rechnung hätte scheitern müssen.');
    } catch (error) {
      const fehler = error as PohCalculationError;
      expect(fehler.kind).toBe('OUT_OF_RANGE');
      // Beide Ursachen: die Druckhöhe und die Abweichung. Ohne sie suchte der
      // Pilot den Fehler an einer Stellschraube, die es nicht gibt.
      expect(fehler.pressureAltitudeFt).toBe(0);
      expect(fehler.isaDeviationC).toBe(40);
      expect(fehler.message).toContain('Druckhöhe');
      expect(fehler.message).toContain('ISA-Abweichung');
      expect(fehler.allowedRange).toEqual({ min: -20, max: 50, unit: '°C', step: 1 });
    }
  });

  it('lehnt auch eine zu kalte hergeleitete Temperatur ab', () => {
    // In 10 000 ft liegt die Normtemperatur bei −4,8 °C; ISA − 30 ergibt −34,8.
    expect(() => rechneAusEingaben({ elevationFt: 10000, isaDeviationC: -30 })).toThrow(
      PohCalculationError
    );
  });

  it('lehnt eine unvollständige Eingabe ab', () => {
    expect(() => computeTakeoffDistance({ windComponentKt: 0 })).toThrow(PohCalculationError);
    try {
      computeTakeoffDistance({ windComponentKt: 0 });
    } catch (error) {
      expect((error as PohCalculationError).kind).toBe('INVALID_INPUT');
    }
  });
});

describe('computeTakeoffDistance: Anmerkung 2, Wind', () => {
  it('verringert beide Strecken um 10 % bei 9 kt Gegenwind', () => {
    const result = rechne({ pressureAltitudeFt: 0, oatC: 20, windComponentKt: 9 });

    expect(result.windAdjustmentPct).toBeCloseTo(-10, 10);
    expect(result.groundRollM).toBeCloseTo(183.6, 6);
    expect(result.overObstacleM).toBeCloseTo(287.1, 6);
    expect(result.steps.some((step) => step.id === 'takeoff.windAdjustment')).toBe(true);
  });

  it('rechnet Zwischenwerte anteilig, nicht erst ab vollen Stufen', () => {
    const result = rechne({ pressureAltitudeFt: 0, oatC: 20, windComponentKt: 5 });

    // 5 kt / 9 kt × 10 % = 5,555… %
    expect(result.windAdjustmentPct).toBeCloseTo(-5.5556, 4);
  });

  it('addiert mehrere Stufen, statt sie zu multiplizieren', () => {
    // 18 kt ergeben 20 %, nicht 19 % (0,9 × 0,9).
    const result = rechne({ pressureAltitudeFt: 0, oatC: 20, windComponentKt: 18 });

    expect(result.windAdjustmentPct).toBeCloseTo(-20, 10);
    expect(result.groundRollM).toBeCloseTo(204 * 0.8, 6);
    expect(result.groundRollM).not.toBeCloseTo(204 * 0.81, 6);
  });

  it('lässt den Tabellenwert bei Windstille unberührt', () => {
    const result = rechne({ pressureAltitudeFt: 0, oatC: 20 });

    expect(result.windAdjustmentPct).toBe(0);
    expect(result.groundRollM).toBe(204);
    // Ein Schritt, der nichts bewirkt, wäre nur Rauschen im Rechenweg.
    expect(result.steps.some((step) => step.id === 'takeoff.windAdjustment')).toBe(false);
  });

  it('vergrößert beide Strecken um 30 % bei 6 kt Rückenwind', () => {
    const result = rechne({ pressureAltitudeFt: 0, oatC: 20, windComponentKt: -6 });

    expect(result.windAdjustmentPct).toBeCloseTo(30, 10);
    expect(result.groundRollM).toBeCloseTo(265.2, 6);
    expect(result.overObstacleM).toBeCloseTo(414.7, 6);
  });

  it('deckelt die Gegenwindgutschrift bei 50 %', () => {
    const result = rechne({ pressureAltitudeFt: 0, oatC: 20, windComponentKt: 50 });

    // Geradlinig wären es 55,6 %.
    expect(result.windAdjustmentPct).toBe(-50);
    expect(result.windAdjustmentCapped).toBe(true);
    expect(result.groundRollM).toBeCloseTo(102, 6);
    expect(result.advisories.some((hinweis) => hinweis.id === 'takeoff.windCapped')).toBe(true);
  });

  it('greift der Deckel erst über 45 kt', () => {
    const result = rechne({ pressureAltitudeFt: 0, oatC: 20, windComponentKt: 45 });

    expect(result.windAdjustmentPct).toBeCloseTo(-50, 10);
    expect(result.windAdjustmentCapped).toBe(false);
  });

  it('lehnt Rückenwind über 10 kt ab, statt den Zuschlag fortzuschreiben', () => {
    try {
      rechne({ pressureAltitudeFt: 0, oatC: 20, windComponentKt: -15 });
      expect.unreachable('Die Rechnung hätte scheitern müssen.');
    } catch (error) {
      const fehler = error as PohCalculationError;
      expect(fehler.kind).toBe('OUT_OF_RANGE');
      expect(fehler.field).toBe('windComponentKt');
      expect(fehler.message).toContain('Anmerkung 2');
      expect(fehler.allowedRange?.min).toBe(-10);
    }
  });

  it('lässt genau 10 kt Rückenwind noch zu', () => {
    const result = rechne({ pressureAltitudeFt: 0, oatC: 20, windComponentKt: -10 });

    expect(result.windAdjustmentPct).toBeCloseTo(50, 10);
  });
});

describe('computeTakeoffDistance: Anmerkung 3 und 4, Zustand der Bahn', () => {
  it('schlägt 15 % des Startlaufs auf beide Strecken auf', () => {
    const result = rechne({ pressureAltitudeFt: 0, oatC: 20, dryGrassRunway: true });

    expect(result.surfaceAllowancePct).toBe(15);
    expect(result.surfaceAllowanceM).toBeCloseTo(30.6, 6);
    expect(result.groundRollM).toBeCloseTo(234.6, 6);
    expect(result.overObstacleM).toBeCloseTo(349.6, 6);
    // Derselbe Betrag auf beiden Strecken, nicht derselbe Anteil.
    expect(result.overObstacleM - result.tableOverObstacleM).toBeCloseTo(
      result.groundRollM - result.tableGroundRollM,
      10
    );
  });

  it('schlägt 20 % des Startlaufs auf und kennzeichnet einen Mindestwert', () => {
    const result = rechne({ pressureAltitudeFt: 0, oatC: 20, wetOrSnowRunway: true });

    expect(result.surfaceAllowancePct).toBe(20);
    expect(result.groundRollM).toBeCloseTo(244.8, 6);
    expect(result.isMinimumValue).toBe(true);
    expect(result.advisories.some((hinweis) => hinweis.id === 'takeoff.minimumValue')).toBe(true);
  });

  it('addiert beide Zuschläge auf dieselbe Bezugsgröße, statt sie zu multiplizieren', () => {
    const result = rechne({
      pressureAltitudeFt: 0,
      oatC: 20,
      dryGrassRunway: true,
      wetOrSnowRunway: true
    });

    expect(result.surfaceAllowancePct).toBe(35);
    expect(result.groundRollM).toBeCloseTo(275.4, 6);
    expect(result.overObstacleM).toBeCloseTo(390.4, 6);
    // 1,15 × 1,20 ergäbe 281,52 m — eine andere Auslegung derselben Anmerkungen.
    expect(result.groundRollM).not.toBeCloseTo(204 * 1.15 * 1.2, 2);
    expect(result.isMinimumValue).toBe(true);
  });

  it('bezieht den Bahnzuschlag auf den windkorrigierten Startlauf', () => {
    const result = rechne({
      pressureAltitudeFt: 0,
      oatC: 20,
      windComponentKt: 9,
      dryGrassRunway: true
    });

    // 15 % von 183,6 — nicht von 204. Die Reihenfolge folgt dem Handbuch, das
    // die Anmerkungen in dieser Folge führt.
    expect(result.windAdjustedGroundRollM).toBeCloseTo(183.6, 6);
    expect(result.surfaceAllowanceM).toBeCloseTo(27.54, 6);
    expect(result.surfaceAllowanceM).not.toBeCloseTo(30.6, 2);
    expect(result.groundRollM).toBeCloseTo(211.14, 6);
  });

  it('lässt den Schritt weg, wenn kein Bahnzuschlag greift', () => {
    const ohne = rechne({ pressureAltitudeFt: 0, oatC: 20 });
    const mit = rechne({ pressureAltitudeFt: 0, oatC: 20, dryGrassRunway: true });

    expect(ohne.steps.some((step) => step.id === 'takeoff.surfaceAllowance')).toBe(false);
    expect(mit.steps.some((step) => step.id === 'takeoff.surfaceAllowance')).toBe(true);
  });

  it('führt die vier Anmerkungen im Wortlaut der Tabellendatei mit', () => {
    const result = rechne({ pressureAltitudeFt: 0, oatC: 20 });

    expect(result.notes).toHaveLength(4);
    for (let nummer = 1; nummer <= 4; nummer += 1) {
      expect(result.notes[nummer - 1]?.text).toBe(getTableNote(TAKEOFF_TABLE_ID, nummer));
      expect(result.notes[nummer - 1]?.source?.pohPages).toContain('5b-2');
    }
    expect(result.notes[1]?.text).toContain('9 Knoten');
    expect(result.notes[2]?.text).toContain('15%');
    expect(result.notes[3]?.text).toContain('20%');
  });
});

describe('computeTakeoffDistance: Rechenweg', () => {
  it('führt bei einfachen Bedingungen genau drei Schritte', () => {
    const result = rechne({ pressureAltitudeFt: 0, oatC: 20 });

    expect(result.steps.map((step) => step.id)).toEqual([
      'takeoff.pressureAltitude',
      'takeoff.outsideAirTemperature',
      'takeoff.tableLookup'
    ]);
  });

  it('führt mit Wind und Bahnzustand fünf Schritte in der Reihenfolge des Handbuchs', () => {
    const result = rechne({
      pressureAltitudeFt: 0,
      oatC: 20,
      windComponentKt: 9,
      dryGrassRunway: true
    });

    expect(result.steps.map((step) => step.id)).toEqual([
      'takeoff.pressureAltitude',
      'takeoff.outsideAirTemperature',
      'takeoff.tableLookup',
      'takeoff.windAdjustment',
      'takeoff.surfaceAllowance'
    ]);
  });

  it('belegt jeden Schritt mit einer Quelle', () => {
    const result = rechneAusEingaben({
      elevationFt: 971,
      windComponentKt: 5,
      dryGrassRunway: true
    });

    for (const step of result.steps) {
      expect(step.sources.length, `Schritt ${step.id} ohne Quelle`).toBeGreaterThan(0);
      expect(step.explanation.length).toBeGreaterThan(0);
    }
  });
});

describe('computeTakeoffDistance: der Windbetrag in Metern', () => {
  /**
   * Der Betrag wird ausgewiesen, damit eine Darstellung die Zeilen
   * untereinander aufaddieren kann, ohne ihn selbst aus zwei gerundeten
   * Werten zu bilden — das ergäbe einen anderen Betrag als diese Rechnung.
   */
  it('trägt bei Gegenwind ein negatives Vorzeichen und passt zum Zwischenwert', () => {
    const result = rechne({ pressureAltitudeFt: 0, oatC: 20, windComponentKt: 9 });

    expect(result.windAdjustmentGroundRollM).toBeCloseTo(-20.4, 10);
    expect(result.windAdjustmentOverObstacleM).toBeCloseTo(-31.9, 10);
    expect(result.tableGroundRollM + result.windAdjustmentGroundRollM).toBeCloseTo(
      result.windAdjustedGroundRollM,
      10
    );
    expect(result.tableOverObstacleM + result.windAdjustmentOverObstacleM).toBeCloseTo(
      result.windAdjustedOverObstacleM,
      10
    );
  });

  it('trägt bei Rückenwind ein positives Vorzeichen', () => {
    const result = rechne({ pressureAltitudeFt: 0, oatC: 20, windComponentKt: -6 });

    expect(result.windAdjustmentGroundRollM).toBeCloseTo(61.2, 10);
    expect(result.windAdjustmentOverObstacleM).toBeCloseTo(95.7, 10);
  });

  it('ist bei Windstille null', () => {
    const result = rechne({ pressureAltitudeFt: 0, oatC: 20, windComponentKt: 0 });

    expect(result.windAdjustmentGroundRollM).toBe(0);
    expect(result.windAdjustmentOverObstacleM).toBe(0);
  });

  it('ergibt zusammen mit dem Bahnzuschlag genau die Gesamtstrecke', () => {
    const result = rechne({
      pressureAltitudeFt: 0,
      oatC: 20,
      windComponentKt: 9,
      dryGrassRunway: true,
      wetOrSnowRunway: true
    });

    expect(
      result.tableGroundRollM + result.windAdjustmentGroundRollM + result.surfaceAllowanceM
    ).toBeCloseTo(result.groundRollM, 10);
    expect(
      result.tableOverObstacleM + result.windAdjustmentOverObstacleM + result.surfaceAllowanceM
    ).toBeCloseTo(result.overObstacleM, 10);
  });
});
