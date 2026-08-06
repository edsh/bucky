# Implementation Plan: Kraftstoffrechner für D-EELK

**Branch**: `001-kraftstoffrechner-d-eelk` | **Date**: 2026-08-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-kraftstoffrechner-d-eelk/spec.md`

## Summary

Der Kraftstoffbedarf eines Flugvorhabens wird nach dem Rechenverfahren des POH
(Seite 5-3 bis 5-5) aus den bereits digitalisierten Tabellen des Abschnitts 5b
berechnet: Festbetrag für Anlassen/Rollen/Start, Steigflug per Differenzbildung
mit Temperaturkorrektur, Reiseflug aus verbleibender Strecke, Geschwindigkeit über
Grund und Verbrauchsrate.

Umgesetzt wird das als UI-freies TypeScript-Kernpaket `@edsh-bucky/deelk-poh-core`, das die
Rechnung als geordnete Folge protokollierter Rechenschritte zurückgibt — jeder
Schritt mit Eingangswerten, Ergebnis, verwendeten Tabellen-Eckwerten und
Quellenreferenz. Darauf setzen zwei dünne Adapter auf: eine SvelteKit-Oberfläche
und ein MCP-Server. Beide enthalten keine Rechen- oder Rundungslogik
(Constitution-Prinzip IV).

Die Berechnung ist rein funktional und die Datengrundlage statisch. Es wird daher
weder ein Anwendungsserver noch eine Datenbank benötigt: Die Web-Oberfläche wird
als statisches Bundle ausgeliefert, der MCP-Server läuft lokal über stdio.

## Technical Context

**Language/Version**: TypeScript 5.x auf Node.js 22 LTS; Zielumgebung des
Web-Adapters ist der Browser (ES2022).

**Primary Dependencies**: SvelteKit mit `@sveltejs/adapter-static` (Prinzip III),
`@modelcontextprotocol/sdk` für den MCP-Adapter, Zod für die Eingabevalidierung an
den Adaptergrenzen. Das Kernpaket selbst hat außer Zod keine Laufzeitabhängigkeit.

**Storage**: Keine. Die Datengrundlage sind die 13 versionierten JSON-Dateien unter
`data/poh/d-eelk/`, die zur Bauzeit in das Bundle eingebunden werden. Kein
Persistieren von Berechnungen (kein Login, keine Nutzerdaten).

**Testing**: Vitest für Unit- und Vertragstests; die bestehende Prüfung der
Datengrundlage bleibt bei `tools/poh/verify_d_eelk.py` (Python) und wird nicht
portiert.

**Target Platform**: Statisch ausgeliefertes Web-Frontend (GitHub Pages), lauffähig
in aktuellen Browsern auch ohne Netzverbindung nach dem ersten Laden; MCP-Server als
lokal per stdio gestarteter Node-Prozess.

**Project Type**: npm-Workspaces-Monorepo mit einem Kernpaket und zwei Adaptern.

**Performance Goals**: Eine Berechnung ist eine Handvoll Tabellenzugriffe und
Interpolationen; das Ergebnis erscheint ohne wahrnehmbare Verzögerung (SC-001).
Kein gesondertes Performance-Ziel nötig.

**Constraints**: Keine Extrapolation über die Tabellenränder hinaus (FR-007). Keine
Gleitkomma-Rundung vor der Ausgabe außer an genau einer Stelle im Kern. Die
Datendateien sind generiert und werden nicht von Hand bearbeitet.

**Scale/Scope**: Ein Flugzeug, ein Rechenverfahren, zwei Zugangswege. Rund 15
Eingabefelder, eine Ergebnisseite.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**I. Deterministic Safety-Critical Calculations** — erfüllt.
Die Tabellen sind digitalisiert und dreifach gegengeprüft (2619 Prüfungen, 0
Abweichungen). Die Interpolation läuft als Code in `@edsh-bucky/deelk-poh-core`. Ein LLM
erhält über MCP ausschließlich ein Werkzeug, das den Kern aufruft; es bekommt keine
Rohtabellen zum Selbstinterpolieren. Jeder Rechenschritt trägt die
`source.citation` der verwendeten Tabelle (Seitenzahl + Tabellenname); der
Prüfhinweis wird vom Kern erzeugt, nicht von den Adaptern.

**II. Vereinsflieger as System of Record** — nicht berührt.
Das Feature verarbeitet keine Mitglieds-, Buchungs- oder Flugzeugstammdaten. Die
Zuordnung "D-EELK hat Propeller MTV-6-A/190-69" ist eine Eigenschaft des
digitalisierten Handbuchs, keine vereinsseitige Stammdatenhaltung.

**III. SvelteKit as Frontend Standard** — erfüllt.
Die Oberfläche ist eine SvelteKit-Anwendung. `adapter-static` ist ein SvelteKit-
Adapter, kein abweichendes Framework.

**IV. Shared Deterministic Core, Multiple Access Paths** — erfüllt.
`packages/deelk-poh-core` ist UI-frei und kennt weder SvelteKit noch MCP. `apps/web` und
`apps/mcp` importieren es und beschränken sich auf Eingabeentgegennahme und
Darstellung. Rundung, Interpolation, Quellenangabe und Prüfhinweis liegen
ausschließlich im Kern.

**Gate-Ergebnis**: bestanden, keine Abweichungen zu begründen.

**Erneute Prüfung nach Phase 1**: Die Entwurfsartefakte halten die Prinzipien ein.
`contracts/deelk-poh-core.md` schreibt in C-01 bis C-04 fest, dass der Kern
UI-frei bleibt, genau einmal rundet und keine Laufzeit-Dateizugriffe macht;
`contracts/mcp-tools.md` schließt in M-03 aus, dass ein Sprachmodell Rohtabellen
zum Selbstinterpolieren erhält. Das Datenmodell führt die Quellenreferenz in jedem
Rechenschritt mit, nicht nur im Gesamtergebnis.

## Project Structure

### Documentation (this feature)

```text
specs/001-kraftstoffrechner-d-eelk/
├── plan.md              # Diese Datei
├── spec.md              # Feature-Spezifikation
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/           # Phase 1
│   ├── deelk-poh-core.md # Öffentliche API des Kernpakets
│   └── mcp-tools.md     # Werkzeugschema des MCP-Adapters
└── tasks.md             # Phase 2 (/speckit-tasks, nicht von /speckit-plan erzeugt)
```

### Source Code (repository root)

```text
packages/
└── deelk-poh-core/            # UI-freier Berechnungskern der D-EELK (Prinzip IV)
    ├── src/
    │   ├── index.ts           # Öffentliche API
    │   ├── types.ts           # Gemeinsame Typen (Quellenreferenz, Eckwert, Rechenschritt)
    │   ├── errors.ts          # Fehlerarten (ausserhalb Wertebereich, ungueltige Kombination)
    │   ├── tables.ts          # Laden und Auswaehlen der POH-Tabellen
    │   ├── interpolate.ts     # Deterministische Interpolation inkl. Eckwert-Protokoll
    │   ├── format.ts          # Die eine Rundungs-/Darstellungsstelle
    │   └── fuel/              # Kraftstoffrechnung (dieses Feature)
    │       ├── input.ts       # Flugvorhaben und Validierung
    │       ├── climb.ts       # Steigflug: Differenzbildung und Temperaturkorrektur
    │       ├── cruise.ts      # Reiseflug: KTAS, Groundspeed, Zeit, Kraftstoff
    │       └── fuelPlan.ts    # Orchestriert die Rechenschritte
    └── tests/
        ├── interpolate.test.ts
        ├── fuel/climb.test.ts
        ├── fuel/cruise.test.ts
        ├── fuel/fuelPlan.test.ts   # inkl. Nachrechnen nach dem POH-Verfahren
        └── citations.test.ts       # jeder Schritt traegt eine Quellenreferenz

