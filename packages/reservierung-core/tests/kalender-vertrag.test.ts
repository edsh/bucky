import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { flotteBilden } from '../src/flotte.js';
import { kalenderDeuten } from '../src/kalender-deuten.js';

/**
 * Vertragsprüfung gegen den echten Kalenderabzug (Feature 052,
 * contracts/kalender-deuten.md).
 *
 * Geprüft wird gegen `tests/beispiele/kalender.ics` — ein echter Abzug, in
 * dem alle Namen ersetzt sind (siehe `tests/beispiele/README.md`). Damit
 * fällt auf, wenn sich Aufbau oder Beschriftung der Quelle ändern (FR-016,
 * SC-005).
 */

const pfad = fileURLToPath(new URL('./beispiele/kalender.ics', import.meta.url));
const roh = readFileSync(pfad, 'utf-8');

describe('kalenderDeuten — gegen den echten Abzug', () => {
	it('findet die erwartete Zahl an Flugzeug-Reservierungen und Sperren', () => {
		const { reservierungen, verworfeneEintraege } = kalenderDeuten(roh);
		// 59 Termine insgesamt, davon 8 ohne Flugzeug-Kennung (GRILL,
		// LANDEBAR, Werkstatt) — siehe tests/beispiele/README.md.
		expect(reservierungen).toHaveLength(51);
		expect(verworfeneEintraege).toBe(8);
	});

	it('enthält mindestens eine Sperre für die D-EELK', () => {
		const { reservierungen } = kalenderDeuten(roh);
		const sperren = reservierungen.filter((r) => r.kennung === 'D-EELK' && r.art === 'sperre');
		expect(sperren.length).toBeGreaterThanOrEqual(1);
	});

	it('lässt keinen Raum-Eintrag (GRILL, LANDEBAR, Werkstatt) als Flugzeug durch', () => {
		const { reservierungen } = kalenderDeuten(roh);
		const kennungen = reservierungen.map((r) => r.kennung);
		expect(kennungen).not.toContain('GRILL');
		expect(kennungen).not.toContain('LANDEBAR');
		expect(kennungen).not.toContain('WERKSTATT');
	});

	it('enthält keinen Personenbezug im Ergebnis', () => {
		const alsText = JSON.stringify(kalenderDeuten(roh));
		// Die im Prüfstoff verwendeten erfundenen Namen duerfen ebenso wenig
		// durchrutschen wie echte — die Struktur hat schlicht kein Feld dafuer.
		expect(alsText).not.toMatch(/[A-ZÄÖÜ][a-zäöüß]+,\s*[A-ZÄÖÜ][a-zäöüß]+/);
	});

	it('Gegenprobe: eine verfälschte Beschriftung lässt die Prüfung scheitern', () => {
		// Pflicht laut Vertrag: einmal absichtlich zum Scheitern bringen, um
		// zu belegen, dass die Prüfung tatsächlich greift (wie vertrag.test.ts
		// in Feature 047).
		const verfaelscht = roh.replace(
			'SUMMARY:Grounding D-EELK',
			'SUMMARY:Grounding D-ANDERSKENNUNG'
		);
		const { reservierungen } = kalenderDeuten(verfaelscht);
		const sperren = reservierungen.filter((r) => r.kennung === 'D-EELK' && r.art === 'sperre');
		expect(sperren.length).toBeLessThan(
			kalenderDeuten(roh).reservierungen.filter((r) => r.kennung === 'D-EELK' && r.art === 'sperre')
				.length
		);
	});
});

describe('flotteBilden — gegen den echten Abzug (Feature 054, Nachweis 1)', () => {
	it('findet genau die sechs bekannten Maschinen', () => {
		const { reservierungen } = kalenderDeuten(roh);
		const flotte = flotteBilden([], reservierungen);
		expect(flotte.map((m) => m.kennung)).toEqual([
			'D-EELK',
			'D-EXYZ',
			'D-MRXS',
			'D-3004',
			'D-4413',
			'D-9021'
		]);
	});

	it('ordnet alle sechs richtig ein — sechs Treffer von sechs (E-02)', () => {
		const { reservierungen } = kalenderDeuten(roh);
		const flotte = flotteBilden([], reservierungen);
		const nachKategorie = Object.fromEntries(flotte.map((m) => [m.kennung, m.kategorie]));
		expect(nachKategorie).toEqual({
			'D-EELK': 'motor',
			'D-EXYZ': 'motor',
			'D-MRXS': 'motor',
			'D-3004': 'segelflug',
			'D-4413': 'segelflug',
			'D-9021': 'segelflug'
		});
	});

	it('nimmt GRILL, LANDEBAR und Werkstatt nicht in die Flotte auf', () => {
		// Sie fallen schon beim Deuten heraus. Diese Prüfung sichert, dass
		// die Flottenbildung sie nicht auf einem zweiten Weg wieder
		// hereinholt — der Grillplatz ist kein Luftfahrzeug.
		const { reservierungen } = kalenderDeuten(roh);
		const kennungen = flotteBilden([], reservierungen).map((m) => m.kennung);
		for (const raum of ['GRILL', 'LANDEBAR', 'WERKSTATT']) {
			expect(kennungen).not.toContain(raum);
		}
	});

	it('verlöre drei Maschinen, wenn nur Reservierungen zählten', () => {
		// D-MRXS, D-9021 und D-4413 stehen im Abzug ausschließlich in
		// Sperren. Wer die Flotte aus Reservierungen bildet, verliert die
		// halbe Flotte — und zwar unbemerkt.
		const { reservierungen } = kalenderDeuten(roh);
		const nurReservierungen = reservierungen.filter((r) => r.art === 'reservierung');
		expect(flotteBilden([], nurReservierungen)).toHaveLength(3);
		expect(flotteBilden([], reservierungen)).toHaveLength(6);
	});
});
