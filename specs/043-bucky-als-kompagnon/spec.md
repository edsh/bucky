# Feature Specification: Bucky als Kompagnon — Startseite und Flugzeug-Avatar

**Feature-Nummer**: 043
**GitHub-Issue**: [#43](https://github.com/edsh/bucky/issues/43)
**Branch**: `043-bucky-als-kompagnon`
**Erstellt**: 2026-08-12
**Status**: Entwurf

---

## Worum es geht

Bisher **ist** die Anwendung der POH-Rechner: Er liegt auf der Startseite, und
außer ihm gibt es nur die Tabellenübersicht. Gedacht war Bucky aber als
Kompagnon — als ein Begleiter für die Dinge rund ums Fliegen im Verein, von
denen der Rechner nur der erste ist. Solange der Rechner die Startseite besetzt,
gibt es keinen Ort, an dem eine zweite Funktion überhaupt auftauchen könnte.

Dieses Feature schafft diesen Ort. Es ist ein **Umbau ohne neue Fachlichkeit**:
Der Rechner zieht um, die Startseite wird zur Auswahl. Gerechnet wird kein
einziger Wert anders.

Die Auswahl ist bewusst nicht als Liste von Funktionen gebaut, sondern über das
**Flugzeug**: Wer die App öffnet, hat in aller Regel eine bestimmte Maschine im
Sinn und sucht dann, was er mit ihr tun will — nicht umgekehrt. Deshalb steht
dort ein runder Avatar der D-EELK, wie man ihn von Personen in sozialen Netzen
kennt, und das Antippen öffnet die möglichen Handlungen.

Die **Reservierung** bleibt hier ausdrücklich außen vor. Sie wirft eigene Fragen
auf (Verfassungsprinzip II: Vereinsflieger bleibt das führende System — liest
Bucky nur, oder schreibt er auch?) und bekommt ein eigenes Feature. Dieses
Ticket ist ein Umbauticket und soll als solches abgeschlossen werden können.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Bucky begrüßt und fragt nach dem Anliegen (Priority: P1)

Ein Pilot öffnet Bucky. Statt sofort in einem Formular zu stehen, sieht er
Bucky auf der Wiese stehen und fragen „Hi Pilot, was darf's sein?" — und
darunter, worauf sich das bezieht.

**Warum das wichtig ist**: Der Splash ist das Gesicht der App und macht in einem
Blick klar, dass Bucky mehr ist als ein Rechenformular. Er trägt zugleich die
Frage, auf die die Auswahl darunter die Antwort ist.

**Unabhängiger Test**: Die Startseite aufrufen. Das Splash-Bild ist zu sehen,
darunter die Auswahl — ohne Scrollen auf einem üblichen Telefonbildschirm.

**Abnahmekriterien**:

1. **Angenommen** ein Pilot ruft die Startseite auf, **dann** sieht er den
   Splash mit Bucky und darunter den Avatar der D-EELK.
2. **Angenommen** er benutzt einen Vorleser, **dann** wird ihm die Frage aus der
   Sprechblase als Text vorgelesen; das Bild ist kein Sackgasse.
3. **Angenommen** das Bild lädt nicht, **dann** bleibt die Auswahl darunter
   vollständig bedienbar.

---

### User Story 2 - Vom Flugzeug zur Handlung (Priority: P1)

Der Pilot tippt auf den Avatar der D-EELK. Es öffnet sich ein kleines
Auswahlmenü mit dem, was er mit dieser Maschine tun kann. Er wählt
„POH-Rechner" und landet im gewohnten Rechner.

**Warum das wichtig ist**: Das ist der einzige Weg zum Rechner und damit der
meistbegangene Pfad der App. Er muss kurz sein: zwei Berührungen.

**Unabhängiger Test**: Von der Startseite aus mit zwei Klicks im Rechner
ankommen und dort rechnen wie zuvor.

**Abnahmekriterien**:

1. **Angenommen** der Pilot tippt auf den Avatar, **dann** öffnet sich das
   Auswahlmenü mit dem Eintrag „POH-Rechner".
2. **Angenommen** er wählt „POH-Rechner", **dann** steht er auf der
   Rechnerseite, die außer ihrer Adresse unverändert ist.
3. **Angenommen** er tippt neben das geöffnete Menü oder drückt Escape,
   **dann** schließt es sich, ohne etwas auszulösen.
4. **Angenommen** er bedient nur die Tastatur, **dann** erreicht er Avatar und
   Menüeinträge in sinnvoller Reihenfolge und kann sie auslösen.

---

### User Story 3 - Zurück zur Auswahl (Priority: P2)

Der Pilot ist im Rechner und will zurück zur Auswahl.

**Warum das wichtig ist**: Ohne Rückweg ist die Startseite nach dem ersten Klick
für immer verlassen. Sobald es eine zweite Funktion gibt, ist das der Weg
zwischen ihnen.

**Unabhängiger Test**: Vom Rechner aus mit einem Klick auf der Startseite
landen — ohne die Zurück-Taste des Browsers.

**Abnahmekriterien**:

1. **Angenommen** der Pilot ist im Rechner, **dann** gibt es dort einen
   sichtbaren, benannten Weg zurück zur Startseite.
2. **Angenommen** er geht zurück und wieder in den Rechner, **dann** stehen
   seine Einstellungen unverändert da (Feature 041 bleibt unberührt).

---

### Edge Cases

- **Lesezeichen auf die alten Adressen**: Wer `/tabellen` gespeichert hat,
  landet nach dem Umzug im Leeren. Die alte Adresse muss auf die neue führen.
  Ein Lesezeichen auf `/` führt künftig auf die Startseite statt in den Rechner
  — das ist gewollt und kein Fehler.
- **Ein einziges Flugzeug**: Es gibt vorerst nur die D-EELK. Der Aufbau muss ein
  zweites Flugzeug tragen können, ohne dass das jetzt gebaut wird.
- **Ein einziger Menüeintrag**: Das Auswahlmenü hat vorerst nur „POH-Rechner".
  Es bleibt trotzdem ein Menü, weil der zweite Eintrag im Folgefeature dazukommt
  — ein direkter Sprung wäre in vier Wochen wieder auszubauen.
- **Schmale Bildschirme**: Splash und Avatar dürfen die Auswahl nicht aus dem
  Sichtfeld schieben (die Lehre aus Feature 039).
- **Gespeicherte Einstellungen**: Der Umzug der Adressen darf den gesicherten
  Stand aus Feature 041 nicht entwerten.

---

## Requirements *(mandatory)*

### Startseite

- **FR-001**: Die Startseite MUSS den Splash mit Bucky zeigen
  (`bucky-start.gif`), einschließlich seiner Frage „Hi Pilot, was darf's sein?".
- **FR-002**: Der Inhalt des Bildes MUSS als Textalternative verfügbar sein, so
  dass die Frage auch ohne Sehen ankommt.
- **FR-003**: Splash und Auswahl MÜSSEN auf **einer** Seite stehen. Ein
  vorgeschalteter Bildschirm, den man wegklicken muss, ist ausdrücklich nicht
  gewollt — er kostet einen Klick ohne Gegenwert.
- **FR-004**: Auf einem üblichen Telefonbildschirm MUSS der Avatar ohne Scrollen
  sichtbar sein.

### Flugzeug-Avatar

- **FR-005**: Die D-EELK MUSS als **runder** Avatar mit umlaufendem Rahmen
  dargestellt werden, mit der Bildunterschrift „D-EELK".
- **FR-006**: Der Rahmen MUSS so angelegt sein, dass seine Farbe später einen
  Zustand anzeigen kann (etwa Verfügbarkeit). In diesem Feature hat er eine
  neutrale Farbe und **keine** Bedeutung.
- **FR-007**: Der Avatar MUSS als Bedienelement erkennbar und benannt sein;
  seine Beschriftung MUSS das Flugzeug nennen, nicht nur „Bild".
- **FR-008**: Der Aufbau MUSS mehrere Flugzeuge nebeneinander tragen können,
  ohne dass die Darstellung eines einzelnen davon abhängt.

### Auswahlmenü

- **FR-009**: Das Antippen des Avatars MUSS ein Auswahlmenü öffnen, das die
  möglichen Handlungen für dieses Flugzeug zeigt.
- **FR-010**: Einziger Eintrag ist **POH-Rechner**; er führt auf die
  Rechnerseite.
- **FR-011**: Das Menü MUSS sich mit Escape und mit einem Klick außerhalb
  schließen, ohne etwas auszulösen.
- **FR-012**: Das Menü MUSS mit der Tastatur vollständig bedienbar sein, und der
  Tastaturfokus MUSS beim Öffnen und Schließen nachvollziehbar geführt werden.

### Umzug der bestehenden Seiten

- **FR-013**: Der POH-Rechner MUSS von `/` auf `/d-eelk/poh-rechner` umziehen,
  die Tabellenübersicht von `/tabellen` auf `/d-eelk/poh-rechner/tabellen`.
- **FR-014**: Die alte Adresse `/tabellen` MUSS auf die neue führen, damit
  bestehende Lesezeichen nicht ins Leere laufen.
- **FR-015**: Alle Verweise innerhalb der Anwendung MÜSSEN auf die neuen
  Adressen zeigen.
- **FR-016**: Von der Rechnerseite und von der Tabellenübersicht MUSS ein
  benannter Weg zurück zur Startseite führen.

### Unverändert

- **FR-017**: Kein Rechenweg, kein Wertebereich, keine Rundung und keine
  Quellenangabe ändert sich. Der Rechenkern wird nicht angefasst (Prinzip IV).
- **FR-018**: Der Inhalt der Rechnerseite bleibt unverändert — Gliederung,
  Regler, Ergebnistabellen, Wetterabruf und die formellen Hinweise.
- **FR-019**: Die gesicherten Einstellungen aus Feature 041 MÜSSEN den Umzug
  überstehen: Wer vor dem Umbau Werte eingestellt hatte, findet sie danach
  wieder vor.

### Beim Bauen hinzugekommen

- **FR-020**: Das geöffnete Auswahlmenü MUSS sich seinen Platz suchen wie ein
  Kontextmenü: bevorzugt neben dem Avatar, bei Enge darunter, in jedem Fall
  vollständig im Sichtfeld. Eine feste Seite trägt nicht — der erste Avatar
  steht am Seitenrand, und auf einem Telefon ist neben ihm womöglich kein Platz.
- **FR-024**: Der Grund eines angesteuerten Menüeintrags MUSS innerhalb der
  abgerundeten Ecken des Menüs bleiben; ohne Beschnitt brachen die Ecken
  sichtbar aus dem Rahmen aus.
- **FR-021**: Beim Öffnen MUSS der Tastaturfokus in das Menü wandern. Bleibt er
  auf dem Avatar, schließt der nächste Tastendruck das eben geöffnete Menü
  wieder — der Tastaturweg aus SC-003 wäre nicht begehbar.
- **FR-023**: Der Splash MUSS bis an den Rand des Fensters reichen. Ein weißer
  Streifen ringsum ließe ihn wie ein eingefügtes Bild aussehen statt wie den
  Kopf der Seite; der übrige Inhalt behält seinen Abstand.
- **FR-022**: Jede Seite MUSS unter ihrer Adresse **unmittelbar** aufrufbar
  sein, nicht nur über einen Klick von der Startseite aus. Seit die Seiten
  geschachtelt liegen, entscheidet das darüber, ob ein einfacher Dateiserver
  sie ausliefern kann — und damit darüber, ob der Klickpfad sie prüfen kann.

---

## Success Criteria *(mandatory)*

- **SC-001**: Ein Pilot erreicht den Rechner von der Startseite aus mit **zwei**
  Berührungen.
- **SC-002**: Auf einem Telefon in Hochkantlage sind Splash und Avatar ohne
  Scrollen zu sehen.
- **SC-003**: Der gesamte Weg Startseite → Menü → Rechner → zurück ist allein
  mit der Tastatur begehbar.
- **SC-004**: Alle Berechnungen liefern nach dem Umbau dieselben Ergebnisse wie
  davor; kein bestehender Prüffall muss inhaltlich geändert werden — nur die
  Adresse, unter der die Seite aufgerufen wird.
- **SC-005**: Ein Lesezeichen auf die alte Tabellenadresse führt weiterhin zur
  Tabellenübersicht.

---

## Assumptions

- Der Splash ist eine **bewegte Grafik**; sie wird als solche eingebunden. Ob
  sie sich wiederholt oder einmal läuft, ist Sache der Datei und wird hier nicht
  vorgeschrieben.
- Der Avatar der D-EELK ist eine **Pixelgrafik**; sie wird ohne Weichzeichnen
  vergrößert, damit die Pixel scharf bleiben.
- Das mitscrollende Flugzeugbild auf der Rechnerseite bleibt, wie es ist. Es
  erfüllt dort einen anderen Zweck als der Avatar auf der Startseite.
- Es gibt keine Anmeldung und keine Nutzerkennung; die Startseite zeigt allen
  dasselbe.
- Die Adressen sind nach dem Flugzeug gegliedert (`/d-eelk/…`), weil künftige
  Funktionen desselben Flugzeugs dort daneben liegen sollen.

---

## Out of Scope

- **Die Reservierung** — eigenes Feature. Sie taucht in diesem Ticket weder als
  Eintrag noch als Platzhalter auf.
- Farbige Statusrahmen am Avatar. Der Rahmen wird nur so gebaut, dass er später
  einen tragen kann.
- Ein zweites Flugzeug.
- Jede Art von Anmeldung, Nutzerkonto oder Vereinsflieger-Anbindung.
- Änderungen an der Rechnerseite selbst.

---

## Key Entities

- **Flugzeug**: Ein Eintrag auf der Startseite, bestehend aus Kennzeichen,
  Avatarbild und den für ihn möglichen Handlungen. Vorerst genau einer.
- **Handlung**: Ein Eintrag im Auswahlmenü eines Flugzeugs, bestehend aus
  Benennung und Ziel. Vorerst genau eine.

---

## Bezug zur Constitution

- **Prinzip I (deterministische Berechnung)**: Nicht berührt — es wird nichts
  gerechnet. FR-017 hält ausdrücklich fest, dass der Umbau keine Zahl bewegt.
- **Prinzip III (SvelteKit)**: Der Umbau nutzt genau die Routenfähigkeit, für
  die SvelteKit gegenüber reinem Svelte gewählt wurde.
- **Prinzip IV (gemeinsamer Kern, mehrere Zugangswege)**: Der Kern wird nicht
  angefasst. Die Startseite ist Navigation, kein zweiter Zugangsweg zur
  Berechnung.
- **Prinzip II (Vereinsflieger als führendes System)**: In diesem Feature nicht
  berührt — genau deshalb ist die Reservierung ausgegliedert.
