# Implementation Plan: EDSH-Abruf um Temperatur und Pistenwind erweitern

**Branch**: `027-edsh-abruf-erweitern` | **Date**: 2026-08-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/027-edsh-abruf-erweitern/spec.md`

## Summary

Der Knopf „EDSH" holt seit Feature 025 den Luftdruck. Er soll künftig alle drei
Grundbedingungen holen, die der Rechner am Boden braucht: Luftdruck,
Temperatur und Wind auf der Bahn. Der Dienst liefert sie ohnehin mit derselben
Anfrage mit — sie werden bislang nur nicht angefordert.

Der Umbau hat vier Teile, und der wichtigste liegt im Kern:

1. **Zwei neue Umrechnungen im Kern.** Temperatur → ISA-Abweichung ist die
   Umkehrung von `toOutsideAirTemperature` und kommt daneben. Windrichtung →
   Bahnkomponente ist neu und bekommt ein eigenes Modul. Beide gehören nach
   Prinzip IV in den Kern, nicht in den Dialog (→ [E1](#e1), [E2](#e2)).
2. **Die Bahnrichtungen kommen zu den übrigen Platzdaten.** 103° und 283°
   rechtweisend stehen bei Koordinaten und Platzhöhe in `edsh.ts` — der Kern
   kennt weiterhin keinen Platz (→ [E3](#e3)).
3. **Der Abruf holt mehr.** Drei weitere Felder und die Einheit Knoten in der
   Anfrage; drei weitere Felder in der Antwort, jedes einzeln fehlend
   verkraftbar (→ [E4](#e4)).
4. **Der Dialog wird zum Wetterdialog.** Drei Zeilen mit Kästchen statt einer
   Zahl, eine Bahnwahl, ein Herkunftsvermerk je Regler (→ [E5](#e5), [E6](#e6)).

Die riskanteste Stelle ist keine der vier: Es ist die Frage, gegen **welche**
Zahl der Wind zerlegt wird. Die Bahnkennungen 10/28 sind missweisend, die
Windrichtung des Dienstes ist rechtweisend. Wer beides gegeneinander rechnet,
bekommt einen Wert, der um wenige Knoten falsch und dadurch unauffällig ist
(→ [R2](./research.md)).

## Technical Context

**Language/Version**: TypeScript 5.x, Node 22+, ES-Module

**Primary Dependencies**: SvelteKit 2 mit Svelte 5 (Runen), Zod im Kern. Keine
neue Abhängigkeit — die Trigonometrie kommt aus `Math`.

**Storage**: Keine. Der Abruf lebt nur so lange wie der Seitenbesuch.

**Testing**: Vitest für Kern und Adapterbausteine, `svelte-check` und ESLint für
die Oberfläche, der Playwright-Klickpfad unter `tests/ui/klickpfad.mjs` für den
Dialog im Gebrauch. Der Klickpfad ruft den Wetterdienst **nicht** auf; die
Antwort wird im Browser abgefangen (→ [R6](./research.md)).

**Target Platform**: Statisch ausgelieferte Web-Oberfläche (GitHub Pages) ohne
eigenen Server. Der Abruf geht aus dem Browser des Piloten hinaus.

**Project Type**: Monorepo mit einem UI-freien Rechenkern und dünnen Adaptern.

**Performance Goals**: Unverändert. Es kommen drei Felder in derselben Anfrage
hinzu, kein zweiter Abruf.

**Constraints**: Kein Adapter rechnet oder rundet (C-03, C-04) — die
Winkelrechnung gehört deshalb in den Kern und wird durch eine neue Zusicherung
C-09 dort festgehalten. Kein Adapter legt Wertebereiche fest (C-05); die
Prüfung auf Übernehmbarkeit bezieht ihre Grenzen aus `getFuelPlanInputDomain()`
und `getTakeoffInputDomain()`.

**Scale/Scope**: Zwei neue Kernfunktionen, ein neues Kernmodul, Erweiterungen
an `edsh.ts` und `openMeteo.ts`, ein umgebauter Dialog, drei Herkunftsvermerke
in `+page.svelte`, neue und angepasste Prüfungen im Klickpfad, ein Abschnitt im
README.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Prinzip | Bewertung |
|---------|-----------|
| **I. Deterministic Safety-Critical Calculations** | Berührt und eingehalten. Es entsteht keine neue Interpolation in POH-Tabellen; die beiden neuen Umrechnungen folgen der Normatmosphäre bzw. der Trigonometrie und tragen `kind: 'standard'` als Quellenreferenz, keine erfundene Seitenzahl. Der übernommene Wert ist ein **Vorschlag**, der in einen Regler geschrieben wird — die eigentliche Leistungsrechnung sieht ihn nicht anders als eine Handeingabe. Die Aufklärung über die Unverbindlichkeit und der Prüfhinweis gegen das Original-POH bleiben im Dialog stehen (FR-019). Die Bahnrichtungen sind belegt, nicht aus dem Gedächtnis gebildet (→ [R2](./research.md)). |
| **II. Vereinsflieger as System of Record** | Nicht berührt. Es werden keine Vereinsdaten gelesen oder gehalten. |
| **III. SvelteKit as Frontend Standard** | Eingehalten. |
| **IV. Shared Deterministic Core, Multiple Access Paths** | Eingehalten. Beide Umrechnungen liegen im Kern und wären damit auch über den MCP-Zugang nutzbar; der Dialog ruft sie auf und rundet nichts nach. Die neue Zusicherung C-09 hält mechanisch fest, dass kein Adapter selbst Winkel rechnet — dieselbe Bauart wie C-04 für die Druckhöhe. |

**Ergebnis vor Phase 0**: PASS. Keine Abweichung zu begründen.

**Ergebnis nach Phase 1**: PASS. Der Entwurf legt beide Rechnungen in den Kern
(E1, E2), hält die Platzdaten aus ihm heraus (E3), bezieht alle Wertebereiche
aus dem Kern (E6) und fügt mit C-09 eine Schranke hinzu, statt eine zu lockern.

## Project Structure

### Documentation

```
specs/027-edsh-abruf-erweitern/
├── spec.md
├── plan.md              # diese Datei
├── research.md          # R1–R7: die Befunde, die den Entwurf tragen
├── data-model.md        # die Datenformen, die entstehen
├── contracts/
│   ├── deelk-poh-core.md   # was der Kern zusätzlich anbietet
│   └── web.md              # was die Oberfläche zusichert
├── quickstart.md        # wie sich das Ergebnis nachprüfen lässt
├── tasks.md             # entsteht mit /speckit-tasks
└── checklists/
    └── requirements.md
