/**
 * Zeitrechnung fuer den Reservierungsstand.
 *
 * Die Gegenstelle liefert Zeiten als `YYYY-MM-DD HH:MM:SS` **ohne jede Angabe
 * zur Zeitzone**. Gemeint ist Ortszeit am Platz. Diese Deutung vorzunehmen ist
 * Aufgabe des Kerns, nicht des Empfaengers (research.md, E-09).
 *
 * Gerechnet wird ausschliesslich ueber `Intl`. Eine eigene Stundenrechnung
 * ("im Sommer eine Stunde dazu") waere genau die Art von Abkuerzung, die zwei
 * Mal im Jahr eine Stunde daneben liegt.
 */

export const ZONE = 'Europe/Berlin';

const MUSTER = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/;

const TEILE = new Intl.DateTimeFormat('en-US', {
	timeZone: ZONE,
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
	hour: '2-digit',
	minute: '2-digit',
	second: '2-digit',
	hourCycle: 'h23'
});

/**
 * Um wie viele Millisekunden die Ortszeit an diesem Zeitpunkt vor UTC liegt.
 *
 * Der Weg fuehrt ueber den Umweg, den Zeitpunkt in der Zone zu formatieren und
 * die Teile wieder als UTC zu lesen: Die Differenz *ist* der Versatz.
 */
function zonenversatz(zeitpunkt: Date): number {
	const teile = new Map<string, number>();
	for (const { type, value } of TEILE.formatToParts(zeitpunkt)) {
		if (type !== 'literal') teile.set(type, Number(value));
	}
	const lies = (name: string) => teile.get(name) ?? 0;
	const alsUtc = Date.UTC(
		lies('year'),
		lies('month') - 1,
		lies('day'),
		lies('hour'),
		lies('minute'),
		lies('second'),
		// Die Millisekunden muessen mit: Ohne sie ist die Differenz um bis zu
		// 999 ms zu klein, und der Versatz kommt als "+01:59.99" statt
		// "+02:00" heraus — eine Zeitangabe, die kein Leser mehr deutet.
		// Aufgefallen ist das erst, als ein Zeitstempel aus `new Date()` (mit
		// Millisekunden) durch diese Funktion lief; Kalenderzeiten stehen
		// stets auf der vollen Sekunde und trafen den Fehler nie.
		zeitpunkt.getUTCMilliseconds()
	);
	return alsUtc - zeitpunkt.getTime();
}

/**
 * Eine Ortszeit der Gegenstelle in einen eindeutigen Zeitpunkt uebersetzen.
 *
 * Wirft, wenn der Text nicht dem erwarteten Muster entspricht — raten waere
 * hier schlimmer als abbrechen.
 *
 * Zwei Sonderfaelle, die es wirklich gibt:
 * - **Rueckstellung im Oktober**: `02:30` kommt zweimal vor. Genommen wird die
 *   erste, also noch die Sommerzeit.
 * - **Vorstellung im Maerz**: `02:30` gibt es nicht. Das Ergebnis rutscht auf
 *   die entsprechende Zeit nach dem Sprung.
 *
 * Beides ist eine Festlegung, keine Richtigkeit — aber eine bewusste.
 */
