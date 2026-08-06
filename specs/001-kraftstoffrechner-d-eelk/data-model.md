# Phase 1 — Data Model: Kraftstoffrechner für D-EELK

Alle Typen leben im Kernpaket `@edsh-bucky/deelk-poh-core` und sind für beide Zugangswege
identisch (Constitution-Prinzip IV).

## Flugvorhaben (`FlightPlanInput`)

Die vom Piloten erfassten Werte. Alle Felder sind Pflichtfelder (FR-008).

| Feld | Einheit | Wertebereich | Anmerkung |
|---|---|---|---|
| `departureAltitudeFt` | ft Druckhöhe | 0 – 18000 | Platzhöhe des Startplatzes |
| `cruiseAltitudeFt` | ft Druckhöhe | 0 – 18000 | muss größer als `departureAltitudeFt` sein |
| `distanceNm` | NM | > 0 | Gesamtflugstrecke |
| `powerSettingPct` | % Last | 50 – 100 | Verfügbarkeit ist höhenabhängig, siehe unten |
| `isaDeviationC` | °C | −30 – +40 | Abweichung von der ISA-Temperatur |
| `windComponentKt` | kt | −50 – +50 | positiv = Gegenwind, negativ = Rückenwind |

Abflugmasse und Tankvariante sind **keine** Eingaben: D-EELK ist eine F172N mit
Standardtanks, damit ist je Tabellenart genau eine Tabelle anwendbar.

### Validierungsregeln

- **V-01**: `cruiseAltitudeFt > departureAltitudeFt`, sonst liefert die
  Differenzbildung des POH-Verfahrens kein Ergebnis.
- **V-02**: Beide Höhen liegen innerhalb des Tabellenrasters 0 – 18000 ft.
- **V-03**: Die Kombination aus `cruiseAltitudeFt` und `powerSettingPct` ist im
  Raster der Reiseleistungstabelle belegt — bei **beiden** die Höhe einschließenden
  Stützstellen:

  | Druckhöhe | verfügbare Lasteinstellungen |
  |---|---|
  | 0 – 8000 ft | 50 – 100 % |
  | 10000 – 14000 ft | 50 – 90 % |
  | 16000 – 18000 ft | 50 – 80 % |

- **V-04**: Es werden ausschließlich Tabellen mit
  `applicability.applicable_to_d_eelk === true` herangezogen. Der Zugriff auf eine
  andere Tabelle ist ein Programmfehler, kein Eingabefehler.
- **V-05**: Die korrigierte Steigflugstrecke ist kleiner als `distanceNm`.
- **V-06**: Die Geschwindigkeit über Grund ist größer als null.

V-01 bis V-03 werden vor der Berechnung geprüft (FR-008), V-05 und V-06 ergeben
sich erst während der Rechnung und führen dort zum Abbruch mit einer erklärenden
Meldung.

**V-06 ist mit gültiger Eingabe derzeit nicht erreichbar**: die kleinste KTAS der
Reiseleistungstabelle ist 95 kt, der stärkste zulässige Gegenwind 50 kt. Die
Prüfung bleibt als Absicherung gegen künftige Änderungen des Wertebereichs
stehen.

### Hinweise ohne Abbruch

- `powerSettingPct > 75` → Anmerkung 4 der Reiseleistungstabelle wiedergeben.
- Immer → Hinweis, dass die Summe weder Reserve noch Sinkflug noch
  Ausweichflugplatz enthält (FR-018).
- Immer → Hinweis, dass die Temperaturkorrektur zusätzlich auf den
  Steigflug-Kraftstoff wirkt, abweichend vom Wortlaut der Anmerkung 2 (FR-019).
- Immer → Hinweis, dass nur das Ergebnis gerundet wird, das Rechenbeispiel des
  Handbuchs dagegen nach jedem Schritt, und dass beim Nachrechnen von Hand
  deshalb rund ±0,6 l Unterschied entstehen können (FR-020).
- Immer → Hinweis, dass die Steigflugwerte für die maximale Abflugmasse von
  1043 kg gelten.

## Rundungsstellen der Ausgabe (FR-021)

Gerundet wird ausschließlich in `format.ts`, und zwar erst am Ende der
Schrittfolge:

| Größe | Stelle | Beispiel |
|---|---|---|
| Kraftstoffmenge | 0,1 l | `87,6 l` |
| Zeit | ganze Minuten | `24 min` |
| Strecke | 0,1 NM | `36,8 NM` |
| Geschwindigkeit | ganze Knoten | `122 kt` |

## Quellenreferenz (`SourceReference`)

Wird unverändert aus den JSON-Dateien übernommen und nicht im Code neu formuliert.

| Feld | Beschreibung |
|---|---|
| `tableId` | z. B. `5b-cruise-standard-1043kg` |
| `figure` | z. B. `Abb. 5-4a` |
| `tableName` | Tabellenname aus dem POH |
| `pohPages` | z. B. `["5b-14", "5b-15", "5b-16"]` |
| `citation` | fertige Zitatzeile aus `source.citation` |

## Tabellen-Eckwert (`TableAnchor`)

Ein tatsächlich aus der Tabelle gelesener Stützwert, der in die Interpolation
eingegangen ist.

