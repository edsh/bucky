---

description: "Aufgabenliste für Feature 058 — Reservieren-Sheet v2"
---

# Tasks: Reservieren-Sheet v2 — vollständiger Zeitwähler

**Input**: Entwurfsunterlagen aus `/specs/058-reservieren-sheet-zeitwaehler/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/zeitwahl.md](./contracts/zeitwahl.md),
[contracts/balken.md](./contracts/balken.md)

**Tests**: Ja, und zwar zuerst. NFR-001 verlangt, dass die Zeitlogik ohne
Oberfläche prüfbar ist, und der Handoff nennt als häufigste Fehlerquelle des
Prototyps genau die Regeln, die sich so prüfen lassen. Phase 3 ist deshalb
vollständig Test-zuerst; die Oberflächenphasen sind es nicht — dort prüft die
Vorschau.

**Organization**: Nach User Stories der Spec. Die Reihenfolge folgt zusätzlich
den Stufen aus `plan.md`: Kern → Balken → Detailansicht → Sheet.

## Format: `[ID] [P?] [Story] Beschreibung`

- **[P]**: parallel möglich (andere Datei, keine offene Abhängigkeit)
- **[Story]**: zugehörige User Story (US1…US5)

## Pfade

- Kern: `packages/reservierung-core/src/`, Tests `packages/reservierung-core/tests/`
- Oberfläche: `apps/web/src/lib/components/`, `apps/web/src/routes/`

---

## Phase 1: Setup

**Zweck**: Es gibt nichts einzurichten. Das Paket, der Testlauf und die
Werkzeugkette stehen seit Feature 054; dieses Feature fügt Dateien hinzu, keine
Abhängigkeiten.

- [X] T001 Prüfen, dass `npm test` und `npm run lint` auf `058-reservieren-sheet-zeitwaehler` grün starten — der Ausgangszustand muss sauber sein, sonst ist später nicht zu unterscheiden, was dieses Feature gebrochen hat

**Checkpoint**: Grüner Ausgangszustand.

---

## Phase 2: Foundational (blockierende Vorarbeit)

**Zweck**: Die Typen, auf denen alles Weitere steht. Ohne sie lässt sich weder
ein Test noch eine Funktion schreiben.

**⚠️ Blockiert alle User Stories.**

- [X] T002 `Zeitwahlfenster`, `Rahmen`, `Luecke`, `Konflikt`, `Wahlmodus` und `Nachtstops` in `packages/reservierung-core/src/typen.ts` ergänzen — Formen und Zusicherungen nach [data-model.md](./data-model.md); `Zeitfenster`, `Reservierung`, `Balkensegment` bleiben unangetastet
- [X] T003 Konstanten `RASTER`, `MINDESTDAUER`, `NACHRUECKDAUER`, `VORSCHLAGSDAUER`, `RAHMEN` in neuer Datei `packages/reservierung-core/src/zeitwahl.ts` anlegen; `RAHMEN` aus `BALKEN_VON`/`BALKEN_BIS` von `segmente.ts` ableiten, nicht neu hinschreiben (Z-01 bis Z-05 in [contracts/zeitwahl.md](./contracts/zeitwahl.md))
- [X] T004 Neue Typen und Konstanten in `packages/reservierung-core/src/index.ts` ausführen

**Checkpoint**: Der Kern kennt die Größen; Tests lassen sich schreiben.

---

## Phase 3: Der Kern (Test-zuerst) — trägt US1, US2, US3, US4

**Zweck**: Die gesamte Rechnung des Wählers, ohne Browser geprüft. Das ist Stufe
1 aus `plan.md` und die Vorbedingung für jede Komponente.

**Unabhängig prüfbar**: `npx vitest run packages/reservierung-core/tests/zeitwahl.test.ts` —
grün, ohne dass eine einzige Zeile Svelte existiert.

### Tests zuerst

- [X] T005 [P] Testdatei `packages/reservierung-core/tests/zeitwahl.test.ts` anlegen mit den Fällen zu Rasterung und Lückensuche (Z-01, Z-02): Rundung an der Mitte, Aufrundung bei `abMinute`, ganztägige Sperre liefert `[]`, Lücken unter 15 min fallen weg, über Mitternacht hineinreichende Belegungen zählen anteilig
- [X] T006 [P] Tests zu `fensterIn` (Z-03) ergänzen: Vorschlagsdauer 2 h, Beginn rückt nach vorn statt zu kürzen, kurze Lücke ergibt kurzes Fenster
- [X] T007 [P] Tests zu den Gesten (Z-04) ergänzen — Szenarien 1.2, 1.3, 1.4: Kante ändert Dauer und lässt die Gegenkante stehen, Block behält Dauer, Block stoppt am Rahmenrand ohne zu kürzen
- [X] T008 [P] Tests zu den Kacheln (Z-05) ergänzen — Szenarien 2.1, 2.2, 2.3: Ende bleibt stehen, Überholung springt auf +30 min, Stundenkachel behält die Minute, `kachelDauer` nie negativ (FR-034)
- [X] T009 [P] Tests zu `konflikte` (Z-06) ergänzen — Szenario 4.1: Doppelpunktform, Verkettung mit ` · `, Berührung ist keine Überschneidung, ganztägig, kein Name im Text
- [X] T010 [P] Tests zu `modusFuer` (Z-07) ergänzen — Szenarien 4.3, 4.4: Rangfolge Nachtrag → gesperrt → warteliste → frei; ein künftiger Tag ist nie Nachtrag
- [X] T011 [P] Tests zu `ausweichluecke` (Z-08) ergänzen — Szenario 4.2: ab dem gewählten **Ende**, dann überlappend, dann erste des Tages, sonst `null`
- [X] T012 [P] Tests zu den Formulierungen (Z-09) ergänzen: `alsUhrzeitAusMinute` inkl. `24:00`, `alsDauerwort` für `45 min` / `2 h` / `2:15 h`, `alsLueckensatz` in allen drei Formen
- [X] T013 [P] Test zu `alsWahlfenster` und dem Absprung (Z-10) ergänzen — Szenario 1.6: Adresse trägt `frm_apid=75132` und beide Uhrzeiten des gewählten Fensters
- [X] T014 [P] Testdatei `packages/reservierung-core/tests/nacht.test.ts` anlegen (N-01) — Szenarien 5.1, 5.2, 5.3: Beispiel 06:05/20:40 ergibt die Stops des Handoffs, Aufgang vor Fensterbeginn lässt `morgens` entfallen, fehlende Sonnenzeiten ergeben `null`

### Umsetzung

- [X] T015 `aufRaster` und `luecken` in `packages/reservierung-core/src/zeitwahl.ts` umsetzen (Z-01, Z-02); `zeitraeumeFuer` aus `belegung.ts` benutzen statt eigener Belegungsdeutung
- [X] T016 `fensterIn` in `packages/reservierung-core/src/zeitwahl.ts` umsetzen (Z-03)
- [X] T017 `zieheKante` und `verschiebeBlock` in `packages/reservierung-core/src/zeitwahl.ts` umsetzen (Z-04) — beide nehmen die gewünschte Minute, nicht die Zeigerposition
- [X] T018 `beginnSetzen`, `endeSetzen`, `kachelZiel`, `kachelMoeglich`, `kachelDauer` in `packages/reservierung-core/src/zeitwahl.ts` umsetzen (Z-05); `kachelDauer` über dieselben Setzfunktionen rechnen, nicht über eine zweite Formel
- [X] T019 `konflikte` in `packages/reservierung-core/src/zeitwahl.ts` umsetzen (Z-06) — Zuschnitt auf den Tag wie in `tagesbelegungen`, kein Name, keine Kennzeichnung eigener Buchungen
- [X] T020 `modusFuer` und `ausweichluecke` in `packages/reservierung-core/src/zeitwahl.ts` umsetzen (Z-07, Z-08)
- [X] T021 `alsUhrzeitAusMinute`, `alsDauerwort` und `alsLueckensatz` in `packages/reservierung-core/src/zeitwahl.ts` umsetzen (Z-09)
- [X] T022 `alsDauer` in `packages/reservierung-core/src/formulieren.ts` **unverändert lassen** und in `alsDauerwort` vermerken, warum es zwei Dauerformen gibt (Z-09) — der ursprüngliche Entwurf wollte sie zusammenführen; sie haben verschiedene Formate für verschiedene Orte, und `formulieren.test.ts` hält das fest
- [X] T023 `alsWahlfenster` in `packages/reservierung-core/src/zeitwahl.ts` umsetzen (Z-10) über `zeitpunktFuerMinute` und `alsIsoMitVersatz`; `reservierungs-verweis.ts` bleibt unverändert
- [X] T024 `nachtstops` in neuer Datei `packages/reservierung-core/src/nacht.ts` umsetzen (N-01), Voreinstellung `FENSTER_FLUGTAG`
- [X] T025 Alle neuen Funktionen in `packages/reservierung-core/src/index.ts` ausführen

**Checkpoint**: `npm test` grün. Die ganze Fachlogik steht und ist geprüft,
bevor eine Komponente existiert.

---

## Phase 4: User Story 5 — Nacht und Jetzt auf den Balken (Priority: P3)

**Goal**: Jeder Balken zeigt Nacht und den aktuellen Zeitpunkt. Das steht hier
vor den höher priorisierten Stories, weil die gemeinsame Balkenkomponente die
Grundlage für die Taps aus US1 ist — Stufe 2 aus `plan.md`.

**Unabhängig prüfbar**: Detailansicht öffnen; Tagesbalken, Tageszeilen und
Wochenspalten zeigen Tönung und Nadel, ganz ohne Sheet.

- [X] T026 [US5] Neue Komponente `apps/web/src/lib/components/Zeitbalken.svelte` anlegen: Ebenenfolge nach B-01, kein `overflow:hidden` (B-02), Ausrichtung waagerecht/senkrecht als Eigenschaft
- [X] T027 [US5] Nachttönung in `apps/web/src/lib/components/Zeitbalken.svelte` aus `nachtstops` aufbauen (B-03) — `rgba(9,15,33,.62)` in beiden Themes, ohne Sonnenzeiten gar keine Ebene
- [X] T028 [US5] Jetzt-Nadel in `apps/web/src/lib/components/Zeitbalken.svelte` (B-04): 1 px gestrichelt, 5 px Überstand, nur am heutigen Tag und nur bei vorhandenem `jetztAnteil`
- [X] T029 [US5] Segmente selbst runden und Vergangenheits-Schleier mit `border-radius: 8px 0 0 8px` in `apps/web/src/lib/components/Zeitbalken.svelte` (B-02)
- [X] T030 [US5] `apps/web/src/lib/components/Tagesbalken.svelte` auf `Zeitbalken` umstellen; Sonnenzeiten als Eigenschaft durchreichen
- [X] T031 [US5] `apps/web/src/lib/components/Wochenraster.svelte` auf `Zeitbalken` umstellen (senkrecht, `180deg`-Verlauf)
- [X] T032 [US5] Tageszeilen der 7-Tage-Liste in `apps/web/src/routes/reservierung/[kennung]/+page.svelte` auf `Zeitbalken` umstellen und Sonnenzeiten je Tag über `sonnenzeitenFuerTag` beschaffen

**Checkpoint**: Alle vier Balkentypen tragen Nacht und Nadel. US5 ist fertig.

---

## Phase 5: User Story 1 — Eigenes Fenster festlegen und hinüberspringen (Priority: P1) 🎯 MVP

**Goal**: Tipp auf einen Balken öffnet den Wähler; Ziehen legt das Fenster fest;
der Absprung trägt genau dieses Fenster.

**Unabhängig prüfbar**: Auf eine freie Stelle tippen, Kante ziehen, Adresse
lesen. Liefert für sich allein den vollen Wert des Features — ohne Kachelwahl,
ohne Tageswechsler, ohne Modi jenseits von „frei".

### Taps aus den Balken

- [X] T033 [US1] Umrechnung Zeigerposition → Tagesminute in `apps/web/src/lib/components/Zeitbalken.svelte` (B-05): Achse als Eigenschaft, Beschneidung auf das Rechteck, `null` bei `event.detail === 0` oder außerhalb
- [X] T034 [US1] Tipp-Ereignis `{ tag, minute }` aus `Zeitbalken` nach oben melden; ganze Zeile als Tippziel, Balken bestimmt nur die Uhrzeit (B-05)
- [X] T035 [US1] Tipps in `apps/web/src/routes/reservierung/[kennung]/+page.svelte` entgegennehmen und nach B-06 in Sheet-Zustand übersetzen (freie Stelle → `fensterIn(luecke, minute)`, belegte → `fensterIn(RAHMEN, minute)`, ohne Ort → erste freie Lücke, ohne Lücke → Leerfall)

### Sheet-Rahmen und Ziehen

- [X] T036 [US1] `apps/web/src/lib/components/ReservierenSheet.svelte` neu schreiben: Rahmen, Overlay, Grabber, Kopfzeile, Escape und Fokus wie bisher; Eigenschaften jetzt `kennung`, `tag`, `belegungen`, `jetzt`, `sonnenzeiten`
- [X] T037 [US1] Statuszeile im Sheet: Zeitfenster in 27 px mono, Dauer-Pille, Textzone fester Höhe 36 px (B-08), Sätze aus `alsLueckensatz`
- [X] T038 [US1] Segmented Control „Ziehen" / „Uhrzeit wählen" in `apps/web/src/lib/components/ReservierenSheet.svelte`; „Ziehen" ist Voreinstellung
- [X] T039 [US1] Zieh-Balken im Sheet über `Zeitbalken` mit freien Lücken und Auswahlblock; Griffe mit ≥ 44 px Trefferfläche und sichtbarem Strich 4×22 px (B-10)
- [X] T040 [US1] Zieh-Geste in `apps/web/src/lib/components/ReservierenSheet.svelte`: `pointerdown` setzt den Merkzettel als normale Variable (kein `$state`), `pointermove`/`pointerup` an `window` (research.md E-05); Ergebnis über `zieheKante` bzw. `verschiebeBlock`
- [X] T041 [US1] `zogGerade`-Merker in `apps/web/src/lib/components/ReservierenSheet.svelte`, den der folgende Klick verbraucht (FR-032, Szenario 1.5)
- [X] T042 [US1] Tipp auf eine freie Stelle des Sheet-Balkens setzt ein neues Fenster über `fensterIn` (FR-025)
- [X] T043 [US1] Stundenachse 6/10/14/18/22 unter dem Zieh-Balken und Hinweistext „Block verschieben, Kanten für Beginn und Ende ziehen — es rastet in 15 Minuten."

### Abschluss

- [X] T044 [US1] Primäraktion „Im Vereinsflieger reservieren… ↗" in `apps/web/src/lib/components/ReservierenSheet.svelte`, Adresse über `alsWahlfenster` und `reservierungsVerweis`, `target="_blank" rel="noopener noreferrer"` (FR-043, Szenario 1.6)
- [X] T045 [US1] Leerfall im Sheet: Hinweistext statt Wähler, kein Absprung mit erfundenen Zeiten (FR-044, SC-008)

**Checkpoint**: US1 vollständig. Das Feature trägt sich selbst — der Rest ist
Erweiterung.

---

## Phase 6: User Story 4 — Erkennen, dass das Fenster nicht frei ist (Priority: P1)

**Goal**: Konflikte werden benannt, bevor jemand hinüberspringt; gesperrte Zeiten
führen nirgendwohin.

**Unabhängig prüfbar**: Fenster über eine bekannte Belegung legen; Statuszeile,
Ausweich-Vorschlag und Abschlussaktion lesen.

- [X] T046 [US4] Modusbestimmung in `apps/web/src/lib/components/ReservierenSheet.svelte` aus `konflikte` und `modusFuer` ableiten — nie setzen, nur ableiten
- [X] T047 [US4] Vier Abschlussformen umsetzen (FR-038): `frei` und `nachtrag` mit Absprung, `warteliste` mit „Im Vereinsflieger vormerken… ↗", `gesperrt` **ohne** Absprung samt Hinweisbox (FR-040, SC-007)
- [X] T048 [US4] Hinweistexte je Modus; im Wartelisten-Fall „Überschneidungen klärt der Verein, nicht diese Seite." — **keine** Zusage einer Benachrichtigung oder Vormerkung (FR-041, research.md E-04)
- [X] T049 [US4] Nachtrag-Warnzeile in `#d9a13c` als zweite Zeile der Statuszone (Szenario 4.4)
- [X] T050 [US4] Ausweich-Vorschlag über `ausweichluecke` + `fensterIn` als gestrichelter Knopf „Frei wäre 16:00–18:00 — stattdessen nehmen" in den Modi `warteliste` und `gesperrt` (FR-039, Szenario 4.2)
- [X] T051 [US4] Feste Höhen für Ausweichbereich (58 px) und Container (min. 150 px) setzen, damit die Primäraktion beim Moduswechsel nicht springt (B-08, FR-051, SC-005)

