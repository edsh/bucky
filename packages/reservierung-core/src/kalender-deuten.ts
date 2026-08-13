import type { Belegungsart, Deutungsergebnis, Reservierung } from './typen.js';
import { istLuftfahrzeug, kennungVereinheitlichen } from './kennzeichen.js';
import { alsIsoMitVersatz, ortszeitZuZeitpunkt } from './zeit.js';

/**
 * Das Kalender-Abo deuten (Feature 052).
 *
 * Siehe contracts/kalender-deuten.md für den vollständigen Vertrag. Der
 * wichtigste Punkt steht dort zuerst: Eine Eingabe, die **kein** Kalender
 * ist, MUSS werfen — sonst erschiene bei jedem Ausfall der Gegenstelle jedes
 * Flugzeug fälschlich als frei (FR-007).
 */

/** Beginn eines gültigen Kalenders — fehlt er, ist die Eingabe kein Kalender. */
const KALENDER_KENNUNG = 'BEGIN:VCALENDAR';

const BESCHRIFTUNG = /^(Reservierung|Grounding)\s+(\S+)\s*-/i;

/**
 * Zeilen zusammenfügen, die nach RFC 5545 umbrochen wurden (Fortsetzung
 * beginnt mit Leerzeichen oder Tabulator), und Zeilenenden vereinheitlichen.
 *
 * Die Gegenstelle löst diesen Umbruch derzeit nicht aus (research.md E-05) —
 * behandelt wird er trotzdem, denn ein stiller Bruch hier würde eine Kennung
 * lautlos verstümmeln und das Flugzeug als frei erscheinen lassen.
 */
function zeilenZusammenfuegen(text: string): string[] {
	const rohzeilen = text.replace(/\r\n/g, '\n').split('\n');
	const zeilen: string[] = [];
	for (const zeile of rohzeilen) {
		if ((zeile.startsWith(' ') || zeile.startsWith('\t')) && zeilen.length > 0) {
			zeilen[zeilen.length - 1] += zeile.slice(1);
		} else {
			zeilen.push(zeile);
		}
	}
	return zeilen;
}

/** Maskierte Sonderzeichen auflösen: `\,` `\;` `\\` `\n`/`\N`. */
function entmaskieren(text: string): string {
	return text
		.replace(/\\n/gi, '\n')
		.replace(/\\,/g, ',')
		.replace(/\\;/g, ';')
		.replace(/\\\\/g, '\\');
}

/** Eine Kalenderzeile in Feldname, Parameter und Wert zerlegen. */
function zeileZerlegen(zeile: string): { name: string; parameter: string; wert: string } | null {
	const doppelpunkt = zeile.indexOf(':');
	if (doppelpunkt < 0) return null;
	const kopf = zeile.slice(0, doppelpunkt);
	const wert = zeile.slice(doppelpunkt + 1);
	const [name, ...parameter] = kopf.split(';');
	return { name: (name ?? '').toUpperCase(), parameter: parameter.join(';'), wert };
}

/**
 * Eine `DTSTART`/`DTEND`-Zeile in einen Zeitpunkt übersetzen.
 *
 * Wirft, wenn die Zeitzone nicht die Platzzone ist — dieser Fall wird
 * verworfen und gezählt, nicht geraten (contracts/kalender-deuten.md).
 */
function zeitangabeDeuten(parameter: string, wert: string): Date {
	if (/(^|;)VALUE=DATE(;|$)/i.test(parameter)) {
		// Ganztägiger Termin: als Ortstag 00:00 behandeln, nicht als
		// Weltzeit-Mitternacht (research.md E-05, Fall 3).
		const treffer = /^(\d{4})(\d{2})(\d{2})$/.exec(wert.trim());
		if (!treffer) throw new Error(`Unlesbares Datum: ${JSON.stringify(wert)}`);
		const [, jahr, monat, tag] = treffer;
		return ortszeitZuZeitpunkt(`${jahr}-${monat}-${tag} 00:00:00`);
	}

	const tzidTreffer = /(?:^|;)TZID=([^;]+)/i.exec(parameter);
	if (tzidTreffer && tzidTreffer[1] !== 'Europe/Berlin') {
		throw new Error(`Fremde Zeitzone wird nicht unterstützt: ${tzidTreffer[1]}`);
	}

	if (wert.trim().endsWith('Z')) {
		// Weltzeit — exakt übernehmen.
		const treffer = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(wert.trim());
		if (!treffer) throw new Error(`Unlesbare Weltzeit: ${JSON.stringify(wert)}`);
		const [, jahr, monat, tag, stunde, minute, sekunde] = treffer;
		return new Date(
			Date.UTC(
				Number(jahr),
				Number(monat) - 1,
				Number(tag),
				Number(stunde),
				Number(minute),
				Number(sekunde)
			)
		);
	}

	// Ortszeit ohne Kennzeichnung oder mit ausdrücklicher Platzzone.
	const treffer = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/.exec(wert.trim());
	if (!treffer) throw new Error(`Unlesbare Ortszeit: ${JSON.stringify(wert)}`);
	const [, jahr, monat, tag, stunde, minute, sekunde] = treffer;
	return ortszeitZuZeitpunkt(`${jahr}-${monat}-${tag} ${stunde}:${minute}:${sekunde}`);
}

