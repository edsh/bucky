# Implementation Plan: Reiseleistungs-Übersicht und neue Formulargliederung

**Branch**: `006-reiseleistung-uebersicht` | **Date**: 2026-08-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-reiseleistung-uebersicht/spec.md`

## Summary

Die Reiseleistungstabelle Abb. 5-4a führt neben Geschwindigkeit und Verbrauch
auch maximale Strecke und Flugdauer. Beide Spalten sind seit Feature 001
digitalisiert, werden aber nicht genutzt — die Bedarfsrechnung schließt sie
ausdrücklich aus, weil sie Rollen, Steigflug und Reserve bereits enthalten.

Dieses Feature macht sie als **eigenständige Auskunft** nutzbar: eine neue
Kernfunktion `computeCruiseCapability` schlägt zu Reiseflughöhe, Luftdruck,
Temperatur und Lasteinstellung die vier Größen nach und liefert sie samt
Rechenschritt und Quellenangabe. Die Weboberfläche zeigt sie zwischen den
Eingabegruppen und ordnet das Formular neu: Bedingungen des Reiseflugs oben,
Übersicht in der Mitte, Angaben zum Vorhaben unten.

Der entscheidende Punkt ist die **Trennung zweier Rechnungen**, die dieselben
Einheiten tragen: Die Übersicht ist eine Handbuchauskunft mit Reserve bei
Windstille; der Bedarf darunter ist eine Planung ohne Reserve mit Wind. Sie
dürfen weder rechnerisch noch sprachlich ineinanderlaufen.

## Technical Context

**Language/Version**: TypeScript 5.x, Node 20+, ES-Module

**Primary Dependencies**: Zod (Eingabeprüfung im Kern), SvelteKit 2 mit Svelte 5
(Runen), `@sveltejs/adapter-static`

**Storage**: Keine. Die Tabellen liegen als geprüfte JSON-Dateien unter
`data/poh/d-eelk/tables/` und werden zur Bauzeit eingebunden.

**Testing**: Vitest für Kern und MCP-Adapter, `svelte-check` und ESLint für die
Oberfläche, ein Playwright-Klickpfad unter `tests/ui/klickpfad.mjs`, dazu
`verify_d_eelk.py` für den Abgleich der Daten gegen das PDF.

**Target Platform**: Statisch ausgelieferte Web-Oberfläche (GitHub Pages) sowie
ein MCP-Adapter für den Zugriff über ein Sprachmodell.

**Project Type**: Monorepo mit einem UI-freien Rechenkern und mehreren dünnen
Adaptern.

**Performance Goals**: Die Übersicht wird bei jeder Reglerbewegung neu
ermittelt; sie muss ohne wahrnehmbare Verzögerung folgen. Es handelt sich um
zwei Interpolationen über eine Tabelle mit 53 Zeilen — das ist unkritisch.

**Constraints**: Keine Extrapolation über den Tabellenrand. Kein Adapter rundet
oder rechnet selbst. Die Übersicht darf nicht von Streckenlänge oder
Windkomponente abhängen.

**Scale/Scope**: Eine neue Kerndatei, eine neue Oberflächen-Komponente, Umbau
einer Seite, Erweiterung des MCP-Werkzeugs.

## Constitution Check

*GATE: Vor Phase 0 zu bestehen, nach Phase 1 erneut zu prüfen.*

| Prinzip | Bewertung | Begründung |
|---|---|---|
| I. Deterministische sicherheitskritische Berechnung | **erfüllt** | Strecke und Dauer werden aus der geprüften Tabelle interpoliert, nicht gebildet. Die Quellenangabe nennt Abb. 5-4a mit den Seiten 5b-14 bis 5b-16; der Prüfhinweis bleibt. Der Rechenweg bekommt einen eigenen Schritt. |
| I, Zusatz: Ableitung verboten | **erfüllt und mechanisch gesichert** | Bei 0 ft und 100 % ergäbe KTAS × Dauer 362,5 NM statt der 365 NM der Tabelle. Eine Vertragsprüfung stellt sicher, dass kein Adapter die Spaltennamen kennt. |
| II. Vereinsflieger als führendes System | **nicht berührt** | Keine Vereinsdaten im Spiel. |
| III. SvelteKit als Frontend-Standard | **erfüllt** | Die Änderung bleibt in der bestehenden SvelteKit-Anwendung. |
| IV. Gemeinsamer Kern, dünne Adapter | **erfüllt** | Nachschlagen, Temperaturkorrektur und Formatierung liegen im Kern. Die Oberfläche ruft nur auf und stellt dar; der MCP-Adapter erhält dieselben Werte über dasselbe Ergebnis. |

**Ergebnis vor Phase 0**: bestanden, keine Ausnahme nötig.

**Ergebnis nach Phase 1**: bestanden. Die Entwurfsentscheidung, die Übersicht
als **eigene** Kernfunktion und zugleich als Feld des Gesamtergebnisses
anzubieten, folgt unmittelbar aus Prinzip IV: Beide Zugangswege sollen dieselbe
Zahl sehen, ohne dass einer von ihnen sie ein zweites Mal ermittelt.

## Project Structure

### Documentation (this feature)

```text
specs/006-reiseleistung-uebersicht/
├── plan.md              # Diese Datei
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/           # Phase 1
├── checklists/
│   └── requirements.md  # aus /speckit-specify
└── tasks.md             # aus /speckit-tasks
```

### Source Code (repository root)

```text
packages/deelk-poh-core/
├── src/
│   ├── fuel/
│   │   ├── cruiseCapability.ts   # NEU: Nachschlagen von Strecke und Dauer
│   │   ├── cruise.ts             # Erklärtext verweist auf den neuen Schritt
│   │   ├── input.ts              # Prüfungen werden wiederverwendbar exportiert
│   │   └── fuelPlan.ts           # bettet die Übersicht ins Gesamtergebnis ein
│   ├── tables.ts                 # Zugriff auf die Anmerkungen der Tabelle
│   └── index.ts                  # Ausfuhr der neuen Funktion und Typen
└── tests/
    ├── fuel/cruiseCapability.test.ts   # NEU
    └── contract.test.ts                # C-06 neu

