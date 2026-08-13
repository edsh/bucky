# Feature Specification: Reservierungsstand der D-EELK anzeigen

**Feature Branch**: `047-reservierungsstand-der-d`

**Created**: 2026-08-13

**Status**: Draft

**Input**: GitHub-Issue #47 — „Bucky soll zeigen, ob die D-EELK gerade frei ist
und wann die nächste Belegung beginnt. Schwerpunkt ist die Datenbasis, nicht die
Gestaltung."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ist die D-EELK gerade frei? (Priority: P1)

Ein Mitglied überlegt spontan, ob es fliegen kann. Es öffnet Bucky und liest in
einem Satz, woran es ist: „Frei — nächste Belegung Freitag, 15:00–19:00 Uhr"
oder „Belegt bis 15:00 Uhr". Keine Anmeldung, kein Suchen, kein Kalender.

**Why this priority**: Das ist die Frage, die vor jedem spontanen Flug steht.
Heute muss man sich dafür in Vereinsflieger anmelden — auf dem Telefon am
Flugplatz umständlich genug, dass viele es nicht tun und stattdessen anrufen
oder auf gut Glück hinfahren.

**Independent Test**: Die Seite aufrufen und die Aussage gegen den
Reservierungskalender in Vereinsflieger halten. Stimmen Zustand und nächste
Belegung überein, trägt die Geschichte für sich allein.

**Acceptance Scenarios**:

1. **Given** für die D-EELK ist keine Reservierung im Gange, **When** ein
   Mitglied die Seite öffnet, **Then** steht dort, dass das Flugzeug frei ist,
   samt Beginn und Ende der nächsten Belegung in Wochentag und Uhrzeit.
2. **Given** eine Reservierung läuft gerade, **When** ein Mitglied die Seite
   öffnet, **Then** steht dort, dass das Flugzeug belegt ist und ab wann es
   wieder frei wird.
3. **Given** für die D-EELK liegt überhaupt keine Reservierung vor, **When** ein
   Mitglied die Seite öffnet, **Then** steht dort, dass das Flugzeug frei ist und
   keine Belegung ansteht.
4. **Given** ein Mitglied sieht den Stand, **When** es die Seite betrachtet,
   **Then** stehen dort **keine Namen** — weder Pilot noch Fluglehrer.

---

### User Story 2 - Verlässlich statt aktuell um jeden Preis (Priority: P2)

Der Reservierungsstand stammt aus einer fremden Quelle, die ausfallen kann. Ein
Mitglied soll nie im Zweifel sein, wie frisch die Auskunft ist — und eine
veraltete Auskunft soll erkennbar veraltet sein, statt sich als aktuell
auszugeben.

**Why this priority**: Eine falsche „frei"-Auskunft ist schlimmer als gar keine:
Sie schickt jemanden zum Flugplatz. Die Anzeige darf Vertrauen nur so weit
beanspruchen, wie sie es verdient.

**Independent Test**: Die Quelle künstlich unerreichbar machen und die Seite
aufrufen. Sie muss den letzten bekannten Stand mit sichtbarem Alter zeigen,
statt leer zu bleiben oder eine Fehlermeldung an die Stelle der Auskunft zu
setzen.

**Acceptance Scenarios**:

1. **Given** der letzte erfolgreiche Abruf liegt zurück, **When** ein Mitglied
   die Seite öffnet, **Then** steht dabei, wann zuletzt abgerufen wurde.
2. **Given** die Quelle ist seit über einer Stunde nicht erreichbar, **When** ein
   Mitglied die Seite öffnet, **Then** ist der Stand sichtbar als veraltet
   gekennzeichnet und der Hinweis nennt Vereinsflieger als verbindliche Quelle.
3. **Given** es liegt noch nie ein erfolgreicher Abruf vor, **When** ein Mitglied
   die Seite öffnet, **Then** sagt die Seite offen, dass gerade keine Auskunft
   möglich ist — und behauptet nicht, das Flugzeug sei frei.

---

### User Story 3 - Von der Auskunft zur Buchung (Priority: P3)

Wer sieht, dass die D-EELK frei ist, will sie reservieren. Bucky führt dafür
nach Vereinsflieger, statt selbst zu buchen.

