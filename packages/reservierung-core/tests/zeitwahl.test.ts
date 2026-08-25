import { describe, expect, it } from 'vitest';
import {
	alsDauerwort,
	alsLueckensatz,
	alsUhrzeitAusMinute,
	alsWahlfenster,
	aufRaster,
	ausweichluecke,
	beginnSetzen,
	endeSetzen,
	fensterIn,
	kachelDauer,
	kachelMoeglich,
	kachelZiel,
	konflikte,
	luecken,
	MINDESTDAUER,
	modusFuer,
	NACHRUECKDAUER,
	RAHMEN,
	stundeVon,
	verschiebeBlock,
	VORSCHLAGSDAUER,
	zieheKante
} from '../src/zeitwahl.js';
import { reservierungsVerweis } from '../src/reservierungs-verweis.js';
import type { Reservierung, Zeitwahlfenster } from '../src/typen.js';

/**
 * Pruefungen der Zeitwahl (contracts/zeitwahl.md, Z-01 bis Z-10).
 *
 * Diese Datei traegt die Acceptance Scenarios der Spec, und sie war vor der
 * Umsetzung da. Der Grund steht im Handoff: Die Gesten- und Kachelregeln waren
 * im Prototyp die haeufigste Fehlerquelle — und es sind Regeln ueber Zahlen.
 * Wer sie am DOM prueft, prueft sie nicht.
 *
 * Die Uhrzeiten sind als Minuten geschrieben (`9 * 60`), weil das die Groesse
 * ist, in der der Waehler rechnet. `uhr('09:00')` daneben macht die Absicht
 * lesbar, ohne eine zweite Umrechnung einzufuehren.
 */

const TAG = '2026-08-13';
const KENNUNG = 'D-EELK';

/** `'09:00'` → 540. Nur fuer die Lesbarkeit der Erwartungen. */
function uhr(text: string): number {
	const [h, m] = text.split(':').map(Number);
	return h! * 60 + m!;
}

function res(
	von: string,
	bis: string,
	art: Reservierung['art'] = 'reservierung',
	tag = TAG
): Reservierung {
	return {
		kennung: KENNUNG,
		beginn: `${tag}T${von}:00+02:00`,
		ende: `${tag}T${bis}:00+02:00`,
		art
	};
}

function fenster(von: string, bis: string): Zeitwahlfenster {
	return { von: uhr(von), bis: uhr(bis) };
}

/** 13.08.2026, 11:20 — derselbe Bezugszeitpunkt wie im Prototyp des Handoffs. */
const JETZT = new Date('2026-08-13T11:20:00+02:00');

describe('aufRaster (Z-01)', () => {
	it('rundet auf das naechste Vielfache von 15', () => {
		expect(aufRaster(547)).toBe(540);
		expect(aufRaster(548)).toBe(555);
	});

	it('rundet die Mitte auf', () => {
		expect(aufRaster(547.5)).toBe(555);
	});

	it('beschneidet nicht — das ist Sache der aufrufenden Funktion', () => {
		expect(aufRaster(-7)).toBe(0);
		expect(aufRaster(1500)).toBe(1500);
	});
});

