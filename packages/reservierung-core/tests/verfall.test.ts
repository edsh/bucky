import { describe, expect, it } from 'vitest';
import { alterInWorten, alterMs, istVeraltet, VERFALLSGRENZE_MS } from '../src/verfall.js';

const JETZT = new Date('2026-08-13T10:00:00.000Z');
const vorMinuten = (n: number) => new Date(JETZT.getTime() - n * 60_000).toISOString();

describe('istVeraltet', () => {
	it('haelt einen frischen Stand fuer gueltig', () => {
		expect(istVeraltet(vorMinuten(10), JETZT)).toBe(false);
	});

	it('kennzeichnet einen Stand jenseits der Grenze als veraltet', () => {
		expect(istVeraltet(vorMinuten(90), JETZT)).toBe(true);
	});

	it('zaehlt genau auf der Grenze bereits als veraltet', () => {
		const genauAufDerGrenze = new Date(JETZT.getTime() - VERFALLSGRENZE_MS).toISOString();
		expect(istVeraltet(genauAufDerGrenze, JETZT)).toBe(true);
	});

	it('haelt eine unlesbare Zeitangabe fuer veraltet', () => {
		// Im Zweifel lieber als alt kennzeichnen als faelschlich Frische
		// behaupten.
		expect(istVeraltet('kaputt', JETZT)).toBe(true);
	});
});

describe('alterMs', () => {
	it('gibt kein negatives Alter zurueck', () => {
		// Ein Stand aus der Zukunft ist ein Zeichen fuer schiefe Uhren, kein
		// Grund fuer eine unsinnige Angabe wie "vor -3 Minuten".
		const ausDerZukunft = new Date(JETZT.getTime() + 60_000).toISOString();
		expect(alterMs(ausDerZukunft, JETZT)).toBe(0);
	});
});

describe('alterInWorten', () => {
	it('sagt bei wenigen Sekunden "gerade eben"', () => {
		expect(alterInWorten(new Date(JETZT.getTime() - 20_000).toISOString(), JETZT)).toBe('gerade eben');
	});

	it('zaehlt Minuten', () => {
		expect(alterInWorten(vorMinuten(1), JETZT)).toBe('vor einer Minute');
		expect(alterInWorten(vorMinuten(12), JETZT)).toBe('vor 12 Minuten');
	});

	it('zaehlt Stunden', () => {
		expect(alterInWorten(vorMinuten(60), JETZT)).toBe('vor einer Stunde');
		expect(alterInWorten(vorMinuten(200), JETZT)).toBe('vor 3 Stunden');
	});

	it('zaehlt Tage', () => {
		expect(alterInWorten(vorMinuten(60 * 24), JETZT)).toBe('vor einem Tag');
		expect(alterInWorten(vorMinuten(60 * 50), JETZT)).toBe('vor 2 Tagen');
	});

	it('sagt bei unlesbarer Angabe "unbekannt", statt etwas zu erfinden', () => {
		expect(alterInWorten('kaputt', JETZT)).toBe('unbekannt');
	});
});
