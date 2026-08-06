/**
 * Typen des Kerns laut `specs/001-kraftstoffrechner-d-eelk/data-model.md`.
 * Sie sind für beide Zugangswege identisch (Constitution-Prinzip IV).
 */

/**
 * Quellenreferenz einer POH-Tabelle. Wird unverändert aus den JSON-Dateien
 * übernommen und nicht im Code neu formuliert (FR-005, Prinzip I).
 */
export interface PohSourceReference {
  readonly kind: 'poh';
  readonly tableId: string;
  readonly figure: string;
  readonly tableName: string;
  readonly pohPages: readonly string[];
  /** Ausgabe des Handbuchs, z. B. „Ausgabe 2". */
  readonly issue: string;
  /**
   * Änderungsstand der referenzierten Seiten. Wer ein Handbuch mit anderem
   * Stand vor sich hat, muss die Abweichung bemerken können (FR-005).
   */
  readonly revision: string;
  readonly citation: string;
}

/**
 * Quellenreferenz einer Größe, die nicht aus dem Flughandbuch stammt, sondern
 * aus einer Norm — bislang allein die Druckhöhe. Für sie gibt es keine
 * Handbuchseite; eine anzugeben wäre erfunden. Die Unterscheidung ist deshalb
 * ein eigener Typ und kein Sonderfall im Code (Constitution, Prinzip I).
 */
export interface StandardSourceReference {
  readonly kind: 'standard';
  /** Die Norm selbst, z. B. „ICAO Doc 7488". */
  readonly standard: string;
  /** Die verwendete Formel im Klartext, damit sie nachgerechnet werden kann. */
  readonly formula: string;
  readonly citation: string;
}

/**
 * Beide Ausprägungen tragen `citation`. Eine Anzeige, die nur diese liest,
 * läuft unverändert weiter. Wer den Prüfhinweis „gegen das Original-POH
 * gegenchecken" ausgibt, MUSS auf `kind: 'poh'` einschränken.
 */
export type SourceReference = PohSourceReference | StandardSourceReference;

/** Ein tatsächlich aus der Tabelle gelesener Stützwert. */
export interface TableAnchor {
  /** Die Stützstelle, z. B. `{ pressureAltitudeFt: 6000, powerSettingPct: 70 }`. */
  readonly at: Readonly<Record<string, number>>;
  /** Die dort abgelesenen Werte, z. B. `{ ktas: 116, fuelFlowLph: 22.1 }`. */
  readonly values: Readonly<Record<string, number>>;
  readonly source: PohSourceReference;
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
  /**
   * Schrittweite, mit der ein Regler den Bereich durchfährt. Sie kommt aus dem
   * Kern, damit kein Adapter sie erfindet (FR-002).
   */
  readonly step: number;
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
  /** Platzhöhe über dem Meeresspiegel, wie sie auf der Karte steht. */
  readonly departureElevationFt: NumericRange;
  /** Reiseflughöhe über dem Meeresspiegel. */
  readonly cruiseAltitudeAmslFt: NumericRange;
  /** Luftdruck auf Meereshöhe aus dem Wetterbericht. */
  readonly qnhHpa: NumericRange;
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
  readonly source?: PohSourceReference;
}

/**
 * Ein beim Digitalisieren vermerkter Widerspruch des Originals. Er wird
 * mitgeliefert, damit er beim Abgleich mit dem Handbuch nicht als
 * Digitalisierungsfehler missverstanden wird.
 */
export interface SourceAnomaly {
  readonly kind: string;
  readonly description: string;
  readonly digitized_value?: string;
  readonly action?: string;
}

/** Beschreibung einer geladenen Tabelle ohne ihre Zeilen. */
export interface TableSummary {
  readonly id: string;
  readonly kind: string;
  readonly figure: string;
  readonly tableName: string;
  readonly source: PohSourceReference;
  readonly conditions: readonly string[];
  readonly notes: readonly string[];
  readonly rowCount: number;
  readonly anomalies: readonly SourceAnomaly[];
}
