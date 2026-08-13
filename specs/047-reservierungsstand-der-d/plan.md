# Implementation Plan: Reservierungsstand der D-EELK anzeigen

**Branch**: `047-reservierungsstand-der-d` | **Date**: 2026-08-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/047-reservierungsstand-der-d/spec.md`

## Summary

Ein eigener Cloudflare Worker holt alle zehn Minuten die Reservierungen aller
Vereinsflugzeuge von Vereinsflieger und legt sie in einem KV-Namensraum ab. Die
SvelteKit-App liest daraus und beantwortet die eine Frage, um die es geht: Ist
die D-EELK gerade frei, und wann ändert sich das? Alles Fachliche — Deuten der
Antwort, Zusammenfassen von Belegungen, Ableiten der Auskunft — liegt in einem
UI-freien Kernpaket, das beide Seiten benutzen.

Die drei Weichen, die diesen Plan prägen, sind in [research.md](./research.md)
belegt: **zwei Worker statt einem** (E-01, im Versuch erzwungen), **MD5 aus der
Laufzeit** (E-02) und **die Zugangsdaten kennt nur der Abruf-Worker** (E-07).

## Technical Context

**Language/Version**: TypeScript, Node 24 örtlich, Cloudflare Workers als Laufzeit

**Primary Dependencies**: SvelteKit 2 mit `@sveltejs/adapter-cloudflare`,
Wrangler 4. **Kein neues Fremdpaket** — MD5 kommt aus der Laufzeit, Zeitzonen
aus `Intl`.

**Storage**: Workers KV, ein Namensraum, ein Schlüssel mit dem gesamten
Abrufstand (E-03)

**Testing**: `vitest` für den Kern (reine Funktionen, kein Netz, kein Worker);
der bestehende Klickpfad für die Anzeige

**Target Platform**: Cloudflare Workers, Anzeige im Browser (auch Telefon)

**Project Type**: Monorepo — Kernpaket, Weboberfläche, zwei Worker

**Performance Goals**: Die Auskunft steht ohne merkliche Wartezeit; ein
Seitenaufruf kostet einen einzigen Lesevorgang im Zwischenspeicher

**Constraints**: 500 Aufrufe je Tag bei der Gegenstelle für den **ganzen Verein**
(SC-003); kostenloser Cloudflare-Tarif; keine Klarnamen nach außen (FR-006)

**Scale/Scope**: ~60 Vereinsmitglieder, ein bis wenige Flugzeuge, einige Dutzend
gleichzeitige Reservierungen

## Constitution Check

*GATE: vor Phase 0 und nach Phase 1 zu prüfen.*

| Prinzip | Betroffen? | Bewertung |
|---|---|---|
| **I. Deterministische Berechnungen** | mittelbar | Keine POH-Daten im Spiel. Der Geist der Regel gilt aber: Die Ableitung „frei/belegt und nächster Wechsel" ist deterministischer Code mit Prüfungen, kein Sprachmodell. Eine Quellenangabe im Sinne von Seite+Tabelle gibt es hier nicht; an ihre Stelle tritt der Verweis auf Vereinsflieger als verbindliche Quelle (FR-011) samt Alter der Auskunft (FR-009). |
| **II. Vereinsflieger ist führend** | **unmittelbar** | **Erfüllt und tragend.** Es wird ausschließlich gelesen (FR-012); gebucht wird weiterhin dort (US3). Bucky hält keine eigenen Reservierungen, sondern einen Zwischenspeicher mit ausgewiesenem Alter — das ist kein zweites System of Record, sondern eine Abschrift mit Verfallsdatum. |
| **III. SvelteKit** | ja | Die Anzeige entsteht in der bestehenden SvelteKit-App. |
| **IV. Geteilter Kern, mehrere Zugangswege** | **unmittelbar** | **Erfüllt.** `packages/reservierung-core` ist UI- und laufzeitfrei; Cron-Worker und Server-Route sind dünne Adapter (E-06). Kein Zugangsweg rechnet selbst. |
| **V. Cloudflare als Laufzeit** | **unmittelbar** | **Erfüllt.** Cron Trigger und KV sind genau die Bausteine, für die Feature 045 den Umzug gemacht hat. |

**Abweichung zu Prinzip IV, offengelegt**: Der Abruf läuft in einem *zweiten*
Worker, nicht im selben. Das ist keine Aufweichung des geteilten Kerns — beide
Worker benutzen dasselbe Kernpaket —, sondern eine Trennung der Zugangswege, die
E-01 technisch erzwingt: Der Adapter überschreibt jede eigene Einstiegsdatei.

**Ergebnis**: Keine ungerechtfertigte Verletzung. Weiter zu Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/047-reservierungsstand-der-d/
├── plan.md              # Diese Datei
├── spec.md
├── research.md          # Neun Entscheidungen mit Quellen
├── data-model.md        # Die drei Größen und ihre Regeln
├── quickstart.md        # Wie man es aufsetzt und prüft
├── contracts/
│   └── reservierungsstand.md   # Was die Server-Route nach außen gibt
└── checklists/requirements.md
```

