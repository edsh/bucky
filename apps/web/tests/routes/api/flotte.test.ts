import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GET as GetType } from '../../../src/routes/api/flotte/+server.js';

/**
 * Vertragsprüfung gegen contracts/api-flotte.md (Feature 054).
 *
 * Der Punkt, um den es hier vor allem geht, ist F-03: Wenn keine Auskunft
 * möglich ist, muss die Antwort die Flotte trotzdem nennen — aber für keine
 * einzige Maschine eine Verfügbarkeitsaussage enthalten. Eine leere
 * `belegungen`-Liste wäre genau die Verwechslung, die SC-003 ausschließt:
 * Sie sieht aus wie „nichts gebucht".
 */

/** Ein KV-Namensraum, wie ihn Cloudflare stellt — nur `get` wird gebraucht. */
class KvAttrappe {
	constructor(private readonly wert: string | null) {}
	async get(): Promise<string | null> {
		return this.wert;
	}
}

function platform(kvWert: string | null): App.Platform {
	return {
		env: {
			KALENDER_ABO_URL: 'https://beispiel.invalid/geheim/cal.ics',
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			RESERVIERUNGEN: new KvAttrappe(kvWert) as any
		}
	};
}

/** Ein Kalender mit einer Reservierung, die zum angegebenen Ortstag gehört. */
function kalenderMit(zeilen: string[]): string {
	return ['BEGIN:VCALENDAR', 'VERSION:2.0', ...zeilen, 'END:VCALENDAR'].join('\r\n');
}

function ereignis(zusammenfassung: string, beginn: string, ende: string): string[] {
	return [
		'BEGIN:VEVENT',
		`SUMMARY:${zusammenfassung}`,
		`DTSTART:${beginn}`,
		`DTEND:${ende}`,
		'END:VEVENT'
	];
}

/** Ortstag-Stempel für „heute" bzw. „heute + n Tage", ohne Uhrzeitversatz. */
function tagesstempel(versatzTage: number, uhrzeit = '090000'): string {
	const jetzt = new Date();
	const tag = new Date(
		Date.UTC(jetzt.getUTCFullYear(), jetzt.getUTCMonth(), jetzt.getUTCDate() + versatzTage)
	);
	const iso = tag.toISOString().slice(0, 10).replace(/-/g, '');
	return `${iso}T${uhrzeit}Z`;
}

afterEach(() => {
	vi.restoreAllMocks();
});

/**
 * `kalender-holen.ts` hält einen gelungenen Abruf 30s modulglobal vor
 * (research.md E-08) — deshalb vor jedem Testfall frisch laden.
 */
let GET: typeof GetType;
beforeEach(async () => {
	vi.resetModules();
	({ GET } = await import('../../../src/routes/api/flotte/+server.js'));
});

describe('GET /api/flotte — kein Stand verfügbar (F-03)', () => {
	beforeEach(() => {
		vi.stubGlobal('fetch', vi.fn(async () => new Response('kaputt', { status: 503 })));
	});

	it('antwortet mit 200 und stand: fehlt statt mit einem Fehlerstatus', async () => {
		const antwort = await GET({ platform: platform(null) });
		expect(antwort.status).toBe(200);
		const inhalt = (await antwort.json()) as Record<string, unknown>;
		expect(inhalt.stand).toBe('fehlt');
		expect(inhalt.quelle).toBe('rueckfall');
	});

	it('nennt die Flotte trotzdem — sie hängt an der Stammliste, nicht am Abruf', async () => {
		const antwort = await GET({ platform: platform(null) });
		const inhalt = (await antwort.json()) as { flotte: { kennung: string }[] };
		expect(inhalt.flotte.length).toBeGreaterThan(0);
		expect(inhalt.flotte.map((m) => m.kennung)).toContain('D-EELK');
	});

	it('liefert **kein** Feld belegungen — eine leere Liste hieße „nichts gebucht"', async () => {
		const antwort = await GET({ platform: platform(null) });
		const inhalt = (await antwort.json()) as Record<string, unknown>;
		expect('belegungen' in inhalt).toBe(false);
	});
});

