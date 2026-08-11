import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'deelk-poh-core',
          root: './packages/deelk-poh-core',
          include: ['tests/**/*.test.ts'],
          environment: 'node'
        }
      },
      {
        test: {
          name: 'mcp',
          root: './apps/mcp',
          include: ['tests/**/*.test.ts'],
          environment: 'node'
        }
      },
      {
        test: {
          name: 'web',
          root: './apps/web',
          include: ['tests/**/*.test.ts'],
          // Die geprüften Teile des Netz-Adapters sind reine Funktionen —
          // Adresse bauen und Antwort deuten. Ein DOM wird dafür nicht
          // gebraucht; die Oberfläche selbst prüft der Klickpfad.
          environment: 'node'
        }
      }
    ]
  }
});
