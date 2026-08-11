---

description: "Aufgabenliste für Feature 025"
---

# Tasks: QNH für EDSH aus einem Onlinedienst vorbelegen

**Input**: Entwurfsartefakte aus `/specs/025-qnh-vorbelegen/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/,
quickstart.md

**Tests**: Ja. Der Luftdruck geht in jede Druckhöhe ein und damit in
Startstrecke und Kraftstoffbedarf; ein falscher QNH verschiebt beide still.
Prinzip I verlangt hier eine deterministische, für sich prüfbare Rechnung — der
Rundlauftest gegen `toPressureAltitude` ist ihr Kern.

## Format: `[ID] [P?] [Story] Beschreibung`

- **[P]**: parallel ausführbar (andere Datei, keine offene Abhängigkeit)
- **[Story]**: zugehörige Nutzergeschichte (US1, US2, US3)

## Pfade

Monorepo laut plan.md: `packages/deelk-poh-core/`, `apps/web/`, `tests/ui/`.
`apps/mcp/` wird **nicht** angefasst.

---

## Phase 1: Setup

Keine neuen Laufzeitabhängigkeiten. `fetch`, `AbortController` und
`AbortSignal.timeout` sind im Browser vorhanden; Zod wird nicht in die
Weboberfläche gezogen (plan.md, Entwurfsentscheidungen).

- [ ] T001 Ausgangszustand festhalten: `npm run lint`, `npx vitest run` und `npm exec --workspace @edsh-bucky/web -- svelte-kit sync && npm run check --workspace @edsh-bucky/web` einmal grün laufen lassen, damit spätere Fehlschläge diesem Feature zuzuordnen sind
- [ ] T002 In `vitest.config.ts` ein drittes Projekt `web` ergänzen: `root: './apps/web'`, `include: ['tests/**/*.test.ts']`, `environment: 'node'` — die zu prüfenden Funktionen des Netz-Adapters sind rein und brauchen kein DOM
- [ ] T003 [P] Ordner `apps/web/tests/weather/` und `packages/deelk-poh-core/tests/atmosphere/` bereitstellen, damit die neuen Testdateien der bestehenden Struktur folgen

---

## Phase 2: Foundational — blockierend für alle Geschichten

Ohne die Kernfunktion gibt es nichts zu übernehmen. Sie entsteht zuerst und
vollständig geprüft, weil jede Oberflächenarbeit auf ihr aufsetzt.

- [ ] T004 In `packages/deelk-poh-core/src/atmosphere/pressureAltitude.ts` die bisher modulinternen Konstanten `BAROMETRIC_EXPONENT` und `P0_HPA` exportieren, damit die Umkehrfunktion sie **nutzen** und nicht kopieren muss (Prinzip IV: keine zweite Wahrheit); `T0_K` und `LAPSE_RATE_K_PER_FT` sind bereits exportiert
- [ ] T005 Neue Datei `packages/deelk-poh-core/src/atmosphere/qnh.ts` mit `toQnh(stationPressureHpa, elevationFt): QnhResult` laut [contracts/deelk-poh-core.md](./contracts/deelk-poh-core.md): `QNH = p_stat / (1 − L·h/T₀)^BAROMETRIC_EXPONENT`, gerechnet über die Fuß-Konstante `LAPSE_RATE_K_PER_FT`, damit gar nicht erst in Meter gewechselt wird. Ergebnisfelder `stationPressureHpa`, `elevationFt`, `qnhHpa` (ungerundet) und `settableQnhHpa` (auf ganze hPa **abgerundet**, `Math.floor`). Im Kommentar festhalten, warum abgerundet und nicht kaufmännisch gerundet wird (research.md R9: METAR-Praxis und die sichere Richtung)
- [ ] T006 In derselben Datei die Eingangsprüfungen ergänzen, in der Reihenfolge aus dem Vertrag: Druck keine endliche Zahl oder ≤ 0 → `INVALID_INPUT`; Höhe keine endliche Zahl → `INVALID_INPUT`; Höhe außerhalb −2 000 bis 30 000 ft → `OUT_OF_RANGE` mit dem Gültigkeitsbereich der Troposphärenformel als `allowedRange`. Den Reglerbereich 950–1050 hPa **nicht** prüfen — das entscheidet die Oberfläche (FR-007)
- [ ] T007 In `packages/deelk-poh-core/src/index.ts` `toQnh` und den Typ `QnhResult` ausführen; `ICAO_STANDARD_ATMOSPHERE_SOURCE` bleibt unverändert und wird wiederverwendet, nicht verdoppelt
- [ ] T008 [P] Neue Datei `packages/deelk-poh-core/tests/atmosphere/qnh.test.ts` mit den Sollwerten aus [quickstart.md](./quickstart.md): 1013,25 hPa auf 0 ft ergibt genau 1013,25; 978,1973 hPa auf 971 ft ergibt 1013,25; 987,9 hPa auf 971 ft ergibt 1023,30 mit `settableQnhHpa` 1023; `settableQnhHpa ≤ qnhHpa` für eine Reihe von Werten; 0 hPa, `NaN` und 40 000 ft werden abgelehnt
- [ ] T009 [P] In `packages/deelk-poh-core/tests/contract.test.ts` die Zusicherung **C-08** ergänzen: Für Höhen von 0 bis 18 000 ft und QNH von 950 bis 1050 hPa den Druck mit der Formel aus `toPressureAltitude` bilden, mit `toQnh` zurückrechnen und den Ausgangswert auf mindestens neun Nachkommastellen wiederfinden. Dazu prüfen, dass `toQnh` dieselbe Quellenreferenz `kind: 'standard'` trägt wie die Druckhöhe

**Prüfpunkt**: `npx vitest run --project deelk-poh-core` ist grün. Ab hier steht
die Rechnung; alles Weitere ist Oberfläche.

---

## Phase 3: Nutzergeschichte 1 — Den Luftdruck ohne Abtippen setzen (P1)

**Ziel**: Ein Klick auf „EDSH" neben dem QNH-Regler holt den aktuellen Wert,
zeigt ihn zur Ansicht und setzt ihn nach Bestätigung in den Regler.

**Unabhängig prüfbar**: Button drücken, Dialog bestätigen, Reglerwert gegen den
im Dialog gezeigten Wert halten.

- [ ] T010 [P] [US1] Neue Datei `apps/web/src/lib/weather/edsh.ts` mit dem Platzbezug laut [data-model.md](./data-model.md): `elevationFt: 971`, `latitude: 48.9197`, `longitude: 9.4553`, dazu ein Kommentar, dass EDSH Backnang-Heiningen ist (Graspiste 10/28, 500 m) — der Verwechslungsgefahr wegen, die research.md R0 festhält. Die Höhe in Metern wird **gerechnet** und nicht als vierte Zahl geführt
- [ ] T011 [US1] In `apps/web/src/routes/+page.svelte` die dortige Konstante `EDSH_ELEVATION_FT` entfernen und die Platzhöhe stattdessen aus `edsh.ts` beziehen; `edshWaehlen()` bleibt unverändert in seiner Wirkung (FR-025: genau eine Stelle für die Platzhöhe)
- [ ] T012 [P] [US1] Neue Datei `apps/web/src/lib/weather/openMeteo.ts` mit der reinen Funktion `baueAnfrage(platz): URL` laut [contracts/web.md](./contracts/web.md): `latitude`, `longitude`, `current=surface_pressure`, `timezone=UTC` und ausdrücklich `elevation` in Metern aus der Platzhöhe gerechnet. Im Kommentar festhalten, warum die Höhe mitgegeben wird (research.md R6: sonst hinge das Ergebnis an einem fremden Geländemodell)
- [ ] T013 [US1] In derselben Datei die reine Funktion `deuteAntwort(rohdaten): WetterAbruf` ergänzen: liest `current.surface_pressure`, `current.time` und `elevation`, wirft bei fehlendem Feld, nicht endlicher Zahl oder Druck außerhalb 500–1100 hPa. `pressure_msl` wird **nicht** gelesen und nicht durchgereicht — mit Kommentar, dass es QFF ist und nicht QNH (research.md R4)
- [ ] T014 [US1] In derselben Datei die dünne Hülle `holeWetter(platz, signal): Promise<WetterAbruf>` ergänzen: `fetch` mit dem übergebenen `AbortSignal`, danach `deuteAntwort`. Rechnet nichts (W-01, W-02). Jeder Fehlschlag — Netzfehler, Abbruch, unbrauchbare Antwort — verlässt die Funktion als Ausnahme derselben Art, damit der Aufrufer sie nicht unterscheiden muss
- [ ] T015 [P] [US1] Neue Datei `apps/web/tests/weather/openMeteo.test.ts`: `baueAnfrage` setzt `elevation=296` und enthält kein `pressure_msl`; `deuteAntwort` liefert bei vollständiger Antwort die drei Größen und wirft bei `{}`, `surface_pressure: null`, `0`, `"1013"`, fehlender `current.time` und fehlender `elevation` (Tabelle in quickstart.md, Abschnitt 2)
- [ ] T016 [US1] Neue Komponente `apps/web/src/lib/components/QnhAbrufDialog.svelte` als natives `<dialog>` mit `showModal()`: hält den Zustand `laedt | vorschau | fehler` laut data-model.md, startet den Abruf beim Öffnen (FR-012), ruft für die Umrechnung `toQnh` aus dem Kern auf und zeigt `settableQnhHpa` als übernehmbaren Wert. Die Komponente rechnet und rundet **nicht** selbst (W-01, W-02)
- [ ] T017 [US1] In derselben Komponente die beiden Knöpfe ergänzen: „Übernehmen" meldet den ganzzahligen Wert nach oben und schließt, „Abbrechen" schließt ohne Wirkung (FR-006). „Übernehmen" ist gesperrt, solange kein Wert vorliegt **oder** der Wert außerhalb 950–1050 hPa liegt — der Bereich kommt aus `domain.qnhHpa` des Kerns, nicht als Literal (FR-007)
- [ ] T018 [US1] In `apps/web/src/routes/+page.svelte` im `neben`-Steckplatz des QNH-Reglers den Button „EDSH" mit der bestehenden Klasse `.schnellwahl` ergänzen und den Dialog einbinden; die Übernahme setzt `qnhHpa` (FR-001, FR-002)

**Prüfpunkt**: Button, Dialog, Vorschau und Übernahme arbeiten. Die Druckhöhen
unter Platzhöhe und Reiseflughöhe ändern sich mit.

---

## Phase 4: Nutzergeschichte 2 — Erkennen, was der Wert wert ist (P1)

**Ziel**: Vor der Übernahme steht die Herkunft schriftlich vor Augen; nach der
Übernahme bleibt sie am Regler sichtbar.

**Unabhängig prüfbar**: Dialogtext lesen und den Vermerk am Regler vor und nach
einer Handbedienung vergleichen.

- [ ] T019 [US2] In `apps/web/src/lib/components/QnhAbrufDialog.svelte` den in **jedem** Zustand sichtbaren Aufklärungstext ergänzen: Daten kommen von einem Onlinedienst (FR-003), der Wert stammt aus einem **Wettermodell** und ist keine Messung am Platz (FR-011), er ist ein unverbindlicher Vorschlag und vor dem Flug gilt das **ATIS** (FR-003)
- [ ] T020 [US2] In derselben Komponente die Namensnennung ergänzen: „Wetterdaten von Open-Meteo.com" mit Verweis, wie es CC-BY 4.0 verlangt (FR-010)
- [ ] T021 [US2] In derselben Komponente die Vorschau vervollständigen: ganzzahliger Wert, **ungerundeter** Wert und die **Gültigkeitszeit** — mit einer Formulierung, die Gültigkeit und nicht Beobachtung sagt (FR-005, research.md R5)
- [ ] T022 [US2] In `apps/web/src/routes/+page.svelte` ein Zustandsfeld `qnhHerkunft` neben `qnhHpa` führen, bei der Übernahme setzen und bei jeder anderen Änderung des Reglers leeren (FR-009)
- [ ] T023 [US2] In derselben Datei den `folge`-Steckplatz des QNH-Reglers nutzen: Solange eine Herkunft gesetzt ist, steht dort Dienst und Gültigkeitszeit — dieselbe Stelle, an der bei der Platzhöhe die Druckhöhe steht

---

## Phase 5: Nutzergeschichte 3 — Ohne Netz weiterarbeiten (P2)

**Ziel**: Ein fehlgeschlagener Abruf ist folgenlos, und der Rechner bleibt in
vollem Umfang bedienbar.

**Unabhängig prüfbar**: Netz abschalten oder die Anfrage abfangen, Dialog
öffnen, danach die Seite bedienen.

- [ ] T024 [US3] In `apps/web/src/lib/components/QnhAbrufDialog.svelte` die Zeitüberschreitung ergänzen: `AbortSignal.timeout(10_000)`, zusammengeführt mit dem eigenen `AbortController`, damit derselbe Abbruch auch beim Schließen des Dialogs greift (FR-013)
- [ ] T025 [US3] In derselben Komponente den Zustand `fehler` vollständig ausgestalten: verständliche Meldung, gesperrtes „Übernehmen", Knopf „Erneut versuchen", der den Abruf ohne Schließen des Dialogs neu startet (FR-014). Netzfehler, Zeitüberschreitung und unbrauchbare Antwort führen zum **gleichen** Bild (FR-015)
- [ ] T026 [US3] In derselben Komponente sicherstellen, dass eine nach dem Schließen eintreffende Antwort nichts mehr verändert: beim Schließen abbrechen und das Ergebnis verwerfen (FR-018, W-05)
- [ ] T027 [US3] Prüfen und im Kommentar festhalten, dass in `apps/web/src/routes/+page.svelte` und den Komponenten **kein** Abruf beim Laden der Seite stattfindet — weder in `onMount` noch in einem `$effect`, der ohne Zutun läuft (FR-017, W-04)

---

## Phase 6: Politur und Querschnitt

- [ ] T028 In `tests/ui/klickpfad.mjs` die Prüfungen 1 bis 12 aus [quickstart.md](./quickstart.md) Abschnitt 3 ergänzen, mit `page.route()` auf `api.open-meteo.com`: Button vorhanden, Dialog mit Aufklärung, Ladeanzeige, Vorschau mit 1023, Übernahme, Herkunftsvermerk, Verschwinden des Vermerks nach Handbedienung, Abbruch, `Esc`, Fehlerfall, unbrauchbare Antwort, Wert außerhalb des Reglerbereichs
- [ ] T029 In derselben Datei die Prüfung 13 ergänzen — die wichtigste: Bei blockierten Fremdanfragen lädt die Seite vollständig, alle Regler und Ergebnisse arbeiten, und **beim Laden geht keine Anfrage** an den Dienst hinaus
- [ ] T030 [P] Den Abgleich gegen die Wirklichkeit einmal von Hand ausführen (quickstart.md Abschnitt 4) und das Ergebnis mit Datum in research.md unter R7 nachtragen, falls es von den dort festgehaltenen Werten abweicht
- [ ] T031 [P] In `README.md` den Abschnitt zur Bedienung um die neue Schnellwahl am QNH ergänzen — knapp, mit dem Hinweis auf den unverbindlichen Charakter; die Namensnennung von Open-Meteo gehört in die Oberfläche, nicht nur in die Datei
- [ ] T032 Abschließend `npx vitest run`, `npm run lint` und `npm run --workspace @edsh-bucky/web check` grün stellen (quickstart.md Abschnitt 5)

---

## Abhängigkeiten

```
Phase 1 (Setup)
    │
    ▼
