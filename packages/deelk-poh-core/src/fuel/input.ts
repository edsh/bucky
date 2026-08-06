import { z } from 'zod';
import type { InputDomain, NumericRange, PowerSettingAvailability } from '../types.js';
import { PohCalculationError, outOfRange } from '../errors.js';
import { CLIMB_TABLE_ID, CRUISE_TABLE_ID, getTable } from '../tables.js';

/** Das vom Piloten erfasste Flugvorhaben. Alle Felder sind Pflicht (FR-008). */
export interface FlightPlanInput {
  /** Druckhöhe des Startplatzes in ft. */
  readonly departureAltitudeFt: number;
  /** Druckhöhe des Reiseflugs in ft. */
  readonly cruiseAltitudeFt: number;
  /** Gesamtflugstrecke in NM. */
  readonly distanceNm: number;
  /** Lasteinstellung in Prozent. */
  readonly powerSettingPct: number;
  /** Abweichung von der ISA-Temperatur in °C. */
  readonly isaDeviationC: number;
  /** Windkomponente in kt, positiv = Gegenwind. */
  readonly windComponentKt: number;
}

/**
 * Grenzen, die nicht aus den Tabellen ablesbar sind, sondern in der
 * Spezifikation stehen (`data-model.md`, Abschnitt Flugvorhaben).
 */
const DISTANCE_RANGE: NumericRange = { min: 0, max: Number.POSITIVE_INFINITY, unit: 'NM' };
const ISA_DEVIATION_RANGE: NumericRange = { min: -30, max: 40, unit: '°C' };
const WIND_COMPONENT_RANGE: NumericRange = { min: -50, max: 50, unit: 'kt' };

const flightPlanSchema = z.object({
  departureAltitudeFt: z.number().finite(),
  cruiseAltitudeFt: z.number().finite(),
  distanceNm: z.number().finite(),
  powerSettingPct: z.number().finite(),
  isaDeviationC: z.number().finite(),
  windComponentKt: z.number().finite()
});

/** Das Höhenraster einer Tabelle, aufsteigend und ohne Wiederholungen. */
function pressureAltitudes(tableId: string): readonly number[] {
  const values = new Set<number>();
  for (const row of getTable(tableId).rows) {
    const altitude = row['pressure_altitude_ft'];
    if (typeof altitude === 'number') {
      values.add(altitude);
    }
  }
  return [...values].sort((a, b) => a - b);
}

/**
 * Die je Druckhöhe belegten Lasteinstellungen der Reiseleistungstabelle.
 * Abgeleitet, nicht fest verdrahtet: ändert sich die Datengrundlage, ändert
 * sich das Raster mit.
 */
export function getPowerSettingsByPressureAltitude(): readonly PowerSettingAvailability[] {
  const byAltitude = new Map<number, Set<number>>();
  for (const row of getTable(CRUISE_TABLE_ID).rows) {
    const altitude = row['pressure_altitude_ft'];
    const power = row['power_setting_pct'];
    if (typeof altitude !== 'number' || typeof power !== 'number') {
      continue;
    }
    const settings = byAltitude.get(altitude) ?? new Set<number>();
    settings.add(power);
    byAltitude.set(altitude, settings);
  }
  return [...byAltitude.entries()]
    .sort(([a], [b]) => a - b)
    .map(([pressureAltitudeFt, settings]) => ({
      pressureAltitudeFt,
      powerSettingsPct: [...settings].sort((a, b) => a - b)
    }));
}

/** Gemeinsames Höhenraster von Steigflug- und Reiseleistungstabelle. */
function altitudeRange(): NumericRange {
  const climb = pressureAltitudes(CLIMB_TABLE_ID);
  const cruise = pressureAltitudes(CRUISE_TABLE_ID);
  const min = Math.max(climb[0] as number, cruise[0] as number);
  const max = Math.min(climb[climb.length - 1] as number, cruise[cruise.length - 1] as number);
  return { min, max, unit: 'ft' };
}

/**
 * Die Wertebereiche der Eingabe, aus der Datengrundlage abgeleitet. Adapter
 * bauen ihre Formulare daraus, statt Grenzen selbst zu kennen (Prinzip IV).
 */
