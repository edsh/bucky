# Handoff v2: Reservierungsübersicht Flugzeugflotte („Bucky")

> **v2 gegenüber v1:** Die Übersicht und die Detailansicht sind unverändert (siehe `design_handoff_reservierung/`). Neu und komplett überarbeitet ist das **Reservieren-Sheet**: aus zwei Anzeigefeldern ist ein vollständiger Zeitwähler geworden (Zieh-Balken + Kachelwahl), mit Tageswechsel und Systemdatum, Modus-Logik (frei / Nachtrag / Warteliste / gesperrt), Nachttönung auf allen Balken und einem parametrisierten Vereinsflieger-Deep-Link. Der Sticky-Footer der Detailansicht (POH + Reservieren) ist entfallen. Der Abschnitt „Änderungen v1 → v2" listet alles auf.

## Überblick
Mobile Web-Ansicht, die Vereinsmitgliedern zeigt, welche Vereinsmaschine **jetzt** verfügbar ist und wann sie belegt ist. Flotte als runde Avatare mit **Tagesuhr-Ring**, Detailansicht mit Tagesbalken / 7-Tage-Liste / Wochenraster, und ein **Reservieren-Sheet**, in dem das Mitglied ein Zeitfenster festlegt und damit nach Vereinsflieger springt.

Gebucht wird **nicht** hier. Diese Anwendung ist read-only gegenüber Vereinsflieger; das Sheet bereitet die Buchung nur vor und übergibt sie per URL.

## Zu den Design-Dateien
Alles in `design/` ist eine **Design-Referenz in HTML** — ein Prototyp, der Aussehen und Verhalten festlegt, **kein** Produktionscode zum Kopieren. `Reservierung.dc.html` nutzt eine hauseigene Template-Runtime (`support.js`); Struktur, Werte und Logik sind daraus ablesbar, die Umsetzung entsteht im Zielprojekt mit dessen eigenen Mitteln (React/Vue/Svelte/Native — oder, falls noch kein Projekt existiert, mit dem passendsten Stack; für eine mobile Web-App ist React + Vite eine sichere Wahl).

Nachbauen heißt: gleiche Screens, gleiche Zustände, gleiche Zahlen — nicht dieselbe Dateistruktur.

## Fidelity
**High-Fidelity.** Farben, Typo, Abstände, Radien, Rasterwerte und Interaktionen sind final. Ring-Geometrie und Sheet-Verhalten sind exakt spezifiziert und sollen pixel- bzw. verhaltensgenau nachgebaut werden. Die Flottendaten im Prototyp sind Beispieldaten (fester Zeitpunkt `13.08.2026, 11:20`, Sonnenaufgang `06:05`, Sonnenuntergang `20:40`) und werden durch echte Daten ersetzt.

---

# Teil A — Unverändert aus v1

Übersicht, Tagesuhr-Ring, Detailansicht (Statusblock, Karte „Heute", Segmented Control, 7-Tage-Liste, Wochenraster, „Kommende Belegungen", Fußnote), Statuslogik, Zeitformate, Ring-Marker und Tokens sind **wie in v1 spezifiziert**. Bitte `design_handoff_reservierung/README.md` als Grundlage lesen; dieses Dokument beschreibt darüber hinaus nur die Änderungen und das neue Sheet vollständig.

**Ausnahmen / Korrekturen zu v1 in Teil A:**

1. **Sticky Aktionsleiste entfällt.** Die Detailansicht hat **keinen** Footer mehr (kein „POH", kein „Reservieren"-Button). Der Fußbereich endet mit der Fußnote, `padding:24px 16px 120px`. Das Sheet öffnet ausschließlich durch **Tippen auf einen Balken**: den Tagesbalken „Heute" oder eine Tageszeile der 7-Tage-Liste bzw. eine Wochenspalte. Tippen auf eine freie Stelle setzt den Vorschlag auf die getippte Uhrzeit; Tippen auf eine belegte Stelle öffnet das Sheet im Wartelisten-Modus.
   → **Offener Punkt:** der POH-Link hat damit keinen Platz mehr. Vorschlag für die Implementierung: als Icon-Button in den Sticky-Header der Detailansicht, rechts neben dem Theme-Button.
