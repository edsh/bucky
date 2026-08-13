# Vertrag: `GET /api/reservierung`

**Feature**: 052 | Ändert den Vertrag aus Feature 047 **abwärtsverträglich**

## Antwort

```jsonc
{
  "stand": "vorhanden",                        // 'vorhanden' | 'fehlt'
  "quelle": "kalender",                        // NEU: 'kalender' | 'rueckfall'
  "kennung": "D-EELK",
  "abgerufenAm": "2026-08-13T12:34:56.000Z",
  "veraltet": false,
  "frei": true,
  "art": null,                                 // 'reservierung' | 'sperre' | null
  "wechselAm": "2026-08-13T15:00:00.000Z",
  "wechselZu": "belegt"
}
```

**Einzige Änderung**: das Feld `quelle`. Alle übrigen Felder behalten Name,
Typ und Bedeutung aus Feature 047 — bestehende Prüfungen bleiben gültig.

Bei `"stand": "fehlt"` entfallen die übrigen Felder wie bisher; `quelle` steht
dann auf `rueckfall`, denn ein fehlender Stand ist stets das Ergebnis eines
gescheiterten Abrufs.

## Statuscode

**Immer 200** — auch wenn kein Stand vorliegt. Unverändert aus Feature 047: Die
Anzeige soll den Fall aussprechen, nicht als Netzfehler behandeln. Nur ein
tatsächlicher Serverfehler führt zu 5xx.

## Kopfzeilen

```http
cache-control: no-store, no-cache, must-revalidate, max-age=0
```

**Unverändert und nicht verhandelbar.** Am 13.08.2026 hat eine
zwischengespeicherte Fehlantwort tagelang „kein Reservierungsstand verfügbar"
gezeigt, während der Speicher gefüllt war. Eine Auskunft, deren Alter Teil der
Aussage ist, darf nirgends einfrieren.

**Abgrenzung zur Ablage aus E-08**: Jene betrifft ausschließlich den Abruf
*bei Vereinsflieger*, nicht diese Antwort. Die beiden dürfen nicht verwechselt
werden — die Verwechslung ist genau der Fehler, der schon einmal passiert ist.

## Verhalten

```text
1. Kalender abrufen, höchstens 2 s warten
   ├─ gelingt und ist ein Kalender  →  quelle 'kalender', abgerufenAm = jetzt
   └─ scheitert (Netz, Zeitablauf, kein Kalender, HTTP-Fehler)
        │
2.      └─ KV lesen
             ├─ Stand vorhanden  →  quelle 'rueckfall', abgerufenAm aus dem Stand
             └─ nichts da        →  { "stand": "fehlt", "quelle": "rueckfall" }
```

| Zusicherung | Warum |
|---|---|
| Ein Fehlschlag ergibt **nie** `"frei": true` ohne Datengrundlage | FR-008 — der Schaden entstünde in der Richtung, die jemanden zum Platz fahren lässt |
| Ein Fehlschlag **schreibt nicht** in den KV-Speicher | FR-006 — der Rückfall darf sich nicht selbst zerstören |
| Die Abo-Adresse erscheint in **keiner** Antwort, auch keiner Fehlerantwort | FR-002 |
| Die Antwort enthält **keine** Personennamen | FR-013 — die Zielstruktur hat kein Feld dafür |
| Der Abruf verändert nichts bei der Gegenstelle | FR-017 — ausschließlich lesend |

## Was die Anzeige daraus macht

| `quelle` | `veraltet` | Anzeige |
|---|---|---|
| `kalender` | `false` | Aussage, Alter „gerade eben" |
| `rueckfall` | `false` | Aussage **plus** „letzter bekannter Stand" |
| `rueckfall` | `true` | Aussage plus Hinweis plus deutliche Altersangabe |
| — (`stand: 'fehlt'`) | — | „Kein Reservierungsstand verfügbar" — **nie** „frei" |

Der Hinweis nennt **keine Ursache**, **keine Technik** und **beschuldigt
niemanden** (FR-019). Ziel ist, dass das Mitglied die Aussage richtig einordnet,
nicht dass es erfährt, welcher Dienst gerade hakt.
