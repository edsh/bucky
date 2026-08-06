# Quickstart: Reiseleistungs-Übersicht prüfen

Alle Befehle laufen im Wurzelverzeichnis des Repositorys.

## Voraussetzungen

```bash
npm install
```

## 1. Kern: stimmen die Zahlen mit der Tabelle überein?

```bash
npx vitest run packages/deelk-poh-core/tests/fuel/cruiseCapability.test.ts
```

**Erwartet**: Für jede Stützstelle der Tabelle und jede dort geführte
Lasteinstellung stimmen `tableKtas`, `fuelFlowLph`, `fuelFlowUsGph`,
`tableRangeNm` und `enduranceH` bei `isaDeviationC: 0` exakt mit der
Tabellenzeile überein (SC-002). Der Test liest die Sollwerte aus der
JSON-Datei, nicht aus einer abgeschriebenen Liste.

## 2. Handprobe an einer Stützstelle

Reiseflughöhe 6000 ft bei QNH 1013,25 hPa ergibt genau 6000 ft Druckhöhe.
Lasteinstellung 70 %, ISA-Abweichung 0:

| Größe | Erwartet |
|---|---|
| Eigengeschwindigkeit | 116 kt |
| Verbrauch je Stunde | 22,1 l/h (5,8 US gal/h) |
| Maximale Strecke | 546,0 NM |
| Flugdauer | 4 h 30 min |

Bei ISA-Abweichung +20 °C:

| Größe | Erwartet | Warum |
|---|---|---|
| Eigengeschwindigkeit | 118 kt | 116 × 1,02 = 118,32 |
| Maximale Strecke | 556,9 NM | 546 × 1,02 |
| Flugdauer | 4 h 30 min | unverändert (FR-003) |

## 3. Unabhängigkeit von Strecke und Wind

```bash
npx vitest run packages/deelk-poh-core/tests/contract.test.ts
```

**Erwartet**: Die Prüfung variiert `distanceNm`, `windComponentKt` und
`departureElevationFt` über ihren gesamten zulässigen Bereich und stellt fest,
dass sich kein Feld von `cruiseCapability` ändert (FR-009, SC-003).

## 4. Randfälle

```bash
npx vitest run packages/deelk-poh-core/tests/fuel/
```

**Erwartet**:

- Lasteinstellung 100 % bei 12 000 ft Druckhöhe wird abgelehnt; die Meldung
  nennt die dort verfügbaren Werte (SC-006).
- Reiseflughöhe 0 ft bei QNH 1030 hPa wird abgelehnt, weil die Druckhöhe unter
  den Tabellenrand fällt.
- Es entsteht nie ein Ergebnis außerhalb des Rasters (SC-007).

## 5. Gesamtprobe: beide Wege liefern dieselbe Zahl

```bash
npx vitest run apps/mcp/tests/parity.test.ts
```

**Erwartet**: `computeFuelPlan(...).cruiseCapability` ist feldgleich mit dem
unmittelbaren Aufruf von `computeCruiseCapability(...)`.

## 6. Oberfläche

```bash
npm run build
npx http-server apps/web/build -p 8899 &   # oder ein anderer statischer Server
node tests/ui/klickpfad.mjs
```

**Erwartet**: Alle Prüfungen bestehen, darunter die neuen:

- Die Übersicht steht zwischen den beiden Eingabegruppen (FR-008).
- Sie zeigt vier Werte und trägt den Hinweis zu Motorstart, Steigflug, Reserve
  und Windstille (SC-004).
- Das Verstellen von Streckenlänge und Windkomponente lässt sie unverändert
  (SC-003).
- Der Hinweis, dass die Bedarfssumme keine Reserve enthält, steht weiterhin
  beim Bedarf (SC-005).
- Eine unzulässige Kombination zeigt die Meldung des Kerns statt Werten.

## 7. Vollständige Prüfung vor dem Abschluss

```bash
npx vitest run
npx tsc --noEmit -p packages/deelk-poh-core
npx tsc --noEmit -p apps/mcp
npx eslint .
npm run check --workspace @edsh-bucky/web
npm run build
node tests/ui/klickpfad.mjs
python3 tools/poh/verify_d_eelk.py ~/Downloads/FHB-C-172N-P-2-7.pdf
```

Die letzte Prüfung muss unverändert 2619 Prüfungen ohne Abweichung melden —
dieses Feature ändert keine Tabellendaten.
