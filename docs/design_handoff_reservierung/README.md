# Handoff: Reservierungsübersicht Flugzeugflotte („Bucky")

## Überblick
Mobile Web-Ansicht, die Vereinsmitgliedern auf einen Blick zeigt, welche Vereinsmaschine **jetzt** verfügbar ist und wann sie belegt ist. Jede Maschine erscheint als runder Avatar mit einem **Tagesuhr-Ring**: der Ring codiert den ganzen Tag (00–24 h) als Farbverlauf aus frei / belegt / gesperrt, plus Marker für Sonnenaufgang, Sonnenuntergang und „jetzt". Ein Tap öffnet die Detailansicht mit Statussatz, Tagesbalken, 7-Tage-Liste, Wochenraster und einem Reservieren-Sheet, das nach Vereinsflieger verlinkt.

Buchen selbst passiert **nicht** hier — die Seite ist eine Lese-/Übersichtsansicht. Verbindlich bleibt der Reservierungskalender in Vereinsflieger.

## Zu den Design-Dateien
Alles in `design/` ist eine **Design-Referenz in HTML** — ein Prototyp, der Aussehen und Verhalten festlegt, **kein** Produktionscode zum Kopieren. `Reservierung.dc.html` nutzt eine hauseigene Template-Runtime (`support.js`); Struktur, Werte und Logik sind daraus ablesbar, aber die Umsetzung soll im Zielprojekt mit dessen eigenen Mitteln entstehen (React/Vue/Svelte/Native — oder, falls noch kein Projekt existiert, mit dem für die Aufgabe passendsten Stack; für eine mobile Web-App ist React + Vite eine sichere Wahl).

Nachbauen heißt hier: gleiche Screens, gleiche Zustände, gleiche Zahlen — nicht dieselbe Dateistruktur.

