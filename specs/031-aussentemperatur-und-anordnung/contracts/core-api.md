# Contracts: Kern- und Komponentenschnittstellen

**Feature**: 031 | **Phase**: 1

---

## Kern: `@edsh-bucky/deelk-poh-core`

### Neu — `getOutsideAirTemperatureRange`

```ts
/**
 * Die Anschläge eines Temperaturreglers in einer gegebenen Druckhöhe.
 *
 * Abgeleitet aus `ISA_DEVIATION_RANGE`, verschoben um die Normtemperatur —
 * es gibt weiterhin genau eine Stelle, an der die Grenzen stehen.
 */
export function getOutsideAirTemperatureRange(pressureAltitudeFt: number): NumericRange;
```

**Zusicherung**: Für jedes ganzzahlige `t` mit `min <= t <= max` liegt
`toIsaDeviation(h, t).isaDeviationC` innerhalb von `ISA_DEVIATION_RANGE`.
Das ist der Daseinsgrund der Funktion und wird als Eigenschaft geprüft.

**Rundung**: `min` aufwärts, `max` abwärts — nach innen, damit die Zusicherung
an beiden Enden hält. `step: 1`, `unit: '°C'`.

**Nicht geprüft**: ob die Druckhöhe selbst sinnvoll ist. Wie
`toOutsideAirTemperature` prüft die Funktion keinen Tabellenbereich; das
entscheiden die Rechenfunktionen.

### Neu — `formatCelsiusPrecise`

```ts
/** Temperatur mit einer Nachkommastelle, für abgeleitete Werte. */
export function formatCelsiusPrecise(value: number): string;
```

Für Größen, die nicht aus einem ganzzahligen Regler stammen und deren
Rundungsdifferenz sichtbar wäre (R2). `formatCelsius` bleibt für Reglerwerte.

### Verschoben — `ISA_DEVIATION_RANGE`

Von `fuel/input.ts` nach `atmosphere/temperature.ts`. Grund: Die neue Funktion
braucht ihn, und `fuel/input.ts` importiert bereits aus `atmosphere/` — die
andere Richtung ergäbe einen Ringschluss. Fachlich gehört eine Aussage über die
Standardatmosphäre ohnehin dorthin.

`getFuelPlanInputDomain()` bezieht ihn künftig von dort. Die öffentliche
Schnittstelle bleibt unverändert: `domain.isaDeviationC` gibt es weiterhin.

### Unverändert

`toOutsideAirTemperature`, `toIsaDeviation`, `computeTakeoffDistance`,
`computeCruiseCapability`, `computeFuelPlan`, `getFuelPlanInputDomain`,
`getTakeoffInputDomain`, `toRunwayWindComponent`.

Bemerkenswert: **Keine Rechenfunktion ändert ihre Signatur.** Sie nehmen
weiterhin eine ISA-Abweichung entgegen — nur reicht die Oberfläche jetzt eine
abgeleitete statt einer eingegebenen hinein.

---

## Komponente: `WetterAbrufDialog.svelte`

```ts
export interface Uebernahmewerte {
  qnhHpa?: number;
  outsideAirTemperatureC?: number;   // vorher: isaDeviationC
  runwayWindComponentKt?: number;
}

interface Props {
  qnhBereich: NumericRange;
  temperaturBereich: NumericRange;    // vorher: isaBereich; jetzt veränderlich
  pistenwindBereich: NumericRange;
  uebernehmen: (werte: Uebernahmewerte, herkunft: Herkunft) => void;
}

export function oeffnen(): void;      // unverändert
```

**Verhalten unverändert**: Zustände `laedt | vorschau | fehler`; Vorwahl der
Bahn mit dem größeren Gegenwind; ein Bahnwechsel rechnet nur neu, ohne Abruf und
ohne Kästchen zurückzusetzen; Übernehmbarkeit wird gegen den **gerundeten** Wert
geprüft.

**Verhalten neu**: Die Bahnwahl steht in der Windzeile und erscheint nur, wenn
die Windzeile einen Wert trägt.

**Testkennungen**: `wetter-zeile-isa` → `wetter-zeile-temperatur`, ebenso
`wetter-haken-*`, `wetter-wert-*`, `wetter-genauer-*`, `wetter-hindernis-*`.
`wetter-bahnwahl` bleibt, wandert aber in die Windzeile.

---

## Komponente: `TakeoffDistance.svelte`

```ts
interface Props {
  result?: TakeoffDistanceResult;
  fehler?: string;
  dryGrass: boolean;                 // bindable
  wetOrSnow: boolean;                // bindable
  windComponentKt: number;           // bindable
  windHerkunft?: string;
  windBedient?: () => void;
  wetterAbrufen?: () => void;        // NEU
}
```

`wetterAbrufen` ist bewusst ein reiner Auslöser ohne Rückgabe: Die Komponente
soll nicht wissen, dass am anderen Ende ein Dialog hängt, geschweige denn was er
zurückgibt. Sie kennt weder Dienst noch Gültigkeitszeit — dieselbe Trennung wie
bei `windHerkunft`.

Ist der Prop nicht gesetzt, erscheint kein Knopf. Die Komponente bleibt damit
ohne Wetterabruf verwendbar.

---

## Oberfläche: `+page.svelte`

Keine öffentliche Schnittstelle. Für die Prüfungen festgehalten:

| Kennung | vorher | künftig |
|---|---|---|
| Regler | `#isa` | `#temperatur` |
| Herkunftsvermerk | `isa-herkunft` | `temperatur-herkunft` |
| Folgezeile (neu) | — | `isa-ableitung` |
| Knopf am QNH | vorhanden | unverändert |
| Knopf an Temperatur/Pistenwind | — | neu, gleiche Beschriftung „EDSH" |

---

## Was ausdrücklich nicht Vertrag ist

- Die genaue Beschriftung der Folgezeile — sie darf sich ändern, solange sie
  die abgeleitete Abweichung nennt.
- Die Stelle des Dialogs im Auszeichnungsbaum.
- Die Klassennamen des Rasters.