describe('GET /api/flotte — Stand vorhanden', () => {
	it('meldet bei gültigem Kalender die Quelle kalender und liefert Belegungen (F-02)', async () => {
		const kalender = kalenderMit(
			ereignis(
				'Reservierung D-EELK - (Muster, Mia)',
				tagesstempel(0, '090000'),
				tagesstempel(0, '110000')
			)
		);
		vi.stubGlobal('fetch', vi.fn(async () => new Response(kalender, { status: 200 })));

		const antwort = await GET({ platform: platform(null) });
		const inhalt = (await antwort.json()) as {
			stand: string;
			quelle: string;
			belegungen: { kennung: string }[];
		};

		expect(inhalt.stand).toBe('vorhanden');
		expect(inhalt.quelle).toBe('kalender');
		expect(inhalt.belegungen.map((b) => b.kennung)).toContain('D-EELK');
	});

	it('fällt bei einem Fehlschlag auf den Zwischenspeicher zurück, nie auf frei (F-02)', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>Wartung</html>', { status: 200 })));
		const gespeichert = JSON.stringify({
			abgerufenAm: new Date().toISOString(),
			reservierungen: [],
			verworfeneEintraege: 0,
			neuanmeldungen: 0
		});

		const antwort = await GET({ platform: platform(gespeichert) });
		const inhalt = (await antwort.json()) as Record<string, unknown>;

		expect(inhalt.stand).toBe('vorhanden');
		expect(inhalt.quelle).toBe('rueckfall');
		expect(inhalt.veraltet).toBe(false);
	});

	it('nennt auch Maschinen, die nur gesperrt vorkommen (E-01)', async () => {
		// Genau dieser Fall hat den Ausschlag für die Stammliste gegeben:
		// Drei der sechs Maschinen tauchen im echten Abzug ausschließlich als
		// Sperre auf. Eine Flotte allein aus Reservierungen verlöre die Hälfte.
		const kalender = kalenderMit(
			ereignis('Grounding D-MRXS - Wartung', tagesstempel(0, '000000'), tagesstempel(2, '000000'))
		);
		vi.stubGlobal('fetch', vi.fn(async () => new Response(kalender, { status: 200 })));

		const antwort = await GET({ platform: platform(null) });
		const inhalt = (await antwort.json()) as { flotte: { kennung: string }[] };
		expect(inhalt.flotte.map((m) => m.kennung)).toContain('D-MRXS');
	});

	it('gibt keine personenbezogene Angabe heraus, auch keine leere (F-05)', async () => {
		const kalender = kalenderMit(
			ereignis(
				'Reservierung D-EELK - (Muster, Mia)',
				tagesstempel(0, '090000'),
				tagesstempel(0, '110000')
			)
		);
		vi.stubGlobal('fetch', vi.fn(async () => new Response(kalender, { status: 200 })));

		const roh = await (await GET({ platform: platform(null) })).text();
		expect(roh).not.toContain('Muster');
		expect(roh).not.toContain('Mia');
		expect(roh).not.toMatch(/pilot|fluglehrer|bemerkung/i);
	});

	it('lässt die Adresse des Kalender-Abos nicht nach außen (F-06)', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => new Response('kaputt', { status: 500 })));
		const roh = await (await GET({ platform: platform(null) })).text();
		expect(roh).not.toContain('geheim');
		expect(roh).not.toContain('beispiel.invalid');
	});
});

/**
 * Nachweis 5 aus quickstart.md (FR-023, SC-006).
 *
 * Der Fall darüber prüft einen erfundenen Namen — hier läuft der **echte**
 * Abzug durch die echte Route, und gegengeprüft wird gegen die Namen, die in
 * diesem Abzug wirklich stehen. Ein Muster nach Feldnamen fände nur, was wir
 * ohnehin vermuten; dieser Fall findet auch, was jemand versehentlich
 * durchreicht.
 *
 * Die Namen im Prüfstoff sind erfunden und 1:1 ersetzt (siehe
 * `tests/beispiele/README.md`) — sie stehen an genau den Stellen, an denen im
 * Original echte standen, und das genügt für diese Frage.
 */
