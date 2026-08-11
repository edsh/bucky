# Tasks: Außentemperatur statt ISA-Abweichung, Wetterabruf an allen Reglern, Winde nach oben

**Input**: Entwurfsunterlagen aus `/specs/031-aussentemperatur-und-anordnung/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md),
[research.md](./research.md), [data-model.md](./data-model.md),
[contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Der Kern wird testgetrieben erweitert (Prinzip I/IV). Die Oberfläche
wird über den Klickpfad geprüft.

## Reihenfolge in einem Satz

Erst der Kern (Phase 2), dann in **einem Zug** Seite und Dialog (Phase 3), dann
die drei Knöpfe (Phase 4), dann die Anordnung (Phase 5), zuletzt Klickpfad und
README (Phasen 6 und 7).

**Phase 3 ist unteilbar**: Der Dialog hält Props, die die Seite liefert, und
meldet Werte, die die Seite entgegennimmt. Wird nur eines von beiden umbenannt,
lässt sich nichts mehr übersetzen.

**Phase 5 hängt an nichts.** Sie darf vorgezogen werden, wenn früh etwas
Sichtbares gewünscht ist.

---

## Sollwerte

Gerechnet mit den Konstanten aus
`packages/deelk-poh-core/src/atmosphere/pressureAltitude.ts`. Sie werden in den
Phasen 2, 3 und 6 gebraucht und dürfen nicht dreimal unabhängig entstehen.

### Anfangszustand der Seite (971 ft, 1013 hPa)

| Größe | Wert |
|---|---|
| Platzdruckhöhe | 977,7826981696855 ft |
| Normtemperatur dort | 13,062816918386218 °C |
| ISA+10 entspräche | 23,06281691838622 °C |
| **Anfangswert des Reglers** | **23 °C** (gerundet, R3) |
| Daraus folgende Abweichung | 9,937183081613782 °C → Anzeige **ISA +9,9 °C** |

Das Anfangsbild verschiebt sich damit um 0,06 °C gegenüber dem bisherigen
ISA +10 — die unvermeidliche Folge davon, dass jetzt die Temperatur die
ganzzahlige Größe ist.

### Wetterabruf EDSH (Prüfantwort aus Feature 027)

`surface_pressure: 987,9 hPa`, `temperature_2m: 29,2 °C`,
`wind_speed_10m: 12 kt`, `wind_direction_10m: 250°`

| Größe | Wert | Vorschlag im Dialog |
|---|---|---|
| QNH | 1023,3004379482848 hPa | 1023 hPa |
| Druckhöhe bei QNH 1023 | 707,5257026813237 ft | — |
| **Außentemperatur** | 29,2 °C | **29 °C** (vorher: 16 °C ISA) |
| Daraus folgende Abweichung | 15,401749922152238 °C | (nur Erläuterung) |
| Pistenwind Bahn 28 | 10,0640468 kt | 10 kt |
| Pistenwind Bahn 10 | −10,0640468 kt | −10 kt (Grenzfall, übernehmbar) |

### Temperaturbereiche nach `getOutsideAirTemperatureRange`

| Druckhöhe | Normtemperatur | Bereich |
|---|---|---|
| 0 ft | 15,0000 °C | −15 … 55 °C |
| 700 ft | 13,6132 °C | −16 … 53 °C |
| 5 000 ft | 5,0940 °C | −24 … 45 °C |
| 10 000 ft | −4,8120 °C | −34 … 35 °C |

---

## Phase 1: Ausgangszustand sichern

- [X] T001 Ausgangszustand feststellen: `npx vitest run`, `npm run lint`,
      `npm exec --workspace @edsh-bucky/web -- svelte-kit sync && npm run check --workspace @edsh-bucky/web`
      ausführen und die Zahl der grünen Tests notieren (erwartet: 492). Ohne
      diesen Bezugspunkt lässt sich später nicht sagen, ob eine Abweichung neu
      ist.

- [X] T002 Für S1 aus [quickstart.md](./quickstart.md) die Ergebniszahlen des
      **jetzigen** Standes bei Anfangseinstellung festhalten: Startstrecke,
      Kraftstoffbedarf, Reisegeschwindigkeit. Sie sind der Vergleichsmaßstab
      für SC-001 und lassen sich nach dem Umbau nicht mehr erheben.

---

## Phase 2: Kern — Bereich und Format

**Ziel**: Die beiden neuen Bausteine stehen und sind geprüft, bevor die
Oberfläche sie braucht.

- [X] T003 `ISA_DEVIATION_RANGE` von
      `packages/deelk-poh-core/src/fuel/input.ts` (Zeile 42) nach
      `packages/deelk-poh-core/src/atmosphere/temperature.ts` verschieben und
      dort ausführen. `fuel/input.ts` importiert ihn künftig von dort.
      **Grund im Kommentar festhalten**: `fuel/` importiert bereits aus
      `atmosphere/`, die Gegenrichtung ergäbe einen Ringschluss — und fachlich
      ist eine Aussage über die Standardatmosphäre dort ohnehin am Platz.
      `getFuelPlanInputDomain()` gibt weiterhin `isaDeviationC` aus; die
      öffentliche Schnittstelle ändert sich nicht.

- [X] T004 Tests für `getOutsideAirTemperatureRange` in
      `packages/deelk-poh-core/tests/atmosphere/temperature.test.ts`
      **vor** der Umsetzung schreiben:
      - die vier Bereiche aus der Sollwerttabelle oben,
      - die tragende Eigenschaft: für **jeden** ganzzahligen Wert `t` im
        zurückgegebenen Bereich liegt `toIsaDeviation(h, t).isaDeviationC`
        innerhalb von `ISA_DEVIATION_RANGE` — über mehrere Druckhöhen geprüft.
        Das ist der Daseinsgrund der Funktion und gehört als Eigenschaft
        geprüft, nicht als Einzelfall,
      - die Gegenprobe: `min - 1` und `max + 1` fallen heraus.

- [X] T005 `formatCelsiusPrecise(value: number): string` in
      `packages/deelk-poh-core/src/format.ts` ergänzen, über das vorhandene
      `formatQuantity(value, 1, '°C')`. Im Kommentar festhalten, wofür sie da
      ist: abgeleitete Werte, deren Rundungsdifferenz sichtbar wäre (R2).
      `formatCelsius` bleibt für Reglerwerte. Test in
      `packages/deelk-poh-core/tests/format.test.ts` mit 9,937183… → „+9,9 °C"
      und einer Prüfung des deutschen Dezimalkommas.

- [X] T006 `getOutsideAirTemperatureRange(pressureAltitudeFt): NumericRange` in
      `packages/deelk-poh-core/src/atmosphere/temperature.ts` umsetzen:
      Normtemperatur der Druckhöhe bilden (dieselbe Zeile wie in
      `toOutsideAirTemperature` — nicht abschreiben, sondern gemeinsam
      nutzen), um den Abweichungsbereich verschieben, **nach innen** runden
      (`min` aufwärts, `max` abwärts). Die Rundung geschieht über `format.ts`
      (C-03); prüfen, ob dort eine Auf-/Abrundungsfunktion fehlt, und sie
      gegebenenfalls neben `floorHectopascal` ergänzen. Unit `'°C'`, Step `1`.
      Prüft **keinen** Tabellenbereich, so wie `toOutsideAirTemperature` auch
      nicht.

- [X] T007 Beide neuen Namen in
      `packages/deelk-poh-core/src/index.ts` ausführen.

- [X] T008 `npx vitest run --project core` (oder `npx vitest run
      packages/deelk-poh-core`) — Phase 2 muss grün sein, bevor die Oberfläche
      angefasst wird.

- [X] T009 Zusicherungen durchsehen: C-04 verbietet in Adaptern bereits
      `288.15` und `0.0065`, C-05 jede feste `min`/`max`/`step`-Zahl. Damit ist
      ein Nachbau des Bereichs in der Oberfläche schon ausgeschlossen —
      **prüfen und im Aufgabenprotokoll vermerken**. Nur falls sich eine Lücke
      zeigt, C-05 in `packages/deelk-poh-core/tests/contract.test.ts`
      entsprechend ergänzen. Keine neue Zusicherung um ihrer selbst willen.

---

## Phase 3: Seite und Dialog — der Rollentausch

**Ziel**: Die Temperatur ist die Eingabe, die Abweichung die Folgerung.

**Diese Phase ist unteilbar.** Zwischen T010 und T016 ist die Anwendung nicht
übersetzbar.

- [X] T010 In `apps/web/src/routes/+page.svelte` den Zustand tauschen:
      `isaDeviationC = $state(10)` (Zeile ~119) weicht
      `outsideAirTemperatureC = $state(23)`. Der Anfangswert stammt aus der
      Sollwerttabelle; im Kommentar festhalten, dass er der bisherigen
      ISA+10-Einstellung entspricht und **einmalig** gesetzt wird. Kein
      `$effect` koppelt ihn an die Höhe — sonst würde aus der Messung eine
      abgeleitete Größe, derselbe Fehler, den Feature 026 bei den beiden Winden
      aufgelöst hat.

- [X] T011 Zwei `$derived` in `+page.svelte` ergänzen:
      `temperaturBereich = getOutsideAirTemperatureRange(platzDruckhoehe.pressureAltitudeFt)`
      und
      `isaAbleitung = toIsaDeviation(platzDruckhoehe.pressureAltitudeFt, outsideAirTemperatureC)`.

- [X] T012 Die drei Verwendungsstellen in `+page.svelte` auf
      `isaAbleitung.isaDeviationC` umstellen — **ungerundet** (R2):
      `toOutsideAirTemperature(...)` in der Startstrecke (~Zeile 183),
      `computeCruiseCapability` (~213), `computeFuelPlan` (~272). In der
      `$effect`-Abhängigkeitsliste (~296) steht künftig
      `outsideAirTemperatureC` statt `isaDeviationC`.
      Im Kommentar bei der Startstrecke festhalten, warum der Rundlauf
      Temperatur → Abweichung → Temperatur stehen bleibt:
      `computeTakeoffDistance` erwartet ein `OutsideAirTemperatureResult` samt
      Quellenreferenz, und diese Struktur nebenher zu bauen hieße, den Kern zu
      umgehen (C-04).

- [X] T013 Den Regler in `+page.svelte` (~Zeile 401) umbauen: `id="isa"` →
      `id="temperatur"`, Beschriftung „Außentemperatur am Platz (°C)",
      `range={temperaturBereich}`, `bind:value={outsideAirTemperatureC}`,
      `format={formatCelsius}`, `bedient={temperaturVonHand}`.
      Die `folge`-Zeile trägt künftig **zwei** Dinge: die Ableitung
      `≙ ISA {formatCelsiusPrecise(isaAbleitung.isaDeviationC)}` mit
      `data-testid="isa-ableitung"` und, wie gehabt, den Herkunftsvermerk
      (`isa-herkunft` → `temperatur-herkunft`). `isaVonHand` und `isaHerkunft`
      mitbenennen.

- [X] T014 In `apps/web/src/lib/components/WetterAbrufDialog.svelte`:
      `Uebernahmewerte.isaDeviationC` → `outsideAirTemperatureC`; Prop
      `isaBereich` → `temperaturBereich`; Zeilenschlüssel `isa` →
      `temperatur`, Titel „Außentemperatur". `angehakt` und `bestaetigen`
      folgen der Umbenennung.

- [X] T015 Den Temperaturvorschlag im Dialog vereinfachen: Statt
      `toIsaDeviation` genügt jetzt `roundCelsius(temperatur)`, geprüft gegen
      `temperaturBereich`. Der Import von `toIsaDeviation` fällt weg (R4). Die
      Erläuterung nennt künftig die **abgeleitete Abweichung** — die Umkehrung
      der bisherigen Zeile, die die absolute Temperatur nannte. Sollwert: der
      Vorschlag lautet **29 °C**, nicht mehr 16 °C.

- [X] T016 In `+page.svelte` die Übergabe an den Dialog (~Zeile 433) auf
      `temperaturBereich={temperaturBereich}` umstellen und
      `wetterUebernehmen` an das neue Feld anpassen.

- [X] T017 Übersetzen und typprüfen:
      `npm exec --workspace @edsh-bucky/web -- svelte-kit sync && npm run check --workspace @edsh-bucky/web`,
      dann `npm run build`. Erst hier ist die Anwendung wieder ganz.

- [X] T018 Vollständige Suche nach Resten: `isaDeviationC`, `isaBereich`,
      `isa-herkunft`, `wetter-zeile-isa`, `wetter-haken-isa`, `wetter-wert-isa`,
      `wetter-genauer-isa`, `wetter-hindernis-isa`, `#isa`, `isaVonHand`,
      `isaHerkunft` über `apps/` und `tests/`. Was im **Kern** steht, bleibt —
      dort heißt die Größe weiterhin so.

