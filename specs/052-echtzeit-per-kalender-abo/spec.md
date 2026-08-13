# Feature Specification: Reservierungsstand in Echtzeit über das Kalender-Abo

**Feature Branch**: `052-echtzeit-per-kalender-abo`

**Created**: 2026-08-13

**Status**: Draft

**Input**: GitHub-Issue #52 — „Es gibt einen Kalender-Abo-Link. Die Abrufe des
Kalenders sind frei und können somit ergänzend genutzt werden, um eine
Echtzeit-Abfrage zum entfernten Stand zu erreichen."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Der Stand ist aktuell, nicht bis zu zehn Minuten alt (Priority: P1)

Ein Mitglied trägt sich in Vereinsflieger für die D-EELK ein und öffnet
unmittelbar danach Bucky — etwa um einem Vereinskameraden zu zeigen, dass der
Flieger jetzt belegt ist. Bucky zeigt die Reservierung sofort, nicht erst nach
dem nächsten Abruftakt.

**Why this priority**: Das ist der Kern des Features. Heute kann die Anzeige bis
zu zehn Minuten hinterherhinken. Genau in diesem Fenster entsteht der Schaden,
den Feature 047 vermeiden wollte: Zwei Mitglieder halten dasselbe Flugzeug für
frei. Eine Auskunft, die nachweislich veraltet sein kann, muss man
gegenprüfen — und dann hätte man auch gleich in Vereinsflieger schauen können.

**Independent Test**: In Vereinsflieger eine Reservierung anlegen, Bucky ohne
Wartezeit aufrufen und prüfen, ob sie bereits erscheint. Danach die
Reservierung wieder entfernen und prüfen, ob sie ebenso schnell verschwindet.

**Acceptance Scenarios**:

1. **Given** in Vereinsflieger wird eine Reservierung für die D-EELK angelegt,
   **When** ein Mitglied die Seite unmittelbar danach öffnet, **Then** ist die
   Reservierung in der Aussage berücksichtigt.
2. **Given** eine Reservierung wird in Vereinsflieger gelöscht, **When** ein
   Mitglied die Seite unmittelbar danach öffnet, **Then** gilt das Flugzeug
   wieder als frei.
3. **Given** ein Mitglied öffnet die Seite, **When** die Auskunft aus dem
   Kalender stammt, **Then** nennt die Seite ein Alter, das die Aussage als
   taufrisch ausweist statt eines Alters von bis zu zehn Minuten.

---

### User Story 2 - Auch wenn die Quelle schweigt, bleibt eine Aussage übrig (Priority: P1)

Die Gegenstelle antwortet nicht — Wartungsfenster, Netzstörung, zurückgezogenes
Abo. Ein Mitglied öffnet die Seite trotzdem und bekommt den zuletzt bekannten
Stand mitsamt seinem Alter, nicht eine Fehlermeldung und nicht das Schweigen,
das wie „frei" aussieht.

**Why this priority**: Gleichrangig mit P1, weil Echtzeit ohne Rückfall ein
Rückschritt wäre. Der heutige Weg ist langsam, aber robust: Der gespeicherte
Stand überlebt jeden Ausfall der Gegenstelle. Diese Eigenschaft darf das neue
Feature nicht eintauschen — sonst wird aus „bis zu zehn Minuten alt"
gelegentlich „gar keine Auskunft". Entscheidend ist, dass beide Wege
**verschiedene Zugänge und verschiedene Zugangsdaten** nutzen: Sie fallen
deshalb nicht gemeinsam aus, und genau darin liegt der Wert des Rückfalls.

**Independent Test**: Den Zugang zum Kalender vorübergehend unbrauchbar machen
und die Seite aufrufen. Es muss der zuletzt gespeicherte Stand mit ehrlichem
Alter und dem zurückhaltenden Hinweis erscheinen, dass es sich um den letzten
bekannten Stand handelt.

**Acceptance Scenarios**:

1. **Given** der Kalender ist nicht erreichbar, **When** ein Mitglied die Seite
   öffnet, **Then** erscheint der zuletzt gespeicherte Stand samt seinem Alter,
   erkennbar als letzter bekannter Stand.
2. **Given** der Kalender antwortet, aber unverständlich, **When** ein Mitglied
   die Seite öffnet, **Then** gilt dasselbe wie bei Nichterreichbarkeit.
3. **Given** der Kalender braucht ungewöhnlich lange, **When** eine festgelegte
   Wartezeit überschritten ist, **Then** wird nicht weiter gewartet, sondern der
   gespeicherte Stand gezeigt.
4. **Given** weder Kalender noch gespeicherter Stand liefern etwas, **When** ein
   Mitglied die Seite öffnet, **Then** sagt die Seite das offen und behauptet
   nicht, das Flugzeug sei frei.
