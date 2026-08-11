# Data Model: Außentemperatur statt ISA-Abweichung

**Feature**: 031 | **Phase**: 1

Das Feature führt keine gespeicherten Daten ein. Was sich ändert, ist die
Rollenverteilung zwischen zwei Größen, die es beide schon gibt.

---

## Der Rollentausch

| Größe | bisher | künftig |
|---|---|---|
| Außentemperatur am Platz | abgeleitet, nur intern für die Startstreckentabelle | **Eingabe** |
| ISA-Abweichung | Eingabe | **abgeleitet**, sichtbar als Folgezeile |

Beide Umrechnungsrichtungen liegen bereits im Kern
(`atmosphere/temperature.ts`): `toOutsideAirTemperature` und `toIsaDeviation`.
Es entsteht keine neue Rechnung, nur eine andere Leserichtung.

---

## Zustand der Oberfläche

### Neu

**`outsideAirTemperatureC: number`** — die Außentemperatur am Platz in ganzen °C.

- *Herkunft*: Reglereingabe oder Wetterabruf
- *Anfangswert*: Normtemperatur der Anfangsdruckhöhe + 10 °C, gerundet (R3)
- *Bereich*: `getOutsideAirTemperatureRange(platzDruckhoehe.pressureAltitudeFt)`,
  wandert mit Platzhöhe und Luftdruck
- *Wird nie automatisch nachgeführt* — sie ist eine Messung, keine Folgerung

**`temperaturBereich: NumericRange`** (`$derived`) — die Anschläge des Reglers.

**`isaAbleitung: IsaDeviationResult`** (`$derived`) — was aus Temperatur und
Platzdruckhöhe folgt. Trägt sowohl den ungerundeten Wert (für die Rechnung) als
auch `settableIsaDeviationC`.

### Entfällt

**`isaDeviationC: number`** als Zustand. Der Wert lebt weiter, aber als
`isaAbleitung.isaDeviationC`.

### Unverändert

`departureElevationFt`, `cruiseAltitudeAmslFt`, `qnhHpa`, `distanceNm`,
`powerSettingPct`, `runwayWindComponentKt`, `routeWindComponentKt`,
`dryGrassRunway`, `wetOrSnowRunway`, die drei Herkunftsvermerke.

---

## Abhängigkeiten

```
departureElevationFt ─┐
                      ├─→ platzDruckhoehe ─┬─→ temperaturBereich
qnhHpa ───────────────┘                    │
                                           └─→ isaAbleitung ←── outsideAirTemperatureC
                                                   │
                                                   ├─→ Startstrecke
                                                   ├─→ Reiseleistung
                                                   └─→ Kraftstoffbedarf
```

Bemerkenswert daran: Die Platzdruckhöhe wirkt nun auf **alle drei** Rechnungen,
auch auf die Reiseleistung, die sie sonst nicht kennt. Das ist die Folge der
Annahme aus der Spezifikation — die am Platz gemessene Abweichung gilt in der
Reiseflughöhe weiter.

---

## Übernahmewerte des Dialogs

| Feld | bisher | künftig |
|---|---|---|
| `qnhHpa?` | unverändert | unverändert |
| `isaDeviationC?` | °C Abweichung | **entfällt** |
| `outsideAirTemperatureC?` | — | **neu**, °C absolut |
| `runwayWindComponentKt?` | unverändert | unverändert |

Der Dialog reicht damit durch, was der Dienst liefert, statt es vorher
umzurechnen (R4).

---

## Zeilen des Dialogs

| Schlüssel | Titel | Bahnwahl |
|---|---|---|
| `qnh` | Luftdruck QNH | nein |
| `temperatur` (vorher `isa`) | Außentemperatur | nein |
| `wind` | Pistenwind (positiv = Gegenwind) | **ja**, sofern ein Wert vorliegt |

---

## Prüfregeln

| Regel | Woher | Was bei Verstoß |
|---|---|---|
| Temperatur innerhalb des mitwandernden Bereichs | `getOutsideAirTemperatureRange` | Der Regler lässt es gar nicht erst zu |
| Abgeleitete Abweichung innerhalb `ISA_DEVIATION_RANGE` | `checkRange` im Kern | Meldung des Kerns, unverändert weitergereicht (C-02). Kann nur eintreten, wenn die Platzhöhe nach dem Einstellen der Temperatur verändert wurde (FR-005) |
| Vorschlag des Dialogs übernehmbar | gerundeter Wert gegen den Bereich | Zeile gesperrt, Hindernis genannt |

Die zweite Regel ist der einzige Weg, auf dem eine unrechenbare Temperatur
entstehen kann — und genau deshalb muss sie bestehen bleiben, obwohl der Regler
sie sonst ausschließt.
