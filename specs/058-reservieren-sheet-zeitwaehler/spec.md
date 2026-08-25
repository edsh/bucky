# Feature Specification: Reservieren-Sheet v2 — vollständiger Zeitwähler

**Feature Branch**: `058-reservieren-sheet-zeitwaehler`

**Created**: 2026-08-20

**Status**: Draft

**Input**: GitHub-Issue #58 „Reservieren-Sheet v2: vollstaendiger Zeitwaehler"; Gestaltungs-Handoff `docs/design_handoff_reservierung_v2/` (README v2, Prototyp, Spec-Entwurf des Gestalters)

## Warum es dieses Feature gibt

Feature 054 hat die Reservierungsübersicht gebaut: Flugzeugpark mit Tagesuhr-Ring,
Detailansicht mit Tagesbalken, Sieben-Tage-Liste und Wochenraster. Am Ende dieses
Wegs steht ein Sheet, das genau eine Auskunft gibt — die nächste freie Lücke, wie
der Kern sie vorschlägt — und einen Knopf nach Vereinsflieger.

Das ist zu wenig für die Frage, die Mitglieder tatsächlich stellen. Sie wollen
nicht wissen, wann die Maschine als Nächstes frei wäre, sondern ob **ihr** Fenster
frei ist: Samstag früh, zwei Stunden, vor dem Mittagessen. Der Vorschlag aus dem
Kern trifft das nur zufällig. Wer ihn nicht nehmen will, steht vor derselben Lage
wie ohne die App: Er muss in Vereinsflieger nachsehen.

v2 dreht das um. Das Sheet wird zum Zeitwähler: Das Mitglied legt sein Fenster
selbst fest, sieht sofort, ob es frei ist, und springt erst dann hinüber.

Der Handoff v2 lag vor, als Phase 7 von 054 bereits nach `tasks.md` gebaut wurde,
und widerspricht ihr in Teilen. Entschieden wurde, 054 planmäßig zu Ende zu
bringen und v2 als eigenes Feature zu führen — dieses hier.

## Clarifications

### Aus dem Handoff übernommen (nicht erneut zu klären)

- Gebucht wird **nicht** in Bucky. Das Sheet bereitet vor und übergibt per Adresse
  an Vereinsflieger (Prinzip II).
- Das Sheet öffnet **ausschließlich** durch Tippen auf einen Balken; die klebende
  Aktionsleiste der Detailansicht entfällt.
- Standardvariante des Wählers ist **Ziehen**; „Uhrzeit wählen" ist die
  gleichwertige Alternative. Weitere Varianten werden nicht gebaut.
- Raster 15 Minuten, Mindestdauer 15 min, Vorschlagsdauer 2 h, Flugtag 06:00–22:00.

### Seit 054 beantwortet (Fragen des Gestalter-Entwurfs, die sich erledigt haben)

| Frage im Entwurf | Antwort | Woher |
|---|---|---|
| Vereinsflieger-Datenzugriff | Kalender-Abo, zentral und zeitgesteuert abgerufen, Ergebnis im geteilten KV-Speicher | Feature 052, Prinzip V |
| `frm_apid` je Maschine | Alle sechs Werte stehen in `STAMMLISTE` (`packages/reservierung-core/src/flotte.ts`) | Feature 054, E-13 |
| Sonnenauf-/untergang | Open-Meteo, im KV-Schlüssel `sonnenzeiten`, kommt mit `/api/flotte` mit | Feature 052/054 |
| Favoriten | Lokal auf dem Gerät (`favoriten.ts`) | Feature 054 |
| Aktualisierung/Caching | Der Zwischenspeicher wird gelesen, nie die fremde Schnittstelle | Prinzip V |

### In diesem Feature entschieden (20.08.2026)

- **Warteliste**: Der Handoff quittiert einen Eintrag mit „Notiert — Bucky meldet
  sich, wenn 14:00–16:00 frei wird." Dieses Versprechen ist **nicht einlösbar**:
  Bucky kennt keine Nutzeridentität, hat keinen Melde-Weg und schreibt in kein
  fremdes System (Prinzip II). Statt einer lokalen Quittung bekommt der Modus
  einen **Absprung nach Vereinsflieger** — „Im Vereinsflieger vormerken… ↗", mit dem
  gewählten Fenster vorbelegt. Über die Überschneidung entscheidet dann der
  Verein, nicht diese Seite. Der Ausweich-Vorschlag steht darüber.
