import { durchgang, type Env } from './abruf.js';

/**
 * Der Abruf-Worker.
 *
 * Er hat bewusst **keine** eigene Adresse: Ausgeloest wird er nur vom
 * Zeitplan. Was niemand aufrufen kann, kann auch niemand missbrauchen — und er
 * traegt als einziger die Zugangsdaten des Vereins (research.md, E-07).
 *
 * **Diese Datei darf ausser dem Standard-Export nichts benannt ausfuehren.**
 * Die Workers-Laufzeit deutet jeden benannten Export als Einstiegspunkt und
 * verweigert sonst den Start. Alles Uebrige liegt in `abruf.ts`.
 */
export default {
	async scheduled(_ereignis: ScheduledController, env: Env): Promise<void> {
		const stand = await durchgang(env);
		console.log(
			`Abruf erfolgreich: ${stand.reservierungen.length} Reservierungen, ` +
				`${stand.verworfeneEintraege} verworfen, ` +
				`${stand.neuanmeldungen} Neuanmeldungen heute`
		);
	}
} satisfies ExportedHandler<Env>;
