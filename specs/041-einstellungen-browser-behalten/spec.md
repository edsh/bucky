# Feature Specification: Einstellungen im Browser behalten

**Feature Branch**: `041-einstellungen-browser-behalten`
**Issue**: [#41](https://github.com/edsh/bucky/issues/41)
**Created**: 2026-08-12
**Status**: Draft

---

## Worum es geht

Jedes Neuladen der Seite setzt alle Regler auf die Ausgangswerte zurück. Wer
immer ab EDSH mit derselben Lasteinstellung fliegt, stellt bei jedem Besuch
dasselbe von Hand wieder ein — und wer versehentlich neu lädt, verliert die
gerade mühsam eingestellte Lage.

Die zuletzt gesetzten Werte sollen im Browser bleiben und beim nächsten Besuch
wieder dastehen. Bevorzugte Einstellungen werden dadurch nebenbei zu
Voreinstellungen, ohne dass es dafür eine eigene Verwaltung, ein Konto oder ein
Speichern-Knopf braucht.

Der heikle Punkt ist nicht das Speichern, sondern das **Wiedersehen**: Ein
gespeicherter Wert sieht aus wie ein eingegebener. Beim Wetter ist das
gefährlich — ein QNH von gestern steht genauso selbstverständlich da wie das
von vor fünf Minuten. Deshalb bekommen abgerufene Werte einen sichtbaren
Alterungshinweis (Constitution, Prinzip I: Der Nutzer muss erkennen können,
worauf ein Wert beruht).

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Die eigene Lage bleibt stehen (Priority: P1)

Ein Pilot stellt Platzhöhe, Reiseflughöhe und Lasteinstellung auf das ein, was
er üblicherweise fliegt. Tage später ruft er die Seite erneut auf und findet
genau diese Werte vor.

**Why this priority**: Das ist der eigentliche Zweck des Features. Ohne diesen
Punkt gibt es kein Feature.

**Independent Test**: Werte verstellen, Seite neu laden, Werte prüfen.

**Acceptance Scenarios**:

1. **Given** ein Pilot hat die Lasteinstellung auf 65 % gestellt, **When** er
   die Seite neu lädt, **Then** steht die Lasteinstellung weiterhin auf 65 %.
2. **Given** er hat den Bahnzustand „Trockenes Gras" gewählt, **When** er die
   Seite neu lädt, **Then** ist der Schalter weiterhin gesetzt.
3. **Given** er hat mehrere Werte verstellt, **When** er die Seite neu lädt,
   **Then** stimmen alle Ergebnisse mit denen von vor dem Neuladen überein.

---

### User Story 2 - Alte Wetterwerte sind als alt erkennbar (Priority: P1)

Ein Pilot hat gestern Abend die Wetterwerte für EDSH abgerufen. Heute Morgen
öffnet er die Seite wieder. Die Werte stehen noch da — aber der Vermerk sagt
ihm deutlich, dass sie von gestern sind.

**Why this priority**: Ebenso wichtig wie Story 1 und ohne sie sicherheitlich
bedenklich. Ein unmarkierter alter Wetterwert ist schlechter als gar keiner,
weil er Aktualität vortäuscht.

**Independent Test**: Wetter abrufen, die gespeicherte Abrufzeit künstlich
zurückdatieren, Seite laden, Vermerk prüfen.

**Acceptance Scenarios**:

1. **Given** ein Wetterabruf liegt weniger als eine Stunde zurück, **When** die
   Seite geladen wird, **Then** steht der Vermerk unverändert da wie bisher.
2. **Given** der Abruf liegt mehr als eine Stunde zurück, **When** die Seite
   geladen wird, **Then** weist der Vermerk sichtbar darauf hin, dass die
   Angabe veraltet ist.
3. **Given** ein veralteter Vermerk steht da, **When** der Pilot den Wert von
   Hand verstellt, **Then** verschwindet der Vermerk wie bisher (Feature 027).

---

### User Story 3 - Fremde oder unbrauchbare Daten stören nicht (Priority: P2)

Der Speicher des Browsers enthält Reste einer älteren Fassung der Seite, etwas
Beschädigtes oder Werte außerhalb der zulässigen Bereiche. Die Seite startet
trotzdem und rechnet richtig.

**Why this priority**: Kein Nutzer wünscht sich das, aber es passiert bei jeder
Änderung der Seite. Eine Anwendung, die nach einem Update nicht mehr startet,
ist unbrauchbar.

**Independent Test**: Unsinn in den Speicher schreiben, Seite laden.

**Acceptance Scenarios**:

1. **Given** der Speicher enthält beschädigte Daten, **When** die Seite geladen
   wird, **Then** startet sie mit den Ausgangswerten und ohne Fehlermeldung.
2. **Given** der Speicher enthält eine Platzhöhe außerhalb des Reglerbereichs,
   **When** die Seite geladen wird, **Then** wird dieser Wert verworfen und der
   Ausgangswert verwendet.
3. **Given** der Browser verweigert das Speichern (privates Fenster, gesperrter
   Speicher), **When** der Pilot Werte verstellt, **Then** arbeitet die Seite
   normal weiter, nur ohne Gedächtnis.

---

### Edge Cases

- **Zwei Fenster gleichzeitig**: Beide schreiben in denselben Speicher. Das
  zuletzt geschriebene gewinnt; ein Abgleich zwischen offenen Fenstern findet
  nicht statt.
- **Ein neuer Regler kommt hinzu**: Gespeicherte Stände kennen ihn nicht. Er
  startet mit seinem Ausgangswert, die übrigen Werte bleiben erhalten.
- **Ein Regler wird enger**: Ein früher gültiger, jetzt zu großer Wert wird
  verworfen (siehe FR-008) — er darf nicht stillschweigend außerhalb der
  Tabellengrenzen stehen.
- **Uhr des Rechners verstellt**: Das Alter des Wetterabrufs kann dadurch
  negativ oder absurd groß erscheinen. Beides führt zur Warnung, nie zum
  Verschweigen.
- **Vom Nutzer nie berührte Seite**: Ohne gespeicherten Stand verhält sich
  alles wie heute.

---

## Requirements *(mandatory)*

### Was behalten wird

- **FR-001**: Die Anwendung MUSS alle Eingaben der Seite über das Neuladen
  hinweg behalten: Platzhöhe, Luftdruck QNH, Außentemperatur, Pistenwind,
  Bahnzustand (beide Schalter), Reiseflughöhe, Lasteinstellung, Streckenwind
  und Streckenlänge.
- **FR-002**: Die Werte MÜSSEN unmittelbar bei jeder Änderung gesichert werden,
  ohne dass der Nutzer etwas bestätigt oder speichert.
- **FR-003**: Beim nächsten Aufruf MÜSSEN die gesicherten Werte die
  Ausgangswerte ersetzen, sodass die Seite dieselben Ergebnisse zeigt wie beim
  Verlassen.
- **FR-004**: Die Sicherung MUSS ausschließlich im Browser des Nutzers
  stattfinden. Es werden keine Daten an einen Server übertragen.

### Herkunft und Alter der Wetterwerte

- **FR-005**: Die Herkunftsvermerke der drei abgerufenen Größen (QNH,
  Außentemperatur, Pistenwind) MÜSSEN mitgesichert werden, einschließlich
  Dienst, Ort, Gültigkeitszeitpunkt und dem Zeitpunkt des Abrufs.
- **FR-006**: Liegt der Abruf mehr als **eine Stunde** zurück, MUSS der Vermerk
  sichtbar als veraltet gekennzeichnet werden. Die Kennzeichnung MUSS sich vom
  gewöhnlichen Vermerk deutlich unterscheiden und ohne Farbsehen erkennbar sein.
- **FR-007**: Der Wert selbst bleibt dabei stehen und wird weder verändert noch
  entfernt. Der Nutzer entscheidet, ob er neu abruft oder von Hand korrigiert.

### Umgang mit unbrauchbaren Ständen

- **FR-008**: Ein gesicherter Wert, der außerhalb des zulässigen Bereichs seines
  Reglers liegt, MUSS verworfen werden; an seine Stelle tritt der Ausgangswert.
  Kein gespeicherter Stand darf die Anwendung außerhalb der Handbuchtabellen
  rechnen lassen (Constitution, Prinzip I).
- **FR-009**: Beschädigte, unvollständige oder aus einer früheren Fassung
  stammende Stände MÜSSEN folgenlos bleiben: Die Seite startet mit den
  Ausgangswerten für alles, was sich nicht zweifelsfrei lesen lässt.
- **FR-010**: Steht kein Speicher zur Verfügung, MUSS die Seite unverändert
  benutzbar bleiben; das Fehlen des Gedächtnisses ist kein Fehlerfall und wird
  dem Nutzer nicht gemeldet.

### Unverändert

- **FR-011**: Kein Rechenweg, kein Wertebereich und keine Rundung ändert sich.
  Der Rechenkern bleibt unberührt: Das Sichern ist Sache des Zugangswegs, nicht
  des Kerns (Constitution, Prinzip IV).
- **FR-012**: Das Verhalten der Herkunftsvermerke bei Handbedienung bleibt
  bestehen: Wer einen Regler anfasst, löscht dessen Vermerk (Feature 027).
- **FR-013**: Ein Knopf zum Zurücksetzen wird **nicht** eingeführt. Wer die
  Ausgangswerte wiedersehen will, stellt sie ein oder leert den Speicher seines
  Browsers.

### Beim Bauen hinzugekommen

- **FR-014**: Der Vergleichszeitpunkt für die Alterung MUSS bei geöffneter Seite
  weiterlaufen (mindestens im Minutentakt). Sonst erschiene die Warnung aus
  FR-006 nie bei einer Seite, die stundenlang offen steht — genau der Fall, für
  den sie gedacht ist.
- **FR-015**: Ein Abrufzeitpunkt, der **in der Zukunft** liegt, gilt als
  veraltet (verstellte Uhr, Zeitzonenfehler), jedoch erst jenseits einer
  Toleranz von **fünf Minuten**. Ohne diese Toleranz trüge ein soeben
  abgerufener Wert sofort die Alterswarnung, weil der Vergleichszeitpunkt aus
  FR-014 beim Laden der Seite gesetzt wird und der Abruf später erfolgt. Beim
  Übernehmen MUSS der Vergleichszeitpunkt zusätzlich neu gesetzt werden.
- **FR-016**: Das Laden des gesicherten Standes MUSS nach dem Einhängen im
  Browser geschehen, nicht beim Vorrendern. Ein vorgerenderter Seiteninhalt
  kennt den Speicher des Geräts nicht; ein Laden zur Renderzeit ergäbe zwei
  widersprüchliche Fassungen derselben Seite.
- **FR-017**: Jeder Zusatz unter einem Regler MUSS in einer eigenen Zeile
  stehen. Unter der Außentemperatur stehen zwei (ISA-Abweichung und
  Herkunftsvermerk); mit dem längeren Warntext aus FR-006 lasen sie sich
  nebeneinander wie ein einziger Satz.

---

## Success Criteria *(mandatory)*

- **SC-001**: Nach dem Verstellen beliebiger Regler und einem Neuladen zeigt die
  Seite dieselben Ergebnisse wie unmittelbar davor — in 100 % der Fälle.
- **SC-002**: Ein Pilot, der die Seite zum zweiten Mal öffnet, muss keinen
  einzigen Regler erneut anfassen, um zu seiner gewohnten Lage zu kommen.
- **SC-003**: Ein Wetterwert, dessen Abruf über eine Stunde zurückliegt, ist auf
  den ersten Blick von einem frisch abgerufenen zu unterscheiden.
- **SC-004**: Ein beschädigter oder fremder Speicherinhalt führt in keinem Fall
  zu einer leeren Seite, einer Fehlermeldung oder einem Ergebnis außerhalb der
  Handbuchgrenzen.

---

## Assumptions

- Der Speicher gehört zum Gerät und zum Browser, nicht zur Person. Ein zweiter
  Rechner desselben Piloten beginnt bei den Ausgangswerten. Das ist gewollt:
  Ein Konto oder eine serverseitige Ablage wäre ein anderes, größeres Feature.
- Die Grenze von einer Stunde ist bewusst streng gewählt. Sie ist keine
  fachliche Gültigkeitsdauer, sondern der Punkt, ab dem ein Hinweis mehr nützt
  als stört.
- Der Zeitpunkt des Abrufs wird der Uhr des Geräts entnommen. Eine falsch
  gestellte Uhr führt zu einer unnötigen Warnung, nie zu einer unterdrückten.
- Es werden keine personenbezogenen Daten gesichert. Die gespeicherten Werte
  sind Flugzeug- und Wetterangaben; ein Hinweis nach DSGVO ist dafür nicht
  erforderlich.

---

## Out of Scope

- Mehrere benannte Voreinstellungen („Profile") oder deren Verwaltung.
- Abgleich zwischen Geräten oder Browsern.
- Ein Knopf zum Zurücksetzen (ausdrücklich verworfen, FR-013).
- Ein Verlauf früherer Berechnungen.
- Automatisches Erneuern veralteter Wetterwerte: Der Abruf bleibt eine bewusste
  Handlung mit Bestätigungsdialog (Feature 025).

---

## Key Entities

- **Gesicherter Stand**: die Gesamtheit der Reglerwerte und Schalter der Seite
  samt einer Kennung ihrer Fassung, an der sich unbrauchbare Stände erkennen
  lassen.
- **Herkunftsvermerk**: Dienst, Ort, Gültigkeitszeitpunkt und Abrufzeitpunkt
  einer abgerufenen Größe. Der Abrufzeitpunkt ist neu; er trägt die Alterung.

---

## Bezug zur Constitution

- **Prinzip I (deterministische, sicherheitskritische Berechnung)**: Berührt,
  aber nicht verändert. Zwei Stellen zahlen ausdrücklich darauf ein: Kein
  gespeicherter Wert darf außerhalb der Tabellengrenzen wirksam werden
  (FR-008), und kein gespeicherter Wetterwert darf Aktualität vortäuschen
  (FR-006).
- **Prinzip IV (gemeinsamer Kern, dünne Adapter)**: Das Sichern findet
  ausschließlich im Zugangsweg „SvelteKit-App" statt. Der Kern und der
  MCP-Endpunkt bleiben unberührt; sie kennen keinen Browser-Speicher.
