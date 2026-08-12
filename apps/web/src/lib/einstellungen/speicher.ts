import {
  getFuelPlanInputDomain,
  getOutsideAirTemperatureRange,
  getTakeoffInputDomain,
  toPressureAltitude,
  type NumericRange
} from '@edsh-bucky/deelk-poh-core';

/**
 * Der gesicherte Stand der Eingaben. Ein reines Datenmodul ohne Svelte-Bezug:
 * Das Sichern ist Sache dieses Zugangswegs und darf den Rechenkern nicht
 * berühren (Constitution, Prinzip IV) — umgekehrt holt es **alle**
 * Wertebereiche aus dem Kern und legt selbst keinen fest (Zusicherung C-05).
 */

/** Woher eine abgerufene Größe stammt, samt Zeitpunkt des Abrufs. */
export interface Herkunft {
  readonly dienst: string;
  readonly ort: string;
  readonly gueltigkeit: string;
  /**
   * Wann abgerufen wurde. Erst dieser Zeitpunkt macht die Alterung sichtbar:
   * Die Gültigkeit nennt die Stunde, für die der Dienst rechnet, nicht den
   * Moment, in dem der Pilot gefragt hat (FR-005).
   */
  readonly abgerufenAm: string;
}

/** Alles, was die Seite an Eingaben führt. */
export interface Stand {
  departureElevationFt: number;
  cruiseAltitudeAmslFt: number;
  qnhHpa: number;
  outsideAirTemperatureC: number;
  runwayWindComponentKt: number;
  routeWindComponentKt: number;
  distanceNm: number;
  powerSettingPct: number;
  dryGrassRunway: boolean;
  wetOrSnowRunway: boolean;
  qnhHerkunft?: Herkunft;
  temperaturHerkunft?: Herkunft;
  pistenwindHerkunft?: Herkunft;
}

const SCHLUESSEL = 'bucky.einstellungen';

/**
 * Die Kennung der Fassung. Sie wird erhöht, sobald ein gesicherter Stand
 * anders zu lesen wäre als bisher — etwa wenn eine Größe ihre Einheit
 * wechselt. Ein Stand mit fremder Kennung wird ganz verworfen (FR-009).
 *
 * Das Hinzukommen oder Wegfallen einzelner Felder verlangt **keine** Erhöhung:
 * Jedes Feld wird ohnehin einzeln geprüft, Unbekanntes fällt weg, Fehlendes
 * behält seinen Ausgangswert.
 */
const FASSUNG = 1;

interface Umschlag {
  fassung: number;
  stand: unknown;
}

/**
 * Der Speicher, sofern der Browser einen hergibt. In einem privaten Fenster
 * oder bei gesperrtem Speicher wirft bereits der Zugriff auf `localStorage` —
 * deshalb der Versuch samt Fangarm und nicht bloß eine Abfrage auf
 * `undefined`. Ohne Speicher läuft die Seite normal weiter, nur ohne
 * Gedächtnis (FR-010).
 */
function speicher(): Storage | undefined {
  try {
    return globalThis.localStorage ?? undefined;
  } catch {
    return undefined;
  }
}

function istZahlImBereich(wert: unknown, bereich: NumericRange): wert is number {
  return (
    typeof wert === 'number' &&
    Number.isFinite(wert) &&
    wert >= bereich.min &&
    wert <= bereich.max
  );
}

function istHerkunft(wert: unknown): wert is Herkunft {
  if (typeof wert !== 'object' || wert === null) return false;
  const h = wert as Record<string, unknown>;
  return (
    typeof h.dienst === 'string' &&
    typeof h.ort === 'string' &&
    typeof h.gueltigkeit === 'string' &&
    typeof h.abgerufenAm === 'string' &&
    Number.isFinite(Date.parse(h.abgerufenAm))
  );
}

/**
 * Liest den gesicherten Stand und ergänzt alles, was nicht zweifelsfrei
 * brauchbar ist, aus den übergebenen Ausgangswerten. Jedes Feld wird einzeln
 * geprüft: Ein unbrauchbares Feld verwirft nicht den ganzen Stand, sondern nur
 * sich selbst (FR-009).
 *
 * Die Bereichsprüfung ist die sicherheitsrelevante Stelle dieses Moduls
 * (FR-008): Ein Wert aus dem Speicher hat nie eine Reglerbewegung durchlaufen
 * und könnte sonst außerhalb der Handbuchtabellen wirksam werden (Prinzip I).
 *
 * Die Ausgangswerte kommen von der Seite und stehen nicht hier: Sonst gäbe es
 * sie zweimal, und zwei Wahrheiten laufen früher oder später auseinander.
 */
