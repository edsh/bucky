---

description: "Aufgabenliste für Feature 006"
---

# Tasks: Reiseleistungs-Übersicht und neue Formulargliederung

**Input**: Entwurfsartefakte aus `/specs/006-reiseleistung-uebersicht/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Ja. Die Werte gehen unmittelbar in die Flugvorbereitung ein; Prinzip I
verlangt, dass sie gegen das Handbuch nachprüfbar sind. Die Sollwerte werden
dabei aus der digitalisierten Tabelle gelesen, nicht abgeschrieben.

## Format: `[ID] [P?] [Story] Beschreibung`

- **[P]**: parallel ausführbar (andere Datei, keine offene Abhängigkeit)
- **[Story]**: zugehörige Nutzergeschichte (US1, US2, US3)

## Pfade

Monorepo laut plan.md: `packages/deelk-poh-core/`, `apps/web/`, `apps/mcp/`,
`tests/ui/`.

---

## Phase 1: Setup

Keine neuen Abhängigkeiten. Die Tabellendaten bleiben unverändert.

- [ ] T001 Ausgangszustand festhalten: `npx vitest run`, `npx eslint .` und `npm run check --workspace @edsh-bucky/web` einmal grün laufen lassen, damit spätere Fehlschläge diesem Feature zuzuordnen sind

---

## Phase 2: Foundational — blockierend für alle Geschichten

Die Prüffunktionen müssen von beiden Rechenwegen erreichbar sein, bevor die
neue Funktion entstehen kann.

- [ ] T002 In `packages/deelk-poh-core/src/fuel/input.ts` die bisher privaten Funktionen `checkPressureAltitude` und `checkPowerSetting` exportieren, ohne ihr Verhalten zu ändern; `checkPowerSetting` dabei so umstellen, dass sie statt eines vollständigen `FlightPlanInput` nur die Lasteinstellung und die Druckhöhe entgegennimmt
- [ ] T003 In `packages/deelk-poh-core/src/fuel/input.ts` die Funktion `getCruisePressureAltitudeRange()` ergänzen, die das Höhenraster allein der Reiseleistungstabelle liefert (research.md, Entscheidung 5), und im Kommentar begründen, warum die Übersicht nicht gegen den Schnitt mit der Steigflugtabelle prüft
- [ ] T004 In `packages/deelk-poh-core/src/tables.ts` eine Funktion ergänzen, die eine Bedingung der Tabelle anhand eines Stichworts im Wortlaut liefert (für „Windstille"), damit die Oberfläche den Text nicht selbst formuliert

---

## Phase 3: Nutzergeschichte 1 — Sehen, wie weit die D-EELK kommt (P1)

**Ziel**: Zu Reiseflughöhe, Luftdruck, Temperatur und Lasteinstellung stehen
Eigengeschwindigkeit, Verbrauch je Stunde, maximale Strecke und Flugdauer zur
Verfügung — aus der Tabelle, nicht gerechnet.

**Unabhängiger Test**: `computeCruiseCapability` mit Stützstellenwerten aufrufen
und mit der Tabellenzeile vergleichen.

### Kern

- [ ] T005 [US1] Neue Datei `packages/deelk-poh-core/src/fuel/cruiseCapability.ts` mit dem Eingabetyp `CruiseConditionsInput`, dem Ergebnistyp `CruiseCapability` und dem Zod-Schema für die vier Eingaben laut data-model.md
- [ ] T006 [US1] In derselben Datei die Eingabeprüfung: Bereichsprüfung für `cruiseAltitudeAmslFt`, `qnhHpa` und `isaDeviationC` gegen `getFuelPlanInputDomain()`, danach `toPressureAltitude`, dann `checkPressureAltitude` gegen `getCruisePressureAltitudeRange()` und `checkPowerSetting` — in dieser Reihenfolge, damit die Meldung die tatsächliche Ursache benennt
- [ ] T007 [US1] In derselben Datei das Nachschlagen über `interpolate` mit `axisKey: 'pressure_altitude_ft'`, `where: { power_setting_pct }` und den fünf Spalten `ktas`, `fuel_flow_lph`, `fuel_flow_usgph`, `range_nm`, `endurance_h`
- [ ] T008 [US1] In derselben Datei die Temperaturkorrektur: `ktasTemperatureFactor` aus `fuel/cruise.ts` wiederverwenden und **nur** auf `ktas` und `range_nm` anwenden; `endurance_h` bleibt unverändert (FR-003). Im Kommentar begründen, warum das stimmig ist
- [ ] T009 [US1] In derselben Datei die drei Rechenschritte `capability.pressureAltitude`, `capability.tableLookup` und `capability.temperatureCorrection` mit Eingaben, Ergebnissen, Stützwerten und Quellenangabe laut data-model.md erzeugen
- [ ] T010 [US1] In derselben Datei `inclusionsNote` aus `getTableNote(CRUISE_TABLE_ID, 2)` und `windlessNote` aus den Bedingungen der Tabelle übernehmen, dazu `preflightCheckNotice` aus `fuel/fuelPlan.ts`
- [ ] T011 [US1] `computeCruiseCapability` in `packages/deelk-poh-core/src/index.ts` ausführen, samt der Typen `CruiseConditionsInput` und `CruiseCapability`

### Tests

- [ ] T012 [P] [US1] Neue Datei `packages/deelk-poh-core/tests/fuel/cruiseCapability.test.ts`: über **alle** Zeilen der Tabelle laufen und bei `isaDeviationC: 0` und QNH 1013,25 hPa prüfen, dass `tableKtas`, `fuelFlowLph`, `fuelFlowUsGph`, `tableRangeNm` und `enduranceH` exakt der Zeile entsprechen (SC-002). Die Sollwerte aus der JSON-Datei lesen, nicht abschreiben
- [ ] T013 [P] [US1] Im selben Test die Zwischenwerte prüfen: bei einer Höhe zwischen zwei Stützstellen liegen alle fünf Werte zwischen denen der Nachbarzeilen
- [ ] T014 [P] [US1] Im selben Test die Temperaturkorrektur prüfen: bei `isaDeviationC: 20` sind `ktas` und `maxRangeNm` um genau 2 % erhöht, `enduranceH` ist unverändert; bei negativer Abweichung ist der Faktor 1
- [ ] T015 [P] [US1] Im selben Test den Fund aus research.md festhalten: `tableRangeNm` weicht von `tableKtas × enduranceH` ab (0 ft/100 %: 365 gegen 362,5). Der Test schlägt fehl, sollte jemand die Reichweite künftig doch bilden

---

## Phase 4: Nutzergeschichte 2 — Erkennen, was in den Zahlen steckt (P1)

**Ziel**: Der Hinweis aus Anmerkung 2 und die Bedingung „Windstille" stehen
untrennbar bei den Werten, ohne dass der bestehende Reserve-Hinweis verwässert.

**Unabhängiger Test**: Prüfen, dass der Wortlaut aus der Tabellendatei stammt
und im Ergebnis mitgeführt wird.

- [ ] T016 [US2] In `packages/deelk-poh-core/src/fuel/cruise.ts` den Erklärtext des Schritts `cruise.tableLookup` so ergänzen, dass er auf den neuen Schritt `capability.tableLookup` verweist: der Ausschluss gilt für die **Bedarfsrechnung**, nicht für die Auskunft (research.md, Entscheidung 8)
- [ ] T017 [US2] In `packages/deelk-poh-core/src/fuel/fuelPlan.ts` das Feld `cruiseCapability` ergänzen, aus denselben Eingaben gebildet, und die drei neuen Schritte in den Rechenweg aufnehmen
- [ ] T018 [P] [US2] In `packages/deelk-poh-core/tests/fuel/cruiseCapability.test.ts` prüfen, dass `inclusionsNote` wörtlich der Anmerkung 2 der Tabellendatei entspricht und alle vier Bestandteile nennt (4 l, Zeit, Kraftstoff und Strecke für den Steigflug, 45 min Reserve)
- [ ] T019 [P] [US2] In `packages/deelk-poh-core/tests/fuel/fuelPlan.test.ts` prüfen, dass der bestehende Erklärtext zur ausfliegbaren Menge unverändert aussagt, dass der Rest keine Reserve ist (FR-007), und dass sich keine bisherige Zahl der Bedarfsrechnung geändert hat

---

## Phase 5: Nutzergeschichte 3 — Das Formular folgt dem Gedankengang (P2)

**Ziel**: Bedingungen oben, Übersicht in der Mitte, Vorhaben unten.

**Unabhängiger Test**: Klickpfad prüft Reihenfolge und Unabhängigkeit.

### Oberfläche

- [ ] T020 [US3] Neue Komponente `apps/web/src/lib/components/CruiseCapability.svelte`: zeigt die vier Werte über die Formatierfunktionen des Kerns, darunter den Hinweis aus `inclusionsNote` und `windlessNote` sowie die Quellenangabe; rechnet und rundet nicht (C-02, C-03)
- [ ] T021 [US3] In derselben Komponente den Fehlerfall: liegt statt eines Ergebnisses eine Meldung vor, wird diese wortgleich gezeigt und kein Wert (FR-011)
- [ ] T022 [US3] In `apps/web/src/routes/+page.svelte` die Gliederung umbauen: Gruppe „Bedingungen des Reiseflugs" mit Reiseflughöhe, QNH und ISA-Abweichung samt seitlichem Leistungshebel; darunter die Übersicht; darunter Gruppe „Angaben zum Vorhaben" mit Platzhöhe, Streckenlänge und Windkomponente
- [ ] T023 [US3] In derselben Datei die Übersicht über einen eigenen `$derived`-Aufruf von `computeCruiseCapability` speisen, getrennt von der Bedarfsrechnung, damit sie bei deren Scheitern stehen bleibt (FR-009)
- [ ] T024 [US3] In derselben Datei sicherstellen, dass die Platzhöhe weiterhin ihre Druckhöhe unmittelbar darunter ausweist, obwohl das QNH nun in der anderen Gruppe steht (FR-014)
- [ ] T025 [US3] In `apps/web/src/lib/components/FuelResult.svelte` die Leistungsliste bereinigen: Eigengeschwindigkeit und Stundenverbrauch stehen nun oben in der Übersicht; im Ergebnis bleiben die Größen des konkreten Vorhabens (Geschwindigkeit über Grund, Reiseflugzeit der eingegebenen Strecke), damit nichts doppelt erscheint
- [ ] T026 [US3] Die maximale Strecke in der Übersicht so benennen, dass sie nicht mit der eingegebenen Streckenlänge verwechselt wird (FR-010)

### Klickpfad

- [ ] T027 [US3] In `tests/ui/klickpfad.mjs` die Hilfsfunktion `fuellen()` an die neue Gliederung anpassen und die erwarteten Reglergrenzen (`erwarteteGrenzen`) unverändert bestätigen
- [ ] T028 [US3] Prüfung ergänzen: die Übersicht steht im Dokument zwischen den beiden Eingabegruppen und zeigt genau vier Werte (FR-008, FR-005)
- [ ] T029 [US3] Prüfung ergänzen: der Hinweis bei der Übersicht nennt 4 l, Steigflug, 45 min Reserve und Windstille, und die Quellenangabe trägt eine Seitenzahl (SC-004, FR-013)
- [ ] T030 [US3] Prüfung ergänzen: Streckenlänge und Windkomponente verstellen lässt alle vier Werte der Übersicht unverändert, ändert aber den Kraftstoffbedarf (SC-003)
- [ ] T031 [US3] Prüfung ergänzen: der Hinweis, dass die Bedarfssumme keine Reserve enthält, steht weiterhin beim Bedarf und nicht bei der Übersicht (SC-005)
- [ ] T032 [US3] Prüfung ergänzen: Lasteinstellung 100 % bei einer Reiseflughöhe von 12 000 ft zeigt die Meldung des Kerns statt Werten und nennt die dort verfügbaren Lasteinstellungen (SC-006)

---

## Phase 6: Polish und übergreifende Belange

### MCP-Adapter

- [ ] T033 [P] In `apps/mcp/src/tools/computeFuelPlan.ts` die Übersicht in die Zusammenfassung aufnehmen, sprachlich getrennt vom ermittelten Bedarf, mit dem Hinweis im Wortlaut des Kerns
- [ ] T034 [P] In `apps/mcp/tests/parity.test.ts` prüfen, dass `computeFuelPlan(...).cruiseCapability` feldgleich mit dem unmittelbaren Aufruf von `computeCruiseCapability(...)` ist

### Vertragsprüfungen

- [ ] T035 In `packages/deelk-poh-core/tests/contract.test.ts` die Zusicherung C-06 ergänzen: kein Adapter enthält die Spaltennamen `range_nm` oder `endurance_h`
- [ ] T036 In derselben Datei die Unabhängigkeit mechanisch prüfen: `distanceNm`, `windComponentKt` und `departureElevationFt` über ihren zulässigen Bereich variieren und feststellen, dass sich kein Feld von `cruiseCapability` ändert (FR-009)

### Dokumentation

- [ ] T037 [P] In `README.md` einen Abschnitt zur Übersicht ergänzen: was sie enthält, was sie **nicht** ist, und warum sie sich nicht nachrechnen lässt
- [ ] T038 [P] In `apps/web/src/routes/tabellen/+page.svelte` die bisher ungenutzten Spalten `range_nm` und `endurance_h` erwähnen und den Unterschied zwischen maximaler Strecke und geplanter Streckenlänge erklären

### Abschluss

- [ ] T039 Quickstart-Zahlen nachrechnen und bestätigen (specs/006-reiseleistung-uebersicht/quickstart.md, Abschnitte 2)
- [ ] T040 Vollprüfung: `npx vitest run`, `npx tsc --noEmit` für Kern und MCP, `npx eslint .`, `npm run check --workspace @edsh-bucky/web`, `npm run build`
- [ ] T041 Klickpfad vollständig laufen lassen; alle Prüfungen müssen bestehen
- [ ] T042 `python3 tools/poh/verify_d_eelk.py ~/Downloads/FHB-C-172N-P-2-7.pdf` laufen lassen; das Ergebnis muss unverändert 2619 Prüfungen ohne Abweichung melden, weil dieses Feature keine Tabellendaten ändert

---

## Abhängigkeiten

```text
Phase 1 (T001)
  └─ Phase 2 (T002–T004)   blockierend
       ├─ Phase 3 US1 (T005–T015)
       │    └─ Phase 4 US2 (T016–T019)   braucht computeCruiseCapability
       │         └─ Phase 5 US3 (T020–T032)   braucht das Ergebnis im Kern
       └─ Phase 6 (T033–T042)   braucht US1 bis US3