### Source Code (repository root)

```text
packages/
├── deelk-poh-core/              # unverändert
└── reservierung-core/           # NEU — alles Fachliche, ohne Cloudflare-Bezug
    ├── src/
    │   ├── antwort-deuten.ts    # objektindizierte Antwort -> Reservierungen
    │   ├── belegung.ts          # frei/belegt, nächster Wechsel, Ketten
    │   ├── formulieren.ts       # der Satz für die Anzeige, Ortszeit
    │   └── index.ts
    └── tests/

apps/
├── web/                         # SvelteKit — liest nur
│   └── src/routes/
│       ├── api/reservierung/+server.ts       # NEU — gibt den Stand aus dem Speicher
│       └── d-eelk/reservierung/+page.svelte  # NEU — die schlichte Anzeige
├── mcp/                         # unverändert
└── reservierungs-abruf/         # NEU — der Worker mit dem Cron Trigger
    ├── src/index.ts             # scheduled() + Anmeldung + Abruf
    └── wrangler.jsonc           # Cron, KV-Bindung, Geheimnisse
```

**Warum diese Aufteilung**: Der Zuschnitt folgt der Frage, wer was wissen darf.
Der Abruf-Worker kennt die Zugangsdaten, aber niemand ruft ihn auf. Die Web-App
wird von allen aufgerufen, kennt aber keine Zugangsdaten. Der Kern kennt weder
das eine noch das andere und ist deshalb der einzige Teil, der sich vollständig
prüfen lässt.

## Vorgehen in vier Schritten

### Schritt 1 — Der Kern, gegen aufgezeichnete Antworten

Zuerst das Fachliche, ohne jede Cloudflare-Berührung: Antwort deuten,
Belegungen zusammenfassen, Auskunft ableiten, Satz formulieren. Grundlage ist
eine **einmal aufgezeichnete echte Antwort**, von Hand um Klarnamen bereinigt
und als Prüfstoff abgelegt.

Hier entstehen die Prüfungen für die Randfälle aus der Spec: lückenlose Ketten,
mehrtägige Belegungen, Zeitumstellung, leere Antwort, Einzeleintrag. Der
Bezugszeitpunkt wird übergeben, nie selbst geholt (E-09) — sonst wären die
Fälle nicht stellbar.

**Fertig, wenn**: `npx vitest run` die neuen Prüfungen grün meldet, ohne dass je
eine Netzverbindung nötig war.

### Schritt 2 — Der Abruf-Worker

Eigenes Verzeichnis, eigene Wrangler-Konfiguration, Cron alle zehn Minuten.
Anmeldung mit dem Dienstkonto, Zugangsschlüssel wiederverwenden und nur bei
Ablehnung erneuern (E-04), Antwort durch den Kern schicken, Ergebnis **ohne
Klarnamen** in den Speicher legen (FR-006).

Der entscheidende Teil ist das Verhalten im Fehlerfall: Ein misslungener
Durchgang **schreibt nicht** (FR-004). Lieber ein alter Stand, der sich als alt
zu erkennen gibt, als ein leerer.

