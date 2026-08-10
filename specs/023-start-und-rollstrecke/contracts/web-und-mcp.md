# Vertrag: Weboberfläche und MCP-Zugang

Beide Zugangswege zeigen dieselben Zahlen, weil beide dieselbe Kernfunktion
aufrufen (Constitution, Prinzip IV). Ein Paritätstest hält sie gegen dasselbe
Ergebnis.

## Aufbau der Seite

```text
h1  Kraftstoffrechner D-EELK
h2  Start und Streckenflug                          ← neu (FR-012)
    fieldset „Platzhöhe und Windkomponente"         ← umbenannt, genau 2 Felder
        Platzhöhe (mit Schnellwahl EDSH)
        Windkomponente
    ┌──────────────────────────┬──────────────────────────┐
    │ Roll- und Startstrecke   │ Kraftstoffbedarf und     │  ← zweispaltig nur
    │ (neu)                    │ Geschwindigkeiten        │     im Querformat
    │                          │   + Streckenlänge        │     (FR-015)
    └──────────────────────────┴──────────────────────────┘
```

Im Hochformat stehen beide Bereiche untereinander, die **Startstrecke zuerst**.

Die Regel lautet `@media (min-width: 40rem) and (orientation: landscape)`. In
derselben Abfrage wächst `main { max-width }` von 48 rem auf 64 rem — sonst
stünden zwei Spalten in 768 px. Warum keine reine Breitenabfrage genügt, steht
in [R3](../research.md).

## Bereich „Roll- und Startstrecke"

**Zeigt**

- eine Ergebnistabelle mit Startlauf und Strecke über das 15 m hohe Hindernis,
  im Aufbau wie „Kraftstoffbedarf und Geschwindigkeiten" (FR-019)
- die angewandte Windrechnung, obwohl der Wert oben eingegeben wird — damit sie
  ohne Blickwechsel nachvollziehbar ist (FR-017)
- die vier Anmerkungen des Handbuchs im Wortlaut mit Seitenangabe 5b-2 sowie
  die Bedingungen, unter denen die Tabelle gilt (FR-016)
- Abbildungsnummer, Tabellenname, Seiten und den Prüfhinweis (FR-010)
- bei gesetztem Zuschlag nach Anmerkung 4 die Kennzeichnung als **Mindestwert**
  (FR-006a)

**Bedient**

- zwei Schalter für die Anmerkungen 3 und 4, beschriftet nach dem
  Bahnzustand, den sie beschreiben — nicht nach der Nummer der Anmerkung
  (FR-018)
- die Schnellwahl „EDSH" setzt neben der Platzhöhe auch den Schalter für
  trockene Grasbahn, weil Backnang-Heiningen eine Graspiste hat (FR-023). Der
  Schalter bleibt danach frei wählbar; eine spätere Änderung der Platzhöhe
  setzt ihn **nicht** zurück.

**Verhält sich**

- unabhängig vom Nachbarbereich: Liegt die Druckhöhe über 10 000 ft oder die
  Temperatur über 50 °C, zeigt dieser Bereich eine Meldung und der
  Kraftstoffbedarf weiter sein Ergebnis (FR-020)
- auf 390 px Breite ohne waagerechtes Scrollen bedienbar (FR-021)

**Rechnet nicht selbst.** Die Seite ruft `toPressureAltitude`,
`toOutsideAirTemperature` und `computeTakeoffDistance` auf und stellt dar. Sie
kennt weder die Zuschlagssätze noch die Spaltennamen der Tabelle (C-04, C-07).

## MCP-Werkzeug `computeTakeoffDistance`

Ein **eigenes** Werkzeug neben `computeFuelPlan`, kein Feld darin (→
[R6](../research.md)).

**Eingaben**: Platzhöhe über dem Meeresspiegel, QNH, ISA-Abweichung,
Windkomponente, zwei Schalter für den Bahnzustand. Die beiden
Atmosphärengrößen bildet der Adapter mit den Kernfunktionen und reicht sie
weiter — er rechnet sie nicht nach.

**Ausgabe**: dieselben Werte wie die Weboberfläche, dazu Rechenschritte,
Quellenangabe, die vier Anmerkungen und der Prüfhinweis (FR-022).

**Warum getrennt**: Ein Rückenwind von 15 kt macht die Startstrecke
unrechenbar, den Kraftstoffbedarf aber nicht. Wären beide in einem Werkzeug,
risse der eine Fehler die andere Auskunft mit — genau das schließt FR-020 aus.