**Checkpoint**: US4 fertig. Kein Weg führt an einem Konflikt vorbei.

---

## Phase 7: User Story 3 — Anderen Tag wählen (Priority: P2)

**Goal**: Der Tag lässt sich im Sheet wechseln, ohne es zu schließen.

**Unabhängig prüfbar**: Pfeile bis an beide Enden, Mitte antippen.

- [X] T052 [US3] Tageswechsler in `apps/web/src/lib/components/ReservierenSheet.svelte`: Chevron-Knöpfe 52 px, Glyphen 26 px, an den Enden `disabled` **und** abgeschwächt (B-07, NFR-004)
- [X] T053 [US3] Tagesname und Datum in der Mitte („Heute" / „Morgen" / „Übermorgen" / „Sa., 15.08."), Tagesindex aus dem Ortstag gebildet (research.md E-02)
- [X] T054 [US3] Unsichtbares `<input type="date">` über der Beschriftung mit `min` heute und `max` heute + 6; Auswahl über den Ortstag zurückrechnen (FR-036, Szenario 3.4)
- [X] T055 [US3] Tageswechsel setzt das Fenster neu: erste freie Lücke, Dauer wieder 2 h; ohne Lücke Leerfall (FR-037, Szenarien 3.2, 3.3)

**Checkpoint**: US3 fertig.

