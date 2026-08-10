import type { NumericRange, TableAnchor } from './types.js';
import { PohCalculationError, outOfRange } from './errors.js';
import { getSourceReference, getTable, type TableRow } from './tables.js';

export interface InterpolationResult {
  /** Die interpolierten Werte, benannt wie die abgefragten Spalten. */
  readonly values: Readonly<Record<string, number>>;
  /**
   * Die tatsächlich verwendeten Stützwerte: zwei bei einer Interpolation,
   * einer, wenn die Stützstelle exakt getroffen wurde. Sie gehen unverändert
   * in die Nachvollziehbarkeit des Ergebnisses ein (FR-017).
   */
  readonly anchors: readonly TableAnchor[];
  /** Lage zwischen den beiden Stützwerten, 0 bei exaktem Treffer. */
  readonly fraction: number;
}

export interface InterpolationQuery {
  readonly tableId: string;
  /** Spalte, entlang der interpoliert wird, z. B. `pressure_altitude_ft`. */
  readonly axisKey: string;
  readonly axisValue: number;
  /** Spalten, deren Werte gebraucht werden, z. B. `["ktas", "fuel_flow_lph"]`. */
  readonly valueKeys: readonly string[];
  /** Einschränkung auf eine Zeilengruppe, z. B. eine feste Lasteinstellung. */
  readonly where?: Readonly<Record<string, number>>;
  /** Name des Eingabefelds für die Fehlermeldung. */
  readonly field: string;
  /** Einheit der Achse für die Fehlermeldung. */
  readonly axisUnit: string;
}

/**
 * Lineare Interpolation zwischen zwei Stützwerten einer POH-Tabelle.
 *
 * Außerhalb des Rasters wird nicht extrapoliert, sondern geworfen (FR-003,
 * FR-007): das Handbuch trifft dort keine Aussage, und eine fortgeschriebene
 * Gerade wäre eine Erfindung.
 */
export function interpolate(query: InterpolationQuery): InterpolationResult {
  const table = getTable(query.tableId);
  const source = getSourceReference(query.tableId);
  const rows = selectRows(table.rows, query);

  if (rows.length === 0) {
    throw new PohCalculationError(
      'UNSUPPORTED_COMBINATION',
      'Für diese Kombination enthält die Tabelle keine Zeilen.',
      { field: query.field, tableId: query.tableId, actual: query.axisValue }
    );
  }

  const sorted = [...rows].sort((a, b) => readCell(a, query.axisKey) - readCell(b, query.axisKey));
  const first = sorted[0] as TableRow;
  const last = sorted[sorted.length - 1] as TableRow;
  const range: NumericRange = {
    min: readCell(first, query.axisKey),
    max: readCell(last, query.axisKey),
    unit: query.axisUnit,
    // Nur zur Fehlermeldung; das Tabellenraster ist nicht äquidistant und gibt
    // keine sinnvolle Schrittweite her.
    step: 1
  };

  if (query.axisValue < range.min || query.axisValue > range.max) {
    throw outOfRange(query.field, query.axisValue, range, query.tableId);
  }

  for (let index = 0; index < sorted.length; index += 1) {
    const row = sorted[index] as TableRow;
    const at = readCell(row, query.axisKey);

    if (at === query.axisValue) {
      return {
        values: pick(row, query.valueKeys),
        anchors: [toAnchor(row, query, source)],
        fraction: 0
      };
    }

    if (at > query.axisValue) {
      const lower = sorted[index - 1] as TableRow;
      const lowerAt = readCell(lower, query.axisKey);
      const fraction = (query.axisValue - lowerAt) / (at - lowerAt);
      const values: Record<string, number> = {};
      for (const key of query.valueKeys) {
        const lowerValue = readCell(lower, key);
        values[key] = lowerValue + (readCell(row, key) - lowerValue) * fraction;
      }
      return {
        values,
        anchors: [toAnchor(lower, query, source), toAnchor(row, query, source)],
        fraction
      };
    }
  }

  /* c8 ignore next 5 -- durch die Bereichsprüfung oben nicht erreichbar */
  throw new PohCalculationError(
    'NOT_COMPUTABLE',
    'Zu diesem Wert ließ sich kein Stützwertpaar bestimmen.',
    { field: query.field, tableId: query.tableId, actual: query.axisValue }
  );
}

/** Eine Achse der zweidimensionalen Interpolation. */
export interface GridAxisQuery {
  /** Spalte der Tabelle, z. B. `pressure_altitude_ft`. */
  readonly key: string;
  readonly value: number;
  /** Name des Eingabefelds für die Fehlermeldung. */
  readonly field: string;
  /** Einheit der Achse für die Fehlermeldung. */
  readonly unit: string;
}

export interface GridInterpolationQuery {
  readonly tableId: string;
  /** Erste und zweite Achse; die Reihenfolge bestimmt nur die Fehlermeldung. */
  readonly axes: readonly [GridAxisQuery, GridAxisQuery];
  readonly valueKeys: readonly string[];
}

export interface GridInterpolationResult {
  readonly values: Readonly<Record<string, number>>;
  /**
   * Alle tatsächlich berührten Stützwerte: vier, wenn beide Achsen zwischen
   * Stützstellen liegen, zwei bei einer getroffenen Achse, einer bei beiden.
   * Jeder trägt **beide** Achsenwerte in `at` — ohne sie könnte der Pilot das
   * Ergebnis nicht gegen die gedruckte Tabelle halten.
   */
  readonly anchors: readonly TableAnchor[];
  /** Lage zwischen den Stützstellen der ersten Achse, 0 bei exaktem Treffer. */
  readonly fraction: number;
  /** Dasselbe für die zweite Achse. */
  readonly secondaryFraction: number;
}

