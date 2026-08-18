import type { Maschine, Quelle, Reservierung } from '@edsh-bucky/reservierung-core';

/**
 * Der Stand der Flotte im Browser: einmal geholt, minuetlich neu gerechnet.
 *
 * Das ist die Trennung, um die es hier geht (research.md E-09): FR-016
 * verlangt eine **mitlaufende** Anzeige, nicht frische Daten im Minutentakt.
 * Ein Abruf je Minute vervierzigfachte die Last auf den Kalender-Weg, ohne
 * dass sich der Reservierungsstand auch nur annaehernd so oft aendert.
 *
 * Deshalb: Die Rohdaten kommen einmal (und beim Zurueckkehren in den
 * Vordergrund erneut), der Bezugszeitpunkt `jetzt` laeuft weiter. Status,
 * Farbe, Saetze und Ringsegmente entstehen daraus abgeleitet — mit denselben
 * Kernfunktionen, die auch der Server benutzt.
 *
 * Dass der Datenstand dabei sichtbar altert („Stand vor 12 Minuten"), ist
 * beabsichtigt und genau der Sinn von FR-019.
 */
export interface Flottenantwort {
	stand: 'vorhanden' | 'fehlt';
	quelle: Quelle;
	abgerufenAm?: string;
	veraltet?: boolean;
	flotte: Maschine[];
	belegungen?: Reservierung[];
}

export class Flottenstand {
	/** Der Bezugszeitpunkt aller abgeleiteten Groessen — laeuft minuetlich weiter. */
	jetzt = $state(new Date());
	flotte = $state<Maschine[]>([]);
	/**
	 * `null` heisst **nicht** „nichts gebucht", sondern „keine Auskunft
	 * moeglich". Eine leere Liste waere von „alles frei" nicht zu
	 * unterscheiden — genau die Verwechslung, die SC-003 ausschliesst.
	 */
	belegungen = $state<Reservierung[] | null>(null);
	quelle = $state<Quelle | null>(null);
	abgerufenAm = $state<string | null>(null);
	veraltet = $state(false);
	laedt = $state(true);

	#uhr: ReturnType<typeof setTimeout> | null = null;
	#aufraeumen: (() => void)[] = [];

	/** Einmal holen, Uhr starten, auf Rueckkehr in den Vordergrund horchen. */
	async starten(): Promise<void> {
		await this.holen();
		this.#uhrStellen();

		const beiRueckkehr = () => {
			if (document.visibilityState === 'visible') {
				// Wer die Seite nach zwei Stunden wieder oeffnet, soll nicht
				// zwei Stunden alte Belegungen sehen, die minuetlich
				// weitergerechnet wurden — das saehe frisch aus und waere es
				// nicht.
				void this.holen();
				this.#uhrStellen();
			}
		};
		document.addEventListener('visibilitychange', beiRueckkehr);
		this.#aufraeumen.push(() => document.removeEventListener('visibilitychange', beiRueckkehr));
	}

	beenden(): void {
		if (this.#uhr !== null) clearTimeout(this.#uhr);
		this.#uhr = null;
		for (const fn of this.#aufraeumen) fn();
		this.#aufraeumen = [];
	}

	async holen(): Promise<void> {
		this.laedt = true;
		try {
			// `no-store`, weil die Antwort ohnehin so ausgeliefert wird und
			// ein zwischengespeicherter Flottenstand die ganze Uebung
			// entwertete.
			const antwort = await fetch('/api/flotte', { cache: 'no-store' });
			const inhalt = (await antwort.json()) as Flottenantwort;

			this.flotte = inhalt.flotte ?? [];
			this.belegungen = inhalt.stand === 'vorhanden' ? (inhalt.belegungen ?? []) : null;
			this.quelle = inhalt.quelle ?? null;
			this.abgerufenAm = inhalt.abgerufenAm ?? null;
			this.veraltet = inhalt.veraltet ?? false;
		} catch {
			// Ein Fehlschlag darf nicht in „frei" enden (FR-022). Die zuvor
			// geholten Belegungen bleiben stehen und altern sichtbar; gab es
			// noch keine, bleibt es bei `null`.
		} finally {
			this.laedt = false;
			this.jetzt = new Date();
		}
	}

	/**
	 * Die naechste volle Minute abwarten, dann jede Minute weiterzaehlen.
	 *
	 * Auf die Minutengrenze und nicht schlicht alle 60 Sekunden: Sonst
	 * springt die Anzeige „belegt bis 14:00" irgendwann zwischen 14:00 und
	 * 14:01 um — und zwar bei jedem Besucher zu einem anderen Zeitpunkt.
	 */
	#uhrStellen(): void {
		if (this.#uhr !== null) clearTimeout(this.#uhr);
		const rest = 60_000 - (Date.now() % 60_000);
		this.#uhr = setTimeout(() => {
			this.jetzt = new Date();
			this.#uhrStellen();
		}, rest);
	}
}
