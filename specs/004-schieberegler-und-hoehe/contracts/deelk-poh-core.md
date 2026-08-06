# Contract: Erweiterung von `@edsh-bucky/deelk-poh-core`

Ergänzt den Vertrag aus
[Feature 001](../../001-kraftstoffrechner-d-eelk/contracts/deelk-poh-core.md).
Nur Abweichungen und Neuzugänge sind hier aufgeführt; alles Übrige gilt
unverändert.

## Neue Funktion

### `toPressureAltitude(elevationFt: number, qnhHpa: number): PressureAltitudeResult`

Rechnet eine Höhe über dem Meeresspiegel bei gegebenem Luftdruck in die
Druckhöhe um.

- **Deterministisch** und frei von Plattformbezügen, wie der gesamte Kern
  (C-01).
- **Exakt bei Standarddruck**: Für `qnhHpa === 1013.25` gilt
  `pressureAltitudeFt === elevationFt`. Diese Zusicherung ist nur haltbar, wenn
  der zweite Exponent als Kehrwert des ersten gerechnet wird und nicht als
  gerundeter Literalwert (siehe research.md, Punkt 1).
- **Monoton**: Steigt `qnhHpa`, sinkt `pressureAltitudeFt`. Steigt
  `elevationFt`, steigt `pressureAltitudeFt`.
- **Prüft den Tabellenbereich nicht.** Die Funktion rechnet; ob das Ergebnis
  verwendbar ist, entscheidet `computeFuelPlan`. So bleibt sie auch für
  Anzeigezwecke brauchbar.
- **Rundet nicht** (C-03). Die Rundung auf ganze Fuß geschieht erst in
  `format.ts`.

## Geänderte Funktionen

### `computeFuelPlan(input: FlightPlanInput): FuelPlanResult`

- `FlightPlanInput` trägt statt der beiden Druckhöhen nun
  `departureElevationFt`, `cruiseAltitudeAmslFt` und `qnhHpa`.
- Die Berechnung beginnt mit den beiden Umrechnungsschritten; `result.steps`
  enthält sie an erster Stelle.
- **Wirft** `PohCalculationError` mit der Art
  `PRESSURE_ALTITUDE_OUT_OF_RANGE`, wenn eine errechnete Druckhöhe außerhalb
  des von den anwendbaren Tabellen abgedeckten Bereichs liegt. Die
  Fehlerdetails nennen die errechnete Druckhöhe, die überschrittene Grenze
  sowie Höhe und QNH, aus denen sie entstand.
- **Begrenzt nicht** auf die nächste Stützstelle und **extrapoliert nicht**
  (FR-006, FR-006a).

### `getFuelPlanInputDomain(): InputDomain`

- Liefert `departureElevationFt`, `cruiseAltitudeAmslFt` und `qnhHpa` statt der
  beiden Druckhöhenbereiche.
- Jeder `NumericRange` trägt jetzt `step`. Adapter DÜRFEN keine eigene
  Schrittweite wählen.
- `distanceNm` hat eine endliche obere Grenze.

## Geänderter Typ

### `SourceReference`

Wird zur unterschiedenen Vereinigung aus `PohSourceReference` (`kind: 'poh'`)
und `StandardSourceReference` (`kind: 'standard'`). Beide tragen `citation`.

**Zusicherung**: Der Prüfhinweis `result.preflightCheckNotice` bezieht sich
ausschließlich auf Referenzen mit `kind: 'poh'`. Ein Adapter, der den Hinweis
neben einer Norm-Referenz anzeigt, verletzt diesen Vertrag.

## Neue Zusicherungen für Adapter

| Kennung | Zusicherung |
|---|---|
| C-04 | Kein Adapter enthält eine eigene Umrechnung zwischen Höhe und Druckhöhe. Die Faustformel 30 ft/hPa darf nirgends als Rechenweg auftauchen, nur als benannter Vergleichswert aus dem Kern. |
| C-05 | Kein Adapter legt Grenzen oder Schrittweiten seiner Eingabefelder selbst fest; sie stammen ausschließlich aus `getFuelPlanInputDomain()`. |

Beide sind wie C-01 und C-03 am Quelltext prüfbar und gehören in
`tests/contract.test.ts`.
