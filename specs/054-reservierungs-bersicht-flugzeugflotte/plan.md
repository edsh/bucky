# Implementation Plan: Reservierungsübersicht Flugzeugflotte

**Branch**: `054-reservierungs-bersicht-flugzeugflotte` | **Date**: 2026-08-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/054-reservierungs-bersicht-flugzeugflotte/spec.md`

## Summary

Aus der Einzelauskunft über die D-EELK wird eine Übersicht über die gesamte
Vereinsflotte: jede Maschine ein runder Avatar mit Tagesuhr-Ring, ein Tap
öffnet die Detailansicht mit Tagesbalken, Sieben-Tage-Liste, Wochenraster und
einem Reservieren-Sheet, das nach Vereinsflieger verweist.

Datenseitig ist das **kein neues Feature, sondern das Weglassen eines
Filters**. Beide bestehenden Quellen — Kalender-Abo (052) und
Vereinsflieger-Programmierschnittstelle über den Abruf-Worker (047) — liefern
seit jeher alle Flugzeuge; die Server-Route hat sie bisher auf `'D-EELK'`
verengt. Es kommt keine neue Datenquelle hinzu (FR-021), und der zweistufige
Weg Kalender → Rückfall bleibt Wort für Wort derselbe.

Der Aufwand liegt an zwei anderen Stellen. Erstens **im Kern**: Statuslogik,
Tagesuhr-Geometrie und Balkensegmente entstehen dort als geprüfte Module,
nicht in Svelte-Bauteilen (Prinzip IV, [research.md](./research.md) E-04). Die
Weboberfläche macht aus den gelieferten Zahlen CSS und sonst nichts. Zweitens
**bei der Flotte selbst**: Die Annahme der Spec, sie lasse sich vollständig
aus den Daten ableiten, trägt nicht — ein Flugzeug ohne Buchung taucht in
keiner der beiden Quellen auf und verschwände genau dann aus der Übersicht,
wenn es frei ist. Deshalb E-01: eine schmale Stammliste von Kennzeichen,
vereinigt mit dem, was in den Daten steht.

Eine Anforderung wird **nicht** erfüllt: die Kennzeichnung eigener
Reservierungen (FR-009, US2-Szenario 3). Bucky kennt keine Anmeldung, und
FR-023 verbietet, Namen durch das System zu reichen — die Frage „ist das meine
Buchung?" ist ohne Identität nicht entscheidbar. Mit dem Auftraggeber am
2026-08-18 zurückgestellt (E-11).

## Technical Context

**Language/Version**: TypeScript 5, ES-Module, `noUncheckedIndexedAccess` aktiv

**Primary Dependencies**: keine neuen. Svelte 5 (Runen), SvelteKit 2,
`adapter-cloudflare` — alles bereits vorhanden

**Storage**: Cloudflare KV, Namensraum `RESERVIERUNGEN` (unverändert). Neuer
Schlüssel `sonnenzeiten` neben dem bestehenden `stand` (E-08). Favoriten
ausschließlich im `localStorage` des Geräts (E-10)

**Testing**: Vitest für Kern und Adapter (Projekte `reservierung-core` und
`web`), `tests/ui/klickpfad.mjs` für den Klickpfad, Vertragsprüfung gegen den
echten Kalenderabzug in `tests/beispiele/kalender.ics`

**Target Platform**: Cloudflare Workers (SvelteKit über `adapter-cloudflare`,
`prerender = true`, `ssr = false`), Anzeige im Browser, ganz überwiegend Telefon

**Project Type**: Monorepo — geteilter Kern, mehrere Zugangswege

**Performance Goals**: Übersicht binnen 2 s sinnvoll sichtbar (SC-002). Die
Seitenhülle ist vorgerendert und statisch; danach genau **ein** Abruf von
`/api/flotte`. Nutzlast im Achttagefenster: rund 10–15 Belegungen, wenige
Kilobyte. Kein weiterer Abruf im Minutentakt (E-09)

**Constraints**:
- Ein Fehlschlag DARF für **keine** Maschine „frei" ergeben (FR-022, SC-003)
- Die Abo-Adresse verlässt den Server nicht (FR-002 aus 052)
- Keine personenbezogene Angabe in der Antwort, auch keine leere (FR-023)
- Eine Anfrage aus der Oberfläche löst **keinen** Wetterdienst-Aufruf aus
  (Prinzip V, E-08)
- `no-store` auf der Auskunft — die am 13.08.2026 behobene Falle bleibt
  geschlossen
- Ringgeometrie pixelgenau nach Design-Handoff
- Einspaltig bis 430 px, Tap-Ziele ≥ 44 px (FR-017)

**Scale/Scope**: Ein Verein, sechs bis zehn Flugzeuge, zweistellige Zahl von
Aufrufen je Tag. Zwei neue Seiten, ein neuer Endpunkt, fünf neue Kernmodule

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Prinzip | Betroffen | Bewertung |
|---|---|---|
| **I. Deterministic Safety-Critical Calculations** | mittelbar | Reservierungsdaten sind keine POH-Leistungsdaten; dem Buchstaben nach greift das Prinzip nicht. Dem Geist nach schon: Alle Auswertung ist deterministischer Code, nie ein Sprachmodell, und die Anzeige nennt an zwei Stellen Vereinsflieger als verbindliche Quelle (FR-012). **Bestanden.** |
| **II. Vereinsflieger as System of Record** | **ja, mit Anmerkung** | Der Zugriff bleibt rein lesend; gebucht wird weiterhin ausschließlich in Vereinsflieger (FR-011, E-13). Die Stammliste aus E-01 ist der einzige Punkt, an dem dieses Feature eine Vereinsangabe im Repository führt — siehe Rechtfertigung unten. **Bestanden mit dokumentierter Abweichung.** |
| **III. SvelteKit as Frontend Standard** | ja | Keine Änderung am Stack; zwei neue Routen. Der Handoff nennt „React + Vite" als denkbaren Stack — das ist eine Empfehlung des Designers ohne Kenntnis dieser Verfassung und wird nicht befolgt. **Bestanden.** |
| **IV. Shared Deterministic Core, Multiple Access Paths** | **stark** | Statuslogik, Tagesuhr-Geometrie und Segmente entstehen im Kern (E-04); die Oberfläche erzeugt daraus CSS und rechnet nichts. `endeDerKette` — die einzige Stelle, die „lückenlos anschließend" auslegt — wird wiederverwendet, nicht kopiert (Z-02). Farbwerte und Routenpfade bleiben umgekehrt draußen aus dem Kern (E-03, Z-10). **Bestanden**, und zwar tragend. |
| **V. Serverseitige Anteile auf Cloudflare, geteilter Zwischenspeicher** | **stark** | Die Sonnenzeiten holt der zeitgesteuerte Abruf-Worker einmal täglich und legt sie im geteilten KV ab; die Server-Route liest nur (E-08, F-09). Die Zahl der Fremdaufrufe ist damit vom Besucheraufkommen unabhängig. Keine Zugangsdaten im Repository, keine persönlichen Zugangsdaten von Mitgliedern. **Bestanden.** |

**Agent-Agnostic Project Knowledge**: Alle Festlegungen stehen unter
`specs/054-reservierungs-bersicht-flugzeugflotte/`. Der Design-Handoff liegt
werkzeugneutral unter `docs/design_handoff_reservierung/`. **Bestanden.**

**Development Workflow**: Issue #54 vergibt die Nummer; der Ablauf
Specify → Plan → Tasks → Implement wird eingehalten. **Bestanden.**

### Abweichung zu Prinzip II — die Flotten-Stammliste

Prinzip II verbietet, vereinsseitige Daten (Mitglieder, Buchungen, Flugzeuge)
redundant vorzuhalten. Die Stammliste aus E-01 hält Flugzeug-**Kennzeichen**
vor und berührt das Prinzip damit unmittelbar.

**Warum sie trotzdem nötig ist**: Beide Datenquellen kennen ein Flugzeug nur
über seine Buchungen. Eine Maschine, die in den nächsten acht Tagen niemand
gebucht hat, käme in keiner Antwort vor — sie verschwände aus der Übersicht
**genau dann, wenn sie frei ist**. Das ist nicht bloß unvollständig, sondern
die schädliche Richtung des Fehlers: Wer fliegen will, sieht das eine
verfügbare Flugzeug nicht. FR-001 („die gesamte Flotte") und der Grenzfall
„Maschine ohne jede Reservierung" der Spec verlangen es ausdrücklich.

**Warum die Abweichung klein bleibt**:

- Die Liste enthält **nur Kennzeichen**, keine Buchungen, keine Mitglieder,
  keine Wartungsstände, keine Preise — nichts, was in Vereinsflieger gepflegt
  wird und dort weiterlaufen könnte. Sie **führt** keine Flugzeugdaten, sie
  **kennt** Kennungen, um danach zu fragen. Denselben Schritt geht das Projekt
  seit Feature 001, wo `D-EELK` im POH-Kern, in `kennzeichen.ts` und in der
  Route fest steht, ohne dass das je als Verstoß gelesen wurde.
- Sie ist **nicht führend**: Ein Kennzeichen, das nur in den Daten auftaucht,
  erscheint trotzdem (Vereinigung, E-01). Die Liste kann nur zu wenig
  enthalten, nie zu viel Wirkung entfalten.
- Die Kategorie steht **nicht** darin — sie folgt einer Regel (E-02).

**Wo die Abweichung tatsächlich kostet** (nicht schönreden): Bleibt ein
verkauftes Flugzeug in der Liste, steht es dauerhaft mit grünem Ring und „frei
den ganzen Tag" in der Übersicht — eine **falsche Verfügbarkeitsaussage**, und
damit genau die Fehlerklasse, gegen die dieses Feature sonst überall absichert.
Sie entsteht hier nicht aus einem Rechenfehler, sondern aus unterlassener
Pflege, und sie fällt schnell auf. Aber „fällt auf" ist ein schwächeres
Versprechen als der Rest des Features gibt. In der Gegenrichtung ist die Liste
harmlos: Ein nicht nachgetragenes neues Flugzeug erscheint beim ersten Buchen
von selbst.

**Verworfene einfachere Alternative**: Flotte allein aus den Daten. Sie ist
einfacher und in der Spec so angenommen, scheitert aber am Grenzfall der Spec
selbst.

**Ausdrückliche Entscheidung des Auftraggebers vom 18.08.2026**: Die Abweichung
wird bewusst so hingenommen — „der Flugzeugpark ist statisch genug, dass wir
ihn fest im Code vorhalten können". Damit ist die Ausnahmeklausel von Prinzip II
(„sofern nicht künftig explizit anders entschieden wird") bedient; die
Entscheidung liegt nicht bei diesem Plan, sondern beim Verein. Eine Änderung
der Constitution ist dafür nicht nötig und wurde geprüft und verworfen.

**Spätere Auflösung**: Der Abruf-Worker könnte die Flottenliste einmal täglich
über die Vereinsflieger-Programmierschnittstelle mitziehen (ein Aufruf von 500)
und ins KV legen. Dann verschwände die Liste aus dem Repository und Prinzip II
gälte wieder ungeschmälert. Ob es einen solchen Endpunkt gibt, ist ungeprüft —
in `tools/vereinsflieger-api/api.http` ist keiner hinterlegt. Nicht Teil dieses
Features, aber der vorgesehene Weg, falls sich der Park doch bewegt.

### Nachprüfung nach Phase 1

Nach dem Entwurf erneut geprüft, mit zwei Fragen:

1. *Schmuggelt die Tagesuhr Gestaltung in den Kern?* Nein — das Modul liefert
   Winkel und Füllungs**namen**; `#1f8f45` und `conic-gradient` stehen
   ausschließlich in den Svelte-Bauteilen (contracts/tagesuhr.md, „Was dieses
   Modul nicht tut"). Die Grenze liegt dort, wo aus Zahlen Zeichenketten für
   den Browser werden.
2. *Entsteht durch die minütliche Neuberechnung im Browser eine zweite
   Rechenlogik?* Nein — der Browser ruft dieselben Kernfunktionen auf, die
   auch der Server aufruft, mit einem anderen Bezugszeitpunkt. Genau dafür
   nimmt der Kern den Zeitpunkt seit Feature 047 als Parameter entgegen. Wäre
   der Zustand stattdessen im Server berechnet und mitgeliefert worden, müsste
   die Oberfläche ihn zum Fortschreiben nachbilden — *das* wäre die zweite
   Logik gewesen.

**Weiterhin bestanden.**

## Project Structure

### Documentation (this feature)

```text
specs/054-reservierungs-bersicht-flugzeugflotte/
├── plan.md              # diese Datei
├── spec.md              # bereits vorhanden
├── research.md          # Phase 0 — E-01 … E-14
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1 — Nachweisführung
├── contracts/           # Phase 1
│   ├── api-flotte.md
│   ├── tagesuhr.md
│   └── zustand.md
├── checklists/
│   └── requirements.md  # bereits vorhanden
└── tasks.md             # erst durch /speckit-tasks
```

### Source Code (repository root)

```text
packages/reservierung-core/
├── src/
│   ├── flotte.ts               # NEU — Kategorieregel, Flottenbildung (E-01/E-02)
│   ├── zustand.ts              # NEU — Statuslogik (contracts/zustand.md)
│   ├── tagesuhr.ts             # NEU — Winkel, Ringsegmente (contracts/tagesuhr.md)
│   ├── segmente.ts             # NEU — Tagesbalken, Wochenraster, Mitternachtsschnitt
│   ├── sonnenzeiten.ts         # NEU — Deuten der Wetterdienst-Antwort, netzfrei
│   ├── belegung.ts             # GEÄNDERT — `endeDerKette` wird geteilt statt kopiert
│   ├── formulieren.ts          # GEÄNDERT — Statussätze, Dauern, Zusatzzeilen
│   ├── zeit.ts                 # GEÄNDERT — Datums-/Wochentagsformate (FR-015)
│   ├── typen.ts                # GEÄNDERT — neue abgeleitete Größen
│   └── index.ts                # GEÄNDERT — neue Ausgänge
└── tests/
    ├── flotte.test.ts          # NEU
    ├── zustand.test.ts         # NEU
    ├── tagesuhr.test.ts        # NEU — T-01 … T-12
    ├── segmente.test.ts        # NEU
    ├── sonnenzeiten.test.ts    # NEU
    └── kalender-vertrag.test.ts # GEÄNDERT — jetzt alle sechs Kennzeichen

apps/web/
├── src/
│   ├── lib/
│   │   ├── server/
│   │   │   ├── stand-holen.ts      # NEU — gemeinsamer Weg Kalender → Rückfall (E-07)
│   │   │   └── kalender-holen.ts   # unverändert
│   │   ├── flotte/
│   │   │   ├── darstellung.ts      # NEU — Typ, Bild, POH-Verweis je Kennung (E-03)
│   │   │   ├── favoriten.ts        # NEU — localStorage (E-10)
│   │   │   ├── stand.svelte.ts     # NEU — einmal geholter Stand, Minutentakt (E-09/E-12)
│   │   │   └── farben.ts           # NEU — Statusfarben, Verlauf aus `draengen` (E-05)
│   │   └── components/
│   │       ├── TagesuhrAvatar.svelte   # NEU — Ring, Marker, Statuspunkt, Absperrband
│   │       ├── Maschinenkachel.svelte  # NEU
│   │       ├── Tagesbalken.svelte      # NEU
│   │       ├── Wochenraster.svelte     # NEU
│   │       └── ReservierenSheet.svelte # NEU
│   ├── routes/
│   │   ├── api/
│   │   │   ├── flotte/+server.ts        # NEU — contracts/api-flotte.md
│   │   │   └── reservierung/+server.ts  # GEÄNDERT — nutzt stand-holen.ts, Vertrag bleibt
│   │   ├── reservierung/
│   │   │   └── [kennung]/+page.svelte   # NEU — Detailansicht
│   │   ├── +page.svelte                 # GEÄNDERT — der Flugzeugpark selbst
│   │   └── d-eelk/reservierung/         # unverändert
│   └── static/
│       ├── bucky-splash.png             # NEU — aus dem Handoff
│       ├── d-eelk.gif                   # NEU
│       └── d-exyz.gif                   # NEU
└── tests/
    ├── routes/api/flotte.test.ts        # NEU
    └── flotte/favoriten.test.ts         # NEU

apps/reservierungs-abruf/
├── src/
│   ├── sonnenzeiten-holen.ts   # NEU — Open-Meteo, höchstens täglich, ins KV (E-08)
│   └── abruf.ts                # GEÄNDERT — Sonnenzeiten im selben Durchgang
└── wrangler.jsonc              # unverändert — Takt bleibt 30 Minuten

tests/ui/klickpfad.mjs          # GEÄNDERT — Übersicht, Detail, Favoriten
```

**Structure Decision**: Die Aufteilung aus Feature 047/052 trägt unverändert.
Die neuen Kernmodule kommen **in den Kern**, weil sie rein rechnen und
Grenzfälle haben, die sich nur dort prüfen lassen — dieselbe Erwägung, die in
Feature 052 den Kalender-Deuter dorthin geführt hat. Der Wetterdienst-Abruf
kommt dagegen **nicht** in den Kern (der weiß nichts vom Netz) und **nicht** in
die Weboberfläche (Prinzip V), sondern in den Abruf-Worker, der ohnehin der
einzige zeitgesteuerte Zugang zu fremden Diensten ist. Der neue Ordner
`lib/flotte/` bündelt, was allein diesen Zugangsweg betrifft: Bilder, Pfade,
Farben, Favoriten.

**Nachgetragene Entscheidung (18.08., während der Umsetzung):** Die Übersicht
liegt nicht unter `/reservierung/`, sondern **ist die Startseite**. Sie ist
damit zuerst ein *Flugzeugpark* und erst in zweiter Linie eine
Reservierungsübersicht: Wer die App öffnet, hat ein Flugzeug im Sinn. Ein Tipp
auf eine Kachel öffnet deshalb das Kontextmenü aus Feature 043 mit dem, was
diese Maschine hergibt (`lib/flotte/handlungen.ts`); nur wo es genau eine
Fähigkeit gibt, springt er direkt dorthin. Die bisherige Startseite mit dem
einzelnen D-EELK-Avatar entfällt — sie war der Sonderfall einer Flotte aus
einem Flugzeug.

Das ist mehr als ein Umzug: Es hält die Seite offen für Fähigkeiten, die noch
kommen. Wäre der Einstieg die Reservierungsübersicht, müsste jede neue
Funktion einen eigenen Einstieg bekommen; so wächst sie in das Menü der
betroffenen Maschine hinein.

## Ablauf einer Anfrage

```text
Browser ──GET /api/flotte──▶ Server-Route
                              │
                              ├─ stand-holen.ts
                              │   ├─ 1. kalenderHolen()  ─2 s─▶ Vereinsflieger (kein Kontingent)
                              │   │      ↓ Erfolg  kalenderDeuten()    quelle: 'kalender'
                              │   └─ 2. Rückfall: KV 'stand'           quelle: 'rueckfall'
                              │        ↓ nichts vorhanden → stand: 'fehlt'  (nie „frei")
                              │
                              ├─ KV 'sonnenzeiten' lesen  (kein Netzaufruf)
                              ├─ flotteBilden(stammliste, belegungen)
                              └─ Fenster [heute, +8 Tage), ungekürzt
                                       ▼
                              Antwort, no-store — ohne Zustand, ohne Namen
                                       ▼
                    Browser: zustandFuer() · tagesuhr() · segmente()
                             jede Minute neu, kein neuer Abruf

Cron (halbstündlich) ──▶ Programmierschnittstelle ──▶ antwortDeuten() ──▶ KV 'stand'
                     └─▶ Open-Meteo (höchstens 1×/Tag) ─────────────────▶ KV 'sonnenzeiten'
```

Die Zahl der Fremdaufrufe hängt damit an der Uhr, nicht am Besucheraufkommen —
für die Programmierschnittstelle wie für den Wetterdienst. Der Kalender-Weg
bleibt die begründete Ausnahme aus Feature 052: Er verbraucht kein Kontingent
und ist durch die 30-Sekunden-Randablage vor Überlast geschützt.

## Reihenfolge der Umsetzung

Die Nutzergeschichten sind so geschnitten, dass jede für sich lieferbar ist.
Empfohlene Reihenfolge — die genaue Aufgabenliste entsteht in `tasks.md`:

1. **Kern zuerst** (`flotte`, `zustand`, `tagesuhr`, `segmente`, Sätze) samt
   Prüfungen. Ohne ihn ist jede Oberfläche geraten.
2. **US1 — Übersicht** (P1): Endpunkt, Kacheln, Ring, Statuspunkt, Kurztexte,
   Stand-Hinweis. Ab hier ist das Feature nutzbar.
3. **US2 — Detailansicht** (P1): Statusblock, Tagesbalken, Sieben-Tage-Liste,
   Wochenraster, kommende Belegungen.
4. **Sonnenzeiten** (E-08): Worker, KV, Marker. Bewusst nach US1/US2 — der
   Ring ist ohne sie vollständig richtig, nur ärmer.
5. **US3 — Favoriten** (P2).
6. **US4 — Reservieren-Sheet** (P3).

## Offene Punkte für `/speckit-tasks`

- Die Stammliste (E-01) braucht beim Anlegen die **tatsächlichen** Kennzeichen
  des Vereins. Der Kalenderabzug vom 13.08.2026 nennt sechs; ob das alle sind,
  ist beim Umsetzen zu klären — eine zu kurze Liste ist kein Fehler, aber eine
  unvollständige Anzeige. Bleibt die Antwort aus, beginnt die Liste mit diesen
  sechs: Die Frage darf die Grundlagenphase nicht aufhalten, weil ein
  fehlendes Kennzeichen ohnehin auftaucht, sobald es gebucht wird.
- Die Bilddateien aus dem Handoff (`bucky-splash.png`, zwei Pixel-Art-Avatare)
  müssen nach `apps/web/static/` übernommen werden; im Arbeitsbaum liegen
  zurzeit unversionierte Varianten, die vorher zu sichten sind.
