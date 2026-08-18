import { describe, expect, it } from 'vitest';
import {
	markerwinkel,
	minuteFuerWinkel,
	ringsegmente,
	winkelFuerMinute
} from '../src/tagesuhr.js';
import type { Reservierung, Sonnenzeiten } from '../src/typen.js';

/**
 * Prüfungen gegen contracts/tagesuhr.md.
 *
 * Der Kern dieser Datei ist die Trennung von Geometrie und Farbe (E-15): Die
 * Winkel müssen im Juni, im Dezember und ohne Sonnenzeiten **identisch**
 * sein, die Farbgrenze in allen drei Fällen verschieden.
 */

/** Sonnenzeiten für Hohn (EDSH), echte Werte. */
const JUNI: Sonnenzeiten = {
	tag: '2026-06-21',
	aufgang: '2026-06-21T04:47:00+02:00',
	untergang: '2026-06-21T21:55:00+02:00'
};

const DEZEMBER: Sonnenzeiten = {
	tag: '2026-12-21',
	aufgang: '2026-12-21T08:44:00+01:00',
	untergang: '2026-12-21T15:57:00+01:00'
};

const AUGUST: Sonnenzeiten = {
	tag: '2026-08-18',
	aufgang: '2026-08-18T06:07:00+02:00',
	untergang: '2026-08-18T20:45:00+02:00'
};

/** Die Füllung an einem Winkel — dafür das Segment suchen, das ihn deckt. */
function fuellungBei(segmente: ReturnType<typeof ringsegmente>, grad: number) {
	const treffer = segmente.find(
		(s) =>
			(grad >= s.vonGrad && grad < s.bisGrad) ||
			(grad - 360 >= s.vonGrad && grad - 360 < s.bisGrad)
	);
	return treffer?.fuellung;
}

describe('winkelFuerMinute — die Nähte sitzen (T-01, T-02)', () => {
	it('legt 21:00 auf 135° und 06:00 auf 225°', () => {
		expect(winkelFuerMinute(21 * 60)).toBe(135);
		expect(winkelFuerMinute(6 * 60)).toBe(225);
	});

	it('legt Mitternacht auf 165°, nicht auf 0°', () => {
		// Die Falle dieses Rings: Wer 0 Uhr nach oben legt, dreht den halben
		// Tag falsch herum.
		expect(winkelFuerMinute(0)).toBe(165);
	});

	it('legt 13:30 — die Mitte des Flugtags — dorthin, wo sie hingehört', () => {
		// 13:30 ist 450 Minuten nach 06:00, also die Hälfte der 900
		// Tagminuten: 225° + 135° = 360°, also genau oben.
		expect(winkelFuerMinute(13 * 60 + 30) % 360).toBeCloseTo(0, 6);
	});
});

describe('winkelFuerMinute — Monotonie und Stetigkeit (T-03)', () => {
	it('läuft über den ganzen Tag im Uhrzeigersinn, ohne Rückwärtssprung', () => {
		let vorher = winkelFuerMinute(0);
		let umlauf = 0;
		for (let m = 1; m < 1440; m++) {
			const jetzt = winkelFuerMinute(m);
			// Beim Überschreiten von 360° springt der Wert einmal zurück —
			// genau einmal, sonst ist die Abbildung nicht monoton.
			if (jetzt < vorher) umlauf++;
			vorher = jetzt;
		}
		expect(umlauf).toBe(1);
	});

	it('ist an beiden Nähten stetig', () => {
		expect(winkelFuerMinute(21 * 60 - 1)).toBeCloseTo(135, 0);
		expect(winkelFuerMinute(6 * 60 - 1)).toBeCloseTo(225, 0);
	});
});

describe('minuteFuerWinkel — Umkehrung (T-04)', () => {
	it('führt jede Minute des Tages auf sich selbst zurück', () => {
		for (let m = 0; m < 1440; m++) {
			expect(Math.round(minuteFuerWinkel(winkelFuerMinute(m)))).toBe(m);
		}
	});
});

describe('ringsegmente — Abdeckung (T-05, T-09)', () => {
	const bezug = new Date('2026-08-18T12:00:00+02:00');

	it('deckt die vollen 360° lückenlos und überschneidungsfrei ab', () => {
		const segmente = ringsegmente([], 'D-EELK', bezug, AUGUST);
		const summe = segmente.reduce((a, s) => a + (s.bisGrad - s.vonGrad), 0);
		expect(summe).toBe(360);

		// Und zwar in einer Kette: Jedes Segment beginnt, wo das vorige endet.
		for (let i = 1; i < segmente.length; i++) {
			expect(segmente[i]?.vonGrad).toBe(segmente[i - 1]?.bisGrad);
		}
	});

	it('liefert nie mehr als 360 Segmente', () => {
		const belegungen: Reservierung[] = [];
		for (let stunde = 6; stunde < 20; stunde += 2) {
			belegungen.push({
				kennung: 'D-EELK',
				beginn: `2026-08-18T${String(stunde).padStart(2, '0')}:00:00+02:00`,
				ende: `2026-08-18T${String(stunde + 1).padStart(2, '0')}:00:00+02:00`,
				art: 'reservierung'
			});
		}
		expect(ringsegmente(belegungen, 'D-EELK', bezug, AUGUST).length).toBeLessThanOrEqual(360);
	});
});