- **POH-Verweis**: Er entfällt in der Detailansicht **ersatzlos**. Der Weg zum
  POH-Rechner steht bereits im Flugzeugmenü der Übersicht (`handlungenFuer`); ein
  zweiter Einstieg im Kopfbereich wäre eine Dublette, kein Gewinn.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Eigenes Fenster festlegen und hinüberspringen (Priority: P1)

Ein Mitglied sieht in der Detailansicht, dass die Maschine morgen vormittags frei
ist. Es tippt auf die Stelle des Balkens, an der sein Flug beginnen soll. Das
Sheet öffnet mit einem Zwei-Stunden-Fenster ab dort. Es zieht die rechte Kante,
bis die Dauer stimmt, liest „👍 Frei 09:00–14:00" und springt mit vorbelegten
Zeiten nach Vereinsflieger.

**Why this priority**: Das ist der Kern des Features. Ohne diesen Weg bleibt das
Sheet das, was es heute ist — eine Auskunft, die man nimmt oder verwirft.

**Independent Test**: Vollständig prüfbar, indem man auf einen freien Bereich
eines Balkens tippt, das Fenster zieht und die Zieladresse liest. Liefert für sich
allein den vollen Wert, auch ohne Kachelwahl und Tageswechsler.

**Acceptance Scenarios**:

1. **Given** eine Maschine ist morgen 09:00–14:00 frei, **When** das Mitglied auf
   die Stelle 09:00 des Balkens tippt, **Then** öffnet das Sheet mit dem Fenster
   09:00–11:00 in der Variante „Ziehen".
2. **Given** das Sheet zeigt 09:00–11:00, **When** die rechte Kante auf 12:20
   gezogen wird, **Then** steht dort 09:00–12:15 und der Beginn hat sich nicht
   bewegt.
3. **Given** das Sheet zeigt 09:00–11:00, **When** der Block als Ganzes nach
   rechts gezogen wird, **Then** bleibt die Dauer bei 2 h.
4. **Given** ein Block von 20:30–22:00, **When** weiter nach rechts gezogen wird,
   **Then** stoppt er bei 20:00–22:00 und läuft nicht in den nächsten Tag.
5. **Given** das Mitglied hat gerade gezogen, **When** der Finger losgelassen
   wird, **Then** bleibt das gezogene Fenster stehen und springt nicht auf die
   Zwei-Stunden-Vorgabe zurück.
6. **Given** ein freies Fenster 11:30–13:30 der D-EELK am 13.08.2026, **When** der
   Absprung getippt wird, **Then** trägt die Zieladresse
   `frm_apid=75132&frm_datefrom=13.08.2026&frm_dateto=13.08.2026&frm_datefromtime=11:30&frm_datetotime=13:30`.

---

### User Story 2 — Uhrzeit auswählen statt ziehen (Priority: P2)

Ein Mitglied weiß die Zeit genau: 14:15 bis 17:00. Ziehen wäre Fummelei. Es
schaltet auf „Uhrzeit wählen", tippt in der linken Spalte Stunde 14 und Minute
:15, in der rechten Stunde 17 und Minute :00, und liest an jeder Kachel schon
vorher, welche Dauer sie ergäbe.

**Why this priority**: Ziehen ist schnell, aber ungenau — auf einem Balken von 16
Stunden Breite ist eine Viertelstunde wenige Pixel breit. Wer eine feste Uhrzeit
im Kopf hat, braucht den zweiten Weg. Er ist gleichwertig, nicht nachrangig, aber
das Feature trägt auch ohne ihn.

**Independent Test**: Prüfbar durch Umschalten auf „Uhrzeit wählen" und Antippen
von vier Kacheln; das Ergebnis steht in der Statuszeile.

**Acceptance Scenarios**:

1. **Given** das Ende steht auf 14:45, **When** als Beginn 09:00 gewählt wird,
   **Then** bleibt das Ende auf 14:45 und die Dauer zeigt „5:45 h".
2. **Given** das Ende steht auf 10:00, **When** als Beginn 11:00 gewählt wird,
   **Then** springt das Ende auf 11:30 und die Vorschau zeigt „30 min".
3. **Given** der Beginn steht auf 09:20, **When** die Stundenkachel 14 getippt
   wird, **Then** steht der Beginn auf 14:20 — die Minute bleibt.
4. **Given** die Variante „Uhrzeit wählen" wird aktiviert, **Then** sind die
   gewählten Stundenkacheln beider Spalten sichtbar, mittig in ihrer Spalte.
