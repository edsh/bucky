/**
 * Klickpfad durch die Weboberflaeche. Bewusst kein Teil von `npx vitest run`:
 * er braucht einen gebauten Bundle, einen laufenden Webserver und einen echten
 * Browser. So wird er ausgefuehrt:
 *
 *   npm run build
 *   npx wrangler dev --config apps/web/wrangler.jsonc --port 8787
 *   PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --no-save playwright
 *   BASE=http://localhost:8787 node tests/ui/klickpfad.mjs
 *
 * Playwright steht bewusst nicht in den Manifesten des Projekts, damit es die
 * Installation nicht belastet; `--no-save` laesst package.json und die
 * Lockdatei unberuehrt.
 *
 * Der Browser kommt oertlich ueber `channel: 'msedge'` aus dem System, statt
 * geladen zu werden — deshalb der uebersprungene Browser-Download. Auf dem
 * Bauknecht gibt es kein Edge; dort setzt die Ablaufsteuerung
 * KLICKPFAD_BROWSER=chromium und nimmt das mitgelieferte Chromium. Ohne
 * gesetzte Variable bleibt der oertliche Weg unveraendert.
 */
import { setTimeout as warte } from 'node:timers/promises';
import { chromium } from 'playwright';

// Standardmaessig gegen den lokal ausgelieferten Bundle; mit BASE laesst sich
// stattdessen die veroeffentlichte Seite pruefen, etwa
// BASE=https://edsh.github.io/bucky node tests/ui/klickpfad.mjs
const BASE = process.env.BASE ?? 'http://localhost:8899';
/**
 * Seit Feature 043 ist die Startseite die Auswahl; der Rechner liegt unter dem
 * Flugzeug. Fast alle Pruefungen gelten dem Rechner und rufen ihn unmittelbar
 * auf — nur die wenigen zur Auswahl selbst gehen auf BASE.
 */
const RECHNER = `${BASE}/d-eelk/poh-rechner/`;
const NBSP = '\u00A0';
const befunde = [];

function pruefe(nummer, beschreibung, bestanden, detail = '') {
  befunde.push({ nummer, beschreibung, bestanden, detail });
  console.log(`${bestanden ? 'OK  ' : 'FEHL'} ${nummer}: ${beschreibung}${detail ? ' — ' + detail : ''}`);
}

/**
 * Setzt einen Schieberegler. `fill()` weigert sich bei `type="range"`, und ein
 * Ziehen mit der Maus trifft den Wert nicht zuverlaessig. Deshalb wird der Wert
 * ueber den nativen Setter gesetzt und ein `input`-Ereignis ausgeloest -- so
 * bekommt Svelte dieselbe Meldung wie bei einer echten Bedienung.
 */
async function regler(page, beschriftung, wert) {
  await page.getByLabel(beschriftung).evaluate((element, neu) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(element, String(neu));
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }, wert);
}

/**
 * Stellt die gewuenschte ISA-Abweichung ueber den Temperaturregler ein.
 *
 * Seit Feature 031 gibt es keinen ISA-Regler mehr; eingestellt wird die
 * Aussentemperatur, die Abweichung folgt daraus. Die aelteren Pruefungen sind
 * aber in ISA-Abweichungen formuliert, weil das Handbuch es ist -- sie
 * umzuschreiben haette ihre Aussage veraendert.
 *
 * Statt die Normtemperaturformel hier nachzubauen (das waere eine zweite
 * Wahrheit neben dem Kern, genau das, was Prinzip IV ausschliesst), wird die
 * Seite selbst als Umrechner benutzt: Ein beliebiger Temperaturwert wird
 * gesetzt, die daraus angezeigte Abweichung abgelesen und der Regler um die
 * Differenz verschoben. Das geht, weil die Beziehung zwischen beiden Groessen
 * die Steigung 1 hat.
 *
 * Der Regler nimmt nur ganze Grad, die Normtemperatur ist es fast nie -- die
 * eingestellte Abweichung trifft den Wunschwert daher auf etwa ein halbes Grad
 * genau. Fuer die angezeigten, gerundeten Ergebnisse macht das keinen
 * Unterschied (nachgewiesen in T002 der Feature-031-Aufgaben).
 */
async function setzeIsa(page, gewuenschteAbweichung) {
  const probe = 20;
  await regler(page, 'Außentemperatur (°C)', probe);
  const angezeigt = (await page.getByTestId('isa-ableitung').innerText()).trim();
  const treffer = angezeigt.match(/(-?\d+(?:,\d+)?)/);
  if (!treffer) {
    throw new Error(`ISA-Ableitung nicht lesbar: ${angezeigt}`);
  }
  const istAbweichung = Number(treffer[1].replace(',', '.'));
  const ziel = Math.round(probe + (gewuenschteAbweichung - istAbweichung));
  await regler(page, 'Außentemperatur (°C)', ziel);
}

async function fuellen(page, werte) {
  await regler(page, 'Platzhöhe ASL (ft)', werte.dep);
  await regler(page, 'Reiseflughöhe ASL (ft)', werte.cruise);
  await regler(page, 'Luftdruck QNH (hPa)', werte.qnh ?? 1013);
  await regler(page, 'Streckenlänge (NM)', werte.dist);
  await regler(page, 'Lasteinstellung', werte.power);
  await setzeIsa(page, werte.isa);
  // Seit Feature 026 sind es zwei Windgroessen. `wind` setzt beide auf
  // denselben Wert, damit die aelteren Pruefungen ihre Aussage behalten; wer
  // sie unterscheiden will, uebergibt `pistenwind` und `streckenwind` einzeln.
  await regler(page, 'Pistenwind (kt, positiv = Gegenwind)', werte.pistenwind ?? werte.wind);
  await regler(
    page,
    'Streckenwindkomponente (kt, positiv = Gegenwind)',
    werte.streckenwind ?? werte.wind
  );
  // Gerechnet wird bei jeder Bewegung; ein Lidschlag reicht fuer den Durchlauf.
  await page.waitForTimeout(150);
}

/**
 * Ohne Angabe der vertraute Weg ueber Edge aus dem System; mit
 * KLICKPFAD_BROWSER=chromium das von Playwright mitgelieferte Chromium, das
 * auf dem Bauknecht die einzige Wahl ist.
 */
const kanal = process.env.KLICKPFAD_BROWSER ?? 'msedge';
const browser = await chromium.launch(kanal === 'chromium' ? {} : { channel: kanal });
const page = await browser.newPage();
const konsolenfehler = [];
/**
 * Wird gesetzt, solange der Wetterdienst absichtlich blockiert wird. Ein
 * fehlgeschlagener `fetch` schreibt unvermeidlich in die Browserkonsole; das
 * ist dann kein Mangel, sondern der geprueffte Fall selbst. Ohne diese Flagge
 * muesste Pruefung 10 entweder Netzfehler generell durchwinken -- und damit
 * ihren Zweck verlieren -- oder hier fehlschlagen.
 */
let netzfehlerErwartet = false;
page.on('console', (msg) => {
  if (msg.type() === 'error' && !netzfehlerErwartet) konsolenfehler.push(msg.text());
});
page.on('pageerror', (error) => konsolenfehler.push(String(error)));

await page.goto(RECHNER, { waitUntil: 'networkidle' });

// 1: gültiges Flugvorhaben liefert zügig ein Ergebnis (SC-001)
const start = Date.now();
await fuellen(page, { dep: 1000, cruise: 6000, dist: 400, power: 70, isa: 20, wind: 10 });
await page.getByRole('heading', { name: 'Kraftstoffbedarf und Geschwindigkeiten' }).waitFor({ timeout: 5000 });
const dauerMs = Date.now() - start;
pruefe(1, 'gültiges Flugvorhaben liefert ein Ergebnis', dauerMs < 2000, `${dauerMs} ms`);

// 2: Seitenzahl, Tabellenname und Prüfhinweis sichtbar, ohne Aufklappen (SC-002)
const quellen = page.locator('#bedarf .quellen');
const quellentext = await quellen.innerText();
const hinweisSichtbar = await page.locator('#bedarf .pruefhinweis').isVisible();
pruefe(
  2,
  'Quellen und Prüfhinweis ohne Aufklappen sichtbar',
  hinweisSichtbar &&
    quellentext.includes('Abb. 5-3a') &&
    quellentext.includes('Abb. 5-4a') &&
    /Seite 5b-/.test(quellentext) &&
    quellentext.includes('Original-Flughandbuch'),
  quellentext.split('\n')[1] ?? ''
);

// 4: Hinweis, dass die Summe keine Reserve enthält
const seitentext = await page.locator('main').innerText();
pruefe(4, 'Hinweis, dass die Summe keine Reserve enthält', /keine Reserve/i.test(seitentext));

// 3: Lasteinstellung über 75 % erzeugt den Hinweis aus Anmerkung 4, blockiert nicht
await regler(page, 'Lasteinstellung', 80);
await page.waitForTimeout(150);
await page.getByRole('heading', { name: 'Kraftstoffbedarf und Geschwindigkeiten' }).waitFor({ timeout: 5000 });
const hinweise = await page.locator('#bedarf .hinweise').innerText();
pruefe(
  3,
  'über 75 % Last erzeugt den Hinweis, blockiert die Rechnung aber nicht',
  /75/.test(hinweise) && (await page.locator('#bedarf .aufschluesselung').isVisible()),
  hinweise.split('\n')[0] ?? ''
);

// 5: Bedarf über der ausfliegbaren Menge ist deutlich sichtbar (FR-016)
await fuellen(page, { dep: 1000, cruise: 6000, dist: 750, power: 100, isa: 20, wind: 40 });
await page.waitForTimeout(300);
const warnung = page.locator('.vergleich.warnung');
const warnungSichtbar = await warnung.isVisible().catch(() => false);
const fehlermeldung = await page.locator('#bedarf .fehler').innerText().catch(() => '');
pruefe(
  5,
  'Bedarf über der ausfliegbaren Menge ist deutlich sichtbar',
  warnungSichtbar,
  warnungSichtbar ? (await warnung.innerText()).split('\n')[0] : `stattdessen: ${fehlermeldung}`
);

// Rechenweg aufklappbar (US2)
await fuellen(page, { dep: 1000, cruise: 6000, dist: 400, power: 70, isa: 20, wind: 10 });
await page.getByRole('heading', { name: 'Kraftstoffbedarf und Geschwindigkeiten' }).waitFor({ timeout: 5000 });
const details = page.locator('#bedarf details').first();
await details.click();
await page.waitForTimeout(200);
const schritte = await page.locator('#bedarf details li, #bedarf details .schritt').count();
pruefe(6, 'Rechenweg lässt sich aufklappen und zeigt Schritte', schritte >= 13, `${schritte} Elemente`);

// Fehlerfall: Reiseflughöhe unter Platzhöhe
await fuellen(page, { dep: 6000, cruise: 2000, dist: 400, power: 70, isa: 0, wind: 0 });
await page.waitForTimeout(300);
const meldung = await page.locator('#bedarf .fehler').innerText().catch(() => '');
pruefe(
  7,
  'Reiseflughöhe unter Platzhöhe zeigt die Meldung des Kerns',
  meldung.includes('Reiseflughöhe muss über der Platzhöhe liegen'),
  meldung
);

// Verweis auf die Tabellenseite
// Erst wenn die Seite fertig geladen ist, uebernimmt SvelteKit die Navigation;
// ein zu frueher Klick loest ein volles Neuladen aus, das der schlichte
// Testserver nicht bedienen kann.
await page.waitForLoadState('networkidle');
await page.getByRole('link', { name: 'die verwendeten Tabellen im Einzelnen' }).click();
await page.getByRole('heading', { name: 'Digitalisierte Tabellen der D-EELK' }).waitFor({ timeout: 5000 });
const tabellenText = await page.locator('main').innerText();
pruefe(
  8,
  'Tabellenseite ist erreichbar und zeigt den Vy-Widerspruch',
  /Widerspruch im Original/.test(tabellenText) && /69/.test(tabellenText) && /70/.test(tabellenText)
);

await page.getByRole('link', { name: 'Zurück zum POH-Rechner' }).click();
await page.getByRole('heading', { name: 'POH-Rechner D-EELK' }).waitFor({ timeout: 5000 });
pruefe(9, 'Rückweg zum Rechner funktioniert', true);

