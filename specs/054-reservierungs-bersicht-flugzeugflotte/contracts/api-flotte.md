# Vertrag: `GET /api/flotte`

**Feature**: 054 · **Route**: `apps/web/src/routes/api/flotte/+server.ts`

Die Auskunft über die gesamte Flotte. Erweitert `GET /api/reservierung`
(Feature 052) von einer Maschine auf alle — mit **demselben** zweistufigen
Beschaffungsweg und denselben Zusicherungen. Der bestehende Vertrag von
`/api/reservierung` bleibt unverändert gültig (E-07).

## Zusicherungen

| Nr. | Zusicherung |
|---|---|
| F-01 | Die Route **rechnet nicht selbst**. Flottenbildung, Zustand und Segmente kommen aus dem Kern (Prinzip IV). |
| F-02 | Zuerst der Kalender-Weg, bei **jedem** Fehlschlag Rückfall auf den KV-Speicher. Ein Fehlschlag endet **nie** in „frei" (FR-022). |
| F-03 | Liegt weder ein Kalender- noch ein Rückfallstand vor, antwortet die Route mit `200` und `stand: 'fehlt'` — nicht mit einem Fehlerstatus und für **keine** Maschine mit einer Verfügbarkeitsaussage (FR-022, SC-003). |
| F-04 | Die Antwort trägt `cache-control: no-store, no-cache, must-revalidate, max-age=0`. Die Lehre vom 13.08.2026 gilt unverändert. |
| F-05 | Die Antwort enthält **keine** personenbezogene Angabe, auch keine leere (FR-023, FR-010). |
| F-06 | Die Adresse des Kalender-Abos verlässt den Server nicht, auch nicht in einer Fehlermeldung (FR-002 aus 052). |
| F-07 | Der Zeitraum umfasst `[heute 00:00 Ortszeit, heute + 8 Tage)`; Belegungen werden **ungekürzt** ausgeliefert (E-06). |
| F-08 | Fehlen die Sonnenzeiten im KV, entfällt allein das Feld `sonnenzeiten`. Alles Übrige bleibt unverändert (E-08). |
| F-09 | Die Route ruft **keinen** Wetterdienst auf (Prinzip V). |
| F-10 | `prerender = false`. |

## Antwort — Fall 1: Stand vorhanden

```json
{
  "stand": "vorhanden",
  "quelle": "kalender",
  "abgerufenAm": "2026-08-18T07:00:00.000Z",
  "veraltet": false,
  "flotte": [
    { "kennung": "D-EELK", "kategorie": "motor" },
    { "kennung": "D-EXYZ", "kategorie": "motor" },
    { "kennung": "D-MRXS", "kategorie": "motor" },
    { "kennung": "D-3004", "kategorie": "segelflug" }
  ],
  "belegungen": [
    {
      "kennung": "D-EELK",
      "beginn": "2026-08-18T14:00:00+02:00",
      "ende": "2026-08-18T17:30:00+02:00",
      "art": "reservierung"
    }
  ],
  "sonnenzeiten": [
    { "tag": "2026-08-18", "aufgang": "2026-08-18T06:05:00+02:00", "untergang": "2026-08-18T20:46:00+02:00" }
  ]
}
```

`quelle` ist `kalender` oder `rueckfall`. `veraltet` stammt wie bisher aus
`istVeraltet` gegen `VERFALLSGRENZE_MS`.

**Kein Zustand in der Antwort.** Status, Farbe, Sätze und Segmente berechnet
der Browser aus `belegungen` — mit denselben Kernfunktionen, jede Minute neu
(E-09). Sie mitzuliefern hieße, eine Aussage über „jetzt" zu versenden, die
schon beim Eintreffen eine Minute alt wäre.

## Antwort — Fall 2: kein Stand

```json
{
  "stand": "fehlt",
  "quelle": "rueckfall",
  "flotte": [
    { "kennung": "D-EELK", "kategorie": "motor" }
  ]
}
```

Die Flotte wird auch hier genannt — sie stammt aus der Stammliste (E-01) und
hängt nicht am Abrufstand. Die Oberfläche zeigt die Maschinen dann **ohne**
Verfügbarkeitsaussage, mit offenem Hinweis statt eines geratenen Zustands
(FR-022). Es gibt kein `belegungen`-Feld — eine leere Liste wäre von „nichts
gebucht" nicht zu unterscheiden und damit genau die Verwechslung, die SC-003
ausschließt.

## Fehlerfälle

Es gibt keinen. Jeder denkbare Fehlschlag mündet in Fall 2. Ein `5xx` würde
die Oberfläche zwingen, zwei Wege für dieselbe Aussage zu behandeln — und der
zweite wäre der ungetestete.

## Abgrenzung zu `/api/reservierung`

| | `/api/reservierung` | `/api/flotte` |
|---|---|---|
| Umfang | eine Maschine (D-EELK) | ganze Flotte |
| Liefert | fertige `Belegungsauskunft` | Rohbelegungen im Fenster |
| Bezugszeitpunkt | Server | Browser, minütlich |
| Bestand | unverändert | neu |

Beide benutzen `lib/server/stand-holen.ts` — den gemeinsamen Weg
Kalender → Rückfall. Er ist nach dieser Änderung die einzige Stelle im Haus,
die entscheidet, aus welcher Quelle ein Stand kommt.
