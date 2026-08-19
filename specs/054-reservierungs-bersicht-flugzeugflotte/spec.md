# Feature Specification: Reservierungsübersicht Flugzeugflotte

**Feature Branch**: `054-reservierungs-bersicht-flugzeugflotte`

**Created**: 2026-08-14

**Status**: Draft

**Input**: GitHub-Issue #54 — Design-Handoff (High-Fidelity-Prototyp + README)
unter `docs/design_handoff_reservierung/`. Mobile Web-Ansicht, die
Vereinsmitgliedern auf einen Blick zeigt, welche Vereinsmaschine jetzt
verfügbar ist und wann sie belegt ist — als Erweiterung der bisherigen
Einzelmaschinen-Anzeige (Feature 047/052, nur D-EELK) auf die gesamte Flotte.

## Clarifications

Aus dem Design bereits entschieden (nicht erneut zu klären):

- Buchen findet **nicht** in dieser Anwendung statt; die Reservierungsabsicht
  wird zu Vereinsflieger verlinkt, das vorgeschlagene Zeitfenster dabei genannt
  und zusätzlich in die dortige Maske vorbelegt (E-13, Stand 2026-08-19).
- Ringdarstellung ist die **Tagesuhr** (24-h-Ring), nicht Vollring oder
  Punkt-Abzeichen — diese sind Entwurfsalternativen und nicht umzusetzen.
- Es gibt **keinen** eigenen Zustand „bald belegt" — nur einen stufenlosen
  Farbverlauf in der letzten Stunde vor einer Belegung.
- Namen anderer Mitglieder werden nicht angezeigt („Reserviert"). *(Der
  Zusatz „nur eigene Reservierungen werden als solche benannt" ist mit der
  Clarification vom 2026-08-18 entfallen — siehe unten.)*

Vor dieser Spezifikation geklärt (Rückfragen dieser Runde):

- **Datenzugriff für die gesamte Flotte**: Sowohl der Kalender-Abo-Link
  (Feature 052) als auch die Vereinsflieger-API (Feature 047) liefern bereits
  **alle** Flugzeuge des Vereins, nicht nur die D-EELK — das wurde bisher nur
  nie ausgewertet, weil die Anzeige auf eine Maschine gefiltert war. Es wird
  **keine neue Datenquelle** gebraucht: Der bestehende Kern
  (`kalenderDeuten`/`antwortDeuten`) deutet die Flotte bereits vollständig; nur
  die serverseitige Filterung auf `kennung === 'D-EELK'` entfällt.
- **Aktualität und Rückfall**: Es gilt dasselbe zweistufige Muster wie in
  Feature 052 — Kalender-Abo zuerst (Sekunden-Aktualität), Rückfall auf den
  KV-Namensraum des Abruf-Workers (bis zu 30 Minuten alt), erweitert von einer
  auf alle Maschinen.
- **Favoriten**: Werden **ausschließlich im Browser** verwaltet (`localStorage`
  auf demselben Gerät, analog zu den gespeicherten Reglerwerten des
  POH-Rechners) — keine Vereinskonfiguration, keine Nutzungshistorie, kein
  Server-Zustand. Ein frisches Gerät zeigt **keine** Favoritenreihe; sie
  erscheint automatisch, sobald zum ersten Mal ein Favorit gesetzt wird.
- **Sonnenauf-/untergang**: Wird von einem Online-Wetterdienst bezogen, wie der
  bestehende Convenience-Abruf für QNH/Wind im POH-Rechner (`openMeteo.ts`) —
  nicht fest im Code hinterlegt und nicht selbst astronomisch berechnet.
- **POH-Link pro Maschine**: Ausschließlich die D-EELK erhält einen echten Link
  (auf den bestehenden POH-Rechner, Feature-025-Reihe). Alle anderen Maschinen
  der Flotte zeigen vorerst **keinen** POH-Link — sie sind in Bucky (noch)
  nicht digitalisiert.

Während der Planung geklärt (2026-08-18, siehe `research.md`):

