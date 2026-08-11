# Implementation Plan: QNH für EDSH aus einem Onlinedienst vorbelegen

**Branch**: `025-qnh-vorbelegen` | **Date**: 2026-08-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/025-qnh-vorbelegen/spec.md`

## Summary

Der Luftdruck ist der einzige Wert im Rechner, den der Pilot nicht abschätzen
kann. Bis er ihn nachgeschlagen hat, steht der Regler auf 1013 — und jede
Druckhöhe darunter ist falsch. Dieses Feature setzt neben den QNH-Regler einen
Button „EDSH", der den aktuellen Wert holt und nach ausdrücklicher Bestätigung
einsetzt.

Der Umfang ist klein, die Fallstricke liegen woanders:

1. **Es gibt keinen Server.** Die Seite liegt statisch auf GitHub Pages; der
   Abruf muss aus dem Browser gehen. Damit fällt fast jede Wetterquelle aus —
   nicht fachlich, sondern an CORS (→ [R1](./research.md)).
2. **Der naheliegende Wert ist der falsche.** `pressure_msl` ist QFF, nicht QNH.
   Auf 971 ft sind das bis zu 3 hPa (→ [R4](./research.md)). Gerechnet wird
   deshalb aus dem Stationsdruck.
3. **Die Rechnung ist sicherheitskritisch, das Holen nicht.** Prinzip I und IV
   trennen hier sauber: Die Umrechnung gehört in den Kern und ist dort die
   Umstellung einer Formel, die bereits steht (→ [R8](./research.md)). Der
   Adapter holt Zahlen und rechnet nichts.

Neu entstehen deshalb genau zwei Dinge im Kern — eine Umkehrfunktion zu
`toPressureAltitude` und ein abgerundeter Zweitwert für den Regler — und drei in
der Oberfläche: ein Netz-Adapter, ein Dialog und ein Herkunftsvermerk am Regler.

Der Grund, warum die Genauigkeit reicht, steht in [R7](./research.md): Gegen die
METAR-Meldungen dreier Plätze der Region liegt der gerechnete QNH innerhalb von
1 hPa. Das sind rund 27 ft Druckhöhe — brauchbar für die Vorplanung, kein Ersatz
für das ATIS.

## Technical Context

**Language/Version**: TypeScript 5.x, Node 22+, ES-Module

**Primary Dependencies**: SvelteKit 2 mit Svelte 5 (Runen),
`@sveltejs/adapter-static`. Für den Abruf **keine neue Abhängigkeit**: `fetch`
und `AbortSignal.timeout` sind im Browser vorhanden. Zod bleibt im Kern und wird
für die Antwortprüfung des Adapters nicht herangezogen (siehe
Entwurfsentscheidungen).

**Storage**: Keine. Kein Zwischenspeicher, kein `localStorage` — jeder Klick
löst einen frischen Abruf aus (Spec, Assumptions).

**Testing**: Vitest für die neue Kernfunktion und — neu — für die reinen
Funktionen des Netz-Adapters; `svelte-check` und ESLint für die Oberfläche; der
Playwright-Klickpfad unter `tests/ui/klickpfad.mjs` für Dialog, Übernahme,
Abbruch und Fehlerfall, mit abgefangener Netzanfrage.

**Target Platform**: Statisch ausgelieferte Web-Oberfläche (GitHub Pages).
Fremdaufruf zu `api.open-meteo.com` aus dem Browser des Piloten.

**Project Type**: Monorepo mit einem UI-freien Rechenkern und dünnen Adaptern.

**Performance Goals**: Ein Abruf je Knopfdruck, nie beim Laden der Seite.
Abbruch nach 10 s. Die Rechnung selbst ist eine Potenz und damit unkritisch.

**Constraints**: Der Kern greift **nicht** auf das Netz zu (FR-022). Kein
Adapter rechnet oder rundet (C-03, C-04). Die Seite bleibt ohne Netz vollständig
bedienbar (FR-017). Der Dialog ist mit der Tastatur bedienbar (FR-008).

**Scale/Scope**: Eine neue Kerndatei mit Test, ein Netz-Adapter, eine neue
Svelte-Komponente, kleine Ergänzungen an `+page.svelte` und `RangeField.svelte`,
ein neues Vitest-Projekt für `apps/web`, neue Abschnitte im Klickpfad.

## Constitution Check

*GATE: Vor Phase 0 zu bestehen, nach Phase 1 erneut zu prüfen.*

| Prinzip | Bewertung | Begründung |
|---|---|---|
| I. Deterministische sicherheitskritische Berechnung | **erfüllt** | Die Umrechnung Stationsdruck → QNH läuft als Code im Kern, nicht als Schätzung. Sie verwendet die vorhandenen Konstanten der Standardatmosphäre; das Ergebnis trägt seine Eingangsgrößen und `ICAO_STANDARD_ATMOSPHERE_SOURCE` bei sich. Ein Sprachmodell ist an keiner Stelle beteiligt. |
| I, Zusatz: Quellenangabe | **erfüllt, mit Besonderheit** | Es gibt hier **keine** POH-Seitenzahl, weil kein Wert aus dem Flughandbuch stammt. Die Referenz ist die der Norm (`kind: 'standard'`), wie schon bei der Druckhöhe seit Feature 001. Zusätzlich trägt das Ergebnis die **Herkunft der Eingangszahl** — Dienst und Gültigkeitszeit —, weil sie sonst im Ergebnis verschwände (FR-009, FR-011). |
| I, Zusatz: Vorflugprüfung | **erfüllt** | Der Dialog nennt den Wert ausdrücklich als unverbindlichen Modellwert und verweist auf das ATIS (FR-003, FR-011). Er ist damit die engste Stelle, an der der Prüfhinweis sitzen kann: vor der Übernahme. |
| II. Vereinsflieger als führendes System | **nicht berührt** | Keine Vereinsdaten im Spiel. |
| III. SvelteKit als Frontend-Standard | **erfüllt** | Die Änderung bleibt in der bestehenden SvelteKit-Anwendung; es entsteht keine zweite Oberfläche. |
| IV. Gemeinsamer Kern, dünne Adapter | **erfüllt** | Die Umrechnung liegt im Kern, das Holen im Adapter. Der Adapter reicht Zahlen hinein und Ergebnisse heraus; er rechnet, interpoliert und rundet nicht. Der Kern bleibt netzfrei und damit ohne Netz prüfbar. |
| IV, Zusatz: keine zweite Wahrheit | **erfüllt** | Die neue Funktion ist die algebraische Umstellung der vorhandenen und teilt sich mit ihr Konstanten und Exponent. Ein Test hält beide gegeneinander (Rundlauf), damit sie nicht auseinanderlaufen können. |

**Ergebnis vor Phase 0**: bestanden, keine Ausnahme nötig.

**Ergebnis nach Phase 1**: bestanden. Drei Entwurfsentscheidungen folgen
unmittelbar aus den Prinzipien und wären sonst anders ausgefallen:

- **Die Rundung liegt im Kern, nicht im Dialog.** Naheliegend wäre gewesen,
  im Dialog ein `Math.floor` zu schreiben. Aber der abgerundete Wert ist kein
  Anzeigeformat, sondern der Wert, der in den Regler geht und die Startstrecke
  verändert — er ist damit Rechenergebnis (C-03).
- **Der Kern bekommt die Höhe übergeben, statt EDSH zu kennen.** Ein
  Platzverzeichnis im Kern wäre bequem, würde ihn aber an einen Platz binden
  und die Prüfbarkeit an Stammdaten hängen. Er rechnet mit zwei Zahlen.
- **Der Dialog rechnet den Rundlauf zur Kontrolle nicht nach.** Zwei
  Rechenwege wären genau die zweite Wahrheit, die Prinzip IV ausschließt. Die
  Probe steht als Test im Kern, nicht als Laufzeitprüfung im Adapter.

## Project Structure

### Documentation (this feature)

```text
specs/025-qnh-vorbelegen/
├── plan.md              # Diese Datei
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/           # Phase 1
│   ├── deelk-poh-core.md
│   └── web.md
├── checklists/
│   └── requirements.md  # aus /speckit-specify
└── tasks.md             # aus /speckit-tasks
```

### Source Code (repository root)

```text
packages/deelk-poh-core/
├── src/
│   ├── atmosphere/
│   │   ├── qnh.ts                # NEU: toQnh — Umkehrung von toPressureAltitude
│   │   └── pressureAltitude.ts   # unverändert; liefert Konstanten und Quelle
│   ├── errors.ts                 # ERWEITERT: Ablehnung unsinniger Eingangswerte
│   └── index.ts                  # Ausfuhr von toQnh und QnhResult
└── tests/
    ├── atmosphere/qnh.test.ts    # NEU: Stützwerte, Rundlauf, Abrundung, Grenzen
    └── contract.test.ts          # ERWEITERT: neue Zusicherung