5. **Given** die gewählte Stundenkachel liegt außerhalb des Sichtfelds, **Then**
   zeigt ein Pfeilchen am Spaltenrand die Richtung an; es blendet aus, sobald die
   Kachel sichtbar gescrollt wird.
6. **Given** eine Kachelwahl würde eine Belegung schneiden, **Then** ist die
   Kachel wählbar, aber als Konflikt gerandet; eine unmögliche Wahl ist nicht
   antippbar.

---

### User Story 3 — Anderen Tag wählen (Priority: P2)

Das Mitglied merkt im Sheet, dass es den falschen Tag erwischt hat. Es tippt auf
„›" und ist einen Tag weiter, oder auf die Mitte und wählt im Datumswähler des
Telefons.

**Why this priority**: Ohne Tageswechsel muss man das Sheet schließen, scrollen,
den richtigen Balken finden und neu tippen. Das ist zumutbar, aber es ist der
häufigste Korrekturschritt überhaupt.

**Independent Test**: Prüfbar durch Antippen der Pfeile und der Mitte; der
Tagesname und das Fenster ändern sich.

**Acceptance Scenarios**:

1. **Given** das Sheet steht auf „Heute", **Then** ist „‹" sichtbar abgeschwächt
   und ohne Wirkung; auf Tag 6 gilt dasselbe für „›".
2. **Given** ein Tageswechsel auf einen Tag mit freier Zeit, **Then** steht ein
   neues Zwei-Stunden-Fenster in der ersten freien Lücke dieses Tages.
3. **Given** ein Tageswechsel auf einen ganz belegten Tag, **Then** ersetzt ein
   Hinweistext den Wähler; es wird kein Fenster erfunden.
4. **Given** das Sheet ist offen, **When** die Mitte des Tageswechslers getippt
   wird, **Then** öffnet der Datumswähler des Systems, begrenzt auf heute bis
   heute + 6 Tage.

---

### User Story 4 — Erkennen, dass das Fenster nicht frei ist (Priority: P1)

Das Mitglied zieht sein Fenster über eine bestehende Reservierung. Statt eines
Absprungs, der so aussieht, als wäre alles in Ordnung, nennt das Sheet den
Konflikt beim Namen, schlägt eine freie Alternative vor und lässt die Wahl.

**Why this priority**: Genauso wichtig wie Story 1 und ihr Gegenstück. Ein
Zeitwähler, der jede Wahl gleich aussehen lässt, ist schlimmer als gar keiner — er
schickt Mitglieder mit einem Fenster nach Vereinsflieger, das dort abgelehnt wird
oder, schlimmer, eine fremde Buchung überschreibt.

**Independent Test**: Prüfbar, indem man ein Fenster über eine bekannte Belegung
legt und Statuszeile, Ausweich-Vorschlag und Abschlussaktion liest.

**Acceptance Scenarios**:

1. **Given** das gewählte Fenster schneidet eine fremde Reservierung, **Then**
   steht in der Statuszeile „🙅 Überschneidet 14:00–17:30: reserviert" und die
   Abschlussaktion heißt „Im Vereinsflieger vormerken… ↗".
2. **Given** derselbe Fall, **Then** steht darüber ein Vorschlag „Frei wäre
   16:00–18:00 — stattdessen nehmen"; gesucht wird die erste freie Lücke ab dem
   gewählten **Ende**, sonst die erste überlappende, sonst die erste des Tages.
3. **Given** das Fenster schneidet eine Sperre, **Then** gibt es **keinen**
   Absprung, sondern eine Hinweisbox „Gesperrt — hier hilft auch kein Eintrag."
4. **Given** das Fenster beginnt heute vor „jetzt", **Then** heißt die Aktion
   „Im Vereinsflieger nachtragen… ↗" und darüber steht der Nachtrag-Hinweis.
5. **Given** ein Wechsel zwischen den Modi, **Then** springt die Abschlussaktion
   nicht — Status- und Ausweichzone behalten ihre Höhe.

---

### User Story 5 — Nacht und Jetzt auf einen Blick (Priority: P3)

Auf jedem Balken ist zu sehen, wo der Tag hell ist und wo gerade „jetzt" liegt —
ohne dass jemand Sonnenzeiten nachschlagen muss.

