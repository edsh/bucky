# Implementation Plan: Umzug nach Cloudflare Workers

**Branch**: `045-umzug-nach-cloudflare-workers` | **Datum**: 2026-08-12 |
**Spec**: [spec.md](./spec.md) | **Issue**: [#45](https://github.com/edsh/bucky/issues/45)

## Summary

Die statisch gebaute SvelteKit-Anwendung zieht von GitHub Pages auf **Cloudflare
Workers mit Static Assets** um. Fachlich ändert sich nichts; die Adresse
`bucky.edsh.de` bleibt.

Der Weg in Kürze: Adapter auf `@sveltejs/adapter-cloudflare` wechseln,
`wrangler.jsonc` anlegen, den Pages-Workflow durch zwei Aufgaben **im
bestehenden CI-Workflow** ersetzen (Vorschau bei Vorschlägen, Veröffentlichung
auf `main`) — beide hinter der Prüfung. Der Worker wird vollständig unter
`workers.dev` abgenommen, erst danach wird die Domain umgehängt.

Zwei Dinge, die keine Umzugsarbeit sind, aber unmittelbar an FR-006 hängen und
deshalb mitkommen: **Der Klickpfad zieht in die CI** (heute läuft er nirgends
automatisch), und **die Node-Version wird vereinheitlicht** (geprüft wurde mit
22, veröffentlicht mit 24).

## Technical Context

**Sprache/Version**: TypeScript 5.9, Node 24 (Bau und Prüfung künftig gleich)

**Wesentliche Abhängigkeiten**: SvelteKit 2.46, Svelte 5.42, Vite 7.1 —
unverändert. Neu: `@sveltejs/adapter-cloudflare` 7.2.9, `wrangler` 4.122 (nur
Entwicklung). Entfällt: `@sveltejs/adapter-static`.

**Speicher**: keiner. Der Zwischenspeicher kommt erst mit der Reservierung.

**Prüfung**: `vitest` (541), `eslint`, `svelte-check`, `tsc`, Klickpfad mit
Playwright (97) — neu auch in der CI.

**Zielumgebung**: Cloudflare Workers, Static Assets, kostenloser Tarif.

**Projektart**: Monorepo mit `packages/deelk-poh-core`, `apps/web`, `apps/mcp`.
Betroffen ist ausschließlich `apps/web` und die Ablaufsteuerung.

**Randbedingungen**: Kein Server-Rechnen (FR-005). Die Auslieferung bleibt
vorgerendert; `prerender = true`, `ssr = false`, `trailingSlash = 'always'`
bleiben unangetastet.

**Umfang**: 2 Seiten, rund 60 ausgelieferte Dateien, ein Verein mit ~60
Mitgliedern.

## Constitution Check

*Vor Phase 0 geprüft, nach Phase 1 erneut. Ergebnis beide Male: bestanden.*

| Prinzip | Berührt? | Bewertung |
|---|---|---|
| **I — Deterministische Berechnung** | nein | Der Rechenkern wird nicht angefasst. SC-001 sichert Wertgleichheit Ziffer für Ziffer ab; Quellenangaben und Prüfhinweis bleiben wörtlich. |
| **II — Vereinsflieger führt** | nein | Kein Vereinsdatum im Spiel. |
| **III — SvelteKit** | ja, bestätigend | Bleibt SvelteKit; nur der Adapter wechselt. |
| **IV — Geteilter Kern, mehrere Zugänge** | ja, vorbereitend | Der Kern bleibt unberührt. Der Adapterwechsel schafft die Möglichkeit für Server-Routen, ohne in diesem Feature eine zu bauen. |
| **V — Cloudflare, geteilter Zwischenspeicher** | ja, umsetzend | Dieses Feature setzt den ersten Halbsatz um (Laufzeit). Der Zwischenspeicher folgt. Zugangsdaten liegen als Geheimnis außerhalb des Repositories; das Recht, DNS zu ändern, bekommt die Ablaufsteuerung ausdrücklich **nicht**. |

**Keine Abweichung, die zu begründen wäre.** Ein Punkt ist trotzdem
offenzulegen — siehe „Offene Entscheidung" unten.

## Project Structure

### Dokumentation

```text
specs/045-umzug-nach-cloudflare-workers/
├── spec.md
├── plan.md              # diese Datei
├── research.md          # Phase 0 — die zehn Entscheidungen mit Quellen
├── quickstart.md        # Phase 1 — Abnahme und der Ablauf der Umstellung
└── checklists/requirements.md
```

**Ohne `data-model.md`**: Es entstehen keine Daten. Das Feature verschiebt den
Ort der Auslieferung; es führt weder Entität noch Zustand ein.

**Ohne `contracts/`**: Es entsteht keine Schnittstelle nach außen. Die einzige
öffentliche Zusage ist die Menge der Adressen, und die bleibt unverändert —
festgehalten in FR-002 und geprüft durch den Klickpfad.

### Betroffener Code

```text
apps/web/
├── svelte.config.js          # Adapter gewechselt, Basispfad entfällt
├── package.json              # adapter-static raus, adapter-cloudflare rein
├── wrangler.jsonc            # neu — Name, Assets, Kompatibilitätsdatum
└── src/routes/+layout.ts     # unverändert (bewusst)

.github/workflows/
├── ci.yml                    # Klickpfad; zwei neue Aufgaben hinter der Pruefung
└── pages.yml                 # entfällt

tests/ui/klickpfad.mjs        # Browserwahl über die Umgebung steuerbar
AGENTS.md                     # Vorschau: Vorschau-Adresse statt lokalem Server
README.md                     # neuer Ort, Rückweg, Node-Version
```

## Vorgehen in vier Schritten

**1. Bauen für Cloudflare.** Adapter tauschen, `wrangler.jsonc` anlegen, örtlich
mit `wrangler dev` gegen den gebauten Stand prüfen. Ergebnis: Der Bau erzeugt
etwas, das Cloudflare ausliefern kann — noch ohne jede Veröffentlichung.

**2. Prüfstrecke schärfen.** Klickpfad in die CI, Node-Version vereinheitlichen.
Bewusst **vor** dem ersten Hochladen: Ab hier hält die Prüfung auch das auf, was
wir in den nächsten Schritten falsch machen.

**3. Veröffentlichen und Vorschau.** Die zwei Aufgaben mit `needs: pruefen`
ergänzen, Pages-Workflow löschen. Der Worker steht danach unter
`bucky.<konto>.workers.dev` — und wird dort mit dem Klickpfad abgenommen
(`BASE=…`), was der Klickpfad seit jeher kann.

**4. Umhängen.** Alten DNS-Eintrag entfernen, Custom Domain anlegen, Zertifikat
abwarten, erneut abnehmen. Danach GitHub Pages abschalten (FR-017) und die
Dokumentation nachziehen.

Die Reihenfolge ist so gewählt, dass **bis Schritt 4 nichts Öffentliches
angefasst wird**: Bis dahin liegt der neue Ort neben dem alten, und der alte
liefert weiter aus.

## Risiken und wie sie abgefangen werden

| Risiko | Abfangen |
|---|---|
| Der Umzug ändert unbemerkt einen Rechenwert | SC-001: für einen festen Satz Eingaben alle Werte vorher festhalten und nachher vergleichen. Der Klickpfad prüft 97 davon ohnehin, gegen die **neue** Adresse. |
| Eine Adresse antwortet nur noch über die Startseite | Der Klickpfad ruft jede Seite unmittelbar auf. `trailingSlash = 'always'` bleibt — genau daran lag es bei Feature 043 schon einmal. |
| Gespeicherte Einstellungen gehen verloren | Sie hängen am Ursprung der Adresse. Da `bucky.edsh.de` bleibt, bleiben sie. Wird bei der Abnahme geprüft, nicht angenommen. |
| Alte und neue Dateien vermischen sich | Nach dem Umhängen einmal hart neu laden und abnehmen. Die Dateinamen tragen einen Inhaltsstempel, eine Mischung ist unwahrscheinlich, aber nicht auszuschließen. |
| Vorschau-Adressen im freien Tarif nicht verfügbar | In Schritt 3 früh geprüft. Fällt es aus, bleibt der lokale Weg; die Veröffentlichung hängt nicht daran. |
| Der Zugangsschlüssel kann zu viel | Vorlage „Edit Cloudflare Workers", **ohne** DNS-Recht. Die Domain wird von Hand angehängt. |

## Offene Entscheidung (Nutzer)

**FR-016 ist wörtlich nicht haltbar.** Die Spec verlangt eine Umstellung „ohne
Zeitraum, in dem die Seite unerreichbar ist". Cloudflare nimmt eine Custom
Domain aber nur an, wenn für den Namen **kein** CNAME mehr besteht — der alte
Eintrag auf GitHub Pages muss also zuerst weg. Dazwischen liegen eine kurze
Lücke und die Ausstellung des Zertifikats, zusammen einige Minuten.

Vorschlag: FR-016 auf **„die Lücke ist auf wenige Minuten begrenzt und wird
angekündigt"** ändern, die Umstellung zu einer Zeit machen, zu der niemand
fliegt. Ein wirklich lückenloser Wechsel wäre nur über einen zweiten Namen zu
haben — der Aufwand steht in keinem Verhältnis zu ein paar Minuten bei einer
Vereinsanwendung.

*Diese Änderung ist noch nicht in der Spec vollzogen; sie wartet auf Zustimmung.*
