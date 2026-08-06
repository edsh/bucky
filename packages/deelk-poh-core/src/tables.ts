import type { SourceAnomaly, SourceReference, TableSummary } from './types.js';
import { PohCalculationError } from './errors.js';

import catalogue from '../../../data/poh/d-eelk/index.json' with { type: 'json' };
import climbRate1043 from '../../../data/poh/d-eelk/tables/5b-climb-rate-1043kg.json' with { type: 'json' };
import climbRate1089 from '../../../data/poh/d-eelk/tables/5b-climb-rate-1089kg.json' with { type: 'json' };
import climb1043 from '../../../data/poh/d-eelk/tables/5b-climb-time-dist-fuel-1043kg.json' with { type: 'json' };
import climb1089 from '../../../data/poh/d-eelk/tables/5b-climb-time-dist-fuel-1089kg.json' with { type: 'json' };
import cruiseIntegral1089 from '../../../data/poh/d-eelk/tables/5b-cruise-integral-1089kg.json' with { type: 'json' };
import cruiseLongRange1043 from '../../../data/poh/d-eelk/tables/5b-cruise-longrange-1043kg.json' with { type: 'json' };
import cruiseLongRange1089 from '../../../data/poh/d-eelk/tables/5b-cruise-longrange-1089kg.json' with { type: 'json' };
import cruiseStandard1043 from '../../../data/poh/d-eelk/tables/5b-cruise-standard-1043kg.json' with { type: 'json' };
import cruiseStandard1089 from '../../../data/poh/d-eelk/tables/5b-cruise-standard-1089kg.json' with { type: 'json' };
import takeoffFt1043 from '../../../data/poh/d-eelk/tables/5b-takeoff-distance-ft-1043kg.json' with { type: 'json' };
import takeoffFt1089 from '../../../data/poh/d-eelk/tables/5b-takeoff-distance-ft-1089kg.json' with { type: 'json' };
import takeoffM1043 from '../../../data/poh/d-eelk/tables/5b-takeoff-distance-m-1043kg.json' with { type: 'json' };
import takeoffM1089 from '../../../data/poh/d-eelk/tables/5b-takeoff-distance-m-1089kg.json' with { type: 'json' };

/** Eine Tabellenzeile: benannte Zahlenwerte, so wie digitalisiert. */
export type TableRow = Readonly<Record<string, number>>;

/** Eine Tabelle der Datengrundlage, so wie sie in der JSON-Datei steht. */
export interface PohTable {
  readonly id: string;
  readonly kind: string;
  readonly figure: string;
  readonly table_name: string;
  readonly source: {
    readonly issue: string;
    readonly revision: string;
    readonly poh_pages: readonly string[];
    readonly citation: string;
  };
  readonly applicability: {
    readonly applicable_to_d_eelk: boolean;
  };
  readonly conditions: readonly string[];
  readonly notes: readonly string[];
  readonly rows: readonly TableRow[];
  /** Beim Digitalisieren vermerkte Widersprüche des Originals. */
  readonly source_anomalies?: readonly SourceAnomaly[];
}

/**
 * Alle digitalisierten Tabellen, zur Bauzeit eingebunden. Der Kern liest zur
 * Laufzeit nichts aus dem Dateisystem (Zusicherung C-01).
 */
const ALL_TABLES = [
  climbRate1043,
  climbRate1089,
  climb1043,
  climb1089,
  cruiseIntegral1089,
  cruiseLongRange1043,
  cruiseLongRange1089,
  cruiseStandard1043,
  cruiseStandard1089,
  takeoffFt1043,
  takeoffFt1089,
  takeoffM1043,
  takeoffM1089
] as unknown as readonly PohTable[];

/**
 * Nur Tabellen mit `applicable_to_d_eelk === true` sind überhaupt erreichbar
 * (V-04, C-04). Die übrigen bleiben in der Datengrundlage, weil ihre Auslassung
 * die Vollständigkeitsprüfung gegen das Original erschweren würde — für die
 * Berechnung existieren sie hier aber nicht.
 */
