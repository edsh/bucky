import { describe, expect, it } from 'vitest';
import { computeFuelPlan } from '../src/fuel/fuelPlan.js';
import { listTables } from '../src/tables.js';
import type { FlightPlanInput } from '../src/fuel/input.js';

/**
 * Prüft die Zusage aus Constitution-Prinzip I und SC-002: zu jedem Ergebnis
 * sind Seitenzahl und Tabellenname jeder verwendeten Tabelle sichtbar, die
 * abgelesenen Eckwerte nachvollziehbar und der Prüfhinweis vorhanden.
 */

const input: FlightPlanInput = {
  departureElevationFt: 1000,
  cruiseAltitudeAmslFt: 6000,
  qnhHpa: 1013.25,
  distanceNm: 400,
  powerSettingPct: 80,
  isaDeviationC: 20,
  windComponentKt: 10
};

/** Schritte, die einen Tabellenwert verwenden — sie müssen Eckwerte führen. */
const TABELLENGESTUETZTE_SCHRITTE = [
  'climb.atDeparture',
  'climb.atCruise',
  'climb.difference',
  'cruise.tableLookup'
] as const;

describe('Nachvollziehbarkeit (Prinzip I, SC-002)', () => {
  const result = computeFuelPlan(input);

  /** Nur die Handbuchquellen; die Norm trägt weder Seite noch Tabellennamen. */
  const pohQuellen = () => result.sources.filter((source) => source.kind === 'poh');

  it('führt zu jedem tabellengestützten Schritt Eckwerte mit Seitenzahl und Tabellenname', () => {
    for (const id of TABELLENGESTUETZTE_SCHRITTE) {
      const step = result.steps.find((entry) => entry.id === id);

      expect(step, `Schritt ${id} fehlt`).toBeDefined();
      expect(step?.anchors.length, `Schritt ${id} ohne Eckwert`).toBeGreaterThan(0);

      for (const anchor of step?.anchors ?? []) {
        expect(anchor.source.pohPages.length).toBeGreaterThan(0);
        expect(anchor.source.tableName.length).toBeGreaterThan(0);
        expect(anchor.source.figure).toMatch(/^Abb\. 5-\d/);
        expect(Object.keys(anchor.at).length).toBeGreaterThan(0);
        expect(Object.keys(anchor.values).length).toBeGreaterThan(0);
      }
    }
  });

  it('lässt rein rechnerische Schritte ohne Eckwerte', () => {
    const rechnerisch = [
      'pressureAltitude.departure',
      'pressureAltitude.cruise',
      'cruise.distance',
      'cruise.groundSpeed',
      'cruise.time',
      'total.fuel'
    ];

    for (const id of rechnerisch) {
      expect(result.steps.find((entry) => entry.id === id)?.anchors).toEqual([]);
    }
  });

  it('nennt jede verwendete Tabelle genau einmal (FR-005)', () => {
    const ids = pohQuellen().map((source) => source.tableId);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('5b-climb-time-dist-fuel-1043kg');
    expect(ids).toContain('5b-cruise-standard-1043kg');
  });

  it('gibt zu jeder Handbuchquelle eine vollständige Zitatzeile aus', () => {
    for (const source of pohQuellen()) {
      expect(source.citation).toContain(source.figure);
      expect(source.citation).toContain('Ausgabe 2');
      for (const page of source.pohPages) {
        expect(source.citation).toContain(page);
      }
    }
  });

  /**
   * Prinzip I verlangt Seitenzahl und Tabellenname — für eine Norm gibt es
   * beides nicht. Die Druckhöhe wird deshalb als eigene Art ausgewiesen, statt
   * eine Handbuchseite zu erfinden.
   */
  it('weist die Umrechnung als Norm aus, nicht als Handbuchtabelle', () => {
    const normen = result.sources.filter((source) => source.kind === 'standard');

    expect(normen).toHaveLength(1);
    expect(normen[0]?.standard).toMatch(/ICAO Doc 7488/);
  });

  it('führt an den Umrechnungsschritten ausschließlich die Norm als Quelle', () => {
    for (const id of ['pressureAltitude.departure', 'pressureAltitude.cruise']) {
      const step = result.steps.find((entry) => entry.id === id);

      expect(step?.sources).toHaveLength(1);
      expect(step?.sources[0]?.kind).toBe('standard');
    }
  });

  it('führt an allen übrigen Schritten ausschließlich Handbuchquellen', () => {
    const uebrige = result.steps.filter((step) => !step.id.startsWith('pressureAltitude.'));

    for (const step of uebrige) {
      for (const source of step.sources) {
        expect(source.kind, `Schritt ${step.id}`).toBe('poh');
      }
    }
  });

  it('liefert den Prüfhinweis und lässt ihn nie leer (FR-006)', () => {
    expect(result.preflightCheckNotice.trim().length).toBeGreaterThan(0);
    expect(result.preflightCheckNotice).toContain('Original-Flughandbuch');
  });

  it('belegt jeden Hinweis mit Quelle, der eine Anmerkung wiedergibt', () => {
    const ausHandbuch = result.advisories.filter((advisory) => advisory.source !== undefined);

    expect(ausHandbuch.length).toBeGreaterThan(0);
    for (const advisory of ausHandbuch) {
      expect(advisory.source?.citation.length).toBeGreaterThan(0);
    }
  });
});

describe('listTables', () => {
  it('führt nur die für D-EELK anwendbaren Tabellen mit Quellenangabe', () => {
    const tables = listTables();

    expect(tables).toHaveLength(5);
    for (const table of tables) {
      expect(table.source.citation.length).toBeGreaterThan(0);
      expect(table.rowCount).toBeGreaterThan(0);
    }
  });

  it('reicht den vermerkten Vy-Widerspruch durch', () => {
    const climb = listTables().find((table) => table.id === '5b-climb-time-dist-fuel-1043kg');
    const anomaly = climb?.anomalies[0];

    expect(anomaly?.kind).toBe('vy_mismatch');
    expect(anomaly?.description).toContain('69 KIAS');
    expect(anomaly?.description).toContain('70 KIAS');
  });
});

describe('Ausgabe und Änderungsstand', () => {
  it('führt jede Quellenreferenz Ausgabe und Änderungsstand mit (FR-005, CHK002)', () => {
    const result = computeFuelPlan({
      departureElevationFt: 0,
      cruiseAltitudeAmslFt: 6000,
      qnhHpa: 1013.25,
      distanceNm: 250,
      powerSettingPct: 70,
      isaDeviationC: 0,
      windComponentKt: 0
    });

    const poh = result.sources.filter((source) => source.kind === 'poh');

    expect(poh.length).toBeGreaterThan(0);
    for (const source of poh) {
      expect(source.issue).not.toBe('');
      expect(source.revision).not.toBe('');
    }
  });

  it('führt auch der Tabellenkatalog beides mit', () => {
    for (const table of listTables()) {
      expect(table.source.issue).not.toBe('');
      expect(table.source.revision).not.toBe('');
    }
  });
});
