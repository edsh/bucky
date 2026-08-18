import type { Kategorie, Maschine, Reservierung } from './typen.js';

/**
 * Welche Flugzeuge es gibt und wie sie einzuordnen sind.
 *
 * Grundlage: specs/054-reservierungs-bersicht-flugzeugflotte/research.md,
 * E-01 und E-02.
 */

/**
 * Die Kennzeichen der Vereinsflotte.
 *
 * **Bewusste Abweichung von Verfassungsprinzip II** (Vereinsflieger als
 * fuehrendes System), ausdruecklich entschieden am 18.08.2026: Der
 * Flugzeugpark ist statisch genug, um ihn hier zu halten. Die Begruendung
 * steht in plan.md unter "Abweichung zu Prinzip II".
 *
 * **Warum es diese Liste ueberhaupt gibt**: Beide Datenquellen kennen ein
 * Flugzeug nur ueber seine Buchungen. Eine Maschine, die niemand gebucht hat,
 * kaeme in keiner Antwort vor — sie verschwaende aus der Uebersicht genau
 * dann, wenn sie frei ist. Das ist die schaedliche Richtung des Fehlers: Wer
 * fliegen will, saehe das eine verfuegbare Flugzeug nicht.
 *
 * **Was diese Liste kostet**: Bleibt ein verkauftes Flugzeug hier stehen,
 * zeigt die Uebersicht es dauerhaft als "frei den ganzen Tag" — eine falsche
 * Verfuegbarkeitsaussage. Wird eine Maschine verkauft, gehoert diese Liste
 * angefasst. In der Gegenrichtung ist sie harmlos: Ein neues Flugzeug
 * erscheint beim ersten Buchen von selbst, weil die Anzeige die Vereinigung
 * aus Liste und Daten ist.
 *
 * Stand 18.08.2026, entnommen dem Kalenderabzug vom 13.08.2026. Ob das alle
 * sind, ist nicht bestaetigt — die Liste darf zu kurz sein, sie wirkt dann
 * nur nicht.
 */
export const STAMMLISTE: readonly string[] = [
	'D-EELK',
	'D-EXYZ',
	'D-MRXS',
	'D-3004',
	'D-4413',
	'D-9021'
];

/** Alles hinter dem ersten Bindestrich — das Eintragungszeichen. */
const EINTRAGUNGSZEICHEN = /-(.+)$/;

/**
 * Motorflugzeug/UL oder Segelflugzeug, abgeleitet aus dem Kennzeichen.
 *
 * Die Regel (E-02): Ein rein ziffriges Eintragungszeichen (`D-9021`) gehoert
 * zu einem Segelflugzeug, alles andere (`D-EELK`, `D-MRXS`) zu einem
 * Motorflugzeug oder UL. Am echten Kalenderabzug trifft sie sechsmal von
 * sechs.
 *
 * Warum abgeleitet und nicht gepflegt: Eine gepflegte Spalte waere eine
 * zweite Stelle, an der etwas veralten kann — und das fuer eine Angabe, die
 * im Kennzeichen bereits steht. Die Regel hat einen echten Grenzfall
 * (Motorsegler `D-K…` gilt hier als Motor), aber der Verein hat keinen.
 */
export function kategorieFuer(kennung: string): Kategorie {
	const treffer = EINTRAGUNGSZEICHEN.exec(kennung.trim());
	const zeichen = treffer?.[1] ?? '';
	return /^\d+$/.test(zeichen) ? 'segelflug' : 'motor';
}

function vereinheitlichen(kennung: string): string {
	return kennung.toUpperCase().replace(/\s+/g, '');
}

/**
 * Die anzuzeigende Flotte: die **Vereinigung** aus Stammliste und den
 * Kennzeichen, die in den Daten vorkommen.
 *
 * Beide Richtungen sind noetig. Ohne Stammliste fehlen die freien Maschinen
 * (siehe dort). Ohne die Daten fehlt jedes Flugzeug, das noch niemand in die
 * Liste eingetragen hat — es soll erscheinen, sobald es gebucht wird, und
 * nicht erst nach einer Veroeffentlichung der Anwendung.
 *
 * Sortiert nach Kategorie (Motor zuerst, wie in der Uebersicht) und darin
 * alphabetisch. Die Reihenfolge ist Teil der Zusicherung: Eine Kachel, die
 * bei jedem Abruf woanders steht, ist auf dem Telefon unbenutzbar.
 */
export function flotteBilden(
	stammliste: readonly string[],
	reservierungen: readonly Reservierung[]
): Maschine[] {
	const kennungen = new Set<string>();
	for (const eintrag of stammliste) kennungen.add(vereinheitlichen(eintrag));
	for (const r of reservierungen) kennungen.add(vereinheitlichen(r.kennung));

	const reihenfolge: Record<Kategorie, number> = { motor: 0, segelflug: 1 };

	return [...kennungen]
		.map((kennung) => ({ kennung, kategorie: kategorieFuer(kennung) }))
		.sort(
			(a, b) =>
				reihenfolge[a.kategorie] - reihenfolge[b.kategorie] ||
				a.kennung.localeCompare(b.kennung, 'de')
		);
}
