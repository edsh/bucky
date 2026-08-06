import type { NumericRange } from './types.js';
import { formatNumber } from './format.js';

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
  /**
   * Die aus Höhe und QNH errechnete Druckhöhe liegt außerhalb des
   * Tabellenbereichs (FR-006). Eigene Art, weil nicht die Eingabe selbst
   * unzulässig ist, sondern erst ihr Ergebnis — der Pilot muss erkennen, dass
   * in aller Regel der Luftdruck die Ursache ist, nicht seine Höhe.
   */
  | 'PRESSURE_ALTITUDE_OUT_OF_RANGE'
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
  /** Die Höhe über dem Meeresspiegel, aus der eine Druckhöhe entstand. */
  readonly elevationFt?: number;
  /** Der dabei verwendete Luftdruck. */
  readonly qnhHpa?: number;
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
  readonly elevationFt: number | undefined;
  readonly qnhHpa: number | undefined;

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
    this.elevationFt = details.elevationFt;
    this.qnhHpa = details.qnhHpa;
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

/**
 * FR-006: Die errechnete Druckhöhe liegt außerhalb des Tabellenbereichs. Die
 * Meldung nennt die Druckhöhe, die überschrittene Grenze und die Eingaben, aus
 * denen sie entstand — sonst sucht der Pilot den Fehler bei seiner Höhe, obwohl
 * in aller Regel der Luftdruck die Ursache ist.
 *
 * Es wird nicht auf den Tabellenrand zurückgefallen (FR-006a): Die
 * Steigflugtabelle ist ab 0 ft kumulativ, der Steigflug entsteht als Differenz
 * zweier Tabellenwerte. Eine angehobene Platzhöhe verkleinert diese Differenz
 * und wiese damit weniger Kraftstoff aus, als der Flug benötigt.
 */
export function pressureAltitudeOutOfRange(
  field: string,
  pressureAltitudeFt: number,
  allowedRange: NumericRange,
  elevationFt: number,
  qnhHpa: number
): PohCalculationError {
  const richtung = pressureAltitudeFt < allowedRange.min ? 'unter' : 'über';
  return new PohCalculationError(
    'PRESSURE_ALTITUDE_OUT_OF_RANGE',
    `Bei ${elevationFt} ft über dem Meeresspiegel und einem QNH von ${qnhHpa} hPa ergibt sich eine Druckhöhe von ${formatNumber(pressureAltitudeFt, 0)} ft. Das liegt ${richtung} dem Bereich, den die Tabellen des Flughandbuchs abdecken. Ursache ist hier der Luftdruck, nicht die Höhe. Es wird weder auf den Tabellenrand zurückgefallen noch extrapoliert.`,
    // Bewusst ohne `actual`: Die Druckhöhe steht bereits gerundet im Satz. Als
    // `actual` erschiene sie ein zweites Mal mit allen Nachkommastellen — eine
    // Genauigkeit, die die Rechnung nicht hat und die nur verunsichert.
    { field, allowedRange, elevationFt, qnhHpa }
  );
}