- **Eigene Reservierungen werden zurückgestellt** (E-11): Bucky kennt keine
  Anmeldung und keine Nutzeridentität, und FR-023 verlangt, personenbezogene
  Angaben so früh wie möglich zu verwerfen — die Frage „ist das meine
  Buchung?" ist damit technisch nicht entscheidbar. In diesem Feature erscheint
  **jeder** Eintrag als „Reserviert"; die Kennzeichnung „Deine Reservierung"
  und der Farbstreifen `#1f4e79` entfallen. FR-009 wird insoweit nicht
  erfüllt, US2-Szenario 3 entfällt, und die Kennzeichnung wird als eigenes
  späteres Feature geführt.
- **Die Flotte braucht eine schmale Stammliste von Kennzeichen** (E-01): Die
  Annahme unten unter „Assumptions", die Flotte lasse sich vollständig aus den
  Datenquellen ableiten, trägt nicht — beide Quellen kennen ein Flugzeug nur
  über seine Buchungen, eine ungebuchte Maschine verschwände also genau dann,
  wenn sie frei ist. Die angezeigte Flotte ist deshalb die Vereinigung aus
  einer gepflegten Kennzeichenliste und dem, was in den Daten steht. Die
  Kategorie wird weiterhin nicht gepflegt, sondern aus dem Kennzeichen
  abgeleitet (E-02).
- **Ringgeometrie fix, Ringfarbe echt** (E-15): Der Design-Handoff ließ die
  Stauchungsgrenze und die Hell/Dunkel-Grenze auf derselben Kante liegen
  (21:00/06:00). Das stimmte nur im August, in dem der Prototyp entstand; im
  Dezember hätte der Ring über fünf Stunden Tageslicht behauptet, die es nicht
  gibt. FR-004 trennt beides nun: Die Zeitskala bleibt fix und damit über die
  Jahreszeiten lernbar, die Einfärbung folgt den echten Sonnenzeiten. Die
  Sonnenmarker bleiben — sie benennen jetzt eine echte Farbkante.
- **Vorbelegtes Zeitfenster an Vereinsflieger** (E-13, Stand 2026-08-19):
  Die Klärung vom 2026-08-18 hatte die Vorbelegung gestrichen, weil keine
  Parameterform bekannt war. Inzwischen ist eine beobachtet
  (`frm_apid`, `frm_datefrom`, `frm_dateto`, `frm_datefromtime`), und FR-011
  verlangt die Übertragung wieder. Dokumentiert ist sie damit nicht — der
  Vorschlag bleibt deshalb im Sheet sichtbar, damit ein wirkungsloser
  Parameter das Mitglied nicht vor ein leeres Formular stellt, das es für
  gefüllt hält. Die `frm_apid` ist bisher nur für die D-EELK bekannt.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Auf einen Blick sehen, was jetzt fliegbar ist (Priority: P1)

Ein Vereinsmitglied öffnet die Seite auf dem Handy und will in unter fünf
Sekunden wissen, ob es jetzt oder heute noch fliegen kann und mit welcher
Maschine. Es sieht die gesamte Flotte als Kreise mit Tagesuhr-Ring, erkennt an
Farbe, Punkt und Kurztext den Zustand jeder Maschine, ohne eine einzelne
Maschine öffnen zu müssen.

**Why this priority**: Das ist der Mehrwert gegenüber Feature 052 — eine
Übersicht statt einer Einzelauskunft. Ohne diesen Screen bräuchte ein Mitglied
weiterhin so viele Aufrufe wie Flugzeuge, um die Flotte zu überblicken.

**Independent Test**: Die Übersichtsseite ohne vorherige Konfiguration öffnen
und prüfen, ob jede Maschine der Flotte mit korrektem Status (frei / heute noch
frei / belegt / gesperrt), Farbe, Ring und Kurztext erscheint — geprüft gegen
den tatsächlichen Reservierungsstand aus Vereinsflieger zum Ladezeitpunkt.

**Acceptance Scenarios**:

1. **Given** eine Maschine ist aktuell nicht reserviert und heute kommt keine
   Reservierung mehr, **When** das Mitglied die Übersicht öffnet, **Then**
   zeigt die Kachel grünen Status und den Kurztext „frei den ganzen Tag".
2. **Given** eine Maschine ist frei, die nächste Reservierung beginnt in 25
   Minuten, **When** die Übersicht geladen wird, **Then** ist die Statusfarbe
   sichtbar in Richtung Rot verschoben (linear über die letzte Stunde) und der
   Text nennt die Uhrzeit, bis wann frei ist, plus die Dauer der folgenden
   Belegung.