---

## Phase 4: Drei Knöpfe

**Ziel**: Der Dialog ist von jedem betroffenen Regler aus erreichbar (SC-003).

- [X] T019 In `+page.svelte` den Kommentar über dem QNH-Knopf (~Zeile 360)
      ersetzen. Er begründet heute ausführlich, warum es nur **einen** Einstieg
      gibt — diese Begründung trägt nicht mehr und darf nicht stehen bleiben.
      An ihre Stelle kommt die neue: Wer den Pistenwind sucht, sucht ihn beim
      Pistenwind.

- [X] T020 Am Temperaturregler in `+page.svelte` denselben `neben`-Knopf
      ergänzen: `aria-label="Wetterwerte für EDSH abrufen"`, Beschriftung
      „EDSH", `onclick={() => wetterDialog?.oeffnen()}`.

- [X] T021 In `apps/web/src/lib/components/TakeoffDistance.svelte` den Prop
      `wetterAbrufen?: () => void` ergänzen und, sofern gesetzt, den Knopf im
      `neben`-Snippet des Pistenwindreglers zeigen. Im Kommentar festhalten,
      warum es ein reiner Auslöser ohne Rückgabe ist: Die Komponente soll nicht
      wissen, dass am anderen Ende ein Dialog hängt — dieselbe Trennung wie bei
      `windHerkunft`. Ohne den Prop erscheint kein Knopf; die Komponente bleibt
      ohne Wetterabruf verwendbar.

