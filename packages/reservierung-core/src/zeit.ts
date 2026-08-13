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
		lies('second')
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
