# Implementation Plan: Reservieren-Sheet v2 — vollständiger Zeitwähler

**Branch**: `058-reservieren-sheet-zeitwaehler` | **Date**: 2026-08-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/058-reservieren-sheet-zeitwaehler/spec.md`

## Summary

Das Reservieren-Sheet wird vom Anzeigefeld zum Zeitwähler. Fachlich neu sind:
Zeitwahl in zwei Varianten (Ziehen und Kacheln), Tageswechsel, vier
Abschlussmodi mit Ausweich-Vorschlag, und ein Absprung, der das gewählte Fenster
statt der vom Kern gefundenen Lücke überträgt. An den Balken kommen Nachttönung
und eine feine Jetzt-Nadel dazu; die klebende Aktionsleiste der Detailansicht
entfällt, das Sheet öffnet über Balken-Taps.

Technisch folgt das Feature Prinzip IV bis zur letzten Zeile: Die gesamte
Rechnung — Rasterung, Lückensuche, Gesten-Regeln, Kachel-Regeln,
Konflikterkennung, Modusbestimmung, Ausweichsuche, Nacht-Stops — liegt als reine
Funktionen in `packages/reservierung-core/src/zeitwahl.ts` und ist ohne Browser
geprüft, bevor eine Komponente entsteht. Die Svelte-Seite übersetzt Zeigerorte in
Minuten und Ergebnisse in CSS; sie rechnet nichts.

## Technical Context

**Language/Version**: TypeScript 5.9, Node ≥ 24, ES-Module

**Primary Dependencies**: SvelteKit mit Svelte 5 (Runen), `@sveltejs/adapter-cloudflare`

**Storage**: Keine neue. Der Reservierungsstand kommt wie bisher aus dem
geteilten KV-Zwischenspeicher über `/api/flotte`; dieses Feature legt nichts ab
und ruft keine fremde Schnittstelle auf.

**Testing**: Vitest (`npm test` im Wurzelverzeichnis), Unit-Tests gegen den Kern

**Target Platform**: Mobile Webbrowser (iOS Safari, Android Chrome), Cloudflare Workers

**Project Type**: Web-App mit UI-freiem Kernpaket (npm-Workspaces)

**Performance Goals**: Ziehen ohne sichtbares Ruckeln auf einem Telefon; kein
Layout-Sprung bei Moduswechsel. Keine Netzanfrage durch eine Zeitwahl.

**Constraints**: Tippziele ≥ 44 px; Sheet bis `100dvh` bedienbar; Zeitwahl
ausschließlich innerhalb eines Ortstages; Nachtfarbe in beiden Themes gleich.

**Scale/Scope**: Eine Detailansicht, ein Sheet, drei Balkentypen, sechs
Maschinen; ein neues Kernmodul mit rund zwölf exportierten Funktionen.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Prinzip | Betroffen? | Befund |
|---|---|---|
| **I — Deterministische POH-Berechnungen** | nein | Dieses Feature rührt keine Leistungsdaten an. Der Wegfall des POH-Verweises aus der Detailansicht ändert die Erreichbarkeit des Rechners nicht: Er steht im Flugzeugmenü der Übersicht (`handlungenFuer`). |
| **II — Vereinsflieger als führendes System** | **ja** | Eingehalten und geschärft. Das Sheet schreibt weiterhin nichts; es baut eine Adresse. Der Wartelisten-Fall des Handoffs hätte dagegen verstoßen — eine lokale Vormerkung mit Benachrichtigungszusage wäre ein zweites, konkurrierendes Buchungssystem im Kleinen gewesen. Er ist deshalb durch einen Absprung ersetzt (research.md, E-04). |
| **III — SvelteKit als Frontend-Standard** | ja | Eingehalten. Keine neue Frontend-Technik, keine Fremdbibliothek für Gesten oder Datumswahl — der Tageswechsler benutzt `<input type="date">`, also den Wähler des Betriebssystems. |
| **IV — Geteilter deterministischer Kern** | **ja, im Zentrum** | Eingehalten. Die gesamte Zeitlogik liegt in `zeitwahl.ts`, UI-frei und ohne `fetch`. Die Komponenten enthalten keine Rundung, keine Lückensuche, keine Konfliktprüfung. Der Kern liefert Anteile und Minuten, nie Pixel oder Prozentzeichen — wie `segmente.ts` es vormacht. |
| **V — Cloudflare, geteilter Zwischenspeicher** | ja | Eingehalten, unberührt. Eine Zeitwahl löst keinen Fremdaufruf aus; sie rechnet auf Daten, die schon da sind. Der Absprung ist ein Link, kein Aufruf. Keine Zugangsdaten, keine personenbezogenen Daten. |
| **Agent-Agnostic Project Knowledge** | ja | Eingehalten. Verbindliches steht in `specs/058-…/`; `AGENTS.md` und `CLAUDE.md` bleiben unangetastet. |
| **Development Workflow** | ja | Eingehalten. Feature-Nummer 58 = GitHub-Issue-Nummer, Ordner über `--number 58` angelegt. |

**Ergebnis vor Phase 0**: bestanden, keine Ausnahme nötig.

**Ergebnis nach Phase 1**: bestanden. Der Entwurf hat die Trennung nicht
aufgeweicht — die Contracts (`contracts/zeitwahl.md`) beschreiben ausschließlich
Funktionen mit Zahlen und Zeichenketten als Ein- und Ausgabe. Kein Contract nennt
ein DOM-Element, eine Farbe oder eine Pixelgröße.

**Bemerkung zu Prinzip II**: Dieses Feature *verschärft* die Einhaltung, statt
sie zu dehnen. Das ist erwähnenswert, weil der Gestaltungs-Handoff — die
verbindliche visuelle Quelle — an dieser einen Stelle etwas verlangt, das die
Verfassung nicht zulässt. Die Abweichung vom Handoff ist begründet und in
`spec.md` unter „In diesem Feature entschieden" sowie in `research.md`, E-04
festgehalten.

## Project Structure

### Documentation (this feature)

```text
specs/058-reservieren-sheet-zeitwaehler/
├── plan.md              # Diese Datei
├── spec.md              # Was gebaut wird
├── research.md          # Phase 0: Entscheidungen über den Weg
├── data-model.md        # Phase 1: Größen und Zustände
├── quickstart.md        # Phase 1: Wie man es prüft
├── contracts/
│   ├── zeitwahl.md      # Die Verträge des neuen Kernmoduls
│   └── balken.md        # Was die Balken melden und was sie zeigen
├── checklists/
│   └── requirements.md  # Qualitätsprüfung der Spec
└── tasks.md             # Phase 2 (/speckit-tasks), hier nicht erzeugt
```

### Source Code (repository root)

```text
packages/reservierung-core/
├── src/
│   ├── zeitwahl.ts          # NEU — die ganze Rechnung des Wählers
│   ├── nacht.ts             # NEU — Stops der Nachttönung aus Sonnenzeiten
│   ├── formulieren.ts       # GEÄNDERT — alsDauer auf alsDauerwort zurückgeführt
│   ├── typen.ts             # GEÄNDERT — Zeitwahlfenster, Wahlmodus, Konflikt
│   ├── index.ts             # GEÄNDERT — neue Ausfuhren
│   ├── segmente.ts          # unverändert
│   ├── zustand.ts           # unverändert
│   ├── tagesuhr.ts          # unverändert
│   ├── reservierungs-verweis.ts  # unverändert
│   └── …
└── tests/
    ├── zeitwahl.test.ts     # NEU — Szenarien der Spec, ohne Browser
    ├── nacht.test.ts        # NEU
    └── …

