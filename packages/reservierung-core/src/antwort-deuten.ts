import type { Belegungsart, Deutungsergebnis, Reservierung } from './typen.js';
import { alsIsoMitVersatz, ortszeitZuZeitpunkt } from './zeit.js';

/**
 * Die Antwort der Gegenstelle deuten.
 *
 * Zwei Eigenheiten der Quelle bestimmen diese Datei (research.md, E-08 und der
 * Abzug unter tests/beispiele/):
 *
 * 1. Die Antwort ist **objektindiziert** (`{"0": {…}, "1": {…}}`), nicht als
 *    Liste — und traegt dazwischen einen `httpstatuscode`, der keine
 *    Reservierung ist.
 * 2. Nicht jede `ressource` ist ein Flugzeug. Im echten Abzug stehen auch
 *    `Werkstatt` und `GRILL`.
 */

/** Was die Gegenstelle je Eintrag liefert — nur die Felder, die uns angehen. */
interface RoherEintrag {
	ressource?: unknown;
	datefrom?: unknown;
	dateto?: unknown;
	type?: unknown;
}

/**
 * Ein Luftfahrzeugkennzeichen erkennt man am Bindestrich zwischen Staats- und
 * Eintragungszeichen: `D-EELK`, `D-4413`. `Werkstatt` und `GRILL` haben keinen.
 *
 * Die Grenze ist bewusst grob. Sie soll Raumbuchungen aussortieren, nicht die
 * Zulassungsvorschriften nachbilden — und lieber einen ungewoehnlich
 * benannten Eintrag durchlassen, als ein echtes Flugzeug zu verschlucken.
 */
const KENNZEICHEN = /^[A-Z0-9]{1,2}-[A-Z0-9]{1,5}$/;

function alsText(wert: unknown): string {
	return typeof wert === 'string' ? wert.trim() : '';
}

function kennungVereinheitlichen(roh: string): string {
	return roh.toUpperCase().replace(/\s+/g, '');
}

function artDeuten(roh: unknown): Belegungsart {
	// Ein unbekannter Wert gilt als Reservierung: Belegt ist belegt. Die Art
	// bestimmt nur die Wortwahl, nicht die Verfuegbarkeit — im Zweifel lieber
	// unscharf benannt als faelschlich frei.
	return alsText(roh).toLowerCase() === 'sperre' ? 'sperre' : 'reservierung';
}

/**
 * Eine Antwort in Reservierungen ueberfuehren.
 *
 * Wirft, wenn die Antwort als Ganzes unbrauchbar ist. Einzelne unbrauchbare
 * Eintraege werden dagegen nur gezaehlt und uebergangen.
 *
 * Die Unterscheidung ist der Kern dieser Funktion: Ein einzelner kaputter
 * Eintrag darf nicht die Auskunft fuer alle unmoeglich machen; eine
 * unverstaendliche Gesamtantwort dagegen ist kein Grund, den bisherigen Stand
 * wegzuwerfen (FR-004).
 */
export function antwortDeuten(antwort: unknown): Deutungsergebnis {
	if (typeof antwort !== 'object' || antwort === null || Array.isArray(antwort)) {
		throw new Error('Antwort ist kein objektindiziertes Verzeichnis');
	}

	const eintraege = antwort as Record<string, unknown>;

	const status = eintraege.httpstatuscode;
	if (status !== undefined && Number(status) !== 200) {
		throw new Error(`Gegenstelle meldet Fehler: ${String(status)}`);
	}

	const reservierungen: Reservierung[] = [];
	let verworfeneEintraege = 0;

	for (const schluessel of Object.keys(eintraege)) {
		if (!/^\d+$/.test(schluessel)) continue;

		const roh = eintraege[schluessel];
		if (typeof roh !== 'object' || roh === null) {
			verworfeneEintraege += 1;
			continue;
		}

		const gedeutet = eintragDeuten(roh as RoherEintrag);
		if (gedeutet) {
			reservierungen.push(gedeutet);
		} else {
			verworfeneEintraege += 1;
		}
	}

	reservierungen.sort((a, b) => a.beginn.localeCompare(b.beginn));
	return { reservierungen, verworfeneEintraege };
}

function eintragDeuten(roh: RoherEintrag): Reservierung | null {
	const kennung = kennungVereinheitlichen(alsText(roh.ressource));
	if (!KENNZEICHEN.test(kennung)) return null;

	const beginn = alsText(roh.datefrom);
	const ende = alsText(roh.dateto);

	let beginnZeitpunkt: Date;
	let endeZeitpunkt: Date;
	try {
		beginnZeitpunkt = ortszeitZuZeitpunkt(beginn);
		endeZeitpunkt = ortszeitZuZeitpunkt(ende);
	} catch {
		return null;
	}

	if (endeZeitpunkt.getTime() <= beginnZeitpunkt.getTime()) return null;

	// Nur diese vier Felder gehen weiter. Pilot, Fluglehrer, Bemerkung und
	// alle Kennungen der Quelle bleiben hier zurueck — sie haben in
	// `Reservierung` gar kein Feld (FR-006). Die Ortszeit wird bereits hier,
	// beim Deuten, in einen Zeitpunkt mit Versatz uebersetzt (research.md
	// E-04) — `belegung.ts` bekommt damit dieselbe Form wie vom
	// Kalender-Weg.
	return {
		kennung,
		beginn: alsIsoMitVersatz(beginnZeitpunkt),
		ende: alsIsoMitVersatz(endeZeitpunkt),
		art: artDeuten(roh.type)
	};
}
