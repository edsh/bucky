/**
 * Wie alt eine Auskunft ist und ab wann sie sich als alt zu erkennen geben
 * muss.
 *
 * Die Grenze steht hier und nicht in der Anzeige: Kaeme jeder Zugangsweg zu
 * einer eigenen Antwort auf die Frage "ist das noch aktuell?", haetten wir
 * genau die zwei Wahrheiten, die Prinzip IV ausschliesst.
 */

/**
 * Ab dieser Dauer gilt ein Stand als veraltet (FR-009).
 *
 * Eine Stunde ist reichlich bemessen gegenueber dem Abruftakt von zehn
 * Minuten — das ist Absicht. Die Kennzeichnung soll einen echten Ausfall
 * anzeigen, nicht bei jedem uebersprungenen Durchgang Alarm schlagen.
 */
export const VERFALLSGRENZE_MS = 60 * 60 * 1000;

/** Alter eines Standes in Millisekunden. Nie negativ. */
export function alterMs(abgerufenAm: string, bezugszeitpunkt: Date): number {
	const abgerufen = new Date(abgerufenAm).getTime();
	if (Number.isNaN(abgerufen)) return Number.POSITIVE_INFINITY;
	return Math.max(0, bezugszeitpunkt.getTime() - abgerufen);
}

export function istVeraltet(abgerufenAm: string, bezugszeitpunkt: Date): boolean {
	return alterMs(abgerufenAm, bezugszeitpunkt) >= VERFALLSGRENZE_MS;
}

/**
 * Das Alter in Worten: "gerade eben", "vor 12 Minuten", "vor 3 Stunden".
 *
 * Bewusst grob. Eine sekundengenaue Angabe wuerde eine Genauigkeit
 * vortaeuschen, die die Sache nicht hat — zwischen zwei Abrufen liegen zehn
 * Minuten.
 */
export function alterInWorten(abgerufenAm: string, bezugszeitpunkt: Date): string {
	const ms = alterMs(abgerufenAm, bezugszeitpunkt);
	if (!Number.isFinite(ms)) return 'unbekannt';

	const minuten = Math.floor(ms / 60_000);
	if (minuten < 1) return 'gerade eben';
	if (minuten === 1) return 'vor einer Minute';
	if (minuten < 60) return `vor ${minuten} Minuten`;

	const stunden = Math.floor(minuten / 60);
	if (stunden === 1) return 'vor einer Stunde';
	if (stunden < 24) return `vor ${stunden} Stunden`;

	const tage = Math.floor(stunden / 24);
	return tage === 1 ? 'vor einem Tag' : `vor ${tage} Tagen`;
}
