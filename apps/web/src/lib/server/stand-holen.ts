import type { Abrufstand, Quelle } from '@edsh-bucky/reservierung-core';
import { kalenderHolen } from './kalender-holen.js';

/**
 * Der gemeinsame Weg zum Reservierungsstand: zuerst der Kalender (Echtzeit),
 * bei jedem Fehlschlag der Ruecksprung auf den Zwischenspeicher, und wenn auch
 * der nichts hergibt, ein ehrliches "kein Stand".
 *
 * Diese Datei entstand nicht, weil doppelter Code haesslich waere, sondern
 * weil die Frage "aus welcher Quelle stammt diese Auskunft?" nur an **einer**
 * Stelle im Haus beantwortet werden darf (contracts/api-flotte.md, E-07).
 * Zwei Routen mit je eigener Rueckfall-Logik laufen frueher oder spaeter
 * auseinander — und die Abweichung faellt genau dann auf, wenn Vereinsflieger
 * ausfaellt, also im ungeeignetsten Moment.
 *
 * Der Inhalt ist woertlich der bisherige Ablauf aus
 * `routes/api/reservierung/+server.ts` (Feature 052); es wurde nichts
 * hinzugefuegt und nichts weggelassen.
 */
export interface Standergebnis {
	/** Der Stand, oder `null`, wenn weder Kalender noch Speicher etwas hergaben. */
	stand: Abrufstand | null;
	/** Aus welcher Quelle er stammt — bei `null` immer `'rueckfall'`. */
	quelle: Quelle;
}

export async function standHolen(platform?: App.Platform): Promise<Standergebnis> {
	try {
		const { reservierungen } = await kalenderHolen(platform?.env?.KALENDER_ABO_URL);
		return {
			stand: {
				abgerufenAm: new Date().toISOString(),
				reservierungen,
				verworfeneEintraege: 0,
				neuanmeldungen: 0
			},
			quelle: 'kalender'
		};
	} catch {
		// Jeder Fehlschlag des Kalender-Wegs (Netz, Zeitueberschreitung, kein
		// gueltiger Kalender, HTTP-Fehler) faellt auf den Zwischenspeicher
		// zurueck — nie auf "frei" (FR-008). Dieser Fehlschlag schreibt
		// nichts in den KV-Speicher (FR-006).
		return rueckfall(platform);
	}
}

async function rueckfall(platform?: App.Platform): Promise<Standergebnis> {
	const speicher = platform?.env?.RESERVIERUNGEN;
	const roh = speicher ? await speicher.get('stand') : null;

	// Kein Stand ist ein gueltiges Ergebnis, kein Ausfall. Die Route macht
	// daraus eine 200 mit `stand: 'fehlt'` — und vor allem kein "frei"
	// (FR-010, F-03).
	if (roh === null) return { stand: null, quelle: 'rueckfall' };

	try {
		return { stand: JSON.parse(roh) as Abrufstand, quelle: 'rueckfall' };
	} catch {
		// Ein unlesbarer Eintrag ist dasselbe wie keiner. Ihn zu erraten waere
		// schlimmer als zuzugeben, dass gerade keine Auskunft moeglich ist.
		return { stand: null, quelle: 'rueckfall' };
	}
}