**Why this priority**: Ohne den Weiterweg endet die Auskunft in einer Sackgasse.
Sie ist aber erst nützlich, wenn die Auskunft selbst steht — deshalb zuletzt.

**Independent Test**: Den Verweis anklicken und prüfen, dass er in Vereinsflieger
landet.

**Acceptance Scenarios**:

1. **Given** ein Mitglied sieht den Reservierungsstand, **When** es reservieren
   will, **Then** findet es einen deutlich benannten Weg nach Vereinsflieger.
2. **Given** ein Mitglied folgt diesem Weg, **When** es dort bucht, **Then**
   ändert sich in Bucky nichts, was nicht auch in Vereinsflieger steht.

---

### Edge Cases

- **Eine Belegung beginnt in wenigen Minuten**: Die Auskunft „frei" ist zwar
  buchstäblich richtig, aber irreführend. Der Beginn der nächsten Belegung wird
  deshalb immer mitgenannt, nie nur der Zustand allein.
- **Zwei Belegungen schließen lückenlos aneinander an**: Als „frei ab" gilt das
  Ende der letzten zusammenhängenden Belegung, nicht das Ende der ersten.
- **Eine Belegung erstreckt sich über mehrere Tage**: Wochentag und Datum müssen
  aus der Angabe hervorgehen, sonst ist „bis 19:00 Uhr" mehrdeutig.
- **Sommer- und Winterzeit**: Alle Zeiten sind Ortszeit am Platz; eine
  Zeitumstellung darf die Anzeige nicht um eine Stunde verschieben.
- **Die Quelle antwortet, aber unverständlich**: Ein unbrauchbarer Abruf darf den
  zuletzt gültigen Stand nicht überschreiben.
- **Die Zugangsdaten des Dienstkontos werden abgelehnt**: Das ist wie jeder
  andere Ausfall zu behandeln — letzter Stand mit Alter, keine Falschauskunft.
- **Viele Mitglieder schauen gleichzeitig**: Die Zahl der Zuschauer darf die
  Zahl der Abrufe bei der Quelle nicht beeinflussen.

## Requirements *(mandatory)*

### Functional Requirements

**Die Datenbasis**

- **FR-001**: Der Reservierungsstand MUSS zentral und in festem Takt abgerufen
  und zwischengespeichert werden — nicht bei jedem Seitenaufruf und nicht je
  Besucher.
- **FR-002**: Der Abruftakt MUSS so gewählt sein, dass das Tageskontingent der
  Quelle (500 Aufrufe je Tag für den gesamten Verein) mit deutlichem Abstand
  eingehalten wird, unabhängig von der Zahl der Besucher.
- **FR-003**: Gespeichert werden MÜSSEN die Reservierungen **aller**
  Vereinsflugzeuge, damit ein weiteres Flugzeug später ohne neuen Abrufweg
  angezeigt werden kann.
- **FR-004**: Ein fehlgeschlagener oder unverständlicher Abruf DARF den zuletzt
  erfolgreich gespeicherten Stand nicht überschreiben oder löschen.
- **FR-005**: Zu jedem gespeicherten Stand MUSS der Zeitpunkt des Abrufs
  festgehalten werden.

**Was nach außen geht**

- **FR-006**: Nach außen gegeben werden DÜRFEN ausschließlich Zeiträume und die
  Angabe belegt/frei je Flugzeug. Namen von Piloten und Fluglehrern, Bemerkungen
  und interne Kennungen DÜRFEN die Anwendung nicht verlassen.
- **FR-007**: Die Anzeige MUSS in einem Satz sagen, ob die D-EELK frei oder
  belegt ist, und dazu den nächsten Wechsel dieses Zustands mit Wochentag,
  Datum und Uhrzeit nennen.
- **FR-008**: Alle Zeitangaben MÜSSEN Ortszeit am Platz sein und über die
  Zeitumstellung hinweg richtig bleiben.
- **FR-009**: Die Anzeige MUSS das Alter der Auskunft nennen und einen Stand,
  der älter als eine Stunde ist, sichtbar als veraltet kennzeichnen.
- **FR-010**: Liegt gar kein gültiger Stand vor, MUSS die Anzeige das offen
  sagen und DARF keinen Zustand behaupten.
