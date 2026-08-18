import { describe, expect, it } from 'vitest';
import {
	alsIso,
	alsIsoMitVersatz,
	alsKurzdatumUhrzeit,
	alsTagesdatum,
	alsUhrzeit,
	alsWochentagDatumUhrzeit,
	gleicherTag,
	minuteDesTages,
	ortstag,
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

/* -------------------------------------------------------------------------
 * Feature 054 — die Formate der Flottenuebersicht (FR-015) und die
 * Tagesrechnung des Rings (T-11).
 * ---------------------------------------------------------------------- */

describe('alsKurzdatumUhrzeit', () => {
	it('schreibt Wochentag abgekuerzt, Datum ohne Jahr und die Uhrzeit', () => {
		expect(alsKurzdatumUhrzeit(ortszeitZuZeitpunkt('2026-08-15 12:00:00'))).toBe(
			'Sa., 15.08., 12:00'
		);
	});

	it('bleibt auch im Winter bei der Ortszeit', () => {
		expect(alsKurzdatumUhrzeit(ortszeitZuZeitpunkt('2026-01-15 08:05:00'))).toBe(
			'Do., 15.01., 08:05'
		);
	});
});

describe('alsTagesdatum', () => {
	it('schreibt den Wochentag aus und den Monat abgekuerzt', () => {
		expect(alsTagesdatum(ortszeitZuZeitpunkt('2026-08-15 12:00:00'))).toBe('Samstag, 15. Aug.');
	});
});

describe('ortstag', () => {
	it('liefert das Datum als YYYY-MM-DD', () => {
		expect(ortstag(ortszeitZuZeitpunkt('2026-08-15 12:00:00'))).toBe('2026-08-15');
	});

	it('richtet sich nach der Platzzone, nicht nach UTC', () => {
		// 00:30 Ortszeit im Sommer ist 22:30 UTC am Vortag. Wer in UTC
		// rechnet, schlaegt die Sonnenzeiten des falschen Tages nach.
		expect(ortstag(ortszeitZuZeitpunkt('2026-08-15 00:30:00'))).toBe('2026-08-15');
	});

	it('ignoriert die Zone des Geraets (T-11)', () => {
		// Dieselbe absolute Zeit, egal wie das Telefon eingestellt ist: Der
		// Ring zeigt den Tag am Flugplatz.
		const zeitpunkt = new Date('2026-08-14T22:30:00Z');
		expect(ortstag(zeitpunkt)).toBe('2026-08-15');
	});
});

describe('minuteDesTages', () => {
	it('zaehlt Minuten seit Ortsmitternacht', () => {
		expect(minuteDesTages(ortszeitZuZeitpunkt('2026-08-15 00:00:00'))).toBe(0);
		expect(minuteDesTages(ortszeitZuZeitpunkt('2026-08-15 06:00:00'))).toBe(360);
		expect(minuteDesTages(ortszeitZuZeitpunkt('2026-08-15 21:00:00'))).toBe(1260);
		expect(minuteDesTages(ortszeitZuZeitpunkt('2026-08-15 23:59:00'))).toBe(1439);
	});

	it('liefert die Uhrzeit, die auf der Uhr steht — auch am Umstellungstag', () => {
		// Der 25.10.2026 ist 25 Stunden lang. Der Ring bildet trotzdem
		// Uhrzeiten ab, nicht verstrichene Zeit: 15:00 bleibt 15:00.
		expect(minuteDesTages(ortszeitZuZeitpunkt('2026-10-25 15:00:00'))).toBe(900);
		// Und am kurzen Tag im Maerz ebenso.
		expect(minuteDesTages(ortszeitZuZeitpunkt('2026-03-29 15:00:00'))).toBe(900);
	});

	it('richtet sich nach der Platzzone, nicht nach dem Geraet', () => {
		expect(minuteDesTages(new Date('2026-08-15T10:00:00Z'))).toBe(12 * 60);
		expect(minuteDesTages(new Date('2026-01-15T10:00:00Z'))).toBe(11 * 60);
	});
});

describe('alsIsoMitVersatz — Millisekunden', () => {
	it('gibt auch bei einem Zeitpunkt mit Millisekunden einen ganzen Versatz aus', () => {
		// Der Fehler, den diese Prüfung festhält: Ohne die Millisekunden in
		// der Differenz kam „+01:59.992216666666664" heraus. `new Date(...)`
		// darauf ergibt „Invalid Date" — und die ganze Kachel blieb leer.
		const mitMillisekunden = new Date('2026-08-18T14:00:00.437+02:00');
		expect(alsIsoMitVersatz(mitMillisekunden)).toBe('2026-08-18T14:00:00+02:00');
	});

	it('bleibt im Winter bei +01:00', () => {
		expect(alsIsoMitVersatz(new Date('2026-12-21T14:00:00.789+01:00'))).toBe(
			'2026-12-21T14:00:00+01:00'
		);
	});

	it('liefert stets eine Angabe, die sich wieder einlesen lässt', () => {
		for (const ms of [0, 1, 437, 999]) {
			const zeitpunkt = new Date(Date.UTC(2026, 7, 18, 12, 0, 0, ms));
			expect(Number.isNaN(new Date(alsIsoMitVersatz(zeitpunkt)).getTime())).toBe(false);
		}
	});
});