const APPLICABLE_TABLES: ReadonlyMap<string, PohTable> = new Map(
  ALL_TABLES.filter((table) => table.applicability.applicable_to_d_eelk === true).map((table) => [
    table.id,
    table
  ])
);

/** Kennungen der beiden für den Kraftstoffrechner benötigten Tabellen. */
export const CLIMB_TABLE_ID = '5b-climb-time-dist-fuel-1043kg';
export const CRUISE_TABLE_ID = '5b-cruise-standard-1043kg';

/** Ausfliegbare Menge der Standardtanks laut Katalog (FR-016). */
export const USABLE_FUEL_L: number = catalogue.aircraft.usable_fuel_l;

/**
 * Dieselbe Menge in US-Gallonen, wie das Handbuch sie nennt. Sie ist bewusst
 * nicht aus den Litern umgerechnet: 127,4 l ergäben rechnerisch 33,7 US gal,
 * das Handbuch schreibt aber 33,6 (FR-009).
 */
export const USABLE_FUEL_US_GAL: number = catalogue.aircraft.usable_fuel_usgal;

/**
 * Liefert eine für D-EELK anwendbare Tabelle. Der Zugriff auf eine nicht
 * anwendbare Tabelle ist ein Programmfehler, kein Eingabefehler (V-04).
 */
export function getTable(tableId: string): PohTable {
  const table = APPLICABLE_TABLES.get(tableId);
  if (table === undefined) {
    throw new PohCalculationError(
      'NOT_COMPUTABLE',
      `Die Tabelle "${tableId}" ist für D-EELK nicht anwendbar oder nicht vorhanden.`,
      { tableId }
    );
  }
  return table;
}

/** Kennungen aller für D-EELK anwendbaren Tabellen. */
export function listApplicableTableIds(): readonly string[] {
  return [...APPLICABLE_TABLES.keys()];
}

/**
 * Quellenreferenz einer Tabelle, wortgleich aus der JSON-Datei. Der Kern
 * formuliert sie nicht neu (FR-005).
 */
export function getSourceReference(tableId: string): SourceReference {
  const table = getTable(tableId);
  return {
    tableId: table.id,
    figure: table.figure,
    tableName: table.table_name,
    pohPages: table.source.poh_pages,
    issue: table.source.issue,
    revision: table.source.revision,
    citation: table.source.citation
  };
}

export function getTableSummary(tableId: string): TableSummary {
  const table = getTable(tableId);
  return {
    id: table.id,
    kind: table.kind,
    figure: table.figure,
    tableName: table.table_name,
    source: getSourceReference(tableId),
    conditions: table.conditions,
    notes: table.notes,
    rowCount: table.rows.length,
    anomalies: table.source_anomalies ?? []
  };
}

/**
 * Alle für D-EELK anwendbaren Tabellen mit Quellenangabe und den vermerkten
 * Widersprüchen des Originals. Grundlage der Tabellenübersicht: der Pilot soll
 * sehen können, worauf die Berechnung überhaupt beruht (Prinzip I).
 */
export function listTables(): readonly TableSummary[] {
  return listApplicableTableIds().map((tableId) => getTableSummary(tableId));
}

/**
 * Eine Anmerkung der Tabelle im Wortlaut des Handbuchs, adressiert über ihre
 * Nummer. Hinweistexte werden nicht im Code nachgedichtet (FR-005).
 */
export function getTableNote(tableId: string, noteNumber: number): string {
  const note = getTable(tableId).notes.find((entry) => entry.startsWith(`${noteNumber}.`));
  if (note === undefined) {
    throw new PohCalculationError(
      'NOT_COMPUTABLE',
      `Anmerkung ${noteNumber} fehlt in der Tabelle "${tableId}".`,
      { tableId }
    );
  }
  return note;
}
