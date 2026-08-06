import { describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { computeFuelPlan, listTables } from '@edsh-bucky/deelk-poh-core';
import {
  buildInputShape,
  formatSummary,
  handleComputeFuelPlan
} from '../src/tools/computeFuelPlan.js';
import { handleListPohTables } from '../src/tools/listPohTables.js';
import { createServer } from '../src/server.js';

const fallA = {
  departureAltitudeFt: 0,
  cruiseAltitudeFt: 6000,
  distanceNm: 250,
  powerSettingPct: 70,
  isaDeviationC: 0,
  windComponentKt: 0
};

const fallB = {
  departureAltitudeFt: 2000,
  cruiseAltitudeFt: 8000,
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

    expect(direkt.sources.length).toBeGreaterThan(0);
    for (const source of direkt.sources) {
      expect(text).toContain(source.tableName);
      expect(text).toContain(source.citation);
      for (const page of source.pohPages) {
        expect(text).toContain(page);
      }
    }
  });

  it('enthält den Prüfhinweis unverändert', () => {
    const direkt = computeFuelPlan(fallA);

    expect(formatSummary(direkt)).toContain(direkt.preflightCheckNotice);
  });
});

describe('T046: Fehler ohne Zahlenwert', () => {
  it('gibt bei einer Reiseflughöhe unter der Platzhöhe keinen Zahlenwert heraus', () => {
    const antwort = handleComputeFuelPlan({ ...fallA, cruiseAltitudeFt: 0 });

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
  it('beschreibt genau die sechs Felder des Flugvorhabens', () => {
    expect(Object.keys(buildInputShape()).sort()).toStrictEqual([
      'cruiseAltitudeFt',
      'departureAltitudeFt',
      'distanceNm',
      'isaDeviationC',
      'powerSettingPct',
      'windComponentKt'
    ]);
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
