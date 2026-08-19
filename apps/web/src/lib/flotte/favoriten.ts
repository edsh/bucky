import { istLuftfahrzeug, kennungVereinheitlichen } from '@edsh-bucky/reservierung-core';

/**
 * Die als Favorit markierten Maschinen — gespeichert auf genau diesem Gerät.
 *
 * Ein reines Datenmodul ohne Svelte-Bezug, nach dem Muster von
 * `lib/einstellungen/speicher.ts`: Das Sichern ist Sache dieses Zugangswegs
 * und hat im Kern nichts zu suchen (Constitution, Prinzip IV).
 *
 * Bewusst **kein** Serverzustand (FR-007a, E-10). Eine gerätübergreifende
 * Merkliste klänge bequemer, verlangte aber ein Konto — und damit genau die
 * Anmeldung, die diese Anwendung nirgends verlangt. Wer sein Telefon
 * wechselt, tippt drei Sterne neu; wer sich anmelden müsste, tut es nie.
 */

const SCHLUESSEL = 'bucky.favoriten';

/**
 * Die Kennung der Fassung. Sie wird erhöht, sobald der gesicherte Inhalt
 * anders zu lesen wäre als bisher — etwa wenn aus der Liste von Kennzeichen
 * eine Liste von Objekten würde. Ein Inhalt mit fremder Kennung wird ganz
 * verworfen; für eine Merkliste ist das folgenlos, sie füllt sich in Sekunden
 * wieder.
 */
const FASSUNG = 1;

interface Umschlag {
	fassung: number;
	kennungen: unknown;
}

/**
 * Der Speicher, sofern der Browser einen hergibt. In einem privaten Fenster
 * oder bei gesperrtem Speicher wirft bereits der Zugriff auf `localStorage` —
 * deshalb der Versuch samt Fangarm und nicht bloß eine Abfrage auf
 * `undefined`. Ohne Speicher läuft die Seite normal weiter, nur ohne
 * Gedächtnis.
 */
function speicher(): Storage | undefined {
	try {
		return globalThis.localStorage ?? undefined;
	} catch {
		return undefined;
	}
}

/**
 * Bringt eine Liste in die Form, in der sie gespeichert und verglichen wird:
 * vereinheitlicht, ohne Doppelte, in der übergebenen Reihenfolge.
 *
 * Geprüft wird nur, ob überhaupt ein Kennzeichen vorliegt — **nicht**, ob die
 * Maschine dem Verein gehört. Die Flotte ist die Vereinigung aus Stammliste
 * und Daten (`flotteBilden`); ein Flugzeug, das erst seit gestern gebucht
 * wird, steht in keiner Liste und darf trotzdem Favorit sein. Was hier durch
 * die Prüfung fällt, ist deshalb kein unbekanntes Flugzeug, sondern Unrat:
 * ein leerer String, eine Zahl, ein Objekt.
 */
function ordnen(roh: readonly unknown[]): string[] {
	const gesehen = new Set<string>();
	const liste: string[] = [];
	for (const eintrag of roh) {
		if (typeof eintrag !== 'string') continue;
		const kennung = kennungVereinheitlichen(eintrag);
		if (!istLuftfahrzeug(kennung) || gesehen.has(kennung)) continue;
		gesehen.add(kennung);
		liste.push(kennung);
	}
	return liste;
}

/**
 * Liest die gesicherten Favoriten.
 *
 * Der Rückgabewert unterscheidet drei Fälle, und diese Unterscheidung ist der
 * eigentliche Zweck dieser Funktion (FR-007b):
 *
 * - `null` — es wurde **nie** etwas gesetzt (oder der Inhalt ist unlesbar).
 * - `[]` — es war etwas gesetzt und ist bewusst wieder entfernt worden.
 * - gefüllt — die Merkliste.
 *
 * Anzuzeigen ist heute in beiden ersten Fällen dasselbe, nämlich nichts. Die
 * Unterscheidung trotzdem zu führen kostet nichts und hält den naheliegenden
 * nächsten Schritt offen — einen einmaligen Hinweis „Tippe auf den Stern,
 * um eine Maschine oben festzuhalten". Wer beide Fälle jetzt zusammenwirft,
 * kann sie später nicht wieder auseinanderziehen: Die Auskunft, ob jemand
 * das Merken schon einmal benutzt hat, ist dann für immer verloren.
 *
 * Unlesbares wird stillschweigend verworfen (E-10). Eine Fehlermeldung über
 * eine kaputte Merkliste hilft niemandem — es gibt nichts zu beheben, und
 * der Verlust ist eine Handbewegung.
 */
export function ladeFavoriten(): string[] | null {
	const s = speicher();
	if (!s) return null;

	let umschlag: Umschlag;
	try {
		const roh = s.getItem(SCHLUESSEL);
		if (roh === null) return null;
		umschlag = JSON.parse(roh) as Umschlag;
	} catch {
		return null;
	}

	if (typeof umschlag !== 'object' || umschlag === null || umschlag.fassung !== FASSUNG) {
		return null;
	}
	if (!Array.isArray(umschlag.kennungen)) return null;

	return ordnen(umschlag.kennungen);
}

/**
 * Sichert die Favoriten. Fehlschläge bleiben still: Ein voller oder
 * gesperrter Speicher ist nichts, was der Nutzer beheben könnte, und eine
 * Meldung stünde quer über einer Übersicht, die weiterhin vollständig
 * funktioniert — nur ohne Gedächtnis.
 */
export function sichereFavoriten(favoriten: readonly string[]): void {
	const s = speicher();
	if (!s) return;
	try {
		s.setItem(
			SCHLUESSEL,
			JSON.stringify({ fassung: FASSUNG, kennungen: ordnen(favoriten) } satisfies Umschlag)
		);
	} catch {
		// absichtlich folgenlos
	}
}

/**
 * Setzt oder entfernt eine Markierung und gibt die neue Liste zurück.
 *
 * Neue Favoriten kommen ans **Ende**. Eine Reihe, die sich bei jedem Antippen
 * neu sortiert, zwingt zum Suchen — und wer eine Maschine oben festhält, will
 * sie genau dort wiederfinden.
 */
export function umschalten(favoriten: readonly string[], kennung: string): string[] {
	const gesucht = kennungVereinheitlichen(kennung);
	const bisher = ordnen(favoriten);
	return bisher.includes(gesucht)
		? bisher.filter((k) => k !== gesucht)
		: [...bisher, gesucht];
}

export function istFavorit(favoriten: readonly string[] | null, kennung: string): boolean {
	if (favoriten === null) return false;
	return favoriten.includes(kennungVereinheitlichen(kennung));
}
