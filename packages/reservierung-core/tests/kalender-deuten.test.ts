import { describe, expect, it } from 'vitest';
import { kalenderDeuten } from '../src/kalender-deuten.js';

const KOPF = ['BEGIN:VCALENDAR', 'PRODID:-//test//test//DE', 'VERSION:2.0'].join('\r\n');
const FUSS = 'END:VCALENDAR';

function kalender(...events: string[]): string {
	return [KOPF, ...events, FUSS].join('\r\n');
}

function ereignis(felder: Record<string, string>): string {
	const zeilen = ['BEGIN:VEVENT', ...Object.entries(felder).map(([k, v]) => `${k}:${v}`), 'END:VEVENT'];
	return zeilen.join('\r\n');
}

describe('kalenderDeuten — der entscheidende Unterschied', () => {
	it('behandelt einen gültigen, leeren Kalender als leeres Ergebnis', () => {
		const { reservierungen, verworfeneEintraege } = kalenderDeuten(kalender());
		expect(reservierungen).toEqual([]);
		expect(verworfeneEintraege).toBe(0);
	});

	it('wirft bei einer Eingabe, die kein Kalender ist — statt ein leeres Ergebnis zu liefern', () => {
		// Der wichtigste Einzelfall des ganzen Vertrags (contracts/kalender-deuten.md):
		// eine Fehlerseite darf nicht als "keine Belegungen" durchgehen.
		expect(() => kalenderDeuten('<html><body>Not found</body></html>')).toThrow();
		expect(() => kalenderDeuten('')).toThrow();
		expect(() => kalenderDeuten('   ')).toThrow();
	});

	it('lässt führenden Leerraum vor BEGIN:VCALENDAR zu', () => {
		expect(() => kalenderDeuten(`\n\n${kalender()}`)).not.toThrow();
	});
});

describe('kalenderDeuten — Grundfall', () => {
	it('deutet eine Reservierung', () => {
		const { reservierungen } = kalenderDeuten(
			kalender(
				ereignis({
					SUMMARY: 'Reservierung D-EELK - (Mustermann, Max)',
					DTSTART: '20260813T150000Z',
					DTEND: '20260813T180000Z'
				})
			)
		);
		expect(reservierungen).toHaveLength(1);
		expect(reservierungen[0]).toMatchObject({ kennung: 'D-EELK', art: 'reservierung' });
	});

	it('deutet eine Sperre (Grounding) als art sperre', () => {
		const { reservierungen } = kalenderDeuten(
			kalender(
				ereignis({
					SUMMARY: 'Grounding D-EELK - (Mustermann, Max)',
					DTSTART: '20260813T150000Z',
					DTEND: '20260815T180000Z'
				})
			)
		);
		expect(reservierungen).toHaveLength(1);
		expect(reservierungen[0]?.art).toBe('sperre');
	});

	it('sortiert einen Nicht-Flugzeug-Eintrag aus (GRILL, Werkstatt)', () => {
		const { reservierungen, verworfeneEintraege } = kalenderDeuten(
			kalender(
				ereignis({
					SUMMARY: 'Reservierung GRILL - (Mustermann, Max)',
					DTSTART: '20260813T150000Z',
					DTEND: '20260813T180000Z'
				}),
				ereignis({
					SUMMARY: 'Reservierung Werkstatt - (Mustermann, Max)',
					DTSTART: '20260813T150000Z',
					DTEND: '20260813T180000Z'
				})
			)
		);
		expect(reservierungen).toEqual([]);
		expect(verworfeneEintraege).toBe(2);
	});

	it('enthält keinen Personenbezug im Ergebnis', () => {
		const alsText = JSON.stringify(
			kalenderDeuten(
				kalender(
					ereignis({
						SUMMARY: 'Reservierung D-EELK - (Mustermann, Max)',
						DTSTART: '20260813T150000Z',
						DTEND: '20260813T180000Z'
					})
				)
			)
		);
		expect(alsText).not.toContain('Mustermann');
	});
});

