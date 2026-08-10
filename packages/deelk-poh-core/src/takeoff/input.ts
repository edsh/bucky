import { z } from 'zod';
import type { NumericRange } from '../types.js';
import type { PressureAltitudeResult } from '../atmosphere/pressureAltitude.js';
import type { OutsideAirTemperatureResult } from '../atmosphere/temperature.js';
import { getFuelPlanInputDomain } from '../fuel/input.js';
import { getTable, TAKEOFF_TABLE_ID } from '../tables.js';

/**
 * Eingabe und Wertebereiche der Startstreckenrechnung.
 *
 * Druckhöhe und Umgebungstemperatur kommen als fertige Ergebnisobjekte **von
 * außen** in das Modul: Sie tragen ihre Eingangsgrößen bei sich, und nur
 * dadurch kann die Rechnung ihre Herleitung ausweisen, ohne sie selbst
 * vorzunehmen (FR-009).
 */

/** Achse der Druckhöhe in der Startstreckentabelle. */
export const PRESSURE_ALTITUDE_KEY = 'pressure_altitude_ft';

/** Achse der Umgebungstemperatur in der Startstreckentabelle. */
export const OAT_KEY = 'oat_c';

/**
 * Rückenwind über 10 kt deckt Anmerkung 2 nicht mehr ab. Die Zahl steht im
 * Wortlaut der Anmerkung („bei Rückenwind bis 10 Knoten"); sie hier zu
 * wiederholen ist unvermeidlich, weil aus einem Satz kein Zahlenwert
 * maschinell zu gewinnen ist. Der Wortlaut selbst wird trotzdem aus der
 * Tabellendatei gelesen und nicht nachgedichtet.
 */
export const MAX_TAILWIND_KT = 10;

/** Zustand der Bahn, wie ihn die Anmerkungen 3 und 4 beschreiben. */
export interface RunwaySurfaceInput {
  /** Anmerkung 3: trockene Grasbahn. */
  readonly dryGrassRunway: boolean;
  /** Anmerkung 4: feuchte Grasbahn, aufgeweichter Untergrund oder Schnee. */
  readonly wetOrSnowRunway: boolean;
}

export interface TakeoffDistanceInput extends RunwaySurfaceInput {
  readonly pressureAltitude: PressureAltitudeResult;
  readonly outsideAirTemperature: OutsideAirTemperatureResult;
  /** Windkomponente in kt; positiv = Gegenwind, negativ = Rückenwind. */
  readonly windComponentKt: number;
}

/** Die Wertebereiche der Startstrecke. */
export interface TakeoffInputDomain {
  readonly pressureAltitudeFt: NumericRange;
  readonly outsideAirTemperatureC: NumericRange;
  readonly windComponentKt: NumericRange;
}

/** Ein Achsenraster der Startstreckentabelle als Bereich. */
function axisRange(key: string, unit: string, step: number): NumericRange {
  const values = [
    ...new Set(getTable(TAKEOFF_TABLE_ID).rows.map((row) => row[key] as number))
  ].sort((a, b) => a - b);
  return {
    min: values[0] as number,
    max: values[values.length - 1] as number,
    unit,
    step
  };
}

/**
 * Die Grenzen der Startstreckentabelle, aus dem Raster abgeleitet und nicht
 * als Literale hingeschrieben — so folgen sie einer geänderten Digitalisierung
 * von selbst.
 *
 * Sie stehen **neben** `getFuelPlanInputDomain()` und verengen dieses nicht:
 * Der Kraftstoffbedarf bleibt über den gesamten bisherigen Reglerbereich
 * rechenbar, auch wo die Startstreckentabelle früher endet (FR-020). Ein
 * Fehler im einen Bereich darf den anderen nicht mitreißen.
 */
export function getTakeoffInputDomain(): TakeoffInputDomain {
  return {
    pressureAltitudeFt: axisRange(PRESSURE_ALTITUDE_KEY, 'ft', 100),
    outsideAirTemperatureC: axisRange(OAT_KEY, '°C', 1),
    windComponentKt: {
      // Gegenwind reicht so weit wie bisher; nur der Rückenwind endet dort,
      // wo Anmerkung 2 endet.
      min: -MAX_TAILWIND_KT,
      max: getFuelPlanInputDomain().windComponentKt.max,
      unit: 'kt',
      step: 1
    }
  };
}

const pressureAltitudeSchema = z.object({
  elevationFt: z.number().finite(),
  qnhHpa: z.number().finite(),
  pressureAltitudeFt: z.number().finite()
});

const outsideAirTemperatureSchema = z.object({
  pressureAltitudeFt: z.number().finite(),
  isaDeviationC: z.number().finite(),
  standardTemperatureC: z.number().finite(),
  outsideAirTemperatureC: z.number().finite()
});

export const takeoffDistanceSchema = z.object({
  pressureAltitude: pressureAltitudeSchema,
  outsideAirTemperature: outsideAirTemperatureSchema,
  windComponentKt: z.number().finite(),
  dryGrassRunway: z.boolean(),
  wetOrSnowRunway: z.boolean()
});
