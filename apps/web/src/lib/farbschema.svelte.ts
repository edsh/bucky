/**
 * Hell oder Dunkel — eine Entscheidung, die die ganze App betrifft.
 *
 * Der Flugzeugpark und die Detailansicht tragen beide einen Umschalter, und
 * er muss dasselbe schalten: Wer im Park auf Dunkel stellt und eine Maschine
 * öffnet, darf nicht wieder in einer weissen Seite landen. Zwei Kopien
 * derselben `localStorage`-Logik liefen genau darauf hinaus.
 *
 * Bewusst kein `$state` in einem Modul-Objekt mit Getter/Setter-Zauberei,
 * sondern eine schlichte Klasse mit einer einzigen Instanz — das ist die
 * Form, in der Svelte 5 einen geteilten Zustand vorsieht, und sie ist
 * lesbar geblieben.
 */
class Farbschema {
	/** `null`, solange nicht feststeht, was der Browser will (vor `laden`). */
	dunkel = $state(false);

	/**
	 * Aus dem Speicher lesen, sonst der Systemeinstellung folgen.
	 *
	 * Nur im Browser aufzurufen. Die App wird vollständig vorgebaut; ein
	 * Zugriff auf `localStorage` beim Bauen bräche den Lauf.
	 */
	laden(): void {
		const gespeichert = localStorage.getItem('bucky.farbschema');
		this.dunkel =
			gespeichert === 'dunkel' ||
			(gespeichert === null && window.matchMedia('(prefers-color-scheme: dark)').matches);
	}

	umschalten(): void {
		this.dunkel = !this.dunkel;
		localStorage.setItem('bucky.farbschema', this.dunkel ? 'dunkel' : 'hell');
	}
}

export const farbschema = new Farbschema();
