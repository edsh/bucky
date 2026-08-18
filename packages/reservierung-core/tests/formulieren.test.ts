import { describe, expect, it } from 'vitest';
import {
	alsAltersangabe,
	alsDauer,
	alsRueckfallHinweis,
	alsSatz,
	alsStatussatz,
	alsZusatzzeile
} from '../src/formulieren.js';
import type { Belegungsauskunft, Maschinenzustand } from '../src/typen.js';

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

describe('alsRueckfallHinweis (FR-019, Feature 052)', () => {
	it('gibt keinen Hinweis, wenn die Quelle der Kalender ist', () => {
		expect(alsRueckfallHinweis('kalender')).toBeNull();
	});

	it('gibt einen zurueckhaltenden Hinweis bei Rueckfall', () => {
		const hinweis = alsRueckfallHinweis('rueckfall');
		expect(hinweis).toBe('Letzter bekannter Stand');
	});

	it('nennt weder Ursache noch Technik noch eine Schuldzuweisung', () => {
		const hinweis = alsRueckfallHinweis('rueckfall') ?? '';
		for (const verbotenesWort of ['Fehler', 'Ausfall', 'Kalender', 'Netzwerk', 'Vereinsflieger']) {
			expect(hinweis).not.toContain(verbotenesWort);
		}
	});
});

/* -------------------------------------------------------------------------
 * Feature 054 — Statussätze und Zusatzzeilen (contracts/zustand.md).
 * ---------------------------------------------------------------------- */

describe('alsStatussatz', () => {
	const bezug = new Date('2026-08-15T11:00:00+02:00');

	function zustand(teil: Partial<Maschinenzustand>): Maschinenzustand {
		return {
			kennung: 'D-EELK',
			status: 'frei',
			wechselAm: null,
			wechselZu: null,
			danachAm: null,
			draengen: 0,
			naechsteLuecke: null,
			...teil
		};
	}

	it('nennt bei einer Sperre ein Datum, keine Uhrzeit (FR-014)', () => {
		// "Gesperrt bis Freitag, 16:00" verspricht eine Genauigkeit, die
		// eine Wartung nicht hat.
		const satz = alsStatussatz(
			zustand({ status: 'sperre', wechselAm: '2026-08-21T16:00:00+02:00' }),
			bezug
		);
		expect(satz).toBe('Gesperrt bis Freitag, 21. Aug.');
		expect(satz).not.toMatch(/\d{2}:\d{2}/);
	});

	it('nennt bei einer laufenden Belegung die Uhrzeit', () => {
		expect(
			alsStatussatz(zustand({ status: 'belegt', wechselAm: '2026-08-15T14:00:00+02:00' }), bezug)
		).toBe('Belegt bis 14:00');
	});

	it('schreibt bei einer Belegung über den Tag hinaus das Datum dazu', () => {
		expect(
			alsStatussatz(zustand({ status: 'belegt', wechselAm: '2026-08-16T14:00:00+02:00' }), bezug)
		).toBe('Belegt bis So., 16.08., 14:00');
	});

	it('sagt bei bald, bis wann noch frei ist', () => {
		expect(
			alsStatussatz(zustand({ status: 'bald', wechselAm: '2026-08-15T18:00:00+02:00' }), bezug)
		).toBe('Frei bis 18:00');
	});

	it('sagt bei frei ohne jede Aussicht auf Belegung den ganzen Tag zu', () => {
		expect(alsStatussatz(zustand({ status: 'frei' }), bezug)).toBe('Frei den ganzen Tag');
	});

	it('sagt bei frei mit späterer Belegung schlicht frei', () => {
		expect(
			alsStatussatz(zustand({ status: 'frei', wechselAm: '2026-08-17T08:00:00+02:00' }), bezug)
		).toBe('Frei');
	});
});

