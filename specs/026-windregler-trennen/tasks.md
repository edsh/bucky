---

description: "Aufgabenliste für Feature 026"
---

# Tasks: Windkomponente in „Pistenwind" und „Streckenwindkomponente" aufteilen

**Input**: Entwurfsartefakte aus `/specs/026-windregler-trennen/`

**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

**Tests**: Ja, aber keine neuen Kerntests. Der Kern bleibt unverändert
(plan.md, E4); seine bestehenden Tests dienen hier als Regressionsnetz. Der
eigentliche Nachweis dieses Features — dass sich die beiden Rechnungen nicht
mehr gegenseitig beeinflussen — ist eine Aussage über die zusammengesetzte
Oberfläche und gehört deshalb in den Klickpfad.

## Format: `[ID] [P?] [Story] Beschreibung`

- **[P]**: parallel ausführbar (andere Datei, keine offene Abhängigkeit)
- **[Story]**: zugehörige Nutzergeschichte (US1, US2, US3)

## Pfade

Monorepo laut plan.md: `apps/web/` und `tests/ui/`.
`packages/deelk-poh-core/` wird **nicht** angefasst — jede Änderung dort wäre
ein Hinweis darauf, dass etwas am Entwurf nicht stimmt.

---

## Phase 1: Setup

Keine neuen Abhängigkeiten, keine neuen Dateien.

- [ ] T001 Ausgangszustand festhalten: `npm run lint`, `npx vitest run` und `npm run check` einmal grün laufen lassen, damit spätere Fehlschläge diesem Feature zuzuordnen sind
- [ ] T002 Die heutigen Ergebnisse für die Anfangsbelegung notieren (Startstrecke und Kraftstoffbedarf bei Windkomponente 10 kt, sonst Vorgabewerte) — sie sind der Sollwert für SC-003 in T020

---

## Phase 2: Foundational — blockierend für alle Geschichten

Der Zustand muss sich teilen, bevor die Regler getrennt werden können.
Andernfalls entstünde ein Zwischenstand, in dem zwei Regler denselben Wert
schreiben — genau der Fehler, den das Feature beseitigt.

- [ ] T003 In `apps/web/src/routes/+page.svelte` das `$state` `windComponentKt` durch zwei ersetzen: `runwayWindComponentKt` und `routeWindComponentKt`, beide mit dem bisherigen Anfangswert 10 (FR-007). Im Kommentar festhalten, dass sie bewusst nicht gekoppelt sind (plan.md, E2)
- [ ] T004 In derselben Datei die beiden Rechnungen umstellen: `computeTakeoffDistance` bekommt `windComponentKt: runwayWindComponentKt`, `computeFuelPlan` bekommt `windComponentKt: routeWindComponentKt` (FR-002, FR-003)
- [ ] T005 In derselben Datei die Abhängigkeitsliste des `$effect` von sieben auf acht Eingaben erweitern — beide Windwerte müssen darin stehen, sonst rechnet der Bedarf bei einer Änderung der Streckenwindkomponente nicht neu

**Prüfpunkt**: `npm run check` ist grün, die Seite rechnet noch. Beide Regler
gibt es zu diesem Zeitpunkt noch nicht — der alte Regler schreibt vorübergehend
nur noch eine der beiden Größen.

---

## Phase 3: Nutzergeschichte 1 — Bodenwind und Höhenwind getrennt angeben (P1)

**Ziel**: Zwei Werte, zwei Rechnungen, keine gegenseitige Beeinflussung.

**Unabhängig prüfbar**: Einen Regler bewegen und beobachten, dass sich nur das
zugehörige Ergebnis ändert.

