import { describe, expect, it } from 'vitest';
import { antwortDeuten } from '../src/antwort-deuten.js';
import echteAntwort from './beispiele/antwort-echt.json' with { type: 'json' };

const eintrag = (felder: Record<string, unknown> = {}) => ({
	ressource: 'D-EELK',
	datefrom: '2026-08-13 17:00:00',
	dateto: '2026-08-13 20:00:00',
	type: 'Reservierung',
	...felder
});

describe('antwortDeuten — die echte Antwort', () => {
	it('findet alle Flugzeug-Eintraege des Abzugs', () => {
		const { reservierungen } = antwortDeuten(echteAntwort);
		// 19 Eintraege insgesamt, davon zwei ohne Kennzeichen
		// (`Werkstatt` und `GRILL`).
		expect(reservierungen).toHaveLength(17);
	});

	it('verwirft Eintraege, deren Ressource kein Flugzeug ist (FR-003a)', () => {
		const { reservierungen, verworfeneEintraege } = antwortDeuten(echteAntwort);
		expect(verworfeneEintraege).toBe(2);
		expect(reservierungen.map((r) => r.kennung)).not.toContain('WERKSTATT');
		expect(reservierungen.map((r) => r.kennung)).not.toContain('GRILL');
	});

	it('gibt je Reservierung ausschliesslich die vier vereinbarten Felder', () => {
		const { reservierungen } = antwortDeuten(echteAntwort);
		for (const r of reservierungen) {
			expect(Object.keys(r).sort()).toEqual(['art', 'beginn', 'ende', 'kennung']);
		}
	});

	it('laesst keinen Personenbezug durch', () => {
		// Der Pruefstoff traegt an allen personenbezogenen Stellen das
		// auffaellige Wort PLATZHALTER. Taucht es hier auf, ist ein Feld
		// durchgerutscht.
		const alsText = JSON.stringify(antwortDeuten(echteAntwort));
		expect(alsText).not.toContain('PLATZHALTER');
	});

	it('erkennt die Sperre der D-EELK im Abzug', () => {
		const { reservierungen } = antwortDeuten(echteAntwort);
		const sperren = reservierungen.filter((r) => r.kennung === 'D-EELK' && r.art === 'sperre');
		expect(sperren).toHaveLength(1);
		expect(sperren[0]?.beginn).toBe('2026-08-22 00:00:00');
	});

	it('gibt die Reservierungen nach Beginn geordnet zurueck', () => {
		const { reservierungen } = antwortDeuten(echteAntwort);
		const beginne = reservierungen.map((r) => r.beginn);
		expect(beginne).toEqual([...beginne].sort());
	});
});

describe('antwortDeuten — Form der Antwort', () => {
	it('nimmt die objektindizierte Form an', () => {
		const { reservierungen } = antwortDeuten({ '0': eintrag(), httpstatuscode: 200 });
		expect(reservierungen).toHaveLength(1);
		expect(reservierungen[0]?.kennung).toBe('D-EELK');
	});

	it('behandelt eine leere Antwort als gueltiges Ergebnis, nicht als Fehlschlag', () => {
		// Der wichtigste Fall dieser Datei: "Niemand hat reserviert" und "der
		// Abruf ging schief" sind fuer den Piloten gegensaetzliche Aussagen.
		const { reservierungen, verworfeneEintraege } = antwortDeuten({ httpstatuscode: 200 });
		expect(reservierungen).toEqual([]);
		expect(verworfeneEintraege).toBe(0);
	});

	it('weist eine Antwort zurueck, die kein Verzeichnis ist', () => {
		expect(() => antwortDeuten([])).toThrow();
		expect(() => antwortDeuten(null)).toThrow();
		expect(() => antwortDeuten('kaputt')).toThrow();
	});

	it('weist eine Antwort mit Fehlerstatus zurueck', () => {
		expect(() => antwortDeuten({ httpstatuscode: 403 })).toThrow();
	});
});

describe('antwortDeuten — einzelne Eintraege', () => {
	it('verwirft einen unbrauchbaren Eintrag, ohne den Abruf zu verwerfen', () => {
		const { reservierungen, verworfeneEintraege } = antwortDeuten({
			'0': eintrag(),
			'1': eintrag({ datefrom: 'unlesbar' }),
			'2': eintrag({ ressource: '' }),
			httpstatuscode: 200
		});
		expect(reservierungen).toHaveLength(1);
		expect(verworfeneEintraege).toBe(2);
	});

	it('verwirft einen Eintrag, dessen Ende nicht nach dem Beginn liegt', () => {
		const { reservierungen, verworfeneEintraege } = antwortDeuten({
			'0': eintrag({ dateto: '2026-08-13 17:00:00' }),
			httpstatuscode: 200
		});
		expect(reservierungen).toHaveLength(0);
		expect(verworfeneEintraege).toBe(1);
	});

	it('vereinheitlicht die Schreibweise der Kennung', () => {
		const { reservierungen } = antwortDeuten({
			'0': eintrag({ ressource: ' d-eelk ' }),
			httpstatuscode: 200
		});
		expect(reservierungen[0]?.kennung).toBe('D-EELK');
	});

	it('uebersetzt die Art in unsere Woerter', () => {
		const { reservierungen } = antwortDeuten({
			'0': eintrag({ type: 'Sperre' }),
			'1': eintrag({ type: 'Reservierung', datefrom: '2026-08-14 17:00:00', dateto: '2026-08-14 20:00:00' }),
			httpstatuscode: 200
		});
		expect(reservierungen.map((r) => r.art)).toEqual(['sperre', 'reservierung']);
	});

	it('haelt einen unbekannten Typ fuer belegend', () => {
		// Belegt ist belegt. Die Art bestimmt nur die Wortwahl.
		const { reservierungen } = antwortDeuten({
			'0': eintrag({ type: 'Wartungsfenster' }),
			httpstatuscode: 200
		});
		expect(reservierungen).toHaveLength(1);
		expect(reservierungen[0]?.art).toBe('reservierung');
	});
});