// 13: stufenlose Eingaben sind Schieberegler mit Wertanzeige (FR-001, FR-013)
// Platzhoehe und QNH werden vorher gesetzt, weil der Temperaturregler seit
// Feature 031 einen mitwandernden Bereich hat: Ohne festen Ausgangszustand
// waere sein Aushang unten nicht vorhersagbar.
await regler(page, 'Platzhöhe ASL (ft)', 970);
await regler(page, 'Luftdruck QNH (hPa)', 1013);
const reglerZahl = await page.locator('input[type="range"]').count();
const zahlenfelder = await page.locator('input[type="number"], input[type="text"]').count();
const ausgaben = await page.locator('output').count();
// Die Grenzen stammen aus dem Rechenkern; hier stehen sie als erwarteter
// Aushang, damit ein stilles Abweichen der Oberflaeche auffaellt. Die beiden
// Windregler haben bewusst *verschiedene* Bereiche: Der Pistenwind endet dort,
// wo die Startstreckentabelle endet (10 kt Rueckenwind, POH-Seite 5-12,
// Anmerkung 3 zu Abb. 5-4), der Streckenwind kennt diese Grenze nicht.
const erwarteteGrenzen = {
  last: { min: '50', max: '100', step: '10' },
  platzhoehe: { min: '-20', max: '6900', step: '10' },
  reiseflughoehe: { min: '0', max: '18000', step: '100' },
  qnh: { min: '950', max: '1050', step: '1' },
  strecke: { min: '1', max: '750', step: '1' },
  // Der Temperaturbereich gilt fuer die oben eingestellten 970 ft bei QNH 1013
  // (Druckhoehe 976,8 ft, Normtemperatur 13,1 Grad). Er entspricht der
  // unveraenderten Abweichungsspanne -30 bis +40, nach innen gerundet.
  temperatur: { min: '-16', max: '53', step: '1' },
  pistenwind: { min: '-10', max: '50', step: '1' },
  streckenwind: { min: '-50', max: '50', step: '1' }
};
const grenzen = await page.evaluate(
  (ids) =>
    Object.fromEntries(
      ids.map((id) => {
        const element = document.getElementById(id);
        return [id, { min: element.min, max: element.max, step: element.step }];
      })
    ),
  Object.keys(erwarteteGrenzen)
);
const grenzenStimmen = JSON.stringify(grenzen) === JSON.stringify(erwarteteGrenzen);
pruefe(
  13,
  'acht Schieberegler mit Wertanzeige und den Grenzen des Rechenkerns',
  reglerZahl === 8 && ausgaben === 8 && zahlenfelder === 0 && grenzenStimmen,
  `${reglerZahl} Regler, ${ausgaben} Anzeigen, ${zahlenfelder} Zahlenfelder, Grenzen ${grenzenStimmen ? 'wie erwartet' : JSON.stringify(grenzen)}`
);

// 14: Regler ist mit der Tastatur bedienbar und die Anzeige folgt (FR-013)
const streckenregler = page.getByLabel('Streckenlänge (NM)');
await streckenregler.focus();
const vorher = await page.locator('#strecke-wert').innerText();
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(150);
const nachher = await page.locator('#strecke-wert').innerText();
const summeNachTaste = await page.locator('#bedarf .summe').first().innerText().catch(() => '');
pruefe(
  14,
  'Pfeiltaste verstellt den Regler, Anzeige und Ergebnis folgen',
  vorher !== nachher && summeNachTaste.length > 0,
  `${vorher} -> ${nachher}`
);

// 15: Druckhöhe steht unmittelbar unter dem Regler, der sie erzeugt (FR-006/FR-007)
await fuellen(page, { dep: 1000, cruise: 6000, qnh: 1043, dist: 400, power: 70, isa: 0, wind: 0 });
// Die Reiseflughoehe steht seit der neuen Gliederung oben, die Platzhoehe
// unten -- die Reihenfolge der Folgezeilen ist deshalb umgekehrt.
const reiseFolge = await page.locator('#reiseflughoehe').locator('..').locator('.folge').innerText();
const platzFolgeZeile = await page.locator('#platzhoehe').locator('..').locator('.folge').innerText();
const druckhoehenzeilen = [platzFolgeZeile, reiseFolge];
// Bei 1043 hPa liegen beide Druckhoehen unter den eingestellten Hoehen.
pruefe(
  15,
  'Druckhöhe steht unter beiden Höhenreglern, mit ≙ als Zeichen und dem QNH als Bezug',
  druckhoehenzeilen.every(
    (z) => z.includes('≙') && /Druckhöhe/.test(z) && new RegExp(`@\\s*1043${NBSP}hPa`).test(z)
  ) &&
    new RegExp(`\\b2\\d{2}${NBSP}ft`).test(druckhoehenzeilen[0]) &&
    new RegExp(`\\b5\\d{3}${NBSP}ft`).test(druckhoehenzeilen[1]),
  druckhoehenzeilen.join(' | ')
);

// 18: Schnellwahl EDSH setzt die Platzhöhe und die Druckhöhe folgt
await page.getByRole('button', { name: 'Platzhöhe und Bahnzustand von EDSH übernehmen' }).click();
await page.waitForTimeout(150);
const platzWert = await page.locator('#platzhoehe-wert').innerText();
const platzFolge = await page.locator('#platzhoehe').locator('..').locator('.folge').innerText();
const grasNachEdsh = await page.locator('#gras').isChecked();
pruefe(
  18,
  'Schnellwahl EDSH setzt die Platzhöhe auf 971 ft',
  platzWert.includes('971') && /≙ Druckhöhe/.test(platzFolge),
  `${platzWert} — ${platzFolge}`
);

// 29: EDSH setzt den Grasschalter mit, und ein spaeteres Verstellen der
// Platzhoehe laesst ihn stehen (FR-023)
await regler(page, 'Platzhöhe ASL (ft)', 1500);
await page.waitForTimeout(150);
const grasNachVerstellen = await page.locator('#gras').isChecked();
pruefe(
  29,
  'EDSH setzt den Grasschalter, Verstellen der Platzhöhe setzt ihn nicht zurück',
  grasNachEdsh && grasNachVerstellen,
  `nach EDSH: ${grasNachEdsh}, nach Verstellen: ${grasNachVerstellen}`
);
await page.locator('#gras').uncheck();

// 19: im Ergebnis stehen nur noch die Groessen des konkreten Vorhabens
const leistung = await page.locator('.leistung').innerText();
pruefe(
  19,
  'im Ergebnis stehen Geschwindigkeit über Grund und Reiseflugzeit, nicht mehr KTAS und Stundenverbrauch',
  /über Grund/.test(leistung) &&
    /Reiseflugzeit/.test(leistung) &&
    !/KTAS/.test(leistung) &&
    !/\/h/.test(leistung),
  leistung.replace(/\s+/g, ' ')
);

// 20: die Faustformel taucht nirgends mehr auf
const ganzeSeite = await page.locator('main').innerText();
// Die Wortgrenze ist noetig: ohne sie trifft "30 ft" auch auf "5230 ft" zu.
pruefe(
  20,
  'die Faustformel wird nicht mehr erwähnt',
  !/Faustformel|\b30 ft\b|ft\s*\/\s*hPa/.test(ganzeSeite)
);

// 21: die Seite laeuft von einfach nach komplex (Feature 039): erst die drei
//     Grundbedingungen, dann die Startstrecke, dann die Reisegroessen und die
//     beiden Ergebnisse, die an ihnen haengen. Die Uebersicht zeigt vier Werte.
await fuellen(page, { dep: 1000, cruise: 6000, qnh: 1013, dist: 400, power: 70, isa: 10, wind: 10 });
const reihenfolge = await page.evaluate(() =>
  [
    ...document.querySelectorAll(
      'main > form legend, main > section > h2, main > section > section > h3, .uebersicht h3'
    )
  ].map((e) => e.textContent.trim())
);
const uebersichtWerte = await page.locator('.uebersicht .werte > div').count();
pruefe(
  21,
  'die Seite laeuft von den Grundbedingungen ueber die Startstrecke zu den Reisegroessen',
  reihenfolge[0].startsWith('Grundbedingungen') &&
    reihenfolge[1] === 'Roll- und Startstrecke' &&
    // Seit die Ueberschrift "Reiseflug" beide Ergebnisbloecke klammert, steht
    // sie hier statt der Rahmenbeschriftung.
    reihenfolge[2] === 'Reiseflug' &&
    /Reichweite und Flugdauer/.test(reihenfolge[3]) &&
    reihenfolge[4] === 'Kraftstoffbedarf und Geschwindigkeiten' &&
    uebersichtWerte === 4,
  `${reihenfolge.join(' > ')} — ${uebersichtWerte} Werte`
);

// 22: der Hinweis nennt alle Bestandteile und die Quelle traegt eine Seitenzahl
const uebersichtHinweis = await page.locator('.uebersicht .hinweis').innerText();
const uebersichtQuelle = await page.locator('.uebersicht .quelle').innerText();
pruefe(
  22,
  'der Hinweis nennt 4 l, Steigflug, 45 min Reserve und Windstille, die Quelle eine Seitenzahl',
  /4\u00a0l/.test(uebersichtHinweis) &&
    /Steigflug/.test(uebersichtHinweis) &&
    /45\u00a0min/.test(uebersichtHinweis) &&
    /Windstille/.test(uebersichtHinweis) &&
    /Abb\. 5-4a/.test(uebersichtQuelle) &&
    /Seite 5b-14/.test(uebersichtQuelle),
  `${uebersichtHinweis.replace(/\s+/g, ' ')} — ${uebersichtQuelle}`
);

// 23: Strecke und Streckenwind lassen die Uebersicht unberuehrt, aendern aber
// den Bedarf
const uebersichtVorher = await page.locator('.uebersicht .werte').innerText();
const summeVorher = await page.locator('#bedarf .summe').innerText();
await regler(page, 'Streckenlänge (NM)', 250);
await regler(page, 'Streckenwindkomponente (kt, positiv = Gegenwind)', -20);
await page.waitForTimeout(200);
const uebersichtNachher = await page.locator('.uebersicht .werte').innerText();
const summeNachher = await page.locator('#bedarf .summe').innerText();
pruefe(
  23,
  'Strecke und Wind ändern die Übersicht nicht, den Bedarf aber schon',
  uebersichtVorher === uebersichtNachher && summeVorher !== summeNachher,
  `${summeVorher.replace(/\s+/g, ' ')} -> ${summeNachher.replace(/\s+/g, ' ')}`
);

// 24: der Reserve-Hinweis steht beim Bedarf, nicht bei der Uebersicht
const vergleichstext = await page.locator('.vergleich').innerText();
const uebersichtText = await page.locator('.uebersicht').innerText();
pruefe(
  24,
  'der Hinweis „keine Reserve" steht beim Bedarf, nicht bei der Übersicht',
  /keine Reserve/.test(vergleichstext) && !/keine Reserve/.test(uebersichtText),
  vergleichstext.replace(/\s+/g, ' ')
);

// 25: nicht gefuehrte Lasteinstellung zeigt die Meldung des Kerns statt Werten
await regler(page, 'Reiseflughöhe ASL (ft)', 12000);
await regler(page, 'Lasteinstellung', 100);
await page.waitForTimeout(200);
const uebersichtFehler = await page.locator('.uebersicht .fehler').innerText().catch(() => '');
const werteWeg = (await page.locator('.uebersicht .werte').count()) === 0;
pruefe(
  25,
  '100 % bei 12 000 ft zeigt die Meldung des Kerns und keine Werte',
  werteWeg && /Lasteinstellung/.test(uebersichtFehler) && /50, 60, 70, 80, 90/.test(uebersichtFehler),
  uebersichtFehler
);

// 17: hoher Luftdruck druckt die Platzhoehe unter den Tabellenrand (SC-006)
await fuellen(page, { dep: 0, cruise: 6000, qnh: 1030, dist: 400, power: 70, isa: 0, wind: 0 });
const druckmeldung = await page.locator('#bedarf .fehler').innerText().catch(() => '');
pruefe(
  17,
  'zu hohes QNH führt zur Ablehnung, die Meldung nennt das QNH',
  /1030\u00a0hPa/.test(druckmeldung) &&
    /unter dem Bereich/.test(druckmeldung) &&
    /Ursache ist hier der Luftdruck/.test(druckmeldung),
  druckmeldung
);

