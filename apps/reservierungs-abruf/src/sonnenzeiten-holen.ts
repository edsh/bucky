import { sonnenzeitenDeuten, type Sonnenzeiten } from '@edsh-bucky/reservierung-core';

/**
 * Die Sonnenzeiten beim Wetterdienst holen (research.md E-08).
 *
 * Das Deuten macht der Kern; hier steht nur der Weg nach draussen. Die
 * Anfrage ist die am 18.08.2026 verifizierte: acht Tage, Ortszeit in der
 * Platzzone, nur Auf- und Untergang.
 *
 * `timezone=Europe/Berlin` ist Absicht und kein Bequemlichkeitsgriff: Die
 * gelieferte Zeichenkette ist dann die Ortszeit, die auch auf dem Ring steht,
 * und wird ueber denselben Kernweg gelesen wie jede Reservierung. So gibt es
 * im System eine Zeitform statt zweier.
 */

/** Die Platzkoordinaten, wie in E-08 festgehalten und dort verifiziert. */
const BREITE = 54.06;
const LAENGE = 9.55;

/**
 * Acht Tage — so weit reicht auch die Auskunft von `/api/flotte`.
 *
 * Sieben Tagesspalten braucht die Wochenansicht; der achte deckt die
 * Belegung ab, die aus der letzten Spalte in den Folgetag ragt.
 */
export const VORHERSAGETAGE = 8;

/**
 * Ein sprechender Absender.
 *
 * Open-Meteo verlangt ihn nicht, aber wer einen fremden Dienst kostenlos
 * benutzt, sollte ansprechbar sein, wenn etwas schiefgeht. Ein anonymer
 * Aufrufer laesst dem Betreiber nur die Wahl, ihn zu sperren.
 */
const ABSENDER = 'bucky-highfly/1.0 (Luftsportverein EDSH; https://bucky.edsh.de)';

export function anfrageadresse(): string {
	const parameter = new URLSearchParams({
		latitude: String(BREITE),
		longitude: String(LAENGE),
		daily: 'sunrise,sunset',
		timezone: 'Europe/Berlin',
		forecast_days: String(VORHERSAGETAGE)
	});

	return `https://api.open-meteo.com/v1/forecast?${parameter}`;
}

/**
 * Holen und deuten — wirft bei jedem Fehlschlag.
 *
 * Wer das aufruft, faengt den Fehlschlag ab: Der Reservierungsstand ist
 * wichtiger als die Sonne, und ein ausgefallener Wetterdienst darf den
 * Durchgang nicht beenden (E-08).
 */
export async function sonnenzeitenHolen(): Promise<Sonnenzeiten[]> {
	const antwort = await fetch(anfrageadresse(), {
		headers: { 'user-agent': ABSENDER }
	});

	if (!antwort.ok) {
		throw new Error(`Wetterdienst abgelehnt: ${antwort.status}`);
	}

	return sonnenzeitenDeuten(await antwort.json());
}