describe('luecken (Z-02)', () => {
	it('gibt an einem leeren Tag den ganzen Rahmen', () => {
		expect(luecken([], KENNUNG, TAG)).toEqual([{ von: RAHMEN.von, bis: RAHMEN.bis }]);
	});

	it('schneidet eine Belegung heraus und liefert beide Seiten', () => {
		const frei = luecken([res('14:00', '17:30')], KENNUNG, TAG);
		expect(frei).toEqual([
			{ von: uhr('06:00'), bis: uhr('14:00') },
			{ von: uhr('17:30'), bis: uhr('22:00') }
		]);
	});

	it('behandelt Sperre und Reservierung gleich — beides ist nicht frei', () => {
		const mitSperre = luecken([res('14:00', '17:30', 'sperre')], KENNUNG, TAG);
		const mitReservierung = luecken([res('14:00', '17:30')], KENNUNG, TAG);
		expect(mitSperre).toEqual(mitReservierung);
	});

	it('liefert an einem ganztaegig gesperrten Tag nichts — der Leerfall', () => {
		expect(luecken([res('00:00', '24:00', 'sperre')], KENNUNG, TAG)).toEqual([]);
	});

	it('verschmilzt ueberlappende Belegungen zu einer Sperrzone', () => {
		const frei = luecken([res('10:00', '13:00'), res('12:00', '15:00')], KENNUNG, TAG);
		expect(frei).toEqual([
			{ von: uhr('06:00'), bis: uhr('10:00') },
			{ von: uhr('15:00'), bis: uhr('22:00') }
		]);
	});

	it('laesst Luecken unter der Mindestdauer weg', () => {
		// Zwischen 10:00 und 10:10 passt keine Wahl.
		const frei = luecken([res('06:00', '10:00'), res('10:10', '22:00')], KENNUNG, TAG);
		expect(frei).toEqual([]);
	});

	it('zaehlt eine ueber Mitternacht hereinreichende Belegung anteilig', () => {
		const uebernacht: Reservierung = {
			kennung: KENNUNG,
			beginn: '2026-08-12T22:00:00+02:00',
			ende: '2026-08-13T09:00:00+02:00',
			art: 'reservierung'
		};
		expect(luecken([uebernacht], KENNUNG, TAG)).toEqual([
			{ von: uhr('09:00'), bis: uhr('22:00') }
		]);
	});

	it('rundet die Untergrenze mit abMinute aufwaerts — nie in die Vergangenheit', () => {
		const frei = luecken([], KENNUNG, TAG, uhr('11:20'));
		expect(frei).toEqual([{ von: uhr('11:30'), bis: uhr('22:00') }]);
	});

	it('liefert nichts, wenn abMinute hinter dem Rahmen liegt', () => {
		expect(luecken([], KENNUNG, TAG, uhr('23:00'))).toEqual([]);
	});
});

describe('fensterIn (Z-03)', () => {
	it('schlaegt zwei Stunden ab der getippten Zeit vor', () => {
		const l = { von: uhr('09:00'), bis: uhr('14:00') };
		expect(fensterIn(l, uhr('09:00'))).toEqual(fenster('09:00', '11:00'));
	});

	it('rastet die getippte Zeit auf 15 Minuten', () => {
		const l = { von: uhr('06:00'), bis: uhr('22:00') };
		expect(fensterIn(l, uhr('09:07'))).toEqual(fenster('09:00', '11:00'));
	});

	it('rueckt den Beginn nach vorn, statt die Dauer zu kuerzen', () => {
		const l = { von: uhr('09:00'), bis: uhr('14:00') };
		expect(fensterIn(l, uhr('13:30'))).toEqual(fenster('12:00', '14:00'));
	});

	it('kuerzt erst, wenn die Luecke selbst kuerzer als zwei Stunden ist', () => {
		const l = { von: uhr('09:00'), bis: uhr('10:00') };
		expect(fensterIn(l, uhr('09:30'))).toEqual(fenster('09:00', '10:00'));
	});
});

