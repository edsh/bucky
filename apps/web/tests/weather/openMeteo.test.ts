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

  it('fordert alle vier Größen in einer Anfrage an', () => {
    // In einer Anfrage und nicht in zweien: So gelten sie für denselben
    // Zeitpunkt. Zwei Abrufe könnten verschiedene Modellstunden erwischen und
    // Werte mischen, die nicht zusammengehören.
    expect(url.searchParams.get('current')).toBe(
      'surface_pressure,temperature_2m,wind_speed_10m,wind_direction_10m'
    );
  });

  it('fordert den Wind in Knoten an, statt ihn umzurechnen', () => {
    // Eine eigene Umrechnung km/h → kt wäre eine Rechnung im Adapter und
    // zugleich eine stille Fehlerquelle: 22 sähe in beiden Einheiten
    // plausibel aus.
    expect(url.searchParams.get('wind_speed_unit')).toBe('kn');
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
    current: {
      time: '2026-08-11T08:00',
      surface_pressure: 987.9,
      temperature_2m: 29.2,
      wind_speed_10m: 12,
      wind_direction_10m: 250
    },
    current_units: { wind_speed_10m: 'kn' }
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

describe('deuteAntwort: Temperatur und Wind sind Beiwerk', () => {
  const gute = {
    elevation: 296,
    current: {
      time: '2026-08-11T08:00',
      surface_pressure: 987.9,
      temperature_2m: 29.2,
      wind_speed_10m: 12,
      wind_direction_10m: 250
    },
    current_units: { wind_speed_10m: 'kn' }
  };

  it('übernimmt Temperatur und Wind, wenn sie da sind', () => {
    const abruf = deuteAntwort(gute);

    expect(abruf.temperatureC).toBe(29.2);
    expect(abruf.wind).toStrictEqual({ fromDegTrue: 250, speedKt: 12 });
  });

  it.each([
    ['die Temperatur fehlt', 'temperature_2m'],
    ['die Windrichtung fehlt', 'wind_direction_10m'],
    ['die Windgeschwindigkeit fehlt', 'wind_speed_10m']
  ])('bringt den Abruf nicht zu Fall, wenn %s', (_beschreibung, feld) => {
    const current: Record<string, unknown> = { ...gute.current };
    delete current[feld];

    const abruf = deuteAntwort({ ...gute, current });

    // Der Luftdruck kommt trotzdem an — eine fehlende Nebengröße sperrt eine
    // Zeile im Dialog, nicht den ganzen Abruf.
    expect(abruf.stationPressureHpa).toBe(987.9);
  });

  it('lässt den Wind weg, wenn nur die Hälfte da ist', () => {
    const current: Record<string, unknown> = { ...gute.current };
    delete current.wind_speed_10m;

    expect(deuteAntwort({ ...gute, current }).wind).toBeUndefined();
  });

  it('lässt den Wind weg, wenn die Einheit nicht Knoten ist', () => {
    // Der Fall ist der gefährliche: 12 km/h sähen als 12 kt völlig
    // unverdächtig aus, wären aber weniger als ein Drittel davon.
    const abruf = deuteAntwort({ ...gute, current_units: { wind_speed_10m: 'km/h' } });

    expect(abruf.wind).toBeUndefined();
    expect(abruf.stationPressureHpa).toBe(987.9);
  });

  it('lässt eine negative Windgeschwindigkeit weg', () => {
    const abruf = deuteAntwort({
      ...gute,
      current: { ...gute.current, wind_speed_10m: -3 }
    });

    expect(abruf.wind).toBeUndefined();
  });

  it('beurteilt Temperatur und Wind sonst nicht', () => {
    // Wie beim Druck: Eine eigene Schranke wäre eine zweite Grenze neben der,
    // die der Reglerbereich ohnehin zieht (C-05).
    const abruf = deuteAntwort({
      ...gute,
      current: { ...gute.current, temperature_2m: -60, wind_speed_10m: 180 }
    });

    expect(abruf.temperatureC).toBe(-60);
    expect(abruf.wind).toStrictEqual({ fromDegTrue: 250, speedKt: 180 });
  });
});
