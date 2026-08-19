import { zeitraeumeFuer } from './belegung.js';
import { alsUhrzeitKurz, minuteDesTages, naechsterTag, ortstag, zeitpunktFuerMinute } from './zeit.js';
import type { Balkensegment, Belegungsart, Reservierung } from './typen.js';

/**
 * Balken statt Ring: dieselben Belegungen, linear aufgetragen.
 *
 * Der Tagesuhr-Ring aus `tagesuhr.ts` zeigt den ganzen Tag und verzerrt ihn
 * dafuer. Der Balken macht das Gegenteil: Er ist massstabsgetreu und zeigt
 * dafuer nur einen Ausschnitt (06:00–22:00). Beides nebeneinander ist kein
 * Widerspruch, sondern Absicht — der Ring beantwortet „wann heute?", der
 * Balken „wie lange genau?".
 *
 * Auch dieses Modul erzeugt **kein CSS**: keine Pixel, keine Farben, keine
 * Prozentzeichen. Es liefert Anteile zwischen 0 und 1; was daraus `left` und
 * `width` wird, ist Sache des Zugangswegs (Constitution, Prinzip IV).
 *
 * ## Warum hier geschnitten wird und nicht in den Daten
 *
 * Eine Reservierung von Montag 22:00 bis Dienstag 02:00 ist **ein** Eintrag.
 * Fuer die Anzeige braucht sie zwei Stuecke — eines je Tagesspalte. Dieses
 * Zerlegen geschieht hier, bei der Darstellung, und niemals an den Daten
 * (E-06). Wer die Belegung selbst auf „Montag 24:00" kuerzt, hat die Aussage
 * „belegt bis Dienstag 02:00" verloren, und die steht anderswo auf derselben
 * Seite.
 */

/** Beginn des dargestellten Fensters: 06:00 als Minute des Tages. */
export const BALKEN_VON = 6 * 60;
/** Ende des dargestellten Fensters: 22:00. */
export const BALKEN_BIS = 22 * 60;

/**
 * Ein Fensterausschnitt eines Tages, in Minuten seit Ortsmitternacht.
 *
 * `bis` darf 1440 erreichen — Mitternacht des Folgetags. Als 0 geschrieben
 * waere es der Anfang desselben Tages und das Fenster leer.
 */
export interface Balkenfenster {
	vonMinute: number;
	bisMinute: number;
}

/** Der Ausschnitt der Karte „Heute" und der Sieben-Tage-Liste (06:00–22:00). */
export const FENSTER_FLUGTAG: Balkenfenster = { vonMinute: BALKEN_VON, bisMinute: BALKEN_BIS };

/** Der ganze Ortstag — fuer Darstellungen, die nichts abschneiden duerfen. */
export const FENSTER_GANZTAGS: Balkenfenster = { vonMinute: 0, bisMinute: 1440 };

/** Ein Tag des Wochenrasters: sein Ortstag und die Segmente darin. */
export interface Balkentag {
	/** Ortstag als `YYYY-MM-DD`. */
	tag: string;
	segmente: Balkensegment[];
}

/** Rangfolge bei Ueberschneidung: Sperre schlaegt Reservierung (T-07). */
const RANG: Record<Belegungsart, number> = { sperre: 2, reservierung: 1 };

/** Aufloesung der Zellrechnung: eine Minute. */
const ZELLE_MINUTEN = 1;

/**
 * Die Segmente eines Ortstages als Anteile des Fensters.
 *
 * Gerechnet wird — wie beim Ring — auf **Zellen** von einer Minute, die
 * anschliessend zusammengefasst werden. Der naheliegende Weg waere, jede
 * Belegung einzeln auf das Fenster zu kuerzen und als Segment auszugeben;
 * er scheitert an der Ueberschneidung. Zwei Eintraege, die sich um eine
 * halbe Stunde ueberlappen, ergaeben zwei uebereinanderliegende Balken, und
 * bei einer Sperre unter einer Reservierung entschiede die Zeichenreihenfolge
 * ueber die Farbe statt der Rang. Die Zellrechnung kennt dieses Problem
 * nicht: Jede Minute hat genau einen Zustand.
 *
 * Freie Minuten erzeugen **kein** Segment. Der Balken hat eine Spur, die
 * darunter durchscheint; ein „frei"-Segment waere ein Rechteck in der Farbe
 * des Hintergrunds — sichtbar nur als Kante, wo keine sein sollte.
 */