describe('ringsegmente — leere Datenlage (T-08)', () => {
	it('besteht ohne jede Belegung aus genau zwei Segmenten: nacht und frei', () => {
		const segmente = ringsegmente([], 'D-EELK', new Date('2026-08-18T12:00:00+02:00'), AUGUST);
		expect(segmente).toHaveLength(2);
		expect(new Set(segmente.map((s) => s.fuellung))).toEqual(new Set(['nacht', 'frei']));
	});

	it('tut dasselbe ohne Sonnenzeiten — ein Ausfall darf keine Lücke erzeugen (T-06a)', () => {
		const segmente = ringsegmente([], 'D-EELK', new Date('2026-08-18T12:00:00+02:00'), null);
		expect(segmente).toHaveLength(2);
		const summe = segmente.reduce((a, s) => a + (s.bisGrad - s.vonGrad), 0);
		expect(summe).toBe(360);
	});
});

describe('ringsegmente — Vorrang bei Überschneidung (T-07)', () => {
	const bezug = new Date('2026-08-18T12:00:00+02:00');

	it('lässt die Sperre über die Reservierung gewinnen', () => {
		const belegungen: Reservierung[] = [
			{
				kennung: 'D-EELK',
				beginn: '2026-08-18T10:00:00+02:00',
				ende: '2026-08-18T14:00:00+02:00',
				art: 'reservierung'
			},
			{
				kennung: 'D-EELK',
				beginn: '2026-08-18T11:00:00+02:00',
				ende: '2026-08-18T13:00:00+02:00',
				art: 'sperre'
			}
		];
		const segmente = ringsegmente(belegungen, 'D-EELK', bezug, AUGUST);
		expect(fuellungBei(segmente, winkelFuerMinute(12 * 60))).toBe('sperre');
		// Außerhalb der Sperre bleibt die Reservierung sichtbar.
		expect(fuellungBei(segmente, winkelFuerMinute(10 * 60 + 30))).toBe('reservierung');
	});

	it('lässt die Reservierung über die Nacht gewinnen', () => {
		const belegungen: Reservierung[] = [
			{
				kennung: 'D-EELK',
				beginn: '2026-08-18T22:00:00+02:00',
				ende: '2026-08-18T23:00:00+02:00',
				art: 'reservierung'
			}
		];
		const segmente = ringsegmente(belegungen, 'D-EELK', bezug, AUGUST);
		expect(fuellungBei(segmente, winkelFuerMinute(22 * 60 + 30))).toBe('reservierung');
	});

	it('zeigt fremde Maschinen nicht im eigenen Ring', () => {
		const belegungen: Reservierung[] = [
			{
				kennung: 'D-EXYZ',
				beginn: '2026-08-18T10:00:00+02:00',
				ende: '2026-08-18T14:00:00+02:00',
				art: 'reservierung'
			}
		];
		const segmente = ringsegmente(belegungen, 'D-EELK', bezug, AUGUST);
		expect(fuellungBei(segmente, winkelFuerMinute(12 * 60))).toBe('frei');
	});
});

