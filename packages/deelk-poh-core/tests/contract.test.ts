import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  computeCruiseCapability,
  type CruiseCapability
} from '../src/fuel/cruiseCapability.js';

/**
 * Prüft die Zusicherungen C-01 und C-03 am Quelltext selbst. Beides sind
 * Abmachungen, die man beim Weiterbauen versehentlich bricht — der Test macht
 * daraus einen Fehlschlag statt einer Absprache.
 */

const repoRoot = fileURLToPath(new URL('../../..', import.meta.url));
const coreSrc = join(repoRoot, 'packages/deelk-poh-core/src');

function sourceFiles(directory: string, extensions: readonly string[]): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      found.push(...sourceFiles(path, extensions));
    } else if (extensions.some((extension) => entry.name.endsWith(extension))) {
      found.push(path);
    }
  }
  return found;
}

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('C-01: der Kern ist UI-frei und plattformunabhängig', () => {
  const files = sourceFiles(coreSrc, ['.ts']);

  it('findet überhaupt Quelldateien', () => {
    expect(files.length).toBeGreaterThan(5);
  });

  const verbotenerImport = [
    /from\s+'node:[^']+'/,
    /from\s+'(fs|path|os|child_process)'/,
    /from\s+'svelte(\/[^']*)?'/,
    /from\s+'@sveltejs\/[^']+'/,
    /from\s+'\$(app|lib)\/[^']+'/,
    /from\s+'@modelcontextprotocol\/[^']+'/
  ];

  it.each(files)('%s importiert weder Plattform noch Oberfläche', (path) => {
    const source = read(path);
    for (const muster of verbotenerImport) {
      expect(source, `${relative(repoRoot, path)} verstößt gegen C-01`).not.toMatch(muster);
    }
  });

  const verboteneGlobals = ['window', 'document', 'localStorage', 'process'];

  it.each(files)('%s greift auf kein Browser- oder Node-Global zu', (path) => {
    const source = read(path);
    for (const name of verboteneGlobals) {
      expect(source, `${relative(repoRoot, path)} verstößt gegen C-01`).not.toMatch(
        new RegExp(`\\b${name}\\.`)
      );
    }
  });
});

