# Implementation Plan: Reservierungsstand in Echtzeit über das Kalender-Abo

**Branch**: `052-echtzeit-per-kalender-abo` | **Date**: 2026-08-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/052-echtzeit-per-kalender-abo/spec.md`

## Summary

Die Anzeige holt den Reservierungsstand beim Aufruf unmittelbar aus dem
Kalender-Abo von Vereinsflieger, statt ihn aus einem alle zehn Minuten
gefüllten Zwischenspeicher zu lesen. Der bisherige Weg über die
Programmierschnittstelle bleibt bestehen, läuft aber nur noch halbstündlich und
pflegt allein den Rückfall.

Der Kalender wird **im Kern** ausgewertet — als zweiter Deuter neben dem
bestehenden, der dasselbe `Deutungsergebnis` liefert. Damit gibt es weiterhin
nur *eine* Auslegung der Frage „frei oder belegt" (Verfassungsprinzip IV); nur
die Herkunft der Rohdaten unterscheidet sich.

Eine Entscheidung greift dabei über das Feature hinaus und ist in
[research.md](./research.md) unter E-04 begründet: Zeiträume werden im Kern
künftig als **ISO 8601 mit Zeitversatz** geführt. Der Kalender kennt den
Zeitpunkt exakt; ihn durch eine mehrdeutige Ortszeitangabe zu schleusen, würde
diese Genauigkeit wegwerfen und einmal im Jahr — in der doppelten Stunde der
Zeitumstellung — durch Konvention neu erraten.

## Technical Context

**Language/Version**: TypeScript 5, ES-Module, `noUncheckedIndexedAccess` aktiv

**Primary Dependencies**: keine neuen. Die Auswertung des Kalenders entsteht als
eigener Deuter im Kern (Begründung in research.md, E-03)

**Storage**: Cloudflare KV, Namensraum `RESERVIERUNGEN` (unverändert aus
Feature 047). Die neue Quelle ist ein Netzabruf ohne eigene Ablage

**Testing**: Vitest für Kern und Adapter, `tests/ui/klickpfad.mjs` für den
Klickpfad, dazu eine Vertragsprüfung gegen einen echten Kalenderabzug

**Target Platform**: Cloudflare Workers (SvelteKit über `adapter-cloudflare`),
Anzeige im Browser, überwiegend Telefon

**Project Type**: Monorepo — geteilter Kern, zwei Zugangswege

**Performance Goals**: Der Kalenderabruf darf den Aufbau der Seite nicht
merklich verlängern (SC-002). Gemessen am 13.08.2026: rund 0,2 s, ~20 KB, 59
Einträge. Wartezeit bis zum Abbruch: 2 s

**Constraints**:
- Die Abo-Adresse DARF den Server nicht verlassen (FR-002)
- Ein Fehlschlag DARF nie als „frei" enden (FR-007, FR-008)
- Die Auskunft bleibt für den Browser unzwischenspeicherbar — die am
  13.08.2026 behobene Falle darf nicht zurückkehren
- Der Rückfallstand muss unter der Verfallsgrenze von 60 Minuten bleiben

**Scale/Scope**: Ein Verein, zweistellige Zahl von Aufrufen je Tag, ein
angezeigtes Flugzeug (D-EELK), rund 60 Kalendereinträge je Abruf

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Prinzip | Betroffen | Bewertung |
|---|---|---|
| **I. Deterministic Safety-Critical Calculations** | mittelbar | Reservierungsdaten sind keine POH-Leistungsdaten; das Prinzip greift dem Buchstaben nach nicht. Sein Geist schon: Die Auswertung läuft als deterministischer Code, nie durch ein Sprachmodell, und die Anzeige nennt Vereinsflieger unverändert als verbindliche Quelle (FR-020). **Bestanden.** |
| **II. Vereinsflieger as System of Record** | ja | Der Zugriff bleibt ausschließlich lesend (FR-017). Es entsteht keine zweite Datenhaltung: Der KV-Speicher ist ein Rückfall, keine Quelle der Wahrheit. **Bestanden.** |
| **III. SvelteKit as Frontend Standard** | ja | Keine Änderung am Stack. **Bestanden.** |
| **IV. Shared Deterministic Core, Multiple Access Paths** | **stark** | Der neue Deuter liegt im Kern und liefert dasselbe `Deutungsergebnis` wie der bestehende. `belegung.ts` — die einzige Stelle, die „frei oder belegt" entscheidet — bleibt in ihrer Logik unangetastet und sieht nicht, woher die Daten kamen. Genau das verlangt FR-022. **Bestanden**, und zwar tragend: Ein eigener Rechenweg für den Kalender wäre der klassische Verstoß gegen dieses Prinzip. |

**Agent-Agnostic Project Knowledge**: Alle Festlegungen dieses Features stehen
unter `specs/052-echtzeit-per-kalender-abo/`, nicht in werkzeugspezifischen
Dateien. **Bestanden.**

**Development Workflow**: Issue #52 vergibt die Nummer, der Ablauf
Specify → Plan → Tasks → Implement wird eingehalten. **Bestanden.**

**Ergebnis: keine Verstöße, keine Rechtfertigung nötig.** Ein Abschnitt
„Complexity Tracking" entfällt deshalb.

### Nachprüfung nach Phase 1

Nach dem Entwurf erneut geprüft — insbesondere die Sorge, ob der neue
Netzabruf im Adapter eine verkappte zweite Rechenlogik einführt: Er tut es
nicht. `kalender-holen.ts` holt Text und reicht ihn weiter; jede Auslegung
geschieht in `kalenderDeuten` im Kern. Die einzige Stelle, die entscheidet,
welche der beiden Quellen gilt, ist die Server-Route — und sie entscheidet über
*Herkunft*, nicht über *Bedeutung*. **Weiterhin bestanden.**

## Project Structure

### Documentation (this feature)

```text
specs/052-echtzeit-per-kalender-abo/
├── plan.md              # diese Datei
├── spec.md              # bereits vorhanden
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/           # Phase 1
│   ├── api-reservierung.md
│   └── kalender-deuten.md
├── checklists/
│   └── requirements.md  # bereits vorhanden
└── tasks.md             # erst durch /speckit-tasks
```

### Source Code (repository root)

```text
packages/reservierung-core/
├── src/
│   ├── kalender-deuten.ts      # NEU — Kalender auswerten, netzfrei
│   ├── antwort-deuten.ts       # GEÄNDERT — liefert Zeitpunkte mit Versatz
│   ├── typen.ts                # GEÄNDERT — Zeitformat, Herkunft des Standes
│   ├── belegung.ts             # GEÄNDERT — liest Zeitpunkte statt Ortszeit
│   ├── zeit.ts                 # GEÄNDERT — Umrechnung in beide Richtungen
│   ├── verfall.ts              # unverändert
│   ├── formulieren.ts          # GEÄNDERT — Wortlaut des Rückfalls
│   └── index.ts                # GEÄNDERT — neue Ausgänge
└── tests/
    ├── kalender-deuten.test.ts        # NEU
    ├── kalender-vertrag.test.ts       # NEU — gegen echten Abzug
    ├── beispiele/kalender.ics         # NEU — Abzug, Namen ersetzt
    └── …                              # bestehende, teils angepasst

