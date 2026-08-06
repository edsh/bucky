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
      }
    ]
  }
});
