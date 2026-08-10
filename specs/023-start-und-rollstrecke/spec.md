# Feature Specification: Roll- und Startstrecke mit neuem Seitenaufbau

**Feature Branch**: `023-start-und-rollstrecke`

**Created**: 2026-08-10

**Status**: Draft

**Input**: Oberhalb des Fieldsets „Streckenflug" gibt es eine neue h2 „Start und
Streckenflug". Das Fieldset selbst hat dann den Titel „Platzhöhe und
Windkomponente" und damit auch nur diese beiden Input-Felder. Darunter folgt ein
Bereich, der ab einer bestimmten Breite zweispaltig ist, ansonsten (mobil)
einspaltig. Erster Bereich: „Roll- und Startstrecke" mit den Infos aus dem
Handbuch als Hinweis (Seite 5b-2), Anmerkung 2 wird aus dem
Windkomponente-Input-Feld oben genommen, aber zur Info die Rechnung hier nochmal
wiederholt, 3. für trockene Grasbahn ist ein Schalter, der die zus. 15 %
berechnet, und 4. ebenfalls ein Schalter für die 20 %. Darunter folgt eine
Tabelle mit der Rechnung, die ähnlich aufgebaut ist wie „Kraftstoffbedarf und
Geschwindigkeiten" im Moment. Die zweite Spalte bzw. darunter folgt dann der
bisherige Abschnitt „Kraftstoffbedarf und Geschwindigkeiten", nur wird hier dann
das Input-Feld der „Streckenlänge" an diese Stelle gesetzt, weil sie erst ab
hier relevant ist.

