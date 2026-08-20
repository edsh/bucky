import { describe, expect, it } from 'vitest';
import {
	balkensegmente,
	BALKEN_BIS,
	BALKEN_VON,
	FENSTER_GANZTAGS,
	jetztAnteil,
	kommendeBelegungen,
	tagesbalken,
	tagesbelegungen,
	wochenbalken
} from '../src/segmente.js';
import { alsBelegungsart, alsTageszeile } from '../src/formulieren.js';
import type { Reservierung } from '../src/typen.js';

/**
 * Prüfungen zu den Balkensegmenten (T037, spec.md „Edge Cases").
 *
 * Die vier Fälle, um die es hier wirklich geht, sind alle Randfälle: die
 * Belegung über Mitternacht, der Ganztagseintrag, die Belegung außerhalb des
 * Fensters und die Überschneidung. Der Normalfall — eine Reservierung
 * mittags — ist die Prüfung, die nie fehlschlägt.
 */

const TAG = '2026-08-19';
const BREITE = BALKEN_BIS - BALKEN_VON; // 960 Minuten

function res(beginn: string, ende: string, art: Reservierung['art'] = 'reservierung'): Reservierung {
	return { kennung: 'D-EELK', beginn, ende, art };
}

/** Ein Anteil als Minute des Tages — so lassen sich Erwartungen lesbar schreiben. */
function alsMinute(anteil: number): number {
	return Math.round(BALKEN_VON + anteil * BREITE);
}

