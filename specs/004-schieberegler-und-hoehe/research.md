# Phase 0 — Recherche: Schieberegler und Höhe ASL statt Druckhöhe

**Feature**: 004 | **Datum**: 2026-08-06

## 1. Formel für die Druckhöhe

**Entscheidung**: Barometrische Formel der ICAO-Standardatmosphäre, in zwei
Schritten.

1. Druck am Ort aus QNH und Höhe über dem Meeresspiegel:
   `p = QNH · (1 − L·h / T₀)^5,25588`
2. Druckhöhe aus diesem Druck:
   `H_p = (T₀ / L) · (1 − (p / 1013,25)^(1/5,25588))`

mit `T₀ = 288,15 K`, `L = 0,0065 K/m`, `T₀/L = 44330,77 m`, `h` in Metern,
`p` und QNH in hPa, `H_p` in Metern (anschließend in Fuß umgerechnet mit
0,3048 m/ft).

**Begründung**: Der zweite Exponent ist der Kehrwert des ersten. Daraus folgt
eine Probe, die als Test taugt: Für QNH = 1013,25 hPa kürzen sich beide weg
und die Druckhöhe ist gleich der eingegebenen Höhe (SC-002).

Der Kehrwert MUSS als `1 / 5,25588` gerechnet werden, nicht als der ebenfalls
gebräuchliche gerundete Literalwert 0,190263. Nachgerechnet: mit 0,190263
liefert die Probe bei 18 000 ft nur 17 999,99 ft statt 18 000 ft. Die
Abweichung ist mit 0,01 ft praktisch bedeutungslos, aber sie zerstört eine
exakte Zusicherung, die sonst kostenlos zu haben ist — und eine exakte
Zusicherung lässt sich schärfer testen als eine ungefähre.

**Verworfene Alternativen**:

- *Faustformel `h + (1013,25 − QNH) · 30 ft/hPa`*: höhenabhängig zu ungenau.
  Bei QNH 1043 und 6000 ft weicht sie um 123 ft ab, bei QNH 983 und 6000 ft um
  106 ft in die andere Richtung. Hinzu kommt, dass die Faustformel selbst nicht
  eindeutig ist — je nach Quelle kursieren 27 ft/hPa und 30 ft/hPa. Genau
  deshalb muss die Anwendung eine nachvollziehbare Formel nennen statt einer
  Konvention.
- *Nur den Druckversatz rechnen und auf die Höhe addieren*
  (`H_p = h + 44330,77 · (1 − (QNH/1013,25)^(1/5,25588))`): verbreitet, aber
  ungenau, weil der Versatz mit der Höhe wächst. Die zweistufige Rechnung
  erfasst das.

**Quellen**: ICAO Doc 7488 (Manual of the ICAO Standard Atmosphere);
ICAO Doc 9837 für die QNH-Definition. Die Konstanten sind dort und in der
Beschreibung der Internationalen Standardatmosphäre einheitlich belegt.

**Wichtig**: Diese Formel steht **nicht** im POH. Sie ist keine
Handbuchtabelle, sondern eine Norm — mit Folgen für die Quellenangabe, siehe
Punkt 2.

## 2. Quellenangabe für eine Größe, die nicht aus dem POH stammt

**Entscheidung**: `SourceReference` wird zu einem unterschiedenen Typ mit zwei
Ausprägungen: `kind: 'poh'` (bisheriger Aufbau mit Seitenzahl, Abbildung,
Ausgabe, Änderungsstand) und `kind: 'standard'` (Norm mit Bezeichnung, Ausgabe
und der verwendeten Formel im Klartext).

**Begründung**: Constitution Prinzip I verlangt zu jedem Ergebnis eine exakte
Quellenangabe und den Hinweis, gegen das Original-POH gegenzuprüfen. Für die
Druckhöhe gäbe es keine Seite, gegen die man prüfen könnte — eine erfundene
Seitenangabe wäre schlimmer als gar keine. Der unterschiedene Typ macht im
Ergebnis sichtbar, welche Zahlen aus dem Handbuch stammen und welche aus einer
Norm. Der Prüfhinweis bleibt dadurch wahr: er bezieht sich weiterhin nur auf
die POH-Werte.

**Verworfene Alternativen**:

- *Ein zusätzliches Feld neben `sources`*: Die Adapter müssten zwei Listen
  anzeigen und könnten eine davon vergessen — genau das soll der Vertrag
  verhindern.
- *Die Norm als POH-Referenz mit leeren Seitenangaben*: würde die Zusicherung
  aushöhlen, dass jede Referenz eine prüfbare Seite nennt.

## 3. Verhalten bei einer Druckhöhe außerhalb des Tabellenbereichs

**Entscheidung**: Ablehnen mit einer Meldung, die die errechnete Druckhöhe, die
überschrittene Grenze sowie Höhe und QNH nennt (FR-006).

