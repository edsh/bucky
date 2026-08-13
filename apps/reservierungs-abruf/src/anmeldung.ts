/**
 * Anmeldung bei Vereinsflieger.
 *
 * Zwei Dinge stehen nicht in der Spezifikation und haben beim Erzeugen des
 * Pruefstoffs Aufrufe gekostet (siehe
 * packages/reservierung-core/tests/beispiele/README.md):
 *
 * 1. Der `PHPSESSID`-Keks aus dem `accesstoken`-Aufruf **muss** beim `signin`
 *    mitgeschickt werden.
 * 2. `cid` darf **nicht** mitgeschickt werden, wenn das Konto nur einem Verein
 *    zugeordnet ist. Sonst antwortet die Anmeldung mit
 *    `403 Wrong User or wrong Password` — eine Meldung, die die Suche in die
 *    voellig falsche Richtung schickt.
 */

export const GRUNDADRESSE = 'https://www.vereinsflieger.de/interface/rest';

export interface Zugangsdaten {
	appkey: string;
	username: string;
	/** Bereits als MD5 oder im Klartext — `anmelden` erkennt beides. */
	password: string;
}

export interface Sitzung {
	accesstoken: string;
	/** Der Keks, den die Gegenstelle beim Anfordern des Schluessels setzt. */
	keks: string;
}

const IST_MD5 = /^[0-9a-f]{32}$/i;

/**
 * Das Kennwort so aufbereiten, wie die Gegenstelle es erwartet.
 *
 * MD5 ist hier keine Wahl, sondern Vorgabe der Schnittstelle. In Workers steht
 * es als nicht-standardisierte Erweiterung zur Verfuegung, ausdruecklich "for
 * interacting with legacy systems" (research.md, E-02).
 */
export async function alsMd5(kennwort: string): Promise<string> {
	if (IST_MD5.test(kennwort)) return kennwort.toLowerCase();

	const roh = await crypto.subtle.digest('MD5', new TextEncoder().encode(kennwort));
	return [...new Uint8Array(roh)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function keksAusAntwort(antwort: Response): string {
	const gesetzt = antwort.headers.get('set-cookie') ?? '';
	const treffer = /PHPSESSID=[^;]+/.exec(gesetzt);
	return treffer ? treffer[0] : '';
}

/** Eine neue Sitzung aufbauen. Kostet zwei Aufrufe vom Tageskontingent. */
export async function anmelden(zugang: Zugangsdaten): Promise<Sitzung> {
	const schluesselAntwort = await fetch(`${GRUNDADRESSE}/auth/accesstoken`);
	if (!schluesselAntwort.ok) {
		throw new Error(`Sitzungsschlüssel abgelehnt: ${schluesselAntwort.status}`);
	}

	const { accesstoken } = (await schluesselAntwort.json()) as { accesstoken?: string };
	if (!accesstoken) throw new Error('Antwort enthält keinen accesstoken');

	const keks = keksAusAntwort(schluesselAntwort);

	const anmeldeAntwort = await fetch(`${GRUNDADRESSE}/auth/signin`, {
		method: 'POST',
		headers: {
			'content-type': 'application/x-www-form-urlencoded',
			...(keks ? { cookie: keks } : {})
		},
		body: new URLSearchParams({
			accesstoken,
			username: zugang.username,
			password: await alsMd5(zugang.password),
			appkey: zugang.appkey
		})
	});

	if (!anmeldeAntwort.ok) {
		throw new Error(`Anmeldung abgelehnt: ${anmeldeAntwort.status}`);
	}

	return { accesstoken, keks };
}
