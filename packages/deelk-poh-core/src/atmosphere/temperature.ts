import type { NumericRange, StandardSourceReference } from '../types.js';
import { PohCalculationError } from '../errors.js';
import { ceilInward, floorInward, roundCelsius } from '../format.js';
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

/**
 * Der Bereich, in dem sich die Abweichung von der Standardatmosphäre bewegen
 * darf. Keine Tabellengrenze, sondern eine Festlegung der Spezifikation.
 *
 * Steht hier und nicht mehr bei den Eingabegrenzen der Kraftstoffrechnung, wo
 * er ursprünglich lag. Zwei Gründe, die in dieselbe Richtung zeigen: Er ist
 * eine Aussage über die Atmosphäre und nicht über einen Kraftstoffbedarf, und
 * `getOutsideAirTemperatureRange` weiter unten braucht ihn. Andersherum ginge
 * es nicht — `fuel/input.ts` importiert bereits aus diesem Verzeichnis, ein
 * Import zurück ergäbe einen Ringschluss.
 */
export const ISA_DEVIATION_RANGE: NumericRange = { min: -30, max: 40, unit: '°C', step: 1 };

/**
 * Die Normtemperatur einer Druckhöhe in °C. Die eine Stelle, an der diese
 * Formel steht — beide Umrechnungsrichtungen und der Bereichsrechner greifen
 * hierauf zu, damit es keine zweite Normtemperatur geben kann (Prinzip IV).
 */
function standardTemperatureAt(pressureAltitudeFt: number): number {
  return T0_C - LAPSE_RATE_K_PER_FT * pressureAltitudeFt;
}

/**
 * Die Anschläge eines Temperaturreglers in einer gegebenen Druckhöhe.
 *
 * Anders als die ISA-Abweichung hat eine Außentemperatur keinen festen
 * Bereich: Sie ist Normtemperatur plus Abweichung und wandert deshalb mit der
 * Höhe. In Meereshöhe sind −15…55 °C rechenbar, in 10 000 ft dagegen
 * −34…35 °C. Ein fester Bereich wäre in beide Richtungen falsch — unten böte
 * er zu wenig an, oben zu viel, und im zweiten Fall liefe der Pilot in einen
 * Fehler, den ihm der Regler hätte ersparen können.
 *
 * Abgeleitet aus `ISA_DEVIATION_RANGE` und nicht daneben gestellt: Es gibt
 * weiterhin genau eine Stelle, an der die Grenzen stehen.
 *
 * Gerundet wird **nach innen**, damit die tragende Zusicherung an beiden Enden
 * hält: Jeder ganzzahlige Wert innerhalb des zurückgegebenen Bereichs ergibt
 * eine Abweichung innerhalb von `ISA_DEVIATION_RANGE`.
 *
 * Prüft die Druckhöhe selbst **nicht** — wie `toOutsideAirTemperature` auch.
 */
export function getOutsideAirTemperatureRange(pressureAltitudeFt: number): NumericRange {
  const standardTemperatureC = standardTemperatureAt(pressureAltitudeFt);
  return {
    min: ceilInward(standardTemperatureC + ISA_DEVIATION_RANGE.min),
    max: floorInward(standardTemperatureC + ISA_DEVIATION_RANGE.max),
    unit: '°C',
    step: 1
  };
}

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
  const standardTemperatureC = standardTemperatureAt(pressureAltitudeFt);
  return {
    pressureAltitudeFt,
    isaDeviationC,
    standardTemperatureC,
    outsideAirTemperatureC: standardTemperatureC + isaDeviationC
  };
}

/** Ergebnis der Umkehrung, mit den Eingangsgrößen zum Nachvollziehen. */
export interface IsaDeviationResult {
  /** Die Druckhöhe, auf die sich die Temperatur bezieht, in ft. */
  readonly pressureAltitudeFt: number;
  /** Die gemessene Umgebungstemperatur in °C. */
  readonly outsideAirTemperatureC: number;
  /** Die Normtemperatur in dieser Druckhöhe in °C, ungerundet. */
  readonly standardTemperatureC: number;
  /** Temperatur minus Normtemperatur in °C, ungerundet. */
  readonly isaDeviationC: number;
  /**
   * Derselbe Wert auf ganze °C gerundet — der einzige, den der Regler der
   * Oberfläche annehmen kann. Ein Rechen-, kein Anzeigewert.
   *
   * Gerundet wird in `format.ts` und nur dort (C-03); die Begründung für das
   * kaufmännische statt gerichtete Runden steht bei `roundCelsius`.
   */
  readonly settableIsaDeviationC: number;
}

/**
 * Die Umkehrung von `toOutsideAirTemperature`: aus einer gemessenen Temperatur
 * und der Druckhöhe, in der sie gilt, die Abweichung von der Standardatmosphäre.
 *
 *     ΔISA = OAT − (T₀ − L·h)
 *
 * Steht bewusst in derselben Datei wie die Hinrichtung und verwendet dieselben
 * Konstanten: Eine zweite Normtemperatur darf es nicht geben (Prinzip IV). Ein
 * Rundlauftest hält beide Richtungen gegeneinander.
 *
 * Gebraucht wird sie, weil die Oberfläche keinen Temperaturregler führt,
 * sondern einen für die Abweichung — ein Wetterdienst liefert aber eine
 * absolute Temperatur.
 *
 * Prüft den Reglerbereich **nicht**, so wie `toQnh` den QNH-Bereich nicht
 * prüft. Rundet nicht selbst (C-03).
 */
export function toIsaDeviation(
  pressureAltitudeFt: number,
  outsideAirTemperatureC: number
): IsaDeviationResult {
  requireFiniteNumber(pressureAltitudeFt, 'pressureAltitudeFt');
  requireFiniteNumber(outsideAirTemperatureC, 'outsideAirTemperatureC');

  const standardTemperatureC = standardTemperatureAt(pressureAltitudeFt);
  const isaDeviationC = outsideAirTemperatureC - standardTemperatureC;

  return {
    pressureAltitudeFt,
    outsideAirTemperatureC,
    standardTemperatureC,
    isaDeviationC,
    settableIsaDeviationC: roundCelsius(isaDeviationC)
  };
}

function requireFiniteNumber(value: number, field: string): void {
  if (!Number.isFinite(value)) {
    throw new PohCalculationError('INVALID_INPUT', 'Der Wert ist keine gültige Zahl.', {
      field,
      actual: value
    });
  }
}
