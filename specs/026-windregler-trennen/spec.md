# Feature Specification: Windkomponente in „Pistenwind" und „Streckenwindkomponente" aufteilen

**Feature Branch**: `026-windregler-trennen`

**Created**: 2026-08-11

**Status**: Draft

**Input**: Der Rechner hat heute genau einen Windregler „Windkomponente (kt,
positiv = Gegenwind)". Sein Wert geht unverändert in zwei fachlich verschiedene
Rechnungen: in die Startstrecke (Wind auf der Bahn 10/28) und in
Kraftstoffbedarf/Reiseleistung (Wind entlang der Strecke in Reiseflughöhe). Der
Regler wird in zwei eigenständige Regler aufgeteilt: „Pistenwind" beim
Bahnzustand und „Streckenwindkomponente" bei der Streckenlänge.

**Issue**: [#26](https://github.com/edsh/bucky/issues/26)

## Clarifications

### Session 2026-08-11

- **F: Bekommen beide Regler denselben Wertebereich?**
  A: Nein. Der Pistenwind übernimmt den Bereich, den der Kern für die
  Startstrecke ohnehin schon führt (−10…50 kt); die Streckenwindkomponente
  behält den bisherigen Bereich (−50…50 kt). Der Ausgangstext des Issues
  verlangte einen gemeinsamen Bereich — das war nicht haltbar, weil der Kern
  bereits zwei verschiedene führt und ein gemeinsamer Regler zwangsläufig einen
  der beiden verletzt.

- **F: Woher kommt die Grenze von 10 kt Rückenwind?**
  A: Aus der Startstreckentabelle, nicht aus den Betriebsgrenzen. Das
  Original-POH der 172N nennt in Abschnitt 2 (LIMITATIONS) überhaupt keinen
  Windwert. Die einzigen Windangaben im Handbuch sind der demonstrierte
  Seitenwind von 15 kt (Seite 4-20, „CROSSWIND LANDING" — ausdrücklich
  pilotenabhängig, und eine Quer- statt einer Längskomponente, also für diesen
  Regler die falsche Größe) und die Anmerkung 3 zu Abb. 5-4 auf Seite 5-12:
  „For operation with tailwinds up to 10 knots". Jenseits davon weist das
  Handbuch schlicht keine Werte aus. Der Regler lässt deshalb nicht zu, wonach
  nicht gerechnet werden kann.

- **F: Wird der eine Wert aus dem anderen abgeleitet oder vorbelegt?**
  A: Nein. Beide Regler starten mit demselben Anfangswert wie der heutige
  Regler und sind danach vollständig unabhängig. Eine Kopplung würde genau die
  Vermischung wiederherstellen, die dieses Feature auflöst.

- **F: Was passiert mit der erklärenden Kernmeldung ab 11 kt Rückenwind?**
  A: Sie bleibt im Kern und bleibt dort geprüft, ist über die Oberfläche aber
  nicht mehr auslösbar — der Regler endet vorher. Das ist der beabsichtigte
  Preis der engeren Grenze: Statt einer Fehlermeldung nach der Eingabe steht
  die Grenze schon am Regler.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Bodenwind und Höhenwind getrennt angeben (Priority: P1)

Ein Pilot bereitet einen Flug ab EDSH vor. Am Platz weht es mit 8 kt fast
genau die Bahn 28 herunter, auf der Strecke in 4500 ft steht laut Vorhersage
ein Gegenwind von 25 kt. Er stellt beim Bahnzustand einen Pistenwind von 8 kt
ein und bei der Streckenlänge eine Streckenwindkomponente von 25 kt. Beide
Ergebnisse — Startstrecke und Kraftstoffbedarf — rechnen ab sofort mit der
Größe, die zu ihnen gehört.

**Why this priority**: Das ist der gesamte Zweck des Features. Ohne diese
Trennung muss der Pilot sich für einen Kompromisswert entscheiden oder den
Regler zwischen zwei Ablesungen hin- und herstellen — beides führt dazu, dass
mindestens eines der beiden Ergebnisse mit einer falschen Zahl gerechnet ist.

**Independent Test**: Zwei verschiedene Werte einstellen und prüfen, dass
Startstrecke und Kraftstoffbedarf sich unabhängig voneinander ändern.

**Acceptance Scenarios**:

1. **Given** Pistenwind 8 kt und Streckenwindkomponente 25 kt, **When** der
   Pistenwind auf 0 kt gezogen wird, **Then** ändert sich die Startstrecke, der
   ausgewiesene Kraftstoffbedarf bleibt unverändert.
2. **Given** dieselbe Ausgangslage, **When** die Streckenwindkomponente auf
   0 kt gezogen wird, **Then** ändern sich Kraftstoffbedarf und Reisezeit, die
   Startstrecke bleibt unverändert.
3. **Given** der Rechner wird frisch geöffnet, **When** nichts verstellt wird,
   **Then** stehen beide Regler auf demselben Anfangswert, den der bisherige
   eine Regler hatte.

---

### User Story 2 - Den Regler dort finden, wo er wirkt (Priority: P2)

Ein Pilot sucht die Windangabe für die Startstrecke. Er findet sie unmittelbar
bei den übrigen Angaben zur Bahn — im selben Bereich wie „Trockenes Gras" und
„Nass oder Schnee" — und nicht mehr in einem Sammelbereich weiter oben, dessen
Werte teils für den Start und teils für die Strecke gelten.

**Why this priority**: Die räumliche Trennung ist das, was die fachliche
Trennung im Gebrauch überhaupt sichtbar macht. Zwei gleich benannte Regler
untereinander im selben Bereich wären verwechselbar; zwei verschieden benannte
Regler an den Stellen, an denen sie wirken, sind es nicht.

**Independent Test**: Prüfen, dass der Bereich oben nur noch die Platzhöhe
enthält und entsprechend heißt, und dass die beiden neuen Regler in den
richtigen Bereichen stehen.

**Acceptance Scenarios**:

1. **Given** die geöffnete Seite, **When** der obere Eingabebereich betrachtet
   wird, **Then** heißt er „Platzhöhe" und enthält nur noch den Höhenregler.
2. **Given** die geöffnete Seite, **When** der Bereich „Roll- und Startstrecke"
   betrachtet wird, **Then** steht dort ein Regler „Pistenwind (kt, positiv =
   Gegenwind)".
3. **Given** die geöffnete Seite, **When** der Bereich „Kraftstoffbedarf und
   Geschwindigkeiten" betrachtet wird, **Then** steht dort neben der
   Streckenlänge ein Regler „Streckenwindkomponente (kt, positiv = Gegenwind)".

---

### User Story 3 - Die Grenze schon am Regler sehen (Priority: P3)

Ein Pilot zieht den Pistenwind in den Rückenwindbereich. Der Regler lässt ihn
bis 10 kt Rückenwind und nicht weiter — genau so weit, wie die
Startstreckentabelle des Handbuchs reicht. Er muss keinen Wert eingeben, um
anschließend zu erfahren, dass dafür keine Zahlen vorliegen.

**Why this priority**: Nützlich, aber nicht der Kern des Features. Bis heute
erklärt eine Meldung nach der Eingabe dasselbe.

**Independent Test**: Den Pistenwindregler an sein unteres Ende ziehen und den
erreichten Wert ablesen.

**Acceptance Scenarios**:

1. **Given** der Pistenwindregler, **When** er an sein unteres Ende gezogen
   wird, **Then** steht er auf −10 kt.
2. **Given** der Regler für die Streckenwindkomponente, **When** er an sein
   unteres Ende gezogen wird, **Then** steht er auf −50 kt und der
   Kraftstoffbedarf wird weiterhin ausgewiesen.

---

### Edge Cases

- Was passiert bei genau −10 kt Pistenwind? Die Startstrecke wird ausgewiesen;
  −10 kt liegt noch innerhalb der Tabelle (Anmerkung 3 nennt „up to 10 knots").
- Was passiert, wenn die Streckenwindkomponente den Bedarf unerfüllbar macht
  (etwa −50 kt auf 750 NM)? Wie bisher: Der Kraftstoffbedarf zeigt die Meldung
  des Kerns, die Startstrecke bleibt davon unberührt.
- Was, wenn ein Wert im Kern außerhalb des Reglerbereichs ankäme? Die Prüfungen
  des Kerns bleiben unverändert bestehen; die Reglergrenze ist eine zusätzliche,
  keine ersetzende Schranke.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Der bisherige einzelne Windregler MUSS aus dem oberen
  Eingabebereich verschwinden; dieser Bereich MUSS danach „Platzhöhe" heißen
  und nur noch den Höhenregler enthalten.
- **FR-002**: Im Bereich der Roll- und Startstrecke MUSS ein Regler
  „Pistenwind (kt, positiv = Gegenwind)" stehen, dessen Wert ausschließlich in
  die Startstreckenrechnung eingeht.
- **FR-003**: Im Bereich des Kraftstoffbedarfs MUSS neben der Streckenlänge ein
  Regler „Streckenwindkomponente (kt, positiv = Gegenwind)" stehen, dessen Wert
  ausschließlich in Kraftstoffbedarf und Reiseleistung eingeht.
- **FR-004**: Der Pistenwindregler MUSS den Wertebereich führen, den der Kern
  für die Startstrecke ausweist (−10…50 kt, ganze Knoten). Der Bereich MUSS vom
  Kern bezogen und nicht in der Oberfläche festgeschrieben werden.
- **FR-005**: Der Regler für die Streckenwindkomponente MUSS den bisherigen
  Wertebereich unverändert führen (−50…50 kt, ganze Knoten), ebenfalls vom Kern
  bezogen.
- **FR-006**: Beide Regler MÜSSEN dieselbe Zahlendarstellung verwenden wie der
  bisherige Regler (ganze Knoten, Vorzeichen für Rückenwind).
- **FR-007**: Beide Regler MÜSSEN beim Öffnen der Seite auf demselben Wert
  stehen, auf dem der bisherige eine Regler stand.
- **FR-008**: Eine Änderung an einem der beiden Regler DARF den jeweils anderen
  nicht verändern.
- **FR-009**: Ein Fehler in einer der beiden Rechnungen DARF die jeweils andere
  nicht mitreißen — die bestehende Trennung der Ergebnisbereiche bleibt.
- **FR-010**: Die Berechnungslogik DARF sich durch dieses Feature nicht ändern.
  Es entsteht keine neue Rechnung, keine neue Umrechnung und keine neue Rundung.

### Key Entities

- **Pistenwind**: Windkomponente entlang der Bahnachse am Startplatz, in
  Knoten, positiv als Gegenwind. Wirkt allein auf die Startstrecke.
- **Streckenwindkomponente**: Windkomponente entlang der Reisestrecke in
  Reiseflughöhe, in Knoten, positiv als Gegenwind. Wirkt allein auf
  Kraftstoffbedarf und Reiseleistung.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Ein Pilot kann für Start und Strecke zwei verschiedene Windwerte
  angeben, ohne einen Regler zwischen zwei Ablesungen hin- und herzustellen.
- **SC-002**: Bei unveränderter Streckenwindkomponente bleiben Kraftstoffbedarf
  und Reisezeit unverändert, gleichgültig wie der Pistenwind verstellt wird —
  und umgekehrt.
- **SC-003**: Bei identischen Werten in beiden Reglern liefert der Rechner
  dieselben Zahlen wie vor der Umstellung; kein Ergebnis verschiebt sich.
- **SC-004**: Jeder der beiden Regler steht in demselben Bereich wie das
  Ergebnis, auf das er wirkt.

## Out of Scope

- Keine automatische Ableitung des einen Werts aus dem anderen.
- Kein Onlineabruf für einen der beiden Werte — der Abruf des Pistenwinds ist
  Gegenstand von Issue #27, das diesen Regler voraussetzt.
- Keine Erfassung der Seitenwindkomponente und keine Warnung zum demonstrierten
  Seitenwind von 15 kt. Der Befund aus dem Handbuch ist hier festgehalten, aber
  eine Seitenwindanzeige braucht eine eigene fachliche Entscheidung
  (Bahnrichtung, Windrichtung, Darstellung).
- Keine Änderung an Wertebereichen, Meldungen oder Rechenwegen des Kerns.

## Assumptions

- Der Kern führt beide Wertebereiche bereits (`getTakeoffInputDomain()` und
  `getFuelPlanInputDomain()`); dieses Feature bezieht sie nur, es definiert
  keine neuen.
- Die erklärende Kernmeldung zu mehr als 10 kt Rückenwind bleibt bestehen und
  bleibt im Kern geprüft, auch wenn sie über die Oberfläche nicht mehr
  ausgelöst werden kann.
- Der Anfangswert beider Regler bleibt der heutige Wert des einen Reglers; er
  liegt in beiden neuen Bereichen.