| Feld | Beschreibung |
|---|---|
| `at` | die Stützstelle, z. B. `{ pressureAltitudeFt: 6000, powerSettingPct: 70 }` |
| `values` | die dort abgelesenen Werte, z. B. `{ ktas: 116, fuelFlowLph: 22.1 }` |
| `source` | `SourceReference` der Tabelle |

## Rechenschritt (`CalculationStep`)

Die Berechnung gibt eine geordnete Folge dieser Schritte zurück (FR-017). Ein
Schritt ist die kleinste Einheit, die ein Pilot von Hand gegen das Handbuch
nachrechnen kann.

| Feld | Beschreibung |
|---|---|
| `id` | stabiler Bezeichner, z. B. `climb.temperatureCorrection` |
| `label` | deutschsprachige Bezeichnung des Schritts |
| `inputs` | benannte Eingangswerte mit Einheit |
| `results` | benannte Ergebniswerte mit Einheit — Mehrzahl, weil ein Schritt des POH-Verfahrens regelmäßig Zeit, Strecke und Kraftstoff zugleich liefert |
| `anchors` | verwendete `TableAnchor` (leer bei rein rechnerischen Schritten) |
| `explanation` | ein Satz, wie sich das Ergebnis aus den Eingangswerten ergibt |
| `sources` | die `SourceReference` aller beteiligten Tabellen |

### Schrittfolge

1. `startup.taxiTakeoff` — Festbetrag 4 l (FR-011)
2. `climb.atDeparture` — Tabellenwerte bei Platzhöhe des Startplatzes
3. `climb.atCruise` — Tabellenwerte bei Reiseflughöhe
4. `climb.difference` — Zeit, Strecke, Kraftstoff als Differenz (FR-010)
5. `climb.temperatureCorrection` — plus 10 % je 10 °C über ISA (FR-012)
6. `cruise.tableLookup` — KTAS und Verbrauchsrate (FR-015)
7. `cruise.ktasTemperatureCorrection` — plus 1 % je 10 °C über ISA (FR-013)
8. `cruise.distance` — Gesamtstrecke minus Steigflugstrecke (FR-014)
9. `cruise.groundSpeed` — KTAS minus Windkomponente (FR-014)
10. `cruise.time` — Strecke geteilt durch Geschwindigkeit über Grund (FR-014)
11. `cruise.fuel` — Zeit mal Verbrauchsrate (FR-014)
12. `total.fuel` — Summe der drei Anteile (FR-009)
13. `total.usableFuelComparison` — Gegenüberstellung zur ausfliegbaren Menge (FR-016)

## Berechnungsergebnis (`FuelPlanResult`)

| Feld | Beschreibung |
|---|---|
| `input` | das validierte `FlightPlanInput` |
| `steps` | die Folge der `CalculationStep` |
| `breakdown` | `{ taxiTakeoffL, climbL, cruiseL, totalL }` (FR-009) |
| `usableFuelL` | ausfliegbare Menge der Standardtanks, 127,4 l |
| `exact` | dieselbe Aufschlüsselung ungerundet, damit Adapter nichts nachrechnen müssen |
| `remainingFuelL` | `usableFuelL − totalL`, kann negativ sein; **keine** Reserve im betrieblichen Sinne |
| `exceedsUsableFuel` | `true`, wenn der **ungerundete** Bedarf `usableFuelL` erreicht (FR-016); ein Bedarf von 127,44 l würde gerundet genau die Warnung verschlucken, die er auslösen soll |
| `advisories` | Hinweise ohne Abbruch, siehe oben |
| `sources` | alle verwendeten `SourceReference`, dedupliziert (FR-005) |
| `preflightCheckNotice` | der Prüfhinweis, im Kern erzeugt (FR-006) |

## Fehler (`PohCalculationError`)

Die Berechnung wirft statt einen Wert zu erfinden (FR-007). Jeder Fehler nennt das
betroffene Feld, den zulässigen Bereich und, wo sinnvoll, die Tabelle, deren Raster
die Grenze setzt.

| Art | Auslöser |
|---|---|
| `OUT_OF_RANGE` | Wert außerhalb des Tabellenrasters (V-02) |
| `UNSUPPORTED_COMBINATION` | Höhe/Last im Tabellenraster nicht belegt (V-03) |
| `INVALID_INPUT` | fehlender Wert oder V-01 verletzt |
| `NOT_COMPUTABLE` | V-05 oder V-06 während der Rechnung verletzt |

## Datengrundlage (bereits vorhanden)

Die 13 JSON-Dateien unter `data/poh/d-eelk/tables/` mit `data/poh/d-eelk/index.json`
als Katalog. Sie werden von `tools/poh/extract_d_eelk.py` erzeugt und von
`tools/poh/verify_d_eelk.py` geprüft; sie sind **generiert und nicht von Hand zu
bearbeiten**. Für dieses Feature relevant sind genau zwei davon:

- `5b-climb-time-dist-fuel-1043kg` (Abb. 5-3a)
- `5b-cruise-standard-1043kg` (Abb. 5-4a)

Die übrigen elf sind entweder für D-EELK nicht anwendbar (Tabellen für 1089 kg
sowie für Langstrecken- und Integraltank, erkennbar an
`applicability.applicable_to_d_eelk === false`) oder gehören zu anderen
Berechnungen (Start- und Rollstrecken, Steigraten).