**Why this priority**: Reine Ablesehilfe; das Feature funktioniert ohne sie. Sie
ist trotzdem enthalten, weil sie mit Bordmitteln erreichbar ist — die Sonnenzeiten
liegen seit 054 vor — und weil eine Reservierung um 21:30 im Dezember eine andere
Bedeutung hat als im Juni.

**Independent Test**: Prüfbar am gerenderten Balken bei bekannten Sonnenzeiten.

**Acceptance Scenarios**:

1. **Given** Sonnenaufgang 06:05 und Untergang 20:40, **Then** sind Anfang und
   Ende des Balkens abgedunkelt und der Tagbereich klar; die Grenzen sind aus den
   Sonnenzeiten gerechnet, nicht fest eingetragen.
2. **Given** Sonnenaufgang vor 06:00, **Then** entfällt die linke Tönung ganz.
3. **Given** fehlende Sonnenzeiten für einen Tag, **Then** bleibt der Balken ohne
   Tönung — es wird nichts geschätzt.
4. **Given** der gezeigte Tag ist heute, **Then** markiert eine feine gestrichelte
   Nadel die aktuelle Zeit und ragt oben und unten über den Balken hinaus.
5. **Given** die Nachttönung, **Then** ist sie in heller und dunkler Darstellung
   derselbe Ton — Nacht bleibt in beiden als Nacht lesbar.

---

### Edge Cases

- **Tag ohne jede freie Lücke**: Der Wähler entfällt, ein Hinweistext tritt an
  seine Stelle. Es wird kein Fenster vorgeschlagen und kein Absprung angeboten.
- **Tippen auf eine belegte Stelle**: Das Sheet öffnet mit einem Fenster ab dort
  und meldet sofort den Konflikt — nicht mit einem stillschweigend verschobenen
  Fenster.
- **Fenster, das über eine Belegung hinausreicht**: Erlaubt. Die Grenze des
  Ziehens ist der Flugtag 06:00–22:00, nicht die freie Lücke.
- **Zwei Taps im selben Frame**: Beide wirken; keiner geht verloren.
- **Ziehen, das den Balken verlässt**: Die Geste bricht nicht ab, solange der
  Finger unten ist.
- **Kein Reservierungsstand abrufbar**: Balken und Sheet zeigen keine erfundene
  Verfügbarkeit; die Detailansicht meldet das wie bisher.
- **Maschine ohne bekannte Vereinsflieger-Nummer**: Der Absprung entfällt nicht,
  nur der Nummern-Parameter.
- **Zeitumstellungstag**: Der Flugtag bleibt 06:00–22:00 Ortszeit; Minuten seit
  Ortsmitternacht bleiben die Rechengröße.

## Requirements *(mandatory)*

### Functional Requirements

Fortlaufend ab FR-023 — FR-001 bis FR-022 gehören Feature 054 und gelten weiter,
soweit sie hier nicht ausdrücklich ersetzt werden.

**Öffnen und Rahmen**

- **FR-023**: Die Detailansicht MUSS ohne klebende Aktionsleiste auskommen; der
  Fußbereich endet mit der Fußnote. Ersetzt den Aktionsleisten-Teil von FR-018.
- **FR-024**: Das Sheet MUSS aus jedem Balkentyp zu öffnen sein — Tagesbalken
  „Heute", Tageszeile der Sieben-Tage-Liste, Spalte des Wochenrasters.
- **FR-025**: Ein Tipp auf einen Balken MUSS den Vorschlag an die getippte,
  auf 15 Minuten gerundete Uhrzeit setzen und den getippten Tag übernehmen.
- **FR-026**: Der POH-Verweis MUSS aus der Detailansicht entfallen; er bleibt über
  das Flugzeugmenü der Übersicht erreichbar.

**Zeitwahl**

- **FR-027**: Das System MUSS ein Zeitfenster in 15-Minuten-Schritten wählbar
  machen, mit Mindestdauer 15 Minuten und Vorschlagsdauer 2 Stunden.
- **FR-028**: Das System MUSS zwei gleichwertige Varianten anbieten: Ziehen
  (Standard) und Kachelwahl aus Stunden und Minuten für Beginn und Ende.
- **FR-029**: Beim Ziehen an einer Kante MUSS sich die Dauer ändern und die
  gegenüberliegende Kante stehen bleiben.
- **FR-030**: Beim Verschieben des Blocks MUSS die Dauer erhalten bleiben; am
  Rand des Flugtags MUSS der Block stoppen, nicht umbrechen oder abreißen.
