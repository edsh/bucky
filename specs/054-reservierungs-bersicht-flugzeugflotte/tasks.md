# Tasks: Reservierungsübersicht Flugzeugflotte

**Feature**: 054 | **Branch**: `054-reservierungs-bersicht-flugzeugflotte`

**Input**: [spec.md](./spec.md), [plan.md](./plan.md), [research.md](./research.md),
[data-model.md](./data-model.md), [quickstart.md](./quickstart.md),
[contracts/api-flotte.md](./contracts/api-flotte.md),
[contracts/tagesuhr.md](./contracts/tagesuhr.md),
[contracts/zustand.md](./contracts/zustand.md)

**Prüfungen**: Für den Kern ausdrücklich vorgesehen — wie in Feature 047/052 ist
er der einzige Teil, der sich ohne Netz und ohne Cloudflare vollständig prüfen
lässt, und er trägt in diesem Feature den weitaus größten Teil der Logik
(Prinzip IV, E-04). Für die Server-Routen Vertragsprüfungen gegen
`contracts/api-flotte.md`. Für die Oberfläche der bestehende Klickpfad, um neue
Prüfungen ergänzt — plus die Nachweise aus `quickstart.md`, die sich nicht
automatisieren lassen (Aussehen des Rings, Bedienung auf dem Telefon).

**Wege**: Alle Pfade sind vom Verzeichnisstamm aus angegeben.

**Gestaltung**: Verbindliche Quelle für alle Maße, Farben, Abstände und
Animationen ist `docs/design_handoff_reservierung/README.md`. Der HTML-Prototyp
daneben ist Referenz, **kein** Code zum Kopieren.

---

## Phase 1: Setup