/** `Reservierung D-EELK - (…)` → Art + Kennung; `null`, wenn kein Flugzeug. */
function beschriftungDeuten(beschriftung: string): { art: Belegungsart; kennung: string } | null {
	const treffer = BESCHRIFTUNG.exec(entmaskieren(beschriftung).trim());
	if (!treffer) return null;
	const [, artWort, kennungRoh] = treffer;
	const kennung = kennungVereinheitlichen(kennungRoh ?? '');
	if (!istLuftfahrzeug(kennung)) return null;
	// Unbekanntes erstes Wort gilt als Reservierung — kommt hier nicht vor,
	// da BESCHRIFTUNG nur die beiden bekannten Woerter erkennt, aber
	// dieselbe Festlegung wie in antwort-deuten.ts (Belegt ist belegt).
	const art: Belegungsart = (artWort ?? '').toLowerCase() === 'grounding' ? 'sperre' : 'reservierung';
	return { art, kennung };
}

/**
 * Das Kalender-Abo deuten.
 *
 * Wirft, wenn die Eingabe als Ganzes kein Kalender ist. Einzelne
 * fehlerhafte `VEVENT`-Blöcke werden dagegen nur gezählt und übergangen
 * (FR-012).
 */
export function kalenderDeuten(roh: string): Deutungsergebnis {
	if (!roh.trimStart().startsWith(KALENDER_KENNUNG)) {
		throw new Error('Eingabe ist kein Kalender (BEGIN:VCALENDAR fehlt)');
	}

	const zeilen = zeilenZusammenfuegen(roh);
	const reservierungen: Reservierung[] = [];
	let verworfeneEintraege = 0;

	let inEvent = false;
	let summary: string | null = null;
	let dtstart: { parameter: string; wert: string } | null = null;
	let dtend: { parameter: string; wert: string } | null = null;

	const eventAbschliessen = () => {
		if (!inEvent) return;
		inEvent = false;

		if (summary === null || dtstart === null || dtend === null) {
			verworfeneEintraege += 1;
			return;
		}

		const gedeutet = beschriftungDeuten(summary);
		if (!gedeutet) {
			verworfeneEintraege += 1;
			return;
		}

		let beginnZeitpunkt: Date;
		let endeZeitpunkt: Date;
		try {
			beginnZeitpunkt = zeitangabeDeuten(dtstart.parameter, dtstart.wert);
			endeZeitpunkt = zeitangabeDeuten(dtend.parameter, dtend.wert);
		} catch {
			verworfeneEintraege += 1;
			return;
		}

		if (endeZeitpunkt.getTime() <= beginnZeitpunkt.getTime()) {
			verworfeneEintraege += 1;
			return;
		}

		reservierungen.push({
			kennung: gedeutet.kennung,
			beginn: alsIsoMitVersatz(beginnZeitpunkt),
			ende: alsIsoMitVersatz(endeZeitpunkt),
			art: gedeutet.art
		});
	};

	for (const zeile of zeilen) {
		if (zeile === 'BEGIN:VEVENT') {
			inEvent = true;
			summary = null;
			dtstart = null;
			dtend = null;
			continue;
		}
		if (zeile === 'END:VEVENT') {
			eventAbschliessen();
			continue;
		}
		if (!inEvent) continue;

		const zerlegt = zeileZerlegen(zeile);
		if (!zerlegt) continue;

		if (zerlegt.name === 'SUMMARY') summary = zerlegt.wert;
		else if (zerlegt.name === 'DTSTART') dtstart = { parameter: zerlegt.parameter, wert: zerlegt.wert };
		else if (zerlegt.name === 'DTEND') dtend = { parameter: zerlegt.parameter, wert: zerlegt.wert };
	}

	reservierungen.sort((a, b) => a.beginn.localeCompare(b.beginn));
	return { reservierungen, verworfeneEintraege };
}
