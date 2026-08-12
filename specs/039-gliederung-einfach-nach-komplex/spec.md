# Feature Specification: Seite von einfach nach komplex gliedern — Startstrecke nach oben

**Feature Branch**: `039-gliederung-einfach-nach-komplex`

**Created**: 2026-08-11

**Status**: Draft

**Input**: Issue [#39](https://github.com/edsh/bucky/issues/39) — Seite von einfach nach komplex gliedern: Startstrecke nach oben

## Worum es geht

Die Seite steigt heute mit dem Reiseflug ein. Die „Grundbedingungen" tragen den
Luftdruck, die **Reiseflughöhe**, die Außentemperatur und den **Lasthebel**;
darunter steht, was die Maschine auf Reisehöhe leistet. Erst danach folgen die
Platzhöhe und die Startstrecke.

Wer vor dem Start am Platz steht, liest sich damit an Größen vorbei, die ihn in
diesem Moment nicht betreffen. Die Startstrecke ist die einfachere Rechnung und
die zeitlich frühere Frage: Sie hängt an drei Größen, die Reiseleistung an fünf.

Die Seite soll deshalb von einfach nach komplex laufen — erst der Zustand am
Platz, dann die Startstrecke, dann alles, was den Reiseflug betrifft.

**Es ändert sich keine Rechnung.** Dieses Feature ordnet ausschließlich um, wo
welcher Regler steht und zu welchem Ergebnis er gehört.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Startstrecke ohne Umweg über den Reiseflug (Priority: P1)

Der Pilot steht am Platz und will wissen, ob die Bahn reicht. Er stellt
Platzhöhe, Luftdruck und Außentemperatur ein — mehr braucht diese Frage nicht —
und findet die Startstrecke unmittelbar darunter.

**Why this priority**: Es ist die Frage, die zuerst gestellt wird, und die
einzige, die vor dem Start beantwortet sein **muss**. Heute steht sie hinter
dem Reiseflug, dessen Größen für sie bedeutungslos sind. Wer die Bahnlänge
prüft, soll dabei keine Reiseflughöhe einstellen müssen.

**Independent Test**: Die Seite öffnen, die drei Grundgrößen einstellen und die
Startstrecke ablesen, ohne einen Regler des Reiseflugs anzufassen.

**Acceptance Scenarios**:

1. **Given** die Seite ist frisch geöffnet, **When** der Pilot sie von oben
   liest, **Then** trifft er zuerst auf Platzhöhe, Luftdruck und
   Außentemperatur und unmittelbar danach auf die Roll- und Startstrecke.
2. **Given** der Pilot verstellt Reiseflughöhe oder Lasteinstellung, **When** er
   die Startstrecke betrachtet, **Then** hat sich an ihr nichts geändert.
3. **Given** der Pilot verstellt eine der drei Grundgrößen, **When** er die
   Seite betrachtet, **Then** ändern sich Startstrecke **und** Reiseleistung —
   die drei gelten für beides.

---

### User Story 2 - Reisegrößen dort, wo sie wirken (Priority: P1)

Der Pilot hat die Startstrecke geprüft und wendet sich der Strecke zu. Erst
jetzt begegnen ihm Reiseflughöhe und Lasteinstellung — unmittelbar über den
beiden Ergebnissen, die von ihnen abhängen.

**Why this priority**: Ein Regler, der weit über seinem Ergebnis steht, wird
beim Vergleichen zweier Einstellungen zum Weg: hoch scrollen, verstellen,
zurück scrollen. Beide Reisegrößen wirken auf „Reichweite und Flugdauer" und
auf „Kraftstoffbedarf und Geschwindigkeiten" — sie gehören zwischen die
Grundbedingungen und diese beiden Blöcke.

**Independent Test**: Lasteinstellung verstellen und dabei beide Ergebnisse im
Blick behalten können.

**Acceptance Scenarios**:

1. **Given** die neue Gliederung, **When** der Pilot die Reiseflughöhe sucht,
   **Then** findet er sie unterhalb der Startstrecke und oberhalb der
   Reichweite — nicht bei den Grundbedingungen.
2. **Given** der Pilot verstellt die Lasteinstellung, **When** er die Wirkung
   prüft, **Then** ändern sich Reichweite/Flugdauer und Kraftstoffbedarf,
   während Startstrecke und Druckhöhe stehen bleiben.
3. **Given** die Reiseflughöhe steht in einem eigenen Rahmen, **When** der Pilot
   die Seite betrachtet, **Then** erscheint sie **einmal**, nicht je einmal in
   beiden abhängigen Blöcken.

---

### User Story 3 - Die Platzhöhe bei den übrigen Grundbedingungen (Priority: P2)

Der Pilot stellt die Platzhöhe ein und sieht die daraus folgende Druckhöhe. Der
Luftdruck, der sie mitbestimmt, steht direkt daneben statt in einem anderen
Rahmen weiter oben.

**Why this priority**: Platzhöhe und QNH ergeben **gemeinsam** die Druckhöhe.
Sie heute in zwei getrennte Rahmen zu setzen, trennt zwei Angaben, die nur
zusammen einen Sinn ergeben — die Folgezeile „≙ Druckhöhe … @ …" nennt beide.

**Independent Test**: Prüfen, dass Platzhöhe und QNH im selben Rahmen stehen und
die Druckhöhenzeile unverändert erscheint.

**Acceptance Scenarios**:

1. **Given** die neue Gliederung, **When** der Pilot die „Grundbedingungen"
   betrachtet, **Then** enthalten sie genau Platzhöhe, Luftdruck und
   Außentemperatur.
2. **Given** die Platzhöhe steht in den Grundbedingungen, **When** der Pilot den
   Knopf „EDSH" an ihr drückt, **Then** wirkt er wie zuvor — Platzhöhe und
   Bahnzustand werden gesetzt.

---

## Requirements *(mandatory)*

### Grundbedingungen

- **FR-001**: Der Rahmen „Grundbedingungen" MUSS genau drei Regler enthalten:
  Platzhöhe, Luftdruck QNH und Außentemperatur.
- **FR-002**: Der bisherige eigene Rahmen „Platzhöhe" MUSS entfallen; der Regler
  wandert unverändert in die Grundbedingungen.
- **FR-003**: Die Folgezeile unter der Platzhöhe („≙ Druckhöhe … @ …") MUSS
  erhalten bleiben, ebenso die Schnellwahl „EDSH" samt Bahnzustand.
- **FR-004**: Die Wetterabruf-Knöpfe an Luftdruck und Außentemperatur MÜSSEN
  unverändert bleiben, ebenso ihre Herkunftsvermerke.

### Roll- und Startstrecke

- **FR-005**: Der Bereich „Roll- und Startstrecke" MUSS unmittelbar unter den
  Grundbedingungen stehen — vor allen Reisegrößen und vor allen Ergebnissen des
  Reiseflugs.
- **FR-006**: Er MUSS seinen Pistenwind, den Bahnzustand und seine Auswertung
  unverändert mitführen, einschließlich des Knopfes „EDSH" am Pistenwind.

### Reisegrößen

- **FR-007**: Reiseflughöhe und Lasteinstellung MÜSSEN aus den Grundbedingungen
  in einen eigenen Rahmen unterhalb der Startstrecke wandern.
- **FR-008**: Dieser Rahmen MUSS unmittelbar über den beiden Blöcken stehen, die
  von ihm abhängen: „Reichweite und Flugdauer" und „Kraftstoffbedarf und
  Geschwindigkeiten".
- **FR-009**: Beide Regler MÜSSEN **einmal** vorkommen und nicht je Block
  wiederholt werden.

### Reihenfolge insgesamt

- **FR-010**: Die Seite MUSS in dieser Reihenfolge gelesen werden können:
  Grundbedingungen → Roll- und Startstrecke → Reisegrößen → Reichweite und
  Flugdauer → Kraftstoffbedarf und Geschwindigkeiten.
- **FR-011**: Die Reihenfolge im Dokument MUSS dieser sichtbaren Reihenfolge
  entsprechen, damit Tastatur- und Vorlesebedienung denselben Weg nehmen.

### Beim Bauen hinzugekommen

Diese Anforderungen sind erst während der Umsetzung entstanden — der Nutzer
wollte das Ergebnis ausdrücklich am Bildschirm erproben statt vorab
beschreiben. Sie gehören zum Ergebnis und stehen deshalb hier.

- **FR-016**: Die Zwischenüberschriften „Start und Streckenflug", „Start" und
  „Streckenflug" MUSSEN entfallen. Sie hätten zwischen einem Block und seinen
  eigenen Reglern gestanden und dort mehr getrennt als geordnet.
- **FR-017**: Die beiden Blöcke unterhalb der Reisegrößen MUSSEN unter einer
  gemeinsamen Überschrift „Reiseflug" stehen und ihr im Rang untergeordnet
  sein. Ohne die Klammer war nicht erkennbar, worauf sich Reiseflughöhe und
  Lasteinstellung beziehen.
- **FR-018**: Innerhalb der Roll- und Startstrecke MUSSEN auf breiten
  Bildschirmen im Querformat die Regler links und die Ergebnistabelle rechts
  stehen; im Hochformat untereinander.
- **FR-019**: Bedingungen und Anmerkungen der Startstreckentabelle MUSSEN
  **hinter** der Ergebnistabelle stehen — in der Reihenfolge des Flughandbuchs
  (erst wofür die Tabelle gilt, dann die Anmerkungen) und mit den Titeln
  „Bedingungen:" und „Anmerkungen:". Vor der Tabelle hätten sie auf schmalen
  Geräten das Ergebnis aus dem Sichtfeld geschoben.
- **FR-020**: Die Überschriftenränge MUSSEN lückenlos bleiben. Da die Blocktitel
  eine Stufe aufgestiegen sind, steigt alles darunter mit.

### Unverändert

- **FR-012**: Kein Rechenweg, kein Wertebereich und keine Rundung ändert sich.
  Bei gleicher Einstellung liefert die Anwendung dieselben Ergebnisse wie zuvor.
- **FR-013**: Die Herkunftsvermerke bleiben je Regler getrennt (Feature 027),
  ebenso die Trennung von Pisten- und Streckenwind (Feature 026).
- **FR-014**: Streckenwind und Streckenlänge bleiben im Bereich
  „Kraftstoffbedarf und Geschwindigkeiten" und in ihrer Reihenfolge
  (Feature 031). Nicht mehr gilt aus Feature 031 die Forderung, dass Pisten-
  und Streckenwind auf **einer Höhe** stehen: Sie setzte voraus, dass die
  beiden Blöcke nebeneinanderstehen, was dieses Feature auflöst. Die Stellung
  jedes Windreglers zuoberst in seinem Block bleibt gefordert.
- **FR-015**: Der Wetterabruf-Dialog bleibt in Aussehen und Verhalten
  unverändert; er bleibt von allen drei Knöpfen aus erreichbar.

---

## Success Criteria *(mandatory)*

- **SC-001**: Bei gleicher Einstellung liefert die Anwendung nach dem Umbau
  dieselben Zahlen wie zuvor — an keiner Stelle eine andere.
- **SC-002**: Der Pilot kann die Startstrecke bestimmen, ohne einen Regler zu
  berühren oder zu lesen, der nur den Reiseflug betrifft.
- **SC-003**: Von der ersten Eingabe bis zur abgelesenen Startstrecke liegt kein
  Ergebnis des Reiseflugs.
- **SC-004**: Reiseflughöhe und Lasteinstellung stehen an genau einer Stelle der
  Seite und oberhalb beider Ergebnisse, die sie verändern.
- **SC-005**: Die Reihenfolge beim Durchtasten entspricht der sichtbaren
  Reihenfolge.

---

## Edge Cases

- **Schmaler Bildschirm**: Die Blöcke stehen ohnehin untereinander; die neue
  Reihenfolge ist dort dieselbe wie die des Dokuments.
- **Breiter Bildschirm**: Startstrecke und Kraftstoffbedarf standen bisher
  nebeneinander. Diese Nachbarschaft entfällt, weil die Reisegrößen zwischen
  sie treten — sie war nur so lange sinnvoll, wie beide dieselben Eingaben
  darüber hatten.
- **Unrechenbare Lage** (etwa Druckhöhe außerhalb der Tabelle): Die erklärende
  Meldung erscheint weiterhin an ihrem Ergebnis, nicht an den Reglern.
- **Wetterabruf mit übernommenem Pistenwind**: Der Vermerk bleibt am
  Pistenwindregler, der mit seinem Bereich nach oben wandert.

---

## Assumptions

- **Die drei Grundbedingungen gelten für alles.** Platzhöhe, QNH und Temperatur
  gehen sowohl in die Startstrecke als auch in die Reiseleistung ein; nur
  deshalb dürfen sie oben allein stehen. (Die Temperatur wirkt auf den Reiseflug
  über die ISA-Abweichung, die aus der Platzdruckhöhe folgt — siehe Feature 031.)
- **Der gemeinsame Rahmen für die Reisegrößen** entspricht der Lösung, die die
  Platzhöhe heute schon hat: Was zwei Blöcke brauchen, steht einmal darüber und
  nicht zweimal darin.
- **Die Reiseleistung bleibt ein eigener Block** („Reichweite und Flugdauer") und
  wandert als Ganzes unter die Reisegrößen.
- **Kein neuer Text.** Beschriftungen, Erläuterungen und Meldungen bleiben, wie
  sie sind; Überschriften werden nur dort angepasst, wo eine Gruppe entfällt
  oder neu entsteht.

---

## Out of Scope

- Änderungen an Rechenwegen, Wertebereichen oder Rundungen.
- Änderungen am Wetterabruf oder seinem Dialog.
- Neue Eingabegrößen, etwa eine getrennt einstellbare ISA-Abweichung für die
  Reisehöhe.
- Gestaltung über die Anordnung hinaus (Farben, Schriften, Abstände außer den
  durch die Umgruppierung nötigen).

---

## Key Entities

Keine neuen. Das Feature verschiebt bestehende Bedienelemente zwischen
bestehenden Gruppen; die Datenmodelle des Kerns bleiben unberührt.

---

## Bezug zur Constitution

- **Prinzip I (deterministische Berechnungen)**: nicht berührt — es ändert sich
  keine Berechnung. SC-001 sichert das ausdrücklich ab.
- **Prinzip III (SvelteKit)**: eingehalten; die Umgruppierung findet in der
  bestehenden SvelteKit-Oberfläche statt.
- **Prinzip IV (gemeinsamer Kern, dünne Adapter)**: eingehalten; die Änderung
  betrifft ausschließlich den Adapter. Insbesondere wandert **keine** Grenze und
  **keine** Rundung in die Oberfläche (Zusicherung C-05).
