# Phase 0 — Untersuchung: Reservieren-Sheet v2

**Feature**: 058-reservieren-sheet-zeitwaehler
**Datum**: 2026-08-21

Dieses Dokument hält fest, was vor dem Bauen entschieden werden musste, und
warum. Es ersetzt keine Spec: Was hier steht, sind Entscheidungen über den *Weg*,
nicht über das *Ziel*.

---

## E-01 — Wo die Zeitlogik liegt

**Entscheidung**: Ein neues Kernmodul `packages/reservierung-core/src/zeitwahl.ts`
trägt die gesamte Rechnung des Wählers. Die Svelte-Komponenten rechnen nichts.

**Begründung**: Prinzip IV verlangt es, und NFR-001 macht es prüfbar. Der
Handoff selbst nennt als häufigste Fehlerquelle des Prototyps die
Gesten-Regeln — genau die Sorte Logik, die sich ohne Browser prüfen lässt, wenn
man sie vom Zeigegerät trennt. Die Geste liefert eine Minute; was daraus wird,
entscheidet eine reine Funktion.

Der Zuschnitt der Datei folgt der Frage, nicht der Herkunft:

| Funktion | Beantwortet |
|---|---|
| `RASTER`, `MINDESTDAUER`, `VORSCHLAGSDAUER`, `rahmenFuerTag` | Welche Werte gelten? |
| `aufRaster(minute)` | Wohin rastet eine gezogene Minute? |
| `luecken(reservierungen, kennung, tag, abMinute?)` | Was ist an diesem Tag frei? |
| `fensterIn(luecke, minute)` | Welches Fenster ergibt ein Tipp? |
| `zieheKante` / `verschiebeBlock` | Was macht diese Geste aus dem Fenster? |
| `beginnSetzen` / `endeSetzen` | Was macht diese Kachel aus dem Fenster? |
| `konflikte(reservierungen, kennung, tag, fenster)` | Was steht schon drin? |
| `modusFuer(...)` | Welcher der vier Modi gilt? |
| `ausweichluecke(...)` | Was wäre stattdessen frei? |
| `alsDauerwort(minuten)` | Wie heißt diese Dauer? |

**Verworfen**: Die Logik in `ReservierenSheet.svelte` zu lassen und dort mit
`$derived` zu rechnen. Das wäre kürzer und wäre falsch: Dieselbe Rechnung stünde
dann nicht für den MCP-Zugangsweg bereit, und geprüft würde sie über das DOM —
also gar nicht.

**Verworfen**: Alles in `segmente.ts` unterzubringen, weil es dort auch um Balken
geht. `segmente.ts` beantwortet „wie stelle ich Vorhandenes dar", `zeitwahl.ts`
beantwortet „was darf jemand wählen". Zwei Fragen, zwei Dateien.

---

## E-02 — Minuten oder Zeitpunkte

**Entscheidung**: Innerhalb eines Tages rechnet `zeitwahl.ts` in **Minuten seit
Ortsmitternacht**, wie der Handoff. An der Grenze — Konfliktsuche gegen echte
Belegungen, Adressbau — wird über die vorhandenen `zeitpunktFuerMinute(tag,
minute)` und `ortstag()` umgerechnet.

**Begründung**: Der Wähler ist ein Tagesgerät. Ein Fenster „09:00–11:00 am
Donnerstag" in zwei ISO-Zeitstempeln zu führen heißt, bei jeder Zieh-Bewegung
Datumsarithmetik zu treiben und an zwei Tagen im Jahr falsch zu liegen. Minuten
seit Ortsmitternacht sind an jedem Tag dieselbe Größe; welcher Zeitpunkt daraus
wird, weiß `zeitpunktFuerMinute` — die eine Stelle im Haus, die seit Feature 052
für die Zeitumstellung geprüft ist.

