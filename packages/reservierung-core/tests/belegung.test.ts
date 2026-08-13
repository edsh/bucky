import { describe, expect, it } from 'vitest';
import { antwortDeuten } from '../src/antwort-deuten.js';
import { belegungsauskunft } from '../src/belegung.js';
import type { Abrufstand, Reservierung } from '../src/typen.js';
import echteAntwort from './beispiele/antwort-echt.json' with { type: 'json' };

const r = (beginn: string, ende: string, art: 'reservierung' | 'sperre' = 'reservierung'): Reservierung => ({
	kennung: 'D-EELK',
	beginn,
	ende,
	art
});

const stand = (reservierungen: Reservierung[], abgerufenAm = '2026-08-13T06:00:00.000Z'): Abrufstand => ({
	abgerufenAm,
	reservierungen,
	verworfeneEintraege: 0,
	neuanmeldungen: 0
});

/** Kurzform: Ortszeit am Platz als Bezugszeitpunkt. */
const um = (ortszeit: string) => new Date(`${ortszeit.replace(' ', 'T')}+02:00`);

describe('belegungsauskunft — Grundfaelle', () => {
	it('meldet frei, wenn keine Belegung laeuft, und nennt die naechste', () => {
		const auskunft = belegungsauskunft(
			stand([r('2026-08-13 17:00:00', '2026-08-13 20:00:00')]),
			'D-EELK',
			um('2026-08-13 08:00:00')
		);
		expect(auskunft.frei).toBe(true);
		expect(auskunft.art).toBeNull();
		expect(auskunft.wechselAm).toBe('2026-08-13T15:00:00.000Z');
		expect(auskunft.wechselZu).toBe('belegt');
	});

	it('meldet belegt, waehrend eine Reservierung laeuft', () => {
		const auskunft = belegungsauskunft(
			stand([r('2026-08-13 17:00:00', '2026-08-13 20:00:00')]),
			'D-EELK',
			um('2026-08-13 18:00:00')
		);
		expect(auskunft.frei).toBe(false);
		expect(auskunft.art).toBe('reservierung');
		expect(auskunft.wechselAm).toBe('2026-08-13T18:00:00.000Z');
		expect(auskunft.wechselZu).toBe('frei');
	});

	it('meldet frei ohne Wechsel, wenn gar nichts vorliegt', () => {
		const auskunft = belegungsauskunft(stand([]), 'D-EELK', um('2026-08-13 08:00:00'));
		expect(auskunft.frei).toBe(true);
		expect(auskunft.wechselAm).toBeNull();
		expect(auskunft.wechselZu).toBeNull();
	});

	it('beachtet nur die gefragte Kennung', () => {
		const fremd: Reservierung = { ...r('2026-08-13 17:00:00', '2026-08-13 20:00:00'), kennung: 'D-EXYZ' };
		const auskunft = belegungsauskunft(stand([fremd]), 'D-EELK', um('2026-08-13 18:00:00'));
		expect(auskunft.frei).toBe(true);
	});

	it('nimmt die Kennung in beliebiger Schreibweise an', () => {
		const auskunft = belegungsauskunft(
			stand([r('2026-08-13 17:00:00', '2026-08-13 20:00:00')]),
			' d-eelk ',
			um('2026-08-13 18:00:00')
		);
		expect(auskunft.frei).toBe(false);
		expect(auskunft.kennung).toBe('D-EELK');
	});
});

describe('belegungsauskunft — Grenzen', () => {
	it('zaehlt den Beginn mit: genau zum Beginn ist belegt', () => {
		const auskunft = belegungsauskunft(
			stand([r('2026-08-13 17:00:00', '2026-08-13 20:00:00')]),
			'D-EELK',
			um('2026-08-13 17:00:00')
		);
		expect(auskunft.frei).toBe(false);
	});

	it('zaehlt das Ende nicht mit: genau zum Ende ist frei', () => {
		const auskunft = belegungsauskunft(
			stand([r('2026-08-13 17:00:00', '2026-08-13 20:00:00')]),
			'D-EELK',
			um('2026-08-13 20:00:00')
		);
		expect(auskunft.frei).toBe(true);
	});
});

describe('belegungsauskunft — Ketten', () => {
	it('nennt bei lueckenlosem Anschluss erst das Ende der letzten Belegung', () => {
		// Der Fall, um den es wirklich geht. Ohne diese Regel hiesse es
		// "frei ab 20:00" — und um 20:00 beginnt die naechste Reservierung.
		const auskunft = belegungsauskunft(
			stand([
				r('2026-08-13 17:00:00', '2026-08-13 20:00:00'),
				r('2026-08-13 20:00:00', '2026-08-13 22:00:00')
			]),
			'D-EELK',
			um('2026-08-13 18:00:00')
		);
		expect(auskunft.wechselAm).toBe('2026-08-13T20:00:00.000Z');
	});

	it('behandelt einen Spalt von Minuten als echte Luecke', () => {
		const auskunft = belegungsauskunft(
			stand([
				r('2026-08-13 17:00:00', '2026-08-13 20:00:00'),
				r('2026-08-13 20:10:00', '2026-08-13 22:00:00')
			]),
			'D-EELK',
			um('2026-08-13 18:00:00')
		);
		expect(auskunft.wechselAm).toBe('2026-08-13T18:00:00.000Z');
	});

	it('kommt mit ueberlappenden Belegungen zurecht', () => {
		const auskunft = belegungsauskunft(
			stand([
				r('2026-08-13 17:00:00', '2026-08-13 20:00:00'),
				r('2026-08-13 19:00:00', '2026-08-13 23:00:00')
			]),
			'D-EELK',
			um('2026-08-13 18:00:00')
		);
		expect(auskunft.wechselAm).toBe('2026-08-13T21:00:00.000Z');
	});

	it('nimmt eine kuerzere, ganz enthaltene Belegung nicht als Kettenende', () => {
		const auskunft = belegungsauskunft(
			stand([
				r('2026-08-13 17:00:00', '2026-08-13 23:00:00'),
				r('2026-08-13 18:00:00', '2026-08-13 19:00:00')
			]),
			'D-EELK',
			um('2026-08-13 18:30:00')
		);
		expect(auskunft.wechselAm).toBe('2026-08-13T21:00:00.000Z');
	});
});