export function ortszeitZuZeitpunkt(text: string): Date {
	const treffer = MUSTER.exec(text.trim());
	if (!treffer) {
		throw new Error(`Unlesbare Zeitangabe: ${JSON.stringify(text)}`);
	}
	const [, jahr, monat, tag, stunde, minute, sekunde] = treffer;
	const naiv = Date.UTC(
		Number(jahr),
		Number(monat) - 1,
		Number(tag),
		Number(stunde),
		Number(minute),
		Number(sekunde)
	);

	// Die beiden Versaetze, die an diesem Tag ueberhaupt in Frage kommen: der
	// vom Vortag und der vom Folgetag. An gewoehnlichen Tagen sind sie gleich;
	// an einem Umstellungstag umschliessen sie den Sprung. Aus dem naiven
	// Zeitpunkt allein liesse sich die fruehere Lesart nicht gewinnen — er
	// liegt je nach Uhrzeit schon auf der einen oder anderen Seite.
	const TAG = 86_400_000;
	const versaetze = [
		zonenversatz(new Date(naiv - TAG)),
		zonenversatz(new Date(naiv + TAG))
	];

	// Gueltig ist ein Kandidat, wenn er in der Zone wieder genau die Ortszeit
	// ergibt, von der wir ausgegangen sind. In der uebersprungenen Stunde
	// trifft das auf keinen zu.
	const kandidaten = versaetze.map((versatz) => naiv - versatz);
	const gueltige = kandidaten.filter((ts) => ts + zonenversatz(new Date(ts)) === naiv);

	if (gueltige.length === 0) {
		// Uebersprungene Stunde: Es gibt diese Ortszeit nicht. Ueblich ist, um
		// die Sprungdauer nach *vorn* zu ruecken — aus 02:30 wird 03:30. Dazu
		// braucht es den kleineren Versatz (die Winterzeit), denn der ergibt
		// den spaeteren Zeitpunkt.
		return new Date(naiv - Math.min(...versaetze));
	}

	// Doppelt vorhandene Stunde: die fruehere Lesart, also noch Sommerzeit.
	// Das entspricht dem, was Zeitbibliotheken ueblicherweise tun, und ist vor
	// allem *eine* Festlegung statt eines Zufallsergebnisses.
	return new Date(Math.min(...gueltige));
}

/** Ein Zeitpunkt als ISO mit Zeitzone — die Form, in der er nach aussen geht. */
export function alsIso(zeitpunkt: Date): string {
	return zeitpunkt.toISOString();
}

function zweistellig(zahl: number): string {
	return String(zahl).padStart(2, '0');
}

/**
 * Einen Zeitpunkt als ISO 8601 mit dem Zeitversatz der Platzzone ausgeben,
 * z. B. `2026-08-13T17:00:00+02:00` (Feature 052, research.md E-04).
 *
 * Das ist die Gegenrichtung zu `ortszeitZuZeitpunkt` — anders als `alsIso`
 * (Weltzeit mit `Z`) bleibt hier die Ortszeit lesbar erhalten, waehrend der
 * Zeitpunkt exakt bleibt. Veraendert nichts an der Aufloesung der doppelten
 * bzw. uebersprungenen Stunde in `ortszeitZuZeitpunkt` — sie betrifft nur das
 * *Einlesen* einer Ortszeit ohne Versatz, nicht das *Ausgeben* eines bereits
 * bekannten Zeitpunkts.
 */
export function alsIsoMitVersatz(zeitpunkt: Date): string {
	const teile = new Map<string, number>();
	for (const { type, value } of TEILE.formatToParts(zeitpunkt)) {
		if (type !== 'literal') teile.set(type, Number(value));
	}
	const lies = (name: string) => teile.get(name) ?? 0;

	const versatzMinuten = zonenversatz(zeitpunkt) / 60_000;
	const vorzeichen = versatzMinuten >= 0 ? '+' : '-';
	const versatzStunden = Math.floor(Math.abs(versatzMinuten) / 60);
	const versatzRest = Math.abs(versatzMinuten) % 60;

	return (
		`${lies('year')}-${zweistellig(lies('month'))}-${zweistellig(lies('day'))}` +
		`T${zweistellig(lies('hour'))}:${zweistellig(lies('minute'))}:${zweistellig(lies('second'))}` +
		`${vorzeichen}${zweistellig(versatzStunden)}:${zweistellig(versatzRest)}`
	);
}

const WOCHENTAG_DATUM_UHRZEIT = new Intl.DateTimeFormat('de-DE', {
	timeZone: ZONE,
	weekday: 'long',
	day: '2-digit',
	month: '2-digit',
	hour: '2-digit',
	minute: '2-digit'
});

const NUR_UHRZEIT = new Intl.DateTimeFormat('de-DE', {
	timeZone: ZONE,
	hour: '2-digit',
	minute: '2-digit'
});

const NUR_TAG = new Intl.DateTimeFormat('de-DE', {
	timeZone: ZONE,
	year: 'numeric',
	month: '2-digit',
	day: '2-digit'
});