export function getFuelPlanInputDomain(): InputDomain {
  const altitudes = altitudeRange();
  const availability = getPowerSettingsByPressureAltitude();
  const allSettings = availability.flatMap((entry) => [...entry.powerSettingsPct]);
  return {
    departureAltitudeFt: altitudes,
    cruiseAltitudeFt: altitudes,
    distanceNm: DISTANCE_RANGE,
    powerSettingPct: { min: Math.min(...allSettings), max: Math.max(...allSettings), unit: '%' },
    isaDeviationC: ISA_DEVIATION_RANGE,
    windComponentKt: WIND_COMPONENT_RANGE,
    powerSettingsByPressureAltitude: availability
  };
}

/**
 * Die beiden Stützstellen der Reiseleistungstabelle, die eine Höhe
 * einschließen. Bei exaktem Treffer beide gleich.
 */
export function bracketingAltitudes(altitude: number): readonly [number, number] {
  const grid = getPowerSettingsByPressureAltitude().map((entry) => entry.pressureAltitudeFt);
  let lower = grid[0] as number;
  let upper = grid[grid.length - 1] as number;
  for (const value of grid) {
    if (value <= altitude) {
      lower = value;
    }
    if (value >= altitude) {
      upper = value;
      break;
    }
  }
  return [lower, upper];
}

function checkRange(field: keyof FlightPlanInput, value: number, range: NumericRange): void {
  if (value < range.min || value > range.max) {
    throw outOfRange(field, value, range);
  }
}

/**
 * Prüft ein Flugvorhaben vollständig, bevor gerechnet wird (FR-008).
 * Reihenfolge: Struktur, dann Raster (V-02), dann Höhenverhältnis (V-01),
 * dann belegte Kombination (V-03).
 */
export function validateFlightPlan(input: unknown): FlightPlanInput {
  const parsed = flightPlanSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new PohCalculationError(
      'INVALID_INPUT',
      'Das Flugvorhaben ist unvollständig oder enthält keine Zahl.',
      issue === undefined ? {} : { field: issue.path.join('.') }
    );
  }

  const plan: FlightPlanInput = parsed.data;
  const domain = getFuelPlanInputDomain();

  checkRange('departureAltitudeFt', plan.departureAltitudeFt, domain.departureAltitudeFt);
  checkRange('cruiseAltitudeFt', plan.cruiseAltitudeFt, domain.cruiseAltitudeFt);
  checkRange('isaDeviationC', plan.isaDeviationC, domain.isaDeviationC);
  checkRange('windComponentKt', plan.windComponentKt, domain.windComponentKt);

  if (plan.distanceNm <= 0) {
    throw new PohCalculationError('INVALID_INPUT', 'Die Flugstrecke muss größer als null sein.', {
      field: 'distanceNm',
      actual: plan.distanceNm
    });
  }

  if (plan.cruiseAltitudeFt <= plan.departureAltitudeFt) {
    throw new PohCalculationError(
      'INVALID_INPUT',
      'Die Reiseflughöhe muss über der Platzhöhe liegen; sonst liefert die Differenzbildung des Handbuchverfahrens kein Ergebnis.',
      { field: 'cruiseAltitudeFt', actual: plan.cruiseAltitudeFt }
    );
  }

  checkPowerSetting(plan);
  return plan;
}

/**
 * V-03: Die Lasteinstellung muss bei **beiden** die Reiseflughöhe
 * einschließenden Stützstellen belegt sein. Nur dann lässt sich zwischen zwei
 * echten Tabellenwerten interpolieren.
 */
function checkPowerSetting(plan: FlightPlanInput): void {
  const availability = getPowerSettingsByPressureAltitude();
  const [lower, upper] = bracketingAltitudes(plan.cruiseAltitudeFt);

  for (const altitude of new Set([lower, upper])) {
    const entry = availability.find((item) => item.pressureAltitudeFt === altitude);
    const available = entry === undefined ? [] : entry.powerSettingsPct;
    if (!available.includes(plan.powerSettingPct)) {
      throw new PohCalculationError(
        'UNSUPPORTED_COMBINATION',
        `Die Reiseleistungstabelle enthält bei ${altitude} ft keine Lasteinstellung von ${plan.powerSettingPct} %. Dort verfügbar: ${available.join(', ')} %.`,
        { field: 'powerSettingPct', actual: plan.powerSettingPct, tableId: CRUISE_TABLE_ID }
      );
    }
  }
}
