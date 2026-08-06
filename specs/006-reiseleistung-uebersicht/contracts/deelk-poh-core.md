# Contract: Erweiterung von `@edsh-bucky/deelk-poh-core`

Ergänzt die Verträge aus
[Feature 001](../../001-kraftstoffrechner-d-eelk/contracts/deelk-poh-core.md)
und [Feature 004](../../004-schieberegler-und-hoehe/contracts/deelk-poh-core.md).
Nur Neuzugänge und Abweichungen sind hier aufgeführt.

## Neue Funktion

### `computeCruiseCapability(input: unknown): CruiseCapability`

Schlägt die Reiseleistung zu den Bedingungen des Reiseflugs nach.

**Nimmt entgegen**: `cruiseAltitudeAmslFt`, `qnhHpa`, `powerSettingPct`,
`isaDeviationC`. Weitere Felder werden ignoriert, damit ein Adapter dasselbe
Objekt an `computeFuelPlan` und an diese Funktion reichen kann.

**Sichert zu**:

- **Unabhängig von Strecke und Wind.** Weder `distanceNm` noch
  `windComponentKt` noch `departureElevationFt` beeinflussen ein einziges Feld
  des Ergebnisses (FR-009). Mechanisch geprüft in `contract.test.ts`.
- **Nur nachgeschlagen, nie gebildet.** `tableRangeNm` und `enduranceH`
  stammen aus den Spalten `range_nm` und `endurance_h`. Sie werden **nicht**
  aus `ktas`, `fuelFlowLph` oder der ausfliegbaren Menge errechnet (FR-001).
- **Exakt an den Stützstellen.** Für eine Druckhöhe, die auf einer Stützstelle
  liegt, und eine geführte Lasteinstellung gilt bei `isaDeviationC <= 0`:
  `tableKtas`, `fuelFlowLph`, `fuelFlowUsGph`, `tableRangeNm` und `enduranceH`
  entsprechen der Tabellenzeile ohne jede Abweichung.
- **Interpoliert nur entlang der Druckhöhe.** Die Lasteinstellung wird exakt
  gefiltert; zwischen zwei Lasteinstellungen wird nicht interpoliert (FR-002).
- **Extrapoliert nicht.** Außerhalb des Tabellenrasters wird geworfen.
- **Korrigiert nur die Strecke, nie die Dauer.** `maxRangeNm` ist
  `tableRangeNm × temperatureFactor`; `enduranceH` bleibt unverändert (FR-003).
  Der Faktor ist derselbe wie für die Eigengeschwindigkeit und ist 1 bei
  `isaDeviationC <= 0`.
- **Rundet nicht** (C-03).
- **Führt den Wortlaut des Handbuchs mit.** `inclusionsNote` ist Anmerkung 2 der
  Tabelle, `windlessNote` die Bedingung „Windstille" — beide unverändert aus der
  Digitalisierung, nicht neu formuliert (FR-006).
- **Wirft dieselben Fehler wie die Bedarfsrechnung**, wo es um dieselbe Frage
  geht: Bereichsprüfung, Druckhöhe außerhalb des Rasters, Lasteinstellung in
  dieser Höhe nicht geführt. Die Meldungen entstehen aus denselben Funktionen
  (`checkPressureAltitude`, `checkPowerSetting`).

**Wirft nicht**, wo die Bedarfsrechnung wirft: kein Fehler wegen Gegenwind,
Steigflugstrecke oder Streckenlänge — diese Größen kennt die Funktion nicht.

## Geänderte Funktion

### `computeFuelPlan(input: unknown): FuelPlanResult`

- Neues Feld `cruiseCapability` mit dem Ergebnis von
  `computeCruiseCapability`, gebildet aus denselben Eingaben.
- **Zusicherung**: `result.cruiseCapability` ist feldgleich mit dem, was ein
  unmittelbarer Aufruf von `computeCruiseCapability` mit denselben vier
  Eingaben liefert. Zwei Wege, eine Zahl (Prinzip IV).
- Die Schritte der Übersicht erscheinen im Rechenweg. Der bestehende Schritt
  `cruise.tableLookup` behält seine Aussage, verweist im Erklärtext aber auf
  den neuen Schritt, damit der Ausschluss von Reichweite und Flugdauer aus der
  **Bedarfsrechnung** nicht als Widerspruch zur Übersicht gelesen wird.
- Alle bisherigen Zahlen bleiben unverändert. Kein bestehender Rechenschritt
  ändert sein Ergebnis.

## Neu ausgeführte Funktionen

`checkPressureAltitude` und `checkPowerSetting` aus `fuel/input.ts` werden
exportiert, damit beide Wege dieselbe Regel anwenden. Sie bleiben im Verhalten
unverändert.

## Neue Zusicherung im Vertragstest

- **C-06**: Kein Adapter enthält die Spaltennamen `range_nm` oder
  `endurance_h`, und keiner bildet eine Strecke aus Geschwindigkeit mal Zeit.
  Beides gehört in den Kern; die Tabelle weicht von der Multiplikation ab
  (research.md, Entscheidung 1).
