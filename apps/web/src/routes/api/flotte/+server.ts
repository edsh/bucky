import {
	belegungenImFenster,
	flotteBilden,
	istVeraltet,
	ortstag,
	ortszeitZuZeitpunkt,
	STAMMKENNUNGEN,
	type Quelle,
	type Sonnenzeiten
} from '@edsh-bucky/reservierung-core';
import { standHolen } from '../../../lib/server/stand-holen.js';

/**
 * Die Auskunft ueber die **ganze** Flotte (contracts/api-flotte.md).
 *
 * Sie nimmt denselben zweistufigen Beschaffungsweg wie `/api/reservierung`
 * (Kalender, dann Zwischenspeicher, dann ehrliches "kein Stand") und teilt
 * ihn sich mit jener Route ueber `stand-holen.ts` (E-07, F-02).
 *
 * Zwei Dinge, die diese Route bewusst **nicht** tut:
 *
 * 1. Sie rechnet keinen Zustand aus (F-01). Status, Farbe und Saetze bildet
 *    der Browser jede Minute neu — eine hier berechnete Aussage ueber "jetzt"
 *    waere schon beim Eintreffen eine Minute alt (E-09).
 * 2. Sie ruft keinen Wetterdienst (F-09). Die Sonnenzeiten holt der
 *    zeitgesteuerte Abruf-Worker einmal taeglich ins KV; diese Route liest
 *    hoechstens (Constitution, Prinzip V).
 */
export const prerender = false;

/**
 * Wie weit die Auskunft in die Zukunft reicht.
 *
 * Acht statt sieben Tage: Die Wochenansicht zeigt sieben **Tagesspalten**,
 * und die letzte davon braucht ihre Belegungen vollstaendig — auch die, die
 * in den achten Tag hineinragt.
 */
const FENSTER_TAGE = 8;

/**
 * Die abgelegten Sonnenzeiten — oder nichts.
 *
 * Gelesen wird nur; geholt hat sie der zeitgesteuerte Abruf-Worker (F-09,
 * Prinzip V). Jeder Fehlschlag endet hier in `undefined`: Fehlt das Feld,
 * entfallen die beiden Sonnenmarker und die Hell/Dunkel-Kante faellt auf
 * 21:00/06:00 zurueck (F-08). Ein ausgefallener Wetterdienst darf keine
 * Aussage ueber Verfuegbarkeit beeinflussen — und schon gar nicht diese
 * Route scheitern lassen.
 */
async function sonnenzeitenLesen(platform?: App.Platform): Promise<Sonnenzeiten[] | undefined> {
	const speicher = platform?.env?.RESERVIERUNGEN;
	if (!speicher) return undefined;

	try {
		const abgelegt = await speicher.get('sonnenzeiten', 'json');
		return Array.isArray(abgelegt) && abgelegt.length > 0
			? (abgelegt as Sonnenzeiten[])
			: undefined;
	} catch {
		return undefined;
	}
}

export async function GET({ platform }: { platform?: App.Platform }): Promise<Response> {
	const { stand, quelle } = await standHolen(platform);
	const sonnenzeiten = await sonnenzeitenLesen(platform);

	// Die Flotte haengt **nicht** am Abrufstand: Sie stammt aus der
	// Stammliste (E-01). Deshalb kann die Oberflaeche die Maschinen auch dann
	// zeigen, wenn keine Auskunft moeglich ist — dann eben ohne
	// Verfuegbarkeitsaussage statt mit einer geratenen (F-03). Ein Feld
	// `belegungen` gibt es in diesem Fall nicht: Eine leere Liste waere von
	// "nichts gebucht" nicht zu unterscheiden.
	if (stand === null) {
		return antwort({
			stand: 'fehlt',
			quelle: quelle satisfies Quelle,
			flotte: flotteBilden(STAMMKENNUNGEN, []),
			// Auch ohne Reservierungsstand: Der Ring zeigt dann zwar keine
			// Belegung, aber Tag und Nacht stimmen trotzdem.
			...(sonnenzeiten ? { sonnenzeiten } : {})
		});
	}

	const jetzt = new Date();
	const { von, bis } = fenster(jetzt);

	return antwort({
		stand: 'vorhanden',
		quelle: quelle satisfies Quelle,
		abgerufenAm: stand.abgerufenAm,
		veraltet: istVeraltet(stand.abgerufenAm, jetzt),
		// Die Flotte entsteht aus Stammliste **und** Abzug (E-01): Drei der
		// sechs Maschinen tauchen im Kalender ausschliesslich als Sperre auf.
		flotte: flotteBilden(STAMMKENNUNGEN, stand.reservierungen),
		belegungen: belegungenImFenster(stand.reservierungen, von, bis),
		// Fehlen sie, entfaellt allein dieses Feld (F-08). Eine leere Liste
		// waere von "die Sonne geht nicht auf" nicht zu unterscheiden.
		...(sonnenzeiten ? { sonnenzeiten } : {})
	});
}

/**
 * Das Zeitfenster `[heute 00:00 Ortszeit, +8 Tage)` (F-07).
 *
 * Die acht Tage werden auf dem **Kalender** addiert, nicht als 8 × 24 Stunden.
 * An den Umstellungstagen liegt sonst die Fenstergrenze um eine Stunde
 * daneben — ein Fehler, der genau zweimal im Jahr auftritt und deshalb kaum
 * je auffaellt.
 */
function fenster(jetzt: Date): { von: Date; bis: Date } {
	const heute = ortstag(jetzt);
	const [jahr, monat, tag] = heute.split('-').map(Number);
	const spaeter = new Date(Date.UTC(jahr, monat - 1, tag + FENSTER_TAGE));
	const endtag = `${spaeter.getUTCFullYear()}-${String(spaeter.getUTCMonth() + 1).padStart(2, '0')}-${String(spaeter.getUTCDate()).padStart(2, '0')}`;

	return {
		von: ortszeitZuZeitpunkt(`${heute} 00:00:00`),
		bis: ortszeitZuZeitpunkt(`${endtag} 00:00:00`)
	};
}

function antwort(inhalt: unknown): Response {
	return new Response(JSON.stringify(inhalt), {
		headers: {
			'content-type': 'application/json; charset=utf-8',
			// Dieselbe Lehre wie bei `/api/reservierung` (F-04): Die Zone
			// `bucky.edsh.de` schrieb ein `max-age=60` schon einmal auf ein
			// Jahr um und servierte danach dauerhaft eine 404. Eine Auskunft,
			// deren Alter Teil der Aussage ist, darf nicht eingefroren werden.
			'cache-control': 'no-store, no-cache, must-revalidate, max-age=0'
		}
	});
}
