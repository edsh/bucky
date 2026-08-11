# Vertrag: `@edsh-bucky/deelk-poh-core`

Was das Paket nach diesem Feature zusätzlich nach außen anbietet. Bestehende
Ausfuhren bleiben unverändert.

## `toIsaDeviation(pressureAltitudeFt, outsideAirTemperatureC): IsaDeviationResult`

Die Umkehrung von `toOutsideAirTemperature`: aus einer gemessenen Temperatur und
der Druckhöhe, in der sie gilt, die Abweichung von der Standardatmosphäre.

```
ΔISA = OAT − (T₀ − L·h)
```

Steht in derselben Datei wie die Hinrichtung (`atmosphere/temperature.ts`) und
verwendet dieselben Konstanten `T0_C` und `LAPSE_RATE_K_PER_FT`. Eine zweite
Normtemperatur darf es nicht geben (Prinzip IV).

**Eingabe**: zwei Zahlen. Kein Platz, keine Koordinaten, kein Dienst.

**Ausgabe**: `IsaDeviationResult`, siehe [data-model.md](../data-model.md).

**Zusicherungen**

- `isaDeviationC` ist **ungerundet**; allein `settableIsaDeviationC` ist
  gerundet, und die Rundung selbst geschieht in `format.ts` (`roundCelsius`),
  nicht hier — C-03 duldet keine zweite Rundungsstelle im Kern.
- Der Reglerbereich (−30…40 °C) wird **nicht** geprüft. Das entscheidet die
  Oberfläche, so wie `toQnh` den QNH-Bereich nicht prüft. Die Funktion bleibt
  damit auch für die reine Anzeige brauchbar.
- Der Bereich der Druckhöhe wird ebenfalls nicht geprüft — dasselbe Verhalten
  wie `toOutsideAirTemperature`.
- Die Quellenreferenz ist `ICAO_STANDARD_ATMOSPHERE_SOURCE` mit
  `kind: 'standard'`. Eine POH-Seitenzahl gibt es nicht und wird nicht erfunden.

**Fehler** (`PohCalculationError`), in dieser Reihenfolge geprüft:

| Anlass | `kind` | Was die Meldung nennt |
|---|---|---|
| Druckhöhe keine endliche Zahl | `INVALID_INPUT` | Feld und beanstandeter Wert |
| Temperatur keine endliche Zahl | `INVALID_INPUT` | Feld und beanstandeter Wert |

## `toRunwayWindComponent(windFromDegTrue, windSpeedKt, runwayBearingDegTrue): RunwayWindComponent`

Zerlegt einen Wind in die Komponente entlang einer Bahnachse und die quer dazu.

```
α  = windFromDegTrue − runwayBearingDegTrue   (auf −180…180 gebracht)
HW = windSpeedKt · cos α        positiv = Gegenwind
XW = |windSpeedKt · sin α|
```

**Warum die Richtung so herum stimmt**: Die meteorologische Windrichtung nennt,
**woher** der Wind weht. Steht sie gleich der Bahnrichtung, bläst der Wind der
startenden Maschine entgegen — α ist null, der Kosinus eins, die Komponente
positiv. Das ist die Probe, die das Vorzeichen festnagelt.

**Eingabe**: drei Zahlen. Die Funktion kennt **keine** Bahn und **keinen** Platz
— die 103° und 283° von EDSH stehen im Adapter (→ [E3](../plan.md)), so wie
`toQnh` die Platzhöhe von EDSH nicht kennt.

**Ausgabe**: `RunwayWindComponent`, siehe [data-model.md](../data-model.md).

**Zusicherungen**

- `headwindComponentKt` und `crosswindComponentKt` sind **ungerundet**; allein
  `settableHeadwindComponentKt` ist gerundet, über `roundKnots` in `format.ts`.
- `angleDeg` liegt in −180…180. Die Normalisierung geschieht **einmal**; eine
  Windrichtung von 350° gegen eine Bahn von 010° ergibt −20°, nicht 340°.
- Der Reglerbereich (−10…50 kt) wird **nicht** geprüft. Das entscheidet die
  Oberfläche.
- Bei `windSpeedKt === 0` sind beide Komponenten null, unabhängig von der
  Richtung.
- Die Funktion greift nicht auf das Netz zu und liest keine Tabelle. Sie trägt
  deshalb **keine** POH-Quellenreferenz: Sie ist Trigonometrie, keine
  Handbuchauskunft. Das ist bewusst — eine erfundene Seitenzahl wäre schlimmer
  als keine (Prinzip I).

**Fehler** (`PohCalculationError`):

| Anlass | `kind` | Was die Meldung nennt |
|---|---|---|
| eine der drei Zahlen nicht endlich | `INVALID_INPUT` | Feld und beanstandeter Wert |
| `windSpeedKt` negativ | `INVALID_INPUT` | Feld und Wert — eine Windgeschwindigkeit hat kein Vorzeichen, die Richtung trägt es |

## Neue Zusicherung in `format.ts`

`roundCelsius(value)` — kaufmännisch auf ganze °C, wie `roundKnots` auf ganze
Knoten. Anders als beim QNH gibt es hier keine sichere Rundungsrichtung: Eine
Abweichung nach oben verlängert die ausgewiesene Startstrecke, eine nach unten
schönt die Reiseleistung. Wo beide Richtungen ein Risiko tragen, ist die
unverzerrte die richtige.

## Neue Zusicherung im Vertragstest

- **C-09 — kein Adapter zerlegt Wind selbst.** Keine Datei unter
  `apps/web/src` oder `apps/mcp/src` enthält `Math.cos`, `Math.sin`,
  `Math.atan2` oder `Math.PI`, und `toRunwayWindComponent` steht genau einmal
  im Kern.

  Dieselbe Bauart wie C-04 für die Druckhöhe, und aus demselben Grund: Die
  Zerlegung ist drei Zeilen lang und deshalb verlockend, sie „schnell" im
  Dialog zu machen. Ein Vorzeichenfehler dort ergäbe aus Gegenwind Rückenwind
  und aus einer sicheren eine gefährliche Startstrecke — und der Wert sähe
  weiterhin völlig plausibel aus.

- **Rundlauf ISA ↔ OAT.** Für eine Reihe von Druckhöhen und Abweichungen gilt:
  Wer mit `toOutsideAirTemperature` eine Temperatur bildet und sie mit
  `toIsaDeviation` zurückrechnet, erhält die Ausgangsabweichung wieder — auf
  mindestens neun Nachkommastellen. Dieselbe Probe wie C-08 für Druckhöhe und
  QNH, und aus demselben Grund: Sie kommt ohne eine zweite Rechnung aus, gegen
  die man sonst prüfen müsste.

## Ausfuhren

```ts
export {
  toOutsideAirTemperature,
  toIsaDeviation,
  type OutsideAirTemperatureResult,
  type IsaDeviationResult
} from './atmosphere/temperature.js';

export {
  toRunwayWindComponent,
  type RunwayWindComponent
} from './wind/runwayComponent.js';
```

`roundCelsius` wird wie die übrigen Rundungsfunktionen aus `format.ts`
mitausgeführt. `ICAO_STANDARD_ATMOSPHERE_SOURCE` ist bereits ausgeführt und
wird wiederverwendet, nicht verdoppelt.