// 16: mehrere Spalten ab Tabletbreite, eine auf dem Telefon (FR-003, SC-004)
const spaltenZaehlen = () =>
  page.evaluate(
    () =>
      new Set(
        [...document.querySelectorAll('.felder > .regler')].map((element) =>
          Math.round(element.getBoundingClientRect().left)
        )
      ).size
  );

await page.setViewportSize({ width: 1024, height: 800 });
await page.waitForTimeout(200);
const spaltenBreit = await spaltenZaehlen();

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(200);
const spaltenSchmal = await spaltenZaehlen();

pruefe(
  16,
  'mehrere Spalten auf 1024 px, genau eine auf 390 px',
  spaltenBreit >= 2 && spaltenSchmal === 1,
  `${spaltenBreit} Spalten breit, ${spaltenSchmal} schmal`
);

// Mobilgerät (FR-027) und Kennzeichnung als Höhe ASL (FR-024, FR-005)
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(RECHNER, { waitUntil: 'networkidle' });
const beschriftungen = await page.locator('label').allInnerTexts();
const hoehenfelder = beschriftungen.filter((t) => t.includes('(ft)'));
const alleAsl = hoehenfelder.length === 2 && hoehenfelder.every((t) => t.includes('ASL') && !t.includes('Druckhöhe'));
const ueberbreite = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
pruefe(11, 'Höhenfelder sind als Höhe ASL gekennzeichnet, nicht als Druckhöhe', alleAsl, hoehenfelder.join(' | '));
pruefe(12, 'kein waagerechtes Scrollen auf 390 px Breite', !ueberbreite);

// 26: der Strassenvergleich als Fun Fact am Ende der Übersicht
await page.setViewportSize({ width: 1024, height: 800 });
await page.goto(RECHNER, { waitUntil: 'networkidle' });
await fuellen(page, { dep: 1000, cruise: 6000, qnh: 1013, dist: 250, power: 70, isa: 0, wind: 0 });
// Geschuetzte Leerzeichen werden hier zu gewoehnlichen normalisiert; dass sie
// vorhanden sind, stellt Pruefung 27 fest.
const spassText = (await page.locator('.uebersicht .spass').innerText()).replace(/\s+/g, ' ');
const spassNachWerten = await page.evaluate(() => {
  const werte = document.querySelector('.uebersicht .werte');
  const spass = document.querySelector('.uebersicht .spass');
  // 4 ist DOCUMENT_POSITION_FOLLOWING; die Konstante steht am globalen `Node`,
  // den der Linter hier nicht kennt.
  return werte.compareDocumentPosition(spass) === 4;
});
pruefe(
  26,
  'der Strassenvergleich steht als letzter Absatz der Übersicht, in l/100 km und mpg',
  /\d+,\d l\/100 km/.test(spassText) && /\d+,\d mpg/.test(spassText) && spassNachWerten,
  spassText
);

// 27: Zahl und Einheit haengen zusammen (Issue #13)
const trennbar = await page.evaluate(() => {
  // Die Bedingungen der Tabellen bleiben aussen vor: Sie sind woertliche
  // Zitate aus dem Flughandbuch („Geschwindigkeit in 15 m / 50 ft Hoehe")
  // und werden bewusst nicht umformatiert -- ein Zitat, das der Rechner
  // anfasst, ist keines mehr (Prinzip I).
  const text = [...document.querySelectorAll('main *')]
    .filter((e) => e.children.length === 0 && !e.closest('.bedingungen'))
    .map((e) => e.textContent)
    .join('\n');
  // Einheiten, denen ein gewoehnliches Leerzeichen vorausgeht, duerften am
  // Zeilenende auseinanderfallen.
  const treffer = text.match(/\d (?:l|kt|ft|NM|hPa|min|h|%|°C|US gal|KTAS)\b/g);
  return treffer ?? [];
});
pruefe(
  27,
  'zwischen Zahl und Einheit steht überall ein geschütztes Leerzeichen',
  trennbar.length === 0,
  trennbar.join(' | ')
);

// 28: das Avatar bleibt beim Scrollen sichtbar und schrumpft dabei (Issue #14)
// Erst zurueck nach oben: Das Ausfuellen weiter oben kann die Seite bereits
// verschoben haben, und dann waere das Avatar schon geschrumpft.
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(250);
const avatarOben = await page.locator('.flugzeug').boundingBox();
await page.evaluate(() => window.scrollTo(0, 600));
await page.waitForTimeout(200);
const avatarUnten = await page.locator('.flugzeug').boundingBox();
pruefe(
  28,
  'das Flugzeug-Avatar wandert beim Scrollen mit und wird dabei kleiner',
  avatarUnten !== null &&
    avatarUnten.width < avatarOben.width &&
    avatarUnten.y >= 0 &&
    avatarUnten.y < 100,
  `${Math.round(avatarOben.width)} px -> ${Math.round(avatarUnten.width)} px, y = ${Math.round(avatarUnten.y)}`
);
await page.evaluate(() => window.scrollTo(0, 0));

// 30: die Startstrecke zeigt beide Werte, die vier Anmerkungen im Wortlaut mit
// Seitenangabe 5b-2 und eine Quellenangabe mit Seitenzahl (FR-016, SC-004)
await page.setViewportSize({ width: 1024, height: 800 });
await page.goto(RECHNER, { waitUntil: 'networkidle' });
await fuellen(page, { dep: 1000, cruise: 6000, qnh: 1013, dist: 250, power: 70, isa: 0, wind: 0 });
const startWerte = await page.locator('#startstrecke .aufschluesselung').innerText();
// Nicht .first(): Seit die Bedingungen oberhalb der Anmerkungen stehen, waere
// das die falsche der beiden Listen.
const startHinweise = await page
  .locator('#startstrecke .hinweise:not(.bedingungen)')
  .innerText();
const startQuellen = await page.locator('#startstrecke .quellen').innerText();
pruefe(
  30,
  'die Startstrecke zeigt beide Strecken, die vier Anmerkungen und die Quelle mit Seitenzahl',
  /Startrollstrecke/.test(startWerte) &&
    /Gesamtstrecke/.test(startWerte) &&
    // Jede Strecke genau einmal, naemlich als Spaltenueberschrift.
    (startWerte.match(/Startrollstrecke/g) ?? []).length === 1 &&
    /15\s?m Hindernis/.test(startWerte) &&
    (startWerte.match(new RegExp(`\\d${NBSP}m`, 'g')) ?? []).length >= 2 &&
    /Anmerkung 2|9 Knoten|Knoten/.test(startHinweise) &&
    /15%/.test(startHinweise) &&
    /20%/.test(startHinweise) &&
    /Abb\. 5-1a/.test(startQuellen) &&
    /Seite 5b-2/.test(startQuellen),
  `${startWerte.replace(/\s+/g, ' ')} — ${startQuellen.split('\n')[0]}`
);

// 31: Inhalt der beiden Eingaberahmen und Ort der Streckenlaenge. Seit
// Feature 039 tragen die Grundbedingungen genau die drei Groessen, die *jede*
// Rechnung braucht; Reiseflughoehe und Lasteinstellung stehen in einem eigenen
// Rahmen unterhalb der Startstrecke.
const gliederung = await page.evaluate(() => {
  const rahmen = (name) =>
    [...document.querySelectorAll('fieldset')].find(
      (f) => f.querySelector('legend')?.textContent.trim() === name
    );
  const grund = rahmen('Grundbedingungen');
  const reise = rahmen('Bedingungen im Reiseflug');
  const startstrecke = document.querySelector('#startstrecke');
  return {
    imGrundrahmen: grund ? [...grund.querySelectorAll('input[type="range"]')].map((e) => e.id) : [],
    imReiserahmen: reise ? [...reise.querySelectorAll('input[type="range"]')].map((e) => e.id) : [],
    // 4 = DOCUMENT_POSITION_FOLLOWING: der Reiserahmen steht hinter der Startstrecke
    startVorReise: startstrecke && reise ? startstrecke.compareDocumentPosition(reise) & 4 : 0,
    streckeImBedarf: document.querySelector('#bedarf #strecke') !== null
  };
});
pruefe(
  31,
  'Grundbedingungen tragen Platzhöhe, QNH und Temperatur; die Reisegrößen stehen hinter der Startstrecke',
  JSON.stringify(gliederung.imGrundrahmen) === JSON.stringify(['platzhoehe', 'qnh', 'temperatur']) &&
    JSON.stringify(gliederung.imReiserahmen) === JSON.stringify(['reiseflughoehe', 'last']) &&
    gliederung.startVorReise > 0 &&
    gliederung.streckeImBedarf,
  JSON.stringify(gliederung)
);

// 32: der Pistenwindregler endet bei 10 kt Rueckenwind -- dort endet die
// Startstreckentabelle (POH-Seite 5-12, Anmerkung 3 zu Abb. 5-4; im
// Diesel-Anhang Anmerkung 2 zu Abb. 5-1a). Die Grenze sitzt seit Feature 026
// am Regler statt in einer Meldung danach; die Meldung des Kerns besteht
// weiter und ist dort geprueft, ueber die Oberflaeche aber nicht mehr
// ausloesbar (siehe research.md R3).
// Die Home-Taste faehrt einen Schieberegler auf sein Minimum -- naeher am
// „zieh ihn ans Ende" als ein gesetzter Wert, und `fill` liesse einen Wert
// ausserhalb des Bereichs ohnehin nicht zu.
await page.locator('#pistenwind').focus();
await page.keyboard.press('Home');
await page.waitForTimeout(200);
const pistenwindAmAnschlag = await page.locator('#pistenwind').inputValue();
const startstreckeAmAnschlag = await page
  .locator('#startstrecke .summe')
  .isVisible()
  .catch(() => false);
const startfehlerAmAnschlag = await page
  .locator('#startstrecke .fehler')
  .isVisible()
  .catch(() => false);
pruefe(
  32,
  'der Pistenwindregler endet bei −10 kt und die Startstrecke wird dort noch ausgewiesen',
  pistenwindAmAnschlag === '-10' && startstreckeAmAnschlag && !startfehlerAmAnschlag,
  `Anschlag ${pistenwindAmAnschlag} kt, Strecke ${startstreckeAmAnschlag ? 'sichtbar' : 'fehlt'}`
);
await page.locator('#pistenwind').fill('0');
await page.dispatchEvent('#pistenwind', 'input');
await page.waitForTimeout(200);

// 33: Bahnschalter wirken auf die Startstrecke, nicht auf den Bedarf (FR-018)
const startVorGras = await page.locator('#startstrecke .summe').innerText();
const bedarfVorGras = await page.locator('#bedarf .summe').innerText();
await page.locator('#gras').check();
await page.waitForTimeout(200);
const startNachGras = await page.locator('#startstrecke .summe').innerText();
const bedarfNachGras = await page.locator('#bedarf .summe').innerText();
pruefe(
  33,
  'der Grasschalter verlängert die Startstrecke und lässt den Kraftstoffbedarf unberührt',
  startVorGras !== startNachGras && bedarfVorGras === bedarfNachGras,
  `${startVorGras.replace(/\s+/g, ' ')} -> ${startNachGras.replace(/\s+/g, ' ')}`
);
await page.locator('#gras').uncheck();

// 36: der Wind steht als Anteil in der Zeilenbeschriftung und als Meterbetrag
// in den Zellen -- so addiert sich die Spalte sichtbar auf (FR-020)
await page.locator('#pistenwind').fill('9');
await page.dispatchEvent('#pistenwind', 'input');
await page.waitForTimeout(200);
const windZeile = (
  await page.locator('#startstrecke tbody tr').nth(1).innerText()
).replace(/\s+/g, ' ');
pruefe(
  36,
  'die Windzeile nennt den Anteil in Prozent und die Abzüge in Metern',
  /−10,0 %/.test(windZeile) && (windZeile.match(/−\d+ m/g) ?? []).length === 2,
  windZeile
);
await page.locator('#pistenwind').fill('0');
await page.dispatchEvent('#pistenwind', 'input');
await page.waitForTimeout(200);

