import type { Belegungsauskunft, Quelle } from './typen.js';
import { alterInWorten } from './verfall.js';
import { alsUhrzeit, alsWochentagDatumUhrzeit, gleicherTag } from './zeit.js';

/**
 * Aus der Auskunft den Satz machen, den ein Mensch liest.
 *
 * Die Wortwahl ist hier keine Kosmetik. "Belegt bis Montag" und "Gesperrt bis
 * Montag" sind fuer den Piloten verschiedene Nachrichten: Das eine heisst,
 * jemand fliegt damit, das andere, es steht womoeglich zerlegt in der
 * Werkstatt (FR-007a).
 */

/** Wochentag und Datum nur nennen, wenn der Zeitpunkt nicht heute liegt. */
function zeitangabe(iso: string, bezugszeitpunkt: Date): string {
	const zeitpunkt = new Date(iso);
	return gleicherTag(zeitpunkt, bezugszeitpunkt)
		? alsUhrzeit(zeitpunkt)
		: alsWochentagDatumUhrzeit(zeitpunkt);
}

/**
 * Der Satz zum Zustand.
 *
 * Der naechste Wechsel wird **immer** mitgenannt, nie nur der Zustand allein:
 * "Frei" ist buchstaeblich richtig, auch wenn in zehn Minuten jemand kommt —
 * und trotzdem irrefuehrend.
 */
export function alsSatz(auskunft: Belegungsauskunft, bezugszeitpunkt: Date): string {
	if (!auskunft.frei) {
		const wort = auskunft.art === 'sperre' ? 'Gesperrt' : 'Belegt';
		return auskunft.wechselAm
			? `${wort} bis ${zeitangabe(auskunft.wechselAm, bezugszeitpunkt)}`
			: wort;
	}

	return auskunft.wechselAm
		? `Frei — nächste Belegung ab ${zeitangabe(auskunft.wechselAm, bezugszeitpunkt)}`
		: 'Frei — keine Belegung in Sicht';
}

/** Der Zusatz zum Alter der Auskunft (FR-009). */
export function alsAltersangabe(auskunft: Belegungsauskunft, bezugszeitpunkt: Date): string {
	const alter = alterInWorten(auskunft.abgerufenAm, bezugszeitpunkt);
	return auskunft.veraltet
		? `Stand ${alter} — möglicherweise veraltet`
		: `Stand ${alter}`;
}

/**
 * Zurückhaltender Hinweis, wenn die Aussage auf dem Rückfall beruht statt auf
 * einem unmittelbaren Abruf (FR-019, Feature 052).
 *
 * Nennt **keine Ursache**, **keine Technik**, **keine Schuldzuweisung** —
 * absichtlich. Das Mitglied soll die Aussage richtig einordnen, nicht die
 * Ursache erfahren. `null`, wenn kein Hinweis nötig ist.
 *
 * Nimmt `quelle` bewusst als eigenen Parameter statt als Feld von
 * `Belegungsauskunft` entgegen — die Herkunft geht nicht in die Berechnung
 * ein (data-model.md, "Wozu das Feld nicht dient").
 */
export function alsRueckfallHinweis(quelle: Quelle): string | null {
	return quelle === 'rueckfall' ? 'Letzter bekannter Stand' : null;
}