- [ ] T001 Die tatsächlichen Kennzeichen der Vereinsflotte klären (Rückfrage an
      den Auftraggeber) und als Grundlage für die Stammliste in T008 notieren.
      Der Kalenderabzug vom 13.08.2026 nennt sechs: `D-EELK`, `D-EXYZ`,
      `D-MRXS`, `D-9021`, `D-4413`, `D-3004` — ob das alle sind, ist offen
      (plan.md, „Offene Punkte"). **Sperrt T008 nicht**: Bleibt die Antwort
      aus, beginnt die Stammliste mit genau diesen sechs. Sie ist bewusst eine
      gepflegte Liste (E-01) und jederzeit erweiterbar — ein fehlendes
      Kennzeichen taucht ohnehin auf, sobald es gebucht wird
- [ ] T002 [P] Bilder aus dem Handoff nach `apps/web/static/` übernehmen:
      `bucky-splash.png`, `D-EELK_pixelart.gif` → `d-eelk.gif`,
      `husky-dexyz-pixel-art.gif` → `d-exyz.gif`. Die unversionierten Varianten
      im Arbeitsbaum (`apps/web/static/bucky-maskottchen.svg`,
      `apps/web/static/bucky-pixel.gif`, `assets/bucky-*`, `assets/d-eelk/`)
      dabei sichten und entweder übernehmen oder entfernen — nicht liegen lassen
- [ ] T003 [P] In `packages/reservierung-core/tests/beispiele/README.md`
      vermerken, dass der vorhandene Abzug `kalender.ics` ab jetzt auch als
      Prüfstoff für die **Flottenbildung** dient (sechs Kennzeichen, dazu die
      Nicht-Flugzeuge `GRILL`, `LANDEBAR`, `Werkstatt`) — kein neuer Abzug nötig

---

## Phase 2: Foundational (sperrend für alle User Stories)

**⚠️ Ohne diese Grundlage kann keine Geschichte umgesetzt werden.** Sie enthält
die Kernmodule, die beide P1-Geschichten brauchen, und den gemeinsamen
Beschaffungsweg der Server-Routen.

### Kern — Typen und geteilte Bausteine

- [ ] T004 Neue abgeleitete Größen in
      `packages/reservierung-core/src/typen.ts` ergänzen: `Kategorie`,
      `Maschine`, `Statuswert`, `Maschinenzustand`, `Ringsegment`,
      `Balkensegment`, `Sonnenzeiten` (data-model.md). Bestehende Typen
      (`Reservierung`, `Abrufstand`, `Belegungsauskunft`, `Quelle`) **nicht**
      verändern — und weiterhin **kein** Feld für Personen anlegen (FR-023)
- [ ] T005 `endeDerKette` in `packages/reservierung-core/src/belegung.ts`
      exportierbar machen, damit `zustand.ts` es benutzt statt es
      nachzubauen (Z-02, Prinzip IV). **Verhalten unverändert** — die
      bestehenden Prüfungen in `tests/belegung.test.ts` müssen ohne Änderung
      grün bleiben
- [ ] T006 [P] Datums- und Wochentagsformate für FR-015 in
      `packages/reservierung-core/src/zeit.ts` ergänzen: `alsKurzdatumUhrzeit`
      (`Sa., 15.08., 12:00`), `alsTagesdatum` (`Samstag, 15. Aug.`),
      `ortstag` (`YYYY-MM-DD` in `Europe/Berlin`), `minuteDesTages`.
      Bestehende Ausgänge unverändert lassen
- [ ] T007 [P] Prüfungen für T006 in
      `packages/reservierung-core/tests/zeit.test.ts` ergänzen, einschließlich
      beider Zeitumstellungstage und eines Geräts in fremder Zeitzone (T-11)

### Kern — Flotte

- [ ] T008 `packages/reservierung-core/src/flotte.ts` anlegen:
      `kategorieFuer(kennung)` nach der Regel aus E-02 (rein ziffriges
      Eintragungszeichen → `segelflug`, sonst `motor`), die Stammliste der
      Kennzeichen aus T001 sowie `flotteBilden(stammliste, reservierungen)`
      als Vereinigung, sortiert nach Kategorie und dann alphabetisch (E-01).
      Über die Stammliste einen Kommentar setzen, der die bewusste Abweichung
      von Prinzip II benennt (Entscheidung vom 18.08.2026) **und den Preis**:
      Ein verkauftes Flugzeug, das hier stehen bleibt, zeigt dauerhaft „frei" —
      beim Verkauf einer Maschine gehört diese Liste angefasst. Ein Kommentar
      an genau der Stelle, an der jemand die Liste ändert, ist die einzige
      Erinnerung, die je gelesen wird
- [ ] T009 Prüfungen in `packages/reservierung-core/tests/flotte.test.ts`:
      Kategorieregel für alle sechs echten Kennzeichen, Vereinigung (nur in
      der Liste / nur in den Daten / in beidem → genau einmal), Überschreibung
      der Kategorie durch die Stammliste, leere Datenlage
- [ ] T010 `kalender-vertrag.test.ts` in
      `packages/reservierung-core/tests/` erweitern: Der echte Abzug ergibt
      **sechs** Maschinen mit korrekter Kategorie; `GRILL`, `LANDEBAR` und
      `Werkstatt` sind **nicht** darunter (quickstart.md, Nachweis 1)

### Kern — Zustand und Sätze

- [ ] T011 `packages/reservierung-core/src/zustand.ts` anlegen:
      `zustandFuer(reservierungen, kennung, bezugszeitpunkt)` nach
      `contracts/zustand.md` — vier Statuswerte, Kette über `endeDerKette`
      (T005), `draengen`, `naechsteLuecke`. Keine Farben, keine Sätze,
      keine Personen (Z-10)
- [ ] T012 Prüfungen in `packages/reservierung-core/tests/zustand.test.ts`
      für Z-01 bis Z-11, insbesondere: Beginn zählt mit / Ende nicht (Z-01),
      lückenlose Kette über mehrere Einträge (Z-02), Sperre gewinnt über
      Reservierung (Z-03), `bald` nur am selben Ortstag (Z-04), `draengen`
      exakt 0 bei 61 Minuten und exakt 1 im Moment des Beginns (Z-05),
      Aufrundung der Lücke auf 30 Minuten und Kappung an der Folgebelegung
      (Z-07), keine Lücke → `null` (Z-08)
- [ ] T013 `packages/reservierung-core/src/formulieren.ts` um die Statussätze
      und Zusatzzeilen aus `contracts/zustand.md` erweitern (Statussatz je
      Zustand, „danach …"-Zeile, Dauer mit Dezimalkomma, ganztägig „24 h").
      Sperren nennen ein **Datum**, keine Uhrzeit (FR-014). Bestehende
      Funktionen `alsSatz`, `alsAltersangabe`, `alsRueckfallHinweis`
      unverändert lassen — `/api/reservierung` benutzt sie weiter
- [ ] T014 Prüfungen in
      `packages/reservierung-core/tests/formulieren.test.ts` ergänzen: alle
      vier Statussätze, Zusatzzeilen, „danach den ganzen Tag frei",
      Dauerformate („3,5 h", „24 h"), Sperre mit Datum statt Uhrzeit
- [ ] T015 Neue Ausgänge in `packages/reservierung-core/src/index.ts`
      ergänzen (`flotte`, `zustand`, neue Formate und Typen)

### Weboberfläche — gemeinsamer Beschaffungsweg und Endpunkt

- [ ] T016 `apps/web/src/lib/server/stand-holen.ts` anlegen: der gemeinsame
      Weg Kalender → Rückfall → „kein Stand", samt `Quelle` und
      `abgerufenAm` (E-07). Inhaltlich **wörtlich** der bestehende Ablauf aus
      `routes/api/reservierung/+server.ts` — kein Verhalten ändern, nur
      verschieben
- [ ] T017 `apps/web/src/routes/api/reservierung/+server.ts` auf
      `stand-holen.ts` umstellen. Der Vertrag aus Feature 052 bleibt Wort für
      Wort gültig, einschließlich `no-store` und der 200-Antwort bei
      fehlendem Stand
- [ ] T018 Bestehende Prüfungen in
      `apps/web/tests/routes/api/reservierung.test.ts` **ohne Änderung**
      laufen lassen — sie sind der Nachweis, dass T016/T017 nichts verschoben
      haben. Schlagen sie fehl, ist die Umstellung falsch, nicht die Prüfung
- [ ] T019 `apps/web/src/routes/api/flotte/+server.ts` nach
      `contracts/api-flotte.md` anlegen: `prerender = false`, `stand-holen.ts`,
      `flotteBilden`, Fenster `[heute 00:00 Ortszeit, +8 Tage)` mit
      **ungekürzten** Zeitpunkten (E-06), `no-store`. Kein Zustand in der
      Antwort, keine Namen, kein Wetterdienst-Aufruf
- [ ] T020 Prüfungen in `apps/web/tests/routes/api/flotte.test.ts` für F-01
      bis F-10: Fall „vorhanden" mit beiden Quellen, Fall „fehlt" mit
      gefüllter `flotte` und **ohne** `belegungen` (F-03), `no-store` (F-04),
      keine Personenfelder (F-05), Fenstergrenzen und Ungekürztheit (F-07)

### Weboberfläche — geteilte Bausteine der Anzeige

- [ ] T021 [P] `apps/web/src/lib/flotte/darstellung.ts` anlegen: Zuordnung
      Kennung → optionaler Typ, optionales Bild, optionaler POH-Pfad (E-03).
      Nur die D-EELK erhält `pohPfad` (FR-018); alle Angaben dürfen fehlen
- [ ] T022 [P] `apps/web/src/lib/flotte/farben.ts` anlegen: die Statusfarben
      und Neutraltöne aus dem Handoff sowie die lineare Interpolation
      `#1f8f45` → `#c0442b` aus `draengen` (E-05, FR-006). Hier stehen die
      Farbwerte — und **nur** hier
- [ ] T023 `apps/web/src/lib/flotte/stand.svelte.ts` anlegen: holt
      `/api/flotte` genau einmal (`cache: 'no-store'`), hält Belegungen,
      Flotte, Quelle und Abrufzeitpunkt, und schreibt den Bezugszeitpunkt zur
      vollen Minute fort — **ohne** neuen Abruf (E-09, FR-016). Beim
      Zurückkehren in den Vordergrund einmal neu holen

**Checkpoint**: Kern und Datenweg stehen. `npm run test` ist grün, `/api/flotte`
liefert die ganze Flotte, `/api/reservierung` verhält sich unverändert.

---

## Phase 3: User Story 1 — Auf einen Blick sehen, was jetzt fliegbar ist (Priorität P1) 🎯 MVP

**Ziel**: Die Übersicht zeigt die gesamte Flotte als Kacheln mit Tagesuhr-Ring,
Statuspunkt und Kurztext — ohne dass eine einzelne Maschine geöffnet werden muss.

**Unabhängiger Test**: Die Übersicht ohne jede Konfiguration öffnen und jede
Maschine gegen den tatsächlichen Reservierungsstand prüfen (Farbe, Ring,
Kurztext, Statuspunkt). Grenzfälle: Maschine ohne Reservierung, gesperrte
Maschine, Maschine ohne Bild, kein Stand verfügbar.

### Kern — Tagesuhr

- [ ] T024 [US1] `packages/reservierung-core/src/tagesuhr.ts` anlegen:
      `winkelFuerMinute`, `minuteFuerWinkel`, Ringsegmente aus 1°-Zellen mit
      Zusammenfassung gleichfarbiger Nachbarn, Markerwinkel für Sonnenaufgang,
      Sonnenuntergang und „jetzt" — alles nach `contracts/tagesuhr.md`. Liefert
      Winkel und Füllungsnamen, **kein** CSS.
      **Geometrie und Farbe strikt trennen** (E-15): `winkelFuerMinute` nimmt
      *keine* Sonnenzeiten entgegen und ist datumsunabhängig; die
      Segmentbildung nimmt `Sonnenzeiten | null` entgegen und setzt die
      Füllung `nacht` nach den echten Sonnenzeiten, bei `null` ersatzweise
      nach 21:00/06:00 (T-06, T-06a).
      Im selben Zug in `packages/reservierung-core/src/index.ts` ausgeben —
      T026 importiert das Modul unmittelbar danach
- [ ] T025 [US1] Prüfungen in
      `packages/reservierung-core/tests/tagesuhr.test.ts` für T-01 bis T-12,
      insbesondere `winkelFuerMinute(1260) === 135`,
      `winkelFuerMinute(360) === 225`, `winkelFuerMinute(0) === 165` (T-02),
      lückenlose und überschneidungsfreie 360°-Abdeckung (T-05), Vorrang der
      Sperre (T-07), zwei Segmente bei leerer Datenlage (T-08), `null`-Marker
      ohne Sonnenzeiten (T-12).
      Für die Farbgrenze drei Fälle mit echten Werten für Hohn (E-15):
      21. Juni (Aufgang 04:47 — Farbgrenze **innerhalb** der gestauchten
      Zone), 21. Dezember (Aufgang 08:44, Untergang 15:57 — **innerhalb** der
      gedehnten Zone, der Nachmittag ab 15:57 muss dunkel sein) und
      `sonnenzeiten: null` (Rückfall auf 135°/225°, T-06a). Die Winkel selbst
      müssen in allen drei Fällen **identisch** bleiben (T-06)

### Oberfläche

- [ ] T026 [US1] `apps/web/src/lib/components/TagesuhrAvatar.svelte` anlegen:
      Ring als `conic-gradient` aus den Segmenten von T024, Avatar als runder
      Innenkreis, drei Marker mit Halo, Zahlen „6"/„21" außen an den
      Nahtstellen, Statuspunkt unten rechts, Absperrband bei Sperre (FR-014),
      Kurzkennzeichen statt Bild bei fehlendem Asset (FR-020). Nimmt
      `sonnenzeiten` als optionale Eigenschaft entgegen und reicht sie an
      T024 durch — in Phase 3 noch `null`, ab T054 echt (E-15). Maße und
      Ringbreiten (7 px bei 96er, 6 px bei 74er, 40er im Header) exakt nach
      Handoff. Die Zahlen „6"/„21" bezeichnen die **Skalennaht**, nicht den
      Sonnenstand — sie wandern nie mit
- [ ] T027 [US1] `apps/web/src/lib/components/Maschinenkachel.svelte` anlegen:
      Avatar, Kennzeichen, Kurzsatz in Statusfarbe, optionale zweite Zeile
      „danach …" — in beiden Größen (118 px Favoritenspalte, 118 px Grid mit
      74er Avatar)
