import { vereinsfliegerNummer } from './flotte.js';
import type { Zeitfenster } from './typen.js';
import { alsDatumZiffern, alsUhrzeitKurz } from './zeit.js';

/**
 * Der Weg nach Vereinsflieger — gebaut, nicht getippt.
 *
 * Gebucht wird dort, nicht hier: Diese Anwendung liest den Reservierungsstand
 * und bereitet die Buchung hoechstens vor. Sie schickt niemanden mit leeren
 * Haenden hinueber, aber sie schickt auch keine Daten hin — die Adresse ist
 * alles, was uebergeben wird, und das Mitglied sieht die Maske vor dem
 * Absenden.
 *
 * Warum das im Kern steht und nicht in der Oberflaeche (Prinzip IV):
 * Parameternamen und Datumsformate sind Wissen ueber ein fremdes System.
 * Steht es an zwei Stellen, ist eine davon irgendwann falsch — und der Fehler
 * meldet sich nicht, er fuehrt nur zu einem leeren Formular.
 */

/**
 * Die Reservierungsmaske ohne jede Vorbelegung.
 *
 * `type=0&inline=0` traegt fuer sich: Auch wenn Vereinsflieger die uebrigen
 * Parameter eines Tages fallenlaesst, landet das Mitglied auf einer
 * benutzbaren Seite (research.md, E-13).
 */
export const RESERVIERUNGSMASKE =
	'https://vereinsflieger.de/member/community/reservations/add?type=0&inline=0';

/**
 * Die Adresse der Reservierungsmaske, vorbelegt mit Maschine und Zeitfenster.
 *
 * Die Parameter sind **beobachtet, nicht dokumentiert** (E-13): Sie stammen
 * aus der Adresszeile des laufenden Systems. Vereinsflieger kann sie jederzeit
 * aendern; dann bleibt der Verweis trotzdem brauchbar, er belegt eben nichts
 * mehr vor. Genau deshalb zeigt das Sheet den Vorschlag daneben als Text —
 * abtippen ist zumutbar, ratlos vor einem leeren Formular stehen nicht.
 *
 * Bewusst **nicht** kodiert: Punkte im Datum und der Doppelpunkt in der
 * Uhrzeit gehen literal hinueber, so wie beobachtet. Beide sind in einer
 * Abfrage erlaubte Zeichen.
 *
 * Die Zeiten gehen als **Ortszeit ohne Zonenangabe** hinueber — wie alles in
 * dieser Anwendung (Feature 052). Das verlaesst sich darauf, dass
 * Vereinsflieger dieselbe Zone annimmt; da beide Seiten denselben Flugplatz
 * meinen, ist das die naheliegende Annahme, aber es ist eine.
 *
 * @param kennung Kennzeichen der Maschine; unbekannte fuehren zu einem
 *   Verweis ohne `frm_apid`, nicht zu gar keinem Verweis.
 * @param fenster Der Vorschlag, oder `null` — dann bleibt die Maske leer,
 *   statt ein erfundenes Zeitfenster zu tragen (Z-08).
 */
export function reservierungsVerweis(kennung: string, fenster: Zeitfenster | null): string {
	const teile: string[] = [];

	const apid = vereinsfliegerNummer(kennung);
	if (apid !== null) teile.push(`frm_apid=${apid}`);

	if (fenster !== null) {
		const von = new Date(fenster.von);
		const bis = new Date(fenster.bis);
		teile.push(
			`frm_datefrom=${alsDatumZiffern(von)}`,
			`frm_dateto=${alsDatumZiffern(bis)}`,
			`frm_datefromtime=${alsUhrzeitKurz(von)}`,
			`frm_datetotime=${alsUhrzeitKurz(bis)}`
		);
	}

	return teile.length === 0 ? RESERVIERUNGSMASKE : `${RESERVIERUNGSMASKE}&${teile.join('&')}`;
}
