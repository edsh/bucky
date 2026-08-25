# Phase 1 — Größen und Zustände: Reservieren-Sheet v2

**Feature**: 058-reservieren-sheet-zeitwaehler
**Datum**: 2026-08-21

Was in diesem Feature vorkommt, kommt in genau einer Form vor. Diese Datei
schreibt sie fest — vor allem die Frage, welche Zeitgröße wo gilt.

---

## Die drei Zeitformen und wo sie gelten

Das Haus kennt seit Feature 052 eine Zeitform: Ortszeit mit Versatz als ISO. Der
Wähler bringt eine zweite dazu, weil er ein Tagesgerät ist. Die Grenze zwischen
beiden ist scharf und liegt im Kern, nicht in der Oberfläche.

| Form | Beispiel | Gilt für | Umrechnung |
|---|---|---|---|
| **Ortstag** | `'2026-08-21'` | Welcher Tag gemeint ist — überall | `ortstag(date)`, `naechsterTag(tag)` |
| **Tagesminute** | `540` (= 09:00) | Alles innerhalb des Wählers | `zeitpunktFuerMinute(tag, minute)` hin, `minuteDesTages(date)` zurück |
| **Zeitpunkt** | `'2026-08-21T09:00:00+02:00'` | Belegungen, Absprung, alles Vorhandene | bereits im Kern |

**Regel**: Tagesminuten verlassen den Kern nur als Anzeige (`'09:00'`) und nie
als Datum. Wer ein Datum braucht — Konfliktsuche, Adressbau —, geht über
`zeitpunktFuerMinute`. Das ist die eine Stelle, die für die Zeitumstellung
geprüft ist; eine zweite gäbe es nicht mehr lange richtig.

**Grenze der Form**: `bis` darf `1440` erreichen (Mitternacht des Folgetags), wie
bei `Balkenfenster` in `segmente.ts`. Im Wähler kommt das nicht vor — der Rahmen
endet um 22:00 —, aber die Form bleibt dieselbe, damit beide Module dasselbe
meinen.

---

## Zeitwahlfenster

Die zentrale Größe: was jemand gewählt hat.

```
Zeitwahlfenster {
  von:  Tagesminute      // Beginn, Vielfaches von 15
  bis:  Tagesminute      // Ende, Vielfaches von 15, stets > von
}
```

**Zusicherungen** (von jeder Funktion in `zeitwahl.ts` eingehalten):

- `von % 15 === 0` und `bis % 15 === 0`
- `bis - von >= 15` (Mindestdauer, FR-027)
- `rahmen.von <= von` und `bis <= rahmen.bis` (FR-031)

Ein Fenster kennt seinen Tag **nicht**. Der Tag wird daneben geführt, weil er
sich unabhängig ändert (Tageswechsler) und weil ein Fenster ohne Tag genau das
ist, was der Wähler bearbeitet: eine Uhrzeitspanne.

**Der Leerfall** ist kein Fenster mit `null`-Feldern, sondern **kein Fenster**:
`Zeitwahlfenster | null`. Ein Fenster, dessen Grenzen `null` sein dürfen, müsste
an jeder Stelle geprüft werden; eines, das entweder da ist oder nicht, nur an
einer (FR-044).

---

## Rahmen

Der Bereich, in dem ein Fenster liegen darf.

```
Rahmen {
  von:  Tagesminute      // 360 (06:00)
  bis:  Tagesminute      // 1320 (22:00)
}
```

Konstant für jeden Tag: der Flugtag. **Nicht** die freie Lücke — das ist der
Unterschied, der die Warteliste erst möglich macht (FR-031). Ein Fenster darf über
eine Belegung hinausreichen; was daraus folgt, entscheidet der Modus, nicht der
Rahmen.

Der Rahmen ist bewusst eine eigene Größe und keine zwei Konstanten: Er wird als
Ganzes an `zieheKante`, `verschiebeBlock`, `beginnSetzen` und `endeSetzen`
gereicht, und diese Funktionen sollen ihn nicht kennen müssen, sondern bekommen.

