import { base } from '$app/paths';

/**
 * Was man mit einer Maschine tun kann.
 *
 * Der Flugzeugpark ist der Einstieg, nicht die Reservierungsübersicht: Wer
 * die App öffnet, hat ein Flugzeug im Sinn und entscheidet erst danach, was
 * er damit tun will. Dass die Belegung dabei schon am Ring ablesbar ist, ist
 * die angenehme Nebenwirkung — nicht der Zweck der Seite.
 *
 * Heute kann nur die D-EELK mehr als Reservierung; sie ist das
 * einzige Flugzeug mit digitalisiertem POH (Feature 001). Deshalb steht die
 * Liste hier und nicht als feste Verzweigung im Markup: Kommt für eine
 * weitere Maschine eine Fähigkeit hinzu, wird hier ein Eintrag ergänzt und
 * sonst nichts.
 *
 * Diese Liste nennt nur die **Wege**. Das Menü zeigt darunter noch den
 * Schalter „Lieblingsmaschine", der nirgendwohin führt — deshalb hat jede
 * Maschine ein Menü, auch eine mit nur einem Weg.
 */
export interface Handlung {
	name: string;
	ziel: string;
}

export function handlungenFuer(kennung: string): Handlung[] {
	const handlungen: Handlung[] = [
		{ name: 'Reservierung', ziel: `${base}/reservierung/${kennung.toLowerCase()}/` }
	];

	if (kennung === 'D-EELK') {
		handlungen.push({ name: 'POH-Rechner', ziel: `${base}/d-eelk/poh-rechner` });
	}

	return handlungen;
}
