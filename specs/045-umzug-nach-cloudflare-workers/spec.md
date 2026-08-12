# Feature Specification: Umzug nach Cloudflare Workers

**Feature-Nummer**: 045
**GitHub-Issue**: [#45](https://github.com/edsh/bucky/issues/45)
**Branch**: `045-umzug-nach-cloudflare-workers`
**Erstellt**: 2026-08-12
**Status**: Entwurf

---

## Worum es geht

Bucky liegt heute auf GitHub Pages. Das trägt, solange die Anwendung
ausschließlich im Browser rechnet — genau das tut der POH-Rechner.

Mit der Reservierung endet das. Sie holt ihre Daten von Vereinsflieger, und
dieser Dienst erlaubt **500 Aufrufe je Tag für den ganzen Verein**. Würde jede
Seitenansicht selbst dort anfragen, wäre der Dienst nach gut hundert Sitzungen
für alle gesperrt — und zwar umso schneller, je mehr Mitglieder Bucky nutzen.
Der Ausweg steht als Prinzip V in der Verfassung: **einmal zentral abrufen,
zwischenspeichern, alle lesen aus dem Zwischenspeicher.** Dafür braucht es
einen Ort, der etwas behalten kann und von sich aus tätig wird. GitHub Pages
ist dieser Ort nicht; es liefert nur Dateien aus.

Dieses Feature schafft den Ort — und **sonst nichts**. Es ist ein reines
Umzugsticket: keine neue Fachlichkeit, kein Vereinsflieger, kein
Zwischenspeicher-Inhalt. Der POH-Rechner rechnet danach jeden Wert genauso wie
vorher und sieht genauso aus. Erfolg heißt hier ausdrücklich: **Es fällt
niemandem auf.**

Der Umzug wird bewusst **vorgezogen** statt in der Reservierung mitgemacht.
Beides zugleich hieße, eine neue Fachlichkeit auf einer frisch gewechselten
Grundlage zu bauen: Bei jedem Fehler wäre unklar, ob er von der Reservierung
oder vom Umzug kommt. Getrennt ist jeder Schritt für sich prüfbar — und dieser
hier gegen einen bekannten Sollzustand.

Zwei Dinge machen den Umzug kleiner als er klingt: Die Domain `edsh.de` wird
**bereits von Cloudflare bedient**, es ist also nur ein Eintrag umzustellen und
kein Domainumzug. Und die ausgelieferten Seiten verweisen schon heute relativ
aufeinander, tragen also keinen fest eingebauten Pfad mit sich herum.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Für Piloten ändert sich nichts (Priority: P1)

Ein Pilot ruft Bucky unter der gewohnten Adresse auf, stellt seine Werte ein
und liest die Startstrecke ab. Er merkt nicht, dass die Seite inzwischen von
woanders kommt.

**Warum das wichtig ist**: Das ist der eigentliche Zweck der Abnahme. Ein
Umzug, den der Nutzer bemerkt, ist ein misslungener Umzug — und bei einem
sicherheitskritischen Rechner ist eine unbemerkte Abweichung im Ergebnis das
schlimmste denkbare Ergebnis.

**Unabhängiger Test**: Vor dem Umzug für einen festen Satz Eingaben alle
angezeigten Werte festhalten, nach dem Umzug dieselben Eingaben stellen und
vergleichen.

**Abnahmekriterien**:

1. **Angenommen** ein Pilot ruft die gewohnte Adresse auf, **dann** erscheint
   die Startseite mit Bucky und dem Avatar der D-EELK wie zuvor.
2. **Angenommen** er stellt im Rechner einen bestimmten Satz Werte ein,
   **dann** stehen dort dieselben Zahlen, Quellenangaben und Hinweise wie vor
   dem Umzug — Ziffer für Ziffer.
3. **Angenommen** er hatte ein Lesezeichen auf eine Unterseite, **dann** führt
   es weiterhin dorthin.
4. **Angenommen** er ruft die Seite ohne Netz erneut auf, nachdem er sie einmal
   besucht hat, **dann** verhält sie sich nicht schlechter als vorher.

---

### User Story 2 - Vorschau je Änderungsvorschlag (Priority: P2)

Wer eine Änderung vorschlägt, bekommt dazu eine eigene Adresse und kann sie
ansehen, bevor sie übernommen wird — auch vom Telefon, ohne etwas lokal zu
starten.

**Warum das wichtig ist**: Bisher braucht die Vorschau einen lokal gestarteten
Server. Das geht nur am Rechner, an dem entwickelt wird, und ist genau dann im
Weg, wenn die Darstellung auf einem echten Telefon beurteilt werden soll — bei
einer Anwendung, die überwiegend am Telefon benutzt wird, ist das die Regel und
nicht die Ausnahme.

**Unabhängiger Test**: Einen Änderungsvorschlag eröffnen und prüfen, ob dort
eine Adresse steht, unter der der geänderte Stand erreichbar ist.

**Abnahmekriterien**:

1. **Angenommen** ein Änderungsvorschlag ist eröffnet, **dann** ist dort eine
   Vorschau-Adresse vermerkt.
2. **Angenommen** die Vorschau wird geöffnet, **dann** zeigt sie den Stand des
   Vorschlags und nicht den der Hauptseite.
3. **Angenommen** der Vorschlag wird nachgebessert, **dann** zeigt die Vorschau
   danach den nachgebesserten Stand.

---

### User Story 3 - Nichts Ungeprüftes geht live (Priority: P1)

Eine Änderung, deren Prüfungen fehlschlagen, erscheint nicht auf der
öffentlichen Seite.

**Warum das wichtig ist**: Bucky rechnet Startstrecken und Kraftstoffbedarf.
Die 541 Prüfungen und der Klickpfad sind die einzige Absicherung dagegen, dass
ein Rechenfehler unbemerkt live geht. Eine Veröffentlichung, die an dieser
Absicherung vorbeiläuft, macht sie wertlos.

**Unabhängiger Test**: Auf einem Zweig eine Prüfung absichtlich brechen und
feststellen, dass die öffentliche Seite unverändert bleibt.

**Abnahmekriterien**:

1. **Angenommen** eine Prüfung schlägt fehl, **dann** bleibt die öffentliche
   Seite auf dem letzten geprüften Stand.
2. **Angenommen** die Veröffentlichung selbst scheitert, **dann** bleibt der
   vorherige Stand erreichbar; es entsteht keine leere oder halbe Seite.

---

### Edge Cases

- **Umstellung der Adresse**: Zwischen dem alten und dem neuen Ziel entsteht
  zwangsläufig eine kurze Lücke. Sie ist klein zu halten und anzukündigen; ein
  lückenloser Wechsel wäre nur über einen zweiten Namen zu haben und steht in
  keinem Verhältnis zu wenigen Minuten bei einer Vereinsanwendung.
- **Zwischengespeicherte alte Dateien**: Browser und Zwischenspeicher der
  Auslieferung können nach der Umstellung noch alte Teile vorhalten. Eine
  Mischung aus alten und neuen Programmteilen darf nicht zu einer scheinbar
  funktionierenden, aber falsch rechnenden Seite führen.
- **Gespeicherte Einstellungen**: Die im Browser gesicherten Werte aus Feature
  041 hängen an der Adresse. Bleibt die Adresse gleich, bleiben sie erhalten —
  das ist zu prüfen und nicht anzunehmen.
- **Die alte Auslieferung**: Solange der alte Ort noch antwortet, gibt es zwei
  Stände derselben Anwendung. Das ist ein Zustand mit Verfallsdatum, kein
  Dauerzustand.
- **Rückweg**: Wenn sich der neue Ort als untauglich erweist, muss der Weg
  zurück beschrieben und gangbar sein.
- **Zugangsdaten**: Für die Veröffentlichung ist ein Zugangsschlüssel nötig. Er
  darf nicht im Repository landen und nicht mehr dürfen, als er muss.

---

## Requirements *(mandatory)*

### Was gleich bleibt

- **FR-001**: Die öffentliche Adresse `bucky.edsh.de` MUSS unverändert
  bleiben. Der Umzug DARF von außen nicht an der Adresse ablesbar sein.
- **FR-002**: Alle bestehenden Unteradressen MÜSSEN weiterhin unmittelbar
  aufrufbar sein — auch beim direkten Aufruf und beim Neuladen, nicht nur über
  einen Klick von der Startseite.
- **FR-003**: Kein Rechenweg, kein Wertebereich, keine Rundung, keine
  Quellenangabe und kein Hinweistext ändert sich. Der Rechenkern wird nicht
  angefasst (Prinzip IV).
- **FR-004**: Die im Browser gesicherten Einstellungen aus Feature 041 MÜSSEN
  den Umzug überstehen.
- **FR-005**: Die Anwendung MUSS nach dem Umzug ohne serverseitiges Rechnen
  auskommen wie bisher. Dieses Feature verlagert nur den Ort der Auslieferung;
  es verschiebt keine Logik auf den Server.

### Veröffentlichung

- **FR-006**: Die öffentliche Seite DARF ausschließlich durch die
  Prüfstrecke veröffentlicht werden, und erst **nachdem** alle Prüfungen
  erfolgreich waren.
- **FR-007**: Es DARF keinen zweiten Weg geben, auf dem ein Stand ungeprüft
  öffentlich wird — insbesondere keinen, der am Prüflauf vorbei baut.
- **FR-008**: Der für die Veröffentlichung nötige Zugangsschlüssel MUSS
  außerhalb des Repositories liegen und auf das für die Veröffentlichung
  Notwendige beschränkt sein (Prinzip V).
- **FR-009**: Schlägt die Veröffentlichung fehl, MUSS der zuletzt
  veröffentlichte Stand unverändert erreichbar bleiben.
- **FR-010**: Der Weg zurück auf einen früheren Stand MUSS ohne neuen Bau
  möglich und in der Dokumentation beschrieben sein.

### Vorschau

- **FR-011**: Zu jedem Änderungsvorschlag MUSS eine eigene, von außen
  erreichbare Vorschau-Adresse entstehen.
- **FR-012**: Die Vorschau-Adresse MUSS im Änderungsvorschlag selbst vermerkt
  werden, damit sie ohne Suchen auffindbar ist.
- **FR-013**: Die Vorschau MUSS den Stand des Vorschlags zeigen und den
  öffentlichen Stand dabei nicht verändern.
- **FR-014**: Eine Vorschau DARF nicht als öffentliche Seite missverstanden
  werden können; sie MUSS an ihrer Adresse als Vorschau erkennbar sein.

### Umstellung

- **FR-015**: Vor der Umstellung der Adresse MUSS der neue Ort unter einer
  eigenen Adresse vollständig prüfbar sein.
- **FR-016**: Die Umstellung DARF die Seite nur für wenige Minuten unerreichbar
  machen. Diese Lücke ist unvermeidbar — der neue Ort nimmt die Adresse erst an,
  wenn der Verweis auf den alten entfernt ist —, sie MUSS aber angekündigt und
  in eine Zeit gelegt werden, zu der nicht geflogen wird.
- **FR-017**: Nach erfolgreicher Umstellung MUSS die alte Auslieferung
  abgeschaltet werden, damit kein zweiter, veraltender Stand derselben
  Anwendung erreichbar bleibt.
- **FR-018**: Die Prüfstrecke, die Dokumentation und die Anweisungen für
  Werkzeuge MÜSSEN nach dem Umzug den neuen Ort beschreiben und keine
  Anleitungen für den alten mehr enthalten.

---

## Success Criteria *(mandatory)*

- **SC-001**: Für einen festgelegten Satz Eingaben stimmen alle angezeigten
  Werte vor und nach dem Umzug **vollständig** überein — kein einziger Wert
  weicht ab.
- **SC-002**: Alle bestehenden Prüfungen laufen nach dem Umzug unverändert
  durch: die 541 Prüfungen des Rechenkerns und die 97 Prüfungen des Klickpfads.
- **SC-003**: Jede öffentlich erreichbare Adresse der Anwendung antwortet nach
  dem Umzug beim unmittelbaren Aufruf mit der erwarteten Seite.
- **SC-004**: Ein Änderungsvorschlag führt ohne weiteres Zutun zu einer
  Vorschau-Adresse, die von einem Telefon aus aufrufbar ist.
- **SC-005**: Ein Stand mit fehlgeschlagener Prüfung erscheint nicht auf der
  öffentlichen Seite — nachgewiesen an einem absichtlich gebrochenen Zweig.
- **SC-006**: Der Rückweg auf den vorherigen Stand ist in weniger als fünf
  Minuten begehbar, ohne dass etwas neu gebaut werden muss.

---

## Assumptions

- **Die Domain liegt bereits bei Cloudflare.** `edsh.de` wird von
  `abby`/`albert.ns.cloudflare.com` bedient; die Umstellung ist ein Eintrag,
  kein Domainumzug.
- **Der kostenlose Tarif reicht.** Für einen Verein dieser Größe liegt die
  Zahl der Aufrufe weit unter den Grenzen des freien Tarifs.
- **Die Anwendung bleibt vorerst rein clientseitig.** Der serverseitige Teil
  entsteht erst mit der Reservierung; dieses Feature schafft nur die
  Möglichkeit dazu.
- **Die ausgelieferten Seiten verweisen relativ aufeinander**, tragen also
  keinen fest eingebauten Pfad mit sich. Das prüft die Abnahme mit, statt es
  vorauszusetzen.
- **Ein Zugangsschlüssel wird von Hand angelegt** und hinterlegt; das ist ein
  einmaliger Schritt außerhalb des Repositories.

---

## Außerhalb des Rahmens

Dieses Feature ist ein Umzug und **nichts weiter**. Ausdrücklich nicht dabei:

- die Reservierung und jeder Zugriff auf Vereinsflieger,
- der Zwischenspeicher und alles, was darin liegen soll,
- der Zugangsschutz für Vereinsmitglieder,
- jede Änderung an Aussehen, Bedienung oder Rechenweg des POH-Rechners.

Die Reservierung wurde beim Zuschnitt außerdem auf **anonyme Anzeige**
festgelegt: keine Klarnamen, damit vorerst gar kein Zugangsschutz nötig ist.
Das betrifft das Folgefeature, nicht dieses.
