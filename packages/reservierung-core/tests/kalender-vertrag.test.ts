import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
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
