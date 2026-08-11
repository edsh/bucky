# Phase 1 — Datenmodell: QNH aus einem Onlinedienst vorbelegen

Die Rechengröße liegt im Kern und ist für jeden Zugangsweg identisch
(Constitution, Prinzip IV). Die Abrufgrößen liegen in der Weboberfläche, weil
sie den Dienst beschreiben und nicht die Physik — der Kern darf sie nicht
kennen (FR-022).

Feldnamen folgen der bestehenden Schreibweise: camelCase mit angehängter
Einheit.

---

## Kern

### `QnhResult` — der hergeleitete Luftdruck

Das Gegenstück zu `PressureAltitudeResult`. Beide liegen in `atmosphere/`, weil
sie aus einer Norm stammen und nicht aus dem Flughandbuch.

| Feld | Einheit | Bedeutung |
|---|---|---|
| `stationPressureHpa` | hPa | der Luftdruck, wie er in der Höhe unten tatsächlich herrscht — die Eingangsgröße |
| `elevationFt` | ft | die Höhe, auf die sich dieser Druck bezieht |
| `qnhHpa` | hPa | der hergeleitete QNH, **ungerundet** |
| `settableQnhHpa` | hPa | derselbe Wert, auf ganze hPa **abgerundet** — der Wert für den Regler |

Quelle ist `ICAO_STANDARD_ATMOSPHERE_SOURCE` mit `kind: 'standard'`, dieselbe
Referenz, die die Druckhöhe trägt. Eine POH-Seitenzahl gibt es nicht, und eine
anzugeben wäre erfunden.

Beide Eingangsgrößen bleiben im Ergebnis stehen. Ohne sie ließe sich später
nicht mehr sagen, auf welche Höhe sich der Wert bezog — und genau daran hängt
die Richtigkeit (→ [R6](./research.md)).

**Warum zwei Ausgabewerte?** `qnhHpa` ist das Rechenergebnis, `settableQnhHpa`
der einzige Wert, den der Regler annehmen kann. Beide werden angezeigt (SC-006).
Der abgerundete steht im Kern und nicht im Dialog, weil er in eine Rechnung
zurückfließt: Er verändert die Druckhöhe und damit die Startstrecke (C-03).

**Zusicherung**: `settableQnhHpa ≤ qnhHpa`, immer. Abgerundet wird nach unten,
weil das die sichere Richtung ist (→ [R9](./research.md)).

### Grenzen

`toQnh` prüft **nicht** den Reglerbereich — das entscheidet die Oberfläche
(FR-007), so wie `toPressureAltitude` den Tabellenbereich nicht prüft. Geprüft
wird nur, was physikalisch keinen Sinn ergäbe:

| Anlass | Reaktion |
|---|---|
| `stationPressureHpa` keine endliche Zahl oder ≤ 0 | `INVALID_INPUT` |
| `elevationFt` keine endliche Zahl | `INVALID_INPUT` |
| `elevationFt` außerhalb −2 000 bis 30 000 ft | `OUT_OF_RANGE` |

Die Höhengrenze ist keine Tabellengrenze, sondern der Gültigkeitsbereich der
Troposphärenformel. Sie schützt vor einer Eingabe, bei der die Formel still
Unsinn liefern würde (FR-023).

---

## Weboberfläche

### `EdshPlatz` — der Heimatplatz an einer Stelle

| Feld | Einheit | Wert | Bedeutung |
|---|---|---|---|
| `elevationFt` | ft | 971 | Platzhöhe — dieselbe Zahl, die die Schnellwahl der Platzhöhe setzt |
| `latitude` | ° | 48,9197 | Breite |
| `longitude` | ° | 9,4553 | Länge |

Diese Größe ist **die einzige** Stelle, an der die Platzhöhe steht (FR-025). Die
bisher in `+page.svelte` geführte Konstante `EDSH_ELEVATION_FT` wandert hierher
und wird von dort bezogen. Zwei Angaben derselben Höhe darf es nicht geben —
sonst belegte der Abruf eine andere Höhe als die Schnellwahl.

Die Höhe in Metern für die Anfrage wird **gerechnet**, nicht als vierte Zahl
geführt: 971 ft ≙ 296 m.

### `WetterAbruf` — was der Dienst geliefert hat

| Feld | Einheit | Bedeutung |
|---|---|---|
| `stationPressureHpa` | hPa | `surface_pressure` aus der Antwort |
| `elevationM` | m | die Höhe, auf die der Dienst den Druck bezieht |
| `gueltigkeit` | ISO-Zeit | der Zeitpunkt, für den der Wert gilt |
| `dienst` | Text | Name und Verweis für die Namensnennung (FR-010) |

`pressure_msl` wird **nicht** übernommen. Es ist QFF und damit eine andere Größe
(→ [R4](./research.md)); ein Feld, das man versehentlich benutzen kann, wird gar
nicht erst geführt.

`gueltigkeit` heißt bewusst nicht „Beobachtungszeit": Es ist der Zeitpunkt, für
den der Modellwert gilt, nicht der einer Messung (→ [R5](./research.md)).

### `AbrufZustand` — der Zustand des Dialogs

Ein Zustandsautomat mit vier Zuständen:

```
              ┌──────────┐
   öffnen ───►│  laedt   │
              └────┬─────┘
                   │
        ┌──────────┼───────────┐
        ▼                      ▼
  ┌───────────┐          ┌───────────┐
  │ vorschau  │          │  fehler   │◄─── Zeitüberschreitung,
  └─────┬─────┘          └─────┬─────┘     Netzfehler, unbrauchbare
        │                      │           Antwort
        │ übernehmen           │ erneut versuchen
        ▼                      └────────────► laedt
  ┌───────────┐
  │ übernommen│ (Dialog geschlossen, Regler gesetzt)
  └───────────┘
```

| Zustand | Was der Dialog zeigt | „Übernehmen" |
|---|---|---|
| `laedt` | Aufklärung und Ladeanzeige | gesperrt |
| `vorschau` | Aufklärung, Wert, ungerundeter Wert, Gültigkeit | frei — außer der Wert liegt außerhalb 950–1050 hPa |
| `fehler` | Aufklärung, Meldung, „Erneut versuchen" | gesperrt |

„Abbrechen" ist in jedem Zustand erreichbar und verändert nichts (FR-016).
Der Übergang nach `übernommen` ist der **einzige**, der eine Eingabe verändert.

### `QnhHerkunft` — der Vermerk am Regler

| Feld | Bedeutung |
|---|---|
| `dienst` | Name des Dienstes |
| `gueltigkeit` | Zeitpunkt, für den der Wert gilt |

Steht neben `qnhHpa` im Seitenzustand und wird **geleert**, sobald der Pilot den
Regler selbst bewegt (FR-009). Der Vermerk gehört zum Wert, nicht zum Dialog:
Ein von Hand verstellter Wert hat keine Herkunft mehr.

---

## Was ausdrücklich nicht entsteht

- **Kein Zwischenspeicher.** Weder im Arbeitsspeicher über den Dialog hinaus
  noch in `localStorage`. Ein aufgehobener Luftdruck wäre gerade in der
  Vorflugphase der falsche.
- **Kein Platzverzeichnis im Kern.** `toQnh` bekommt zwei Zahlen. Ein Kern, der
  Plätze kennt, wäre an Stammdaten gebunden und nicht mehr für sich prüfbar.
- **Keine Temperatur- und Windgrößen.** Der Abruf liefert sie mit; sie werden
  nicht in den Zustand übernommen, damit niemand sie versehentlich verwendet,
  bevor die fachlichen Fragen dazu entschieden sind (Spec, Out of Scope).
