import { describe, expect, it } from 'vitest';
import {
	alsIso,
	alsIsoMitVersatz,
	alsUhrzeit,
	alsWochentagDatumUhrzeit,
	gleicherTag,
	ortszeitZuZeitpunkt
} from '../src/zeit.js';

describe('ortszeitZuZeitpunkt', () => {
	it('deutet eine Sommerzeit-Angabe als MESZ (UTC+2)', () => {
		expect(alsIso(ortszeitZuZeitpunkt('2026-08-13 17:00:00'))).toBe('2026-08-13T15:00:00.000Z');
	});

	it('deutet eine Winterzeit-Angabe als MEZ (UTC+1)', () => {
		expect(alsIso(ortszeitZuZeitpunkt('2026-01-15 17:00:00'))).toBe('2026-01-15T16:00:00.000Z');
	});

	it('trennt die Stunden unmittelbar vor und nach der Rueckstellung', () => {
		// In der Nacht zum 25.10.2026 wird um 03:00 MESZ auf 02:00 MEZ
		// zurueckgestellt. 01:30 gibt es nur einmal, 03:30 ebenfalls.
		expect(alsIso(ortszeitZuZeitpunkt('2026-10-25 01:30:00'))).toBe('2026-10-24T23:30:00.000Z');
		expect(alsIso(ortszeitZuZeitpunkt('2026-10-25 03:30:00'))).toBe('2026-10-25T02:30:00.000Z');
	});

	it('gibt bei der doppelt vorhandenen Stunde die erste Lesart zurueck', () => {
		// 02:30 kommt am 25.10.2026 zweimal vor. Festgelegt ist die erste,
		// also noch Sommerzeit (UTC+2) — siehe Kommentar in zeit.ts.
		expect(alsIso(ortszeitZuZeitpunkt('2026-10-25 02:30:00'))).toBe('2026-10-25T00:30:00.000Z');
	});

	it('kommt mit der uebersprungenen Stunde im Maerz zurecht', () => {
		// Am 29.03.2026 springt es von 02:00 MEZ auf 03:00 MESZ; 02:30 gibt es
		// nicht. Wichtig ist nicht der genaue Wert, sondern dass das Ergebnis
		// eindeutig ist und in der Naehe des Sprungs liegt.
		const zeitpunkt = ortszeitZuZeitpunkt('2026-03-29 02:30:00');
		expect(Number.isNaN(zeitpunkt.getTime())).toBe(false);
		expect(alsIso(zeitpunkt)).toBe('2026-03-29T01:30:00.000Z');
	});

	it('haelt einen Zeitraum ueber die Umstellung hinweg richtig', () => {
		// Der Fall, der eine eigene Stundenrechnung entlarven wuerde: Ein
		// Zeitraum vom Vorabend der Rueckstellung bis zum Mittag danach dauert
		// nicht 14, sondern 15 Stunden.
		const beginn = ortszeitZuZeitpunkt('2026-10-24 22:00:00');
		const ende = ortszeitZuZeitpunkt('2026-10-25 12:00:00');
		const stunden = (ende.getTime() - beginn.getTime()) / 3_600_000;
		expect(stunden).toBe(15);
	});

	it('weist eine unlesbare Angabe zurueck, statt zu raten', () => {
		expect(() => ortszeitZuZeitpunkt('13.08.2026 17:00')).toThrow();
		expect(() => ortszeitZuZeitpunkt('')).toThrow();
	});
});

describe('Formulierung von Zeitangaben', () => {
	it('nennt Wochentag, Datum und Uhrzeit in Ortszeit', () => {
		const text = alsWochentagDatumUhrzeit(ortszeitZuZeitpunkt('2026-08-14 18:00:00'));
		expect(text).toContain('Freitag');
		expect(text).toContain('18:00');
		expect(text).toContain('14.08');
	});

	it('nennt die Uhrzeit in Ortszeit, nicht in UTC', () => {
		expect(alsUhrzeit(ortszeitZuZeitpunkt('2026-08-13 20:00:00'))).toBe('20:00 Uhr');
		expect(alsUhrzeit(ortszeitZuZeitpunkt('2026-01-15 20:00:00'))).toBe('20:00 Uhr');
	});
});

describe('alsIsoMitVersatz (Feature 052, E-04)', () => {
	it('gibt Sommerzeit mit Versatz +02:00 aus', () => {
		expect(alsIsoMitVersatz(ortszeitZuZeitpunkt('2026-08-13 17:00:00'))).toBe(
			'2026-08-13T17:00:00+02:00'
		);
	});

	it('gibt Winterzeit mit Versatz +01:00 aus', () => {
		expect(alsIsoMitVersatz(ortszeitZuZeitpunkt('2026-01-15 17:00:00'))).toBe(
			'2026-01-15T17:00:00+01:00'
		);
	});

	it('ergibt beim erneuten Einlesen ueber ortszeitZuZeitpunkt denselben Zeitpunkt', () => {
		// Die Ortszeit-Ziffern eines Werts mit Versatz sind identisch mit
		// dem, was ortszeitZuZeitpunkt aus der versatzlosen Schreibweise
		// gewinnt — die eigentliche Pruefung ist der Zeitpunkt selbst.
		for (const text of ['2026-08-13 17:00:00', '2026-01-15 17:00:00', '2026-10-25 01:30:00']) {
			const zeitpunkt = ortszeitZuZeitpunkt(text);
			const mitVersatz = alsIsoMitVersatz(zeitpunkt);
			expect(new Date(mitVersatz).getTime()).toBe(zeitpunkt.getTime());
		}
	});
});

describe('gleicherTag', () => {
	it('erkennt denselben Tag in Ortszeit', () => {
		expect(
			gleicherTag(ortszeitZuZeitpunkt('2026-08-13 08:00:00'), ortszeitZuZeitpunkt('2026-08-13 23:00:00'))
		).toBe(true);
	});

	it('trennt Tage anhand der Ortszeit, nicht anhand von UTC', () => {
		// 23:30 Ortszeit ist im Sommer bereits 21:30 UTC — derselbe Tag. Aber
		// 00:30 Ortszeit am Folgetag ist 22:30 UTC am Vortag: Wer in UTC
		// rechnet, haelt beides faelschlich fuer denselben Tag.
		const spaetAbends = ortszeitZuZeitpunkt('2026-08-13 23:30:00');
		const kurzNachMitternacht = ortszeitZuZeitpunkt('2026-08-14 00:30:00');
		expect(gleicherTag(spaetAbends, kurzNachMitternacht)).toBe(false);
	});
});
