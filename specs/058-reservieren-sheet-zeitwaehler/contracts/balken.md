# Vertrag: Zeitbalken und Sheet-Oberfläche

**Feature**: 058-reservieren-sheet-zeitwaehler

Was die Oberfläche zusichert. Anders als `zeitwahl.md` lässt sich das hier nicht
vollständig testen — es ist ein Vertrag zwischen Komponenten und zugleich die
Liste dessen, was in der Vorschau zu prüfen ist.

---

## B-01 Ebenenfolge im Balken

Von unten nach oben, in **jedem** der vier Balkentypen gleich:

| z-index | Ebene | Bedingung |
|---|---|---|
| — | Untergrund „frei" | immer; grau ohne Reservierungsstand |
| 0 | Nachttönung | nur mit Sonnenzeiten des Tages |
| 2 | Belegungssegmente | immer |
| 2 | Vergangenheits-Schleier | nur am heutigen Tag |
| 3 | Auswahlblock | nur im Sheet-Balken |
| 4 | Jetzt-Nadel | nur am heutigen Tag |

Diese Reihenfolge ist der Grund, warum es **eine** Komponente gibt und nicht vier
(plan.md, Complexity Tracking). Vierfach gepflegt liefe sie auseinander.

**Der Untergrund ist die Aussage „frei"** (geändert 25.08.2026). Ursprünglich
lag auf z-index 1 eine eigene Ebene „freie Lücken", die es nur im Sheet-Balken
gab; der Untergrund war überall grau. Damit hatte derselbe Zustand — unbelegte
Zeit — in der Übersicht eine andere Farbe als im Wähler, und Grau bedeutete an
einem Ort „frei" und am anderen nichts.

Jetzt trägt der Untergrund selbst den freien Ton (`FREIE_FLAECHE`, Grün mit 20 %
Deckung), und was durchscheint, ist unbelegte Zeit. Die Lücken-Ebene ist damit
entfallen: Sie zeichnete dieselben Pixel ein zweites Mal.

