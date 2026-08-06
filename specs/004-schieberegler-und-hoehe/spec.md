# Feature Specification: Schieberegler und Höhe ASL statt Druckhöhe

**Feature Branch**: `004-schieberegler-und-hoehe`

**Created**: 2026-08-06

**Status**: Draft

**Input**: Die Textfelder des Kraftstoffrechners sollen Schieberegler werden, jeweils
mit einem Element, das den aktuellen Wert anzeigt, und nebeneinander angeordnet.
Statt der Druckhöhe werden Platzhöhe ASL, Reiseflughöhe ASL und der aktuelle
Luftdruck eingegeben; die Druckhöhe errechnet die Anwendung selbst.

**Issue**: [#4](https://github.com/edsh/bucky/issues/4)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Höhe eingeben, wie sie auf der Karte steht (Priority: P1)

Ein Pilot bereitet einen Flug ab EDSH vor. Auf der Luftfahrtkarte steht die
Platzhöhe als Höhe über dem Meeresspiegel, im Wetterbericht steht das QNH. Beides
trägt er unverändert ein. Die Druckhöhe, die das Handbuch für seine Tabellen
verlangt, errechnet die Anwendung und weist sie aus.

**Why this priority**: Bislang muss der Pilot die Druckhöhe selbst überschlagen,
bevor er den Rechner überhaupt bedienen kann. Genau diese Umrechnung von Hand
sollte der Rechner ihm abnehmen — sie ist fehleranfällig und geht in die
sicherheitskritische Kette ein. Ohne diese Geschichte bleibt der Rechner ein
halbes Werkzeug.

**Independent Test**: Platzhöhe, Reiseflughöhe und QNH eingeben und prüfen, dass
die ausgewiesene Druckhöhe für QNH 1013,25 hPa mit der eingegebenen Höhe
übereinstimmt und bei abweichendem Druck in die erwartete Richtung wandert.

**Acceptance Scenarios**:

1. **Given** Platzhöhe 85 ft, Reiseflughöhe 6000 ft und QNH 1013,25 hPa,
   **When** die Berechnung läuft, **Then** entsprechen beide Druckhöhen den
   eingegebenen Höhen, weil Standarddruck herrscht.
2. **Given** dieselbe Höhe bei QNH 983 hPa, **When** die Berechnung läuft,
   **Then** liegt die Druckhöhe über der eingegebenen Höhe, und das Ergebnis
   nennt beide Werte nebeneinander.
3. **Given** irgendeine Eingabe, **When** das Ergebnis erscheint, **Then** ist im
   Rechenweg ein eigener Schritt enthalten, der die Umrechnung mit den
   eingesetzten Zahlen zeigt.

---

### User Story 2 - Zulässigen Bereich sehen, statt ihn zu erraten (Priority: P2)

Ein Pilot bewegt einen Schieberegler und sieht dabei, welche Werte überhaupt
zulässig sind und wo er sich darin gerade befindet. Er kann keinen Wert
einstellen, den die Tabellen nicht abdecken.

**Why this priority**: Der zulässige Bereich steckt bereits im Handbuch; ein
Textfeld verbirgt ihn und meldet die Überschreitung erst nach dem Absenden. Der
fachliche Gewinn ist geringer als bei Geschichte 1, der Bedienungsgewinn aber
unmittelbar.

**Independent Test**: Jeden Regler an beide Enden ziehen und prüfen, dass der
angezeigte Wert die Grenzen aus dem Handbuch nicht überschreitet.

**Acceptance Scenarios**:

1. **Given** der Regler für die Reiseflughöhe, **When** er ans obere Ende
   gezogen wird, **Then** zeigt er die höchste Höhe, die beide anwendbaren
   Tabellen gemeinsam abdecken.
2. **Given** ein beliebiger Regler, **When** er bewegt wird, **Then** zeigt das
   zugehörige Anzeigeelement den aktuellen Wert samt Einheit ohne Verzögerung.

---

### User Story 3 - Alle Eingaben auf einen Blick (Priority: P3)

Die Regler liegen nebeneinander statt untereinander, sodass der Pilot die
gesamte Eingabe ohne Scrollen überblickt und einzelne Werte im Vergleich
verändern kann.

**Why this priority**: Reine Anordnung. Sie erhöht die Übersicht, ändert aber
weder Zahlen noch Bedienbarkeit im engeren Sinn.

**Independent Test**: Das Formular auf einem Bildschirm üblicher Breite öffnen
und prüfen, dass die Regler in mehreren Spalten stehen und auf schmalem
Bildschirm ohne waagerechtes Scrollen untereinander rutschen.

**Acceptance Scenarios**:

1. **Given** ein Fenster von 1024 px Breite, **When** das Formular erscheint,
   **Then** stehen die Regler in mehr als einer Spalte.
2. **Given** ein Fenster von 390 px Breite, **When** das Formular erscheint,
   **Then** ist kein waagerechtes Scrollen nötig.

---

### Edge Cases

- **Hoher Luftdruck erzeugt eine negative Druckhöhe.** Bei QNH 1030 hPa und
  Platzhöhe 85 ft beträgt die Druckhöhe −369 ft. Die Tabellen des Handbuchs
  beginnen bei 0 ft. Das ist kein Sonderfall, sondern ein gewöhnlicher
  Hochdrucktag in Norddeutschland. Die Berechnung wird abgelehnt (FR-006);
  ein Anheben auf 0 ft wäre der naheliegende, aber falsche Ausweg (FR-006a).
  Der Rechner verliert damit an einem Hochdrucktag seine Auskunftsfähigkeit —
  das ist die bewusst gewählte Seite des Fehlers.
- **Niedriger Luftdruck schiebt die Reiseflughöhe über den Tabellenbereich.**
  Bei QNH 970 hPa liegt eine Reiseflughöhe von 17 500 ft bereits über der
  höchsten Stützstelle von 18 000 ft Druckhöhe.
- **Reiseflughöhe und Platzhöhe rücken durch die Umrechnung nicht zusammen.**
  Beide Höhen werden mit demselben QNH umgerechnet; ihre Reihenfolge bleibt
  daher erhalten. Die bestehende Bedingung, dass die Reiseflughöhe über der
  Platzhöhe liegen muss, gilt unverändert.
- **Der Pilot rechnet im Kopf mit 30 ft/hPa nach** und erhält eine andere Zahl
  als die Anwendung. Bei QNH 1043 und 6000 ft beträgt der Unterschied 123 ft.
- **Ein Regler wird per Tastatur bedient**, nicht mit der Maus.
- **Ein Bedienfehler am Regler** kann keinen unzulässigen Wert erzeugen; die
  Prüfung der Eingaben im Kern bleibt trotzdem bestehen, weil andere
  Zugangswege dieselben Eingaben ohne Regler liefern.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Jede Eingabe mit stufenlosem Wertebereich MUSS als Schieberegler
  bedienbar sein, begleitet von einem Element, das den aktuellen Wert samt
  Einheit anzeigt und sich beim Ziehen unmittelbar mitführt.
- **FR-002**: Die Grenzen und die Schrittweite jedes Reglers MÜSSEN aus dem
  zulässigen Wertebereich stammen, den der Rechenkern bekanntgibt, und DÜRFEN
  NICHT in der Oberfläche eigenständig festgelegt werden.
- **FR-003**: Die Regler MÜSSEN auf breiten Bildschirmen nebeneinander in
  mehreren Spalten liegen und auf schmalen Bildschirmen untereinander rutschen,
  ohne waagerechtes Scrollen zu erzwingen.
- **FR-004**: Das System MUSS Platzhöhe über dem Meeresspiegel, Reiseflughöhe
  über dem Meeresspiegel und den aktuellen Luftdruck (QNH) als Eingaben
  entgegennehmen und daraus die zugehörigen Druckhöhen selbst errechnen. Die
  Druckhöhe wird nicht mehr eingegeben.
- **FR-005**: Die Umrechnung MUSS der barometrischen Formel der
  ICAO-Standardatmosphäre folgen, nicht der Faustformel 30 ft/hPa. Sie MUSS
  deterministisch im gemeinsamen Rechenkern liegen, damit alle Zugangswege
  dieselbe Zahl liefern (Constitution, Prinzip I und IV).
- **FR-006**: Ergibt die Umrechnung eine Druckhöhe außerhalb des von den
  Tabellen abgedeckten Bereichs, MUSS das System die Berechnung ablehnen. Es
  DARF NICHT auf die nächste Stützstelle zurückfallen und DARF NICHT über den
  Rand der Tabelle hinaus extrapolieren. Die Meldung MUSS die errechnete
  Druckhöhe, die überschrittene Bereichsgrenze und die Eingaben nennen, aus
  denen sie entstanden ist (Höhe und QNH), damit der Pilot erkennt, dass nicht
  seine Höhe, sondern der Luftdruck die Ursache ist.
- **FR-006a**: Eine Druckhöhe unterhalb des Tabellenbereichs DARF NICHT auf
  0 ft angehoben werden. Die Steigflugtabelle ist ab 0 ft kumulativ, und der
  Steigflug entsteht als Differenz zweier Tabellenwerte. Eine angehobene
  Platzhöhe verkleinert diese Differenz und weist damit **weniger** Kraftstoff
  aus, als der Flug tatsächlich benötigt — eine Abweichung zur unsicheren
  Seite. Der Betrag ist mit rund 0,2 l klein, die Richtung aber falsch.
- **FR-007**: Zu jeder Höhe MÜSSEN beide Werte sichtbar sein — die eingegebene
  Höhe über dem Meeresspiegel und die daraus errechnete Druckhöhe. Die
  Druckhöhe MUSS unmittelbar bei der Eingabe erscheinen, aus der sie entsteht,
  und nicht erst im Ergebnisblock: Wer am Regler zieht, sieht die Wirkung dort,
  wo er hinschaut. Sie MUSS auch dann erscheinen, wenn die Gesamtrechnung
  scheitert — gerade dann erklärt sie den Grund.
- **FR-008**: Der Rechenweg MUSS einen eigenen Schritt für die Umrechnung
  enthalten, der Eingangswerte, verwendete Formel und Ergebnis zeigt.
- **FR-009**: Da das POH für die Druckhöhe keine Tabelle enthält, MUSS die
  Herkunft der Formel ausgewiesen werden (ICAO-Standardatmosphäre) statt einer
  Seitenzahl. Die verbreitete Faustformel 30 ft/hPa wird **nicht** als
  Vergleichswert ausgewiesen: Sie ist als Näherung für Meereshöhe gedacht, und
  ein zweiter, danebenstehender Zahlenwert lenkt vom maßgeblichen ab, statt ihn
  einzuordnen.
- **FR-010**: Der zulässige Bereich für den Luftdruck MUSS die im Flugbetrieb
  vorkommenden Werte abdecken und an beiden Enden begrenzt sein.
- **FR-011**: Eingaben, für die es fachlich keine Zwischenwerte gibt, DÜRFEN
  NICHT stufenlos einstellbar sein. Ihre Schrittweite MUSS dem tatsächlichen
  Raster der Datengrundlage entsprechen und aus ihr abgeleitet werden, nicht
  angenommen. Ob sie als Auswahlliste oder als gerasterter Regler erscheinen,
  ist eine Frage der Darstellung.
- **FR-012**: Die Prüfung der Eingaben im Rechenkern MUSS unverändert bestehen
  bleiben, auch wenn die Regler unzulässige Werte bereits verhindern — andere
  Zugangswege liefern dieselben Eingaben ohne Regler.
- **FR-013**: Jeder Regler MUSS per Tastatur bedienbar sein und eine
  Beschriftung tragen, die ihn eindeutig benennt.
- **FR-014**: Häufig gebrauchte Werte MÜSSEN sich mit einem Griff setzen
  lassen, ohne die Eingabe über den Regler zu ersetzen — für die Platzhöhe der
  Heimatplatz EDSH.
- **FR-015**: Größen, die bei der Rechnung ohnehin anfallen und für sich
  aussagekräftig sind, MÜSSEN im Ergebnis erscheinen, ohne dass der Rechenweg
  aufgeklappt werden muss: Eigengeschwindigkeit (KTAS), Geschwindigkeit über
  Grund, Verbrauch je Stunde und Reiseflugzeit.

### Key Entities

- **Höhe über dem Meeresspiegel**: Die Höhe, wie sie auf der Karte steht
  beziehungsweise geflogen werden soll. Eingabegröße.
- **Luftdruck (QNH)**: Der auf Meereshöhe zurückgerechnete Luftdruck aus dem
  Wetterbericht. Eingabegröße, gilt für beide Höhen gleichermaßen.
- **Druckhöhe**: Die aus Höhe und Luftdruck errechnete Größe, mit der die
  Tabellen des Handbuchs arbeiten. Kein Eingabewert mehr, sondern ein
  ausgewiesenes Zwischenergebnis.
- **Wertebereich einer Eingabe**: Untere und obere Grenze samt Schrittweite und
  Einheit. Stammt aus dem Rechenkern und steuert die Regler.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Ein Pilot kann eine vollständige Eingabe allein mit den Reglern
  vornehmen, ohne einen Wert zu tippen und ohne vorher eine Druckhöhe zu
  errechnen.
- **SC-002**: Für QNH 1013,25 hPa stimmt die ausgewiesene Druckhöhe auf 1 ft
  genau mit der eingegebenen Höhe überein.
- **SC-003**: Kein Regler lässt sich auf einen Wert stellen, den der Rechenkern
  als unzulässig zurückweist.
- **SC-004**: Bei einer Fensterbreite von 390 px entsteht kein waagerechtes
  Scrollen; ab 1024 px stehen die Regler in mindestens zwei Spalten.
- **SC-005**: Unter jedem Höhenregler steht die daraus errechnete Druckhöhe,
  auch wenn die Gesamtrechnung scheitert.
- **SC-006**: Führt eine Eingabe auf eine Druckhöhe außerhalb des
  Tabellenbereichs, erscheint kein Ergebnis, sondern eine Meldung, die
  errechnete Druckhöhe, überschrittene Grenze und die verursachenden Eingaben
  nennt.
- **SC-007**: Kein ausgewiesener Kraftstoffbedarf beruht auf einer Höhe, die
  außerhalb des Tabellenbereichs liegt oder dorthin verschoben wurde.

## Assumptions

- Die eingegebene Höhe über dem Meeresspiegel entspricht dem, was der
  Höhenmesser bei eingestelltem QNH anzeigt. Eine Unterscheidung zwischen
  wahrer und angezeigter Höhe findet nicht statt.
- Dasselbe QNH gilt für Startplatz und Reiseflug. Ein zweites QNH für das
  Zielgebiet ist nicht vorgesehen; für die Kraftstoffplanung im Nahbereich ist
  das vertretbar.
- Die Lasteinstellung bleibt eine Auswahl, weil das Handbuch dafür nur einzelne
  Werte kennt und Zwischenwerte fachlich nicht existieren (FR-011).
- Die Flugstrecke behält ihre bisherige untere Grenze und erhält eine obere;
  ein Regler braucht anders als ein Textfeld ein oberes Ende.
- Die Umstellung ändert keine der digitalisierten Tabellen und keinen der
  Rechenschritte aus Feature 001. Sie setzt eine Umrechnung davor.
- Barrierefreiheit im weiteren Sinne bleibt Gegenstand von Issue
  [#3](https://github.com/edsh/bucky/issues/3); FR-013 deckt nur die
  Tastaturbedienung und Beschriftung der neuen Regler ab.

## Dependencies

- Feature 001 (Kraftstoffrechner D-EELK) muss vorhanden sein; diese Umstellung
  betrifft dessen Eingabemaske und dessen Rechenkern.