3. **Given** eine Maschine ist gerade reserviert und direkt danach folgt
   lückenlos eine weitere Reservierung, **When** der Status berechnet wird,
   **Then** nennt „Belegt bis …" das Ende der **letzten** lückenlos
   anschließenden Reservierung.
4. **Given** eine Maschine ist mehrtägig gesperrt, **When** sie angezeigt wird,
   **Then** trägt die Avatarfläche das Absperrband, der Statustext nennt ein
   **Datum** (nicht eine Uhrzeit), und der Ring zeigt weiterhin das
   Tagesmuster.
5. **Given** eine Maschine hat kein hinterlegtes Bild, **When** ihr Avatar
   gerendert wird, **Then** erscheint ihr Kurzkennzeichen als lesbarer Text im
   Kreis statt eines fehlenden Bildes.
6. **Given** es ist ein beliebiger Zeitpunkt, **When** der Ring gerendert wird,
   **Then** sitzt der Jetzt-Strich auf der zu dieser Uhrzeit gehörenden
   Ringposition, und die Sonnenmarker sitzen auf den tatsächlichen
   Sonnenzeiten des Tages — dort, wo der Ring von hell auf dunkel wechselt.
7. **Given** eine Maschine hat keine einzige Reservierung im sichtbaren
   Zeitraum, **When** der Ring gerendert wird, **Then** ist er durchgehend im
   Frei-Farbton (tags) bzw. Nachtfarbton (nachts) ohne Belegungssegmente.

---

### User Story 2 - Die Belegung einer Maschine über mehrere Tage verstehen (Priority: P1)

Ein Mitglied tippt auf eine Maschine aus der Übersicht, um zu prüfen, wann in
den nächsten Tagen eine Lücke frei ist — etwa um einen Flug für morgen zu
planen.

**Why this priority**: Ohne Detailtiefe bliebe die Übersicht ein Schnappschuss
des Augenblicks; die Planung über den aktuellen Tag hinaus ist der zweite
Kernzweck der Anzeige (7-Tage-Liste, Wochenraster, Liste der kommenden
Belegungen).

**Independent Test**: Eine Maschine mit bekannten künftigen Reservierungen
öffnen und prüfen, ob die 7-Tage-Liste, das Wochenraster und die Liste der
kommenden Belegungen exakt mit dem hinterlegten Reservierungsstand
übereinstimmen.

**Acceptance Scenarios**:

1. **Given** das Mitglied tippt auf eine Maschine, **When** die Detailansicht
   öffnet, **Then** zeigt sie Statussatz, Tagesbalken mit Stundenachse,
   7-Tage-Liste und ein umschaltbares Wochenraster für dieselbe Maschine.
2. **Given** in den nächsten sieben Tagen existiert keine Belegung, **When**
   die Detailansicht rendert, **Then** erscheint ein Leertext statt einer
   leeren Liste.
3. **Given** eine Reservierung liegt in den nächsten sieben Tagen, **When** sie
   in der Liste der kommenden Belegungen erscheint, **Then** zeigt sie
   ausschließlich „Reserviert" ohne Namen — für eigene wie fremde Einträge
   gleichermaßen (Clarification vom 2026-08-18).
4. **Given** eine Reservierung reicht über Mitternacht hinweg, **When** der
   Tagesbalken gerendert wird, **Then** wird sie pro Tag geschnitten
   dargestellt.
5. **Given** ein Eintrag umfasst einen vollen Tag (00:00–24:00), **When** er in
   der Liste der kommenden Belegungen erscheint, **Then** wird er als
   ganztägig mit der Dauer „24 h" ausgewiesen.

---

### User Story 3 - Die eigenen Maschinen zuerst sehen (Priority: P2)

Ein Mitglied fliegt regelmäßig dieselben ein bis zwei Maschinen und will sie
nicht jedes Mal in der vollständigen Flottenliste suchen.

**Why this priority**: Komfortfunktion, die die Übersicht schneller nutzbar
macht, aber die Grundfunktion (Status jeder Maschine sehen) nicht voraussetzt.
Eine funktionierende Übersicht ohne Favoriten ist bereits ein nutzbares
Produkt.