describe('balkensegmente', () => {
	it('bildet eine Reservierung mitten am Tag auf ihren Ausschnitt ab', () => {
		const segmente = balkensegmente(
			[res('2026-08-19T14:00:00+02:00', '2026-08-19T17:30:00+02:00')],
			'D-EELK',
			TAG
		);

		expect(segmente).toHaveLength(1);
		expect(alsMinute(segmente[0]!.von)).toBe(14 * 60);
		expect(alsMinute(segmente[0]!.bis)).toBe(17 * 60 + 30);
		expect(segmente[0]!.art).toBe('reservierung');
	});

	it('ignoriert eine Belegung einer anderen Maschine', () => {
		const fremd: Reservierung = {
			kennung: 'D-EXYZ',
			beginn: '2026-08-19T09:00:00+02:00',
			ende: '2026-08-19T11:00:00+02:00',
			art: 'reservierung'
		};

		expect(balkensegmente([fremd], 'D-EELK', TAG)).toEqual([]);
	});

	it('schneidet eine Belegung über Mitternacht je Tag zu einem eigenen Segment', () => {
		// Ein einziger Eintrag, zwei Tage. Genau hier liegt der Fehler, den
		// E-06 verhindern soll: Wer die Daten schneidet statt der Anzeige,
		// verliert die Aussage „belegt bis morgen 02:00".
		const ueberNacht = [res('2026-08-19T22:00:00+02:00', '2026-08-20T02:00:00+02:00')];

		const heute = balkensegmente(ueberNacht, 'D-EELK', '2026-08-19', FENSTER_GANZTAGS);
		const morgen = balkensegmente(ueberNacht, 'D-EELK', '2026-08-20', FENSTER_GANZTAGS);

		expect(heute).toHaveLength(1);
		expect(Math.round(heute[0]!.von * 1440)).toBe(22 * 60);
		expect(Math.round(heute[0]!.bis * 1440)).toBe(1440);

		expect(morgen).toHaveLength(1);
		expect(Math.round(morgen[0]!.von * 1440)).toBe(0);
		expect(Math.round(morgen[0]!.bis * 1440)).toBe(2 * 60);
	});

	it('füllt bei einem Ganztagseintrag den ganzen Balken', () => {
		const segmente = balkensegmente(
			[res('2026-08-19T00:00:00+02:00', '2026-08-20T00:00:00+02:00', 'sperre')],
			'D-EELK',
			TAG
		);

		expect(segmente).toHaveLength(1);
		expect(segmente[0]!.von).toBeCloseTo(0, 10);
		expect(segmente[0]!.bis).toBeCloseTo(1, 10);
		expect(segmente[0]!.art).toBe('sperre');
	});

	it('beschneidet eine Belegung, die vor dem Fenster beginnt und darin endet', () => {
		const segmente = balkensegmente(
			[res('2026-08-19T04:30:00+02:00', '2026-08-19T08:00:00+02:00')],
			'D-EELK',
			TAG
		);

		expect(segmente).toHaveLength(1);
		expect(segmente[0]!.von).toBeCloseTo(0, 10);
		expect(alsMinute(segmente[0]!.bis)).toBe(8 * 60);
	});

	it('lässt eine Belegung ganz außerhalb des Fensters weg', () => {
		// 23:00–23:45 liegt hinter 22:00. Ein Segment mit Breite 0 am rechten
		// Rand wäre schlimmer als keines: Es sähe aus wie eine Belegung, die
		// gerade beginnt.
		const segmente = balkensegmente(
			[res('2026-08-19T23:00:00+02:00', '2026-08-19T23:45:00+02:00')],
			'D-EELK',
			TAG
		);

		expect(segmente).toEqual([]);
	});

	it('lässt zwischen zwei Belegungen die Lücke stehen', () => {
		const segmente = balkensegmente(
			[
				res('2026-08-19T09:00:00+02:00', '2026-08-19T11:00:00+02:00'),
				res('2026-08-19T14:00:00+02:00', '2026-08-19T16:00:00+02:00')
			],
			'D-EELK',
			TAG
		);

		expect(segmente).toHaveLength(2);
		expect(alsMinute(segmente[0]!.bis)).toBe(11 * 60);
		expect(alsMinute(segmente[1]!.von)).toBe(14 * 60);
	});

	it('hält zwei lückenlos anschließende Reservierungen auseinander', () => {
		// Zwei Eintraege, zwei Nutzer, zwei Absprachen — auch wenn der eine
		// endet, wo der andere beginnt. Zu einem Balken verschmolzen behauptet
		// die Anzeige eine Belegung, wo zwei sind; wer sie sieht, ruft
		// womoeglich den Falschen an.
		const segmente = balkensegmente(
			[
				res('2026-08-19T09:00:00+02:00', '2026-08-19T11:00:00+02:00'),
				res('2026-08-19T11:00:00+02:00', '2026-08-19T13:00:00+02:00')
			],
			'D-EELK',
			TAG
		);

		expect(segmente).toHaveLength(2);
		expect(alsMinute(segmente[0]!.von)).toBe(9 * 60);
		expect(alsMinute(segmente[0]!.bis)).toBe(11 * 60);
		expect(alsMinute(segmente[1]!.von)).toBe(11 * 60);
		expect(alsMinute(segmente[1]!.bis)).toBe(13 * 60);
	});

	it('vermerkt die Naht, damit der Zugangsweg sie zeichnen kann', () => {
		// Ohne diesen Vermerk stossen die beiden Segmente pixelgenau
		// aneinander und sehen wieder wie eines aus — die Trennung waere nur
		// in den Daten passiert, nicht auf dem Schirm.
		const segmente = balkensegmente(
			[
				res('2026-08-19T09:00:00+02:00', '2026-08-19T11:00:00+02:00'),
				res('2026-08-19T11:00:00+02:00', '2026-08-19T13:00:00+02:00')
			],
			'D-EELK',
			TAG
		);

		expect(segmente[0]!.stoesstAn).toBe(false);
		expect(segmente[1]!.stoesstAn).toBe(true);
	});

	it('vermerkt keine Naht, wo eine echte Lücke liegt', () => {
		const segmente = balkensegmente(
			[
				res('2026-08-19T09:00:00+02:00', '2026-08-19T11:00:00+02:00'),
				res('2026-08-19T14:00:00+02:00', '2026-08-19T16:00:00+02:00')
			],
			'D-EELK',
			TAG
		);

		expect(segmente[1]!.stoesstAn).toBe(false);
	});

	it('zerlegt eine Reservierung, die eine Sperre durchschneidet, in drei Stücke', () => {
		const segmente = balkensegmente(
			[
				res('2026-08-19T09:00:00+02:00', '2026-08-19T15:00:00+02:00'),
				res('2026-08-19T11:00:00+02:00', '2026-08-19T12:00:00+02:00', 'sperre')
			],
			'D-EELK',
			TAG
		);

		expect(segmente.map((s) => s.art)).toEqual(['reservierung', 'sperre', 'reservierung']);
		expect(segmente.map((s) => s.stoesstAn)).toEqual([false, true, true]);
		expect(alsMinute(segmente[2]!.bis)).toBe(15 * 60);
	});

	it('kollabiert überlappende Einträge nicht zu Lücken', () => {
		// Zwei Reservierungen, die sich um eine Stunde überschneiden. Der
		// Balken muss von 9 bis 15 durchgehend belegt sein — kein Loch in der
		// Mitte und keine zwei uebereinanderliegenden Rechtecke. Dass es zwei
		// Segmente sind, ist richtig: Es sind zwei Belegungen. Die
		// Ueberschneidung selbst faellt der frueheren zu, bis diese endet.
		const segmente = balkensegmente(
			[
				res('2026-08-19T09:00:00+02:00', '2026-08-19T12:00:00+02:00'),
				res('2026-08-19T11:00:00+02:00', '2026-08-19T15:00:00+02:00')
			],
			'D-EELK',
			TAG
		);

		expect(segmente).toHaveLength(2);
		expect(alsMinute(segmente[0]!.von)).toBe(9 * 60);
		expect(alsMinute(segmente[0]!.bis)).toBe(12 * 60);
		expect(alsMinute(segmente[1]!.von)).toBe(12 * 60);
		expect(alsMinute(segmente[1]!.bis)).toBe(15 * 60);
		expect(segmente[1]!.stoesstAn).toBe(true);
	});

	it('lässt die Sperre über die Reservierung gewinnen', () => {
		const segmente = balkensegmente(
			[
				res('2026-08-19T09:00:00+02:00', '2026-08-19T15:00:00+02:00'),
				res('2026-08-19T11:00:00+02:00', '2026-08-19T13:00:00+02:00', 'sperre')
			],
			'D-EELK',
			TAG
		);

		expect(segmente.map((s) => s.art)).toEqual(['reservierung', 'sperre', 'reservierung']);
		expect(alsMinute(segmente[1]!.von)).toBe(11 * 60);
		expect(alsMinute(segmente[1]!.bis)).toBe(13 * 60);
	});

	it('bleibt bei jedem Segment innerhalb von 0 und 1 und in aufsteigender Folge', () => {
		const segmente = balkensegmente(
			[
				res('2026-08-19T05:00:00+02:00', '2026-08-19T07:00:00+02:00'),
				res('2026-08-19T20:00:00+02:00', '2026-08-20T01:00:00+02:00', 'sperre')
			],
			'D-EELK',
			TAG
		);

		let vorher = 0;
		for (const s of segmente) {
			expect(s.von).toBeGreaterThanOrEqual(0);
			expect(s.bis).toBeLessThanOrEqual(1);
			expect(s.bis).toBeGreaterThan(s.von);
			expect(s.von).toBeGreaterThanOrEqual(vorher);
			vorher = s.bis;
		}
	});
});

