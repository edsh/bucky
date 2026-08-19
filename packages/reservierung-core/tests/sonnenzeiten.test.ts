import { describe, expect, it } from 'vitest';
import {
	deckenAb,
	sonnenzeitenDeuten,
	sonnenzeitenFuerTag
} from '../src/sonnenzeiten.js';

/**
 * Prüfungen zum Deuten der Sonnenzeiten (T051, research.md E-08).
 *
 * Die Antwortform stammt aus der am 18.08.2026 verifizierten Anfrage:
 * `daily.time`, `daily.sunrise`, `daily.sunset` — Ortszeit ohne Versatz, zu
 * lesen in der angeforderten Zone.
 */

function antwort(tage: { tag: string; auf: string; unter: string }[]) {
	return {
		latitude: 54.06,
		longitude: 9.55,
		timezone: 'Europe/Berlin',
		daily: {
			time: tage.map((t) => t.tag),
			sunrise: tage.map((t) => t.auf),
			sunset: tage.map((t) => t.unter)
		}
	};
}

describe('sonnenzeitenDeuten', () => {
	it('macht aus der Ortszeit ohne Versatz die Zeitform des Systems', () => {
		const gedeutet = sonnenzeitenDeuten(
			antwort([{ tag: '2026-08-19', auf: '2026-08-19T06:05', unter: '2026-08-19T20:48' }])
		);

		expect(gedeutet).toHaveLength(1);
		expect(gedeutet[0]).toEqual({
			tag: '2026-08-19',
			aufgang: '2026-08-19T06:05:00+02:00',
			untergang: '2026-08-19T20:48:00+02:00'
		});
	});

	it('kennt den Unterschied zwischen Sommer- und Winterzeit', () => {
		// Derselbe Ort, ein halbes Jahr später: +01:00 statt +02:00. Stünde
		// hier zweimal derselbe Versatz, läge die Hell/Dunkel-Kante des Rings
		// im Winter eine Stunde daneben — und zwar in der dunklen Richtung.
		const gedeutet = sonnenzeitenDeuten(
			antwort([{ tag: '2026-12-21', auf: '2026-12-21T08:41', unter: '2026-12-21T15:52' }])
		);

		expect(gedeutet[0]!.aufgang).toBe('2026-12-21T08:41:00+01:00');
		expect(gedeutet[0]!.untergang).toBe('2026-12-21T15:52:00+01:00');
	});

	it('nimmt auch eine Angabe mit Sekunden an', () => {
		const gedeutet = sonnenzeitenDeuten(
			antwort([{ tag: '2026-08-19', auf: '2026-08-19T06:05:12', unter: '2026-08-19T20:48:33' }])
		);

		expect(gedeutet[0]!.aufgang).toBe('2026-08-19T06:05:12+02:00');
	});

	it('übergeht einen unlesbaren Tag, statt die übrigen mitzunehmen', () => {
		// Ein Ausrutscher am dritten Tag darf die anderen sieben nicht kosten.
		const gedeutet = sonnenzeitenDeuten(
			antwort([
				{ tag: '2026-08-19', auf: '2026-08-19T06:05', unter: '2026-08-19T20:48' },
				{ tag: '2026-08-20', auf: 'null', unter: '2026-08-20T20:46' },
				{ tag: '2026-08-21', auf: '2026-08-21T06:09', unter: '2026-08-21T20:44' }
			])
		);

		expect(gedeutet.map((s) => s.tag)).toEqual(['2026-08-19', '2026-08-21']);
	});

	it('geht nur so weit, wie alle drei Listen reichen', () => {
		// Ein Aufgang ohne den zugehörigen Untergang ist eine halbe Aussage,
		// und die ist schlimmer als keine.
		const roh = antwort([
			{ tag: '2026-08-19', auf: '2026-08-19T06:05', unter: '2026-08-19T20:48' },
			{ tag: '2026-08-20', auf: '2026-08-20T06:07', unter: '2026-08-20T20:46' }
		]);
		roh.daily.sunset = [roh.daily.sunset[0]!];

		expect(sonnenzeitenDeuten(roh)).toHaveLength(1);
	});

	it('bricht ab, wenn die Antwort als Ganzes unbrauchbar ist', () => {
		expect(() => sonnenzeitenDeuten(null)).toThrow(/kein Objekt/);
		expect(() => sonnenzeitenDeuten({})).toThrow(/daily/);
		expect(() => sonnenzeitenDeuten({ daily: { time: '2026-08-19' } })).toThrow(/Listen/);
	});

	it('liefert eine leere Liste, wenn der Dienst gar keine Tage schickt', () => {
		// Kein Fehler, nur nichts zu sagen — der Ring kommt ohne aus.
		expect(sonnenzeitenDeuten(antwort([]))).toEqual([]);
	});
});

