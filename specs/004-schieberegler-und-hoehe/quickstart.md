# Quickstart — Prüfung von Feature 004

**Feature**: Schieberegler und Höhe ASL statt Druckhöhe

Diese Anleitung prüft, ob das Feature tut, was die Spec verlangt. Sie ersetzt
die Prüfungen aus Feature 001 nicht, sondern ergänzt sie.

## Voraussetzungen

Node 22 oder neuer, Abhängigkeiten installiert (`npm ci`).

## Automatische Prüfungen

```bash
npm test
npm run lint
npm run build
```

Erwartet: alle Tests grün, keine Beanstandungen, Bau erfolgreich.

## 1. Die Umrechnung ist bei Standarddruck exakt

```bash
npm test -- pressureAltitude
```

**Erwartet**: Für QNH 1013,25 hPa liefert jede Höhe sich selbst als Druckhöhe —
auf ganze Fuß genau, ohne Rundungsrest (SC-002). Der Test prüft mehrere Höhen,
darunter 18 000 ft, weil sich dort ein gerundeter Exponent bemerkbar machen
würde.

## 2. Der Rechenweg zeigt die Umrechnung

Die Oberfläche starten:

```bash
npm run dev --workspace @edsh-bucky/web
```

Platzhöhe 85 ft, Reiseflughöhe 6000 ft, QNH 983 hPa einstellen.

**Erwartet**:

- Beide Druckhöhen stehen unmittelbar unter dem jeweiligen Regler, mit „≙" als
  Zeichen, und liegen über den eingestellten Höhen (rund 921 ft und 6802 ft).
- Der Rechenweg beginnt mit zwei Schritten für die Umrechnung, jeweils mit
  Formel und eingesetzten Werten (FR-008).
- Diese Schritte tragen die Norm-Referenz, nicht den POH-Prüfhinweis.

## 3. Hochdruck führt zur Ablehnung

Platzhöhe 85 ft, QNH 1030 hPa.

**Erwartet**: Kein Ergebnis. Die Meldung nennt die errechnete Druckhöhe
(−369 ft), die untere Grenze der Tabellen (0 ft) sowie Höhe und QNH als
Ursache (FR-006, SC-006).

**Warum das richtig ist**: Ein Anheben auf 0 ft würde weniger Kraftstoff
ausweisen, als der Flug braucht — die Steigflugtabelle ist ab 0 ft kumulativ
(siehe research.md, Punkt 3). Wer diese Meldung für unbequem hält, sollte den
Absatz dort lesen, bevor er sie entfernt.

## 4. Niedrigdruck an der oberen Grenze

Reiseflughöhe 18 000 ft, QNH 950 hPa.

**Erwartet**: Ablehnung mit derselben Meldungsart; die errechnete Druckhöhe
liegt bei rund 19 553 ft, die obere Grenze bei 18 000 ft.

## 5. Die Regler kennen keine eigenen Grenzen

```bash
npm test -- contract
```

**Erwartet**: Die Prüfungen C-04 und C-05 bestehen — kein Adapter enthält eine
eigene Umrechnung oder eigene Grenzen und Schrittweiten.

## 6. Anordnung und Bedienung

```bash
npm run build
python3 -m http.server 8899 --directory apps/web/build &
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --no-save playwright
node tests/ui/klickpfad.mjs
```

**Erwartet**: Alle Prüfungen bestehen, darunter die neuen für dieses Feature —
Regler in mehreren Spalten ab 1024 px, eine Spalte und kein waagerechtes
Scrollen bei 390 px, Wertanzeige folgt dem Regler, Bedienung per Tastatur.

Anschließend den Server beenden.

## 7. Gleichheit über die Zugangswege

```bash
npm test -- parity
```

**Erwartet**: Dieselbe Eingabe liefert über Weboberfläche und MCP-Adapter
dieselben Zahlen, einschließlich der Druckhöhen (Prinzip IV).

## Vor der Freigabe

- Eine Druckhöhe von Hand nach der Formel nachrechnen und mit der Anzeige
  vergleichen — mindestens einmal bei einem QNH abseits von 1013,25.
- Prüfen, dass der POH-Prüfhinweis nirgends neben einer Norm-Referenz steht.
  Er wäre dort falsch: gegen das Handbuch lässt sich eine Druckhöhe nicht
  prüfen.
