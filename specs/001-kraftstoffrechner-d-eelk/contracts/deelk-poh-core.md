# Contract: `@edsh-bucky/deelk-poh-core`

Die öffentliche Schnittstelle des Berechnungskerns der D-EELK. Beide Adapter
(`apps/web`, `apps/mcp`) dürfen ausschließlich diese Schnittstelle verwenden und
keine eigene Rechen-, Rundungs- oder Formulierungslogik enthalten
(Constitution-Prinzip IV).

Das Paket deckt perspektivisch alle POH-Berechnungen der D-EELK ab; dieses Feature
liefert den Kraftstoffteil unter `src/fuel/`. Typdetails stehen in
[../data-model.md](../data-model.md) und werden hier nicht wiederholt.

## Exportierte Funktionen

### `computeFuelPlan(input: FlightPlanInput): FuelPlanResult`

Berechnet den Kraftstoffbedarf eines Flugvorhabens.

- **Deterministisch**: Gleiche Eingabe liefert bitgleich dasselbe Ergebnis. Keine
  Zufallswerte, keine Uhrzeit, keine Ortszeitabhängigkeit, keine Netzzugriffe.
- **Wirft** `PohCalculationError`, wenn die Eingabe ungültig ist oder die Rechnung
  den Wertebereich der Tabellen verlassen würde. Gibt in keinem Fall einen
  extrapolierten Wert zurück (FR-007).
- **Jeder** Eintrag in `result.steps`, der einen Tabellenwert verwendet, trägt
  mindestens einen `TableAnchor` und dessen `SourceReference` (FR-005).
- `result.preflightCheckNotice` ist immer gesetzt und nicht leer (FR-006).

### `validateFlightPlan(input: unknown): FlightPlanInput`

Prüft und normalisiert eine Eingabe, ohne zu rechnen. Wirft `PohCalculationError`
mit der Art `INVALID_INPUT`, `OUT_OF_RANGE` oder `UNSUPPORTED_COMBINATION`.

Existiert, damit die Oberfläche schon während der Eingabe zurückmelden kann, ohne
die Validierungsregeln zu duplizieren.

### `getFuelPlanInputDomain(): InputDomain`

Liefert die aus den Tabellen abgeleiteten zulässigen Wertebereiche: Höhenraster,
verfügbare Lasteinstellungen je Höhenbereich sowie die zulässigen Bereiche für
Strecke, ISA-Abweichung und Windkomponente.

Existiert, damit Eingabemaske und MCP-Werkzeugbeschreibung ihre Auswahllisten aus
den Daten ableiten statt sie fest zu verdrahten.

### `listTables(): TableSummary[]`

Liefert den Katalog der digitalisierten Tabellen mit ihren Quellenreferenzen und
etwaigen `source_anomalies`. Für eine Übersichtsseite und für die
Nachvollziehbarkeit.

## Zusicherungen

- **C-01**: Der Kern importiert nichts aus SvelteKit, dem MCP-SDK, `node:fs` oder
  dem DOM. Er ist in Browser und Node gleichermaßen lauffähig.
- **C-02**: Der Kern erzeugt keine Texte für Layoutzwecke, wohl aber die fachlichen
  Texte, die über beide Zugangswege identisch sein müssen: Prüfhinweis,
  Quellenangaben, Fehlermeldungen und Hinweise.
- **C-03**: Die Rundung auf Anzeigegenauigkeit passiert genau einmal, im Kern.
  Adapter runden nicht nach.
- **C-04**: Die Tabellendaten werden zur Bauzeit eingebunden. Der Kern liest zur
  Laufzeit keine Dateien und stellt keine Netzanfragen.
- **C-05**: Ändert sich eine Datendatei, ändert sich das Ergebnis — die Tests des
  Kerns enthalten daher mindestens einen Fall mit von Hand aus dem Handbuch
  entnommenen Sollwerten.