describe('sonnenzeitenFuerTag', () => {
	const satz = sonnenzeitenDeuten(
		antwort([
			{ tag: '2026-08-19', auf: '2026-08-19T06:05', unter: '2026-08-19T20:48' },
			{ tag: '2026-08-20', auf: '2026-08-20T06:07', unter: '2026-08-20T20:46' }
		])
	);

	it('findet den gesuchten Tag', () => {
		expect(sonnenzeitenFuerTag(satz, '2026-08-20')!.aufgang).toBe('2026-08-20T06:07:00+02:00');
	});

	it('gibt null zurück, statt einen Nachbartag anzubieten', () => {
		expect(sonnenzeitenFuerTag(satz, '2026-08-27')).toBeNull();
		expect(sonnenzeitenFuerTag(null, '2026-08-19')).toBeNull();
		expect(sonnenzeitenFuerTag(undefined, '2026-08-19')).toBeNull();
	});
});

describe('deckenAb', () => {
	const acht = sonnenzeitenDeuten(
		antwort(
			Array.from({ length: 8 }, (_, i) => {
				const tag = `2026-08-${String(19 + i).padStart(2, '0')}`;
				return { tag, auf: `${tag}T06:05`, unter: `${tag}T20:48` };
			})
		)
	);

	it('bejaht einen vollständigen Satz', () => {
		expect(deckenAb(acht, '2026-08-19', 8)).toBe(true);
	});

	it('verneint, sobald ein Tag fehlt', () => {
		// Am nächsten Morgen reicht derselbe Satz nur noch für sieben Tage —
		// genau daran erkennt der Abruf-Worker, dass er einmal nachholen muss.
		expect(deckenAb(acht, '2026-08-20', 8)).toBe(false);
	});

	it('verneint bei fehlendem oder leerem Satz', () => {
		expect(deckenAb(null, '2026-08-19', 8)).toBe(false);
		expect(deckenAb([], '2026-08-19', 8)).toBe(false);
	});

	it('zählt über den Monatswechsel richtig weiter', () => {
		const ende = sonnenzeitenDeuten(
			antwort(
				['2026-08-30', '2026-08-31', '2026-09-01'].map((tag) => ({
					tag,
					auf: `${tag}T06:30`,
					unter: `${tag}T20:10`
				}))
			)
		);

		expect(deckenAb(ende, '2026-08-30', 3)).toBe(true);
		expect(deckenAb(ende, '2026-08-30', 4)).toBe(false);
	});

	it('zählt über die Zeitumstellung richtig weiter', () => {
		// Der 25.10.2026 ist 25 Stunden lang. In 24-Stunden-Schritten
		// gerechnet käme dieser Tag zweimal und der letzte gar nicht.
		const umstellung = sonnenzeitenDeuten(
			antwort(
				['2026-10-24', '2026-10-25', '2026-10-26'].map((tag) => ({
					tag,
					auf: `${tag}T08:00`,
					unter: `${tag}T18:00`
				}))
			)
		);

		expect(deckenAb(umstellung, '2026-10-24', 3)).toBe(true);
	});
});
