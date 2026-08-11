# Datenmodell: EDSH-Abruf um Temperatur und Pistenwind erweitern

Die Formen, die entstehen oder sich ändern. Kein Speicher, keine Datenbank —
alles lebt so lange wie der geöffnete Dialog.

## Im Kern

### `IsaDeviationResult`

Ergebnis von `toIsaDeviation`, spiegelbildlich zu `OutsideAirTemperatureResult`.

| Feld | Einheit | Bedeutung |
|---|---|---|
| `pressureAltitudeFt` | ft | Druckhöhe, auf die sich die Temperatur bezieht |
| `outsideAirTemperatureC` | °C | Die eingegebene Umgebungstemperatur |
| `standardTemperatureC` | °C | Normtemperatur in dieser Druckhöhe, ungerundet |
| `isaDeviationC` | °C | Temperatur minus Normtemperatur, **ungerundet** |
| `settableIsaDeviationC` | °C | Derselbe Wert auf ganze °C gerundet |

`settableIsaDeviationC` ist ein Rechen-, kein Anzeigewert: Der Regler nimmt nur
ganze Zahlen an. Gerundet wird in `format.ts` (C-03), kaufmännisch — anders als
beim QNH gibt es hier keine sichere Richtung, weil eine Abweichung nach oben die
Startstrecke verlängert und eine nach unten die Reiseleistung schönt.

### `RunwayWindComponent`

Ergebnis von `toRunwayWindComponent`.

| Feld | Einheit | Bedeutung |
|---|---|---|
| `windFromDegTrue` | ° | Richtung, **aus** der der Wind weht, rechtweisend |
| `windSpeedKt` | kt | Windgeschwindigkeit |
| `runwayBearingDegTrue` | ° | Rechtweisende Richtung der betrachteten Bahn |
| `angleDeg` | ° | Winkel zwischen Wind und Bahn, auf −180…180 gebracht |
| `headwindComponentKt` | kt | Längskomponente, **positiv = Gegenwind**, ungerundet |
| `crosswindComponentKt` | kt | Querkomponente, Betrag, ungerundet |
| `settableHeadwindComponentKt` | kt | Längskomponente auf ganze Knoten gerundet |

`crosswindComponentKt` wird als **Betrag** geführt und nicht mit Vorzeichen: Aus
welcher Seite der Seitenwind kommt, ist für die Startstrecke ohne Belang, und
ein Vorzeichen legte eine Bedeutung nahe, die es nicht hat. Angezeigt wird das
Feld in diesem Feature nicht (Out of Scope) — es fällt bei der Zerlegung an und
wird geführt, statt später ein zweites Mal gerechnet zu werden.

## Im Adapter

### `Runway`

Eine Bahnrichtung von EDSH. Steht in `edsh.ts` bei Koordinaten und Platzhöhe
(FR-018), nicht im Kern — der kennt keinen Platz.

| Feld | Bedeutung |
|---|---|
| `ident` | Kennung, wie der Pilot sie kennt: `'10'` oder `'28'` |
| `bearingDegTrue` | Rechtweisende Richtung: 103 bzw. 283 (→ [R2](./research.md)) |

Die Kennung ist **Beschriftung**, die Richtung ist **Rechengröße**. Sie
auseinanderzuhalten ist der Kern von R2: Die Kennung ist missweisend und
gerundet, die Richtung ist es nicht.

### `WetterAbruf` — erweitert

Was der Dienst geliefert hat, roh und ungerechnet.

| Feld | Einheit | Pflicht | Bedeutung |
|---|---|---|---|
| `stationPressureHpa` | hPa | ja | Druck in der Bezugshöhe (unverändert) |
| `elevationM` | m | ja | Höhe, auf die sich der Druck bezieht (unverändert) |
| `gueltigkeit` | ISO | ja | Zeitpunkt, für den die Werte **gelten** (unverändert) |
| `dienst` | — | ja | Name und Verweis für die Namensnennung (unverändert) |
| `temperatureC` | °C | **nein** | Lufttemperatur in 2 m |
| `wind` | — | **nein** | `{ fromDegTrue, speedKt }` in 10 m |

Der Luftdruck bleibt Pflicht: Er ist der Anlass des Abrufs, und ohne ihn ist
auch die Druckhöhe für die Temperaturumrechnung nicht zu haben (→
[R5](./research.md)). Temperatur und Wind sind einzeln entbehrlich — ihr Fehlen
sperrt eine Zeile, nicht den Dialog (FR-007).

`wind` ist ein Paar und nicht zwei Felder: Eine Windrichtung ohne
Geschwindigkeit ist nutzlos und eine Geschwindigkeit ohne Richtung ebenso. Als
Paar kann der Typ nicht halb belegt sein.

### `Uebernahmevorschlag`

Was der Dialog je Zeile führt. Drei Ausprägungen, eine Form.

| Feld | Bedeutung |
|---|---|
| `wert` | Der übernehmbare Wert in der Einheit des Reglers |
| `angezeigt` | Der Wert, wie er in der Vorschau steht |
| `erlaeuterung` | Woraus er entstand — die Angabe für FR-012/FR-013 |
| `uebernehmbar` | Ob er im Bereich des Reglers liegt und vorhanden ist |
| `hindernis` | Falls nicht: warum |
| `angehakt` | Ob das Kästchen gesetzt ist |

`uebernehmbar` wird gegen die Bereiche aus `getFuelPlanInputDomain()` und
`getTakeoffInputDomain()` bestimmt, nie gegen im Dialog geschriebene Zahlen
(C-05).

### `Herkunftsvermerk`

| Feld | Bedeutung |
|---|---|
| `dienst` | Name des Dienstes |
| `gueltigkeit` | Zeitpunkt, für den der Wert gilt |

Unverändert aus Feature 025, jetzt aber **dreimal** geführt — einmal je Regler
(→ [E6](./plan.md)). Er gehört zum Wert, nicht zum Dialog: Ein von Hand
verstellter Regler hat keine Herkunft mehr.

## Beziehungen

```
WetterAbruf ──┬─ stationPressureHpa ─→ toQnh ────────────────→ Vorschlag QNH
              │                          │
              │                          └→ toPressureAltitude ─┐
              ├─ temperatureC ────────────────────────────────→ toIsaDeviation
              │                                                  → Vorschlag ISA
              └─ wind ──┐
                        ├→ toRunwayWindComponent ─→ Vorschlag Pistenwind
   Runway (gewählt) ────┘
```

Der Pfeil von `toQnh` nach `toPressureAltitude` ist die Stelle aus R5: Die
Druckhöhe für die Temperaturumrechnung entsteht aus dem abgerufenen Druck, nicht
aus dem Reglerwert. Der ungerundete `qnhHpa` geht dort hinein, nicht der
abgerundete — sonst brächte die Rundung einen Sprung in die Temperatur.

Die gewählte Bahn ist die einzige Eingabe, die der Pilot im Dialog verändern
kann; sie wirkt allein auf den dritten Vorschlag (FR-011).
