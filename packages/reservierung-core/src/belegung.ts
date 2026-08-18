import type { Abrufstand, Belegungsart, Belegungsauskunft, Reservierung } from './typen.js';
import { istVeraltet } from './verfall.js';
import { ortszeitZuZeitpunkt } from './zeit.js';

/**
 * Aus einem Abrufstand die Aussage fuer ein Flugzeug ableiten.
 *
 * Der Bezugszeitpunkt wird **uebergeben**, nie hier geholt (research.md,
 * E-09). Sonst liessen sich weder die Zeitumstellung noch die Grenzfaelle
 * pruefen — und genau dort liegen die Fehler.
 */

/**
 * Eine Belegung als reine Zahlen — Millisekunden seit der Epoche.
 *
 * Ab Feature 054 auch von `zustand.ts` und `tagesuhr.ts` benutzt. Sie deuten
 * die Zeitangaben deshalb nicht selbst: Zwei Fassungen von
 * `zeitangabeDeuten` liefen unweigerlich auseinander, und die eine wuerde die
 * Altbestaende ohne Versatz vergessen (Prinzip IV).
 */
export interface Zeitraum {
	von: number;
	bis: number;
	art: Belegungsart;
}

/** Erkennt einen Zeitversatz am Ende, z. B. `+02:00` oder `Z` (Feature 052, E-04). */
const TRAEGT_VERSATZ = /(Z|[+-]\d{2}:\d{2})$/;

/**
 * Eine Zeitangabe aus `Reservierung.beginn`/`.ende` deuten.
 *
 * Traegt sie bereits einen Versatz, gilt sie exakt — das ist die Form, die
 * der Kalender-Weg liefert. Fehlt der Versatz (Altbestand aus Feature 047 im
 * Zwischenspeicher oder noch nicht neu geschriebener Stand), wird wie bisher
 * ueber `ortszeitZuZeitpunkt` gedeutet (research.md E-04, „Vertraeglichkeit
 * mit Altbestaenden").
 */
function zeitangabeDeuten(text: string): Date {
	return TRAEGT_VERSATZ.test(text) ? new Date(text) : ortszeitZuZeitpunkt(text);
}

export function zeitraeumeFuer(reservierungen: Reservierung[], kennung: string): Zeitraum[] {
	const gesucht = kennung.toUpperCase().replace(/\s+/g, '');
	return reservierungen
		.filter((r) => r.kennung === gesucht)
		.map((r) => ({
			von: zeitangabeDeuten(r.beginn).getTime(),
			bis: zeitangabeDeuten(r.ende).getTime(),
			art: r.art
		}))
		.sort((a, b) => a.von - b.von);
}

/**
 * Das Ende der zusammenhaengenden Belegung, die den Zeitpunkt abdeckt.
 *
 * Hier steckt der Fall, um den es wirklich geht: Schliesst eine weitere
 * Belegung lueckenlos oder ueberlappend an, zaehlt deren Ende — und so weiter,
 * bis eine echte Luecke kommt.
 *
 * Ohne diese Regel wuerde die Anzeige "frei ab 15 Uhr" sagen, obwohl um 15 Uhr
 * die naechste Reservierung beginnt. Das waere nicht bloss ungenau, sondern
 * falsch in der Richtung, die schadet: Jemand faehrt zum Platz, weil er
 * glaubt, das Flugzeug werde frei.
 *
 * Reservierung und Sperre bilden dabei gemeinsam eine Kette. Fuer die Frage
 * *ob* belegt ist, zaehlen beide gleich.
 */
export function endeDerKette(nachfolger: Zeitraum[], start: Zeitraum): number {
	let ende = start.bis;
	for (const naechster of nachfolger) {
		// Ein Spalt von wenigen Minuten ist eine echte Luecke. Ihn zu
		// ueberbruecken hiesse zu raten, wie kurz "zu kurz zum Fliegen" ist —
		// das ist eine Entscheidung des Piloten, nicht der App.
		if (naechster.von > ende) break;
		if (naechster.bis > ende) ende = naechster.bis;
	}
	return ende;
}

export function belegungsauskunft(
	stand: Abrufstand,
	kennung: string,
	bezugszeitpunkt: Date
): Belegungsauskunft {
	const jetzt = bezugszeitpunkt.getTime();
	const zeitraeume = zeitraeumeFuer(stand.reservierungen, kennung);

	const grundlage = {
		kennung: kennung.toUpperCase().replace(/\s+/g, ''),
		abgerufenAm: stand.abgerufenAm,
		veraltet: istVeraltet(stand.abgerufenAm, bezugszeitpunkt)
	};

	// Der Beginn zaehlt mit, das Ende nicht mehr: Wer genau zum Ende einer
	// Belegung fragt, bekommt "frei".
	const laufenderIndex = zeitraeume.findIndex((z) => z.von <= jetzt && jetzt < z.bis);
	const laufender = laufenderIndex >= 0 ? zeitraeume[laufenderIndex] : undefined;

	if (laufender) {
		const frei = endeDerKette(zeitraeume.slice(laufenderIndex + 1), laufender);
		return {
			...grundlage,
			frei: false,
			art: laufender.art,
			wechselAm: new Date(frei).toISOString(),
			wechselZu: 'frei'
		};
	}

	const naechster = zeitraeume.find((z) => z.von > jetzt);
	return {
		...grundlage,
		frei: true,
		art: null,
		wechselAm: naechster ? new Date(naechster.von).toISOString() : null,
		wechselZu: naechster ? 'belegt' : null
	};
}

/**
 * Alle Belegungen, die ein Zeitfenster beruehren — **ungekuerzt**.
 *
 * Beruehren heisst: Sie ueberlappen das Fenster, und sei es um eine Minute.
 * Eine Reservierung, die gestern um 22:00 begann und heute um 02:00 endet,
 * gehoert dazu — sonst zeigte die heutige Tagesuhr die frueheste Stunde
 * faelschlich als frei.
 *
 * Und sie werden **nicht** auf das Fenster beschnitten (E-06). Das ist der
 * springende Punkt: Wer eine Belegung auf "heute 00:00" kuerzt, versendet die
 * Behauptung, sie habe dann begonnen. Der Ring darf am Rand abschneiden — die
 * Daten duerfen es nicht, denn aus ihnen entsteht auch der Satz "belegt bis".
 */
export function belegungenImFenster(
	reservierungen: readonly Reservierung[],
	von: Date,
	bis: Date
): Reservierung[] {
	const fensterVon = von.getTime();
	const fensterBis = bis.getTime();
	return reservierungen.filter((r) => {
		const beginn = zeitangabeDeuten(r.beginn).getTime();
		const ende = zeitangabeDeuten(r.ende).getTime();
		return ende > fensterVon && beginn < fensterBis;
	});
}
