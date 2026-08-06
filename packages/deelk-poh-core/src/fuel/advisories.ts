import type { Advisory } from '../types.js';
import { CLIMB_TABLE_ID, CRUISE_TABLE_ID, getSourceReference, getTable, getTableNote } from '../tables.js';
import type { FlightPlanInput } from './input.js';

/**
 * Hinweise, die das Ergebnis begleiten, ohne die Berechnung abzubrechen
 * (`data-model.md`, Abschnitt „Hinweise ohne Abbruch").
 *
 * Wo das Handbuch selbst etwas sagt, wird sein Wortlaut übernommen statt
 * nachgedichtet (FR-005).
 */
export function buildAdvisories(plan: FlightPlanInput): readonly Advisory[] {
  const climbSource = getSourceReference(CLIMB_TABLE_ID);
  const cruiseSource = getSourceReference(CRUISE_TABLE_ID);
  const advisories: Advisory[] = [];

  advisories.push({
    id: 'noReserve',
    text: 'Die Summe enthält keine Reserve. Sinkflug und der Weg zu einem Ausweichflugplatz sind ebenfalls nicht enthalten. Der verbleibende Kraftstoff ist damit keine Reserve im betrieblichen Sinne, sondern nur die rechnerische Differenz zur ausfliegbaren Menge.'
  });

  advisories.push({
    id: 'climbFuelTemperatureCorrection',
    text: `Die Temperaturkorrektur wird auch auf den Steigflug-Kraftstoff angewandt, obwohl Anmerkung 2 der Steigflugtabelle nur Zeit und Steigstrecke nennt: „${getTableNote(CLIMB_TABLE_ID, 2)}" So verfährt das Rechenbeispiel des Handbuchs, und es ist die konservativere Auslegung.`,
    source: climbSource
  });

  advisories.push({
    id: 'roundingOnce',
    text: 'Gerechnet wird durchgehend mit voller Genauigkeit; gerundet wird erst das Ergebnis. Das Rechenbeispiel des Handbuchs rundet dagegen nach jedem Schritt. Wer von Hand nachrechnet, kann deshalb um rund 0,6 l abweichen — in beide Richtungen.'
  });

  advisories.push({
    id: 'climbTableWeight',
    text: `Die Steigflugwerte gelten für die maximale Abflugmasse: ${conditionOf(CLIMB_TABLE_ID, 'Startgewicht')}. Bei geringerer Masse steigt das Flugzeug schneller und verbraucht weniger — das Ergebnis liegt dann auf der sicheren Seite.`,
    source: climbSource
  });

  if (plan.powerSettingPct > 75) {
    advisories.push({
      id: 'highPowerSetting',
      text: getTableNote(CRUISE_TABLE_ID, 4),
      source: cruiseSource
    });
  }

  return advisories;
}

/** Eine Bedingung der Tabelle im Wortlaut, adressiert über ihren Anfang. */
function conditionOf(tableId: string, prefix: string): string {
  return getTable(tableId).conditions.find((entry) => entry.startsWith(prefix)) ?? prefix;
}
