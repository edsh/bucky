import { describe, expect, it } from 'vitest';
import { RESERVIERUNGSMASKE, reservierungsVerweis } from '../src/reservierungs-verweis.js';

/**
 * Die Parameter dieses Verweises sind beobachtet, nicht zugesichert (E-13).
 * Diese Pruefungen halten deshalb genau eines fest: dass **wir** die
 * beobachtete Form erzeugen. Ob Vereinsflieger sie morgen noch auswertet,
 * kann kein Test hier beantworten — dafuer gibt es den Vorschlag als Text
 * daneben.
 */
describe('reservierungsVerweis', () => {
	const fenster = { von: '2026-08-25T09:00:00+02:00', bis: '2026-08-25T11:00:00+02:00' };

	it('erzeugt die beobachtete Form aus E-13', () => {
		expect(reservierungsVerweis('D-EELK', fenster)).toBe(
			'https://vereinsflieger.de/member/community/reservations/add?type=0&inline=0' +
				'&frm_apid=75132' +
				'&frm_datefrom=25.08.2026&frm_dateto=25.08.2026' +
				'&frm_datefromtime=09:00&frm_datetotime=11:00'
		);
	});

	it('laesst Punkte und Doppelpunkt literal stehen', () => {
		// Kodiert (%2E, %3A) waere formal auch richtig — beobachtet wurde es
		// aber unkodiert, und die Beobachtung ist hier die einzige Quelle.
		const verweis = reservierungsVerweis('D-EELK', fenster);
		expect(verweis).not.toContain('%');
	});

	it('nennt die Ortszeit, nicht die Weltzeit', () => {
		// 09:00 Ortszeit ist im August 07:00 UTC. Ginge die Weltzeit
		// hinueber, staende in der Maske ein zwei Stunden zu frueher Start —
		// ein Fehler, der sich nicht meldet, sondern nur falsch ist.
		const verweis = reservierungsVerweis('D-EELK', {
			von: '2026-08-25T07:00:00Z',
			bis: '2026-08-25T09:00:00Z'
		});
		expect(verweis).toContain('frm_datefromtime=09:00');
		expect(verweis).toContain('frm_datetotime=11:00');
	});

	it('kennt die Nummer jeder Maschine der Stammliste', () => {
		const nummern = ['D-EELK', 'D-EXYZ', 'D-MRXS', 'D-3004', 'D-4413', 'D-9021'].map(
			(kennung) => reservierungsVerweis(kennung, null).match(/frm_apid=(\d+)/)?.[1]
		);
		expect(nummern).toEqual(['75132', '43352', '62034', '41149', '28390', '4538']);
	});

	it('nimmt eine Kennung in beliebiger Schreibweise', () => {
		expect(reservierungsVerweis(' d-eelk ', null)).toContain('frm_apid=75132');
	});

	it('laesst bei unbekannter Maschine nur die Nummer weg, nie den Verweis', () => {
		const verweis = reservierungsVerweis('D-ABCD', fenster);
		expect(verweis).not.toContain('frm_apid');
		expect(verweis).toContain('frm_datefromtime=09:00');
		expect(verweis.startsWith(RESERVIERUNGSMASKE)).toBe(true);
	});

	it('erfindet ohne Vorschlag kein Zeitfenster', () => {
		// Z-08: Gibt es keine freie Luecke, geht auch keine hinueber. Eine
		// vorbelegte Maske mit geratenen Zeiten waere schlimmer als eine
		// leere.
		const verweis = reservierungsVerweis('D-EELK', null);
		expect(verweis).toBe(`${RESERVIERUNGSMASKE}&frm_apid=75132`);
	});

	it('faellt ohne alles auf die nackte Maske zurueck', () => {
		expect(reservierungsVerweis('D-ABCD', null)).toBe(RESERVIERUNGSMASKE);
	});

	it('traegt ueber Mitternacht hinweg beide Datumsangaben', () => {
		// Der Vorschlag kappt am naechsten Eintrag und bleibt darum in aller
		// Regel innerhalb eines Tages. Ausschliessen laesst sich das andere
		// hier nicht — dann muessen wenigstens beide Tage stimmen.
		const verweis = reservierungsVerweis('D-EELK', {
			von: '2026-08-25T23:00:00+02:00',
			bis: '2026-08-26T01:00:00+02:00'
		});
		expect(verweis).toContain('frm_datefrom=25.08.2026');
		expect(verweis).toContain('frm_dateto=26.08.2026');
	});
});