---

## Lücke

Ein freier Abschnitt eines Tages.

```
Luecke {
  von:  Tagesminute
  bis:  Tagesminute
}
```

Formgleich mit `Zeitwahlfenster` und trotzdem eine eigene Bezeichnung: Eine Lücke
ist ein **Befund** über den Tag, ein Fenster eine **Wahl** des Mitglieds. Sie
gehen ineinander über (`fensterIn(luecke, minute)`), aber sie sind nicht
dasselbe, und die Verwechslung wäre die Sorte Fehler, die man nicht sieht.

**Zusicherungen**:

- Lücken sind nach `von` sortiert und überschneiden sich nicht.
- Lücken kürzer als 15 Minuten kommen nicht vor (in sie passt keine Wahl).
- Lücken liegen vollständig im Rahmen.

**Zwei Fragen, zwei Antworten**: `luecken(…)` ohne `abMinute` liefert alle freien
Abschnitte des Tages — das ist der Bezug für „👍 Frei 09:00–14:00" und für die
Ausweichsuche. Mit `abMinute` (heute: ab jetzt, aufgerundet auf das Raster)
liefert sie nur, was noch bevorsteht — das ist der Bezug für Vorschläge. Eine
Reservierung, die vor einer Stunde beginnt, ist kein Vorschlag; als Nachtrag ist
sie trotzdem erlaubt.

---

## Konflikt

Was im gewählten Fenster schon steht.

```
Konflikt {
  art:   'reservierung' | 'sperre'
  text:  string          // '14:00–17:30: reserviert' oder 'ganztägig gesperrt'
}
```

**Zum Text**: Er wird im Kern gebildet, nicht in der Oberfläche — er ist eine
Aussage über Zeiten, und Zeitformate gehören zum Kern (dieselbe Begründung wie
bei `alsTageszeile`). Doppelpunkt zwischen Spanne und Art (FR-049), Verkettung
mehrerer mit ` · `.

**Was nicht drinsteht**: kein Name, keine Kennzeichnung eigener Buchungen. Der
Prototyp kennt ein Feld `ich` und schreibt „deine Reservierung"; Bucky kennt
keine Nutzeridentität (FR-010 aus 054, E-11). Jeder fremde Eintrag heißt
„reserviert".

---

## Wahlmodus

Was aus dem gewählten Fenster folgt. Abgeleitet, nie gesetzt.

```
Wahlmodus = 'frei' | 'nachtrag' | 'warteliste' | 'gesperrt'
```

**Rangfolge der Bestimmung** (die Reihenfolge ist die Regel):

1. Beginnt das Fenster **heute vor jetzt** → `nachtrag`.
2. Sonst: schneidet es eine **Sperre** → `gesperrt`.
3. Sonst: schneidet es eine **Reservierung** → `warteliste`.
4. Sonst → `frei`.

**Warum Nachtrag vor Sperre**: Auf eine Zeit, die vorbei ist, wartet niemand mehr
— und was gestern war, kann heute nicht mehr verhindert werden. Der Nachtrag ist
eine Buchführungshandlung, keine Verfügbarkeitsfrage. Der Prototyp entscheidet
genauso.

**Warum Sperre vor Reservierung**: Dieselbe Rangfolge wie in `segmente.ts` (T-07)
und `zustand.ts` (Z-03). Eine gesperrte Maschine ist womöglich zerlegt; das ist
die weiter reichende Nachricht.

| Modus | Aktion | Absprung? |
|---|---|---|
| `frei` | „Im Vereinsflieger reservieren… ↗" | ja, mit Fenster |
| `nachtrag` | „Im Vereinsflieger nachtragen… ↗" | ja, mit Fenster |
| `warteliste` | „Im Vereinsflieger vormerken… ↗" | ja, mit Fenster |
| `gesperrt` | keine | **nein** (FR-040) |

---

## Ausweichlücke

Ein freies Fenster, das anstelle des gewählten vorgeschlagen wird. Nur in den
Modi `warteliste` und `gesperrt`.