5. **Given** der Kalender antwortet wieder, **When** ein Mitglied die Seite
   erneut öffnet, **Then** verschwindet der Hinweis auf den letzten bekannten
   Stand ohne weiteres Zutun.

---

### User Story 3 - Wartungssperren werden endlich sichtbar (Priority: P2)

Die D-EELK steht zur 200-Stunden-Kontrolle in der Werkstatt. Ein Mitglied
öffnet Bucky und liest, dass sie nicht verfügbar ist — und zwar wegen einer
Sperre, nicht wegen einer Reservierung.

**Why this priority**: Kein neues Bedürfnis, sondern eine Zusicherung, die
bereits besteht: FR-007a aus Feature 047 verlangt diese Unterscheidung. Sie war
bislang praktisch wirkungslos, weil auf dem bisherigen Weg keine Sperren
ankamen. Der Kalender führt sie mit. P2, weil die Seite auch ohne diese
Unterscheidung eine richtige Aussage trifft — nur eine ärmere.

**Independent Test**: Einen Zeitraum prüfen, in dem im Kalender eine Sperre
liegt, und nachsehen, ob die Anzeige sie als Sperre benennt.

**Acceptance Scenarios**:

1. **Given** im Kalender liegt für die D-EELK eine Sperre, **When** ein Mitglied
   die Seite innerhalb dieses Zeitraums öffnet, **Then** ist das Flugzeug belegt
   und die Anzeige benennt eine Sperre statt einer Reservierung.
2. **Given** eine Sperre grenzt unmittelbar an eine Reservierung, **When** die
   Anzeige den nächsten Wechsel nennt, **Then** wird das Ende der gesamten Kette
   genannt und nicht der Übergang zwischen beiden.

---

### Edge Cases

- **Der Kalender antwortet mit einer Fehlerseite statt mit einem Kalender.**
  Etwa, wenn das Abo zurückgezogen wurde. Eine Antwort, die kein Kalender ist,
  muss als Fehlschlag zählen, nicht als „keine Einträge" — sonst gälte jedes
  Flugzeug schlagartig als frei. Das ist der gefährlichste Fall dieses Features.
- **Der Kalender ist leer.** Muss von „nicht erreichbar" unterschieden werden:
  Ein gültiger, leerer Kalender ist eine gültige Aussage.
- **Der Kalender enthält Einträge, die keine Flugzeuge sind** (Werkstatt, Grill,
  Landebar). Sie sind auszusortieren wie bisher.
- **Ein Zeitraum endet vor seinem Beginn oder ist unlesbar datiert.** Einzelne
  fehlerhafte Einträge dürfen nicht den ganzen Abruf verwerfen.
- **Die Beschriftung der Einträge ändert sich** bei der Gegenstelle. Das muss
  auffallen, statt still falsche Aussagen zu erzeugen.
- **Die Zeilen des Kalenders werden künftig umbrochen.** Der Kalenderstandard
  sieht das vor, die Gegenstelle tut es derzeit nicht. Führt sie es ein, darf
  die Auswertung nicht stillschweigend brechen.
- **Der Zeitraum des Kalenders reicht nicht weit genug.** Liegt die nächste
  Belegung jenseits des gelieferten Fensters, darf daraus nicht „keine weitere
  Belegung" werden, wenn sich das nicht sicher sagen lässt.
- **Viele Aufrufe in kurzer Zeit** (etwa durch einen Suchmaschinen-Roboter)
  dürfen die Gegenstelle nicht überlasten.
- **Sommerzeitumstellung**: Der Kalender liefert Zeiten in Weltzeit, die Anzeige
  spricht Ortszeit. Die doppelte und die fehlende Stunde müssen stimmen.

## Requirements *(mandatory)*

### Functional Requirements

#### Die Echtzeitquelle

- **FR-001**: Der Reservierungsstand MUSS beim Aufruf der Anzeige unmittelbar
  aus dem Kalender-Abo bezogen werden, statt ausschließlich aus einem in festem
  Takt gefüllten Zwischenspeicher.
- **FR-002**: Der Abruf des Kalenders MUSS ausschließlich serverseitig
  geschehen. Die Abo-Adresse DARF unter keinen Umständen an den Browser
  gelangen — weder in einer Antwort, noch in einer Weiterleitung, noch in einer
  Fehlermeldung.
- **FR-003**: Die Abo-Adresse MUSS als Geheimnis verwaltet werden und DARF nicht
  in der Quellcodeverwaltung liegen.
- **FR-004**: Für den Abruf MUSS eine Wartezeit festgelegt sein, nach deren
  Ablauf nicht weiter gewartet, sondern auf den gespeicherten Stand
  zurückgefallen wird.