// 37: Anmerkung 4 macht aus dem Ergebnis einen Mindestwert -- sichtbar am
// Zeichen und an der Hervorhebung, und die angewandten Anmerkungen tragen
// einen Haken
await page.locator('#nass').check();
await page.locator('#gras').check();
await page.waitForTimeout(250);
const mindest = await page.evaluate(() => {
  const hervorgehoben = [...document.querySelectorAll('#startstrecke .mindestwert')];
  const punkte = [...document.querySelectorAll('#startstrecke .hinweise li')].map((e) =>
    e.textContent.trim()
  );
  return {
    hervorgehoben: hervorgehoben.length,
    // Anmerkung 4 traegt dieselbe Hervorhebung wie die Werte -- daran ist die
    // Farbe in der Tabelle ueberhaupt erst erklaert.
    anmerkungHervorgehoben: hervorgehoben.some(
      (e) => e.tagName === 'MARK' && /Anmerkung|mindestens|20/.test(e.textContent)
    ),
    // Das Zeichen tragen die Werte; die hervorgehobene Anmerkung ist Fliesstext.
    alleMitZeichen: hervorgehoben
      .filter((e) => e.tagName === 'TD')
      .every((e) => e.textContent.trim().startsWith('≥')),
    mitHaken: punkte.filter((t) => t.endsWith('✓')).length
  };
});
pruefe(
  37,
  'Nass oder Schnee hebt Werte und Anmerkung 4 gelb hervor, angewandte Anmerkungen tragen einen Haken',
  mindest.hervorgehoben === 5 &&
    mindest.anmerkungHervorgehoben &&
    mindest.alleMitZeichen &&
    mindest.mitHaken === 2,
  JSON.stringify(mindest)
);
await page.locator('#nass').uncheck();
await page.locator('#gras').uncheck();
await page.waitForTimeout(200);

// 38: Bedingungen vor Anmerkungen, wie im Flughandbuch -- dort steht unter der
// Tabelle zuerst, wofuer sie gilt, danach die nummerierten Anmerkungen. Beide
// stehen hinter der Ergebnistabelle: davor haetten sie auf schmalen Geraeten
// das Ergebnis aus dem Sichtfeld geschoben.
const reihenfolgeUeberschriften = await page.evaluate(() =>
  // <h3> seit Feature 039: Die Blocktitel sind auf <h2> gewandert, alles
  // darunter ist eine Stufe mitgezogen -- sonst klaffte zwischen h2 und h4
  // eine Luecke (Pruefung 39).
  [...document.querySelectorAll('#startstrecke h3')].map((e) => e.textContent.trim())
);
// 4 = DOCUMENT_POSITION_FOLLOWING: die Bedingungen stehen hinter der Tabelle
const tabelleZuerst = await page.evaluate(() => {
  const tabelle = document.querySelector('#startstrecke .aufschluesselung');
  const bedingungen = document.querySelector('#startstrecke .bedingungen');
  return Boolean(tabelle.compareDocumentPosition(bedingungen) & 4);
});
pruefe(
  38,
  '„Bedingungen:" stehen vor „Anmerkungen:", beide hinter der Ergebnistabelle',
  reihenfolgeUeberschriften.includes('Anmerkungen:') &&
    reihenfolgeUeberschriften.indexOf('Bedingungen:') <
      reihenfolgeUeberschriften.indexOf('Anmerkungen:') &&
    tabelleZuerst,
  `${reihenfolgeUeberschriften.join(' > ')}, Tabelle zuerst: ${tabelleZuerst}`
);

// 39: die Ueberschriften bilden eine lueckenlose Rangfolge und tragen keine
// eigene Groesse mehr
const ueberschriften = await page.evaluate(() => {
  const stufen = [...document.querySelectorAll('main h1, main h2, main h3, main h4, main h5')];
  return {
    folge: stufen.map((e) => Number(e.tagName.slice(1))),
    absteigend: stufen.map((e) => parseFloat(window.getComputedStyle(e).fontSize))
  };
});
const lueckenlos = ueberschriften.folge.every(
  (stufe, i) => i === 0 || stufe <= ueberschriften.folge[i - 1] + 1
);
const kleinerWerdend = ueberschriften.absteigend.every(
  (groesse, i) => i === 0 || groesse <= ueberschriften.absteigend[0]
);
pruefe(
  39,
  'die Überschriften bilden eine lückenlose Rangfolge in Standardgrößen',
  lueckenlos && kleinerWerdend && ueberschriften.folge.includes(4),
  `${ueberschriften.folge.join('')} — ${[...new Set(ueberschriften.absteigend)].join('/')} px`
);

// 34: zwei Spalten im Querformat, eine im Hochformat -- der Fall, an dem eine
// reine Breitenabfrage scheitern wuerde (quickstart.md Abschnitt 9).
//
// Gemessen wird seit Feature 039 *innerhalb* der Startstrecke: Bis dahin
// standen Startstrecke und Kraftstoffbedarf nebeneinander, was nur ging,
// solange beide dieselben Eingaben ueber sich hatten. Jetzt stehen die
// Reisegroessen zwischen ihnen; nebeneinander liegen die Regler und die
// Ergebnistabelle desselben Bereichs.
const spaltenInDerStartstrecke = () =>
  page.evaluate(() => {
    const eingaben = document.querySelector('#startstrecke .eingaben');
    const auswertung = document.querySelector('#startstrecke .auswertung');
    if (!eingaben || !auswertung) return false;
    return Math.abs(eingaben.getBoundingClientRect().top - auswertung.getBoundingClientRect().top) < 4;
  });

await page.setViewportSize({ width: 844, height: 390 });
await page.waitForTimeout(250);
const quer = await spaltenInDerStartstrecke();

await page.setViewportSize({ width: 1024, height: 1366 });
await page.waitForTimeout(250);
const hoch = await spaltenInDerStartstrecke();
const startstreckeZuerst = await page.evaluate(() => {
  const start = document.querySelector('#startstrecke');
  const bedarf = document.querySelector('#bedarf');
  return start.getBoundingClientRect().top < bedarf.getBoundingClientRect().top;
});
pruefe(
  34,
  'bei 844 × 390 Regler neben Tabelle, bei 1024 × 1366 untereinander mit der Startstrecke zuerst',
  quer && !hoch && startstreckeZuerst,
  `quer nebeneinander: ${quer}, hoch nebeneinander: ${hoch}, Startstrecke zuerst: ${startstreckeZuerst}`
);

// 35: auf 390 px kein waagerechtes Scrollen und alle Bedienelemente erreichbar
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(250);
const engeSicht = await page.evaluate(() => {
  const ueberbreit = document.documentElement.scrollWidth > window.innerWidth + 1;
  // Nur was gerade zu sehen ist: Die Knöpfe im geschlossenen Dialog haben
  // keine Ausdehnung und wären sonst ein Fehlalarm.
  const bedienbar = [...document.querySelectorAll('input, button')]
    .filter((element) => element.checkVisibility())
    .every((element) => {
      const kasten = element.getBoundingClientRect();
      return kasten.width > 0 && kasten.left >= -1 && kasten.right <= window.innerWidth + 1;
    });
  return { ueberbreit, bedienbar };
});
pruefe(
  35,
  'auf 390 px kein waagerechtes Scrollen, alle Bedienelemente innerhalb der Breite',
  !engeSicht.ueberbreit && engeSicht.bedienbar,
  JSON.stringify(engeSicht)
);
await page.setViewportSize({ width: 1024, height: 800 });


/*
  40 bis 55: der Luftdruckabruf für EDSH (Feature 025).

  Der Dienst wird durchweg abgefangen. Ein Klickpfad, der wirklich ins Netz
  griffe, wäre weder wiederholbar noch aussagekräftig: Er prüfte das Wetter
  statt die Oberfläche, und er schlüge im Zug ohne Empfang fehl.
*/
const OPEN_METEO = 'https://api.open-meteo.com/**';

async function antwortMit(rumpf, verzoegerungMs = 0) {
  await page.unroute(OPEN_METEO).catch(() => {});
  await page.route(OPEN_METEO, async (route) => {
    if (verzoegerungMs > 0) await warte(verzoegerungMs);
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rumpf) });
  });
}

/*
  Die Prüfdaten. 987,9 hPa in 971 ft ergeben einen QNH von 1023,3 — abgerundet
  1023. Bei 29,2 °C in der zugehörigen Druckhöhe von 699 ft liegt die
  ISA-Abweichung bei 15,40 °C; der Temperaturregler nimmt seit Feature 031 die
  Temperatur selbst, gerundet 29. Der Wind aus 250° mit 12 kt ergibt
  auf Bahn 28 (283° rechtweisend) 10,06 kt Gegenwind, gerundet 10 — und auf
  Bahn 10 denselben Betrag als Rückenwind.
*/
const GUTE_ANTWORT = {
  elevation: 296,
  current: {
    time: '2026-08-11T08:00',
    surface_pressure: 987.9,
    temperature_2m: 29.2,
    wind_speed_10m: 12,
    wind_direction_10m: 250
  },
  current_units: { wind_speed_10m: 'kn' }
};

const wetterKnoepfe = page.getByRole('button', { name: 'Wetterwerte für EDSH abrufen' });
// Alle drei Knoepfe oeffnen denselben Dialog; fuer die folgenden Pruefungen
// genuegt daher einer. Genommen wird der erste, weil das der am QNH ist -- der
// Weg, den ein Pilot zuerst geht.
const wetterKnopf = wetterKnoepfe.first();
const uebernehmen = page.getByRole('button', { name: 'Übernehmen', exact: true });

// 40: an jedem der drei abrufbaren Regler steht ein Knopf „EDSH" (FR-004)
const knopfPositionen = await page.evaluate(() =>
  [...document.querySelectorAll('button[aria-label="Wetterwerte für EDSH abrufen"]')].map(
    (knopf) => knopf.closest('.regler')?.querySelector('input[type="range"]')?.id ?? '?'
  )
);
pruefe(
  40,
  'neben QNH, Außentemperatur und Pistenwind steht je ein Knopf „EDSH"',
  (await wetterKnoepfe.count()) === 3 &&
    ['qnh', 'temperatur', 'pistenwind'].every((id) => knopfPositionen.includes(id)),
  JSON.stringify(knopfPositionen)
);

// 41: der Klick öffnet einen Dialog, der aufklärt, statt die Werte zu setzen
// Der Grasschalter wird vorher ausdruecklich geleert: Ab hier gehoert er zu
// dem, was die Uebernahme setzt, und ein Rest aus einer frueheren Pruefung
// wuerde das verdecken.
await page.locator('#gras').uncheck();
await antwortMit(GUTE_ANTWORT, 400);
const qnhVorher = await page.locator('#qnh-wert').innerText();
await wetterKnopf.click();
const dialogText = await page.locator('dialog[open]').innerText();
pruefe(
  41,
  'der Dialog klärt über Onlinedienst, Wettermodell und ATIS auf, ohne einen Wert zu setzen',
  /Onlinedienst/.test(dialogText) &&
    /Wettermodell/.test(dialogText) &&
    /keine Messung am Platz/.test(dialogText) &&
    /ATIS/.test(dialogText) &&
    (await page.locator('#qnh-wert').innerText()) === qnhVorher &&
    // Auch der Bahnzustand nicht: Er wird zwar bei jeder Uebernahme
    // mitgesetzt, aber eben erst dann.
    !(await page.locator('#gras').isChecked()),
  qnhVorher
);

// 42: die Namensnennung steht im Dialog, wie CC-BY es verlangt
pruefe(42, 'der Dialog nennt Open-Meteo als Quelle', /Open-Meteo/.test(dialogText));

// 43: während des Abrufs läuft eine Ladeanzeige und „Übernehmen" ist gesperrt
pruefe(
  43,
  'während des Abrufs Ladeanzeige, „Übernehmen" gesperrt',
  (await page.getByTestId('wetter-laedt').count()) === 1 && (await uebernehmen.isDisabled()),
  dialogText.split('\n').at(-2) ?? ''
);

