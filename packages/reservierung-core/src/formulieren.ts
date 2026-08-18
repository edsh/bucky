import type { Belegungsauskunft, Maschinenzustand, Quelle } from './typen.js';
import { alterInWorten } from './verfall.js';
import {
	alsKurzdatumUhrzeit,
	alsTagesdatum,
	alsUhrzeit,
	alsWochentagDatumUhrzeit,
	gleicherTag,
	ZONE
} from './zeit.js';

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

/* -------------------------------------------------------------------------
 * Feature 054 — Saetze fuer die Flottenuebersicht.
 *
 * Die drei Funktionen oben bleiben unveraendert: `/api/reservierung` und die
 * D-EELK-Seite benutzen sie weiter, und ihr Vertrag stammt aus Feature 052.
 * ---------------------------------------------------------------------- */

/**
 * Eine Dauer in Stunden mit Dezimalkomma — `3,5 h`, `2 h`, `24 h`.
 *
 * Ganze Stunden ohne Nachkommastelle, halbe mit. Ein ganzer Tag heisst
 * `24 h` und nicht `1 d`: Auf einem Tagesbalken ist "24 h" die Aussage, die
 * man vergleichen kann.
 */
export function alsDauer(vonIso: string, bisIso: string): string {
	const stunden = (new Date(bisIso).getTime() - new Date(vonIso).getTime()) / 3_600_000;
	const gerundet = Math.round(stunden * 10) / 10;
	return `${String(gerundet).replace('.', ',')} h`;
}

/**
 * Der Statussatz einer Maschine (contracts/zustand.md).
 *
 * **Sperren nennen ein Datum, keine Uhrzeit** (FR-014). Eine Werkstattsperre
 * "bis Freitag, 16:00" verspricht eine Genauigkeit, die eine Wartung nicht
 * hat — und der Pilot plant dann auf die Minute, die niemand zugesagt hat.
 */
export function alsStatussatz(zustand: Maschinenzustand, bezugszeitpunkt: Date): string {
	if (zustand.status === 'sperre') {
		return zustand.wechselAm
			? `Gesperrt bis ${alsTagesdatum(new Date(zustand.wechselAm))}`
			: 'Gesperrt';
	}

	if (zustand.status === 'belegt') {
		return zustand.wechselAm
			? `Belegt bis ${zeitangabe054(zustand.wechselAm, bezugszeitpunkt)}`
			: 'Belegt';
	}

	if (zustand.status === 'bald') {
		return zustand.wechselAm
			? `Frei bis ${zeitangabe054(zustand.wechselAm, bezugszeitpunkt)}`
			: 'Frei';
	}

	return zustand.wechselAm ? 'Frei' : 'Frei den ganzen Tag';
}

/**
 * Die zweite Zeile unter dem Statussatz — was *danach* kommt.
 *
 * Sie ist der eigentliche Mehrwert der Uebersicht: "Belegt bis 14:00" allein
 * beantwortet nicht die Frage, die jemand hat, der um 15 Uhr fliegen moechte.
 * `null`, wenn es nichts zu sagen gibt.
 */
export function alsZusatzzeile(zustand: Maschinenzustand, bezugszeitpunkt: Date): string | null {
	if (zustand.status === 'sperre') {
		return zustand.wechselAm ? `bis ${alsTagesdatum(new Date(zustand.wechselAm))}` : null;
	}

	if (zustand.status === 'belegt') {
		if (!zustand.wechselAm) return null;
		// Der eigentliche Mehrwert der Uebersicht: "Belegt bis 14:00"
		// beantwortet nicht die Frage dessen, der um 15 Uhr fliegen moechte.
		return zustand.danachAm
			? `danach frei bis ${zeitangabe054(zustand.danachAm, bezugszeitpunkt)}`
			: 'danach den ganzen Tag frei';
	}

	if (zustand.status === 'bald' && zustand.danachAm) {
		return `danach bis ${zeitangabe054(zustand.danachAm, bezugszeitpunkt)} belegt`;
	}

	if (zustand.status === 'frei' && zustand.wechselAm) {
		// Der Abendfall. „Frei" allein ist um 22 Uhr eine seltsame Auskunft:
		// Frei ist die Maschine da immer, die Frage ist, ab wann sie es
		// nicht mehr ist. Bei `frei` liegt die naechste Reservierung
		// ausdruecklich **nicht** heute (Z-04) — der Tag gehoert deshalb
		// dazu, sonst waere „14:30" das heutige.
		return `nächste Reservierung ${zeitangabe054(zustand.wechselAm, bezugszeitpunkt)}`;
	}

	return null;
}

/**
 * Wie `zeitangabe`, aber mit den knappen Formaten aus FR-015: heute nur die
 * Uhrzeit, spaeter `Sa., 15.08., 12:00`.
 *
 * Getrennt von `zeitangabe`, weil die alte Form (`Freitag, 15.08., 15:00
 * Uhr`) fuer eine Kachel von 118 Pixeln zu lang ist — und weil der Vertrag
 * von Feature 052 sie unveraendert braucht.
 */
function zeitangabe054(iso: string, bezugszeitpunkt: Date): string {
	const zeitpunkt = new Date(iso);
	return gleicherTag(zeitpunkt, bezugszeitpunkt)
		? NUR_UHRZEIT_KURZ.format(zeitpunkt)
		: alsKurzdatumUhrzeit(zeitpunkt);
}

const NUR_UHRZEIT_KURZ = new Intl.DateTimeFormat('de-DE', {
	timeZone: ZONE,
	hour: '2-digit',
	minute: '2-digit'
});
