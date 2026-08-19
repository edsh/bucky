import type { Maschinenzustand } from '@edsh-bucky/reservierung-core';

/**
 * Die Farbwerte der Anzeige — und **nur** hier.
 *
 * Sie stehen so im Design-Handoff (`docs/design_handoff_reservierung/`,
 * Abschnitt „Design-Tokens"). Verstreute Farbwerte sind der sichere Weg zu
 * einer Anzeige, in der Ring und Statuspunkt zwei verschiedene Rot zeigen —
 * deshalb diese Datei.
 *
 * Der Kern liefert bewusst keine Farbe, sondern nur die Zahl `draengen`
 * (research.md E-05): Farbwerte sind Gestaltungstoken und haben in einem
 * UI-freien Modul nichts zu suchen, die Zeitrechnung dahinter schon.
 */
export const FARBEN = {
	frei: '#1f8f45',
	belegt: '#c0442b',
	/** Sperre in Text und Farbstreifen. */
	sperreText: '#b05c50',
	/** Sperre in Punkt und Ring — bewusst ein anderer, stumpferer Ton. */
	sperreFlaeche: '#9aa0a6',
	nacht: '#454e5c',
	sonnenaufgang: '#d9a13c',
	sonnenuntergang: '#7b6fa6',
	/** Handlungsfarbe und eigene Reservierung. */
	akzent: '#1f4e79'
} as const;

/**
 * Der Hintergrund einer belegten Fläche — Balken, Segment, Farbstreifen.
 *
 * Eine Sperre bekommt hier **dasselbe Absperrband** wie der Avatar einer
 * gesperrten Maschine: rot-graue Diagonalstreifen. Vorher war sie schlicht
 * grau, und grau ist auf einem Balken keine Aussage, sondern die Farbe, die
 * übrig bleibt — man sieht ihr nicht an, dass sie etwas bedeutet. Das
 * Streifenmuster erkennt dagegen jeder wieder, der es einmal auf einer
 * Kachel gesehen hat, und es liest sich auch dann noch als „hier nicht",
 * wenn jemand Rot und Grün nicht unterscheiden kann.
 *
 * Der Winkel und die Streifenbreite stimmen mit `TagesuhrAvatar.svelte`
 * überein — dieselbe Sache muss gleich aussehen, sonst wirkt sie wie zwei.
 */
export function flaecheFuer(art: 'reservierung' | 'sperre'): string {
	if (art !== 'sperre') return FARBEN.belegt;

	return (
		'repeating-linear-gradient(45deg, ' +
		'rgba(200, 80, 64, 0.55) 0 6px, rgba(255, 255, 255, 0) 6px 12px)' +
		`, ${FARBEN.sperreFlaeche}`
	);
}

/**
 * Die Statusfarbe einer Maschine.
 *
 * Der Sonderfall ist `bald`: Dafuer gibt es **keine** eigene Farbe, sondern
 * einen linearen Uebergang von Gruen nach Rot ueber `draengen`
 * (Handoff, „Statuslogik"; FR-006). In der letzten Stunde vor der Belegung
 * wandert die Kachel also sichtbar ins Rote, ohne dass irgendwo eine Schwelle
 * springt — genau das ist gemeint, wenn dort steht, „bald belegt" sei kein
 * eigener Zustand.
 */
export function statusfarbe(zustand: Maschinenzustand): string {
	if (zustand.status === 'sperre') return FARBEN.sperreFlaeche;
	if (zustand.status === 'belegt') return FARBEN.belegt;
	return mischen(FARBEN.frei, FARBEN.belegt, zustand.draengen);
}

/**
 * Lineare Interpolation zweier Hexfarben im sRGB-Raum.
 *
 * sRGB und nicht etwas Wahrnehmungsgetreueres: Der Handoff schreibt genau
 * diese Rechnung vor, und der Prototyp, an dem die Farbwerte abgestimmt
 * wurden, rechnet ebenso. Eine „bessere" Mischung ergaebe andere
 * Zwischentoene als die freigegebenen.
 *
 * Ergebnis ist ein `rgb()`-Ausdruck, keine Hexfarbe — siehe unten.
 */
export function mischen(von: string, nach: string, anteil: number): string {
	const t = Math.min(1, Math.max(0, anteil));
	const a = zerlegen(von);
	const b = zerlegen(nach);
	const kanal = (i: number) => a[i] + (b[i] - a[i]) * t;

	// `rgb()` mit Nachkommastellen statt einer Hexfarbe: Das Zusammenfalten
	// auf ganze Kanalwerte waere eine Rundung im Adapter, und C-03 aus
	// Feature 001 verbietet die — aus gutem Grund, denn dort geht es um
	// POH-Zahlen. Hier braucht sie schlicht niemand: Der Browser stellt
	// `rgb(31.4 143 69)` selbst dar.
	return `rgb(${kanal(0)} ${kanal(1)} ${kanal(2)})`;
}

function zerlegen(hex: string): [number, number, number] {
	const roh = hex.replace('#', '');
	return [
		parseInt(roh.slice(0, 2), 16),
		parseInt(roh.slice(2, 4), 16),
		parseInt(roh.slice(4, 6), 16)
	];
}