2. **Jetzt-Nadel neu.** Überall, wo bisher eine 2 px breite Jetzt-Linie stand, steht jetzt eine **1 px feine, gestrichelte Nadel**: `background: linear-gradient(to bottom, <textfarbe> 0 3px, transparent 3px 6px)`, `background-size:1px 6px`, `background-repeat:repeat-y`, und sie **ragt oben und unten je 5 px über den Balken hinaus** (`top:-5px; bottom:-5px`). Der Balkencontainer darf deshalb **nicht** `overflow:hidden` haben — Segmente stattdessen selbst runden (`border-radius`), der Vergangenheits-Schleier bekommt `border-radius: 8px 0 0 8px`.
3. **Nachttönung auf allen Balken** (neu, siehe eigener Abschnitt).
4. **Tagesliste beginnt bei morgen.** Die 7-Tage-Liste zeigt `t = 1…6`; „Heute" steht schon als großer Balken darüber und wird nicht wiederholt.
5. **Konflikt-Text mit Doppelpunkt:** `14:00–17:30: reserviert` (vorher Middot). Mehrere Konflikte werden weiterhin mit ` · ` verkettet.

---

# Teil B — Nachttönung (alle Balken)

Jeder waagerechte Balken (Tagesbalken, Tageszeilen, Sheet-Balken) und jede senkrechte Wochenspalte bekommt als **unterste Ebene** (`z-index:0`, `pointer-events:none`, `inset:0`, gleicher `border-radius` wie der Balken) einen Verlauf, der Nacht klar sichtbar macht:

```css
/* waagerecht */
background: linear-gradient(90deg,
  rgba(9,15,33,.62) 0, rgba(9,15,33,.62) .5%,
  transparent 1.6%, transparent 90.6%,
  rgba(9,15,33,.62) 92.7%, rgba(9,15,33,.62) 100%);
/* senkrecht: identische Stops mit 180deg */
```

**Herleitung der Stops** (produktiv berechnen, nicht hart kodieren): Balkenachse ist `VON_H = 6` bis `BIS_H = 22`, also 960 Minuten.
`pos(t) = (t − 6:00) / 960 × 100 %`. Mit Sonnenaufgang 06:05 → 0,5 % und Sonnenuntergang 20:40 → 91,7 %, Dämmerung ±10 min (≈ ±1,04 %) ergibt: `0 → 0,5 % → 1,6 % (klar) … 90,6 % (klar) → 92,7 % → 100 %`.

Liegt Sonnenaufgang vor 06:00 oder Untergang nach 22:00, entfällt der jeweilige Rand (Stop bei 0 %). Nachtfarbe ist in Hell und Dunkel dieselbe (`rgba(9,15,33,.62)`) — die Nacht soll in beiden Themes eindeutig als Nacht lesbar sein.

**Ebenenfolge im Balken** (unten → oben): Nachttönung → freie Lücken → Belegungssegmente → Vergangenheits-Schleier → Auswahlblock → Jetzt-Nadel (`z-index:4`).

---

# Teil C — Reservieren-Sheet (neu, vollständig)

## Rahmen
Overlay `rgba(0,0,0,.42)`, `animation: einblenden .2s`, Tap schließt. Sheet: `max-width:430px`, `border-radius:18px 18px 0 0`, `background:--bg`, `padding:8px 18px 22px`, `box-shadow:0 -12px 40px rgba(0,0,0,.25)`, `animation: hoch .3s cubic-bezier(.22,.7,.3,1)`, **`max-height:100dvh; overflow-y:auto; overscroll-behavior:contain`**. Grabber 38×4 px `rgba(127,127,127,.4)`, `margin:0 auto 14px`.

Kopfzeile: Titel „{Kennzeichen} reservieren" (`650 18px/1.3`) links, Textbutton „Abbrechen" (`13px`, `opacity:.5`) rechts.

## 1. Tageswechsler
`display:flex; align-items:stretch; gap:4px; border-radius:10px; background:rgba(127,127,127,.09); overflow:hidden`, `margin-top:14px`.
- Links/rechts je ein Chevron-Button „‹" / „›": `width:52px; min-height:52px` (volle Zeilenhöhe = Tap-Fläche), `font:400 26px/1`, randlos, `opacity:1` bzw. `.3` am Rand des Bereichs (`t = 0…6`).
- Mitte: `<label>` mit Tagesname (`600 13.5px`, „Heute" / „Morgen" / „Übermorgen" / „Sa., 15.08.") und Datum (`11px` mono, `opacity:.45`), darüber ein **unsichtbares `<input type="date">`** (`position:absolute; inset:0; opacity:0`) mit `min` = heute, `max` = heute + 6 — das öffnet den **Systemdatepicker**. Auswahl wird in den Tagesindex zurückgerechnet.

