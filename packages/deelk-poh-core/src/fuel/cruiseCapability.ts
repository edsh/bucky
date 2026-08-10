import { z } from 'zod';
import type { CalculationStep, PohSourceReference } from '../types.js';
import { PohCalculationError } from '../errors.js';
import { interpolate } from '../interpolate.js';
import {
  CRUISE_TABLE_ID,
  getSourceReference,
  getTableCondition,
  getTableNote
} from '../tables.js';
import { formatNumber, formatQuantity } from '../format.js';
import {
  ICAO_STANDARD_ATMOSPHERE_SOURCE,
  toPressureAltitude,
  type PressureAltitudeResult
} from '../atmosphere/pressureAltitude.js';
import {
  checkPowerSetting,
  checkPressureAltitude,
  checkRange,
  getCruisePressureAltitudeRange,
  getFuelPlanInputDomain
} from './input.js';
import { ktasTemperatureFactor } from './cruise.js';
import { PREFLIGHT_CHECK_NOTICE } from './notices.js';

/**
 * Die Bedingungen des Reiseflugs — die einzigen Größen, von denen die
 * Reiseleistungs-Übersicht abhängt. Die Feldnamen entsprechen denen von
 * `FlightPlanInput`, damit ein Adapter dieselbe Variable an beide Funktionen
 * reichen kann. Streckenlänge, Platzhöhe und Windkomponente gehören bewusst
 * nicht dazu (FR-009).
 */
export interface CruiseConditionsInput {
  readonly cruiseAltitudeAmslFt: number;
  readonly qnhHpa: number;
  readonly powerSettingPct: number;
  readonly isaDeviationC: number;
}

/**
 * Was die D-EELK unter diesen Bedingungen leistet — abgelesen, nicht
 * gerechnet. Strecke und Flugdauer stammen als eigene Spalten aus der Tabelle
 * und schließen laut Anmerkung 2 Rollen, Steigflug und die 45-Minuten-Reserve
 * bereits ein. Sie lassen sich deshalb **nicht** aus Geschwindigkeit und Zeit
 * nachbilden.
 */
export interface CruiseCapability {
  readonly pressureAltitude: PressureAltitudeResult;
  /** Eigengeschwindigkeit laut Tabelle, vor der Temperaturkorrektur. */
  readonly tableKtas: number;
  /** Eigengeschwindigkeit nach der Temperaturkorrektur. */
  readonly ktas: number;
  readonly fuelFlowLph: number;
  /** Aus der eigenen US-gph-Spalte der Tabelle, nicht umgerechnet. */
  readonly fuelFlowUsGph: number;
  /** Maximale Strecke laut Tabelle, vor der Temperaturkorrektur. */
  readonly tableRangeNm: number;
  /** Maximale Strecke nach der Temperaturkorrektur. */
  readonly maxRangeNm: number;
  /** Maximale Flugdauer; nicht temperaturkorrigiert (FR-003). */
  readonly enduranceH: number;
  /**
   * Verbrauch je zurückgelegter Seemeile, aus Stundenverbrauch und
   * temperaturkorrigierter Eigengeschwindigkeit. Kein Tabellenwert, sondern
   * eine Division zweier abgelesener Größen — die Kennzahl macht zwei
   * Lasteinstellungen unmittelbar vergleichbar, was der Blick auf Verbrauch
   * und Geschwindigkeit einzeln nicht leistet.
   *
   * Gilt für den reinen Reiseflug bei Windstille; Rollen, Steigflug und
   * Reserve stecken nicht darin — anders als in Reichweite und Flugdauer.
   */
  readonly fuelPerNmL: number;
  /** Dasselbe aus der US-gph-Spalte der Tabelle, nicht umgerechnet. */
  readonly fuelPerNmUsGal: number;
  /** Der angewandte Faktor; 1 bei ISA-Abweichung von null oder darunter. */
  readonly temperatureFactor: number;
  readonly steps: readonly CalculationStep[];
  readonly source: PohSourceReference;
  /** Anmerkung 2 der Tabelle im Wortlaut. */
  readonly inclusionsNote: string;
  /** Die Bedingung „Windstille" im Wortlaut der Tabelle. */
  readonly windlessNote: string;
  readonly preflightCheckNotice: string;
}

const cruiseConditionsSchema = z.object({
  cruiseAltitudeAmslFt: z.number().finite(),
  qnhHpa: z.number().finite(),
  powerSettingPct: z.number().finite(),
  isaDeviationC: z.number().finite()
});

