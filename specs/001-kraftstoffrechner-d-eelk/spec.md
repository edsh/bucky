# Feature Specification: Kraftstoffverbrauchsrechner für D-EELK

**Feature Branch**: `001-kraftstoffrechner-d-eelk`

**Created**: 2026-08-05

**Status**: Draft

**Input**: User description: "Kraftstoffverbrauchsrechner für das Flugzeug D-EELK. Als Pilot des Flugzeugs D-EELK möchte ich für eine bestimmte Strecke zu bestimmten Umgebungsbedingungen den Kraftstoffbedarf berechnen. Hierzu muss zunächst das Flughandbuch digitalisiert werden, wie es auch in der Constitution vorgeschlagen wird, also das Flughandbuch muss gelesen werden, in strukturierte Daten digitalisiert werden, etc. Dann benötigen wir ein User-Interface, in das ich die relevanten Daten eingebe und mir diese dann ausgerechnet werden."

**GitHub Issue**: [#1](https://github.com/edsh/bucky/issues/1)

**Scope**: Dieses Feature berechnet den Kraftstoffbedarf eines konkreten
Flugvorhabens in Litern, aufgeschlüsselt nach Anlassen/Rollen/Start, Steigflug und
Reiseflug, nach dem im POH beschriebenen Rechenverfahren ("Erforderliche
Kraftstoffmenge", Seite 5-3 bis 5-5) und ausschließlich auf Basis der
digitalisierten Tabellen aus Abschnitt 5b (Propeller MTV-6-A/190-69). D-EELK ist
eine Cessna F172N mit Standardtanks; anwendbar sind daher die Tabellen für 1043 kg
Abflugmasse, also Abb. 5-3a für den Steigflug und Abb. 5-4a für die Reiseleistung.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Kraftstoffbedarf für ein Flugvorhaben berechnen (Priority: P1)

Als Pilot von D-EELK gebe ich mein Flugvorhaben ein (Platzhöhe des Startplatzes,
geplante Reiseflughöhe, Streckenlänge, Lasteinstellung, Temperaturabweichung von
ISA, erwartete Windkomponente) und erhalte den daraus
resultierenden Kraftstoffbedarf in Litern, aufgeschlüsselt nach Anlassen/Rollen/
Start, Steigflug und Reiseflug.

**Why this priority**: Das ist der eigentliche Wert des Features — ohne diese
Berechnung gibt es kein nutzbares Produkt. Alles andere (Datengrundlage) dient
ausschließlich dazu, diese Berechnung korrekt zu ermöglichen.

**Independent Test**: Kann vollständig getestet werden, indem ein Flugvorhaben
mit bekanntem, von Hand aus dem Original-POH nachgerechnetem Sollwert eingegeben
und das Ergebnis mit diesem Sollwert verglichen wird.

**Acceptance Scenarios**:

1. **Given** die POH-Tabellen für D-EELK sind digitalisiert, **When** ich ein
   Flugvorhaben eingebe, dessen Werte innerhalb des abgedeckten Wertebereichs
   liegen, **Then** erhalte ich den Kraftstoffbedarf in Litern, aufgeschlüsselt
   nach Anlassen/Rollen/Start, Steigflug und Reiseflug.
2. **Given** ich habe ein Berechnungsergebnis erhalten, **When** ich es mit einer
   manuellen Rechnung nach dem POH-Verfahren vergleiche, **Then** stimmt der Wert
   überein (innerhalb der durch Interpolation und Rundung bedingten Genauigkeit).
3. **Given** ich habe ein Berechnungsergebnis erhalten, **When** der berechnete
   Bedarf die ausfliegbare Kraftstoffmenge der Standardtanks übersteigt,
   **Then** weist mich das System deutlich darauf hin.

---

### User Story 2 - Zwischenwerte des Rechenwegs einsehen (Priority: P2)

Als Pilot sehe ich nicht nur die Gesamtsumme, sondern die Zwischenwerte des
Rechenwegs (Steigflugzeit, -strecke und -kraftstoff, temperaturkorrigierte Werte,
KTAS, Geschwindigkeit über Grund, Reiseflugstrecke, Reiseflugzeit,
Verbrauchsrate), damit ich die Rechnung gegen das Handbuch nachvollziehen kann.

**Why this priority**: Die Vorflug-Prüfung gegen das Original-POH (Prinzip I) ist
nur praktikabel, wenn die Zwischenschritte sichtbar sind — eine reine Endsumme
lässt sich nicht sinnvoll gegenprüfen. Separat von der Berechnung testbar.

**Independent Test**: Kann unabhängig getestet werden, indem geprüft wird, dass
jede Ausgabe die genannten Zwischenwerte enthält — unabhängig vom konkreten
Zahlenwert.

**Acceptance Scenarios**:

1. **Given** ein Berechnungsergebnis wurde ausgegeben, **When** ich mir die
   Ausgabe ansehe, **Then** sehe ich die Zwischenwerte jedes Rechenschritts.
2. **Given** ein Zwischenwert wurde aus einer Tabelle entnommen oder zwischen
   Tabellenwerten interpoliert, **When** ich mir die Ausgabe ansehe, **Then** sehe
   ich die verwendeten Eckwerte.

---

### User Story 3 - Nachvollziehbarkeit und Prüfhinweis (Priority: P2)

Als Pilot sehe ich zu jedem Berechnungsergebnis, aus welchen Tabellen welcher
POH-Seiten es stammt, sowie den Hinweis, das Ergebnis vor dem Flug gegen das
Original-POH zu prüfen.

**Why this priority**: Direkt durch Constitution-Prinzip I (Deterministic
Safety-Critical Calculations) gefordert — sicherheitsrelevant, aber von der
eigentlichen Berechnung (User Story 1) separat testbar.

**Independent Test**: Kann unabhängig getestet werden, indem geprüft wird, dass
jede Ausgabe eines Berechnungsergebnisses die Quellenreferenzen und den
Prüfhinweis enthält — unabhängig vom konkreten Zahlenwert.

**Acceptance Scenarios**:

1. **Given** ein Berechnungsergebnis wurde ausgegeben, **When** ich mir die
   Ausgabe ansehe, **Then** sehe ich zu jeder verwendeten Tabelle die Seitenzahl
   und den Tabellennamen aus dem Original-POH.
2. **Given** ein Berechnungsergebnis wurde ausgegeben, **When** ich mir die
   Ausgabe ansehe, **Then** sehe ich den Hinweis, das Ergebnis vor dem Flug
   gegen das Original-POH zu prüfen.

---

### Edge Cases

- Eingegebene Werte liegen außerhalb des durch die digitalisierten Tabellen
  abgedeckten Wertebereichs (z. B. Reiseflughöhe über 18000 ft, Lasteinstellung
  unter 50 %) → System MUSS dies erkennen und darf keinen (extrapolierten) Wert
  ausgeben.
- Die Reiseflughöhe liegt unter oder gleich der Platzhöhe des Startplatzes →
  System MUSS die Eingabe zurückweisen, da das POH-Steigflugverfahren
  (Differenzbildung) dafür kein Ergebnis liefert.
- Die korrigierte Steigflugstrecke ist länger als die Gesamtflugstrecke → System
  MUSS dies erkennen und darf keine negative Reiseflugstrecke rechnen.
- Der Gegenwind ist so stark, dass die Geschwindigkeit über Grund null oder
  negativ wird → System MUSS die Berechnung verweigern.
- Der berechnete Kraftstoffbedarf übersteigt die ausfliegbare Kraftstoffmenge der
  Standardtanks (127,4 l) → System MUSS deutlich darauf hinweisen.
- Eine Lasteinstellung über 75 % wird gewählt → System MUSS die Anmerkung 4 der
  Reiseleistungstabelle wiedergeben (für den Reiseflug nicht empfohlen).
- Die gewählte Lasteinstellung ist in der Reiseflughöhe nicht belegt (100 %
  oberhalb 8000 ft, 90 % oberhalb 14000 ft) → System MUSS die Kombination
  zurückweisen und die dort verfügbaren Lasteinstellungen nennen, statt auf eine
  benachbarte auszuweichen.
- Die ISA-Abweichung liegt unter null → System MUSS mit dem Faktor 1 rechnen und
  nicht nach unten korrigieren.
- Eingaben sind unvollständig, fehlerhaft oder unplausibel → System MUSS die
  Eingabe zurückweisen, bevor eine Berechnung versucht wird.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUSS eine aus dem Original-Flughandbuch von D-EELK
  digitalisierte, strukturierte Datengrundlage für Steigflug (Zeit, Strecke,
  Kraftstoff) und Reiseleistung (KTAS, Verbrauchsrate) bereitstellen, inklusive
  einer Quellenreferenz (Seitenzahl und Tabellenname aus dem Original-POH) je
  Tabelle (Constitution-Prinzip I).
- **FR-002**: Die digitalisierten Daten MÜSSEN gegen das Original-Flughandbuch
  doppelt geprüft sein, bevor sie für Berechnungen verwendet werden
  (Constitution-Prinzip I).
- **FR-003**: System MUSS alle Zwischen- und Endwerte ausschließlich durch
  deterministische Interpolation zwischen den digitalisierten Tabellenwerten und
  die im POH beschriebenen Rechenschritte ermitteln — kein frei generierter oder
  geschätzter Wert. Interpoliert wird **linear** und **ausschließlich über die
  Druckhöhe**. Über die Lasteinstellung wird nicht interpoliert: zulässig sind
  nur die im Tabellenraster belegten Werte (50, 60, 70, 80, 90, 100 %). Liegt
  ein Wert genau auf einer Stützstelle, wird er unverändert übernommen; die
  ausgewiesenen Eckwerte machen das erkennbar, weil beide dann gleich sind.
- **FR-004**: Piloten MÜSSEN ihr Flugvorhaben über eine Eingabemaske erfassen
  können: Platzhöhe des Startplatzes und geplante Reiseflughöhe (beide als
  Druckhöhe in ft), Streckenlänge (NM), Lasteinstellung (%),
  Temperaturabweichung von ISA (°C) und Windkomponente entlang der Strecke (kt,
  positiv bei Gegenwind).
- **FR-005**: System MUSS zu jedem Berechnungsergebnis die verwendete(n)
  Tabelle(n) exakt referenzieren (Seitenzahl und Tabellenname aus dem
  Original-POH) sowie die verwendeten Eckwerte nennen. Die Referenz MUSS
  zusätzlich Ausgabe und Änderungsstand des Handbuchs nennen, damit ein Pilot
  mit einem abweichenden Handbuchstand die Diskrepanz bemerkt. Die Eckwerte
  MÜSSEN mit den Größen des Handbuchs benannt sein (Druckhöhe, Lasteinstellung
  und die dort abgelesenen Werte), nicht mit internen Feldnamen. Quellenangaben
  erscheinen sowohl je Rechenschritt als auch gesammelt für das Gesamtergebnis;
  die gesammelte Angabe MUSS ohne weitere Bedienschritte sichtbar sein.
- **FR-006**: System MUSS zu jedem Berechnungsergebnis den Hinweis anzeigen,
  das Ergebnis vor dem Flug gegen das Original-POH zu prüfen. Der Wortlaut MUSS
  über alle Zugangswege identisch sein und aus einer einzigen Quelle stammen;
  der Hinweis MUSS zusammen mit dem Ergebnis sichtbar sein und darf nicht hinter
  einem Aufklappen oder auf einer Unterseite liegen.
- **FR-007**: System MUSS erkennen, wenn eingegebene Werte außerhalb des durch
  die digitalisierten Tabellen abgedeckten Wertebereichs liegen, und MUSS die
  Berechnung in diesem Fall verweigern statt zu extrapolieren. Abgedeckt sind:
  Druckhöhe 0 bis 18000 ft (gemeinsames Raster von Steigflug- und
  Reiseleistungstabelle), Lasteinstellung 50 bis 100 % nur auf den belegten
  Rasterwerten, ISA-Abweichung −30 bis +40 °C, Windkomponente −50 bis +50 kt,
  Streckenlänge größer als null. Die Lasteinstellungen sind nicht in jeder Höhe
  belegt — 100 % fehlt oberhalb 8000 ft, 90 % oberhalb 14000 ft. Die
  Lasteinstellung MUSS bei **beiden** die Reiseflughöhe einschließenden
  Stützstellen belegt sein; ein Rückfall auf eine benachbarte Lasteinstellung
  ist ausgeschlossen. Jede Fehlermeldung MUSS das betroffene Feld und den
  zulässigen Bereich beziehungsweise die dort verfügbaren Werte nennen.
- **FR-008**: System MUSS unvollständige oder unplausible Eingaben zurückweisen,
  bevor eine Berechnung versucht wird.
- **FR-009**: System MUSS den Kraftstoffbedarf in Litern ausgeben, aufgeschlüsselt
  nach Anlassen/Rollen/Start, Steigflug und Reiseflug, samt Gesamtsumme.
  Zusätzlich MUSS jeder dieser Posten in US-Gallonen erscheinen, weil das
  Handbuch beide Einheiten führt und die Betankung am Platz in Litern erfolgt.
  Die Gallonenwerte MÜSSEN aus den Gallonenspalten des Handbuchs stammen und
  DÜRFEN NICHT aus den Litern umgerechnet werden: die Wertepaare des Originals
  sind gerundet und weichen von einer Umrechnung ab — 127,4 l stehen dort als
  33,6 US gal, gerechnet wären es 33,7.
- **FR-010**: System MUSS Zeit, Strecke und Kraftstoff für den Steigflug als
  Differenz der Tabellenwerte für Reiseflughöhe und Platzhöhe des Startplatzes
  ermitteln (Verfahren laut POH Seite 5-4). Steigflug- und Reiseleistungstabelle
  haben unterschiedliche Höhenraster (1000 ft gegen 2000 ft); jede Tabelle wird
  in ihrem eigenen Raster interpoliert, ein gemeinsames Raster wird nicht
  gebildet. Das System MUSS ausweisen, dass die Steigflugwerte für die maximale
  Abflugmasse gelten und die Rechnung bei geringerer Masse auf der sicheren
  Seite liegt.
- **FR-011**: System MUSS für Anlassen, Rollen und Start den im POH festgelegten
  Festbetrag von 4 l ansetzen (Anmerkung 1 der Steigflugtabelle). Der Festbetrag
  ist temperaturunabhängig; die Korrektur nach FR-012 wirkt nicht auf ihn.
- **FR-012**: System MUSS die Steigflugwerte für Zeit, Strecke und Kraftstoff mit
  dem Faktor `1 + (ISA-Abweichung in °C / 10) × 0,10` korrigieren (Anmerkung 2 der
  Steigflugtabelle, in der Rechenweise des POH-Rechenbeispiels: `20 °C / 10 °C
  × 10 % = 20 %`). Die Korrektur wirkt stetig, nicht in Stufen, und wird auf
  die bereits gebildete Differenz aus FR-010 angewandt, nicht auf die einzelnen
  Tabellenwerte. Bei einer
  ISA-Abweichung von null oder darunter MUSS der Faktor 1 betragen; nach unten
  wird nicht korrigiert.
- **FR-013**: System MUSS die KTAS aus der Reiseleistungstabelle mit dem Faktor
  `1 + (ISA-Abweichung in °C / 10) × 0,01` korrigieren (Anmerkung 3 der
  Reiseleistungstabellen in Abschnitt 5b), ebenfalls stetig und ebenfalls nur
  nach oben.
- **FR-014**: System MUSS die Reiseflugstrecke als Gesamtflugstrecke abzüglich
  der korrigierten Steigflugstrecke ermitteln, die Geschwindigkeit über Grund aus
  korrigierter KTAS und Windkomponente bilden und daraus die Reiseflugzeit und
  den Reiseflug-Kraftstoff berechnen. Die Verbrauchsrate hängt laut den
  digitalisierten Tabellen ausschließlich von der Lasteinstellung ab; Druckhöhe
  und Temperatur wirken auf die KTAS, nicht auf die Rate.
- **FR-015**: System MUSS ausschließlich die für D-EELK anwendbaren Tabellen
  verwenden (Abb. 5-3a Steigflug und Abb. 5-4a Reiseleistung, beide für 1043 kg
  und Standardtanks) und MUSS die Verwendung einer nicht anwendbaren Tabelle
  ausschließen.
- **FR-016**: System MUSS den berechneten Bedarf der ausfliegbaren
  Kraftstoffmenge der Standardtanks (127,4 l) gegenüberstellen und warnen, wenn
  der Bedarf diese erreicht oder übersteigt. Die Warnung MUSS sich vom normalen
  Ergebnis unterscheiden — durch eigene Hervorhebung und durch die ausdrückliche
  Aussage, dass der Flug so nicht durchführbar ist. Ein Ergebnis mit
  Überschreitung darf nicht wie ein gewöhnliches Ergebnis aussehen. Verglichen
  wird der ungerundete Bedarf, damit die Rundung keine Warnung verschluckt.
- **FR-017**: System MUSS die Zwischenwerte jedes Rechenschritts ausgeben, nicht
  nur die Gesamtsumme.
- **FR-018**: System MUSS zu jedem Ergebnis ausweisen, dass die Summe **keine
  Reserve** enthält und weder Sinkflug noch Ausweichflugplatz berücksichtigt.
  Auch die Gegenüberstellung zur ausfliegbaren Menge MUSS erkennbar machen, dass
  der verbleibende Kraftstoff keine Reserve im betrieblichen Sinne darstellt.
- **FR-019**: System MUSS offenlegen, dass die Temperaturkorrektur zusätzlich auf
  den Steigflug-Kraftstoff angewandt wird, obwohl Anmerkung 2 der Steigflugtabelle
  nur Zeit und Steigstrecke nennt. Ohne diese Offenlegung findet ein Pilot beim
  Gegenrechnen eine unerklärte Differenz.
- **FR-020**: System MUSS offenlegen, dass es die Zwischenwerte in voller
  Genauigkeit weiterrechnet und erst das Ergebnis rundet, während das
  Rechenbeispiel des POH nach jedem Schritt rundet. Beide Wege sind vertretbar,
  weichen aber in der Größenordnung von ±0,6 l voneinander ab, ohne festes
  Vorzeichen. Ein Pilot, der von Hand nach dem Handbuch nachrechnet, MUSS diese
  Differenz erklärt bekommen, statt sie für einen Fehler zu halten.
- **FR-021**: System MUSS gerundete Werte einheitlich mit diesen Stellen
  ausgeben: Kraftstoffmengen auf 0,1 l beziehungsweise 0,1 US gal, Zeiten auf
  ganze Minuten, Strecken auf
  0,1 NM, Geschwindigkeiten auf ganze Knoten. Diese Stellen entsprechen der
  Darstellung im POH, sodass Ergebnis und Handbuch unmittelbar vergleichbar
  sind.

- **FR-022**: Dieselbe Eingabe MUSS über alle Zugangswege dasselbe
  Zahlenergebnis liefern, und dasselbe Ergebnis MUSS unabhängig von Zeitpunkt,
  Gerät und Spracheinstellung reproduzierbar sein. Rechen- und Rundungslogik
  liegen daher in einem gemeinsamen Kern, nicht in den Zugangswegen
  (Constitution-Prinzip IV).
- **FR-023**: Ein Sprachmodell DARF weder Tabellenwerte noch Zwischenwerte
  selbst ermitteln. Der MCP-Zugang MUSS fertig gerechnete Ergebnisse liefern und
  DARF kein Werkzeug bereitstellen, das Rohtabellenzeilen als
  Interpolationsgrundlage herausgibt (Constitution-Prinzip I).
- **FR-024**: Die Eingabemaske MUSS je Feld die Einheit anzeigen, die Höhenfelder
  ausdrücklich als Druckhöhe kennzeichnen und für die Lasteinstellung eine
  Auswahl der belegten Rasterwerte statt einer freien Eingabe anbieten. Die
  übrigen Felder sind freie Zahleneingaben mit hinterlegten Grenzen. Die Maske
  startet mit plausiblen Vorbelegungen, und eingegebene Werte bleiben nach einer
  Fehlermeldung erhalten. Unzulässige Kombinationen werden beim Absenden
  geprüft und gemeldet, nicht vorab in der Auswahl gesperrt — welche
  Lasteinstellungen belegt sind, hängt von der Reiseflughöhe ab, und eine still
  verschwindende Auswahlmöglichkeit wäre schwerer zu verstehen als eine
  Meldung, die die verfügbaren Werte nennt.
- **FR-025**: Bei einem Fehler MUSS ein zuvor angezeigtes Ergebnis verschwinden,
  damit kein veraltetes Teilergebnis für ein gültiges gehalten wird. Hinweise,
  die die Berechnung nicht abbrechen, MÜSSEN von abbrechenden Fehlern
  unterscheidbar dargestellt werden.
- **FR-026**: Die Aufschlüsselung MUSS in der Reihenfolge des Handbuchverfahrens
  erscheinen: Anlassen/Rollen/Start, Steigflug, Reiseflug, Summe. Aufschlüsselung,
  Quellenangaben, Prüfhinweis und Hinweise MÜSSEN ohne weitere Bedienschritte
  sichtbar sein; die Folge der einzelnen Rechenschritte darf aufklappbar sein.
  Jeder Rechenschritt MUSS seine Eingangswerte, seine Ergebnisse und eine
  Erläuterung zeigen.
- **FR-027**: Die Oberfläche MUSS auf Deutsch geführt sein, auf einem Mobilgerät
  bedienbar bleiben und nach dem ersten Laden ohne Netzverbindung rechnen können.
  Die Berechnung läuft vollständig auf dem Gerät des Piloten.

### Key Entities

- **POH-Steigflugtabelle**: Digitalisierte Werte für Zeit, Strecke und Kraftstoff
  über der Druckhöhe. Für D-EELK gilt Abb. 5-3a (1043 kg); referenziert Quelle
  (Seitenzahl, Tabellenname) und Version des Originaldokuments.
- **POH-Reiseleistungstabelle**: Digitalisierte Werte für KTAS, Verbrauchsrate,
  Reichweite und Flugdauer über Druckhöhe und Lasteinstellung. Für D-EELK gilt
  Abb. 5-4a (1043 kg, Standardtanks); referenziert Quelle (Seitenzahl,
  Tabellenname) und Version des Originaldokuments.
- **Flugvorhaben**: Vom Piloten eingegebene Kombination aus Platzhöhe des
  Startplatzes, Reiseflughöhe, Streckenlänge, Lasteinstellung, ISA-Abweichung,
  Windkomponente.
- **Rechenschritt**: Ein einzelner nachvollziehbarer Schritt des POH-Verfahrens
  mit Eingangswerten, Ergebnis, verwendeten Tabellen-Eckwerten und Quellenreferenz.
- **Berechnungsergebnis**: Ausgabe bestehend aus dem aufgeschlüsselten
  Kraftstoffbedarf, der Gegenüberstellung zur ausfliegbaren Kraftstoffmenge, der
  Folge der Rechenschritte, den Quellenreferenzen und dem Prüfhinweis.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Ein Pilot erhält für ein gültiges Flugvorhaben in höchstens einer
  Sekunde nach dem Absenden ein Berechnungsergebnis, gemessen auf einem
  Mobilgerät bei bereits geladener Anwendung.
- **SC-002**: 100 % der ausgegebenen Berechnungsergebnisse enthalten je
  verwendeter Tabelle Seitenzahl, Abbildungsnummer, Tabellenname sowie Ausgabe
  und Änderungsstand des Handbuchs, dazu die verwendeten Tabellen-Eckwerte und
  den Hinweis zur Vorflug-Prüfung. Eine Quellenangabe gilt nur dann als
  vollständig, wenn alle diese Bestandteile vorhanden sind.
- **SC-003**: 100 % der Eingaben außerhalb des digitalisierten Wertebereichs
  führen zu einer klaren Fehlermeldung statt zu einem (falschen) Ergebnis.
- **SC-004**: Die digitalisierten Tabellenwerte stimmen vollständig mit dem
  Original-Flughandbuch überein (verifiziert durch die doppelte Prüfung aus
  FR-002).
- **SC-005**: Das System reproduziert das im POH auf Seite 5-3 bis 5-5
  beschriebene Verfahren Schritt für Schritt. Geprüft wird gegen die von Hand
  erstellten und in `reference-calculation.md` dokumentierten Sollwerte. Dazu
  gehört das Rechenbeispiel des Handbuchs selbst: speist man dessen Tabellenwerte
  in das Verfahren ein, müssen alle Zwischenwerte und die Summe von 85,4 l
  getroffen werden. Die Tabellenwerte des Beispiels stammen aus Abschnitt 5a und
  sind für D-EELK nicht anwendbar; sie dienen ausschließlich als Testvorgabe und
  dürfen nicht in die Datengrundlage gelangen (FR-015).

## Out of Scope (diese Iteration)

- Start- und Landestreckenberechnung, Masse und Schwerpunkt.
- Sinkflug, 45-Minuten-Reserve und der Weg zu einem Ausweichflugplatz. Vorgesehen
  ist, dass das Ergebnis diese Posten später zusätzlich getrennt ausweist
  (Rollen, Steigflug, Reiseflug, Sinkflug, Reserve, Ausweichflugplatz). Für
  Sinkflug und Ausweichflugplatz fehlt in der POH-Ergänzung allerdings jede
  Tabellengrundlage — das Folge-Feature muss zuerst klären, woher diese Werte
  stammen sollen. Bis dahin weist dieses Feature das Fehlen ausdrücklich aus
  (FR-018).
- Automatische Übernahme von Streckenlänge, Platzhöhe oder Wetterdaten aus
  externen Quellen; alle Werte werden vom Piloten eingegeben.
- Unterstützung weiterer Flugzeuge/Flughandbücher außer D-EELK.

## Assumptions

- Unterstützt wird zunächst ausschließlich das Flugzeug D-EELK; weitere
  Flugzeuge/Flughandbücher sind ein separates, späteres Feature.
- D-EELK ist eine Cessna 172N mit Standardtanks. Damit gilt die maximale
  Abflugmasse 1043 kg und eine ausfliegbare Kraftstoffmenge von 127,4 l. Für das
  Flugzeug ist genau eine Steigflug- und genau eine Reiseleistungstabelle
  anwendbar; Abflugmasse und Tankvariante werden daher nicht abgefragt.
- Die Steigflugtabelle gilt für die maximale Abflugmasse. Ein leichter beladenes
  Flugzeug steigt besser und verbraucht dabei weniger — die Rechnung ist damit auf
  der sicheren Seite.
- Die Windkomponente wird als über die gesamte Strecke konstant angenommen. Wer
  mit wechselndem Wind rechnet, muss den ungünstigsten Wert ansetzen.
- Der Pilot gibt Höhen als Druckhöhe ein; die Umrechnung von Platzhöhe und
  QNH auf die Druckhöhe ist nicht Teil dieses Features.
- Die Kraftstoffverbrauchsrate hängt laut den digitalisierten Tabellen
  ausschließlich von der Lasteinstellung ab (100 % = 33,6 l/h bis 50 % = 15,3 l/h)
  — identisch über alle Druckhöhen, Abfluggewichte und Tankvarianten. Druckhöhe
  und Temperatur wirken auf KTAS, Reichweite und Flugdauer, nicht auf die Rate.
- Für dieses Feature ist kein Login/Rollenmodell erforderlich; die
  vereinsweite Authentifizierung ist laut Status in `README.md` noch offen und
  wird hier nicht vorausgesetzt.
- Die Original-Flughandbuch-Ergänzung für den Technify-Motor liegt in
  beschaffbarer Form als PDF vor.

## Geklärte Punkte

- **Muster und Tankkonfiguration** (2026-08-06): D-EELK ist eine Cessna F172N mit
  Standardtanks. Damit gelten 1043 kg maximale Abflugmasse und 127,4 l
  ausfliegbarer Kraftstoff; Abb. 5-3a und 5-4a sind die anwendbaren Tabellen.
- **Vy-Widerspruch im Original** (2026-08-06): Die Bedingungen der
  Steigflugtabellen nennen vy = 69 KIAS, die Vy-Spalte derselben Tabellen 70 KIAS.
  Maßgeblich ist der Spaltenwert (70 KIAS). Der Widerspruch bleibt in der
  Datengrundlage vermerkt, damit er beim Abgleich mit dem Original nicht für einen
  Digitalisierungsfehler gehalten wird. In die Bedarfsrechnung geht Vy nicht ein.
- **Temperaturkorrektur des Steigflug-Kraftstoffs** (2026-08-06): Die Korrektur
  wird zusätzlich auf den Kraftstoff angewandt, obwohl Anmerkung 2 nur Zeit und
  Steigstrecke nennt — so rechnet das Rechenbeispiel des POH, und es ist die
  konservativere Auslegung. Die Abweichung wird laut FR-019 offengelegt.
- **Stetige statt stufenweiser Korrektur** (2026-08-06): Das POH rechnet selbst
  `20 °C / 10 °C × 10 % = 20 %`, also stetig. Eine stufenweise Anwendung würde
  zudem bei ISA+10 einen Sprung erzeugen.
- **Rundung genau einmal** (2026-08-06): Die Zwischenwerte werden in voller
  Genauigkeit weitergerechnet, gerundet wird erst das Ergebnis. Das Handbuch
  rundet dagegen nach jedem Schritt. Die daraus entstehende Differenz ist klein
  und richtungslos, wird aber laut FR-020 offengelegt. Einmaliges Runden ist die
  Voraussetzung dafür, dass Web-Oberfläche und MCP-Server dieselbe Zahl liefern
  (Constitution-Prinzip IV, Zusicherung C-03).
- **Rundungsstellen wie im POH** (2026-08-06): Kraftstoff auf 0,1 l, Zeiten auf
  ganze Minuten, Strecken auf 0,1 NM, Geschwindigkeiten auf ganze Knoten
  (FR-021). Das Handbuch stellt seine Werte genauso dar — im Rechenbeispiel
  etwa 122 kt statt 122,4 —, sodass beim Vergleich keine Scheingenauigkeit
  entsteht, die es in der Quelle gar nicht gibt.
