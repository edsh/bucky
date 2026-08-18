import { base } from '$app/paths';

/**
 * Was man mit einer Maschine tun kann.
 *
 * Der Flugzeugpark ist der Einstieg, nicht die Reservierungsübersicht: Wer
 * die App öffnet, hat ein Flugzeug im Sinn und entscheidet erst danach, was
 * er damit tun will. Dass die Belegung dabei schon am Ring ablesbar ist, ist
 * die angenehme Nebenwirkung — nicht der Zweck der Seite.
 *
 * Heute kann nur die D-EELK mehr als Reservierungsdetails; sie ist das
 * einzige Flugzeug mit digitalisiertem POH (Feature 001). Deshalb steht die
 * Liste hier und nicht als feste Verzweigung im Markup: Kommt für eine
 * weitere Maschine eine Fähigkeit hinzu, wird hier ein Eintrag ergänzt und
 * sonst nichts. Ein Flugzeug mit genau einer Handlung öffnet kein Menü,
 * sondern springt direkt — ein Menü mit einem Eintrag ist ein Klick, der
 * nichts entscheidet.
 */
export interface Handlung {
	name: string;
	ziel: string;
}

export function handlungenFuer(kennung: string): Handlung[] {
	const handlungen: Handlung[] = [
		{ name: 'Reservierungsdetails', ziel: `${base}/reservierung/${kennung.toLowerCase()}/` }
	];

	if (kennung === 'D-EELK') {
		handlungen.push({ name: 'POH-Rechner', ziel: `${base}/d-eelk/poh-rechner` });
	}

	return handlungen;
}
