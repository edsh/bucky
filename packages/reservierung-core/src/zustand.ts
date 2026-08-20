import { endeDerKette, zeitraeumeFuer, type Zeitraum } from './belegung.js';
import type { Maschinenzustand, Reservierung, Statuswert, Zeitfenster } from './typen.js';
import { alsIsoMitVersatz, ortstag } from './zeit.js';

/**
 * Der Zustand einer Maschine zu einem Bezugszeitpunkt.
 *
 * Grundlage: specs/054-…/contracts/zustand.md, dort Z-01 bis Z-11.
 *
 * Dieses Modul ersetzt `belegung.ts` **nicht**. Die Frage "laeuft gerade
 * etwas, und wann endet die lueckenlos anschliessende Kette?" beantwortet
 * weiterhin `endeDerKette` — die einzige Stelle im Haus, die das tut. Sie
 * hier nachzubauen hiesse, zwei Auslegungen von "lueckenlos" zu haben, und
 * die zweite waere irgendwann die falsche (FR-003, Prinzip IV).
 *
 * Was dieses Modul **nicht** kennt: Farben, Saetze, Personen (Z-10).
 */

const STUNDE_MS = 3_600_000;
const HALBE_STUNDE_MS = 1_800_000;
const VORSCHLAGSDAUER_MS = 2 * STUNDE_MS;
const SUCHFENSTER_MS = 7 * 86_400_000;

/** Der Block, der den Zeitpunkt abdeckt — samt Ende seiner Kette. */
function laufenderBlock(
	zeitraeume: Zeitraum[],
	jetzt: number
): { ende: number; teile: Zeitraum[] } | null {
	// Der Beginn zaehlt mit, das Ende nicht mehr (Z-01) — dieselbe Grenze wie
	// in belegung.ts, damit beide Wege dieselbe Antwort geben.
	const index = zeitraeume.findIndex((z) => z.von <= jetzt && jetzt < z.bis);
	if (index < 0) return null;

	const start = zeitraeume[index];
	if (!start) return null;

	const ende = endeDerKette(zeitraeume.slice(index + 1), start);

	// Alle Zeitraeume, die in diesen Block hineinreichen — noetig fuer Z-03:
	// Ob eine Sperre laeuft, entscheidet sich nicht am ersten Eintrag der
	// Kette, sondern daran, ob *jetzt* eine Sperre deckt.
	const teile = zeitraeume.filter((z) => z.von <= jetzt && jetzt < z.bis);
	return { ende, teile };
}

/**
 * Die naechste freie Luecke ab dem Ende des laufenden Blocks (Z-07, Z-08).
 *
 * Aufgerundet auf die naechste volle halbe Stunde, zwei Stunden lang, gekappt
 * am Beginn der folgenden Belegung. Bleibt weniger als eine halbe Stunde,
 * gibt es keinen Vorschlag — ein Fenster, in das kein Flug passt,
 * vorzuschlagen waere schlimmer als keiner.
 */
function naechsteLueckeAb(zeitraeume: Zeitraum[], ab: number, jetzt: number): Zeitfenster | null {
	// Das Suchfenster laeuft ab **jetzt**, nicht ab dem Blockende (Z-08).
	// Sonst schoebe eine Monatssperre das Fenster um einen Monat weiter und
	// die Anzeige schluege einen Termin im September vor.
	const grenze = jetzt + SUCHFENSTER_MS;
	let von = Math.ceil(ab / HALBE_STUNDE_MS) * HALBE_STUNDE_MS;

	while (von < grenze) {
		const stoerer = zeitraeume.find((z) => z.von <= von && von < z.bis);
		if (stoerer) {
			// Mitten in einer Belegung: hinter deren Kette weitersuchen.
			const index = zeitraeume.indexOf(stoerer);
			const ende = endeDerKette(zeitraeume.slice(index + 1), stoerer);
			von = Math.ceil(ende / HALBE_STUNDE_MS) * HALBE_STUNDE_MS;
			continue;
		}

		const naechste = zeitraeume.find((z) => z.von > von);
		const bis = Math.min(von + VORSCHLAGSDAUER_MS, naechste?.von ?? Infinity);

		if (bis - von >= HALBE_STUNDE_MS) {
			return { von: alsIsoMitVersatz(new Date(von)), bis: alsIsoMitVersatz(new Date(bis)) };
		}

		// Zu kurz — hinter der stoerenden Belegung weitersuchen.
		von = Math.ceil((naechste?.bis ?? von + HALBE_STUNDE_MS) / HALBE_STUNDE_MS) * HALBE_STUNDE_MS;
	}

	return null;
}

