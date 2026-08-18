import { describe, expect, it } from 'vitest';
import type { Reservierung } from '../src/typen.js';
import { zustandFuer } from '../src/zustand.js';

/**
 * Prüfungen gegen contracts/zustand.md, Z-01 bis Z-11.
 *
 * Alle Zeiten in Ortszeit mit Versatz — der Bezugszeitpunkt wird stets
 * übergeben, nie geholt (Z-09). Ohne diese Regel ließe sich keine einzige
 * dieser Prüfungen schreiben.
 */

function res(beginn: string, ende: string, art: Reservierung['art'] = 'reservierung'): Reservierung {
	return { kennung: 'D-EELK', beginn, ende, art };
}

const jetzt = (uhrzeit: string) => new Date(`2026-08-15T${uhrzeit}+02:00`);

describe('zustandFuer — Grenzen des laufenden Blocks (Z-01)', () => {
	it('zählt den Beginn mit', () => {
		const stand = [res('2026-08-15T10:00:00+02:00', '2026-08-15T12:00:00+02:00')];
		expect(zustandFuer(stand, 'D-EELK', jetzt('10:00:00')).status).toBe('belegt');
	});

	it('zählt das Ende nicht mehr mit', () => {
		// Wer genau zum Ende fragt, bekommt "frei" — dieselbe Grenze wie in
		// belegung.ts, sonst gäben beide Wege verschiedene Antworten.
		const stand = [res('2026-08-15T10:00:00+02:00', '2026-08-15T12:00:00+02:00')];
		expect(zustandFuer(stand, 'D-EELK', jetzt('12:00:00')).status).toBe('frei');
	});
});

describe('zustandFuer — die Kette (Z-02)', () => {
	it('fasst lückenlos anschließende Belegungen zu einem Block zusammen', () => {
		const stand = [
			res('2026-08-15T10:00:00+02:00', '2026-08-15T12:00:00+02:00'),
			res('2026-08-15T12:00:00+02:00', '2026-08-15T14:00:00+02:00'),
			res('2026-08-15T14:00:00+02:00', '2026-08-15T16:00:00+02:00')
		];
		const zustand = zustandFuer(stand, 'D-EELK', jetzt('11:00:00'));
		expect(zustand.wechselAm).toBe('2026-08-15T16:00:00+02:00');
	});

	it('behandelt einen Spalt von einer Minute als echte Lücke', () => {
		// Ihn zu überbrücken hieße zu raten, wie kurz "zu kurz zum Fliegen"
		// ist — das entscheidet der Pilot, nicht die App.
		const stand = [
			res('2026-08-15T10:00:00+02:00', '2026-08-15T12:00:00+02:00'),
			res('2026-08-15T12:01:00+02:00', '2026-08-15T14:00:00+02:00')
		];
		const zustand = zustandFuer(stand, 'D-EELK', jetzt('11:00:00'));
		expect(zustand.wechselAm).toBe('2026-08-15T12:00:00+02:00');
	});

	it('bildet aus Reservierung und Sperre gemeinsam eine Kette', () => {
		const stand = [
			res('2026-08-15T10:00:00+02:00', '2026-08-15T12:00:00+02:00'),
			res('2026-08-15T12:00:00+02:00', '2026-08-15T18:00:00+02:00', 'sperre')
		];
		const zustand = zustandFuer(stand, 'D-EELK', jetzt('11:00:00'));
		expect(zustand.wechselAm).toBe('2026-08-15T18:00:00+02:00');
	});
});

describe('zustandFuer — Sperre gewinnt (Z-03)', () => {
	it('meldet Sperre, wenn Sperre und Reservierung gleichzeitig laufen', () => {
		// "Gesperrt" ist die weiter reichende Nachricht: Das Flugzeug ist
		// womöglich zerlegt, nicht bloß gebucht.
		const stand = [
			res('2026-08-15T09:00:00+02:00', '2026-08-15T18:00:00+02:00', 'sperre'),
			res('2026-08-15T10:00:00+02:00', '2026-08-15T12:00:00+02:00')
		];
		expect(zustandFuer(stand, 'D-EELK', jetzt('11:00:00')).status).toBe('sperre');
	});

	it('meldet belegt, wenn die Sperre erst später in der Kette liegt', () => {
		// Die Sperre entscheidet den Status nur, wenn sie *jetzt* deckt.
		const stand = [
			res('2026-08-15T10:00:00+02:00', '2026-08-15T12:00:00+02:00'),
			res('2026-08-15T12:00:00+02:00', '2026-08-15T18:00:00+02:00', 'sperre')
		];
		expect(zustandFuer(stand, 'D-EELK', jetzt('11:00:00')).status).toBe('belegt');
	});
});