/**
 * Reiseleistung, maximale Strecke und Flugdauer aus Abb. 5-4a (FR-001).
 *
 * Eigenständige öffentliche Funktion und nicht bloßes Nebenprodukt der
 * Bedarfsrechnung: Sie hängt an vier Eingaben, während die Bedarfsrechnung an
 * Strecke, Platzhöhe und Wind scheitern kann. Genau dann soll diese Auskunft
 * stehen bleiben.
 */
export function computeCruiseCapability(input: unknown): CruiseCapability {
  const parsed = cruiseConditionsSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new PohCalculationError(
      'INVALID_INPUT',
      'Die Bedingungen des Reiseflugs sind unvollständig oder enthalten keine Zahl.',
      issue === undefined ? {} : { field: issue.path.join('.') }
    );
  }

  const conditions: CruiseConditionsInput = parsed.data;
  const domain = getFuelPlanInputDomain();

  // Reihenfolge wie in validateFlightPlan: erst die Eingabegrenzen, dann die
  // errechnete Druckhöhe, zuletzt die belegte Kombination. Nur so benennt die
  // Meldung die tatsächliche Ursache und nicht deren Folge.
  checkRange('cruiseAltitudeAmslFt', conditions.cruiseAltitudeAmslFt, domain.cruiseAltitudeAmslFt);
  checkRange('qnhHpa', conditions.qnhHpa, domain.qnhHpa);
  checkRange('isaDeviationC', conditions.isaDeviationC, domain.isaDeviationC);

  const pressureAltitude = toPressureAltitude(conditions.cruiseAltitudeAmslFt, conditions.qnhHpa);
  checkPressureAltitude('cruiseAltitudeAmslFt', pressureAltitude, getCruisePressureAltitudeRange());
  checkPowerSetting(conditions.powerSettingPct, pressureAltitude.pressureAltitudeFt);

  const source = getSourceReference(CRUISE_TABLE_ID);
  const lookup = interpolate({
    tableId: CRUISE_TABLE_ID,
    axisKey: 'pressure_altitude_ft',
    axisValue: pressureAltitude.pressureAltitudeFt,
    valueKeys: ['ktas', 'fuel_flow_lph', 'fuel_flow_usgph', 'range_nm', 'endurance_h'],
    where: { power_setting_pct: conditions.powerSettingPct },
    field: 'cruiseAltitudeAmslFt',
    axisUnit: 'ft'
  });

  const tableKtas = lookup.values['ktas'] as number;
  const fuelFlowLph = lookup.values['fuel_flow_lph'] as number;
  const fuelFlowUsGph = lookup.values['fuel_flow_usgph'] as number;
  const tableRangeNm = lookup.values['range_nm'] as number;
  const enduranceH = lookup.values['endurance_h'] as number;

  // Anmerkung 3 nennt ausdrücklich Geschwindigkeit und Reichweite, nicht die
  // Flugdauer. Das ist stimmig: Bei gleichbleibendem Verbrauch je Stunde
  // reicht dieselbe Kraftstoffmenge genauso lange — die Maschine kommt in
  // dieser Zeit nur weiter, weil sie schneller fliegt.
  const temperatureFactor = ktasTemperatureFactor(conditions.isaDeviationC);
  const ktas = tableKtas * temperatureFactor;
  const maxRangeNm = tableRangeNm * temperatureFactor;

  // Der Verbrauch je Seemeile folgt aus beidem und wird deshalb erst hier
  // gebildet: Die Temperaturkorrektur betrifft die Geschwindigkeit, nicht die
  // Verbrauchsrate — wärmere Luft macht die Strecke also etwas billiger.
  const fuelPerNmL = fuelFlowLph / ktas;
  const fuelPerNmUsGal = fuelFlowUsGph / ktas;

  const steps: CalculationStep[] = [
    {
      id: 'capability.pressureAltitude',
      label: 'Druckhöhe des Reiseflugs',
      inputs: {
        elevationFt: { value: pressureAltitude.elevationFt, unit: 'ft' },
        qnhHpa: { value: pressureAltitude.qnhHpa, unit: 'hPa' }
      },
      results: { pressureAltitudeFt: { value: pressureAltitude.pressureAltitudeFt, unit: 'ft' } },
      anchors: [],
      explanation: `${formatQuantity(pressureAltitude.elevationFt, 0, 'ft')} über dem Meeresspiegel bei einem QNH von ${formatQuantity(pressureAltitude.qnhHpa, 2, 'hPa')} ergeben ${formatQuantity(pressureAltitude.pressureAltitudeFt, 0, 'ft')} Druckhöhe. Gerechnet nach der barometrischen Höhenformel der ICAO-Standardatmosphäre: ${ICAO_STANDARD_ATMOSPHERE_SOURCE.formula}. Diese Größe stammt nicht aus dem Flughandbuch.`,
      sources: []
    },
    {
      id: 'capability.tableLookup',
      label: 'Reiseleistung, Reichweite und Flugdauer bei Druckhöhe und Lasteinstellung',
      inputs: {
        pressureAltitudeFt: { value: pressureAltitude.pressureAltitudeFt, unit: 'ft' },
        powerSettingPct: { value: conditions.powerSettingPct, unit: '%' }
      },
      results: {
        ktas: { value: tableKtas, unit: 'kt' },
        fuelFlowLph: { value: fuelFlowLph, unit: 'l/h' },
        fuelFlowUsGph: { value: fuelFlowUsGph, unit: 'US gal/h' },
        rangeNm: { value: tableRangeNm, unit: 'NM' },
        enduranceH: { value: enduranceH, unit: 'h' }
      },
      anchors: lookup.anchors,
      explanation: `Aus ${source.figure} abgelesen, einschließlich der Spalten für Reichweite und Flugdauer. Diese beiden sind eine Auskunft über die Maschine, kein Bedarf für ein bestimmtes Vorhaben: Sie gelten für volle Standardtanks und enthalten laut Anmerkung 2 bereits Rollen, Steigflug und Reserve. Nachrechnen lassen sie sich nicht — Reichweite und Flugdauer stehen als eigenständige Messgrößen in der Tabelle, ihr Produkt aus Geschwindigkeit und Zeit ergäbe zu wenig, weil die im Steigflug zurückgelegte Strecke darin steckt.`,
      sources: [source]
    },
    {
      id: 'capability.temperatureCorrection',
      label: 'Temperaturkorrektur von Geschwindigkeit und Reichweite',
      inputs: {
        tableKtas: { value: tableKtas, unit: 'kt' },
        tableRangeNm: { value: tableRangeNm, unit: 'NM' },
        isaDeviationC: { value: conditions.isaDeviationC, unit: '°C' },
        factor: { value: temperatureFactor, unit: '' }
      },
      results: {
        ktas: { value: ktas, unit: 'kt' },
        maxRangeNm: { value: maxRangeNm, unit: 'NM' },
        enduranceH: { value: enduranceH, unit: 'h' }
      },
      anchors: [],
      explanation:
        conditions.isaDeviationC <= 0
          ? 'Keine Korrektur: Anmerkung 3 sieht nur einen Zuschlag über der Normtemperatur vor. Die Flugdauer bleibt in jedem Fall unverändert.'
          : `Faktor 1 + (${formatQuantity(conditions.isaDeviationC, 0, '°C')} / 10\u00a0°C) × 0,01 = ${formatNumber(temperatureFactor, 4)}. Anmerkung 3 nennt nur Geschwindigkeit und Reichweite; die Flugdauer bleibt unverändert.`,
      sources: [source]
    },
    {
      id: 'capability.fuelPerNm',
      label: 'Verbrauch je Seemeile',
      inputs: {
        fuelFlowLph: { value: fuelFlowLph, unit: 'l/h' },
        fuelFlowUsGph: { value: fuelFlowUsGph, unit: 'US gal/h' },
        ktas: { value: ktas, unit: 'kt' }
      },
      results: {
        fuelPerNmL: { value: fuelPerNmL, unit: 'l/NM' },
        fuelPerNmUsGal: { value: fuelPerNmUsGal, unit: 'US gal/NM' }
      },
      anchors: [],
      explanation: `${formatQuantity(fuelFlowLph, 1, 'l')}/h geteilt durch ${formatQuantity(ktas, 0, 'kt')} ergeben ${formatQuantity(fuelPerNmL, 2, 'l')}/NM. Beide Größen stammen aus ${source.figure}; die Division selbst steht nicht im Flughandbuch. Der Wert gilt für den Reiseflug bei Windstille und enthält weder Rollen noch Steigflug noch Reserve.`,
      sources: [source]
    }
  ];

  return {
    pressureAltitude,
    tableKtas,
    ktas,
    fuelFlowLph,
    fuelFlowUsGph,
    tableRangeNm,
    maxRangeNm,
    enduranceH,
    fuelPerNmL,
    fuelPerNmUsGal,
    temperatureFactor,
    steps,
    source,
    inclusionsNote: getTableNote(CRUISE_TABLE_ID, 2),
    windlessNote: getTableCondition(CRUISE_TABLE_ID, 'Windstille'),
    preflightCheckNotice: PREFLIGHT_CHECK_NOTICE
  };
}
