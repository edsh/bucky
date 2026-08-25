import { FENSTER_FLUGTAG, type Balkenfenster } from './segmente.js';
import type { Nachtstops, Sonnenzeiten } from './typen.js';
import { minuteDesTages } from './zeit.js';

/**
 * Wo die Nacht auf einem Balken liegt.
 *
 * Der Balken zeigt 06:00 bis 22:00. Im Juni ist davon alles hell, im Dezember
 * gehoeren beide Enden der Nacht — und eine Reservierung um 21:30 bedeutet dann
 * etwas anderes. Diese Datei rechnet aus, wo die Kante liegt.
 *
 * ## Warum gerechnet und nicht eingetragen
 *
 * Der Handoff nennt die Stops als Zahlen (0,5 % / 1,6 % / 90,6 % / 92,7 %) und
 * sagt im selben Absatz, sie seien "produktiv zu berechnen, nicht hart zu
 * kodieren". Beides stimmt: Die Zahlen gelten fuer den 13. August. Wer sie
 * einträgt, hat eine Anzeige, die genau ein Datum lang richtig ist.
 *
 * ## Warum eine eigene Datei
 *
 * Die Nachttoenung ist keine Frage der Wahl, sondern der Darstellung eines
 * Tages: Sie betrifft alle vier Balkentypen, auch die, in denen niemand etwas
 * waehlt. In `zeitwahl.ts` waere sie am falschen Ort.
 *
 * Geliefert werden **Anteile** zwischen 0 und 1 — keine Prozentzeichen, keine
 * Farben, kein Verlauf. Was daraus ein `linear-gradient` wird, ist Sache des
 * Zugangswegs (Prinzip IV), genau wie bei `balkensegmente`.
 */

/**
 * Wie lange die Daemmerung dauert, in Minuten.
 *
 * Der Handoff setzt ±10 Minuten an. Das ist keine astronomische Groesse,
 * sondern eine gestalterische: Die Kante zwischen Nacht und Tag soll weich
 * sein, weil sie es in Wirklichkeit auch ist — und weil eine harte Kante
 * behauptete, um 06:05 sei es schlagartig hell.
 */
export const DAEMMERUNG = 10;

/**
 * Die Stops der Nachttoenung eines Ortstages.
 *
 * `null` als ganze Antwort heisst: keine Sonnenzeiten fuer diesen Tag, also
 * **keine** Toenung. Nicht eine geschaetzte (SC-009) — ein ausgefallener
 * Wetterdienst darf keine Aussage ueber den Tag erfinden, auch keine
 * beilaeufige.
 *
 * Eine einzelne Seite `null` ist etwas anderes und der Normalfall im Sommer:
 * Liegt der Sonnenaufgang vor Fensterbeginn, gibt es an diesem Rand keine Nacht
 * zu zeigen.
 *
 * @param sonnenzeiten Der Satz des Tages, oder `null`/`undefined`.
 * @param fenster Der dargestellte Ausschnitt; voreingestellt der Flugtag —
 *   dieselbe Groesse, mit der `balkensegmente` rechnet.
 */
export function nachtstops(
	sonnenzeiten: Sonnenzeiten | null | undefined,
	fenster: Balkenfenster = FENSTER_FLUGTAG
): Nachtstops | null {
	if (!sonnenzeiten) return null;

	const breite = fenster.bisMinute - fenster.vonMinute;
	if (breite <= 0) return null;

	const aufgang = minuteDesTages(new Date(sonnenzeiten.aufgang));
	const untergang = minuteDesTages(new Date(sonnenzeiten.untergang));

	const anteil = (minute: number) =>
		Math.min(1, Math.max(0, (minute - fenster.vonMinute) / breite));

	return {
		// Vor Fensterbeginn aufgegangen: An diesem Rand ist nichts abzudunkeln.
		morgens:
			aufgang <= fenster.vonMinute
				? null
				: { sonne: anteil(aufgang), klar: anteil(aufgang + DAEMMERUNG) },
		// Nach Fensterende untergegangen: dasselbe am anderen Rand.
		abends:
			untergang >= fenster.bisMinute
				? null
				: { klar: anteil(untergang - DAEMMERUNG), sonne: anteil(untergang) }
	};
}