**Independent Test**: Auf einem Gerät ohne vorherige Nutzung die Übersicht
öffnen (keine Favoritenreihe sichtbar), eine Maschine als Favorit markieren,
neu laden und prüfen, dass sie oben in der Favoritenreihe und nicht mehr
zusätzlich in ihrer Kategoriegruppe erscheint. Auf einem zweiten Gerät bleibt
die Auswahl unbeeinflusst.

**Acceptance Scenarios**:

1. **Given** ein Gerät hat noch nie einen Favoriten gesetzt, **When** die
   Übersicht öffnet, **Then** erscheint keine Favoritenreihe.
2. **Given** ein Mitglied markiert eine Maschine als Favorit, **When** die
   Übersicht neu lädt, **Then** erscheint die Favoritenreihe mit genau dieser
   Maschine, und die Maschine erscheint **nicht** zusätzlich in ihrer
   Kategoriegruppe.
3. **Given** ein Favorit ist gesetzt, **When** dasselbe Mitglied die Seite auf
   einem anderen Gerät oder Browser öffnet, **Then** ist dort keine
   Favoritenmarkierung vorhanden (die Auswahl ist geräte-/browserlokal).

---

### User Story 4 - Aus der Anzeige heraus reservieren wollen (Priority: P3)

Ein Mitglied sieht in der Detailansicht, dass eine Maschine frei ist, und will
direkt eine Reservierung anstoßen, ohne das Zeitfenster in Vereinsflieger von
Hand suchen zu müssen.

**Why this priority**: Komfortfunktion am Ende des Wegs; der eigentliche
Zweck der Anzeige (Status verstehen) ist bereits ohne sie erfüllt. Das
tatsächliche Buchen bleibt ohnehin außerhalb dieser Anwendung.

**Independent Test**: In der Detailansicht einer freien Maschine
„Reservieren" antippen und prüfen, ob das vorgeschlagene Zeitfenster der
nächsten freien Lücke entspricht (auf 30 Minuten aufgerundet, 2 Stunden Dauer)
und der Link nach Vereinsflieger in einem neuen Tab öffnet, ohne dass diese
Anwendung selbst etwas bucht.

**Acceptance Scenarios**:

1. **Given** das Mitglied ist in der Detailansicht einer freien Maschine,
   **When** es „Reservieren" tippt, **Then** öffnet ein Sheet mit einem
   Vorschlag „Von/Bis" aus der nächsten freien Lücke (auf 30 Minuten
   aufgerundet, 2 Stunden Dauer) und einem Link nach Vereinsflieger, der in
   einem neuen Tab öffnet.
2. **Given** das Sheet ist offen, **When** das Mitglied auf den abgedunkelten
   Hintergrund tippt, **Then** schließt das Sheet, ohne dass ein Aufruf nach
   Vereinsflieger stattgefunden hat.

---

### Edge Cases

- Reservierung über Mitternacht hinweg: Segmente werden pro Tag geschnitten;
  Tagesbalken zeigen nur das Fenster 06:00–22:00.
- Ganztagseintrag (00:00–24:00): in „Kommende Belegungen" als „{Tag} ·
  ganztägig" mit Dauer „24 h".
- Überlappende Einträge: Eine Sperre gewinnt farblich über eine Reservierung.
- Maschine ohne jede Reservierung: Ring komplett im Frei-Farbton (Tag) bzw.
  Nachtfarbton (Nacht).
- Datenabruf fehlgeschlagen (Kalender und Rückfall gleichermaßen ohne
  Ergebnis): Verfügbarkeit darf **nicht** geraten werden — der Stand-Text muss
  das Alter der Daten kenntlich machen bzw. offen sagen, dass keine Auskunft
  vorliegt (bekräftigt FR-010 aus Feature 047 und FR-008/FR-019 aus
  Feature 052, jetzt für die gesamte Flotte statt nur D-EELK).
- Sommer-/Winterzeit und lange Sommernächte verschieben die Sonnenzeiten: Die
  **Zeitskala** des Rings bleibt fix (21:00–06:00 gestaucht), die
  **Einfärbung** wandert mit. Im Juni liegt die Farbgrenze innerhalb der
  gestauchten Zone, im Dezember innerhalb der gedehnten.
- Tageswechsel während geöffneter Seite: Anzeige muss nachziehen (mindestens
  minütliche Aktualisierung von Jetzt-Marker, Statusfarbe und Statussatz).
