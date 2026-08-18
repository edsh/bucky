# Phase 1: Datenmodell

**Feature**: 054 — Reservierungsübersicht Flugzeugflotte

Das Modell baut auf Feature 047/052 auf. `Reservierung`, `Abrufstand`,
`Belegungsart`, `Quelle` und `Deutungsergebnis` bleiben **unverändert** — sie
haben nie auf eine einzelne Maschine gezeigt, sie wurden nur so benutzt. Neu
sind ausschließlich die abgeleiteten Größen.

---

## Bestehende Größen (unverändert)

| Größe | Herkunft | Anmerkung für dieses Feature |
|---|---|---|
| `Reservierung` | Feature 047, erweitert 052 | Trägt weiterhin **kein** Personenfeld (FR-023, E-11, E-14) |
| `Abrufstand` | Feature 047 | Enthielt schon immer *alle* Flugzeuge — der Kommentar sagte es bereits |
| `Belegungsauskunft` | Feature 047 | Bleibt für `/api/reservierung`; die Übersicht nutzt `Maschinenzustand` |
| `Quelle` | Feature 052 | `kalender` \| `rueckfall`, geht nicht in die Berechnung ein |

---

## Neue Größen im Kern

### `Kategorie`

```ts
type Kategorie = 'motor' | 'segelflug';
```

Abgeleitet aus dem Kennzeichen (E-02): rein ziffriges Eintragungszeichen →
`segelflug`, sonst `motor`. Die Beschriftungen der Oberfläche („Weitere
Motorflugzeuge & UL", „Weitere Segelflugzeuge") sind Sache der Oberfläche,
nicht des Kerns.

### `Maschine`

```ts
interface Maschine {
  kennung: string;      // vereinheitlicht, z. B. 'D-EELK'
  kategorie: Kategorie;
}
```

Bewusst schmal. Typbezeichnung, Bild und POH-Verweis liegen in der Oberfläche
(E-03) — der Kern kennt kein Bild und keinen Routenpfad.

**Bildungsregel** (E-01): `flotteBilden(stammliste, reservierungen)` liefert
die Vereinigung aus den Kennzeichen der Stammliste und denen der übergebenen
Reservierungen, jede Kennung genau einmal, sortiert nach Kategorie und dann
alphabetisch.

### `Statuswert`

```ts
type Statuswert = 'frei' | 'bald' | 'belegt' | 'sperre';
```

