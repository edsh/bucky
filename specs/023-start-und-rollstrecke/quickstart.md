# Quickstart: Roll- und Startstrecke prüfen

Alle Befehle laufen im Wurzelverzeichnis des Repositorys.

## Voraussetzungen

```bash
npm install
```

## 1. Kern: stimmen die Zahlen mit der Tabelle überein?

```bash
npx vitest run packages/deelk-poh-core/tests/takeoff/takeoffDistance.test.ts
```

**Erwartet**: An jeder der **77 Stützstellen** stimmen `tableGroundRollM` und
`tableOverObstacleM` bei Windstille auf befestigter, trockener Bahn exakt mit
der Tabellenzeile überein (SC-001). Der Test liest die Sollwerte aus
`data/poh/d-eelk/tables/5b-takeoff-distance-m-1043kg.json`, nicht aus einer
abgeschriebenen Liste.

## 2. Handprobe an einer Stützstelle

Platzhöhe 0 ft bei QNH 1013,25 hPa ergibt genau 0 ft Druckhöhe. Damit die
Umgebungstemperatur auf 20 °C fällt, ist die ISA-Abweichung +5 °C.

| Größe | Erwartet |
|---|---|
| Startlauf | 204 m |
| über 15 m Hindernis | 319 m |

Das sind die gedruckten Werte der Tabelle — hier wird nicht interpoliert.

## 3. Handprobe mit Zuschlägen

Dieselbe Stützstelle, jeweils einzeln geprüft:

| Fall | Startlauf | über Hindernis | Rechnung |
|---|---|---|---|
| 9 kt Gegenwind | 183,6 m | 287,1 m | −10 % auf beide Werte |
| 6 kt Rückenwind | 265,2 m | 414,7 m | +30 %, weil 10 % je 2 kt |
| trockene Grasbahn | 234,6 m | 349,6 m | +15 % von 204 = 30,6 m auf **beide** |
| Grasbahn und feucht | 275,4 m | 390,4 m | 35 % von 204 = 71,4 m, **nicht** 1,15 × 1,20 |

Der letzte Fall ist der wichtigste: Additiv ergibt sich 275,4 m, multiplikativ
wären es 281,5 m. Wer hier multipliziert, weicht von der Anmerkung des
Handbuchs ab.

## 4. Handprobe mit Interpolation über beide Achsen

EDSH liegt auf 971 ft. Bei QNH 1013,25 hPa und ISA ± 0 ergibt sich eine
Umgebungstemperatur von 13,1 °C — beide Achsen liegen also zwischen
Stützstellen.

| Fall | Startlauf | über Hindernis |
|---|---|---|
| befestigte, trockene Bahn | 207,2 m | 324,8 m |
| Grasbahn (so wie EDSH wirklich ist) | 238,3 m | 355,8 m |
| Grasbahn bei ISA + 20 (→ 33,1 °C) | 275,5 m | 411,6 m |

Die Bahn in EDSH ist 500 m lang. Im letzten Fall bleiben 88 m — das ist der
Grund, warum diese Rechnung dort gebraucht wird.

Der Schritt `takeoff-table-lookup` muss in diesen Fällen **vier** `anchors`
tragen: 0 ft und 1000 ft, jeweils bei 10 °C und 20 °C.

## 5. Randfälle

```bash
npx vitest run packages/deelk-poh-core/tests/takeoff/ packages/deelk-poh-core/tests/atmosphere/
```

**Erwartet**:

- 12 000 ft Platzhöhe wird abgelehnt; die Meldung nennt Platzhöhe, QNH und die
  Grenze von 10 000 ft (SC-005).
- ISA + 40 auf Meereshöhe ergibt 55 °C und wird abgelehnt; die Meldung nennt
  **beide** Ursachen, nicht nur die Temperatur.
- 15 kt Rückenwind wird abgelehnt, mit Verweis auf die Grenze in Anmerkung 2.
- 50 kt Gegenwind wird **nicht** abgelehnt: Geradlinig ergäben sich 55,6 %,
  die Gutschrift bleibt aber bei 50 % stehen und `windAdjustmentCapped` ist
  gesetzt.
- Es entsteht nie ein Ergebnis außerhalb des Rasters.

## 6. Interpolation über zwei Achsen

```bash
npx vitest run packages/deelk-poh-core/tests/interpolate.test.ts
```

**Erwartet**: `interpolateGrid` gibt an jeder Stützstelle den gedruckten Wert
zurück, liefert je nach Lage einen, zwei oder vier `anchors`, und wirft
außerhalb des Rasters statt zu extrapolieren. Das nicht gleichabständige
Temperaturraster (−20, 0, 10, …) wird richtig eingeklammert.

## 7. Gesamtprobe: beide Wege liefern dieselbe Zahl

```bash
npx vitest run apps/mcp/tests/
```

**Erwartet**: Das MCP-Werkzeug `computeTakeoffDistance` gibt zu denselben
Eingaben dieselben Werte aus wie der unmittelbare Kernaufruf (SC-007),
einschließlich Quellenangabe und Prüfhinweis.

## 8. Oberfläche

```bash
npm run build
python3 -m http.server 8899 --directory apps/web/build &
node tests/ui/klickpfad.mjs
```

**Erwartet**: Alle Prüfungen bestehen, darunter die neuen:

- Die Überschrift „Start und Streckenflug" steht über dem Fieldset, das jetzt
  „Platzhöhe und Windkomponente" heißt und genau diese beiden Felder enthält
  (FR-012, FR-013).
- „Streckenlänge" steht im Bereich „Kraftstoffbedarf und Geschwindigkeiten"
  (FR-014).
- Die Schnellwahl „EDSH" setzt Platzhöhe **und** den Schalter für trockene
  Grasbahn; ein späteres Verstellen der Platzhöhe lässt den Schalter stehen
  (FR-023).
- Die vier Anmerkungen stehen im Wortlaut mit Seitenangabe 5b-2 im Bereich
  (FR-016), ebenso die angewandte Windrechnung (FR-017).
- Bei 15 kt Rückenwind zeigt die Startstrecke eine Meldung, der
  Kraftstoffbedarf weiter sein Ergebnis (FR-020).

## 9. Spaltenaufbau von Hand prüfen

Der Klickpfad prüft die Zahlen, nicht den Eindruck. Der Aufbau wird in den
Entwicklerwerkzeugen des Browsers mit drei Ansichten geprüft:

| Ansicht | Erwartet |
|---|---|
| 390 × 844 (Telefon hoch) | einspaltig, Startstrecke oben, kein waagerechtes Scrollen (SC-006) |
| 844 × 390 (Telefon quer) | zweispaltig |
| 1024 × 1366 (iPad Pro hoch) | **einspaltig** — der Fall, an dem eine reine Breitenabfrage scheitern würde |

## 10. Vollständige Prüfung vor dem Abschluss

```bash
npm run lint
npx tsc -p packages/deelk-poh-core/tsconfig.json
npx tsc -p apps/mcp/tsconfig.json
npm exec --workspace @edsh-bucky/web -- svelte-kit sync && npm run check --workspace @edsh-bucky/web
npm test
npm run build
node tests/ui/klickpfad.mjs
python3 tools/poh/verify_d_eelk.py ~/Downloads/FHB-C-172N-P-2-7.pdf
```

Die letzte Prüfung muss unverändert 2619 Prüfungen ohne Abweichung melden —
dieses Feature ändert keine Tabellendaten, es nutzt nur eine bereits
digitalisierte Tabelle.
