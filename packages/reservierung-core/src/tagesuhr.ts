import { minuteDesTages, ortstag, ortszeitZuZeitpunkt } from './zeit.js';
import { zeitraeumeFuer } from './belegung.js';
import type { Reservierung, Ringsegment, Sonnenzeiten } from './typen.js';

/**
 * Der Tagesuhr-Ring: Ortszeit zu Winkel, Belegungen zu Segmenten.
 *
 * Verbindliche Quelle ist der Abschnitt „Tagesuhr-Ring" des Design-Handoffs
 * (contracts/tagesuhr.md). Dieses Modul erzeugt **kein CSS** — keine
 * Farbwerte, kein `conic-gradient`, keine Strichmasse. Es liefert Zahlen und
 * Namen; die Uebersetzung in Aussehen ist Sache des Zugangswegs
 * (Constitution, Prinzip IV).
 *
 * ## Zwei Dinge, die nicht dasselbe sind
 *
 * **Geometrie** und **Farbe** sind hier streng getrennt (E-15):
 *
 * - Die Winkelabbildung ist fest und datumsunabhaengig. Sie verteilt nur
 *   Platz: die stillen Nachtstunden bekommen wenig, der Flugtag viel. Wer den
 *   Ring einmal gelesen hat, findet 15:00 im Dezember an derselben Stelle wie
 *   im Juni.
 * - Die Zellfarbe folgt den **tatsaechlichen** Sonnenzeiten des Tages. Sie
 *   erzaehlt die Jahreszeit.
 *
 * Ein frueherer Entwurf liess beides auf derselben Kante zusammenfallen. Das
 * stimmte nur deshalb, weil der Prototyp Mitte August entstand — da geht die
 * Sonne in Hohn um 06:07 auf und um 20:45 unter. Im Dezember haette derselbe
 * Ring ueber fuenf Stunden Tageslicht behauptet, die es nicht gibt.
 */

/** Beginn der gestauchten Zone: 21:00 als Minute des Tages. */
const NACHT_BEGINN = 21 * 60;
/** Ende der gestauchten Zone: 06:00. */
const NACHT_ENDE = 6 * 60;
/** Winkel der Naht bei 21:00. */
const WINKEL_NACHT_BEGINN = 135;
/** Winkel der Naht bei 06:00. */
const WINKEL_NACHT_ENDE = 225;

const NACHT_MINUTEN = 1440 - NACHT_BEGINN + NACHT_ENDE; // 540
const TAG_MINUTEN = NACHT_BEGINN - NACHT_ENDE; // 900
const NACHT_GRAD = WINKEL_NACHT_ENDE - WINKEL_NACHT_BEGINN; // 90
const TAG_GRAD = 360 - NACHT_GRAD; // 270

/**
 * Der Winkel zu einer Minute seit Ortsmitternacht. 0° liegt **oben**, gezaehlt
 * wird im Uhrzeigersinn.
 *
 * Die neun Nachtstunden teilen sich 90°, die fuenfzehn Tagstunden 270°. Eine
 * Nachtstunde ist damit ein Drittel so breit wie eine Tagstunde — der Ring
 * gibt dem Platz, worum es geht.
 *
 * Die Falle dieses Rings steckt in Mitternacht: Sie liegt bei 165°, **nicht**
 * bei 0°. Wer 0 Uhr nach oben legt, dreht den halben Tag falsch herum (T-02).
 *
 * Diese Abbildung nimmt **keine** Sonnenzeiten entgegen und ist
 * datumsunabhaengig (T-06). Sie darf es nicht sein: Sonst saesse 15:00 im
 * Dezember woanders als im Juni und der Ring waere nicht mehr lesbar,
 * sondern nur noch huebsch.
 */
export function winkelFuerMinute(minute: number): number {
	const m = ((minute % 1440) + 1440) % 1440;

	if (m >= NACHT_BEGINN || m < NACHT_ENDE) {
		// Ueber Mitternacht hinweg gerechnet: 21:00 -> 0, 06:00 -> 540.
		const seitNachtbeginn = (m - NACHT_BEGINN + 1440) % 1440;
		return WINKEL_NACHT_BEGINN + (seitNachtbeginn / NACHT_MINUTEN) * NACHT_GRAD;
	}

	// Der Tagbogen laeuft von 225° ueber 360°/0° hinweg bis 135°.
	return (WINKEL_NACHT_ENDE + ((m - NACHT_ENDE) / TAG_MINUTEN) * TAG_GRAD) % 360;
}