describe('kalenderDeuten — Zeitformate', () => {
	it('übernimmt Weltzeit exakt', () => {
		const { reservierungen } = kalenderDeuten(
			kalender(
				ereignis({
					SUMMARY: 'Reservierung D-EELK - (Mustermann, Max)',
					DTSTART: '20260813T150000Z',
					DTEND: '20260813T180000Z'
				})
			)
		);
		expect(reservierungen[0]?.beginn).toBe('2026-08-13T17:00:00+02:00');
	});

	it('deutet Ortszeit ohne Kennung wie bisher über ortszeitZuZeitpunkt', () => {
		const { reservierungen } = kalenderDeuten(
			kalender(
				ereignis({
					SUMMARY: 'Reservierung D-EELK - (Mustermann, Max)',
					DTSTART: '20260813T170000',
					DTEND: '20260813T200000'
				})
			)
		);
		expect(reservierungen[0]?.beginn).toBe('2026-08-13T17:00:00+02:00');
	});

	it('behandelt eine ausdrücklich benannte Platzzone wie Ortszeit', () => {
		const { reservierungen } = kalenderDeuten(
			kalender(
				`BEGIN:VEVENT\r\nSUMMARY:Reservierung D-EELK - (Mustermann, Max)\r\nDTSTART;TZID=Europe/Berlin:20260813T170000\r\nDTEND;TZID=Europe/Berlin:20260813T200000\r\nEND:VEVENT`
			)
		);
		expect(reservierungen[0]?.beginn).toBe('2026-08-13T17:00:00+02:00');
	});

	it('verwirft einen Eintrag mit fremder Zeitzone, statt zu raten', () => {
		const { reservierungen, verworfeneEintraege } = kalenderDeuten(
			kalender(
				`BEGIN:VEVENT\r\nSUMMARY:Reservierung D-EELK - (Mustermann, Max)\r\nDTSTART;TZID=America/New_York:20260813T170000\r\nDTEND;TZID=America/New_York:20260813T200000\r\nEND:VEVENT`
			)
		);
		expect(reservierungen).toEqual([]);
		expect(verworfeneEintraege).toBe(1);
	});

	it('behandelt einen ganztägigen Termin als Ortstag 00:00', () => {
		const { reservierungen } = kalenderDeuten(
			kalender(
				`BEGIN:VEVENT\r\nSUMMARY:Grounding D-EELK - (Mustermann, Max)\r\nDTSTART;VALUE=DATE:20260910\r\nDTEND;VALUE=DATE:20260914\r\nEND:VEVENT`
			)
		);
		expect(reservierungen[0]?.beginn).toBe('2026-09-10T00:00:00+02:00');
	});
});

describe('kalenderDeuten — Formatfallstricke (research.md E-05)', () => {
	it('fügt eine umbrochene SUMMARY-Zeile zusammen, statt die Kennung zu verstümmeln', () => {
		// RFC 5545: Fortsetzungszeile beginnt mit einem Leerzeichen.
		const roh = kalender(
			[
				'BEGIN:VEVENT',
				'SUMMARY:Reservierung D-EE',
				' LK - (Mustermann, Max)',
				'DTSTART:20260813T150000Z',
				'DTEND:20260813T180000Z',
				'END:VEVENT'
			].join('\r\n')
		);
		const { reservierungen } = kalenderDeuten(roh);
		expect(reservierungen).toHaveLength(1);
		expect(reservierungen[0]?.kennung).toBe('D-EELK');
	});

	it('löst maskierte Sonderzeichen in der Beschriftung auf', () => {
		const { reservierungen } = kalenderDeuten(
			kalender(
				ereignis({
					SUMMARY: 'Reservierung D-EELK - (Mustermann\\, Max)',
					DTSTART: '20260813T150000Z',
					DTEND: '20260813T180000Z'
				})
			)
		);
		expect(reservierungen).toHaveLength(1);
		expect(reservierungen[0]?.kennung).toBe('D-EELK');
	});
});

describe('kalenderDeuten — einzelne kaputte Einträge (FR-012)', () => {
	it('verwirft einen Eintrag ohne DTEND, ohne den ganzen Abruf zu verwerfen', () => {
		const { reservierungen, verworfeneEintraege } = kalenderDeuten(
			kalender(
				`BEGIN:VEVENT\r\nSUMMARY:Reservierung D-EELK - (Mustermann, Max)\r\nDTSTART:20260813T150000Z\r\nEND:VEVENT`,
				ereignis({
					SUMMARY: 'Reservierung D-4413 - (Mustermann, Max)',
					DTSTART: '20260814T150000Z',
					DTEND: '20260814T180000Z'
				})
			)
		);
		expect(reservierungen).toHaveLength(1);
		expect(verworfeneEintraege).toBe(1);
	});

	it('verwirft einen Eintrag, dessen Ende nicht nach dem Beginn liegt', () => {
		const { reservierungen, verworfeneEintraege } = kalenderDeuten(
			kalender(
				ereignis({
					SUMMARY: 'Reservierung D-EELK - (Mustermann, Max)',
					DTSTART: '20260813T180000Z',
					DTEND: '20260813T150000Z'
				})
			)
		);
		expect(reservierungen).toEqual([]);
		expect(verworfeneEintraege).toBe(1);
	});
});