apps/web/
├── src/lib/
│   ├── weather/
│   │   ├── openMeteo.ts          # NEU: URL bauen, Antwort prüfen, Zahlen liefern
│   │   └── edsh.ts               # NEU: Koordinaten + Platzhöhe an einer Stelle
│   └── components/
│       ├── QnhAbrufDialog.svelte # NEU: Dialog mit Laden, Vorschau, Übernahme
│       └── RangeField.svelte      # unverändert nutzbar (neben/folge vorhanden)
├── src/routes/+page.svelte        # Button am QNH-Regler, Herkunftsvermerk
└── tests/weather/openMeteo.test.ts  # NEU: Antwortprüfung ohne Netz

vitest.config.ts                   # ERWEITERT: Projekt „web"
tests/ui/klickpfad.mjs             # ERWEITERT: Dialog, Übernahme, Abbruch, Fehler
```

**Structure Decision**: Es bleibt bei der Aufteilung Kern / Web / MCP. Der
Netz-Adapter liegt unter `apps/web/src/lib/weather/` und damit bewusst **nicht**
im Kern — das ist die Grenze, die Prinzip IV zieht. `apps/mcp` wird nicht
angefasst; ein Chat-Agent hat eigene Wetterzugänge, und `toQnh` steht ihm über
das Kernpaket ohnehin offen.

## Entwurfsentscheidungen

### Der Kern bekommt eine Umkehrung, keine zweite Formel

`pressureAltitude.ts` führt die Beziehung bereits im Wortlaut seiner
Quellenreferenz:

```
p = QNH · (1 − L·h/T₀)^5,25588
```

`toQnh` ist deren Umstellung nach QNH — dieselbe Datei-Nachbarschaft, dieselben
Konstanten, derselbe Exponent, dieselbe Quellenreferenz. Es entsteht **keine
neue Physik**. Die anderswo gebräuchliche Schreibweise mit g und R wird nicht
übernommen (→ [R8](./research.md)); sie würde zwei Konstanten einführen, wo der
Kern einen zusammengefassten Exponenten führt, und wäre damit genau die zweite
Wahrheit, die Prinzip IV verbietet.

Weil beide Funktionen im selben Modul stehen, lässt sich der **Rundlauf** als
Test schreiben: Wer `toQnh` auf das Ergebnis von `toPressureAltitude` anwendet,
muss den Ausgangswert zurückbekommen. Das ist die schärfste verfügbare Probe
dafür, dass die beiden nicht auseinanderlaufen — schärfer als jeder Vergleich
gegen einen selbst gerechneten Erwartungswert.

### Der abgerundete Wert entsteht im Kern

Der Regler kennt nur ganze hPa. `toQnh` liefert deshalb zwei Zahlen: den
ungerundeten Wert und den **abgerundeten** (→ [R9](./research.md)). Beide stehen
im Dialog, damit die Abweichung sichtbar ist (FR-005, SC-006).

Abgerundet statt kaufmännisch gerundet, aus zwei Gründen: Es ist die Praxis des
METAR (aus 1023,7 wird Q1023), und es ist die sichere Richtung — ein niedrigerer
QNH ergibt eine **größere** Druckhöhe und damit eine längere ausgewiesene
Startstrecke. Die Rundung geht in dieselbe Richtung wie eine vorsichtige
Planung.

Dass diese Rundung nicht in `format.ts` steht, hat einen Grund: Dort liegt die
**Anzeige**-Rundung (C-03). Hier entsteht ein Wert, der in einen Regler geht und
die Startstreckenrechnung verändert. Er ist Ergebnis, nicht Darstellung.

### Der Kern kennt EDSH nicht

`toQnh(stationPressureHpa, elevationFt)` bekommt zwei Zahlen. Die Koordinaten
und die Platzhöhe von EDSH liegen in `apps/web/src/lib/weather/edsh.ts` — an
**einer** Stelle, gemeinsam mit der Konstanten, die die bestehende Schnellwahl
der Platzhöhe setzt (FR-025). Heute steht diese Konstante in `+page.svelte`; sie
wandert in die neue Datei, und `+page.svelte` führt sie von dort. Zwei Angaben
derselben Platzhöhe darf es nicht geben — sonst belegte der Abruf eine andere
Höhe als die Schnellwahl, und niemand sähe es.

### Die Platzhöhe geht mit in die Anfrage

Der Dienst bekommt `&elevation=296` ausdrücklich mitgegeben, statt seine eigene
Geländehöhe zu verwenden (→ [R6](./research.md)). Damit bezieht sich der
gelieferte Stationsdruck auf genau die Höhe, mit der der Kern zurückrechnet.
Ohne den Parameter hinge das Ergebnis an einem fremden Höhenmodell, das sich
ändern kann, ohne dass sich hier etwas ändert.

Die 296 m sind dabei die Umrechnung derselben 971 ft, die die Schnellwahl setzt
— gerechnet, nicht zweitgeführt.

### Die Antwortprüfung ist Handarbeit, kein Zod-Schema

Zod liegt im Kern und prüft dort Eingaben des Piloten. Für die Antwort eines
fremden Dienstes wird es **nicht** in die Weboberfläche gezogen: Das wäre eine
neue Abhängigkeit im Bundle für drei Felder. Der Adapter prüft stattdessen
ausdrücklich — Feld vorhanden, endliche Zahl, plausibler Bereich — und wirft
sonst denselben Fehler wie bei einer Zeitüberschreitung (FR-015). Ein
unplausibler Wert ist für den Piloten dasselbe wie keine Antwort.

Plausibel heißt hier: Stationsdruck zwischen 500 und 1100 hPa. Der Bereich ist
bewusst weit — er soll Unsinn abfangen (`null`, `0`, ein Text), nicht Wetter
beurteilen. Die eigentliche Grenze zieht danach der Reglerbereich (FR-007).

### Der Dialog ist ein `<dialog>`

Das native Element erfüllt FR-008 ohne eigenen Nachbau: `showModal()` hält den
Tastaturfokus im Dialog, `Esc` schließt ihn, der Fokus kehrt beim Schließen
zurück, und der Hintergrund wird für Vorlesewerkzeuge inaktiv. Ein selbst
gebauter Overlay-Dialog müsste all das nachbilden — mit hoher Wahrscheinlichkeit
schlechter.

`Esc` wirkt damit von selbst wie „Abbrechen", was FR-008 genau verlangt. Wichtig
ist nur, dass das Schließen **nie** einen Wert setzt: Übernommen wird
ausschließlich auf den Knopf.

### Ein Abruf, der überholt werden kann, wird verworfen

Der Dialog hält den laufenden Abruf und bricht ihn beim Schließen ab
(`AbortController`). Trifft danach doch eine Antwort ein, verändert sie nichts
(FR-018). Ein zweiter Klick auf „EDSH" bei offenem Dialog ist folgenlos, weil
der Button dann nicht erreichbar ist — der modale Dialog liegt darüber.

### Der Herkunftsvermerk hängt am Wert, nicht am Dialog

Nach der Übernahme steht unter dem QNH-Regler eine Zeile mit Dienst und
Gültigkeitszeit (FR-009). Sie verschwindet, sobald der Pilot den Regler selbst
bewegt — die Herkunft gilt dann nicht mehr. Technisch ist das ein
Zustandsfeld neben `qnhHpa`, das bei jeder anderen Änderung geleert wird.

Der vorhandene `folge`-Steckplatz von `RangeField` trägt diese Zeile; die
Komponente muss dafür nicht angefasst werden. Das ist derselbe Platz, an dem
bei der Platzhöhe die Druckhöhe steht — die Stelle für „was folgt aus diesem
Regler".

### Prüfbarkeit ohne Netz

Der Netz-Adapter zerfällt in zwei Teile: eine reine Funktion, die eine Antwort
prüft und in Zahlen übersetzt, und eine dünne Hülle, die `fetch` aufruft. Nur
die reine Funktion wird mit Vitest geprüft — dafür bekommt `vitest.config.ts`
ein drittes Projekt `web`. Der Klickpfad prüft das Zusammenspiel und fängt die
Netzanfrage mit `page.route()` ab, damit er nicht vom Wetter abhängt und den
Fehlerfall überhaupt herstellen kann.

## Complexity Tracking

Keine Verstöße gegen die Constitution, daher keine Einträge.
