# Tasks: Kraftstoffrechner für D-EELK

**Input**: Entwurfsdokumente aus `specs/001-kraftstoffrechner-d-eelk/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`

**Tests**: Testaufgaben sind enthalten. Sie sind hier nicht optional, sondern von
Constitution-Prinzip I und Zusicherung C-05 des Kernvertrags gefordert: die
Rechnung ist sicherheitskritisch und muss gegen von Hand entnommene Sollwerte
abgesichert sein.

**Organisation**: Die Aufgaben sind nach User Stories gruppiert, damit jede Story
für sich umgesetzt und geprüft werden kann.

## Format: `[ID] [P?] [Story] Beschreibung`

- **[P]**: parallel ausführbar (andere Datei, keine offene Abhängigkeit)
- **[Story]**: zugehörige User Story (US1, US2, US3)
- Jede Aufgabe nennt den genauen Dateipfad

## Pfadkonventionen

Monorepo mit npm-Workspaces laut `plan.md`: Kernpaket unter
`packages/deelk-poh-core/`, Adapter unter `apps/web/` und `apps/mcp/`, die
generierte Datengrundlage liegt unverändert unter `data/poh/d-eelk/`.

---

## Phase 1: Setup (gemeinsame Grundlage)

**Zweck**: Monorepo, Werkzeugkette und Paketgerüste anlegen.

- [ ] T001 Wurzel-`package.json` mit npm-Workspaces (`packages/*`, `apps/*`), Node-Version 22 und den Skripten `test`, `lint`, `build` in `package.json`
- [ ] T002 [P] Gemeinsame TypeScript-Konfiguration (strict, ES2022, `noUncheckedIndexedAccess`) in `tsconfig.base.json`
- [ ] T003 [P] Vitest als Testrunner der Wurzel einrichten in `vitest.workspace.ts`
- [ ] T004 [P] ESLint und Prettier mit einer Regel, die Importe aus `node:fs`, DOM und SvelteKit innerhalb von `packages/deelk-poh-core` verbietet (Zusicherung C-01), in `eslint.config.js`
- [ ] T005 Paketgerüst des Kerns anlegen (`name: "@edsh-bucky/deelk-poh-core"`, `type: module`, Export von `src/index.ts`) in `packages/deelk-poh-core/package.json` und `packages/deelk-poh-core/tsconfig.json`
- [ ] T006 [P] SvelteKit-Gerüst mit `@sveltejs/adapter-static` anlegen in `apps/web/package.json`, `apps/web/svelte.config.js` und `apps/web/vite.config.ts`
- [ ] T007 [P] `.gitignore` um `node_modules/`, `dist/`, `.svelte-kit/` und `build/` ergänzen in `.gitignore`

**Checkpoint**: `npm install` läuft durch, `npm test` findet noch keine Tests.

---

## Phase 2: Foundational (blockierende Voraussetzungen)

**Zweck**: Typen, Fehler, Tabellenzugriff, Interpolation, Rundung und
Eingabevalidierung. Ohne diese Phase kann keine User Story beginnen.

**⚠️ Kritisch**: T008 muss vor jeder Implementierungsaufgabe abgeschlossen sein.
Ein Sollwert, der nach dem Code entsteht, prüft den Code nicht (CHK047a).