describe('tagesbalken', () => {
	it('nimmt den Ortstag des Bezugszeitpunkts, nicht den UTC-Tag', () => {
		// 00:30 Ortszeit ist noch 22:30 des Vortags in UTC. Wer den UTC-Tag
		// nähme, zeigte am frühen Morgen die Belegung von gestern.
		const jetzt = new Date('2026-08-20T00:30:00+02:00');
		const segmente = tagesbalken(
			[res('2026-08-20T09:00:00+02:00', '2026-08-20T10:00:00+02:00')],
			'D-EELK',
			jetzt
		);

		expect(segmente).toHaveLength(1);
		expect(alsMinute(segmente[0]!.von)).toBe(9 * 60);
	});
});

describe('wochenbalken', () => {
	it('liefert sieben aufeinanderfolgende Ortstage ab heute', () => {
		const tage = wochenbalken([], 'D-EELK', new Date('2026-08-19T10:00:00+02:00'));

		expect(tage.map((t) => t.tag)).toEqual([
			'2026-08-19',
			'2026-08-20',
			'2026-08-21',
			'2026-08-22',
			'2026-08-23',
			'2026-08-24',
			'2026-08-25'
		]);
	});

	it('zählt über den Monatswechsel richtig weiter', () => {
		const tage = wochenbalken([], 'D-EELK', new Date('2026-08-30T10:00:00+02:00'), 3);
		expect(tage.map((t) => t.tag)).toEqual(['2026-08-30', '2026-08-31', '2026-09-01']);
	});

	it('überspringt an der Zeitumstellung keinen Tag und zeigt keinen doppelt', () => {
		// Der 25.10.2026 ist der Tag der Rückstellung und 25 Stunden lang.
		// Wer schlicht 24 Stunden auf Mitternacht addiert, bleibt hier im
		// selben Tag hängen.
		const herbst = wochenbalken([], 'D-EELK', new Date('2026-10-24T10:00:00+02:00'), 4);
		expect(herbst.map((t) => t.tag)).toEqual([
			'2026-10-24',
			'2026-10-25',
			'2026-10-26',
			'2026-10-27'
		]);

		// Der 29.03.2026 ist 23 Stunden lang.
		const fruehjahr = wochenbalken([], 'D-EELK', new Date('2026-03-28T10:00:00+01:00'), 4);
		expect(fruehjahr.map((t) => t.tag)).toEqual([
			'2026-03-28',
			'2026-03-29',
			'2026-03-30',
			'2026-03-31'
		]);
	});

	it('verteilt eine Belegung über Mitternacht auf beide Tage', () => {
		const tage = wochenbalken(
			[res('2026-08-19T20:00:00+02:00', '2026-08-20T09:00:00+02:00')],
			'D-EELK',
			new Date('2026-08-19T10:00:00+02:00'),
			2
		);

		expect(tage[0]!.segmente).toHaveLength(1);
		expect(alsMinute(tage[0]!.segmente[0]!.von)).toBe(20 * 60);
		expect(tage[0]!.segmente[0]!.bis).toBeCloseTo(1, 10);

		expect(tage[1]!.segmente).toHaveLength(1);
		expect(tage[1]!.segmente[0]!.von).toBeCloseTo(0, 10);
		expect(alsMinute(tage[1]!.segmente[0]!.bis)).toBe(9 * 60);
	});
});

