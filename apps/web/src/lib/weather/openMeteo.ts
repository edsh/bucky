import { EDSH, elevationM, type EdshPlatz } from './edsh.js';

/**
 * Zugang zum Wetterdienst Open-Meteo.
 *
 * Zerfällt bewusst in drei Teile: zwei reine Funktionen, die sich ohne Netz
 * prüfen lassen, und eine dünne Hülle darum, die nichts weiter tut als
 * `fetch`. Gerechnet wird hier **nichts** — die Umrechnung in den QNH macht
 * der Kern (Zusicherung W-01, W-02).
 *
 * Warum ausgerechnet dieser Dienst: Die Seite läuft als statisches Bündel ohne
 * eigenen Server, der Abruf muss also aus dem Browser des Piloten hinausgehen.
 * Von den geprüften Quellen erlaubt allein Open-Meteo das (CORS); DWD,
 * aviationweather.gov und die NOAA-Textdateien blockieren es (research.md R2).
 */

/** Name und Verweis für die Namensnennung, die CC-BY 4.0 verlangt (FR-010). */
export const DIENST = {
  name: 'Open-Meteo',
  url: 'https://open-meteo.com/'
} as const;

const ENDPUNKT = 'https://api.open-meteo.com/v1/forecast';

/** Was der Dienst geliefert hat — roh, ungerechnet. */
export interface WetterAbruf {
  /** `surface_pressure` aus der Antwort in hPa: der Druck in der Höhe unten. */
  readonly stationPressureHpa: number;
  /** Die Höhe in m, auf die der Dienst diesen Druck bezieht. */
  readonly elevationM: number;
  /**
   * Der Zeitpunkt, für den der Wert **gilt** — nicht der einer Beobachtung.
   * Die Werte stammen aus dem Rechenmodell ICON-D2, nicht von einer
   * Messstation am Platz (research.md R3, R5).
   */
  readonly gueltigkeit: string;
  /**
   * `temperature_2m` in °C, sofern der Dienst sie geliefert hat. Optional,
   * weil eine fehlende Temperatur den Abruf nicht wertlos macht: Der QNH
   * kommt trotzdem an (FR-016).
   */
  readonly temperatureC?: number;
  /**
   * Wind in 10 m über Grund, sofern **beides** vorliegt. Richtung und
   * Geschwindigkeit stehen zusammen in einem Feld, weil eine Richtung ohne
   * Geschwindigkeit — und umgekehrt — keine Pistenwindkomponente ergibt; zwei
   * getrennte optionale Felder machten einen halb belegten Zustand
   * darstellbar, den es fachlich nicht gibt.
   *
   * `fromDegTrue` ist die Richtung, **aus** der es weht, rechtweisend.
   */
  readonly wind?: { readonly fromDegTrue: number; readonly speedKt: number };
  /** Name und Verweis des Dienstes für die Namensnennung. */
  readonly dienst: typeof DIENST;
}

/**
 * Baut die Adresse der Anfrage. Rein — damit sich ohne Netz prüfen lässt, dass
 * die richtigen Größen angefordert werden.
 *
 * `elevation` wird **ausdrücklich** mitgegeben. Ohne diesen Parameter zieht der
 * Dienst die Höhe aus einem eigenen Geländemodell und liefert für dieselbe
 * Stelle einen anderen Bezugswert (305 m statt 296 m) — der Druck bezöge sich
 * dann auf eine andere Höhe als die, mit der die Oberfläche weiterrechnet
 * (research.md R6).
 */
export function baueAnfrage(platz: EdshPlatz = EDSH): URL {
  const url = new URL(ENDPUNKT);
  url.searchParams.set('latitude', String(platz.latitude));
  url.searchParams.set('longitude', String(platz.longitude));
  url.searchParams.set('elevation', String(elevationM(platz)));
  // Vier Größen in einer Anfrage: Der Dienst liefert sie in derselben Antwort
  // und damit zum selben Gültigkeitszeitpunkt — ein zweiter Abruf könnte eine
  // andere Modellstunde erwischen und Werte mischen, die nicht zusammengehören.
  url.searchParams.set(
    'current',
    'surface_pressure,temperature_2m,wind_speed_10m,wind_direction_10m'
  );
  // Die Einheit wird **angefordert**, nicht hinterher umgerechnet. Eine eigene
  // Umrechnung km/h → kt wäre eine Rechnung im Adapter (Prinzip IV) und
  // zugleich eine stille Fehlerquelle: Bliebe das Feld einmal auf km/h stehen,
  // sähe eine Zahl wie 22 weiterhin wie ein plausibler Wind aus. Kommt die
  // Einheit falsch zurück, fällt der Wind stattdessen weg (research.md R7).
  url.searchParams.set('wind_speed_unit', 'kn');
  url.searchParams.set('timezone', 'UTC');
  return url;
}

/** Fehlschlag des Abrufs. Für den Piloten ist jeder Anlass derselbe (FR-015). */
export class WetterAbrufFehler extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'WetterAbrufFehler';
  }
}

function istEndlicheZahl(wert: unknown): wert is number {
  return typeof wert === 'number' && Number.isFinite(wert);
}