**Fertig, wenn**: `wrangler dev --test-scheduled` örtlich einen Eintrag im
Speicher erzeugt und ein erzwungener Fehlschlag ihn nachweislich stehen lässt.

### Schritt 3 — Die Anzeige

Server-Route liest den Speicher und gibt den Stand aus; eine schlichte Seite
zeigt den Satz. Kein Kalender, kein Raster — bewusst.

Dazu Klickpfad-Prüfungen: der Satz ist da, das Alter steht dabei, ein veralteter
Stand ist gekennzeichnet, **kein Name taucht auf**, der Weg nach Vereinsflieger
führt hin.

**Fertig, wenn**: der Klickpfad die neuen Prüfungen besteht.

### Schritt 4 — In Betrieb nehmen

KV-Namensraum anlegen, Geheimnisse setzen, den Abruf-Worker aus der
Ablaufsteuerung veröffentlichen, ersten echten Durchlauf beobachten, Verbrauch
gegen SC-003 halten.

## Risiken

| Risiko | Auswirkung | Vorkehrung |
|---|---|---|
| Der Zugangsschlüssel läuft anders ab als vermutet und wird ständig erneuert | Kontingent aufgebraucht, Abruf fällt aus | Neuanmeldungen werden gezählt und im gespeicherten Stand vermerkt; so ist der Verbrauch nach einem Tag ablesbar statt geschätzt |
| Die Gegenstelle ändert Feldnamen | Auskunft bricht ab | Der Deutungsschritt weist Unbekanntes ab, statt zu raten; ein unbrauchbarer Abruf überschreibt nichts (FR-004) |
| Ein Klarname rutscht doch nach außen | Datenschutzverstoß | Der Kern gibt nur eine schmale Struktur zurück, die Klarnamen gar nicht kennt; eine Prüfung stellt sicher, dass die ausgelieferte Antwort kein Feld enthält, das nicht in der Vereinbarung steht |
| Zwei Worker geraten auseinander | Uneinheitliches Verhalten | Beide benutzen dasselbe Kernpaket; keiner rechnet selbst (Prinzip IV) |
| Der erste echte Abruf misslingt still | Niemand merkt es | Schritt 4 sieht ausdrücklich das Beobachten des ersten Durchlaufs vor, nicht nur das Veröffentlichen |

## Entschieden während der Planung

**Der Umhüllungsweg wurde verworfen, nachdem er im Versuch gescheitert ist.**
Ursprünglich war ein einziger Worker vorgesehen, dessen Einstiegsdatei den
SvelteKit-Worker umhüllt und um den Cron-Handler ergänzt — so steht es in
mehreren Anleitungen im Netz. Der Versuch zeigte, dass der Adapter genau diese
Datei beim Bau überschreibt, **ohne Warnung**. Hätte ich den Plan darauf gebaut,
wäre der Fehler erst beim ersten ausbleibenden Abruf in Betrieb aufgefallen —
und dann als „der Cron läuft nicht" erschienen, nicht als „die Datei ist weg".

**Nicht erstellt**: keine gesonderte Aufstellung der Cloudflare-Konfiguration.
Sie steht in `quickstart.md`, wo sie beim Aufsetzen gebraucht wird.

## Erneute Prüfung gegen die Constitution (nach dem Entwurf)

Der Entwurf hat die Bewertung an zwei Stellen **verschärft** statt aufgeweicht:

- **Prinzip II**: `data-model.md` führt kein Flugzeug und kein Mitglied als
  eigene Größe. Eine Kennung ist Text. Damit entsteht nirgends ein
  Stammdatenbestand neben Vereinsflieger.
- **Prinzip IV**: `contracts/reservierungsstand.md` hält ausdrücklich fest, dass
  die Server-Route nicht nachrechnet, sondern durchreicht. Die Aufgabenteilung
  ist damit vertraglich, nicht nur beabsichtigt.

Keine neuen Abweichungen. Die eine offengelegte (zwei Worker statt einem, E-01)
bleibt bestehen und begründet.