- **FR-005**: Die Gegenstelle MUSS vor Überlastung geschützt werden, sodass eine
  hohe Zahl von Aufrufen nicht in dieselbe Zahl von Abrufen mündet.

#### Der Rückfall

- **FR-006**: Schlägt der Abruf fehl, MUSS der zuletzt gespeicherte Stand
  verwendet werden. Ein Fehlschlag DARF den gespeicherten Stand nicht
  überschreiben oder verwerfen.
- **FR-007**: Eine Antwort, die kein gültiger Kalender ist, MUSS als Fehlschlag
  gelten und DARF nicht als „keine Belegungen" ausgelegt werden.
- **FR-008**: Liegt weder ein Abruf noch ein gespeicherter Stand vor, MUSS die
  Anzeige das offen sagen und DARF nicht behaupten, das Flugzeug sei frei
  (bekräftigt FR-010 aus Feature 047).
- **FR-009**: Der gespeicherte Stand MUSS weiterhin regelmäßig aufgefrischt
  werden, damit der Rückfall nicht seinerseits veraltet (Takt siehe FR-021).

#### Auswertung des Kalenders

- **FR-010**: Aus jedem Eintrag MÜSSEN Kennzeichen, Beginn, Ende und die
  Unterscheidung zwischen Reservierung und Sperre gewonnen werden.
- **FR-011**: Einträge, deren Gegenstand kein Luftfahrzeug ist, MÜSSEN
  aussortiert werden (übernimmt FR-003a aus Feature 047).
- **FR-012**: Einzelne unbrauchbare Einträge MÜSSEN übersprungen und gezählt
  werden, ohne den gesamten Abruf zu verwerfen.
- **FR-013**: Personenbezogene Angaben aus dem Kalender — insbesondere Namen —
  MÜSSEN so früh wie möglich verworfen werden und DÜRFEN weder gespeichert noch
  ausgeliefert werden (bekräftigt FR-006 aus Feature 047).
- **FR-014**: Zeitangaben MÜSSEN aus der Weltzeit des Kalenders in Ortszeit am
  Platz überführt werden, einschließlich der Übergänge der Sommerzeit.
- **FR-015**: Die Auswertung MUSS umbrochene Zeilen des Kalenderformats
  verarbeiten können, auch wenn die Gegenstelle derzeit keine erzeugt.
- **FR-016**: Es MUSS eine Prüfung geben, die anschlägt, wenn sich Aufbau oder
  Beschriftung der Kalendereinträge ändern.
- **FR-017**: Es DÜRFEN keine Daten in der Quelle verändert werden — der Zugriff
  bleibt ausschließlich lesend (übernimmt FR-012 aus Feature 047).

#### Anzeige

- **FR-018**: Die Anzeige MUSS weiterhin das Alter der Auskunft nennen. Stammt
  sie aus einem unmittelbaren Abruf, MUSS das als solches erkennbar sein.
- **FR-019**: Beruht die gezeigte Aussage auf dem Rückfall statt auf einem
  unmittelbaren Abruf, MUSS die Anzeige das zurückhaltend kenntlich machen —
  etwa als „letzter bekannter Stand". Sie DARF dabei weder den Grund des
  Fehlschlags erklären noch technische Begriffe verwenden noch die Gegenstelle
  beschuldigen. Der Zweck ist, dass das Mitglied die Aussage richtig einordnet,
  nicht dass es die Ursache erfährt.
- **FR-020**: Alle übrigen Zusicherungen der Anzeige aus Feature 047 (Ortszeit,
  Nennung von Vereinsflieger als verbindliche Quelle, Weg zur Buchung) MÜSSEN
  unverändert gelten.

#### Verhältnis zum bisherigen Weg

- **FR-021**: Der bisherige Abruf über die Programmierschnittstelle MUSS
  bestehen bleiben, jedoch in **deutlich größerem Takt** laufen. Er dient nicht
  mehr der Anzeige, sondern allein dem Rückfall: Er hält den gespeicherten Stand
  so frisch, dass er im Störungsfall noch brauchbar ist. Der Takt MUSS so
  gewählt sein, dass der gespeicherte Stand jung genug für eine ehrliche Aussage
  bleibt und zugleich das Tageskontingent des Vereins spürbar entlastet wird.
- **FR-021a**: Die beiden Wege MÜSSEN voneinander unabhängig bleiben — ein
  Fehlschlag des einen DARF den anderen nicht beeinträchtigen. Genau in dieser
  Unabhängigkeit liegt der Wert des Rückfalls: Beide Wege nutzen verschiedene
  Zugänge und verschiedene Zugangsdaten und fallen deshalb nicht gemeinsam aus.
