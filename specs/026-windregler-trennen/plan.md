# Implementation Plan: Windkomponente in „Pistenwind" und „Streckenwindkomponente" aufteilen

**Branch**: `026-windregler-trennen` | **Date**: 2026-08-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/026-windregler-trennen/spec.md`

## Summary

Ein Regler speist zwei Rechnungen, die nichts miteinander zu tun haben. Der
Bodenwind an der Bahn 10/28 in EDSH und der Höhenwind auf 4500 ft sind zwei
verschiedene Zahlen; der Rechner verlangt heute, sich für eine zu entscheiden.
Dieses Feature trennt sie.

Der Umbau ist klein und fast vollständig in der Oberfläche. Drei Punkte
verdienen trotzdem Aufmerksamkeit:

1. **Der Kern trennt längst.** `takeoff/input.ts` und `fuel/input.ts` führen je
   ein eigenes `windComponentKt` mit eigenem Bereich. Die Oberfläche hat diese
   Trennung bisher wieder eingeebnet. Es entsteht also keine neue Rechnung, es
   verschwindet eine Vermischung (→ [R1](./research.md)).
2. **Die beiden Bereiche sind verschieden — und das ist belegt.** −10…50 kt für
   den Pistenwind, −50…50 kt für die Strecke. Die 10 kt Rückenwind stammen aus
   Anmerkung 3 zu Abb. 5-4 des Original-POH; die Betriebsgrenzen in Abschnitt 2
   nennen überhaupt keinen Wind (→ [R2](./research.md)).
3. **Eine Prüfung im Klickpfad verliert ihren Gegenstand.** Prüfung 32 löst
   heute die Rückenwindmeldung des Kerns über die Oberfläche aus. Mit der
   engeren Reglergrenze ist das nicht mehr möglich. Die Meldung bleibt im Kern
   und bleibt dort geprüft; im Klickpfad tritt die Reglergrenze an ihre Stelle
   (→ [R3](./research.md)).

Im Kern ändert sich **nichts**. Neu sind zwei `$state` statt einem, ein
`$bindable`-Prop an `TakeoffDistance.svelte` und ein zweiter Regler beim
Kraftstoffbedarf.

## Technical Context

**Language/Version**: TypeScript 5.x, Node 22+, ES-Module

**Primary Dependencies**: SvelteKit 2 mit Svelte 5 (Runen). Keine neue
Abhängigkeit.

**Storage**: Keine.

**Testing**: Vitest für den Kern (unverändert, dient hier als Regressionsnetz),
`svelte-check` und ESLint für die Oberfläche, der Playwright-Klickpfad unter
`tests/ui/klickpfad.mjs` für die Trennung im Gebrauch.

**Target Platform**: Statisch ausgelieferte Web-Oberfläche (GitHub Pages).

**Project Type**: Monorepo mit einem UI-freien Rechenkern und dünnen Adaptern.

**Performance Goals**: Unverändert. Es kommt ein Regler hinzu, keine Rechnung.

**Constraints**: Kein Adapter legt Wertebereiche fest (C-05) — beide Bereiche
werden vom Kern bezogen. Kein Adapter rechnet oder rundet (C-03, C-04). Die
Ergebnisbereiche bleiben voneinander unabhängig (FR-009).

**Scale/Scope**: Änderungen an `apps/web/src/routes/+page.svelte` und
`apps/web/src/lib/components/TakeoffDistance.svelte`, Anpassungen an
`tests/ui/klickpfad.mjs`, ein Satz im README.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Prinzip | Bewertung |
|---------|-----------|
| **I. Deterministic Safety-Critical Calculations** | Berührt, nicht verletzt. Es entsteht keine neue Interpolation und keine neue Rundung. Quellenreferenz und Prüfhinweis kommen unverändert aus dem Kern. Die einzige inhaltliche Aussage dieses Features — 10 kt Rückenwind als Reglergrenze — ist am Original-POH belegt (Seite 5-12) und **nicht** aus dem Gedächtnis gebildet; sie liegt zudem bereits als `MAX_TAILWIND_KT` im Kern. |
| **II. Vereinsflieger as System of Record** | Nicht berührt. |
| **III. SvelteKit as Frontend Standard** | Eingehalten. |
| **IV. Shared Deterministic Core, Multiple Access Paths** | Eingehalten und gestärkt. Der Kern führt beide Windgrößen schon getrennt; heute verletzt die Oberfläche diese Trennung, indem sie einen Wert in beide Eingänge schreibt. Das Feature beseitigt genau diese Abweichung. Kein Bereich, keine Formel und keine Meldung wird in der Oberfläche dupliziert. |

**Ergebnis vor Phase 0**: PASS. Keine Abweichung zu begründen.

**Ergebnis nach Phase 1**: PASS. Der Entwurf legt keinen Wertebereich in der
Oberfläche fest (E1), führt keine Rechnung ein (E2) und lässt den Kern
unverändert (E4).

## Project Structure

### Documentation (this feature)

```text
specs/026-windregler-trennen/
├── spec.md
├── plan.md              # diese Datei
├── research.md          # Phase 0
├── quickstart.md        # Phase 1
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

