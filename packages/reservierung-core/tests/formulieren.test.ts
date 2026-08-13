import { describe, expect, it } from 'vitest';
import { alsAltersangabe, alsSatz } from '../src/formulieren.js';
import type { Belegungsauskunft } from '../src/typen.js';

const JETZT = new Date('2026-08-13T10:00:00.000Z'); // 12:00 Ortszeit

const auskunft = (felder: Partial<Belegungsauskunft> = {}): Belegungsauskunft => ({
	kennung: 'D-EELK',
	frei: true,
	art: null,
	wechselAm: null,
	wechselZu: null,
	abgerufenAm: '2026-08-13T09:50:00.000Z',
	veraltet: false,
	...felder
});

describe('alsSatz — frei', () => {
	it('nennt die naechste Belegung mit', () => {
		const satz = alsSatz(
			auskunft({ wechselAm: '2026-08-13T15:00:00.000Z', wechselZu: 'belegt' }),
			JETZT
		);
		expect(satz).toBe('Frei — nächste Belegung ab 17:00 Uhr');
	});

	it('sagt es offen, wenn nichts ansteht', () => {
		expect(alsSatz(auskunft(), JETZT)).toBe('Frei — keine Belegung in Sicht');
	});

	it('nennt Wochentag und Datum, wenn die Belegung nicht heute beginnt', () => {
		const satz = alsSatz(
			auskunft({ wechselAm: '2026-08-14T16:00:00.000Z', wechselZu: 'belegt' }),
			JETZT
		);
		expect(satz).toContain('Freitag');
		expect(satz).toContain('14.08');
		expect(satz).toContain('18:00');
	});
});

describe('alsSatz — belegt', () => {
	it('nennt, bis wann', () => {
		const satz = alsSatz(
			auskunft({
				frei: false,
				art: 'reservierung',
				wechselAm: '2026-08-13T18:00:00.000Z',
				wechselZu: 'frei'
			}),
			JETZT
		);
		expect(satz).toBe('Belegt bis 20:00 Uhr');
	});

	it('unterscheidet eine Sperre von einer Reservierung (FR-007a)', () => {
		// Der Unterschied, der jemanden davor bewahrt, umsonst zum Platz zu
		// fahren: "Belegt bis Montag" klingt, als flöge jemand damit.
		const satz = alsSatz(
			auskunft({
				frei: false,
				art: 'sperre',
				wechselAm: '2026-08-24T00:00:00.000Z',
				wechselZu: 'frei'
			}),
			JETZT
		);
		expect(satz).toContain('Gesperrt bis');
		expect(satz).not.toContain('Belegt');
	});

	it('nennt bei mehrtaegiger Belegung Wochentag und Datum', () => {
		const satz = alsSatz(
			auskunft({
				frei: false,
				art: 'reservierung',
				wechselAm: '2026-08-15T10:00:00.000Z',
				wechselZu: 'frei'
			}),
			JETZT
		);
		expect(satz).toContain('Samstag');
		expect(satz).toContain('15.08');
	});
});

describe('alsAltersangabe', () => {
	it('nennt das Alter', () => {
		expect(alsAltersangabe(auskunft(), JETZT)).toBe('Stand vor 10 Minuten');
	});

	it('kennzeichnet einen veralteten Stand sichtbar (FR-009)', () => {
		const text = alsAltersangabe(
			auskunft({ abgerufenAm: '2026-08-13T07:00:00.000Z', veraltet: true }),
			JETZT
		);
		expect(text).toContain('vor 3 Stunden');
		expect(text).toContain('veraltet');
	});
});
