#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { pathToFileURL } from 'node:url';
import {
  TOOL_DESCRIPTION as COMPUTE_DESCRIPTION,
  buildInputShape,
  handleComputeFuelPlan
} from './tools/computeFuelPlan.js';
import {
  TOOL_DESCRIPTION as LIST_DESCRIPTION,
  handleListPohTables
} from './tools/listPohTables.js';

/**
 * MCP-Server über stdio. Dünner Adapter über `@edsh-bucky/deelk-poh-core`
 * ohne eigene Rechenlogik (Constitution-Prinzip IV). Er stellt bewusst kein
 * Werkzeug bereit, das Rohtabellenzeilen herausgibt (M-03).
 */
export function createServer(): McpServer {
  const server = new McpServer({ name: 'bucky-deelk-poh', version: '0.1.0' });

  server.registerTool(
    'compute_fuel_plan',
    {
      title: 'Kraftstoffbedarf D-EELK berechnen',
      description: COMPUTE_DESCRIPTION,
      inputSchema: buildInputShape(),
      annotations: { readOnlyHint: true, openWorldHint: false }
    },
    (args) => handleComputeFuelPlan(args)
  );

  server.registerTool(
    'list_poh_tables',
    {
      title: 'Digitalisierte POH-Tabellen auflisten',
      description: LIST_DESCRIPTION,
      annotations: { readOnlyHint: true, openWorldHint: false }
    },
    () => handleListPohTables()
  );

  return server;
}

export async function main(): Promise<void> {
  await createServer().connect(new StdioServerTransport());
}

const startedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (startedDirectly) {
  await main();
}
