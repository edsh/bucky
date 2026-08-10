/**
 * Klickpfad durch die Weboberflaeche. Bewusst kein Teil von `npx vitest run`:
 * er braucht einen gebauten Bundle, einen laufenden Webserver und einen echten
 * Browser. So wird er ausgefuehrt:
 *
 *   npm run build
 *   python3 -m http.server 8899 --directory apps/web/build &
 *   PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --no-save playwright
 *   node tests/ui/klickpfad.mjs
 *
 * Playwright steht bewusst nicht in den Manifesten des Projekts, damit es
 * weder die Installation noch die CI belastet; `--no-save` laesst package.json
 * und die Lockdatei unberuehrt. Der Browser wird ueber `channel: 'msedge'` aus
 * dem System genommen, statt ihn zu laden — deshalb der uebersprungene
 * Browser-Download.
 */
import { chromium } from 'playwright';

// Standardmaessig gegen den lokal ausgelieferten Bundle; mit BASE laesst sich
// stattdessen die veroeffentlichte Seite pruefen, etwa
// BASE=https://edsh.github.io/bucky node tests/ui/klickpfad.mjs
const BASE = process.env.BASE ?? 'http://localhost:8899';
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

async function fuellen(page, werte) {
  await regler(page, 'Platzhöhe ASL (ft)', werte.dep);
  await regler(page, 'Reiseflughöhe ASL (ft)', werte.cruise);
  await regler(page, 'Luftdruck QNH (hPa)', werte.qnh ?? 1013);
  await regler(page, 'Streckenlänge (NM)', werte.dist);
  await regler(page, 'Lasteinstellung', werte.power);
  await regler(page, 'ISA-Abweichung (°C)', werte.isa);
  await regler(page, 'Windkomponente (kt, positiv = Gegenwind)', werte.wind);
  // Gerechnet wird bei jeder Bewegung; ein Lidschlag reicht fuer den Durchlauf.
  await page.waitForTimeout(150);
}

const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage();
const konsolenfehler = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') konsolenfehler.push(msg.text());
});
page.on('pageerror', (error) => konsolenfehler.push(String(error)));

await page.goto(BASE, { waitUntil: 'networkidle' });

// 1: gültiges Flugvorhaben liefert zügig ein Ergebnis (SC-001)
const start = Date.now();
await fuellen(page, { dep: 1000, cruise: 6000, dist: 400, power: 70, isa: 20, wind: 10 });
await page.getByRole('heading', { name: 'Kraftstoffbedarf und Geschwindigkeiten' }).waitFor({ timeout: 5000 });
const dauerMs = Date.now() - start;
pruefe(1, 'gültiges Flugvorhaben liefert ein Ergebnis', dauerMs < 2000, `${dauerMs} ms`);

// 2: Seitenzahl, Tabellenname und Prüfhinweis sichtbar, ohne Aufklappen (SC-002)
const quellen = page.locator('.quellen');
const quellentext = await quellen.innerText();
const hinweisSichtbar = await page.locator('.pruefhinweis').isVisible();
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
const hinweise = await page.locator('.hinweise').innerText();
pruefe(
  3,
  'über 75 % Last erzeugt den Hinweis, blockiert die Rechnung aber nicht',
  /75/.test(hinweise) && (await page.locator('.aufschluesselung').isVisible()),
  hinweise.split('\n')[0] ?? ''
);

// 5: Bedarf über der ausfliegbaren Menge ist deutlich sichtbar (FR-016)
await fuellen(page, { dep: 1000, cruise: 6000, dist: 750, power: 100, isa: 20, wind: 40 });
await page.waitForTimeout(300);
const warnung = page.locator('.vergleich.warnung');
const warnungSichtbar = await warnung.isVisible().catch(() => false);
const fehlermeldung = await page.locator('.fehler').innerText().catch(() => '');
pruefe(
  5,
  'Bedarf über der ausfliegbaren Menge ist deutlich sichtbar',
  warnungSichtbar,
  warnungSichtbar ? (await warnung.innerText()).split('\n')[0] : `stattdessen: ${fehlermeldung}`
);

// Rechenweg aufklappbar (US2)
await fuellen(page, { dep: 1000, cruise: 6000, dist: 400, power: 70, isa: 20, wind: 10 });
await page.getByRole('heading', { name: 'Kraftstoffbedarf und Geschwindigkeiten' }).waitFor({ timeout: 5000 });
const details = page.locator('details').first();
await details.click();
await page.waitForTimeout(200);
const schritte = await page.locator('details li, details .schritt').count();
pruefe(6, 'Rechenweg lässt sich aufklappen und zeigt Schritte', schritte >= 13, `${schritte} Elemente`);

// Fehlerfall: Reiseflughöhe unter Platzhöhe
await fuellen(page, { dep: 6000, cruise: 2000, dist: 400, power: 70, isa: 0, wind: 0 });
await page.waitForTimeout(300);
const meldung = await page.locator('.fehler').innerText().catch(() => '');
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

await page.getByRole('link', { name: 'Zurück zum Kraftstoffrechner' }).click();
await page.getByRole('heading', { name: 'Kraftstoffrechner D-EELK' }).waitFor({ timeout: 5000 });
pruefe(9, 'Rückweg zum Rechner funktioniert', true);

