import type { NumericRange, StandardSourceReference } from '../types.js';
import { PohCalculationError } from '../errors.js';
import { floorHectopascal } from '../format.js';
import {
  BAROMETRIC_EXPONENT,
  ICAO_STANDARD_ATMOSPHERE_SOURCE,
  LAPSE_RATE_K_PER_FT,
  T0_K
} from './pressureAltitude.js';

/**
 * Herleitung des QNH aus dem Luftdruck, der in einer bekannten Höhe
 * tatsächlich herrscht.
 *
 * Die Umkehrung von `toPressureAltitude` und deshalb hier daneben: dieselbe
 * Norm, dieselben Konstanten, derselbe Exponent. Eine zweite Formel darf es
 * nicht geben (Constitution, Prinzip IV) — ein Rundlauftest hält beide
 * Richtungen gegeneinander (C-08).
 *
 *     QNH = p_stat / (1 − L·h/T₀)^5,25588
 *
 * Das ist genau die Umstellung der Beziehung, die `toPressureAltitude` bereits
 * dokumentiert; `P0_HPA` kommt darin nicht vor, weil der Standarddruck sich
 * beim Auflösen heraushebt.
 */

/** Dieselbe Quelle wie die Druckhöhe; beide folgen derselben Norm. */
export const QNH_SOURCE: StandardSourceReference = ICAO_STANDARD_ATMOSPHERE_SOURCE;

/**
 * Gültigkeitsbereich der Troposphärenformel in ft — **keine** Tabellengrenze.
 * Er schützt vor einer Höhe, bei der die Formel still Unsinn liefern würde
 * (FR-023): Unterhalb −2 000 ft und oberhalb 30 000 ft beschreibt der lineare
 * Temperaturgradient die Atmosphäre nicht mehr.
 */
const ELEVATION_RANGE_FT: NumericRange = { min: -2000, max: 30000, step: 1, unit: 'ft' };

/** Ergebnis der Herleitung, mit den Eingangsgrößen zum Nachvollziehen. */
export interface QnhResult {
  /** Der Luftdruck, wie er in der Höhe unten herrscht, in hPa. */
  readonly stationPressureHpa: number;
  /** Die Höhe, auf die sich dieser Druck bezieht, in ft. */
  readonly elevationFt: number;
  /** Der hergeleitete QNH in hPa, ungerundet. */
  readonly qnhHpa: number;
  /**
   * Derselbe Wert, auf ganze hPa **abgerundet** — der einzige Wert, den ein
   * Höhenmesser oder der Regler der Oberfläche annehmen kann.
   *
   * Gerundet wird in `format.ts` und nur dort (C-03); die Begründung für das
   * Abrunden steht bei `floorHectopascal`.
   */
  readonly settableQnhHpa: number;
}

function requireFiniteNumber(value: number, field: string): void {
  if (!Number.isFinite(value)) {
    throw new PohCalculationError('INVALID_INPUT', 'Der Wert ist keine gültige Zahl.', {
      field,
      actual: value
    });
  }
}

/**
 * Rechnet den in einer bekannten Höhe herrschenden Luftdruck über die
 * Standardatmosphäre auf Meereshöhe zurück.
 *
 * Prüft den Reglerbereich (950–1050 hPa) **nicht** — das entscheidet die
 * Oberfläche, so wie `toPressureAltitude` den Tabellenbereich nicht prüft.
 * Kennt keinen Platz, keine Koordinaten und keinen Onlinedienst: Sie bekommt
 * zwei Zahlen und bleibt damit für sich prüfbar.
 */
export function toQnh(stationPressureHpa: number, elevationFt: number): QnhResult {
  requireFiniteNumber(stationPressureHpa, 'stationPressureHpa');
  if (stationPressureHpa <= 0) {
    throw new PohCalculationError(
      'INVALID_INPUT',
      'Ein Luftdruck von null oder weniger ergibt keinen Sinn.',
      { field: 'stationPressureHpa', actual: stationPressureHpa }
    );
  }

  requireFiniteNumber(elevationFt, 'elevationFt');
  if (elevationFt < ELEVATION_RANGE_FT.min || elevationFt > ELEVATION_RANGE_FT.max) {
    throw new PohCalculationError(
      'OUT_OF_RANGE',
      'Die Höhe liegt außerhalb des Bereichs, in dem die barometrische Höhenformel der Troposphäre gilt.',
      { field: 'elevationFt', actual: elevationFt, allowedRange: ELEVATION_RANGE_FT }
    );
  }

  const qnhHpa = stationPressureHpa / (1 - (LAPSE_RATE_K_PER_FT * elevationFt) / T0_K) ** BAROMETRIC_EXPONENT;

  return {
    stationPressureHpa,
    elevationFt,
    qnhHpa,
    settableQnhHpa: floorHectopascal(qnhHpa)
  };
}
