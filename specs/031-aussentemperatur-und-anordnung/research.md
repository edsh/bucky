# Research: Außentemperatur statt ISA-Abweichung

**Feature**: 031 | **Datum**: 2026-08-11 | **Phase**: 0

Die Spezifikation ließ zwei Fragen bewusst offen. Beide sind hier entschieden.

---

## R1 — Woher kommt der Wertebereich des Temperaturreglers?

### Die Frage

Eine ISA-Abweichung hat einen festen Bereich: `ISA_DEVIATION_RANGE = { min: -30,
max: 40 }` (`packages/deelk-poh-core/src/fuel/input.ts`, Zeile 42). Eine
Außentemperatur hat keinen, denn sie ist

    OAT = T₀ − L·h + ΔISA

und wandert damit mit der Druckhöhe. Bei 700 ft Druckhöhe entspricht derselbe
Abweichungsbereich −16,4 … 53,6 °C, bei 10 000 ft dagegen −49,6 … 20,4 °C.

Prinzip IV und Zusicherung C-05 verbieten, dass die Oberfläche einen Bereich
selbst festlegt. Er muss also so oder so aus dem Kern kommen — die Frage ist
nur, ob er fest ist oder mitwandert.

### Entscheidung

**Ein mitwandernder Bereich aus einer neuen Kernfunktion**
`getOutsideAirTemperatureRange(pressureAltitudeFt)`.

Sie verschiebt `ISA_DEVIATION_RANGE` um die Normtemperatur der übergebenen
Druckhöhe und rundet **nach innen** (`min` aufwärts, `max` abwärts), damit jeder
ganzzahlige Reglerwert innerhalb des Bereichs auch eine rechenbare Abweichung
ergibt.

### Begründung

Der feste Bereich hätte den Regler in beide Richtungen falsch gemacht. Bei
niedriger Platzhöhe hätte er zu wenig angeboten (bei 0 ft endete er bei
−30 °C, obwohl bis −15 °C rechenbar ist); bei großer Höhe zu viel — der Pilot
hätte 40 °C einstellen können und wäre erst am Ergebnis auf den Fehler
gestoßen.