export function ladeStand(standard: Stand): Stand {
  const s = speicher();
  if (!s) return { ...standard };

  let umschlag: Umschlag;
  try {
    const roh = s.getItem(SCHLUESSEL);
    if (roh === null) return { ...standard };
    umschlag = JSON.parse(roh) as Umschlag;
  } catch {
    return { ...standard };
  }

  if (typeof umschlag !== 'object' || umschlag === null || umschlag.fassung !== FASSUNG) {
    return { ...standard };
  }
  if (typeof umschlag.stand !== 'object' || umschlag.stand === null) {
    return { ...standard };
  }
  const gelesen = umschlag.stand as Record<string, unknown>;

  const domain = getFuelPlanInputDomain();
  const stand: Stand = { ...standard };

  const zahl = (
    feld: 'departureElevationFt' | 'cruiseAltitudeAmslFt' | 'qnhHpa' | 'outsideAirTemperatureC' | 'runwayWindComponentKt' | 'routeWindComponentKt' | 'distanceNm' | 'powerSettingPct',
    bereich: NumericRange
  ): void => {
    if (istZahlImBereich(gelesen[feld], bereich)) stand[feld] = gelesen[feld];
  };

  zahl('departureElevationFt', domain.departureElevationFt);
  zahl('cruiseAltitudeAmslFt', domain.cruiseAltitudeAmslFt);
  zahl('qnhHpa', domain.qnhHpa);
  zahl('runwayWindComponentKt', getTakeoffInputDomain().windComponentKt);
  zahl('routeWindComponentKt', domain.windComponentKt);
  zahl('distanceNm', domain.distanceNm);
  zahl('powerSettingPct', domain.powerSettingPct);

  /*
    Die Temperatur zuletzt und gesondert: Ihr Bereich haengt an der
    Platzdruckhoehe und damit an zwei Werten, die gerade erst geprueft wurden.
    Geprueft wird gegen die Hoehe, die nach dem Laden tatsaechlich gilt --
    sonst kaeme eine Temperatur durch, die nur zur *alten* Hoehe passte.
  */
  zahl(
    'outsideAirTemperatureC',
    getOutsideAirTemperatureRange(
      toPressureAltitude(stand.departureElevationFt, stand.qnhHpa).pressureAltitudeFt
    )
  );

  for (const feld of ['dryGrassRunway', 'wetOrSnowRunway'] as const) {
    const wert = gelesen[feld];
    if (typeof wert === 'boolean') stand[feld] = wert;
  }

  for (const feld of ['qnhHerkunft', 'temperaturHerkunft', 'pistenwindHerkunft'] as const) {
    const wert = gelesen[feld];
    if (istHerkunft(wert)) stand[feld] = wert;
  }

  return stand;
}

/**
 * Sichert den Stand. Fehlschläge bleiben still: Ein voller oder gesperrter
 * Speicher ist nichts, was der Pilot beheben könnte, und eine Meldung stünde
 * mitten in einer Flugvorbereitung (FR-010).
 */
export function sichereStand(stand: Stand): void {
  const s = speicher();
  if (!s) return;
  try {
    s.setItem(SCHLUESSEL, JSON.stringify({ fassung: FASSUNG, stand } satisfies Umschlag));
  } catch {
    // absichtlich folgenlos
  }
}

/**
 * Ab wann ein Herkunftsvermerk als veraltet gilt. Bewusst streng: Das ist
 * keine fachliche Gültigkeitsdauer, sondern der Punkt, ab dem ein Hinweis mehr
 * nützt als stört (FR-006).
 */
export const VERALTET_AB_MS = 60 * 60 * 1000;

/**
 * Wie weit ein Abruf in der Zukunft liegen darf, ohne als verdächtig zu
 * gelten. Die Spanne fängt zwei harmlose Fälle ab: eine leicht nachgehende
 * Uhr und den Umstand, dass der Vergleichszeitpunkt im Minutentakt nachgeführt
 * wird und daher kurz älter sein kann als ein eben erfolgter Abruf.
 */
const UHRTOLERANZ_MS = 5 * 60 * 1000;

/**
 * Ob ein Vermerk als veraltet zu kennzeichnen ist. Ein Abruf, der deutlich in
 * der Zukunft läge — verstellte Uhr —, gilt ebenfalls als veraltet: Im
 * Zweifel warnen, nie verschweigen.
 */
export function istVeraltet(herkunft: Herkunft, jetzt: number): boolean {
  const alter = jetzt - Date.parse(herkunft.abgerufenAm);
  return !Number.isFinite(alter) || alter < -UHRTOLERANZ_MS || alter > VERALTET_AB_MS;
}