- **FR-031**: Der Rahmen der Wahl MUSS der Flugtag 06:00–22:00 sein, nicht die
  freie Lücke — ein Fenster darf über eine Belegung hinausreichen.
- **FR-032**: Nach einem Zieh-Vorgang DARF der unmittelbar folgende Tipp das
  Fenster nicht zurücksetzen.
- **FR-033**: Eine Beginn-Wahl MUSS das Ende stehen lassen; nur wenn der Beginn
  das Ende überholt, MUSS das Ende auf Beginn + 30 Minuten nachziehen.
- **FR-034**: Jede Kachel MUSS die Dauer anzeigen, die ihre Wahl ergäbe, und
  DARF dabei nie eine negative oder unmögliche Dauer nennen.
- **FR-035**: Die gewählte Kachel MUSS in ihrer scrollbaren Spalte sichtbar
  gehalten werden; liegt sie außerhalb, MUSS die Richtung angedeutet werden.

**Tag**

- **FR-036**: Der Tag MUSS über Schaltflächen und über den Datumswähler des
  Systems wechselbar sein, begrenzt auf heute bis heute + 6 Tage.
- **FR-037**: Ein Tageswechsel MUSS das Fenster neu setzen: erste freie Lücke des
  Tages, Dauer wieder 2 Stunden. Ohne freie Lücke MUSS der Leerfall greifen.

**Modi und Abschluss**

- **FR-038**: Aus dem gewählten Fenster MUSS genau einer von vier Modi folgen:
  frei, Nachtrag, Warteliste, gesperrt — je mit eigener Aktion und eigenem Text.
- **FR-039**: In den Modi Warteliste und gesperrt MUSS ein Ausweich-Vorschlag
  erscheinen: die erste freie Lücke ab dem gewählten Ende, sonst die erste
  überlappende, sonst die erste des Tages.
- **FR-040**: Für gesperrte Zeiten DARF kein Absprung angeboten werden.
- **FR-041**: Im Modus Warteliste MUSS die Aktion nach Vereinsflieger führen und
  sprachlich offenlassen, wie der Verein mit der Überschneidung umgeht. Das System
  DARF weder eine Benachrichtigung noch eine Vormerkung zusagen.
- **FR-042**: Jede Aktion, die die Anwendung verlässt, MUSS sprachlich als
  Zwischenschritt erkennbar sein (Ellipse und Auswärtspfeil).
- **FR-043**: Der Absprung MUSS Maschine, Datum und beide Uhrzeiten vorbelegen und
  in einem neuen Tab öffnen. Präzisiert FR-011 aus 054.
- **FR-044**: Hat der Tag keine freie Lücke, MUSS ein Hinweistext den Wähler
  ersetzen; ein Fenster DARF dann nicht erfunden werden.

**Balken (alle Typen)**

- **FR-045**: Nacht MUSS auf allen Balken sichtbar sein, abgeleitet aus Sonnenauf-
  und -untergang des jeweiligen Tages. Fehlen sie, entfällt die Tönung.
- **FR-046**: Die Nachtfarbe MUSS in heller und dunkler Darstellung dieselbe sein.
- **FR-047**: Die aktuelle Zeit MUSS auf Balken des heutigen Tages als feine
  gestrichelte Nadel mit Überstand erscheinen.
- **FR-048**: Die Sieben-Tage-Liste MUSS bei morgen beginnen; „Heute" steht schon
  als eigener Balken darüber. Ersetzt den Umfang aus 054.
- **FR-049**: Konflikttexte MÜSSEN Zeit und Art mit Doppelpunkt verbinden
  (`14:00–17:30: reserviert`); mehrere werden mit ` · ` verkettet.

**Verhalten**

- **FR-050**: Das Sheet MUSS auf kleinen Bildschirmen vollständig erreichbar
  bleiben; die Abschlussaktion DARF nie abgeschnitten sein.
- **FR-051**: Status- und Ausweichzone MÜSSEN feste Höhen haben, damit das Sheet
  beim Ziehen und beim Moduswechsel nicht springt.
- **FR-052**: Alle Tippziele im Sheet MÜSSEN mindestens 44 px messen — auch
  Minutenkacheln und Zieh-Griffe. Bestätigt FR-017 aus 054.

### Non-Functional Requirements

- **NFR-001**: Die Zeitlogik — Rasterung, Lückensuche, Konflikterkennung,
  Modusbestimmung, Ausweichsuche, Adressbau — MUSS ohne Oberfläche prüfbar sein
  und im Kern liegen (Prinzip IV). Der Zeitwähler rechnet nicht selbst.