- **FR-011**: Die Anzeige MUSS Vereinsflieger als verbindliche Quelle nennen und
  einen Weg dorthin anbieten.

**Grenzen**

- **FR-012**: Es DÜRFEN keine Daten in der Quelle verändert werden — kein
  Anlegen, Ändern oder Löschen von Reservierungen (Prinzip II).
- **FR-013**: Die Zugangsdaten des Dienstkontos DÜRFEN nicht in der
  Versionsverwaltung liegen und nicht an den Browser gelangen.
- **FR-014**: Mitglieder DÜRFEN nicht nach eigenen Zugangsdaten gefragt werden.
- **FR-015**: Die Anzeige MUSS ohne Anmeldung erreichbar sein — was durch FR-006
  vertretbar ist, weil ohne Namen nichts Schützenswertes übrig bleibt.

### Key Entities

- **Reservierung**: Ein Zeitraum, in dem ein Flugzeug belegt ist. Merkmale nach
  außen: Flugzeug, Beginn, Ende. Weitere Merkmale der Quelle (Pilot, Fluglehrer,
  Bemerkung, Kennungen) werden verarbeitet, aber nicht weitergegeben.
- **Abrufstand**: Die Gesamtheit der zuletzt erfolgreich geholten Reservierungen
  samt Abrufzeitpunkt. Grundlage jeder Auskunft; überdauert einen Ausfall der
  Quelle.
- **Belegungsauskunft**: Die abgeleitete Aussage für ein Flugzeug — frei oder
  belegt, dazu der nächste Zustandswechsel.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Ein Mitglied erfährt ohne Anmeldung und mit **einem** Seitenaufruf,
  ob die D-EELK frei ist und wann sich das ändert.
- **SC-002**: Die Auskunft stimmt mit dem Reservierungskalender in Vereinsflieger
  überein; sie hinkt ihm um höchstens fünfzehn Minuten hinterher.
- **SC-003**: Die Zahl der Abrufe bei der Quelle bleibt an jedem Tag unter einem
  Drittel des erlaubten Kontingents — auch an Tagen mit vielen Besuchern.
- **SC-004**: Fällt die Quelle aus, bleibt die Seite auskunftsfähig: Sie zeigt
  den letzten Stand samt Alter, in keinem Fall eine leere Seite oder eine
  Fehlermeldung an Stelle der Auskunft.
- **SC-005**: In keiner nach außen gegebenen Antwort ist ein Personenname
  enthalten — nachweisbar über die ausgelieferten Daten selbst.
- **SC-006**: Ein weiteres Vereinsflugzeug lässt sich später anzeigen, ohne den
  Abrufweg zu ändern.

## Assumptions

- **Das Dienstkonto besteht und hat keine Zwei-Faktor-Anmeldung.** Andernfalls
  verlangte jede Anmeldung ein Einmalkennwort, was einen unbeaufsichtigten Abruf
  unmöglich machte.
- **Ein Abruftakt von zehn Minuten genügt.** Reservierungen werden Stunden bis
  Tage im Voraus eingetragen; eine Verzögerung von zehn Minuten ist fachlich
  belanglos, spart aber den Löwenanteil des Kontingents (rund 150 Aufrufe am Tag
  gegenüber 500 erlaubten).
- **„Nächste Belegung" meint die nächste überhaupt**, ohne zeitliche Grenze.
  Steht in den nächsten Wochen nichts an, wird das gesagt, statt einen leeren
  Zeitraum darzustellen.
- **Die Gestaltung bleibt bewusst schlicht.** Dieses Feature schafft die
  Datenbasis und weist mit einer einfachen Anzeige nach, dass sie trägt; über
  Anwendungsfälle und Aufmachung wird in einem späteren Feature entschieden.
- **Die Anzeige ist anonym**, weil Klarnamen die Quelle nicht verlassen. Damit
  entfällt die Zugangshürde, die die Vorklärung sonst gefordert hätte. Ein
  späterer Anmeldeweg bleibt möglich, ist aber nicht Teil dieses Features.
- **Ort und Zeitzone**: EDSH, Ortszeit Europe/Berlin.
