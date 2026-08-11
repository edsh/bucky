# Tasks: EDSH-Abruf um Temperatur und Pistenwind erweitern

**Input**: Entwurfsunterlagen aus `/specs/027-edsh-abruf-erweitern/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md),
[research.md](./research.md), [data-model.md](./data-model.md),
[contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Der Kern wird testgetrieben erweitert — die Verfassung verlangt für
Rechenlogik eine deterministische Absicherung (Prinzip I/IV), und beide neuen
Funktionen sind Rechenlogik. Die Oberfläche wird über den Klickpfad geprüft.

## Reihenfolge in einem Satz

Erst der Kern (Phasen 2 und 3), dann der Abruf (Phase 4), dann der Dialog
(Phase 5), dann die Seite (Phase 6), dann der Klickpfad (Phase 7). Der Dialog
lässt sich nicht sinnvoll bauen, bevor die beiden Umrechnungen stehen — er
besteht fast nur aus ihren Ergebnissen.

**Phasen 5 und 6 gehören in denselben Zug**: Der Dialog meldet drei Werte an
`+page.svelte`, und die Seite reicht drei Bereiche an den Dialog. Getrennt
umgesetzt lässt sich weder das eine noch das andere übersetzen.

---

## Phase 1: Ausgangszustand sichern

- [ ] T001 Ausgangszustand feststellen: `npx vitest run`, `npm run lint`,
      `npm exec --workspace @edsh-bucky/web -- svelte-kit sync && npm run check --workspace @edsh-bucky/web`
      im Wurzelverzeichnis ausführen und die Zahl der grünen Tests notieren.
      Ohne diesen Bezugspunkt lässt sich später nicht sagen, ob eine
      Abweichung neu ist.

- [ ] T002 Die Sollwerte für die Prüfdaten in dieser Datei festhalten (Tabelle
      unter „Sollwerte"), gerechnet mit den Konstanten aus
      `packages/deelk-poh-core/src/atmosphere/pressureAltitude.ts`. Sie werden
      in Phase 3, 5 und 7 gebraucht und dürfen nicht dreimal unabhängig
      voneinander entstehen.

---

## Phase 2: Grundlage im Kern — Rundung und Modulplatz

**Blockiert alle folgenden Phasen.**

- [ ] T003 `roundCelsius(value)` in
      `packages/deelk-poh-core/src/format.ts` ergänzen: kaufmännisch auf ganze
      °C über `roundTo(value, 0)`, mit einem Kommentar, warum hier — anders als
      beim QNH — nicht in eine sichere Richtung gerundet wird (beide Richtungen
      tragen ein Risiko; siehe [contracts/deelk-poh-core.md](./contracts/deelk-poh-core.md)).

- [ ] T004 Den Ordner `packages/deelk-poh-core/src/wind/` anlegen und in
      `packages/deelk-poh-core/src/wind/runwayComponent.ts` den Kopfkommentar
      schreiben, der begründet, warum die Zerlegung weder unter `atmosphere/`
      noch unter `takeoff/` liegt (→ [E2](./plan.md)).

---

## Phase 3: Die beiden Umrechnungen im Kern (Priority: P1) 🎯 MVP-Grundlage

**Goal**: Beide Rechnungen liegen im Kern, sind für sich geprüft und stehen
damit auch dem MCP-Zugang offen (Prinzip IV).

**Independent Test**: `npx vitest run` — die beiden neuen Testdateien laufen
ohne Oberfläche und ohne Netz.

### Tests zuerst

- [ ] T005 [P] `packages/deelk-poh-core/tests/runwayComponent.test.ts` anlegen
      mit den fünf Handproben aus [quickstart.md](./quickstart.md): Wind genau
      auf der Bahn (+20 kt), genau quer (0 kt), genau von hinten (−20 kt), und
      die beiden Fälle aus 250°. Zusätzlich: Windstille ergibt für beide Bahnen
      null, und die Winkelnormalisierung (350° gegen 010° ergibt −20°, nicht
      340°).

- [ ] T006 [P] `packages/deelk-poh-core/tests/temperature.test.ts` um den
      Rundlauf erweitern: Für eine Reihe von Druckhöhen (−1000 … 12000 ft) und
      Abweichungen (−30 … 40 °C) muss
      `toIsaDeviation(h, toOutsideAirTemperature(h, d).outsideAirTemperatureC).isaDeviationC`
      wieder `d` ergeben, auf neun Nachkommastellen. Dieselbe Bauart wie C-08.

### Umsetzung

- [ ] T007 `toIsaDeviation(pressureAltitudeFt, outsideAirTemperatureC)` in
      `packages/deelk-poh-core/src/atmosphere/temperature.ts` ergänzen, direkt
      neben `toOutsideAirTemperature`. **Dieselben** Konstanten `T0_C` und
      `LAPSE_RATE_K_PER_FT` verwenden — keine zweite Normtemperatur. Gibt
      `IsaDeviationResult` zurück (→ [data-model.md](./data-model.md)),
      `settableIsaDeviationC` über `roundCelsius`. Prüft **keinen**
      Reglerbereich. Wirft `INVALID_INPUT` bei nicht endlichen Zahlen.

- [ ] T008 `toRunwayWindComponent(windFromDegTrue, windSpeedKt, runwayBearingDegTrue)`
      in `packages/deelk-poh-core/src/wind/runwayComponent.ts` umsetzen. Winkel
      auf −180…180 normalisieren, Längskomponente über den Kosinus (**positiv =
      Gegenwind**), Querkomponente als Betrag über den Sinus.
      `settableHeadwindComponentKt` über `roundKnots`. Wirft `INVALID_INPUT`
      bei nicht endlichen Zahlen und bei negativer Windgeschwindigkeit.

- [ ] T009 Beide Funktionen und ihre Typen in
      `packages/deelk-poh-core/src/index.ts` ausführen, in der Anordnung aus
      [contracts/deelk-poh-core.md](./contracts/deelk-poh-core.md).

- [ ] T010 Zusicherung **C-09** in
      `packages/deelk-poh-core/tests/contract.test.ts` ergänzen: keine
      Adapterdatei unter `apps/web/src` oder `apps/mcp/src` enthält
      `Math.cos`, `Math.sin`, `Math.atan2` oder `Math.PI`; und
      `export function toRunwayWindComponent` steht genau einmal im Kern.
      Bauart und Kommentarstil von C-04 übernehmen.

**Checkpoint**: `npx vitest run` grün. Der Kern kann jetzt alles, was das
Feature braucht — die Oberfläche kennt es nur noch nicht.

---

## Phase 4: Der Abruf holt mehr (Priority: P1)

**Goal**: Temperatur und Wind kommen an, einzeln entbehrlich.

**Independent Test**: `deuteAntwort` ist rein und lässt sich ohne Netz gegen
eine Antwort mit und ohne die neuen Felder halten.

- [ ] T011 In `apps/web/src/lib/weather/edsh.ts` die Bahnrichtungen ergänzen:
      `RUNWAYS` mit `{ ident: '10', bearingDegTrue: 103 }` und
      `{ ident: '28', bearingDegTrue: 283 }`, dazu ein Kommentar mit der Quelle
      und **beiden** Gegenproben aus [R2](./research.md) — den AIP-Bahnmaßen und
      der Ortsmissweisung. Ausdrücklich festhalten, dass die Kennungen
      missweisend und die Gradzahlen rechtweisend sind; das ist der Fallstrick,
      den der Kommentar verhindern soll.

- [ ] T012 In `apps/web/src/lib/weather/openMeteo.ts` die Anfrage erweitern:
      `current` um `temperature_2m,wind_speed_10m,wind_direction_10m` ergänzen
      und `wind_speed_unit=kn` setzen. Den Kommentar entfernen, der begründet,
      warum Temperatur und Wind **nicht** angefordert werden — sein Gegenstand
      entfällt. Stattdessen begründen, warum die Einheit angefordert statt
      umgerechnet wird (→ [R7](./research.md)).

- [ ] T013 `WetterAbruf` in derselben Datei um `temperatureC?: number` und
      `wind?: { fromDegTrue: number; speedKt: number }` erweitern.

- [ ] T014 `deuteAntwort` erweitern: Luftdruck, Zeit und Bezugshöhe bleiben
      Pflicht und werfen wie bisher. Temperatur und Wind werden **still
      weggelassen**, wenn sie fehlen oder nicht deutbar sind. Der Wind nur dann
      belegen, wenn Richtung **und** Geschwindigkeit vorhanden sind; eine
      negative Geschwindigkeit gilt als nicht deutbar. Keine Plausibilitäts-
      schranke einziehen (C-05).

**Checkpoint**: `npm run lint` und `svelte-check` grün.

---

## Phase 5: Der Dialog (Priority: P1) — zusammen mit Phase 6

**Goal**: Drei Zeilen mit Kästchen, eine Bahnwahl, ein „Übernehmen".

- [ ] T015 `apps/web/src/lib/components/QnhAbrufDialog.svelte` nach
      `apps/web/src/lib/components/WetterAbrufDialog.svelte` umbenennen
      (`git mv`, damit die Vorgeschichte erhalten bleibt) und den
      Kopfkommentar auf drei Größen umschreiben.

- [ ] T016 Die Props umstellen: statt eines `bereich` und eines `uebernehmen`
      für den QNH nun drei Bereiche (`qnhBereich`, `isaBereich`,
      `pistenwindBereich`) und eine `uebernehmen`-Rückgabe, die alle drei Größen
      als **optionale** Felder führt — nicht angehakt heißt nicht enthalten.
      Alle Bereiche kommen von außen aus dem Kern, keiner steht hier (C-05).

- [ ] T017 Den Zustand `vorschau` umbauen: Er trägt jetzt den `WetterAbruf` und
      daraus abgeleitet drei `Uebernahmevorschlag` (→
      [data-model.md](./data-model.md)). Die Ableitung als `$derived` über
      Abruf **und** gewählter Bahn, damit ein Bahnwechsel keinen neuen Abruf
      auslöst (FR-011, → [E7](./plan.md)).

- [ ] T018 Die drei Vorschläge bilden:
      **QNH** über `toQnh(abruf.stationPressureHpa, EDSH.elevationFt)` wie
      bisher.
      **ISA** über `toPressureAltitude(EDSH.elevationFt, qnhErgebnis.qnhHpa)`
      — mit dem **ungerundeten** `qnhHpa` (W-07!) — und dann `toIsaDeviation`
      mit `abruf.temperatureC`.
      **Pistenwind** über `toRunwayWindComponent(abruf.wind.fromDegTrue,
      abruf.wind.speedKt, gewaehlteBahn.bearingDegTrue)`.
      Fehlt eine Eingangsgröße, entsteht kein Vorschlag, sondern ein Hindernis.

- [ ] T019 Die Übernehmbarkeit je Vorschlag gegen den zugehörigen Bereich
      prüfen — gegen den **gerundeten, übernehmbaren** Wert, nicht gegen den
      ungerundeten (siehe Nachtrag in [contracts/web.md](./contracts/web.md)).

- [ ] T020 Die Vorauswahl der Bahn: diejenige mit der größeren Längskomponente.
      Bei Gleichstand (Wind genau quer oder Windstille) Bahn 10. Als
      Anfangsbelegung **beim Eintreffen der Antwort**, nicht als `$derived` —
      sonst spränge sie zurück, sobald der Pilot umschaltet.

- [ ] T021 Die Bahnwahl im Markup: zwei Optionen, beschriftet mit den
      Kennungen „10" und „28", gerechnet mit den Gradzahlen. Sichtbar nur im
      Zustand `vorschau`.

- [ ] T022 Die drei Zeilen im Markup: je ein `<input type="checkbox">` mit
      Beschriftung, Vorschauwert (`formatHectopascal`, `formatCelsius`,
      `formatKnots`) und darunter die Erläuterung — ungerundeter QNH und
      Gültigkeit, absolute Platztemperatur (FR-013), Windrichtung/-geschwindig-
      keit/Bahn (FR-012). Testkennungen vergeben.

- [ ] T023 Gesperrte Zeilen: Kästchen `disabled` und nicht angehakt, dazu die
      begründende Meldung. Die übrigen Zeilen bleiben bedienbar (FR-007).

- [ ] T024 „Übernehmen" sperren, solange kein Ergebnis vorliegt **oder** kein
      Kästchen angehakt ist (FR-005). `bestaetigen()` gibt nur die angehakten
      Größen weiter (FR-004).

- [ ] T025 Die Aufklärung, die Namensnennung, die Ladeanzeige, die Zeitgrenze,
      das Abbruchsignal und das Fehlerbild **unverändert** übernehmen (FR-019).
      Die Aufklärung im Wortlaut auf drei Größen anpassen, ohne ihre Aussage zu
      verwässern.

---

## Phase 6: Die Seite (Priority: P1) — zusammen mit Phase 5

- [ ] T026 In `apps/web/src/routes/+page.svelte` den Import und die Verwendung
      auf `WetterAbrufDialog` umstellen und ihm die drei Bereiche mitgeben:
      `domain.qnhHpa`, `domain.isaDeviationC` und
      `getTakeoffInputDomain().windComponentKt`.

- [ ] T027 Aus `qnhHerkunft` drei Zustände machen: `qnhHerkunft`,
      `isaHerkunft`, `pistenwindHerkunft` (→ [E6](./plan.md)).

- [ ] T028 Die Übernahme umstellen: `wetterUebernehmen(werte, herkunft)` setzt
      je Größe nur dann Regler **und** Vermerk, wenn sie enthalten ist. Ein
      nicht enthaltener Wert lässt Regler und bisherigen Vermerk unangetastet
      (W-09).

- [ ] T029 Drei `bedient`-Wächter statt einem: `qnhVonHand`, `isaVonHand`,
      `pistenwindVonHand`. Weiterhin am Bedienereignis und **nicht** als
      `$effect` — ein Effekt löschte den Vermerk im selben Atemzug, in dem er
      entsteht.

- [ ] T030 Den `folge`-Steckplatz am ISA-Regler ergänzen und den
      `bedient`-Wächter an ISA- und Pistenwindregler hängen. Der Pistenwind-
      regler liegt in `TakeoffDistance.svelte` — Vermerk und Wächter als Props
      hindurchreichen, nicht dort neu erfinden.

- [ ] T031 Prüfen, dass die Streckenwindkomponente nirgends berührt wird
      (FR-020, W-10).

**Checkpoint**: `npm run lint`, `svelte-check` 0/0, `npx vitest run` grün —
insbesondere C-03, C-05 und das neue C-09.

---

## Phase 7: Klickpfad (Priority: P1)

- [ ] T032 In `tests/ui/klickpfad.mjs` die Prüfdaten erweitern: `GUTE_ANTWORT`
      um `temperature_2m: 29.2`, `wind_speed_10m: 12`,
      `wind_direction_10m: 250`. Die erwarteten Werte aus der Tabelle
      „Sollwerte" unten.

- [ ] T033 Die Prüfungen 40 bis 55 auf die neuen Testkennungen und den neuen
      Dialogaufbau nachziehen. Ihre **Aussagen** bleiben, wo sie noch gelten:
      Aufklärung, Namensnennung, Ladeanzeige, Netzfehler, „Erneut versuchen",
      unbrauchbare Antwort, Esc, Abbrechen, kein Abruf beim Laden.

- [ ] T034 Prüfung 44 erweitern: drei Zeilen, drei angehakte Kästchen, die drei
      erwarteten Vorschauwerte.

- [ ] T035 Prüfung 45 erweitern: „Übernehmen" setzt alle drei Regler; die
      Streckenwindkomponente bleibt auf ihrem Wert.

- [ ] T036 Prüfung 46 erweitern: drei Herkunftsvermerke; 48 erweitern: das
      Verstellen **eines** Reglers löscht nur dessen Vermerk.

- [ ] T037 Prüfung 54 umstellen: Statt eines QNH außerhalb des Bereichs eine
      Antwort mit `wind_speed_10m: 20` und Bahn 10 → −17 kt, gesperrtes
      Pistenwind-Kästchen bei weiterhin übernehmbarem QNH und ISA (FR-007).

- [ ] T038 [P] Neue Prüfung: ein abgewähltes Kästchen lässt seinen Regler und
      dessen bisherigen Vermerk unverändert (US2, SC-002).

- [ ] T039 [P] Neue Prüfung: alle drei Kästchen abgewählt → „Übernehmen"
      gesperrt (FR-005).

- [ ] T040 [P] Neue Prüfung: ein Bahnwechsel ändert allein den
      Pistenwind-Vorschauwert und löst **keine** zweite Anfrage aus — über einen
      Zähler auf dem abgefangenen Aufruf (US3, FR-011).

- [ ] T041 [P] Neue Prüfung: die Bahn mit Gegenwind ist vorausgewählt (FR-010).

- [ ] T042 [P] Neue Prüfung: eine Antwort ohne Windfelder lässt QNH und ISA
      übernehmbar und sperrt allein den Pistenwind (FR-007).

- [ ] T043 [P] Neue Prüfung: die Erläuterungen nennen Windrichtung,
      Windgeschwindigkeit, Bahn und die absolute Platztemperatur (US4, FR-012,
      FR-013).

- [ ] T044 Den Klickpfad vollständig laufen lassen: `npm run build`, Server auf
      8899, `node tests/ui/klickpfad.mjs`. Alle Prüfungen grün.

---

## Phase 8: Abschluss

- [ ] T045 `README.md` um einen Abschnitt ergänzen, der beschreibt, was der
      Knopf „EDSH" jetzt holt, und den Fallstrick aus [R2](./research.md)
      festhält (missweisende Kennung gegen rechtweisende Windrichtung).

- [ ] T046 Die drei Prüfläufe aus [quickstart.md](./quickstart.md) Abschnitt 1,
      2 und 4 abschließend ausführen und das Ergebnis unten unter „Endstand der
      Prüfungen" eintragen.

- [ ] T047 Alle Aufgaben in dieser Datei auf `[X]` setzen und Abweichungen von
      der Aufgabenbeschreibung unten festhalten. Eine Abweichung ist kein
      Fehler — sie unkommentiert zu lassen schon.

---

## Sollwerte

Wird in T002 gefüllt. Gerechnet für die Prüfdaten
`surface_pressure: 987,9 hPa`, `temperature_2m: 29,2 °C`,
`wind_speed_10m: 12 kt`, `wind_direction_10m: 250°`, Platzhöhe EDSH 971 ft.

| Größe | Ungerundet | Übernehmbar |
|---|---|---|
| QNH | 1023,3004379482848 hPa | 1023 hPa |
| Druckhöhe EDSH | 699,4393154069325 ft | — |
| Normtemperatur dort | 13,614270828315785 °C | — |
| ISA-Abweichung | 15,585729171684214 °C | 16 °C |
| Pistenwind Bahn 28 (283°) | 10,063999… kt | 10 kt |
| Pistenwind Bahn 10 (103°) | −10,063999… kt | −10 kt |

Die letzte Zeile ist der Grenzfall: −10 kt liegt **genau** auf der unteren
Reglergrenze und ist damit übernehmbar. Für den Sperrfall braucht es 20 kt aus
250° auf Bahn 10 → −16,77 kt → −17 kt (T037).

---

## Abhängigkeiten

```
Phase 1 (T001–T002)
   └─→ Phase 2 (T003–T004)
          └─→ Phase 3 (T005–T010)   Kern
                 ├─→ Phase 4 (T011–T014)   Abruf
                 └─→ Phase 5 + 6 (T015–T031)   Dialog und Seite, ein Zug
                        └─→ Phase 7 (T032–T044)   Klickpfad
                               └─→ Phase 8 (T045–T047)
