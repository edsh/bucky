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

/* -------------------------------------------------------------------------
 * Feature 054 — abgeleitete Groessen fuer die Flottenuebersicht.
 *
 * Alles hier ist **abgeleitet**: aus Kennung, Reservierungen und einem
 * Bezugszeitpunkt. Nichts davon wird gespeichert. Eine Aussage ueber die Zeit
 * haltbar zu machen, hiesse, sie irgendwann falsch auszuliefern (E-09).
 * ---------------------------------------------------------------------- */

/**
 * Motorflugzeug/UL oder Segelflugzeug.
 *
 * Wird **nicht gepflegt, sondern abgeleitet** (E-02): Ein rein ziffriges
 * Eintragungszeichen (`D-9021`) bedeutet Segelflug, alles andere (`D-EELK`,
 * `D-MRXS`) Motor/UL. Am echten Kalenderabzug trifft die Regel sechsmal von
 * sechs.
 *
 * Die Beschriftungen der Oberflaeche ("Weitere Segelflugzeuge") stehen nicht
 * hier — der Kern liefert Namen, keine Ueberschriften.
 */
export type Kategorie = 'motor' | 'segelflug';

/**
 * Ein Flugzeug der Flotte.
 *
 * Bewusst schmal: keine Typbezeichnung, kein Bild, kein Routenpfad. Das sind
 * Fragen der Darstellung und liegen in der Weboberflaeche (E-03). Der Kern
 * kennt eine Kennung und ihre Kategorie, mehr braucht er nicht.
 */
export interface Maschine {
	/** Vereinheitlicht auf Grossbuchstaben mit Bindestrich, z. B. `D-EELK`. */
	kennung: string;
	kategorie: Kategorie;
}

/**
 * Der Zustand einer Maschine in genau vier Werten (FR-002).
 *
 * `bald` ist der Wert, den die Spezifikation "heute noch frei" nennt: gerade
 * frei, aber noch heute belegt. Er ist ein **Wort**-Zustand, kein eigener
 * Farbzustand — die Farbe entsteht stufenlos aus `draengen` (E-05).
 */
export type Statuswert = 'frei' | 'bald' | 'belegt' | 'sperre';

/** Beginn und Ende eines freien Zeitfensters, ISO mit Versatz. */
export interface Zeitfenster {
	von: string;
	bis: string;
}

/**
 * Das Ergebnis von `zustandFuer` — alles, was die Anzeige ueber eine Maschine
 * zu einem Bezugszeitpunkt wissen muss.
 */
export interface Maschinenzustand {
	kennung: string;
	status: Statuswert;
	/** Wann sich der Zustand aendert; `null`, wenn kein Wechsel absehbar ist. ISO mit Versatz. */
	wechselAm: string | null;
	wechselZu: Wechselziel | null;
	/**
	 * Der **uebernaechste** Wechsel — was nach `wechselAm` kommt; `null`,
	 * wenn danach nichts mehr absehbar ist.
	 *
	 * Ohne dieses Feld liessen sich die Zusatzzeilen aus contracts/zustand.md
	 * nicht bilden: "Belegt bis 14:00" beantwortet nicht die Frage dessen,
	 * der um 15 Uhr fliegen moechte — "danach frei bis 18:00" schon. Genau
	 * diese zweite Angabe ist der Mehrwert der Uebersicht gegenueber einem
	 * blossen Blick auf die Uhr.
	 */
	danachAm: string | null;
	/**
	 * 0 … 1 — wie sehr die naechste Belegung draengt (FR-006).
	 *
	 * 0 ausserhalb der letzten Stunde davor, 1 im Moment des Beginns. Ausserhalb
	 * von `status === 'bald'` immer 0.
	 *
	 * Eine Zahl statt einer Farbe, damit die Oberflaeche stufenlos ueberblenden
	 * kann und der Kern trotzdem kein Gestaltungstoken kennt (E-04, E-05).
	 */
	draengen: number;
	/**
	 * Die naechste freie Luecke fuer den Reservierungsvorschlag (FR-011);
	 * `null`, wenn keine sinnvolle Luecke bleibt.
	 */
	naechsteLuecke: Zeitfenster | null;
}

/**
 * Ein Stueck des Tagesuhr-Rings.
 *
 * Der Kern liefert **Namen**, keine Farbwerte: `#1f8f45` ist ein
 * Gestaltungstoken und gehoert in die Oberflaeche (E-04). Wer hier Farben
 * einsetzt, hat den Ring an CSS gebunden und kann ihn nicht mehr pruefen.
 */
export interface Ringsegment {
	/** 0 = oben, im Uhrzeigersinn. */
	vonGrad: number;
	bisGrad: number;
	fuellung: 'frei' | 'nacht' | 'reservierung' | 'sperre';
}

/** Ein Stueck eines Tages- oder Wochenbalkens, als Anteil des Fensters. */
export interface Balkensegment {
	/** 0 … 1, Anteil des dargestellten Fensters. */
	von: number;
	bis: number;
	art: Belegungsart;
	/**
	 * Beginnt dieses Segment genau dort, wo das vorige endet?
	 *
	 * Zwei aneinanderliegende Reservierungen — 10:00–13:00 und 13:00–16:00 —
	 * sind zwei Eintraege und zwei Segmente, aber sie beruehren sich. Ohne
	 * dieses Merkmal saehe der Nutzer einen durchgehenden Balken und damit
	 * eine Belegung, wo zwei sind. Der Zugangsweg zeichnet an dieser Naht
	 * eine Fuge; wo sie fehlt, gibt es nichts zu trennen.
	 */
	stoesstAn: boolean;
}

/**
 * Sonnenauf- und -untergang eines Ortstages.
 *
 * **Immer optional zu behandeln.** Fehlen sie, entfallen die beiden
 * Sonnenmarker und die Hell/Dunkel-Kante faellt auf 21:00/06:00 zurueck
 * (E-08, E-15). Ein ausgefallener Wetterdienst darf nie eine Aussage ueber
 * Verfuegbarkeit beeinflussen.
 */
export interface Sonnenzeiten {
	/** Ortstag als `YYYY-MM-DD`. */
	tag: string;
	/** ISO mit Versatz, z. B. `2026-08-18T06:05:00+02:00`. */
	aufgang: string;
	untergang: string;
}
