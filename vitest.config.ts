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
          name: 'reservierung-core',
          root: './packages/reservierung-core',
          include: ['tests/**/*.test.ts'],
          // Der Kern rechnet mit Zeitzonen. Damit die Prüfungen überall
          // dasselbe ergeben — auf diesem Rechner wie in der CI, die in UTC
          // läuft —, wird die Zeitzone hier festgenagelt statt der Umgebung
          // überlassen. Eine Prüfung, die nur zu Hause grün ist, prüft nichts.
          environment: 'node',
          env: { TZ: 'UTC' }
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