/**
 * Prüft und übersetzt die Antwort. Rein — der ganze Teil, bei dem etwas
 * schiefgehen kann, ohne dass ein Netz im Spiel wäre.
 *
 * Geprüft wird nur, ob die Felder **da** und deutbar sind — nicht, ob der Wert
 * plausibel ist. Eine eigene Druckschranke wäre eine zweite Grenze neben der,
 * die der Kern über den Reglerbereich ohnehin zieht (Zusicherung C-05): Ein
 * unsinniger Druck führt dort zu einem QNH außerhalb von 950–1050 hPa und
 * damit zu einem gesperrten „Übernehmen".
 *
 * `pressure_msl` wird **nicht** gelesen. Es ist QFF, nicht QNH: auf
 * Meereshöhe reduziert mit der *tatsächlichen* Temperatur statt mit der
 * Normatmosphäre. In der Platzhöhe von EDSH trennen beide Größen bis zu
 * 3 hPa — rund 80 ft Druckhöhe (research.md R4). Ein Feld, das man
 * versehentlich benutzen kann, wird deshalb gar nicht erst durchgereicht.
 */
export function deuteAntwort(rohdaten: unknown): WetterAbruf {
  if (typeof rohdaten !== 'object' || rohdaten === null) {
    throw new WetterAbrufFehler('Die Antwort des Wetterdienstes ist unbrauchbar.');
  }

  const { current, current_units: einheiten, elevation } = rohdaten as {
    current?: {
      surface_pressure?: unknown;
      time?: unknown;
      temperature_2m?: unknown;
      wind_speed_10m?: unknown;
      wind_direction_10m?: unknown;
    };
    current_units?: { wind_speed_10m?: unknown };
    elevation?: unknown;
  };

  if (typeof current !== 'object' || current === null) {
    throw new WetterAbrufFehler('Die Antwort des Wetterdienstes enthält keine aktuellen Werte.');
  }

  const druck = current.surface_pressure;
  if (!istEndlicheZahl(druck) || druck <= 0) {
    // Null ist hier kein unplausibler, sondern ein unmöglicher Wert und in
    // aller Regel das Zeichen für ein fehlendes Feld. Das ist keine eigene
    // Grenze im Sinne von C-05, sondern dasselbe Kriterium, das auch der Kern
    // anlegt — nur früh genug, um eine verständliche Meldung zu geben.
    throw new WetterAbrufFehler('Die Antwort des Wetterdienstes enthält keinen Luftdruck.');
  }
  const zeit = current.time;
  if (typeof zeit !== 'string' || Number.isNaN(Date.parse(zeit))) {
    throw new WetterAbrufFehler('Die Antwort des Wetterdienstes enthält keine deutbare Zeit.');
  }

  if (!istEndlicheZahl(elevation)) {
    throw new WetterAbrufFehler(
      'Die Antwort des Wetterdienstes nennt keine Höhe, auf die sich der Druck bezieht.'
    );
  }

  // Ab hier gilt die umgekehrte Regel: Temperatur und Wind sind **Beiwerk**.
  // Fehlen sie oder sind sie nicht deutbar, fallen sie still weg, statt den
  // ganzen Abruf zu Fall zu bringen (FR-016). Der Pilot bekommt dann eben nur
  // den QNH — das ist mehr als nichts und genau das, was die Oberfläche mit
  // einer weggelassenen Zeile abbildet.
  const temperatur = current.temperature_2m;
  const temperatureC = istEndlicheZahl(temperatur) ? temperatur : undefined;

  const windRichtung = current.wind_direction_10m;
  const windGeschwindigkeit = current.wind_speed_10m;
  // Die Einheit wird gegengeprüft, obwohl sie angefordert wurde. Ohne diese
  // Prüfung machte ein stillschweigend auf km/h zurückgefallener Dienst aus
  // 22 km/h einen Wind von 22 kt — mehr als das Doppelte, und die Zahl sähe
  // dabei völlig unverdächtig aus.
  const einheitStimmt = einheiten?.wind_speed_10m === 'kn';
  const wind =
    einheitStimmt &&
    istEndlicheZahl(windRichtung) &&
    istEndlicheZahl(windGeschwindigkeit) &&
    windGeschwindigkeit >= 0
      ? { fromDegTrue: windRichtung, speedKt: windGeschwindigkeit }
      : undefined;

  return {
    stationPressureHpa: druck,
    elevationM: elevation,
    gueltigkeit: zeit,
    ...(temperatureC === undefined ? {} : { temperatureC }),
    ...(wind === undefined ? {} : { wind }),
    dienst: DIENST
  };
}

/**
 * Die dünne Hülle: holt und deutet. Rechnet nichts.
 *
 * Das Abbruchsignal gibt der Aufrufer vor, damit derselbe Abbruch sowohl die
 * Zeitüberschreitung als auch das Schließen des Dialogs abdeckt (FR-013,
 * FR-018). Jeder Fehlschlag — Netzfehler, Abbruch, unbrauchbare Antwort —
 * verlässt die Funktion als `WetterAbrufFehler`: Für den Piloten ist eine
 * unbrauchbare Antwort dasselbe wie keine (FR-015).
 */
export async function holeWetter(
  platz: EdshPlatz = EDSH,
  signal?: AbortSignal
): Promise<WetterAbruf> {
  let rohdaten: unknown;
  try {
    const antwort = await fetch(baueAnfrage(platz), signal === undefined ? {} : { signal });
    if (!antwort.ok) {
      throw new WetterAbrufFehler(
        `Der Wetterdienst antwortete mit dem Status ${antwort.status}.`
      );
    }
    rohdaten = await antwort.json();
  } catch (fehler) {
    if (fehler instanceof WetterAbrufFehler) {
      throw fehler;
    }
    throw new WetterAbrufFehler('Der Wetterdienst ist nicht erreichbar.', { cause: fehler });
  }

  return deuteAntwort(rohdaten);
}