- [ ] T008 Sollwert für SC-005 von Hand aus Abb. 5-3a und 5-4a rechnen, jeden Zwischenschritt mit Seitenzahl und abgelesenen Eckwerten belegen und mit Datum und Namen des Erstellers ablegen in `specs/001-kraftstoffrechner-d-eelk/reference-calculation.md` — ohne Blick in den Code, da dieser noch nicht existiert
- [ ] T009 [P] Typen `SourceReference`, `TableAnchor`, `CalculationStep`, `InputDomain` und `TableSummary` laut `data-model.md` in `packages/deelk-poh-core/src/types.ts`
- [ ] T010 [P] Fehlerklasse `PohCalculationError` mit den Arten `OUT_OF_RANGE`, `UNSUPPORTED_COMBINATION`, `INVALID_INPUT` und `NOT_COMPUTABLE`, jeweils mit betroffenem Feld und zulässigem Bereich in der Meldung, in `packages/deelk-poh-core/src/errors.ts`
- [ ] T011 Tabellen aus `data/poh/d-eelk/` zur Bauzeit importieren, `SourceReference` unverändert aus `source.citation` übernehmen und den Zugriff auf Tabellen mit `applicability.applicable_to_d_eelk === false` bereits beim Laden ausschließen (V-04, FR-015, C-04) in `packages/deelk-poh-core/src/tables.ts`
- [ ] T012 Lineare Interpolation, die neben dem Wert immer die beiden verwendeten `TableAnchor` zurückgibt und außerhalb des Rasters `OUT_OF_RANGE` wirft statt zu extrapolieren (FR-003, FR-007), in `packages/deelk-poh-core/src/interpolate.ts`
- [ ] T013 [P] Die eine Rundungs- und Zahlendarstellungsstelle des Projekts (Liter auf 0,1, Zeiten auf Minuten, Strecken auf 0,1 NM) in `packages/deelk-poh-core/src/format.ts` (Zusicherung C-03)
- [ ] T014 `FlightPlanInput` mit den sechs Feldern und den Validierungsregeln V-01 bis V-03, inklusive des höhenabhängigen Rasters der verfügbaren Lasteinstellungen, in `packages/deelk-poh-core/src/fuel/input.ts`
- [ ] T015 `validateFlightPlan(input: unknown)` und `getFuelPlanInputDomain()` aus den Tabellendaten ableiten statt fest zu verdrahten, in `packages/deelk-poh-core/src/fuel/input.ts` und exportiert über `packages/deelk-poh-core/src/index.ts`
- [ ] T016 [P] Tests der Interpolation: exakte Stützstelle, Zwischenwert, Eckwerte im Ergebnis, `OUT_OF_RANGE` außerhalb des Rasters, in `packages/deelk-poh-core/tests/interpolate.test.ts`
- [ ] T017 [P] Tests des Tabellenzugriffs: nur `applicable_to_d_eelk === true` wird geladen, Abb. 5-3a und 5-4a sind auffindbar, Quellenreferenz stimmt wortgleich mit der JSON-Datei überein, in `packages/deelk-poh-core/tests/tables.test.ts`
- [ ] T018 [P] Tests der Eingabevalidierung: Reiseflughöhe gleich oder unter Platzhöhe wirft `INVALID_INPUT` (V-01), 20000 ft wirft `OUT_OF_RANGE` (V-02), 100 % Last bei 12000 ft wirft `UNSUPPORTED_COMBINATION` (V-03), in `packages/deelk-poh-core/tests/fuel/input.test.ts`

**Checkpoint**: Der Kern kann Tabellenwerte nachschlagen und interpolieren, kennt
seine Wertebereiche und weist ungültige Eingaben zurück — rechnet aber noch nicht.

---

## Phase 3: User Story 1 — Kraftstoffbedarf berechnen (Priority: P1) 🎯 MVP

**Goal**: Ein Pilot gibt sein Flugvorhaben ein und erhält den Kraftstoffbedarf in
Litern, aufgeschlüsselt nach Anlassen/Rollen/Start, Steigflug und Reiseflug, samt
Warnung bei Überschreiten der ausfliegbaren Menge.

**Independent Test**: Das Flugvorhaben aus `reference-calculation.md` (T008)
eingeben und das Ergebnis mit dem dort von Hand gerechneten Sollwert vergleichen.