- **NFR-002**: Ziehen MUSS auf dem Telefon flüssig bleiben: keine
  Layout-Sprünge, kein Abbruch außerhalb des Balkens.
- **NFR-003**: Wer Bewegung abbestellt hat, bekommt das Sheet ohne Fahrt.
- **NFR-004**: Zustandsinformation DARF nie allein über Farbe laufen; jeder Modus
  trägt Text.

### Key Entities

- **Reservierungswunsch** (flüchtig): Tagesindex 0…6, Beginn und Ende als Minuten
  seit Ortsmitternacht, gewählte Variante. Wird nirgends gespeichert und verlässt
  das Gerät nur als Adresse.
- **Rahmen**: Der wählbare Bereich eines Tages — Flugtag 06:00–22:00 in Minuten.
- **Modus**: frei · nachtrag · warteliste · gesperrt. Abgeleitet, nie gesetzt.
- **Ausweichlücke**: Ein freies Fenster, das anstelle des gewählten vorgeschlagen
  wird. Abgeleitet aus Belegungen und gewähltem Ende.
- **Maschine** (bestehend, unverändert): Kennzeichen und Vereinsflieger-Nummer.
- **Tageskontext** (bestehend): Sonnenauf- und -untergang für die Nachttönung.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Ein Mitglied kann von der Detailansicht aus ein beliebiges freies
  Fenster festlegen und den Absprung erreichen, ohne die Seite zu verlassen und
  ohne mehr als fünf Berührungen.
- **SC-002**: Jede Zeitwahl liegt auf einem Vielfachen von 15 Minuten, in jeder
  Variante und nach jeder Geste.
- **SC-003**: Ein Fenster, das eine Belegung schneidet, wird in jedem Fall als
  solches benannt, bevor ein Absprung möglich ist — es gibt keine Kombination aus
  Geste und Kachelwahl, die einen Konflikt verschweigt.
- **SC-004**: Ein gezogenes Fenster bleibt nach dem Loslassen unverändert stehen.
- **SC-005**: Beim Wechsel zwischen den vier Modi und beim Ziehen bewegt sich die
  Abschlussaktion nicht.
- **SC-006**: Die gewählte Stunde ist in der Kachelwahl jederzeit sichtbar oder
  ihre Richtung angedeutet.
- **SC-007**: Für gesperrte Zeiten gibt es keinen Weg zu einem Absprung.
- **SC-008**: Auf einem Tag ohne freie Lücke nennt das Sheet kein Zeitfenster.
- **SC-009**: Die Nachttönung stimmt mit den Sonnenzeiten des jeweiligen Tages
  überein; ein Tag ohne Sonnenzeiten bleibt ungetönt.
- **SC-010**: Alle Tippziele des Sheets messen mindestens 44 px.

## Assumptions

- Die Zeitwahl bleibt **innerhalb eines Ortstages**. Fenster über Mitternacht sind
  nicht vorgesehen; der Flugtag endet um 22:00.
- Der Reservierungsstand kommt wie bisher aus dem geteilten Zwischenspeicher; für
  dieses Feature wird keine zusätzliche Datenquelle erschlossen.
- Vereinsflieger nimmt die beobachteten Parameter weiterhin an. Fallen sie weg,
  landet das Mitglied auf einer leeren, aber benutzbaren Maske — deshalb nennt das
  Sheet sein Fenster weiterhin auch als Text.
- Alle sechs Vereinsflieger-Nummern sind bekannt und gepflegt; eine Maschine ohne
  Nummer bleibt möglich und führt nur zu einem Parameter weniger.
- Die Sonnenzeiten decken die gezeigten sieben Tage ab. Tun sie es an einem Rand
  nicht, bleibt dieser Tag ohne Tönung.
- Die Oberfläche bleibt mobil-zuerst und bei 430 px Breite; ein Desktop-Layout ist
  nicht Gegenstand.

## Out of Scope

- Buchen, Ändern oder Stornieren in Bucky
- Eine serverseitige Warteliste, Benachrichtigungen, Nutzerkonten
- Fenster über Mitternacht hinaus
- Änderungen an Übersicht, Tagesuhr-Ring, Statuslogik oder Wochenraster-Aufbau,
  soweit sie nicht aus FR-045 bis FR-049 folgen
- Desktop-Layout
