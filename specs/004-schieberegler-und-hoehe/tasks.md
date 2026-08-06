---

description: "Aufgabenliste für Feature 004"
---

# Tasks: Schieberegler und Höhe ASL statt Druckhöhe

**Input**: Entwurfsartefakte aus `/specs/004-schieberegler-und-hoehe/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Ja. Feature 001 hat eine Vertrags- und Sollwertprüfung etabliert, und
die Constitution verlangt für sicherheitskritische Rechenwege nachprüfbare
Ergebnisse (Prinzip I). Tests sind hier deshalb kein Zusatz, sondern Teil der
Umsetzung.

## Format: `[ID] [P?] [Story] Beschreibung`

- **[P]**: parallel ausführbar (andere Datei, keine offene Abhängigkeit)
- **[Story]**: zugehörige Nutzergeschichte (US1, US2, US3)

## Pfade

Monorepo laut plan.md: `packages/deelk-poh-core/`, `apps/web/`, `apps/mcp/`,
`tests/ui/`.

---

## Phase 1: Setup

Keine neuen Abhängigkeiten, kein neues Werkzeug. Das Vorhandene wird umgebaut.

- [ ] T001 Vor Beginn den Ausgangszustand festhalten: `npx vitest run`, `npx eslint .` und `npm run check --workspace @edsh-bucky/web` einmal grün laufen lassen, damit spätere Fehlschläge diesem Feature zuzuordnen sind

---

## Phase 2: Foundational — blockierend für alle Geschichten

Diese Typänderungen brechen den Bau an vielen Stellen zugleich. Sie gehören in
einen Zug, sonst ist der Zwischenstand nicht übersetzbar.

- [ ] T002 `SourceReference` in `packages/deelk-poh-core/src/types.ts` zur unterschiedenen Vereinigung machen: `PohSourceReference` mit `kind: 'poh'` und den bisherigen Feldern, `StandardSourceReference` mit `kind: 'standard'`, `standard`, `formula`, `citation`; beide Namen zusätzlich exportieren
- [ ] T003 `NumericRange` in `packages/deelk-poh-core/src/types.ts` um das Pflichtfeld `step: number` erweitern
- [ ] T004 `InputDomain` in `packages/deelk-poh-core/src/types.ts` umbauen: `departureAltitudeFt`/`cruiseAltitudeFt` entfernen, `departureElevationFt`, `cruiseAltitudeAmslFt` und `qnhHpa` ergänzen; `powerSettingsByPressureAltitude` bleibt unverändert
- [ ] T005 In `packages/deelk-poh-core/src/tables.ts` beim Aufbau der Quellenreferenz aus den JSON-Dateien `kind: 'poh'` setzen, damit alle vorhandenen Referenzen der neuen Vereinigung genügen
- [ ] T006 Fehlerart `PRESSURE_ALTITUDE_OUT_OF_RANGE` in `packages/deelk-poh-core/src/errors.ts` zu `PohCalculationErrorKind` ergänzen und die Fehlerdetails um `qnhHpa` und `elevationFt` erweitern, damit die Meldung die Ursache nennen kann (FR-006)
- [ ] T007 Erzeugerfunktion `pressureAltitudeOutOfRange(field, pressureAltitudeFt, allowedRange, elevationFt, qnhHpa)` in `packages/deelk-poh-core/src/errors.ts` ergänzen; die Meldung nennt errechnete Druckhöhe, überschrittene Grenze, Höhe und QNH und weist darauf hin, dass in aller Regel der Luftdruck die Ursache ist, nicht die Höhe
- [ ] T008 Neue Typen und Erzeugerfunktion in `packages/deelk-poh-core/src/index.ts` exportieren

**Checkpoint**: `npx tsc -p packages/deelk-poh-core/tsconfig.json` zeigt jetzt
gezielt die Stellen, die die Umstellung noch nicht kennen. Diese Liste ist die
Arbeitsgrundlage für Phase 3.

---

## Phase 3: User Story 1 — Höhe eingeben, wie sie auf der Karte steht (P1) 🎯 MVP

**Ziel**: Der Pilot gibt Platzhöhe ASL, Reiseflughöhe ASL und QNH ein; die
Anwendung errechnet die Druckhöhe, weist sie aus und lehnt ab, wenn sie
außerhalb des Tabellenbereichs liegt.

**Unabhängiger Test**: Platzhöhe 85 ft, Reiseflughöhe 6000 ft, QNH 1013,25 →
beide Druckhöhen entsprechen den Eingaben. Bei QNH 983 liegen sie darüber. Bei
QNH 1030 erscheint kein Ergebnis, sondern die Meldung aus FR-006.

### Kern: die Umrechnung

- [ ] T009 [US1] Norm-Quellenreferenz `ICAO_STANDARD_ATMOSPHERE_SOURCE` als `StandardSourceReference` in neuer Datei `packages/deelk-poh-core/src/atmosphere/pressureAltitude.ts` anlegen: `standard` = „ICAO Doc 7488, Manual of the ICAO Standard Atmosphere, 3. Auflage 1993", `formula` im Klartext, `citation` als vollständige Angabe für die Anzeige
- [ ] T010 [US1] `toPressureAltitude(elevationFt, qnhHpa): PressureAltitudeResult` in `packages/deelk-poh-core/src/atmosphere/pressureAltitude.ts` umsetzen: `p = qnh · (1 − L·h/T₀)^5.25588`, dann `H_p = (T₀/L) · (1 − (p/1013.25)^(1/5.25588))`, mit `T₀ = 288.15 K`, `L = 0.0065 K/m`, `0.3048 m/ft`. Der zweite Exponent MUSS als `1 / 5.25588` gerechnet werden, nicht als Literal `0.190263` — sonst ist die Probe bei 18 000 ft nur auf 0,01 ft genau (research.md, Punkt 1). Nicht runden (C-03), Tabellenbereich nicht prüfen
- [ ] T011 [US1] `deviationFromRuleOfThumbFt` in derselben Datei mitliefern: Abstand zur Faustformel `elevationFt + (1013.25 − qnhHpa) · 30`, damit ein Pilot seine Überschlagsrechnung einordnen kann (FR-009)
- [ ] T012 [P] [US1] Test `packages/deelk-poh-core/tests/atmosphere/pressureAltitude.test.ts`: Probe bei QNH 1013,25 für 0, 85, 6000 und 18 000 ft auf exakte Gleichheit (SC-002); Monotonie in beide Richtungen; die vier nachgerechneten Randwerte aus research.md Punkt 4 (0 ft/1050 → −989 ft; 85 ft/1030 → −369 ft; 16 000 ft/950 → 17 578 ft; 18 000 ft/950 → 19 553 ft), je auf 1 ft gerundet verglichen
- [ ] T013 [P] [US1] Test in derselben Datei, der das gerundete Literal ausschließt: die Umrechnung bei 18 000 ft und Standarddruck muss exakt 18 000 ergeben, nicht 17 999,99
- [ ] T014 [US1] `toPressureAltitude`, `PressureAltitudeResult` und die Norm-Referenz in `packages/deelk-poh-core/src/index.ts` exportieren

### Kern: Eingabe und Rechenweg

- [ ] T015 [US1] `FlightPlanInput` in `packages/deelk-poh-core/src/fuel/input.ts` umstellen: `departureAltitudeFt`/`cruiseAltitudeFt` durch `departureElevationFt`, `cruiseAltitudeAmslFt` und `qnhHpa` ersetzen, Zod-Schema mitziehen
- [ ] T016 [US1] Bereichskonstanten in `packages/deelk-poh-core/src/fuel/input.ts` ergänzen und anpassen (research.md, Punkt 4): Platzhöhe ASL 0…10 000 ft, Reiseflughöhe ASL 0…18 000 ft, QNH 950…1050 hPa, Strecke 1…900 NM statt unendlich; jede mit `step` (10 ft, 100 ft, 1 hPa, 1 NM, 1 °C, 1 kt)
- [ ] T017 [US1] `getFuelPlanInputDomain()` in `packages/deelk-poh-core/src/fuel/input.ts` auf die neuen Felder umstellen. Die aus dem Tabellenraster abgeleitete `altitudeRange()` bleibt erhalten, dient aber nur noch der Grenzprüfung der **errechneten** Druckhöhe und wird als eigene Funktion `getPressureAltitudeRange()` exportiert
- [ ] T018 [US1] `validateFlightPlan` in `packages/deelk-poh-core/src/fuel/input.ts` umbauen: Bereichsprüfung der drei neuen Felder, Höhenverhältnis auf `cruiseAltitudeAmslFt > departureElevationFt` umstellen (data-model.md: gleichwertig, weil beide mit demselben QNH umgerechnet werden)
- [ ] T019 [US1] Die Prüfung der Lasteinstellung in `packages/deelk-poh-core/src/fuel/input.ts` arbeitet weiterhin auf der Druckhöhe. Deshalb `validateFlightPlan` so erweitern, dass es die beiden Druckhöhen errechnet, gegen `getPressureAltitudeRange()` prüft (sonst `PRESSURE_ALTITUDE_OUT_OF_RANGE`) und erst danach `checkPowerSetting` mit der errechneten Reiseflug-Druckhöhe aufruft. Die errechneten Druckhöhen als Ergebnis mitgeben, damit `computeFuelPlan` sie nicht ein zweites Mal errechnet
- [ ] T020 [US1] `packages/deelk-poh-core/src/fuel/climb.ts` auf die errechneten Druckhöhen umstellen statt auf `plan.departureAltitudeFt`/`plan.cruiseAltitudeFt`; die Beschriftungen der Schritte nennen weiterhin die Druckhöhe, weil die Tabelle damit arbeitet
- [ ] T021 [US1] `packages/deelk-poh-core/src/fuel/cruise.ts` ebenso auf die errechnete Reiseflug-Druckhöhe umstellen
- [ ] T022 [US1] Zwei neue Rechenschritte an den Anfang von `steps` in `packages/deelk-poh-core/src/fuel/fuelPlan.ts` setzen: `pressureAltitude.departure` und `pressureAltitude.cruise`, mit Höhe ASL und QNH als `inputs`, Druckhöhe und Abstand zur Faustformel als `results`, leeren `anchors` und der Norm-Referenz als `sources`. Die `explanation` nennt die Formel, die eingesetzten Werte und den Hinweis auf die Faustformel (FR-008, FR-009). Der Rechenweg wächst damit von 13 auf 15 Schritte
- [ ] T023 [US1] In `packages/deelk-poh-core/src/fuel/fuelPlan.ts` sicherstellen, dass `result.sources` die Norm-Referenz enthält, `result.preflightCheckNotice` sich aber unverändert nur auf die POH-Referenzen bezieht (Vertrag `SourceReference`, Constitution Prinzip I)

### Kern: Tests

- [ ] T024 [US1] Die Testfälle in `packages/deelk-poh-core/tests/fuel/fuelPlan.test.ts` auf die neue Eingabe umstellen. Die bestehenden Sollwerte müssen unverändert bleiben — dazu QNH 1013,25 setzen und die bisherigen Druckhöhen als Höhen ASL eintragen. Ändert sich ein Sollwert, ist das ein Fehler in der Umstellung, keine erwartete Folge
- [ ] T025 [P] [US1] Gleiche Umstellung in `packages/deelk-poh-core/tests/fuel/input.test.ts`, `steps.test.ts`, `usGallons.test.ts`, `edge-cases.test.ts` und `citations.test.ts`
- [ ] T026 [P] [US1] Test in `packages/deelk-poh-core/tests/fuel/edge-cases.test.ts` ergänzen: QNH 1030 mit Platzhöhe 85 ft wirft `PRESSURE_ALTITUDE_OUT_OF_RANGE`, und die Meldung nennt Druckhöhe, Grenze, Höhe und QNH (FR-006, SC-006)
- [ ] T027 [P] [US1] Test in derselben Datei, der FR-006a absichert: Bei einer negativen Druckhöhe darf kein Ergebnis entstehen. Dazu zusätzlich nachweisen, warum Begrenzen falsch wäre — der Steigflugverbrauch bei Platzhöhe 0 ft ist kleiner als bei einer tiefer liegenden Ausgangshöhe, weil die Tabelle ab 0 ft kumulativ ist
- [ ] T028 [P] [US1] Test in `packages/deelk-poh-core/tests/citations.test.ts` ergänzen: Jeder Schritt trägt weiterhin mindestens eine Quelle, die beiden neuen tragen `kind: 'standard'`, alle übrigen `kind: 'poh'`

### Adapter

- [ ] T029 [US1] `apps/mcp/src/tools/computeFuelPlan.ts`: Eingabeschema auf `departureElevationFt`, `cruiseAltitudeAmslFt` und `qnhHpa` umstellen, Beschreibungen aus der Domäne ziehen; die Quellenausgabe so anpassen, dass sie `kind: 'standard'` ohne Seitenzahl darstellt und den POH-Prüfhinweis nicht daneben setzt
- [ ] T030 [US1] `apps/mcp/tests/parity.test.ts` auf die neuen Felder umstellen und um einen Fall erweitern, der `PRESSURE_ALTITUDE_OUT_OF_RANGE` über den MCP-Weg auslöst
- [ ] T031 [US1] `apps/web/src/routes/+page.svelte`: Zustandsvariablen und Beschriftungen auf „Platzhöhe ASL (ft)", „Reiseflughöhe ASL (ft)" und „Luftdruck QNH (hPa)" umstellen; die Felder bleiben in diesem Schritt noch Zahlenfelder, damit sich die Umstellung getrennt von den Reglern prüfen lässt
- [ ] T032 [US1] `apps/web/src/lib/components/SourceCitations.svelte`: Norm-Referenzen darstellen — ohne Seitenzahl, ohne Ausgabe/Revision, als Norm gekennzeichnet. Der Prüfhinweis erscheint weiterhin genau einmal und bezieht sich sichtbar auf die POH-Tabellen (Vertrag web-ui.md)
- [ ] T033 [US1] `apps/web/src/lib/components/FuelResult.svelte`: zu jeder Höhe beide Werte anzeigen — eingestellte Höhe ASL und errechnete Druckhöhe, letztere als errechnet gekennzeichnet, dazu der Abstand zur Faustformel (FR-007, FR-009, SC-005)

**Checkpoint**: Der Rechner ist ohne Druckhöhe im Kopf bedienbar. Alle Tests
grün, beide Typprüfungen grün.

---

## Phase 4: User Story 2 — Zulässigen Bereich sehen, statt ihn zu erraten (P2)

**Ziel**: Jede stufenlose Eingabe ist ein Schieberegler mit Wertanzeige; Grenzen
und Schrittweite stammen aus dem Kern.

**Unabhängiger Test**: Jeden Regler an beide Enden ziehen; der angezeigte Wert
überschreitet die Grenzen aus `getFuelPlanInputDomain()` nicht.

- [ ] T034 [US2] Komponente `apps/web/src/lib/components/RangeField.svelte` anlegen: `<input type="range">` und `<output>` in einem Block, mit Beschriftung, Einheit und `min`/`max`/`step` als Eigenschaften. Keine fachlichen Grenzen, keine Vorgabewerte in der Komponente (C-05). Beschriftung über `id`/`for` mit dem Regler verknüpft, `<output for>` auf den Regler gesetzt (FR-013)
- [ ] T035 [US2] Die sechs stufenlosen Felder in `apps/web/src/routes/+page.svelte` auf `RangeField` umstellen: Platzhöhe ASL, Reiseflughöhe ASL, QNH, Streckenlänge, ISA-Abweichung, Windkomponente. Grenzen und Schrittweite ausschließlich aus `domain` beziehen
- [ ] T036 [US2] Die Lasteinstellung in `apps/web/src/routes/+page.svelte` bleibt `<select>` — das Handbuch kennt dort nur einzelne Werte, Zwischenwerte existieren fachlich nicht (FR-011). Diese Begründung als Kommentar hinterlegen, damit sie nicht später „vereinheitlicht" wird
- [ ] T037 [US2] Neuberechnung bei jeder Reglerbewegung auslösen statt erst beim Absenden, damit die Anzeige der Bewegung folgt (US2, Abnahmefall 2). Die Schaltfläche „Berechnen" entfällt oder bleibt als Auffrischung — Entscheidung im Code begründen
- [ ] T038 [US2] Prüfungen in `tests/ui/klickpfad.mjs` ergänzen: jeder Regler ist `input[type=range]`, sein `<output>` zeigt Wert und Einheit, und die Grenzen stimmen mit `getFuelPlanInputDomain()` überein (SC-003)
- [ ] T039 [US2] Prüfung in `tests/ui/klickpfad.mjs` für die Tastaturbedienung: Regler fokussieren, Pfeiltaste drücken, Wert ändert sich um genau eine Schrittweite (FR-013)

**Checkpoint**: Die Eingabe ist vollständig ohne Tippen möglich (SC-001).

---

## Phase 5: User Story 3 — Alle Eingaben auf einen Blick (P3)

**Ziel**: Die Regler liegen nebeneinander und brechen auf schmalem Bildschirm um.

**Unabhängiger Test**: Bei 1024 px stehen die Regler in mindestens zwei Spalten,
bei 390 px entsteht kein waagerechtes Scrollen.

- [ ] T040 [US3] Das Formular in `apps/web/src/routes/+page.svelte` als Raster mit `repeat(auto-fit, minmax(14rem, 1fr))` auslegen und die bisherige Breitenbegrenzung von 32 rem lösen. Die Mindestbreite von 14 rem bestimmt den Umbruch selbst; feste Haltepunkte werden nicht gesetzt (research.md, Punkt 6)
- [ ] T041 [US3] Prüfung in `tests/ui/klickpfad.mjs` ergänzen: bei 1024 px Fensterbreite liegen mindestens zwei Regler auf derselben Höhe, bei 390 px keiner (SC-004). Die bestehende Prüfung 12 auf waagerechtes Scrollen bleibt

---

## Phase 6: Polish und übergreifende Belange

- [ ] T042 [P] Vertragsprüfung C-04 in `packages/deelk-poh-core/tests/contract.test.ts` ergänzen: kein Adapter unter `apps/` enthält eine eigene Umrechnung. Am Quelltext auf `1013.25`, `5.25588`, `0.190263` und auf die Faustformel-Zahl 30 in Verbindung mit „hPa" prüfen
- [ ] T043 [P] Vertragsprüfung C-05 in `packages/deelk-poh-core/tests/contract.test.ts` ergänzen: kein Adapter setzt `min`, `max` oder `step` als Zahlenliteral an einem Eingabefeld; alle beziehen sie aus `getFuelPlanInputDomain()`
- [ ] T044 Die bestehende Prüfung 11 in `tests/ui/klickpfad.mjs` („Höhenfelder sind als Druckhöhe gekennzeichnet") umdrehen: Höhenfelder sind jetzt als ASL gekennzeichnet, die Druckhöhe erscheint ausschließlich als Ergebnis
- [ ] T045 Prüfung in `tests/ui/klickpfad.mjs` ergänzen: eine Eingabe mit QNH 1030 und niedriger Platzhöhe liefert kein Ergebnis, sondern die Meldung des Kerns, und die Meldung nennt das QNH (SC-006)
- [ ] T046 [P] `README.md` und `apps/web/src/routes/tabellen/` prüfen und dort, wo von Druckhöhe als Eingabe die Rede ist, auf Höhe ASL plus QNH umstellen; die ICAO-Norm als zusätzliche Quelle neben den POH-Tabellen benennen
- [ ] T047 [P] Qualitätscheckliste `specs/004-schieberegler-und-hoehe/checklists/requirements.md` gegen den Umsetzungsstand durchgehen und offene Punkte als Folge-Issue festhalten
- [ ] T048 `specs/004-schieberegler-und-hoehe/quickstart.md` vollständig abarbeiten und die dort genannten Ergebnisse gegen die tatsächliche Ausgabe halten
- [ ] T049 Vollständiger Durchlauf: `npx vitest run`, `npx tsc -p packages/deelk-poh-core/tsconfig.json`, `npx tsc -p apps/mcp/tsconfig.json`, `npx eslint .`, `npm run check --workspace @edsh-bucky/web`, `npm run build`
- [ ] T050 Klickpfad gegen den lokalen Bau laufen lassen: `python3 -m http.server 8899 --directory apps/web/build`, dann `node tests/ui/klickpfad.mjs`. Alle Prüfungen müssen bestehen
- [ ] T051 `python3 tools/poh/verify_d_eelk.py --pdf ~/Downloads/FHB-C-172N-P-2-7.pdf` laufen lassen. Dieses Feature ändert keine Tabellendaten; 2619 Prüfungen ohne Abweichung sind der erwartete Nachweis dafür

---

## Abhängigkeiten

```text
Phase 1 (T001)
   └─> Phase 2 Foundational (T002–T008)   ← blockiert alles Weitere
          ├─> Phase 3 US1 (T009–T033)     ← MVP
          │      └─> Phase 4 US2 (T034–T039)
          │             └─> Phase 5 US3 (T040–T041)
          └─> Phase 6 Polish (T042–T051)  ← braucht US1 bis US3