describe('zieheKante (Z-04, Szenario 1.2)', () => {
	it('verschiebt beim Ziehen der Endkante nur das Ende', () => {
		const gezogen = zieheKante(fenster('09:00', '11:00'), RAHMEN, 'ende', uhr('12:20'));
		expect(gezogen).toEqual(fenster('09:00', '12:15'));
	});

	it('verschiebt beim Ziehen der Startkante nur den Beginn', () => {
		const gezogen = zieheKante(fenster('09:00', '11:00'), RAHMEN, 'start', uhr('08:05'));
		expect(gezogen).toEqual(fenster('08:00', '11:00'));
	});

	it('laesst die Startkante nicht ueber das Ende hinaus', () => {
		const gezogen = zieheKante(fenster('09:00', '11:00'), RAHMEN, 'start', uhr('13:00'));
		expect(gezogen).toEqual(fenster('10:45', '11:00'));
		expect(gezogen.bis - gezogen.von).toBe(MINDESTDAUER);
	});

	it('laesst die Endkante nicht unter den Beginn', () => {
		const gezogen = zieheKante(fenster('09:00', '11:00'), RAHMEN, 'ende', uhr('07:00'));
		expect(gezogen).toEqual(fenster('09:00', '09:15'));
	});

	it('haelt beide Kanten im Rahmen', () => {
		expect(zieheKante(fenster('09:00', '11:00'), RAHMEN, 'start', uhr('04:00'))).toEqual(
			fenster('06:00', '11:00')
		);
		expect(zieheKante(fenster('09:00', '11:00'), RAHMEN, 'ende', uhr('23:30'))).toEqual(
			fenster('09:00', '22:00')
		);
	});
});

describe('verschiebeBlock (Z-04, Szenarien 1.3 und 1.4)', () => {
	it('behaelt die Dauer', () => {
		const gezogen = verschiebeBlock(fenster('09:00', '11:00'), RAHMEN, uhr('13:00'));
		expect(gezogen).toEqual(fenster('13:00', '15:00'));
	});

	it('stoppt am Tagesende, statt zu kuerzen oder umzubrechen', () => {
		const gezogen = verschiebeBlock(fenster('20:30', '22:00'), RAHMEN, uhr('23:00'));
		expect(gezogen).toEqual(fenster('20:30', '22:00'));
		expect(gezogen.bis).toBe(RAHMEN.bis);
	});

	it('stoppt am Tagesanfang', () => {
		const gezogen = verschiebeBlock(fenster('09:00', '11:00'), RAHMEN, uhr('04:00'));
		expect(gezogen).toEqual(fenster('06:00', '08:00'));
	});

	it('behaelt die Dauer auch am Anschlag', () => {
		const start = fenster('19:00', '21:30');
		const gezogen = verschiebeBlock(start, RAHMEN, uhr('23:00'));
		expect(gezogen.bis - gezogen.von).toBe(start.bis - start.von);
	});
});

describe('beginnSetzen (Z-05, Szenarien 2.1 und 2.2)', () => {
	it('laesst das Ende stehen und aendert die Dauer', () => {
		const neu = beginnSetzen(fenster('11:00', '14:45'), RAHMEN, uhr('09:00'));
		expect(neu).toEqual(fenster('09:00', '14:45'));
		expect(alsDauerwort(neu.bis - neu.von)).toBe('5:45 h');
	});

	it('zieht das Ende nach, wenn der Beginn es ueberholt', () => {
		const neu = beginnSetzen(fenster('08:00', '10:00'), RAHMEN, uhr('11:00'));
		expect(neu).toEqual(fenster('11:00', '11:30'));
		expect(alsDauerwort(neu.bis - neu.von)).toBe('30 min');
	});

	it('laesst die Mindestdauer selbst noch stehen — nachgerueckt wird erst darunter', () => {
		// 09:45 ist genau eine Viertelstunde vor dem Ende. Das ist knapp, aber
		// erlaubt; hier nachzuruecken hiesse, dem Mitglied eine Wahl zu nehmen,
		// die es getroffen hat.
		const neu = beginnSetzen(fenster('08:00', '10:00'), RAHMEN, uhr('09:45'));
		expect(neu).toEqual(fenster('09:45', '10:00'));
		expect(neu.bis - neu.von).toBe(MINDESTDAUER);
	});

	it('zieht nach, sobald das Ende erreicht ist', () => {
		const neu = beginnSetzen(fenster('08:00', '10:00'), RAHMEN, uhr('10:00'));
		expect(neu.bis - neu.von).toBe(NACHRUECKDAUER);
	});

	it('haelt den Beginn so weit vom Rahmenende weg, dass Nachruecken moeglich bleibt', () => {
		const neu = beginnSetzen(fenster('09:00', '11:00'), RAHMEN, uhr('23:00'));
		expect(neu.von).toBe(RAHMEN.bis - NACHRUECKDAUER);
		expect(neu.bis).toBe(RAHMEN.bis);
	});
});