/** `Freitag, 15.08., 15:00 Uhr` — fuer Angaben, die nicht heute liegen. */
export function alsWochentagDatumUhrzeit(zeitpunkt: Date): string {
	return `${WOCHENTAG_DATUM_UHRZEIT.format(zeitpunkt).replace(/,\s*$/, '')} Uhr`;
}

/** `15:00 Uhr` — nur dort verwenden, wo der Tag aus dem Zusammenhang klar ist. */
export function alsUhrzeit(zeitpunkt: Date): string {
	return `${NUR_UHRZEIT.format(zeitpunkt)} Uhr`;
}

/** Liegen zwei Zeitpunkte am selben Tag in Ortszeit? */
export function gleicherTag(a: Date, b: Date): boolean {
	return NUR_TAG.format(a) === NUR_TAG.format(b);
}

/**
 * `13.08.2026` — das Datum in Ziffern, wie ein deutsches Formular es erwartet.
 *
 * Anders als `alsTagesdatum` („Samstag, 15. Aug.") ist das kein Text zum
 * Lesen, sondern ein Wert zum Weiterreichen: Er geht so in die Vorbelegung
 * der Reservierungsmaske (research.md, E-13). Deshalb steht er hier bei den
 * uebrigen Formaten und nicht im Verweisbauer — ein zweites `Intl`-Format an
 * anderer Stelle waere die naechste Gelegenheit, dass zwei Datumsangaben
 * dieser Anwendung auseinanderlaufen.
 */
export function alsDatumZiffern(zeitpunkt: Date): string {
	return NUR_TAG.format(zeitpunkt);
}

/* -------------------------------------------------------------------------
 * Feature 054 — Formate und Tagesrechnung fuer die Flottenuebersicht.
 * ---------------------------------------------------------------------- */

const KURZDATUM_UHRZEIT = new Intl.DateTimeFormat('de-DE', {
	timeZone: ZONE,
	weekday: 'short',
	day: '2-digit',
	month: '2-digit',
	hour: '2-digit',
	minute: '2-digit'
});

const TAGESDATUM = new Intl.DateTimeFormat('de-DE', {
	timeZone: ZONE,
	weekday: 'long',
	day: 'numeric',
	month: 'short'
});

const ORTSTAG = new Intl.DateTimeFormat('en-CA', {
	timeZone: ZONE,
	year: 'numeric',
	month: '2-digit',
	day: '2-digit'
});

const NUR_STUNDE_MINUTE = new Intl.DateTimeFormat('en-GB', {
	timeZone: ZONE,
	hour: '2-digit',
	minute: '2-digit',
	hourCycle: 'h23'
});

/**
 * `15:00` — ohne „Uhr", fuer Balken, Chips und schmale Spalten.
 *
 * Getrennt von `alsUhrzeit`, das „15:00 Uhr" liefert: In einem Fliesstext ist
 * das „Uhr" richtig, in einer Spanne wie `14:00–17:30` waere es doppelt und
 * in 112 Pixeln Spaltenbreite schlicht zu lang.
 */
export function alsUhrzeitKurz(zeitpunkt: Date): string {
	return NUR_STUNDE_MINUTE.format(zeitpunkt);
}

/** `Sa., 15.08., 12:00` — knapp, fuer Listen (FR-015). */
export function alsKurzdatumUhrzeit(zeitpunkt: Date): string {
	return KURZDATUM_UHRZEIT.format(zeitpunkt);
}

/** `Samstag, 15. Aug.` — die Ueberschrift eines Tages in der Wochenliste. */
export function alsTagesdatum(zeitpunkt: Date): string {
	return TAGESDATUM.format(zeitpunkt);
}

const WOCHENTAG_KURZ = new Intl.DateTimeFormat('de-DE', {
	timeZone: ZONE,
	weekday: 'short'
});

const TAG_UND_MONAT = new Intl.DateTimeFormat('de-DE', {
	timeZone: ZONE,
	day: '2-digit',
	month: '2-digit'
});

/**
 * `Sa` — der Wochentag in zwei Buchstaben, fuer Spaltenkoepfe.
 *
 * `Intl` liefert `Sa.` mit Punkt; unter einer 40 Pixel breiten Rasterspalte
 * ist der Punkt ein Zeichen, das keine Information traegt, aber Platz nimmt.
 */
