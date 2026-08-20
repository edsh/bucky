# Von hier nach Claude Code + Spec Kit (v2)

Dieses Paket enthält beides: eine **Design-Referenz** (`README.md` + `design/`) und eine **Feature-Spec im Spec-Kit-Format** (`spec.md`).

**v2 ist ein Delta-Paket:** Übersicht, Tagesuhr-Ring und Detailansicht stehen weiterhin in `docs/design_handoff_reservierung/README.md` (v1). Beide Ordner gehören ins Repo, v2 hat bei Widersprüchen Vorrang.

## 1. Paket ins Repo legen

```bash
unzip design_handoff_reservierung_v2.zip -d <repo>/docs/
# Ziel: docs/design_handoff_reservierung_v2/
```

## 2. Spec Kit initialisieren (nur beim ersten Mal)

```bash
uvx --from git+https://github.com/github/spec-kit.git specify init --here --ai claude
```

```
/speckit.constitution Erstelle die Projektprinzipien für eine mobile Web-App eines
Flugsportvereins: Deutsch als Produktsprache, mobile-first, read-only gegenüber
Vereinsflieger, Zustandsinformation nie nur über Farbe, keine erfundenen
Verfügbarkeitsangaben, Design-Handoff in docs/design_handoff_reservierung_v2 ist
verbindliche visuelle Quelle (v1 gilt für Übersicht und Detailansicht weiter).
```

## 3. Spec übernehmen (empfohlen)

```bash
mkdir -p specs/001-reservierungsuebersicht
cp docs/design_handoff_reservierung_v2/spec.md specs/001-reservierungsuebersicht/spec.md
git checkout -b 001-reservierungsuebersicht
```

Dann in Claude Code:

```
/speckit.clarify
```

Zuerst abarbeiten: **Vereinsflieger-Datenzugriff**, **`frm_apid` pro Maschine** (nur D-EELK = 75132 ist bekannt) und **wer die Warteliste trägt**. Ohne diese drei Antworten ist der Plan Spekulation.

## 4. Planen

```
/speckit.plan Stack: <euer Stack, z. B. React 19 + Vite + TypeScript>.
Visuelle Umsetzung pixelgenau nach docs/design_handoff_reservierung_v2/README.md
(Übersicht, Ring und Detailansicht nach docs/design_handoff_reservierung/README.md).
Der HTML-Prototyp docs/design_handoff_reservierung_v2/design/Reservierung.dc.html ist
Referenz, nicht Vorlage zum Kopieren.
Trenne strikt: (a) reine Zeitlogik — Rasterung, Lücken, Konflikte, Modi, Ausweichsuche,
Deep-Link-Bau, Nacht-Stops, Zeit→Winkel; (b) Gesten-/Scroll-Verhalten des Sheets;
(c) Darstellung. (a) wird vollständig unit-getestet, bevor ein Screen entsteht.
```

## 5. Aufgaben & Umsetzung

```
/speckit.tasks
/speckit.analyze
/speckit.implement
```

## Was beim Nachbau zuerst stimmen muss

1. **Zeitlogik als reine Funktionen** — `luecken(tag)`, `konflikte(fenster)`, `modus(fenster)`, `ausweich(fenster)`, `fensterIn(luecke, minute)`, `nachtStops(sonnenauf, sonnenunter)`, `vfLink(...)`. Tests direkt aus den Acceptance Scenarios 1–16.
2. **Gesten-Regeln** — Kante ↔ Dauer, Block ↔ Verschiebung, Stopp am Tagesrand, Klick-nach-Ziehen unterdrücken. Das war im Prototyp die häufigste Fehlerquelle.
3. **Sichtbarkeit der Auswahl** in den Kachelspalten — Messung relativ zum Scroller (nicht `offsetTop`), Wiederholung im nächsten Frame, Merk-Kennung inkl. Modus.
4. **Zeit→Winkel** für den Ring (aus v1) mit Unit-Tests bei 00:00, 06:00, 11:20, 21:00, 23:59.
5. Erst danach Layout, Detailansicht und Feinschliff.

## Prototyp lokal ansehen

```bash
cd docs/design_handoff_reservierung_v2/design
python3 -m http.server 8000   # http://localhost:8000/Reservierung.dc.html
```

Ein `file://`-Aufruf funktioniert nicht zuverlässig (Assets, Fetch).