// 44: drei Zeilen, drei angehakte Kästchen, drei Vorschauwerte
await page.getByTestId('wetter-wert-qnh').waitFor({ timeout: 5000 });
const vorschau = {
  qnh: (await page.getByTestId('wetter-wert-qnh').innerText()).trim(),
  isa: (await page.getByTestId('wetter-wert-temperatur').innerText()).trim(),
  wind: (await page.getByTestId('wetter-wert-wind').innerText()).trim(),
  hakenQnh: await page.getByTestId('wetter-haken-qnh').isChecked(),
  hakenIsa: await page.getByTestId('wetter-haken-temperatur').isChecked(),
  hakenWind: await page.getByTestId('wetter-haken-wind').isChecked()
};
pruefe(
  44,
  'die Vorschau zeigt 1023 hPa, 29 °C und 10 kt, alle drei Kästchen angehakt',
  vorschau.qnh === `1023${NBSP}hPa` &&
    vorschau.isa === `29${NBSP}°C` &&
    vorschau.wind === `10${NBSP}kt` &&
    vorschau.hakenQnh &&
    vorschau.hakenIsa &&
    vorschau.hakenWind,
  JSON.stringify(vorschau)
);

// 45: „Übernehmen" setzt alle drei Regler — und nur diese
const streckenwindVorher = await page.locator('#streckenwind').inputValue();
await uebernehmen.click();
await page.waitForTimeout(150);
const nachUebernahme = {
  qnh: await page.locator('#qnh').inputValue(),
  isa: await page.locator('#temperatur').inputValue(),
  pistenwind: await page.locator('#pistenwind').inputValue(),
  streckenwind: await page.locator('#streckenwind').inputValue(),
  gras: await page.locator('#gras').isChecked(),
  offen: await page.locator('dialog[open]').count()
};
pruefe(
  45,
  '„Übernehmen" setzt QNH, Außentemperatur, Pistenwind und den Bahnzustand; die Streckenwindkomponente bleibt unberührt',
  nachUebernahme.gras &&
    nachUebernahme.qnh === '1023' &&
    nachUebernahme.isa === '29' &&
    nachUebernahme.pistenwind === '10' &&
    nachUebernahme.streckenwind === streckenwindVorher &&
    nachUebernahme.offen === 0,
  JSON.stringify(nachUebernahme)
);

// 46: unter jedem übernommenen Regler steht ein Herkunftsvermerk
const vermerke = {
  qnh: await page.getByTestId('qnh-herkunft').innerText(),
  isa: await page.getByTestId('temperatur-herkunft').innerText(),
  wind: await page.getByTestId('pistenwind-herkunft').innerText()
};
pruefe(
  46,
  'unter allen drei Reglern stehen Dienst, Ort, Gültigkeitszeit und der unverbindliche Charakter',
  Object.values(vermerke).every(
    (text) =>
      /Open-Meteo/.test(text) &&
      /gültig für EDSH \d/.test(text) &&
      /unverbindlich/.test(text)
  ),
  JSON.stringify(vermerke)
);

// 47: die Druckhöhe folgt dem übernommenen Wert
const platzFolgeNachAbruf = await page
  .locator('#platzhoehe')
  .locator('..')
  .locator('.folge')
  .innerText();
pruefe(
  47,
  'die Druckhöhe unter der Platzhöhe rechnet mit dem übernommenen QNH',
  new RegExp(`@\\s*1023${NBSP}hPa`).test(platzFolgeNachAbruf),
  platzFolgeNachAbruf
);

// 48: wer einen Regler selbst bewegt, verliert nur dessen Vermerk
await regler(page, 'Luftdruck QNH (hPa)', 1010);
await page.waitForTimeout(150);
pruefe(
  48,
  'eigenes Verstellen eines Reglers löscht allein dessen Herkunftsvermerk',
  (await page.getByTestId('qnh-herkunft').count()) === 0 &&
    (await page.getByTestId('temperatur-herkunft').count()) === 1 &&
    (await page.getByTestId('pistenwind-herkunft').count()) === 1
);

// 49: „Abbrechen" lässt die Werte unberührt
await wetterKnopf.click();
await page.getByTestId('wetter-wert-qnh').waitFor({ timeout: 5000 });
await page.getByRole('button', { name: 'Abbrechen' }).click();
await page.waitForTimeout(150);
pruefe(
  49,
  '„Abbrechen" verändert keinen Regler',
  (await page.locator('#qnh').inputValue()) === '1010' &&
    (await page.getByTestId('qnh-herkunft').count()) === 0
);

// 50: Esc schließt den Dialog ebenso folgenlos
await wetterKnopf.click();
await page.getByTestId('wetter-wert-qnh').waitFor({ timeout: 5000 });
await page.keyboard.press('Escape');
await page.waitForTimeout(150);
pruefe(
  50,
  'Esc schließt den Dialog, ohne einen Regler zu verändern',
  (await page.locator('dialog[open]').count()) === 0 &&
    (await page.locator('#qnh').inputValue()) === '1010'
);

// 58: ein abgewähltes Kästchen lässt seinen Regler UND dessen bisherigen
// Vermerk unverändert — Abwählen ist kein Zurücksetzen (W-09).
const isaVorAbwahl = await page.locator('#temperatur').inputValue();
await wetterKnopf.click();
await page.getByTestId('wetter-wert-qnh').waitFor({ timeout: 5000 });
await page.getByTestId('wetter-haken-temperatur').uncheck();
await page.getByTestId('wetter-haken-wind').uncheck();
await uebernehmen.click();
await page.waitForTimeout(150);
const nachAbwahl = {
  qnh: await page.locator('#qnh').inputValue(),
  isa: await page.locator('#temperatur').inputValue(),
  isaVermerk: await page.getByTestId('temperatur-herkunft').count(),
  windVermerk: await page.getByTestId('pistenwind-herkunft').count()
};
pruefe(
  58,
  'ein abgewähltes Kästchen lässt Regler und bisherigen Vermerk unverändert',
  nachAbwahl.qnh === '1023' &&
    nachAbwahl.isa === isaVorAbwahl &&
    nachAbwahl.isaVermerk === 1 &&
    nachAbwahl.windVermerk === 1,
  JSON.stringify({ ...nachAbwahl, isaVorAbwahl })
);

// 59: alle drei abgewählt → „Übernehmen" gesperrt
await wetterKnopf.click();
await page.getByTestId('wetter-wert-qnh').waitFor({ timeout: 5000 });
await page.getByTestId('wetter-haken-qnh').uncheck();
await page.getByTestId('wetter-haken-temperatur').uncheck();
await page.getByTestId('wetter-haken-wind').uncheck();
await page.waitForTimeout(100);
pruefe(59, 'ohne angehaktes Kästchen ist „Übernehmen" gesperrt', await uebernehmen.isDisabled());
await page.getByRole('button', { name: 'Abbrechen' }).click();

// 60: ein Bahnwechsel rechnet allein den Pistenwind neu und löst KEINE zweite
// Anfrage aus (FR-011). Der Zähler ist der eigentliche Gegenstand: Ein neuer
// Abruf setzte die Kästchen zurück und könnte eine andere Modellstunde
// liefern, ohne dass irgendetwas darauf hindeutete.
let anfragen = 0;
await page.unroute(OPEN_METEO).catch(() => {});
await page.route(OPEN_METEO, async (route) => {
  anfragen += 1;
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(GUTE_ANTWORT)
  });
});
await wetterKnopf.click();
await page.getByTestId('wetter-wert-qnh').waitFor({ timeout: 5000 });
const anfragenNachOeffnen = anfragen;
const vorWechsel = {
  qnh: await page.getByTestId('wetter-wert-qnh').innerText(),
  wind: (await page.getByTestId('wetter-wert-wind').innerText()).trim()
};
await page.getByTestId('wetter-bahnwahl').getByRole('radio', { name: '10' }).check();
await page.waitForTimeout(150);
const nachWechsel = {
  qnh: await page.getByTestId('wetter-wert-qnh').innerText(),
  wind: (await page.getByTestId('wetter-wert-wind').innerText()).trim()
};
pruefe(
  60,
  'ein Bahnwechsel ändert allein den Pistenwind und löst keine zweite Anfrage aus',
  anfragen === anfragenNachOeffnen &&
    nachWechsel.qnh === vorWechsel.qnh &&
    vorWechsel.wind === `10${NBSP}kt` &&
    /[-−]/.test(nachWechsel.wind) &&
    nachWechsel.wind !== vorWechsel.wind,
  JSON.stringify({ anfragen, vorWechsel, nachWechsel })
);
await page.getByRole('button', { name: 'Abbrechen' }).click();

// 61: vorausgewählt ist die Bahn mit Gegenwind (FR-010). Aus 250° ist das
// Bahn 28 — der Vorschlag muss also positiv sein.
await antwortMit(GUTE_ANTWORT);
await wetterKnopf.click();
await page.getByTestId('wetter-wert-qnh').waitFor({ timeout: 5000 });
const windVorschau = (await page.getByTestId('wetter-wert-wind').innerText()).trim();
pruefe(
  61,
  'vorausgewählt ist die Bahn mit Gegenwind',
  (await page.getByTestId('wetter-bahnwahl').getByRole('radio', { name: '28' }).isChecked()) &&
    !/[-−]/.test(windVorschau),
  windVorschau
);

// 62: die Erläuterungen nennen Windrichtung, Windgeschwindigkeit, Bahn, die
// ungerundete Platztemperatur und die daraus folgende ISA-Abweichung — ohne
// sie wäre kein Vorschlag nachprüfbar. Seit Feature 031 sind die beiden
// Temperaturangaben vertauscht: Der Regler trägt die Temperatur, die
// Abweichung steht in der Erläuterung.
const erlaeuterungen = {
  qnh: await page.getByTestId('wetter-genauer-qnh').innerText(),
  isa: await page.getByTestId('wetter-genauer-temperatur').innerText(),
  wind: await page.getByTestId('wetter-genauer-wind').innerText()
};
pruefe(
  62,
  'die Erläuterungen nennen ungerundeten QNH, Platztemperatur, ISA-Abweichung, Windrichtung, Windgeschwindigkeit und Bahn',
  /1023,3\d? hPa/.test(erlaeuterungen.qnh) &&
    /gültig für/.test(erlaeuterungen.qnh) &&
    /ungerundet 29,2 °C/.test(erlaeuterungen.isa) &&
    new RegExp(`entspricht ISA 15,6${NBSP}°C`).test(erlaeuterungen.isa) &&
    /250°/.test(erlaeuterungen.wind) &&
    new RegExp(`12${NBSP}kt`).test(erlaeuterungen.wind) &&
    /Bahn 28/.test(erlaeuterungen.wind),
  JSON.stringify(erlaeuterungen)
);
await page.getByRole('button', { name: 'Abbrechen' }).click();

// 54: eine Größe außerhalb des Reglerbereichs sperrt IHRE Zeile, nicht den
// ganzen Abruf (FR-007). 20 kt aus 250° ergeben auf Bahn 10 −16,77 kt und
// damit −17 — jenseits der unteren Reglergrenze von −10 kt aus Feature 026.
await antwortMit({
  ...GUTE_ANTWORT,
  current: { ...GUTE_ANTWORT.current, wind_speed_10m: 20 }
});
await wetterKnopf.click();
await page.getByTestId('wetter-wert-qnh').waitFor({ timeout: 5000 });
await page.getByTestId('wetter-bahnwahl').getByRole('radio', { name: '10' }).check();
await page.getByTestId('wetter-hindernis-wind').waitFor({ timeout: 5000 });
const teilweise = {
  hindernis: await page.getByTestId('wetter-hindernis-wind').innerText(),
  windGesperrt: await page.getByTestId('wetter-haken-wind').isDisabled(),
  windAngehakt: await page.getByTestId('wetter-haken-wind').isChecked(),
  qnhAngehakt: await page.getByTestId('wetter-haken-qnh').isChecked(),
  isaAngehakt: await page.getByTestId('wetter-haken-temperatur').isChecked(),
  uebernehmenGesperrt: await uebernehmen.isDisabled()
};
pruefe(
  54,
  'ein Wert außerhalb des Reglerbereichs sperrt seine Zeile, die übrigen bleiben übernehmbar',
  teilweise.windGesperrt &&
    !teilweise.windAngehakt &&
    teilweise.qnhAngehakt &&
    teilweise.isaAngehakt &&
    !teilweise.uebernehmenGesperrt &&
    teilweise.hindernis.length > 10,
  JSON.stringify(teilweise)
);
await page.getByRole('button', { name: 'Abbrechen' }).click();