Ein Regler, dessen Anschläge etwas bedeuten, ist die bessere Rückmeldung als
eine Fehlermeldung nach der Tatsache. Genau darin unterscheidet sich dieser
Fall von der Streckenlänge, deren Bereich bewusst über die Tabelle hinausreicht
(Kommentar bei `DISTANCE_RANGE`): Dort ist das Überschreiten eine *fachliche*
Aussage („der Flug ist zu lang"), hier wäre es nur eine Formalität.

`ISA_DEVIATION_RANGE` bleibt dabei die einzige Wahrheit. Der neue Bereich wird
daraus abgeleitet, nicht daneben gestellt — es gibt weiterhin genau eine Stelle,
an der die Grenzen stehen.

### Verworfene Möglichkeit

**Fester Temperaturbereich, Prüfung erst in der Rechnung.** Einfacher zu bauen,
und FR-005 fängt den Fall ab. Verworfen aus dem oben genannten Grund: Der Regler
verspräche Werte, die er nicht halten kann.

### Folge für die Oberfläche

Der Bereich hängt von der Platzdruckhöhe ab und ist damit ein `$derived`. Ändert
der Pilot Platzhöhe oder Luftdruck, wandern die Anschläge — und eine stehende
Temperatur kann aus dem Bereich fallen. Das ist der Fall, den FR-005 meint;
er wird nicht stillschweigend nachgeführt, denn die Temperatur ist eine Messung
und keine abgeleitete Größe. Sie zurechtzurücken hieße, dem Piloten eine Messung
zu unterschieben, die er nie eingegeben hat.

---

## R2 — Angezeigt oder gerechnet: welche Genauigkeit hat die abgeleitete Abweichung?

### Die Frage

Der Regler liefert ganze Grad Celsius. Die daraus folgende ISA-Abweichung ist
in aller Regel ein Bruch: bei 29 °C und 699,4 ft Druckhöhe sind es
15,585729… °C. Geht dieser Wert ungerundet in die Rechnung, während die
Folgezeile „≙ 16 °C" zeigt, weichen Angezeigtes und Gerechnetes voneinander ab.

### Entscheidung

**Ungerundet rechnen, mit einer Nachkommastelle anzeigen.**

Dafür kommt eine Formatierfunktion mit einer Nachkommastelle nach `format.ts`
(C-03: gerundet wird nur dort). Die Folgezeile lautet dann „≙ ISA +15,6 °C".

### Begründung

Ungerundet zu rechnen ist die Fortsetzung des bestehenden Musters: Die
Druckhöhe geht ebenfalls ungerundet in die Interpolation und wird nur für die
Anzeige gerundet.

Die Anzeige eine Stelle genauer als sonst zu machen ist der Unterschied zur
Druckhöhe — und er hat einen Grund. Bei der Druckhöhe verschwindet die
Rundungsdifferenz im Nichts (699 statt 699,44 ft). Bei der Abweichung wären es
bis zu 0,5 °C, und diese Zeile ist genau jene, mit der der Pilot die Zeile in
der Handbuchtabelle findet (Prinzip I: die verwendeten Eckwerte nennen). Eine
Zahl, die als Beleg dient, sollte die sein, mit der gerechnet wurde.

---

## R3 — Anfangswert des Temperaturreglers

Bisher stand der ISA-Regler auf +10 °C. Der Temperaturregler bekommt keinen
festen Startwert, sondern wird beim ersten Aufbau aus der Normtemperatur der
Anfangsdruckhöhe plus 10 °C gesetzt und auf ganze Grad gerundet.

So bleibt das Anfangsbild der Seite dem bisherigen so nah, wie es bei
gewechselter Eingabegröße überhaupt geht — die abgeleitete Abweichung liegt
dann nicht exakt bei 10,0, sondern innerhalb eines halben Grades davon. Das ist
keine Ungenauigkeit, sondern die Folge davon, dass jetzt die Temperatur die
ganzzahlige Größe ist und nicht mehr die Abweichung.

Der Wert wird **einmalig** gesetzt und nicht laufend nachgeführt: Ein `$effect`,
der die Temperatur an die Höhe koppelte, machte aus der Messung eine abgeleitete
Größe — derselbe Fehler, den Feature 026 bei den beiden Winden aufgelöst hat.

---

## R4 — Wie kommt der Dialog an die Temperatur?

Erfreulicherweise **einfacher als bisher**. Der Wetterdienst liefert
`temperature_2m` als absolute Temperatur; der Dialog rechnete sie bislang über
`toIsaDeviation` in eine Abweichung um, weil der Regler nur diese annahm. Jetzt
nimmt der Regler genau das, was der Dienst liefert.

Der Dialog verliert damit den Aufruf von `toIsaDeviation` und braucht nur noch
`roundCelsius` für den einstellbaren Wert. `toIsaDeviation` wandert von dort
in die Seite, wo sie die Folgezeile speist — sie bleibt also im Einsatz, nur an
anderer Stelle.

Der Bereich, gegen den der Vorschlag geprüft wird, kommt weiterhin von außen als
Prop — er ist jetzt nur nicht mehr konstant, sondern folgt der Platzdruckhöhe.

---

## R5 — Berührte Prüfungen im Klickpfad

Durchgesehen; betroffen sind:

| Prüfung | Was sie heute tut | Warum betroffen |
|---|---|---|
| 44 | erwartet `16 °C` als ISA-Vorschauwert im Dialog | Der Dialog schlägt jetzt `29 °C` Außentemperatur vor |
| Zeilen mit `wetter-zeile-isa` / `wetter-haken-isa` | sprechen die ISA-Zeile an | Der Schlüssel heißt künftig `temperatur` |
| Bahnwahl-Prüfungen | suchen `wetter-bahnwahl` über den Zeilen | Sie steht künftig in der Windzeile |
| Regler `#isa` | wird gefüllt und gelesen | Heißt künftig `#temperatur` |

Die Anordnungsänderungen (30, 33, 36, 56, 57) sprechen die Regler über ihre
Kennung an, nicht über ihre Stelle im Baum — sie bleiben unberührt. Neu
hinzukommen Prüfungen für die drei EDSH-Knöpfe und für die Folgezeile.

---

## Offen geblieben

Nichts. Beide Fragen aus der Prüfliste der Spezifikation sind entschieden.
