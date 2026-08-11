# Vertrag: Weboberfläche

Ergänzt und ersetzt in Teilen den [Vertrag aus Feature
025](../../025-qnh-vorbelegen/contracts/web.md). Was dort steht und hier nicht
widersprochen wird, gilt weiter.

## Bedienung

### Der Knopf am QNH-Regler

Unverändert: ein Knopf „EDSH" im `neben`-Steckplatz des QNH-Reglers, in
derselben Gestalt wie die Schnellwahl bei der Platzhöhe. Er bleibt der einzige
Einstieg — die beiden anderen Regler bekommen **keinen** eigenen Knopf.

Warum nicht: Drei Knöpfe für einen Abruf wären drei Wege zu demselben Dialog.
Der Dialog holt ohnehin alles auf einmal; ein zweiter Knopf verspräche eine
Auswahl, die es an dieser Stelle nicht gibt — die trifft man erst im Dialog.

### Der Dialog

Weiterhin ein natives `<dialog>` mit `showModal()`. Fokusführung, `Esc` und die
Inaktivierung des Hintergrunds kommen damit ohne Nachbau.

**Immer sichtbar, in jedem Zustand** — unverändert aus Feature 025 und jetzt
für alle drei Größen gemeinsam gültig (FR-019):

- dass gerade Daten von einem Onlinedienst geladen werden
- dass die Werte aus einem **Wettermodell** stammen und keine Messung am Platz
  sind
- dass sie unverbindliche Vorschläge sind und vor dem Flug das **ATIS** gilt
- der Name des Dienstes mit Verweis (Auflage CC-BY)

**Je nach Zustand:**

| Zustand | Zusätzlich sichtbar |
|---|---|
| `laedt` | eine Ladeanzeige |
| `vorschau` | die Bahnwahl und drei Zeilen (siehe unten) |
| `fehler` | eine verständliche Meldung und „Erneut versuchen" |

### Die drei Zeilen im Zustand `vorschau`

Je Zeile: ein Kästchen, die Bezeichnung des betroffenen Reglers, der
Vorschauwert in der Darstellung dieses Reglers und darunter kleingedruckt, woraus
er entstand.

| Zeile | Vorschauwert | Erläuterung darunter |
|---|---|---|
| Luftdruck QNH | ganze hPa | ungerundeter Wert, Gültigkeitszeit |
| ISA-Abweichung | ganze °C | absolute Platztemperatur (FR-013) |
| Pistenwind | ganze kt | Windrichtung, Windgeschwindigkeit, gewählte Bahn (FR-012) |

Alle Kästchen sind nach dem Abruf angehakt, sofern die Größe übernehmbar ist
(FR-003).

Eine Größe, die fehlt oder außerhalb des Reglerbereichs liegt, erscheint mit
**gesperrtem, nicht angehaktem** Kästchen und einer begründenden Meldung; die
übrigen bleiben bedienbar (FR-007). Der Dialog verwirft also nie den ganzen
Abruf wegen eines Wertes.

### Die Bahnwahl

Über den drei Zeilen, sichtbar nur im Zustand `vorschau`: die Wahl zwischen
Bahn **10** und Bahn **28**. Vorausgewählt ist die Bahn, die Gegenwind ergibt
(FR-010).

Ein Wechsel rechnet allein den dritten Vorschlag neu und löst **keinen** neuen
Abruf aus (FR-011). Er verändert weder QNH noch ISA-Abweichung und setzt keine
Kästchen zurück, die der Pilot bereits abgewählt hat.

Beschriftet mit den Kennungen 10/28, gerechnet mit 103°/283° rechtweisend
(→ [R2](../research.md)).

### Knöpfe

„Übernehmen" und „Abbrechen".

- „Übernehmen" setzt **ausschließlich** die angehakten Regler (FR-004).
- „Übernehmen" ist gesperrt, solange kein Ergebnis vorliegt oder kein Kästchen
  angehakt ist (FR-005).
- „Abbrechen", `Esc` und das Schließen verändern nichts (FR-006).

### Nach der Übernahme

Unter jedem übernommenen Regler steht im `folge`-Steckplatz eine Zeile mit
Dienst, Gültigkeitszeit und dem Hinweis „unverbindlich" (FR-014). Sie
verschwindet, sobald der Pilot **diesen** Regler selbst bewegt — die Zeilen der
anderen Regler bleiben stehen (FR-015).

## `lib/weather/edsh.ts`

Bekommt `RUNWAYS`: die beiden Bahnrichtungen als Kennung und rechtweisende
Richtung (→ [data-model.md](../data-model.md)). Sie stehen bei Koordinaten und
Platzhöhe, weil sie zur selben Sache gehören: den Eigenschaften des
Heimatplatzes (FR-018). Der Kern sieht sie nicht.

## `lib/weather/openMeteo.ts`

### `baueAnfrage(platz): URL` (rein)