Tageswechsel setzt das Fenster **neu**: erste freie Lücke des Tages, Dauer wieder 2 h. Hat der Tag keine freie Lücke, wird `von = bis = null` (Leerfall, Hinweistext statt Wähler).

## 2. Statuszeile
- Großes Zeitfenster: `650 27px/1.15` mono, `letter-spacing:-.02em`, Format `11:30–13:30`.
- Daneben Dauer-Pille: `padding:4px 9px; border-radius:999px; background:rgba(31,78,121,.14); color:#1f4e79; font:650 12px`. Dauerformat: `45 min` · `2 h` · `2:15 h`.
- Darunter ein Block **fester Höhe 36 px** (zwei Zeilen à `11.5px/1.5`, `white-space:nowrap; text-overflow:ellipsis`), damit das Sheet beim Ziehen nicht springt:
  - Zeile 1 — Lückenstatus, gefärbt: bei Überschneidung `🙅 Überschneidet 14:00–17:30: reserviert` in `#c0442b`, sonst `👍 Frei 09:00–14:00` in `#1f8f45`.
  - Zeile 2 — nur wenn das Fenster in der Vergangenheit beginnt: `Liegt zurück — Nachtrag für 09:00–10:30` in `#d9a13c`, `font-weight:600`.

## 3. Variantenwahl (Segmented Control)
`display:flex; gap:4px; padding:3px; border-radius:10px; background:rgba(127,127,127,.12)`, Buttons `flex:1; padding:7px 4px; border-radius:8px; font:600 12px`, aktiv mit `--bg` + leichtem Schatten.
Zwei Optionen: **„Ziehen" (Default)** und **„Uhrzeit wählen"**. (Die v1-Variante „Dauer" ist entfallen; die frühere „Endzeit"-Chipliste ist durch die Kachelwahl ersetzt.)

### 3a. „Ziehen" — Zieh-Balken
Balken `height:46px; border-radius:8px; background:rgba(127,127,127,.16); touch-action:none; cursor:pointer`, **ohne** `overflow:hidden`.
Ebenen wie in Teil C oben; zusätzlich:
- Freie Lücken `rgba(31,143,69,.2)`, `border-radius:8px`.
- Belegungssegmente in Statusfarben, `border-radius:6px`.
- **Auswahlblock**: `background:#1f4e79`, `border-radius:7px`, `z-index:3`, `cursor:grab`, positioniert über `left/width` in Prozent. Zwei Griffe an den Kanten: Trefferfläche `width:30px` mit `left:-10px` / `right:-10px` und `top/bottom:-6px` (also ≥ 44 px hoch), darin ein sichtbarer Strich 4×22 px `rgba(255,255,255,.9)`, `border-radius:2px`, `cursor:ew-resize`.
- Stundenachse darunter: `position:relative; height:16px; margin-top:5px`, Labels 6/10/14/18/22 absolut, `translateX(-50%)`, `11px` mono, `opacity:.45`.
- Hinweis darunter: „Block verschieben, Kanten für Beginn und Ende ziehen — es rastet in 15 Minuten." (`11.5px`, `opacity:.45`).