// 13: stufenlose Eingaben sind Schieberegler mit Wertanzeige (FR-001, FR-013)
const reglerZahl = await page.locator('input[type="range"]').count();
const zahlenfelder = await page.locator('input[type="number"], input[type="text"]').count();
const ausgaben = await page.locator('output').count();
// Die Grenzen stammen aus getFuelPlanInputDomain(); hier stehen sie als
// erwarteter Aushang, damit ein stilles Abweichen der Oberflaeche auffaellt.
const erwarteteGrenzen = {
  last: { min: '50', max: '100', step: '10' },
  platzhoehe: { min: '0', max: '10000', step: '10' },
  reiseflughoehe: { min: '0', max: '18000', step: '100' },
  qnh: { min: '950', max: '1050', step: '1' },
  strecke: { min: '1', max: '750', step: '1' },
  isa: { min: '-30', max: '40', step: '1' },
  wind: { min: '-50', max: '50', step: '1' }
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
  'sieben Schieberegler mit Wertanzeige und den Grenzen des Rechenkerns',
  reglerZahl === 7 && ausgaben === 7 && zahlenfelder === 0 && grenzenStimmen,
  `${reglerZahl} Regler, ${ausgaben} Anzeigen, ${zahlenfelder} Zahlenfelder, Grenzen ${grenzenStimmen ? 'wie erwartet' : JSON.stringify(grenzen)}`
);

// 14: Regler ist mit der Tastatur bedienbar und die Anzeige folgt (FR-013)
const streckenregler = page.getByLabel('Streckenlänge (NM)');
await streckenregler.focus();
const vorher = await page.locator('#strecke-wert').innerText();
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(150);
const nachher = await page.locator('#strecke-wert').innerText();
const summeNachTaste = await page.locator('.gesamt, .summe').first().innerText().catch(() => '');
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
await page.getByRole('button', { name: 'EDSH' }).click();
await page.waitForTimeout(150);
const platzWert = await page.locator('#platzhoehe-wert').innerText();
const platzFolge = await page.locator('#platzhoehe').locator('..').locator('.folge').innerText();
pruefe(
  18,
  'Schnellwahl EDSH setzt die Platzhöhe auf 971 ft',
  platzWert.includes('971') && /≙ Druckhöhe/.test(platzFolge),
  `${platzWert} — ${platzFolge}`
);

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

// 21: die Uebersicht steht zwischen den beiden Eingabegruppen und zeigt vier Werte
await fuellen(page, { dep: 1000, cruise: 6000, qnh: 1013, dist: 400, power: 70, isa: 10, wind: 10 });
const reihenfolge = await page.evaluate(() => {
  const marken = [...document.querySelectorAll('legend, .uebersicht h2')].map((e) => e.textContent.trim());
  return marken;
});
const uebersichtWerte = await page.locator('.uebersicht .werte > div').count();
pruefe(
  21,
  'die Übersicht steht zwischen Grundbedingungen und Vorhaben und zeigt fünf Werte',
  reihenfolge[0].startsWith('Grundbedingungen') &&
    /Reichweite und Flugdauer/.test(reihenfolge[1]) &&
    reihenfolge[2].startsWith('Streckenflug') &&
    uebersichtWerte === 5,
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

// 23: Strecke und Wind lassen die Uebersicht unberuehrt, aendern aber den Bedarf
const uebersichtVorher = await page.locator('.uebersicht .werte').innerText();
const summeVorher = await page.locator('.summe').innerText();
await regler(page, 'Streckenlänge (NM)', 250);
await regler(page, 'Windkomponente (kt, positiv = Gegenwind)', -20);
await page.waitForTimeout(200);
const uebersichtNachher = await page.locator('.uebersicht .werte').innerText();
const summeNachher = await page.locator('.summe').innerText();
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
const druckmeldung = await page.locator('.fehler').innerText().catch(() => '');
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
await page.goto(BASE, { waitUntil: 'networkidle' });
const beschriftungen = await page.locator('label').allInnerTexts();
const hoehenfelder = beschriftungen.filter((t) => t.includes('(ft)'));
const alleAsl = hoehenfelder.length === 2 && hoehenfelder.every((t) => t.includes('ASL') && !t.includes('Druckhöhe'));
const ueberbreite = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
pruefe(11, 'Höhenfelder sind als Höhe ASL gekennzeichnet, nicht als Druckhöhe', alleAsl, hoehenfelder.join(' | '));
pruefe(12, 'kein waagerechtes Scrollen auf 390 px Breite', !ueberbreite);

// 26: Verbrauch je Seemeile in der Übersicht (Issue #12)
await page.setViewportSize({ width: 1024, height: 800 });
await page.goto(BASE, { waitUntil: 'networkidle' });
await fuellen(page, { dep: 1000, cruise: 6000, qnh: 1013, dist: 250, power: 70, isa: 0, wind: 0 });
const uebersichtWerteText = await page.locator('.uebersicht .werte').innerText();
pruefe(
  26,
  'die Übersicht nennt den Verbrauch je Seemeile in beiden Einheiten',
  /Verbrauch je Seemeile/.test(uebersichtWerteText) &&
    /0,\d{2}\u00a0l\/NM/.test(uebersichtWerteText) &&
    /US\u00a0gal\/NM/.test(uebersichtWerteText),
  uebersichtWerteText.replace(/\s+/g, ' ')
);

// 27: Zahl und Einheit haengen zusammen (Issue #13)
const trennbar = await page.evaluate(() => {
  const text = document.body.innerText;
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

pruefe(10, 'keine Konsolenfehler im Browser', konsolenfehler.length === 0, konsolenfehler.join(' | '));

await browser.close();

const durchgefallen = befunde.filter((b) => !b.bestanden);
console.log(`\n${befunde.length} Prüfungen, ${durchgefallen.length} durchgefallen`);
process.exit(durchgefallen.length === 0 ? 0 : 1);
