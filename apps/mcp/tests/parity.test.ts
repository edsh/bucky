import { describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { computeCruiseCapability, computeFuelPlan, listTables } from '@edsh-bucky/deelk-poh-core';
import {
  buildInputShape,
  formatSummary,
  handleComputeFuelPlan
} from '../src/tools/computeFuelPlan.js';
import { handleListPohTables } from '../src/tools/listPohTables.js';
import { createServer } from '../src/server.js';

const fallA = {
  departureElevationFt: 0,
  cruiseAltitudeAmslFt: 6000,
  qnhHpa: 1013.25,
  distanceNm: 250,
  powerSettingPct: 70,
  isaDeviationC: 0,
  windComponentKt: 0
};

const fallB = {
  departureElevationFt: 2000,
  cruiseAltitudeAmslFt: 8000,
  qnhHpa: 1013.25,
  distanceNm: 120,
  powerSettingPct: 60,
  isaDeviationC: 20,
  windComponentKt: 15
};

describe('M-02: gleiche Eingabe, gleiches Zahlenergebnis', () => {
  for (const [name, input] of [
    ['Fall A', fallA],
    ['Fall B', fallB]
  ] as const) {
    it(`${name} liefert über den Adapter dieselben Zahlen wie der direkte Kernaufruf`, () => {
      const direkt = computeFuelPlan(input);
      const ueberAdapter = handleComputeFuelPlan(input);

      expect(ueberAdapter.isError).toBeUndefined();
      expect(ueberAdapter.structuredContent).toStrictEqual(direkt);
    });
  }

  it('rechnet nicht selbst — der Adapter reicht die Werte des Kerns unverändert durch', () => {
    const direkt = computeFuelPlan(fallA);
    const zusammenfassung = formatSummary(direkt);

    expect(zusammenfassung).toContain(direkt.breakdown.totalL.toFixed(1).replace('.', ','));
  });
});

describe('M-01: Quellenangaben und Prüfhinweis wortgleich', () => {
  it('nennt jede verwendete Tabelle mit Seitenzahl und Zitat', () => {
    const direkt = computeFuelPlan(fallA);
    const text = formatSummary(direkt);

    const poh = direkt.sources.filter((source) => source.kind === 'poh');

    expect(poh.length).toBeGreaterThan(0);
    for (const source of poh) {
      expect(text).toContain(source.tableName);
      expect(text).toContain(source.citation);
      for (const page of source.pohPages) {
        expect(text).toContain(page);
      }
    }
  });

  it('weist die Druckhöhen-Umrechnung getrennt von den Handbuchtabellen aus', () => {
    const text = formatSummary(computeFuelPlan(fallA));
    const tabellen = text.indexOf('Verwendete Tabellen:');
    const norm = text.indexOf('Nicht aus dem Flughandbuch:');

    // Die Norm darf nicht unter „Verwendete Tabellen" stehen, sonst liest ein
    // Sprachmodell sie als Handbuchquelle (Prinzip I).
    expect(norm).toBeGreaterThan(tabellen);
    expect(text).toContain('ICAO Doc 7488');
  });

  it('enthält den Prüfhinweis unverändert', () => {
    const direkt = computeFuelPlan(fallA);

    expect(formatSummary(direkt)).toContain(direkt.preflightCheckNotice);
  });
});

describe('T046: Fehler ohne Zahlenwert', () => {
  it('gibt bei einer Reiseflughöhe unter der Platzhöhe keinen Zahlenwert heraus', () => {
    const antwort = handleComputeFuelPlan({ ...fallA, cruiseAltitudeAmslFt: 0 });

    expect(antwort.isError).toBe(true);
    expect(antwort.structuredContent).toBeUndefined();
    expect(antwort.content[0]?.text ?? '').not.toMatch(/\d+[.,]\d/);
  });

  it('meldet eine unbelegte Lasteinstellung als Werkzeugfehler', () => {
    const antwort = handleComputeFuelPlan({ ...fallA, powerSettingPct: 75 });

    expect(antwort.isError).toBe(true);
    expect(antwort.structuredContent).toBeUndefined();
  });
});

describe('M-03: keine Rohtabellen', () => {
  it('liefert der Tabellenkatalog nur Zusammenfassungen, keine Zeilen', () => {
    const antwort = handleListPohTables();
    const inhalt = antwort.structuredContent as { tables: readonly Record<string, unknown>[] };

    expect(inhalt.tables.length).toBe(listTables().length);
    for (const table of inhalt.tables) {
      expect(table).not.toHaveProperty('rows');
      expect(table).toHaveProperty('rowCount');
    }
  });

  it('stellt der Server genau die beiden vereinbarten Werkzeuge bereit', async () => {
    const { tools } = await withClient((client) => client.listTools());

    expect(tools.map((tool) => tool.name).sort()).toStrictEqual([
      'compute_fuel_plan',
      'list_poh_tables'
    ]);
  });

  it('gibt auch über das Protokoll dieselben Zahlen heraus wie der Kern', async () => {
    const antwort = await withClient((client) =>
      client.callTool({ name: 'compute_fuel_plan', arguments: fallA })
    );

    expect(antwort.structuredContent).toStrictEqual(
      JSON.parse(JSON.stringify(computeFuelPlan(fallA)))
    );
  });
});

describe('T044: Eingabeschema aus der Datengrundlage', () => {
  it('beschreibt genau die sieben Felder des Flugvorhabens', () => {
    expect(Object.keys(buildInputShape()).sort()).toStrictEqual([
      'cruiseAltitudeAmslFt',
      'departureElevationFt',
      'distanceNm',
      'isaDeviationC',
      'powerSettingPct',
      'qnhHpa',
      'windComponentKt'
    ]);
  });

  it('nimmt keine Druckhöhe mehr entgegen', () => {
    const felder = Object.keys(buildInputShape());

    expect(felder).not.toContain('departureAltitudeFt');
    expect(felder).not.toContain('cruiseAltitudeFt');
  });
});

/** Ein vollständiger Protokoll-Durchlauf gegen den echten Server. */
async function withClient<T>(use: (client: Client) => Promise<T>): Promise<T> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test', version: '0.0.0' });
  await Promise.all([createServer().connect(serverTransport), client.connect(clientTransport)]);
  try {
    return await use(client);
  } finally {
    await client.close();
  }
}

