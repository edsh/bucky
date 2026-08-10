# Phase 0 — Recherche: Roll- und Startstrecke

**Feature**: 023 · **Spec**: [spec.md](./spec.md) · **Datum**: 2026-08-10

Sieben Fragen waren vor dem Entwurf zu klären. Die drei Auslegungsfragen zu den
Anmerkungen des Handbuchs sind bereits in der Spec entschieden
(„Clarifications") und tauchen hier nur als Rechenfolge auf.

---

## R1 — Wie wird über zwei Achsen zugleich interpoliert?

**Entscheidung**: `interpolate.ts` bekommt eine zweite exportierte Funktion
`interpolateGrid` für die bilineare Interpolation über zwei Achsen. Das
Startstreckenmodul ruft sie auf und interpoliert nicht selbst.

**Begründung**: Die Startstreckentabelle ist als einzige Tabelle des Projekts
über zwei stetige Achsen aufgespannt — Druckhöhe (11 Stützstellen) und
Umgebungstemperatur (7 Stützstellen), zusammen 77 Zeilen. Das vorhandene
`interpolate` läuft entlang **einer** Achse; weitere Spalten lassen sich nur
über `where` festnageln, und zwar auf exakte Rasterwerte. Für die Temperatur
gibt es aber keinen Grund, warum sie auf einer Stützstelle läge.

Das Projekt hält die Rundung an genau einer Stelle (`format.ts`, Zusicherung
C-03) und die Interpolation ebenso (`interpolate.ts`). Diese Linie wird
fortgeschrieben: Die Mischung zweier Zwischenwerte ist selbst Interpolation und
gehört deshalb nicht in das Startstreckenmodul.

Das Temperaturraster ist **nicht gleichabständig** (−20, 0, 10, 20, 30, 40, 50).
Die Funktion darf deshalb keine Schrittweite annehmen, sondern muss wie das
bestehende `interpolate` die tatsächlichen Nachbarn suchen.

Alle vier berührten Stützwerte gehen als `TableAnchor` in das Ergebnis ein — bei
exaktem Treffer einer Achse entsprechend zwei, bei beiden exakt einer. Ohne sie
könnte der Pilot das Ergebnis nicht gegen die gedruckte Tabelle halten, was
FR-002 und FR-008 verlangen.

**Verworfene Alternativen**:

- *Zweimal `interpolate` aus dem Startstreckenmodul heraus aufrufen*: Der zweite
  Aufruf bräuchte `where: { pressure_altitude_ft: … }` mit exaktem Rasterwert,
  und das Mischen der beiden Ergebnisse — also der eigentliche
  Interpolationsschritt — läge dann im Fachmodul. Genau das soll `interpolate.ts`
  bündeln.
- *Auf die nächstgelegene Temperaturspalte runden*: Bei einem Raster mit 10 °C
  Abstand (unten sogar 20 °C) verschiebt das die Startstrecke um mehrere Meter.
  Zwischen 10 °C und 20 °C liegen bei Meereshöhe 14 m Startlauf.
- *Extrapolieren über den Rasterrand*: durch Prinzip I ausgeschlossen.

**Probe**: Ein Prototyp reproduziert die Stützstelle 0 ft/20 °C exakt mit
204 m/319 m — den gedruckten Werten.

---

## R2 — Woher kommt die Umgebungstemperatur?

**Entscheidung**: Neue Datei `atmosphere/temperature.ts` mit
`toOutsideAirTemperature(pressureAltitudeFt, isaDeviationC)`. Sie liefert ein
Ergebnisobjekt mit Eingangsgrößen und der Normtemperatur, dazu eine
Quellenreferenz mit `kind: 'standard'`.

**Begründung**: Die Startstreckentabelle ist nach **Umgebungstemperatur**
aufgeschlüsselt, die Oberfläche kennt bislang nur die **ISA-Abweichung**. Beides
verbindet die Standardatmosphäre: 15 °C am Meeresspiegel, 0,0065 K/m Abnahme —
dieselben Konstanten, mit denen `pressureAltitude.ts` bereits arbeitet.

Bezugsgröße ist die **Druckhöhe**, nicht die Höhe über dem Meeresspiegel. So
arbeiten Leistungstabellen durchweg, und nur so passen Temperatur- und Höhenachse
derselben Tabelle zusammen.

Die Funktion liegt neben `pressureAltitude.ts` in `atmosphere/` und nicht im
Startstreckenmodul: Sie stammt wie jene aus einer Norm und nicht aus dem
Flughandbuch, trägt deshalb keine Seitenzahl, und sie ist für jede künftige
Tabelle mit Temperaturachse brauchbar.

**Verworfene Alternative**: *Ein eigenes Eingabefeld „Platztemperatur"*. Es
stünde neben der ISA-Abweichung, die der Reiseflug ohnehin braucht — zwei
Temperaturangaben, die auseinanderlaufen können, ohne dass es jemand bemerkt.
Die Spec schließt das als Annahme aus.

**Probe**: 971 ft Druckhöhe bei ISA ± 0 ergeben 13,1 °C.

---

## R3 — Ab wann steht der Aufbau zweispaltig?

**Entscheidung**: `@media (min-width: 40rem) and (orientation: landscape)`.

**Begründung**: Die Vorgabe „Hochformat einspaltig, Querformat zweispaltig"
lässt sich mit einer reinen Breitenabfrage nicht erfüllen, weil sich die
Bereiche überschneiden:

| Grenzfall | Gerät | CSS-Breite |
|---|---|---|
| schmalstes Telefon im Querformat (soll zweispaltig) | iPhone SE 2./3. Gen | **667 px** |
| breitestes Tablet im Hochformat (soll einspaltig) | iPad Pro 13" M4 | **1032 px** |

Jede Schwelle, die 667 px zweispaltig macht, macht damit auch 1032 px
zweispaltig. Maßgeblich ist deshalb die **Form** des Anzeigebereichs. Die
Breitenuntergrenze von 40 rem (640 px) bleibt daneben stehen, damit ein sehr
kleines Fenster im Querformat nicht in zwei unlesbare Spalten zerfällt.

Gegen 18 Gerätelagen geprüft (iPhone SE/15/16 Pro Max, Galaxy S25, iPad
mini 7/10.9/Pro 11/Pro 13, Galaxy Tab S9 — je hoch und quer): **alle 18 treffen
die Vorgabe**. Zwei Fälle fallen von selbst richtig, weil `orientation` laut MDN
den Anzeigebereich misst und nicht die Gerätehaltung:

- geteilter iPad-Bildschirm (688 × 1032) gilt als Hochformat → einspaltig
- schmales, hohes Desktop-Fenster (700 × 1200) ebenso

**Verworfene Alternativen**:

- *Intrinsisches Raster* `repeat(auto-fit, minmax(24rem, 1fr))`: bräuchte keinen
  Breakpoint, richtet sich aber allein nach der Breite — Tablet-Hochformat mit
  820 px würde zweispaltig, Telefon-Querformat mit 667 px einspaltig. Genau
  verkehrt herum.
- *Container Queries*: hier ohne Gewinn, weil der fragliche Container die
  Seitenbreite selbst ist. Für später wiederverwendbare Komponenten wären sie
  die bessere Wahl.
- *`min-aspect-ratio`*: feiner steuerbar, aber schwerer zu begründen; die
  Schwelle wäre eine willkürliche Zahl statt einer benennbaren Eigenschaft.

**Nebenwirkung**: `main` ist heute auf 48 rem begrenzt. Im zweispaltigen Fall
muss diese Grenze wachsen, sonst stehen zwei Spalten in 768 px. Vorschlag:
64 rem, sobald zwei Spalten gelten.

---

## R4 — Wo liegen die Eingabegrenzen der Startstrecke?

**Entscheidung**: Das Startstreckenmodul führt eigene Grenzen, ohne die
bestehenden Regler zu beschneiden.

| Größe | Regler heute | Startstreckentabelle | Verhalten außerhalb |
|---|---|---|---|
| Druckhöhe des Platzes | 0 … 18 000 ft ASL | **0 … 10 000 ft** | `PRESSURE_ALTITUDE_OUT_OF_RANGE`, Meldung nennt Höhe und Luftdruck |
| Umgebungstemperatur | mittelbar über ISA −30 … +40 °C | **−20 … 50 °C** | eigene Meldung, die Höhe und ISA-Abweichung als Ursache nennt |
| Windkomponente | −50 … 50 kt | Rückenwind **bis 10 kt**, Gegenwind ohne Rand | Rückenwind über 10 kt: `OUT_OF_RANGE` |

**Begründung**: Die Regler bleiben, wie sie sind, weil der Kraftstoffbedarf
weiter über den gesamten Bereich rechenbar ist. Eine gemeinsame Verengung würde
die Reiseleistung ohne Not beschneiden — deshalb verlangt FR-020, dass beide
Bereiche unabhängig voneinander bestehen bleiben.

Die Temperatur braucht eine **eigene Fehlermeldung**: Sie ist keine Eingabe,
sondern entsteht erst aus Druckhöhe und ISA-Abweichung. Ohne Nennung beider
Ursachen suchte der Pilot den Fehler bei der falschen Stellschraube — dieselbe
Überlegung, die es schon bei `pressureAltitudeOutOfRange` gibt.

Der **Gegenwind** bekommt keinen Rand, sondern einen Deckel bei 50 % (erreicht
bei 45 kt). Ablehnen wäre hier falsch: Ein Startlauf, der bei viel Gegenwind
kürzer ausfällt, ist physikalisch richtig — nur die geradlinige Fortschreibung
bis auf null ist es nicht.

---

## R5 — Wie werden Meter und Prozentsätze dargestellt?

**Entscheidung**: `format.ts` bekommt `formatMetres` (ganze Meter) und nutzt für
die Prozentsätze das vorhandene `formatPercent`. Neue Rundungsfunktionen sind
nicht nötig.

**Begründung**: Die Tabelle ist auf ganze Meter gedruckt; mehr Stellen
auszuweisen behauptete eine Genauigkeit, die die Interpolation nicht hat.
SC-001 verlangt Übereinstimmung „auf den Meter genau", was mit ganzen Metern
prüfbar wird. Die Rundung bleibt damit ausschließlich in `format.ts` (C-03), und
der Vertragstest bleibt unverändert gültig.

Die Zwischenwerte bleiben im Ergebnisobjekt **ungerundet**; gerundet wird erst
bei der Anzeige. Sonst summierten sich Rundungsfehler über Wind- und
Bahnzuschläge.

---

## R6 — Wie erreicht die Startstrecke den MCP-Zugang?

**Entscheidung**: Ein **eigenes** MCP-Werkzeug `computeTakeoffDistance` neben
dem bestehenden `computeFuelPlan`.

**Begründung**: Die Startstrecke hat eigene Eingaben (die beiden Bahnschalter),
eigene Grenzen (R4) und eigene Fehlerfälle. Würde sie in `computeFuelPlan`
eingebettet, ließe ein Rückenwind von 15 kt die gesamte Kraftstoffauskunft
scheitern — obwohl sie einwandfrei rechenbar ist. FR-020 verlangt genau das
Gegenteil.

Die Parität zur Weboberfläche wird wie beim bestehenden Werkzeug durch einen
Test gesichert, der beide gegen dasselbe Kernergebnis hält.

**Verworfene Alternative**: *Ein Werkzeug für beides*. Bequemer im Gespräch,
aber es verknüpft zwei Rechnungen, die unabhängig scheitern dürfen.

---

## R7 — Wie bleiben beide Bereiche unabhängig?

**Entscheidung**: Die Oberfläche hält zwei getrennte, jeweils gekapselte
Ergebnisse — so wie es die Reiseleistungs-Übersicht seit Feature 006 vormacht
(`{ wert, fehler }`).

**Begründung**: Das Muster steht bereits im Code und hat sich bewährt: Die
Übersicht bleibt stehen, wenn die Bedarfsrechnung an der Strecke scheitert.
Dieselbe Trennung greift jetzt zwischen Startstrecke und Bedarf, und sie ist
die Voraussetzung dafür, dass die Startstrecke engere Grenzen haben darf als
der Rest (R4), ohne den Rechner unbrauchbar zu machen.

---

## Nachgerechnete Bezugswerte

Für Beispiele in Plan, Verträgen und Quickstart, mit dem Prototyp aus R1
ermittelt:

| Fall | Startlauf | über 15-m-Hindernis |
|---|---|---|
| Stützstelle 0 ft / 20 °C (gedruckt) | 204 m | 319 m |
| EDSH: 971 ft Druckhöhe, ISA ± 0 (→ 13,1 °C) | 207,2 m | 324,8 m |
| dieselbe Lage mit Grasbahn (+15 % von 207,2 = 31,1 m) | 238,3 m | 355,8 m |
| EDSH bei ISA + 20 (→ 33,1 °C), mit Grasbahn | 275,5 m | 411,6 m |

Die Bahn in EDSH ist 500 m lang. Im letzten Fall bleiben nach der
Hindernisstrecke 88 m — der Grund, warum sich diese Rechnung dort überhaupt
lohnt.
