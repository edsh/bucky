# Research: EDSH-Abruf um Temperatur und Pistenwind erweitern

Was vor dem Entwurf geklärt werden musste, und woran es geklärt wurde.

## R1 — Der Dienst liefert Temperatur und Wind mit derselben Anfrage

**Frage**: Braucht es einen zweiten Abruf oder einen zweiten Dienst?

**Befund**: Nein. Open-Meteo nimmt in `current` eine Liste von Größen entgegen;
Luftdruck, Temperatur, Windgeschwindigkeit und Windrichtung kommen in einer
Antwort. Gegengeprüft am 11.08.2026 mit den Koordinaten aus `edsh.ts`:

```
GET https://api.open-meteo.com/v1/forecast
    ?latitude=48.9197&longitude=9.4553&elevation=296
    &current=surface_pressure,temperature_2m,wind_speed_10m,wind_direction_10m
    &wind_speed_unit=kn&timezone=UTC
```

```json
{
  "elevation": 296.0,
  "current_units": { "surface_pressure": "hPa", "temperature_2m": "°C",
                     "wind_speed_10m": "kn", "wind_direction_10m": "°" },
  "current": { "time": "2026-08-11T11:15", "interval": 900,
               "surface_pressure": 987.9, "temperature_2m": 29.2,
               "wind_speed_10m": 5.7, "wind_direction_10m": 35 }
}
```

**Folgerung**: Die bestehende Anfrage wird um drei Größen und einen
Einheitenparameter erweitert; alles andere am Abruf bleibt, wie es ist.

## R2 — Die Bahnrichtungen von EDSH sind 103° und 283° rechtweisend

**Frage**: Gegen welche Zahl wird der Wind zerlegt?

Das ist die gefährlichste Frage dieses Features, weil eine falsche Antwort
darauf **plausibel aussieht**. Ein Fehler von drei Grad verschiebt den
Pistenwind je nach Lage um bis zu 5 % der Windgeschwindigkeit — bei 20 kt also
um einen Knoten. Das fällt niemandem auf und ist trotzdem falsch.

**Der Fallstrick**: Die Bahnkennungen 10 und 28 sind **missweisend** (100° und
280° magnetisch), auf ganze Zehn gerundet. Die Windrichtung eines Wettermodells
ist **rechtweisend**. Wer die Kennung mal zehn nimmt und gegen die Windrichtung
rechnet, mischt zwei Bezugsrichtungen.

**Befund**: OurAirports führt für EDSH in `runways.csv`:

```
airport_ident  length_ft  width_ft  surface  le_ident  le_heading_degT  he_ident  he_heading_degT
EDSH           1640       98        Grass    10        103              28        283
```

**Gegenproben**, beide bestanden:

1. 1640 ft × 98 ft sind 500 m × 30 m — genau die Maße, die die AIP VFR für den
   Sonderlandeplatz Backnang-Heiningen ausweist.
2. Die Ortsmissweisung liegt in dieser Gegend bei rund 3° Ost. 100° missweisend
   plus 3° ergibt 103° rechtweisend, 280° plus 3° ergibt 283°. Die Zahlen aus
   der Datenbank sind also nicht bloß übernommen, sie stimmen mit der einzigen
   anderen verfügbaren Herleitung überein.

**Folgerung**: 103° und 283° rechtweisend, festgehalten in `edsh.ts` neben
Koordinaten und Platzhöhe. Die Kennungen 10/28 bleiben als **Beschriftung** im
Dialog — der Pilot kennt sie so —, gerechnet wird mit den rechtweisenden Werten.

**Grenze dieser Quelle**: OurAirports ist eine gepflegte offene Datenbank, kein
amtliches Luftfahrthandbuch. Die Zahlen sind hier als Konstanten im Quelltext
festgehalten und mit ihrer Herkunft belegt, damit ein späterer Leser sie gegen
die AIP prüfen kann, statt sie für gesetzt zu halten.

## R3 — Warum die Bahn wählbar sein muss

**Frage**: Kann der Dialog die Bahn selbst bestimmen?

**Befund**: Nur zum Teil. EDSH hat **keine** verbindliche Betriebsrichtung; die
Bahn richtet sich nach dem Wind. Der Platz liegt zwischen mehreren Ortschaften,
und die Lärmschutzempfehlungen des Vereins beschreiben beide Richtungen als
gebräuchlich — Bahn 10 mit langem geraden Endanflug über Heiningen und Maubach,
Bahn 28 mit der Platzrunde um die lärmempfindlichen Bereiche herum.

**Folgerung**: Die Gegenwindbahn ist die richtige **Voreinstellung**, aber keine
zulässige Festlegung. Der Dialog wählt sie vor und lässt umschalten (FR-010).

Eine feste Wahl wäre in beide Richtungen falsch: „immer Bahn 10" wäre in der
Hälfte der Fälle die falsche Bahn; „immer die ungünstigere" wäre zwar
konservativ, würde aber einen Wert in den Regler schreiben, den der Pilot gar
nicht vorhat — und Konservatismus, den man nicht bestellt hat, wird beim
nächsten Mal weggeklickt.