describe('jetztAnteil', () => {
	it('liegt in der Mitte, wenn die halbe Fensterzeit verstrichen ist', () => {
		expect(jetztAnteil(new Date('2026-08-19T14:00:00+02:00'), TAG)).toBeCloseTo(0.5, 10);
	});

	it('gibt vor und nach dem Fenster nichts zurück', () => {
		// Eine Linie am linken Rand um 05:30 behauptete, es sei sechs Uhr.
		expect(jetztAnteil(new Date('2026-08-19T05:30:00+02:00'), TAG)).toBeNull();
		expect(jetztAnteil(new Date('2026-08-19T22:30:00+02:00'), TAG)).toBeNull();
	});

	it('gibt für einen anderen Tag nichts zurück', () => {
		expect(jetztAnteil(new Date('2026-08-19T14:00:00+02:00'), '2026-08-20')).toBeNull();
	});
});

describe('tagesbelegungen', () => {
	it('schneidet die Uhrzeiten auf den Tag zu, die Zeitpunkte aber nicht', () => {
		const [heute] = tagesbelegungen(
			[res('2026-08-18T22:00:00+02:00', '2026-08-19T04:00:00+02:00')],
			'D-EELK',
			TAG
		);

		expect(heute!.vonUhr).toBe('00:00');
		expect(heute!.bisUhr).toBe('04:00');
		// Ungekürzt: Sonst stünde neben der Zeile eine Dauer von vier statt
		// sechs Stunden.
		expect(new Date(heute!.vonIso).toISOString()).toBe('2026-08-18T20:00:00.000Z');
		expect(heute!.ganztags).toBe(false);
	});

	it('schreibt ein durchlaufendes Ende als 24:00, nicht als 00:00', () => {
		const [eintrag] = tagesbelegungen(
			[res('2026-08-19T20:00:00+02:00', '2026-08-20T06:00:00+02:00')],
			'D-EELK',
			TAG
		);

		expect(eintrag!.bisUhr).toBe('24:00');
	});

	it('erkennt einen Ganztagseintrag', () => {
		const [eintrag] = tagesbelegungen(
			[res('2026-08-19T00:00:00+02:00', '2026-08-20T00:00:00+02:00', 'sperre')],
			'D-EELK',
			TAG
		);

		expect(eintrag!.ganztags).toBe(true);
	});
});