describe('endeSetzen (Z-05)', () => {
	it('laesst den Beginn stehen', () => {
		expect(endeSetzen(fenster('09:00', '11:00'), RAHMEN, uhr('17:00'))).toEqual(
			fenster('09:00', '17:00')
		);
	});

	it('haelt die Mindestdauer ein', () => {
		expect(endeSetzen(fenster('09:00', '11:00'), RAHMEN, uhr('08:00'))).toEqual(
			fenster('09:00', '09:15')
		);
	});
});

describe('stundeVon (Z-05)', () => {
	it('nennt die volle Stunde einer Tagesminute', () => {
		expect(stundeVon(uhr('09:00'))).toBe(9);
		expect(stundeVon(uhr('09:59'))).toBe(9);
		expect(stundeVon(uhr('22:00'))).toBe(22);
	});

	/*
	  Die Oberflaeche fragt damit "ist das meine Stundenkachel?". Ein Aufrunden
	  markierte dort die naechste Stunde als gewaehlt -- und der Nachfuehrer
	  scrollte zu einer Kachel, die gar nicht gemeint ist.
	*/
	it('rundet ab, nicht zur naechsten Stunde', () => {
		expect(stundeVon(uhr('09:45'))).toBe(9);
	});
});

describe('kachelZiel (Z-05, Szenario 2.3)', () => {
	it('behaelt bei einer Stundenkachel die Minute', () => {
		expect(kachelZiel(fenster('09:20', '11:00'), 'beginn', 'stunde', 14)).toBe(uhr('14:20'));
	});

	it('behaelt bei einer Minutenkachel die Stunde', () => {
		expect(kachelZiel(fenster('09:20', '11:00'), 'beginn', 'minute', 45)).toBe(uhr('09:45'));
	});

	it('rechnet fuer das Ende gegen dessen eigene Zeit', () => {
		expect(kachelZiel(fenster('09:00', '11:20'), 'ende', 'stunde', 17)).toBe(uhr('17:20'));
		expect(kachelZiel(fenster('09:00', '11:20'), 'ende', 'minute', 0)).toBe(uhr('11:00'));
	});
});

describe('kachelMoeglich und kachelDauer (Z-05, FR-034)', () => {
	it('laesst einen Beginn bis Rahmenende minus Nachrueckdauer zu', () => {
		const f = fenster('09:00', '11:00');
		expect(kachelMoeglich(f, RAHMEN, 'beginn', uhr('21:30'))).toBe(true);
		expect(kachelMoeglich(f, RAHMEN, 'beginn', uhr('21:45'))).toBe(false);
		expect(kachelMoeglich(f, RAHMEN, 'beginn', uhr('05:45'))).toBe(false);
	});

	it('laesst ein Ende ab Beginn plus Mindestdauer zu', () => {
		const f = fenster('09:00', '11:00');
		expect(kachelMoeglich(f, RAHMEN, 'ende', uhr('09:15'))).toBe(true);
		expect(kachelMoeglich(f, RAHMEN, 'ende', uhr('09:00'))).toBe(false);
		expect(kachelMoeglich(f, RAHMEN, 'ende', uhr('22:15'))).toBe(false);
	});

	it('zeigt als Vorschau genau das Ergebnis der Setzregeln', () => {
		const f = fenster('11:00', '14:45');
		expect(kachelDauer(f, RAHMEN, 'beginn', uhr('09:00'))).toBe(uhr('14:45') - uhr('09:00'));
	});

	it('zeigt bei Ueberholung die nachgerueckte Dauer, nicht eine negative', () => {
		const f = fenster('08:00', '10:00');
		expect(kachelDauer(f, RAHMEN, 'beginn', uhr('11:00'))).toBe(NACHRUECKDAUER);
	});

	it('zeigt fuer keine Kachel eine Dauer unter der Mindestdauer', () => {
		const f = fenster('09:00', '11:00');
		for (let stunde = 6; stunde <= 22; stunde++) {
			for (const art of ['beginn', 'ende'] as const) {
				const ziel = kachelZiel(f, art, 'stunde', stunde);
				if (!kachelMoeglich(f, RAHMEN, art, ziel)) continue;
				expect(kachelDauer(f, RAHMEN, art, ziel)).toBeGreaterThanOrEqual(MINDESTDAUER);
			}
		}
	});
});