---

## Phase 8: User Story 2 — Uhrzeit auswählen statt ziehen (Priority: P2)

**Goal**: Die zweite, gleichwertige Variante der Zeitwahl.

**Unabhängig prüfbar**: Auf „Uhrzeit wählen" schalten, vier Kacheln antippen.

- [X] T056 [US2] Kachelraster in `apps/web/src/lib/components/ReservierenSheet.svelte`: zwei Spalten 🛫 Beginn / 🛬 Ende, je Stunden- und Minutenspalte
- [X] T057 [US2] Stundenspalte scrollbar mit `max-height:191px`, verborgener Bildlaufleiste und Randmaske; Minutenspalte 60 px fest mit `:00/:15/:30/:45` (B-10, Kachelhöhe 44 px)
- [X] T058 [US2] Kachelzustände aus `kachelMoeglich`, `kachelZiel` und `kachelDauer`: gewählt, Konfliktrand, unmöglich mit `opacity:.28` und ohne Handler; Dauervorschau in jeder Kachel (FR-034)
- [X] T059 [US2] Wahl über `beginnSetzen` / `endeSetzen`, funktional gesetzt, damit zwei Taps im selben Frame nicht verlorengehen (Szenarien 2.1, 2.2, Grenzfall der Spec)
- [X] T060 [US2] Zentrierung der gewählten Stundenkachel per `$effect` mit Merk-Kennung und `getBoundingClientRect`-Differenz, Wiederholung im nächsten Frame (B-09, research.md E-06, Szenario 2.4)
- [X] T061 [US2] Scroll-Pfeilchen ▲/▼ je Spalte, Zustand aus den Rechtecken mit 6 px Toleranz, aktualisiert bei `scroll` und nach jedem Durchlauf (B-09, Szenario 2.5)
- [X] T062 [US2] Sheet auf kurzen Bildschirmen so weit mitschieben, dass beide Spalten sichtbar sind; eigenes Scrollen des Nutzers nicht zurücksetzen (FR-050, B-09)