export function alsWochentagKurz(zeitpunkt: Date): string {
	return WOCHENTAG_KURZ.format(zeitpunkt).replace(/\.$/, '');
}

/** `15.08.` — Tag und Monat ohne Jahr, fuer die linke Spalte der Wochenliste. */
export function alsTagUndMonat(zeitpunkt: Date): string {
	return TAG_UND_MONAT.format(zeitpunkt);
}

/**
 * Der Ortstag als `YYYY-MM-DD` — der Schluessel, unter dem Tage verglichen und
 * Sonnenzeiten nachgeschlagen werden.
 *
 * `en-CA` liefert genau diese Reihenfolge; das ist kein Zufallsfund, sondern
 * die uebliche Abkuerzung fuer ein ISO-Datum aus `Intl`. Entscheidend ist die
 * Zone: Ein Telefon in Neuseeland darf nicht einen Tag weiter sein als der
 * Flugplatz (T-11).
 */
export function ortstag(zeitpunkt: Date): string {
	return ORTSTAG.format(zeitpunkt);
}

/**
 * Minuten seit Ortsmitternacht (0 … 1439) — die Eingangsgroesse des
 * Tagesuhr-Rings.
 *
 * An den Umstellungstagen ist der Tag 23 bzw. 25 Stunden lang. Diese Funktion
 * liefert trotzdem die Uhrzeit, die auf der Uhr steht, denn genau die steht
 * auch auf dem Ring. Der Ring bildet Uhrzeiten ab, nicht verstrichene Zeit.
 */
export function minuteDesTages(zeitpunkt: Date): number {
	const teile = NUR_STUNDE_MINUTE.format(zeitpunkt).split(':');
	return Number(teile[0]) * 60 + Number(teile[1]);
}

/**
 * Der Zeitpunkt zu einem Ortstag und einer Minute seit Ortsmitternacht;
 * Bruchteile einer Minute sind erlaubt und werden auf Sekunden gerundet.
 *
 * Bewusst ueber die Ortszeit-Deutung und nicht ueber `new Date(jahr, monat,
 * …)`: Letzteres naehme die Zone des Geraets — und ein Telefon in Spanien
 * zeigte einen anderen Ring und andere Balken (T-11).
 *
 * Minuten jenseits von 1440 sind zugelassen und laufen in den Folgetag: Ein
 * Fensterende „24:00" ist die uebliche Schreibweise fuer Mitternacht und
 * waere als 0:00 desselben Tages das Gegenteil dessen, was gemeint ist.
 */
export function zeitpunktFuerMinute(tag: string, minute: number): Date {
	const gesamtSekunden = Math.round(minute * 60);
	const stunde = Math.trunc(gesamtSekunden / 3600);
	const rest = gesamtSekunden - stunde * 3600;
	const zweistellig = (n: number) => String(n).padStart(2, '0');
	const uhrzeit = `${zweistellig(stunde)}:${zweistellig(Math.trunc(rest / 60))}:${zweistellig(rest % 60)}`;
	return ortszeitZuZeitpunkt(`${tag} ${uhrzeit}`);
}

/**
 * Der Ortstag nach diesem — als `YYYY-MM-DD`.
 *
 * Gerechnet wird ab **Mittag**, nicht ab Mitternacht. An den beiden
 * Umstellungstagen ist der Ortstag 23 bzw. 25 Stunden lang; wer schlicht
 * 24 Stunden auf Mitternacht addiert, landet im Maerz um 01:00 des Folgetags
 * (richtig, aber knapp) und im Oktober um 23:00 **desselben** Tages — der
 * Wochenblick zeigte denselben Tag zweimal und den letzten gar nicht.
 * Von der Tagesmitte aus ist der Abstand zur naechsten Mitternacht in beiden
 * Richtungen so gross, dass eine Stunde nichts verschiebt.
 */
export function naechsterTag(tag: string): string {
	const mittag = zeitpunktFuerMinute(tag, 12 * 60);
	return ortstag(new Date(mittag.getTime() + 24 * 60 * 60 * 1000));
}
