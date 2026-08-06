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

const BASE = 'http://localhost:8899';
const befunde = [];

function pruefe(nummer, beschreibung, bestanden, detail = '') {
  befunde.push({ nummer, beschreibung, bestanden, detail });
  console.log(`${bestanden ? 'OK  ' : 'FEHL'} ${nummer}: ${beschreibung}${detail ? ' — ' + detail : ''}`);
}

async function fuellen(page, werte) {
  await page.getByLabel('Druckhöhe Startplatz (ft)').fill(String(werte.dep));
  await page.getByLabel('Druckhöhe Reiseflug (ft)').fill(String(werte.cruise));
  await page.getByLabel('Streckenlänge (NM)').fill(String(werte.dist));
  await page.getByLabel('Lasteinstellung (%)').selectOption(String(werte.power));
  await page.getByLabel('ISA-Abweichung (°C)').fill(String(werte.isa));
  await page.getByLabel('Windkomponente (kt, positiv = Gegenwind)').fill(String(werte.wind));
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
await fuellen(page, { dep: 1000, cruise: 6000, dist: 400, power: 70, isa: 20, wind: 10 });
const start = Date.now();
await page.getByRole('button', { name: 'Berechnen' }).click();
await page.getByRole('heading', { name: 'Kraftstoffbedarf' }).waitFor({ timeout: 5000 });
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
await page.getByLabel('Lasteinstellung (%)').selectOption('80');
await page.getByRole('button', { name: 'Berechnen' }).click();
await page.getByRole('heading', { name: 'Kraftstoffbedarf' }).waitFor({ timeout: 5000 });
const hinweise = await page.locator('.hinweise').innerText();
pruefe(
  3,
  'über 75 % Last erzeugt den Hinweis, blockiert die Rechnung aber nicht',
  /75/.test(hinweise) && (await page.locator('.aufschluesselung').isVisible()),
  hinweise.split('\n')[0] ?? ''
);

// 5: Bedarf über der ausfliegbaren Menge ist deutlich sichtbar (FR-016)
await fuellen(page, { dep: 1000, cruise: 6000, dist: 900, power: 100, isa: 20, wind: 40 });
await page.getByRole('button', { name: 'Berechnen' }).click();
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
await page.getByRole('button', { name: 'Berechnen' }).click();
await page.getByRole('heading', { name: 'Kraftstoffbedarf' }).waitFor({ timeout: 5000 });
const details = page.locator('details').first();
await details.click();
await page.waitForTimeout(200);
const schritte = await page.locator('details li, details .schritt').count();
pruefe(6, 'Rechenweg lässt sich aufklappen und zeigt Schritte', schritte >= 13, `${schritte} Elemente`);

// Fehlerfall: Reiseflughöhe unter Platzhöhe
await fuellen(page, { dep: 6000, cruise: 2000, dist: 400, power: 70, isa: 0, wind: 0 });
await page.getByRole('button', { name: 'Berechnen' }).click();
await page.waitForTimeout(300);
const meldung = await page.locator('.fehler').innerText().catch(() => '');
pruefe(
  7,
  'Reiseflughöhe unter Platzhöhe zeigt die Meldung des Kerns',
  meldung.includes('Reiseflughöhe muss über der Platzhöhe liegen'),
  meldung
);

// Verweis auf die Tabellenseite
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

// Mobilgerät (FR-027) und Kennzeichnung als Druckhöhe (FR-024)
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(BASE, { waitUntil: 'networkidle' });
const beschriftungen = await page.locator('label').allInnerTexts();
const alleDruckhoehe = beschriftungen.filter((t) => t.includes('ft')).every((t) => t.includes('Druckhöhe'));
const ueberbreite = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
pruefe(11, 'Höhenfelder sind als Druckhöhe gekennzeichnet', alleDruckhoehe);
pruefe(12, 'kein waagerechtes Scrollen auf 390 px Breite', !ueberbreite);

pruefe(10, 'keine Konsolenfehler im Browser', konsolenfehler.length === 0, konsolenfehler.join(' | '));

await browser.close();

const durchgefallen = befunde.filter((b) => !b.bestanden);
console.log(`\n${befunde.length} Prüfungen, ${durchgefallen.length} durchgefallen`);
process.exit(durchgefallen.length === 0 ? 0 : 1);
