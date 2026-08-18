/**
 * Der Kern des Reservierungsstands.
 *
 * UI-frei und laufzeitfrei: Diese Dateien wissen nichts von SvelteKit, nichts
 * von Cloudflare und nichts vom Netz. Beide Zugangswege — der Abruf-Worker und
 * die Server-Route der Weboberflaeche — benutzen genau diesen Kern und rechnen
 * nicht selbst (Constitution, Prinzip IV).
 */

export { antwortDeuten } from './antwort-deuten.js';
export { belegungenImFenster, belegungsauskunft, endeDerKette, zeitraeumeFuer, type Zeitraum } from './belegung.js';
export { flotteBilden, kategorieFuer, STAMMLISTE } from './flotte.js';
export {
	alsAltersangabe,
	alsDauer,
	alsRueckfallHinweis,
	alsSatz,
	alsStatussatz,
	alsZusatzzeile
} from './formulieren.js';
export { kalenderDeuten } from './kalender-deuten.js';
export { alterInWorten, alterMs, istVeraltet, VERFALLSGRENZE_MS } from './verfall.js';
export {
	alsIso,
	alsIsoMitVersatz,
	alsKurzdatumUhrzeit,
	alsTagesdatum,
	alsUhrzeit,
	alsWochentagDatumUhrzeit,
	gleicherTag,
	minuteDesTages,
	ortstag,
	ortszeitZuZeitpunkt,
	ZONE
} from './zeit.js';
export {
	markerwinkel,
	minuteFuerWinkel,
	ringsegmente,
	winkelFuerMinute,
	type Markerwinkel
} from './tagesuhr.js';
export { zustandFuer } from './zustand.js';
export type {
	Abrufstand,
	Balkensegment,
	Belegungsart,
	Belegungsauskunft,
	Deutungsergebnis,
	Kategorie,
	Maschine,
	Maschinenzustand,
	Quelle,
	Reservierung,
	Ringsegment,
	Sonnenzeiten,
	Statuswert,
	Wechselziel,
	Zeitfenster
} from './typen.js';
