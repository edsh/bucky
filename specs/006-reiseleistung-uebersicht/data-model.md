# Phase 1 — Datenmodell: Reiseleistungs-Übersicht

## Neue Eingabegröße: Bedingungen des Reiseflugs

`CruiseConditionsInput` — die vier Größen, von denen die Übersicht allein
abhängt. Sie sind eine Teilmenge von `FlightPlanInput`; die Feldnamen bleiben
gleich, damit ein Adapter dieselbe Variable an beide Funktionen reichen kann.

| Feld | Einheit | Bereich | Schritt | Herkunft der Grenze |
|---|---|---|---|---|
| `cruiseAltitudeAmslFt` | ft | 0 – 18 000 | 100 | unverändert aus Feature 004 |
| `qnhHpa` | hPa | 950 – 1050 | 1 | unverändert aus Feature 004 |
| `powerSettingPct` | % | 50 – 100 | 10 | aus dem Tabellenraster abgeleitet |
| `isaDeviationC` | °C | −30 – +40 | 1 | unverändert aus Feature 001 |

Streckenlänge, Platzhöhe und Windkomponente gehören **nicht** dazu (FR-009).

## Neues Ergebnis: `CruiseCapability`

| Feld | Typ | Bedeutung |
|---|---|---|
| `pressureAltitude` | `PressureAltitudeResult` | die aus Höhe und QNH errechnete Druckhöhe |
| `tableKtas` | number | Eigengeschwindigkeit laut Tabelle, vor der Korrektur |
| `ktas` | number | Eigengeschwindigkeit nach der Temperaturkorrektur |
| `fuelFlowLph` | number | Verbrauch je Stunde in l |
| `fuelFlowUsGph` | number | derselbe Verbrauch aus der eigenen US-gph-Spalte |
| `tableRangeNm` | number | maximale Strecke laut Tabelle, vor der Korrektur |
| `maxRangeNm` | number | maximale Strecke nach der Temperaturkorrektur |
| `enduranceH` | number | Flugdauer; **nicht** temperaturkorrigiert |
| `temperatureFactor` | number | der angewandte Faktor, 1 bei ISA ≤ 0 |
| `steps` | `CalculationStep[]` | Druckhöhe, Nachschlagen, Temperaturkorrektur |
| `source` | `PohSourceReference` | Abb. 5-4a mit Seiten 5b-14 bis 5b-16 |
| `inclusionsNote` | string | Anmerkung 2 im Wortlaut der Tabelle |
| `windlessNote` | string | die Bedingung „Windstille" im Wortlaut |
| `preflightCheckNotice` | string | derselbe Hinweis wie beim Gesamtergebnis |

`inclusionsNote` und `windlessNote` werden aus der Tabellendatei gelesen —
die Anmerkung über `getTableNote(CRUISE_TABLE_ID, 2)`, die Bedingung aus den
`conditions` derselben Tabelle — und nicht in der Oberfläche formuliert.
Ändert sich der Wortlaut der Digitalisierung, ändert sich die Anzeige mit.

## Erweiterung von `FuelPlanResult`

Ein neues Feld `cruiseCapability: CruiseCapability`. Die bestehende
`cruisePerformance` bleibt unverändert bestehen: Sie enthält Größen des
**konkreten Vorhabens** (Geschwindigkeit über Grund, Reiseflugzeit der
eingegebenen Strecke), die `CruiseCapability` bewusst nicht führt.

Damit stehen im Ergebnis zwei Zeitangaben nebeneinander:

| Größe | Quelle | Bedeutung |
|---|---|---|
| `cruisePerformance.timeH` | gerechnet | Reiseflugzeit der **eingegebenen** Strecke, mit Wind |
| `cruiseCapability.enduranceH` | Tabelle | maximale Flugdauer, bei Windstille, mit Reserve |

Ebenso zwei Streckenangaben: die eingegebene `input.distanceNm` und die
ausgewiesene `cruiseCapability.maxRangeNm`. FR-010 verlangt, dass die
Oberfläche sie unterscheidbar benennt.

## Neue Rechenschritte

| ID | Bezeichnung | Quelle |
|---|---|---|
| `capability.pressureAltitude` | Druckhöhe des Reiseflugs | ICAO-Standardatmosphäre |
| `capability.tableLookup` | Reiseleistung bei Druckhöhe und Lasteinstellung | Abb. 5-4a |
| `capability.temperatureCorrection` | Temperaturkorrektur von Geschwindigkeit und Strecke | Abb. 5-4a, Anmerkung 3 |

Der Schritt `capability.tableLookup` führt in `results` alle fünf Spalten und in
`anchors` die verwendeten Stützwerte — wie jeder Nachschlageschritt.

## Fehlerfälle

| Fall | Code | Verhalten |
|---|---|---|
| Reiseflughöhe außerhalb 0 – 18 000 ft | `OUT_OF_RANGE` | Ablehnung, Feld `cruiseAltitudeAmslFt` |
| QNH oder ISA-Abweichung außerhalb | `OUT_OF_RANGE` | Ablehnung mit Feldnamen |
| Druckhöhe außerhalb des Tabellenrasters | `PRESSURE_ALTITUDE_OUT_OF_RANGE` | Ablehnung, Meldung nennt Höhe und QNH als Ursache |
| Lasteinstellung in dieser Höhe nicht geführt | `UNSUPPORTED_COMBINATION` | Ablehnung, Meldung nennt die dort verfügbaren Werte |

Alle vier Meldungen entstehen im Kern und werden von der Oberfläche wortgleich
gezeigt (Zusicherung C-02).

## Unveränderte Größen

- Die digitalisierten Tabellen. Es wird nichts erfasst und nichts geändert.
- Die Bedarfsrechnung. Weder Zahlen noch Schritte des Kraftstoffbedarfs ändern
  sich; es kommen nur Schritte hinzu.
- Die ausfliegbare Menge (127,4 l / 33,6 US gal) und ihr Vergleich mit der
  Summe, samt dem Hinweis, dass diese Summe keine Reserve enthält (FR-007).