/**
 * Die Umkehrung: welche Minute steht an diesem Winkel (T-04).
 *
 * Gebraucht wird sie fuer die Beschriftung und fuer die Pruefung, dass die
 * Abbildung ueberhaupt umkehrbar ist — eine Winkelabbildung, die zwei
 * Uhrzeiten auf denselben Punkt legt, faellt genau hier auf.
 */
export function minuteFuerWinkel(grad: number): number {
	const g = ((grad % 360) + 360) % 360;

	if (g >= WINKEL_NACHT_BEGINN && g < WINKEL_NACHT_ENDE) {
		const anteil = (g - WINKEL_NACHT_BEGINN) / NACHT_GRAD;
		return (NACHT_BEGINN + anteil * NACHT_MINUTEN) % 1440;
	}

	// Alles ausserhalb des Nachtbands gehoert zum Tagbogen; er beginnt bei
	// 225° und laeuft ueber 0° hinweg.
	const seitTagbeginn = (g - WINKEL_NACHT_ENDE + 360) % 360;
	return NACHT_ENDE + (seitTagbeginn / TAG_GRAD) * TAG_MINUTEN;
}

/** Rangfolge bei Ueberschneidung: Sperre schlaegt alles (T-07). */
const RANG: Record<Ringsegment['fuellung'], number> = {
	sperre: 3,
	reservierung: 2,
	nacht: 1,
	frei: 0
};

/**
 * Die Segmente des Rings fuer einen Ortstag.
 *
 * Gebildet wird auf **1°-Zellen**, danach werden gleichfarbige Nachbarn
 * zusammengefasst (T-09). Das begrenzt die Zahl der Segmente auf 360 und den
 * Rundungsfehler auf ein Grad — und es macht die Abdeckung lueckenlos, was
 * bei einer segmentweisen Rechnung aus Zeitraeumen nicht selbstverstaendlich
 * waere. Eine Luecke im Ring waere ein durchsichtiger Keil: als Fehler
 * sichtbar, aber erst spaet (T-05).
 *
 * `sonnenzeiten` darf `null` sein. Dann faellt **allein die Farbgrenze** auf
 * 21:00/06:00 zurueck (T-06a); der Ring bleibt vollstaendig und behaelt seine
 * Form. Ein ausgefallener Wetterdienst darf nie eine Luecke erzeugen.
 */
export function ringsegmente(
	reservierungen: readonly Reservierung[],
	kennung: string,
	bezugszeitpunkt: Date,
	sonnenzeiten: Sonnenzeiten | null
): Ringsegment[] {
	const tag = ortstag(bezugszeitpunkt);
	const nachtPruefen = nachtPruefer(sonnenzeiten);
	const zeitraeume = zeitraeumeFuer([...reservierungen], kennung);

	const zellen: Ringsegment['fuellung'][] = [];
	for (let grad = 0; grad < 360; grad++) {
		// Die Mitte der Zelle, nicht ihr Rand: Sonst entschiede an jeder Naht
		// ein Gleitkomma-Vergleich ueber die Farbe.
		const minute = minuteFuerWinkel(grad + 0.5);
		zellen.push(fuellungFuer(minute, tag, zeitraeume, nachtPruefen));
	}

	return zusammenfassen(zellen);
}

function fuellungFuer(
	minute: number,
	tag: string,
	zeitraeume: { von: number; bis: number; art: 'reservierung' | 'sperre' }[],
	nachtPruefen: (minute: number) => boolean
): Ringsegment['fuellung'] {
	const zeitpunkt = zeitpunktFuer(tag, minute);
	let beste: Ringsegment['fuellung'] = nachtPruefen(minute) ? 'nacht' : 'frei';

	for (const z of zeitraeume) {
		if (zeitpunkt < z.von || zeitpunkt >= z.bis) continue;
		if (RANG[z.art] > RANG[beste]) beste = z.art;
	}

	return beste;
}