/**
 * Bilineare Interpolation über zwei Achsen einer POH-Tabelle.
 *
 * Die Startstreckentabelle Abb. 5-1a ist die erste des Projekts, die über zwei
 * stetige Achsen zugleich aufgespannt ist. Die Mischung zweier Zwischenwerte
 * ist selbst Interpolation und gehört deshalb hierher und nicht in ein
 * Fachmodul — dieselbe Überlegung, die die Rundung in `format.ts` hält.
 *
 * Innen läuft die Funktion über `interpolate`: Sie klammert die erste Achse
 * ein und interpoliert für jeden der beiden Nachbarn entlang der zweiten. Die
 * Achsen bleiben damit voneinander unabhängig, und ein **nicht
 * gleichabständiges** Raster — die Temperaturachse führt −20, 0, 10, 20 … —
 * wird von selbst richtig behandelt, weil beide Ebenen die tatsächlichen
 * Nachbarn suchen statt eine Schrittweite anzunehmen.
 *
 * Außerhalb des Rasters wird nicht extrapoliert, sondern geworfen.
 */
export function interpolateGrid(query: GridInterpolationQuery): GridInterpolationResult {
  const [primary, secondary] = query.axes;
  const table = getTable(query.tableId);
  const grid = [...new Set(table.rows.map((row) => readCell(row, primary.key)))].sort(
    (a, b) => a - b
  );

  const first = grid[0];
  const last = grid[grid.length - 1];
  if (first === undefined || last === undefined) {
    throw new PohCalculationError(
      'UNSUPPORTED_COMBINATION',
      'Für diese Kombination enthält die Tabelle keine Zeilen.',
      { field: primary.field, tableId: query.tableId, actual: primary.value }
    );
  }

  const range: NumericRange = {
    min: first,
    max: last,
    unit: primary.unit,
    // Nur zur Fehlermeldung; siehe `interpolate`.
    step: 1
  };
  if (primary.value < range.min || primary.value > range.max) {
    throw outOfRange(primary.field, primary.value, range, query.tableId);
  }

  const [lowerAt, upperAt] = bracket(grid, primary.value);

  const alongSecondary = (primaryValue: number): InterpolationResult =>
    interpolate({
      tableId: query.tableId,
      axisKey: secondary.key,
      axisValue: secondary.value,
      valueKeys: query.valueKeys,
      where: { [primary.key]: primaryValue },
      field: secondary.field,
      axisUnit: secondary.unit
    });

  const lower = alongSecondary(lowerAt);

  if (lowerAt === upperAt) {
    return {
      values: lower.values,
      anchors: lower.anchors,
      fraction: 0,
      secondaryFraction: lower.fraction
    };
  }

  const upper = alongSecondary(upperAt);
  const fraction = (primary.value - lowerAt) / (upperAt - lowerAt);
  const values: Record<string, number> = {};
  for (const key of query.valueKeys) {
    const lowerValue = lower.values[key] as number;
    values[key] = lowerValue + ((upper.values[key] as number) - lowerValue) * fraction;
  }

  return {
    values,
    anchors: [...lower.anchors, ...upper.anchors],
    fraction,
    secondaryFraction: lower.fraction
  };
}

/** Die beiden Rasterwerte, die einen Wert einschließen; bei Treffer beide gleich. */
function bracket(grid: readonly number[], value: number): readonly [number, number] {
  let lower = grid[0] as number;
  let upper = grid[grid.length - 1] as number;
  for (const at of grid) {
    if (at <= value) {
      lower = at;
    }
    if (at >= value) {
      upper = at;
      break;
    }
  }
  return [lower, upper];
}

function selectRows(rows: readonly TableRow[], query: InterpolationQuery): readonly TableRow[] {
  const where = query.where;
  if (where === undefined) {
    return rows;
  }
  return rows.filter((row) =>
    Object.entries(where).every(([key, value]) => readCell(row, key) === value)
  );
}

function readCell(row: TableRow, key: string): number {
  const value = row[key];
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new PohCalculationError(
      'NOT_COMPUTABLE',
      `Die Spalte "${key}" fehlt in einer Tabellenzeile oder ist kein Zahlenwert.`
    );
  }
  return value;
}

function pick(row: TableRow, keys: readonly string[]): Record<string, number> {
  const picked: Record<string, number> = {};
  for (const key of keys) {
    picked[key] = readCell(row, key);
  }
  return picked;
}

function toAnchor(
  row: TableRow,
  query: InterpolationQuery,
  source: TableAnchor['source']
): TableAnchor {
  const at: Record<string, number> = { [toCamelCase(query.axisKey)]: readCell(row, query.axisKey) };
  for (const key of Object.keys(query.where ?? {})) {
    at[toCamelCase(key)] = readCell(row, key);
  }
  const values: Record<string, number> = {};
  for (const key of query.valueKeys) {
    values[toCamelCase(key)] = readCell(row, key);
  }
  return { at, values, source };
}

function toCamelCase(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_match, character: string) => character.toUpperCase());
}
