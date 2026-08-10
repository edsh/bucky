# Implementation Plan: Roll- und Startstrecke mit neuem Seitenaufbau

**Branch**: `023-start-und-rollstrecke` | **Date**: 2026-08-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/023-start-und-rollstrecke/spec.md`

## Summary

Die Startstreckentabelle Abb. 5-1a ist seit Feature 001 digitalisiert — 77
Zeilen, Druckhöhe von 0 bis 10 000 ft gegen Umgebungstemperatur von −20 bis
50 °C, je Zelle Startlauf und Strecke über ein 15 m hohes Hindernis. Genutzt
wurde sie bisher nicht.

Dieses Feature macht sie nutzbar: Ein neues Kernmodul `takeoff/` schlägt beide
Werte nach und wendet die drei Zuschläge des Handbuchs an — Wind (Anmerkung 2),
trockene Grasbahn (Anmerkung 3), feuchte Bahn oder Schnee (Anmerkung 4). Die
Weboberfläche stellt die Auskunft neben den Kraftstoffbedarf, der MCP-Zugang
erhält ein eigenes Werkzeug.

Drei Dinge machen die Sache aufwendiger, als sie klingt:

1. **Zwei stetige Achsen.** Anders als jede bisher genutzte Tabelle wird hier
   über Druckhöhe **und** Temperatur zugleich interpoliert. `interpolate.ts`
   kann bislang nur eine Achse (→ [R1](./research.md)).
2. **Die Temperatur ist keine Eingabe.** Die Oberfläche kennt die
   ISA-Abweichung; die Tabelle will die tatsächliche Umgebungstemperatur. Dazwischen
   liegt die Standardatmosphäre (→ [R2](./research.md)).
3. **Der Seitenaufbau wird zweispaltig** — aber nur im Querformat, und das ist
   mit einer Breitenabfrage allein nicht zu haben (→ [R3](./research.md)).

Der Grund für das Feature steht am Ende von [research.md](./research.md): In
EDSH ist die Bahn 500 m lang. An einem warmen Tag braucht die D-EELK davon über
410 m bis über das Hindernis. Das ist keine akademische Rechnung.

## Technical Context

**Language/Version**: TypeScript 5.x, Node 20+, ES-Module

**Primary Dependencies**: Zod (Eingabeprüfung im Kern), SvelteKit 2 mit Svelte 5
(Runen), `@sveltejs/adapter-static`, `@modelcontextprotocol/sdk` im MCP-Adapter

**Storage**: Keine. `data/poh/d-eelk/tables/5b-takeoff-distance-m-1043kg.json`
wird zur Bauzeit eingebunden.

**Testing**: Vitest für Kern und MCP-Adapter, `svelte-check` und ESLint für die
Oberfläche, der Playwright-Klickpfad unter `tests/ui/klickpfad.mjs`, dazu
`verify_d_eelk.py` für den Abgleich der Daten gegen das PDF.

**Target Platform**: Statisch ausgelieferte Web-Oberfläche (GitHub Pages) sowie
ein MCP-Adapter für den Zugriff über ein Sprachmodell.

**Project Type**: Monorepo mit einem UI-freien Rechenkern und mehreren dünnen
Adaptern.

**Performance Goals**: Die Startstrecke wird bei jeder Reglerbewegung neu
ermittelt. Eine bilineare Interpolation über eine Tabelle mit 77 Zeilen ist
unkritisch.

**Constraints**: Keine Extrapolation über den Tabellenrand. Kein Adapter rundet
oder rechnet selbst (C-03, C-04). Das Startstreckenmodul erhält Druckhöhe und
Temperatur **von außen** und leitet sie nicht selbst her. Die Seite muss auf
390 px Breite ohne waagerechtes Scrollen bedienbar bleiben.

**Scale/Scope**: Ein neues Kernmodul mit zwei Dateien, eine neue
Atmosphärenfunktion, eine Erweiterung von `interpolate.ts`, zwei neue
Oberflächen-Komponenten, ein neues MCP-Werkzeug, Umbau einer Seite.

## Constitution Check

*GATE: Vor Phase 0 zu bestehen, nach Phase 1 erneut zu prüfen.*

| Prinzip | Bewertung | Begründung |
|---|---|---|
| I. Deterministische sicherheitskritische Berechnung | **erfüllt** | Beide Werte stammen aus der bereits gegen das PDF geprüften Tabelle; interpoliert wird in Code, nicht durch ein Sprachmodell. Die Quellenangabe nennt Abb. 5-1a mit den Seiten 5b-2 (Bedingungen und Anmerkungen) und 5b-3 (Werte). Alle vier berührten Stützwerte gehen als `anchors` ins Ergebnis, jeder Zuschlag bekommt einen eigenen Rechenschritt, der Prüfhinweis bleibt. |
| I, Zusatz: Zuschläge im Wortlaut | **erfüllt** | Die vier Anmerkungen werden über `getTableNote` aus der Digitalisierung gelesen und nicht in der Oberfläche formuliert (FR-016). Ändert sich der Wortlaut, ändert sich die Anzeige mit. |
| I, Zusatz: keine Extrapolation | **erfüllt** | `interpolateGrid` erbt das Verhalten von `interpolate` und wirft außerhalb des Rasters. Zusätzlich lehnt das Modul Rückenwind über 10 kt ab, weil Anmerkung 2 dort endet (FR-004b), und deckelt die Gegenwindgutschrift bei 50 % (FR-004a). |
| II. Vereinsflieger als führendes System | **nicht berührt** | Keine Vereinsdaten im Spiel. |
| III. SvelteKit als Frontend-Standard | **erfüllt** | Die Änderung bleibt in der bestehenden SvelteKit-Anwendung. |
| IV. Gemeinsamer Kern, dünne Adapter | **erfüllt** | Nachschlagen, Zuschläge, Reihenfolge und Formatierung liegen im Kern. Die Oberfläche ruft auf und stellt dar; das neue MCP-Werkzeug ruft dieselbe Funktion mit denselben Eingaben auf. Ein Paritätstest hält beide gegen dasselbe Kernergebnis. |

**Ergebnis vor Phase 0**: bestanden, keine Ausnahme nötig.

**Ergebnis nach Phase 1**: bestanden. Zwei Entwurfsentscheidungen folgen
unmittelbar aus den Prinzipien und wären sonst anders ausgefallen:

- Die bilineare Interpolation wandert nach `interpolate.ts` statt ins
  Fachmodul, weil Prinzip I die Interpolation als eigenständige, prüfbare
  Stelle behandelt — dieselbe Überlegung, die die Rundung in `format.ts` hält.
- Die Startstrecke bekommt ein **eigenes** MCP-Werkzeug statt eines Feldes im
  bestehenden. Prinzip IV verlangt gleiche Zahlen über beide Zugangswege, nicht
  gleiche Aufrufe; FR-020 verlangt, dass ein Rückenwind von 15 kt nicht die
  Kraftstoffauskunft mitreißt.

## Project Structure

### Documentation (this feature)

```text
specs/023-start-und-rollstrecke/
├── plan.md              # Diese Datei
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/           # Phase 1
│   ├── deelk-poh-core.md
│   └── web-und-mcp.md
├── checklists/
│   └── requirements.md  # aus /speckit-specify
└── tasks.md             # aus /speckit-tasks
```

### Source Code (repository root)

```text
packages/deelk-poh-core/
├── src/
│   ├── takeoff/
│   │   ├── takeoffDistance.ts    # NEU: Nachschlagen und Zuschläge
│   │   └── input.ts              # NEU: Eingabeschema und Grenzen
│   ├── atmosphere/
│   │   └── temperature.ts        # NEU: Umgebungstemperatur aus ISA-Abweichung
│   ├── interpolate.ts            # ERWEITERT: interpolateGrid (bilinear)
│   ├── format.ts                 # ERWEITERT: formatMetres
│   ├── errors.ts                 # ERWEITERT: Meldung für die Temperatur
│   └── index.ts                  # Ausfuhr der neuen Funktionen und Typen
└── tests/
    ├── takeoff/takeoffDistance.test.ts   # NEU
    ├── atmosphere/temperature.test.ts    # NEU
    ├── interpolate.test.ts               # bilineare Fälle
    └── contract.test.ts                  # C-07 neu