describe('konflikte (Z-06, Szenario 4.1)', () => {
	it('nennt Spanne und Art mit Doppelpunkt', () => {
		const gefunden = konflikte([res('14:00', '17:30')], KENNUNG, TAG, fenster('13:00', '15:00'));
		expect(gefunden).toEqual([{ art: 'reservierung', text: '14:00–17:30: reserviert' }]);
	});

	it('nennt eine Sperre als gesperrt', () => {
		const gefunden = konflikte(
			[res('14:00', '17:30', 'sperre')],
			KENNUNG,
			TAG,
			fenster('13:00', '15:00')
		);
		expect(gefunden[0]?.text).toBe('14:00–17:30: gesperrt');
	});

	it('zaehlt Beruehrung nicht als Ueberschneidung', () => {
		expect(konflikte([res('09:00', '11:00')], KENNUNG, TAG, fenster('11:00', '13:00'))).toEqual(
			[]
		);
		expect(konflikte([res('13:00', '15:00')], KENNUNG, TAG, fenster('11:00', '13:00'))).toEqual(
			[]
		);
	});

	it('kuerzt einen ueber den Tag hinausreichenden Eintrag auf 00:00 bzw. 24:00', () => {
		const uebernacht: Reservierung = {
			kennung: KENNUNG,
			beginn: '2026-08-12T22:00:00+02:00',
			ende: '2026-08-13T09:00:00+02:00',
			art: 'reservierung'
		};
		expect(konflikte([uebernacht], KENNUNG, TAG, fenster('07:00', '10:00'))[0]?.text).toBe(
			'00:00–09:00: reserviert'
		);
	});

	it('nennt einen Ganztagseintrag ganztaegig', () => {
		const gefunden = konflikte(
			[res('00:00', '24:00', 'sperre')],
			KENNUNG,
			TAG,
			fenster('09:00', '11:00')
		);
		expect(gefunden).toEqual([{ art: 'sperre', text: 'ganztägig gesperrt' }]);
	});

	it('nennt keinen Namen und keine eigene Buchung', () => {
		const gefunden = konflikte([res('14:00', '17:30')], KENNUNG, TAG, fenster('13:00', '15:00'));
		expect(gefunden[0]?.text).not.toMatch(/dein|mein|Pilot/i);
	});

	it('gibt mehrere Konflikte nach Beginn sortiert', () => {
		const gefunden = konflikte(
			[res('16:00', '18:00'), res('09:00', '11:00')],
			KENNUNG,
			TAG,
			fenster('08:00', '19:00')
		);
		expect(gefunden.map((k) => k.text)).toEqual([
			'09:00–11:00: reserviert',
			'16:00–18:00: reserviert'
		]);
	});
});