apps/web/src/
├── lib/components/
│   ├── CruiseCapability.svelte   # NEU: die Übersicht samt Hinweis
│   └── FuelResult.svelte         # Leistungsliste wandert heraus
└── routes/+page.svelte           # neue Gliederung in zwei Gruppen

apps/mcp/src/tools/computeFuelPlan.ts   # Übersicht in der Zusammenfassung

tests/ui/klickpfad.mjs                   # neue Prüfungen 21 ff.
```

**Structure Decision**: Es bleibt bei der bestehenden Aufteilung
Kern / Web / MCP. Neu ist genau eine Kerndatei und genau eine
Oberflächen-Komponente; alles andere sind Änderungen an vorhandenen Dateien.

## Entwurfsentscheidungen

### Eigene Funktion statt Nebenprodukt der Bedarfsrechnung

`computeCruiseCapability` nimmt nur vier Eingaben entgegen: Reiseflughöhe über
dem Meeresspiegel, QNH, Lasteinstellung und ISA-Abweichung. Sie ist damit
unabhängig von Streckenlänge und Wind — genau wie FR-009 es verlangt. Das ist
kein Schönheitsgrund: Scheitert die Bedarfsrechnung, weil der Gegenwind die
Eigengeschwindigkeit erreicht oder die Steigflugstrecke die Gesamtstrecke
übersteigt, soll die Übersicht trotzdem stehen bleiben. Sie erklärt dann
nämlich gerade, warum das Vorhaben nicht aufgeht.

`computeFuelPlan` ruft dieselbe Funktion auf und legt ihr Ergebnis als Feld
`cruiseCapability` ins Gesamtergebnis. So sieht der MCP-Adapter dieselben
Zahlen, ohne einen zweiten Aufruf zu benötigen.

### Die Reiseleistungstabelle begrenzt sich selbst

Die Prüfung der Druckhöhe geschieht bisher gegen das **gemeinsame** Raster von
Steigflug- und Reiseleistungstabelle. Für die Übersicht ist das zu streng: Sie
braucht die Steigflugtabelle nicht. Sie prüft daher gegen das Raster der
Reiseleistungstabelle allein. Beide Raster reichen derzeit von 0 bis 18 000 ft,
die Unterscheidung ändert also heute keine Zahl — sie hält aber die Kopplung
richtig, falls sich eine der beiden Tabellen einmal ändert.

### Zwei Strecken, zwei Namen

Die eingegebene Größe heißt weiterhin **Streckenlänge**. Die neue heißt
**maximale Strecke** und trägt den Hinweis unmittelbar bei sich. In der
Übersicht steht keine Zahl ohne diesen Hinweis.

## Complexity Tracking

Keine Verstöße gegen die Constitution, daher keine Einträge.