## R4 — Die ISA-Abweichung ist über die Höhe konstant

**Frage**: Darf eine am Boden gemessene Temperatur die ISA-Abweichung für die
Reiseflughöhe setzen?

**Befund**: Ja, unter der Annahme, die der Rechner ohnehin trifft. Der Rechner
führt **einen** Regler für die ISA-Abweichung und verwendet ihn sowohl für die
Startstrecke am Platz als auch für den Reiseflug. Damit setzt er bereits
voraus, dass die Atmosphäre um einen festen Betrag von der Norm abweicht statt
um einen höhenabhängigen. Genau diese Annahme macht die Ableitung aus der
Platztemperatur zulässig.

**Was daraus nicht folgt**: Dass die Annahme richtig ist. Eine Inversion am
Morgen bricht sie. Deshalb bleibt der Vorschlag ausdrücklich unverbindlich, und
der Dialog nennt die absolute Platztemperatur mit, damit der Pilot sieht, worauf
die Abweichung beruht (FR-013).

## R5 — Die Druckhöhe für die Umrechnung kommt aus demselben Abruf

**Frage**: Auf welche Druckhöhe bezieht sich die ISA-Abweichung?

**Befund**: Die Druckhöhe eines Platzes hängt allein vom dort herrschenden
Luftdruck ab, nicht davon, was im QNH-Regler steht. Beides zusammen ergibt drei
Vorschauwerte, die **denselben** Zustand der Atmosphäre zu **demselben**
Zeitpunkt beschreiben.

Der Weg ist: abgerufener Stationsdruck → `toQnh` (ungerundet!) →
`toPressureAltitude` mit der Platzhöhe von EDSH → `toIsaDeviation` mit der
abgerufenen Temperatur. Dass dieser Umweg nichts verfälscht, ist bereits
geprüft: Zusicherung C-08 hält den Rundlauf zwischen `toQnh` und
`toPressureAltitude` auf neun Nachkommastellen.

**Verworfen**: die Druckhöhe aus dem eingestellten QNH-Regler nehmen. Dann hinge
die vorgeschlagene Temperatur davon ab, was der Pilot vorher von Hand
eingestellt hat — und ein abgewähltes QNH-Kästchen veränderte rückwirkend den
Temperaturvorschlag.

**Größenordnung**: Über den ganzen Reglerbereich (950–1050 hPa) verschiebt sich
die Druckhöhe von EDSH um rund 2 700 ft und die Normtemperatur damit um gut
5 °C. Der Unterschied ist also keine Spitzfindigkeit.

## R6 — Der Klickpfad darf den Wetterdienst nicht aufrufen

**Frage**: Wie prüft man einen Dialog, dessen Inhalt aus dem Netz kommt?

**Befund**: Nicht, indem man das Netz benutzt. Ein Klickpfad gegen den echten
Dienst wäre von Wetter, Erreichbarkeit und Tageszeit abhängig — er könnte keine
festen Vorschauwerte erwarten und schlüge gelegentlich ohne eigenes Verschulden
fehl. Feature 025 hat das bereits so gelöst; dieses Feature erbt das Vorgehen
und braucht es stärker, weil jetzt drei Werte und eine Bahnwahl davon abhängen.

**Folgerung**: Die Antwort wird im Browser abgefangen und durch eine feste
ersetzt. Damit lassen sich auch die Fälle prüfen, die sich sonst nicht
herstellen ließen: ein fehlendes Windfeld, eine Temperatur außerhalb des
Reglerbereichs, ein Rückenwind über 10 kt.

## R7 — Was der Dienst zur Windgeschwindigkeit anbietet

**Frage**: Wer rechnet km/h in Knoten um?

**Befund**: Niemand — der Dienst liefert Knoten, wenn man `wind_speed_unit=kn`
mitgibt (in R1 bestätigt: `"wind_speed_10m": "kn"`).

**Folgerung**: Die Anfrage fordert Knoten an. Eine Umrechnung im Adapter wäre
eine Rechnung im Sinne von C-02; eine im Kern wäre eine Eigenheit dieses einen
Dienstes an einer Stelle, die keinen Dienst kennen darf. Beides entfällt.

Ebenso bleibt die Windrichtung, wie sie kommt: rechtweisend und meteorologisch,
also die Richtung, **aus** der der Wind weht. Das passt ohne Umrechnung zu den
rechtweisenden Bahnrichtungen aus R2 — der Winkel zwischen beiden ist genau der,
dessen Kosinus die Gegenwindkomponente ergibt.

## Übernommen aus Feature 025

Die Befunde zum Dienst selbst gelten unverändert weiter und werden hier nicht
wiederholt: dass allein Open-Meteo den Abruf aus einem statisch ausgelieferten
Browser erlaubt (CORS), dass die Werte aus dem Rechenmodell ICON-D2 stammen und
**keine** Messung am Platz sind, dass `pressure_msl` als QFF nicht mit dem QNH
verwechselt werden darf, und dass die Höhe in der Anfrage mitgegeben werden
muss, weil der Dienst sonst sein eigenes Geländemodell heranzieht. Siehe
[025/research.md](../025-qnh-vorbelegen/research.md).
