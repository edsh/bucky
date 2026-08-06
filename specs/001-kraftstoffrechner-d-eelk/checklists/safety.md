# Safety Checklist: Kraftstoffrechner für D-EELK

**Purpose**: Prüft die **Qualität der Anforderungstexte** zu den
sicherheitskritischen Aspekten des Features — Determinismus, Nachvollziehbarkeit,
Quellenangabe und Verweigerung statt Schätzung. Nicht geprüft wird hier die
spätere Implementierung, sondern ob die Anforderungen vollständig, eindeutig und
überprüfbar formuliert sind.
**Created**: 2026-08-06
**Feature**: [spec.md](../spec.md)
**Tiefe**: Formales Freigabe-Gate — jede offene Position blockiert die Freigabe.

## Quellenangabe und Nachvollziehbarkeit

- [ ] CHK001 Ist der genaue Wortlaut des Prüfhinweises irgendwo festgelegt, oder wird nur verlangt, dass "ein Hinweis" erscheint? [Gap, Spec §FR-006]
- [ ] CHK002 Verlangt die Quellenangabe neben Seitenzahl und Tabellenname auch Ausgabe und Änderungsstand des Handbuchs, damit ein Pilot mit einem abweichenden Handbuchstand die Diskrepanz bemerkt? [Gap, Spec §FR-005]
- [ ] CHK003 Ist festgelegt, ob die Quellenangabe je Rechenschritt oder nur einmal für das Gesamtergebnis erscheinen muss? [Clarity, Spec §FR-005, §FR-017]
- [ ] CHK004 Ist gefordert, dass die Ausgabe die Anwendbarkeit auf Abschnitt 5b und den Propeller MTV-6-A/190-69 benennt, oder wird das als bekannt vorausgesetzt? [Gap, Spec §Scope]
- [ ] CHK005 Ist festgelegt, dass die verwendeten Tabellen-Eckwerte so ausgegeben werden, dass ein Pilot sie ohne Kenntnis der internen Datenstruktur im Handbuch wiederfindet? [Measurability, Spec §FR-005]

## Bekannte Abweichungen und offene Punkte

- [x] CHK006 ~~Gibt es eine Anforderung, die Vy-Abweichung anzuzeigen?~~ **Hinfällig 2026-08-06**: entschieden zugunsten des Spaltenwerts (70 KIAS), in der Datengrundlage unter `source_anomalies.resolution` dokumentiert. Vy geht nicht in die Bedarfsrechnung ein.
- [x] CHK007 ~~Ist die Offenlegung der Abweichung von Anmerkung 2 gefordert?~~ **Erledigt 2026-08-06**: als FR-019 aufgenommen. [Spec §FR-019]
- [x] CHK008 ~~Ist definiert, wie sich das System verhält, solange Muster und Tankkonfiguration von D-EELK ungeklärt sind?~~ **Erledigt 2026-08-06**: D-EELK ist eine F172N mit Standardtanks. Die Anwendbarkeit ist je Tabelle in der Datengrundlage hinterlegt. [Spec §Scope]
- [x] CHK009 ~~Ist gefordert, dass die Wahl von 1089 kg auf "nur Cessna 172P" hinweist?~~ **Hinfällig 2026-08-06**: 1089 kg ist für D-EELK nicht wählbar, die Abflugmasse wird nicht mehr abgefragt. [Spec §FR-015]
- [ ] CHK009a Ist gefordert, dass die Ausgabe kenntlich macht, auf welche Abflugmasse und Tankvariante sich die verwendeten Tabellen beziehen? Ohne das lässt sich nicht prüfen, ob die richtige Tabelle gezogen wurde. [Gap, Spec §FR-015]

## Vollständigkeit des Ergebnisses

- [x] CHK010 ~~Ist gefordert, mitzuteilen, dass die Summe keine Reserve enthält?~~ **Erledigt 2026-08-06**: als FR-018 aufgenommen, einschließlich Sinkflug und Ausweichflugplatz. [Spec §FR-018]
- [x] CHK011 ~~Ist festgelegt, dass die Gegenüberstellung nicht als Reserveaussage missverstanden wird?~~ **Erledigt 2026-08-06**: von FR-018 Satz 2 abgedeckt. [Spec §FR-018]
- [ ] CHK012 Ist definiert, was "deutlich darauf hinweisen" bei Überschreitung der ausfliegbaren Menge konkret bedeutet, und lässt sich das objektiv prüfen? [Measurability, Spec §FR-016]
- [ ] CHK013 Ist gefordert, dass ein Ergebnis mit Überschreitung nicht versehentlich wie ein normales Ergebnis aussieht? [Gap, Spec §FR-016]

## Verweigerung statt Schätzung

- [ ] CHK014 Ist der abgedeckte Wertebereich in der Spec selbst benannt, oder muss man ihn aus den Datendateien erschließen? [Gap, Spec §FR-007]
- [ ] CHK015 Ist die höhenabhängige Verfügbarkeit der Lasteinstellungen als Anforderung formuliert? Die Edge Cases nennen nur "unter 50 %", nicht dass 100 % oberhalb 8000 ft und 90 % oberhalb 14000 ft fehlen. [Gap, Spec §Edge Cases, §FR-007]
- [ ] CHK016 Ist festgelegt, dass bei einer nicht belegten Kombination kein Rückfall auf eine benachbarte Lasteinstellung erfolgt? [Gap, Spec §FR-007]
- [ ] CHK017 Ist gefordert, dass eine Fehlermeldung den zulässigen Bereich nennt, statt nur die Berechnung zu verweigern? [Completeness, Spec §FR-007, §FR-008]
- [x] CHK018 ~~Ist definiert, wie mit einer ISA-Abweichung unter null umzugehen ist?~~ **Erledigt 2026-08-06**: Faktor 1, es wird nicht nach unten korrigiert. [Spec §FR-012, §FR-013]
- [ ] CHK019 Ist ein zulässiger Bereich für die ISA-Abweichung in der Spec festgelegt, oder steht er nur im Datenmodell? [Consistency, Spec §FR-004]

## Determinismus

- [ ] CHK020 Ist als Anforderung festgehalten, dass dieselbe Eingabe über beide Zugangswege dasselbe Ergebnis liefert? Die Spec kennt nur die Eingabemaske. [Gap, Spec §FR-004]
- [ ] CHK021 Ist gefordert, dass das Ergebnis unabhängig von Zeitpunkt, Gerät und Spracheinstellung reproduzierbar ist? [Gap]
- [ ] CHK022 Ist ausgeschlossen, dass ein Sprachmodell Zwischenwerte selbst ermittelt, oder ergibt sich das nur aus der Constitution? [Traceability, Spec §FR-003]

## Notes

- Diese Liste prüft Anforderungstexte, keine Software. Ein Haken bedeutet: die
  Anforderung ist so geschrieben, dass sie umsetzbar und überprüfbar ist.
- Als Freigabe-Gate gedacht: offene Punkte sind vor der Freigabe zu schließen,
  entweder durch Ergänzung der Spec oder durch eine begründete Streichung.
