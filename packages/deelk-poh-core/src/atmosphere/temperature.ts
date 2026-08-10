import type { StandardSourceReference } from '../types.js';
import {
  ICAO_STANDARD_ATMOSPHERE_SOURCE,
  LAPSE_RATE_K_PER_FT,
  T0_K
} from './pressureAltitude.js';

/**
 * Herleitung der Umgebungstemperatur aus der ISA-Abweichung.
 *
 * Die Startstreckentabelle Abb. 5-1a ist nach der **tatsächlichen**
 * Umgebungstemperatur aufgeschlüsselt; die Oberfläche kennt bislang nur die
 * Abweichung von der Standardatmosphäre. Beides verbindet dieselbe Norm, aus
 * der auch die Druckhöhe stammt — deshalb liegt die Funktion hier und nicht im
 * Startstreckenmodul, und deshalb trägt sie eine Quellenreferenz mit
 * `kind: 'standard'` statt einer Seitenzahl (Constitution, Prinzip I).
 */

/** Nullpunkt der Celsius-Skala in K. */
const KELVIN_OFFSET = 273.15;

/**
 * Temperatur auf Meereshöhe der Standardatmosphäre in °C — aus `T0_K`
 * abgeleitet und nicht als 15 hingeschrieben, damit die Norm nur an einer
 * Stelle steht.
 */
const T0_C = T0_K - KELVIN_OFFSET;

/** Dieselbe Quelle wie die Druckhöhe; beide folgen derselben Norm. */
export const ISA_TEMPERATURE_SOURCE: StandardSourceReference = ICAO_STANDARD_ATMOSPHERE_SOURCE;

/** Ergebnis der Herleitung, mit den Eingangsgrößen zum Nachvollziehen. */
export interface OutsideAirTemperatureResult {
  /**
   * Die Druckhöhe, auf die sich die Temperatur bezieht — nicht die Höhe über
   * dem Meeresspiegel. So arbeiten Leistungstabellen durchweg, und nur so
   * passen Temperatur- und Höhenachse derselben Tabelle zusammen.
   */
  readonly pressureAltitudeFt: number;
  /** Die eingegebene Abweichung von der Standardatmosphäre in °C. */
  readonly isaDeviationC: number;
  /** Die Normtemperatur in dieser Druckhöhe in °C, ungerundet. */
  readonly standardTemperatureC: number;
  /** Normtemperatur plus Abweichung in °C, ungerundet. */
  readonly outsideAirTemperatureC: number;
}

/**
 * Rechnet Druckhöhe und ISA-Abweichung in die Umgebungstemperatur um, mit der
 * die Startstreckentabelle arbeitet.
 *
 * Prüft den Tabellenbereich **nicht** — das entscheidet
 * `computeTakeoffDistance`. So bleibt die Funktion auch für die reine Anzeige
 * brauchbar. Rundet nicht (C-03).
 */
export function toOutsideAirTemperature(
  pressureAltitudeFt: number,
  isaDeviationC: number
): OutsideAirTemperatureResult {
  const standardTemperatureC = T0_C - LAPSE_RATE_K_PER_FT * pressureAltitudeFt;
  return {
    pressureAltitudeFt,
    isaDeviationC,
    standardTemperatureC,
    outsideAirTemperatureC: standardTemperatureC + isaDeviationC
  };
}