// 63: eine Antwort ohne Windfelder lässt QNH und ISA übernehmbar (FR-007)
await antwortMit({
  elevation: 296,
  current: { time: '2026-08-11T08:00', surface_pressure: 987.9, temperature_2m: 29.2 }
});
await wetterKnopf.click();
await page.getByTestId('wetter-hindernis-wind').waitFor({ timeout: 5000 });
const ohneWind = {
  qnhAngehakt: await page.getByTestId('wetter-haken-qnh').isChecked(),
  isaAngehakt: await page.getByTestId('wetter-haken-temperatur').isChecked(),
  windGesperrt: await page.getByTestId('wetter-haken-wind').isDisabled(),
  uebernehmenGesperrt: await uebernehmen.isDisabled()
};
pruefe(
  63,
  'eine Antwort ohne Wind sperrt allein den Pistenwind',
  ohneWind.qnhAngehakt &&
    ohneWind.isaAngehakt &&
    ohneWind.windGesperrt &&
    !ohneWind.uebernehmenGesperrt,
  JSON.stringify(ohneWind)
);
await page.getByRole('button', { name: 'Abbrechen' }).click();

// 51: ein Netzfehler führt zu einer Meldung und gesperrtem „Übernehmen"
netzfehlerErwartet = true;
await page.unroute(OPEN_METEO).catch(() => {});
await page.route(OPEN_METEO, (route) => route.abort('failed'));
await wetterKnopf.click();
await page.getByTestId('wetter-fehler').waitFor({ timeout: 5000 });
const fehlerText = await page.getByTestId('wetter-fehler').innerText();
pruefe(
  51,
  'ein Netzfehler zeigt eine Meldung, sperrt „Übernehmen" und bietet „Erneut versuchen"',
  fehlerText.length > 10 &&
    (await uebernehmen.isDisabled()) &&
    (await page.getByRole('button', { name: 'Erneut versuchen' }).count()) === 1,
  fehlerText
);

// 52: „Erneut versuchen" holt die Werte nach, ohne den Dialog zu schließen
await antwortMit(GUTE_ANTWORT);
await page.getByRole('button', { name: 'Erneut versuchen' }).click();
await page.getByTestId('wetter-wert-qnh').waitFor({ timeout: 5000 });
pruefe(
  52,
  '„Erneut versuchen" holt die Werte nach, ohne den Dialog zu schließen',
  (await page.locator('dialog[open]').count()) === 1 && !(await uebernehmen.isDisabled())
);
await page.getByRole('button', { name: 'Abbrechen' }).click();

// 53: eine unbrauchbare Antwort sieht aus wie gar keine
await antwortMit({ current: {} });
await wetterKnopf.click();
await page.getByTestId('wetter-fehler').waitFor({ timeout: 5000 });
pruefe(
  53,
  'eine unbrauchbare Antwort führt zum selben Bild wie ein Netzfehler',
  (await uebernehmen.isDisabled()) && (await page.getByTestId('wetter-fehler').count()) === 1
);
await page.getByRole('button', { name: 'Abbrechen' }).click();
await page.unroute(OPEN_METEO).catch(() => {});

// 55: die wichtigste Prüfung — ohne Netz bleibt die Seite vollständig nutzbar,
// und beim Laden geht keine einzige Anfrage an den Dienst hinaus (FR-017).
const fremdanfragen = [];
page.on('request', (anfrage) => {
  if (anfrage.url().includes('open-meteo.com')) fremdanfragen.push(anfrage.url());
});
await page.route('**://*.open-meteo.com/**', (route) => route.abort('failed'));
await page.goto(RECHNER, { waitUntil: 'networkidle' });
await fuellen(page, { dep: 971, cruise: 6000, dist: 200, power: 70, isa: 10, wind: 5 });
const ohneNetz = {
  anfragenBeimLaden: fremdanfragen.length,
  bedarf: await page.locator('#bedarf').innerText(),
  startstrecke: await page.locator('#startstrecke').innerText()
};
pruefe(
  55,
  'ohne erreichbaren Wetterdienst arbeitet die Seite vollständig, und beim Laden geht keine Anfrage hinaus',
  ohneNetz.anfragenBeimLaden === 0 &&
    /\d/.test(ohneNetz.bedarf) &&
    /\d/.test(ohneNetz.startstrecke),
  `Anfragen beim Laden: ${ohneNetz.anfragenBeimLaden}`
);
await page.unroute('**://*.open-meteo.com/**').catch(() => {});
netzfehlerErwartet = false;

// 56: die Kernaussage von Feature 026 -- die beiden Windgroessen beeinflussen
// einander nicht mehr (SC-002). Erst den Pistenwind bewegen, dann den
// Streckenwind; jedes Mal darf sich nur das zugehoerige Ergebnis ruehren.
await page.goto(RECHNER, { waitUntil: 'networkidle' });
await fuellen(page, { dep: 971, cruise: 4500, dist: 200, power: 70, isa: 10, wind: 10 });
const vorPistenwind = {
  start: await page.locator('#startstrecke .summe').innerText(),
  bedarf: await page.locator('#bedarf .summe').innerText()
};
await regler(page, 'Pistenwind (kt, positiv = Gegenwind)', 30);
await page.waitForTimeout(250);
const nachPistenwind = {
  start: await page.locator('#startstrecke .summe').innerText(),
  bedarf: await page.locator('#bedarf .summe').innerText()
};
await regler(page, 'Streckenwindkomponente (kt, positiv = Gegenwind)', -30);
await page.waitForTimeout(250);
const nachStreckenwind = {
  start: await page.locator('#startstrecke .summe').innerText(),
  bedarf: await page.locator('#bedarf .summe').innerText()
};
pruefe(
  56,
  'der Pistenwind ändert nur die Startstrecke, die Streckenwindkomponente nur den Bedarf',
  nachPistenwind.start !== vorPistenwind.start &&
    nachPistenwind.bedarf === vorPistenwind.bedarf &&
    nachStreckenwind.bedarf !== nachPistenwind.bedarf &&
    nachStreckenwind.start === nachPistenwind.start,
  `Start ${vorPistenwind.start.replace(/\s+/g, ' ')} -> ${nachPistenwind.start.replace(/\s+/g, ' ')} -> ${nachStreckenwind.start.replace(/\s+/g, ' ')}; Bedarf ${vorPistenwind.bedarf.replace(/\s+/g, ' ')} -> ${nachPistenwind.bedarf.replace(/\s+/g, ' ')} -> ${nachStreckenwind.bedarf.replace(/\s+/g, ' ')}`
);

// 57: bei gleichem Wert in beiden Reglern stehen dieselben Zahlen wie vor der
// Trennung (SC-003, FR-010). Die Sollwerte stammen aus dem Stand vor Feature
// 026 und wurden mit den Vorgabewerten der Oberflaeche ermittelt; weicht hier
// etwas ab, ist unterwegs eine Umrechnung entstanden, die es nicht geben darf.
//
// Seit Feature 041 haelt die Seite ihre Einstellungen fest. Fuer diese Pruefung
// muss der Speicher deshalb ausdruecklich geleert werden -- sonst stuenden hier
// die Werte der vorangegangenen Pruefungen statt der Ausgangswerte.
//
// Die Startstrecke steht seit Feature 031 auf 197 statt 198 m. Das ist keine
// Umrechnung, sondern eine andere Ausgangslage: Eingestellt wird jetzt die
// Temperatur in ganzen Grad, und bei der Platzdruckhoehe von 977,8 ft trifft
// keine ganze Zahl die frueheren ISA+10 genau -- 23 Grad ergeben ISA+9,94.
// Die Rollstrecke faellt damit von 197,57 auf 197,49 m und rundet auf die
// andere Seite. Bei *gleicher* Lage rechnet die Anwendung unveraendert
// (nachgewiesen in T002 der Feature-031-Aufgaben).
await page.evaluate(() => localStorage.clear());
await page.goto(RECHNER, { waitUntil: 'networkidle' });
await page.waitForTimeout(250);
const anfangsstand = {
  start: (await page.locator('#startstrecke .summe').innerText()).replace(/\s+/g, ' '),
  bedarf: (await page.locator('#bedarf .summe').innerText()).replace(/\s+/g, ' '),
  pistenwind: await page.locator('#pistenwind').inputValue(),
  streckenwind: await page.locator('#streckenwind').inputValue()
};
pruefe(
  57,
  'beide Regler stehen anfangs auf 10 kt und liefern die Zahlen des Stands vor der Trennung',
  anfangsstand.pistenwind === '10' &&
    anfangsstand.streckenwind === '10' &&
    /197\D*m/.test(anfangsstand.start) &&
    /310\D*m/.test(anfangsstand.start),
  JSON.stringify(anfangsstand)
);

/*
  Feature 031: die Aussentemperatur als Eingabegroesse, die Anordnung und die
  Bahnwahl in der Windzeile. Der Ausgangszustand ist der frisch geladene, den
  Pruefung 57 gerade hergestellt hat.
*/

// 64: die ISA-Abweichung steht als Folgezeile unter dem Temperaturregler und
// nennt eine Nachkommastelle -- sie ist der Beleg, mit dem der Pilot die
// Handbuchzeile findet (FR-002, FR-003, Prinzip I).
const ableitungAnfang = (await page.getByTestId('isa-ableitung').innerText()).trim();
pruefe(
  64,
  'unter dem Temperaturregler steht die abgeleitete ISA-Abweichung mit einer Nachkommastelle',
  (await page.locator('#temperatur').inputValue()) === '23' &&
    new RegExp(`ISA-Abweichung 9,9${NBSP}\u00b0C`).test(ableitungAnfang),
  ableitungAnfang
);

// 65: die Abweichung folgt der Temperatur mit der Steigung 1 -- ein Grad mehr
// am Regler ist ein Grad mehr Abweichung, solange die Hoehe steht.
await regler(page, 'Außentemperatur (°C)', 25);
const ableitungWaermer = (await page.getByTestId('isa-ableitung').innerText()).trim();
pruefe(
  65,
  'zwei Grad mehr am Regler sind zwei Grad mehr Abweichung',
  new RegExp(`ISA-Abweichung 11,9${NBSP}\u00b0C`).test(ableitungWaermer),
  ableitungWaermer
);

// 66: der Temperaturbereich wandert mit der Druckhoehe (FR-020). Ein fester
// Bereich waere oben zu weit und unten zu eng; hier steigt die Platzhoehe von
// 970 auf 6000 ft und der Bereich sinkt entsprechend um rund zehn Grad.
const bereichUnten = await page.evaluate(() => {
  const element = document.getElementById('temperatur');
  return { min: element.min, max: element.max };
});
await regler(page, 'Platzhöhe ASL (ft)', 6000);
const bereichOben = await page.evaluate(() => {
  const element = document.getElementById('temperatur');
  return { min: element.min, max: element.max };
});
pruefe(
  66,
  'der Temperaturbereich wandert mit der Platzhöhe',
  bereichUnten.min === '-16' &&
    bereichUnten.max === '53' &&
    bereichOben.min === '-26' &&
    bereichOben.max === '43',
  `${JSON.stringify(bereichUnten)} -> ${JSON.stringify(bereichOben)}`
);

// 67: die Hoehenaenderung verschiebt die Abweichung, ohne die eingestellte
// Temperatur anzutasten (FR-021). Die Temperatur ist eine Messung; sie darf
// nicht aus einer Reglerbewegung an anderer Stelle folgen -- dieselbe
// Trennung, die Feature 026 fuer die Winde herstellte.
const nachHoehenwechsel = {
  temperatur: await page.locator('#temperatur').inputValue(),
  ableitung: (await page.getByTestId('isa-ableitung').innerText()).trim()
};
pruefe(
  67,
  'ein Höhenwechsel lässt die Temperatur stehen und verschiebt nur die Abweichung',
  nachHoehenwechsel.temperatur === '25' &&
    new RegExp(`ISA-Abweichung 21,9${NBSP}\u00b0C`).test(nachHoehenwechsel.ableitung),
  JSON.stringify(nachHoehenwechsel)
);

