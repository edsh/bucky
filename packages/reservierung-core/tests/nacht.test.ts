import { describe, expect, it } from 'vitest';
import { DAEMMERUNG, nachtstops } from '../src/nacht.js';
import { FENSTER_GANZTAGS } from '../src/segmente.js';
import type { Sonnenzeiten } from '../src/typen.js';

/**
 * Pruefungen der Nachttoenung (contracts/zeitwahl.md, N-01).
 *
 * Die Zahlen des Handoffs sind der Pruefstein: Er nennt fuer den 13. August
 * (Aufgang 06:05, Untergang 20:40) die Stops 0,5 % / 1,6 % / 90,6 % / 92,7 %
 * und sagt zugleich, sie seien zu berechnen statt einzutragen. Genau diese
 * Rechnung wird hier nachgeprueft — und dann an einem Wintertag, an dem die
 * eingetragenen Zahlen falsch waeren.
 */

/**
 * Der Versatz gehoert zum Datum, nicht zur Bequemlichkeit: Ein Dezembertag mit
 * `+02:00` waere eine Stunde daneben, und die Pruefung mit ihm. Genau dieser
 * Fehler steckte im ersten Entwurf dieser Datei.
 */
function sonne(
	tag: string,
	aufgang: string,
	untergang: string,
	versatz: '+01:00' | '+02:00' = '+02:00'
): Sonnenzeiten {
	return {
		tag,
		aufgang: `${tag}T${aufgang}:00${versatz}`,
		untergang: `${tag}T${untergang}:00${versatz}`
	};
}

/** Anteil als Prozent mit einer Nachkommastelle — so steht es im Handoff. */
function prozent(anteil: number): number {
	return Math.round(anteil * 1000) / 10;
}

describe('nachtstops (N-01)', () => {
	it('trifft die Stops des Handoffs am 13. August', () => {
		const stops = nachtstops(sonne('2026-08-13', '06:05', '20:40'));

		expect(prozent(stops!.morgens!.sonne)).toBe(0.5);
		expect(prozent(stops!.morgens!.klar)).toBe(1.6);
		expect(prozent(stops!.abends!.klar)).toBe(90.6);
		expect(prozent(stops!.abends!.sonne)).toBe(91.7);
	});

	it('rechnet die Daemmerung als Abstand zwischen Sonne und Klar', () => {
		const stops = nachtstops(sonne('2026-08-13', '06:05', '20:40'));
		const breite = 960;

		expect(stops!.morgens!.klar - stops!.morgens!.sonne).toBeCloseTo(DAEMMERUNG / breite, 10);
		expect(stops!.abends!.sonne - stops!.abends!.klar).toBeCloseTo(DAEMMERUNG / breite, 10);
	});

	it('laesst den Morgenrand entfallen, wenn die Sonne vor Fensterbeginn aufgeht', () => {
		// Sommersonnenwende: um 06:00 ist es laengst hell. Am Abend bleiben
		// dagegen zwanzig Minuten Nacht im Fenster — die Sonne geht vor 22:00
		// unter, und das gehoert gezeigt.
		const stops = nachtstops(sonne('2026-06-21', '05:15', '21:40'));

		expect(stops!.morgens).toBeNull();
		expect(prozent(stops!.abends!.sonne)).toBeCloseTo(97.9, 1);
	});

	it('laesst den Abendrand entfallen, wenn die Sonne nach Fensterende untergeht', () => {
		// An EDSH kommt das nicht vor — der spaeteste Untergang liegt vor 22:00.
		// Der Fall wird trotzdem gedeckt: Die Funktion kennt ihren Ort nicht und
		// soll auch fuer einen noerdlicheren Platz das Richtige tun.
		const stops = nachtstops(sonne('2026-06-21', '04:00', '22:30'));

		expect(stops!.morgens).toBeNull();
		expect(stops!.abends).toBeNull();
	});

	it('toent an einem Wintertag beide Raender deutlich', () => {
		const stops = nachtstops(sonne('2026-12-13', '08:15', '16:25', '+01:00'));

		// Zweieinviertel Stunden Nacht am Morgen, fuenfeinhalb am Abend.
		expect(prozent(stops!.morgens!.sonne)).toBeCloseTo(14.1, 1);
		expect(prozent(stops!.abends!.sonne)).toBeCloseTo(65.1, 1);
	});

	it('gibt null ohne Sonnenzeiten — geschaetzt wird nichts', () => {
		expect(nachtstops(null)).toBeNull();
		expect(nachtstops(undefined)).toBeNull();
	});

	it('beschneidet die Anteile auf 0 bis 1', () => {
		const stops = nachtstops(sonne('2026-12-13', '08:15', '16:25', '+01:00'));

		for (const wert of [
			stops!.morgens!.sonne,
			stops!.morgens!.klar,
			stops!.abends!.klar,
			stops!.abends!.sonne
		]) {
			expect(wert).toBeGreaterThanOrEqual(0);
			expect(wert).toBeLessThanOrEqual(1);
		}
	});

	it('rechnet auf ein anderes Fenster um, wenn eines uebergeben wird', () => {
		const stops = nachtstops(sonne('2026-08-13', '06:05', '20:40'), FENSTER_GANZTAGS);

		// Im Ganztagsfenster liegt 06:05 bei 6:05/24:00.
		expect(prozent(stops!.morgens!.sonne)).toBeCloseTo(25.3, 1);
	});
});