describe('modusFuer (Z-07, Szenarien 4.3 und 4.4)', () => {
	it('nennt ein konfliktfreies Fenster frei', () => {
		expect(modusFuer(fenster('13:00', '15:00'), TAG, [], JETZT)).toBe('frei');
	});

	it('nennt ein Fenster mit Reservierung Warteliste', () => {
		const k = konflikte([res('14:00', '17:30')], KENNUNG, TAG, fenster('13:00', '15:00'));
		expect(modusFuer(fenster('13:00', '15:00'), TAG, k, JETZT)).toBe('warteliste');
	});

	it('laesst die Sperre die Reservierung schlagen', () => {
		const k = konflikte(
			[res('14:00', '17:30'), res('14:30', '16:00', 'sperre')],
			KENNUNG,
			TAG,
			fenster('13:00', '15:00')
		);
		expect(modusFuer(fenster('13:00', '15:00'), TAG, k, JETZT)).toBe('gesperrt');
	});

	it('laesst den Nachtrag die Sperre schlagen — was vorbei ist, ist keine Frage mehr', () => {
		const f = fenster('09:00', '10:30');
		const k = konflikte([res('09:00', '10:00', 'sperre')], KENNUNG, TAG, f);
		expect(modusFuer(f, TAG, k, JETZT)).toBe('nachtrag');
	});

	it('nennt ein Fenster an einem kuenftigen Tag nie Nachtrag', () => {
		expect(modusFuer(fenster('09:00', '11:00'), '2026-08-14', [], JETZT)).toBe('frei');
	});

	it('zaehlt ein Fenster, das genau jetzt beginnt, nicht als Nachtrag', () => {
		// jetzt = 11:20; ein Fenster ab 11:30 liegt davor nicht.
		expect(modusFuer(fenster('11:30', '13:30'), TAG, [], JETZT)).toBe('frei');
	});
});

describe('ausweichluecke (Z-08, Szenario 4.2)', () => {
	const freie = [
		{ von: uhr('06:00'), bis: uhr('14:00') },
		{ von: uhr('17:30'), bis: uhr('22:00') }
	];

	it('nimmt die erste Luecke ab dem gewaehlten Ende', () => {
		expect(ausweichluecke(freie, fenster('13:00', '15:00'))).toEqual(freie[1]);
	});

	it('nimmt eine ueberlappende, wenn danach nichts mehr kommt', () => {
		expect(ausweichluecke(freie, fenster('13:00', '23:00'))).toEqual(freie[0]);
	});

	it('faellt auf die erste Luecke des Tages zurueck', () => {
		const nurFrueh = [{ von: uhr('06:00'), bis: uhr('08:00') }];
		expect(ausweichluecke(nurFrueh, fenster('20:00', '22:00'))).toEqual(nurFrueh[0]);
	});

	it('gibt null, wenn der Tag keine Luecke hat', () => {
		expect(ausweichluecke([], fenster('09:00', '11:00'))).toBeNull();
	});
});

describe('Formulierungen (Z-09)', () => {
	it('schreibt Tagesminuten als Uhrzeit', () => {
		expect(alsUhrzeitAusMinute(540)).toBe('09:00');
		expect(alsUhrzeitAusMinute(0)).toBe('00:00');
	});

	it('schreibt Mitternacht am Tagesende als 24:00', () => {
		expect(alsUhrzeitAusMinute(1440)).toBe('24:00');
	});

	it('nennt Dauern unter einer Stunde in Minuten', () => {
		expect(alsDauerwort(45)).toBe('45 min');
		expect(alsDauerwort(15)).toBe('15 min');
	});

	it('nennt volle Stunden ohne Minuten', () => {
		expect(alsDauerwort(120)).toBe('2 h');
	});

	it('nennt angebrochene Stunden in Uhrzeitform', () => {
		expect(alsDauerwort(135)).toBe('2:15 h');
		expect(alsDauerwort(345)).toBe('5:45 h');
	});

	it('nennt die getroffene Luecke, wenn nichts im Weg ist', () => {
		const freie = [{ von: uhr('09:00'), bis: uhr('14:00') }];
		expect(alsLueckensatz(fenster('09:00', '11:00'), freie, [])).toBe('👍 Frei 09:00–14:00');
	});

	it('bleibt bei „Frei", wenn das Fenster in keiner Luecke liegt', () => {
		expect(alsLueckensatz(fenster('09:00', '11:00'), [], [])).toBe('👍 Frei');
	});

	it('nennt Konflikte und verkettet mehrere mit Mittelpunkt', () => {
		const k = konflikte(
			[res('09:00', '11:00'), res('16:00', '18:00')],
			KENNUNG,
			TAG,
			fenster('08:00', '19:00')
		);
		expect(alsLueckensatz(fenster('08:00', '19:00'), [], k)).toBe(
			'🙅 Überschneidet 09:00–11:00: reserviert · 16:00–18:00: reserviert'
		);
	});
});