apps/web/src/
├── lib/components/
│   ├── ReservierenSheet.svelte   # NEUSCHRIFT — Wähler statt Anzeige
│   ├── Zeitbalken.svelte         # NEU — der gemeinsame Balken samt Nacht + Nadel
│   ├── Tagesbalken.svelte        # GEÄNDERT — benutzt Zeitbalken, meldet Taps
│   └── Wochenraster.svelte       # GEÄNDERT — dito, senkrecht
└── routes/reservierung/[kennung]/
    └── +page.svelte              # GEÄNDERT — Aktionsleiste raus, Taps rein
```

**Structure Decision**: Die bestehende Zweiteilung bleibt und wird nicht
erweitert — ein UI-freies Kernpaket unter `packages/reservierung-core`, die
Oberfläche unter `apps/web`. Neu ist innerhalb des Kerns genau ein fachliches
Modul (`zeitwahl.ts`) plus ein kleines für die Nachttönung (`nacht.ts`); innerhalb
der Oberfläche genau eine neue Komponente (`Zeitbalken.svelte`), die das
zusammenfasst, was Tagesbalken, Tageszeile, Wochenspalte und Sheet-Balken
gemeinsam haben: Nachttönung, Segmente, Vergangenheits-Schleier, Jetzt-Nadel und
die Umrechnung eines Tipps in eine Minute.

Warum `nacht.ts` neben `zeitwahl.ts` und nicht darin: Die Nachttönung ist keine
Frage der Wahl, sondern der Darstellung eines Tages — sie betrifft alle vier
Balkentypen, auch die, in denen niemand etwas wählt.

## Vorgehen in Stufen

Die Reihenfolge ist nicht beliebig; sie folgt der Vorgabe des Handoffs, die
Zeitlogik vollständig zu prüfen, bevor ein Screen entsteht.

1. **Kern zuerst.** `zeitwahl.ts` und `nacht.ts` mit vollständigen Unit-Tests aus
   den Acceptance Scenarios. Nichts davon braucht einen Browser.
2. **Balken.** `Zeitbalken.svelte` als gemeinsame Grundlage; Tagesbalken und
   Wochenraster darauf umstellen. Ab hier sind Nachttönung und Nadel sichtbar,
   noch ohne Sheet-Wirkung.
3. **Detailansicht.** Aktionsleiste und POH-Verweis entfernen, Liste ab morgen,
   Taps an das Sheet weiterreichen.
4. **Sheet.** Rahmen, Tageswechsler, Statuszeile, dann die Variante „Ziehen",
   dann „Uhrzeit wählen", dann Modi und Abschluss.
5. **Vorschau.** Örtlich oder über die Adresse des Vorschlags — die
   Gestaltungsfragen (Sprungfreiheit, Flüssigkeit des Ziehens) entscheidet, wer
   die Seite vor sich hat, nicht ein Bildschirmfoto des Agenten.

## Complexity Tracking

> Keine Verfassungsverstöße, daher keine Einträge.

Erwähnt sei dennoch eine bewusste Nicht-Vereinfachung: `Zeitbalken.svelte` fasst
vier Erscheinungsformen in einer Komponente zusammen (waagerecht/senkrecht,
mit/ohne Auswahlblock). Die naheliegende Alternative wären vier kleine
Komponenten. Dagegen spricht, dass die Ebenenfolge — Nacht, Lücken, Segmente,
Schleier, Auswahl, Nadel — in allen vieren dieselbe sein *muss*; vierfach
gepflegt liefe sie auseinander, und der Fehler wäre eine Anzeige, die je nach
Ansicht etwas anderes über denselben Tag behauptet.
