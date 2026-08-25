/**
 * Was die Oberflaeche ueber eine Maschine weiss, das den Kern nichts angeht.
 *
 * Typbezeichnung und Avatarbild sind Eigenschaften **dieses Zugangswegs**,
 * nicht der Sache (research.md E-03). Der Kern sichert zu, nichts von SvelteKit
 * zu wissen; ein Routenpfad in `flotte.ts` waere der erste Bruch dieser
 * Zusicherung.
 *
 * Beide Angaben sind **optional**. Fehlen sie, zeigt die Anzeige die
 * vorgesehene Ersatzform: Kurzkennzeichen statt Bild, keinen Typ in der
 * Kopfzeile. Eine neue Maschine muss hier also nicht eingetragen werden, damit
 * sie erscheint — sie sieht nur schlichter aus.
 *
 * Hier stand bis Feature 058 auch ein `pohPfad`. Er ist mit der klebenden
 * Aktionsleiste der Detailansicht entfallen (FR-026, B-11): Der einzige Weg
 * zum POH-Rechner fuehrt jetzt ueber `handlungenFuer`, und der kennt sein Ziel
 * selbst. Ein Feld, das niemand mehr liest, sieht aus wie eine Einstellung und
 * ist keine.
 */
export interface Darstellung {
	/** „Cessna 172" — erscheint klein unter dem Kennzeichen. */
	typ?: string;
	/** Pfad zum Avatarbild unter `static/`. */
	bild?: string;
}

const DARSTELLUNGEN: Record<string, Darstellung> = {
	'D-EELK': {
		typ: 'Cessna 172N',
		bild: '/d-eelk.gif'
	},
	'D-EXYZ': {
		typ: 'Aviat Husky A-1',
		bild: '/d-exyz.gif'
	},
	'D-MRXS': {
		typ: 'WT9 Dynamic'
	},
	'D-3004': {
		typ: 'Discus 2b'
	},
	'D-4413': {
		typ: 'Hornet C'
	},
	'D-9021': {
		typ: 'ASK 21'
	}
};

/** Die Darstellungsangaben zu einer Kennung — notfalls ein leeres Objekt. */
export function darstellungFuer(kennung: string): Darstellung {
	return DARSTELLUNGEN[kennung.toUpperCase()] ?? {};
}

/**
 * Die Ersatzform fuer eine fehlende Bilddatei.
 *
 * Motorflugzeuge tragen ihr **Funkrufzeichen** in der abgekuerzten Form:
 * das Landeszeichen und die letzten beiden Buchstaben, also „D-LK" fuer die
 * D-EELK. So wird die Maschine im Funk gerufen und im Verein genannt; die
 * Anzeige soll denselben Namen benutzen wie die Leute, die davorstehen.
 * „MRXS" war nicht falsch, aber es ist niemandes Wort fuer dieses Flugzeug
 * (Auskunft des Auftraggebers, 19.08.2026).
 *
 * Segelflugzeuge behalten ihr **ganzes** Kennzeichen. Fuer sie ist die
 * Kurzform nicht gebraeuchlich, und eine erfundene waere schlimmer als
 * keine: „04" liesse sich von einer D-9004 nicht unterscheiden.
 *
 * Zu kurze oder unerwartete Kennungen bleiben unveraendert. Eine Kurzform
 * herzustellen, die zu nichts passt, hilft niemandem — dann lieber die
 * vollstaendige Angabe, auch wenn sie im Kreis enger sitzt.
 */
export function kurzkennung(kennung: string): string {
	const gross = kennung.toUpperCase();
	if (/^D-\d/.test(gross)) return gross;

	const teil = /^(D)-([A-Z]{2,})$/.exec(gross);
	if (!teil) return gross;

	return `${teil[1]}-${teil[2]!.slice(-2)}`;
}
