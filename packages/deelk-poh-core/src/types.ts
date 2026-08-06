/**
 * Typen des Kerns laut `specs/001-kraftstoffrechner-d-eelk/data-model.md`.
 * Sie sind für beide Zugangswege identisch (Constitution-Prinzip IV).
 */

/**
 * Quellenreferenz einer POH-Tabelle. Wird unverändert aus den JSON-Dateien
 * übernommen und nicht im Code neu formuliert (FR-005, Prinzip I).
 */
export interface SourceReference {
  readonly tableId: string;
  readonly figure: string;
  readonly tableName: string;
  readonly pohPages: readonly string[];
  readonly citation: string;
}

/** Ein tatsächlich aus der Tabelle gelesener Stützwert. */
export interface TableAnchor {
  /** Die Stützstelle, z. B. `{ pressureAltitudeFt: 6000, powerSettingPct: 70 }`. */
  readonly at: Readonly<Record<string, number>>;
  /** Die dort abgelesenen Werte, z. B. `{ ktas: 116, fuelFlowLph: 22.1 }`. */
  readonly values: Readonly<Record<string, number>>;
  readonly source: SourceReference;
}

/** Ein benannter Zahlenwert mit Einheit. */
export interface Quantity {
  readonly value: number;
  readonly unit: string;
}

/**
 * Kleinste Einheit, die ein Pilot von Hand gegen das Handbuch nachrechnen
 * kann (FR-017).
 */
export interface CalculationStep {
  readonly id: string;
  readonly label: string;
  readonly inputs: Readonly<Record<string, Quantity>>;
  /**
   * Die Ergebnisse des Schritts. Mehrzahl, weil ein Schritt des
   * POH-Verfahrens regelmäßig Zeit, Strecke und Kraftstoff zugleich liefert.
   */
  readonly results: Readonly<Record<string, Quantity>>;
  /** Leer bei rein rechnerischen Schritten. */
  readonly anchors: readonly TableAnchor[];
  readonly explanation: string;
  readonly sources: readonly SourceReference[];
}

/** Zulässiger Bereich eines Eingabefelds. */
export interface NumericRange {
  readonly min: number;
  readonly max: number;
  readonly unit: string;
}

/** Die in der Reiseleistungstabelle je Druckhöhe belegten Lasteinstellungen. */
export interface PowerSettingAvailability {
  readonly pressureAltitudeFt: number;
  readonly powerSettingsPct: readonly number[];
}

/**
 * Wertebereiche der Eingabe, aus den Tabellendaten abgeleitet. Adapter füllen
 * damit ihre Formulare, statt Grenzen selbst zu kennen (Prinzip IV).
 */
export interface InputDomain {
  readonly departureAltitudeFt: NumericRange;
  readonly cruiseAltitudeFt: NumericRange;
  readonly distanceNm: NumericRange;
  readonly powerSettingPct: NumericRange;
  readonly isaDeviationC: NumericRange;
  readonly windComponentKt: NumericRange;
  readonly powerSettingsByPressureAltitude: readonly PowerSettingAvailability[];
}

/** Ein Hinweis, der die Berechnung nicht abbricht. */
export interface Advisory {
  readonly id: string;
  readonly text: string;
  /** Quelle, wenn der Hinweis eine Anmerkung des Handbuchs wiedergibt. */
  readonly source?: SourceReference;
}

/** Beschreibung einer geladenen Tabelle ohne ihre Zeilen. */
export interface TableSummary {
  readonly id: string;
  readonly kind: string;
  readonly figure: string;
  readonly tableName: string;
  readonly source: SourceReference;
  readonly conditions: readonly string[];
  readonly notes: readonly string[];
  readonly rowCount: number;
}