describe('FR-006 über den MCP-Weg', () => {
  it('meldet eine Druckhöhe außerhalb des Tabellenbereichs als Werkzeugfehler', () => {
    const antwort = handleComputeFuelPlan({
      ...fallA,
      departureElevationFt: 85,
      cruiseAltitudeAmslFt: 6000,
      qnhHpa: 1030
    });

    expect(antwort.isError).toBe(true);
    expect(antwort.structuredContent).toBeUndefined();
    // Der Pilot beziehungsweise das Sprachmodell muss erkennen, dass der
    // Luftdruck die Ursache ist, nicht die Höhe.
    expect(antwort.content[0]?.text ?? '').toContain('1030');
  });
});

describe('Reiseleistungs-Übersicht über den MCP-Weg (Feature 006)', () => {
  it.each([fallA, fallB])('liefert dieselben Felder wie der unmittelbare Aufruf', (eingabe) => {
    // Zwei Wege, eine Zahl (Prinzip IV): Der Adapter darf die Übersicht weder
    // nachrechnen noch anders zusammensetzen als der Kern.
    const ueberDenPlan = computeFuelPlan(eingabe).cruiseCapability;
    const unmittelbar = computeCruiseCapability(eingabe);

    expect(JSON.stringify(ueberDenPlan)).toBe(JSON.stringify(unmittelbar));
  });

  it('nennt Reichweite und Flugdauer in der Zusammenfassung, getrennt vom Bedarf', () => {
    const text = formatSummary(computeFuelPlan(fallA));

    expect(text).toContain('Reichweite');
    expect(text).toContain('Flugdauer');
    expect(text).toContain('Windstille');
    // Der Satz, der die Verwechslung ausschließt, muss mit dabei sein.
    expect(text).toContain('kein Bedarf');
    expect(text).toContain('45 min');
  });

  it('trennt den Reserve-Hinweis des Bedarfs von dem der Übersicht', () => {
    const text = formatSummary(computeFuelPlan(fallA));

    // Beide Aussagen stehen im Text und sagen Gegensätzliches über
    // verschiedene Zahlen — sie dürfen nicht ineinanderlaufen.
    expect(text).toContain('Das ist keine Reserve.');
    expect(text).toContain('45 min. Reserve');
  });
});