- [ ] T019 [US1] Steigflug: Tabellenwerte bei Platzhöhe und Reiseflughöhe nachschlagen und als Differenz für Zeit, Strecke und Kraftstoff bilden (FR-010) in `packages/deelk-poh-core/src/fuel/climb.ts`
- [ ] T020 [US1] Temperaturkorrektur des Steigflugs mit dem stetigen Faktor `1 + (isaDeviationC / 10) × 0,10` auf Zeit, Strecke und Kraftstoff, Faktor 1 bei ISA-Abweichung ≤ 0 (FR-012) in `packages/deelk-poh-core/src/fuel/climb.ts`
- [ ] T021 [P] [US1] Reiseflug: KTAS und Verbrauchsrate aus Abb. 5-4a nachschlagen und die KTAS mit `1 + (isaDeviationC / 10) × 0,01` korrigieren (FR-013) in `packages/deelk-poh-core/src/fuel/cruise.ts`
- [ ] T022 [US1] Reiseflugstrecke, Geschwindigkeit über Grund, Reiseflugzeit und Reiseflug-Kraftstoff berechnen und dabei V-05 und V-06 mit `NOT_COMPUTABLE` abbrechen (FR-014) in `packages/deelk-poh-core/src/fuel/cruise.ts`
- [ ] T023 [US1] `computeFuelPlan` orchestrieren: Festbetrag 4 l für Anlassen/Rollen/Start (FR-011), Steigflug, Reiseflug, `breakdown` mit Gesamtsumme (FR-009) in `packages/deelk-poh-core/src/fuel/fuelPlan.ts`
- [ ] T024 [US1] Gegenüberstellung zu 127,4 l ausfliegbar mit `remainingFuelL` und `exceedsUsableFuel` bei `totalL >= usableFuelL` (FR-016) in `packages/deelk-poh-core/src/fuel/fuelPlan.ts`
- [ ] T025 [US1] Hinweise ohne Abbruch erzeugen: fehlende Reserve, Sinkflug und Ausweichflugplatz (FR-018), Temperaturkorrektur abweichend von Anmerkung 2 (FR-019), Anmerkung 4 bei über 75 % Last, Geltung der Steigflugtabelle für 1043 kg, in `packages/deelk-poh-core/src/fuel/advisories.ts`
- [ ] T026 [US1] `computeFuelPlan` und die zugehörigen Typen exportieren in `packages/deelk-poh-core/src/index.ts`
- [ ] T027 [US1] Test gegen den Sollwert aus T008 mit fest hinterlegten Erwartungswerten, plus Test, dass ein Zwischenwert zwischen den Ergebnissen der beiden Nachbarstützstellen liegt (SC-005, FR-003), in `packages/deelk-poh-core/tests/fuel/fuelPlan.test.ts`
- [ ] T028 [P] [US1] Tests der Abbruchfälle: Strecke kürzer als die Steigflugstrecke (V-05), Gegenwind größer als die KTAS (V-06), sowie zweimal dieselbe Eingabe liefert bitgleich dasselbe Ergebnis (Prinzip I), in `packages/deelk-poh-core/tests/fuel/edge-cases.test.ts`
- [ ] T029 [US1] Eingabemaske mit den sechs Feldern aus `data-model.md`, deren Auswahllisten aus `getFuelPlanInputDomain()` stammen, in `apps/web/src/routes/+page.svelte`
- [ ] T030 [US1] Ergebnisdarstellung mit aufgeschlüsseltem Bedarf, Gesamtsumme, Gegenüberstellung zur ausfliegbaren Menge, Hinweisen und Fehlermeldungen wortgleich aus dem Kern, ohne eigene Rechen- oder Rundungslogik (Prinzip IV, C-02, C-03), in `apps/web/src/lib/components/FuelResult.svelte`

**Checkpoint**: Das Feature ist als MVP nutzbar — ein Pilot bekommt eine Zahl, die
gegen den Handsollwert stimmt.

---

## Phase 4: User Story 2 — Zwischenwerte des Rechenwegs einsehen (Priority: P2)

**Goal**: Der Pilot sieht jeden Rechenschritt mit Eingangswerten, Ergebnis und
einer Erläuterung, damit er die Rechnung gegen das Handbuch nachvollziehen kann.

**Independent Test**: Prüfen, dass jede Ausgabe die dreizehn Schritte der
Schrittfolge aus `data-model.md` enthält — unabhängig vom konkreten Zahlenwert.

- [ ] T031 [US2] Jede Rechenfunktion gibt statt eines nackten Werts einen `CalculationStep` mit `id`, `label`, `inputs`, `result` und `explanation` zurück, in `packages/deelk-poh-core/src/fuel/climb.ts` und `packages/deelk-poh-core/src/fuel/cruise.ts`
- [ ] T032 [US2] Die dreizehn Schritte von `startup.taxiTakeoff` bis `total.usableFuelComparison` in der in `data-model.md` festgelegten Reihenfolge als `result.steps` zusammenführen (FR-017) in `packages/deelk-poh-core/src/fuel/fuelPlan.ts`
- [ ] T033 [US2] Test, dass `result.steps` genau die dreizehn erwarteten `id` in der festgelegten Reihenfolge enthält und jeder Schritt eine nichtleere `explanation` trägt, in `packages/deelk-poh-core/tests/fuel/steps.test.ts`
- [ ] T034 [P] [US2] Darstellung der Schrittfolge als aufklappbarer Rechenweg mit Eingangswerten, Ergebnis und Erläuterung je Schritt in `apps/web/src/lib/components/CalculationSteps.svelte`
- [ ] T035 [US2] Rechenweg in die Ergebnisseite einbinden in `apps/web/src/lib/components/FuelResult.svelte`

