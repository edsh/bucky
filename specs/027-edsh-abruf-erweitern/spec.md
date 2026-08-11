# Feature Specification: EDSH-Abruf um Temperatur und Pistenwind erweitern

**Feature Branch**: `027-edsh-abruf-erweitern`

**Created**: 2026-08-11

**Status**: Draft

**Input**: Feature 025 hat den Knopf „EDSH" neben dem QNH-Regler eingeführt, aber
Temperatur und Wind ausdrücklich ausgeklammert. Feature 026 hat mit dem
eigenständigen Regler „Pistenwind" die fehlende Voraussetzung geschaffen. Der
Dialog übernimmt künftig drei Größen statt einer: QNH, ISA-Abweichung und
Pistenwind — jede einzeln abwählbar.

**Issue**: [#27](https://github.com/edsh/bucky/issues/27)

## Clarifications

### Session 2026-08-11

- **F: Gegen welche Bahnrichtung wird der Wind zerlegt?**
  A: Gegen die rechtweisenden Bahnrichtungen von EDSH: **103°** für Bahn 10 und
  **283°** für Bahn 28. Beide sind belegt (siehe Assumptions) und decken sich
  mit den Kennungen 10/28 zuzüglich der Ortsmissweisung von rund 3° Ost. Die
  Kennungen selbst (100°/280°) sind missweisend und dürfen nicht gegen eine
  rechtweisende Windrichtung gerechnet werden.

- **F: EDSH hat zwei Bahnrichtungen. Welche nimmt der Dialog?**
  A: Er wählt diejenige vor, die Gegenwind ergibt, lässt sich aber im Dialog auf
  die andere umschalten. Eine verbindliche Betriebsrichtung gibt es in EDSH
  nicht — sie richtet sich nach dem Wind. Eine feste Wahl wäre entweder
  regelmäßig falsch (immer Bahn 10) oder bevormundend (immer die ungünstigere).
  Das Umschalten deckt die Fälle ab, in denen aus Lärmschutz- oder
  Verkehrsgründen die andere Bahn benutzt wird.

- **F: Auf welche Druckhöhe bezieht sich die ISA-Abweichung?**
  A: Auf die Druckhöhe von EDSH, wie sie sich aus demselben Abruf ergibt — also
  aus dem abgerufenen Luftdruck, nicht aus dem, was gerade im QNH-Regler steht.
  So beschreiben alle drei Vorschauwerte denselben Zustand der Atmosphäre zu
  demselben Zeitpunkt. Andernfalls hinge die vorgeschlagene Temperatur davon ab,
  welchen Druck der Pilot vorher von Hand eingestellt hat.

- **F: Warum die ISA-Abweichung und nicht die Platztemperatur?**
  A: Weil die Oberfläche keinen Temperaturregler hat, sondern einen Regler für
  die Abweichung von der Standardatmosphäre. Eine absolute Temperatur wäre in
  der Vorschau nicht übernehmbar. Die absolute Temperatur wird dem Piloten
  trotzdem angezeigt, damit er den Vorschlag gegen ein ATIS halten kann.

- **F: Was passiert, wenn eine der drei Größen unbrauchbar ist?**
  A: Nur diese eine Zeile wird gesperrt; die übrigen bleiben übernehmbar. Ein
  einzelner unplausibler Wert soll nicht den ganzen Abruf verwerfen. Fehlt
  dagegen die Antwort als Ganzes, bleibt es beim bisherigen Fehlerbild für den
  ganzen Dialog.

- **F: Bekommt die Streckenwindkomponente auch einen Abruf?**
  A: Nein. Ein Bodenwert an einem einzelnen Platz sagt nichts über den Wind
  entlang einer beliebigen, dem Rechner unbekannten Strecke in Reiseflughöhe.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Alle drei Grundbedingungen in einem Zug übernehmen (Priority: P1)

Ein Pilot öffnet den Rechner, um einen Start ab EDSH zu planen. Statt QNH,
Temperatur und Pistenwind einzeln aus einer Wetterseite abzuschreiben, drückt er
den Knopf „EDSH" neben dem Luftdruck. Der Dialog erklärt wie bisher, woher die
Werte stammen, zeigt kurz eine Ladeanzeige und listet dann drei Zeilen: QNH,
ISA-Abweichung und Pistenwind, jede mit Vorschauwert und angehaktem Kästchen.
Er drückt „Übernehmen" und hat drei Regler richtig stehen.

**Why this priority**: Das ist der Zweck des Features. Ohne diesen Ablauf
entsteht kein Nutzen.

**Independent Test**: Den Knopf „EDSH" drücken, die drei Vorschauwerte ablesen,
„Übernehmen" drücken und prüfen, dass alle drei Regler auf den gezeigten Werten
stehen.

**Acceptance Scenarios**:

1. **Given** die geöffnete Seite, **When** der Knopf „EDSH" neben dem Luftdruck
   gedrückt wird, **Then** öffnet sich derselbe Dialog wie bisher und zeigt nach
   dem Abruf drei Zeilen mit je einem Kästchen und einem Vorschauwert.
2. **Given** der Dialog mit drei Vorschauwerten, **When** alle drei Kästchen
   angehakt sind und „Übernehmen" gedrückt wird, **Then** stehen der QNH-Regler,
   der Regler für die ISA-Abweichung und der Pistenwindregler auf genau den
   Werten, die die Vorschau ausgewiesen hat.
3. **Given** der Dialog mit drei Vorschauwerten, **When** „Abbrechen" gedrückt
   wird, **Then** bleibt keiner der drei Regler verändert.
4. **Given** die drei übernommenen Werte, **When** die Regler betrachtet werden,
   **Then** trägt jeder von ihnen den Herkunftsvermerk mit Dienst,
   Gültigkeitszeitpunkt und dem Hinweis „unverbindlich".

---

### User Story 2 - Einzelne Größen abwählen (Priority: P1)

Derselbe Pilot hat das ATIS des Zielplatzes bereits gehört und will den
Pistenwind lieber selbst eintragen, den QNH und die Temperatur aber gern
übernehmen. Er nimmt das Häkchen bei „Pistenwind" heraus und drückt
„Übernehmen". QNH und ISA-Abweichung stehen neu, der Pistenwindregler steht
unverändert da, wo er stand.

**Why this priority**: Ohne diese Wahl wäre der Abruf ein Alles-oder-nichts und
für den häufigen Fall — ein Wert ist besser bekannt als die anderen — unbrauchbar.

**Independent Test**: Ein Kästchen abwählen, übernehmen, und prüfen, dass genau
der zugehörige Regler unverändert blieb.

**Acceptance Scenarios**:

1. **Given** der Dialog mit drei Vorschauwerten, **When** ein Kästchen abgewählt
   und „Übernehmen" gedrückt wird, **Then** verändert sich genau der zugehörige
   Regler nicht, die beiden anderen schon.
2. **Given** ein abgewählter Regler, **When** er nach dem Übernehmen betrachtet
   wird, **Then** trägt er keinen Herkunftsvermerk.
3. **Given** alle drei Kästchen abgewählt, **When** der Dialog betrachtet wird,
   **Then** ist „Übernehmen" gesperrt — es gäbe nichts zu übernehmen.
4. **Given** ein übernommener Wert mit Herkunftsvermerk, **When** der Pilot
   diesen einen Regler von Hand verstellt, **Then** verschwindet nur dessen
   Vermerk; die Vermerke der anderen Regler bleiben stehen.

---

### User Story 3 - Die Bahn wählen, gegen die der Wind zerlegt wird (Priority: P2)

Der Wind steht heute so, dass Bahn 28 die Gegenwindbahn wäre; wegen einer
Absprache am Platz startet der Pilot aber auf Bahn 10. Im Dialog schaltet er von
28 auf 10 um; der Vorschauwert für den Pistenwind kippt vom Gegen- in den
Rückenwind und bleibt beim Übernehmen der gezeigte Wert.

**Why this priority**: Nötig für die Richtigkeit, aber der Regelfall ist die
Gegenwindbahn — die Voreinstellung trifft ihn.

**Independent Test**: Im Dialog die Bahn umschalten und beobachten, dass sich
allein der Pistenwind-Vorschauwert ändert.

**Acceptance Scenarios**:

1. **Given** der Dialog nach dem Abruf, **When** die Bahnwahl betrachtet wird,
   **Then** ist diejenige der beiden Richtungen vorausgewählt, die Gegenwind
   ergibt.
2. **Given** die Bahnwahl, **When** auf die andere Bahn umgeschaltet wird,
   **Then** ändert sich allein der Vorschauwert des Pistenwinds; QNH und
   ISA-Abweichung bleiben stehen.
3. **Given** ein umgeschalteter Wert außerhalb des Reglerbereichs (mehr als
   10 kt Rückenwind), **When** der Dialog betrachtet wird, **Then** ist allein
   das Kästchen des Pistenwinds gesperrt, QNH und ISA-Abweichung bleiben
   übernehmbar.

---

### User Story 4 - Nachvollziehen, worauf der Vorschlag beruht (Priority: P2)

Ein Pilot will wissen, wie aus „Wind aus 250° mit 12 kt" ein Pistenwind von
9 kt wurde. Der Dialog nennt neben dem Vorschauwert die Windrichtung und
-geschwindigkeit, aus denen er entstand, und die Bahn, gegen die zerlegt wurde.
Bei der Temperatur nennt er die absolute Platztemperatur neben der Abweichung.

**Why this priority**: Der Rechner ist ein Vorflugwerkzeug; ein Wert, dessen
Zustandekommen sich nicht nachlesen lässt, ist gegen das ATIS nicht prüfbar.

**Independent Test**: Die Beschriftungen unter den drei Vorschauwerten lesen und
mit der Antwort des Dienstes vergleichen.

**Acceptance Scenarios**:

1. **Given** der Dialog nach dem Abruf, **When** die Zeile „Pistenwind"
   betrachtet wird, **Then** nennt sie Windrichtung in Grad, Windgeschwindigkeit
   in Knoten und die Bahn, gegen die zerlegt wurde.
2. **Given** der Dialog nach dem Abruf, **When** die Zeile „Temperatur"
   betrachtet wird, **Then** nennt sie die absolute Platztemperatur in °C.
3. **Given** der Dialog nach dem Abruf, **When** er als Ganzes betrachtet wird,
   **Then** stehen die Aufklärung über die Herkunft der Werte und die
   Namensnennung des Dienstes unverändert darin.

---

### Edge Cases

- Was, wenn der Wind genau quer zur Bahn steht? Die Längskomponente ist null;
  der Vorschauwert lautet 0 kt und ist übernehmbar. Beide Bahnrichtungen ergeben
  dasselbe — die Voreinstellung fällt dann auf Bahn 10.
- Was bei Windstille (0 kt)? Die Richtung ist bedeutungslos, der Vorschauwert
  ist 0 kt für beide Bahnen.
- Was, wenn der Rückenwind auf der gewählten Bahn über 10 kt liegt? Das Kästchen
  „Pistenwind" ist gesperrt; das Handbuch weist dafür keine Werte aus. Die
  anderen beiden Zeilen bleiben bedienbar.
- Was, wenn die Temperatur außerhalb von −30…40 °C ISA-Abweichung liegt? Dieselbe
  Behandlung: nur diese Zeile gesperrt.
- Was, wenn der Dienst gar nicht antwortet oder die Antwort unbrauchbar ist? Wie
  bisher: ein Fehlerbild für den ganzen Dialog mit der Möglichkeit, es erneut zu
  versuchen. Es wird nichts übernommen.
- Was, wenn die Antwort den Luftdruck enthält, aber Wind oder Temperatur fehlen?
  Die vorhandenen Zeilen bleiben übernehmbar, die fehlenden sind gesperrt.
- Was, wenn der Pilot den Dialog schließt, während der Abruf läuft? Wie bisher:
  Der Abruf wird abgebrochen und eine später eintreffende Antwort verändert
  nichts.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Der Abruf MUSS neben dem Luftdruck auch die Lufttemperatur, die
  Windrichtung und die Windgeschwindigkeit am Platz beschaffen.
- **FR-002**: Der Dialog MUSS nach erfolgreichem Abruf drei Zeilen zeigen — QNH,
  ISA-Abweichung, Pistenwind — je mit einem Kästchen, der Bezeichnung des
  betroffenen Reglers und dem Vorschauwert in der Darstellung dieses Reglers.
- **FR-003**: Alle Kästchen MÜSSEN nach dem Abruf angehakt sein, sofern die
  zugehörige Größe übernehmbar ist.
- **FR-004**: „Übernehmen" MUSS ausschließlich die angehakten Regler setzen und
  die übrigen unverändert lassen.
- **FR-005**: „Übernehmen" MUSS gesperrt sein, solange kein Kästchen angehakt
  ist oder noch kein Ergebnis vorliegt.
- **FR-006**: „Abbrechen", Esc und das Schließen des Dialogs DÜRFEN keinen
  Regler verändern.
- **FR-007**: Eine Größe, deren Wert außerhalb des Bereichs des zugehörigen
  Reglers liegt oder in der Antwort fehlt, MUSS mit gesperrtem, nicht angehaktem
  Kästchen und einer begründenden Meldung erscheinen; die übrigen Größen MÜSSEN
  bedienbar bleiben.
- **FR-008**: Die ISA-Abweichung MUSS aus der abgerufenen Lufttemperatur und der
  Druckhöhe von EDSH hergeleitet werden, wobei die Druckhöhe sich aus dem
  Luftdruck **desselben Abrufs** ergibt und nicht aus dem eingestellten Regler.
- **FR-009**: Der Pistenwind MUSS als Windkomponente entlang der Bahnachse
  hergeleitet werden, positiv als Gegenwind, aus Windrichtung,
  Windgeschwindigkeit und der rechtweisenden Richtung der gewählten Bahn.
- **FR-010**: Der Dialog MUSS eine Wahl zwischen den beiden Bahnrichtungen von
  EDSH (10 und 28) anbieten und diejenige vorauswählen, die Gegenwind ergibt.
- **FR-011**: Ein Wechsel der Bahnwahl MUSS allein den Vorschauwert des
  Pistenwinds verändern und keinen erneuten Abruf auslösen.
- **FR-012**: Die Zeile „Pistenwind" MUSS Windrichtung und Windgeschwindigkeit,
  aus denen sie entstand, sowie die zugrunde gelegte Bahn ausweisen.
- **FR-013**: Die Zeile „Temperatur" MUSS neben der ISA-Abweichung auch die
  absolute Platztemperatur ausweisen.
- **FR-014**: Jeder übernommene Wert MUSS unter seinem Regler einen
  Herkunftsvermerk mit Dienst, Gültigkeitszeitpunkt und dem Hinweis auf
  Unverbindlichkeit tragen.
- **FR-015**: Ein von Hand verstellter Regler MUSS seinen Herkunftsvermerk
  verlieren, ohne die Vermerke der anderen Regler anzutasten.
- **FR-016**: Die Umrechnungen — Temperatur in ISA-Abweichung und Windrichtung
  in Bahnkomponente — MÜSSEN vom Kern erbracht werden; die Oberfläche DARF sie
  weder ausführen noch runden.
- **FR-017**: Die Wertebereiche, gegen die die Übernehmbarkeit geprüft wird,
  MÜSSEN vom Kern bezogen werden und nicht in der Oberfläche stehen.
- **FR-018**: Die rechtweisenden Bahnrichtungen von EDSH MÜSSEN an derselben
  Stelle stehen wie Koordinaten und Platzhöhe des Platzes und nicht doppelt
  geführt werden.
- **FR-019**: Die Aufklärung über die Herkunft der Werte, die Namensnennung des
  Dienstes, die Ladeanzeige, die Zeitgrenze und das Fehlerbild MÜSSEN erhalten
  bleiben und für alle drei Größen gemeinsam gelten.
- **FR-020**: Die Streckenwindkomponente DARF durch den Abruf nicht verändert
  werden.

### Key Entities

- **Wetterabruf**: Was der Dienst geliefert hat — Luftdruck in der Platzhöhe,
  Lufttemperatur, Windrichtung, Windgeschwindigkeit, Bezugshöhe,
  Gültigkeitszeitpunkt, Name und Verweis des Dienstes. Ungerechnet.
- **Bahnrichtung**: Kennung (10 oder 28) und rechtweisende Richtung in Grad.
  Eigenschaft des Platzes, nicht des Wetters.
- **Übernahmevorschlag**: Je Größe ein übernehmbarer Wert in der Einheit des
  Reglers, ein Vermerk, wie er zustande kam, und die Angabe, ob er im
  Reglerbereich liegt.
- **Herkunftsvermerk**: Dienst und Gültigkeitszeitpunkt, je Regler einzeln
  geführt.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Ein Pilot kann QNH, ISA-Abweichung und Pistenwind mit einem
  Knopfdruck und einer Bestätigung setzen, ohne einen Wert von Hand
  abzuschreiben oder umzurechnen.
- **SC-002**: Wird eine Größe abgewählt, bleibt ihr Regler auf den Zeichen genau
  auf dem Wert, den er vor dem Öffnen des Dialogs trug.
- **SC-003**: Ein Abbruch des Dialogs — durch „Abbrechen", Esc oder einen
  Fehlschlag — hinterlässt keinen veränderten Regler.
- **SC-004**: Der Pistenwind-Vorschlag lässt sich aus den im Dialog genannten
  Angaben (Windrichtung, Windgeschwindigkeit, Bahn) nachrechnen.
- **SC-005**: Der Herkunftsvermerk eines Reglers verschwindet, sobald und nur
  sobald dieser Regler von Hand bedient wird.
- **SC-006**: Ein unplausibler oder fehlender Einzelwert verhindert die Übernahme
  der übrigen Werte nicht.

## Out of Scope

- **Die Streckenwindkomponente.** Kein Bodenwert an einem einzelnen Platz bildet
  Wind entlang einer beliebigen Strecke in Reiseflughöhe ab.
- Andere Plätze als EDSH, wiederkehrende Aktualisierung, Speichern über den
  Seitenbesuch hinaus — wie schon in Feature 025.
- Eine Anzeige der Seitenwindkomponente und eine Warnung zum demonstrierten
  Seitenwind von 15 kt. Die Zerlegung liefert sie zwar nebenbei, ihre Darstellung
  und Bewertung ist aber eine eigene Entscheidung.
- Windböen. Der Dienst liefert sie, aber die Startstreckentabelle kennt keine
  Böigkeit.
- Ein zweiter Abrufknopf an einem anderen Regler. Der eine Knopf beim Luftdruck
  bleibt der einzige Einstieg.

## Assumptions

- **Bahnrichtungen EDSH**: 103° und 283° rechtweisend für die Bahnen 10 und 28.
  Quelle: OurAirports (`runways.csv`, `airport_ident` EDSH), dort als
  `le_heading_degT` und `he_heading_degT` geführt; dieselbe Zeile nennt 1640 ft
  Länge und 98 ft Breite, was den 500 × 30 m der AIP VFR entspricht. Gegenprobe:
  Die Kennungen 10/28 sind missweisend (100°/280°) und ergeben mit der
  Ortsmissweisung von rund 3° Ost genau diese rechtweisenden Werte.
- Der Wetterdienst gibt Windrichtungen rechtweisend und meteorologisch an — also
  die Richtung, **aus** der der Wind weht. Beides passt zu den rechtweisenden
  Bahnrichtungen ohne weitere Umrechnung.
- Die ISA-Abweichung ist über die Höhe konstant; die aus der Platztemperatur
  hergeleitete Abweichung gilt deshalb auch für die Reiseflughöhe. Genau das
  setzt der Rechner mit einem einzigen Regler für beide Höhen ohnehin voraus.
- Die Windangabe des Dienstes bezieht sich auf 10 m über Grund, wie in der
  Luftfahrt üblich.
- Der Kern führt die Wertebereiche für ISA-Abweichung (−30…40 °C) und Pistenwind
  (−10…50 kt) bereits; dieses Feature bezieht sie, es definiert keine neuen.
- Der Regler für die ISA-Abweichung und der Pistenwindregler nehmen wie bisher
  nur ganze Zahlen an; die Vorschauwerte werden entsprechend gerundet.
