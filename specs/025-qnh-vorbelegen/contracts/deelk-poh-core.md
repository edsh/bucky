# Vertrag: `@edsh-bucky/deelk-poh-core`

Was das Paket nach diesem Feature zusätzlich nach außen anbietet. Bestehende
Ausfuhren bleiben unverändert.

## `toQnh(stationPressureHpa, elevationFt): QnhResult`

Rechnet den in einer bekannten Höhe herrschenden Luftdruck über die
Standardatmosphäre auf Meereshöhe zurück — den QNH, den der Höhenmesser braucht.

Die Umkehrung von `toPressureAltitude`, in derselben Datei-Nachbarschaft
(`atmosphere/`), mit denselben Konstanten und demselben Exponenten:

```
QNH = p_stat / (1 − L·h/T₀)^5,25588
```

**Eingabe**: zwei Zahlen. Kein Ergebnisobjekt, kein Platz, keine Koordinaten.

**Ausgabe** (`QnhResult`, siehe [data-model.md](../data-model.md)):
Eingangsgrößen, `qnhHpa` ungerundet, `settableQnhHpa` abgerundet.

**Zusicherungen**

- Es entsteht **keine zweite Formel**: Die Funktion verwendet die vorhandenen
  Konstanten aus `pressureAltitude.ts`. Ein Rundlauftest hält beide gegeneinander
  (siehe C-08).
- `settableQnhHpa` ist `qnhHpa` **abgerundet** auf ganze hPa, nie aufgerundet.
- `qnhHpa` ist **ungerundet**; nur `settableQnhHpa` ist eine gerundete Zahl, und
  sie ist ein Rechen- und kein Anzeigewert.
- Die Quellenreferenz ist `ICAO_STANDARD_ATMOSPHERE_SOURCE` mit
  `kind: 'standard'`. Eine POH-Seitenzahl gibt es nicht.
- Die Funktion greift **nicht** auf das Netz zu und kennt keinen Dienst.
- Der Reglerbereich (950–1050 hPa) wird **nicht** geprüft — das entscheidet die
  Oberfläche, so wie `toPressureAltitude` den Tabellenbereich nicht prüft.

**Fehler** (`PohCalculationError`), in dieser Reihenfolge geprüft:

| Anlass | `kind` | Was die Meldung nennt |
|---|---|---|
| Druck keine endliche Zahl oder ≤ 0 | `INVALID_INPUT` | Feld und beanstandeter Wert |
| Höhe keine endliche Zahl | `INVALID_INPUT` | Feld und beanstandeter Wert |
| Höhe außerhalb −2 000 bis 30 000 ft | `OUT_OF_RANGE` | Höhe und Gültigkeitsbereich der Formel |

## Neue Zusicherung im Vertragstest

- **C-08 — Rundlauf zwischen Druckhöhe und QNH.** Für eine Reihe von Höhen und
  Luftdrücken gilt: Wer aus einer Höhe und einem QNH den dort herrschenden Druck
  bildet und diesen mit `toQnh` zurückrechnet, erhält den Ausgangs-QNH wieder —
  auf mindestens neun Nachkommastellen.

  Das ist die schärfste verfügbare Probe dafür, dass die beiden Richtungen nicht
  auseinanderlaufen: schärfer als ein Vergleich gegen selbst gerechnete
  Erwartungswerte, weil sie ohne zweite Rechnung auskommt (Prinzip IV).

## Ausfuhren

```ts
export {
  toQnh,
  type QnhResult
} from './atmosphere/qnh.js';
```

`ICAO_STANDARD_ATMOSPHERE_SOURCE` ist bereits ausgeführt und wird
wiederverwendet, nicht verdoppelt.