**Begründung**: Die naheliegende Alternative — auf 0 ft anheben — wurde geprüft
und ist falsch. Die Steigflugtabelle ist ab 0 ft kumulativ (0 ft → 0,0 l;
1000 ft → 0,6 l), und der Steigflugbedarf entsteht als Differenz
`Wert(Reiseflughöhe) − Wert(Platzhöhe)`. Wird eine Platzhöhe von −369 ft auf
0 ft angehoben, wächst der abgezogene Wert und die Differenz schrumpft: das
Ergebnis weist **weniger** Kraftstoff aus, als der Flug braucht. Rund 0,2 l in
die falsche Richtung.

**Verworfene Alternativen**:

- *Linear unter 0 ft fortsetzen*: Richtung wäre richtig, aber es ist eine
  Extrapolation über den Rand des Handbuchs hinaus. Prinzip I lässt
  Interpolation zwischen Tabellenwerten zu, nicht das Erfinden von Werten
  außerhalb.
- *Auf 0 ft begrenzen und die Unterschätzung nur benennen*: Ein Hinweis
  entschärft eine Zahl nicht, die in die unsichere Richtung zeigt.

**Preis dieser Entscheidung**: An einem Hochdrucktag gibt der Rechner keine
Auskunft. Das ist bewusst gewählt und muss in der Oberfläche verständlich
erklärt werden, sonst wirkt es wie ein Defekt.

## 4. Wertebereiche und Schrittweiten der Regler

**Entscheidung**:

| Eingabe | Bereich | Schritt | Herkunft |
|---|---|---|---|
| Platzhöhe ASL | 0 … 10 000 ft | 10 ft | Kern; deckt europäische Flugplätze ab |
| Reiseflughöhe ASL | 0 … 18 000 ft | 100 ft | Kern; obere Grenze aus dem Tabellenraster |
| QNH | 950 … 1050 hPa | 1 hPa | Kern; Einstellbereich üblicher Höhenmesser |
| Streckenlänge | 1 … 900 NM | 1 NM | Kern; obere Grenze neu, ein Regler braucht ein Ende |
| ISA-Abweichung | −30 … +40 °C | 1 °C | unverändert aus Feature 001 |
| Windkomponente | −50 … +50 kt | 1 kt | unverändert aus Feature 001 |

**Begründung**: Die Grenzen der Höhen beziehen sich jetzt auf die Höhe über dem
Meeresspiegel, nicht mehr auf die Druckhöhe. Sie können daher nicht mehr allein
aus dem Tabellenraster stammen. Der Kern gibt sie trotzdem vor (FR-002), damit
kein Adapter eigene Zahlen erfindet; die eigentliche Grenzprüfung geschieht
danach an der errechneten Druckhöhe (FR-006).

Die 900 NM für die Strecke sind großzügig: die größte Reichweite der Tabelle
liegt darunter, ein Flug jenseits davon scheitert ohnehin an der ausfliegbaren
Menge — und genau diese Rückmeldung ist erwünscht.

**Verworfene Alternative**: Den Höhenreglern die Grenzen der Druckhöhe geben.
Das hätte an einem Hochdrucktag Höhen ausgeschlossen, die fliegbar sind.

**Nachgerechnete Randwerte**, die zeigen, dass FR-006 kein seltener Fall ist:

| Höhe ASL | QNH | Druckhöhe | Lage |
|---|---|---|---|
| 0 ft | 1050 hPa | −989 ft | unter dem Tabellenbereich |
| 85 ft | 1030 hPa | −369 ft | unter dem Tabellenbereich |
| 16 000 ft | 950 hPa | 17 578 ft | gerade noch im Bereich |
| 18 000 ft | 950 hPa | 19 553 ft | über dem Tabellenbereich |

Beide Enden des QNH-Reglers führen also an den Rand. Die Regler decken
absichtlich mehr ab, als jede einzelne Wetterlage zulässt.

## 5. Umsetzung des Reglers mit Wertanzeige

**Entscheidung**: `<input type="range">` mit zugehörigem `<output>`, beide in
einer gemeinsamen Komponente gebündelt, die Beschriftung, Einheit, Bereich und
Schrittweite entgegennimmt.

**Begründung**: `<output>` ist das dafür vorgesehene Element und wird von
Vorlesewerkzeugen als Ergebnisanzeige behandelt. Eine gemeinsame Komponente
verhindert, dass sich die sechs Regler in Aufbau und Beschriftung
auseinanderentwickeln, und hält FR-013 an einer Stelle.

**Verworfene Alternative**: Regler und Anzeige je Feld einzeln aufbauen —
mehr Wiederholung, mehr Gelegenheit für Abweichungen.

## 6. Anordnung nebeneinander

**Entscheidung**: Ein Raster, das die Spaltenzahl aus der verfügbaren Breite
ableitet, mit einer Mindestbreite je Regler.

**Begründung**: Erfüllt FR-003 ohne feste Haltepunkte. Ein Regler unter etwa
14 rem wird unbrauchbar genau; die Mindestbreite bestimmt damit selbst, wann
umgebrochen wird.

## Offene Punkte

Keine. Alle für die Umsetzung nötigen Festlegungen sind getroffen.
