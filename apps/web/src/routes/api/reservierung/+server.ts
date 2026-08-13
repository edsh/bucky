import { belegungsauskunft, type Abrufstand } from '@edsh-bucky/reservierung-core';

/**
 * Die Auskunft ueber den Reservierungsstand.
 *
 * Diese Route **rechnet nicht**. Sie liest den Zwischenspeicher, uebergibt ihn
 * mitsamt dem Jetzt-Zeitpunkt an den Kern und reicht dessen Ergebnis durch
 * (Constitution, Prinzip IV; contracts/reservierungsstand.md, "Wer rechnet
 * was").
 *
 * Sie holt insbesondere **nichts** bei Vereinsflieger. Ein Aufruf der Seite
 * kostet kein Kontingent — sonst koennte ein einzelner Neulade-Finger den
 * Tagesvorrat des Vereins aufbrauchen (SC-003).
 */

/**
 * Der Rest der Anwendung wird vorgerendert (`+layout.ts`). Diese Route darf es
 * nicht: Ihre Antwort haengt am Zwischenspeicher und am Zeitpunkt der Frage.
 */
export const prerender = false;

/** Vorerst zeigt die Anwendung nur dieses eine Flugzeug (data-model.md). */
const KENNUNG = 'D-EELK';

export async function GET({ platform }: { platform?: App.Platform }): Promise<Response> {
	const speicher = platform?.env?.RESERVIERUNGEN;
	const roh = speicher ? await speicher.get('stand') : null;

	// Kein Stand ist ein gueltiges Ergebnis, kein Ausfall (Vertrag Fall 2).
	// Deshalb 200 und nicht 503: Die Anzeige soll es offen sagen koennen, ohne
	// einen Fehlerfall behandeln zu muessen — und vor allem, ohne daraus
	// "frei" zu machen (FR-010).
	if (roh === null) return antwort({ stand: 'fehlt' });

	let stand: Abrufstand;
	try {
		stand = JSON.parse(roh) as Abrufstand;
	} catch {
		// Ein unlesbarer Eintrag ist dasselbe wie keiner. Ihn zu erraten waere
		// schlimmer als zuzugeben, dass gerade keine Auskunft moeglich ist.
		return antwort({ stand: 'fehlt' });
	}

	const auskunft = belegungsauskunft(stand, KENNUNG, new Date());
	return antwort({ stand: 'vorhanden', ...auskunft });
}

function antwort(inhalt: unknown): Response {
	return new Response(JSON.stringify(inhalt), {
		headers: {
			'content-type': 'application/json; charset=utf-8',
			// Der Abruf laeuft alle zehn Minuten; laenger zu puffern hiesse,
			// eine Aussage laenger zu halten, als sie gilt.
			'cache-control': 'public, max-age=60'
		}
	});
}