// 68: die Anordnung -- beide Windregler stehen zuoberst in ihrem Bereich.
//
// Der Hoehenvergleich der beiden ist mit Feature 039 entfallen: Er ergab sich
// daraus, dass Startstrecke und Kraftstoffbedarf nebeneinander standen. Jetzt
// stehen sie untereinander, und "auf einer Hoehe" waere keine sinnvolle
// Forderung mehr. Die Stellung *innerhalb* des jeweiligen Bereichs bleibt
// gefordert (FR-016, FR-017).
await page.setViewportSize({ width: 1400, height: 1000 });
await page.waitForTimeout(150);
const anordnung = await page.evaluate(() => {
  const oben = (auswahl) => document.querySelector(auswahl).getBoundingClientRect().top;
  return {
    pistenwind: oben('#pistenwind'),
    bahn: oben('#startstrecke fieldset'),
    tabelle: oben('#startstrecke .aufschluesselung'),
    streckenwind: oben('#streckenwind'),
    strecke: oben('#strecke')
  };
});
pruefe(
  68,
  'beide Windregler stehen zuoberst in ihrem Bereich',
  anordnung.pistenwind < anordnung.bahn &&
    anordnung.streckenwind < anordnung.strecke &&
    // Im Querformat liegt die Tabelle neben dem Regler, nicht darunter.
    Math.abs(anordnung.pistenwind - anordnung.tabelle) < 60,
  JSON.stringify(anordnung)
);

// 69: Streckenlaenge und Streckenwind stehen untereinander, auch wenn Platz
// fuer zwei Spalten waere (FR-019). Verschiedene Einheiten bei fast
// gleichlautender Beschriftung liest man nebeneinander leicht am falschen.
pruefe(
  69,
  'Streckenwind und Streckenlänge stehen auch auf breiten Schirmen untereinander',
  anordnung.strecke - anordnung.streckenwind > 24,
  `${anordnung.streckenwind} -> ${anordnung.strecke}`
);

// 70: die Bahnwahl im Wetterdialog steht in der Windzeile und nirgends sonst
// (FR-012). Beim Luftdruck und bei der Temperatur ist die Bahn bedeutungslos.
await antwortMit(GUTE_ANTWORT);
await page.locator('#pistenwind').scrollIntoViewIfNeeded();
await wetterKnoepfe.last().click();
await page.getByTestId('wetter-wert-qnh').waitFor({ timeout: 5000 });
const bahnwahlSitzt = await page.evaluate(() => {
  const wahl = document.querySelector('[data-testid="wetter-bahnwahl"]');
  return {
    anzahl: document.querySelectorAll('[data-testid="wetter-bahnwahl"]').length,
    inWindzeile: wahl?.closest('[data-testid="wetter-zeile-wind"]') !== null
  };
});
pruefe(
  70,
  'die Bahnwahl steht genau einmal, und zwar in der Windzeile',
  bahnwahlSitzt.anzahl === 1 && bahnwahlSitzt.inWindzeile,
  JSON.stringify(bahnwahlSitzt)
);

// 71: der dritte Knopf oeffnet denselben Dialog wie der erste -- er setzt also
// nicht etwa nur den Wind. Die Windzeile traegt ausserdem den Hinweis auf die
// Vorzeichenrichtung, weil ein Vorzeichen allein nicht sagt, wohin es zeigt.
const windzeileText = (await page.getByTestId('wetter-zeile-wind').innerText()).trim();
pruefe(
  71,
  'der Knopf am Pistenwind öffnet denselben Dialog; die Windzeile nennt die Vorzeichenrichtung',
  (await page.getByTestId('wetter-zeile-qnh').count()) === 1 &&
    (await page.getByTestId('wetter-zeile-temperatur').count()) === 1 &&
    /positiv = Gegenwind/.test(windzeileText),
  windzeileText.split('\n')[0]
);

// 72: die Bahnwahl bleibt erreichbar, auch wenn der Wind auf der gewaehlten
// Bahn jenseits der Reglergrenze liegt. Haenge sie am Vorschlagswert, waere
// sie im selben Moment verschwunden -- eine Sackgasse ohne Rueckweg.
await page.getByRole('button', { name: 'Abbrechen' }).click();
await antwortMit({ ...GUTE_ANTWORT, current: { ...GUTE_ANTWORT.current, wind_speed_10m: 20 } });
await wetterKnoepfe.last().click();
await page.getByTestId('wetter-wert-qnh').waitFor({ timeout: 5000 });
await page.getByTestId('wetter-bahnwahl').getByRole('radio', { name: '10' }).check();
await page.getByTestId('wetter-hindernis-wind').waitFor({ timeout: 5000 });
const rueckweg = {
  wahlNochDa: await page.getByTestId('wetter-bahnwahl').count(),
  windGesperrt: await page.getByTestId('wetter-haken-wind').isDisabled()
};
await page.getByTestId('wetter-bahnwahl').getByRole('radio', { name: '28' }).check();
await page.waitForTimeout(150);
const zurueck = await page.getByTestId('wetter-haken-wind').isDisabled();
pruefe(
  72,
  'ein unmöglicher Wind sperrt die Zeile, lässt aber den Weg zur anderen Bahn offen',
  rueckweg.wahlNochDa === 1 && rueckweg.windGesperrt && !zurueck,
  JSON.stringify({ ...rueckweg, zurueck })
);
await page.getByRole('button', { name: 'Abbrechen' }).click();

// 73: ein Rueckenwind wird an beiden Stellen mit einem Warnzeichen kenntlich
// gemacht -- an der Bahn, auf der er von hinten kaeme, und beim Wert selbst,
// wenn genau diese Bahn gewaehlt ist. Der Wind aus 250 Grad kommt auf Bahn 28
// von vorn und auf Bahn 10 von hinten; anfangs ist Bahn 28 vorausgewaehlt.
await antwortMit(GUTE_ANTWORT);
await wetterKnoepfe.first().click();
await page.getByTestId('wetter-wert-qnh').waitFor({ timeout: 5000 });
const vorUmschalten = {
  bahn10: await page.getByTestId('wetter-rueckenwind-bahn-10').count(),
  bahn28: await page.getByTestId('wetter-rueckenwind-bahn-28').count(),
  amWert: await page.getByTestId('wetter-rueckenwind-wert').count()
};
await page.getByTestId('wetter-bahnwahl').getByRole('radio', { name: '10' }).check();
await page.waitForTimeout(150);
const nachUmschalten = {
  amWert: await page.getByTestId('wetter-rueckenwind-wert').count(),
  wert: (await page.getByTestId('wetter-wert-wind').innerText()).trim(),
  beschriftung: await page.getByTestId('wetter-rueckenwind-bahn-10').getAttribute('aria-label')
};
pruefe(
  73,
  'Rückenwind ist an der betroffenen Bahn und am Wert mit einem Warnzeichen versehen',
  vorUmschalten.bahn10 === 1 &&
    vorUmschalten.bahn28 === 0 &&
    vorUmschalten.amWert === 0 &&
    nachUmschalten.amWert === 1 &&
    nachUmschalten.wert === `-10${NBSP}kt` &&
    nachUmschalten.beschriftung === 'Rückenwind',
  JSON.stringify({ vorUmschalten, nachUmschalten })
);

// 77: das Warnzeichen steht links vom Wert. Rechts davon wanderte es beim
// Umschalten der Bahn mit, weil "-10 kt" breiter ist als "10 kt" -- die Zeile
// wuerde beim Vergleichen der beiden Bahnen unruhig. Geprueft an der Reihenfolge
// im Dokument, nicht an Pixeln: Das ist die Aussage, die halten soll.
const zeichenPosition = await page
  .getByTestId('wetter-wert-wind')
  .evaluate((wert) => {
    const zeichen = wert.parentElement?.querySelector('[data-testid="wetter-rueckenwind-wert"]');
    if (!zeichen) return 'kein Zeichen';
    // Node.DOCUMENT_POSITION_PRECEDING = 2: Das Zeichen steht vor dem Wert.
    return (wert.compareDocumentPosition(zeichen) & 2) === 2 ? 'davor' : 'dahinter';
  });
pruefe(
  77,
  'das Warnzeichen steht vor dem Wert, damit die Zahl beim Umschalten nicht wandert',
  zeichenPosition === 'davor',
  zeichenPosition
);
await page.getByRole('button', { name: 'Abbrechen' }).click();

// 74: der Bahnzustand steht als feststehende Zeile im Dialog -- angekuendigt,
// aber nicht abwaehlbar. Er ist keine Wetterangabe, sondern eine Eigenschaft
// des Platzes; ein Kaestchen haette ihn zur Ansichtssache gemacht.
await page.locator('#gras').uncheck();
await antwortMit(GUTE_ANTWORT);
await wetterKnoepfe.first().click();
await page.getByTestId('wetter-wert-qnh').waitFor({ timeout: 5000 });
const bahnzustandZeile = page.getByTestId('wetter-zeile-bahnzustand');
const bahnzustand = {
  vorhanden: await bahnzustandZeile.count(),
  kaestchen: await bahnzustandZeile.locator('input').count(),
  text: (await bahnzustandZeile.innerText()).replace(/\s+/g, ' ')
};
pruefe(
  74,
  'der Bahnzustand steht als feststehende, nicht abwählbare Zeile im Dialog',
  bahnzustand.vorhanden === 1 &&
    bahnzustand.kaestchen === 0 &&
    /trockenes Gras/.test(bahnzustand.text) &&
    /wird gesetzt/.test(bahnzustand.text),
  bahnzustand.text
);

// 75: „Abbrechen" laesst auch den Bahnzustand unberuehrt -- das ist der Weg
// fuer den, der ihn nicht mitgesetzt haben will.
await page.getByRole('button', { name: 'Abbrechen' }).click();
await page.waitForTimeout(150);
pruefe(
  75,
  '„Abbrechen" setzt den Bahnzustand nicht',
  !(await page.locator('#gras').isChecked())
);

// 76: der Knopf an der Platzhoehe kuendigt beide Werte an, die er setzt.
// Sichtbar traegt er nur „EDSH"; fuer Vorlesewerkzeuge ist die Beschriftung
// alles, was es gibt.
const platzKnopf = page.getByRole('button', { name: 'Platzhöhe und Bahnzustand von EDSH übernehmen' });
await platzKnopf.click();
await page.waitForTimeout(150);
pruefe(
  76,
  'der Platzknopf nennt beide Werte in seiner Beschriftung und setzt beide',
  (await platzKnopf.count()) === 1 &&
    (await page.locator('#gras').isChecked()) &&
    // Geprueft wird die Wertanzeige, nicht die Reglerstellung: Der Regler
    // rastet in 10-ft-Schritten und steht deshalb auf 970, waehrend gerechnet
    // wird mit den 971 ft, die der Knopf gesetzt hat.
    (await page.locator('#platzhoehe-wert').innerText()).trim() === `971${NBSP}ft`,
  (await page.locator('#platzhoehe-wert').innerText()).trim()
);
await page.locator('#gras').uncheck();

/*
  Feature 041: Die Seite behaelt ihre Einstellungen. Geprueft wird beides --
  dass die Werte ein Neuladen ueberstehen und dass ein gespeicherter Stand
  nichts durchlaesst, was ein Regler nicht hergaebe (FR-008, Prinzip I).
*/
await page.evaluate(() => localStorage.clear());
await page.goto(RECHNER, { waitUntil: 'networkidle' });
await page.waitForTimeout(200);

// 78: die eingestellten Werte ueberstehen das Neuladen
await regler(page, 'Platzhöhe ASL (ft)', 1200);
await regler(page, 'Lasteinstellung', 75);
await regler(page, 'Streckenlänge (NM)', 130);
await page.locator('#gras').check();
await page.waitForTimeout(250);
const vorNeuladen = {
  // Der Lasthebel rastet in festen Stufen: Gemerkt wird, wo er tatsaechlich
  // stehen bleibt, nicht, was angefragt wurde.
  last: await page.locator('#last').inputValue(),
  start: (await page.locator('#startstrecke .summe').innerText()).replace(/\s+/g, ' '),
  bedarf: (await page.locator('#bedarf .summe').innerText()).replace(/\s+/g, ' ')
};
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(250);
const nachNeuladen = {
  platzhoehe: await page.locator('#platzhoehe').inputValue(),
  last: await page.locator('#last').inputValue(),
  strecke: await page.locator('#strecke').inputValue(),
  gras: await page.locator('#gras').isChecked(),
  start: (await page.locator('#startstrecke .summe').innerText()).replace(/\s+/g, ' '),
  bedarf: (await page.locator('#bedarf .summe').innerText()).replace(/\s+/g, ' ')
};
pruefe(
  78,
  'Regler, Schalter und Ergebnisse stehen nach dem Neuladen unveraendert da',
  nachNeuladen.platzhoehe === '1200' &&
    nachNeuladen.last === vorNeuladen.last &&
    nachNeuladen.strecke === '130' &&
    nachNeuladen.gras &&
    nachNeuladen.start === vorNeuladen.start &&
    nachNeuladen.bedarf === vorNeuladen.bedarf,
  JSON.stringify(nachNeuladen)
);

