import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GET as GetType } from '../../../src/routes/api/reservierung/+server.js';

/**
 * Vertragsprüfung gegen contracts/api-reservierung.md (Feature 052).
 *
 * Der härteste Grenzfall zuerst: Antwortet die Gegenstelle mit Status 200,
 * aber der Inhalt ist kein gültiger Kalender (z. B. eine HTML-Fehlerseite —
 * denkbar bei einer Wartungsseite oder einem Weiterleitungsziel), MUSS die
 * Route das als Fehlschlag behandeln und auf den Zwischenspeicher
 * zurückfallen — niemals `frei: true` ohne Datengrundlage ausgeben (FR-008).
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

afterEach(() => {
	vi.restoreAllMocks();
});

/**
 * `kalender-holen.ts` haelt einen gelungenen Abruf 30s modulglobal vor
 * (research.md E-08). Damit ein Ergebnis aus einem frueheren Testfall nicht
 * in den naechsten durchschlaegt, wird das Modul (und damit auch die Route,
 * die es importiert) vor jedem Testfall frisch geladen.
 */
let GET: typeof GetType;
beforeEach(async () => {
	vi.resetModules();
	({ GET } = await import('../../../src/routes/api/reservierung/+server.js'));
});

describe('GET /api/reservierung — Kalender liefert kein gültiges Ergebnis', () => {
	it('fällt bei einer HTML-Fehlerseite (Status 200) auf den Zwischenspeicher zurück, statt frei zu melden', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response('<html><body>Wartungsarbeiten</body></html>', { status: 200 }))
		);

		const antwort = await GET({ platform: platform(null) });
		const inhalt = (await antwort.json()) as Record<string, unknown>;

		// Kein gespeicherter Stand vorhanden -> "fehlt", niemals "frei".
		expect(inhalt.stand).toBe('fehlt');
		expect(inhalt.quelle).toBe('rueckfall');
		expect(inhalt.frei).toBeUndefined();
	});

	it('fällt bei einem HTTP-Fehlerstatus auf einen vorhandenen Zwischenspeicher zurück', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => new Response('Fehler', { status: 503 })));

		const gespeichert = JSON.stringify({
			abgerufenAm: '2026-08-13T06:00:00.000Z',
			reservierungen: [],
			verworfeneEintraege: 0,
			neuanmeldungen: 3
		});

		const antwort = await GET({ platform: platform(gespeichert) });
		const inhalt = (await antwort.json()) as Record<string, unknown>;

		expect(inhalt.stand).toBe('vorhanden');
		expect(inhalt.quelle).toBe('rueckfall');
		expect(inhalt.frei).toBe(true);
	});

	it('meldet bei einem gültigen Kalender die Quelle kalender', async () => {
		const kalender = [
			'BEGIN:VCALENDAR',
			'VERSION:2.0',
			'BEGIN:VEVENT',
			'SUMMARY:Reservierung D-EELK - (Muster, Mia)',
			'DTSTART:20260101T090000Z',
			'DTEND:20260101T100000Z',
			'END:VEVENT',
			'END:VCALENDAR'
		].join('\r\n');
		vi.stubGlobal('fetch', vi.fn(async () => new Response(kalender, { status: 200 })));

		const antwort = await GET({ platform: platform(null) });
		const inhalt = (await antwort.json()) as Record<string, unknown>;

		expect(inhalt.stand).toBe('vorhanden');
		expect(inhalt.quelle).toBe('kalender');
	});

	it('gibt in jedem Fall den no-store-Header aus', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => new Response('kaputt', { status: 200 })));
		const antwort = await GET({ platform: platform(null) });
		expect(antwort.headers.get('cache-control')).toContain('no-store');
	});
});