- Sonnenzeiten-Abruf schlägt fehl: Ring zeigt weiterhin Tag-/Nacht-Segmente
  und den Jetzt-Marker; fehlen nur die Sonnenmarker, bleibt der übrige Ring
  unverändert korrekt.
- Eine Maschine ohne Favoritenmarkierung, die bereits die einzige ihrer
  Kategorie ist: Kategoriegruppe zeigt weiterhin ihren Kopf mit Zähler „1",
  auch wenn nur eine Maschine folgt.

## Requirements *(mandatory)*

### Functional Requirements

#### Flotte & Zustand

- **FR-001**: Das System MUSS die gesamte Flotte des Vereins mit Kennzeichen,
  Typ und Kategorie (Motorflugzeuge & UL, Segelflugzeuge) anzeigen, nicht nur
  eine einzelne Maschine.
- **FR-002**: Das System MUSS pro Maschine den aktuellen Zustand als genau
  einen von vier Werten bestimmen: frei, heute noch frei, belegt, gesperrt.
- **FR-003**: Das System MUSS lückenlos aneinandergrenzende Reservierungen
  derselben Maschine als einen zusammenhängenden Belegungsblock behandeln.
- **FR-004**: Das System MUSS für jede Maschine den Tagesverlauf 00–24 h als
  Ring darstellen. Die **Zeitskala** ist fix und über alle Jahreszeiten
  unverändert (21:00–06:00 gestaucht, 06:00–21:00 gedehnt), damit dieselbe
  Uhrzeit stets an derselben Stelle liegt. Die **Einfärbung** hell/dunkel
  folgt dagegen den tatsächlichen Sonnenzeiten des Tages. Dazu Marker für
  Sonnenaufgang, Sonnenuntergang und „jetzt".
- **FR-005**: Das System MUSS den Zustand zusätzlich als Punkt-Abzeichen und
  als Kurztext in Klartext-Deutsch anzeigen (Zustand nie ausschließlich über
  Farbe).
- **FR-006**: Das System MUSS die Dringlichkeit vor der nächsten Belegung als
  stufenlosen Farbverlauf über die letzte Stunde darstellen, ohne einen
  eigenen vierten Statuswert dafür einzuführen.
- **FR-014**: Das System MUSS gesperrte Maschinen visuell eindeutig als nicht
  buchbar markieren (Absperrband auf der Avatarfläche) und ihren Zeitraum als
  Datum statt als Uhrzeit ausgeben.
- **FR-020**: Das System MUSS ohne hinterlegtes Maschinenbild ein lesbares
  Kurzkennzeichen als Ersatzdarstellung zeigen.

#### Favoriten

- **FR-007**: Das System MUSS als Favorit markierte Maschinen hervorgehoben
  und ausschließlich am Seitenanfang anzeigen, nicht zusätzlich in ihrer
  Kategoriegruppe.
- **FR-007a**: Die Favoritenauswahl MUSS ausschließlich lokal auf dem
  jeweiligen Gerät/Browser gespeichert werden; es MUSS keinen geräteübergreifenden
  oder serverseitigen Favoritenzustand geben.
- **FR-007b**: Ohne zuvor gesetzte Favoriten DARF keine (auch keine leere)
  Favoritenreihe erscheinen.

#### Detailansicht

- **FR-008**: Das System MUSS eine Detailansicht pro Maschine bieten mit
  Statussatz, Tagesbalken inklusive Stundenachse, 7-Tage-Liste und
  Wochenraster (umschaltbar).
- **FR-009**: Das System MUSS die nächsten bis zu sechs Belegungen mit
  Zeitraum, Art und Dauer auflisten. Die Kennzeichnung eigener Reservierungen
  ist zurückgestellt (Clarification vom 2026-08-18, `research.md` E-11) — sie
  setzt eine Nutzeridentität voraus, die es in Bucky nicht gibt.
- **FR-010**: Das System MUSS Namen von Mitgliedern verbergen und **jeden**
  fremden wie eigenen Eintrag ausschließlich als „Reserviert" ausgeben
  (bekräftigt FR-006 aus Feature 047 / FR-013 aus Feature 052).
- **FR-018**: Das System MUSS pro Maschine, für die ein POH-Rechner in Bucky
  existiert, einen Link darauf anzeigen. Maschinen ohne digitalisiertes POH
  zeigen keinen POH-Link.