apps/web/src/
├── lib/components/
│   ├── TakeoffDistance.svelte    # NEU: Ergebnis, Schalter, Anmerkungen
│   └── SurfaceSwitch.svelte      # NEU: Schalter mit erklärender Beschriftung
└── routes/+page.svelte           # neue Gliederung, zweispaltiger Bereich

apps/mcp/src/
├── tools/computeTakeoffDistance.ts   # NEU
└── server.ts                          # Anmeldung des Werkzeugs

tests/ui/klickpfad.mjs                 # neue Prüfungen 29 ff.
```

**Structure Decision**: Es bleibt bei der bestehenden Aufteilung
Kern / Web / MCP. Das Startstreckenmodul liegt als eigener Ordner `takeoff/`
neben `fuel/` — die beiden Rechnungen teilen keine Zwischengrößen, sondern nur
Eingaben, die von außen kommen.

## Entwurfsentscheidungen

### Das Modul rechnet nicht, was es nicht muss

`computeTakeoffDistance` nimmt Druckhöhe und Umgebungstemperatur **als fertige
Ergebnisobjekte** entgegen, nicht als Rohwerte und nicht als Platzhöhe mit QNH.
Der Aufrufer bildet sie mit `toPressureAltitude` und `toOutsideAirTemperature`
— beides Kernfunktionen, die Adapter also nur aufrufen und nicht nachbauen
(C-04 bleibt gewahrt).

Der Umweg über Ergebnisobjekte statt blanker Zahlen hat einen Grund: Sie tragen
ihre Eingangsgrößen und ihre Quelle bei sich. Das Modul kann daraus die
Rechenschritte für Druckhöhe und Temperatur ausweisen (FR-003, FR-008), ohne
die Herleitung selbst zu kennen. Bekäme es nur `971` und `13.1`, könnte es nicht
sagen, woher sie stammen — und der Pilot sähe eine Temperatur ohne Herkunft.

### Die Zuschläge greifen auf denselben Bezugswert

Anmerkung 3 und 4 verlangen ihren Aufschlag ausdrücklich „des Startlaufs". Sie
werden deshalb **additiv auf dieselbe Bezugsgröße** angewandt und nicht
nacheinander multipliziert: 15 % + 20 % ergeben 35 %, nicht 38 %. Bezugsgröße
ist der Startlauf **nach** dem Windzuschlag, weil dieser die Tabelle korrigiert
und die Bahnzuschläge auf den so korrigierten Lauf aufsetzen. Die Spec hält das
als Reihenfolge in FR-007 fest; das Modul bildet sie als Kette benannter
Schritte ab, damit sie sichtbar bleibt.

Beide Zuschläge werden **in Metern** ermittelt und auf **beide** Werte
aufgeschlagen — auf den Startlauf und auf die Strecke über das Hindernis. Der
zusätzlich gerollte Weg verschiebt den Abhebepunkt, und damit verschiebt sich
die gesamte Strecke um denselben Betrag.

### Die Temperatur bekommt eine eigene Fehlermeldung

`OUT_OF_RANGE` nennt üblicherweise Feld, Wert und zulässigen Bereich. Bei der
Umgebungstemperatur reicht das nicht: Sie ist keine Eingabe, sondern entsteht
aus Druckhöhe und ISA-Abweichung. Die Meldung nennt deshalb beide Ursachen —
so wie `pressureAltitudeOutOfRange` schon heute Höhe und Luftdruck zusammen
nennt, statt nur die errechnete Druckhöhe zu beanstanden.

### Zwei Spalten, aber nur im Querformat

Die Regel lautet `@media (min-width: 40rem) and (orientation: landscape)`.
Warum keine reine Breitenabfrage genügt, steht in [R3](./research.md): Das
schmalste Telefon im Querformat ist 667 px breit, das breiteste Tablet im
Hochformat 1032 px — die Bereiche überschneiden sich, eine Schwelle kann beide
nicht trennen.

Mit den zwei Spalten muss `main { max-width }` von 48 rem auf 64 rem wachsen,
sonst stehen zwei Spalten in 768 px. Die Grenze wird **innerhalb** derselben
Medienabfrage angehoben, damit der einspaltige Fall unverändert bleibt.

### Zwei Ergebnisse, die getrennt scheitern dürfen

Die Startstreckentabelle endet bei 10 000 ft und 50 °C, die Regler reichen
weiter (→ [R4](./research.md)). Die Oberfläche hält deshalb zwei getrennte,
jeweils gekapselte Ergebnisse nach dem Muster `{ wert, fehler }`, das die
Reiseleistungs-Übersicht seit Feature 006 verwendet. Erst dadurch darf die
Startstrecke engere Grenzen haben als der Rest, ohne den Rechner unbrauchbar zu
machen (FR-020).

## Complexity Tracking

Keine Verstöße gegen die Constitution, daher keine Einträge.
