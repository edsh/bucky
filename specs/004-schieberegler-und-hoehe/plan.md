# Implementation Plan: Schieberegler und Höhe ASL statt Druckhöhe

**Branch**: `004-schieberegler-und-hoehe` | **Date**: 2026-08-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/004-schieberegler-und-hoehe/spec.md`

## Summary

Die Eingabemaske des Kraftstoffrechners wechselt von Textfeldern auf Schieberegler
mit sichtbarer Wertanzeige, nebeneinander in einem Raster. Fachlich wichtiger ist
die zweite Änderung: Der Pilot gibt nicht mehr die Druckhöhe ein, sondern die
Platzhöhe ASL, die Reiseflughöhe ASL und das aktuelle QNH — Werte, die er direkt
von der Karte und aus dem Wetterbericht ablesen kann. Die Druckhöhe rechnet die
Anwendung selbst.

Die Umrechnung erfolgt nach der ICAO-Standardatmosphäre (Doc 7488), nicht nach
einer Faustformel, und liegt als neue Funktion `toPressureAltitude` im UI-freien
Kernpaket. Sie erscheint als zwei zusätzliche Rechenschritte am Anfang des
Protokolls, damit die errechnete Druckhöhe nachvollziehbar bleibt und nicht als
unerklärte Zahl in der Tabelleninterpolation auftaucht.

Fällt die errechnete Druckhöhe außerhalb des Tabellenbereichs — an einem
Hochdrucktag ohne Weiteres möglich —, wird die Berechnung abgelehnt, nicht auf den
Tabellenrand begrenzt. Begründung siehe Constitution Check.

## Technical Context

**Language/Version**: TypeScript 5.x auf Node.js 22 LTS; Zielumgebung des
Web-Adapters ist der Browser (ES2022). Unverändert gegenüber Feature 001.

**Primary Dependencies**: Keine neuen. SvelteKit mit `@sveltejs/adapter-static`,
Zod an den Adaptergrenzen, `@modelcontextprotocol/sdk` im MCP-Adapter. Die
ICAO-Umrechnung ist reine Arithmetik und braucht keine Bibliothek.

**Storage**: Keine. Die neuen Eingabegrößen werden nicht persistiert.

**Testing**: Vitest für Kern und MCP-Adapter; `tests/ui/klickpfad.mjs` (Playwright)
für die Oberfläche, erweitert um Regler-, Raster- und Tastaturprüfungen. Die
Datengrundlage bleibt unverändert, `tools/poh/verify_d_eelk.py` wird von diesem
Feature nicht berührt.

**Target Platform**: Statisch ausgeliefertes Web-Frontend auf GitHub Pages
(`https://edsh.github.io/bucky/`); MCP-Server als lokaler stdio-Prozess.

**Project Type**: npm-Workspaces-Monorepo, ein Kernpaket und zwei Adapter.

**Performance Goals**: Die Regler lösen bei jeder Wertänderung eine Neuberechnung
aus. Eine Berechnung sind wenige Tabellenzugriffe plus zwei Potenzoperationen; ein
gesondertes Performance-Ziel ist nicht nötig. Gedrosselt wird nicht, solange die
Anzeige der Reglerbewegung folgt (SC-002).

**Constraints**: Die Umrechnung muss in beide Richtungen konsistent sein — bei
QNH 1013,25 hPa muss die Druckhöhe der Platzhöhe entsprechen. Der zweite Exponent
ist als `1 / 5.25588` zu rechnen, nicht als gerundetes Literal `0.190263`, sonst
ist die Probe bei 18 000 ft nur auf 0,01 ft genau. Keine Extrapolation über die
Tabellenränder (FR-007 aus Feature 001 gilt weiter).

**Scale/Scope**: Ein zusätzlicher Rechenweg (zwei Schritte), drei geänderte
Eingabefelder, eine neue Svelte-Komponente, ein Umbau der Eingabemaske.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**I. Deterministic Safety-Critical Calculations** — erfüllt, mit
begründungspflichtigem Punkt.

Die Druckhöhe ist **kein** POH-Wert. Prinzip I verlangt, dass jede Antwort die
verwendete Tabelle mit Seitenzahl und Tabellenname nennt und zum Gegencheck gegen
das Original-POH auffordert. Für eine Größe, die nicht aus dem Handbuch stammt,
wäre eine POH-Seitenzahl schlicht erfunden. Deshalb wird `SourceReference` in zwei
Arten aufgeteilt: `kind: 'poh'` mit Seite und Tabellenname wie bisher, und
`kind: 'standard'` mit der Norm als Quelle (ICAO Doc 7488, 3. Auflage 1993).

Der Sinn von Prinzip I bleibt gewahrt: Die Umrechnung läuft als deterministischer
Code, ein Sprachmodell rechnet sie nicht selbst, ihre Herkunft steht in der
Antwort, und der Prüfhinweis "vor dem Flug gegen das Original-POH gegenchecken"
bezieht sich weiterhin genau auf die Werte, die aus dem POH stammen — er würde
sonst zu einer Aufforderung, etwas im Handbuch nachzuschlagen, das dort nicht
steht. Die Aufteilung macht die Grenze zwischen Handbuch und Norm sichtbar, statt
sie zu verwischen.