## Fidelity
**High-Fidelity.** Farben, Typo, Abstände, Radien und Interaktionen sind final. Die Ring-Geometrie ist exakt spezifiziert (siehe „Tagesuhr-Ring") und soll pixelgenau nachgebaut werden. Die Flottendaten im Prototyp sind Beispieldaten (fester Zeitpunkt `13.08.2026, 11:20`) und werden durch echte Daten ersetzt.

## Screens / Views

### 1. Übersicht
**Zweck:** Verfügbarkeit der gesamten Flotte auf einen Blick; Einstieg in die Detailansicht.

**Layout:** Eine Spalte, `max-width: 430px`, zentriert, Seitenrand `16px`, Außenhintergrund `--aussen`, Kartenfläche `--bg` mit 1px Hairline `rgba(127,127,127,.18)`.

Reihenfolge von oben:
1. **Splash-Bild** `assets/bucky-splash.png`, `width:100%`, `height:auto`, randlos. Oben rechts (`top/right: 10px`) ein 34px-Kreisbutton für Hell/Dunkel: Rand `1px rgba(255,255,255,.5)`, Fläche `rgba(0,0,0,.35)`, `backdrop-filter: blur(4px)`, Glyph ☾ / ☀.
2. **Sektionskopf „MEINE LIEBLINGSMASCHINEN"** — `11px/700`, `letter-spacing:.12em`, `uppercase`, `opacity:.5`; rechts in derselben Baseline der Stand-Text (`11.5px`, `opacity:.45`, Format „Stand Do., 13.08., 11:20"). Darunter 1px Trennlinie `rgba(127,127,127,.2)`, `padding-bottom:12px`.
3. **Favoriten-Reihe** — `display:flex; gap:18px; align-items:flex-start; padding:16px 16px 0`. Pro Favorit ein Button (`width:118px`, Spalte, `gap:7px`): 96px-Avatar, Kennzeichen (`13.5px/700`, `letter-spacing:.04em`), Kurzsatz (`11.5px/600`, in Statusfarbe, zentriert, `text-wrap:pretty`), optionale zweite Zeile „danach …" (`11px`, `opacity:.5`, `margin-top:-4px`).
4. **Legende** — bei ≤2 Favoriten rechts neben der Favoritenreihe (`flex:1`, `align-self:flex-end`, Spalte, `gap:7px`), sonst als eigene Zeile darunter (`flex-wrap`, `gap:6px 14px`). Container: `padding:10px 12px`, `border-radius:10px`, `background:rgba(127,127,127,.09)`. Pro Eintrag ein 11px-Punkt + Text `11.5px`, `opacity:.75`. Einträge: „frei" (grün), „belegt" (rot), „gesperrt" (grau), „Nacht" (Nachtgrau) — abschaltbar über den Tweak `legende`.
5. **Gruppen** — „Weitere Motorflugzeuge & UL", „Weitere Segelflugzeuge". Kopf wie oben, plus Zähler (`11px`, `opacity:.35`, z. B. „2"). Grid: `flex-wrap; gap:16px 14px; padding-top:16px`, Kacheln `width:118px` mit 74px-Avatar, Kennzeichen `12.5px/700`, Kurzsatz `11px`, Zusatzzeile `10.5px`.
6. **Fußnote** — `11.5px`, `line-height:1.55`, `opacity:.45`: „Unverbindliche Anzeige. Verbindlich ist der Reservierungskalender in Vereinsflieger."

**Wichtig:** Favoriten erscheinen **nur** oben, nicht zusätzlich in ihrer Gruppe.

### 2. Detailansicht
**Zweck:** Belegung einer Maschine verstehen und die nächste freie Lücke finden.

Von oben:
1. **Sticky Header** (`top:0`, `z-index:3`, `padding:12px 16px`, `background:--bg`, 1px Bottom-Hairline): 34px-Kreis-Zurück-Button „←", 40px-Avatar (gleiche Ring-Logik, Padding 2px, Bild 30px), Kennzeichen `15px/700` + Typ `11.5px opacity:.5` (Ellipsis), rechts der Theme-Button.
2. **Statusblock** (`padding:22px 16px 0`): 9px-Punkt in Statusfarbe mit Puls-Animation (`puls 2.4s ease-in-out infinite`, Opazität 1 → .35), daneben Statuswort (`11px/700`, uppercase, `.12em`, `opacity:.5`) — „Frei" / „Heute noch frei" / „Belegt" / „Gesperrt". Darunter der Statussatz als `27px`, `font-weight:650`, `line-height:1.25`, `letter-spacing:-.01em`, `text-wrap:balance`, in Statusfarbe. Darunter Stand-Text `12.5px opacity:.5`.
3. **Karte „Heute"** (`margin:22px 16px 0`, `padding:16px 14px 12px`, `radius:14px`, `background:rgba(127,127,127,.09)`): Titel „Heute" (`12px/700`, `.06em`) + Datum rechts (`11.5px opacity:.5`). Balken `height:38px`, `radius:8px`, Spur `rgba(127,127,127,.16)`, Segmente absolut positioniert (`radius:6px`) in Statusfarben; Jetzt-Linie 2px in Textfarbe, `top/bottom:-3px` überstehend. Darunter Stundenachse 6/10/14/18/22 (`11px` mono, `opacity:.45`). Darunter Belegungszeiten als Chips (`12px opacity:.7`, Zeit `font-weight:650`, Trenner „ · ").
4. **Segmented Control** (`margin:24px 16px 0`, `padding:3px`, `radius:10px`, `background:rgba(127,127,127,.12)`): „7 Tage" / „Woche", aktiv mit `--bg` und leichtem Schatten, `12.5px/600`, `radius:8px`.
5. **7-Tage-Liste:** pro Zeile `padding:9px 0`, 1px Bottom-Hairline `rgba(127,127,127,.14)`; links Tag+Datum (`width:56px`, `12.5px`, Tag `700`), Mitte Balken `height:14px`, `radius:5px`, rechts Textspalte `width:112px`, mono `11.5px`, rechtsbündig, in Tagesfarbe („frei" / „gesperrt" / „14:00–17:30 +1").
6. **Wochenraster:** 7 Spalten `height:210px`, `radius:6px`, Spur `rgba(127,127,127,.14)`; Segmente `left/right:1px`, `radius:4px`; Heute-Spalte mit 2px Jetzt-Linie; links Stundenachse `width:30px`, `10.5px` mono. Tageslabel unter der Spalte `10.5px/600`, `opacity:.6`.
7. **„KOMMENDE BELEGUNGEN"** (max. 6): 4px-Farbstreifen links (rot = fremd, `#1f4e79` = eigene, `#b05c50` = Sperre), Zeit `13.5px/600`, Wer `12px opacity:.55` („Deine Reservierung" / „Reserviert" / „Sperre · Wartung"), rechts Dauer mono `11.5px opacity:.45` („3,5 h", ganztägig „24 h"). Leerfall: „Nichts eingetragen in den nächsten sieben Tagen."
8. **Fußnote** wie in der Übersicht, ergänzt um „Namen erscheinen nur bei eigenen Reservierungen."
9. **Sticky Aktionsleiste** (`bottom:0`, `padding:12px 16px 16px`, `background:--balken`, `backdrop-filter: blur(8px)`, 1px Top-Hairline): sekundärer Link „POH" (Rand `1px rgba(127,127,127,.3)`, `radius:10px`, `13px/600`) und primärer Button „Reservieren" (`flex:1`, `padding:13px`, `radius:10px`, `background:#1f4e79`, weiß, `14.5px/650`).

### 3. Reservieren-Sheet (Bottom Sheet)
Overlay `rgba(0,0,0,.42)` (Tap schließt), Sheet `max-width:430px`, `radius:18px 18px 0 0`, `padding:8px 18px 22px`, `box-shadow:0 -12px 40px rgba(0,0,0,.25)`, Grabber 38×4px `rgba(127,127,127,.4)`. Inhalt: Titel „{Kennzeichen} reservieren" (`18px/650`), Hinweiszeile (`12.5px opacity:.55`) — bei freier Maschine „Vorschlag aus der nächsten freien Lücke — …", sonst der Statussatz. Zwei Felder „Von"/„Bis" (`flex:1`, `padding:11px 12px`, `radius:10px`, Rand `rgba(127,127,127,.28)`; Label `10.5px` uppercase `.1em` `opacity:.45`, Wert `15px/600`) mit Vorschlag = nächste freie Lücke, auf 30 min aufgerundet, Dauer 2 h. Dann primärer Link „In Vereinsflieger reservieren ↗" (öffnet `https://vereinsflieger.de/member/community/reservations/add?type=0&inline=0` in neuem Tab, `rel="noopener noreferrer"`), darunter Hinweis `11.5px opacity:.45`.

## Tagesuhr-Ring (Kernbaustein — exakt umsetzen)

Der Ring ist ein `conic-gradient` als Hintergrund eines runden Containers; der Avatar liegt als runder Innenkreis darin (Container-`padding` erzeugt die Ringbreite).

**Winkelabbildung** (0° = oben, im Uhrzeigersinn), Minuten seit Mitternacht:
- **Nacht 21:00–06:00** (9 h) wird auf **135°–225°** gestaucht (unteres Viertel).
- **Tag 06:00–21:00** (15 h) läuft über die restlichen **270°**, beginnend bei **225°** (im Uhrzeigersinn über 0° hinweg bis 135°).
- Umkehrfunktion analog; der Gradient wird in 1°-Zellen aufgebaut und gleichfarbige Nachbarn werden zu Stops zusammengefasst.

**Zellfarbe** je Grad: liegt zur zugehörigen Uhrzeit eine Reservierung → `#c0442b`, eine Sperre → `#9aa0a6`, sonst in der Tageszeit → `#1f8f45`, in der Nachtzeit → `#454e5c`.

Die Kanten des Nachtbandes **sind** die Sonnenzeiten — deshalb bewusst keine zusätzlichen Marker auf derselben Naht.

**Marker** (drei Striche, außen auf dem Ring, alle in derselben Formsprache):

| Marker | Farbe | Radius (Mitte → Strichmitte) |
|---|---|---|
| Sonnenaufgang | `#d9a13c` | `größe/2 + ringbreite/2` |
| Sonnenuntergang | `#7b6fa6` | `größe/2 + ringbreite/2` |
| Jetzt | Textfarbe (`--text`) | `größe/2 + ringbreite/2 − 2.5px` (überlappt bewusst stärker) |

Strichmaße: `width = max(2, round(ringbreite * 0.34))`, `height = ringbreite + 1`, `border-radius:1px`, `box-shadow: 0 0 0 1.5px --bg` (Halo zur Trennung), Transform `translate(-50%,-50%) rotate(winkel) translateY(-radius)`. Ringbreite: 7px (96er Avatar), 6px (74er).

**Zahlen „6" und „21"** sitzen außerhalb des Rings an den Nahtstellen: Radius `größe/2 + ringbreite + schrift*0.6`, mono `600`, 10px (groß) / 9px (klein), `opacity:.45`, Positionierung über `sin/cos` des Winkels.

**Statuspunkt** unten rechts, eingerückt, mit `box-shadow: 0 0 0 3px --bg`: 20px bei `right/bottom:9px` (Favoriten), 17px bei `6px` (Grid). Füllung = Statusfarbe; bei Sperre `#9aa0a6`.

**Gesperrte Maschinen** bekommen zusätzlich ein Absperrband **auf der Avatarfläche**: `repeating-linear-gradient(45deg, rgba(200,80,64,.42) 0 6px, rgba(255,255,255,.5) 6px 12px)` über dem Avatar-Hintergrund. Der Ring zeigt trotzdem das Tagesmuster.

**Maschinen ohne Bild** zeigen statt des Bildes das Kurzkennzeichen (`D-` + letzte zwei Zeichen), mono `700`, `opacity:.6`: 18px bei Favoriten, 14px im Grid, 10.5px im Header.

## Interaktionen & Verhalten
- **Tap Avatar/Kachel** → Detailansicht der Maschine, Reiter auf „7 Tage" zurückgesetzt. Einblendung `rein .26s cubic-bezier(.22,.7,.3,1)` (12px von rechts + Fade).
- **Zurück** → Übersicht, Fade `einblenden .25s ease`.
- **Theme-Button** → Hell/Dunkel-Umschaltung (in beiden Screens vorhanden).
- **Reiterwechsel** → Inhalt mit `einblenden .2s`.
- **„Reservieren"** → Bottom Sheet (`hoch .3s cubic-bezier(.22,.7,.3,1)`, 16px von unten), Overlay-Fade `.2s`; Tap auf Overlay schließt.
- **„POH"** → Link auf das Flughandbuch der Maschine (im Prototyp Platzhalterziel).
- **Statuspunkt-Puls** läuft dauerhaft in der Detailansicht.
- Keine Hover-Sonderzustände (Touch-First); Buttons sind echte `<button>`/`<a>`-Elemente, Fokus sichtbar lassen.
- Responsiv: eine Spalte bis 430px, darüber zentriert mit Außenhintergrund. Kein Desktop-Layout gefordert.

## Statuslogik (verbindlich)
Bezugszeitpunkt ist „jetzt". Alle Reservierungen einer Maschine werden nach Startzeit sortiert.

1. Läuft gerade eine **Sperre** → Status `sperre`; Satz „Gesperrt bis {Wochentag, Datum}" (Sperren zählen in Tagen, nicht in Uhrzeiten). Zusatzzeile „bis {Datum}".
2. Läuft gerade eine **Reservierung** → `belegt`; Satz „Belegt bis {Uhrzeit}", wobei **lückenlos anschließende Folgereservierungen mitgezählt** werden. Zusatzzeile: „danach frei bis {Zeitpunkt}" bzw. „danach den ganzen Tag frei ☀️", wenn am Tag des Freiwerdens nichts mehr kommt.
3. Sonst, wenn **heute noch** eine Belegung beginnt → `bald`; Satz „Frei bis {Uhrzeit}". Zusatzzeile „danach bis {Zeitpunkt} belegt" (wieder mit lückenlosem Anschluss).
4. Sonst → `frei`; Satz „Frei" / Kurzsatz „frei den ganzen Tag ☀️".

**Kein eigener Farbzustand für `bald`.** Stattdessen ein linearer Übergang: die Statusfarbe wird von `#1f8f45` nach `#c0442b` interpoliert mit `t = 1 − (nächsterStart − jetzt) / 3600000`, also erst in der letzten Stunde vor der Belegung sichtbar rot werdend. Im Ring bleibt `bald` grün.

Zeitformate: heute → `HH:MM`; später → `Sa., 15.08., 12:00`; Sperren/Tagesbezug → `Samstag, 15. Aug.`; Dauer mit Dezimalkomma („3,5 h"), ganztägig „24 h".

## State
| State | Werte | Auslöser |
|---|---|---|
| `dunkel` | boolean | Theme-Button |
| `ansicht` | `uebersicht` \| `detail` | Kachel-Tap / Zurück |
| `aktivId` | Maschinen-ID | Kachel-Tap |
| `reiter` | `tage` \| `woche` | Segmented Control |
| `sheet` | boolean | „Reservieren" / Overlay-Tap |

Abgeleitet (nicht speichern): Status, Statusfarbe, Sätze, Balkensegmente, Ring-Gradient, Marker-Winkel.

**Daten:** Der Prototyp arbeitet mit einer festen Flottenliste und relativen Tagesoffsets (`t: 0` = heute). Produktiv kommen Flotte und Reservierungen aus Vereinsflieger; „jetzt" ist die echte Uhrzeit (Ring, Marker und Statusfarbe mindestens minütlich aktualisieren). Sonnenauf-/untergang sind im Prototyp fest (`06:05` / `20:40`, EDSH, 13. Aug.) und sollten produktiv pro Datum/Standort berechnet werden.

## Design-Tokens
**Statusfarben:** frei `#1f8f45` · belegt `#c0442b` · Sperre (Text/Streifen) `#b05c50` · Sperre (Punkt/Ring) `#9aa0a6` · Nacht `#454e5c`
**Marker:** Sonnenaufgang `#d9a13c` · Sonnenuntergang `#7b6fa6` · Jetzt = Textfarbe
**Akzent/CTA & eigene Reservierung:** `#1f4e79`, Hover/Link-Hover `#16395a`
**Hell:** bg `#ffffff` · außen `#eceef1` · Text `#1b2027` · Avatarfläche `#ffffff` · Leiste `rgba(255,255,255,.9)`
**Dunkel:** bg `#14181d` · außen `#0c0f12` · Text `#e8ecf1` · Avatarfläche `#1d232a` · Leiste `rgba(20,24,29,.92)`
**Neutrale Flächen/Linien:** `rgba(127,127,127,.09)` Karten · `.12`/`.14`/`.16` Spuren · `.2` Sektionslinien · `.28`/`.3` Ränder
**Radien:** 4 / 5 / 6 / 8 / 10 / 14 / 18 px · Avatar & Punkte 50 %
**Abstände:** 4 / 6 / 8 / 10 / 12 / 14 / 16 / 18 / 22 / 24 / 26 px, Seitenrand 16 px
**Typo:** UI `system-ui, -apple-system, 'Segoe UI', sans-serif`; Zahlen/Zeiten `ui-monospace, SFMono-Regular, Menlo, monospace`. Skala: 27/650 (Statussatz) · 18/650 (Sheet-Titel) · 15/600–700 · 14.5/650 (CTA) · 13.5/600–700 · 12.5–13/600 · 11.5–12 (Meta) · 11/700 uppercase `.12em` (Sektionsköpfe) · 10.5 (Kleinlabels). `line-height:1.5` global.
**Animationen:** `rein .26s cubic-bezier(.22,.7,.3,1)` · `hoch .3s` gleiche Kurve · `einblenden .2–.25s` · `puls 2.4s ease-in-out infinite`.
**Container:** `max-width:430px`, Bilder `image-rendering: pixelated`.

## Tweaks / Varianten
Der Prototyp kennzeichnet zwei Optionen:
- `ringStil`: `Voller Ring` | **`Tagesuhr` (Standard, das gelieferte Design)** | `Punkt-Abzeichen`. Bei `Punkt-Abzeichen` schrumpft der Ring auf 1px Haarlinie und der Statuspunkt trägt den Zustand; bei `Voller Ring` entfällt der Punkt.
- `legende`: Legende ein/aus.

Produktiv wird `Tagesuhr` gebaut; die anderen Stile sind nur Entwurfsalternativen und müssen nicht implementiert werden.

## Assets
Alle in `design/assets/`, aus diesem Projekt:
- `bucky-splash.png` — Kopfbild der Übersicht (Maskottchen „Bucky")
- `D-EELK_pixelart.gif`, `husky-dexyz-pixel-art.gif` — Pixel-Art-Avatare zweier Maschinen (`image-rendering: pixelated`)
- `bucky-maskottchen.svg`, `bucky-pixel.gif` — weitere Maskottchen-Varianten, aktuell ungenutzt

Maschinen ohne Asset zeigen das Kurzkennzeichen (siehe oben) — das ist der Normalfall, kein Fehlzustand.

## Dateien
- `design/Reservierung.dc.html` — der komplette Prototyp (Template oben, Logik im `<script type="text/x-dc">`-Block darunter)
- `design/support.js` — Runtime des Prototyps, nur zum lokalen Öffnen nötig
- `design/assets/*` — Bilder
- `spec.md` — Feature-Spec im Spec-Kit-Format (Anforderungen, Szenarien, Entitäten)
- `SPEC_KIT.md` — wie dieses Paket mit Spec Kit + Claude Code verarbeitet wird