Kein `data-model.md` und kein `contracts/`: Es entsteht keine Entität und keine
neue Schnittstelle. Die berührten Zusicherungen (C-02, C-05) stehen bereits in
`packages/deelk-poh-core/tests/contract.test.ts` und bleiben unverändert
gültig — sie hier abzuschreiben würde nur eine zweite Fassung schaffen, die
später auseinanderlaufen kann.

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── routes/
│   │   └── +page.svelte              # zwei $state statt einem; Fieldset „Platzhöhe";
│   │                                 # Regler „Streckenwindkomponente" beim Bedarf
│   └── lib/components/
│       ├── TakeoffDistance.svelte    # neues $bindable-Prop + Regler „Pistenwind"
│       └── RangeField.svelte         # unverändert
└── ...

packages/deelk-poh-core/              # unverändert

tests/ui/klickpfad.mjs                # Beschriftungen, Grenzen, Prüfungen 13/21/31/32/36
```

**Structure Decision**: Bestehende Monorepo-Struktur. Der Regler für den
Pistenwind zieht in `TakeoffDistance.svelte` ein, weil er dorthin gehört, wo er
wirkt (FR-002) — dieselbe Begründung, mit der die beiden Bahnzustandsschalter
schon dort stehen. Sein Wert wird als `$bindable` nach oben gereicht, weil
`+page.svelte` die Rechnung anstößt; das ist genau das Muster von `dryGrass`
und `wetOrSnow`.

## Entwurfsentscheidungen

### E1 — Der Pistenwindregler bezieht seinen Bereich aus `getTakeoffInputDomain()`

`TakeoffDistance.svelte` importiert die Funktion selbst, statt den Bereich als
Prop zu bekommen. Grund: Ein durchgereichter Bereich müsste in `+page.svelte`
zwischengelagert werden, und dort steht schon der Bereich der *anderen*
Windgröße. Zwei gleichbedeutend aussehende Bereiche in einer Datei sind genau
die Verwechslungsgefahr, die dieses Feature abbaut.

### E2 — Zwei `$state` ohne jede Kopplung

`runwayWindComponentKt` und `routeWindComponentKt`. Kein `$effect`, der den
einen aus dem anderen ableitet, auch nicht als Anfangsbelegung nach dem ersten
Verstellen. Beide starten auf 10 kt — dem heutigen Anfangswert — und gehen
danach getrennte Wege (FR-007, FR-008).

### E3 — Die Element-IDs wandern mit

`#wind` wird zu `#pistenwind` und `#streckenwind`. Ein bleibendes `#wind` für
eine der beiden Größen wäre die naheliegende Abkürzung und der schlechteste
Ausgang: Wer später im Klickpfad `#wind` liest, weiß nicht mehr, welche der
beiden Größen gemeint ist.

### E4 — Die Rückenwindmeldung des Kerns bleibt unangetastet

Sie ist über die Oberfläche nicht mehr auslösbar, aber sie ist nicht tot: Der
Kern ist ein eigenständiges Modul mit einem zweiten Zugangsweg (Prinzip IV),
und ein MCP-Aufrufer kann sehr wohl −20 kt schicken. Die Meldung dort zu
entfernen, weil ein Adapter sie nicht mehr provoziert, hieße den Kern von
seinem lautesten Adapter abhängig zu machen.

### E5 — Der Regler steht über der Ergebnistabelle, nicht darunter

Im Bereich der Startstrecke folgt er unmittelbar auf das Fieldset
„Bahnzustand". Eingaben oben, Ergebnis unten — dieselbe Leserichtung wie im
Bereich des Kraftstoffbedarfs, wo die Streckenlänge schon über dem Ergebnis
steht.

## Complexity Tracking

Keine Verstöße gegen die Constitution, nichts zu begründen.
