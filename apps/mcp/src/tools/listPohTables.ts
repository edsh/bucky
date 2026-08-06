import { listTables } from '@edsh-bucky/deelk-poh-core';
import type { ToolResult } from './computeFuelPlan.js';

export const TOOL_DESCRIPTION =
  'Listet die digitalisierten Tabellen des Flughandbuchs mit Seitenzahl, Tabellenname und ' +
  'den beim Digitalisieren vermerkten Widersprüchen auf. Dient der Frage, woher ein Wert ' +
  'stammt. Die Tabellenzeilen selbst werden bewusst nicht herausgegeben — es darf nicht ' +
  'selbst interpoliert werden, dafür ist compute_fuel_plan da.';

/**
 * Der Tabellenkatalog. `listTables()` liefert nur Zusammenfassungen, keine
 * Zeilen — damit ist M-03 schon in der Schnittstelle des Kerns verankert.
 */
export function handleListPohTables(): ToolResult {
  const tables = listTables();
  const lines: string[] = [];

  for (const table of tables) {
    lines.push(`${table.figure} — ${table.tableName}`);
    lines.push(
      `  Seite ${table.source.pohPages.join(', ')}, ${table.source.issue}, ${table.source.revision}, ${table.rowCount} Zeilen`
    );
    lines.push(`  ${table.source.citation}`);
    for (const condition of table.conditions) {
      lines.push(`  Bedingung: ${condition}`);
    }
    for (const note of table.notes) {
      lines.push(`  Anmerkung: ${note}`);
    }
    for (const anomaly of table.anomalies) {
      lines.push(`  Widerspruch im Original: ${anomaly.description}`);
      if (anomaly.digitized_value !== undefined) {
        lines.push(`    Übernommen: ${anomaly.digitized_value}`);
      }
    }
    lines.push('');
  }

  return {
    content: [{ type: 'text', text: lines.join('\n').trimEnd() }],
    structuredContent: { tables }
  };
}