describe('alsZusatzzeile', () => {
	const bezug = new Date('2026-08-15T11:00:00+02:00');

	function zustand(teil: Partial<Maschinenzustand>): Maschinenzustand {
		return {
			kennung: 'D-EELK',
			status: 'frei',
			wechselAm: null,
			wechselZu: null,
			danachAm: null,
			draengen: 0,
			naechsteLuecke: null,
			...teil
		};
	}

	it('sagt bei einer Belegung, bis wann es danach frei ist', () => {
		expect(
			alsZusatzzeile(
				zustand({
					status: 'belegt',
					wechselAm: '2026-08-15T14:00:00+02:00',
					danachAm: '2026-08-15T18:00:00+02:00'
				}),
				bezug
			)
		).toBe('danach frei bis 18:00');
	});

	it('sagt "danach den ganzen Tag frei", wenn nichts mehr folgt', () => {
		expect(
			alsZusatzzeile(zustand({ status: 'belegt', wechselAm: '2026-08-15T14:00:00+02:00' }), bezug)
		).toBe('danach den ganzen Tag frei');
	});

	it('sagt bei bald, bis wann die kommende Belegung dauert', () => {
		expect(
			alsZusatzzeile(
				zustand({
					status: 'bald',
					wechselAm: '2026-08-15T18:00:00+02:00',
					danachAm: '2026-08-15T20:00:00+02:00'
				}),
				bezug
			)
		).toBe('danach bis 20:00 belegt');
	});

	it('wiederholt bei einer Sperre das Datum', () => {
		expect(
			alsZusatzzeile(zustand({ status: 'sperre', wechselAm: '2026-08-21T16:00:00+02:00' }), bezug)
		).toBe('bis Freitag, 21. Aug.');
	});

	it('schweigt, wenn es nichts zu sagen gibt', () => {
		expect(alsZusatzzeile(zustand({ status: 'frei' }), bezug)).toBeNull();
	});

	it('nennt bei „frei" die nächste Reservierung mit Tag und Uhrzeit', () => {
		// Der Abendfall: „Frei" allein ist um 22 Uhr eine seltsame Auskunft.
		// Frei ist die Maschine da immer — die Frage ist, ab wann nicht mehr.
		expect(
			alsZusatzzeile(
				zustand({ status: 'frei', wechselAm: '2026-08-20T14:30:00+02:00', wechselZu: 'belegt' }),
				bezug
			)
		).toBe('nächste Reservierung Do., 20.08., 14:30');
	});

	it('nennt bei „frei" auch dann den Tag, wenn die Uhrzeit allein reichte', () => {
		// Ein Status `frei` mit einem Wechsel *heute* kommt nicht vor — dann
		// wäre es `bald` (Z-04). Die Zeitangabe muss den Tag deshalb immer
		// tragen: „14:30" allein läse sich als heute.
		const zeile = alsZusatzzeile(
			zustand({ status: 'frei', wechselAm: '2026-08-16T09:00:00+02:00', wechselZu: 'belegt' }),
			bezug
		);
		expect(zeile).toBe('nächste Reservierung So., 16.08., 09:00');
	});
});

describe('alsDauer', () => {
	it('schreibt halbe Stunden mit Dezimalkomma', () => {
		expect(alsDauer('2026-08-15T10:00:00+02:00', '2026-08-15T13:30:00+02:00')).toBe('3,5 h');
	});

	it('schreibt ganze Stunden ohne Nachkommastelle', () => {
		expect(alsDauer('2026-08-15T10:00:00+02:00', '2026-08-15T12:00:00+02:00')).toBe('2 h');
	});

	it('schreibt einen ganztägigen Eintrag als 24 h', () => {
		expect(alsDauer('2026-08-15T00:00:00+02:00', '2026-08-16T00:00:00+02:00')).toBe('24 h');
	});

	it('rechnet über die Zeitumstellung in echten Stunden', () => {
		// Der 25.10. ist 25 Stunden lang — ein ganztägiger Eintrag dauert
		// dann tatsächlich 25 h. Das ist keine Panne, sondern die Wahrheit.
		expect(alsDauer('2026-10-25T00:00:00+02:00', '2026-10-26T00:00:00+01:00')).toBe('25 h');
	});
});
