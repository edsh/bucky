import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { kalenderHolen as KalenderHolenType } from '../../../src/lib/server/kalender-holen.js';

const LEERER_KALENDER = 'BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n';

/**
 * `kalender-holen.ts` haelt einen gelungenen Abruf modulglobal 30s vor
 * (research.md E-08). Jeder Testfall laedt das Modul deshalb frisch, damit
 * kein Ergebnis aus einem frueheren Fall durchschlaegt.
 */
let kalenderHolen: typeof KalenderHolenType;
beforeEach(async () => {
	vi.resetModules();
	({ kalenderHolen } = await import('../../../src/lib/server/kalender-holen.js'));
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.useRealTimers();
});

describe('kalenderHolen — Ueberlastschutz (T032, research.md E-08)', () => {
	it('loest bei mehreren schnellen Aufrufen nur einen tatsaechlichen Netzabruf aus', async () => {
		const fetchAttrappe = vi.fn(() => Promise.resolve(new Response(LEERER_KALENDER, { status: 200 })));
		vi.stubGlobal('fetch', fetchAttrappe);

		await Promise.all([
			kalenderHolen('https://beispiel.invalid/geheim/cal.ics'),
			kalenderHolen('https://beispiel.invalid/geheim/cal.ics'),
			kalenderHolen('https://beispiel.invalid/geheim/cal.ics')
		]);
		await kalenderHolen('https://beispiel.invalid/geheim/cal.ics');

		expect(fetchAttrappe).toHaveBeenCalledTimes(1);
	});

	it('holt nach Ablauf der 30s erneut ab', async () => {
		vi.useFakeTimers();
		const fetchAttrappe = vi.fn(() => Promise.resolve(new Response(LEERER_KALENDER, { status: 200 })));
		vi.stubGlobal('fetch', fetchAttrappe);

		await kalenderHolen('https://beispiel.invalid/geheim/cal.ics');
		vi.advanceTimersByTime(30_001);
		await kalenderHolen('https://beispiel.invalid/geheim/cal.ics');

		expect(fetchAttrappe).toHaveBeenCalledTimes(2);
	});

	it('haelt einen Fehlschlag nicht vor -- der naechste Aufruf versucht es sofort erneut', async () => {
		const fetchAttrappe = vi
			.fn()
			.mockRejectedValueOnce(new Error('Netzwerk weg'))
			.mockResolvedValueOnce(new Response(LEERER_KALENDER, { status: 200 }));
		vi.stubGlobal('fetch', fetchAttrappe);

		await expect(kalenderHolen('https://beispiel.invalid/geheim/cal.ics')).rejects.toThrow();
		await expect(kalenderHolen('https://beispiel.invalid/geheim/cal.ics')).resolves.toBeDefined();

		expect(fetchAttrappe).toHaveBeenCalledTimes(2);
	});
});