/**
 * Ein Zeitstempel aus Ortstag und Minute (Bruchteile erlaubt).
 *
 * Bewusst ueber die Ortszeit-Deutung aus `zeit.ts` und nicht ueber
 * `new Date(jahr, monat, ...)`: Letzteres naehme die Zone des Geraets — und
 * ein Telefon in Spanien zeigte einen anderen Ring (T-11).
 */
function zeitpunktFuer(tag: string, minute: number): number {
	const gesamtSekunden = Math.round(minute * 60);
	const stunde = Math.trunc(gesamtSekunden / 3600);
	const rest = gesamtSekunden - stunde * 3600;
	const zweistellig = (n: number) => String(n).padStart(2, '0');
	const uhrzeit = `${zweistellig(stunde)}:${zweistellig(Math.trunc(rest / 60))}:${zweistellig(rest % 60)}`;
	return ortszeitZuZeitpunkt(`${tag} ${uhrzeit}`).getTime();
}

/**
 * Prueft, ob eine Minute des Tages in die Dunkelheit faellt.
 *
 * Mit Sonnenzeiten: alles vor Sonnenaufgang und ab Sonnenuntergang. Ohne:
 * Rueckfall auf 21:00/06:00 (T-06a). Der Unterschied ist im Dezember
 * betraechtlich — dann ist der Nachmittag ab 15:57 dunkel, obwohl die
 * Skalennaht erst bei 21:00 liegt.
 */
function nachtPruefer(sonnenzeiten: Sonnenzeiten | null): (minute: number) => boolean {
	if (sonnenzeiten === null) {
		return (minute) => minute >= NACHT_BEGINN || minute < NACHT_ENDE;
	}

	const aufgang = minuteDesTages(new Date(sonnenzeiten.aufgang));
	const untergang = minuteDesTages(new Date(sonnenzeiten.untergang));
	return (minute) => minute < aufgang || minute >= untergang;
}

/** Gleichfarbige Nachbarn zu einem Segment verschmelzen (T-09). */
function zusammenfassen(zellen: Ringsegment['fuellung'][]): Ringsegment[] {
	const segmente: Ringsegment[] = [];

	for (let grad = 0; grad < zellen.length; grad++) {
		const fuellung = zellen[grad]!;
		const letztes = segmente[segmente.length - 1];
		if (letztes && letztes.fuellung === fuellung) {
			letztes.bisGrad = grad + 1;
		} else {
			segmente.push({ vonGrad: grad, bisGrad: grad + 1, fuellung });
		}
	}

	// Der Ring ist geschlossen: Haben erstes und letztes Segment dieselbe
	// Fuellung, sind sie in Wahrheit eines — sonst zeigte der Ring bei 0° eine
	// Naht, die es nicht gibt.
	if (segmente.length > 1) {
		const erstes = segmente[0]!;
		const letztes = segmente[segmente.length - 1]!;
		if (erstes.fuellung === letztes.fuellung) {
			erstes.vonGrad = letztes.vonGrad - 360;
			segmente.pop();
		}
	}

	return segmente;
}

/** Die drei Marker des Rings — `null`, wo die Grundlage fehlt (T-12). */
export interface Markerwinkel {
	sonnenaufgang: number | null;
	sonnenuntergang: number | null;
	jetzt: number;
}

/**
 * Die Markerwinkel.
 *
 * Die beiden Sonnenmarker sitzen **genau auf der Farbkante**. Das ist gewollt
 * und der Grund, warum sie ueberhaupt tragen: Sie benennen die Kante, die man
 * ohnehin sieht, und machen sie ablesbar, auch wenn die beiden Gruentoene im
 * hellen Sonnenlicht auf dem Telefon verschwimmen.
 */
export function markerwinkel(
	bezugszeitpunkt: Date,
	sonnenzeiten: Sonnenzeiten | null
): Markerwinkel {
	return {
		sonnenaufgang: sonnenzeiten
			? winkelFuerMinute(minuteDesTages(new Date(sonnenzeiten.aufgang)))
			: null,
		sonnenuntergang: sonnenzeiten
			? winkelFuerMinute(minuteDesTages(new Date(sonnenzeiten.untergang)))
			: null,
		jetzt: winkelFuerMinute(minuteDesTages(bezugszeitpunkt))
	};
}
