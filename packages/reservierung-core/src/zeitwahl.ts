import { zeitraeumeFuer, type Zeitraum } from './belegung.js';
import { BALKEN_BIS, BALKEN_VON } from './segmente.js';
import type {
	Konflikt,
	Luecke,
	Rahmen,
	Reservierung,
	Wahlmodus,
	Zeitfenster,
	Zeitwahlfenster
} from './typen.js';
import { alsIsoMitVersatz, minuteDesTages, ortstag, zeitpunktFuerMinute } from './zeit.js';

/**
 * Die Zeitwahl: was jemand waehlen darf und was daraus folgt.
 *
 * Dieses Modul beantwortet eine andere Frage als `segmente.ts`. Dort geht es
 * um "wie stelle ich dar, was da ist"; hier um "was darf jemand waehlen, und
 * was heisst seine Wahl". Zwei Fragen, zwei Dateien — auch wenn beide mit
 * Balken zu tun haben.
 *
 * ## Warum das hier steht und nicht in der Oberflaeche
 *
 * Der Gestaltungs-Handoff nennt als haeufigste Fehlerquelle seines eigenen
 * Prototyps die Gesten-Regeln: welche Kante beim Ziehen stehen bleibt, wann
 * das Ende nachrueckt, wo ein Block stoppt. Das sind Regeln ueber Zahlen. Am
 * DOM geprueft heisst: gar nicht geprueft. Hier geprueft heisst: einmal
 * hingeschrieben, fuer beide Zugangswege (Constitution, Prinzip IV).
 *
 * Deshalb bekommt keine Funktion hier eine Zeigerposition, ein Rechteck oder
 * einen Scrollstand zu sehen. Sie bekommen Minuten. Was eine Zeigerposition zu
 * einer Minute macht, ist eine lineare Abbildung ohne Fachlogik und bleibt in
 * der Komponente, weil ihre Eingabe ein `DOMRect` ist.
 *
 * ## Die Zeitform
 *
 * Gerechnet wird in **Tagesminuten** — Minuten seit Ortsmitternacht. An der
 * Grenze zu echten Belegungen und zum Absprung wird ueber
 * `zeitpunktFuerMinute` umgerechnet; das ist die eine Stelle, die seit Feature
 * 052 fuer die Zeitumstellung geprueft ist. Eine zweite waere nicht mehr lange
 * richtig.
 */

/** Die Aufloesung, in der geflogen und gebucht wird. */
export const RASTER = 15;

/** Kuerzer geht nicht — ein Fenster von null Minuten ist keine Wahl. */
export const MINDESTDAUER = 15;

/**
 * Worauf das Ende springt, wenn der Beginn es ueberholt.
 *
 * 30 statt 15 Minuten, weil das Ueberholen ein Versehen ist und die Korrektur
 * benutzbar sein soll: Ein Fenster von einer Viertelstunde muesste sofort
 * wieder verlaengert werden.
 */
export const NACHRUECKDAUER = 30;

/** Was ein Tipp vorschlaegt, solange die Luecke es hergibt. */
export const VORSCHLAGSDAUER = 120;

/**
 * Der Flugtag 06:00–22:00.
 *
 * Abgeleitet aus `segmente.ts` und nicht neu hingeschrieben: Zwei Stellen mit
 * "06:00" waeren zwei Stellen, an denen sich das aendern kann — und die
 * Anzeige zeigte dann einen anderen Tag, als der Waehler zulaesst.
 */
export const RAHMEN: Rahmen = { von: BALKEN_VON, bis: BALKEN_BIS };

/**
 * Auf das Raster runden.
 *
 * Bewusst **ohne** Beschneidung: Was ausserhalb liegt, weiss die aufrufende
 * Funktion, weil sie ihren Rahmen kennt. Eine Rundung, die zugleich
 * beschneidet, muesste ihn auch kennen und waere an jeder zweiten Stelle die
 * falsche.
 */
export function aufRaster(minute: number): number {
	// Das `+ 0` macht aus der negativen Null eine gewoehnliche. Sie ist in JS
	// eine eigene Zahl, und `-0` als Uhrzeit gaebe irgendwann `-0:00`.
	return Math.round(minute / RASTER) * RASTER + 0;
}

/** Aufwaerts auf das Raster — fuer Untergrenzen, die nicht zurueckfallen duerfen. */
function aufwaerts(minute: number): number {
	return Math.ceil(minute / RASTER) * RASTER;
}