describe('GET /api/flotte — gegen den echten Kalenderabzug (Nachweis 5)', () => {
	const KALENDER = readFileSync(
		fileURLToPath(
			new URL(
				'../../../../../packages/reservierung-core/tests/beispiele/kalender.ics',
				import.meta.url
			)
		),
		'utf8'
	);

	/**
	 * Alle Personennamen des Abzugs, aus den Klammern in `SUMMARY` und
	 * `DESCRIPTION` gelesen — `Reservierung D-EELK - (Krause, Otto)`.
	 *
	 * Aus der Datei gelesen statt abgeschrieben: Wächst der Prüfstoff, wächst
	 * diese Liste mit. Eine abgeschriebene Liste veraltet still, und zwar in
	 * die gefährliche Richtung.
	 */
	function namenAusDemAbzug(): string[] {
		const namen = new Set<string>();
		for (const treffer of KALENDER.matchAll(/\(([^()]*,[^()]*)\)/g)) {
			const inhalt = treffer[1].trim();
			// Der Hinweistext im Kalendertitel ist kein Personenname.
			if (inhalt.includes('Bucky Highfly')) continue;
			namen.add(inhalt);
			for (const teil of inhalt.split(',')) {
				const wort = teil.trim();
				if (wort.length >= 4) namen.add(wort);
			}
		}
		return [...namen];
	}

	beforeEach(() => {
		vi.stubGlobal('fetch', vi.fn(async () => new Response(KALENDER, { status: 200 })));
		// Der Abzug stammt vom 13.08.2026. Ohne festen Bezugstag liefe dieses
		// Fenster eines Tages an allen Einträgen vorbei — und der Nachweis
		// wäre grün, weil nichts mehr durchgereicht *werden kann*. Ein Test,
		// der mit der Zeit aufhört zu prüfen, ist schlimmer als keiner.
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date('2026-08-13T09:00:00Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('findet im Prüfstoff überhaupt Namen — sonst prüft der Rest nichts', () => {
		expect(namenAusDemAbzug().length).toBeGreaterThan(20);
	});

	it('reicht überhaupt Belegungen durch — sonst prüft der Rest nichts', async () => {
		const inhalt = (await (await GET({ platform: platform(null) })).json()) as {
			belegungen?: unknown[];
		};
		expect(inhalt.belegungen?.length ?? 0).toBeGreaterThan(5);
	});

	it('gibt keinen einzigen davon weiter', async () => {
		const roh = await (await GET({ platform: platform(null) })).text();
		expect(namenAusDemAbzug().filter((name) => roh.includes(name))).toEqual([]);
	});

	it('lässt auch den Sachtext der Einträge draußen', async () => {
		// Ein Sperrgrund ist kein Personendatum, gehört aber trotzdem nicht
		// hinaus (FR-010): „Flieger defekt" ist eine Auskunft über die
		// Werkstatt, nicht über die Verfügbarkeit.
		const roh = await (await GET({ platform: platform(null) })).text();
		expect(roh).not.toContain('defekt');
		expect(roh).not.toContain('Flugplatzfest');
	});

	it('zeigt trotzdem die ganze Flotte — und keinen Grillplatz', async () => {
		const inhalt = (await (await GET({ platform: platform(null) })).json()) as {
			flotte: { kennung: string }[];
		};
		const kennungen = inhalt.flotte.map((m) => m.kennung);
		expect(kennungen).toEqual(['D-EELK', 'D-EXYZ', 'D-MRXS', 'D-3004', 'D-4413', 'D-9021']);
	});
});

describe('GET /api/flotte — Zeitfenster (F-07)', () => {
	it('nimmt Belegungen mit, die von gestern in den heutigen Tag hineinragen', async () => {
		// Ohne diese Regel zeigte die Tagesuhr die frühesten Stunden
		// fälschlich als frei — dabei steht das Flugzeug noch draußen.
		const kalender = kalenderMit(
			ereignis(
				'Reservierung D-EELK - (Muster, Mia)',
				tagesstempel(-1, '180000'),
				tagesstempel(0, '020000')
			)
		);
		vi.stubGlobal('fetch', vi.fn(async () => new Response(kalender, { status: 200 })));

		const antwort = await GET({ platform: platform(null) });
		const inhalt = (await antwort.json()) as { belegungen: unknown[] };
		expect(inhalt.belegungen).toHaveLength(1);
	});

	it('lässt Belegungen weg, die vollständig jenseits des achten Tages liegen', async () => {
		const kalender = kalenderMit(
			ereignis(
				'Reservierung D-EELK - (Muster, Mia)',
				tagesstempel(20, '090000'),
				tagesstempel(20, '110000')
			)
		);
		vi.stubGlobal('fetch', vi.fn(async () => new Response(kalender, { status: 200 })));

		const antwort = await GET({ platform: platform(null) });
		const inhalt = (await antwort.json()) as { belegungen: unknown[] };
		expect(inhalt.belegungen).toHaveLength(0);
	});

	it('liefert die Zeitpunkte ungekürzt, nicht auf die Fenstergrenze beschnitten (E-06)', async () => {
		const beginn = tagesstempel(-1, '180000');
		const kalender = kalenderMit(
			ereignis('Reservierung D-EELK - (Muster, Mia)', beginn, tagesstempel(0, '020000'))
		);
		vi.stubGlobal('fetch', vi.fn(async () => new Response(kalender, { status: 200 })));

		const antwort = await GET({ platform: platform(null) });
		const inhalt = (await antwort.json()) as { belegungen: { beginn: string }[] };

		// Der gelieferte Beginn liegt vor heute 00:00 Ortszeit — er wurde
		// also nicht auf die Fenstergrenze gezogen. Genau darum geht es:
		// Aus diesen Daten entsteht auch der Satz „belegt bis".
		const heuteNull = new Date();
		heuteNull.setHours(0, 0, 0, 0);
		expect(new Date(inhalt.belegungen[0].beginn).getTime()).toBeLessThan(heuteNull.getTime());
	});
});

describe('GET /api/flotte — Kopfzeilen (F-04)', () => {
	it('gibt in jedem Fall no-store aus', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => new Response('kaputt', { status: 500 })));
		const antwort = await GET({ platform: platform(null) });
		expect(antwort.headers.get('cache-control')).toContain('no-store');
		expect(antwort.headers.get('content-type')).toContain('application/json');
	});
});
