# Phase 1 — Quickstart: QNH aus einem Onlinedienst vorbelegen

Wie sich prüfen lässt, dass das Feature tut, was die Spec verlangt. Die
Reihenfolge ist die der Abhängigkeit: erst die Rechnung, dann die Prüfung der
Antwort, dann das Zusammenspiel, zuletzt der Abgleich gegen die Wirklichkeit.

## Voraussetzungen

```bash
npm install          # einmalig
npm run build        # Kern bauen, bevor die Weboberfläche ihn nutzt
```

Für den Klickpfad zusätzlich ein Browser aus dem System (siehe Kopf von
`tests/ui/klickpfad.mjs`).

---

## 1. Die Rechnung im Kern — ohne Netz

```bash
npx vitest run --project deelk-poh-core
```

**Was gelten muss:**

| Probe | Eingabe | Erwartung |
|---|---|---|
| Meereshöhe ist der Sonderfall | 1013,25 hPa auf 0 ft | genau 1013,25 hPa |
| Der Platzwert von EDSH | 978,1973 hPa auf 971 ft | 1013,25 hPa |
| Der gemessene Fall aus der Recherche | 987,9 hPa auf 971 ft | 1023,30 hPa, übernehmbar **1023** |
| Abgerundet, nie aufgerundet | beliebig | `settableQnhHpa ≤ qnhHpa` |
| Unsinn wird abgelehnt | 0 hPa, `NaN`, 40 000 ft | Fehler statt Zahl |

**Die schärfste Probe ist der Rundlauf (C-08):** Wer aus Höhe und QNH den dort
herrschenden Druck bildet und mit `toQnh` zurückrechnet, muss den Ausgangswert
wiederbekommen. Über Höhen von 0 bis 18 000 ft und QNH von 950 bis 1050 hPa
liegt die Abweichung bei rund 1 · 10⁻¹³ hPa — also an der Grenze der
Zahlendarstellung, nicht an der der Formel.

Schlägt dieser Test fehl, sind die beiden Richtungen auseinandergelaufen. Das
ist genau der Fehler, den Prinzip IV ausschließen soll.

---

## 2. Die Antwortprüfung — ohne Netz

```bash
npx vitest run --project web
```

**Was gelten muss:** `deuteAntwort` liefert bei einer vollständigen Antwort die
drei Zahlen und **wirft** bei jeder dieser Antworten:

| Antwort | Warum sie abgelehnt wird |
|---|---|
| `{}` | kein `current` |
| `surface_pressure: null` | keine Zahl |
| `surface_pressure: 0` | außerhalb 500–1100 hPa |
| `surface_pressure: "1013"` | Text statt Zahl |
| ohne `current.time` | keine Gültigkeitszeit |
| ohne `elevation` | Bezugshöhe unbekannt |

Und: **`pressure_msl` taucht im Ergebnis nicht auf.** Es ist QFF und darf nicht
versehentlich benutzbar sein (→ [R4](./research.md)).

`baueAnfrage` muss `elevation=296` setzen — die Umrechnung der 971 ft, mit denen
der Kern zurückrechnet. Fehlt der Parameter, bezieht sich der gelieferte Druck
auf ein fremdes Geländemodell (→ [R6](./research.md)).

---

## 3. Das Zusammenspiel — mit abgefangener Netzanfrage

```bash
npm run build
python3 -m http.server 8899 --directory apps/web/build &
node tests/ui/klickpfad.mjs
```

Der Klickpfad fängt die Anfrage an `api.open-meteo.com` mit `page.route()` ab
und antwortet selbst. Er hängt damit nicht vom Wetter ab — und kann den
Fehlerfall überhaupt erst herstellen.

**Was gelten muss:**

1. Neben „Luftdruck QNH (hPa)" steht ein Button „EDSH".
2. Ein Klick öffnet einen Dialog, der Onlinedienst, Modellwert und ATIS nennt.
3. Während der Antwort ist eine Ladeanzeige sichtbar und „Übernehmen" gesperrt.
4. Nach der Antwort stehen dort **1023**, der ungerundete Wert und die
   Gültigkeitszeit.
5. „Übernehmen" schließt den Dialog, der Regler steht auf 1023, und die
   Druckhöhe unter der Platzhöhe hat sich entsprechend geändert.
6. Unter dem QNH-Regler steht der Herkunftsvermerk mit Dienst und Zeit.
7. Ein Zug am QNH-Regler lässt den Vermerk verschwinden.
8. **Abbruch:** Bei erneutem Öffnen und „Abbrechen" steht der Regler
   unverändert.
9. **`Esc`** wirkt wie „Abbrechen" und verändert nichts.
10. **Fehlerfall** (abgefangene Anfrage antwortet mit 500): Meldung statt
    Vorschau, „Übernehmen" gesperrt, „Erneut versuchen" vorhanden, Regler
    unverändert.
11. **Unbrauchbare Antwort** (`surface_pressure: null`): dasselbe Bild wie ein
    Netzfehler.
12. **Außerhalb des Reglerbereichs** (Antwort ergibt über 1050 hPa): Wert wird
    gezeigt, „Übernehmen" bleibt gesperrt.
13. **Ohne Netz** (alle Fremdanfragen blockiert): Die Seite lädt vollständig,
    alle Regler und Ergebnisse arbeiten. Beim Laden der Seite geht **keine**
    Anfrage an den Dienst hinaus.

Punkt 13 ist der wichtigste: Er ist der Nachweis, dass eine
Bequemlichkeitsfunktion den Rechner nicht verletzlicher gemacht hat (US3,
SC-003).

---

## 4. Abgleich gegen die Wirklichkeit

Einmalig von Hand, nicht als laufender Test — er bräuchte Netz und wäre vom
Wetter abhängig.

```bash
# Modellwert für EDSH holen und in QNH umrechnen
curl -s "https://api.open-meteo.com/v1/forecast\
?latitude=48.9197&longitude=9.4553&current=surface_pressure\
&elevation=296&timezone=UTC"

# Zum Vergleich die gemeldeten Werte der Region
curl -s "https://aviationweather.gov/api/data/metar?ids=EDDS,EDTY,EDDN&format=raw"
```

**Was gelten muss (SC-004):** Der gerechnete QNH liegt gegenüber den Meldungen
der drei Plätze innerhalb von **1 hPa**. Am 11.08.2026 um 0750Z waren es:

| Platz | METAR | gerechnet |
|---|---|---|
| EDDS | Q1023 | 1023,5 |
| EDTY | Q1023 | 1024,1 |
| EDDN | Q1023 | 1023,9 |

Zur Einordnung: 1 hPa sind rund 27 ft Druckhöhe. Auf 971 ft Platzhöhe ergibt
QNH 1023 eine Druckhöhe von 707,5 ft, QNH 1024 eine von 680,6 ft.

Fällt der Abgleich deutlich schlechter aus, ist die erste Frage, ob
`pressure_msl` statt `surface_pressure` gelesen wird — der Fehler zeigt sich als
durchgängige Abweichung nach unten (→ [R7](./research.md)).

---

## 5. Was zusätzlich laufen muss

```bash
npx vitest run          # alle Projekte
npm run lint
npm run --workspace @edsh-bucky/web check
```