function begrenzen(wert: number, unten: number, oben: number): number {
	return Math.min(Math.max(wert, unten), oben);
}

/**
 * Die freien Abschnitte eines Ortstages innerhalb des Rahmens.
 *
 * `abMinute` trennt zwei Fragen, die leicht verwechselt werden:
 *
 * - **Ohne** — was ist an diesem Tag ueberhaupt frei? Das ist der Bezug fuer
 *   "👍 Frei 09:00–14:00" und fuer die Ausweichsuche. Vergangenes zaehlt mit,
 *   denn rueckwirkend eintragen ist erlaubt.
 * - **Mit** — was steht noch bevor? Das ist der Bezug fuer Vorschlaege. Eine
 *   Luecke, die vor einer Stunde begann, ist kein Vorschlag.
 *
 * Aufgerundet wird die Untergrenze, nicht gerundet: Abgerundet schluege die
 * Anzeige eine Zeit vor, die schon vorbei ist.
 *
 * Sperren und Reservierungen sind hier gleichwertig — beides ist nicht frei.
 * Der Unterschied faellt erst beim Modus ins Gewicht.
 */
export function luecken(
	reservierungen: readonly Reservierung[],
	kennung: string,
	tag: string,
	abMinute?: number,
	rahmen: Rahmen = RAHMEN
): Luecke[] {
	const von = abMinute === undefined ? rahmen.von : Math.max(rahmen.von, aufwaerts(abMinute));
	const bis = rahmen.bis;
	if (von >= bis) return [];

	const belegt = tagesanteile(reservierungen, kennung, tag, von, bis);

	const frei: Luecke[] = [];
	let stand = von;
	for (const z of belegt) {
		if (z.von > stand) frei.push({ von: stand, bis: z.von });
		stand = Math.max(stand, z.bis);
	}
	if (stand < bis) frei.push({ von: stand, bis });

	return frei.filter((l) => l.bis - l.von >= MINDESTDAUER);
}

/**
 * Die Belegungen eines Tages als Minutenspannen, auf `[von, bis]` gekuerzt.
 *
 * Gekuerzt wird **hier**, bei der Auswertung, und nie an den Daten (E-06 aus
 * 054): Eine Reservierung von gestern 22:00 bis heute 02:00 ist ein Eintrag,
 * der heute bis 02:00 reicht — und die Aussage "belegt bis 02:00" steht
 * anderswo auf derselben Seite.
 */
function tagesanteile(
	reservierungen: readonly Reservierung[],
	kennung: string,
	tag: string,
	von: number,
	bis: number
): { von: number; bis: number; art: Zeitraum['art'] }[] {
	const mitternacht = zeitpunktFuerMinute(tag, 0).getTime();

	return zeitraeumeFuer([...reservierungen], kennung)
		.map((z) => ({
			von: Math.max((z.von - mitternacht) / 60_000, von),
			bis: Math.min((z.bis - mitternacht) / 60_000, bis),
			art: z.art
		}))
		.filter((z) => z.bis > z.von)
		.sort((a, b) => a.von - b.von);
}

/**
 * Das Fenster, das ein Tipp an dieser Stelle ergibt.
 *
 * Passt die volle Dauer nicht mehr ans Ende der Luecke, **rueckt der Beginn
 * nach vorn** — die Dauer wird nicht gekuerzt. Wer um 13:30 in eine Luecke
 * tippt, die um 14:00 endet, wollte zwei Stunden fliegen und nicht dreissig
 * Minuten; die naheliegende Lesart ist, dass er die Stelle grob getroffen hat.
 * Erst wenn die Luecke selbst kuerzer als zwei Stunden ist, wird das Fenster
 * kuerzer.
 */
export function fensterIn(luecke: Luecke, minute: number): Zeitwahlfenster {
	const dauer = Math.min(VORSCHLAGSDAUER, luecke.bis - luecke.von);
	const von = begrenzen(aufRaster(minute), luecke.von, luecke.bis - dauer);
	return { von, bis: von + dauer };
}

/** Welche Kante gezogen wird. */
export type Kante = 'start' | 'ende';

/**
 * Eine Kante ziehen: die Dauer aendert sich, die Gegenkante bleibt stehen.
 *
 * `minute` ist die **gewuenschte Zeit**, nicht die Zeigerposition — den
 * Griff-Abstand hat die Geste schon abgezogen. Sonst muesste dieses Modul
 * wissen, wo jemand hingefasst hat, und liesse sich nicht mehr ohne Zeigegeraet
 * pruefen.
 */