describe('belegungsauskunft — Sperren', () => {
	it('belegt das Flugzeug ebenso und nennt die Art', () => {
		const auskunft = belegungsauskunft(
			stand([r('2026-08-22 00:00:00', '2026-08-24 00:00:00', 'sperre')]),
			'D-EELK',
			um('2026-08-22 12:00:00')
		);
		expect(auskunft.frei).toBe(false);
		expect(auskunft.art).toBe('sperre');
	});

	it('bildet mit einer anschliessenden Reservierung eine Kette', () => {
		const auskunft = belegungsauskunft(
			stand([
				r('2026-08-22 00:00:00', '2026-08-24 00:00:00', 'sperre'),
				r('2026-08-24 00:00:00', '2026-08-24 18:00:00')
			]),
			'D-EELK',
			um('2026-08-22 12:00:00')
		);
		// Fuer die Frage *ob* belegt zaehlen beide gleich ...
		expect(auskunft.wechselAm).toBe('2026-08-24T16:00:00.000Z');
		// ... fuer die Wortwahl nur die gerade laufende.
		expect(auskunft.art).toBe('sperre');
	});
});

describe('belegungsauskunft — mehrtaegig und Zeitumstellung', () => {
	it('haelt eine mehrtaegige Belegung zusammen', () => {
		const auskunft = belegungsauskunft(
			stand([r('2026-09-12 15:00:00', '2026-09-13 12:00:00')]),
			'D-EELK',
			new Date('2026-09-12T20:00:00.000Z')
		);
		expect(auskunft.frei).toBe(false);
		expect(auskunft.wechselAm).toBe('2026-09-13T10:00:00.000Z');
	});

	it('rechnet ueber die Zeitumstellung hinweg richtig', () => {
		// Belegung vom Vorabend der Rueckstellung bis zum Mittag danach. Wer
		// die Ortszeit naiv als UTC liest, landet eine Stunde daneben.
		const auskunft = belegungsauskunft(
			stand([r('2026-10-24 22:00:00', '2026-10-25 12:00:00')], '2026-10-25T09:00:00.000Z'),
			'D-EELK',
			new Date('2026-10-25T09:30:00.000Z')
		);
		expect(auskunft.frei).toBe(false);
		expect(auskunft.wechselAm).toBe('2026-10-25T11:00:00.000Z');
	});
});

describe('belegungsauskunft — Zeitangaben mit Versatz (Feature 052, E-04)', () => {
	it('deutet eine Reservierung mit Zeitversatz genauso wie ohne', () => {
		const auskunft = belegungsauskunft(
			stand([r('2026-08-13T17:00:00+02:00', '2026-08-13T20:00:00+02:00')]),
			'D-EELK',
			um('2026-08-13 18:00:00')
		);
		expect(auskunft.frei).toBe(false);
		expect(auskunft.wechselAm).toBe('2026-08-13T18:00:00.000Z');
	});

	it('kommt mit gemischten Formaten in derselben Kette zurecht', () => {
		// Ein Eintrag aus dem Kalender-Weg (mit Versatz) neben einem
		// Altbestand (ohne Versatz) — beides muss dieselbe Kette bilden.
		const auskunft = belegungsauskunft(
			stand([
				r('2026-08-13 17:00:00', '2026-08-13 20:00:00'),
				r('2026-08-13T20:00:00+02:00', '2026-08-13T22:00:00+02:00')
			]),
			'D-EELK',
			um('2026-08-13 18:00:00')
		);
		expect(auskunft.wechselAm).toBe('2026-08-13T20:00:00.000Z');
	});
});

describe('belegungsauskunft — gegen den echten Abzug', () => {
	it('meldet die D-EELK waehrend der echten Sperre als gesperrt', () => {
		const { reservierungen } = antwortDeuten(echteAntwort);
		const auskunft = belegungsauskunft(
			stand(reservierungen),
			'D-EELK',
			um('2026-08-23 10:00:00')
		);
		expect(auskunft.frei).toBe(false);
		expect(auskunft.art).toBe('sperre');
	});

	it('meldet die D-EELK an einem unbelegten Vormittag als frei', () => {
		const { reservierungen } = antwortDeuten(echteAntwort);
		const auskunft = belegungsauskunft(
			stand(reservierungen),
			'D-EELK',
			um('2026-08-13 09:00:00')
		);
		expect(auskunft.frei).toBe(true);
		expect(auskunft.wechselAm).toBe('2026-08-13T15:00:00.000Z');
	});
});