export function balkensegmente(
	reservierungen: readonly Reservierung[],
	kennung: string,
	tag: string,
	fenster: Balkenfenster = FENSTER_FLUGTAG
): Balkensegment[] {
	const breite = fenster.bisMinute - fenster.vonMinute;
	if (breite <= 0) return [];

	const zeitraeume = zeitraeumeFuer([...reservierungen], kennung);
	const zellen: (Belegungsart | null)[] = [];

	for (let minute = fenster.vonMinute; minute < fenster.bisMinute; minute += ZELLE_MINUTEN) {
		// Die Mitte der Zelle, nicht ihr Rand: Sonst entschiede an jeder Naht
		// ein Vergleich auf Gleichheit darueber, ob die Minute noch belegt ist.
		const zeitpunkt = zeitpunktFuerMinute(tag, minute + ZELLE_MINUTEN / 2).getTime();
		zellen.push(artFuer(zeitpunkt, zeitraeume));
	}

	return zusammenfassen(zellen, fenster);
}

function artFuer(
	zeitpunkt: number,
	zeitraeume: readonly { von: number; bis: number; art: Belegungsart }[]
): Belegungsart | null {
	let beste: Belegungsart | null = null;
	for (const z of zeitraeume) {
		if (zeitpunkt < z.von || zeitpunkt >= z.bis) continue;
		if (beste === null || RANG[z.art] > RANG[beste]) beste = z.art;
	}
	return beste;
}

/** Gleichartige Nachbarzellen verschmelzen; freie Laeufe fallen weg. */
function zusammenfassen(
	zellen: readonly (Belegungsart | null)[],
	fenster: Balkenfenster
): Balkensegment[] {
	const breite = fenster.bisMinute - fenster.vonMinute;
	const segmente: Balkensegment[] = [];

	for (let i = 0; i < zellen.length; i++) {
		const art = zellen[i];
		if (art === null || art === undefined) continue;

		const letztes = segmente[segmente.length - 1];
		const von = (i * ZELLE_MINUTEN) / breite;
		const bis = ((i + 1) * ZELLE_MINUTEN) / breite;

		// Anschluss nur, wenn die Zelle unmittelbar folgt — sonst wuerde eine
		// freie Stunde zwischen zwei Reservierungen zugeschuettet.
		if (letztes && letztes.art === art && naheBei(letztes.bis, von)) {
			letztes.bis = bis;
		} else {
			segmente.push({ von, bis, art });
		}
	}

	return segmente;
}

/**
 * Gleichheit zweier Anteile mit Spielraum.
 *
 * `(i + 1) / 960` und `i / 960` sind derselbe Punkt, aber nicht dieselbe
 * Gleitkommazahl. Ein Vergleich auf Gleichheit zerlegte den Balken deshalb
 * gelegentlich in zwei aneinanderstossende Segmente — unsichtbar, bis eine
 * abgerundete Ecke die Naht verraet.
 */
function naheBei(a: number, b: number): boolean {
	return Math.abs(a - b) < 1e-9;
}

/**
 * Die Segmente des Tages, in dem der Bezugszeitpunkt liegt.
 *
 * Der Bezugszeitpunkt wird **uebergeben**, nie hier geholt (E-09) — sonst
 * liesse sich weder der Tageswechsel noch die Zeitumstellung pruefen.
 */
export function tagesbalken(
	reservierungen: readonly Reservierung[],
	kennung: string,
	bezugszeitpunkt: Date,
	fenster: Balkenfenster = FENSTER_FLUGTAG
): Balkensegment[] {
	return balkensegmente(reservierungen, kennung, ortstag(bezugszeitpunkt), fenster);
}

/**
 * Sieben Tage ab heute — die Grundlage der Sieben-Tage-Liste und des
 * Wochenrasters.
 *
 * Beide Darstellungen zeigen dieselben sieben Tage, nur anders herum gedreht:
 * die Liste zeilenweise, das Raster spaltenweise. Sie teilen sich deshalb
 * diese Funktion. Zwei getrennte Rechnungen koennten auseinanderlaufen, und
 * ein Nutzer, der zwischen beiden umschaltet, saehe zwei verschiedene
 * Wochen — der auffaelligste denkbare Fehler.
 */
export function wochenbalken(
	reservierungen: readonly Reservierung[],
	kennung: string,
	bezugszeitpunkt: Date,
	tage = 7,
	fenster: Balkenfenster = FENSTER_FLUGTAG
): Balkentag[] {
	const ergebnis: Balkentag[] = [];
	let tag = ortstag(bezugszeitpunkt);

	for (let i = 0; i < tage; i++) {
		ergebnis.push({ tag, segmente: balkensegmente(reservierungen, kennung, tag, fenster) });
		tag = naechsterTag(tag);
	}

	return ergebnis;
}

/**
 * Wo im Fenster die Jetzt-Linie steht — 0 … 1, oder `null` ausserhalb.
 *
 * Auch das ist eine Rechnung und gehoert deshalb hierher und nicht in ein
 * Svelte-Template. Ausserhalb des Fensters gibt es bewusst keinen Wert:
 * Um 05:30 eine Linie an den linken Rand zu legen behauptete, es sei 06:00.
 */