**Suchreihenfolge** (FR-039):

1. erste Lücke, die **ab dem gewählten Ende** beginnt (`l.von >= fenster.bis`)
2. sonst: erste Lücke, die das gewählte Fenster **überlappt** (`l.bis > fenster.von`)
3. sonst: erste Lücke des Tages

Ausdrücklich **nicht** „ab jetzt": Wer 14:00 wählt und auf eine Belegung stößt,
will einen Vorschlag in der Nähe seiner Absicht, nicht den frühestmöglichen des
Tages.

Angeboten wird die Lücke nicht in voller Länge, sondern als Fenster nach der
üblichen Regel: bis zu zwei Stunden ab ihrem Beginn (`fensterIn`).

---

## Nachtstops

Wo die Nachttönung eines Tages anfängt und aufhört, als Anteile 0…1.

```
Nachtstops {
  morgens:  { klar: number } | null   // null: Sonnenaufgang vor Fensterbeginn
  abends:   { klar: number } | null   // null: Untergang nach Fensterende
}
```

`klar` ist die Stelle, ab der es *ganz* hell ist — die Dämmerung (±10 Minuten)
ist bereits eingerechnet. Die Sonnenzeit selbst und die Dämmerungsbreite ergeben
zusammen die vier Stops des Verlaufs; die Komponente setzt daraus
`linear-gradient` zusammen.

**Der Kern liefert Anteile, keine Prozentzeichen und keine Farben** — dieselbe
Regel wie bei `balkensegmente` (Prinzip IV). Die Farbe `rgba(9,15,33,.62)` steht
in der Komponente, weil sie eine Gestaltungsentscheidung ist und keine Rechnung.

**`null` als ganze Antwort**: Fehlen die Sonnenzeiten des Tages, gibt es keine
Stops — nicht geschätzte (SC-009).

---

## Zustand des Sheets

Was die Komponente führt. Klein gehalten; alles Übrige ist abgeleitet.

| Größe | Typ | Ausgelöst durch |
|---|---|---|
| `offen` | `boolean` | Balken-Tap, Abbrechen, Overlay-Tap, Escape |
| `tag` | Ortstag | Öffnen, Tageswechsler, Datumswähler |
| `fenster` | `Zeitwahlfenster \| null` | Öffnen, Ziehen, Kacheln, Tageswechsel, Ausweichen |
| `variante` | `'ziehen' \| 'kacheln'` | Segmented Control |

**Abgeleitet, nie gespeichert**: Lücken, Konflikte, Modus, Ausweichlücke,
Balkensegmente, Kachelzustände, Dauer, Adresse des Absprungs. Sie folgen aus
`tag`, `fenster` und dem Reservierungsstand — jede Speicherung wäre eine zweite
Wahrheit.

**Nicht im Zustand** (research.md, E-05): der Merkzettel der laufenden Geste
(`{ art, abstand, griff }`) und das `zogGerade`-Flag. Beide zeigen nichts an; als
`$state` lösten sie bei jeder Zeigerbewegung einen Durchlauf ohne Wirkung aus.

**Entfallen gegenüber dem Handoff**: `wartet` (die Wartelisten-Quittung, siehe
research.md E-04) sowie `pfeilVon`/`pfeilBis` als Zustand — die Pfeilrichtung
wird beim Scrollen gemessen und ist eine reine Anzeigegröße der Spalte.

---

## Was unverändert bleibt

Ausdrücklich festgehalten, damit es niemand nebenbei anfasst:

- **`Reservierung`, `Zeitraum`, `Balkensegment`, `Maschinenzustand`,
  `Sonnenzeiten`** — unverändert. Dieses Feature liest sie, es ändert sie nicht.
- **`Zeitfenster`** (ISO-Paar) — bleibt die Form des Absprungs und der
  Kernvorschläge. Der Wähler baut daraus nichts Neues; er füllt es aus Tag und
  Minuten, wenn der Absprung ansteht.
- **Die Stammliste** samt `apid`-Werten — unverändert, vollständig.
