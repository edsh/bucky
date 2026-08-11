import { describe, expect, it } from 'vitest';
import { EDSH } from '../../src/lib/weather/edsh.js';
import {
  WetterAbrufFehler,
  baueAnfrage,
  deuteAntwort
} from '../../src/lib/weather/openMeteo.js';

/**
 * Geprüft wird der Teil, der ohne Netz prüfbar ist: welche Größen angefordert
 * werden und was mit einer Antwort geschieht, die nicht so aussieht wie
 * erwartet. Der Griff ins Netz selbst gehört in den Klickpfad.
 */
describe('baueAnfrage', () => {
  const url = baueAnfrage();

  it('fragt die Stelle von EDSH ab — Backnang-Heiningen, nicht Norddeutschland', () => {
    expect(url.searchParams.get('latitude')).toBe(String(EDSH.latitude));
    expect(url.searchParams.get('longitude')).toBe(String(EDSH.longitude));
    expect(Number(url.searchParams.get('latitude'))).toBeGreaterThan(48);
    expect(Number(url.searchParams.get('latitude'))).toBeLessThan(50);
  });

  it('gibt die Platzhöhe ausdrücklich mit', () => {
    // Ohne diesen Parameter bezöge der Dienst den Druck auf die Höhe seines
    // eigenen Geländemodells (305 m) statt auf die Platzhöhe (296 m).
    expect(url.searchParams.get('elevation')).toBe('296');
  });

  it('fordert den Stationsdruck an und sonst nichts', () => {
    expect(url.searchParams.get('current')).toBe('surface_pressure');
  });

  it('fordert pressure_msl nirgends an', () => {
    // pressure_msl ist QFF und damit die falsche Größe. Was nicht ankommt,
    // kann auch nicht versehentlich verwendet werden.
    expect(url.toString()).not.toContain('pressure_msl');
  });

  it('legt die Zeitzone fest, damit die Gültigkeit eindeutig ist', () => {
    expect(url.searchParams.get('timezone')).toBe('UTC');
  });
});

describe('deuteAntwort', () => {
  const gute = {
    elevation: 296,
    current: { time: '2026-08-11T08:00', surface_pressure: 987.9 }
  };

  it('übernimmt die drei Größen, die gebraucht werden', () => {
    const abruf = deuteAntwort(gute);

    expect(abruf.stationPressureHpa).toBe(987.9);
    expect(abruf.elevationM).toBe(296);
    expect(abruf.gueltigkeit).toBe('2026-08-11T08:00');
    expect(abruf.dienst.name).toBe('Open-Meteo');
  });

  it('führt kein Feld für QFF', () => {
    expect(deuteAntwort({ ...gute, current: { ...gute.current, pressure_msl: 1023.4 } })).not.toHaveProperty(
      'pressureMslHpa'
    );
  });

  it.each([
    ['gar nichts', {}],
    ['einen leeren Wert', null],
    ['einen Text statt eines Objekts', 'kaputt'],
    ['keinen aktuellen Block', { elevation: 296 }],
    ['einen leeren Druck', { elevation: 296, current: { time: '2026-08-11T08:00', surface_pressure: null } }],
    ['den Druck null', { elevation: 296, current: { time: '2026-08-11T08:00', surface_pressure: 0 } }],
    [
      'den Druck als Text',
      { elevation: 296, current: { time: '2026-08-11T08:00', surface_pressure: '1013' } }
    ],
    ['keine Zeit', { elevation: 296, current: { surface_pressure: 987.9 } }],
    [
      'eine undeutbare Zeit',
      { elevation: 296, current: { time: 'gestern', surface_pressure: 987.9 } }
    ],
    ['keine Höhe', { current: { time: '2026-08-11T08:00', surface_pressure: 987.9 } }]
  ])('weist eine Antwort zurück, die %s liefert', (_beschreibung, rohdaten) => {
    expect(() => deuteAntwort(rohdaten)).toThrow(WetterAbrufFehler);
  });

  it('beurteilt den Wert selbst nicht', () => {
    // Eine eigene Druckschranke wäre eine zweite Grenze neben der, die der
    // Kern über den Reglerbereich ohnehin zieht (C-05). Ein unsinniger Wert
    // scheitert dort, nicht hier.
    for (const druck of [12, 940, 5000]) {
      expect(() =>
        deuteAntwort({ ...gute, current: { ...gute.current, surface_pressure: druck } })
      ).not.toThrow();
    }
  });
});
