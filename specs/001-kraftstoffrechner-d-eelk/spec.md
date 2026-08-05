# Feature Specification: Kraftstoffverbrauchsrechner für D-EELK

**Feature Branch**: `001-kraftstoffrechner-d-eelk`

**Created**: 2026-08-05

**Status**: Draft

**Input**: User description: "Kraftstoffverbrauchsrechner für das Flugzeug D-EELK. Als Pilot des Flugzeugs D-EELK möchte ich für eine bestimmte Strecke zu bestimmten Umgebungsbedingungen den Kraftstoffbedarf berechnen. Hierzu muss zunächst das Flughandbuch digitalisiert werden, wie es auch in der Constitution vorgeschlagen wird, also das Flughandbuch muss gelesen werden, in strukturierte Daten digitalisiert werden, etc. Dann benötigen wir ein User-Interface, in das ich die relevanten Daten eingebe und mir diese dann ausgerechnet werden."

**GitHub Issue**: [#1](https://github.com/edsh/bucky/issues/1)

**Scope-Klarstellung (2026-08-05)**: Dieses Feature berechnet die
**Kraftstoffverbrauchsrate (l/h)** aus den POH-Tabellen von D-EELK, abhängig von
Flugbedingungen (Höhe, Leistungseinstellung, Temperatur/ISA-Abweichung). Die
Umrechnung auf den Gesamtbedarf für eine konkrete Strecke bzw. ein Flugvorhaben
(unter Einbezug von TAS, Reserve etc.) ist **nicht** Teil dieses Features, sondern
eines späteren, darauf aufbauenden Folge-Features (siehe "Out of Scope").

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Kraftstoffverbrauchsrate für Flugbedingungen berechnen (Priority: P1)

Als Pilot von D-EELK gebe ich die relevanten Flugbedingungen (Höhe,
Leistungseinstellung, Temperatur/ISA-Abweichung) ein und erhalte die daraus
resultierende Kraftstoffverbrauchsrate in Liter pro Stunde (l/h).

**Why this priority**: Das ist der eigentliche Wert des Features — ohne diese
Berechnung gibt es kein nutzbares Produkt. Alles andere (Datengrundlage) dient
ausschließlich dazu, diese Berechnung korrekt zu ermöglichen.

**Independent Test**: Kann vollständig getestet werden, indem für eine bekannte
Kombination aus Flugbedingungen (mit bekanntem Sollwert aus dem Original-POH)
eine Verbrauchsrate abgefragt und mit dem Sollwert verglichen wird.

**Acceptance Scenarios**:

1. **Given** die POH-Kraftstofftabelle für D-EELK ist digitalisiert, **When** ich
   Flugbedingungen eingebe, die innerhalb des abgedeckten Wertebereichs liegen,
   **Then** erhalte ich eine berechnete Kraftstoffverbrauchsrate in l/h.
2. **Given** ich habe ein Berechnungsergebnis erhalten, **When** ich es mit einer
   manuellen Ablesung aus dem Original-POH vergleiche, **Then** stimmt der Wert
   überein (innerhalb der durch Interpolation bedingten Genauigkeit).

---

### User Story 2 - Nachvollziehbarkeit und Prüfhinweis (Priority: P2)

Als Pilot sehe ich zu jedem Berechnungsergebnis, aus welcher Tabelle/welchen
Eckwerten es interpoliert wurde, sowie den Hinweis, das Ergebnis vor dem Flug
gegen das Original-POH zu prüfen.

**Why this priority**: Direkt durch Constitution-Prinzip I (Deterministic
Safety-Critical Calculations) gefordert — sicherheitsrelevant, aber von der
eigentlichen Berechnung (User Story 1) separat testbar.

**Independent Test**: Kann unabhängig getestet werden, indem geprüft wird, dass
jede Ausgabe eines Berechnungsergebnisses die verwendeten Eckwerte und den
Prüfhinweis enthält — unabhängig vom konkreten Zahlenwert.

**Acceptance Scenarios**:

1. **Given** ein Berechnungsergebnis wurde ausgegeben, **When** ich mir die
   Ausgabe ansehe, **Then** sehe ich die Tabelle bzw. die Eckwerte, zwischen
   denen interpoliert wurde.
2. **Given** ein Berechnungsergebnis wurde ausgegeben, **When** ich mir die
   Ausgabe ansehe, **Then** sehe ich den Hinweis, das Ergebnis vor dem Flug
   gegen das Original-POH zu prüfen.

---

### Edge Cases

- Eingegebene Flugbedingungen liegen außerhalb des durch die digitalisierten
  Tabellen abgedeckten Wertebereichs → System MUSS dies erkennen und darf
  keinen (extrapolierten) Wert ausgeben.
- Für D-EELK ist die POH-Tabelle noch nicht bzw. nur teilweise digitalisiert →
  System MUSS dies klar kommunizieren statt einen unvollständigen/geschätzten
  Wert zu liefern.
- Eingaben sind unvollständig, fehlerhaft oder unplausibel (z. B. fehlende
  Höhenangabe, unrealistische Temperaturwerte) → System MUSS die Eingabe
  zurückweisen, bevor eine Berechnung versucht wird.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUSS eine aus dem Original-Flughandbuch von D-EELK
  digitalisierte, strukturierte Datengrundlage für die Kraftstoffverbrauchsrate
  bereitstellen, gestaffelt nach den im POH verwendeten Flugbedingungen
  (u. a. Höhe, Leistungseinstellung, Temperatur/ISA-Abweichung).
- **FR-002**: Die digitalisierten Daten MÜSSEN gegen das Original-Flughandbuch
  doppelt geprüft sein, bevor sie für Berechnungen verwendet werden
  (Constitution-Prinzip I).
- **FR-003**: System MUSS die Kraftstoffverbrauchsrate für vom Piloten
  angegebene Flugbedingungen ausschließlich durch deterministische Interpolation
  zwischen den digitalisierten Tabellenwerten berechnen — kein frei generierter
  oder geschätzter Wert.
- **FR-004**: Piloten MÜSSEN die relevanten Flugbedingungen (Höhe,
  Leistungseinstellung, Temperatur/ISA-Abweichung) über eine Eingabemaske
  eingeben können.
- **FR-005**: System MUSS zu jedem Berechnungsergebnis angeben, aus welcher
  Tabelle bzw. welchen Eckwerten interpoliert wurde.
- **FR-006**: System MUSS zu jedem Berechnungsergebnis den Hinweis anzeigen,
  das Ergebnis vor dem Flug gegen das Original-POH zu prüfen.
- **FR-007**: System MUSS erkennen, wenn eingegebene Werte außerhalb des durch
  die digitalisierten Tabellen abgedeckten Wertebereichs liegen, und MUSS die
  Berechnung in diesem Fall verweigern statt zu extrapolieren.
- **FR-008**: System MUSS unvollständige oder unplausible Eingaben zurückweisen,
  bevor eine Berechnung versucht wird.
- **FR-009**: System MUSS das Berechnungsergebnis als Kraftstoffverbrauchsrate
  in Liter pro Stunde (l/h) ausgeben.

### Key Entities

- **POH-Kraftstoffverbrauchstabelle (D-EELK)**: Digitalisierte Tabellenwerte aus
  der Original-Flughandbuch-Ergänzung (Technify-Motor) von D-EELK für die
  Kraftstoffverbrauchsrate, gestaffelt nach Flugbedingungen (Höhe,
  Leistungseinstellung, Temperatur/ISA-Abweichung); referenziert Quelle/Version
  des Originaldokuments.
- **Berechnungsanfrage**: Vom Piloten eingegebene Kombination aus Flugbedingungen
  für eine konkrete Verbrauchsraten-Berechnung.
- **Berechnungsergebnis**: Ausgabe bestehend aus berechneter Verbrauchsrate
  (l/h), den referenzierten Tabellen-Eckwerten und dem Prüfhinweis.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Ein Pilot erhält für eine gültige Kombination aus Flugbedingungen
  innerhalb weniger Sekunden ein Berechnungsergebnis.
- **SC-002**: 100 % der ausgegebenen Berechnungsergebnisse enthalten die
  verwendeten Tabellen-Eckwerte und den Hinweis zur Vorflug-Prüfung.
- **SC-003**: 100 % der Eingaben außerhalb des digitalisierten Wertebereichs
  führen zu einer klaren Fehlermeldung statt zu einem (falschen) Ergebnis.
- **SC-004**: Die digitalisierten Tabellenwerte stimmen vollständig mit dem
  Original-Flughandbuch überein (verifiziert durch die doppelte Prüfung aus
  FR-002).

## Out of Scope (diese Iteration)

- Umrechnung der Verbrauchsrate auf den Gesamt-Kraftstoffbedarf für eine
  konkrete Strecke bzw. ein Flugvorhaben (benötigt zusätzlich TAS/Groundspeed
  und Reserve-Kraftstoff-Logik) — geplant als separates, auf diesem Feature
  aufbauendes Folge-Feature.
- Unterstützung weiterer Flugzeuge/Flughandbücher außer D-EELK.

## Assumptions

- Unterstützt wird zunächst ausschließlich das Flugzeug D-EELK; weitere
  Flugzeuge/Flughandbücher sind ein separates, späteres Feature.
- Welche Flugbedingungen im Detail abgefragt werden (über Höhe,
  Leistungseinstellung, Temperatur/ISA-Abweichung hinaus, z. B. Mixture-Setting),
  ergibt sich aus den tatsächlich in der POH-Ergänzung vorhandenen
  Tabellenparametern und wird bei der Digitalisierung festgelegt.
- Für dieses Feature ist kein Login/Rollenmodell erforderlich; die
  vereinsweite Authentifizierung ist laut Status in `README.md` noch offen und
  wird hier nicht vorausgesetzt.
- Die Original-Flughandbuch-Ergänzung für den Technify-Motor liegt in
  beschaffbarer Form als PDF vor.