- [X] T022 In `+page.svelte` `wetterAbrufen={() => wetterDialog?.oeffnen()}`
      an `<TakeoffDistance>` durchreichen (~Zeile 502).

---

## Phase 5: Dialog — Bahnwahl und Gegenwindhinweis

- [X] T023 In `WetterAbrufDialog.svelte` das Zeilenobjekt im `#each` (~Zeile
      389) um ein Merkmal `bahnwahl: true` für den Wind erweitern und
      `fieldset.bahnwahl` (~Zeile 372) aus der Kopfzeile **in das `<li>` der
      Windzeile** verschieben. Sie erscheint nur, wenn zusätzlich
      `zeile.vorschlag.wert !== undefined` (FR-012). Den Kommentar über der
      Bahnwahl („steht über den Zeilen, weil sie eine davon verändert")
      umschreiben — die Begründung kehrt sich um.

- [X] T024 Den Titel der Windzeile auf „Pistenwind (positiv = Gegenwind)"
      setzen (FR-013) — dieselbe Schreibweise wie am Regler, damit der Pilot
      nicht zwei verschiedene Formulierungen für dieselbe Größe liest.

- [X] T025 Die zugehörigen Stile in `WetterAbrufDialog.svelte` (~Zeile 520 ff.)
      nachziehen: `.bahnwahl` sitzt jetzt innerhalb einer Zeile und braucht
      Einzug statt oberen Abstand.

- [X] T026 Prüfen, dass ein Bahnwechsel weiterhin nur den Windvorschlag neu
      rechnet — kein neuer Abruf, keine zurückgesetzten Kästchen (FR-014).
      `gewaehlteBahn` bleibt `$state` und wird **nicht** zu `$derived`.

---

## Phase 6: Anordnung

**Hängt an nichts.** Darf vorgezogen werden.

- [X] T027 In `TakeoffDistance.svelte` den `.pistenwind`-Block (~Zeile 145) vor
      `fieldset.bahn` (~Zeile 124) ziehen (FR-017). Den Kommentar darüber
      („steht über der Ergebnistabelle") auf die neue Begründung umschreiben:
      Er steht ganz oben, damit er auf einer Höhe mit dem Streckenwind des
      Nachbarbereichs liegt und beide sichtbar zwei verschiedene Größen sind.

- [X] T028 In `+page.svelte`, Bereich `#bedarf` (~Zeile 524): den
      `#streckenwind`-Regler **vor** `#strecke` ziehen (FR-016) und die
      Kommentare beider Regler anpassen — der Streckenlängen-Kommentar
      („steht erst hier") bezieht sich auf die Stelle im Bereich, nicht auf die
      Reihenfolge darin, und bleibt inhaltlich gültig.

- [X] T029 Dem `.felder`-Block in `#bedarf` eine Zusatzklasse `einspaltig`
      geben und im `<style>` `grid-template-columns: 1fr` setzen (FR-015).
      **Zusatzklasse statt Änderung an `.felder`**: Derselbe Block trägt bei
      den Grundbedingungen die mehrspaltige Anordnung und soll sie behalten.
      Im Kommentar begründen: Die beiden Regler untereinander, weil
      nebeneinanderstehende Regler verschiedener Einheit (NM und kt) sich
      leichter verwechseln.

- [X] T030 FR-018 an der laufenden Anwendung prüfen: Beide Bereiche beginnen
      mit einer `<h3>` gleicher Größe, danach steht in beiden der Windregler —
      die gleiche Höhe sollte sich von selbst ergeben. **Zu prüfen ist der
      mittlere Breitenbereich**: „Streckenwindkomponente (kt, positiv =
      Gegenwind)" ist länger als „Pistenwind (kt, positiv = Gegenwind)" und
      könnte zweizeilig umbrechen, während der andere einzeilig bleibt. Ergibt
      sich ein Versatz, ihn über eine Mindesthöhe der Beschriftung
      auffangen — nicht über eine Kürzung des Texts.

---

## Phase 7: Prüfungen nachziehen

- [X] T031 `apps/web/tests/` durchsehen: alles, was `isaDeviationC` als
      Übernahmewert prüft, insbesondere
      `apps/web/tests/weather/openMeteo.test.ts` und etwaige Dialogtests.

- [X] T032 In `tests/ui/klickpfad.mjs` die Umbenennungen nachziehen (R5):
      Regler `#isa` → `#temperatur`, Kennungen `wetter-*-isa` →
      `wetter-*-temperatur`, `isa-herkunft` → `temperatur-herkunft`.
      **Prüfung 44** erwartet heute `16 °C` als Vorschauwert — der Sollwert
      lautet künftig `29 °C`.

- [X] T033 In `tests/ui/klickpfad.mjs` neue Prüfungen ergänzen:
      - die Folgezeile `isa-ableitung` zeigt die abgeleitete Abweichung mit
        einer Nachkommastelle (Anfangszustand: `ISA +9,9 °C`),
      - sie ändert sich, wenn die Platzhöhe verstellt wird, **während die
        Temperatur stehen bleibt** (S2 — die schärfste Prüfung dieses Features),
      - alle drei EDSH-Knöpfe öffnen denselben Dialog und übernehmen alle
        angehakten Größen (FR-008/FR-009, SC-003),
      - die Bahnwahl steht in der Windzeile und fehlt, wenn die Windzeile
        gesperrt ist (FR-011/FR-012),
      - die Windzeile nennt „positiv = Gegenwind" (FR-013).

- [X] T034 Eine Prüfung für SC-001 ergänzen: bei der Anfangseinstellung
      dieselben Ergebniszahlen wie in T002 notiert — bis auf die 0,06 °C, die
      der gerundete Anfangswert mit sich bringt. Weicht mehr ab, wird irgendwo
      gerundet, wo nicht gerundet werden darf.

- [X] T035 Die Grenzfälle aus Feature 027 gegenprüfen (S10): −10,06 kt rundet
      auf −10 kt und bleibt übernehmbar; −16,77 kt bleibt gesperrt. Diese
      Prüfungen dürfen durch den Umbau nicht verloren gehen.

- [X] T036 S4 aus [quickstart.md](./quickstart.md) im Klickpfad abbilden:
      Temperatur an den oberen Anschlag bei 0 ft, dann die Platzhöhe
      hochziehen — die Meldung des Kerns muss erscheinen, **wörtlich** (C-02),
      und die Temperatur darf nicht stillschweigend zurechtgerückt werden
      (FR-005).

- [X] T037 Vollständiger Durchlauf: `npx vitest run`, `npm run lint`,
      `svelte-check`, `npm run build`, dann
      `python3 -m http.server 8899 --directory apps/web/build &` und
      `node tests/ui/klickpfad.mjs`. Server danach über `lsof -ti :8899` und
      `kill <PID>` beenden.

---

## Phase 8: Abschluss

- [X] T038 `README.md`, Abschnitt „Wetterwerte aus dem Netz" (~Zeile 152):
      Die Tabelle nennt die drei Zeilen namentlich — „ISA-Abweichung" wird
      „Außentemperatur". Der Text nennt einen Einstiegsknopf; es sind jetzt
      drei. Den Fallstrick-Absatz zur Missweisung unangetastet lassen.

- [X] T039 Prüfen, ob der README-Abschnitt zur Eingabe die ISA-Abweichung als
      Eingabegröße nennt, und ihn gegebenenfalls auf die Außentemperatur
      umstellen.

- [X] T040 Diese Datei abschließen: alle Aufgaben auf `[X]`, Abweichungen vom
      Plan als A1, A2, … festhalten, Endstand der Prüfungen eintragen (Zahl der
      Tests und Zahl der Klickpfadprüfungen, jeweils gegen T001).

- [X] T041 Commit, Push, PR gegen `main`, CI abwarten. **Vor dem Merge
      rückfragen**, dann Squash-Merge und Branch löschen.

---

## Abhängigkeiten

```
Phase 1 (T001–T002)
   ↓
Phase 2 (T003–T009)  Kern
   ↓
Phase 3 (T010–T018)  Seite + Dialog — unteilbar
   ↓
Phase 4 (T019–T022)  Knöpfe
   ↓
Phase 5 (T023–T026)  Bahnwahl

Phase 6 (T027–T030)  Anordnung — unabhängig, jederzeit

Phasen 4, 5, 6 fertig
   ↓
Phase 7 (T031–T037)  Prüfungen
   ↓
Phase 8 (T038–T041)  Abschluss
```

**Parallel möglich**: T004 und T005 (verschiedene Dateien). T027 gegen T028/T029
(verschiedene Dateien). Phase 6 gegen alles andere.

**Nicht parallel**: alles innerhalb von Phase 3.

---

## Kleinster brauchbarer Stand

Phasen 1–3 allein ergeben bereits das Wesentliche: Der Pilot gibt die
Temperatur ein, die er abliest, und sieht die Abweichung darunter. Die Knöpfe,
die Bahnwahl und die Anordnung sind Bequemlichkeit und Klarheit — wertvoll,
aber nicht das, wofür dieses Feature da ist.

---

## Was am ehesten übersehen wird

- `apps/web/tests/weather/openMeteo.test.ts` — geriet schon in Feature 027
  ungeplant in die Schusslinie.
- Der Kommentar am QNH-Knopf, der die alte Einzelknopf-Entscheidung begründet
  (T019). Er ist ausführlich und wirkt dadurch gültig.
- Der Kommentar über der Bahnwahl im Dialog (T023).
- `formatCelsius` gegen `formatCelsiusPrecise`: der Regler zeigt ganze Grad,
  die Folgezeile eine Nachkommastelle. Das ist Absicht (R2), sieht aber wie ein
  Versehen aus und wird beim Aufräumen leicht „vereinheitlicht".


---

## Endstand

Umgesetzt am 11.08.2026. Alle 41 Aufgaben erledigt.

| Prüfung | Ergebnis |
|---|---|
| `npx vitest run` | 502 Tests, 19 Dateien, alle grün (vorher 492) |
| `npm run lint` | ohne Befund |
| `npm run check --workspace @edsh-bucky/web` | 0 Fehler, 0 Warnungen |
| `npm run build` | erfolgreich |
| `node tests/ui/klickpfad.mjs` | 72 Prüfungen, 0 durchgefallen (vorher 63) |

## Abweichungen vom Plan

**A1 — SC-001 gilt, der Anfangszustand ändert sich trotzdem um einen Meter.**
Der Plan ging davon aus, dass die Umstellung keine angezeigte Zahl bewegt.
Für *gleiche* Bedingungen stimmt das (in T002 nachgewiesen), für den
Anfangszustand nicht: Bei der Platzdruckhöhe von 977,8 ft trifft keine ganze
Grad-Zahl die früheren ISA+10 genau — 23 °C ergeben ISA+9,94. Die
Startrollstrecke fällt damit von 197,57 auf 197,49 m und rundet auf die andere
Seite. Prüfung 57 im Klickpfad steht deshalb jetzt auf 197 m, mit der
Begründung an Ort und Stelle. Das ist die unvermeidliche Folge davon, dass die
Temperatur in ganzen Grad einstellbar ist — und harmlos, weil ein Meter bei
knapp 200 m Rollstrecke unterhalb jeder Ablesegenauigkeit des Handbuchs liegt.

**A2 — eine Sackgasse im Dialog, die der Plan nicht vorhergesehen hatte.**
T023 sah vor, die Bahnwahl in der Windzeile zu zeigen, wenn es einen
Windvorschlag gibt. Genau so umgesetzt, verschwand sie in dem Moment, in dem
der Wind auf der gewählten Bahn jenseits der Reglergrenze lag — und der Weg
zurück zur anderen Bahn war weg. Aufgefallen ist es an Prüfung 54, die
seit Feature 027 genau diesen Fall stellt. Die Bahnwahl hängt jetzt daran, ob
der Dienst überhaupt einen Wind geliefert hat (`windGeliefert`), nicht daran,
ob der Vorschlag einstellbar ist. Prüfung 72 hält den Rückweg fest.

**A3 — der Klickpfad rechnet die ISA-Abweichung nicht selbst.**
Die älteren Prüfungen sind in ISA-Abweichungen formuliert, weil das Handbuch
es ist. Statt die Normtemperaturformel im Test nachzubauen — eine zweite
Wahrheit neben dem Kern, genau das, was Prinzip IV ausschließt — benutzt
`setzeIsa()` die Seite selbst als Umrechner: einen Probewert setzen, die
angezeigte Ableitung lesen, um die Differenz verschieben. Das geht, weil die
Beziehung die Steigung 1 hat.

**A4 — `ceilInward`/`floorInward` stehen nicht in `index.ts`.**
Sie sind Werkzeug der Bereichsbildung im Kern und für Adapter ohne Nutzen.
Die Tests greifen über den direkten Pfad `../src/format.js` darauf zu.

**A5 — der `.schnellwahl`-Stil steht zweimal.**
Einmal in `+page.svelte`, einmal in `TakeoffDistance.svelte`. Svelte kapselt
Stile je Komponente; ein gemeinsamer Ort wäre ein eigenes Stilblatt und damit
mehr Umstand als Nutzen bei acht Zeilen.
