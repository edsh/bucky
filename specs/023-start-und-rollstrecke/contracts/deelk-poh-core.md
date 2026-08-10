# Vertrag: `@edsh-bucky/deelk-poh-core`

Was das Paket nach diesem Feature zusätzlich nach außen anbietet. Bestehende
Ausfuhren bleiben unverändert.

## `computeTakeoffDistance(input): TakeoffDistanceResult`

Schlägt Startlauf und Strecke über das 15 m hohe Hindernis in Abb. 5-1a nach
und wendet die Anmerkungen 2 bis 4 an.

**Eingabe** (`TakeoffDistanceInput`, siehe [data-model.md](../data-model.md)):
Druckhöhe und Umgebungstemperatur als fertige Ergebnisobjekte, Windkomponente
in kt, zwei Schalter für den Bahnzustand.

**Zusicherungen**

- Es wird **nicht** extrapoliert. Außerhalb des Rasters wird geworfen.
- Es wird **nicht** gerundet. Alle Zahlen im Ergebnis sind ungerundet.
- Der Zuschlag nach den Anmerkungen 3 und 4 ist **additiv**: 15 % + 20 % = 35 %.
- Beide Zuschläge werden in Metern ermittelt und auf **beide** Strecken
  aufgeschlagen.
- `source` nennt Abb. 5-1a mit den Seiten 5b-2 und 5b-3;
  `preflightCheckNotice` ist gesetzt.
- Die vier Anmerkungen und die Bedingungen kommen im **Wortlaut** aus der
  Tabellendatei, nicht aus dem Code.

**Fehler** (`PohCalculationError`), in dieser Reihenfolge geprüft:

| Anlass | `kind` | Was die Meldung nennt |
|---|---|---|
| Eingabe nicht als Zahl deutbar | `INVALID_INPUT` | Feld und beanstandeter Wert |
| Druckhöhe außerhalb 0 – 10 000 ft | `PRESSURE_ALTITUDE_OUT_OF_RANGE` | Platzhöhe, QNH, errechnete Druckhöhe, Bereich |
| Temperatur außerhalb −20 – 50 °C | `OUT_OF_RANGE` | errechnete Temperatur, Bereich, **beide** Ursachen |
| Rückenwind über 10 kt | `OUT_OF_RANGE` | Windkomponente und die Grenze aus Anmerkung 2 |

Gegenwind wird nie abgelehnt; die Gutschrift ist bei 50 % gedeckelt und
`windAdjustmentCapped` zeigt an, dass der Deckel greift.

## `toOutsideAirTemperature(pressureAltitudeFt, isaDeviationC)`

Liefert `OutsideAirTemperatureResult`. Prüft den Tabellenbereich **nicht** —
das entscheidet `computeTakeoffDistance`. So bleibt die Funktion auch für die
reine Anzeige brauchbar. Rundet nicht. Dasselbe Muster wie
`toPressureAltitude`.

Bezugsgröße ist die Druckhöhe. Quelle ist `ICAO_STANDARD_ATMOSPHERE_SOURCE`
mit `kind: 'standard'`.

## `interpolateGrid(query): GridInterpolationResult`

Bilineare Interpolation über zwei Achsen einer POH-Tabelle. Erbt das Verhalten
von `interpolate`: kein Extrapolieren, `outOfRange` am Rand,
`UNSUPPORTED_COMBINATION` bei leerer Auswahl.

Liefert bis zu vier `anchors`; jeder trägt **beide** Achsenwerte in `at`. Bei
exaktem Treffer einer Achse sind es zwei, bei beiden einer.

## `TAKEOFF_INPUT_DOMAIN`

Die Wertebereiche der Startstreckentabelle. Steht **neben** `INPUT_DOMAIN` und
verengt dieses nicht: Der Kraftstoffbedarf bleibt über den gesamten bisherigen
Bereich rechenbar.

## `formatMetres(value): string`

Ganze Meter mit geschütztem Leerzeichen vor der Einheit, wie die übrigen
`format*`-Funktionen.

## Neue Zusicherung C-07

Kein Adapter greift auf die Spaltennamen `ground_roll` oder `over_obstacle` zu,
und keiner enthält 15, 20 oder 35 als Prozentsatz eines Zuschlags. Die Prüfung
liest den Quelltext von `apps/web/src` und `apps/mcp/src` — dieselbe Machart wie
C-04 und C-06.

Der Grund ist Prinzip I: Ein Adapter, der die Zuschläge kennt, kann sie
irgendwann anders anwenden als der Kern. Zwei verschiedene Zahlen für dieselbe
Startstrecke sind das, was hier nie entstehen darf.
