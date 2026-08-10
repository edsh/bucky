---

description: "Aufgabenliste für Feature 023"
---

# Tasks: Roll- und Startstrecke mit neuem Seitenaufbau

**Input**: Entwurfsartefakte aus `/specs/023-start-und-rollstrecke/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/,
quickstart.md

**Tests**: Ja. Die Startstrecke ist der Wert, bei dem ein zu optimistisches
Ergebnis unmittelbar am Bahnende endet; Prinzip I verlangt, dass er gegen das
Handbuch nachprüfbar ist. Die Sollwerte werden aus der digitalisierten Tabelle
gelesen, nicht abgeschrieben.

## Format: `[ID] [P?] [Story] Beschreibung`

- **[P]**: parallel ausführbar (andere Datei, keine offene Abhängigkeit)
- **[Story]**: zugehörige Nutzergeschichte (US1, US2, US3)

## Pfade

Monorepo laut plan.md: `packages/deelk-poh-core/`, `apps/web/`, `apps/mcp/`,
`tests/ui/`.

---

## Phase 1: Setup

Keine neuen Abhängigkeiten. Die Tabellendaten bleiben unverändert — die Tabelle
`5b-takeoff-distance-m-1043kg` ist seit Feature 001 digitalisiert und geprüft.

- [ ] T001 Ausgangszustand festhalten: `npm run lint`, `npm test` und `npm exec --workspace @edsh-bucky/web -- svelte-kit sync && npm run check --workspace @edsh-bucky/web` einmal grün laufen lassen, damit spätere Fehlschläge diesem Feature zuzuordnen sind
- [ ] T002 In `packages/deelk-poh-core/tests/takeoff/` und `packages/deelk-poh-core/tests/atmosphere/` die Testordner anlegen, damit die neuen Dateien der bestehenden Ordnerstruktur folgen

---

## Phase 2: Foundational — blockierend für alle Geschichten

Vier Bausteine fehlen im Kern, bevor die Startstrecke überhaupt gerechnet
werden kann. Sie sind bewusst außerhalb des Fachmoduls angesiedelt (siehe
research.md R1, R2, R5).

- [ ] T003 In `packages/deelk-poh-core/src/interpolate.ts` die Funktion `interpolateGrid` mit dem Typ `GridInterpolationQuery` (zwei Achsen: je `key`, `value`, `unit`, `field`) und `GridInterpolationResult` (`values`, `anchors`, `fraction`, `secondaryFraction`) ergänzen; sie klammert die erste Achse über deren vorkommende Werte ein und ruft für jeden Nachbarn das bestehende `interpolate` entlang der zweiten Achse auf, mit der ersten als `where` — so bleibt genau eine Interpolationsstelle im Kern (research.md R1)
- [ ] T004 In derselben Datei sicherstellen, dass `interpolateGrid` alle berührten Stützwerte als `anchors` durchreicht (vier bei zwei Zwischenwerten, zwei bei einer getroffenen Achse, einer bei beiden) und dass jeder `anchor` **beide** Achsenwerte in `at` trägt; im Kommentar festhalten, dass das nicht gleichabständige Temperaturraster deshalb von selbst richtig behandelt wird
- [ ] T005 [P] Neue Datei `packages/deelk-poh-core/src/atmosphere/temperature.ts` mit `toOutsideAirTemperature(pressureAltitudeFt, isaDeviationC)` und dem Ergebnistyp `OutsideAirTemperatureResult` laut data-model.md; sie nutzt `T0_K` und `LAPSE_RATE_K_PER_FT` aus `pressureAltitude.ts` (dort exportieren, nicht kopieren), prüft **keinen** Tabellenbereich, rundet nicht (C-03) und verweist auf `ICAO_STANDARD_ATMOSPHERE_SOURCE`
- [ ] T006 [P] In `packages/deelk-poh-core/src/format.ts` die Funktion `formatMetres` ergänzen — ganze Meter über `formatQuantity(value, 0, 'm')`, damit die Rundung dort bleibt, wo C-03 sie erwartet
- [ ] T007 In `packages/deelk-poh-core/src/errors.ts` die Hilfsfunktion `outsideAirTemperatureOutOfRange` ergänzen, nach dem Vorbild von `pressureAltitudeOutOfRange`: Sie nennt die errechnete Temperatur, den zulässigen Bereich **und** beide Ursachen (Druckhöhe und ISA-Abweichung), weil die beanstandete Größe keine Eingabe ist
- [ ] T008 In `packages/deelk-poh-core/src/fuel/input.ts` die Signatur von `checkRange` auf einen freien Feldnamen (`string`) erweitern, damit auch die Felder der Startstrecke geprüft werden können, ohne `FlightPlanInput` künstlich zu erweitern; bestehende Aufrufer bleiben unverändert
- [ ] T009 [P] In `packages/deelk-poh-core/tests/interpolate.test.ts` die bilinearen Fälle ergänzen: exakter Treffer beider Achsen gibt den gedruckten Wert und genau einen `anchor`; ein Zwischenwert auf einer Achse gibt zwei; zwei Zwischenwerte geben vier; außerhalb des Rasters wird geworfen statt extrapoliert
- [ ] T010 [P] Neue Datei `packages/deelk-poh-core/tests/atmosphere/temperature.test.ts`: 0 ft ergibt 15 °C, 971 ft ergibt 13,1 °C, 10 000 ft ergibt rund −4,8 °C; die ISA-Abweichung wird unverändert aufgeschlagen; die Quelle trägt `kind: 'standard'` und keine Seitenzahl

---

## Phase 3: Nutzergeschichte 1 — Erfahren, wieviel Bahn der Start braucht (P1)

**Ziel**: Zu Platzhöhe, Luftdruck und Temperatur stehen Startlauf und Strecke
über das 15-m-Hindernis zur Verfügung — aus Abb. 5-1a interpoliert, ohne
Streckenlänge.

**Unabhängiger Test**: `computeTakeoffDistance` an Stützstellen der Tabelle
aufrufen und mit der Tabellenzeile vergleichen; danach einen Zwischenwert auf
Lage zwischen den Nachbarn prüfen.

### Kern

- [ ] T011 [US1] Neue Datei `packages/deelk-poh-core/src/takeoff/input.ts` mit dem Eingabetyp `TakeoffDistanceInput`, dem Zod-Schema und `TAKEOFF_INPUT_DOMAIN` laut data-model.md; die Bereiche für Druckhöhe (0–10 000 ft) und Temperatur (−20–50 °C) werden aus dem Tabellenraster **abgeleitet**, nicht als Literale hingeschrieben, damit sie einer geänderten Digitalisierung folgen
- [ ] T012 [US1] In derselben Datei festhalten und im Kommentar begründen, dass `TAKEOFF_INPUT_DOMAIN` **neben** `INPUT_DOMAIN` steht und dieses nicht verengt: Der Kraftstoffbedarf bleibt über den gesamten bisherigen Reglerbereich rechenbar (FR-020, research.md R4)
- [ ] T013 [US1] Neue Datei `packages/deelk-poh-core/src/takeoff/takeoffDistance.ts` mit `computeTakeoffDistance` und dem Ergebnistyp `TakeoffDistanceResult` laut data-model.md; die Funktion nimmt Druckhöhe und Umgebungstemperatur als **fertige Ergebnisobjekte** entgegen und leitet sie nicht selbst her (FR-009)
- [ ] T014 [US1] In derselben Datei die Eingabeprüfung in dieser Reihenfolge: Zod (`INVALID_INPUT`), dann Druckhöhe gegen den Tabellenrand (`pressureAltitudeOutOfRange`), dann Umgebungstemperatur (`outsideAirTemperatureOutOfRange`), zuletzt die Windkomponente — damit die Meldung die tatsächliche Ursache benennt und nicht die zuerst auffällige
- [ ] T015 [US1] In derselben Datei das Nachschlagen über `interpolateGrid` mit den Achsen `pressure_altitude_ft` und `oat_c` und den Spalten `ground_roll` und `over_obstacle`; `obstacleLabel` aus der Tabellendatei übernehmen, nicht im Code formulieren
- [ ] T016 [US1] In derselben Datei die Rechenschritte `takeoff-pressure-altitude`, `takeoff-outside-air-temperature` und `takeoff-table-lookup` laut data-model.md erzeugen — die ersten beiden aus den durchgereichten Ergebnisobjekten, der dritte mit bis zu vier Stützwerten
- [ ] T017 [US1] In derselben Datei `source` aus `getSourceReference`, `conditions` über `getTableCondition` und `preflightCheckNotice` aus `fuel/fuelPlan.ts` übernehmen, sodass Abbildungsnummer, Tabellenname, die Seiten 5b-2 und 5b-3 und der Prüfhinweis am Ergebnis hängen (FR-010)
- [ ] T018 [US1] `computeTakeoffDistance`, `toOutsideAirTemperature`, `interpolateGrid`, `formatMetres`, `TAKEOFF_INPUT_DOMAIN` und die zugehörigen Typen in `packages/deelk-poh-core/src/index.ts` ausführen

### Tests

- [ ] T019 [P] [US1] Neue Datei `packages/deelk-poh-core/tests/takeoff/takeoffDistance.test.ts`: über **alle 77 Zeilen** der Tabelle laufen und bei Windstille auf befestigter, trockener Bahn prüfen, dass `tableGroundRollM` und `tableOverObstacleM` exakt der Zeile entsprechen (SC-001). Die Sollwerte aus der JSON-Datei lesen, nicht abschreiben
- [ ] T020 [P] [US1] In derselben Datei die Zwischenwerte prüfen: bei einer Druckhöhe zwischen zwei Stützstellen liegen beide Werte zwischen denen der Nachbarzeilen; dasselbe für eine Temperatur zwischen zwei Stützstellen — insbesondere im Bereich −20 bis 0 °C, wo das Raster doppelt so weit ist
- [ ] T021 [P] [US1] In derselben Datei die Handprobe aus quickstart.md Abschnitt 4 festhalten: 971 ft Druckhöhe bei ISA ± 0 ergibt 207,2 m und 324,8 m, und der Schritt `takeoff-table-lookup` trägt genau vier Stützwerte (0 und 1000 ft, je 10 und 20 °C)
- [ ] T022 [P] [US1] In derselben Datei die Ränder prüfen: 12 000 ft Platzhöhe wird abgelehnt und die Meldung nennt Platzhöhe, QNH und die Grenze; ISA + 40 auf Meereshöhe ergibt 55 °C, wird abgelehnt und die Meldung nennt **beide** Ursachen (SC-005)

---

## Phase 4: Nutzergeschichte 2 — Die Zuschläge des Handbuchs nachvollziehen (P1)

**Ziel**: Wind, Grasbahn und feuchte Bahn wirken nach den Anmerkungen 2 bis 4,
jeder als eigener nachrechenbarer Schritt, mit dem Wortlaut des Handbuchs
daneben.

**Unabhängiger Test**: Die Schalter einzeln und gemeinsam umlegen und prüfen,
dass sich das Ergebnis um den jeweils ausgewiesenen Betrag ändert.

### Kern

- [ ] T023 [US2] In `packages/deelk-poh-core/src/takeoff/takeoffDistance.ts` den Windzuschlag nach Anmerkung 2 ergänzen: anteilig 10 % je 9 kt Gegenwind, 10 % je 2 kt Rückenwind, auf **beide** Werte; im Kommentar begründen, warum Stufen addiert und nicht multipliziert werden (18 kt ergeben 20 %, nicht 19 %)
- [ ] T024 [US2] In derselben Datei den Deckel der Gegenwindgutschrift bei 50 % ergänzen und über `windAdjustmentCapped` ausweisen, damit kein Wind eine Startstrecke gegen null rechnet (FR-004a); die Grenze erscheint im Rechenschritt
- [ ] T025 [US2] In derselben Datei Rückenwind über 10 kt mit `OUT_OF_RANGE` ablehnen, mit Verweis auf die Grenze in Anmerkung 2 — statt den Zuschlag fortzuschreiben (FR-004b)
- [ ] T026 [US2] In derselben Datei den Bahnzuschlag nach den Anmerkungen 3 und 4 ergänzen: `surfaceAllowancePct` additiv (15, 20 oder 35), daraus `surfaceAllowanceM` als Anteil **des windkorrigierten Startlaufs**, und dieser Betrag auf **beide** Werte; im Kommentar begründen, warum additiv statt 1,15 × 1,20 (data-model.md, Regeln der Zuschläge)
- [ ] T027 [US2] In derselben Datei die Schritte `takeoff-wind-adjustment` und `takeoff-surface-allowance` erzeugen, getrennt nach Anmerkung 3 und 4 ausgewiesen; beide entfallen, wenn nichts anzuwenden ist
- [ ] T028 [US2] In derselben Datei `isMinimumValue` bei gesetztem Zuschlag nach Anmerkung 4 setzen und einen `Advisory` ergänzen, der auf den Mindestwert hinweist (FR-006a)
- [ ] T029 [US2] In derselben Datei die vier Anmerkungen über `getTableNote` im Wortlaut als `notes` übernehmen, mit der Quellenangabe zu Seite 5b-2 — nicht im Code formuliert (FR-016)

### Tests

- [ ] T030 [P] [US2] In `packages/deelk-poh-core/tests/takeoff/takeoffDistance.test.ts` die Handproben aus quickstart.md Abschnitt 3 prüfen: 9 kt Gegenwind ergibt 183,6/287,1 m; 5 kt Gegenwind ergibt 5,6 % Abschlag; Windstille lässt den Tabellenwert unverändert; 6 kt Rückenwind ergibt 265,2/414,7 m
- [ ] T031 [P] [US2] In derselben Datei die Bahnzuschläge prüfen: Grasbahn allein ergibt 234,6/349,6 m — auf **beide** Werte dieselben 30,6 m; beide Schalter ergeben 275,4/390,4 m und **nicht** 281,5 m, und `isMinimumValue` ist gesetzt
- [ ] T032 [P] [US2] In derselben Datei die Reihenfolge festhalten: bei 9 kt Gegenwind **und** Grasbahn bezieht sich der Bahnzuschlag auf den windkorrigierten Startlauf (15 % von 183,6, nicht von 204) — der Test schlägt fehl, sollte jemand die Reihenfolge künftig umstellen
- [ ] T033 [P] [US2] In derselben Datei die Windränder prüfen: 50 kt Gegenwind bleibt bei 50 % Gutschrift stehen und setzt `windAdjustmentCapped`; 15 kt Rückenwind wird abgelehnt und die Meldung nennt die Grenze aus Anmerkung 2
- [ ] T034 [P] [US2] In derselben Datei prüfen, dass `notes` wörtlich den vier Anmerkungen der Tabellendatei entspricht und `conditions` die Bedingungen führt, unter denen die Tabelle gilt — beides aus der JSON-Datei gelesen

---

## Phase 5: Nutzergeschichte 3 — Start und Strecke in einem Blick (P2)

**Ziel**: Die Startstrecke steht neben dem Kraftstoffbedarf, im Hochformat
darüber; die Eingabefelder folgen dem Gedankengang.

**Unabhängiger Test**: Die Seite in schmaler und breiter Darstellung öffnen und
Anordnung, Erreichbarkeit und fehlendes waagerechtes Scrollen prüfen.

### Oberfläche

- [ ] T035 [P] [US3] Neue Komponente `apps/web/src/lib/components/SurfaceSwitch.svelte`: ein Schalter, dessen Beschriftung den **Bahnzustand** benennt und nicht die Nummer der Anmerkung, mit zugänglicher Bezeichnung und sichtbarem Fokus (FR-018)
- [ ] T036 [US3] Neue Komponente `apps/web/src/lib/components/TakeoffDistance.svelte`: Ergebnistabelle mit Startlauf und Strecke über das 15-m-Hindernis, im Aufbau wie „Kraftstoffbedarf und Geschwindigkeiten" (FR-019); Werte über `formatMetres` und `formatPercent` des Kerns, kein eigenes Runden (C-03)
- [ ] T037 [US3] In derselben Komponente die angewandte Windrechnung wiederholen, obwohl der Wert oben eingegeben wird, damit sie ohne Blickwechsel nachvollziehbar ist (FR-017), dazu die Kennzeichnung als Mindestwert bei gesetztem Zuschlag nach Anmerkung 4
- [ ] T038 [US3] In derselben Komponente die vier Anmerkungen im Wortlaut mit Seitenangabe 5b-2, die Bedingungen der Tabelle sowie Abbildungsnummer, Tabellenname, Seiten und Prüfhinweis zeigen (FR-016, FR-010)
- [ ] T039 [US3] In derselben Komponente den Fehlerfall: liegt statt eines Ergebnisses eine Meldung vor, wird diese wortgleich gezeigt und kein Wert (FR-011)
- [ ] T040 [US3] In `apps/web/src/routes/+page.svelte` die Überschrift „Start und Streckenflug" über dem Fieldset ergänzen und dieses in „Platzhöhe und Windkomponente" umbenennen, sodass es genau diese beiden Eingabefelder enthält (FR-012, FR-013)
- [ ] T041 [US3] In derselben Datei das Eingabefeld „Streckenlänge" in den Bereich „Kraftstoffbedarf und Geschwindigkeiten" verschieben, weil es erst ab dort gebraucht wird (FR-014); die Bedienreihenfolge mit der Tastatur muss der sichtbaren Anordnung folgen
- [ ] T042 [US3] In derselben Datei die Startstrecke über einen eigenen `$derived`-Aufruf speisen, getrennt und gekapselt nach dem Muster `{ wert, fehler }`, damit beide Bereiche unabhängig voneinander bestehen bleiben (FR-020, research.md R7)
- [ ] T043 [US3] In derselben Datei die beiden Bahnschalter als Zustand führen und die Schnellwahl „EDSH" so erweitern, dass sie neben der Platzhöhe auch den Schalter für trockene Grasbahn setzt; der Schalter bleibt danach frei wählbar, und ein späteres Verstellen der Platzhöhe setzt ihn **nicht** zurück (FR-023)
- [ ] T044 [US3] In derselben Datei den zweispaltigen Bereich anlegen: `@media (min-width: 40rem) and (orientation: landscape)`, im Hochformat untereinander mit der Startstrecke zuerst (FR-015); im Kommentar begründen, warum eine reine Breitenabfrage nicht genügt (667 px gegen 1032 px, research.md R3)
- [ ] T045 [US3] In derselben Datei `main { max-width }` **innerhalb** derselben Medienabfrage von 48 rem auf 64 rem anheben, damit die zwei Spalten nicht in 768 px stehen; der einspaltige Fall bleibt unverändert

### Klickpfad

- [ ] T046 [US3] In `tests/ui/klickpfad.mjs` die Hilfsfunktion zum Ausfüllen an die neue Gliederung anpassen und die erwarteten Reglergrenzen unverändert bestätigen
- [ ] T047 [US3] Prüfung ergänzen: die Überschrift „Start und Streckenflug" steht über dem Fieldset „Platzhöhe und Windkomponente", das genau zwei Eingabefelder enthält, und „Streckenlänge" steht beim Kraftstoffbedarf (FR-012 bis FR-014)
- [ ] T048 [US3] Prüfung ergänzen: die Startstrecke zeigt beide Werte, die vier Anmerkungen im Wortlaut mit Seitenangabe 5b-2 und eine Quellenangabe mit Seitenzahl (FR-016, SC-004)
- [ ] T049 [US3] Prüfung ergänzen: die Schnellwahl „EDSH" setzt Platzhöhe auf 971 ft **und** den Grasschalter auf ein; danach die Platzhöhe verstellen lässt den Schalter stehen (FR-023)
- [ ] T050 [US3] Prüfung ergänzen: 15 kt Rückenwind zeigt bei der Startstrecke die Meldung des Kerns, während der Kraftstoffbedarf weiterhin sein Ergebnis zeigt (FR-020)
- [ ] T051 [US3] Prüfung ergänzen: auf 390 px Breite entsteht kein waagerechtes Scrollen und alle Bedienelemente sind erreichbar (SC-006, FR-021)
- [ ] T052 [US3] Prüfung ergänzen: bei 844 × 390 stehen beide Bereiche nebeneinander, bei 1024 × 1366 untereinander mit der Startstrecke zuerst — der Fall, an dem eine reine Breitenabfrage scheitern würde (quickstart.md Abschnitt 9)

---

## Phase 6: Polish und übergreifende Belange

### MCP-Adapter

- [ ] T053 [P] Neue Datei `apps/mcp/src/tools/computeTakeoffDistance.ts`: eigenes Werkzeug neben `computeFuelPlan`, das Platzhöhe, QNH, ISA-Abweichung, Windkomponente und die beiden Bahnschalter entgegennimmt, die Atmosphärengrößen über die Kernfunktionen bildet und das Ergebnis samt Rechenschritten, Quellenangabe, den vier Anmerkungen und dem Prüfhinweis ausgibt (FR-022)
- [ ] T054 In `apps/mcp/src/server.ts` das neue Werkzeug anmelden, mit einer Beschreibung, die es vom Kraftstoffbedarf unterscheidet
- [ ] T055 [P] In `apps/mcp/tests/parity.test.ts` prüfen, dass das Werkzeug zu denselben Eingaben feldgleiche Werte liefert wie der unmittelbare Kernaufruf, einschließlich Quellenangabe und Prüfhinweis (SC-007)

### Vertragsprüfungen

- [ ] T056 In `packages/deelk-poh-core/tests/contract.test.ts` die Zusicherung C-07 ergänzen: kein Adapter enthält die Spaltennamen `ground_roll` oder `over_obstacle`, und keiner führt 15, 20 oder 35 als Prozentsatz eines Zuschlags — sonst könnte er die Anmerkungen irgendwann anders anwenden als der Kern
- [ ] T057 In `packages/deelk-poh-core/tests/fuel/steps.test.ts` die dort geführte Liste der Schritt-Kennungen prüfen und, falls die Startstrecke in den Rechenweg des Gesamtergebnisses eingeht, um die neuen Kennungen ergänzen; andernfalls im Test festhalten, dass sie bewusst getrennt bleibt
- [ ] T058 Bestätigen, dass C-01 und C-03 für die neuen Kerndateien und C-04 für die neuen Adapterdateien unverändert bestehen — insbesondere, dass `takeoff/` weder `Math.round` noch `.toFixed(` enthält

### Dokumentation

- [ ] T059 [P] In `README.md` einen Abschnitt zur Startstrecke ergänzen: was sie umfasst, unter welchen Bedingungen die Tabelle gilt und warum die Anmerkungen 3 und 4 additiv wirken
- [ ] T060 [P] In `apps/web/src/routes/tabellen/+page.svelte` die nun genutzte Tabelle Abb. 5-1a aufnehmen und den Unterschied zwischen Startlauf und Strecke über das Hindernis erklären

### Abschluss

- [ ] T061 Alle Zahlen aus quickstart.md Abschnitt 2 bis 4 gegen die Umsetzung nachrechnen und bestätigen
- [ ] T062 Vollprüfung: `npm run lint`, `npx tsc -p packages/deelk-poh-core/tsconfig.json`, `npx tsc -p apps/mcp/tsconfig.json`, `npm exec --workspace @edsh-bucky/web -- svelte-kit sync && npm run check --workspace @edsh-bucky/web`, `npm test`, `npm run build`
- [ ] T063 Klickpfad vollständig laufen lassen; alle Prüfungen müssen bestehen
- [ ] T064 `python3 tools/poh/verify_d_eelk.py ~/Downloads/FHB-C-172N-P-2-7.pdf` laufen lassen; das Ergebnis muss unverändert 2619 Prüfungen ohne Abweichung melden, weil dieses Feature keine Tabellendaten ändert

---

## Abhängigkeiten

```text
Phase 1 (T001–T002)
  └─ Phase 2 (T003–T010)   blockierend: Interpolation, Temperatur, Meldung, Format
       └─ Phase 3 US1 (T011–T022)   der Tabellenwert
            └─ Phase 4 US2 (T023–T034)   die Zuschläge darauf
                 └─ Phase 5 US3 (T035–T052)   die Oberfläche
                      └─ Phase 6 (T053–T064)
```

Innerhalb von Phase 3 sind T013–T018 streng nacheinander (dieselbe Datei);
T019–T022 laufen parallel dazu, sobald T018 steht. Dasselbe gilt in Phase 4 für
T023–T029 gegenüber T030–T034.

T044 und T045 gehören in dieselbe Medienabfrage und werden zusammen umgesetzt.

## Parallel ausführbar

- T005, T006 und T009, T010 — verschiedene Dateien ohne gemeinsame Abhängigkeit
- T019–T022 — dieselbe neue Testdatei, aber unabhängige Fälle
- T030–T034 — ebenso
- T035 gegenüber T036–T039 — eigene Komponentendatei
- T053 und T055 — Adapter und dessen Test
- T059 und T060 — verschiedene Dokumente

## Umsetzungsstrategie

**Kleinster brauchbarer Stand (MVP)**: Phase 1 bis 3. Danach liefert der Kern
den Tabellenwert nachprüfbar an allen 77 Stützstellen; die Oberfläche zeigt ihn
noch nicht.

**Zweiter Schnitt**: Phase 4 — erst hier wird das Ergebnis für einen echten
Platz brauchbar. Der reine Tabellenwert gilt für befestigte, trockene Bahn bei
Windstille; in EDSH trifft davon nichts zu.

**Dritter Schnitt**: Phase 5 — die Oberfläche. Erst hier wird das Feature für
den Piloten sichtbar.

**Nicht verhandelbar vor dem Abschluss**: T032, T056 und T064. Der erste hält
die Reihenfolge der Zuschläge fest, der zweite die Trennung zwischen Kern und
Adapter, der dritte belegt, dass die Datengrundlage unberührt blieb.
