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
 * Die Ersatzform fuer eine fehlende Bilddatei.
 *
 * Bei Motorflugzeugen faellt das Landeszeichen weg: In einer Flotte, in der
 * jede Kennung mit „D-E" beginnt, traegt dieser Teil keine Unterscheidung —
 * „EELK" liest sich schneller und ist trotzdem eindeutig.
 *
 * Segelflugzeuge behalten ihr **ganzes** Kennzeichen. Fuer sie ist die
 * Kurzform nicht gebraeuchlich (Auskunft des Auftraggebers, 18.08.2026), und
 * eine erfundene waere schlimmer als keine: „04" liesse sich von einer
 * D-9004 nicht unterscheiden.
 */
export function kurzkennung(kennung: string): string {
	const gross = kennung.toUpperCase();
	if (/^D-\d/.test(gross)) return gross;

	const teil = /-(.+)$/.exec(gross);
	return teil ? teil[1] : gross;
}
