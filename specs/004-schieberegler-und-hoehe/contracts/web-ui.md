# Contract: Regler-Komponente der Oberfläche (`apps/web`)

Ergänzt den Vertrag aus
[Feature 001](../../001-kraftstoffrechner-d-eelk/contracts/mcp-tools.md) um die
Eingabemaske. Der MCP-Adapter ist von diesem Feature nur insofern betroffen, als
sein Eingabeschema die neuen Felder übernimmt; er bekommt keine Regler.

## Komponente: Schieberegler mit Wertanzeige

**Nimmt entgegen**: Beschriftung, Bereich (`min`, `max`, `step`, `unit`) und den
aktuellen Wert.

**Sichert zu**:

- Der Bereich wird unverändert durchgereicht. Die Komponente kennt keine
  fachlichen Grenzen und enthält keine Vorgabewerte (C-05).
- Die Wertanzeige nennt Wert und Einheit und folgt dem Regler ohne Verzögerung.
- Die Beschriftung ist mit dem Regler verknüpft, sodass ein Klick darauf den
  Regler erreicht und Vorlesewerkzeuge den Zusammenhang erkennen (FR-013).
- Die Bedienung per Tastatur ist möglich, ohne dass die Komponente eigene
  Tastenbehandlung mitbringt (FR-013).
- Die Komponente formatiert Zahlen nicht selbst, sondern verwendet die
  Formatierung des Kerns (C-03).

## Anordnung

- Die Regler liegen in einem Raster, dessen Spaltenzahl sich aus der Breite
  ergibt (FR-003).
- Unterhalb einer Mindestbreite je Regler bricht das Raster auf eine Spalte um;
  waagerechtes Scrollen entsteht nicht (SC-004).

## Anzeige der Druckhöhe

- Zu jeder Höhe erscheinen beide Werte: die eingestellte Höhe über dem
  Meeresspiegel und die daraus errechnete Druckhöhe (FR-007, SC-005).
- Die Druckhöhe wird als errechnet gekennzeichnet und trägt die
  Norm-Referenz, nicht den POH-Prüfhinweis.
- Die Druckhöhe steht unter dem Regler, der sie erzeugt (FR-007).

## Verhalten außerhalb des Tabellenbereichs

- Es erscheint kein Ergebnis, sondern die Meldung des Kerns (FR-006).
- Die Meldung wird unverändert übernommen; die Oberfläche formuliert sie nicht
  um (Prinzip IV).
- Erkennbar bleibt, welche Eingabe die Ursache ist — in aller Regel das QNH und
  nicht die Höhe.
