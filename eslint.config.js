import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * Zusicherung C-01: Der Kern ist UI-frei und plattformunabhängig
 * (Constitution-Prinzip IV). Die Regel unten macht daraus einen Fehler statt
 * einer Absprache — sie greift bevor jemand versehentlich SvelteKit, das DOM
 * oder das Dateisystem in die Rechenlogik zieht.
 */
const kernVerboteneImporte = {
  patterns: [
    {
      group: ['node:*', 'fs', 'path', 'os', 'child_process'],
      message:
        'Der Kern darf nicht auf Node-Interna zugreifen (Zusicherung C-01). Tabellen werden zur Bauzeit importiert, nicht zur Laufzeit gelesen.'
    },
    {
      group: ['svelte', 'svelte/*', '@sveltejs/*', '$app/*', '$lib/*'],
      message: 'Der Kern darf SvelteKit nicht kennen (Zusicherung C-01).'
    },
    {
      group: ['@modelcontextprotocol/*'],
      message: 'Der Kern darf das MCP-Protokoll nicht kennen (Zusicherung C-01).'
    }
  ]
};

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.svelte-kit/**',
      '**/.wrangler/**',
      'data/**',
      'tools/**',
      // Der Design-Handoff ist ein Fremdkoerper mit Absicht: unveraenderter
      // Prototyp-Quellcode, der als visuelle Vorlage dient und nie
      // ausgeliefert wird. Ihn an unsere Regeln anzupassen hiesse, die
      // Vorlage zu veraendern, gegen die wir das Ergebnis pruefen.
      'docs/design_handoff_reservierung/**',
      'docs/design_handoff_reservierung_v2/**'
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }
      ]
    }
  },
  {
    // Build-Konfiguration laeuft in Node, nicht im Browser.
    files: ['**/*.config.js', 'apps/mcp/**/*.ts'],
    languageOptions: {
      globals: { process: 'readonly' }
    }
  },
  {
    // Der Klickpfad laeuft in Node und steuert einen echten Browser.
    files: ['tests/ui/**/*.mjs'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        document: 'readonly',
        window: 'readonly',
        // Kommen in den Rueckrufen vor, die im Browser ausgefuehrt werden.
        HTMLInputElement: 'readonly',
        Event: 'readonly',
        // Seit Feature 041 prueft der Klickpfad auch das Gedaechtnis der Seite.
        localStorage: 'readonly',
        // Seit Feature 043 prueft er Avatar-Stil und Adressen der Startseite.
        getComputedStyle: 'readonly',
        URL: 'readonly'
      }
    }
  },
  {
    files: ['packages/deelk-poh-core/src/**/*.ts'],
    languageOptions: {
      globals: {}
    },
    rules: {
      'no-restricted-imports': ['error', kernVerboteneImporte],
      'no-restricted-globals': [
        'error',
        {
          name: 'window',
          message: 'Der Kern läuft nicht nur im Browser (Zusicherung C-01).'
        },
        {
          name: 'document',
          message: 'Der Kern erzeugt keine Oberfläche (Zusicherung C-01).'
        },
        {
          name: 'localStorage',
          message: 'Der Kern hält keinen Zustand (Zusicherung C-01).'
        },
        {
          name: 'process',
          message: 'Der Kern liest keine Umgebung (Zusicherung C-01).'
        }
      ]
    }
  }
);