- [ ] T006 [US1] In `apps/web/src/lib/components/TakeoffDistance.svelte` `getTakeoffInputDomain` aus `@edsh-bucky/deelk-poh-core` einführen und den Bereich einmal als Konstante ableiten. Im Kopfkommentar begründen, warum die Komponente den Bereich selbst bezieht statt ihn als Prop zu bekommen (plan.md, E1)
- [ ] T007 [US1] In derselben Datei ein `$bindable`-Prop `windComponentKt: number` ergänzen, typisiert wie `dryGrass` und `wetOrSnow`, und `RangeField` importieren
- [ ] T008 [US1] In derselben Datei nach dem Fieldset „Bahnzustand" einen `RangeField` mit `id="pistenwind"`, `label="Pistenwind (kt, positiv = Gegenwind)"`, `range` aus T006, `format={formatKnots}` einsetzen (FR-002, FR-004, plan.md E3 und E5). `formatKnots` aus dem Kern beziehen
- [ ] T009 [US1] In `apps/web/src/routes/+page.svelte` den Aufruf von `TakeoffDistance` um `bind:windComponentKt={runwayWindComponentKt}` erweitern
- [ ] T010 [US1] In derselben Datei im `.felder`-Block neben der Streckenlänge einen `RangeField` mit `id="streckenwind"`, `label="Streckenwindkomponente (kt, positiv = Gegenwind)"`, `range={domain.windComponentKt}`, `bind:value={routeWindComponentKt}`, `format={formatKnots}` einsetzen (FR-003, FR-005)
- [ ] T011 [US1] In derselben Datei den alten `RangeField` mit `id="wind"` und der Beschriftung „Windkomponente (kt, positiv = Gegenwind)" entfernen (FR-001)

**Prüfpunkt**: Im `npm run dev` lässt sich Schritt 4 aus
[quickstart.md](./quickstart.md) von Hand nachvollziehen — ein Regler bewegt
sich, nur ein Ergebnis ändert sich.

---

## Phase 4: Nutzergeschichte 2 — Den Regler dort finden, wo er wirkt (P2)

**Ziel**: Die Gliederung der Seite spiegelt die Trennung wider.

**Unabhängig prüfbar**: Die Aufschriften der Bereiche lesen.

- [ ] T012 [US2] In `apps/web/src/routes/+page.svelte` die Aufschrift des Fieldsets von „Platzhöhe und Windkomponente" auf „Platzhöhe" ändern (FR-001)
- [ ] T013 [US2] In derselben Datei den Kommentar vor diesem Fieldset überarbeiten: Er begründet heute, dass „Platzhöhe und Wind" beiden Bereichen darunter gehören. Für die Platzhöhe gilt das weiter, für den Wind nicht mehr — der Kommentar muss sagen, warum der Wind jetzt woanders steht (research.md R4)
- [ ] T014 [US2] In `apps/web/src/lib/components/TakeoffDistance.svelte` den Kopfkommentar ergänzen: Der Pistenwind steht aus demselben Grund hier wie die Bahnzustandsschalter — er wirkt allein auf die Startstrecke

---

## Phase 5: Nutzergeschichte 3 — Die Grenze schon am Regler sehen (P3)

**Ziel**: Der Pistenwindregler endet dort, wo die Handbuchtabelle endet.

**Unabhängig prüfbar**: Den Regler an sein unteres Ende ziehen und den Wert
ablesen.

- [ ] T015 [US3] Prüfen, dass der Pistenwindregler bei −10 kt endet und die Startstrecke dort noch ausgewiesen wird — der Bereich kommt aus T006 und ist damit bereits gesetzt; diese Aufgabe stellt sicher, dass er nicht versehentlich überschrieben wurde
- [ ] T016 [US3] In `apps/web/src/lib/components/TakeoffDistance.svelte` am Regler oder in seinem Kommentar die Herkunft der Grenze festhalten: Anmerkung 3 zu Abb. 5-4, POH-Seite 5-12 — nicht als Betriebsgrenze, sondern als Ende der Tabelle (Prinzip I: Quellenangabe statt Behauptung)

---

## Phase 6: Klickpfad und Politur

