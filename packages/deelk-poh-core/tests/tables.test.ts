import { describe, expect, it } from 'vitest';
import {
  CLIMB_TABLE_ID,
  CRUISE_TABLE_ID,
  USABLE_FUEL_L,
  getSourceReference,
  getTable,
  getTableNote,
  getTableSummary,
  listApplicableTableIds
} from '../src/tables.js';
import { PohCalculationError } from '../src/errors.js';
import catalogue from '../../../data/poh/d-eelk/index.json' with { type: 'json' };
import cruiseJson from '../../../data/poh/d-eelk/tables/5b-cruise-standard-1043kg.json' with { type: 'json' };

describe('Tabellenzugriff', () => {
  it('lädt ausschließlich die für D-EELK anwendbaren Tabellen (V-04)', () => {
    const loaded = [...listApplicableTableIds()].sort();
    const expected = [...catalogue.aircraft.applicable_tables].sort();

    expect(loaded).toEqual(expected);
    expect(loaded).not.toContain('5b-cruise-standard-1089kg');
  });

  it('verweigert den Zugriff auf eine nicht anwendbare Tabelle', () => {
    try {
      getTable('5b-cruise-standard-1089kg');
      expect.unreachable('hätte werfen müssen');
    } catch (error) {
      expect((error as PohCalculationError).kind).toBe('NOT_COMPUTABLE');
    }
  });

  it('findet die beiden Tabellen des Kraftstoffrechners', () => {
    expect(getTableSummary(CLIMB_TABLE_ID).figure).toBe('Abb. 5-3a');
    expect(getTableSummary(CRUISE_TABLE_ID).figure).toBe('Abb. 5-4a');
    expect(getTableSummary(CLIMB_TABLE_ID).rowCount).toBe(19);
    expect(getTableSummary(CRUISE_TABLE_ID).rowCount).toBe(53);
  });

  it('übernimmt die Quellenreferenz wortgleich aus der JSON-Datei (FR-005)', () => {
    const reference = getSourceReference(CRUISE_TABLE_ID);

    expect(reference.citation).toBe(cruiseJson.source.citation);
    expect(reference.tableName).toBe(cruiseJson.table_name);
    expect(reference.pohPages).toEqual(cruiseJson.source.poh_pages);
    expect(reference.citation).toContain('5b-15');
  });

  it('liefert Anmerkungen im Wortlaut des Handbuchs', () => {
    expect(getTableNote(CLIMB_TABLE_ID, 1)).toContain('4 l');
    expect(getTableNote(CRUISE_TABLE_ID, 4)).toContain('75%');
  });

  it('kennt die ausfliegbare Menge der Standardtanks (FR-016)', () => {
    expect(USABLE_FUEL_L).toBe(127.4);
  });
});