**Checkpoint**: US2 fertig. Alle User Stories umgesetzt.

---

## Phase 9: Detailansicht aufräumen

**Zweck**: Was v2 wegnimmt. Bewusst am Ende: Solange das Sheet noch nicht über
Taps erreichbar war, wäre die Seite ohne Aktionsleiste unbedienbar gewesen.

- [X] T063 Klebende Aktionsleiste `.aktionen` samt „Reservieren"-Knopf und POH-Verweis aus `apps/web/src/routes/reservierung/[kennung]/+page.svelte` entfernen; Fußbereich mit `padding: 24px 16px 120px` abschließen (FR-023, FR-026, B-11)
- [X] T064 7-Tage-Liste in `apps/web/src/routes/reservierung/[kennung]/+page.svelte` auf `slice(1)` umstellen — sechs Zeilen ab morgen (FR-048)
- [X] T065 Konflikttexte der Tageszeilen auf die Doppelpunktform prüfen und, wo nötig, in `packages/reservierung-core/src/formulieren.ts` (`alsTageszeile`) angleichen (FR-049)
- [X] T066 Prüfen, dass `darstellungFuer`/`pohPfad` nach dem Wegfall noch gebraucht wird; ungenutzte Reste in `apps/web/src/lib/flotte/darstellung.ts` entfernen, ohne den Weg über `handlungenFuer` anzutasten