describe('kommendeBelegungen', () => {
	const liste: Reservierung[] = [
		res('2026-08-19T08:00:00+02:00', '2026-08-19T09:00:00+02:00'),
		res('2026-08-19T11:00:00+02:00', '2026-08-19T13:00:00+02:00'),
		res('2026-08-20T09:00:00+02:00', '2026-08-20T10:00:00+02:00'),
		res('2026-08-21T09:00:00+02:00', '2026-08-21T10:00:00+02:00', 'sperre')
	];

	it('lässt Vergangenes weg und behält die laufende Belegung', () => {
		// 12:00: Die zweite läuft gerade. Ihr Ende ist die Frage, die auf
		// dieser Seite gestellt wird — sie darf nicht fehlen.
		const kommend = kommendeBelegungen(liste, 'D-EELK', new Date('2026-08-19T12:00:00+02:00'));

		expect(kommend).toHaveLength(3);
		expect(kommend[0]!.vonUhr).toBe('11:00');
	});

	it('gibt höchstens die gewünschte Anzahl zurück', () => {
		const kommend = kommendeBelegungen(
			liste,
			'D-EELK',
			new Date('2026-08-19T00:00:00+02:00'),
			2
		);
		expect(kommend).toHaveLength(2);
	});
});

describe('alsTageszeile', () => {
	function zeileFuer(reservierungen: Reservierung[], tag = TAG): string {
		return alsTageszeile(tagesbelegungen(reservierungen, 'D-EELK', tag));
	}

	it('sagt „frei", wenn nichts eingetragen ist', () => {
		expect(zeileFuer([])).toBe('frei');
	});

	it('sagt „gesperrt" bei einer ganztägigen Sperre — ohne Uhrzeit', () => {
		expect(
			zeileFuer([res('2026-08-19T00:00:00+02:00', '2026-08-20T00:00:00+02:00', 'sperre')])
		).toBe('gesperrt');
	});

	it('nennt bei einer einzelnen Belegung ihre Spanne', () => {
		expect(zeileFuer([res('2026-08-19T14:00:00+02:00', '2026-08-19T17:30:00+02:00')])).toBe(
			'14:00–17:30'
		);
	});

	it('zählt weitere Einträge desselben Tages als +N', () => {
		expect(
			zeileFuer([
				res('2026-08-19T14:00:00+02:00', '2026-08-19T17:30:00+02:00'),
				res('2026-08-19T18:00:00+02:00', '2026-08-19T19:00:00+02:00')
			])
		).toBe('14:00–17:30 +1');
	});

	it('zeigt den Überhang in den Folgetag als 24:00 statt als Zeichen', () => {
		expect(zeileFuer([res('2026-08-19T20:00:00+02:00', '2026-08-20T02:00:00+02:00')])).toBe(
			'20:00–24:00'
		);
	});
});

describe('alsBelegungsart', () => {
	it('nennt jede Reservierung „Reserviert" — auch die eigene', () => {
		expect(alsBelegungsart('reservierung')).toBe('Reserviert');
	});

	it('nennt eine Sperre „Sperre" — ohne Grund', () => {
		expect(alsBelegungsart('sperre')).toBe('Sperre');
	});
});
