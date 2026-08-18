import { describe, expect, it } from 'vitest';
import { flotteBilden, kategorieFuer, STAMMLISTE } from '../src/flotte.js';
import type { Reservierung } from '../src/typen.js';

function res(kennung: string): Reservierung {
	return {
		kennung,
		beginn: '2026-08-15T10:00:00+02:00',
		ende: '2026-08-15T12:00:00+02:00',
		art: 'reservierung'
	};
}

describe('kategorieFuer', () => {
	it('erkennt die sechs echten Kennzeichen des Vereins richtig (E-02)', () => {
		// Die Regel ist am Kalenderabzug vom 13.08.2026 belegt, nicht am
		// Schreibtisch erfunden: sechs Treffer von sechs.
		expect(kategorieFuer('D-EELK')).toBe('motor');
		expect(kategorieFuer('D-EXYZ')).toBe('motor');
		expect(kategorieFuer('D-MRXS')).toBe('motor');
		expect(kategorieFuer('D-9021')).toBe('segelflug');
		expect(kategorieFuer('D-4413')).toBe('segelflug');
		expect(kategorieFuer('D-3004')).toBe('segelflug');
	});

	it('entscheidet allein am Eintragungszeichen, nicht am Staatszeichen', () => {
		expect(kategorieFuer('OE-1234')).toBe('segelflug');
		expect(kategorieFuer('OE-ABCD')).toBe('motor');
	});

	it('haelt gemischte Eintragungszeichen fuer Motor/UL', () => {
		// Der Motorsegler D-KABC ist der echte Grenzfall der Regel: Er faellt
		// hier auf 'motor'. Der Verein hat keinen — waere das anders, muesste
		// die Stammliste ueberschreiben duerfen.
		expect(kategorieFuer('D-KABC')).toBe('motor');
		expect(kategorieFuer('D-1A23')).toBe('motor');
	});
});

describe('flotteBilden', () => {
	it('nimmt Maschinen aus der Stammliste auf, die in keiner Buchung stehen', () => {
		// Der eigentliche Zweck der Liste (E-01): Ein Flugzeug, das niemand
		// gebucht hat, verschwaende sonst genau dann, wenn es frei ist.
		const flotte = flotteBilden(['D-EELK', 'D-EXYZ'], []);
		expect(flotte.map((m) => m.kennung)).toEqual(['D-EELK', 'D-EXYZ']);
	});

	it('nimmt Maschinen aus den Daten auf, die nicht in der Liste stehen', () => {
		// Ein neu angeschafftes Flugzeug soll beim ersten Buchen erscheinen
		// und nicht erst nach einer Veroeffentlichung.
		const flotte = flotteBilden(['D-EELK'], [res('D-ENEU')]);
		expect(flotte.map((m) => m.kennung)).toEqual(['D-EELK', 'D-ENEU']);
	});

	it('zaehlt eine Kennung genau einmal, wenn sie in beidem vorkommt', () => {
		const flotte = flotteBilden(['D-EELK'], [res('D-EELK'), res('D-EELK')]);
		expect(flotte).toHaveLength(1);
	});

	it('vereinheitlicht Schreibweisen aus den Daten', () => {
		const flotte = flotteBilden(['D-EELK'], [res('d-eelk'), res(' D-EELK ')]);
		expect(flotte.map((m) => m.kennung)).toEqual(['D-EELK']);
	});

	it('sortiert Motor vor Segelflug und darin alphabetisch', () => {
		const flotte = flotteBilden(['D-9021', 'D-EXYZ', 'D-3004', 'D-EELK'], []);
		expect(flotte.map((m) => m.kennung)).toEqual(['D-EELK', 'D-EXYZ', 'D-3004', 'D-9021']);
	});

	it('liefert bei leerer Datenlage genau die Stammliste', () => {
		// Kein Stand heisst nicht "keine Flotte": Die Uebersicht zeigt weiter
		// alle Maschinen, nur ohne Auskunft ueber ihren Zustand (FR-022).
		const flotte = flotteBilden(STAMMLISTE, []);
		expect(flotte).toHaveLength(STAMMLISTE.length);
	});

	it('liefert bei leerer Stammliste immer noch die Maschinen aus den Daten', () => {
		const flotte = flotteBilden([], [res('D-EELK')]);
		expect(flotte.map((m) => m.kennung)).toEqual(['D-EELK']);
	});

	it('ergibt aus dem echten Abzug die sechs bekannten Maschinen', () => {
		// Drei davon stehen im Abzug ausschliesslich in Sperren. Wer die
		// Flotte nur aus Reservierungen bildete, verloere die halbe Flotte.
		const ausDenDaten = ['D-EELK', 'D-EXYZ', 'D-MRXS', 'D-9021', 'D-4413', 'D-3004'];
		const flotte = flotteBilden([], ausDenDaten.map(res));
		expect(flotte.map((m) => m.kennung)).toEqual([
			'D-EELK',
			'D-EXYZ',
			'D-MRXS',
			'D-3004',
			'D-4413',
			'D-9021'
		]);
		expect(flotte.filter((m) => m.kategorie === 'segelflug')).toHaveLength(3);
	});
});