export function zieheKante(
	fenster: Zeitwahlfenster,
	rahmen: Rahmen,
	kante: Kante,
	minute: number
): Zeitwahlfenster {
	const ziel = aufRaster(minute);

	if (kante === 'start') {
		return { von: begrenzen(ziel, rahmen.von, fenster.bis - MINDESTDAUER), bis: fenster.bis };
	}
	return { von: fenster.von, bis: begrenzen(ziel, fenster.von + MINDESTDAUER, rahmen.bis) };
}

/**
 * Den Block verschieben: die Dauer bleibt, der Block **stoppt** am Rahmenrand.
 *
 * Stoppen, nicht kuerzen und nicht umbrechen: Ein Block, der am Tagesende
 * schrumpft, aendert die Dauer, ohne dass jemand eine Kante angefasst hat; einer,
 * der in den naechsten Tag laeuft, verlaesst den Tag, den der Waehler zeigt.
 */
export function verschiebeBlock(
	fenster: Zeitwahlfenster,
	rahmen: Rahmen,
	minute: number
): Zeitwahlfenster {
	const dauer = fenster.bis - fenster.von;
	const von = begrenzen(aufRaster(minute), rahmen.von, rahmen.bis - dauer);
	return { von, bis: von + dauer };
}

/**
 * Den Beginn setzen: das Ende bleibt stehen.
 *
 * Das ist die Regel, die am ehesten ueberrascht und trotzdem die richtige ist:
 * Wer den Beginn aendert, will frueher oder spaeter losfliegen — nicht laenger
 * oder kuerzer. Die Dauer folgt daraus, sie fuehrt nicht.
 *
 * Nur wenn der Beginn das Ende ueberholt, muss das Ende nachziehen; dann auf
 * `NACHRUECKDAUER`, damit das Ergebnis benutzbar bleibt.
 *
 * `ziel` wird gerastert, obwohl `kachelZiel` es bereits gerastert liefert. Die
 * Zusicherung "jede Wahl liegt auf dem Raster" (SC-002) soll der Funktion
 * gehoeren und nicht der Sorgfalt ihrer Aufrufer — sonst gilt sie nur so lange,
 * bis jemand einen dritten Weg hinzufuegt.
 */
export function beginnSetzen(
	fenster: Zeitwahlfenster,
	rahmen: Rahmen,
	ziel: number
): Zeitwahlfenster {
	const von = begrenzen(aufRaster(ziel), rahmen.von, rahmen.bis - NACHRUECKDAUER);
	const bis =
		fenster.bis >= von + MINDESTDAUER ? fenster.bis : Math.min(rahmen.bis, von + NACHRUECKDAUER);
	return { von, bis };
}

/** Das Ende setzen: der Beginn bleibt stehen. Rastert wie `beginnSetzen`. */
export function endeSetzen(
	fenster: Zeitwahlfenster,
	rahmen: Rahmen,
	ziel: number
): Zeitwahlfenster {
	return {
		von: fenster.von,
		bis: begrenzen(aufRaster(ziel), fenster.von + MINDESTDAUER, rahmen.bis)
	};
}

/**
 * Die volle Stunde, in der eine Tagesminute liegt.
 *
 * Eine Zeile, und sie steht trotzdem hier: Die Kachelspalte fragt "ist das
 * meine Stunde?", der Nachfuehrer fragt "welche Stunde soll sichtbar sein?" —
 * beides Aussagen ueber Minuten. Adapter duerfen die Zahlen des Kerns anzeigen,
 * aber nicht selbst mit ihnen rechnen (C-03); eine Oberflaeche, die still
 * abrundet, ist genau die zweite Wahrheit, die Prinzip IV ausschliesst.
 */
export function stundeVon(minute: number): number {
	return Math.floor(minute / 60);
}

/** Welche der vier Kachelspalten gemeint ist. */
export type Kachelart = 'beginn' | 'ende';
/** Stundenspalte oder Minutenspalte. */
export type Kacheleinheit = 'stunde' | 'minute';

/**
 * Welche Minute eine Kachel meint.
 *
 * Die beiden Spalten sind **unabhaengig**: Eine Stundenkachel behaelt die
 * aktuelle Minute, eine Minutenkachel die aktuelle Stunde. Andernfalls muesste
 * man zweimal tippen, um von 09:20 auf 14:20 zu kommen — und der zweite Tipp
 * machte den ersten zunichte.
 */
