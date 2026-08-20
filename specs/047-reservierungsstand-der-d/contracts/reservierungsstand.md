# Contract: Reservierungsstand nach außen

> **Aufgehoben, Teil B (August 2026).** Die Route `/api/reservierung` und die
> Seite `/d-eelk/reservierung/` gibt es nicht mehr (Issue #57): Nach Feature
> 054 beantwortet die Flottenübersicht dieselbe Frage für alle Maschinen, und
> die Einzelauskunft hatte keinen Nutzer mehr. Abschnitt B beschreibt damit
> nichts Bestehendes mehr.
>
> **Abschnitt A gilt weiter** — der Eintrag im Zwischenspeicher wird vom
> Abruf-Worker unverändert geschrieben und von `/api/flotte` gelesen. Ebenso
> gilt die Regel dahinter unverändert fort: Namen und Sachtexte werden so früh
> wie möglich verworfen und erreichen keine Antwort (FR-006, in Feature 054 als
> FR-023 fortgeschrieben). Aufgehoben ist eine Adresse, nicht das Versprechen.
>
> Dieses Papier bleibt als Protokoll dessen stehen, was Feature 047 zugesagt
> hat. Es zu löschen hieße, eine Zusage rückwirkend nie gegeben zu haben.

**Feature**: 047 | **Gilt für**: die Server-Route der Web-App und den Eintrag im
Zwischenspeicher

Dieses Papier hält fest, **was diese Anwendung nach außen gibt** — und, wichtiger,
was sie nicht gibt. Es ist die vertragliche Fassung von FR-006.

---

## A. Der Eintrag im Zwischenspeicher (intern)

**Namensraum**: `RESERVIERUNGEN` · **Schlüssel**: `stand`

Geschrieben vom Abruf-Worker, gelesen von der Web-App. Verlässt den Verbund
niemals unverändert.

```jsonc
{
  "abgerufenAm": "2026-08-13T09:40:02.000Z",  // ISO, UTC
  "reservierungen": [
    {
      "kennung": "D-EELK",
      "beginn": "2026-08-15 15:00:00",  // Ortszeit Europe/Berlin
      "ende":   "2026-08-15 19:00:00",
      "art":    "reservierung"          // "reservierung" | "sperre"
    }
  ],
  "verworfeneEintraege": 0,
  "neuanmeldungen": 0
}
```

**Erlaubte Felder je Reservierung**: genau `kennung`, `beginn`, `ende`, `art`.
Nichts sonst. Kein `comment`, kein `user`, kein `fi`, keine `prid`.

Diese Aufzählung ist **abschließend** und wird beim Bauen geprüft. Der Grund ist
in `data-model.md` ausgeführt: Ein Klarname, der gar kein Feld hat, kann nicht
versehentlich mitgeschrieben werden.

---

## B. Die Antwort der Server-Route (öffentlich)

**Route**: `GET /api/reservierung` · **Format**: JSON · **Zugang**: frei
(FR-015)

### Fall 1 — Auskunft liegt vor

```jsonc
{
  "stand": "vorhanden",
  "kennung": "D-EELK",
  "frei": true,
  "art": null,                                // "reservierung" | "sperre" | null
  "wechselAm": "2026-08-15T13:00:00.000Z",   // ISO, UTC; null wenn keiner
  "wechselZu": "belegt",                      // "frei" | "belegt" | null
  "abgerufenAm": "2026-08-13T09:40:02.000Z",
  "veraltet": false
}
```

### Fall 2 — Kein Stand vorhanden (FR-010)

```jsonc
{
  "stand": "fehlt"
}
```

Kein Fehlerstatus. Dass gerade keine Auskunft vorliegt, ist ein **gültiges
Ergebnis**, kein Ausfall — die Anzeige soll es offen sagen können, ohne einen
Fehlerfall behandeln zu müssen.

### Fall 3 — Stand liegt vor, ist aber veraltet (FR-009)

Wie Fall 1, aber `"veraltet": true`. Die Auskunft wird **trotzdem gegeben**.
Eine zwei Stunden alte Reservierungslage ist für den Piloten fast immer noch
brauchbar — sie zu verschweigen wäre weniger hilfreich als sie zu kennzeichnen.

---

## Zusicherungen

Diese Punkte sind prüfbar und werden geprüft:

1. **Kein Klarname, keine Kennung eines Mitglieds** erscheint in irgendeiner
   Antwort — weder unter diesem Namen noch verschleiert (FR-006).
2. **Kein Bemerkungstext** aus der Quelle wird durchgereicht. Bemerkungen
   enthalten erfahrungsgemäß Namen, Telefonnummern und Absichten.
3. **`art` ist entweder `reservierung` oder `sperre`** — nie der rohe Wert der
   Quelle. Die Quelle liefert deutsche Wörter mit Großbuchstaben; sie
   durchzureichen hieße, ihre Schreibweise zu unserem Vertrag zu machen.
4. **Alle Zeitangaben nach außen sind ISO mit Zeitzone.** Die Quelle liefert
   Zeiten ohne Zeitzone; sie zu deuten ist Sache des Kerns, nicht des
   Empfängers (E-09).
5. **Es wird nur gelesen.** Die Route kennt kein `POST`, kein `PUT`, kein
   `DELETE` (FR-012).
6. **Die Route holt nichts bei der Quelle.** Sie liest ausschließlich den
   Zwischenspeicher. Ein Aufruf der Seite kostet kein Kontingent — sonst könnte
   ein einzelner Neulade-Finger den Tagesvorrat des Vereins aufbrauchen
   (SC-003).

---

## Wer rechnet was

| Beteiligter | Aufgabe |
|---|---|
| `packages/reservierung-core` | Deuten, Zusammenfassen, Ableiten, Formulieren — **alle** Fachlogik |
| `apps/reservierungs-abruf` | Anmelden, Holen, Kern aufrufen, Ergebnis ablegen |
| Server-Route | Speicher lesen, Kern mit dem Jetzt-Zeitpunkt aufrufen, Ergebnis ausgeben |
| Seite | Den Satz zeigen |

Kein Beteiligter außer dem Kern entscheidet, ob ein Flugzeug frei ist
(Prinzip IV). Die Server-Route reicht durch; sie rechnet nicht nach.