**Issue**: [#23](https://github.com/edsh/bucky/issues/23)

## Clarifications

### Session 2026-08-10

Alle drei Fragen betreffen die Auslegung der Anmerkungen auf Seite 5b-2. Sie
sind sicherheitskritisch, weil jede Auslegung die ausgewiesene Startstrecke
unmittelbar verändert; nach Prinzip I gehören sie entschieden und im Kern
hinterlegt, statt im Einzelfall ausgelegt zu werden.

- **F: Wirkt der Windzuschlag aus Anmerkung 2 anteilig oder nur in vollen
  Stufen?**
  A: Anteilig. Der Abschlag beträgt 10 % je 9 kt Gegenwind, der Zuschlag 10 %
  je 2 kt Rückenwind, jeweils geradlinig auch für Zwischenwerte — 5 kt
  Gegenwind ergeben also 5,6 %. Mehrfache Stufen werden addiert, nicht
  multipliziert (18 kt Gegenwind ergeben 20 %, nicht 19 %). Die
  Gegenwindgutschrift ist bei 50 % gedeckelt, damit kein Wind eine Startstrecke
  gegen null rechnet.

- **F: Worauf wirken die 15 % aus Anmerkung 3?**
  A: 15 % des Startlaufs werden **beiden** Werten zugeschlagen — dem Startlauf
  und der Strecke über das Hindernis. Das folgt dem Plural „Strecken" bei
  zugleich ausdrücklichem Bezug auf „den Wert Startlauf".

- **F: Worauf wirken die 20 % aus Anmerkung 4, und wie wird „min." abgebildet?**
  A: Ebenso — 20 % des Startlaufs auf beide Werte, also dieselbe Rechenart wie
  Anmerkung 3. Das Ergebnis wird als Mindestwert gekennzeichnet und mit einem
  Hinweis versehen, dass der Pilot je nach Zustand der Bahn mehr ansetzen muss.

- **Zusammenwirken (Folgefrage, mitentschieden):** Sind beide Schalter gesetzt,
  wirken sie additiv auf dieselbe Bezugsgröße: 15 % + 20 % = 35 % des
  Startlaufs, nicht 1,15 × 1,20. Bezugsgröße ist der Startlauf **nach** dem
  Windzuschlag, weil das Handbuch die Anmerkungen in dieser Reihenfolge führt
  und Anmerkung 4 ausdrücklich von „zusätzlichen" Zuschlägen spricht.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Erfahren, wieviel Bahn der Start braucht (Priority: P1)

Ein Pilot will wissen, ob die Bahn seines Startplatzes für die D-EELK reicht. Er
gibt Platzhöhe, Luftdruck und Temperatur ein und liest ab, wieviel Meter die
Maschine bis zum Abheben rollt und wieviel sie insgesamt bis über ein
15-m-Hindernis braucht. Eine Streckenlänge muss er dafür nicht eingeben — die
Frage stellt sich vor der Streckenplanung.

**Why this priority**: Die Startstrecke ist der sicherheitskritischste Wert des
gesamten Abschnitts 5b und der einzige, bei dem ein zu optimistisches Ergebnis
unmittelbar am Bahnende endet. Die Tabelle dafür ist bereits digitalisiert
(Abb. 5-1a, 77 Zeilen, keine Lücken) und wird bislang nicht genutzt.

**Independent Test**: Platzhöhe und Temperatur auf Stützstellen der Tabelle
setzen und prüfen, dass Startlauf und Strecke über das Hindernis exakt den
Tabellenzeilen entsprechen. Danach einen Zwischenwert prüfen: Beide Werte müssen
zwischen denen der benachbarten Stützstellen liegen.

**Acceptance Scenarios**:

1. **Given** Druckhöhe 0 ft und Umgebungstemperatur 20 °C, **When** die
   Startstrecke erscheint, **Then** zeigt sie 204 m Startlauf und 319 m über das
   15-m-Hindernis — die Werte der zugehörigen Tabellenzeile.
2. **Given** eine Platzhöhe zwischen zwei Stützstellen des Höhenrasters,
   **When** die Startstrecke erscheint, **Then** liegen beide Werte zwischen
   denen der beiden Nachbarzeilen.
3. **Given** eine Temperatur zwischen zwei Stützstellen, **When** die
   Startstrecke erscheint, **Then** wird zwischen den Nachbarwerten
   interpoliert, nicht auf die nächstgelegene Stützstelle gerundet.
4. **Given** irgendeine gültige Eingabe, **When** die Startstrecke erscheint,
   **Then** nennt die Ausgabe Abbildungsnummer, Tabellenname und Seitenzahl des
   Originals und den Hinweis, das Ergebnis vor dem Flug dagegen zu prüfen.

---

### User Story 2 - Die Zuschläge des Handbuchs nachvollziehen (Priority: P1)

Der Pilot sieht neben dem Ergebnis, welche Anmerkungen des Handbuchs auf seinen
Fall angewandt wurden und mit welcher Rechnung. Der Windzuschlag ergibt sich aus
der Windkomponente, die er ohnehin schon eingegeben hat; die Bahnbeschaffenheit
schaltet er selbst zu.

**Why this priority**: Ein Startstreckenwert ohne die Anmerkungen ist
irreführend — der reine Tabellenwert gilt für befestigte, ebene, trockene Bahn
bei Windstille. Auf einer Grasbahn ist der wahre Bedarf deutlich größer. Ohne
die offengelegte Rechnung kann der Pilot das Ergebnis nicht gegen das Handbuch
prüfen, was Prinzip I ausdrücklich verlangt.

**Independent Test**: Die Schalter einzeln und gemeinsam umlegen und prüfen,
dass sich das Ergebnis um den jeweils ausgewiesenen Betrag ändert und die
Rechnung Schritt für Schritt mitgeführt wird.

**Acceptance Scenarios**:

1. **Given** eine Windkomponente von 9 kt Gegenwind bei sonst 204 m Startlauf
   und 319 m über das Hindernis, **When** die Startstrecke erscheint, **Then**
   sind beide Werte um 10 % verringert — 184 m und 287 m — und der Abschlag ist
   als eigener Rechenschritt mit Anmerkung 2 als Grundlage ausgewiesen.
2. **Given** eine Windkomponente von 5 kt Gegenwind, **When** die Startstrecke
   erscheint, **Then** beträgt der Abschlag 5,6 % — anteilig, nicht erst ab
   vollen 9 kt.
3. **Given** Windstille, **When** die Startstrecke erscheint, **Then** wird kein
   Windzuschlag angewandt und das Ergebnis entspricht dem reinen Tabellenwert.
4. **Given** 6 kt Rückenwind, **When** die Startstrecke erscheint, **Then** sind
   beide Werte um 30 % vergrößert.
5. **Given** der Schalter für trockene Grasbahn ist gesetzt bei 204 m Startlauf
   und Windstille, **When** die Startstrecke erscheint, **Then** sind beide
   Werte um dieselben 30,6 m erhöht — 235 m und 350 m — als eigener
   Rechenschritt mit Anmerkung 3 als Grundlage.
6. **Given** beide Bahnschalter sind gesetzt, **When** die Startstrecke
   erscheint, **Then** beträgt der gemeinsame Aufschlag 35 % des Startlaufs,
   getrennt nach beiden Anmerkungen ausgewiesen, und das Ergebnis ist als
   Mindestwert gekennzeichnet.
7. **Given** irgendein Zustand der Schalter, **When** die Startstrecke
   erscheint, **Then** stehen die vier Anmerkungen des Handbuchs im Wortlaut als
   Hinweis daneben, mit Seitenangabe 5b-2.

---

### User Story 3 - Start und Strecke in einem Blick (Priority: P2)

Der Pilot sieht auf einem breiten Bildschirm die Startstrecke und den
Kraftstoffbedarf nebeneinander und kann beides gegeneinander abwägen. Auf dem
Telefon liest er dieselben Inhalte untereinander, ohne waagerecht zu scrollen.
Die Streckenlänge gibt er erst dort ein, wo sie zum ersten Mal gebraucht wird.

**Why this priority**: Der Nutzen der Rechnung entsteht unabhängig vom
Seitenaufbau; das Nebeneinander macht sie aber erst zur Flugvorbereitung statt
zu zwei Einzelauskünften. Die Eingabefelder folgen dabei dem Gedankengang: erst
was den Start bestimmt, dann was die Strecke bestimmt.

**Independent Test**: Die Seite auf schmaler und breiter Darstellung öffnen und
prüfen, dass beide Bereiche vollständig erreichbar sind, in der jeweils
erwarteten Anordnung und ohne waagerechtes Scrollen.

**Acceptance Scenarios**:

1. **Given** eine breite Darstellung, **When** die Seite erscheint, **Then**
   stehen „Roll- und Startstrecke" und „Kraftstoffbedarf und Geschwindigkeiten"
   nebeneinander.
2. **Given** eine schmale Darstellung, **When** die Seite erscheint, **Then**
   stehen dieselben Bereiche untereinander, die Startstrecke zuerst, und es
   entsteht kein waagerechtes Scrollen.
3. **Given** die Seite ist geöffnet, **When** der Pilot die Eingabefelder
   durchgeht, **Then** stehen Platzhöhe und Windkomponente gemeinsam im Fieldset
   „Platzhöhe und Windkomponente", und die Streckenlänge steht beim
   Kraftstoffbedarf.
4. **Given** die Seite ist geöffnet, **When** der Pilot sie mit der Tastatur
   bedient, **Then** folgt die Reihenfolge der Bedienelemente der sichtbaren
   Anordnung.

---

### Edge Cases

- **Platz über dem Tabellenrand**: Die Startstreckentabelle reicht bis 10 000 ft
  Druckhöhe, der Platzhöhen-Regler bis 18 000 ft. Liegt die Druckhöhe darüber,
  wird die Startstrecke abgelehnt, mit Nennung des überschrittenen Randes — es
  wird weder extrapoliert noch auf den Rand zurückgefallen. Der Kraftstoffbedarf
  bleibt davon unberührt und wird weiterhin ausgewiesen.
- **Temperatur außerhalb des Rasters**: Das Raster reicht von −20 °C bis 50 °C.
  Aus Platzdruckhöhe und ISA-Abweichung kann eine Temperatur außerhalb davon
  entstehen (etwa −30 °C ISA-Abweichung in 10 000 ft). Auch das wird abgelehnt,
  mit Nennung des tatsächlichen Werts und des zulässigen Bereichs.
- **Rückenwind über dem Geltungsbereich**: Anmerkung 2 deckt Rückenwind nur bis
  10 kt ab, der Regler reicht bis 50 kt. Darüber wird die Startstrecke
  abgelehnt statt ein Zuschlag fortgeschrieben.
- **Gegenwind stärker als vom Handbuch vorgesehen**: Ab 45 kt Gegenwind wäre die
  Startstrecke rechnerisch halbiert; weitere Gutschrift entfällt, die Grenze
  wird im Rechenschritt ausgewiesen.
- **Beide Bahnschalter gesetzt**: Trockene Grasbahn und feuchte Bahn beschreiben
  unterschiedliche Zustände derselben Bahn. Beide zugleich sind trotzdem
  zulässig — sie ergeben zusammen 35 % des Startlaufs und damit den
  konservativsten Ansatz. Das Ergebnis trägt dann den Mindestwert-Hinweis aus
  Anmerkung 4.
- **Kraftstoffbedarf nicht berechenbar**: Schlägt die Kraftstoffrechnung fehl,
  bleibt die Startstrecke trotzdem sichtbar, und umgekehrt. Ein Fehler in einem
  Bereich verdeckt den anderen nicht.

## Requirements *(mandatory)*

### Functional Requirements

**Rechnung**

- **FR-001**: Das System MUSS Startlauf und Strecke über das 15-m-Hindernis aus
  der digitalisierten Tabelle „Roll- und Startstrecke [m] bei Abfluggewicht
  1043 kg (2300 lbs)" (Abb. 5-1a, Seite 5b-2/5b-3) ermitteln.
- **FR-002**: Das System MUSS zwischen den Stützstellen für Druckhöhe und
  Umgebungstemperatur interpolieren und DARF NICHT extrapolieren oder auf den
  Tabellenrand zurückfallen.
- **FR-003**: Das System MUSS die Umgebungstemperatur am Startplatz aus der
  eingegebenen ISA-Abweichung und der Druckhöhe des Platzes als eigenen,
  benannten Rechenschritt herleiten.
- **FR-004**: Das System MUSS den Windzuschlag nach Anmerkung 2 aus der bereits
  vorhandenen Windkomponente ableiten, und zwar anteilig: 10 % Abschlag je 9 kt
  Gegenwind, 10 % Zuschlag je 2 kt Rückenwind, geradlinig auch für
  Zwischenwerte. Mehrfache Stufen werden addiert, nicht multipliziert.
- **FR-004a**: Das System MUSS die Gegenwindgutschrift bei 50 % begrenzen, damit
  kein Gegenwind die Startstrecke gegen null rechnet. Ab welcher Windstärke die
  Grenze greift, MUSS im Rechenschritt sichtbar werden.
- **FR-004b**: Das System MUSS Rückenwind über 10 kt ablehnen, weil Anmerkung 2
  dafür keine Regel angibt; ein Zuschlag DARF NICHT über den Geltungsbereich
  hinaus fortgeschrieben werden.
- **FR-005**: Das System MUSS einen Zuschlag für trockene Grasbahn nach
  Anmerkung 3 zuschalten können, bemessen mit 15 % des Startlaufs und
  aufgeschlagen auf beide Werte — den Startlauf und die Strecke über das
  Hindernis.
- **FR-006**: Das System MUSS einen Zuschlag nach Anmerkung 4 für feuchte
  Grasbahn, aufgeweichten Untergrund oder Schnee zuschalten können, bemessen
  mit 20 % des Startlaufs und ebenfalls auf beide Werte aufgeschlagen.
- **FR-006a**: Das System MUSS das Ergebnis bei gesetztem Zuschlag nach
  Anmerkung 4 als Mindestwert ausweisen und den Piloten darauf hinweisen, dass
  der Zustand der Bahn einen höheren Ansatz erfordern kann.
- **FR-007**: Das System MUSS die Zuschläge in dieser Reihenfolge anwenden:
  zuerst den Windzuschlag auf beide Tabellenwerte, danach die Bahnzuschläge.
  Beide Bahnzuschläge MÜSSEN sich auf dieselbe Bezugsgröße beziehen — den
  Startlauf nach Windzuschlag — und additiv wirken (bei beiden Schaltern also
  35 % dieser Bezugsgröße, nicht 1,15 × 1,20).
- **FR-008**: Das System MUSS jeden Zwischenschritt der Rechnung — Tabellenwert,
  Temperaturherleitung, Windzuschlag, Bahnzuschläge, Ergebnis — einzeln
  ausweisen, jeweils mit Bezeichnung, Wert und Herkunft.
- **FR-009**: Das System MUSS die Startstreckenrechnung im Kernmodul
  durchführen; Weboberfläche und MCP-Zugang DÜRFEN NICHT rechnen, interpolieren
  oder runden (Prinzip IV).
- **FR-010**: Das System MUSS zu jedem Ergebnis Abbildungsnummer, Tabellenname
  und Seitenzahl des Originals sowie den Hinweis auf die Prüfung gegen das
  Original-POH liefern (Prinzip I).
- **FR-011**: Das System MUSS Eingaben außerhalb des Tabellenbereichs mit einer
  Meldung ablehnen, die den beanstandeten Wert, das betroffene Feld und den
  zulässigen Bereich nennt.

**Oberfläche**

- **FR-012**: Über dem bisherigen Fieldset MUSS die Überschrift „Start und
  Streckenflug" stehen.
- **FR-013**: Das Fieldset MUSS „Platzhöhe und Windkomponente" heißen und genau
  diese beiden Eingabefelder enthalten.
- **FR-014**: Das Eingabefeld „Streckenlänge" MUSS in den Bereich
  „Kraftstoffbedarf und Geschwindigkeiten" wandern.
- **FR-015**: Unterhalb des Fieldsets MÜSSEN die Bereiche „Roll- und
  Startstrecke" und „Kraftstoffbedarf und Geschwindigkeiten" stehen —
  nebeneinander, sobald die Darstellung breit genug ist, sonst untereinander mit
  der Startstrecke zuerst.
- **FR-016**: Der Bereich „Roll- und Startstrecke" MUSS die vier Anmerkungen des
  Handbuchs im Wortlaut mit Seitenangabe 5b-2 zeigen, ebenso die Bedingungen,
  unter denen die Tabelle gilt.
- **FR-017**: Der Bereich MUSS die angewandte Windrechnung wiederholen, obwohl
  der Wert oben eingegeben wird, damit sie ohne Blickwechsel nachvollziehbar
  ist.
- **FR-018**: Die Anmerkungen 3 und 4 MÜSSEN als Schalter bedienbar sein, deren
  Beschriftung erkennen lässt, welchen Bahnzustand sie beschreiben.
- **FR-019**: Das Ergebnis MUSS als Tabelle dargestellt werden, im Aufbau
  vergleichbar mit „Kraftstoffbedarf und Geschwindigkeiten".
- **FR-020**: Beide Bereiche MÜSSEN unabhängig voneinander bestehen bleiben,
  wenn der jeweils andere wegen unzulässiger Eingaben nichts anzeigen kann.
- **FR-021**: Die Seite MUSS auf 390 px Breite ohne waagerechtes Scrollen
  bedienbar bleiben.
- **FR-022**: Der MCP-Zugang MUSS die Startstrecke einschließlich Zuschlägen,
  Quellenangabe und Prüfhinweis ausgeben, mit denselben Werten wie die
  Weboberfläche.

### Key Entities

- **Startstreckenbedingungen**: Was den Start bestimmt — Platzhöhe über dem
  Meeresspiegel, Luftdruck, ISA-Abweichung, Windkomponente und Zustand der Bahn
  (trockene Grasbahn ja/nein, feuchte Bahn oder Schnee ja/nein).
- **Startstreckenergebnis**: Startlauf und Strecke über das 15-m-Hindernis, je
  als reiner Tabellenwert und als Endwert nach Zuschlägen, dazu die Folge der
  Rechenschritte, die Quellenangabe und der Prüfhinweis.
- **Zuschlag**: Ein einzelner Auf- oder Abschlag mit Grundlage (welche
  Anmerkung), Bezugsgröße, Prozentsatz und Betrag.
- **Startstreckentabelle**: Die digitalisierte Abb. 5-1a mit Raster über
  Druckhöhe (0 bis 10 000 ft) und Umgebungstemperatur (−20 bis 50 °C), ihren
  Geltungsbedingungen, Anmerkungen und der Quellenangabe.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An jeder der 77 Stützstellen der Tabelle stimmt das ausgewiesene
  Ergebnis ohne Zuschläge auf den Meter genau mit dem Original überein.
- **SC-002**: Ein Pilot erfährt Startlauf und Strecke über das Hindernis, ohne
  eine Streckenlänge einzugeben.
- **SC-003**: Zu jedem Ergebnis lässt sich die vollständige Rechnung vom
  Tabellenwert bis zum Endwert Schritt für Schritt ablesen, ohne die Seite zu
  verlassen.
- **SC-004**: Jedes Ergebnis nennt Seitenzahl und Tabellenname, sodass der Pilot
  es ohne Suchen im Handbuch gegenprüfen kann.
- **SC-005**: Eingaben außerhalb des Tabellenbereichs führen ausnahmslos zu
  einer Ablehnung mit Begründung, nie zu einem stillschweigend extrapolierten
  Wert.
- **SC-006**: Auf 390 px Breite sind alle Inhalte ohne waagerechtes Scrollen
  erreichbar; ab der festgelegten Breite stehen beide Bereiche nebeneinander.
- **SC-007**: Weboberfläche und MCP-Zugang liefern zu denselben Eingaben
  identische Werte, Quellenangaben und Prüfhinweise.

## Assumptions

- **Metertabelle als Grundlage**: Das Handbuch führt dieselben Startstrecken in
  Metern (Abb. 5-1a) und in Fuß (Abb. 5-1b) als getrennt gedruckte Tabellen. Die
  Metertabelle ist die Grundlage, weil deutsche Bahnlängen in Metern angegeben
  werden; die Fußtabelle bleibt digitalisiert, wird für die D-EELK aber nicht
  herangezogen. Umgerechnet wird nicht — es gilt der gedruckte Wert.
- **Nur 1043 kg**: Es wird ausschließlich die Tabelle für 1043 kg verwendet. Die
  Tabellen für 1089 kg gelten laut Handbuch nur für die Cessna 172P und sind für
  die D-EELK nicht anwendbar; das ist im Datenbestand bereits so vermerkt. Eine
  Eingabe des tatsächlichen Abfluggewichts ist nicht Teil dieses Features.
- **Temperaturherleitung**: Die Umgebungstemperatur ergibt sich aus der
  Standardatmosphäre (15 °C am Meeresspiegel, 0,0065 K/m Abnahme) zuzüglich der
  eingegebenen ISA-Abweichung — dieselbe Grundlage, die der Rechner bereits für
  die Druckhöhe nutzt. Eine getrennte Eingabe der Platztemperatur wird nicht
  eingeführt, damit nicht zwei Temperaturangaben auseinanderlaufen können.
- **Eine Windkomponente für beides**: Die vorhandene Windkomponente gilt
  zugleich als Wind auf der Bahn. Ein getrenntes Feld würde den Piloten zu einer
  zweiten Eingabe zwingen, die er im Regelfall gleich beantwortet; die
  Wiederholung der Rechnung im Startstreckenbereich macht den Bezug sichtbar.
- **Kein Klappen- oder Verfahrenswahlfeld**: Die Tabelle gilt für Klappen 10°
  und Kurzstartverfahren (Anmerkung 1). Diese Bedingungen werden als Text
  ausgewiesen, aber nicht zur Auswahl gestellt, weil das Handbuch für andere
  Verfahren keine Zahlen liefert.
- **Landestrecke bleibt außen vor**: Sie ist im Anhang nicht enthalten
  („Berechnung siehe Flughandbuch") und damit kein Bestandteil dieses Features.
- **Bestehende Regler bleiben**: Platzhöhe, Luftdruck, ISA-Abweichung und
  Windkomponente behalten ihre heutigen Wertebereiche. Wo die
  Startstreckentabelle enger ist als der Regler, entsteht eine Ablehnung statt
  einer stillen Begrenzung — so verhält sich der Rechner heute schon bei der
  Reiseleistung.

## Dependencies

- Die digitalisierte Tabelle `5b-takeoff-distance-m-1043kg` (Abb. 5-1a) liegt
  vollständig vor: 77 Zeilen, 11 Druckhöhen, 7 Temperaturen, keine Lücken, keine
  vermerkten Abweichungen vom Original.
- Die vorhandene Herleitung der Druckhöhe aus Platzhöhe und Luftdruck wird
  unverändert weiterverwendet.
- Der bestehende Bereich „Kraftstoffbedarf und Geschwindigkeiten" wird
  verschoben und um das Feld „Streckenlänge" ergänzt, inhaltlich aber nicht
  verändert.
