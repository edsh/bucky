import { describe, expect, it } from 'vitest';
import { FARBEN, mischen, statusfarbe } from '../../src/lib/flotte/farben.js';
import { darstellungFuer, kurzkennung } from '../../src/lib/flotte/darstellung.js';
import type { Maschinenzustand } from '@edsh-bucky/reservierung-core';

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

/** `rgb(31 143 69)` → `[31, 143, 69]`, damit sich Farben vergleichen lassen. */
function kanaele(farbe: string): number[] {
	const treffer = /rgb\(([^)]+)\)/.exec(farbe);
	if (!treffer) throw new Error(`Keine rgb-Farbe: ${farbe}`);
	return treffer[1].split(/[\s,]+/).map(Number);
}

describe('statusfarbe (FR-006, E-05)', () => {
	it('ist bei frei ohne Drängen genau der Freiton des Handoffs', () => {
		expect(kanaele(statusfarbe(zustand({ status: 'frei' })))).toEqual([0x1f, 0x8f, 0x45]);
	});

	it('ist bei belegt der Belegtton', () => {
		expect(statusfarbe(zustand({ status: 'belegt' }))).toBe(FARBEN.belegt);
	});

	it('nimmt bei einer Sperre den stumpferen Sperrton, nicht das Rot', () => {
		// Eine Sperre ist keine Belegung durch jemand anderen: Sie in
		// derselben Farbe zu zeigen hieße, „gleich wieder frei" zu suggerieren.
		expect(statusfarbe(zustand({ status: 'sperre' }))).toBe(FARBEN.sperreFlaeche);
	});

	it('wandert bei bald stufenlos ins Rote, ohne eigenen Farbzustand', () => {
		const kaum = kanaele(statusfarbe(zustand({ status: 'bald', draengen: 0.1 })));
		const gleich = kanaele(statusfarbe(zustand({ status: 'bald', draengen: 0.9 })));

		// Der Rotanteil steigt, der Grünanteil fällt — und zwar monoton,
		// ohne dass irgendwo eine Schwelle springt.
		expect(gleich[0]).toBeGreaterThan(kaum[0]);
		expect(gleich[1]).toBeLessThan(kaum[1]);
	});

	it('erreicht bei vollem Drängen genau den Belegtton', () => {
		expect(kanaele(statusfarbe(zustand({ status: 'bald', draengen: 1 })))).toEqual([
			0xc0, 0x44, 0x2b
		]);
	});
});

describe('mischen', () => {
	it('begrenzt Anteile außerhalb von [0, 1], statt zu extrapolieren', () => {
		expect(kanaele(mischen(FARBEN.frei, FARBEN.belegt, -5))).toEqual([0x1f, 0x8f, 0x45]);
		expect(kanaele(mischen(FARBEN.frei, FARBEN.belegt, 5))).toEqual([0xc0, 0x44, 0x2b]);
	});

	it('liefert eine CSS-taugliche Farbe ohne Rundung im Adapter (C-03)', () => {
		expect(mischen(FARBEN.frei, FARBEN.belegt, 0.5)).toMatch(/^rgb\([\d.]+ [\d.]+ [\d.]+\)$/);
	});
});

describe('darstellungFuer (E-03, FR-018)', () => {
	it('gibt nur der D-EELK einen POH-Pfad', () => {
		expect(darstellungFuer('D-EELK').pohPfad).toBe('/d-eelk/poh-rechner/');
		expect(darstellungFuer('D-EXYZ').pohPfad).toBeUndefined();
	});

	it('kommt mit einer unbekannten Maschine aus, statt zu scheitern', () => {
		// Eine neue Maschine erscheint in der Übersicht, sobald sie im
		// Kalender auftaucht — auch ohne Eintrag hier. Sie sieht dann nur
		// schlichter aus.
		expect(darstellungFuer('D-1234')).toEqual({});
	});

	it('findet den Eintrag auch bei Kleinschreibung', () => {
		expect(darstellungFuer('d-eelk').bild).toBe('/d-eelk.gif');
	});
});

describe('kurzkennung', () => {
	it('lässt das Landeszeichen weg — es unterscheidet nichts', () => {
		expect(kurzkennung('D-EELK')).toBe('EELK');
		expect(kurzkennung('D-3004')).toBe('3004');
	});

	it('gibt eine Kennung ohne Bindestrich unverändert zurück', () => {
		expect(kurzkennung('EELK')).toBe('EELK');
	});
});
