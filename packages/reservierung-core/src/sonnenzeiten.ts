import { alsIsoMitVersatz, ortszeitZuZeitpunkt } from './zeit.js';
import type { Sonnenzeiten } from './typen.js';

/**
 * Die Antwort des Wetterdienstes deuten — netzfrei und rein (E-08).
 *
 * Der Abruf selbst steht im Abruf-Worker; hier wird nur gelesen, was er
 * mitgebracht hat. Die Trennung ist dieselbe wie bei den Reservierungen
 * (`antwort-deuten.ts`): Was gedeutet wird, laesst sich pruefen, ohne einen
 * fremden Dienst zu befragen — und der Kern bleibt frei von `fetch`
 * (Constitution, Prinzip IV).
 *
 * ## Die Zeitform
 *
 * Open-Meteo liefert bei `timezone=Europe/Berlin` die Ortszeit **ohne**
 * Versatz: `2026-08-19T06:05`. Genau diese Form kennt `ortszeitZuZeitpunkt`
 * seit Feature 052, und `alsIsoMitVersatz` bringt sie in dieselbe Gestalt, in
 * der auch jede Reservierung abgelegt ist. Damit gibt es im ganzen System
 * eine Zeitform, und die Zeitumstellung wird an der einen Stelle behandelt,
 * die dafuer geprueft ist — nicht ein zweites Mal hier.
 */

/** Was ein einzelner Tag in der Antwort mitbringt. */
interface Rohtag {
	tag: string;
	aufgang: string;
	untergang: string;
}

/**
 * Die Tagesliste aus der Antwort holen — oder mit einer klaren Meldung
 * abbrechen.
 *
 * Abgebrochen wird nur, wenn die Antwort **als Ganzes** unbrauchbar ist. Ein
 * einzelner unlesbarer Tag ist etwas anderes: Er wird uebergangen, damit ein
 * Ausrutscher am 3. Tag nicht die uebrigen sieben mitnimmt.
 */
export function sonnenzeitenDeuten(antwort: unknown): Sonnenzeiten[] {
	const roh = tageLesen(antwort);

	const ergebnis: Sonnenzeiten[] = [];
	for (const eintrag of roh) {
		const gedeutet = tagDeuten(eintrag);
		if (gedeutet) ergebnis.push(gedeutet);
	}

	return ergebnis;
}

function tageLesen(antwort: unknown): Rohtag[] {
	if (typeof antwort !== 'object' || antwort === null) {
		throw new Error('Unbrauchbare Antwort des Wetterdienstes: kein Objekt');
	}

	const daily = (antwort as { daily?: unknown }).daily;
	if (typeof daily !== 'object' || daily === null) {
		throw new Error('Unbrauchbare Antwort des Wetterdienstes: kein Feld "daily"');
	}

	const { time, sunrise, sunset } = daily as {
		time?: unknown;
		sunrise?: unknown;
		sunset?: unknown;
	};

	if (!Array.isArray(time) || !Array.isArray(sunrise) || !Array.isArray(sunset)) {
		throw new Error('Unbrauchbare Antwort des Wetterdienstes: "daily" ohne Listen');
	}

	// Ungleich lange Listen sind kein Grund zum Abbruch, aber ein Grund, nur
	// so weit zu gehen, wie alle drei reichen: Ein Aufgang ohne den zugehoerigen
	// Untergang waere eine halbe Aussage, und die ist schlimmer als keine.
	const laenge = Math.min(time.length, sunrise.length, sunset.length);

	const roh: Rohtag[] = [];
	for (let i = 0; i < laenge; i++) {
		roh.push({
			tag: String(time[i]),
			aufgang: String(sunrise[i]),
			untergang: String(sunset[i])
		});
	}
	return roh;
}

/** Muster der gelieferten Ortszeit: `2026-08-19T06:05` (Sekunden optional). */
const ZEITMUSTER = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(:\d{2})?$/;

function tagDeuten(eintrag: Rohtag): Sonnenzeiten | null {
	const aufgang = ZEITMUSTER.exec(eintrag.aufgang);
	const untergang = ZEITMUSTER.exec(eintrag.untergang);
	if (!aufgang || !untergang) return null;
	if (!/^\d{4}-\d{2}-\d{2}$/.test(eintrag.tag)) return null;

	// Der Tag stammt aus `daily.time`, nicht aus dem Datumsteil der Uhrzeit.
	// Beides ist bei diesem Dienst gleich; sollte es das einmal nicht sein,
	// gilt der Tag, unter dem der Dienst den Eintrag fuehrt.
	return {
		tag: eintrag.tag,
		aufgang: alsIsoMitVersatz(ortszeitZuZeitpunkt(alsVollzeit(aufgang))),
		untergang: alsIsoMitVersatz(ortszeitZuZeitpunkt(alsVollzeit(untergang)))
	};
}

/** `2026-08-19T06:05` → `2026-08-19 06:05:00`, wie es der Kernweg erwartet. */
function alsVollzeit(treffer: RegExpExecArray): string {
	return `${treffer[1]} ${treffer[2]}${treffer[3] ?? ':00'}`;
}

/**
 * Die Sonnenzeiten eines bestimmten Ortstages heraussuchen.
 *
 * Gibt `null` zurueck, wenn der Tag nicht dabei ist — und das ist der
 * Normalfall am Rand: Der abgelegte Satz deckt acht Tage ab, der neunte
 * gehoert nicht dazu. Ein Ring ohne Sonnenmarker ist vollstaendig richtig,
 * nur aermer (E-08); geraten wird hier nichts.
 */
export function sonnenzeitenFuerTag(
	saetze: readonly Sonnenzeiten[] | null | undefined,
	tag: string
): Sonnenzeiten | null {
	if (!saetze) return null;
	return saetze.find((s) => s.tag === tag) ?? null;
}

/**
 * Deckt der abgelegte Satz die kommenden `tage` Tage ab?
 *
 * Das ist die Frage, an der der Abruf-Worker entscheidet, ob er den
 * Wetterdienst ueberhaupt behelligt (Prinzip V). Sie wird bewusst hier
 * beantwortet und nicht dort: Es ist eine Aussage ueber die Daten, keine
 * ueber das Netz — und so laesst sie sich pruefen.
 */
export function deckenAb(
	saetze: readonly Sonnenzeiten[] | null | undefined,
	abTag: string,
	tage: number
): boolean {
	if (!saetze || saetze.length === 0) return false;

	const vorhanden = new Set(saetze.map((s) => s.tag));
	for (const tag of tageAb(abTag, tage)) {
		if (!vorhanden.has(tag)) return false;
	}
	return true;
}

/**
 * `tage` aufeinanderfolgende Ortstage ab `abTag`.
 *
 * Gerechnet wird auf dem **Kalender** (UTC-Mitternacht als reine Zaehlhilfe),
 * nicht in 24-Stunden-Schritten. An den Umstellungstagen zaehlte Letzteres
 * einen Tag doppelt oder liesse einen aus.
 */
function tageAb(abTag: string, tage: number): string[] {
	const [jahr, monat, tag] = abTag.split('-').map(Number);
	const liste: string[] = [];

	for (let i = 0; i < tage; i++) {
		const d = new Date(Date.UTC(jahr!, monat! - 1, tag! + i));
		liste.push(
			`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
		);
	}
	return liste;
}
