/**
 * Der Kern des Reservierungsstands.
 *
 * UI-frei und laufzeitfrei: Diese Dateien wissen nichts von SvelteKit, nichts
 * von Cloudflare und nichts vom Netz. Beide Zugangswege — der Abruf-Worker und
 * die Server-Route der Weboberflaeche — benutzen genau diesen Kern und rechnen
 * nicht selbst (Constitution, Prinzip IV).
 */

export { antwortDeuten } from './antwort-deuten.js';
export { belegungsauskunft } from './belegung.js';
export { alsAltersangabe, alsSatz } from './formulieren.js';
export { alterInWorten, alterMs, istVeraltet, VERFALLSGRENZE_MS } from './verfall.js';
export {
	alsIso,
	alsIsoMitVersatz,
	alsUhrzeit,
	alsWochentagDatumUhrzeit,
	gleicherTag,
	ortszeitZuZeitpunkt,
	ZONE
} from './zeit.js';
export type {
	Abrufstand,
	Belegungsart,
	Belegungsauskunft,
	Deutungsergebnis,
	Quelle,
	Reservierung,
	Wechselziel
} from './typen.js';