Fordert zusätzlich `temperature_2m`, `wind_speed_10m` und `wind_direction_10m`
an und setzt `wind_speed_unit=kn` (→ [R7](../research.md)). Alles Übrige
unverändert, insbesondere das ausdrückliche `elevation`.

Der Kommentar, der bislang begründet, warum Temperatur und Wind **nicht**
angefordert werden, entfällt mit seinem Gegenstand.

### `deuteAntwort(rohdaten): WetterAbruf` (rein)

Wirft weiterhin, wenn Luftdruck, Zeit oder Bezugshöhe fehlen — das sind die
Pflichtfelder.

Für Temperatur und Wind gilt das **nicht**: Fehlen sie oder sind sie nicht
deutbar, bleibt das Feld schlicht leer. Der Wind ist nur dann belegt, wenn
Richtung **und** Geschwindigkeit da sind; eine halbe Angabe ist keine.

Wie bisher wird nur auf **Vorhandensein und Deutbarkeit** geprüft, nicht auf
Plausibilität. Eine eigene Temperatur- oder Windschranke wäre eine zweite Grenze
neben der, die der Reglerbereich ohnehin zieht (C-05).

Eine negative Windgeschwindigkeit gilt als nicht deutbar: Sie ist kein
unplausibler, sondern ein unmöglicher Wert.

### `holeWetter(platz, signal): Promise<WetterAbruf>` (unrein)

Unverändert. Zeitgrenze, Abbruchsignal und das einheitliche Fehlerbild bleiben,
wie sie sind.

## Zusicherungen der Oberfläche

Aus Feature 025 unverändert gültig, jetzt für alle drei Größen:

- **W-01**: Die Oberfläche rechnet **nicht** selbst. Sie ruft `toQnh`,
  `toPressureAltitude`, `toIsaDeviation` und `toRunwayWindComponent` auf.
- **W-02**: Die Oberfläche rundet **nicht**. Alle drei übernehmbaren Werte
  kommen fertig gerundet aus dem Kern (C-03).
- **W-03**: Ein Abbruch, ein Fehlschlag oder das Schließen des Dialogs verändert
  **keine** Eingabe.
- **W-04**: Der Abruf geschieht **ausschließlich** auf Knopfdruck, nie beim
  Laden der Seite. Ohne Netz bleibt die Seite vollständig bedienbar.
- **W-05**: Eine Antwort, die nach dem Schließen des Dialogs eintrifft,
  verändert nichts.
- **W-06**: Die Platzhöhe für Anfrage und Umrechnung stammt aus **derselben**
  Konstanten wie die Schnellwahl der Platzhöhe.

Neu in diesem Feature:

- **W-07**: Die Druckhöhe für die Temperaturumrechnung entsteht aus dem
  **abgerufenen** Luftdruck, nicht aus dem eingestellten QNH-Regler
  (→ [R5](../research.md)). In `toPressureAltitude` geht der **ungerundete**
  `qnhHpa` ein, nicht `settableQnhHpa` — sonst brächte die Rundung des einen
  Vorschlags einen Sprung in den anderen.
- **W-08**: Die Oberfläche zerlegt keinen Wind. Sie kennt die Bahnrichtungen,
  aber keine Winkelfunktion (C-09).
- **W-09**: Ein abgewähltes Kästchen lässt seinen Regler **und** dessen
  bisherigen Herkunftsvermerk unverändert. Abwählen ist kein Zurücksetzen.
- **W-10**: Der Regler für die Streckenwindkomponente wird vom Abruf nicht
  berührt (FR-020) — er kommt im Dialog nicht vor.

## Nicht Teil dieses Vertrags

- Der MCP-Zugang. `apps/mcp` wird nicht angefasst; `toIsaDeviation` und
  `toRunwayWindComponent` stehen einem Chat-Agenten über das Kernpaket ohnehin
  offen — genau das ist der Zweck von Prinzip IV.
- Die Anzeige der Seitenwindkomponente. Der Kern liefert sie, die Oberfläche
  zeigt sie in diesem Feature nicht.
- Andere Plätze als EDSH.

## Nachtrag: gegen welchen Wert die Übernehmbarkeit geprüft wird

Geprüft wird der **übernehmbare** Wert (`settable…`), nicht der ungerundete.

Das ist keine Kleinigkeit. Ein Rückenwind von 10,06 kt rundet auf 10 kt und
liegt damit genau auf der unteren Reglergrenze aus Feature 026 — also innerhalb.
Wer gegen den ungerundeten Wert prüfte, sperrte eine Zeile, deren Wert sich
sehr wohl setzen ließe, und der Pilot sähe eine Begründung, die auf dem
angezeigten Wert nicht nachvollziehbar ist.

Dieselbe Regel gilt bereits für den QNH aus Feature 025 und wird hier nur auf
die beiden neuen Größen ausgedehnt.