- **FR-022**: Die Aussage über Belegung, nächsten Wechsel und Kettenbildung MUSS
  unabhängig von der Herkunft der Daten dieselbe bleiben — es DARF keine zweite
  Auslegung derselben Frage entstehen (Verfassungsprinzip IV).

### Key Entities *(include if data involved)*

- **Kalendereintrag**: Ein Zeitraum aus dem Abo, bestehend aus Gegenstand
  (Flugzeugkennzeichen oder anderes), Beginn und Ende in Weltzeit sowie der
  Angabe, ob es sich um eine Reservierung oder eine Sperre handelt. Enthält in
  der Quelle zusätzlich Personennamen, die nicht übernommen werden.
- **Abrufstand**: Wie in Feature 047 — die Gesamtheit der bekannten Belegungen
  samt Zeitpunkt ihrer Erhebung. Bekommt zusätzlich die Angabe, aus welcher
  Quelle er stammt.
- **Belegungsauskunft**: Unverändert aus Feature 047 — die abgeleitete Aussage
  für ein Flugzeug.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Eine in Vereinsflieger vorgenommene Änderung ist in der Anzeige
  binnen einer Minute sichtbar, statt wie bisher binnen zehn Minuten.
- **SC-002**: Die Anzeige erscheint aus Sicht des Mitglieds weiterhin ohne
  spürbare Wartezeit; der zusätzliche Abruf verlängert den Aufbau der Seite
  nicht merklich.
- **SC-003**: Fällt die Gegenstelle vollständig aus, liefert die Anzeige in
  100 % der Aufrufe weiterhin eine ehrliche Aussage — entweder den
  gespeicherten Stand mit Alter oder den offenen Hinweis, dass nichts vorliegt.
  In keinem Fall erscheint fälschlich „frei".
- **SC-004**: Der Verbrauch an Anmeldungen bei der Programmierschnittstelle
  sinkt gegenüber Feature 047 deutlich, weil der Abruf nur noch den Rückfall
  pflegt. Über einen vollen Tag hinweg bleibt er weit unterhalb dessen, was dem
  Tageskontingent des Vereins gefährlich werden könnte.
- **SC-004a**: Der gespeicherte Rückfallstand ist zu jedem Zeitpunkt jung genug,
  dass die daraus abgeleitete Aussage über den *laufenden* Zustand noch zutrifft.
  Wird er älter, sagt die Anzeige das (FR-018, FR-019), statt ihn als gegenwärtig
  auszugeben.
- **SC-005**: Ändert sich der Aufbau der Kalendereinträge, schlägt die dafür
  vorgesehene Prüfung fehl, bevor die Änderung in Betrieb geht.
- **SC-006**: Zu keinem Zeitpunkt sind Namen von Mitgliedern über die Anzeige
  oder die von ihr genutzte Auskunft abrufbar.

## Assumptions

- Das Kalender-Abo bleibt bestehen und wird nicht ohne Vorwarnung
  zurückgezogen. Wird es zurückgezogen, greift der Rückfall aus User Story 2.
- Der gelieferte Zeitraum des Kalenders (nach heutiger Messung rund fünf Wochen
  rückwärts und vier Wochen vorwärts) genügt für die Aussage „jetzt frei oder
  belegt" und „nächster Wechsel". Für weiter entfernte Auskünfte ist er nicht
  gedacht, und dieses Feature führt sie auch nicht ein.
- Der Kalender bildet den ganzen Verein ab, nicht nur die Buchungen eines
  einzelnen Mitglieds. Das ist an den enthaltenen Fremdbuchungen abgelesen und
  vor der Umsetzung zu bestätigen.
- Die Bitte der Gegenstelle um vierstündliches Abrufen richtet sich an
  Kalenderprogramme, die stur in festem Takt fragen. Ein bedarfsweiser Abruf bei
  tatsächlichem Interesse eines Mitglieds erzeugt bei der Größe des Vereins
  weniger Verkehr als ein solcher Takt und widerspricht der Bitte daher nicht
  dem Sinne nach.
- Die Anzeige bleibt auf die D-EELK beschränkt; die übrigen Flugzeuge werden
  weiterhin mit erfasst, aber nicht dargestellt.
- Die bestehende Zusicherung aus Feature 047, dass keine Personendaten nach
  außen gelangen, gilt unverändert und wird durch dieses Feature eher
  gefestigt als gelockert.

## Dependencies

- Feature 047 („Reservierungsstand der D-EELK anzeigen") ist Grundlage: Der
  gemeinsame Kern, der Zwischenspeicher und die Anzeige stammen von dort.
- Das Kalender-Abo von Vereinsflieger. Die Adresse ist ein Geheimnis und wird
  außerhalb der Quellcodeverwaltung verwahrt.