- [ ] T017 In `tests/ui/klickpfad.mjs` die Hilfsfunktion `fuellen()` umstellen: Sie setzt künftig beide Regler. Der Parameter `wind` wird zu `pistenwind` und `streckenwind`; wo bisher ein Wert übergeben wurde, gilt er für beide, damit die bestehenden Prüfungen ihre Aussage behalten
- [ ] T018 In derselben Datei die betroffenen Prüfungen nachziehen (research.md R5): Prüfung 13 erwartet acht Regler und die beiden Bereiche `pistenwind: −10…50` und `streckenwind: −50…50`; Prüfungen 21 und 31 erwarten die Aufschrift „Platzhöhe"; Prüfung 23 spricht den Regler „Streckenwindkomponente" an; Prüfung 36 greift auf `#pistenwind` zu
- [ ] T019 In derselben Datei Prüfung 32 umbauen (research.md R3): Sie belegt künftig, dass der Pistenwindregler bei −10 kt endet und die Startstrecke dort noch ausgewiesen wird. Im Kommentar festhalten, dass die Rückenwindmeldung des Kerns bestehen bleibt und über die Oberfläche nur nicht mehr auslösbar ist
- [ ] T020 In derselben Datei eine neue Prüfung für SC-002 ergänzen: Startstrecke und Bedarf ablesen, den Pistenwind verstellen, prüfen dass sich die Startstrecke ändert und der Bedarf Zeichen für Zeichen gleich bleibt — danach dasselbe mit vertauschten Rollen
- [ ] T021 In derselben Datei eine Prüfung für SC-003 ergänzen: Bei beiden Reglern auf 10 kt stehen dieselben Zahlen wie im Ausgangszustand aus T002
- [ ] T022 [P] In `README.md` den Abschnitt zur Bedienung auf die beiden Regler nachziehen, falls dort der eine Regler erwähnt wird
- [ ] T023 Vollständige Prüfung nach [quickstart.md](./quickstart.md): `npx vitest run`, `npm run lint`, `npm run check`, dann Klickpfad gegen den gebauten Stand
- [ ] T024 Gegenprobe auf unveränderte Zahlen gegen die veröffentlichte Seite <https://edsh.github.io/bucky/> (FR-010, SC-003), solange dort noch der alte Stand liegt

---

## Abhängigkeiten

```text
Phase 1 (T001–T002)
   └─> Phase 2 (T003–T005)   ← blockierend, teilt den Zustand
          └─> Phase 3 US1 (T006–T011)   ← MVP
                 ├─> Phase 4 US2 (T012–T014)
                 ├─> Phase 5 US3 (T015–T016)
                 └─> Phase 6 (T017–T024)
```

**Innerhalb von Phase 3**: T006 vor T007 vor T008 (dieselbe Datei, aufeinander
aufbauend). T009 setzt T007 voraus. T010 und T011 betreffen `+page.svelte` und
laufen nacheinander.

**Innerhalb von Phase 6**: T017 vor T018 bis T021 (alle bauen auf der
umgestellten Hilfsfunktion auf). T022 ist unabhängig und mit `[P]` markiert.

## Parallelität

Wenig. Das Feature spielt sich in zwei Dateien ab, die beide mehrfach angefasst
werden — Parallelität wäre hier ein Weg, sich selbst Konflikte zu bauen. Echt
parallel ist nur T022 (README) zu allem anderen.

## Umsetzungsstrategie

**MVP ist Phase 3.** Danach sind die beiden Rechnungen getrennt und das Feature
liefert seinen Wert; die Phasen 4 und 5 machen die Trennung sichtbar und
begründet, sind aber kein Ersatz für sie.

**Nicht auslieferbar zwischen Phase 2 und 3.** Nach Phase 2 schreibt der alte
Regler nur noch eine der beiden Größen; die andere bliebe auf ihrem
Anfangswert stehen, ohne dass es jemand sähe. Phase 2 und 3 gehören deshalb in
denselben Zug.
