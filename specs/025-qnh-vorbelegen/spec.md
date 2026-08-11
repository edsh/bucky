# Feature Specification: QNH für EDSH aus einem Onlinedienst vorbelegen

**Feature Branch**: `025-qnh-vorbelegen`

**Created**: 2026-08-11

**Status**: Draft

**Input**: Im Fieldset „Grundbedingungen" bekommt der „Luftdruck QNH" ebenfalls
einen kleinen Button „EDSH" — wie unten bei der Platzhöhe auch. Ein Klick öffnet
einen Bestätigungsdialog, der erklärt, dass aktuelle Daten von einem
Onlinedienst geladen werden und dass diese unverbindlich sind; es ist reine
Bequemlichkeit. Im Dialog wird das laufende Laden angezeigt. Sobald der Wert
vorliegt, erscheint der ermittelte QNH als Vorschau. Er lässt sich mit
„Übernehmen" übernehmen oder mit „Abbrechen" verwerfen.

**Issue**: [#25](https://github.com/edsh/bucky/issues/25)

## Clarifications

### Session 2026-08-11

Die Fragen betreffen die Grenze zwischen Bequemlichkeit und
sicherheitskritischer Angabe. Sie sind hier entschieden, weil jede Auslegung
unmittelbar auf die Druckhöhe und damit auf Startstrecke und Kraftstoffbedarf
durchschlägt (Prinzip I).

- **F: Ab wann wird geladen — beim Öffnen des Dialogs oder erst nach einer
  Bestätigung?**
  A: Beim Öffnen. Der Dialog ist die Bestätigung *vor der Übernahme*, nicht vor
  dem Abruf. Anders ließe sich kein Vorschauwert zeigen, und genau der ist die
  Grundlage für die Entscheidung des Piloten. Der Abruf selbst ist folgenlos: Er
  verändert keine Eingabe, solange nicht „Übernehmen" gedrückt wird.

- **F: Auf welchen Wert wird gerundet, und in welche Richtung?**
  A: Auf ganze hPa **abgerundet**. Der Regler kennt ohnehin nur ganze hPa.
  Abgerundet wird aus zwei Gründen: Es ist die Richtung, in die auch ein METAR
  abschneidet (aus 1023,7 wird Q1023), und sie ist die sichere — ein zu niedrig
  angesetzter QNH ergibt eine größere Druckhöhe und damit eine längere
  ausgewiesene Startstrecke und einen höheren Verbrauch. Der ungerundete Wert
  wird im Dialog mit angezeigt, damit die Abweichung sichtbar bleibt.

- **F: Ersetzt der abgerufene Wert die Handeingabe dauerhaft?**
  A: Nein. Die Übernahme setzt den Regler ein einziges Mal; danach ist der Wert
  ein gewöhnlicher Reglerwert und jederzeit überschreibbar. Es gibt keine
  laufende Aktualisierung und keine Sperre des Reglers.

- **F: Werden Temperatur und Wind mit vorbelegt?**
  A: Nicht in diesem Feature. Der Abruf liefert sie zwar mit, aber die
  Oberfläche führt keine Platztemperatur, sondern eine ISA-Abweichung, und der
  Wind ist eine Komponente gegen die Bahn — beides braucht eigene fachliche
  Entscheidungen. Siehe „Out of Scope".

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Den Luftdruck ohne Abtippen setzen (Priority: P1)

Ein Pilot bereitet zu Hause oder am Platz einen Flug ab EDSH vor. Statt den
aktuellen Luftdruck erst nachzuschlagen und dann den Regler von 1013 auf den
richtigen Wert zu ziehen, drückt er neben „Luftdruck QNH" auf „EDSH". Ein Dialog
öffnet sich, holt die aktuellen Daten, zeigt den ermittelten QNH, und mit
„Übernehmen" steht er im Regler. Alle abgeleiteten Größen — Druckhöhe,
Startstrecke, Kraftstoffbedarf — rechnen sich damit neu.

**Why this priority**: Es ist der eigentliche Zweck des Features. Ohne diese
Geschichte gibt es kein Feature.

**Independent Test**: Vollständig prüfbar, indem der Button gedrückt, der Dialog
bestätigt und anschließend der Reglerwert gegen den im Dialog gezeigten Wert
gehalten wird.

**Acceptance Scenarios**:

1. **Given** der QNH-Regler steht auf 1013, **When** der Pilot „EDSH" drückt,
   **Then** öffnet sich ein Dialog, der erklärt, dass Daten von einem
   Onlinedienst geladen werden, und der das laufende Laden erkennbar anzeigt.
2. **Given** der Dialog hat einen Wert erhalten, **When** der Pilot ihn liest,
   **Then** steht dort der ermittelte QNH in ganzen hPa als Vorschau, dazu der
   ungerundete Wert und die Gültigkeitszeit.
3. **Given** die Vorschau steht, **When** der Pilot „Übernehmen" drückt,
   **Then** schließt der Dialog und der QNH-Regler steht auf dem gezeigten
   ganzzahligen Wert.
4. **Given** die Vorschau steht, **When** der Pilot „Abbrechen" drückt,
   **Then** schließt der Dialog und der Regler steht unverändert auf seinem
   vorherigen Wert.
5. **Given** ein Wert wurde übernommen, **When** der Pilot den Regler
   anschließend selbst verstellt, **Then** gilt sein Wert; es findet keine
   erneute Abfrage und keine Rücksetzung statt.

---

### User Story 2 - Erkennen, was der Wert wert ist (Priority: P1)

Ein Pilot soll den vorbelegten Wert nicht für eine Messung am Platz halten. Der
Dialog sagt ihm vor der Übernahme, woher der Wert stammt, dass es ein Rechenwert
eines Wettermodells ist und dass vor dem Flug das ATIS gilt. Nach der Übernahme
bleibt am Regler erkennbar, dass der Wert nicht von Hand gesetzt wurde.

**Why this priority**: Gleichrangig mit US1. Ein bequem gesetzter, aber für eine
Messung gehaltener Luftdruck ist schlechter als gar keine Bequemlichkeit —
Prinzip I verlangt, dass die Herkunft eines sicherheitsrelevanten Werts sichtbar
bleibt.

**Independent Test**: Prüfbar, indem der Dialog geöffnet und sein Text sowie die
Kennzeichnung am Regler nach der Übernahme gelesen werden.

**Acceptance Scenarios**:

1. **Given** der Dialog ist offen, **When** der Pilot ihn liest, **Then** nennt
   er den Dienst als Quelle, weist den Wert als unverbindlichen Vorschlag aus
   und verweist auf das ATIS als maßgebliche Angabe vor dem Flug.
2. **Given** ein Wert wurde übernommen, **When** der Pilot auf den QNH-Regler
   schaut, **Then** ist erkennbar, dass der Wert aus dem Abruf stammt, samt
   Gültigkeitszeit.
3. **Given** ein übernommener Wert steht im Regler, **When** der Pilot ihn
   selbst verstellt, **Then** verschwindet diese Kennzeichnung.

---

### User Story 3 - Ohne Netz weiterarbeiten (Priority: P2)

Am Platz ist das Netz schlecht oder der Dienst antwortet nicht. Der Pilot merkt
das im Dialog, bricht ab und stellt den Luftdruck wie bisher von Hand ein. Der
Rechner selbst funktioniert unverändert weiter.

**Why this priority**: Bequemlichkeit darf nie zur Voraussetzung werden. Ohne
diese Geschichte wäre der Rechner am Platz — dort, wo er gebraucht wird —
verletzlicher als vorher.

**Independent Test**: Prüfbar, indem der Abruf fehlschlägt (Netz aus, Fehler
oder Zeitüberschreitung) und anschließend die Bedienbarkeit der Seite geprüft
wird.

**Acceptance Scenarios**:

1. **Given** kein Netz oder der Dienst antwortet nicht, **When** der Pilot den
   Dialog öffnet, **Then** erscheint nach spätestens 10 Sekunden eine
   verständliche Meldung statt einer Vorschau.
2. **Given** der Abruf ist fehlgeschlagen, **When** der Pilot den Dialog
   betrachtet, **Then** ist „Übernehmen" nicht auswählbar und der Dialog lässt
   sich schließen sowie der Abruf erneut auslösen.
3. **Given** der Abruf ist fehlgeschlagen, **When** der Pilot den Dialog
   schließt, **Then** steht der QNH-Regler unverändert und alle übrigen
   Funktionen der Seite arbeiten weiter.
4. **Given** der Dienst antwortet mit einem unbrauchbaren oder unvollständigen
   Ergebnis, **When** der Dialog es prüft, **Then** wird es wie ein Fehlschlag
   behandelt und nicht als Vorschau angezeigt.

---

### Edge Cases

- **Der errechnete QNH liegt außerhalb des Reglerbereichs (950 bis 1050 hPa).**
  Der Dialog zeigt den Wert, weist ihn als außerhalb des einstellbaren Bereichs
  aus und bietet keine Übernahme an. Stillschweigend auf die Grenze zu setzen
  wäre falsch — der Pilot bekäme einen anderen Wert als den gezeigten.
- **Der Pilot drückt „EDSH" zweimal.** Es entsteht kein zweiter Dialog und kein
  zweiter Abruf, der den ersten überholen könnte.
- **Der Pilot schließt den Dialog, während noch geladen wird.** Ein danach
  eintreffendes Ergebnis verändert nichts.
- **Der Pilot hat den Regler bereits von Hand gesetzt.** Der Dialog übernimmt
  trotzdem erst auf ausdrückliche Bestätigung; ein vorhandener Wert wird nicht
  stillschweigend geschützt, aber auch nicht stillschweigend überschrieben.
- **Der Dienst liefert einen Zeitstempel, der deutlich zurückliegt.** Die Zeit
  wird angezeigt; die Beurteilung bleibt beim Piloten.
- **Bedienung ohne Maus.** Der Dialog ist mit der Tastatur erreichbar,
  schließbar und bestätigbar.

## Requirements *(mandatory)*

### Functional Requirements

**Oberfläche**

- **FR-001**: Neben der Beschriftung „Luftdruck QNH (hPa)" im Fieldset
  „Grundbedingungen" MUSS ein Button „EDSH" stehen, in Gestalt und Größe wie die
  bestehende Schnellwahl neben der Platzhöhe.
- **FR-002**: Ein Klick auf diesen Button MUSS einen Dialog öffnen, der die
  übrige Seite bis zu seiner Beantwortung überlagert.
- **FR-003**: Der Dialog MUSS vor jeder Übernahme erklären, dass die Werte von
  einem Onlinedienst geladen werden, dass es sich um einen unverbindlichen
  Vorschlag zur Bequemlichkeit handelt und dass vor dem Flug die Angabe aus dem
  ATIS gilt.
- **FR-004**: Der Dialog MUSS den laufenden Abruf sichtbar anzeigen, solange er
  dauert.
- **FR-005**: Sobald ein Ergebnis vorliegt, MUSS der Dialog den ermittelten QNH
  als Vorschau zeigen — in ganzen hPa als übernehmbaren Wert, dazu den
  ungerundeten Wert und die Gültigkeitszeit des Werts.
- **FR-006**: Der Dialog MUSS genau zwei Entscheidungen anbieten: „Übernehmen"
  setzt den gezeigten ganzzahligen Wert in den QNH-Regler und schließt den
  Dialog; „Abbrechen" schließt ihn, ohne etwas zu verändern.
- **FR-007**: „Übernehmen" MUSS unauswählbar sein, solange kein gültiger,
  übernehmbarer Wert vorliegt — also während des Ladens, nach einem Fehlschlag
  und bei einem Wert außerhalb des Reglerbereichs.
- **FR-008**: Der Dialog MUSS mit der Tastatur bedienbar sein: Der Tastaturfokus
  MUSS beim Öffnen in den Dialog wandern und ihn nicht verlassen, `Esc` MUSS wie
  „Abbrechen" wirken, und nach dem Schließen MUSS der Fokus auf den Button
  „EDSH" zurückkehren.
- **FR-009**: Nach einer Übernahme MUSS am QNH-Regler erkennbar bleiben, dass
  der Wert aus dem Abruf stammt, samt Gültigkeitszeit. Diese Kennzeichnung MUSS
  verschwinden, sobald der Pilot den Regler selbst verstellt.
- **FR-010**: Der Dialog MUSS den verwendeten Dienst namentlich nennen und auf
  ihn verweisen, so wie es dessen Nutzungsbedingungen verlangen.
- **FR-011**: Der Dialog MUSS ausweisen, dass der Wert aus einem Wettermodell
  stammt und keine Messung am Platz ist.

**Verhalten und Fehlerfälle**

- **FR-012**: Der Abruf MUSS mit dem Öffnen des Dialogs beginnen und ohne
  Zutun des Piloten ablaufen.
- **FR-013**: Der Abruf MUSS nach spätestens 10 Sekunden ohne Antwort
  abgebrochen und als Fehlschlag behandelt werden.
- **FR-014**: Bei Fehlschlag MUSS der Dialog eine verständliche Meldung zeigen
  und einen erneuten Versuch anbieten, ohne dass der Pilot den Dialog schließen
  muss.
- **FR-015**: Das System MUSS eine Antwort verwerfen, der die benötigten Größen
  fehlen oder die unplausible Werte enthält, und sie wie einen Fehlschlag
  behandeln.
- **FR-016**: Ein Fehlschlag oder ein Abbruch DARF den QNH-Regler und jede
  andere Eingabe NICHT verändern.
- **FR-017**: Die Seite MUSS ohne Netzverbindung in vollem Umfang bedienbar
  bleiben; der Abruf DARF weder beim Laden der Seite noch beim Rechnen
  stattfinden, sondern ausschließlich auf Druck des Buttons.
- **FR-018**: Ein zweiter Klick auf „EDSH" bei offenem Dialog DARF weder einen
  zweiten Dialog noch einen zweiten gleichzeitigen Abruf auslösen. Ein Ergebnis,
  das nach dem Schließen des Dialogs eintrifft, DARF nichts mehr verändern.

**Rechnung und Herkunft**

- **FR-019**: Die Umrechnung des abgerufenen Luftdrucks auf QNH MUSS im
  Kernmodul stattfinden. Die Oberfläche DARF NICHT rechnen, umrechnen oder
  runden (Prinzip IV).
- **FR-020**: Die Umrechnung MUSS die Standardatmosphäre verwenden — dieselben
  Konstanten und dieselbe Formel, mit der der Kern bereits die Druckhöhe
  herleitet. Eine zweite, abweichende Umrechnung DARF NICHT entstehen.
- **FR-021**: Das Kernmodul MUSS zu jedem umgerechneten Wert die Eingangsgrößen
  (verwendeter Luftdruck und zugehörige Höhe) und die Quellenreferenz der
  Standardatmosphäre mitliefern; die Oberfläche MUSS sie unverändert
  durchreichen (Prinzip I).
- **FR-022**: Das Kernmodul DARF NICHT selbst auf das Netz zugreifen. Das Holen
  der Daten ist Sache eines Adapters, der dem Kern nur Zahlen übergibt.
- **FR-023**: Ein auf einen Wert außerhalb der Standardatmosphäre oder einer
  unsinnigen Höhe angewandter Abruf MUSS zu einer Ablehnung führen, nicht zu
  einem stillschweigend gelieferten Wert.
- **FR-024**: Der übernehmbare Wert MUSS aus dem ungerundeten Ergebnis auf ganze
  hPa **abgerundet** werden.
- **FR-025**: Koordinaten und Höhe von EDSH MÜSSEN an einer einzigen Stelle
  geführt werden, gemeinsam mit der bereits vorhandenen Platzhöhe der
  Schnellwahl. Eine zweite Angabe derselben Größe DARF NICHT entstehen.

### Key Entities

- **Platzbezug EDSH**: Was den Heimatplatz für einen Abruf ausmacht —
  Koordinaten und Platzhöhe. Die Platzhöhe ist dieselbe, die die bestehende
  Schnellwahl setzt.
- **Wetterabruf**: Das Ergebnis einer Anfrage an den Dienst — Luftdruck an der
  Oberfläche, die Höhe, auf die er sich bezieht, die Gültigkeitszeit sowie der
  Name des Dienstes. Dazu der Zustand des Abrufs: läuft, gelungen,
  fehlgeschlagen.
- **QNH-Vorschlag**: Der aus dem Abruf hergeleitete Wert — ungerundet und auf
  ganze hPa abgerundet —, seine Eingangsgrößen, die Quellenreferenz der
  Standardatmosphäre und der Hinweis, dass es sich um einen Modellwert handelt.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Ein Pilot setzt den aktuellen Luftdruck mit höchstens drei
  Bedienschritten — Button, Bestätigung, fertig — ohne eine Zahl zu tippen.
- **SC-002**: Vor jeder Übernahme steht dem Piloten die Herkunft des Werts
  schriftlich vor Augen: Dienst, Modellwert statt Messung, Vorrang des ATIS.
- **SC-003**: Bei fehlender Netzverbindung bleibt die Seite in vollem Umfang
  bedienbar, und der fehlgeschlagene Abruf verändert keine einzige Eingabe.
- **SC-004**: Der ausgewiesene QNH weicht von der Meldung des nächstgelegenen
  Verkehrsflughafens derselben Stunde um höchstens 1 hPa ab — geprüft an
  mindestens drei Plätzen der Region.
- **SC-005**: Aus denselben Eingangszahlen entsteht immer derselbe QNH; die
  Umrechnung ist ohne Netz für sich prüfbar.
- **SC-006**: Der ungerundete und der übernommene Wert sind beide sichtbar, und
  der übernommene liegt nie über dem ungerundeten.
- **SC-007**: Der Dialog ist vollständig mit der Tastatur bedienbar — öffnen,
  lesen, übernehmen oder abbrechen, ohne die Maus.

## Out of Scope

- **Temperatur und Wind vorbelegen.** Der Abruf liefert beide mit, aber die
  Oberfläche führt keine Platztemperatur, sondern eine ISA-Abweichung, und der
  Wind ist eine Komponente gegen die Bahn 10/28. Beides braucht eigene
  Entscheidungen und eigene Prüfungen; sie werden getrennt beantragt.
- **Andere Plätze als EDSH.** Der Button ist eine Schnellwahl für den
  Heimatplatz, keine Platzsuche.
- **Wiederkehrende Aktualisierung.** Kein Nachladen im Hintergrund, keine
  Warnung bei veraltetem Wert.
- **Der MCP-Zugang.** Ein Chat-Agent kann seinen eigenen Wetterzugang haben; die
  Umrechnung im Kern steht ihm offen, ein eigenes Werkzeug entsteht hier nicht.
- **Speichern des letzten Werts** über einen Seitenbesuch hinaus.

## Assumptions

- **Der Abruf läuft im Browser des Piloten.** Die Seite wird statisch
  ausgeliefert; einen eigenen Server, der den Abruf übernehmen könnte, gibt es
  nicht. Der Dienst muss also aus dem Browser heraus erreichbar sein — was die
  Auswahl bestimmt und in [research.md](./research.md) belegt ist.
- **Der Dienst liefert kein QNH, sondern den Luftdruck an der Oberfläche.** Der
  QNH entsteht daraus im Kern über die Standardatmosphäre. Der ebenfalls
  gelieferte, auf Meereshöhe reduzierte Druck ist eine andere Größe (QFF) und
  wird nicht verwendet — auf der Höhe von EDSH liegen dazwischen bis zu 3 hPa.
- **Die Genauigkeit reicht für einen Vorschlag, nicht für mehr.** Gegen echte
  Messungen liegt der Modellwert um rund 1 K bei der Temperatur und unter 1 hPa
  beim Druck. Ein Fehler von 1 hPa verschiebt die Druckhöhe um etwa 27 ft. Das
  ist für eine Vorplanung tragbar und ersetzt das ATIS nicht.
- **Die Platzhöhe für die Umrechnung ist die der Schnellwahl (971 ft).** Sie
  wird dem Dienst mitgegeben, damit sich der gelieferte Luftdruck auf genau
  diese Höhe bezieht und nicht auf die Geländehöhe, die der Dienst selbst
  annimmt. Die Umrechnung im Kern verwendet dieselbe Höhe.
- **Keine Zwischenspeicherung.** Jeder Klick löst einen frischen Abruf aus. Ein
  gespeicherter Wert wäre gerade in der Vorflugphase der falsche.
- **Der Dialog ist ein gewöhnlicher Bestätigungsdialog** und braucht keine
  eigene Seite und keine Adresse; er ist kein Ziel, das man verlinken oder mit
  dem Zurück-Schritt des Browsers erreichen müsste.

## Dependencies

- Die im Kern vorhandene barometrische Höhenformel samt Konstanten und
  Quellenreferenz der Standardatmosphäre wird für die Umrechnung
  wiederverwendet; es entsteht keine zweite Formel.
- Der Wertebereich des QNH-Reglers (950 bis 1050 hPa, ganze hPa) stammt
  unverändert aus dem Kern.
- Die Platzhöhe von EDSH (971 ft) ist in der Oberfläche bereits als Schnellwahl
  hinterlegt und wird um die Koordinaten ergänzt.
- Die Auswahl des Dienstes, die geprüften Alternativen und die Messungen dazu
  sind in [research.md](./research.md) festgehalten.