export function jetztAnteil(
	bezugszeitpunkt: Date,
	tag: string,
	fenster: Balkenfenster = FENSTER_FLUGTAG
): number | null {
	if (ortstag(bezugszeitpunkt) !== tag) return null;

	const minute = minuteDesTages(bezugszeitpunkt);
	if (minute < fenster.vonMinute || minute > fenster.bisMinute) return null;

	const breite = fenster.bisMinute - fenster.vonMinute;
	if (breite <= 0) return null;

	return (minute - fenster.vonMinute) / breite;
}

/**
 * Eine Belegung, wie sie an **einem** Tag erscheint.
 *
 * Die Uhrzeiten sind auf den Tag zugeschnitten, die ISO-Zeitpunkte nicht
 * (E-06). Beides wird gebraucht und ist nicht dasselbe: Die Chipzeile unter
 * dem Balken sagt „22:00–24:00", die Dauer daneben aber „6 h", weil die
 * Belegung um 04:00 des Folgetags endet. Wer nur eine der beiden Groessen
 * fuehrt, muss die andere raten.
 */
export interface Tagesbelegung {
	art: Belegungsart;
	/** Beginn innerhalb des Tages als `HH:MM`; `00:00`, wenn frueher begonnen. */
	vonUhr: string;
	/** Ende innerhalb des Tages als `HH:MM`; `24:00`, wenn spaeter geendet. */
	bisUhr: string;
	/** Der ungekuerzte Beginn als ISO. */
	vonIso: string;
	/** Das ungekuerzte Ende als ISO. */
	bisIso: string;
	/** Deckt sie den ganzen Ortstag? */
	ganztags: boolean;
}

/** Ein Ortstag von Mitternacht bis Mitternacht, als Zeitspanne. */
function tagesgrenzen(tag: string): { beginn: number; ende: number } {
	return {
		beginn: zeitpunktFuerMinute(tag, 0).getTime(),
		ende: zeitpunktFuerMinute(tag, 1440).getTime()
	};
}

/**
 * Die Belegungen eines Ortstages, auf den Tag zugeschnitten.
 *
 * Der Zuschnitt betrifft **nur** die Uhrzeiten. `24:00` als Endzeit ist dabei
 * Absicht und keine Schlamperei: `00:00` waere derselbe Punkt auf der Uhr und
 * die falsche Aussage — es sagte, die Belegung ende, wo der Tag beginnt.
 */
export function tagesbelegungen(
	reservierungen: readonly Reservierung[],
	kennung: string,
	tag: string
): Tagesbelegung[] {
	const { beginn, ende } = tagesgrenzen(tag);

	return zeitraeumeFuer([...reservierungen], kennung)
		.filter((z) => z.bis > beginn && z.von < ende)
		.map((z) => {
			const frueher = z.von <= beginn;
			const spaeter = z.bis >= ende;
			return {
				art: z.art,
				vonUhr: frueher ? '00:00' : alsUhrzeitKurz(new Date(z.von)),
				bisUhr: spaeter ? '24:00' : alsUhrzeitKurz(new Date(z.bis)),
				vonIso: new Date(z.von).toISOString(),
				bisIso: new Date(z.bis).toISOString(),
				ganztags: frueher && spaeter
			};
		});
}

/**
 * Die naechsten Belegungen ab einem Zeitpunkt — hoechstens `anzahl`.
 *
 * „Naechste" heisst: noch nicht vorbei. Die gerade **laufende** Belegung
 * gehoert dazu, denn sie ist das, was als Naechstes endet, und ihr Ende ist
 * die Frage, die auf dieser Seite gestellt wird. Sie wegzulassen hiesse, die
 * Liste ausgerechnet dann leer zu zeigen, wenn am meisten los ist.
 */
export function kommendeBelegungen(
	reservierungen: readonly Reservierung[],
	kennung: string,
	ab: Date,
	anzahl = 6
): Tagesbelegung[] {
	const jetzt = ab.getTime();

	return zeitraeumeFuer([...reservierungen], kennung)
		.filter((z) => z.bis > jetzt)
		.slice(0, anzahl)
		.map((z) => {
			const tag = ortstag(new Date(z.von));
			const { beginn, ende } = tagesgrenzen(tag);
			return {
				art: z.art,
				vonUhr: alsUhrzeitKurz(new Date(z.von)),
				bisUhr: alsUhrzeitKurz(new Date(z.bis)),
				vonIso: new Date(z.von).toISOString(),
				bisIso: new Date(z.bis).toISOString(),
				ganztags: z.von <= beginn && z.bis >= ende
			};
		});
}
