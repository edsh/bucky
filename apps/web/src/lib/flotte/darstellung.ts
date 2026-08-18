/**
 * Was die Oberflaeche ueber eine Maschine weiss, das den Kern nichts angeht.
 *
 * Typbezeichnung, Avatarbild und der Pfad zum POH-Rechner sind Eigenschaften
 * **dieses Zugangswegs**, nicht der Sache (research.md E-03). Der Kern sichert
 * zu, nichts von SvelteKit zu wissen; ein Routenpfad in `flotte.ts` waere der
 * erste Bruch dieser Zusicherung.
 *
 * Alle drei Angaben sind **optional**. Fehlen sie, zeigt die Anzeige die
 * vorgesehene Ersatzform: Kurzkennzeichen statt Bild, keinen POH-Knopf, keinen
 * Typ in der Kopfzeile. Eine neue Maschine muss hier also nicht eingetragen
 * werden, damit sie erscheint — sie sieht nur schlichter aus.
 */
export interface Darstellung {
	/** „Cessna 172" — erscheint klein unter dem Kennzeichen. */
	typ?: string;
	/** Pfad zum Avatarbild unter `static/`. */
	bild?: string;
	/** Ziel des POH-Knopfes; nur wo es einen Rechner gibt (FR-018). */
	pohPfad?: string;
}

/**
 * Der POH-Rechner existiert bisher fuer genau eine Maschine — deshalb hat
 * genau ein Eintrag einen `pohPfad`. Ihn pauschal fuer alle zu setzen hiesse,
 * einen Knopf anzubieten, der ins Leere fuehrt.
 */
const DARSTELLUNGEN: Record<string, Darstellung> = {
	'D-EELK': {
		typ: 'Cessna F172N',
		bild: '/d-eelk.gif',
		pohPfad: '/d-eelk/poh-rechner/'
	},
	'D-EXYZ': {
		bild: '/d-exyz.gif'
	}
};

/** Die Darstellungsangaben zu einer Kennung — notfalls ein leeres Objekt. */
export function darstellungFuer(kennung: string): Darstellung {
	return DARSTELLUNGEN[kennung.toUpperCase()] ?? {};
}

/**
 * Die Ersatzform fuer eine fehlende Bilddatei: der Teil des Kennzeichens
 * hinter dem Bindestrich, also „EELK" oder „3004".
 *
 * Das Landeszeichen wegzulassen ist keine Sparsamkeit, sondern Lesbarkeit: In
 * einer Flotte, in der jede Kennung mit „D-" beginnt, traegt dieser Teil keine
 * Unterscheidung.
 */
export function kurzkennung(kennung: string): string {
	const teil = /-(.+)$/.exec(kennung.toUpperCase());
	return teil ? teil[1] : kennung.toUpperCase();
}
