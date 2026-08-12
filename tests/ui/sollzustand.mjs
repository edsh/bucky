/**
 * Zieht einen wortwoertlichen Abzug der Rechenergebnisse fuer einen festen Satz
 * Eingaben. Zweck ist der Vergleich zweier Ausliefer-Orte: derselbe Abzug wird
 * einmal gegen die alte und einmal gegen die neue Adresse gefahren, und beide
 * Ausgaben muessen Zeichen fuer Zeichen gleich sein (SC-001 in Feature 045).
 *
 * Der Klickpfad prueft, ob die Seite *funktioniert*; dieses Skript haelt fest,
 * *welche Zahlen* sie nennt. Beides zusammen deckt die Umstellung ab.
 *
 *   npm run build
 *   npx wrangler dev --config apps/web/wrangler.jsonc --port 8787
 *   PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --no-save playwright
 *   BASE=https://bucky.edsh.de node tests/ui/sollzustand.mjs > /tmp/alt.txt
 *   BASE=http://localhost:8787  node tests/ui/sollzustand.mjs > /tmp/neu.txt
 *   diff /tmp/alt.txt /tmp/neu.txt
 *
 * Bewusst ohne Wetterdienst: die Knoepfe „EDSH" holen Werte, die sich im
 * Minutentakt aendern — die waeren zwischen zwei Laeufen nie gleich. Alle
 * Eingaben werden deshalb von Hand gesetzt.
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:8787';
const RECHNER = `${BASE}/d-eelk/poh-rechner/`;

/**
 * Vier Eingabesaetze, die zusammen die Spannweite abdecken: tiefer und hoher
 * Platz, kalt und warm, Gegen- und Rueckenwind, beide Bahnen, beide
 * Bahnzustaende. Sie sind fest verdrahtet — ein Abzug, der sich zwischen zwei
 * Laeufen aendert, taugt nicht als Vergleichsgrundlage.
 */
const SAETZE = [
  { name: 'Standardtag, kurze Strecke', dep: 1000, cruise: 4000, qnh: 1013, dist: 100, power: 65, isa: 0, pistenwind: 10, streckenwind: 5, gras: false },
  { name: 'Heisser Hochsommertag', dep: 2500, cruise: 8000, qnh: 1005, dist: 350, power: 75, isa: 20, pistenwind: 0, streckenwind: 20, gras: true },
  { name: 'Kalter Wintertag, Rueckenwind', dep: 500, cruise: 3000, qnh: 1030, dist: 200, power: 55, isa: -20, pistenwind: -5, streckenwind: -10, gras: false },
  { name: 'Grenzfall oben', dep: 5000, cruise: 12000, qnh: 995, dist: 500, power: 80, isa: 10, pistenwind: 20, streckenwind: 15, gras: true }
];

async function regler(page, beschriftung, wert) {
  await page.getByLabel(beschriftung).evaluate((element, neu) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(element, String(neu));
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }, wert);
}

/**
 * Wie im Klickpfad: die Seite dient sich selbst als Umrechner von ISA-
 * Abweichung auf Aussentemperatur, statt die Normtemperaturformel ein zweites
 * Mal nachzubauen (Prinzip IV).
 */
async function setzeIsa(page, gewuenscht) {
  const probe = 20;
  await regler(page, 'Außentemperatur (°C)', probe);
  const angezeigt = (await page.getByTestId('isa-ableitung').innerText()).trim();
  const treffer = angezeigt.match(/(-?\d+(?:,\d+)?)/);
  if (!treffer) throw new Error(`ISA-Ableitung nicht lesbar: ${angezeigt}`);
  const ist = Number(treffer[1].replace(',', '.'));
  await regler(page, 'Außentemperatur (°C)', Math.round(probe + (gewuenscht - ist)));
}

const kanal = process.env.KLICKPFAD_BROWSER ?? 'msedge';
const browser = await chromium.launch(kanal === 'chromium' ? {} : { channel: kanal });
const page = await browser.newPage();
await page.goto(RECHNER, { waitUntil: 'networkidle' });

console.log(`# Abzug der Rechenergebnisse von ${BASE}`);

for (const satz of SAETZE) {
  await regler(page, 'Platzhöhe ASL (ft)', satz.dep);
  await regler(page, 'Reiseflughöhe ASL (ft)', satz.cruise);
  await regler(page, 'Luftdruck QNH (hPa)', satz.qnh);
  await regler(page, 'Streckenlänge (NM)', satz.dist);
  await regler(page, 'Lasteinstellung', satz.power);
  await setzeIsa(page, satz.isa);
  await regler(page, 'Pistenwind (kt, positiv = Gegenwind)', satz.pistenwind);
  await regler(page, 'Streckenwindkomponente (kt, positiv = Gegenwind)', satz.streckenwind);
  const grasKasten = page.locator('#gras');
  if ((await grasKasten.isChecked()) !== satz.gras) await grasKasten.setChecked(satz.gras);
  await page.waitForTimeout(250);

  const start = await page.locator('#startstrecke').innerText();
  const reiseflug = await page.locator('.reiseflug-bereich').innerText();

  console.log(`\n## ${satz.name}`);
  console.log(`Eingaben: ${JSON.stringify(satz)}`);
  console.log(start.trim());
  console.log(reiseflug.trim());
}

await browser.close();