describe('zustandFuer — bald nur am selben Ortstag (Z-04)', () => {
	it('meldet bald, wenn die nächste Belegung heute beginnt', () => {
		const stand = [res('2026-08-15T18:00:00+02:00', '2026-08-15T20:00:00+02:00')];
		const zustand = zustandFuer(stand, 'D-EELK', jetzt('14:00:00'));
		expect(zustand.status).toBe('bald');
		expect(zustand.wechselAm).toBe('2026-08-15T18:00:00+02:00');
	});

	it('meldet frei, wenn die nächste Belegung erst morgen beginnt', () => {
		// Sonst stünde die halbe Flotte jeden Abend auf Gelb.
		const stand = [res('2026-08-16T08:00:00+02:00', '2026-08-16T10:00:00+02:00')];
		const zustand = zustandFuer(stand, 'D-EELK', jetzt('22:00:00'));
		expect(zustand.status).toBe('frei');
		expect(zustand.wechselAm).toBe('2026-08-16T08:00:00+02:00');
	});

	it('richtet sich nach dem Ortstag, nicht nach UTC', () => {
		// 23:30 Ortszeit ist 21:30 UTC — in UTC wäre der Folgetag-Beginn um
		// 00:30 Ortszeit derselbe Tag und die Maschine fälschlich "bald".
		const stand = [res('2026-08-16T00:30:00+02:00', '2026-08-16T02:00:00+02:00')];
		expect(zustandFuer(stand, 'D-EELK', jetzt('23:30:00')).status).toBe('frei');
	});
});

describe('zustandFuer — draengen (Z-05, Z-06)', () => {
	const stand = [res('2026-08-15T12:00:00+02:00', '2026-08-15T14:00:00+02:00')];

	it('ist bei 61 Minuten Vorlauf exakt 0', () => {
		expect(zustandFuer(stand, 'D-EELK', jetzt('10:59:00')).draengen).toBe(0);
	});

	it('ist bei genau 60 Minuten Vorlauf exakt 0', () => {
		expect(zustandFuer(stand, 'D-EELK', jetzt('11:00:00')).draengen).toBe(0);
	});

	it('ist bei 30 Minuten Vorlauf genau 0,5', () => {
		expect(zustandFuer(stand, 'D-EELK', jetzt('11:30:00')).draengen).toBeCloseTo(0.5, 10);
	});

	it('ist im Moment des Beginns exakt 1', () => {
		// Eine Sekunde später läuft die Belegung, der Status springt auf
		// belegt und draengen fällt auf 0 zurück.
		const kurzDavor = new Date('2026-08-15T11:59:59.999+02:00');
		expect(zustandFuer(stand, 'D-EELK', kurzDavor).draengen).toBeCloseTo(1, 5);
	});

	it('bleibt bei laufender Belegung 0 und erzeugt keinen fünften Zustand', () => {
		const zustand = zustandFuer(stand, 'D-EELK', jetzt('13:00:00'));
		expect(zustand.status).toBe('belegt');
		expect(zustand.draengen).toBe(0);
	});

	it('bleibt 0, solange der Status frei ist', () => {
		const morgen = [res('2026-08-16T08:00:00+02:00', '2026-08-16T10:00:00+02:00')];
		expect(zustandFuer(morgen, 'D-EELK', jetzt('22:00:00')).draengen).toBe(0);
	});
});