#### Reservieren-Absicht

- **FR-011**: Das System MUSS die nächste freie Lücke als Reservierungs­vorschlag
  anzeigen (auf 30 Minuten aufgerundet, 2 Stunden Dauer) und von dort auf den
  Reservierungskalender in Vereinsflieger führen. Das Zeitfenster MUSS dem
  Mitglied **genannt** und zusätzlich als Vorbelegung an die dortige Maske
  übergeben werden (E-13). Bucky bucht nicht: Es füllt ein fremdes Formular
  vor, sendet es aber nie ab. Bleibt die Vorbelegung wirkungslos, MUSS der
  genannte Vorschlag allein ausreichen, um von Hand einzutragen.

#### Darstellung & Zeit

- **FR-012**: Das System MUSS an mindestens zwei Stellen darauf hinweisen,
  dass die Anzeige unverbindlich ist und der Reservierungskalender in
  Vereinsflieger verbindlich bleibt.
- **FR-013**: Das System MUSS Hell- und Dunkeldarstellung unterstützen,
  umschaltbar in Übersicht und Detailansicht.
- **FR-015**: Das System MUSS Zeitangaben nach Nähe formatieren: heute nur
  Uhrzeit, später mit Wochentag und Datum, Sperren mit vollem Datum.
- **FR-016**: Das System MUSS die Zeitanzeige (Jetzt-Marker, Statusfarbe,
  Statussatz) mindestens minütlich aktualisieren, ohne dass die Seite neu
  geladen werden muss.
- **FR-017**: Das System MUSS auf Mobilgeräten primär bedienbar sein
  (einspaltig bis 430 px, Tap-Ziele mit mindestens 44 px Höhe).
