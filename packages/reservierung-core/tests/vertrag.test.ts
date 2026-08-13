import { describe, expect, it } from 'vitest';
import { antwortDeuten } from '../src/antwort-deuten.js';
import { belegungsauskunft } from '../src/belegung.js';
import echteAntwort from './beispiele/antwort-echt.json' with { type: 'json' };

/**
 * Der Vertrag als Pruefung.
 *
 * Die Zusicherungen aus contracts/reservierungsstand.md sind nur so viel wert,
 * wie sie ueberpruefbar sind. Ein neues Feld, das jemand spaeter durchreicht —
 * eine Bemerkung, eine Mitgliedskennung, ein Name —, muss **hier** auffallen
 * und nicht erst, wenn es auf einer oeffentlich erreichbaren Seite steht
 * (FR-006, FR-015).
 *
 * Geprueft wird gegen den **echten** Abzug aus T004, nicht gegen erfundene
 * Daten: Nur er enthaelt all die Felder, die die Gegenstelle wirklich liefert
 * und die wir wirklich weglassen muessen.
 */

const stand = antwortDeuten(echteAntwort);

/**
 * Nur die eigentlichen Eintraege. Die Antwort traegt neben den numerisch
 * benannten Eintraegen auch `httpstatuscode` — ein Feld, das aussieht wie
 * Nutzlast und keine ist.
 */
const eintraege = Object.values(echteAntwort as unknown as Record<string, unknown>).filter(
	(wert): wert is Record<string, unknown> => typeof wert === 'object' && wert !== null
);

/** Alles, was die Gegenstelle liefert (Abschnitt A des Vertrags). */
const FELDER_DER_QUELLE = Object.keys(eintraege[0] ?? {});

/** Was eine Reservierung nach aussen tragen darf — und nichts sonst. */
const ERLAUBT_RESERVIERUNG = ['kennung', 'beginn', 'ende', 'art'];

/** Was die Server-Route ausgibt (Abschnitt B, Fall 1). */
const ERLAUBT_AUSKUNFT = [
	'kennung',
	'frei',
	'art',
	'wechselAm',
	'wechselZu',
	'abgerufenAm',
	'veraltet'
];

describe('Vertrag — was nach aussen geht', () => {
	it('hat ueberhaupt etwas zu pruefen', () => {
		// Ohne diese Zusicherung koennte ein leerer Pruefstoff alle folgenden
		// Pruefungen still bestehen lassen — die gefaehrlichste Art von Gruen.
		expect(eintraege.length).toBeGreaterThan(10);
		expect(FELDER_DER_QUELLE).toContain('comment');
		expect(FELDER_DER_QUELLE).toContain('user');
		expect(stand.reservierungen.length).toBeGreaterThan(0);
	});

	it('traegt je Reservierung ausschliesslich die vereinbarten Felder', () => {
		for (const reservierung of stand.reservierungen) {
			expect(Object.keys(reservierung).sort()).toEqual([...ERLAUBT_RESERVIERUNG].sort());
		}
	});

	it('traegt in der Auskunft ausschliesslich die vereinbarten Felder', () => {
		const auskunft = belegungsauskunft(
			{ abgerufenAm: '2026-08-13T06:32:12.725Z', reservierungen: stand.reservierungen, verworfeneEintraege: 0, neuanmeldungen: 0 },
			'D-EELK',
			new Date('2026-08-13T06:40:00.000Z')
		);
		expect(Object.keys(auskunft).sort()).toEqual([...ERLAUBT_AUSKUNFT].sort());
	});

	it('reicht keinen Bemerkungstext durch', () => {
		// Bemerkungen enthalten erfahrungsgemaess Namen, Telefonnummern und
		// Absichten. Im Pruefstoff steht dort PLATZHALTER — taucht das Wort
		// im Ergebnis auf, ist ein Feld durchgerutscht.
		expect(JSON.stringify(stand.reservierungen)).not.toMatch(/PLATZHALTER/i);
	});

	it('reicht kein Feld der Gegenstelle unter seinem eigenen Namen durch', () => {
		// Der schaerfere Schnitt: nicht nur bestimmte Felder pruefen, sondern
		// jedes, das die Quelle kennt. Ein spaeter hinzugefuegtes `uidfi`
		// faellt damit auf, ohne dass jemand daran gedacht haben muesste.
		const fremd = FELDER_DER_QUELLE.filter((feld) =>
			stand.reservierungen.some((r) => feld in r)
		);
		expect(fremd).toEqual([]);
	});

	it('gibt `art` nie im Wortlaut der Quelle aus', () => {
		// Die Quelle liefert "Reservierung" und "Sperre" mit grossem
		// Anfangsbuchstaben. Sie durchzureichen hiesse, ihre Schreibweise zu
		// unserem Vertrag zu machen — und beim naechsten Umbau dort zu brechen.
		for (const reservierung of stand.reservierungen) {
			expect(['reservierung', 'sperre']).toContain(reservierung.art);
		}
	});

	it('gibt alle Zeitangaben nach aussen mit Zeitzone aus', () => {
		const auskunft = belegungsauskunft(
			{ abgerufenAm: '2026-08-13T06:32:12.725Z', reservierungen: stand.reservierungen, verworfeneEintraege: 0, neuanmeldungen: 0 },
			'D-EELK',
			new Date('2026-08-13T06:40:00.000Z')
		);
		for (const wert of [auskunft.abgerufenAm, auskunft.wechselAm]) {
			if (wert !== null) expect(wert).toMatch(/Z$|[+-]\d{2}:\d{2}$/);
		}
	});

	it('laesst nichts durch, was kein Flugzeug ist', () => {
		// `Werkstatt` und `GRILL` stehen im selben Kalender. Sie sind keine
		// Flugzeuge, und eine Auskunft ueber den Grillplatz waere hier
		// bestenfalls verwirrend.
		for (const reservierung of stand.reservierungen) {
			expect(reservierung.kennung).toMatch(/^[A-Z0-9]{1,2}-[A-Z0-9]{1,5}$/);
		}
		expect(stand.verworfeneEintraege).toBeGreaterThan(0);
	});
});
