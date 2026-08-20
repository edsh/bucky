import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  istFavorit,
  ladeFavoriten,
  sichereFavoriten,
  umschalten
} from '../../src/lib/flotte/favoriten.js';

/**
 * Geprüft wird vor allem das **Lesen**: Der Speicher ist die einzige Stelle,
 * an der fremder Inhalt in diese Anwendung gerät — von Hand geändert, aus
 * einer älteren Fassung übrig oder halb geschrieben. Nichts davon darf die
 * Übersicht zum Stehen bringen; sie soll dann nur nichts merken.
 *
 * Der zweite Schwerpunkt ist die Unterscheidung „nie gesetzt" von „leer"
 * (FR-007b). Sie ist der Grund, warum `ladeFavoriten` `null` und `[]`
 * zurückgeben kann und nicht bloß eine Liste.
 */

const SCHLUESSEL = 'bucky.favoriten';

/** Ein Speicher, wie ihn der Browser stellt — mehr braucht das Modul nicht. */
class SpeicherAttrappe implements Storage {
  private daten = new Map<string, string>();

  get length(): number {
    return this.daten.size;
  }
  clear(): void {
    this.daten.clear();
  }
  getItem(key: string): string | null {
    return this.daten.get(key) ?? null;
  }
  key(index: number): string | null {
    return [...this.daten.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.daten.delete(key);
  }
  setItem(key: string, value: string): void {
    this.daten.set(key, value);
  }
}

function lege(inhalt: unknown): void {
  globalThis.localStorage.setItem(SCHLUESSEL, JSON.stringify(inhalt));
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new SpeicherAttrappe(),
    configurable: true,
    writable: true
  });
});

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'localStorage');
});

describe('ladeFavoriten', () => {
  it('gibt ohne jeden Eintrag null zurück, nicht die leere Liste', () => {
    // Das ist der Fall, in dem gar keine Favoritenreihe erscheinen darf
    // (FR-007b) -- und er muss vom bewussten Leeren unterscheidbar bleiben.
    expect(ladeFavoriten()).toBeNull();
  });

  it('unterscheidet die bewusst geleerte Liste vom nie gesetzten Zustand', () => {
    sichereFavoriten([]);
    expect(ladeFavoriten()).toEqual([]);
  });

  it('gibt eine gesicherte Liste in ihrer Reihenfolge zurück', () => {
    sichereFavoriten(['D-EELK', 'D-9021', 'D-MRXS']);
    expect(ladeFavoriten()).toEqual(['D-EELK', 'D-9021', 'D-MRXS']);
  });

  it('verwirft einen Inhalt aus einer fremden Fassung ganz', () => {
    lege({ fassung: 99, kennungen: ['D-EELK'] });
    expect(ladeFavoriten()).toBeNull();
  });

  it('verwirft unlesbaren Inhalt still', () => {
    globalThis.localStorage.setItem(SCHLUESSEL, '{kein json');
    expect(ladeFavoriten()).toBeNull();
  });

  it('verwirft einen Umschlag, dessen Inhalt keine Liste ist', () => {
    lege({ fassung: 1, kennungen: 'D-EELK' });
    expect(ladeFavoriten()).toBeNull();
  });

  it('übergeht Unrat in der Liste, statt sie ganz zu verwerfen', () => {
    // Ein einzelner kaputter Eintrag kostet die uebrigen Favoriten nichts.
    lege({ fassung: 1, kennungen: ['D-EELK', 42, '', null, { k: 'D-MRXS' }, 'D-9021'] });
    expect(ladeFavoriten()).toEqual(['D-EELK', 'D-9021']);
  });

  it('behält ein Kennzeichen, das in keiner Stammliste steht', () => {
    // Die Flotte ist die Vereinigung aus Stammliste und Daten: Eine Maschine,
    // die erst seit gestern gebucht wird, steht in keiner Liste und darf
    // trotzdem gemerkt sein. Gefiltert wird in der Anzeige, nicht im Speicher.
    lege({ fassung: 1, kennungen: ['D-ABCD'] });
    expect(ladeFavoriten()).toEqual(['D-ABCD']);
  });

  it('vereinheitlicht Kleinschreibung und Leerzeichen beim Lesen', () => {
    lege({ fassung: 1, kennungen: ['d-eelk', ' D-MRXS '] });
    expect(ladeFavoriten()).toEqual(['D-EELK', 'D-MRXS']);
  });

  it('lässt Doppelte fallen', () => {
    lege({ fassung: 1, kennungen: ['D-EELK', 'd-eelk'] });
    expect(ladeFavoriten()).toEqual(['D-EELK']);
  });

  it('kommt ohne Speicher zurecht', () => {
    Reflect.deleteProperty(globalThis, 'localStorage');
    expect(ladeFavoriten()).toBeNull();
    expect(() => sichereFavoriten(['D-EELK'])).not.toThrow();
  });
});

describe('sichereFavoriten', () => {
  it('schreibt vereinheitlicht und ohne Doppelte', () => {
    sichereFavoriten(['d-eelk', 'D-EELK', 'D-4413']);
    expect(ladeFavoriten()).toEqual(['D-EELK', 'D-4413']);
  });

  it('bleibt still, wenn der Speicher das Schreiben verweigert', () => {
    // Ein volles oder gesperrtes localStorage wirft beim Schreiben. Fuer eine
    // Merkliste ist das folgenlos -- eine Fehlermeldung waere hier lauter als
    // der Verlust.
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: () => null,
        setItem: () => {
          throw new Error('QuotaExceeded');
        }
      },
      configurable: true,
      writable: true
    });
    expect(() => sichereFavoriten(['D-EELK'])).not.toThrow();
  });
});

describe('umschalten', () => {
  it('setzt eine neue Markierung ans Ende', () => {
    expect(umschalten(['D-EELK'], 'D-MRXS')).toEqual(['D-EELK', 'D-MRXS']);
  });

  it('entfernt eine bestehende Markierung', () => {
    expect(umschalten(['D-EELK', 'D-MRXS'], 'D-EELK')).toEqual(['D-MRXS']);
  });

  it('erkennt eine bestehende Markierung unabhängig von der Schreibweise', () => {
    expect(umschalten(['D-EELK'], 'd-eelk')).toEqual([]);
  });

  it('lässt die übergebene Liste unangetastet', () => {
    const vorher = ['D-EELK'];
    umschalten(vorher, 'D-MRXS');
    expect(vorher).toEqual(['D-EELK']);
  });
});

describe('istFavorit', () => {
  it('sagt ohne gesetzte Favoriten nein, statt zu werfen', () => {
    expect(istFavorit(null, 'D-EELK')).toBe(false);
  });

  it('erkennt unabhängig von der Schreibweise', () => {
    expect(istFavorit(['D-EELK'], 'd-eelk')).toBe(true);
    expect(istFavorit(['D-EELK'], 'D-MRXS')).toBe(false);
  });
});