**Checkpoint**: Die Detailansicht entspricht v2.

---

## Phase 10: Polish und Nachweis

- [X] T067 [P] `npm test` und `npm run lint` grün; besonders `reservierungs-verweis.test.ts` und `formulieren.test.ts` unverändert
- [X] T068 [P] Bewegungsabschaltung prüfen: `prefers-reduced-motion` nimmt Sheet-Fahrt und Pfeil-Ausblendung (NFR-003, B-12)
  — nachgezählt: Overlay (`einblenden`), Sheet (`hoch`) und Scroll-Pfeilchen (`transition: opacity`) sind die einzigen bewegten Dinge des Features; alle drei stehen im `prefers-reduced-motion`-Block. `Zeitbalken.svelte` bewegt gar nichts.
- [X] T069 [P] Alle Tippziele im Sheet auf ≥ 44 px nachmessen — Minutenkacheln, Zieh-Griffe, Chevrons (FR-052, SC-010, B-10)
  — nachgemessen; **zwei Verstöße gefunden und behoben**: Der Variantenschalter „Ziehen"/„Uhrzeit wählen" maß 38 px (jetzt 44), und „Abbrechen" war nur so groß wie sein Wort in 13 px (jetzt Trefferfläche über ein Pseudo-Element, ohne die Schriftlinie der Kopfzeile zu verschieben).
  — unverändert **unter** 44 px in einer Richtung: die Zieh-Griffe mit 30 px Breite. Das ist so im Vertrag vorgesehen (B-10) und hat einen Grund: Bei einem Fenster von 15 Minuten ist der Block selbst nur wenige Pixel breit; zwei 44 px breite Griffe lägen vollständig übereinander, und die Kante, die man greifen will, wäre nicht mehr zu treffen. In der Höhe messen sie 58 px.