apps/
├── web/                       # SvelteKit, adapter-static
│   ├── src/routes/            # Eingabemaske und Ergebnisdarstellung
│   ├── src/lib/               # Nur Darstellung, keine Rechenlogik
│   └── tests/
└── mcp/                       # MCP-Server ueber stdio
    ├── src/server.ts
    └── tests/

data/poh/d-eelk/               # Vorhanden: Datengrundlage (generiert)
tools/poh/                     # Vorhanden: Extraktion und Doppelpruefung
```

**Structure Decision**: npm-Workspaces-Monorepo unter dem Namensraum
`@edsh-bucky`. Der Berechnungskern liegt als eigenes Paket
`packages/deelk-poh-core` neben den beiden Adaptern unter `apps/`. Diese
Aufteilung ist von Prinzip IV vorgegeben und nicht spekulativ: es gibt zwei reale
Konsumenten des Kerns ab dem ersten Tag. Das Paket ist auf das Flugzeug
zugeschnitten, nicht auf dieses eine Feature — die bereits digitalisierten
Tabellen für Start- und Rollstrecke sowie Steigrate gehören später in dasselbe
Paket, weshalb die Kraftstoffrechnung unter `src/fuel/` sitzt. Die Datendateien
bleiben unter `data/poh/d-eelk/` und werden vom Kern importiert, damit sie neben
dem Erzeugungswerkzeug in `tools/poh/` sichtbar bleiben statt in einem Paket zu
verschwinden.

## Complexity Tracking

Keine Constitution-Verstöße; dieser Abschnitt bleibt leer.