export function zustandFuer(
	reservierungen: readonly Reservierung[],
	kennung: string,
	bezugszeitpunkt: Date
): Maschinenzustand {
	const jetzt = bezugszeitpunkt.getTime();
	const zeitraeume = zeitraeumeFuer([...reservierungen], kennung);
	const vereinheitlicht = kennung.toUpperCase().replace(/\s+/g, '');

	const block = laufenderBlock(zeitraeume, jetzt);

	if (block) {
		// Z-03: Laeuft beides, gewinnt die Sperre. Fuer den Piloten ist
		// "gesperrt" die weiter reichende Nachricht — das Flugzeug ist
		// womoeglich zerlegt, nicht bloss gebucht.
		const status: Statuswert = block.teile.some((z) => z.art === 'sperre') ? 'sperre' : 'belegt';
		// Was nach dem Block kommt: der Beginn der naechsten Belegung, oder
		// nichts mehr. Daraus wird "danach frei bis 18:00" bzw. "danach den
		// ganzen Tag frei".
		const danach = zeitraeume.find((z) => z.von >= block.ende);
		return {
			kennung: vereinheitlicht,
			status,
			wechselAm: alsIsoMitVersatz(new Date(block.ende)),
			wechselZu: 'frei',
			danachAm: danach ? alsIsoMitVersatz(new Date(danach.von)) : null,
			draengen: 0,
			naechsteLuecke: naechsteLueckeAb(zeitraeume, block.ende, jetzt)
		};
	}

	const naechste = zeitraeume.find((z) => z.von > jetzt);

	if (!naechste) {
		// Z-11: Nichts mehr in Sicht. Das ist ausdruecklich **nicht**
		// dasselbe wie "kein Stand vorhanden" — diesen Fall trifft die
		// Route, nicht der Kern (FR-022).
		return {
			kennung: vereinheitlicht,
			status: 'frei',
			wechselAm: null,
			wechselZu: null,
			danachAm: null,
			draengen: 0,
			naechsteLuecke: naechsteLueckeAb(zeitraeume, jetzt, jetzt)
		};
	}

	// Z-04: "heute noch frei" gilt nur am selben Ortstag. Eine Belegung
	// morgen frueh macht heute Abend nicht "bald" — sonst staende die halbe
	// Flotte jeden Abend auf Gelb.
	const heute = ortstag(bezugszeitpunkt) === ortstag(new Date(naechste.von));

	// Das Ende der Kette, die mit `naechste` beginnt — daraus wird "danach
	// bis 18:00 belegt". Wieder ueber endeDerKette, nicht nachgebaut.
	const indexNaechste = zeitraeume.indexOf(naechste);
	const endeDerNaechsten = endeDerKette(zeitraeume.slice(indexNaechste + 1), naechste);

	return {
		kennung: vereinheitlicht,
		status: heute ? 'bald' : 'frei',
		wechselAm: alsIsoMitVersatz(new Date(naechste.von)),
		wechselZu: 'belegt',
		danachAm: alsIsoMitVersatz(new Date(endeDerNaechsten)),
		// Z-05: stufenlos in der letzten Stunde davor, ausserhalb exakt 0.
		draengen: heute ? Math.min(1, Math.max(0, 1 - (naechste.von - jetzt) / STUNDE_MS)) : 0,
		naechsteLuecke: naechsteLueckeAb(zeitraeume, jetzt, jetzt)
	};
}
