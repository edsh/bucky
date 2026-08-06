import type { NumericRange } from './types.js';

/**
 * Arten von Rechenfehlern laut `data-model.md`. Die Berechnung wirft, statt
 * einen Wert zu erfinden (FR-007).
 */
export type PohCalculationErrorKind =
  /** Wert außerhalb des Tabellenrasters (V-02). */
  | 'OUT_OF_RANGE'
  /** Höhe und Last im Tabellenraster nicht gemeinsam belegt (V-03). */
  | 'UNSUPPORTED_COMBINATION'
  /** Fehlender Wert oder V-01 verletzt. */
  | 'INVALID_INPUT'
  /** V-05 oder V-06 erst während der Rechnung verletzt. */
  | 'NOT_COMPUTABLE';

export interface PohCalculationErrorDetails {
  /** Betroffenes Eingabefeld, sofern eines zuzuordnen ist. */
  readonly field?: string;
  /** Zulässiger Bereich, sofern eine Grenze verletzt wurde. */
  readonly allowedRange?: NumericRange;
  /** Tabelle, deren Raster die Grenze setzt. */
  readonly tableId?: string;
  /** Tatsächlich übergebener Wert. */
  readonly actual?: number;
}

/**
 * Fehler der POH-Berechnung. Die Meldung nennt Feld und zulässigen Bereich,
 * damit der Pilot sie ohne Blick in den Quelltext versteht (FR-007).
 */
export class PohCalculationError extends Error {
  readonly kind: PohCalculationErrorKind;
  readonly field: string | undefined;
  readonly allowedRange: NumericRange | undefined;
  readonly tableId: string | undefined;
  readonly actual: number | undefined;

  constructor(
    kind: PohCalculationErrorKind,
    message: string,
    details: PohCalculationErrorDetails = {}
  ) {
    super(buildMessage(message, details));
    this.name = 'PohCalculationError';
    this.kind = kind;
    this.field = details.field;
    this.allowedRange = details.allowedRange;
    this.tableId = details.tableId;
    this.actual = details.actual;
  }
}

function buildMessage(message: string, details: PohCalculationErrorDetails): string {
  const parts: string[] = [message];
  if (details.field !== undefined) {
    const actual = details.actual === undefined ? '' : ` (übergeben: ${details.actual})`;
    parts.push(`Feld: ${details.field}${actual}.`);
  }
  if (details.allowedRange !== undefined) {
    const { min, max, unit } = details.allowedRange;
    parts.push(`Zulässig: ${min} bis ${max} ${unit}.`);
  }
  if (details.tableId !== undefined) {
    parts.push(`Grenze aus Tabelle ${details.tableId}.`);
  }
  return parts.join(' ');
}

export function outOfRange(
  field: string,
  actual: number,
  allowedRange: NumericRange,
  tableId?: string
): PohCalculationError {
  return new PohCalculationError(
    'OUT_OF_RANGE',
    'Der Wert liegt außerhalb des Tabellenrasters des Flughandbuchs; es wird nicht extrapoliert.',
    tableId === undefined
      ? { field, actual, allowedRange }
      : { field, actual, allowedRange, tableId }
  );
}
