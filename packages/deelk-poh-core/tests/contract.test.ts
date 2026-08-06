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