- [ ] T070 Vorschau nach `quickstart.md` Abschnitt 2 durchgehen, Punkte 1–14; besonders SC-005 (Primäraktion springt nicht) und NFR-002 (flüssiges Ziehen) — die beiden Kriterien, die kein Test erreicht
- [X] T071 Nachweis der erledigten Aufgaben in dieser Datei abhaken und Abweichungen vom Handoff in `research.md` gegenprüfen

---

## Abhängigkeiten

```text
Phase 1 (Setup)
   └─> Phase 2 (Typen und Konstanten)
          └─> Phase 3 (Kern, Test-zuerst)          ← blockiert alles Weitere
                 ├─> Phase 4  (US5: Balken)        ← Grundlage für die Taps
                 │      └─> Phase 5  (US1: Ziehen + Absprung)  🎯 MVP
                 │             ├─> Phase 6 (US4: Modi)
                 │             ├─> Phase 7 (US3: Tageswechsel)
                 │             └─> Phase 8 (US2: Kacheln)
                 │                    └─> Phase 9 (Aufräumen)
                 │                           └─> Phase 10 (Nachweis)
```

**Warum US5 vor US1**: Nicht wegen ihrer Priorität — sie ist P3 —, sondern weil
`Zeitbalken.svelte` die Komponente ist, aus der die Taps kommen. Die
Nachttönung fällt dabei ab, weil sie ohnehin in dieselbe Datei gehört.