describe('C-03: gerundet wird ausschließlich in format.ts', () => {
  /** Adapter dürfen die Zahlen des Kerns anzeigen, aber nicht verändern. */
  const adapterSrc = [join(repoRoot, 'apps/web/src'), join(repoRoot, 'apps/mcp/src')];

  const rundung = [/\bMath\.round\b/, /\bMath\.floor\b/, /\bMath\.ceil\b/, /\.toFixed\(/];

  const kernOhneFormat = sourceFiles(coreSrc, ['.ts']).filter(
    (path) => !path.endsWith('format.ts')
  );

  it.each(kernOhneFormat)('%s rundet nicht selbst', (path) => {
    const source = read(path);
    for (const muster of rundung) {
      expect(source, `${relative(repoRoot, path)} verstößt gegen C-03`).not.toMatch(muster);
    }
  });

  const adapterDateien = adapterSrc.flatMap((directory) =>
    sourceFiles(directory, ['.ts', '.svelte'])
  );

  it('findet überhaupt Adapterdateien', () => {
    expect(adapterDateien.length).toBeGreaterThan(3);
  });

  it.each(adapterDateien)('%s rundet nicht nach', (path) => {
    const source = read(path);
    for (const muster of rundung) {
      expect(source, `${relative(repoRoot, path)} verstößt gegen C-03`).not.toMatch(muster);
    }
  });

  it('nur format.ts enthält die Rundungsfunktion roundTo', () => {
    const mitRoundTo = sourceFiles(coreSrc, ['.ts']).filter((path) =>
      /export function roundTo\b/.test(read(path))
    );

    expect(mitRoundTo.map((path) => relative(repoRoot, path))).toStrictEqual([
      'packages/deelk-poh-core/src/format.ts'
    ]);
  });
});

describe('C-04: kein Adapter rechnet die Druckhöhe selbst aus', () => {
  /**
   * Die Umrechnung Höhe ASL + QNH → Druckhöhe ist eine Rechnung im Sinne von
   * Prinzip IV und gehört damit ausschließlich in den Kern. Eine zweite,
   * scheinbar harmlose Umsetzung im Adapter (etwa die Faustformel 30 ft/hPa)
   * würde genau den Wertunterschied erzeugen, den FR-009 sichtbar machen soll.
   */
  const adapterDateien = [join(repoRoot, 'apps/web/src'), join(repoRoot, 'apps/mcp/src')].flatMap(
    (directory) => sourceFiles(directory, ['.ts', '.svelte'])
  );

  const verdacht = [
    // Bestandteile der Barometerformel
    /1013\.25/,
    /5\.25588/,
    /0\.190263/,
    /288\.15/,
    /0\.0065/,
    // Faustformel in ihren gebräuchlichen Schreibweisen
    /\b30\s*\*\s*\(/,
    /ft\s*\/\s*hPa\s*\*/
  ];

  it.each(adapterDateien)('%s enthält keine eigene Umrechnung', (path) => {
    const source = read(path);
    for (const muster of verdacht) {
      expect(source, `${relative(repoRoot, path)} verstößt gegen C-04`).not.toMatch(muster);
    }
  });

  it('die Umrechnung steht genau einmal im Kern', () => {
    const mitUmrechnung = sourceFiles(coreSrc, ['.ts']).filter((path) =>
      /export function toPressureAltitude\b/.test(read(path))
    );

    expect(mitUmrechnung.map((path) => relative(repoRoot, path))).toStrictEqual([
      'packages/deelk-poh-core/src/atmosphere/pressureAltitude.ts'
    ]);
  });
});

describe('C-05: kein Adapter legt eigene Grenzen oder Schrittweiten fest', () => {
  /**
   * Grenzen und Schrittweiten der Regler stammen aus `getFuelPlanInputDomain()`.
   * Stünden sie zusätzlich im Adapter, ließe eine Änderung der Tabellenbasis die
   * Oberfläche unbemerkt Werte anbieten, die der Kern anschließend ablehnt.
   */
  const adapterDateien = [join(repoRoot, 'apps/web/src'), join(repoRoot, 'apps/mcp/src')].flatMap(
    (directory) => sourceFiles(directory, ['.ts', '.svelte'])
  );

  it.each(adapterDateien)('%s schreibt min/max/step nicht fest', (path) => {
    const source = read(path);

    // Erlaubt ist ausschließlich die Weitergabe aus dem Bereichsobjekt,
    // also min={range.min} — verboten ist jede feste Zahl.
    const feste = [
      /\b(?:min|max|step)\s*[=:]\s*["'{]?-?\d/,
      /\bminimum\s*[=:]\s*-?\d/,
      /\bmaximum\s*[=:]\s*-?\d/
    ];

    for (const muster of feste) {
      expect(source, `${relative(repoRoot, path)} verstößt gegen C-05`).not.toMatch(muster);
    }
  });
});

describe('C-06: kein Adapter greift auf die Spalten für Reichweite und Flugdauer zu', () => {
  /**
   * Die Tabellenwerte für Reichweite und Flugdauer schließen Rollen, Steigflug
   * und Reserve ein und stimmen deshalb nicht mit Geschwindigkeit mal Zeit
   * überein — bei 0 ft und 100 % Last stehen 365 NM gegen 362,5 NM aus dem
   * Produkt. Ein Adapter, der sie selbst bildete, wiese systematisch zu wenig
   * aus, also in die gefährliche Richtung.
   */
  const adapterDateien = [join(repoRoot, 'apps/web/src'), join(repoRoot, 'apps/mcp/src')].flatMap(
    (directory) => sourceFiles(directory, ['.ts', '.svelte'])
  );

  it.each(adapterDateien)('%s liest weder range_nm noch endurance_h', (path) => {
    const source = read(path);

    expect(source, `${relative(repoRoot, path)} verstößt gegen C-06`).not.toMatch(/range_nm/);
    expect(source, `${relative(repoRoot, path)} verstößt gegen C-06`).not.toMatch(/endurance_h/);
  });

  it.each(adapterDateien)('%s bildet keine Strecke aus Geschwindigkeit mal Zeit', (path) => {
    const source = read(path);

    // Jede Multiplikation, an der eine Geschwindigkeit oder eine Dauer
    // beteiligt ist, wäre hier eine eigene Rechnung — und damit im Adapter
    // fehl am Platz (C-02).
    expect(source, `${relative(repoRoot, path)} verstößt gegen C-06`).not.toMatch(
      /\b(?:ktas|enduranceH|timeH|groundSpeedKt)\b\s*\*/i
    );
  });
});

describe('FR-009: die Reiseleistung hängt nicht am Vorhaben', () => {
  /**
   * Mechanisch statt argumentativ: Strecke, Wind und Platzhöhe werden über
   * ihren zulässigen Bereich variiert. Ändert sich dabei ein einziges Feld der
   * Übersicht, ist die Trennung zwischen Auskunft und Bedarf gebrochen.
   */
  const grundfall = {
    departureElevationFt: 1000,
    cruiseAltitudeAmslFt: 6000,
    qnhHpa: 1013.25,
    distanceNm: 400,
    powerSettingPct: 70,
    isaDeviationC: 10,
    windComponentKt: 0
  };

  const felder = (capability: CruiseCapability): string =>
    JSON.stringify([
      capability.tableKtas,
      capability.ktas,
      capability.fuelFlowLph,
      capability.fuelFlowUsGph,
      capability.litresPerNm,
      capability.tableRangeNm,
      capability.maxRangeNm,
      capability.enduranceH,
      capability.temperatureFactor
    ]);

  it('bleibt über den gesamten Bereich von Strecke, Wind und Platzhöhe gleich', () => {
    const erwartet = felder(computeCruiseCapability(grundfall));
    let geprueft = 0;

    for (const distanceNm of [1, 100, 400, 900]) {
      for (const windComponentKt of [-50, -10, 0, 25, 50]) {
        for (const departureElevationFt of [0, 500, 1000, 4000]) {
          const capability = computeCruiseCapability({
            ...grundfall,
            distanceNm,
            windComponentKt,
            departureElevationFt
          });
          expect(
            felder(capability),
            `${distanceNm} NM / ${windComponentKt} kt / ${departureElevationFt} ft verändert die Übersicht`
          ).toBe(erwartet);
          geprueft += 1;
        }
      }
    }

    expect(geprueft).toBe(80);
  });
});