describe('zustandFuer — nächste Lücke (Z-07, Z-08)', () => {
	it('rundet den Beginn auf die nächste volle halbe Stunde auf', () => {
		const stand = [res('2026-08-15T10:00:00+02:00', '2026-08-15T12:10:00+02:00')];
		const zustand = zustandFuer(stand, 'D-EELK', jetzt('11:00:00'));
		expect(zustand.naechsteLuecke?.von).toBe('2026-08-15T12:30:00+02:00');
		expect(zustand.naechsteLuecke?.bis).toBe('2026-08-15T14:30:00+02:00');
	});

	it('schlägt zwei Stunden vor, wenn Platz ist', () => {
		const zustand = zustandFuer([], 'D-EELK', jetzt('11:00:00'));
		expect(zustand.naechsteLuecke).toEqual({
			von: '2026-08-15T11:00:00+02:00',
			bis: '2026-08-15T13:00:00+02:00'
		});
	});

	it('kappt den Vorschlag am Beginn der folgenden Belegung', () => {
		const stand = [res('2026-08-15T12:00:00+02:00', '2026-08-15T14:00:00+02:00')];
		const zustand = zustandFuer(stand, 'D-EELK', jetzt('11:00:00'));
		expect(zustand.naechsteLuecke).toEqual({
			von: '2026-08-15T11:00:00+02:00',
			bis: '2026-08-15T12:00:00+02:00'
		});
	});

	it('überspringt eine Lücke, in die kein Flug passt', () => {
		// Zwischen 11:00 und 11:20 ist frei — zu kurz. Ein Vorschlag, in den
		// nichts passt, ist schlimmer als keiner.
		const stand = [
			res('2026-08-15T09:00:00+02:00', '2026-08-15T11:00:00+02:00'),
			res('2026-08-15T11:20:00+02:00', '2026-08-15T13:00:00+02:00')
		];
		const zustand = zustandFuer(stand, 'D-EELK', jetzt('10:00:00'));
		expect(zustand.naechsteLuecke?.von).toBe('2026-08-15T13:00:00+02:00');
	});

	it('liefert null, wenn die ganze Woche durchgehend belegt ist', () => {
		const stand = [res('2026-08-01T00:00:00+02:00', '2026-09-01T00:00:00+02:00', 'sperre')];
		expect(zustandFuer(stand, 'D-EELK', jetzt('10:00:00')).naechsteLuecke).toBeNull();
	});
});

describe('zustandFuer — der übernächste Wechsel (Z-12)', () => {
	it('nennt bei laufender Belegung, wann es danach wieder eng wird', () => {
		const stand = [
			res('2026-08-15T10:00:00+02:00', '2026-08-15T12:00:00+02:00'),
			res('2026-08-15T16:00:00+02:00', '2026-08-15T18:00:00+02:00')
		];
		const zustand = zustandFuer(stand, 'D-EELK', jetzt('11:00:00'));
		expect(zustand.wechselAm).toBe('2026-08-15T12:00:00+02:00');
		expect(zustand.danachAm).toBe('2026-08-15T16:00:00+02:00');
	});

	it('liefert null, wenn nach der laufenden Belegung nichts mehr folgt', () => {
		const stand = [res('2026-08-15T10:00:00+02:00', '2026-08-15T12:00:00+02:00')];
		expect(zustandFuer(stand, 'D-EELK', jetzt('11:00:00')).danachAm).toBeNull();
	});

	it('nennt bei bald das Ende der kommenden Kette, nicht nur des ersten Eintrags', () => {
		// Ohne endeDerKette stünde hier 18:00 statt 20:00 — und die Anzeige
		// verspräche ein Flugzeug, das um 18:00 nicht frei wird.
		const stand = [
			res('2026-08-15T16:00:00+02:00', '2026-08-15T18:00:00+02:00'),
			res('2026-08-15T18:00:00+02:00', '2026-08-15T20:00:00+02:00')
		];
		const zustand = zustandFuer(stand, 'D-EELK', jetzt('14:00:00'));
		expect(zustand.status).toBe('bald');
		expect(zustand.danachAm).toBe('2026-08-15T20:00:00+02:00');
	});
});

describe('zustandFuer — leere Datenlage (Z-11)', () => {
	it('ergibt frei ohne absehbaren Wechsel', () => {
		// Ausdrücklich **nicht** dasselbe wie "kein Stand vorhanden": Diesen
		// Fall trifft die Route, nicht der Kern (FR-022).
		const zustand = zustandFuer([], 'D-EELK', jetzt('10:00:00'));
		expect(zustand.status).toBe('frei');
		expect(zustand.wechselAm).toBeNull();
		expect(zustand.wechselZu).toBeNull();
	});

	it('beachtet nur die eigene Kennung', () => {
		const stand = [
			{
				kennung: 'D-EXYZ',
				beginn: '2026-08-15T10:00:00+02:00',
				ende: '2026-08-15T12:00:00+02:00',
				art: 'reservierung' as const
			}
		];
		expect(zustandFuer(stand, 'D-EELK', jetzt('11:00:00')).status).toBe('frei');
	});

	it('vereinheitlicht die Kennung in der Antwort', () => {
		expect(zustandFuer([], ' d-eelk ', jetzt('10:00:00')).kennung).toBe('D-EELK');
	});
});

describe('zustandFuer — was das Modul nicht liefert (Z-10)', () => {
	it('gibt weder Farbe noch Satz noch Person heraus', () => {
		const zustand = zustandFuer([], 'D-EELK', jetzt('10:00:00'));
		expect(Object.keys(zustand).sort()).toEqual([
			'danachAm',
			'draengen',
			'kennung',
			'naechsteLuecke',
			'status',
			'wechselAm',
			'wechselZu'
		]);
	});
});