**Folge**: Der Tag wird als **Ortstag `YYYY-MM-DD`** geführt, nicht als Index
0…6. Der Index ist eine Anzeigegröße des Tageswechslers (er entscheidet über
„Heute"/„Morgen" und über die Anschläge der Pfeile) und wird an der Oberfläche
aus dem Ortstag gewonnen, nicht umgekehrt. Der Prototyp macht es andersherum;
das ist bei ihm folgerichtig, weil er nur einen erfundenen „jetzt" kennt.

---

## E-03 — Was der Kern schon kann und was fehlt

Geprüft wurde jede Funktion des Prototyps gegen den vorhandenen Kern:

| Prototyp | Vorhanden? | Entscheidung |
|---|---|---|
| `R15` | nein | neu: `aufRaster` |
| `luecken(alle, t, abJetzt)` | nein | neu — `zustand.ts` sucht nur *eine* Lücke ab jetzt, nicht alle eines Tages |
| `fensterIn` | nein | neu |
| `konflikte` | teilweise | neu, nutzt `zeitraeumeFuer` aus `belegung.ts` |
| `vfLink` | **ja** | `reservierungsVerweis` — vollständig parametrisiert (Punkt 10 der v2-Liste) |
| `dauerWort` | teilweise | `alsDauer` nimmt ISO-Strings; neu `alsDauerwort(minuten)` daneben |
| `hm(minute)` | nein | neu: `alsUhrzeitAusMinute` |
| `balken`/Segmente | **ja** | `balkensegmente`, unverändert |
| Jetzt-Position | **ja** | `jetztAnteil`, unverändert |
| Nacht-Stops | nein | neu: `nachtstops` |
| Statuslogik, Ring | **ja** | `zustandFuer`, `tagesuhr.ts`, unverändert |

**Entscheidung zu `alsDauerwort`** (korrigiert beim Bauen): Die beiden
Dauer-Funktionen bleiben getrennt. Der erste Entwurf wollte `alsDauer` auf
`alsDauerwort` zurückführen — „eine Formel, zwei Türen". Beim Nachsehen zeigte
sich, dass es gar nicht dieselbe Ausgabe ist: `alsDauer` liefert `3,5 h` mit
Dezimalkomma und darf 24 h überschreiten, `alsDauerwort` liefert `3:30 h` in
Uhrzeitform. Beides ist am jeweiligen Ort das bessere Format — Dauern in der
Liste „Kommende Belegungen" werden verglichen, die Pille im Sheet wird neben
`11:30–13:30` gelesen. Zusammengeführt hätte die Liste ein Format bekommen, das
dort schlechter liest, ohne dass es jemand verlangt hätte.

Das Risiko, das die Zusammenführung vermeiden sollte, besteht hier nicht: Es sind
nicht zwei Formeln für eine Ausgabe, sondern zwei Ausgaben. Ein Kommentar an
beiden Stellen hält fest, dass die Doppelung Absicht ist.

---

## E-04 — Die Warteliste

**Entscheidung**: Kein Wartelisteneintrag, kein `wartet`-Zustand, keine Quittung.
Der Modus heißt weiterhin `warteliste` (er beschreibt die Lage: das Fenster ist
belegt), aber seine Aktion ist ein Absprung nach Vereinsflieger — „Im Vereinsflieger
vormerken… ↗" — mit dem gewählten Fenster vorbelegt. Darüber steht der
Ausweich-Vorschlag.

**Begründung**: Der Handoff quittiert mit „Notiert — Bucky meldet sich, wenn
14:00–16:00 frei wird." Diese Anwendung kennt keine Nutzeridentität, hat keinen
Melde-Weg und schreibt in kein fremdes System (Prinzip II). Der Satz wäre eine
Zusage, die niemand einlösen kann — und weil er nach einem Tap erscheint, sähe er
aus wie eine Bestätigung. Das ist genau die Sorte erfundener Auskunft, die dieses
Projekt an anderer Stelle sorgfältig vermeidet.

Der Absprung ist die ehrliche Variante derselben Absicht: Der Wunsch geht dorthin,
wo über ihn entschieden werden kann.

