# Feature Specification: Außentemperatur statt ISA-Abweichung, Wetterabruf an allen Reglern, Winde nach oben

**Feature Branch**: `031-aussentemperatur-und-anordnung`

**Created**: 2026-08-11

**Status**: Draft

**Input**: Issue [#31](https://github.com/edsh/bucky/issues/31) — Eingaben umordnen, Außentemperatur statt ISA-Abweichung, Wetterabruf an allen drei Reglern

## Worum es geht

Sieben Änderungen, die alle dasselbe Ziel haben: Der Pilot soll die Eingaben in
der Form vorfinden, in der er sie am Platz **hat** — nicht in der Form, in der
das Handbuch sie braucht. Die Umrechnung dazwischen ist Sache der Anwendung.

Der deutlichste Fall ist die Temperatur. Am Platz liest man 29 °C ab; die
Handbuchtabelle will eine ISA-Abweichung von 16 °C. Bisher musste der Pilot
diese Umrechnung im Kopf machen, obwohl die Anwendung sie längst beherrscht.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Temperatur eingeben, wie man sie abliest (Priority: P1)

Der Pilot liest am Platz 29 °C ab — vom Thermometer, aus dem ATIS oder aus der
Wetter-App. Er stellt diesen Wert ein. Unter dem Regler steht, welche
ISA-Abweichung daraus folgt, damit er die Zeile in der Handbuchtabelle
wiederfindet.

**Why this priority**: Es ist die einzige Eingabe, die der Pilot bisher
umrechnen musste, bevor er sie eintragen konnte. Alle anderen Regler nehmen
Werte entgegen, die man direkt ablesen kann. Die Umrechnung im Kopf ist genau
die Art Zwischenschritt, bei dem Fehler entstehen — und ein Temperaturfehler
verschiebt die Startstrecke spürbar.

**Independent Test**: Temperatur einstellen und prüfen, dass die abgeleitete
ISA-Abweichung darunter erscheint und die Ergebnisse dieselben sind wie zuvor
bei direkter Eingabe der Abweichung.

**Acceptance Scenarios**:

1. **Given** die Platzhöhe steht auf 971 ft und der Luftdruck auf 1023 hPa,
   **When** der Pilot die Außentemperatur auf 29 °C stellt, **Then** erscheint
   unter dem Regler die daraus folgende ISA-Abweichung, und Startstrecke wie
   Reiseleistung rechnen mit ihr.
2. **Given** eine eingestellte Außentemperatur, **When** der Pilot die
   Platzhöhe oder den Luftdruck verstellt, **Then** ändert sich die abgeleitete
   ISA-Abweichung — die Temperatur bleibt stehen, denn sie ist die Messung.
3. **Given** eine Außentemperatur, aus der eine ISA-Abweichung außerhalb des
   rechenbaren Bereichs folgt, **When** der Pilot sie einstellt, **Then**
   erfährt er den Grund, statt ein stillschweigend falsches Ergebnis zu sehen.

---

### User Story 2 - Wetterwerte an dem Regler abrufen, um den es geht (Priority: P1)

Der Pilot will den Pistenwind aus dem Netz holen. Bisher musste er dafür den
Knopf am Luftdruckregler finden — an einer anderen Stelle der Seite, in einem
anderen Bereich.

**Why this priority**: Der Dialog holt und setzt seit Feature 027 alle drei
Größen. Dass er nur an **einem** der drei Regler zu erreichen ist, ist ein
Rest aus der Zeit, als er nur den Luftdruck konnte. Wer den Pistenwind sucht,
sucht ihn beim Pistenwind.

**Independent Test**: Von jedem der drei Regler aus den Dialog öffnen und
prüfen, dass er sich gleich verhält und dieselben drei Vorschläge zeigt.

**Acceptance Scenarios**:

1. **Given** die Seite ist geladen, **When** der Pilot den Knopf „EDSH" am
   Temperatur- oder am Pistenwindregler drückt, **Then** öffnet sich derselbe
   Dialog mit denselben drei Zeilen wie vom Luftdruckregler aus.
2. **Given** der Dialog wurde vom Pistenwindregler aus geöffnet, **When** der
   Pilot „Übernehmen" drückt, **Then** werden alle angehakten Größen gesetzt —
   nicht nur der Pistenwind.

---

### User Story 3 - Die Bahnwahl dort, wo sie hingehört (Priority: P2)

Im Dialog steht die Wahl zwischen Bahn 10 und 28 bisher über allen drei Zeilen.
Sie betrifft aber nur eine davon.

**Why this priority**: Eine Auswahl, die über allem steht, sieht aus, als
beträfe sie alles. Beim Luftdruck und bei der Temperatur ist die Bahn
bedeutungslos — dort weckt sie den Verdacht, sie täte etwas.

**Independent Test**: Dialog öffnen und prüfen, dass die Bahnwahl innerhalb der
Windzeile steht und die anderen beiden Zeilen unberührt lässt.

**Acceptance Scenarios**:

1. **Given** der Dialog zeigt drei Vorschläge, **When** der Pilot ihn
   betrachtet, **Then** steht die Bahnwahl innerhalb der Windzeile.
2. **Given** die Windzeile ist gesperrt, weil kein Wind geliefert wurde,
   **When** der Pilot den Dialog betrachtet, **Then** erscheint auch keine
   Bahnwahl — es gibt nichts zu wählen.

---

### User Story 4 - Die beiden Winde nebeneinander sehen (Priority: P2)

Pistenwind und Streckenwindkomponente sind zwei verschiedene Größen mit
ähnlichem Namen. Sie sollen auf einer Höhe stehen, damit der Unterschied ins
Auge fällt.

**Why this priority**: Feature 026 hat die beiden Größen getrennt, weil ihre
Vermischung die Startstrecke verfälschte. Die Anordnung ist die Fortsetzung
dieser Trennung mit den Mitteln des Auges: Zwei Regler nebeneinander, die
verschiedene Werte tragen, sind sichtbar zwei Regler.

**Independent Test**: Auf einem breiten Bildschirm prüfen, dass beide
Windregler jeweils zuoberst in ihrem Bereich stehen.

**Acceptance Scenarios**:

1. **Given** ein breiter Bildschirm, auf dem beide Bereiche nebeneinander
   stehen, **When** der Pilot sie betrachtet, **Then** steht in jedem der
   beiden Bereiche der Windregler an erster Stelle.
2. **Given** ein breiter Bildschirm, **When** der Pilot den Kraftstoffbereich
   betrachtet, **Then** stehen Streckenwindkomponente und Streckenlänge
   untereinander, nicht nebeneinander.

---

## Requirements *(mandatory)*

### Außentemperatur

- **FR-001**: Die Oberfläche MUSS anstelle des Reglers „ISA-Abweichung" einen
  Regler für die **Außentemperatur am Platz** führen.
- **FR-002**: Unter diesem Regler MUSS die daraus abgeleitete ISA-Abweichung
  stehen, in derselben Machart wie die Druckhöhe unter der Platzhöhe.
- **FR-003**: Die Umrechnung MUSS die **Platzdruckhöhe** zugrunde legen — also
  Platzhöhe und eingestellten Luftdruck. Sie MUSS sich ändern, wenn eine dieser
  beiden Größen sich ändert.
- **FR-004**: Die abgeleitete ISA-Abweichung MUSS unverändert in **beide**
  Rechnungen eingehen: Startstrecke und Reiseleistung. Der Wechsel der Eingabe
  DARF an den Ergebnissen nichts ändern.
- **FR-005**: Führt eine eingestellte Temperatur zu einer ISA-Abweichung
  außerhalb des rechenbaren Bereichs, MUSS der Pilot den Grund erfahren.
- **FR-006**: Der Wertebereich des Temperaturreglers MUSS aus der
  Berechnungsgrundlage stammen und DARF nicht in der Oberfläche festgelegt
  werden.

### Wetterabruf an allen drei Reglern

- **FR-007**: Der Temperaturregler und der Pistenwindregler MÜSSEN je einen
  Knopf „EDSH" tragen, in derselben Gestalt wie der am Luftdruckregler.
- **FR-008**: Alle drei Knöpfe MÜSSEN denselben Dialog mit demselben Verhalten
  öffnen. Es DARF keinen zweiten Dialog und keinen abweichenden Ablauf geben.
- **FR-009**: Der Abruf MUSS unabhängig davon, von welchem Knopf aus er
  gestartet wurde, alle drei Größen holen und zur Auswahl stellen.
- **FR-010**: Der Dialog MUSS die Temperatur als **Außentemperatur** vorschlagen
  und nicht mehr als ISA-Abweichung — das ist die Größe, die der Regler
  entgegennimmt.

### Dialog

- **FR-011**: Die Bahnwahl MUSS innerhalb der Windzeile stehen.
- **FR-012**: Ist die Windzeile gesperrt, DARF keine Bahnwahl erscheinen.
- **FR-013**: Die Windzeile MUSS den Hinweis tragen, dass ein positiver Wert
  Gegenwind bedeutet — dieselbe Angabe, die auch am Regler steht.
- **FR-014**: Ein Bahnwechsel MUSS weiterhin allein den Windvorschlag neu
  rechnen, ohne einen neuen Abruf auszulösen und ohne Kästchen zurückzusetzen.

### Anordnung

- **FR-015**: Im Bereich „Kraftstoffbedarf und Geschwindigkeiten" MÜSSEN
  Streckenwindkomponente und Streckenlänge **untereinander** stehen, auf jeder
  Bildschirmbreite.
- **FR-016**: Die Streckenwindkomponente MUSS in diesem Bereich an erster
  Stelle stehen.
- **FR-017**: Der Pistenwind MUSS im Bereich „Roll- und Startstrecke" an
  erster Stelle stehen.
- **FR-018**: Stehen beide Bereiche nebeneinander, MÜSSEN die beiden Windregler
  auf einer Höhe liegen.

### Unverändert

- **FR-019**: Die Trennung der beiden Windgrößen aus Feature 026 bleibt
  unangetastet. Kein Regler DARF den anderen beeinflussen.
- **FR-020**: Die Herkunftsvermerke aus Feature 027 bleiben je Regler getrennt
  und verschwinden weiterhin nur beim eigenhändigen Verstellen genau dieses
  Reglers.
- **FR-021**: Der Abruf geschieht weiterhin ausschließlich auf Knopfdruck.
  Ohne Netz bleibt die Seite vollständig bedienbar.

---

## Success Criteria *(mandatory)*

- **SC-001**: Bei gleicher Wetterlage liefert die Anwendung nach der Umstellung
  dieselben Zahlen für Startstrecke, Kraftstoffbedarf und Reiseleistung wie
  davor. Der Wechsel der Eingabegröße ändert kein Ergebnis.
- **SC-002**: Der Pilot kann eine abgelesene Temperatur eingeben, ohne
  unterwegs eine Umrechnung vorzunehmen, und sieht die für die Handbuchtabelle
  nötige ISA-Abweichung trotzdem.
- **SC-003**: Von jedem der drei Regler aus führt der Knopf „EDSH" zu demselben
  Ergebnis; kein Weg ist bevorzugt oder eingeschränkt.
- **SC-004**: Auf einem breiten Bildschirm stehen die beiden Windregler auf
  einer Höhe und tragen sichtbar verschiedene Beschriftungen.
- **SC-005**: Im Dialog erscheint die Bahnwahl an keiner Stelle, an der sie
  ohne Wirkung wäre.

---

## Edge Cases

- **Temperatur außerhalb des Rechenbereichs**: Der Regler lässt keine
  Temperatur zu, aus der eine unrechenbare Abweichung folgte — oder, wo das an
  der veränderlichen Platzdruckhöhe scheitert, erklärt die Anwendung den Grund.
  Ein stillschweigend falsches Ergebnis darf es nicht geben.
- **Platzhöhe verstellt bei stehender Temperatur**: Die Temperatur bleibt, die
  abgeleitete Abweichung wandert. Das ist richtig so: Die Temperatur ist die
  Messung, die Abweichung die Folgerung.
- **Abruf ohne Temperatur**: Wie bisher — die Zeile ist gesperrt, die anderen
  bleiben übernehmbar.
- **Abruf ohne Wind**: Windzeile gesperrt, und mit ihr entfällt die Bahnwahl.
- **Schmaler Bildschirm**: Die Bereiche stehen ohnehin untereinander; die
  Reihenfolge innerhalb jedes Bereichs bleibt dieselbe.

---

## Assumptions

- **Der Standardgradient gilt.** Die aus der Platztemperatur abgeleitete
  ISA-Abweichung wird auch für die Reiseflughöhe verwendet. Das ist die
  bisherige und die gängige Annahme; sie ist der Grund, warum die
  ISA-Abweichung überhaupt eine brauchbare Eingabe für den ganzen Flug ist.
  Eine tatsächlich abweichende Temperaturschichtung bildet die Anwendung nicht
  ab — sie tat es vorher auch nicht.
- **Ein einziger Dialog.** Die drei Knöpfe unterscheiden sich nicht; es gibt
  keinen „nur den Wind holen"-Modus. Wer weniger will, wählt im Dialog ab.
- **Die Bahnwahl bleibt in ihrem Verhalten unverändert**, sie wechselt nur den
  Platz.
- **Kein neuer Wetterwert.** Der Dienst liefert bereits alles Nötige; die
  Anfrage ändert sich nicht.

---

## Out of Scope

- Eine getrennte Temperatur für die Reiseflughöhe.
- Die Anzeige der Seitenwindkomponente.
- Andere Plätze als EDSH.
- Der MCP-Zugang.
- Eine Schnellwahl für die Temperatur ohne Netz (etwa „Normtemperatur").

---

## Key Entities

- **Außentemperatur am Platz** — die neue Eingabegröße. In °C, ablesbar am
  Platz. Ersetzt die ISA-Abweichung als *Eingabe*, nicht als *Rechengröße*.
- **Abgeleitete ISA-Abweichung** — die Folgerung aus Temperatur und
  Platzdruckhöhe. Bleibt die Größe, mit der die Handbuchtabellen arbeiten, und
  bleibt deshalb sichtbar.
- **Wetterabrufdialog** — unverändert in Zweck und Ablauf; er wird nur von drei
  Stellen aus erreichbar, schlägt die Temperatur absolut statt als Abweichung
  vor und trägt die Bahnwahl innerhalb der Windzeile.

---

## Bezug zur Constitution

- **Prinzip I**: Die Umrechnung Temperatur ↔ ISA-Abweichung ist eine Rechnung
  im sicherheitskritischen Sinn und gehört in den Rechenkern. Die
  Quellenreferenz der verwendeten Tabellen bleibt unberührt — es kommt keine
  neue Tabelle hinzu, nur eine andere Eingangsgröße für dieselbe.
- **Prinzip IV**: Der Wertebereich des Temperaturreglers und die Umrechnung
  stammen aus dem Kern. Die Oberfläche legt keine Grenze fest und rechnet
  nicht selbst (FR-006).