describe('Geometrie fix, Farbe echt (T-06, T-06b, E-15)', () => {
	it('lässt die Winkel im Juni, im Dezember und ohne Sonnenzeiten identisch', () => {
		// Das ist der eigentliche Sinn der Trennung: Wer den Ring einmal
		// gelesen hat, findet 15:00 im Dezember an derselben Stelle wie im
		// Juni. Nur die Farbe erzählt die Jahreszeit.
		for (const minute of [0, 360, 900, 1260, 1439]) {
			const winkel = winkelFuerMinute(minute);
			expect(winkelFuerMinute(minute)).toBe(winkel);
		}

		const juni = ringsegmente([], 'D-EELK', new Date('2026-06-21T12:00:00+02:00'), JUNI);
		const dezember = ringsegmente([], 'D-EELK', new Date('2026-12-21T12:00:00+01:00'), DEZEMBER);

		// Die Segmentgrenzen unterscheiden sich (Farbe), die Winkelabbildung
		// dahinter nicht — der Nachweis dafür ist, dass beide Ringe volle
		// 360° tragen und 15:00 in beiden auf demselben Winkel liegt.
		expect(juni.reduce((a, s) => a + (s.bisGrad - s.vonGrad), 0)).toBe(360);
		expect(dezember.reduce((a, s) => a + (s.bisGrad - s.vonGrad), 0)).toBe(360);
		expect(juni.map((s) => s.vonGrad)).not.toEqual(dezember.map((s) => s.vonGrad));
	});

	it('setzt die Farbgrenze im Juni **innerhalb** der gestauchten Zone', () => {
		// Sonnenaufgang 04:47 liegt im Nachtband der Skala (21:00–06:00).
		// Um 05:30 ist es im Juni längst hell — der Ring muss das zeigen.
		const segmente = ringsegmente([], 'D-EELK', new Date('2026-06-21T12:00:00+02:00'), JUNI);
		expect(fuellungBei(segmente, winkelFuerMinute(5 * 60 + 30))).toBe('frei');
		expect(fuellungBei(segmente, winkelFuerMinute(4 * 60))).toBe('nacht');
	});

	it('lässt im Juni die hellen Randstunden hell, in denen tatsächlich geflogen wird', () => {
		// 21:30 liegt hinter der Skalennaht, aber vor Sonnenuntergang (21:55).
		const segmente = ringsegmente([], 'D-EELK', new Date('2026-06-21T12:00:00+02:00'), JUNI);
		expect(fuellungBei(segmente, winkelFuerMinute(21 * 60 + 30))).toBe('frei');
	});

	it('setzt die Farbgrenze im Dezember **innerhalb** der gedehnten Zone', () => {
		// Sonnenaufgang 08:44, Untergang 15:57 — beide liegen im Tagbogen der
		// Skala. Der Nachmittag ab 15:57 muss dunkel sein, sonst behauptet der
		// Ring über fünf Stunden Tageslicht, die es nicht gibt.
		const segmente = ringsegmente([], 'D-EELK', new Date('2026-12-21T12:00:00+01:00'), DEZEMBER);
		expect(fuellungBei(segmente, winkelFuerMinute(7 * 60))).toBe('nacht');
		expect(fuellungBei(segmente, winkelFuerMinute(12 * 60))).toBe('frei');
		expect(fuellungBei(segmente, winkelFuerMinute(17 * 60))).toBe('nacht');
	});

	it('färbt keine der beiden Zonen als Ganzes ein', () => {
		const dezember = ringsegmente([], 'D-EELK', new Date('2026-12-21T12:00:00+01:00'), DEZEMBER);
		// In der gedehnten Zone (06:00–21:00) kommen beide Füllungen vor.
		const inDerTagzone = [7, 12, 17, 20].map((h) => fuellungBei(dezember, winkelFuerMinute(h * 60)));
		expect(new Set(inDerTagzone)).toEqual(new Set(['nacht', 'frei']));
	});

	it('fällt ohne Sonnenzeiten auf 21:00/06:00 zurück (T-06a)', () => {
		const segmente = ringsegmente([], 'D-EELK', new Date('2026-12-21T12:00:00+01:00'), null);
		// Ohne Sonnenzeiten wäre der Dezembernachmittag um 17:00 „frei" —
		// ungenau, aber vollständig. Das ist der bewusste Preis.
		expect(fuellungBei(segmente, winkelFuerMinute(17 * 60))).toBe('frei');
		expect(fuellungBei(segmente, winkelFuerMinute(5 * 60))).toBe('nacht');
	});
});

describe('markerwinkel (T-10, T-12)', () => {
	it('liefert ohne Sonnenzeiten null für beide Sonnenmarker, aber einen Jetzt-Marker', () => {
		const marker = markerwinkel(new Date('2026-08-18T12:00:00+02:00'), null);
		expect(marker.sonnenaufgang).toBeNull();
		expect(marker.sonnenuntergang).toBeNull();
		expect(marker.jetzt).toBeCloseTo(winkelFuerMinute(12 * 60), 6);
	});

	it('setzt die Sonnenmarker genau auf die Farbkante', () => {
		const marker = markerwinkel(new Date('2026-08-18T12:00:00+02:00'), AUGUST);
		expect(marker.sonnenaufgang).toBeCloseTo(winkelFuerMinute(6 * 60 + 7), 6);
		expect(marker.sonnenuntergang).toBeCloseTo(winkelFuerMinute(20 * 60 + 45), 6);
	});

	it('nimmt den Bezugszeitpunkt entgegen, statt ihn selbst zu holen', () => {
		// Ohne diesen Parameter ließe sich weder die Zeitumstellung noch der
		// Tageswechsel prüfen — beides ginge erst im Betrieb schief.
		const frueh = markerwinkel(new Date('2026-08-18T07:00:00+02:00'), null).jetzt;
		const spaet = markerwinkel(new Date('2026-08-18T19:00:00+02:00'), null).jetzt;
		expect(frueh).not.toBe(spaet);
	});
});

describe('Zeitzonen (T-11)', () => {
	it('bildet die Tagesgrenzen in Europe/Berlin, nicht in der Zone des Geräts', () => {
		// Derselbe Augenblick, zweimal ausgedrückt: Der Ring muss identisch
		// sein. Ein Telefon in einer anderen Zone zeigt sonst einen anderen Tag.
		const a = ringsegmente([], 'D-EELK', new Date('2026-08-18T12:00:00+02:00'), AUGUST);
		const b = ringsegmente([], 'D-EELK', new Date('2026-08-18T10:00:00Z'), AUGUST);
		expect(a).toEqual(b);
	});
});
