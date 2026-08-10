import type { StandardSourceReference } from '../types.js';

/**
 * Umrechnung von Höhe über dem Meeresspiegel in Druckhöhe.
 *
 * Diese Größe stammt als einzige im Kern **nicht** aus dem Flughandbuch,
 * sondern aus einer Norm. Deshalb liegt sie neben `fuel/` und nicht darin, und
 * deshalb trägt sie eine Quellenreferenz mit `kind: 'standard'` statt einer
 * Seitenzahl (Constitution, Prinzip I).
 */

/** Temperatur auf Meereshöhe der Standardatmosphäre in K. */
export const T0_K = 288.15;

/** Temperaturgradient der Troposphäre in K/m. */
const LAPSE_RATE_K_PER_M = 0.0065;

/** Standarddruck auf Meereshöhe in hPa. */
const P0_HPA = 1013.25;

/**
 * Exponent der barometrischen Höhenformel, g·M/(R·L). Der Rückweg verwendet
 * seinen Kehrwert — als Literal 0,190263 geschrieben wäre die Probe bei
 * 18 000 ft nur auf 0,01 ft genau statt exakt.
 */
const BAROMETRIC_EXPONENT = 5.25588;

const M_PER_FT = 0.3048;

/** Temperaturgradient je Fuß, damit gar nicht erst in Meter gewechselt wird. */
export const LAPSE_RATE_K_PER_FT = LAPSE_RATE_K_PER_M * M_PER_FT;

/** Höhe der Troposphärenskala T₀/L in ft. */
const SCALE_HEIGHT_FT = T0_K / LAPSE_RATE_K_PER_FT;

export const ICAO_STANDARD_ATMOSPHERE_SOURCE: StandardSourceReference = {
  kind: 'standard',
  standard: 'ICAO Doc 7488, Manual of the ICAO Standard Atmosphere, 3. Auflage 1993',
  formula:
    'p = QNH · (1 − L·h/T₀)^5,25588; H_p = (T₀/L) · (1 − (p/1013,25)^(1/5,25588)) mit T₀ = 288,15 K und L = 0,0065 K/m',
  citation:
    'ICAO Doc 7488, Manual of the ICAO Standard Atmosphere (extended to 80 kilometres), 3. Auflage 1993 — barometrische Höhenformel der Troposphäre. Diese Umrechnung stammt nicht aus dem Flughandbuch der D-EELK.'
};

/** Ergebnis der Umrechnung, mit den Eingangsgrößen zum Nachvollziehen. */
export interface PressureAltitudeResult {
  /** Die eingegebene Höhe über dem Meeresspiegel in ft. */
  readonly elevationFt: number;
  /** Der verwendete Luftdruck in hPa. */
  readonly qnhHpa: number;
  /** Die errechnete Druckhöhe in ft, ungerundet. */
  readonly pressureAltitudeFt: number;
}

/**
 * Rechnet eine Höhe über dem Meeresspiegel bei gegebenem QNH in die Druckhöhe
 * um, mit der die Tabellen des Handbuchs arbeiten.
 *
 * Prüft den Tabellenbereich **nicht** — das entscheidet `computeFuelPlan`. So
 * bleibt die Funktion auch für die reine Anzeige brauchbar. Rundet nicht (C-03).
 */
export function toPressureAltitude(elevationFt: number, qnhHpa: number): PressureAltitudeResult {
  // Druckverhältnis QNH zu Standarddruck, auf die Höhenachse übertragen. Der
  // Exponent MUSS der Kehrwert von BAROMETRIC_EXPONENT sein, nicht das
  // gerundete Literal 0,190263 — sonst ist die Probe bei 18 000 ft nur auf
  // 0,01 ft genau.
  const ratio = (qnhHpa / P0_HPA) ** (1 / BAROMETRIC_EXPONENT);

  // Ausmultiplizierte Form von H_p = (T₀/L)·(1 − (1 − L·h/T₀)·ratio). Beide
  // Formen sind algebraisch gleich; nur diese ist bei Standarddruck auch
  // numerisch exakt. Die naheliegende Schreibweise enthält die Differenz
  // 1 − (1 − x) und verliert dabei Stellen: 7000 ft wurden dort zu
  // 6999,999999999992 ft. Wenige Picofuß sind physikalisch bedeutungslos,
  // verschieben aber eine Höhe, die genau auf einer Stützstelle liegt, in das
  // Nachbarintervall der Tabelle — und damit die verwendeten Eckwerte.
  const pressureAltitudeFt = elevationFt * ratio + SCALE_HEIGHT_FT * (1 - ratio);

  return { elevationFt, qnhHpa, pressureAltitudeFt };
}
