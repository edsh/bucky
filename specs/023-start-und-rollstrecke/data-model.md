# Phase 1 — Datenmodell: Roll- und Startstrecke

Alle Typen liegen im Kern und sind für beide Zugangswege identisch
(Constitution, Prinzip IV). Feldnamen folgen der bestehenden Schreibweise:
camelCase mit angehängter Einheit.

## Neue Größe: Umgebungstemperatur

`OutsideAirTemperatureResult` — das Gegenstück zu `PressureAltitudeResult`.
Beide liegen in `atmosphere/`, weil sie aus einer Norm stammen und nicht aus
dem Flughandbuch.

| Feld | Einheit | Bedeutung |
|---|---|---|
| `pressureAltitudeFt` | ft | die Druckhöhe, auf die sich die Temperatur bezieht |
| `isaDeviationC` | °C | die eingegebene Abweichung von der Standardatmosphäre |
| `standardTemperatureC` | °C | die Normtemperatur in dieser Druckhöhe |
| `outsideAirTemperatureC` | °C | Normtemperatur plus Abweichung, ungerundet |

Quelle ist `ICAO_STANDARD_ATMOSPHERE_SOURCE` mit `kind: 'standard'` — dieselbe
Referenz, die die Druckhöhe schon trägt. Eine Seitenzahl gibt es nicht, und
eine anzugeben wäre erfunden.

Bezugsgröße ist ausdrücklich die **Druckhöhe**, nicht die Höhe über dem
Meeresspiegel: Nur so passen Temperatur- und Höhenachse derselben Tabelle
zusammen (→ [R2](./research.md)).

## Neue Eingabegröße: Startbedingungen

`TakeoffDistanceInput` — was den Start bestimmt.

| Feld | Typ | Bedeutung |
|---|---|---|
| `pressureAltitude` | `PressureAltitudeResult` | Druckhöhe des Platzes, **von außen** gebildet |
| `outsideAirTemperature` | `OutsideAirTemperatureResult` | Umgebungstemperatur, **von außen** gebildet |
| `windComponentKt` | number | positiv = Gegenwind, negativ = Rückenwind |
| `dryGrassRunway` | boolean | Anmerkung 3 des Handbuchs |
| `wetOrSnowRunway` | boolean | Anmerkung 4 des Handbuchs |

Die beiden Atmosphärengrößen kommen als **Ergebnisobjekte** herein, nicht als
blanke Zahlen. Sie tragen ihre Eingangsgrößen bei sich, und nur dadurch kann
das Modul die Herleitung als eigene Rechenschritte ausweisen, ohne sie selbst
zu kennen (FR-003, FR-008, FR-009).

Platzhöhe, QNH und ISA-Abweichung tauchen hier **nicht** auf. Genau das meint
die Vorgabe, die Parameter kämen von außen in das Modul.

## Wertebereiche der Startstrecke

`TAKEOFF_INPUT_DOMAIN` steht neben `INPUT_DOMAIN` und beschneidet dieses nicht
(→ [R4](./research.md)).

| Feld | Einheit | Bereich | Herkunft |
|---|---|---|---|
| `pressureAltitudeFt` | ft | 0 – 10 000 | Raster der Tabelle, 11 Stützstellen à 1000 |
| `outsideAirTemperatureC` | °C | −20 – 50 | Raster der Tabelle, 7 nicht gleichabständige Stützstellen |
| `windComponentKt` | kt | −10 – 50 | Rückenwindgrenze aus Anmerkung 2; Gegenwind wie bisher |

Die Regler der Oberfläche bleiben unverändert. Wo die Startstreckentabelle
früher endet als der Kraftstoffbedarf, zeigt der eine Bereich eine Meldung und
der andere weiter sein Ergebnis (FR-020).

## Neues Ergebnis: `TakeoffDistanceResult`

| Feld | Typ | Bedeutung |
|---|---|---|
| `pressureAltitude` | `PressureAltitudeResult` | unverändert durchgereicht |
| `outsideAirTemperature` | `OutsideAirTemperatureResult` | unverändert durchgereicht |
| `tableGroundRollM` | number | Startlauf laut Tabelle, vor allen Zuschlägen |
| `tableOverObstacleM` | number | Strecke über 15 m, vor allen Zuschlägen |
| `windAdjustmentPct` | number | negativ bei Gegenwind, positiv bei Rückenwind |
| `windAdjustmentCapped` | boolean | wahr, sobald der Deckel von 50 % greift |
| `windAdjustedGroundRollM` | number | Startlauf nach dem Windzuschlag |
| `windAdjustedOverObstacleM` | number | Hindernisstrecke nach dem Windzuschlag |
| `surfaceAllowancePct` | number | 0, 15, 20 oder 35 |
| `surfaceAllowanceM` | number | derselbe Anteil **des Startlaufs**, in Metern |
| `groundRollM` | number | Endergebnis Startlauf |
| `overObstacleM` | number | Endergebnis über das Hindernis |
| `obstacleLabel` | string | „15 m Hindernis", aus der Tabellendatei |
| `isMinimumValue` | boolean | wahr bei gesetztem Zuschlag nach Anmerkung 4 |
| `steps` | `CalculationStep[]` | fünf Schritte, siehe unten |
| `source` | `PohSourceReference` | Abb. 5-1a, Seiten 5b-2 und 5b-3 |
| `conditions` | `readonly string[]` | Bedingungen der Tabelle im Wortlaut |
| `notes` | `readonly Advisory[]` | die vier Anmerkungen im Wortlaut |
| `advisories` | `readonly Advisory[]` | Hinweise zur Rechnung, z. B. der Mindestwert |
| `preflightCheckNotice` | string | derselbe Hinweis wie beim Kraftstoffbedarf |