describe('alsWahlfenster und der Absprung (Z-10, Szenario 1.6)', () => {
	it('baut die Adresse mit Datum und beiden Uhrzeiten des gewaehlten Fensters', () => {
		const ziel = reservierungsVerweis(KENNUNG, alsWahlfenster(TAG, fenster('11:30', '13:30')));
		expect(ziel).toContain('frm_apid=75132');
		expect(ziel).toContain('frm_datefrom=13.08.2026');
		expect(ziel).toContain('frm_dateto=13.08.2026');
		expect(ziel).toContain('frm_datefromtime=11:30');
		expect(ziel).toContain('frm_datetotime=13:30');
	});

	it('bleibt innerhalb eines Tages — Beginn und Ende tragen dasselbe Datum', () => {
		const f = alsWahlfenster(TAG, fenster('06:00', '22:00'));
		expect(f.von.slice(0, 10)).toBe(TAG);
		expect(f.bis.slice(0, 10)).toBe(TAG);
	});

	it('traegt den Winterversatz an einem Wintertag', () => {
		const f = alsWahlfenster('2026-12-13', fenster('09:00', '11:00'));
		expect(f.von).toBe('2026-12-13T09:00:00+01:00');
	});
});

describe('Zusicherungen ueber alle Wege (SC-002)', () => {
	/**
	 * Der Wert dieser Pruefung liegt nicht im einzelnen Fall, sondern in der
	 * Behauptung ueber *alle*: Es gibt keine Kombination aus Geste und
	 * Kachelwahl, die ein ungerastertes oder zu kurzes Fenster erzeugt.
	 */
	it('haelt jede Wahl auf dem Raster und im Rahmen', () => {
		let f = fenster('09:00', '11:00');

		for (let minute = -60; minute <= 1500; minute += 7) {
			for (const kante of ['start', 'ende'] as const) {
				f = zieheKante(f, RAHMEN, kante, minute);
				pruefe(f);
			}
			f = verschiebeBlock(f, RAHMEN, minute);
			pruefe(f);
			f = beginnSetzen(f, RAHMEN, minute);
			pruefe(f);
			f = endeSetzen(f, RAHMEN, minute + 90);
			pruefe(f);
		}
	});

	function pruefe(f: Zeitwahlfenster): void {
		expect(f.von % 15).toBe(0);
		expect(f.bis % 15).toBe(0);
		expect(f.bis - f.von).toBeGreaterThanOrEqual(MINDESTDAUER);
		expect(f.von).toBeGreaterThanOrEqual(RAHMEN.von);
		expect(f.bis).toBeLessThanOrEqual(RAHMEN.bis);
	}

	it('schlaegt nie mehr als die Vorschlagsdauer vor', () => {
		for (const l of luecken([res('14:00', '17:30')], KENNUNG, TAG)) {
			for (let m = l.von; m <= l.bis; m += 15) {
				const f = fensterIn(l, m);
				expect(f.bis - f.von).toBeLessThanOrEqual(VORSCHLAGSDAUER);
				expect(f.von).toBeGreaterThanOrEqual(l.von);
				expect(f.bis).toBeLessThanOrEqual(l.bis);
			}
		}
	});
});