**Zieh-Verhalten (verbindlich):**
- Alles rastet auf **15 Minuten** (`round(m/15)*15`).
- **Griff Start:** `von = clamp(m, rahmen.von, bis − 15)` — die **Dauer ändert sich**, das Ende bleibt stehen.
- **Griff Ende:** `bis = clamp(m, von + 15, rahmen.bis)` — ebenso.
- **Block verschieben:** Dauer bleibt, `von = clamp(m − griffOffset, rahmen.von, rahmen.bis − dauer)`. Am Tagesrand **stoppt** der Block (er reißt nicht ab und läuft nicht in den nächsten Tag).
- Grenze („Rahmen") ist der **Flugtag 06:00–22:00**, *nicht* die freie Lücke: ein Fenster darf über eine Belegung hinausreichen — daraus wird dann ein Wartelisteneintrag.
- **Tippen** auf eine freie Stelle des Balkens setzt ein neues 2-h-Fenster ab dort. Nach einem Zieh-Vorgang muss der folgende Klick **unterdrückt** werden (sonst setzt er das eben gezogene Fenster auf die 2-h-Vorgabe zurück) — im Prototyp über ein `zogGerade`-Flag, das `pointermove` setzt und der nächste Klick konsumiert.
- Pointer-Events global auf `window` (`pointermove`/`pointerup`), damit das Ziehen außerhalb des Balkens nicht abbricht.

### 3b. „Uhrzeit wählen" — Kachelwahl
`display:grid; grid-template-columns:1fr 1fr; gap:10px`. Links **🛫 Beginn**, rechts **🛬 Ende** (Spaltenkopf `10.5px`, uppercase, `letter-spacing:.1em`, `opacity:.45`, `margin-bottom:6px`).

Jede Spalte besteht aus zwei Kachelspalten (`display:flex; gap:5px`):
- **Stunden** (`flex:1`), senkrecht scrollbar: `max-height:191px` (= 4 × 44 + 3 × 5, exakt die Höhe der Minutenspalte), `gap:5px`, `scrollbar-width:none` + `::-webkit-scrollbar{width:0}`, und Rand-Verläufe über Maske:
  `mask-image: linear-gradient(180deg, transparent 0, #000 14px, #000 calc(100% − 20px), transparent 100%)`.
- **Minuten** (`width:60px`, fest): `:00`, `:15`, `:30`, `:45`.

Kachel: `min-height:44px`, `display:grid` zentriert, `gap:1px`, `border-radius:10px`, `border:1px solid …`, zwei Zeilen — Zeit (`650 14px` mono, Minuten `13px`) und darunter **Dauervorschau** (`9.5px`, `opacity:.55`), also die Dauer, die diese Wahl ergäbe.
Zustände: gewählt = `background:#1f4e79`, `border:#1f4e79`, Text weiß; würde die Wahl eine Belegung schneiden = `border: rgba(192,68,43,.45)`; unmöglich = `opacity:.28` und kein Handler.

**Rechenregeln der Kacheln (verbindlich):**
- **Beginn** verschiebt das Ende **nicht**: das Ende bleibt stehen, die Dauer ändert sich. Nur wenn der neue Beginn das Ende überholt (`bis < von + 15`), springt das Ende auf `min(rahmen.bis, von + 30)`.
- Beginn-Kacheln sind wählbar für `rahmen.von ≤ ziel ≤ rahmen.bis − 30`; Ende-Kacheln für `von + 15 ≤ ziel ≤ rahmen.bis`.
- Eine Stundenkachel behält die aktuelle Minute (`h*60 + von%60`), eine Minutenkachel die aktuelle Stunde — die beiden Spalten sind unabhängig.
- Die Dauervorschau zeigt exakt das Ergebnis dieser Regeln, also nie einen negativen Wert.

**Sichtbarkeit der Auswahl (wichtig):** Beim Öffnen des Sheets, beim Wechsel auf „Uhrzeit wählen" und bei jeder Änderung der Wahl wird die gewählte Stundenkachel **in die Mitte ihrer Spalte gescrollt**. Zwei Fallen, die im Prototyp Fehler verursacht haben:
- Der Versatz muss **relativ zum Scroller** gemessen werden (`getBoundingClientRect`-Differenz), nicht über `offsetTop` — das Sheet ist `position:fixed`.
- Beim Moduswechsel stehen die Spalten evtl. noch nicht im DOM: Zentrierung im nächsten Frame wiederholen, bis beide Spalten gefunden sind; und die Merk-Kennung muss **Modus und Sheet-Zustand** enthalten, nicht nur die Stunden.
Zusätzlich schiebt sich das Sheet auf kurzen Bildschirmen so weit, dass beide Spalten ganz sichtbar sind; eigenes Scrollen des Nutzers wird nicht zurückgesetzt.

**Scroll-Pfeile:** Liegt die gewählte Kachel außerhalb ihres Sichtfelds, erscheint am oberen bzw. unteren Rand der Spalte ein winziges Pfeilchen (`▲`/`▼`, `9px`, `color:#1f4e79`, `pointer-events:none`, `left:50%`, `transform:translateX(-50%)`), das per `transition: opacity .25s` ausblendet, sobald die Kachel ins Sichtfeld gescrollt wird. Zustand pro Spalte: `-1` (oberhalb), `0` (sichtbar), `1` (unterhalb), ermittelt aus den Rects mit 6 px Toleranz, aktualisiert bei `scroll` und nach jedem Render.

## 4. Modi und Abschluss-Aktion
Aus dem gewählten Fenster ergibt sich genau **einer** von vier Modi:

| Modus | Bedingung | Abschluss |
|---|---|---|
| `nachtrag` | Fenster beginnt heute vor „jetzt" | Primärlink **„Nachträglich eintragen … ↗"**, Hinweis: „Rückwirkend eintragen ist erlaubt. Überschneidungen klärt der Verein, nicht diese Seite." |
| `gesperrt` | Fenster schneidet eine Sperre | Kein Absprung. Hinweisbox `border:1px solid rgba(176,92,80,.4); background:rgba(176,92,80,.1)`: „Gesperrt — hier geht auch keine Warteliste." + „Wann die Sperre endet, entscheidet die Werkstatt, nicht die Reihenfolge der Wünsche." |
| `warteliste` | Fenster schneidet eine fremde/eigene Reservierung | Button **„Auf die Warteliste … ↗"**; nach Tap Bestätigungsbox `rgba(31,143,69,…)`: „Notiert — Bucky meldet sich, wenn 14:00–16:00 frei wird." |
| `frei` | sonst | Primärlink **„In Vereinsflieger reservieren … ↗"**, Hinweis: „Gebucht wird dort — Anmeldung nötig. Diese Seite ändert in Vereinsflieger nichts." |

Primäraktion: `display:block; width:100%; padding:14px; border-radius:10px; background:#1f4e79; color:#fff; font:650 14.5px`, `margin-top:18px`. Alle drei Aktionsbeschriftungen enden auf **„… ↗"** — die Ellipse kündigt an, dass danach noch ein Schritt in Vereinsflieger folgt.

**Ausweich-Vorschlag:** In den Modi `warteliste` und `gesperrt` erscheint darüber ein gestrichelter Button „Frei wäre 16:00–18:00 — stattdessen nehmen" (`min-height:44px`, `border:1px dashed rgba(127,127,127,.35)`, transparent). Gesucht wird die **erste freie Lücke ab dem gewählten Ende**, sonst die erste, die das gewählte Fenster überlappt, sonst die erste des Tages — nicht „ab jetzt". Der Bereich hat feste Höhe (58 px, Container `min-height:150px`), damit die Primäraktion nicht springt.

**Leerfall:** Hat der Tag keine freie Lücke mehr, ersetzt ein Hinweistext (`13.5px`, `opacity:.6`) den ganzen Wähler.

## 5. Vereinsflieger-Deep-Link
Beide Absprünge (`frei`, `nachtrag`) zeigen auf:

```
https://vereinsflieger.de/member/community/reservations/add
  ?type=0&inline=0
  &frm_apid=<apid der Maschine>
  &frm_datefrom=DD.MM.YYYY&frm_dateto=DD.MM.YYYY
  &frm_datefromtime=HH:MM&frm_datetotime=HH:MM
```

Beispiel: `…add?type=0&inline=0&frm_apid=75132&frm_datefrom=13.08.2026&frm_dateto=13.08.2026&frm_datefromtime=11:30&frm_datetotime=13:30`

Regeln: `target="_blank" rel="noopener noreferrer"`; Datum **immer** zweistellig `DD.MM.YYYY`, Zeit `HH:MM` (24 h); `frm_datefrom` = `frm_dateto` (Fenster bleibt innerhalb eines Tages); Parameter **nicht** URL-encoden (die Punkte und der Doppelpunkt bleiben literal — Vereinsflieger erwartet sie so); fehlt eine `apid`, wird der Parameter weggelassen.

⚠️ **Datenlücke:** Nur **D-EELK** hat die echte `frm_apid = 75132` (aus dem gelieferten Beispiel-Link). Die übrigen Maschinen tragen im Prototyp Platzhalter `75133…75137`. **Vor der Umsetzung die echten `apid`-Werte pro Maschine besorgen** und aus der Flottenquelle beziehen, nicht hart kodieren.

## 6. State (Sheet)
| State | Werte | Auslöser |
|---|---|---|
| `sheet` | boolean | Balken-Tap / Abbrechen / Overlay-Tap |
| `res` | `{ t: 0…6, von: min\|null, bis: min\|null }` | Öffnen, Ziehen, Kacheln, Tageswechsel |
| `variante` | `ziehen` (Default) \| `kacheln` | Segmented Control |
| `wartet` | boolean | „Auf die Warteliste"; bei jedem Öffnen/Tageswechsel zurücksetzen |
| `pfeilVon` / `pfeilBis` | `-1 \| 0 \| 1` | Scroll / Render der Kachelspalten |

`von`/`bis` sind **Minuten seit Mitternacht** des Tages `t` (0 = heute). Alles andere ist abgeleitet: Konflikte, Modus, Ausweich-Lücke, Balkensegmente, Kachelzustände, Deep-Link.

Nicht in den State: die Zieh-Geste (Mutable Ref: Art `start`/`ende`/`block`, Griff-Offset, Rahmen) und das `zogGerade`-Flag.

## 7. Interaktionsdetails, die leicht untergehen
- Setzen von `von`/`bis` **funktional** (`setState(prev => …)`), damit zwei Taps im selben Frame nicht verloren gehen.
- Sheet-Höhe: kein festes `height`; Kopf, Tageswechsler und Primäraktion müssen bei 100 dvh immer erreichbar bleiben (deshalb der eigene Scroll).
- Alle Tap-Ziele ≥ 44 px, auch die Kachel-Minuten und die Zieh-Griffe.
- Emoji sind Teil der Copy: 🛫 / 🛬 in den Spaltenköpfen, 🙅 / 👍 in der Statuszeile, ☀️ in den Statussätzen. Sie tragen Bedeutung mit, ersetzen aber keinen Text.

---

# Änderungen v1 → v2 (Checkliste)
1. Detailansicht ohne Sticky-Footer; Sheet öffnet nur über Balken-Taps. POH-Link braucht einen neuen Platz.
2. Sheet: aus zwei statischen Feldern „Von/Bis" wird ein Wähler mit zwei Varianten (**Ziehen** = Default, **Uhrzeit wählen**).
3. Neuer Tageswechsler mit ‹ › (52 px Tap-Fläche, 26 px Glyphen) und Systemdatepicker in der Mitte (heute … +6 Tage).
4. Neue große Statuszeile (Fenster + Dauer-Pille) mit fester 36-px-Textzone, Emoji-Status 🙅/👍.
5. Kachelwahl: Stunden (scrollbar, maskierte Ränder, Zentrierung der Auswahl, ▲/▼-Hinweise) × Minuten `:00/:15/:30/:45`, je Kachel Dauervorschau; Beginn lässt das Ende stehen.
6. Vier Modi (frei / Nachtrag / Warteliste / gesperrt) mit eigenen Aktionen und Texten; Ausweich-Vorschlag ab dem gewählten Ende.
7. Alle Absprungbeschriftungen enden auf „… ↗".
8. Jetzt-Nadel: 1 px, gestrichelt, 5 px Überstand — in Detailbalken und Sheet-Balken.
9. Nachttönung `rgba(9,15,33,.62)` auf allen vier Balkentypen, Stops aus Sonnenzeiten berechnet.
10. Vereinsflieger-Link vollständig parametrisiert (`frm_apid`, Datum, Uhrzeiten).
11. 7-Tage-Liste beginnt bei morgen; Konflikttexte mit Doppelpunkt.
12. Entfernt: Dauer-Variante, ±15-Stepper für den Beginn, Endzeit-Chipliste, drei Hinweistexte (Kachel-Dauer, Wartelisten-Erklärung, Sheet-Fußnote in v1-Form).

# Neue/geänderte Design-Tokens in v2
- Nacht (Balken): `rgba(9,15,33,.62)` — identisch in Hell und Dunkel
- Auswahlblock / Kachel gewählt / Pille-Text: `#1f4e79`; Pillenfläche `rgba(31,78,121,.14)`
- Konfliktrand einer Kachel: `rgba(192,68,43,.45)`; deaktivierte Kachel `opacity:.28`
- Nachtrag-Warnfarbe: `#d9a13c`
- Sheet: `max-height:100dvh`, Radien 18/10/8/7 px, Kachelhöhe 44 px, Stundenspalte 191 px, Minutenspalte 60 px
- Raster: 15 Minuten; Mindestdauer 15 min (Beginn-Überholung → 30 min); Vorschlagsdauer 2 h; Flugtag 06:00–22:00

# Assets
Unverändert in `design/assets/`: `bucky-splash.png`, `D-EELK_pixelart.gif`, `husky-dexyz-pixel-art.gif`, `bucky-maskottchen.svg`, `bucky-pixel.gif` (die letzten zwei ungenutzt). Maschinen ohne Bild zeigen das Kurzkennzeichen — Normalfall, kein Fehlzustand.

# Dateien
- `design/Reservierung.dc.html` — kompletter Prototyp (Template oben, Logik im `<script type="text/x-dc">`-Block)
- `design/support.js` — Runtime, nur zum lokalen Öffnen
- `design/assets/*` — Bilder
- `spec.md` — Feature-Spec im Spec-Kit-Format (v2)
- `SPEC_KIT.md` — Weg von hier nach Claude Code + Spec Kit