**Ohne Reservierungsstand bleibt der Balken grau** (`OHNE_AUSKUNFT`). Grün hieße
dort „alles frei" — die eine Aussage, die diese Anwendung nie machen darf, wenn
sie sie nicht kennt (`belegungen === null` heißt „keine Auskunft", nicht „nichts
gebucht").

Was dabei verloren geht: Abschnitte unter 15 Minuten fielen aus `luecken` heraus
und waren deshalb nicht grün. Jetzt sind sie es. Bei 16 Stunden Balkenbreite ist
das ein Bruchteil eines Pixels, und ein Tipp darauf landet weiterhin im
Konfliktfall — die Auskunft bleibt also richtig, nur die Ebene ist fort.

---

## B-02 Kein `overflow: hidden`

Der Balkencontainer darf nicht beschneiden — die Jetzt-Nadel ragt oben und unten
je 5 px hinaus. Folgen:

- Segmente runden sich **selbst** (`border-radius`), statt vom Container
  beschnitten zu werden.
- Der Vergangenheits-Schleier bekommt `border-radius: 8px 0 0 8px` (nur links,
  weil er am linken Rand beginnt).

---

## B-03 Nachttönung

- Farbe `rgba(9,15,33,.62)`, **identisch in Hell und Dunkel**.
- `position:absolute; inset:0; z-index:0; pointer-events:none`, gleicher
  `border-radius` wie der Balken.
- Waagerecht `linear-gradient(90deg, …)`, senkrecht `180deg` mit denselben Stops.
- Stops kommen aus `nachtstops` (Vertrag N-01), nicht aus dem Quelltext.
- Ohne Sonnenzeiten: **keine** Tönungsebene, nicht eine blasse.

---

## B-04 Jetzt-Nadel

- `background: linear-gradient(to bottom, <textfarbe> 0 3px, transparent 3px 6px)`,
  `background-size: 1px 6px`, `background-repeat: repeat-y`
- `top: -5px; bottom: -5px` — der Überstand ist die Absicht.
- Nur am heutigen Ortstag und nur, wenn `jetztAnteil` einen Wert liefert. Außerhalb
  von 06:00–22:00 gibt es keine Nadel — eine an den Rand gelegte behauptete eine
  falsche Uhrzeit (`segmente.ts`, `jetztAnteil`).
- Senkrechte Balken drehen den Verlauf auf `to right` und tauschen den Überstand
  auf `left`/`right`.

---

## B-05 Was ein Tipp meldet

Jeder Balkentyp meldet nach oben:

```
{ tag: Ortstag, minute: number | null }
```

- `minute` ist `null`, wenn der Tipp **keinen Ort** hat (Tastatur: `event.detail === 0`)
  oder **außerhalb** des Balkenrechtecks landete.
- Sonst ist es die Minute, die der Zeigerposition entspricht — waagerecht aus
  `clientX`, senkrecht aus `clientY`, beschnitten auf `0…1` des Rechtecks und
  über den Rahmen in eine Tagesminute umgerechnet.
- Die **ganze Zeile** ist das Tippziel, nicht nur der Balken darin. Der Balken
  bestimmt nur die Uhrzeit.

**Die Umrechnung Position → Minute ist Arithmetik und gehört damit eigentlich in
den Kern.** Sie steht trotzdem in der Komponente, weil ihre Eingabe ein
`DOMRect` ist — eine Größe, die der Kern nicht kennen darf. Was sie berechnet,
ist eine lineare Abbildung ohne Fachlogik; jede Rundung und jede Regel darüber
liegt in `zeitwahl.ts`.

---

## B-06 Was das Sheet mit einem Tipp macht

| Getippt auf | Folge |
|---|---|
| freie Stelle | Sheet öffnet, `fensterIn(getroffeneLuecke, minute)` |
| belegte Stelle | Sheet öffnet, `fensterIn(RAHMEN, minute)` → Modus meldet den Konflikt |
| Zeile ohne Ortsangabe | Sheet öffnet, erste freie Lücke des Tages |
| Tag ohne freie Lücke | Sheet öffnet im Leerfall (`fenster = null`) |

Ein Tipp auf eine belegte Stelle bleibt **nicht** folgenlos (FR-025, Grenzfall der
Spec). Wer eine belegte Zeit antippt, will genau sie — und bekommt die Auskunft,
dass sie belegt ist, samt Ausweichvorschlag.

---

## B-07 Tageswechsler

- Pfeile: `width: 52px; min-height: 52px`, Glyphen `‹` / `›` in 26 px.
- Am Rand des Bereichs (heute bzw. +6 Tage) `opacity: .3` **und** ohne Wirkung —
  die Abschwächung allein wäre Zustandsinformation nur über Farbe (NFR-004);
  deshalb tragen sie zusätzlich `disabled`.
- Mitte: unsichtbares `<input type="date">` über der Beschriftung, `min` = heute,
  `max` = heute + 6. Die Auswahl wird über den Ortstag zurückgerechnet.
- Ein Tageswechsel setzt das Fenster neu: erste freie Lücke, Dauer wieder 2 h
  (FR-037). Ohne Lücke: Leerfall.

---

## B-08 Feste Höhen

Gegen Sprünge (FR-051, SC-005):

| Zone | Höhe |
|---|---|
| Statustext unter dem Zeitfenster | 36 px (zwei Zeilen à 11.5px/1.5) |
| Ausweichbereich | 58 px |
| Container aus Ausweich + Primäraktion | min. 150 px |

Die Statuszeilen bekommen `white-space: nowrap; text-overflow: ellipsis` — ein
umbrechender Konflikttext änderte sonst die Höhe und verschöbe die Aktion genau
dann, wenn jemand zieht.

---

## B-09 Sichtbarkeit der Kachelauswahl

- Gemessen wird über `getBoundingClientRect`-Differenz zwischen Kachel und
  Scroller, **nicht** über `offsetTop` (das Sheet ist `fixed`).
- Nachgeführt wird nur, wenn sich die Merk-Kennung ändert
  (`variante | offen | stundeVon | stundeBis`) — sonst würde eigenes Scrollen bei
  jedem Durchlauf zurückgesetzt.
- Stehen beide Spalten noch nicht im DOM, Wiederholung im nächsten Frame.
- Pfeilrichtung pro Spalte: `-1` (oberhalb), `0` (sichtbar), `1` (unterhalb),
  ermittelt aus den Rechtecken mit 6 px Toleranz, aktualisiert bei `scroll` und
  nach jedem Durchlauf.

---

## B-10 Tippziele

Alle ≥ 44 px (FR-052), auch:

- Minutenkacheln (44 px Kachelhöhe)
- Zieh-Griffe: Trefferfläche 30 px breit (`left:-10px`/`right:-10px`) und
  `top/bottom:-6px`, also ≥ 44 px hoch — der sichtbare Strich darin misst 4×22 px.

---

## B-11 Was die Detailansicht verliert

- Die klebende Aktionsleiste (`.aktionen`) **vollständig** — mit ihr der
  „Reservieren"-Knopf und der POH-Verweis (FR-023, FR-026).
- Der Fußbereich endet mit der Fußnote, `padding: 24px 16px 120px`.
- Die 7-Tage-Liste zeigt `slice(1)` — sechs Zeilen ab morgen (FR-048).

Der POH-Rechner bleibt über das Flugzeugmenü der Übersicht erreichbar
(`handlungenFuer`); er wird hier nicht ersetzt, sondern nicht wiederholt.

---

## B-12 Bewegung

Wer `prefers-reduced-motion: reduce` gesetzt hat, bekommt Overlay und Sheet ohne
Fahrt (NFR-003) — wie bisher. Die weiche Ausblendung der Scroll-Pfeile
(`transition: opacity .25s`) entfällt dann ebenfalls; sie ist Verzierung, keine
Auskunft.
