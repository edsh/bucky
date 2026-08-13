import { belegungsauskunft, type Abrufstand, type Quelle } from '@edsh-bucky/reservierung-core';
import { kalenderHolen } from '../../../lib/server/kalender-holen.js';

/**
 * Die Auskunft ueber den Reservierungsstand.
 *
 * Seit Feature 052 in zwei Stufen: zuerst der Kalender-Weg (Echtzeit), bei
 * jedem Fehlschlag der Ruecksprung auf den bestehenden Zwischenspeicher
 * (contracts/api-reservierung.md). Diese Route **rechnet** in beiden Faellen
 * nicht selbst — sie uebergibt an den Kern und reicht dessen Ergebnis durch
 * (Constitution, Prinzip IV).
 *
 * Sie holt beim Kalender-Weg **lesend** bei Vereinsflieger; das kostet kein
 * Kontingent der Programmierschnittstelle und ist durch eine kurzlebige
 * Ablage vor Ueberlastung geschuetzt (research.md E-08) — unabhaengig davon
 * bleibt diese Antwort an den Browser stets `no-store`.
 */

/**
 * Der Rest der Anwendung wird vorgerendert (`+layout.ts`). Diese Route darf es
 * nicht: Ihre Antwort haengt am Zwischenspeicher und am Zeitpunkt der Frage.
 */
export const prerender = false;

/** Vorerst zeigt die Anwendung nur dieses eine Flugzeug (data-model.md). */
const KENNUNG = 'D-EELK';

export async function GET({ platform }: { platform?: App.Platform }): Promise<Response> {
	try {
		const { reservierungen } = await kalenderHolen(platform?.env?.KALENDER_ABO_URL);
		const stand: Abrufstand = {
			abgerufenAm: new Date().toISOString(),
			reservierungen,
			verworfeneEintraege: 0,
			neuanmeldungen: 0
		};
		const auskunft = belegungsauskunft(stand, KENNUNG, new Date());
		return antwort({ stand: 'vorhanden', quelle: 'kalender' satisfies Quelle, ...auskunft });
	} catch {
		// Jeder Fehlschlag des Kalender-Wegs (Netz, Zeitueberschreitung, kein
		// gueltiger Kalender, HTTP-Fehler) faellt auf den Zwischenspeicher
		// zurueck — nie auf "frei" (FR-008). Dieser Fehlschlag schreibt
		// nichts in den KV-Speicher (FR-006).
		return rueckfall(platform);
	}
}

async function rueckfall(platform?: App.Platform): Promise<Response> {
	const speicher = platform?.env?.RESERVIERUNGEN;
	const roh = speicher ? await speicher.get('stand') : null;

	// Kein Stand ist ein gueltiges Ergebnis, kein Ausfall (Vertrag Fall 2).
	// Deshalb 200 und nicht 503: Die Anzeige soll es offen sagen koennen, ohne
	// einen Fehlerfall behandeln zu muessen — und vor allem, ohne daraus
	// "frei" zu machen (FR-010).
	if (roh === null) return antwort({ stand: 'fehlt', quelle: 'rueckfall' satisfies Quelle });

	let stand: Abrufstand;
	try {
		stand = JSON.parse(roh) as Abrufstand;
	} catch {
		// Ein unlesbarer Eintrag ist dasselbe wie keiner. Ihn zu erraten waere
		// schlimmer als zuzugeben, dass gerade keine Auskunft moeglich ist.
		return antwort({ stand: 'fehlt', quelle: 'rueckfall' satisfies Quelle });
	}

	const auskunft = belegungsauskunft(stand, KENNUNG, new Date());
	return antwort({ stand: 'vorhanden', quelle: 'rueckfall' satisfies Quelle, ...auskunft });
}

function antwort(inhalt: unknown): Response {
	return new Response(JSON.stringify(inhalt), {
		headers: {
			'content-type': 'application/json; charset=utf-8',
			// **Nicht zwischenspeichern.** Das ist keine Vorsichtsmassnahme,
			// sondern die Lehre aus einem echten Fehler: Die Zone
			// `bucky.edsh.de` schrieb ein urspruengliches `max-age=60` auf ein
			// Jahr um und legte die Antwort am Rand ab. Wer in den Minuten
			// direkt nach einer Veroeffentlichung eine 404 erwischte, bekam
			// sie danach dauerhaft serviert — die Seite meldete „kein
			// Reservierungsstand verfuegbar", waehrend der Speicher gefuellt
			// war.
			//
			// Eine Auskunft, die alle zehn Minuten wechselt und deren Alter
			// Teil der Aussage ist (FR-009), darf ohnehin nicht eingefroren
			// werden. Ein KV-Lesevorgang je Aufruf ist der Preis dafuer; das
			// Kontingent bei Vereinsflieger bleibt unberuehrt (SC-003).
			//
			// **Abgrenzung** (research.md E-08): Diese Kopfzeile betrifft nur
			// die Antwort an den Browser. Die 30-Sekunden-Ablage in
			// `kalender-holen.ts` betrifft ausschliesslich den Abruf bei
			// Vereinsflieger — die Verwechslung beider ist der Fehler, der
			// schon einmal passiert ist.
			'cache-control': 'no-store, no-cache, must-revalidate, max-age=0'
		}
	});
}

