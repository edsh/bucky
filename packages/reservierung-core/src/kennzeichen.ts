/**
 * Erkennung eines Luftfahrzeugkennzeichens — geteilt zwischen `antwort-deuten.ts`
 * und `kalender-deuten.ts` (contracts/kalender-deuten.md, Feature 052).
 *
 * Ein Kennzeichen erkennt man am Bindestrich zwischen Staats- und
 * Eintragungszeichen: `D-EELK`, `D-4413`. `Werkstatt` und `GRILL` haben keinen.
 *
 * Die Grenze ist bewusst grob. Sie soll Raumbuchungen aussortieren, nicht die
 * Zulassungsvorschriften nachbilden — und lieber einen ungewoehnlich
 * benannten Eintrag durchlassen, als ein echtes Flugzeug zu verschlucken.
 *
 * Zwei Fassungen desselben Musters liefen unweigerlich auseinander — deshalb
 * an einer Stelle, von beiden Deutern importiert.
 */
export const KENNZEICHEN = /^[A-Z0-9]{1,2}-[A-Z0-9]{1,5}$/;

export function kennungVereinheitlichen(roh: string): string {
	return roh.toUpperCase().replace(/\s+/g, '');
}

export function istLuftfahrzeug(kennung: string): boolean {
	return KENNZEICHEN.test(kennung);
}
