import { belegungsauskunft } from '@edsh-bucky/reservierung-core';
import { standHolen } from '../../../lib/server/stand-holen.js';

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
	// Der zweistufige Beschaffungsweg liegt seit Feature 054 in
	// `stand-holen.ts` — dieselbe Quelle wie fuer `/api/flotte` (E-07).
	// Am Vertrag dieser Route aendert das nichts: Sie liefert Wort fuer Wort
	// dieselbe Antwort wie zuvor.
	const { stand, quelle } = await standHolen(platform);

	if (stand === null) return antwort({ stand: 'fehlt', quelle });

	const auskunft = belegungsauskunft(stand, KENNUNG, new Date());
	return antwort({ stand: 'vorhanden', quelle, ...auskunft });
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