// 79: ein Wert ausserhalb des Reglerbereichs wird verworfen, die uebrigen
// bleiben stehen -- ein gespeicherter Wert hat nie einen Regler durchlaufen
await page.evaluate(() => {
  const umschlag = JSON.parse(localStorage.getItem('bucky.einstellungen'));
  umschlag.stand.departureElevationFt = 99000;
  localStorage.setItem('bucky.einstellungen', JSON.stringify(umschlag));
});
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(250);
const nachUnsinn = {
  platzhoehe: await page.locator('#platzhoehe').inputValue(),
  strecke: await page.locator('#strecke').inputValue()
};
pruefe(
  79,
  'eine Platzhoehe ausserhalb des Reglerbereichs wird verworfen, die Strecke bleibt',
  nachUnsinn.platzhoehe === '970' && nachUnsinn.strecke === '130',
  JSON.stringify(nachUnsinn)
);

// 80: beschaedigter Speicher laesst die Seite anstandslos starten
await page.evaluate(() => localStorage.setItem('bucky.einstellungen', '{kein json'));
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(250);
pruefe(
  80,
  'beschaedigter Speicher fuehrt zu den Ausgangswerten statt zu einer leeren Seite',
  (await page.locator('#platzhoehe').inputValue()) === '970' &&
    (await page.locator('#startstrecke .summe').count()) === 1,
  await page.locator('#platzhoehe').inputValue()
);

// 81: ein alter Wetterabruf traegt die Alterswarnung, ein frischer nicht
await page.evaluate(() => localStorage.clear());
await antwortMit(GUTE_ANTWORT);
await page.goto(RECHNER, { waitUntil: 'networkidle' });
await wetterKnopf.click();
await page.getByTestId('wetter-wert-qnh').waitFor({ timeout: 5000 });
await uebernehmen.click();
await page.waitForTimeout(200);
const frischerVermerk = await page.getByTestId('qnh-herkunft').innerText();

await page.evaluate(() => {
  const umschlag = JSON.parse(localStorage.getItem('bucky.einstellungen'));
  const zweiStundenHer = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  for (const feld of ['qnhHerkunft', 'temperaturHerkunft', 'pistenwindHerkunft']) {
    umschlag.stand[feld].abgerufenAm = zweiStundenHer;
  }
  localStorage.setItem('bucky.einstellungen', JSON.stringify(umschlag));
});
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(250);
const alterVermerk = await page.getByTestId('qnh-herkunft').innerText();
pruefe(
  81,
  'ein ueber eine Stunde alter Abruf wird als veraltet gekennzeichnet, ein frischer nicht',
  /unverbindlich/.test(frischerVermerk) &&
    !/erneut abrufen/.test(frischerVermerk) &&
    /erneut abrufen/.test(alterVermerk) &&
    // Ohne Farbsehen erkennbar: Zeichen und Wortlaut, nicht bloss eine Farbe.
    alterVermerk.includes('\u26a0'),
  `frisch: ${frischerVermerk} | alt: ${alterVermerk}`
);

// 82: der Wert selbst bleibt dabei unangetastet (FR-007)
pruefe(
  82,
  'der veraltete Wert bleibt stehen und wird nicht zurueckgesetzt',
  (await page.locator('#qnh').inputValue()) === '1023',
  await page.locator('#qnh').inputValue()
);

await page.evaluate(() => localStorage.clear());

// --- Feature 043: Startseite, Flugzeug-Avatar und Umzug der Adressen ---

await page.goto(BASE, { waitUntil: 'networkidle' });

// 83: der Splash traegt Buckys Frage auch fuer alle, die das Bild nicht sehen
const splashText = await page.locator('img.splash').getAttribute('alt');
pruefe(
  83,
  'Splash ist da und seine Frage steht als Textalternative bereit (FR-001, FR-002)',
  await page.locator('img.splash').isVisible() &&
    /Hi Pilot/.test(splashText ?? '') &&
    /Windsack/.test(splashText ?? ''),
  splashText ?? '(kein Alternativtext)'
);

// 84: auf einem Telefonbildschirm steht der Avatar ohne Scrollen da (FR-004, SC-002)
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(150);
const avatarKasten = await page.locator('button.avatar').boundingBox();
pruefe(
  84,
  'Avatar ist auf 390x844 ohne Scrollen sichtbar',
  avatarKasten !== null && avatarKasten.y + avatarKasten.height <= 844,
  avatarKasten ? `Unterkante ${Math.round(avatarKasten.y + avatarKasten.height)} px` : 'nicht gefunden'
);

// 95: der Splash liegt buendig am Rand -- der Innenabstand der Seite gilt fuer
// alles andere, nicht fuer ihn
const splashKasten = await page.locator('img.splash').boundingBox();
pruefe(
  95,
  'der Splash reicht ohne weissen Rand bis an die Fensterkante',
  splashKasten !== null && splashKasten.x === 0 && Math.round(splashKasten.width) === 390,
  splashKasten ? `x ${splashKasten.x}, Breite ${Math.round(splashKasten.width)}` : 'nicht gefunden'
);

// 85: der Avatar ist rund, traegt einen Rahmen und nennt sein Kennzeichen
const avatarStil = await page.locator('button.avatar').evaluate((el) => {
  const s = getComputedStyle(el);
  return { radius: s.borderRadius, breite: s.borderTopWidth, farbe: s.borderTopColor };
});
pruefe(
  85,
  'Avatar ist rund, hat einen Rahmen und die Bildunterschrift D-EELK (FR-005, FR-006)',
  /50%/.test(avatarStil.radius) &&
    parseFloat(avatarStil.breite) >= 2 &&
    avatarStil.farbe !== 'rgba(0, 0, 0, 0)' &&
    (await page.locator('.kennzeichen').innerText()) === 'D-EELK',
  JSON.stringify(avatarStil)
);

// 86: das Menue erscheint erst auf Antippen und meldet seinen Zustand (FR-009)
pruefe(
  86,
  'ohne Antippen ist kein Menue offen',
  (await page.locator('[role="menu"]').count()) === 0 &&
    (await page.locator('button.avatar').getAttribute('aria-expanded')) === 'false'
);

await page.locator('button.avatar').click();
await page.locator('[role="menu"]').waitFor({ timeout: 3000 });
const eintraege = await page.locator('[role="menuitem"]').allInnerTexts();
pruefe(
  87,
  'Antippen oeffnet das Menue mit dem Eintrag POH-Rechner (FR-010)',
  eintraege.length === 1 &&
    eintraege[0] === 'POH-Rechner' &&
    (await page.locator('button.avatar').getAttribute('aria-expanded')) === 'true',
  eintraege.join(' | ')
);

// 94: das Menue bleibt im Fenster -- mittig unter dem Avatar gehaengt ragte es
// auf schmalen Schirmen links heraus, weil der erste Avatar am Seitenrand steht
const menueKasten = await page.locator('[role="menu"]').boundingBox();
pruefe(
  94,
  'das geoeffnete Menue liegt vollstaendig im Sichtfeld',
  menueKasten !== null && menueKasten.x >= 0 && menueKasten.x + menueKasten.width <= 390,
  menueKasten ? `${Math.round(menueKasten.x)} bis ${Math.round(menueKasten.x + menueKasten.width)} px` : 'nicht gefunden'
);

// 96: neben dem Avatar, wenn dort Platz ist -- wie ein Kontextmenue
const avatarKasten2 = await page.locator('button.avatar').boundingBox();
pruefe(
  96,
  'das Menue steht neben dem Avatar, solange daneben Platz ist',
  menueKasten !== null && avatarKasten2 !== null && menueKasten.x >= avatarKasten2.x + avatarKasten2.width,
  menueKasten && avatarKasten2
    ? `Avatar bis ${Math.round(avatarKasten2.x + avatarKasten2.width)} px, Menue ab ${Math.round(menueKasten.x)} px`
    : 'nicht gefunden'
);

// 97: wird es zu eng, weicht es nach unten aus, statt herauszuragen
await page.setViewportSize({ width: 260, height: 600 });
await page.waitForTimeout(200);
const engMenue = await page.locator('[role="menu"]').boundingBox();
const engAvatar = await page.locator('button.avatar').boundingBox();
pruefe(
  97,
  'auf 260 px weicht das Menue unter den Avatar aus und bleibt im Fenster',
  engMenue !== null &&
    engAvatar !== null &&
    engMenue.y >= engAvatar.y + engAvatar.height &&
    engMenue.x >= 0 &&
    engMenue.x + engMenue.width <= 260,
  engMenue ? `x ${Math.round(engMenue.x)} bis ${Math.round(engMenue.x + engMenue.width)}, y ${Math.round(engMenue.y)}` : 'nicht gefunden'
);
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(200);

// 88: die Reservierung taucht hier bewusst noch nicht auf (Out of Scope)
pruefe(
  88,
  'die Reservierung erscheint noch nicht',
  !/Reservierung/.test(await page.locator('main').innerText())
);

// 89: Escape schliesst und gibt den Fokus dorthin zurueck, wo er herkam (FR-011, FR-012)
await page.keyboard.press('Escape');
await page.waitForTimeout(150);
const fokusNachEscape = await page.evaluate(() => document.activeElement?.className ?? '');
pruefe(
  89,
  'Escape schliesst das Menue und der Fokus kehrt zum Avatar zurueck',
  (await page.locator('[role="menu"]').count()) === 0 && /avatar/.test(fokusNachEscape),
  fokusNachEscape
);

// 90: ein Klick daneben schliesst ebenfalls, ohne etwas auszuloesen (FR-011)
await page.locator('button.avatar').click();
await page.locator('[role="menu"]').waitFor({ timeout: 3000 });
await page.mouse.click(5, 5);
await page.waitForTimeout(150);
pruefe(
  90,
  'ein Klick neben das Menue schliesst es, ohne zu navigieren',
  (await page.locator('[role="menu"]').count()) === 0 && new URL(page.url()).pathname.replace(/\/$/, '') === new URL(BASE).pathname.replace(/\/$/, ''),
  page.url()
);

// 91: der ganze Weg zum Rechner ist mit der Tastatur begehbar (SC-001, SC-003)
await page.setViewportSize({ width: 1024, height: 1366 });
await page.locator('button.avatar').focus();
await page.keyboard.press('Enter');
await page.locator('[role="menuitem"]').first().waitFor({ timeout: 3000 });
await page.keyboard.press('Enter');
await page.getByRole('heading', { name: 'POH-Rechner D-EELK' }).waitFor({ timeout: 5000 });
pruefe(
  91,
  'Startseite zum Rechner: zwei Bedienschritte, allein mit der Tastatur',
  /\/d-eelk\/poh-rechner/.test(page.url()),
  page.url()
);

// 92: und wieder zurueck zur Auswahl, ohne die Zurueck-Taste des Browsers (FR-016)
await page.waitForLoadState('networkidle');
await page.getByRole('link', { name: 'Zurück zur Auswahl' }).first().click();
await page.locator('button.avatar').waitFor({ timeout: 5000 });
pruefe(92, 'Rueckweg vom Rechner zur Auswahl funktioniert', true);

// 93: alte Lesezeichen auf die Tabellenseite laufen nicht ins Leere (FR-014, SC-005)
await page.goto(`${BASE}/tabellen/`, { waitUntil: 'networkidle' });
await page.getByRole('heading', { name: 'Digitalisierte Tabellen der D-EELK' }).waitFor({ timeout: 8000 });
pruefe(
  93,
  'die alte Tabellenadresse fuehrt weiterhin zur Tabellenuebersicht',
  /d-eelk\/poh-rechner\/tabellen/.test(page.url()),
  page.url()
);

pruefe(10, 'keine Konsolenfehler im Browser', konsolenfehler.length === 0, konsolenfehler.join(' | '));

await browser.close();

const durchgefallen = befunde.filter((b) => !b.bestanden);
console.log(`\n${befunde.length} Prüfungen, ${durchgefallen.length} durchgefallen`);
process.exit(durchgefallen.length === 0 ? 0 : 1);