**Checkpoint**: Der Rechenweg ist von Hand nachvollziehbar.

---

## Phase 5: User Story 3 — Nachvollziehbarkeit und Prüfhinweis (Priority: P2)

**Goal**: Zu jedem Ergebnis sind Seitenzahl und Tabellenname jeder verwendeten
Tabelle, die abgelesenen Eckwerte und der Prüfhinweis sichtbar
(Constitution-Prinzip I).

**Independent Test**: Prüfen, dass jede Ausgabe Quellenreferenzen und Prüfhinweis
enthält — unabhängig vom konkreten Zahlenwert.

- [ ] T036 [US3] Jeder Schritt, der einen Tabellenwert verwendet, führt seine `anchors` und deren `sources` mit; rein rechnerische Schritte tragen eine leere Eckwertliste, in `packages/deelk-poh-core/src/fuel/climb.ts` und `packages/deelk-poh-core/src/fuel/cruise.ts`
- [ ] T037 [US3] `result.sources` als deduplizierte Liste aller verwendeten `SourceReference` und `result.preflightCheckNotice` im Kern erzeugen, nicht in den Adaptern (FR-005, FR-006, C-02), in `packages/deelk-poh-core/src/fuel/fuelPlan.ts`
- [ ] T038 [P] [US3] `listTables()` mit Quellenreferenzen und den `source_anomalies` je Tabelle in `packages/deelk-poh-core/src/tables.ts`, exportiert über `packages/deelk-poh-core/src/index.ts`
- [ ] T039 [US3] Test, dass jeder tabellengestützte Schritt mindestens einen `TableAnchor` mit Seitenzahl und Tabellenname trägt und `preflightCheckNotice` nie leer ist (SC-002), in `packages/deelk-poh-core/tests/citations.test.ts`
- [ ] T040 [P] [US3] Darstellung der Quellenangaben (Seitenzahl, Abbildung, Tabellenname) und des Prüfhinweises in `apps/web/src/lib/components/SourceCitations.svelte`
- [ ] T041 [US3] Quellenangaben und Prüfhinweis in die Ergebnisseite einbinden, sodass sie ohne Aufklappen sichtbar sind, in `apps/web/src/lib/components/FuelResult.svelte`
- [ ] T042 [P] [US3] Übersichtsseite der digitalisierten Tabellen aus `listTables()`, inklusive des vermerkten Vy-Widerspruchs, in `apps/web/src/routes/tabellen/+page.svelte`

**Checkpoint**: Alle drei User Stories sind umgesetzt; die Web-Oberfläche erfüllt
die Spec vollständig.

---

## Phase 6: Zweiter Zugangsweg — MCP-Adapter

**Zweck**: Constitution-Prinzip IV verlangt mehrere Zugangswege über denselben
Kern. Diese Phase gehört zu keiner einzelnen User Story, sondern macht alle drei
über ein Sprachmodell zugänglich.

- [ ] T043 Paketgerüst des MCP-Servers mit `@modelcontextprotocol/sdk` und stdio-Transport in `apps/mcp/package.json` und `apps/mcp/src/server.ts`
- [ ] T044 Werkzeug `compute_fuel_plan`, dessen JSON-Schema aus `getFuelPlanInputDomain()` erzeugt wird statt doppelt gepflegt zu werden, in `apps/mcp/src/tools/computeFuelPlan.ts`
- [ ] T045 Antwort als strukturierter Inhalt und als lesbare Zusammenfassung, beide mit den Quellenangaben und dem Prüfhinweis wortgleich aus dem Kern (M-01), in `apps/mcp/src/tools/computeFuelPlan.ts`
- [ ] T046 `PohCalculationError` als Werkzeugfehler ohne jeden Zahlenwert zurückgeben, damit das Modell nichts zum Weiterrechnen erhält, in `apps/mcp/src/tools/computeFuelPlan.ts`
- [ ] T047 [P] Werkzeug `list_poh_tables` für den Tabellenkatalog, ohne Rohtabellenzeilen herauszugeben (M-03), in `apps/mcp/src/tools/listPohTables.ts`
- [ ] T048 Test, dass dieselbe Eingabe über den MCP-Adapter dasselbe Zahlenergebnis liefert wie der direkte Kernaufruf und dass kein Werkzeug Rohtabellen ausgibt (M-02, M-03), in `apps/mcp/tests/parity.test.ts`