```

**Parallel möglich**: T005 und T006 (verschiedene Testdateien). T038 bis T043
(neue, voneinander unabhängige Prüfungen). Alles Übrige ist der Reihe nach zu
tun, weil es dieselben Dateien anfasst.

---

## Umsetzungsstrategie

**Kleinster brauchbarer Stand**: Phasen 1 bis 6 ohne die neuen Klickpfad-
Prüfungen. Damit funktioniert das Feature vollständig — es ist nur noch nicht
gegen Rückschritte gesichert. Ausliefern sollte man diesen Stand nicht:
Der Dialog verändert drei Regler, und drei Prüfungen weniger sind hier drei
Möglichkeiten mehr, dass eine Vorzeichen- oder Bereichsverwechslung unbemerkt
bleibt.

**Reihenfolge nach Nutzergeschichten**: US1 (alles übernehmen) und US2
(einzeln abwählen) entstehen zusammen — sie sind zwei Seiten desselben
Dialogs. US3 (Bahnwahl) kommt mit T020/T021 hinzu, US4 (Nachvollziehbarkeit)
mit T022. Keine der vier lässt sich sinnvoll weglassen, weil der Dialog sonst
halb fertig aussähe.

---

## Abweichungen bei der Umsetzung

Wird während der Umsetzung gefüllt.

---

## Endstand der Prüfungen

Wird in T046 gefüllt.
