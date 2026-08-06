# Contract: MCP-Adapter (`apps/mcp`)

Der MCP-Server läuft lokal über stdio und ist ein dünner Adapter über
`@edsh-bucky/deelk-poh-core` (Constitution-Prinzip IV). Er enthält keine
Rechenlogik.

## Grundregel

Ein Sprachmodell erhält über diesen Server **niemals** Rohtabellen als
Interpolationsgrundlage. Es ruft ein Werkzeug auf und bekommt ein fertig
gerechnetes Ergebnis samt Quellenangaben zurück (Constitution-Prinzip I).

## Werkzeug `compute_fuel_plan`

Berechnet den Kraftstoffbedarf eines Flugvorhabens für D-EELK.

**Eingabe**: entspricht `FlightPlanInput` aus [../data-model.md](../data-model.md).
Das JSON-Schema der Eingabe wird aus `getFuelPlanInputDomain()` erzeugt, damit die
zulässigen Werte nicht doppelt gepflegt werden.

**Ausgabe**: der aufgeschlüsselte Bedarf, die Folge der Rechenschritte mit ihren
Tabellen-Eckwerten, die Quellenangaben und der Prüfhinweis — also `FuelPlanResult`,
sowohl als strukturierter Inhalt als auch als lesbare Zusammenfassung.

**Fehlerfall**: Ein `PohCalculationError` wird als Werkzeugfehler mit der
erklärenden Meldung des Kerns zurückgegeben. Das Werkzeug liefert dann keinen
Zahlenwert, damit das Modell nichts zum Weiterrechnen bekommt.

## Werkzeug `list_poh_tables`

Liefert den Katalog der digitalisierten Tabellen mit Quellenreferenzen und
bekannten Anomalien. Dient der Beantwortung von Fragen wie "aus welcher Tabelle
stammt das", nicht als Datenquelle für eigene Rechnungen des Modells.

## Betrieb

Der Kern ist ein Quellpaket ohne Emit; Node kann seine `.js`-Importpfade daher
nicht selbst auflösen. `apps/mcp` wird deshalb mit esbuild zu
`apps/mcp/dist/server.js` gebündelt (Kern und Tabellendaten eingeschlossen, SDK
und Zod extern). Gestartet wird der Server über `node dist/server.js`.

## Zusicherungen

- **M-01**: Jede erfolgreiche Antwort enthält die Quellenangaben und den
  Prüfhinweis wortgleich so, wie der Kern sie liefert.
- **M-02**: Bei identischer Eingabe ist das Zahlenergebnis identisch mit dem der
  Web-Oberfläche.
- **M-03**: Der Server stellt kein Werkzeug bereit, das Rohtabellenzeilen zur
  Interpolation herausgibt.
