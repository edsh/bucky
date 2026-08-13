import { antwortDeuten, type Abrufstand } from '@edsh-bucky/reservierung-core';
import { anmelden, GRUNDADRESSE, type Sitzung, type Zugangsdaten } from './anmeldung.js';

/**
 * Was der Abruf-Worker tut — getrennt von seiner Einstiegsdatei.
 *
 * Die Trennung ist keine Ordnungsliebe: Die Workers-Laufzeit deutet **jeden**
 * benannten Export der Einstiegsdatei als Einstiegspunkt und verweigert den
 * Start, sobald dort etwas anderes als ein Handler steht ("Incorrect type for
 * map entry"). `index.ts` traegt deshalb nur den Standard-Export, alles
 * Uebrige liegt hier.
 *
 * Fachlogik steht auch hier keine. Deuten, Zusammenfassen und Ableiten macht
 * `@edsh-bucky/reservierung-core`, damit die Weboberflaeche zu genau denselben
 * Ergebnissen kommt (Constitution, Prinzip IV).
 */

export interface Env {
	RESERVIERUNGEN: KVNamespace;
	VF_APPKEY: string;
	VF_USERNAME: string;
	VF_PASSWORD: string;
}

export const SCHLUESSEL_STAND = 'stand';
export const SCHLUESSEL_SITZUNG = 'sitzung';

async function reservierungenHolen(sitzung: Sitzung): Promise<unknown> {
	const antwort = await fetch(`${GRUNDADRESSE}/reservation/list/active`, {
		method: 'POST',
		headers: {
			'content-type': 'application/x-www-form-urlencoded',
			...(sitzung.keks ? { cookie: sitzung.keks } : {})
		},
		body: new URLSearchParams({ accesstoken: sitzung.accesstoken })
	});

	if (!antwort.ok) throw new Error(`Abruf abgelehnt: ${antwort.status}`);
	return await antwort.json();
}

/**
 * Wie oft heute schon neu angemeldet wurde.
 *
 * Der Zaehler laeuft ueber den Tag, nicht ueber den Durchgang: Ein Wert von 0
 * oder 1 je Durchgang verriete nichts darueber, ob der Zugangsschluessel
 * haelt. Erst die Tagessumme zeigt, ob die Rechnung aus research.md E-04
 * aufgeht — und damit, ob das Kontingent des Vereins in Gefahr ist (SC-003).
 *
 * Zurueckgesetzt wird beim Tageswechsel in Ortszeit; der Tag der Gegenstelle
 * ist auch der Tag, an dem ihr Kontingent zaehlt.
 */
function neuanmeldungenFortschreiben(
	vorher: Abrufstand | null,
	zusaetzlich: number,
	jetzt: Date
): number {
	if (!vorher) return zusaetzlich;

	const tag = (d: Date) =>
		new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(d);
	const gleicherTag = tag(new Date(vorher.abgerufenAm)) === tag(jetzt);

	return gleicherTag ? vorher.neuanmeldungen + zusaetzlich : zusaetzlich;
}

/**
 * Ein Durchgang: anmelden (oder den bekannten Schluessel weiterverwenden),
 * holen, deuten, ablegen.
 *
 * Wirft bei jedem Fehlschlag — und schreibt dann **nicht**. Lieber ein alter
 * Stand, der sich als alt zu erkennen gibt, als ein leerer (FR-004).
 */
export async function durchgang(env: Env, jetzt: Date = new Date()): Promise<Abrufstand> {
	const zugang: Zugangsdaten = {
		appkey: env.VF_APPKEY,
		username: env.VF_USERNAME,
		password: env.VF_PASSWORD
	};

	const bekannt = await env.RESERVIERUNGEN.get<Sitzung>(SCHLUESSEL_SITZUNG, 'json');
	let neuanmeldungen = 0;
	let antwort: unknown;

	// Erst mit dem bekannten Schluessel versuchen. Die Lebensdauer eines
	// `accesstoken` ist nicht dokumentiert — sie zu raten waere Unsinn. Also
	// wird sie am Fehlschlag erkannt statt vorhergesagt (research.md, E-04).
	if (bekannt?.accesstoken) {
		try {
			antwort = await reservierungenHolen(bekannt);
		} catch {
			antwort = undefined;
		}
	}

	if (antwort === undefined) {
		const sitzung = await anmelden(zugang);
		neuanmeldungen = 1;
		await env.RESERVIERUNGEN.put(SCHLUESSEL_SITZUNG, JSON.stringify(sitzung));
		antwort = await reservierungenHolen(sitzung);
	}

	// Wirft, wenn die Antwort als Ganzes unbrauchbar ist. Einzelne kaputte
	// Eintraege werden nur gezaehlt.
	const { reservierungen, verworfeneEintraege } = antwortDeuten(antwort);

	const vorher = await env.RESERVIERUNGEN.get<Abrufstand>(SCHLUESSEL_STAND, 'json');
	const stand: Abrufstand = {
		abgerufenAm: jetzt.toISOString(),
		reservierungen,
		verworfeneEintraege,
		neuanmeldungen: neuanmeldungenFortschreiben(vorher, neuanmeldungen, jetzt)
	};

	await env.RESERVIERUNGEN.put(SCHLUESSEL_STAND, JSON.stringify(stand));
	return stand;
}
