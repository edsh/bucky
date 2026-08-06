import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

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