```

### Source Code

```
packages/deelk-poh-core/
├── src/
│   ├── atmosphere/
│   │   └── temperature.ts        # ERWEITERT: toIsaDeviation daneben
│   ├── wind/
│   │   └── runwayComponent.ts    # NEU: Zerlegung gegen die Bahnachse
│   ├── format.ts                 # ERWEITERT: roundCelsius
│   └── index.ts                  # ERWEITERT: die neuen Ausfuhren
└── tests/
    ├── contract.test.ts          # ERWEITERT: C-09
    ├── temperature.test.ts       # ERWEITERT: Rundlauf ISA ↔ OAT
    └── runwayComponent.test.ts   # NEU

apps/web/src/
├── lib/
│   ├── weather/
│   │   ├── edsh.ts               # ERWEITERT: RUNWAYS mit 103°/283°
│   │   └── openMeteo.ts          # ERWEITERT: Temperatur und Wind
│   └── components/
│       ├── QnhAbrufDialog.svelte # ENTFÄLLT — wird zu:
│       └── WetterAbrufDialog.svelte  # NEU: drei Zeilen, Bahnwahl
└── routes/
    └── +page.svelte              # ERWEITERT: drei Herkunftsvermerke

tests/ui/klickpfad.mjs            # ERWEITERT und ANGEPASST
README.md                         # ERWEITERT
```

**Structure Decision**: Die Aufteilung folgt Prinzip IV und der bereits
bestehenden Ordnung: Was rechnet, liegt im Kern; was einen Platz oder einen
Dienst kennt, liegt im Adapter. Die einzige neue Entscheidung ist der Ordner
`src/wind/` — die Zerlegung gehört weder zur Atmosphäre (sie folgt keiner Norm)
noch zur Startstrecke (sie ist von der Tabelle unabhängig und für die Landung
genauso gültig).

## Entwurfsentscheidungen

### E1 — `toIsaDeviation` kommt neben `toOutsideAirTemperature`

Beide Richtungen derselben Beziehung stehen in derselben Datei, mit denselben
Konstanten: `T0_C` und `LAPSE_RATE_K_PER_FT` kommen bereits aus
`pressureAltitude.ts` und werden nicht verdoppelt. Ein Rundlauftest hält beide
Richtungen gegeneinander — dieselbe Bauart wie C-08 für Druckhöhe und QNH.

**Verworfen**: die Abweichung im Dialog bilden. Es sind zwei Zeilen Code, und
genau deshalb wäre es verlockend; aber die Normtemperatur stünde dann ein
zweites Mal in der Anwendung, und die beiden Stellen könnten auseinanderlaufen,
ohne dass ein Test das bemerkte.

### E2 — Die Windzerlegung bekommt ein eigenes Kernmodul

`toRunwayWindComponent(windFromDegTrue, windSpeedKt, runwayBearingDegTrue)`
liefert Längs- und Querkomponente. Sie kennt keine Bahn, keinen Platz und keine
Tabelle — sie bekommt drei Zahlen, wie `toQnh` zwei bekommt.

Die Querkomponente wird **mitgeliefert, aber nicht angezeigt** (Out of Scope).
Sie fällt bei der Zerlegung ohnehin an; sie wegzuwerfen hieße, sie später ein
zweites Mal zu rechnen.

**Verworfen**: die Zerlegung in `takeoff/` unterbringen. Sie hängt an keiner
Tabelle und gilt für die Landung genauso.

### E3 — Die Bahnrichtungen stehen in `edsh.ts`, nicht im Kern

Der Kern „kennt keinen Platz, keine Koordinaten und keinen Onlinedienst" — so
steht es im Kopf von `qnh.ts`, und daran ändert dieses Feature nichts. Die
beiden Bahnrichtungen sind eine Eigenschaft von EDSH und stehen deshalb dort,
wo Platzhöhe und Koordinaten schon stehen (FR-018).

### E4 — Ein fehlendes Feld sperrt eine Zeile, nicht den Dialog

`WetterAbruf` führt Temperatur und Wind als **optionale** Felder. Fehlt der
Luftdruck, ist die Antwort unbrauchbar — er ist der Anlass des Abrufs und
bleibt Pflicht. Fehlt die Temperatur oder der Wind, bleibt der Rest verwendbar
(FR-007).

Die Windgeschwindigkeit wird in **Knoten** angefordert (`wind_speed_unit=kn`),
nicht in km/h umgerechnet. Eine Umrechnung im Adapter wäre eine Rechnung im
Sinne von C-02; eine im Kern wäre eine Umrechnung, die dort nichts zu suchen
hat, weil sie eine Eigenheit dieses einen Dienstes ist. Der Dienst kann beides
liefern — also lässt man ihn.

### E5 — Der Dialog heißt künftig `WetterAbrufDialog`

Er ruft kein QNH mehr ab, sondern Wetter. Ein Name, der nur noch für ein
Drittel des Inhalts stimmt, ist schlechter als eine Umbenennung, die einmal
durch die Prüfungen geht. Die Kennungen im Klickpfad (`qnh-vorschau` und so
fort) werden im selben Zug mitgezogen.

### E6 — Drei Herkunftsvermerke statt einem, und keine Sammelstruktur

`qnhHerkunft`, `isaHerkunft`, `pistenwindHerkunft` als drei einzelne `$state`.
Ein gemeinsames Objekt wäre kürzer, aber jeder Vermerk verschwindet zu einem
eigenen Anlass (FR-015); drei unabhängige Zustände bilden genau das ab. Das
bewährte Muster von Feature 025 — Löschen am Bedienereignis des Reglers, nicht
in einem `$effect` — wird für alle drei übernommen: Ein Effekt liefe auch beim
Übernehmen und löschte den Vermerk im selben Atemzug, in dem er entsteht.

### E7 — Die Bahnwahl löst keinen zweiten Abruf aus

Der Abruf liefert Windrichtung und -geschwindigkeit; die Zerlegung geschieht
danach. Ein Wechsel der Bahn rechnet also nur neu, er holt nichts (FR-011). In
Svelte 5 fällt das von selbst an, wenn der Vorschauwert ein `$derived` über dem
Abrufergebnis und der gewählten Bahn ist.

## Complexity Tracking

Keine Abweichung von der Verfassung, die zu begründen wäre. Der Entwurf fügt
eine Schranke hinzu (C-09) und lockert keine.

Die einzige nennenswerte Zunahme an Umfang ist der Dialog: aus einer Zahl
werden drei Zeilen mit Kästchen und eine Bahnwahl. Das ist der Preis dafür,
dass ein Pilot einzelne Werte abwählen kann — und genau dieser Preis ist im
Issue ausdrücklich gewollt, weil ein Alles-oder-nichts für den häufigen Fall
(ein Wert ist besser bekannt als die anderen) unbrauchbar wäre.