Phase 2 (Kern: toQnh)  ── blockiert alles Weitere
    │
    ├──► Phase 3 (US1)  ── die Mechanik: holen, zeigen, übernehmen
    │        │
    │        ├──► Phase 4 (US2)  ── braucht den Dialog aus T016
    │        └──► Phase 5 (US3)  ── braucht den Dialog aus T016
    │
    └──► Phase 6 (Politur)  ── braucht alle drei Geschichten
```

**US2 und US3 sind untereinander unabhängig** und können in beliebiger
Reihenfolge oder parallel entstehen — sie berühren dieselbe Komponente, aber
verschiedene Stellen: US2 den Text und die Anzeige, US3 den Zustand `fehler` und
den Abbruch.

## Parallel ausführbar

- **Phase 2**: T008 und T009 (verschiedene Testdateien), nachdem T005 bis T007
  stehen
- **Phase 3**: T010, T012 und T015 zu Beginn (verschiedene Dateien); T011 wartet
  auf T010, T013 und T014 auf T012
- **Phase 6**: T030 und T031 (verschiedene Dateien, keine Codeabhängigkeit)

## Umsetzungsreihenfolge

**Kleinster nutzbarer Stand**: Phase 1 + 2 + 3. Damit lässt sich der Luftdruck
per Knopfdruck setzen — die Funktion, um die es geht.

**Dieser Stand wäre aber nicht auslieferbar.** US2 ist ebenfalls P1 und nicht
verhandelbar: Ein bequem gesetzter, aber für eine Messung gehaltener Luftdruck
ist schlechter als gar keine Bequemlichkeit. Der erste Stand, der auf die
veröffentlichte Seite darf, ist Phase 1 bis 4.

Phase 5 folgt unmittelbar danach, weil der Rechner am Platz genutzt wird — dort,
wo das Netz am schlechtesten ist.