```

**Zwischen den Geschichten**: US2 setzt auf der Oberfläche aus US1 auf, weil die
Regler die neuen Felder bedienen. US3 ist reine Anordnung und setzt auf US2 auf.
Die Reihenfolge ist damit nicht bloß Priorität, sondern echte Abhängigkeit.

**Innerhalb von US1**: T009–T013 (die Umrechnung selbst) sind unabhängig von
T015–T023 (Eingabe und Rechenweg) und können vorgezogen werden. T020 und T021
hängen an T019. Die Adapteraufgaben T029–T033 setzen den fertigen Kern voraus.

## Parallel ausführbar

- **Phase 3, Tests**: T012, T013 gemeinsam; später T025, T026, T027, T028
  gemeinsam (verschiedene Dateien)
- **Phase 3, Adapter**: T032 und T033 gemeinsam (verschiedene Komponenten),
  T029 unabhängig davon
- **Phase 6**: T042, T043 gemeinsam; T046, T047 gemeinsam

## Umsetzungsstrategie

**MVP ist Phase 3 (US1).** Nach ihr rechnet die Anwendung die Druckhöhe selbst
und weist sie aus; die Oberfläche hat noch Zahlenfelder. Das ist der fachliche
Kern des Features und für sich lieferbar. US2 und US3 sind Bedienung und
Anordnung — wertvoll, aber nachgelagert.

**Bewusst getrennt**: T031 stellt die Oberfläche auf die neuen Felder um, ohne
sie schon auf Regler umzubauen. Damit lässt sich die Umrechnung prüfen, bevor
zwei Änderungen zugleich im Spiel sind. Wer beides zusammenzieht, kann bei einem
falschen Wert nicht mehr unterscheiden, ob der Regler oder die Formel schuld ist.

**Der riskanteste Punkt** ist T024: Die Sollwerte aus Feature 001 müssen die
Umstellung unverändert überstehen. Sie sind der einzige Beleg dafür, dass die
Umstellung nichts an der Rechnung selbst verschoben hat.