Zweiter Punkt: Das Ablehnen einer Druckhöhe außerhalb des Tabellenbereichs statt
Begrenzen auf den Rand. Naheliegend wäre gewesen, eine negative Druckhöhe auf 0 ft
anzuheben. Das ist an dieser Stelle **nicht** die sichere Seite: Die
Steigflugtabelle ist ab 0 ft kumulativ, der Steigflugverbrauch entsteht als
Differenz `Wert(Reiseflughöhe) − Wert(Platzhöhe)`. Eine angehobene Platzhöhe
vergrößert den Subtrahenden und weist damit **weniger** Kraftstoff aus. Ablehnen
ist die einzige Variante, die keine stille Unterschätzung erzeugt.

**II. Vereinsflieger as System of Record** — nicht berührt. Keine Mitglieds-,
Buchungs- oder Flugzeugstammdaten.

**III. SvelteKit as Frontend Standard** — erfüllt. Der Umbau bleibt innerhalb der
bestehenden SvelteKit-Anwendung; die Regler sind native `<input type="range">` mit
`<output>`, keine UI-Bibliothek kommt hinzu.

**IV. Shared Deterministic Core, Multiple Access Paths** — erfüllt, und dieses
Feature verschärft die Regel. Die Umrechnung gehört in den Kern, nicht in die
Oberfläche, weil sonst der MCP-Zugang eine andere Druckhöhe errechnen könnte als
die Web-Oberfläche. Ebenso liegen Wertebereiche und Schrittweiten der Regler als
Daten im Kern (`getFuelPlanInputDomain()`), nicht als Zahlen im Svelte-Markup. Die
beiden neuen Vertragsprüfungen C-04 und C-05 in
[contracts/deelk-poh-core.md](./contracts/deelk-poh-core.md) sichern beides am
Quelltext ab.

**Gate-Ergebnis**: bestanden. Die Abweichung bei Prinzip I ist keine Ausnahme vom
Prinzip, sondern eine Präzisierung seines Geltungsbereichs; sie wird im Datenmodell
als eigener Typ festgeschrieben statt als Sonderfall im Code versteckt.

**Erneute Prüfung nach Phase 1**: Die Entwurfsartefakte halten die Prinzipien ein.
`data-model.md` führt die Aufteilung von `SourceReference` explizit ein und ergänzt
`step` in `NumericRange`, sodass auch die Schrittweite aus dem Kern kommt.
`contracts/web-ui.md` schreibt fest, dass der Adapter weder umrechnet noch eigene
Grenzen kennt. Die zwei neuen Rechenschritte erscheinen im selben Protokollformat
wie die bestehenden dreizehn, mit Quellenangabe je Schritt.

## Project Structure

### Documentation (this feature)

```text
specs/004-schieberegler-und-hoehe/
├── plan.md               # Diese Datei
├── spec.md               # Feature-Spezifikation
├── research.md           # Phase 0
├── data-model.md         # Phase 1
├── quickstart.md         # Phase 1
├── contracts/            # Phase 1
│   ├── deelk-poh-core.md # Geänderte und neue API des Kernpakets
│   └── web-ui.md         # Zusicherungen der Oberfläche
├── checklists/
│   └── requirements.md   # Qualitätscheckliste zur Spec
└── tasks.md              # Phase 2 (/speckit-tasks, nicht von /speckit-plan erzeugt)
```

### Source Code (repository root)

```text
packages/deelk-poh-core/
├── src/
│   ├── types.ts               # GEÄNDERT: SourceReference als Union, NumericRange.step
│   ├── errors.ts              # GEÄNDERT: Fehlerart für Druckhöhe ausserhalb des Bereichs
│   ├── atmosphere/            # NEU
│   │   └── pressureAltitude.ts # toPressureAltitude nach ICAO Doc 7488
│   └── fuel/
│       ├── input.ts           # GEÄNDERT: Platzhöhe/Reiseflughöhe ASL + QNH statt Druckhöhen
│       └── fuelPlan.ts        # GEÄNDERT: zwei vorgelagerte Umrechnungsschritte (13 -> 15)
└── tests/
    ├── atmosphere/pressureAltitude.test.ts  # NEU: Probe bei 1013,25 und die Randwerte
    ├── contract.test.ts       # GEÄNDERT: C-04 und C-05 ergänzen
    └── fuel/fuelPlan.test.ts  # GEÄNDERT: Sollwerte auf die neuen Eingaben umstellen

apps/web/src/
├── lib/components/
│   └── RangeField.svelte      # NEU: Regler mit <output>, Beschriftung, Einheit
└── routes/+page.svelte        # GEÄNDERT: Raster aus Reglern statt Textfelder

apps/mcp/src/server.ts         # GEÄNDERT: Werkzeugschema auf die neuen Eingaben
tests/ui/klickpfad.mjs         # GEÄNDERT: Regler, Raster, Tastaturbedienung
```

**Structure Decision**: Die Aufteilung aus Feature 001 bleibt unverändert; dieses
Feature ändert vorhandene Dateien und legt genau zwei neue an. Der neue Ordner
`src/atmosphere/` steht bewusst neben `src/fuel/` statt darin: Die
Druckhöhen-Umrechnung ist keine Kraftstofffrage, sondern wird von den noch
ausstehenden Start- und Landestreckenrechnungen genauso gebraucht. Sie ist
außerdem die erste Größe im Kern, die nicht aus dem POH stammt — der eigene Ordner
macht diese Grenze auch in der Ablage sichtbar.

## Complexity Tracking

Keine Constitution-Verstöße. Die Aufteilung von `SourceReference` in zwei Arten ist
eine Anpassung an eine reale Unterscheidung (Handbuchwert gegenüber Normwert), kein
zusätzlicher Freiheitsgrad auf Vorrat; dieser Abschnitt bleibt leer.
