# Feature Specification: Reservierungsübersicht Flugzeugflotte (v2)

**Feature Branch:** `001-reservierungsuebersicht`
**Status:** Draft (v2 — ersetzt die Spec aus `design_handoff_reservierung/`)
**Input:** Design-Handoff `design_handoff_reservierung_v2/` (High-Fidelity-Prototyp + README v2)

## Clarifications

Aus dem Design entschieden (nicht erneut klären):
- Buchen findet **nicht** in dieser Anwendung statt; die Reservierung wird per parametrisiertem Link an Vereinsflieger übergeben.
- Ringdarstellung ist die **Tagesuhr**.
- Kein eigener Zustand „bald belegt" — nur Farbverlauf in der letzten Stunde.
- Fremde Namen werden nicht angezeigt („Reserviert").
- Das Sheet wird **ausschließlich** durch Tippen auf einen Balken geöffnet; es gibt keine Aktionsleiste.
- Standardvariante des Zeitwählers ist **Ziehen**; „Uhrzeit wählen" ist die gleichwertige Alternative. Weitere Varianten werden nicht gebaut.
- Ein Wartelisteneintrag ist **keine** Reservierung und wird lokal quittiert, nicht an Vereinsflieger übergeben.

Offen (vor `/plan` klären):
- [NEEDS CLARIFICATION: Vereinsflieger-Datenzugriff — API, Export oder Scraping? Authentifizierung pro Mitglied oder Service-Account?]
- [NEEDS CLARIFICATION: `frm_apid` je Maschine — nur D-EELK (75132) ist bekannt; woher kommt die Zuordnung?]
- [NEEDS CLARIFICATION: Trägt die Warteliste ein System (Benachrichtigung per Mail/Push) oder ist sie nur eine lokale Notiz?]
- [NEEDS CLARIFICATION: Wie werden Favoriten bestimmt — Nutzereinstellung, Historie, Vereinskonfiguration?]
- [NEEDS CLARIFICATION: Quelle für Sonnenauf-/untergang und Platzkoordinaten]
- [NEEDS CLARIFICATION: Wohin der POH-Link, nachdem die Aktionsleiste entfallen ist?]
- [NEEDS CLARIFICATION: Aktualisierungsintervall/Caching und Offline-Verhalten]

## User Scenarios & Testing

### Primary User Story
Ein Vereinsmitglied öffnet die Seite auf dem Handy, erkennt in Sekunden, welche Maschine jetzt oder heute noch frei ist, tippt auf den Balken der gewünschten Zeit, zieht das Fenster auf die Wunschdauer und springt mit vorbefüllten Zeiten nach Vereinsflieger.

### Acceptance Scenarios (v2, Sheet)
1. **Given** eine Maschine ist frei, **When** das Mitglied auf eine freie Stelle des Tagesbalkens tippt, **Then** öffnet das Sheet mit einem 2-Stunden-Fenster ab der getippten, auf 15 Minuten gerundeten Zeit, Variante „Ziehen".
2. **Given** das Sheet ist offen, **When** das Mitglied die rechte Kante des Blocks nach rechts zieht, **Then** wächst die Dauer in 15-Minuten-Schritten und der Beginn bleibt unverändert.
3. **Given** das Sheet ist offen, **When** das Mitglied den Block als Ganzes zieht, **Then** bleibt die Dauer konstant und der Block stoppt an 06:00 bzw. 22:00, ohne in den nächsten Tag zu laufen.
4. **Given** das Mitglied hat gerade gezogen, **When** der Finger losgelassen wird, **Then** wird das Fenster **nicht** auf die 2-Stunden-Vorgabe zurückgesetzt.
5. **Given** das Ende steht auf 14:45, **When** das Mitglied als Beginn 09:00 wählt, **Then** bleibt das Ende auf 14:45 und die Dauer zeigt 5:45 h.
6. **Given** das Ende steht auf 10:00, **When** das Mitglied als Beginn 11:00 wählt, **Then** springt das Ende auf 11:30 und die Vorschau zeigt 30 min.
7. **Given** die Variante „Uhrzeit wählen" wird aktiviert, **When** das Sheet rendert, **Then** sind die gewählten Stundenkacheln beider Spalten sichtbar (mittig gescrollt).
8. **Given** die gewählte Stundenkachel liegt außerhalb des Sichtfelds, **When** die Spalte gescrollt wird, bis sie sichtbar ist, **Then** blendet das Richtungspfeilchen weich aus.
9. **Given** das gewählte Fenster überschneidet eine fremde Reservierung, **When** die Modi bestimmt werden, **Then** erscheint „Auf die Warteliste … ↗" plus ein Ausweich-Vorschlag der ersten freien Lücke ab dem gewählten Ende.
10. **Given** das gewählte Fenster liegt heute vor „jetzt", **When** die Modi bestimmt werden, **Then** erscheint „Nachträglich eintragen … ↗" und der Warnhinweis in `#d9a13c`.
11. **Given** das Fenster schneidet eine Sperre, **When** die Modi bestimmt werden, **Then** gibt es **keinen** Absprung und **keine** Warteliste, sondern die Sperr-Hinweisbox.
12. **Given** ein freies Fenster 11:30–13:30 an D-EELK am 13.08.2026, **When** der Absprung getippt wird, **Then** enthält die Ziel-URL `frm_apid=75132&frm_datefrom=13.08.2026&frm_dateto=13.08.2026&frm_datefromtime=11:30&frm_datetotime=13:30`.
13. **Given** das Sheet ist offen, **When** das Mitglied auf die Mitte des Tageswechslers tippt, **Then** öffnet der Systemdatepicker, begrenzt auf heute bis heute + 6 Tage.
14. **Given** ein Tageswechsel, **When** der neue Tag freie Zeit hat, **Then** steht ein neues 2-Stunden-Fenster in der ersten freien Lücke; sonst erscheint der Leerfall-Hinweis.
15. **Given** ein Balken wird gerendert, **When** Sonnenaufgang 06:05 und Untergang 20:40 gelten, **Then** sind Balkenanfang und -ende sichtbar abgedunkelt und der Tagbereich klar.
16. **Given** heute ist der gezeigte Tag, **When** der Balken rendert, **Then** markiert eine 1 px feine, gestrichelte Nadel mit 5 px Überstand die aktuelle Zeit.

Die Szenarien 1–9 der v1-Spec (Statuslogik, Ring, Favoriten, Leerlisten) gelten unverändert weiter.

## Requirements

### Functional Requirements (Ergänzung/Ersatz zu v1)
- **FR-021**: Das System MUSS das Reservieren-Sheet aus jedem Balken (Tagesbalken, Tageszeile, Wochenspalte) öffnen; eine separate Aktionsleiste MUSS es nicht geben.
- **FR-022**: Das System MUSS ein Zeitfenster in 15-Minuten-Schritten wählbar machen, mit Mindestdauer 15 Minuten und Vorschlagsdauer 2 Stunden.
- **FR-023**: Das System MUSS zwei gleichwertige Wählvarianten anbieten: Ziehen (Default) und Kachelauswahl aus Stunden und Minuten für Beginn und Ende.
- **FR-024**: Das System MUSS beim Ziehen an einer Kante die Dauer verändern und beim Verschieben des Blocks die Dauer erhalten; am Tagesrand MUSS es stoppen statt umzubrechen.
- **FR-025**: Das System MUSS die aus jeder Kachelwahl resultierende Dauer an der Kachel anzeigen und MUSS niemals eine negative oder unmögliche Dauer anzeigen.
- **FR-026**: Das System MUSS bei einer Beginn-Wahl das Ende beibehalten und nur bei Überholung auf Beginn + 30 Minuten nachziehen.
- **FR-027**: Das System MUSS die aktuell gewählte Zeit in scrollbaren Listen immer sichtbar halten und die Richtung einer außerhalb liegenden Auswahl andeuten.
- **FR-028**: Das System MUSS aus dem gewählten Fenster genau einen von vier Abschlussmodi bestimmen: frei, Nachtrag, Warteliste, gesperrt — mit jeweils eigener Aktion und Erklärung.
- **FR-029**: Das System MUSS in den Modi Warteliste und gesperrt die nächste freie Lücke ab dem gewählten Ende als Ausweich-Vorschlag anbieten.
- **FR-030**: Das System MUSS für gesperrte Zeiten weder Absprung noch Wartelisteneintrag anbieten.
- **FR-031**: Das System MUSS Vereinsflieger mit Maschine, Datum und beiden Uhrzeiten vorbefüllen (`frm_apid`, `frm_datefrom`, `frm_dateto`, `frm_datefromtime`, `frm_datetotime`) und in einem neuen Tab öffnen.
- **FR-032**: Das System MUSS einen Tageswechsel über Schaltflächen und über die Datumsauswahl des Betriebssystems erlauben, begrenzt auf heute bis heute + 6 Tage.
- **FR-033**: Das System MUSS Nacht auf allen Zeitbalken eindeutig sichtbar machen, abgeleitet aus Sonnenauf- und -untergang des jeweiligen Tages.
- **FR-034**: Das System MUSS die aktuelle Zeit auf allen Balken des heutigen Tages als feine gestrichelte Nadel markieren.
- **FR-035**: Das System MUSS jede Aktion, die die Anwendung verlässt, sprachlich als Zwischenschritt kennzeichnen (Ellipse + Linkout-Symbol).
- **FR-036**: Das System MUSS einen Wartelisteneintrag ausdrücklich als „keine Reservierung" ausweisen.
- **FR-037**: Das System MUSS das Sheet auf kleinen Bildschirmen vollständig erreichbar halten (eigenes Scrollen, Primäraktion nie abgeschnitten).

FR-001 bis FR-020 der v1-Spec gelten weiter; **FR-018 (POH-Link)** braucht einen neuen Ort, **FR-011** wird durch FR-031 präzisiert.

### Key Entities (Ergänzung)
- **Reservierungswunsch (transient)**: Tag (0…6), Beginn, Ende, gewählte Variante, Wartelisten-Quittung. Kein persistenter Zustand, keine Übergabe außer per Link.
- **Maschine** zusätzlich: `apid` (Vereinsflieger-ID), optionaler POH-Link.
- **Tageskontext** zusätzlich: Sonnenauf-/untergang für die Nachttönung.

### Non-Functional (Ergänzung)
- **NFR-005**: Ziehen MUSS auf Touch flüssig bleiben (Geste außerhalb des Balkens nicht abbrechen, keine Layout-Sprünge; deshalb feste Höhen für Status- und Aktionszonen).
- **NFR-006**: Alle Tap-Ziele im Sheet ≥ 44 px.
- **NFR-007**: Die Zeitlogik (Rasterung, Konflikte, Modi, Lücken, Deep-Link-Bau) MUSS ohne UI testbar sein.

## Out of Scope
- Buchen, Ändern, Stornieren in dieser Anwendung
- Serverseitige Warteliste (solange nicht geklärt)
- Fenster über Mitternacht hinaus
- Desktop-Layout, Push, Nutzerverwaltung
- Ringvarianten „Voller Ring" und „Punkt-Abzeichen"

## Review Checklist
- [ ] Keine Implementierungsdetails in den Requirements
- [ ] Alle Requirements testbar
- [ ] Offene Klärungen abgearbeitet (insb. `apid`-Quelle und Warteliste)
- [ ] Visuelle Vorgaben ausschließlich aus `README.md` (hifi, pixelgenau)