```

Innerhalb von Phase 3 sind T005–T011 streng nacheinander (dieselbe Datei);
T012–T015 laufen parallel dazu, sobald T011 steht.

## Parallel ausführbar

- T012, T013, T014, T015 — dieselbe neue Testdatei, aber unabhängige Fälle;
  in einem Zug schreibbar
- T018 und T019 — verschiedene Testdateien
- T033 und T034 — MCP-Adapter und dessen Test
- T037 und T038 — verschiedene Dokumente

## Umsetzungsstrategie

**Kleinster brauchbarer Stand (MVP)**: Phase 1 bis 3. Danach liefert der Kern
die vier Werte nachprüfbar; die Oberfläche zeigt sie noch nicht.

**Zweiter Schnitt**: Phase 4 — die Werte hängen im Gesamtergebnis und tragen
den Wortlaut des Handbuchs mit sich. Ab hier sieht der MCP-Zugang sie bereits.

**Dritter Schnitt**: Phase 5 — die Oberfläche. Erst hier wird das Feature für
den Piloten sichtbar.

**Nicht verhandelbar vor dem Abschluss**: T035, T036 und T042. Die ersten
beiden halten die Trennung zwischen Kern und Adapter mechanisch fest, die
letzte belegt, dass die Datengrundlage unberührt blieb.
