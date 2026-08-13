/// <reference types="@sveltejs/kit" />

/**
 * Was die Laufzeit unter der Anwendung bereitstellt.
 *
 * Bis Feature 047 kam die Anwendung ohne aus: Sie wurde vollstaendig
 * vorgerendert und rechnete nur im Browser. Die Reservierungsauskunft braucht
 * erstmals etwas, das nur der Server hat — den Zwischenspeicher, den der
 * Abruf-Worker fuellt.
 */
declare global {
	namespace App {
		interface Platform {
			env?: {
				/**
				 * Derselbe Namensraum, den `apps/reservierungs-abruf` beschreibt.
				 * Hier wird ausschliesslich **gelesen**: Die Weboberflaeche kennt
				 * die Zugangsdaten der Gegenstelle nicht und soll sie nicht
				 * kennen (research.md, E-07).
				 */
				RESERVIERUNGEN?: KVNamespace;
				/**
				 * Die geheime Kalender-Abo-Adresse (Feature 052, research.md
				 * E-06). Wird ausschliesslich in `lib/server/kalender-holen.ts`
				 * gelesen — SvelteKit nimmt Dateien aus `lib/server/` nicht in
				 * das Browserbuendel auf.
				 */
				KALENDER_ABO_URL?: string;
			};
		}
	}
}

export {};