- [ ] T028 [US1] `apps/web/src/routes/reservierung/+page.svelte` anlegen:
      Splash-Bild, Sektionskopf „MEINE LIEBLINGSMASCHINEN" mit Stand-Text
      rechts, Kategoriegruppen „Weitere Motorflugzeuge & UL" / „Weitere
      Segelflugzeuge" mit Zähler, Legende, Fußnote. Einspaltig,
      `max-width: 430px` (FR-017)
- [ ] T029 [US1] Statuspunkt, Kurztext und Farbe je Kachel aus `zustandFuer`
      und `farben.ts` speisen — Zustand nie ausschließlich über Farbe
      (FR-005, SC-005): Punkt **und** Text tragen ihn mit
- [ ] T030 [US1] Hell-/Dunkel-Umschalter als 34-px-Kreisbutton oben rechts im
      Splash (FR-013), Wahl im `localStorage` sichern, Vorbelegung aus
      `prefers-color-scheme`
- [ ] T031 [US1] Stand-Text nach FR-019 anzeigen („Stand Do., 13.08., 11:20")
      und erkennbar machen, ob er aus dem Kalender-Abruf oder dem Rückfall
      stammt (`alsRueckfallHinweis`)
- [ ] T032 [US1] Fall „kein Stand" gestalten: Die Flotte erscheint, aber
      **ohne** Verfügbarkeitsaussage, mit offenem Hinweis statt eines
      geratenen Zustands (FR-022, SC-003). Für keine Maschine darf hier Grün
      erscheinen
- [ ] T033 [US1] Minütliches Nachziehen anschließen: Jetzt-Marker,
      Statusfarbe und Kurztext folgen dem Bezugszeitpunkt aus T023, ohne
      Neuladen und ohne neuen Abruf (FR-016)
- [ ] T034 [US1] `apps/web/src/routes/+page.svelte` um einen Verweis auf die
      Übersicht ergänzen
- [ ] T035 [US1] `tests/ui/klickpfad.mjs` erweitern: Übersicht lädt, jede
      Maschine der Flotte erscheint genau einmal, Kurztexte sind vorhanden,
      der Fall „kein Stand" sagt es offen
- [ ] T036 [US1] Nachweise 1, 3 und 4 aus `quickstart.md` durchführen und das
      Ergebnis festhalten (Flotte vollständig, ungebuchte Maschine erscheint,
      kein Stand heißt kein „frei")

**Checkpoint**: Die Übersicht ist für sich nutzbar und liefert den eigentlichen
Mehrwert gegenüber Feature 052. Ab hier wäre eine Veröffentlichung sinnvoll.

---

## Phase 4: User Story 2 — Die Belegung einer Maschine über mehrere Tage verstehen (Priorität P1)

**Ziel**: Ein Tap auf eine Maschine öffnet die Detailansicht mit Statussatz,
Tagesbalken, Sieben-Tage-Liste, Wochenraster und den kommenden Belegungen.

**Unabhängiger Test**: Eine Maschine mit bekannten künftigen Reservierungen
öffnen und alle vier Darstellungen gegen den hinterlegten Stand prüfen —
einschließlich einer Belegung über Mitternacht und eines Ganztagseintrags.

### Kern — Segmente

- [ ] T037 [US2] `packages/reservierung-core/src/segmente.ts` anlegen:
      Tagesbalken (Fenster 06:00–22:00) und Wochenraster als
      `Balkensegment`-Folgen, Schnitt an Mitternacht und an den
      Fenstergrenzen, Sortierung und Vorrang der Sperre
- [ ] T038 [US2] Prüfungen in
      `packages/reservierung-core/tests/segmente.test.ts`: Belegung über
      Mitternacht ergibt je Tag ein Segment, Ganztagseintrag (00:00–24:00)
      füllt den Balken, Belegung außerhalb 06:00–22:00 wird korrekt
      beschnitten, überlappende Einträge kollabieren nicht zu Lücken
- [ ] T039 [US2] `packages/reservierung-core/src/index.ts` um die Ausgänge aus
      `segmente.ts` erweitern (`tagesuhr` ist bereits in T024 ergänzt)

### Oberfläche

- [ ] T040 [US2] `apps/web/src/routes/reservierung/[kennung]/+page.svelte`
      anlegen (E-12): Sticky Header mit Zurück-Knopf, 40er Avatar, Kennzeichen
      und Typ, Theme-Knopf. Unbekannte Kennung → freundlicher Leerfall statt
      Fehlerseite
- [ ] T041 [US2] Statusblock umsetzen: pulsierender 9-px-Punkt, Statuswort in
      Versalien, Statussatz in 27 px in Statusfarbe, Stand-Text darunter
- [ ] T042 [US2] `apps/web/src/lib/components/Tagesbalken.svelte` anlegen:
      Karte „Heute" mit Balken, Jetzt-Linie, Stundenachse 6/10/14/18/22 und
      Belegungszeiten als Chips
- [ ] T043 [US2] Segmented Control „7 Tage" / „Woche" umsetzen, beim Öffnen
      stets auf „7 Tage" zurückgesetzt (Handoff, Interaktionen)
- [ ] T044 [US2] Sieben-Tage-Liste umsetzen: Tag und Datum links, Balken in
      der Mitte, Textspalte rechts in Tagesfarbe („frei" / „gesperrt" /
      „14:00–17:30 +1")
- [ ] T045 [US2] `apps/web/src/lib/components/Wochenraster.svelte` anlegen:
      sieben Spalten mit Stundenachse links, Heute-Spalte mit Jetzt-Linie,
      Tageslabels unter den Spalten
- [ ] T046 [US2] „KOMMENDE BELEGUNGEN" umsetzen: höchstens sechs Einträge mit
      Farbstreifen, Zeitraum, Art und Dauer. **Jeder** Eintrag zeigt
      „Reserviert" bzw. „Sperre" — keine Namen, kein Sperrgrund, keine
      Kennzeichnung eigener Buchungen (E-11, E-14, FR-010). Leerfall:
      „Nichts eingetragen in den nächsten sieben Tagen."
- [ ] T047 [US2] Fußnote und Sticky Aktionsleiste anlegen; die Leiste trägt
      zunächst nur den sekundären POH-Verweis (FR-018) — der
      Reservieren-Knopf kommt in US4. Die Fußnote nennt Vereinsflieger als
      verbindliche Quelle (FR-012, zweite Stelle nach der Übersicht)
- [ ] T048 [US2] Minütliches Nachziehen auch in der Detailansicht anschließen
      (FR-016)
- [ ] T049 [US2] `tests/ui/klickpfad.mjs` erweitern: Tap auf eine Kachel öffnet
      die Detailansicht, Zurück führt zur Übersicht, Reiterwechsel
      funktioniert, kein Name erscheint

**Checkpoint**: US1 und US2 sind beide unabhängig nutzbar. Das Feature erfüllt
seinen Kernzweck.

---

## Phase 5: Sonnenmarker (Nachtrag zu US1/US2, übergreifend)

**Ziel**: Die beiden Sonnenmarker auf dem Ring. Bewusst nach US1/US2 — der Ring
ist ohne sie vollständig **richtig**, nur ärmer (E-08).

- [ ] T050 [US1] `packages/reservierung-core/src/sonnenzeiten.ts` anlegen:
      Deuten der Open-Meteo-Antwort (`daily.sunrise`/`daily.sunset` als
      Ortszeit ohne Versatz) über `ortszeitZuZeitpunkt` → `alsIsoMitVersatz`,
      netzfrei und rein (E-08)
- [ ] T051 [US1] Prüfungen in
      `packages/reservierung-core/tests/sonnenzeiten.test.ts`: gültige
      Antwort, fehlende Felder, unbrauchbare Antwort (wirft), Sommer- und
      Winterzeit
- [ ] T052 [US1] `apps/reservierungs-abruf/src/sonnenzeiten-holen.ts` anlegen:
      Abruf nach E-08 mit `forecast_days=8` und `timezone=Europe/Berlin`,
      sprechender `User-Agent`. Ein Fehlschlag beendet den Durchgang **nicht** —
      der Reservierungsstand ist wichtiger als die Sonne
- [ ] T053 [US1] `apps/reservierungs-abruf/src/abruf.ts` erweitern: Im selben
      Durchgang prüfen, ob der KV-Schlüssel `sonnenzeiten` noch die kommenden
      acht Tage abdeckt, und nur dann neu holen — also höchstens einmal
      täglich (Prinzip V)
- [ ] T054 [US1] `apps/web/src/routes/api/flotte/+server.ts` um das Feld
      `sonnenzeiten` aus dem KV ergänzen (F-08). Die Route ruft den
      Wetterdienst **nicht** auf (F-09)
- [ ] T055 [US1] `TagesuhrAvatar.svelte` die echten Sonnenzeiten übergeben:
      Damit wandert die Hell/Dunkel-Kante des Rings auf den tatsächlichen
      Sonnenstand (E-15) und die beiden Sonnenmarker erscheinen — sie sitzen
      genau auf dieser Kante. Fehlen die Sonnenzeiten, entfallen **nur** die
      Marker, und die Kante fällt auf 21:00/06:00 zurück (T-06a). Danach
      Nachweis im Dezember-Fall gegensehen: Der Nachmittag ab Sonnenuntergang
      muss dunkel sein, obwohl die Skala dort noch „Tag" heißt
- [ ] T056 [US1] Namensnennung „Weather data by Open-Meteo.com" mit Verweis in
      der Fußnote der Detailansicht ergänzen (CC BY 4.0, E-08)
- [ ] T057 [US1] Nachweis 7 aus `quickstart.md` durchführen: zehn Seitenaufrufe
      erzeugen **null** ausgehende Aufrufe an `api.open-meteo.com`; ohne den
      KV-Schlüssel bleibt der Ring vollständig

---

## Phase 6: User Story 3 — Die eigenen Maschinen zuerst sehen (Priorität P2)

**Ziel**: Als Favorit markierte Maschinen stehen oben und nicht mehr in ihrer
Kategoriegruppe.

**Unabhängiger Test**: Auf einem frischen Gerät ohne Favoritenreihe öffnen,
einen Favoriten setzen, neu laden, auf einem zweiten Gerät gegenprüfen.

- [ ] T058 [US3] `apps/web/src/lib/flotte/favoriten.ts` anlegen: `localStorage`
      mit versioniertem Schlüssel `bucky.favoriten` nach dem Muster von
      `lib/einstellungen/speicher.ts`, unlesbarer Inhalt wird still verworfen
      (E-10). Die drei Fälle „nie gesetzt" / „leer" / „gefüllt" bleiben
      unterscheidbar (FR-007b)
- [ ] T059 [US3] Prüfungen in `apps/web/tests/flotte/favoriten.test.ts`:
      Lesen ohne Eintrag, Schreiben und Lesen, fremde Fassung, kaputter Inhalt,
      unbekanntes Kennzeichen in der Liste
- [ ] T060 [US3] Favoritenreihe in der Übersicht umsetzen (96er Avatare,
      Kennzeichen, Kurzsatz, „danach …") — sie erscheint **nur**, wenn
      mindestens ein Favorit gesetzt ist (FR-007b)
- [ ] T061 [US3] Favoriten aus ihrer Kategoriegruppe entfernen, Gruppenzähler
      entsprechend anpassen (FR-007). Eine Gruppe mit einer Maschine zeigt
      weiterhin ihren Kopf mit Zähler „1"
- [ ] T062 [US3] Umschalten der Markierung in Übersicht und Detailansicht
      anbieten, Tap-Ziel mindestens 44 px (FR-017)
- [ ] T063 [US3] Legende umpositionieren: bei höchstens zwei Favoriten rechts
      neben der Reihe, sonst als eigene Zeile darunter (Handoff)
- [ ] T064 [US3] Nachweis 8 aus `quickstart.md` durchführen und
      `tests/ui/klickpfad.mjs` um den Favoritenweg erweitern

---

## Phase 7: User Story 4 — Aus der Anzeige heraus reservieren wollen (Priorität P3)

**Ziel**: Ein Sheet nennt das vorgeschlagene Zeitfenster und verweist nach
Vereinsflieger, ohne selbst zu buchen.

**Unabhängiger Test**: In der Detailansicht einer freien Maschine „Reservieren"
antippen und prüfen, ob der Vorschlag der nächsten freien Lücke entspricht
(auf 30 Minuten aufgerundet, zwei Stunden) und der Verweis in einem neuen Tab
öffnet.

- [ ] T065 [US4] `apps/web/src/lib/components/ReservierenSheet.svelte` anlegen:
      Overlay, Grabber, Titel, Hinweiszeile, zwei Felder „Von"/„Bis" aus
      `naechsteLuecke` (Z-07), primärer Verweis nach Vereinsflieger
      (`rel="noopener noreferrer"`, neuer Tab, **ohne** Zeitparameter — E-13)
- [ ] T066 [US4] Primären Knopf „Reservieren" in die Sticky Aktionsleiste aus
      T047 aufnehmen
- [ ] T067 [US4] Schließen über Tap auf das Overlay, ohne dass ein Aufruf nach
      Vereinsflieger stattgefunden hat (US4-Szenario 2)
- [ ] T068 [US4] Fall ohne freie Lücke (`naechsteLuecke === null`, Z-08): kein
      Vorschlag, stattdessen der Statussatz als Hinweiszeile — nie ein
      erfundenes Zeitfenster
- [ ] T069 [US4] Animationen nach Handoff: `hoch .3s cubic-bezier(.22,.7,.3,1)`
      für das Sheet, Overlay-Fade `.2s`

---

## Phase 8: Politur und Übergreifendes

- [ ] T070 Zugänglichkeit prüfen (SC-005): Zustand ist nie ausschließlich über
      Farbe erkennbar, Knöpfe sind echte `<button>`/`<a>`-Elemente, Fokus
      bleibt sichtbar, Tap-Ziele ≥ 44 px, sinnvolle Beschriftungen für
      Bildschirmleser an Ring und Statuspunkt
- [ ] T071 [P] Nachweis 5 aus `quickstart.md` durchführen: Die Antwort von
      `/api/flotte` enthält keine Namen, gegengeprüft gegen die echten Namen
      aus dem Kalenderabzug (FR-023, SC-006)
- [ ] T072 [P] Nachweis 6 aus `quickstart.md` durchführen: Die Anzeige zieht
      binnen einer Minute nach, ohne neuen Abruf (FR-016, E-09)
- [ ] T073 [P] SC-002 messen: Zeit bis zur sinnvoll sichtbaren Übersicht auf
      einer gedrosselten mobilen Verbindung, Größe der Antwort von
      `/api/flotte` festhalten
- [ ] T074 [P] Nachweis 2 aus `quickstart.md`: Ringgeometrie rechnerisch grün
      **und** mit bloßem Auge geprüft — der Jetzt-Strich steht dort, wo die Uhr
      es sagt
- [ ] T075 `README.md` nachziehen: neue Übersichtsseite, der neue KV-Schlüssel
      `sonnenzeiten`, die Namensnennung von Open-Meteo. Die Constitution wird
      **nicht** geändert — die Abweichung zu Prinzip II ist in `plan.md`
      dokumentiert und bleibt dort
- [ ] T076 Verhältnis zur alten Seite `/d-eelk/reservierung/` festhalten: Sie
      bleibt in diesem Feature unverändert bestehen; ob sie zugunsten der
      Übersicht entfällt, entscheidet ein eigenes Issue — dieses anlegen
- [ ] T077 Nachfolge-Issue für die zurückgestellte Kennzeichnung eigener
      Reservierungen anlegen (E-11), mit Verweis auf diesen Plan
- [ ] T078 Nachweis 9 aus `quickstart.md`: Vorschau auf dem Telefon über
      `https://pr-<nummer>-bucky.edsh.workers.dev` anbieten, **bevor** die
      Merge-Rückfrage kommt. Gestaltungsfragen entscheidet, wer die Seite vor
      sich hat — ein Bildschirmfoto des Agenten ersetzt das nicht

---

## Abhängigkeiten und Reihenfolge

### Phasen

- **Phase 1 (Setup)**: keine Abhängigkeiten. T001 sollte früh laufen, weil T008
  darauf wartet
- **Phase 2 (Foundational)**: hängt an Phase 1 — **sperrt alle User Stories**
- **Phase 3 (US1)**: ab Phase 2. Der MVP
- **Phase 4 (US2)**: ab Phase 2. Nutzt Bausteine aus US1 (`TagesuhrAvatar`),
  ist aber für sich prüfbar
- **Phase 5 (Sonnenmarker)**: ab Phase 3. Kein Zwischenschritt zu US2 — die
  beiden berühren sich nicht
- **Phase 6 (US3)**: ab Phase 3
- **Phase 7 (US4)**: ab Phase 4 (braucht die Aktionsleiste aus T047)
- **Phase 8 (Politur)**: ab allen gewünschten Geschichten

### Innerhalb der Phasen

- Kernmodul vor seiner Prüfung? **Nein** — die Prüfungen dürfen zuerst
  geschrieben werden und fehlschlagen. Wichtig ist nur, dass beide vor dem
  jeweiligen Oberflächenschritt fertig sind
- Kern vor Oberfläche, ausnahmslos: Eine Kachel, die auf einen fehlenden
  Zustand wartet, lädt zum Improvisieren ein — und Improvisieren in der
  Oberfläche ist genau der Bruch von Prinzip IV, den dieses Feature vermeiden
  soll
- T016 vor T017 vor T019 (der gemeinsame Weg vor beiden Routen)
- T024/T025 vor T026 (Geometrie vor Ring)
- T037/T038 vor T042/T044/T045 (Segmente vor Balken)

### Parallel möglich

- T002 und T003 (Setup)
- T006/T007 neben T008–T010 (Zeit neben Flotte — verschiedene Dateien)
- T021 und T022 (Darstellung und Farben)
- T050/T051 neben der Oberflächenarbeit von US3
- T071–T074 (Nachweise, verschiedene Belege)

---

## Umsetzungsstrategie

### MVP zuerst

1. Phase 1 (Setup)
2. Phase 2 (Foundational) — **kritisch, sperrt alles**
3. Phase 3 (US1) → **anhalten und prüfen**: Übersicht gegen den echten
   Reservierungsstand, Nachweise 1/3/4 aus `quickstart.md`
4. Vorschau auf dem Telefon anbieten, dann veröffentlichen

### Schrittweise Lieferung

1. Foundational → Grundlage steht
2. US1 → unabhängig prüfen → veröffentlichen (MVP)
3. US2 → unabhängig prüfen → veröffentlichen
4. Sonnenzeiten → die Hell/Dunkel-Kante des Rings wandert auf den echten
   Sonnenstand, die Marker kommen dazu. Ändert keine Verfügbarkeitsaussage
5. US3 (Favoriten) → veröffentlichen
6. US4 (Sheet) → veröffentlichen

---

## Hinweise

- `[P]` = andere Datei, keine offene Abhängigkeit
- Nach jeder Aufgabe oder Gruppe committen
- **Nie** eine Verfügbarkeitsaussage raten. Jeder Fehlschlag endet in „keine
  Auskunft", nie in „frei" — das ist der eine Fehler dieses Features, der
  jemanden umsonst zum Platz fahren lässt
- **Nie** einen Personennamen durchreichen, auch nicht vorübergehend zum
  Prüfen
- Alle Maße, Farben und Animationen aus dem Handoff, nicht aus dem Gedächtnis