**Checkpoint**: Beide Zugangswege liefern identische Zahlen.

---

## Phase 7: Polish und übergreifende Belange

- [ ] T049 Fehlerhaften Prüfbefehl korrigieren: `verify_d_eelk.py` verlangt `--pdf`, in `specs/001-kraftstoffrechner-d-eelk/quickstart.md`
- [ ] T050 [P] Test, dass der Kern nichts aus SvelteKit, dem MCP-SDK, `node:fs` oder dem DOM importiert (C-01), in `packages/deelk-poh-core/tests/contract.test.ts`
- [ ] T051 [P] Test, dass die Rundung ausschließlich in `format.ts` stattfindet und kein Adapter nachrundet (C-03), in `packages/deelk-poh-core/tests/contract.test.ts`
- [ ] T052 GitHub-Actions-Workflow: Installation, Lint, Tests beider Workspaces und Bau des statischen Bundles in `.github/workflows/ci.yml`
- [ ] T053 [P] Veröffentlichung des statischen Bundles auf GitHub Pages in `.github/workflows/pages.yml`
- [ ] T054 [P] Bau- und Startanleitung sowie Eintrag des MCP-Servers in ein MCP-fähiges Werkzeug in `README.md`
- [ ] T055 Die manuellen Prüfungen aus `quickstart.md` durchgehen und die Ergebnisse festhalten
- [ ] T056 Offene Checklistenpunkte durchgehen und die erledigten abhaken in `specs/001-kraftstoffrechner-d-eelk/checklists/`

---

## Abhängigkeiten

```text
Phase 1 (Setup)
   └─> Phase 2 (Foundational)  ← T008 zwingend vor jeder Implementierung
          ├─> Phase 3 (US1, P1)  ← MVP
          │      ├─> Phase 4 (US2, P2)
          │      └─> Phase 5 (US3, P2)
          └─> Phase 6 (MCP)  ← benötigt Phase 3, profitiert von 4 und 5
                 └─> Phase 7 (Polish)
```

- **US1** hängt nur von der Foundational-Phase ab und ist allein auslieferbar.
- **US2** und **US3** setzen auf der Schrittfolge aus US1 auf, sind aber
  untereinander unabhängig und können parallel bearbeitet werden.
- **Phase 6** braucht `computeFuelPlan` aus US1; die Zusicherungen M-01 und M-02
  lassen sich erst nach US3 vollständig prüfen.

## Parallel ausführbar

- **Phase 1**: T002, T003, T004, T006, T007
- **Phase 2**: T009, T010, T013 sowie die Tests T016, T017, T018
- **Phase 3**: T021 parallel zu T019/T020 (andere Datei), T028 parallel zu T027
- **Phase 4 und 5**: können nach Abschluss von Phase 3 von zwei Personen parallel
  bearbeitet werden; einzige Berührung ist `FuelResult.svelte` (T035 und T041),
  das nacheinander zu ändern ist
- **Phase 7**: T050, T051, T053, T054

## Umsetzungsstrategie

**MVP**: Phasen 1 bis 3. Damit rechnet das Feature korrekt und ist über die
Web-Oberfläche nutzbar.

**Nicht freigabefähig vor Phase 5**: Ohne Quellenangaben und Prüfhinweis verstößt
das Ergebnis gegen Constitution-Prinzip I. Der MVP darf daher intern getestet,
aber nicht als benutzbares Werkzeug bereitgestellt werden.

**Reihenfolge der Auslieferung**: Phase 3 → Phase 5 (Freigabefähigkeit) → Phase 4
(Nachvollziehbarkeit im Detail) → Phase 6 (zweiter Zugangsweg) → Phase 7.
