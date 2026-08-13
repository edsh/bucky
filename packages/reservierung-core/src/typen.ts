/**
 * Die drei Groessen dieses Kerns, in der Reihenfolge, in der die Daten sie
 * durchlaufen: Reservierung -> Abrufstand -> Belegungsauskunft.
 *
 * Grundlage: specs/047-reservierungsstand-der-d/data-model.md
 */

/**
 * Woraus eine Belegung stammt.
 *
 * Die Quelle liefert deutsche Woerter mit Grossbuchstaben (`Reservierung`,
 * `Sperre`). Sie durchzureichen hiesse, ihre Schreibweise zu unserem Vertrag
 * zu machen — deshalb die Uebersetzung hier.
 */
export type Belegungsart = 'reservierung' | 'sperre';

/**
 * Ein Zeitraum, in dem ein Flugzeug belegt ist.
 *
 * Diese Struktur hat **kein Feld fuer Personen** — nicht ein leeres, sondern
 * gar keins. Die Quelle liefert Pilot, Fluglehrer und Bemerkung mit; FR-006
 * verbietet sie nach aussen. Was es nicht gibt, kann nicht versehentlich
 * durchrutschen.
 */
export interface Reservierung {
	/** Luftfahrzeugkennzeichen, vereinheitlicht auf Grossbuchstaben mit Bindestrich. */
	kennung: string;
	/**
	 * ISO 8601 mit Zeitversatz, z. B. `2026-08-13T17:00:00+02:00`
	 * (Feature 052, research.md E-04).
	 *
	 * Im Zwischenspeicher koennen noch Altbestaende ohne Versatz liegen
	 * (`YYYY-MM-DD HH:MM:SS`, Ortszeit) — Leser MUESSEN beide Formen
	 * verstehen, siehe `belegung.ts`.
	 */
	beginn: string;
	/** Wie `beginn`; liegt stets nach `beginn`. */
	ende: string;
	art: Belegungsart;
}

/** Was im Zwischenspeicher liegt — ein Eintrag fuer den ganzen Verein. */
export interface Abrufstand {
	/** Zeitpunkt des **Abrufs**, nicht des Schreibens. ISO mit Zeitzone. */
	abgerufenAm: string;
	/** Alle Flugzeuge, nicht nur die angezeigten (FR-003). */
	reservierungen: Reservierung[];
	/** Wie viele Eintraege die Pruefregeln nicht bestanden haben. */
	verworfeneEintraege: number;
	/**
	 * Wie oft in diesem Durchgang neu angemeldet werden musste.
	 *
	 * Der Verbrauchszaehler: Steht hier dauerhaft eine Zahl nahe der Zahl der
	 * Durchgaenge, haelt der Zugangsschluessel nicht und das Tageskontingent
	 * des Vereins ist in Gefahr (SC-003).
	 */
	neuanmeldungen: number;
}

/** Was danach kommt: frei oder belegt. */
export type Wechselziel = 'frei' | 'belegt';

/** Die abgeleitete Aussage fuer ein Flugzeug. */
export interface Belegungsauskunft {
	kennung: string;
	/** Zustand **zum uebergebenen Bezugszeitpunkt**. */
	frei: boolean;
	/** Woraus die laufende Belegung stammt; `null`, wenn frei. */
	art: Belegungsart | null;
	/** Wann sich der Zustand aendert; `null`, wenn kein Wechsel absehbar ist. ISO. */
	wechselAm: string | null;
	wechselZu: Wechselziel | null;
	/** Zeitpunkt des zugrunde liegenden Abrufs. ISO. */
	abgerufenAm: string;
	/** Ergebnis der Verfallspruefung. */
	veraltet: boolean;
}

/** Ergebnis des Deutens einer Antwort der Gegenstelle. */
export interface Deutungsergebnis {
	reservierungen: Reservierung[];
	verworfeneEintraege: number;
}

/**
 * Woher die gerade gezeigte Auskunft stammt (Feature 052, data-model.md).
 *
 * Geht ausdruecklich **nicht** in `belegungsauskunft` ein — die Entscheidung
 * frei/belegt bleibt allein eine Frage von Zeitraeumen und Bezugszeitpunkt
 * (FR-022, Verfassungsprinzip IV).
 */
export type Quelle = 'kalender' | 'rueckfall';
