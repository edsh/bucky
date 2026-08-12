import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  VERALTET_AB_MS,
  istVeraltet,
  ladeStand,
  sichereStand,
  type Herkunft,
  type Stand
} from '../../src/lib/einstellungen/speicher.js';

/**
 * Geprüft wird vor allem das **Lesen**: Ein Wert aus dem Speicher hat nie
 * einen Regler durchlaufen und ist damit die einzige Stelle der Oberfläche,
 * an der ein ungeprüfter Wert in die Rechnung geraten könnte (Constitution,
 * Prinzip I).
 */

const SCHLUESSEL = 'bucky.einstellungen';

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

const standard: Stand = {
  departureElevationFt: 971,
  cruiseAltitudeAmslFt: 4500,
  qnhHpa: 1013,
  outsideAirTemperatureC: 23,
  runwayWindComponentKt: 10,
  routeWindComponentKt: 10,
  distanceNm: 75,
  powerSettingPct: 70,
  dryGrassRunway: false,
  wetOrSnowRunway: false
};

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

describe('sichereStand und ladeStand', () => {
  it('gibt einen gesicherten Stand unverändert zurück', () => {
    const stand: Stand = {
      ...standard,
      departureElevationFt: 1200,
      powerSettingPct: 65,
      dryGrassRunway: true,
      distanceNm: 130
    };
    sichereStand(stand);
    expect(ladeStand(standard)).toEqual(stand);
  });

  it('liefert die Ausgangswerte, wenn nichts gesichert ist', () => {
    expect(ladeStand(standard)).toEqual(standard);
  });
});

describe('unbrauchbare Stände', () => {
  it('verwirft beschädigte Daten, ohne zu werfen', () => {
    globalThis.localStorage.setItem(SCHLUESSEL, '{kein json');
    expect(ladeStand(standard)).toEqual(standard);
  });

  it('verwirft einen Stand aus einer fremden Fassung ganz', () => {
    lege({ fassung: 99, stand: { ...standard, powerSettingPct: 65 } });
    expect(ladeStand(standard).powerSettingPct).toBe(standard.powerSettingPct);
  });

  it('verwirft einen Wert außerhalb seines Reglerbereichs, behält die übrigen', () => {
    // 99 000 ft: Der Regler reicht bis 6900. Genau der Fall, für den FR-008
    // geschrieben ist.
    lege({ fassung: 1, stand: { ...standard, departureElevationFt: 99_000, distanceNm: 130 } });
    const geladen = ladeStand(standard);
    expect(geladen.departureElevationFt).toBe(standard.departureElevationFt);
    expect(geladen.distanceNm).toBe(130);
  });

  it('verwirft Werte falschen Typs', () => {
    lege({ fassung: 1, stand: { ...standard, qnhHpa: '1020', dryGrassRunway: 'ja' } });
    const geladen = ladeStand(standard);
    expect(geladen.qnhHpa).toBe(standard.qnhHpa);
    expect(geladen.dryGrassRunway).toBe(false);
  });

  it('verwirft eine Temperatur außerhalb des Bereichs zur geladenen Platzhöhe', () => {
    // Der Temperaturbereich wandert mit der Druckhöhe. Geprüft wird gegen die
    // Höhe, die nach dem Laden gilt, nicht gegen die des alten Standes.
    lege({ fassung: 1, stand: { ...standard, outsideAirTemperatureC: 400 } });
    expect(ladeStand(standard).outsideAirTemperatureC).toBe(standard.outsideAirTemperatureC);
  });

  it('verwirft einen Herkunftsvermerk ohne brauchbaren Abrufzeitpunkt', () => {
    lege({
      fassung: 1,
      stand: {
        ...standard,
        qnhHerkunft: { dienst: 'Open-Meteo', ort: 'EDSH', gueltigkeit: '2026-08-12T12:00' }
      }
    });
    expect(ladeStand(standard).qnhHerkunft).toBeUndefined();
  });

  it('kommt ohne Speicher aus', () => {
    Reflect.deleteProperty(globalThis, 'localStorage');
    expect(() => sichereStand(standard)).not.toThrow();
    expect(ladeStand(standard)).toEqual(standard);
  });
});

describe('istVeraltet', () => {
  const jetzt = Date.parse('2026-08-12T12:00:00Z');
  const herkunft = (abgerufenAm: string): Herkunft => ({
    dienst: 'Open-Meteo',
    ort: 'EDSH',
    gueltigkeit: '2026-08-12T11:00',
    abgerufenAm
  });

  it('gilt kurz nach dem Abruf als frisch', () => {
    expect(istVeraltet(herkunft('2026-08-12T11:30:00Z'), jetzt)).toBe(false);
  });

  it('gilt genau an der Grenze noch als frisch', () => {
    expect(istVeraltet(herkunft(new Date(jetzt - VERALTET_AB_MS).toISOString()), jetzt)).toBe(false);
  });

  it('gilt eine Minute darüber als veraltet', () => {
    expect(
      istVeraltet(herkunft(new Date(jetzt - VERALTET_AB_MS - 60_000).toISOString()), jetzt)
    ).toBe(true);
  });

  it('gilt bei einem Abruf weit in der Zukunft als veraltet — im Zweifel warnen', () => {
    expect(istVeraltet(herkunft('2026-08-12T13:00:00Z'), jetzt)).toBe(true);
  });

  it('verträgt eine Minute Vorsprung — der Vergleichszeitpunkt hinkt nach', () => {
    // Der Vergleichszeitpunkt wird im Minutentakt nachgeführt und kann daher
    // kurz aelter sein als ein eben erfolgter Abruf. Ohne die Toleranz truege
    // ein frisch abgerufener Wert sofort die Alterswarnung.
    expect(istVeraltet(herkunft('2026-08-12T12:01:00Z'), jetzt)).toBe(false);
  });

  it('gilt bei unlesbarem Zeitpunkt als veraltet', () => {
    expect(istVeraltet(herkunft('irgendwann'), jetzt)).toBe(true);
  });
});
