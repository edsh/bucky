# Phase 1 — Datenmodell: Schieberegler und Höhe ASL statt Druckhöhe

**Feature**: 004 | **Datum**: 2026-08-06

Dieses Feature führt keine gespeicherten Daten ein. Beschrieben sind die
Größen, die zwischen Oberfläche, Kern und MCP-Adapter fließen, und die
Änderungen an bestehenden Typen aus Feature 001.

## Geänderte Eingabe

### `FlightPlanInput`

Die beiden Druckhöhen entfallen als Eingabe und werden durch drei Größen
ersetzt.

| Feld | vorher | nachher | Einheit |
|---|---|---|---|
| `departureAltitudeFt` | Druckhöhe Startplatz | **entfällt** | — |
| `cruiseAltitudeFt` | Druckhöhe Reiseflug | **entfällt** | — |
| `departureElevationFt` | — | **neu**: Platzhöhe über dem Meeresspiegel | ft |
| `cruiseAltitudeAmslFt` | — | **neu**: Reiseflughöhe über dem Meeresspiegel | ft |
| `qnhHpa` | — | **neu**: Luftdruck auf Meereshöhe | hPa |
| `distanceNm` | unverändert | unverändert | NM |
| `powerSettingPct` | unverändert | unverändert | % |
| `isaDeviationC` | unverändert | unverändert | °C |
| `windComponentKt` | unverändert | unverändert | kt |

**Prüfregeln**:

- Jede Größe liegt in ihrem Bereich aus `InputDomain` (unverändertes Verfahren
  aus Feature 001).
- `cruiseAltitudeAmslFt > departureElevationFt`. Die Prüfung wandert von der
  Druckhöhe auf die Höhe über dem Meeresspiegel; weil beide mit demselben QNH
  umgerechnet werden, bleibt die Reihenfolge erhalten und die Aussage
  gleichwertig.
- Beide errechneten Druckhöhen liegen im Bereich, den die anwendbaren Tabellen
  abdecken. Andernfalls bricht die Berechnung ab (FR-006).

## Neue Größe

### `PressureAltitudeResult`

Das Ergebnis der Umrechnung, je Höhe einmal.

| Feld | Bedeutung | Einheit |
|---|---|---|
| `elevationFt` | die eingegebene Höhe über dem Meeresspiegel | ft |
| `qnhHpa` | der verwendete Luftdruck | hPa |
| `pressureAltitudeFt` | die errechnete Druckhöhe | ft |
| `deviationFromRuleOfThumbFt` | Abstand zur Faustformel 30 ft/hPa | ft |

`deviationFromRuleOfThumbFt` erfüllt FR-009: Ein Pilot, der im Kopf
überschlägt, erhält eine andere Zahl und muss erkennen können, dass das kein
Fehler ist.

## Geänderter Typ: Quellenangabe

`SourceReference` wird zu einem unterschiedenen Typ, weil die Umrechnung nicht
aus dem Handbuch stammt (siehe research.md, Punkt 2).

```text
SourceReference = PohSourceReference | StandardSourceReference

PohSourceReference
  kind: 'poh'
  tableId, figure, tableName, pohPages, issue, revision, citation   (unverändert)

StandardSourceReference
  kind: 'standard'
  standard   z. B. "ICAO Doc 7488, Manual of the ICAO Standard Atmosphere"
  formula    die verwendete Formel im Klartext
  citation   vollständige Angabe für die Anzeige
```

**Folge für die Adapter**: Beide Ausprägungen tragen `citation`, sodass eine
Anzeige, die nur diese liest, unverändert weiterläuft. Wer den Prüfhinweis
„gegen das Original-POH gegenchecken" ausgibt, MUSS künftig auf `kind: 'poh'`
einschränken — für eine Norm gibt es keine Handbuchseite.

## Geänderter Typ: Wertebereiche

### `InputDomain`

| Feld | Änderung |
|---|---|
| `departureAltitudeFt` | ersetzt durch `departureElevationFt` |
| `cruiseAltitudeFt` | ersetzt durch `cruiseAltitudeAmslFt` |
| `qnhHpa` | neu |
| `distanceNm` | erhält eine endliche obere Grenze (900 NM) |
| `powerSettingsByPressureAltitude` | unverändert; bezieht sich weiterhin auf die Druckhöhe |

### `NumericRange`

Erhält ein Feld `step` — die Schrittweite, mit der ein Regler den Bereich
durchfährt. Ohne sie müsste die Oberfläche sie erfinden, was FR-002
widerspräche.

## Neuer Rechenschritt

Der Rechenweg wächst von 13 auf 15 Schritte. Zwei neue Schritte stehen am
Anfang, je einer für Startplatz und Reiseflug:

| Feld | Inhalt |
|---|---|
| `id` | `pressureAltitude.departure` bzw. `pressureAltitude.cruise` |
| `label` | „Druckhöhe Startplatz" bzw. „Druckhöhe Reiseflug" |
| `inputs` | Höhe über dem Meeresspiegel, QNH |
| `results` | Druckhöhe, Abstand zur Faustformel |
| `anchors` | leer — kein Tabellenwert beteiligt |
| `sources` | die Norm-Referenz |
| `explanation` | Formel, eingesetzte Werte und der Hinweis auf die Faustformel |

Alle bestehenden Schritte bleiben unverändert; sie rechnen weiterhin mit
Druckhöhen, die sie nun aus diesen beiden Schritten beziehen.

## Neuer Fehlerfall

| Kennung | Auslöser | Inhalt der Meldung |
|---|---|---|
| `PRESSURE_ALTITUDE_OUT_OF_RANGE` | errechnete Druckhöhe außerhalb des Tabellenbereichs | errechnete Druckhöhe, überschrittene Grenze, Höhe und QNH als Ursache, Hinweis, dass das Handbuch diesen Bereich nicht abdeckt |

Er nutzt den bestehenden Fehlertyp aus Feature 001 und ergänzt nur eine
Kennung.
