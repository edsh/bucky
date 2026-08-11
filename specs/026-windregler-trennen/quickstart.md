# Quickstart — Windregler trennen prüfen

Feature: [spec.md](./spec.md) · Plan: [plan.md](./plan.md)

Alle Befehle laufen im Wurzelverzeichnis des Repos.

## Voraussetzungen

```bash
npm install
```

## 1 — Der Kern muss unverändert grün bleiben

Dieses Feature ändert am Kern nichts. Die Kerntests sind deshalb hier kein
Nachweis für neue Funktionalität, sondern das Netz, das eine ungewollte Änderung
auffangen soll.

```bash
npx vitest run
```

**Erwartet**: alle Tests grün, insbesondere die Zusicherungen C-02 (Meldungen
kommen wortgleich aus dem Kern) und C-05 (kein Adapter legt Grenzen fest) in
`packages/deelk-poh-core/tests/contract.test.ts`.

## 2 — Typen und Stil

```bash
npm run lint
npm exec --workspace @edsh-bucky/web -- svelte-kit sync
npm run check --workspace @edsh-bucky/web
```

**Erwartet**: ESLint ohne Befund, `svelte-check` mit 0 Fehlern und 0 Warnungen.
Der neue `$bindable`-Prop an `TakeoffDistance.svelte` muss typisiert sein —
`svelte-check` ist die Stelle, an der ein fehlender Typ auffällt, Vitest nicht.

## 3 — Klickpfad im echten Browser

```bash
npm run build
python3 -m http.server 8899 --directory apps/web/build &
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --no-save playwright
node tests/ui/klickpfad.mjs
```

Danach den Server beenden (`kill <PID>`).

**Erwartet**: alle Prüfungen grün, darunter die angepassten und neuen:

- Das obere Fieldset heißt „Platzhöhe" und enthält genau einen Regler.
- Es gibt acht Regler; `#pistenwind` reicht von −10 bis 50, `#streckenwind` von
  −50 bis 50, beide in ganzen Knoten.
- „Pistenwind (kt, positiv = Gegenwind)" steht im Bereich „Roll- und
  Startstrecke".
- „Streckenwindkomponente (kt, positiv = Gegenwind)" steht im Bereich
  „Kraftstoffbedarf und Geschwindigkeiten".
- Der Pistenwindregler an seinem unteren Ende steht auf −10 kt und die
  Startstrecke wird dort noch ausgewiesen.

## 4 — Die Trennung von Hand nachvollziehen

Der eigentliche Nachweis des Features (SC-002) lässt sich in einer halben Minute
im Browser führen:

```bash
npm run dev
```

1. Startstrecke und Kraftstoffbedarf notieren.
2. **Nur** den Pistenwind verstellen. → Die Startstrecke ändert sich, der
   Kraftstoffbedarf steht unverändert da.
3. Den Pistenwind zurückstellen, **nur** die Streckenwindkomponente verstellen.
   → Kraftstoffbedarf und Reisezeit ändern sich, die Startstrecke steht.

Schlägt einer der beiden Schritte fehl, speist noch irgendwo ein Wert beide
Rechnungen — genau der Zustand, den dieses Feature beseitigt.

## 5 — Gegenprobe auf unveränderte Zahlen (SC-003)

Beide Regler auf denselben Wert stellen (etwa 10 kt, den Anfangswert) und die
Ergebnisse mit dem Stand vor der Umstellung vergleichen — am einfachsten gegen
die veröffentlichte Seite <https://edsh.github.io/bucky/>, solange dort noch der
alte Stand liegt.

**Erwartet**: identische Zahlen. Weicht etwas ab, ist unterwegs eine Umrechnung
entstanden, die es nicht geben darf (FR-010).