- **FR-019**: Das System MUSS den Datenstand ausweisen („Stand …") und dabei
  erkennbar machen, ob er aus einem unmittelbaren Kalender-Abruf oder aus dem
  Rückfall stammt (übernimmt FR-018/FR-019 aus Feature 052, jetzt für die
  gesamte Flotte).

#### Datenherkunft (aus Feature 047/052 übernommen, hier für die gesamte Flotte)

- **FR-021**: Das System MUSS für jede Maschine denselben zweistufigen
  Zugriff nutzen wie Feature 052 für die D-EELK: Kalender-Abo zuerst, Rückfall
  auf den KV-Namensraum des Abruf-Workers bei Fehlschlag. Es DARF dafür
  **keine neue Datenquelle** eingeführt werden — beide bestehenden Quellen
  liefern die gesamte Flotte bereits.
- **FR-022**: Liegt für keine der beiden Quellen ein brauchbarer Stand vor,
  MUSS die Anzeige das offen sagen und DARF für keine Maschine „frei"
  behaupten.
- **FR-023**: Personenbezogene Angaben aus den Quellen MÜSSEN wie bisher so
  früh wie möglich verworfen werden und DÜRFEN weder gespeichert noch für
  irgendeine Maschine ausgeliefert werden.

### Key Entities *(include if feature involves data)*

- **Maschine (Resource)**: Kennzeichen, optionaler Typ, Kategorie
  (Motorflugzeuge & UL / Segelflugzeuge), optionales Bild, optionaler
  POH-Link. Die Flotte ist die Vereinigung aus einer gepflegten
  Kennzeichenliste und den in den Datenquellen auftauchenden Kennzeichen
  (Clarification vom 2026-08-18, `research.md` E-01).
- **Reservierung**: Maschine, Startzeitpunkt, Endzeitpunkt, Art (Reservierung
  | Sperre) — unverändert aus Feature 047/052, jetzt für alle Maschinen statt
  nur D-EELK ausgewertet. Ohne Personenbezug und ohne Kennzeichnung „eigene"
  (Clarification vom 2026-08-18).
- **Tageskontext**: Datum, Sonnenaufgang, Sonnenuntergang. Die Sonnenzeiten
  bestimmen die Einfärbung des Rings, nicht seine Skala (FR-004); sie kommen
  von einem Online-Wetterdienst.
- **Zustand (abgeleitet)**: Statuswert, Wechselzeitpunkt, Statussatz,
  Statusfarbe, Ringsegmente, Balkensegmente — pro Maschine aus Reservierung und
  Tageskontext berechnet, nicht gespeichert.
- **Favorit**: Geräte-/browserlokale Markierung einer Maschine; keine
  serverseitige Entität.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Ein Mitglied kann den Zustand der gesamten Flotte (frei/heute
  noch frei/belegt/gesperrt) erfassen, ohne eine einzelne Maschine öffnen zu
  müssen.
- **SC-002**: Die Übersicht ist auf einer mobilen Verbindung innerhalb von 2
  Sekunden sinnvoll sichtbar.
- **SC-003**: In 100 % der Fälle, in denen weder Kalender-Abruf noch
  gespeicherter Rückfallstand für eine Maschine etwas liefern, zeigt die
  Anzeige das offen an, statt „frei" zu behaupten.
- **SC-004**: Nach dem erstmaligen Setzen eines Favoriten erscheint dieser bei
  jedem weiteren Aufruf auf demselben Gerät automatisch oben, ohne erneute
  Auswahl.
- **SC-005**: Zustandsinformation ist nie ausschließlich über Farbe erkennbar
  — Text und Position tragen sie in jedem Fall mit (für sehbehinderte oder
  farbenblinde Mitglieder).
- **SC-006**: Zu keinem Zeitpunkt sind Namen von Mitgliedern über die Anzeige
  oder die von ihr genutzte Auskunft abrufbar.

## Assumptions

- Die Flotte selbst ändert sich selten. Sie ergibt sich aus einer schmalen,
  gepflegten Liste von Luftfahrzeugkennzeichen, vereinigt mit den Kennzeichen,
  die in den Datenquellen auftauchen (Clarification vom 2026-08-18,
  `research.md` E-01). Die Kategorie (Motorflugzeuge & UL / Segelflug) wird
  nicht gepflegt, sondern aus dem Kennzeichen abgeleitet (E-02); die
  Typbezeichnung ist optional und rein beschriftend.
- Die Ring-Darstellung, Statuslogik und Zeitformate sind im Design-Handoff
  (`docs/design_handoff_reservierung/README.md`) pixelgenau spezifiziert und
  gelten als verbindliche visuelle Quelle für dieses Feature.
- Der bestehende Kern (`kennzeichen.ts`, `antwort-deuten.ts`,
  `kalender-deuten.ts`, `belegung.ts`, `formulieren.ts`) wird um Mehrfachmaschinen-
  Fähigkeit erweitert bzw. bereits vorhandene Fähigkeit dazu genutzt, nicht neu
  geschrieben (Verfassungsprinzip IV — ein Kern, mehrere Zugangswege).
- POH-Links existieren vorerst nur für die D-EELK; weitere POH-Digitalisierungen
  sind nicht Teil dieses Features.
- Sonnenauf-/untergang werden serverseitig über denselben Online-Wetterdienst
  bezogen, den der POH-Rechner bereits für QNH/Wind nutzt (Open-Meteo), für die
  Koordinaten des Heimatflugplatzes EDSH.
- Die Ringvarianten „Voller Ring" und „Punkt-Abzeichen" aus dem Prototyp sind
  Entwurfsalternativen und werden nicht umgesetzt.

## Out of Scope

- Buchen, Ändern oder Stornieren von Reservierungen in dieser Anwendung.
- Nutzerverwaltung, Rollen, Rechnungen, Flugbuch.
- Desktop-optimiertes Layout (einspaltig bis 430 px genügt).
- Push-Benachrichtigungen.
- Die Ringvarianten „Voller Ring" und „Punkt-Abzeichen".
- POH-Digitalisierung weiterer Maschinen als D-EELK.

## Dependencies

- Feature 047 („Reservierungsstand der D-EELK anzeigen") und Feature 052
  („Reservierungsstand in Echtzeit über das Kalender-Abo") sind Grundlage: der
  gemeinsame Kern, beide Datenquellen (Kalender-Abo und Vereinsflieger-API via
  Abruf-Worker) und das Rückfallmuster stammen von dort und werden auf die
  gesamte Flotte erweitert statt neu gebaut.
- Der bestehende Online-Wetterdienst-Zugriff (`$lib/weather/openMeteo.ts`) aus
  dem POH-Rechner für Sonnenauf-/untergang.
- Design-Handoff unter `docs/design_handoff_reservierung/` (README, HTML-
  Prototyp, Assets) als verbindliche visuelle Quelle.