export function kachelZiel(
	fenster: Zeitwahlfenster,
	art: Kachelart,
	einheit: Kacheleinheit,
	wert: number
): number {
	const aktuell = art === 'beginn' ? fenster.von : fenster.bis;
	return einheit === 'stunde' ? wert * 60 + (aktuell % 60) : stundeVon(aktuell) * 60 + wert;
}

/** Laesst sich diese Kachel waehlen? */
export function kachelMoeglich(
	fenster: Zeitwahlfenster,
	rahmen: Rahmen,
	art: Kachelart,
	ziel: number
): boolean {
	if (art === 'beginn') return ziel >= rahmen.von && ziel <= rahmen.bis - NACHRUECKDAUER;
	return ziel >= fenster.von + MINDESTDAUER && ziel <= rahmen.bis;
}

/**
 * Welche Dauer diese Kachel ergaebe.
 *
 * Gerechnet ueber dieselben Setzfunktionen, die der Tipp ausloesen wuerde —
 * nicht ueber eine zweite Formel. Sonst zeigte die Vorschau irgendwann etwas
 * anderes als das Ergebnis, und zwar genau in den Grenzfaellen, in denen man
 * sie braucht (FR-034).
 */
export function kachelDauer(
	fenster: Zeitwahlfenster,
	rahmen: Rahmen,
	art: Kachelart,
	ziel: number
): number {
	const neu =
		art === 'beginn' ? beginnSetzen(fenster, rahmen, ziel) : endeSetzen(fenster, rahmen, ziel);
	return neu.bis - neu.von;
}

/**
 * Was im gewaehlten Fenster schon steht.
 *
 * Ueberschneidung, nicht Beruehrung: Eine Reservierung, die um 11:00 endet,
 * kollidiert nicht mit einem Fenster ab 11:00 — dieselbe Grenze wie ueberall
 * im Haus (Z-01 aus 054).
 */
export function konflikte(
	reservierungen: readonly Reservierung[],
	kennung: string,
	tag: string,
	fenster: Zeitwahlfenster
): Konflikt[] {
	const mitternacht = zeitpunktFuerMinute(tag, 0).getTime();
	const beginn = mitternacht + fenster.von * 60_000;
	const ende = mitternacht + fenster.bis * 60_000;
	const tagesende = zeitpunktFuerMinute(tag, 1440).getTime();

	return zeitraeumeFuer([...reservierungen], kennung)
		.filter((z) => z.von < ende && z.bis > beginn)
		.map((z) => {
			const frueher = z.von <= mitternacht;
			const spaeter = z.bis >= tagesende;
			const wort = z.art === 'sperre' ? 'gesperrt' : 'reserviert';

			if (frueher && spaeter) return { art: z.art, text: `ganztägig ${wort}` };

			const vonUhr = frueher
				? '00:00'
				: alsUhrzeitAusMinute((z.von - mitternacht) / 60_000);
			const bisUhr = spaeter ? '24:00' : alsUhrzeitAusMinute((z.bis - mitternacht) / 60_000);
			return { art: z.art, text: `${vonUhr}–${bisUhr}: ${wort}` };
		});
}

/**
 * Welcher der vier Modi gilt. Die Reihenfolge der Pruefung **ist** die Regel.
 *
 * Nachtrag vor Sperre: Auf eine Zeit, die vorbei ist, wartet niemand mehr, und
 * was gestern war, laesst sich heute nicht mehr verhindern. Rueckwirkend
 * eintragen ist eine Buchfuehrungshandlung, keine Verfuegbarkeitsfrage — und
 * eine Oberflaeche, die es verboete, erfaende eine Regel.
 *
 * Sperre vor Reservierung: dieselbe Rangfolge wie in `segmente.ts` (T-07) und
 * `zustand.ts` (Z-03). Eine gesperrte Maschine ist womoeglich zerlegt; das ist
 * die weiter reichende Nachricht.
 */
export function modusFuer(
	fenster: Zeitwahlfenster,
	tag: string,
	gefundeneKonflikte: readonly Konflikt[],
	bezugszeitpunkt: Date
): Wahlmodus {
	const heute = ortstag(bezugszeitpunkt) === tag;
	if (heute && fenster.von < minuteDesTages(bezugszeitpunkt)) return 'nachtrag';
	if (gefundeneKonflikte.some((k) => k.art === 'sperre')) return 'gesperrt';
	if (gefundeneKonflikte.length > 0) return 'warteliste';
	return 'frei';
}