apps/web/
├── src/
│   ├── lib/server/
│   │   └── kalender-holen.ts   # NEU — Netzabruf, Wartezeit, Überlastschutz
│   └── routes/
│       ├── api/reservierung/+server.ts       # GEÄNDERT — erst live, dann Rückfall
│       └── d-eelk/reservierung/+page.svelte  # GEÄNDERT — „letzter bekannter Stand"

apps/reservierungs-abruf/
└── wrangler.jsonc              # GEÄNDERT — Takt von 10 auf 30 Minuten

tests/ui/klickpfad.mjs          # GEÄNDERT — neue Prüfungen
```

**Structure Decision**: Die bestehende Aufteilung aus Feature 047 trägt
unverändert. Der Kalender-Deuter kommt als weitere Datei **in den Kern**, nicht
in die Weboberfläche: Er ist reine Auswertung ohne Netz und ohne Laufzeitbezug,
und er muss demselben Prüfstand unterliegen wie der bestehende Deuter. Der
Netzabruf gehört dagegen **nicht** in den Kern — dessen einleitender Kommentar
sichert ausdrücklich zu, dass er „nichts vom Netz" weiß. Er kommt nach
`apps/web/src/lib/server/`, wo die Grenze zwischen Server und Browser ohnehin
verläuft; das Namensschema `lib/server/` verhindert in SvelteKit zudem, dass die
Datei versehentlich im Browserbündel landet — der wirksamste Schutz für FR-002.

## Ablauf einer Anfrage

```text
Browser  ──GET /api/reservierung──▶  Server-Route
                                     │
                                     ├─ 1. kalenderHolen()  ─── 2 s Wartezeit ───▶ Vereinsflieger
                                     │      ↓ Erfolg                                (30 s Randablage)
                                     │   kalenderDeuten()  ──▶ Deutungsergebnis
                                     │      quelle: 'kalender', abgerufenAm: jetzt
                                     │
                                     └─ 2. Rückfall bei Fehlschlag
                                            KV lesen ──▶ Abrufstand
                                            quelle: 'rueckfall'
                                     │
                                     ▼
                              belegungsauskunft()   ← die EINZIGE Stelle,
                                     │                die „frei oder belegt" entscheidet
                                     ▼
                              Antwort, no-store

Cron (halbstündlich) ──▶ Programmierschnittstelle ──▶ antwortDeuten() ──▶ KV
                         (eigene Zugangsdaten, eigener Weg)
```

Die beiden Wege berühren sich nur im KV-Speicher, und dort nur in einer
Richtung: Der Cron schreibt, die Server-Route liest. Ein Fehlschlag des einen
kann den anderen nicht beeinträchtigen (FR-021a).
