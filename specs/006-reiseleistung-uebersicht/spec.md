# Feature Specification: Reiseleistungs-Übersicht und neue Formulargliederung

**Feature Branch**: `006-reiseleistung-uebersicht`

**Created**: 2026-08-06

**Status**: Draft

**Input**: Die ISA-Abweichung wandert in das obere Fieldset. Direkt darunter
erscheint eine Zwischen-Info-Box mit Eigengeschwindigkeit (KTAS), Verbrauch je
Stunde, der somit möglichen Strecke und der Zeit — das entspricht den
Informationen aus Abb. 5-4a. An derselben Stelle steht der Hinweis, dass 4 l für
Start und Rollen, Zeit, Kraftstoff und Strecke für den Steigflug sowie 45 min
Reserve berücksichtigt sind. Darunter folgt das Fieldset mit Platzhöhe,
Streckenlänge und Windkomponente, aus denen sich der Kraftstoffbedarf für das
Vorhaben ergibt.

**Issue**: [#6](https://github.com/edsh/bucky/issues/6)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sehen, wie weit die D-EELK überhaupt kommt (Priority: P1)

Ein Pilot überlegt, ob ein Ziel ohne Zwischenlandung erreichbar ist. Er stellt
Reiseflughöhe, Luftdruck, Temperatur und Lasteinstellung ein und liest ab, wie
schnell die D-EELK dort fliegt, wieviel sie je Stunde verbraucht, wie weit sie
mit vollen Tanks kommt und wie lange sie oben bleiben kann. Eine Streckenlänge
muss er dafür nicht eingeben.

**Why this priority**: Das ist die Frage, die vor jeder Streckenplanung steht.
Bisher beantwortet der Rechner sie nicht: Er verlangt eine Strecke und sagt,
wieviel sie kostet — aber nicht, welche Strecken überhaupt in Frage kommen. Die
Zahlen dafür stehen bereits digitalisiert in der Tabelle und werden nicht
genutzt.

**Independent Test**: Reiseflughöhe und Lasteinstellung auf Stützstellen der
Tabelle setzen und prüfen, dass die vier ausgewiesenen Werte den Tabellenzeilen
entsprechen.

**Acceptance Scenarios**:

1. **Given** Druckhöhe 6000 ft und Lasteinstellung 70 % bei ISA-Abweichung 0,
   **When** die Übersicht erscheint, **Then** zeigt sie 116 KTAS, 22,1 l/h,
   546 NM und 4,5 h — die Werte der zugehörigen Tabellenzeile.
2. **Given** eine Höhe zwischen zwei Stützstellen, **When** die Übersicht
   erscheint, **Then** liegen alle vier Werte zwischen denen der beiden
   Nachbarzeilen.
3. **Given** eine ISA-Abweichung von +20 °C, **When** die Übersicht erscheint,
   **Then** sind Eigengeschwindigkeit und mögliche Strecke um 2 % erhöht, die
   Flugdauer dagegen unverändert.

---

### User Story 2 - Erkennen, was in den Zahlen schon enthalten ist (Priority: P1)

Der Pilot sieht an Ort und Stelle, dass die ausgewiesene Strecke und Zeit
bereits 4 l für Motorstart und Rollen, den vollständigen Steigflug und 45
Minuten Reserve enthalten — und dass sie bei Windstille gelten.

**Why this priority**: Ohne diesen Hinweis ist die Zahl gefährlich: Sie sieht
aus wie eine Reichweite, von der man noch Reserve abziehen müsste. Wer das tut,
plant doppelt konservativ; wer sie umgekehrt als reine Reiseflugstrecke liest,
plant zu knapp. Der Hinweis gehört deshalb untrennbar zur Zahl und nicht in eine
Fußnote.

**Independent Test**: Prüfen, dass der Hinweis unmittelbar bei der Übersicht
steht, die Bestandteile einzeln benennt und die Seitenzahl trägt.

**Acceptance Scenarios**:

1. **Given** die Übersicht ist sichtbar, **When** der Pilot sie liest, **Then**
   nennt der Hinweis alle vier Punkte: 4 l für Motorstart und Rollen, Zeit,
   Kraftstoff und Strecke für den Steigflug, 45 Minuten Reserve, Windstille.
2. **Given** dieselbe Seite, **When** der Pilot weiter unten den ermittelten
   Kraftstoffbedarf liest, **Then** bleibt der bestehende Hinweis, dass **diese
   Summe** keine Reserve enthält, unverändert bestehen und ist von der Übersicht
   klar getrennt.

---

### User Story 3 - Das Formular folgt dem Gedankengang (Priority: P2)

Die Eingaben stehen in der Reihenfolge, in der der Pilot denkt: zuerst die
Bedingungen des Reiseflugs, dann die Auskunft darüber, was damit möglich ist,
dann das konkrete Vorhaben.

**Why this priority**: Reine Anordnung, aber sie trägt die Aussage der
Übersicht. Stünde die Streckenlänge oberhalb, sähe die mögliche Strecke aus wie
eine Antwort darauf.

**Independent Test**: Die Reihenfolge der Bedienelemente im Formular prüfen.

**Acceptance Scenarios**:

1. **Given** die Seite ist geladen, **When** der Pilot von oben nach unten
   liest, **Then** folgen aufeinander: Bedingungen des Reiseflugs, Übersicht,
   Angaben zum Vorhaben.
2. **Given** der Pilot bewegt einen Regler der oberen Gruppe, **When** er
   loslässt, **Then** ändert sich die Übersicht unmittelbar darunter.
3. **Given** der Pilot bewegt Streckenlänge oder Windkomponente, **When** er
   loslässt, **Then** bleibt die Übersicht unverändert, weil deren Werte nicht
   davon abhängen.

---

### Edge Cases

- **Die Lasteinstellung ist nicht in jeder Höhe verfügbar.** Ab 10 000 ft
  Druckhöhe kennt die Tabelle keine 100 % mehr, ab 16 000 ft auch keine 90 %.
  Die Übersicht muss diesen Fall genauso behandeln wie die Bedarfsrechnung
  heute — ablehnen, nicht auf den nächstniedrigeren Wert ausweichen.
- **Die Druckhöhe fällt aus dem Tabellenbereich.** Ein hohes QNH kann das
  auslösen. Dann kann auch die Übersicht keine Werte zeigen.
- **Die ausgewiesene Strecke wird mit der eingegebenen verwechselt.** Beide
  tragen die Einheit NM und stehen auf derselben Seite, meinen aber
  Verschiedenes: die eine ist eine Obergrenze bei Windstille mit Reserve, die
  andere das Vorhaben mit Wind und ohne Reserve.
- **Die eingegebene Strecke übersteigt die mögliche Strecke.** Der Pilot sieht
  dann zwei Zahlen, die einander widersprechen — die Bedarfsrechnung meldet den
  Konflikt bereits über den Vergleich mit der ausfliegbaren Menge.
- **Gegenwind macht die mögliche Strecke unerreichbar.** Die Tabellenwerte
  gelten bei Windstille; der Wind darf sie nicht verändern, weil das Handbuch
  dafür keine Grundlage bietet.
- **Die Werte lassen sich nicht nachrechnen.** Bei 0 ft und 100 % ergäbe
  125 KTAS × 2,9 h = 362,5 NM, die Tabelle nennt aber 365 NM. Wer die Strecke
  aus Geschwindigkeit und Dauer selbst bildet, weicht vom Handbuch ab.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Das System MUSS zu jeder Kombination aus Druckhöhe und
  Lasteinstellung die maximale Strecke und die Flugdauer aus der
  Reiseleistungstabelle nachschlagen. Diese Werte DÜRFEN NICHT aus
  Eigengeschwindigkeit, Verbrauch und ausfliegbarer Menge selbst gebildet
  werden: die Tabelle weicht davon ab, und die Tabelle ist maßgeblich
  (Constitution, Prinzip I).
- **FR-002**: Zwischenwerte MÜSSEN wie bei den übrigen Größen zwischen den
  Stützstellen der Druckhöhe interpoliert werden. Über die Lasteinstellung wird
  **nicht** interpoliert: Das Handbuch kennt dort nur einzelne Werte, und der
  Regler bietet auch nur diese an. Über den Rand der Tabelle hinaus DARF NICHT
  extrapoliert werden.
- **FR-003**: Die maximale Strecke MUSS um 1 % je 10 °C über der ISA-Temperatur
  erhöht werden, entsprechend Anmerkung 3 der Tabelle. Die Flugdauer DARF dabei
  NICHT verändert werden — die Anmerkung nennt sie nicht.
- **FR-004**: Die Windkomponente DARF die ausgewiesene maximale Strecke und
  Flugdauer NICHT beeinflussen. Die Tabelle gilt ausdrücklich bei Windstille.
- **FR-005**: Die Oberfläche MUSS zwischen den Eingaben eine Übersicht zeigen
  mit Eigengeschwindigkeit (KTAS), Verbrauch je Stunde, maximaler Strecke und
  Flugdauer.
- **FR-006**: Unmittelbar bei dieser Übersicht MUSS stehen, dass die Werte 4 l
  für Motorstart und Rollen, Zeit, Kraftstoff und Strecke für den Steigflug
  sowie 45 Minuten Reserve bereits enthalten und bei Windstille gelten. Der
  Hinweis MUSS die Quelle mit Abbildung und Seitenzahl nennen.
- **FR-007**: Der bestehende Hinweis, dass die **Bedarfssumme** keine Reserve
  enthält, MUSS unverändert bestehen bleiben und von der Übersicht deutlich
  getrennt sein. Die 45 Minuten der Tabelle DÜRFEN NICHT so dargestellt werden,
  als deckten sie den ermittelten Bedarf ab.
- **FR-008**: Das Formular MUSS in dieser Reihenfolge gegliedert sein: (1)
  Bedingungen des Reiseflugs — Reiseflughöhe, Luftdruck, ISA-Abweichung,
  Lasteinstellung; (2) die Übersicht; (3) Angaben zum Vorhaben — Platzhöhe,
  Streckenlänge, Windkomponente.
- **FR-009**: Die Übersicht MUSS ausschließlich von den Eingaben der ersten
  Gruppe abhängen. Änderungen an Streckenlänge oder Windkomponente DÜRFEN sie
  nicht verändern.
- **FR-010**: Die beiden Strecken MÜSSEN sprachlich unterscheidbar benannt sein,
  sodass die ausgewiesene Obergrenze nicht mit der eingegebenen Streckenlänge
  verwechselt wird.
- **FR-011**: Lässt sich die Übersicht nicht ermitteln — etwa weil die Druckhöhe
  außerhalb des Tabellenbereichs liegt oder die Lasteinstellung in dieser Höhe
  nicht geführt wird —, MUSS das System dies benennen, statt Werte zu zeigen. Es
  DARF NICHT auf benachbarte Tabellenwerte ausweichen.
- **FR-012**: Das Nachschlagen und die Temperaturkorrektur MÜSSEN im gemeinsamen
  Rechenkern liegen, damit alle Zugangswege dieselben Zahlen liefern
  (Constitution, Prinzip IV). Der Rechenweg MUSS einen eigenen Schritt dafür
  enthalten.
- **FR-013**: Die Quellenangabe der Übersicht MUSS Abbildung, Tabellenname und
  Seitenzahl nennen und den Hinweis tragen, das Ergebnis vor dem Flug gegen das
  Original-Flughandbuch zu prüfen (Constitution, Prinzip I).
- **FR-014**: Die Platzhöhe MUSS trotz ihres Platzes in der unteren Gruppe
  weiterhin ihre Druckhöhe unmittelbar darunter ausweisen, obwohl der Luftdruck
  nun in der oberen Gruppe steht.

### Key Entities

- **Reiseleistung**: Die vier Größen, die die Tabelle zu einer Kombination aus
  Druckhöhe und Lasteinstellung führt — Eigengeschwindigkeit, Verbrauch je
  Stunde, maximale Strecke und Flugdauer.
- **Maximale Strecke**: Die Streckenobergrenze aus der Tabelle. Enthält
  Motorstart, Rollen, Steigflug und 45 Minuten Reserve; gilt bei Windstille.
  Nicht zu verwechseln mit der eingegebenen Streckenlänge.
- **Flugdauer**: Die zur maximalen Strecke gehörende Zeit. Wird von der
  Temperatur nicht verändert.
- **Bedingungen des Reiseflugs**: Die Eingaben, die allein die Reiseleistung
  bestimmen — Reiseflughöhe, Luftdruck, ISA-Abweichung, Lasteinstellung.
- **Angaben zum Vorhaben**: Die Eingaben, die erst den konkreten Bedarf
  bestimmen — Platzhöhe, Streckenlänge, Windkomponente.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Ein Pilot erfährt die mögliche Strecke und Flugdauer, ohne eine
  Streckenlänge einzugeben.
- **SC-002**: Für jede Stützstelle der Tabelle stimmen alle vier ausgewiesenen
  Werte bei ISA-Abweichung 0 exakt mit der Tabellenzeile überein.
- **SC-003**: Eine Änderung von Streckenlänge oder Windkomponente lässt alle
  vier Werte der Übersicht unverändert.
- **SC-004**: Der Hinweis zu Motorstart, Steigflug, Reserve und Windstille ist
  ohne Aufklappen sichtbar und steht bei der Übersicht, nicht im Ergebnisblock.
- **SC-005**: Auf derselben Seite ist zugleich erkennbar, dass die ermittelte
  Bedarfssumme keine Reserve enthält.
- **SC-006**: Eine Lasteinstellung, die in der gewählten Höhe nicht geführt
  wird, führt zu einer Meldung und nicht zu Werten aus einer benachbarten Zeile.
- **SC-007**: Keine ausgewiesene Strecke oder Dauer beruht auf einer
  Extrapolation über den Tabellenrand hinaus.

## Assumptions

- Die Übersicht bezieht sich auf die Reiseflughöhe, nicht auf die Platzhöhe. Die
  Tabelle führt die Reiseleistung über die Druckhöhe des Reiseflugs.
- Die ausfliegbare Menge bleibt die des Standardtanks mit 127,4 l. Die Tabelle
  für Langstreckentanks ist digitalisiert, aber für D-EELK nicht anwendbar.
- Die Temperaturkorrektur der Reichweite verhält sich wie die bestehende
  Korrektur der Eigengeschwindigkeit: nur nach oben, bei negativer
  ISA-Abweichung bleibt der Faktor 1. Das Handbuch nennt ausdrücklich nur den
  Fall "über ISA".
- Dass Geschwindigkeit und Strecke um denselben Prozentsatz steigen, die Dauer
  aber nicht, ist in sich stimmig: Strecke ist Geschwindigkeit mal Zeit.
- Die Gliederung in zwei Gruppen ersetzt die bisherige Gruppierung "Höhen und
  Luftdruck" / "Strecke und Wetter". Der Luftdruck rückt damit von der Platzhöhe
  weg; die Druckhöhe unter dem Platzhöhenregler bleibt der sichtbare Beleg für
  seine Wirkung (FR-014).

## Dependencies

- Feature 001 (Kraftstoffrechner D-EELK) liefert Tabellen, Interpolation und
  Rechenweg.
- Feature 004 (Schieberegler und Höhe ASL) liefert die Regler, die Gruppierung
  und die Druckhöhen-Umrechnung, auf denen die neue Gliederung aufsetzt.
- Die Tabelle `5b-cruise-standard-1043kg` (Abb. 5-4a, Seiten 5b-14 bis 5b-16)
  ist bereits digitalisiert und enthält die Spalten `range_nm` und
  `endurance_h`; eine erneute Digitalisierung ist nicht nötig.
