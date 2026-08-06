# Phase 0 — Untersuchung: Reiseleistungs-Übersicht

## Die Datengrundlage

**Tabelle**: `data/poh/d-eelk/tables/5b-cruise-standard-1043kg.json`
(Abb. 5-4a, „Reiseleistung, Reichweite und Flugdauer mit Standardtanks,
Fluggewicht 1043 kg (2300 lbs)", POH-Seiten 5b-14 bis 5b-16, 53 Zeilen).

**Spalten**: `pressure_altitude_ft`, `power_setting_pct`, `ktas`, `mph`,
`fuel_flow_lph`, `fuel_flow_usgph`, `range_nm`, `endurance_h`.

Die letzten beiden werden bisher nirgends gelesen.

**Bedingungen**: Fluggewicht 1043 kg, Klappen eingefahren, **Windstille**.

**Anmerkungen** (wörtlich aus der digitalisierten Tabelle):

1. „Flugdauerangaben basieren auf Standardtank mit 127,4 l (33,6 US gal)
   ausfliegbarem Kraftstoff."
2. „Die Tabelle berücksichtigt 4 l für Motorstart und Rollen, Zeit, Kraftstoff
   und Strecke für den Steigflug sowie 45 min. Reserve."
3. „Je 10 °C über ISA Temperatur erhöhen sich die wahre Fluggeschwindigkeit
   (KTAS) und die maximale Reichweite (NM) um 1 %."
4. „Für Reiseflug Lasteinstellung über 75 % wird nicht empfohlen. …"

## Entscheidung 1: Nachschlagen statt Ableiten

**Entschieden**: `range_nm` und `endurance_h` werden aus der Tabelle
interpoliert.

**Begründung**: Sie lassen sich nicht aus den übrigen Spalten reproduzieren.

| Druckhöhe | Last | KTAS | Dauer | KTAS × Dauer | Tabelle |
|---|---|---|---|---|---|
| 0 ft | 100 % | 125 | 2,9 h | 362,5 NM | **365 NM** |
| 0 ft | 70 % | 110 | 4,8 h | 528,0 NM | **530 NM** |
| 6000 ft | 70 % | 116 | 4,5 h | 522,0 NM | **546 NM** |

Die Abweichung wächst mit der Höhe, weil die Reichweite die im Steigflug
zurückgelegte Strecke enthält, die Flugdauer aber gerundet ist. Eine eigene
Rechnung würde also systematisch **zu wenig** ausweisen — die falsche Richtung.
Prinzip I lässt hier ohnehin nur den Tabellenwert zu.

**Verworfen**: Reichweite als `ktas × endurance_h` bilden. Bequem, aber weder
belegt noch richtig.

**Ebenfalls verworfen**: die Reichweite aus ausfliegbarer Menge minus 4 l minus
Steigflugkraftstoff minus 45-Minuten-Reserve selbst herzuleiten. Das war der
erste Entwurf dieses Features, bevor Anmerkung 2 gefunden wurde. Er hätte eine
betriebliche Vorgabe in den Kern getragen, die dort nichts zu suchen hat.

## Entscheidung 2: Nur über die Druckhöhe interpolieren

**Entschieden**: Die Interpolation läuft entlang `pressure_altitude_ft`; die
Lasteinstellung wird über `where` exakt gefiltert.

**Begründung**: So arbeitet `interpolate` bereits für KTAS und Verbrauch, und
so ist es fachlich richtig — das Handbuch führt nur 50, 60, 70, 80, 90 und
100 %, und seit Feature 004 leitet der Regler seine Schrittweite aus genau
diesem Raster ab. Zwischenwerte kommen an der Oberfläche gar nicht vor.

**Verworfen**: eine zweite Interpolationsachse über die Lasteinstellung. Sie
wäre eine Erfindung ohne Entsprechung im Handbuch und würde zudem die
Verfügbarkeitsprüfung aushebeln (ab 10 000 ft gibt es keine 100 % mehr).

## Entscheidung 3: Temperaturkorrektur nur auf die Strecke

**Entschieden**: Die maximale Strecke wird mit demselben Faktor korrigiert wie
die Eigengeschwindigkeit — `1 + (ISA-Abweichung / 10) × 0,01`, und nur bei
positiver Abweichung. Die Flugdauer bleibt unverändert.

**Begründung**: Anmerkung 3 nennt ausdrücklich Geschwindigkeit und Reichweite,
nicht die Dauer. Das ist in sich stimmig: Strecke ist Geschwindigkeit mal Zeit;
steigen beide erstgenannten um 1 %, bleibt die Zeit gleich.

**Wiederverwendung**: `ktasTemperatureFactor` aus `fuel/cruise.ts` wird
unverändert genutzt, damit nicht zwei Stellen dieselbe Anmerkung auslegen.

## Entscheidung 4: Eigene Funktion, zusätzlich ins Gesamtergebnis eingebettet

**Entschieden**: `computeCruiseCapability(input)` als eigene, öffentlich
ausgeführte Kernfunktion. `computeFuelPlan` ruft sie auf und legt das Ergebnis
als Feld `cruiseCapability` ab.

**Begründung**: Die Übersicht hängt nur von vier Eingaben ab (FR-009). Ein
Nebenprodukt der Bedarfsrechnung wäre an Streckenlänge und Wind gekettet und
verschwände, sobald diese die Rechnung scheitern lassen — etwa bei Gegenwind
oberhalb der Eigengeschwindigkeit. Gerade dann ist die Übersicht aber die
Erklärung.

Die Einbettung ins Gesamtergebnis stellt sicher, dass der MCP-Adapter dieselben
Zahlen ohne zweiten Aufruf erhält (Prinzip IV).

**Verworfen**: die Oberfläche zweimal rechnen zu lassen (einmal Übersicht,
einmal Bedarf) und die Werte im Adapter zusammenzuführen. Zwei Aufrufe sind
unkritisch, aber der MCP-Adapter bekäme die Übersicht dann nicht.

## Entscheidung 5: Eigene Bereichsprüfung gegen die Reiseleistungstabelle

**Entschieden**: Die Übersicht prüft die errechnete Druckhöhe gegen das Raster
der **Reiseleistungstabelle**, nicht gegen das gemeinsame Raster mit der
Steigflugtabelle.

**Begründung**: Sie verwendet die Steigflugtabelle nicht. Beide Raster reichen
heute von 0 bis 18 000 ft, die Unterscheidung ändert also derzeit keine Zahl —
sie hält aber die Abhängigkeit dort, wo sie hingehört.

**Geprüft**: `getPressureAltitudeRange()` bildet den Schnitt beider Raster.
Für die Übersicht wird eine eigene, gleich gebaute Funktion ergänzt.

## Entscheidung 6: Wiederverwendung der Verfügbarkeitsprüfung

**Entschieden**: `checkPowerSetting` und `checkPressureAltitude` aus
`fuel/input.ts` werden ausgeführt (exportiert) und von beiden Wegen genutzt.

**Begründung**: Die Regel „die Lasteinstellung muss bei **beiden** die Höhe
einschließenden Stützstellen belegt sein" ist bereits formuliert und geprüft.
Eine zweite Formulierung derselben Regel liefe auseinander.

## Entscheidung 7: Darstellung und Rundung

**Entschieden**: Die Oberfläche nutzt die vorhandenen Funktionen
`formatKnots`, `formatFuelFlow`, `formatNauticalMiles` und `formatHours`. Es
kommt keine neue Formatierfunktion hinzu.

**Begründung**: `format.ts` ist die einzige Rundungsstelle des Projekts
(Zusicherung C-03). `formatHours` gibt „4 h 30 min" statt „4,5 h" — für eine
Flugvorbereitung die brauchbarere Form.

**Angenommen**: Die maximale Strecke wird wie jede Strecke auf 0,1 NM
dargestellt. An einer Stützstelle erscheint dann „546,0 NM". Das wirkt genauer
als die Tabelle, ist aber ehrlicher als eine zweite Rundungsregel — und
zwischen den Stützstellen entstehen ohnehin Zwischenwerte.

## Entscheidung 8: Abgrenzung zur Bedarfssumme

**Entschieden**: Der Hinweis zu Anmerkung 2 steht bei der Übersicht; der
bestehende Satz „das ist keine Reserve" bleibt beim Bedarf. Beide werden nicht
zusammengezogen.

**Begründung**: Sie sagen Gegensätzliches über verschiedene Zahlen. Nebeneinander
gestellt entstünde der Eindruck, die 45 Minuten deckten auch den ermittelten
Bedarf ab — das wäre eine Fehlinformation zur unsicheren Seite.

**Anzupassen**: Der Erklärtext des bestehenden Schritts `cruise.tableLookup`
sagt heute, Reichweite und Flugdauer „dürfen hier nicht einfließen". Das bleibt
richtig, sollte aber auf den neuen Schritt verweisen, damit es nicht wie ein
Widerspruch zur Übersicht wirkt.

## Offene Punkte

Keine. Alle Werte stammen aus der bereits geprüften Digitalisierung; eine
erneute Erfassung aus dem PDF ist nicht nötig.