`conditions` und `notes` werden über `getTableConditions` und `getTableNote`
aus der Digitalisierung gelesen und nicht in der Oberfläche formuliert
(FR-016). Alle Zahlen bleiben **ungerundet**; gerundet wird erst bei der
Anzeige (→ [R5](./research.md)).

`surfaceAllowanceM` ist bewusst **eine** Größe und keine zwei: Derselbe Betrag
wird auf beide Strecken aufgeschlagen, weil der zusätzlich gerollte Weg den
Abhebepunkt verschiebt und damit die gesamte Strecke um genau diesen Betrag.

## Rechenschritte

Die Reihenfolge ist die aus FR-007 und wird als Kette benannter Schritte
sichtbar gemacht.

| `id` | Was der Schritt zeigt | `anchors` |
|---|---|---|
| `takeoff-pressure-altitude` | Platzhöhe und QNH → Druckhöhe | keine |
| `takeoff-outside-air-temperature` | Druckhöhe und ISA-Abweichung → Umgebungstemperatur | keine |
| `takeoff-table-lookup` | Nachschlagen in Abb. 5-1a | bis zu **vier** |
| `takeoff-wind-adjustment` | Anmerkung 2 auf beide Werte | keine |
| `takeoff-surface-allowance` | Anmerkungen 3 und 4 auf beide Werte | keine |

Die beiden letzten Schritte entfallen, wenn nichts anzuwenden ist — bei
Windstille auf befestigter, trockener Bahn bleiben drei Schritte.

Der Nachschlage-Schritt trägt bis zu vier Stützwerte, weil über zwei Achsen
zugleich interpoliert wird. Liegt eine Achse genau auf einer Stützstelle, sind
es zwei; liegen beide darauf, ist es einer. Ohne diese Werte könnte der Pilot
das Ergebnis nicht gegen die gedruckte Tabelle halten.

## Regeln der Zuschläge

**Wind** (Anmerkung 2), anteilig statt in Stufen — so entschieden in den
Clarifications der Spec:

```text
Gegenwind:  windAdjustmentPct = −10 % · (Gegenwind in kt / 9), gedeckelt bei −50 %
Rückenwind: windAdjustmentPct = +10 % · (Rückenwind in kt / 2)
```

Der Deckel greift ab 45 kt Gegenwind. Rückenwind über 10 kt wird abgelehnt,
weil Anmerkung 2 dort endet.

**Bahnzustand** (Anmerkungen 3 und 4), additiv auf dieselbe Bezugsgröße:

```text
surfaceAllowancePct = (dryGrassRunway ? 15 : 0) + (wetOrSnowRunway ? 20 : 0)
surfaceAllowanceM   = windAdjustedGroundRollM · surfaceAllowancePct / 100
groundRollM         = windAdjustedGroundRollM   + surfaceAllowanceM
overObstacleM       = windAdjustedOverObstacleM + surfaceAllowanceM
```

Beide Anmerkungen beziehen ihren Aufschlag ausdrücklich auf den Startlauf.
Daraus folgt die Addition: 15 % + 20 % ergeben 35 %, nicht 38 % — nacheinander
zu multiplizieren würde den zweiten Zuschlag auf einen Startlauf beziehen, den
das Handbuch nicht meint.

## Erweiterte Interpolation

`interpolateGrid` interpoliert über zwei Achsen und liefert dasselbe
Ergebnisformat wie `interpolate`, ergänzt um die zweite Lage.

| Feld | Typ | Bedeutung |
|---|---|---|
| `values` | `Record<string, number>` | wie bisher |
| `anchors` | `TableAnchor[]` | bis zu vier, jeder mit **beiden** Koordinaten in `at` |
| `fraction` | number | Lage auf der ersten Achse |
| `secondaryFraction` | number | Lage auf der zweiten Achse |

Innen läuft die Funktion über die bestehende `interpolate`: Sie klammert die
erste Achse ein und ruft für jeden der beiden Nachbarn die eindimensionale
Interpolation entlang der zweiten Achse auf, mit der ersten als `where`. Die
Achsen bleiben damit voneinander unabhängig, und das nicht gleichabständige
Temperaturraster wird von selbst richtig behandelt.

## Neue Fehlermeldung

`outsideAirTemperatureOutOfRange` steht neben `pressureAltitudeOutOfRange` und
folgt derselben Überlegung: Die beanstandete Größe ist keine Eingabe. Die
Meldung nennt deshalb die errechnete Temperatur, den zulässigen Bereich **und**
beide Ursachen — Druckhöhe und ISA-Abweichung. Sonst suchte der Pilot den
Fehler an der falschen Stellschraube.

## Anzeige

`formatMetres` gibt ganze Meter aus. Mehr Stellen behaupteten eine Genauigkeit,
die die Interpolation nicht hat; die Tabelle selbst ist auf ganze Meter
gedruckt. Die Funktion liegt in `format.ts`, damit die Rundung dort bleibt, wo
die Zusicherung C-03 sie erwartet.
