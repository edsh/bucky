import { kalenderDeuten, type Deutungsergebnis } from '@edsh-bucky/reservierung-core';

/**
 * Der Kalender-Abruf für die Weboberfläche (Feature 052).
 *
 * Diese Datei liegt bewusst unter `lib/server/` — SvelteKit weigert sich,
 * so benannte Dateien in das Browserbündel aufzunehmen. Das ist der
 * eigentliche Schutz für `KALENDER_ABO_URL`, nicht bloß Sorgfalt
 * (research.md, E-06).
 *
 * Enthält **keine** Fachlogik. Holen, Warten, kurzlebig vorhalten,
 * weiterreichen an `kalenderDeuten` — mehr nicht. Deuten geschieht im Kern.
 */

/** Nach dieser Zeit gilt der Abruf als gescheitert (research.md, E-07). */
const WARTEZEIT_MS = 2_000;

/** Solange wird ein gelungener Abruf am Rand vorgehalten (research.md, E-08). */
const ABLAGE_MS = 30_000;

interface Zwischenablage {
	bisWann: number;
	ergebnis: Promise<Deutungsergebnis>;
}

/**
 * Modul-globale Ablage. Läuft **ausschließlich** auf diesen Abruf hinaus,
 * niemals auf die Antwort an den Browser (die bleibt `no-store` —
 * contracts/api-reservierung.md, "Abgrenzung zur Ablage aus E-08"). Eine
 * Verwechslung der beiden ist genau der Fehler, der schon einmal
 * passiert ist.
 */
let ablage: Zwischenablage | null = null;

/**
 * Den Reservierungsstand aus dem Kalender-Abo holen und deuten.
 *
 * Wirft, wenn das Geheimnis fehlt, der Abruf scheitert, die Wartezeit
 * überschritten wird, oder die Antwort kein gültiger Kalender ist — all das
 * sind fuer den Aufrufer gleichwertig "kein frischer Stand verfügbar" und
 * fuehren dort zum Rueckfall auf den Zwischenspeicher.
 */
export async function kalenderHolen(kalenderAboUrl: string | undefined): Promise<Deutungsergebnis> {
	if (!kalenderAboUrl) {
		throw new Error('KALENDER_ABO_URL ist nicht gesetzt');
	}

	const jetzt = Date.now();
	if (ablage && ablage.bisWann > jetzt) {
		return ablage.ergebnis;
	}

	const ergebnis = abrufenUndDeuten(kalenderAboUrl);
	ablage = { bisWann: jetzt + ABLAGE_MS, ergebnis };

	try {
		return await ergebnis;
	} catch (fehler) {
		// Ein gescheiterter Abruf wird nicht vorgehalten — der naechste
		// Aufruf soll es erneut versuchen duerfen, nicht 30 s auf denselben
		// Fehlschlag warten.
		ablage = null;
		throw fehler;
	}
}

async function abrufenUndDeuten(kalenderAboUrl: string): Promise<Deutungsergebnis> {
	const abbruch = new AbortController();
	const zeitueberschreitung = setTimeout(() => abbruch.abort(), WARTEZEIT_MS);

	let antwort: Response;
	try {
		antwort = await fetch(kalenderAboUrl, { signal: abbruch.signal });
	} catch {
		// Die Adresse darf in keiner Fehlermeldung erscheinen (FR-002) —
		// deshalb hier absichtlich keine Fehlerursache aus `fetch`
		// durchreichen, die die Adresse enthalten könnte.
		throw new Error('Abruf des Kalenders fehlgeschlagen');
	} finally {
		clearTimeout(zeitueberschreitung);
	}

	if (!antwort.ok) {
		throw new Error(`Gegenstelle meldet Status ${antwort.status}`);
	}

	const text = await antwort.text();
	return kalenderDeuten(text);
}