**Warum Phase 9 zuletzt**: Die Aktionsleiste ist bis dahin der einzige Weg ins
Sheet. Sie früher zu entfernen hieße, die Seite für die Dauer mehrerer Phasen
unbedienbar zu machen — und damit auch die Vorschau.

**US1, US2, US3, US4 untereinander**: nach Phase 5 unabhängig. Sie berühren
zwar dieselbe Datei (`ReservierenSheet.svelte`), aber getrennte Abschnitte
darin.

---

## Parallel möglich

**Phase 3, Tests (T005–T014)**: zehn Testdateien-Abschnitte, alle unabhängig
schreibbar, bevor eine einzige Funktion existiert.

**Phase 3, Umsetzung (T015–T024)**: nur begrenzt — T015 bis T023 liegen in
derselben Datei. T024 (`nacht.ts`) ist unabhängig und kann jederzeit daneben
laufen.

**Phase 10 (T067–T069)**: unabhängig voneinander.

---

## Umsetzungsstrategie

**MVP** ist Phase 1–5: Kern, Balken, Ziehen, Absprung. Damit kann ein Mitglied
sein eigenes Fenster festlegen und hinüberspringen — der eigentliche Gewinn des
Features. Alles danach macht denselben Weg genauer (US2), bequemer (US3) oder
ehrlicher (US4).

**Nicht abkürzen**: Phase 3 vor jeder Komponente. Der Handoff nennt die
Gesten-Regeln als häufigste Fehlerquelle seines eigenen Prototyps; sie am DOM zu
debuggen statt im Test ist der teure Weg zum selben Ergebnis.

**Zwischenstände zeigen**: Nach Phase 4 und nach Phase 5 lohnt eine Vorschau —
beides sind sichtbare Zustände, und Gestaltungsfragen entscheidet, wer die Seite
vor sich hat.