/**
 * Was stattdessen frei waere.
 *
 * Gesucht wird ab dem gewaehlten **Ende**, nicht ab jetzt: Wer 14:00 waehlt und
 * auf eine Belegung stoesst, will einen Vorschlag in der Naehe seiner Absicht.
 * Der fruehestmoegliche des Tages beantwortet eine Frage, die niemand gestellt
 * hat.
 */
export function ausweichluecke(
	freie: readonly Luecke[],
	fenster: Zeitwahlfenster
): Luecke | null {
	return (
		freie.find((l) => l.von >= fenster.bis) ??
		freie.find((l) => l.bis > fenster.von) ??
		freie[0] ??
		null
	);
}

function zwei(n: number): string {
	return String(n).padStart(2, '0');
}

/**
 * Eine Tagesminute als Uhrzeit.
 *
 * `1440` wird zu `24:00`, nicht zu `00:00` — dieselbe Regel wie in
 * `tagesbelegungen`: `00:00` waere derselbe Punkt auf der Uhr und die falsche
 * Aussage, naemlich dass etwas endet, wo der Tag beginnt.
 */
export function alsUhrzeitAusMinute(minute: number): string {
	const gerundet = Math.round(minute);
	return `${zwei(Math.floor(gerundet / 60))}:${zwei(gerundet % 60)}`;
}

/**
 * Eine Dauer in Minuten als Wort: `45 min` · `2 h` · `2:15 h`.
 *
 * **Neben `alsDauer` in `formulieren.ts`, nicht an dessen Stelle.** Jenes
 * liefert `3,5 h` mit Dezimalkomma und steht in "Kommende Belegungen", wo
 * Dauern verglichen werden; dieses liefert die Uhrzeitform und steht als Pille
 * neben `11:30–13:30`, wo sie sich anschliesst. Der erste Entwurf dieses
 * Features wollte beide zusammenlegen — beim Nachsehen war es gar nicht
 * dieselbe Ausgabe, sondern zwei, die an ihrem jeweiligen Ort richtig sind.
 */
export function alsDauerwort(minuten: number): string {
	const m = Math.max(0, Math.round(minuten));
	if (m < 60) return `${m} min`;
	if (m % 60 === 0) return `${m / 60} h`;
	return `${Math.floor(m / 60)}:${zwei(m % 60)} h`;
}

/**
 * Der Satz unter dem Zeitfenster: was das gewaehlte Fenster antrifft.
 *
 * Die Emoji tragen Bedeutung mit, ersetzen aber keinen Text (NFR-004) — wer
 * sie nicht sieht, liest "Ueberschneidet" bzw. "Frei" und weiss dasselbe.
 */
export function alsLueckensatz(
	fenster: Zeitwahlfenster,
	freie: readonly Luecke[],
	gefundeneKonflikte: readonly Konflikt[]
): string {
	if (gefundeneKonflikte.length > 0) {
		return `🙅 Überschneidet ${gefundeneKonflikte.map((k) => k.text).join(' · ')}`;
	}

	const eigene = freie.find((l) => fenster.von >= l.von && fenster.von < l.bis);
	if (!eigene) return '👍 Frei';
	return `👍 Frei ${alsUhrzeitAusMinute(eigene.von)}–${alsUhrzeitAusMinute(eigene.bis)}`;
}

/**
 * Aus Ortstag und Tagesminuten das ISO-Paar, das `reservierungsVerweis`
 * erwartet.
 *
 * Der einzige Uebergang zwischen den beiden Zeitformen dieses Features — und
 * er geht ueber `zeitpunktFuerMinute`, nicht ueber eigene Datumsarithmetik.
 * Damit gilt der Absprung ohne eine einzige neue Zeile in
 * `reservierungs-verweis.ts`: Der Waehler liefert nur ein anderes Fenster als
 * bisher der Kernvorschlag.
 */
export function alsWahlfenster(tag: string, fenster: Zeitwahlfenster): Zeitfenster {
	return {
		von: alsIsoMitVersatz(zeitpunktFuerMinute(tag, fenster.von)),
		bis: alsIsoMitVersatz(zeitpunktFuerMinute(tag, fenster.bis))
	};
}