**Verworfen**: Den Knopf ganz wegzulassen und nur den Ausweich-Vorschlag zu
zeigen. Das nähme dem Mitglied eine erlaubte Handlung — Vereinsflieger lässt
Überschneidungen zu, der Verein klärt sie. Eine Oberfläche, die das verbietet,
erfindet eine Regel (dieselbe Begründung, die der Prototyp beim Nachtrag gibt).

**Verworfen**: Lokale Notiz mit ehrlichem Text. Ein Eintrag, der nichts bewirkt,
ist eine Beschäftigungstherapie.

**Folge für den Text**: Der Hinweis unter der Aktion sagt, was gilt:
„Überschneidungen klärt der Verein, nicht diese Seite." — derselbe Satz, den der
Handoff dem Nachtrag gibt, und aus demselben Grund.

---

## E-05 — Wie die Zieh-Geste angebunden wird

**Entscheidung**: `pointerdown` auf Griff und Block setzt einen Merkzettel
(`{ art, abstand, griff }`) in einer normalen Variablen — **kein** `$state`.
`pointermove`/`pointerup` hängen an `window`, nicht am Balken.

**Begründung**: Der Merkzettel gehört nicht in den Zustand, weil er nichts
anzeigt (Handoff, Abschnitt 6: „Nicht in den State"). Ein `$state` dafür löste
bei jeder Zeigerbewegung einen Durchlauf aus, der nichts ändert. Die Fenster-
Bindung ist der Grund, warum das Ziehen nicht abbricht, sobald der Finger den
Balken verlässt — auf einem Telefon ist das der Normalfall, nicht der Ausnahmefall.

**Entscheidung zum Klick nach dem Ziehen**: Ein `zogGerade`-Merker, den
`pointermove` setzt und der nächste `click` verbraucht. Ohne ihn setzt der Klick,
der jedem Loslassen folgt, das eben gezogene Fenster auf die Zwei-Stunden-Vorgabe
zurück (FR-032, Szenario 1.5).

**Verworfen**: Pointer Capture. Es löst dasselbe Problem, aber nicht das des
nachlaufenden Klicks, und es verhält sich auf iOS bei abgebrochenen Gesten
unfreundlicher.

**Abweichung bei der Umsetzung (22.08.2026)**: `zogGerade` wird schon beim
Anfassen gesetzt, nicht erst bei der ersten Bewegung. Der Handoff setzt ihn in
`pointermove`; das deckt den Fall nicht ab, dass jemand den Auswahlblock nur
**antippt**, ohne ihn zu bewegen — der folgende Klick landete dann auf der Spur
darunter und setzte das Fenster neu, obwohl der Finger auf dem Block lag. Am
Anfang der Geste gesetzt, deckt der Merker beide Fälle.

Zurückgenommen wird er über eine Aufgabe nach dem Loslassen (`setTimeout(…, 0)`)
und nicht im Klick selbst: Ein Loslassen ohne folgenden Klick — abgebrochene
Geste, Finger außerhalb — ließe ihn sonst stehen und verschluckte den
übernächsten Tipp.

---

## E-06 — Sichtbarkeit der Kachelauswahl

**Entscheidung**: Nachgeführt wird über `getBoundingClientRect`-Differenz
zwischen gewählter Kachel und Scroller, nicht über `offsetTop`. Ausgelöst wird
per `$effect`, der auf eine **Merk-Kennung** aus Variante, Sheet-Zustand und
beiden Stunden hört; ändert sie sich nicht, wird nicht gescrollt.

**Begründung**: Beides steht so im Handoff, und beides sind gemeldete
Fehlerquellen des Prototyps. `offsetTop` misst gegen den nächsten positionierten
Vorfahren; das Sheet ist `position:fixed`, also misst es gegen etwas anderes als
die Spalte. Die Merk-Kennung verhindert, dass eigenes Scrollen des Nutzers bei
jedem Durchlauf zurückgesetzt wird — sonst ließe sich die Spalte nicht bedienen.

**Entscheidung zum Zeitpunkt**: Findet der Effekt nicht beide Spalten, wiederholt
er sich im nächsten Frame. Beim Umschalten der Variante stehen sie noch nicht im
DOM.

---

## E-07 — Woher der Tipp seine Uhrzeit bekennt

**Entscheidung**: Jeder Balkentyp meldet beim Tipp `{ tag, minute | null }`.
`minute` ist `null`, wenn der Tipp keinen Ort hat (Tastatur) oder außerhalb des
Balkens landete; dann gilt die erste freie Lücke des Tages.

**Begründung**: Der Prototyp löst das mit einem Handler, der `e.detail` prüft —
bei Tastaturbedienung ist `detail === 0`, und `clientX` wäre dann 0, also 06:00.
Ein Zeitwähler, der bei Enter stumm auf „sechs Uhr früh" springt, ist kaputt.

**Entscheidung zur Wochenspalte**: Dieselbe Rechnung, andere Achse — die Spalte
misst senkrecht. Die Umrechnung Position → Minute bekommt deshalb eine
Achsenangabe.

**Abweichung vom Prototyp**: `tippAuf` des Prototyps lässt einen Tipp auf eine
belegte Stelle folgenlos, `tippTag` macht daraus einen Wartelisten-Fall. Die Spec
(FR-025, Grenzfall „Tippen auf eine belegte Stelle") entscheidet sich für
Letzteres, überall: Wer eine belegte Zeit antippt, will genau sie.

---

## E-08 — Nachttönung

**Entscheidung**: `nachtstops(sonnenzeiten, tag, fenster)` liefert die vier
Prozentwerte (oder `null`, wenn keine Sonnenzeiten vorliegen). Die Komponenten
setzen daraus den Verlauf zusammen.

**Begründung**: Der Handoff nennt die Stops als Zahlen (0,5 % / 1,6 % / 90,6 % /
92,7 %) und sagt zugleich: „produktiv berechnen, nicht hart kodieren". Die Zahlen
gelten für den 13.08.; im Dezember stimmen sie nicht mehr. Die Rechnung ist
`pos(t) = (t − 06:00) / 960`, Dämmerung ±10 Minuten.

**Entscheidung zum Randfall**: Liegt der Sonnenaufgang vor 06:00, entfällt die
linke Tönung ganz (Stop bei 0 %); dasselbe rechts nach 22:00. Fehlen die
Sonnenzeiten eines Tages, gibt es **keine** Tönung — nicht eine geschätzte
(FR-045, SC-009).

**Entscheidung zur Farbe**: `rgba(9,15,33,.62)` in beiden Themes. Das ist bewusst
kein Token, das mit dem Farbschema wechselt: Nacht soll in beiden Darstellungen
als Nacht lesbar sein.

**Folge für die Balken**: Der Balkencontainer verliert `overflow:hidden`, damit
die Jetzt-Nadel überstehen kann. Die Segmente runden sich stattdessen selbst; der
Vergangenheits-Schleier bekommt `border-radius: 8px 0 0 8px`.

---

## E-09 — Die Sieben-Tage-Liste beginnt bei morgen

**Entscheidung**: Der Kern bleibt unangetastet. `wochenbalken` liefert weiter
sieben Tage ab heute; die Detailansicht zeigt davon `slice(1)`.

**Begründung**: „Heute" steht schon als großer Balken darüber (Handoff, Teil A,
Punkt 4). Die Wochenraster-Darstellung zeigt dagegen weiterhin alle sieben
Spalten — dort ist „heute" die Bezugsspalte, nicht eine Wiederholung. Beide
Ansichten aus derselben Funktion zu speisen bleibt die Zusicherung aus 054: Wer
zwischen ihnen umschaltet, darf nicht zwei verschiedene Wochen sehen.

---

## E-10 — Umfang der Änderungen an bestehenden Dateien

Geprüft, was 054 hinterlassen hat und wie tief v2 eingreift:

| Datei | Eingriff |
|---|---|
| `ReservierenSheet.svelte` | **Neuschrift.** Von 6 kB Anzeige auf einen Wähler; nichts davon bleibt außer dem Rahmen (Overlay, Grabber, Kopfzeile, Escape-Behandlung). |
| `routes/reservierung/[kennung]/+page.svelte` | Aktionsleiste raus, POH-Verweis raus, Tipp-Weiterleitung rein, Liste ab morgen |
| `Tagesbalken.svelte` | Nachttönung, neue Nadel, kein `overflow:hidden`, Tipp meldet Minute |
| `Wochenraster.svelte` | dasselbe, senkrecht |
| `reservierungs-verweis.ts` | unverändert |
| `segmente.ts`, `zustand.ts`, `tagesuhr.ts` | unverändert |
| `formulieren.ts` | `alsDauer` auf `alsDauerwort` zurückgeführt |

**Entscheidung**: Das Sheet wird neu geschrieben, nicht erweitert. Ein Wähler mit
zwei Varianten, vier Modi und einem Tageswechsler hat mit zwei Anzeigefeldern
keine gemeinsame Struktur mehr; die Umbauten wären mehr Arbeit als der Neubau und
hinterließen Reste.

---

## E-11 — Prüfbarkeit

**Entscheidung**: Die Szenarien 1–5 aller User Stories werden als Unit-Tests
gegen `zeitwahl.ts` geschrieben, bevor eine Komponente entsteht. Ausgenommen sind
zwei Kriterien, die kein Test erreicht:

- **SC-005** (die Abschlussaktion springt nicht) — eine Aussage über Layout bei
  wechselndem Inhalt. Sie wird durch feste Höhen erfüllt und in der Vorschau
  geprüft.
- **NFR-002** (flüssiges Ziehen) — dasselbe.

Beide gehören in die Vorschau vor dem Merge, die `AGENTS.md` ohnehin verlangt.

**Begründung**: Ein Test, der behauptet, etwas springe nicht, prüfte in Wahrheit
nur, dass eine CSS-Regel im Quelltext steht. Das ist kein Nachweis, sondern eine
Wiederholung.

---

## E-12 — Wer die Zeigerposition umrechnet (nachgetragen 25.08.2026)

**Entscheidung**: `Zeitbalken` reicht seine Umrechnung als drittes Argument des
`gegriffen`-Rückrufs mit nach oben (`minuteBei(ereignis)`). Das Sheet führt die
Geste, misst aber nicht selbst.

**Begründung**: B-05 stellt die Abbildung Position → Minute in die Komponente,
weil ihre Eingabe ein `DOMRect` ist. Die Geste selbst gehört ins Sheet — dort
stehen die Regeln, welche Kante stehen bleibt und wo ein Block stoppt (E-05).
Beides zusammen heißt: Ab dem Loslassen hört das Sheet am Fenster zu und bekommt
Zeigerpositionen, für die es kein Rechteck hat. Ohne die Mitgabe müsste es
`BALKEN_VON` und die Breite ein zweites Mal hinschreiben — genau die zweite
Wahrheit, die B-05 vermeiden soll.

Das Rechteck wird bei **jedem** Aufruf neu gemessen, nicht einmal beim Griff:
Zwischen zwei Bewegungen kann das Sheet gescrollt oder das Gerät gedreht worden
sein, und ein gemerktes Rechteck ließe den Block dann neben dem Finger herlaufen.

**Folge im Kern**: Die Oberfläche braucht an zwei Stellen die volle Stunde einer
Tagesminute — für „ist das meine Stundenkachel?" und für die Merk-Kennung des
Nachführers. Das ist eine Rechnung, und Vertrag C-03 aus `deelk-poh-core`
verbietet Adaptern das Runden. Sie steht deshalb als `stundeVon` in
`zeitwahl.ts` (Vertrag Z-05).