Genau vier Werte (FR-002; `bald` ist der Spec-Wert „heute noch frei"). `bald`
ist ein Wort- und Satzzustand, **kein** eigener Farbzustand — die Farbe
entsteht aus `draengen` (E-05).

### `Maschinenzustand`

Das Ergebnis von `zustandFuer(reservierungen, kennung, bezugszeitpunkt)`:

```ts
interface Maschinenzustand {
  kennung: string;
  status: Statuswert;
  /** Wann sich der Zustand ändert; null, wenn kein Wechsel absehbar. ISO mit Versatz. */
  wechselAm: string | null;
  wechselZu: Wechselziel | null;
  /**
   * 0 … 1 — Dringlichkeit vor der nächsten Belegung (FR-006).
   * 0 außerhalb der letzten Stunde, 1 im Moment des Beginns.
   * Immer 0, solange der Status nicht 'bald' ist.
   */
  draengen: number;
  /** Beginn und Ende der nächsten freien Lücke für den Reservieren-Vorschlag (FR-011). */
  naechsteLuecke: { von: string; bis: string } | null;
}
```

**Zusicherungen**:

- Der laufende Block folgt der Kette lückenlos anschließender Belegungen —
  dieselbe Regel und derselbe Code wie `endeDerKette` in `belegung.ts`
  (FR-003). Sie wird **nicht** neu geschrieben.
- Überlappen Sperre und Reservierung, gewinnt die Sperre den Status
  (Grenzfall der Spec).
- `status === 'bald'` genau dann, wenn keine Belegung läuft **und** die
  nächste Belegung am selben Ortstag beginnt.
- `naechsteLuecke.von` ist auf die nächsten vollen 30 Minuten aufgerundet;
  `bis` liegt zwei Stunden später, aber nie nach dem Beginn der nächsten
  Belegung (FR-011).

### `Ringsegment` und `Markerwinkel`

```ts
interface Ringsegment {
  vonGrad: number;    // 0 = oben, im Uhrzeigersinn
  bisGrad: number;
  fuellung: 'frei' | 'nacht' | 'reservierung' | 'sperre';
}
```

`tagesuhr.ts` liefert für eine Maschine und einen Ortstag die lückenlose Folge
dieser Segmente sowie die Winkel für Sonnenaufgang, Sonnenuntergang und
„jetzt".

**Winkelabbildung** (verbindlich aus dem Design-Handoff, geprüft in
[contracts/tagesuhr.md](./contracts/tagesuhr.md)) — **fix und
datumsunabhängig**:

- Gestauchte Zone 21:00–06:00 (540 Minuten) → 135° … 225°
- Gedehnte Zone 06:00–21:00 (900 Minuten) → 225° … 495° (mod 360, also über 0° hinweg)

Die Füllung `nacht` richtet sich **nicht** nach dieser Zoneneinteilung,
sondern nach den tatsächlichen Sonnenzeiten des Tages (E-15). Ohne
Sonnenzeiten fällt sie ersatzweise auf 21:00/06:00 zurück.

Der Kern liefert **Namen** für die Füllung, keine Farbwerte: `#1f8f45` ist ein
Gestaltungstoken und gehört in die Oberfläche (E-04).

### `Balkensegment`

```ts
interface Balkensegment {
  /** Anteil des dargestellten Fensters, 0 … 1. */
  von: number;
  bis: number;
  art: Belegungsart;
}
```

Für Tagesbalken (Fenster 06:00–22:00) und Wochenraster. Eine Belegung über
Mitternacht erzeugt je Tag ein eigenes Segment; das Schneiden geschieht hier,
nicht in den Daten (E-06).

### `Sonnenzeiten`

```ts
interface Sonnenzeiten {
  /** Ortstag als 'YYYY-MM-DD'. */
  tag: string;
  /** ISO mit Versatz, z. B. '2026-08-18T06:05:00+02:00'. */
  aufgang: string;
  untergang: string;
}
```

Immer optional zu behandeln: Fehlen sie, entfallen allein die beiden
Sonnenmarker (E-08).

---

## Größen in der Weboberfläche

### `Darstellung` (`lib/flotte/darstellung.ts`)

```ts
interface Darstellung {
  typ?: string;        // 'Cessna 172' — nur Beschriftung
  bild?: string;       // Pfad unter /static
  pohPfad?: string;    // z. B. '/d-eelk/poh-rechner/' — nur für die D-EELK (FR-018)
}
```

Eine Zuordnung Kennung → `Darstellung`. Jede Angabe fehlen zu dürfen ist der
Normalfall, kein Fehlzustand: Ohne Bild erscheint das Kurzkennzeichen (`D-` +
letzte zwei Zeichen, FR-020), ohne `pohPfad` kein POH-Knopf.

### `Favoriten` (`lib/flotte/favoriten.ts`)

```ts
interface Favoritenstand {
  fassung: 1;
  kennungen: string[];
}
```

Drei unterscheidbare Fälle (FR-007b): **kein Eintrag** im `localStorage` (nie
etwas gesetzt → keine Reihe), **leere Liste** (alle wieder abgewählt → keine
Reihe), **gefüllte Liste** (Reihe erscheint). Der Unterschied zwischen den
ersten beiden ist für die Anzeige folgenlos, aber er darf nicht durch einen
stillen Vorbelegungswert verwischt werden.

---

## Was es bewusst nicht gibt

- **Kein Personenfeld**, an keiner Stelle der Kette (FR-023, E-11).
- **Kein Sperrgrund** (E-14).
- **Kein serverseitiger Favoritenzustand** (FR-007a).
- **Keine gespeicherten abgeleiteten Größen**: Status, Farbe, Sätze und
  Segmente werden bei jedem Bezugszeitpunkt neu berechnet (E-09). Sie zu
  speichern hieße, eine Aussage über die Zeit haltbar zu machen, die es nicht
  ist.
