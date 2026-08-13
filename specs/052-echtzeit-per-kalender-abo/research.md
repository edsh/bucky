# Research: Reservierungsstand in Echtzeit über das Kalender-Abo

**Feature**: 052 | **Datum**: 2026-08-13

Alle Messwerte in diesem Dokument stammen aus eigenen Abrufen am 13.08.2026 und
sind nachvollziehbar wiederholbar — siehe [quickstart.md](./quickstart.md).

---

## E-01 — Taugt das Kalender-Abo überhaupt als Echtzeitquelle?

**Entscheidung**: Ja. Der Kalender wird bei **jedem Abruf frisch erzeugt**.

**Nachweis**: Das Feld `CREATED` jedes Eintrags trägt exakt den Zeitpunkt des
Abrufs, nicht den der Eintragung. Zwei Abrufe im Abstand von 23 Sekunden
lieferten `CREATED:20260813T115804Z` und `CREATED:20260813T115853Z`. Damit ist
belegt, dass die Gegenstelle nichts vorhält, sondern bei jeder Anfrage neu
erzeugt.

**Weitere Messwerte**:

| Größe | Wert |
|---|---|
| Antwortzeit | 0,18 – 0,24 s (drei Messungen) |
| Umfang | 20 771 Byte |
| Einträge | 59 |
| Zeitraum | 05.07.2026 – 12.09.2026, also rund fünf Wochen rückwärts, vier vorwärts |
| Kopfzeile | `content-type: text/calendar; charset=utf-8` |
| Zwischenspeicherung | `cache-control: no-cache, must-revalidate` |

**Gegenprobe gegen den bestehenden Weg**: Der Kalender wies für die D-EELK eine
Reservierung von 15:00 bis 18:00 Weltzeit aus. Die laufende Anzeige sagte zur
selben Zeit `wechselAm: 2026-08-13T15:00:00.000Z, wechselZu: belegt`. **Beide
Wege stimmen überein** — unabhängig voneinander gewonnen, gleiche Aussage.

**Verworfen**: Die Annahme, das Abo sei ein täglicher Abzug. Sie hätte das
ganze Feature entwertet und ließ sich in einer Minute widerlegen.

**Gegengezeichnet (T003, 13.08.2026)**: Zweiter, unabhängiger Abzug für den
Prüfstoff `tests/beispiele/kalender.ics` bestätigt den Befund erneut — 59
Einträge, davon 32 Reservierungen und **2 Sperren** für die D-EELK. Der
Prüfstoff für User Story 3 (Sperren sichtbar) ist damit tatsächlich vorhanden,
nicht nur vermutet.

---

## E-02 — Was der Kalender zusätzlich liefert: Sperren

**Entscheidung**: Sperren werden übernommen und lösen FR-007a aus Feature 047
endlich ein.

**Befund**: Die Beschriftung unterscheidet zwei Formen:

```text
SUMMARY:Reservierung D-EELK - (Nachname, Vorname)
SUMMARY:Grounding D-EELK - (Nachname, Vorname)
```

Im Abzug fanden sich fünf `Grounding`-Einträge, darunter für die D-EELK ein
Zeitraum mit der Erläuterung „Flieger in Wartung/ 200h-Kontrolle".

**Warum das zählt**: Feature 047 sichert in FR-007a bereits zu, eine Belegung
aus einer Sperre anders zu benennen als eine aus einer Reservierung. Diese
Zusicherung war bislang praktisch wirkungslos, weil auf dem bisherigen Weg keine
Sperren ankamen — `art` stand faktisch immer auf `reservierung`. Eine
Zusicherung, die nie zum Tragen kommt, ist eine unbelegte Behauptung. Der
Kalender macht sie prüfbar.

**Verteilung im Abzug**: 32 × D-EELK, 11 × D-EXYZ, je einzelne für D-3004,
D-MRXS, D-9021, D-4413, dazu 4 × GRILL, 3 × LANDEBAR, 1 × Werkstatt. Die
letzten drei sind auszusortieren — dieselbe Aufgabe wie in FR-003a von
Feature 047, nur an anderer Quelle.

---

## E-03 — Eigener Deuter oder fertige Bibliothek?

**Entscheidung**: Eigener Deuter im Kern, keine neue Abhängigkeit.

**Begründung**:

1. **Der benötigte Ausschnitt ist winzig.** Aus dem gesamten Kalenderstandard
   brauchen wir `BEGIN:VEVENT` … `END:VEVENT` sowie `DTSTART`, `DTEND` und
   `SUMMARY`. Alles Übrige — Wiederholungsregeln, Teilnehmer, Erinnerungen,
   Zeitzonendefinitionen — ist für diese Aufgabe ohne Belang.
2. **Die verbreiteten Bibliotheken sind für Node gebaut**, nicht für die
   Workers-Laufzeit, und bringen ein Vielfaches dessen mit, was wir nutzen.
3. **Der Bestand gibt die Richtung vor.** `antwort-deuten.ts` wertet die Antwort
   der Programmierschnittstelle ebenfalls von Hand aus, samt Prüfregeln und
   Zählung verworfener Einträge. Ein zweiter Deuter nach demselben Muster fügt
   sich ein; eine Bibliothek daneben wäre ein Stilbruch.
4. **Prüfbarkeit.** Ein eigener Deuter lässt sich Zeile für Zeile gegen den
   echten Abzug prüfen. Bei einer Bibliothek prüfte man deren Verhalten mit.

**Verworfen**: `ical.js`, `node-ical`, `ics`. Alle drei lösen ein weit größeres
Problem als unseres und brächten Lieferketten-Risiko für Code, den wir zu über
90 % nicht ausführen.

**Auflage**: Der eigene Deuter MUSS die Fallstricke des Formats trotzdem
beherrschen — siehe E-05. „Selbst gebaut" darf nicht „naiv" heißen.

---

## E-04 — Wie Zeiträume im Kern dargestellt werden *(die weitreichendste Entscheidung)*

**Entscheidung**: `Reservierung.beginn` und `.ende` werden künftig als **ISO
8601 mit Zeitversatz** geführt (`2026-08-13T17:00:00+02:00`) statt als
Ortszeit ohne Versatz (`2026-08-13 17:00:00`).

**Das Problem**: Der Kalender liefert Zeitpunkte in Weltzeit — also **exakt**.
Der Kern führt Zeiträume bislang als Ortszeit ohne Versatz und rechnet sie in
`belegung.ts` über `ortszeitZuZeitpunkt` in Zeitpunkte zurück. Diese Rückrechnung
ist an einer Stelle des Jahres **mehrdeutig**: In der doppelten Stunde der
Umstellung auf Winterzeit gibt es jede Ortszeit zweimal. `ortszeitZuZeitpunkt`
löst das durch eine bewusste Festlegung (die frühere Lesart) — richtig und gut
begründet, solange die Quelle nur Ortszeit hergibt.

Beim Kalender aber wüssten wir es genau. Ihn durch das versatzlose Format zu
schleusen hieße: **eine bekannte Tatsache wegwerfen und anschließend durch
Konvention neu erraten.** Einmal im Jahr wäre das Ergebnis um eine Stunde falsch.

**Warum die Entscheidung trotz geringer Eintrittswahrscheinlichkeit so fällt**:
Eine Reservierung, die nachts um halb drei am Umstellungswochenende beginnt, ist
bei einem Vereinsflugzeug nahezu ausgeschlossen. Der praktische Schaden ist
gering. Aber die Entscheidung ist **jetzt** billig und später teuer, und sie
gehört unvermeidlich zu diesem Feature: Der Kalender bringt Zeitpunkte mit, also
muss ohnehin festgelegt werden, wie sie im Kern abgelegt werden. Der Aufwand ist
damit nicht zusätzlich, sondern nur so oder so.

**Warum das Format *mit Versatz* und nicht ein zweites Feld**:

| Ansatz | Bewertung |
|---|---|
| **ISO mit Versatz** (gewählt) | Eine einzige Angabe, die zugleich exakter Zeitpunkt *und* lesbare Ortszeit ist. Keine zwei Felder, die auseinanderlaufen können |
| Zusätzliches Feld für den genauen Zeitpunkt | Zwei Quellen der Wahrheit in einem Satz. Genau der Fehler, vor dem Verfassungsprinzip IV warnt |
| Weltzeit ohne Ortsbezug | Verliert die Lesbarkeit; jede Fehlersuche im Speicher würde zur Kopfrechenaufgabe |
| Alles beim Alten lassen | Verwirft bekannte Genauigkeit. Wäre vertretbar, aber ohne Not |

**Auswirkung auf den Bestand**: `antwortDeuten` rechnet seine Ortszeitangaben
künftig einmalig beim Deuten um — über dasselbe `ortszeitZuZeitpunkt`, das heute
`belegung.ts` benutzt. Für den bestehenden Weg ändert sich also nichts an der
Auslegung, nur ihr Ort wandert von hinten nach vorn. Das ist ohnehin die
sauberere Anordnung: Mehrdeutigkeit wird an der Grenze aufgelöst, nicht bei
jeder Auswertung erneut.

**Übergang im Speicher**: Im KV liegen Stände im alten Format. Der Leser MUSS
beide verstehen: Trägt eine Angabe einen Versatz, gilt er; trägt sie keinen,
wird sie wie bisher über `ortszeitZuZeitpunkt` gedeutet. Damit ist keine
Umstellung nötig und kein Zeitfenster, in dem die Anzeige stolpert. Der Cron
überschreibt den Stand ohnehin binnen einer halben Stunde.

---

## E-05 — Fallstricke des Kalenderformats

**Entscheidung**: Vier Eigenheiten werden ausdrücklich behandelt, auch wo die
Gegenstelle sie derzeit nicht auslöst.

### 1. Umbrochene Zeilen *(derzeit nicht ausgelöst — trotzdem behandeln)*

Der Kalenderstandard schreibt vor, Zeilen über 75 Zeichen umzubrechen und mit
einem Leerzeichen fortzusetzen. **Die Gegenstelle tut das nicht**: Der Abzug
enthält null umbrochene Zeilen, aber zwei Zeilen über 74 Zeichen — sie
verstoßen also gegen den Standard.

Das ist eine Falle mit Zeitzünder. Holt die Gegenstelle den Umbruch eines Tages
nach, bräche ein naiver Deuter **still**: Aus `SUMMARY:Reservierung D-EE` +
Fortsetzung `LK - (…)` würde eine unbekannte Kennung, der Eintrag fiele
lautlos weg, und das Flugzeug erschiene fälschlich als frei. Genau die Richtung
des Fehlers, die schadet.

Deshalb: Zusammenfügen umbrochener Zeilen **vor** jeder Auswertung, verlangt in
FR-015.

### 2. Maskierte Sonderzeichen

Im Textfeld stehen Komma, Semikolon, Backslash und Zeilenumbruch maskiert
(`\,`, `\;`, `\\`, `\n`). Betrifft vor allem `DESCRIPTION`, die wir nicht
übernehmen — aber `SUMMARY` kann ebenso betroffen sein, sobald ein Kennzeichen
oder Name ein Komma enthält. Die Maskierung wird aufgelöst.

### 3. Datum ohne Uhrzeit

Ganztägige Einträge tragen `DTSTART;VALUE=DATE:20260813` statt eines
Zeitstempels. Im Abzug kam das nicht vor, ist aber jederzeit möglich, sobald
jemand eine ganztägige Sperre einträgt. Behandlung: als Ortstag von 00:00 bis
24:00 — nicht als Weltzeit-Mitternacht, sonst verschöbe sich der Tag um zwei
Stunden.

### 4. Zeitzonenangabe statt Weltzeit

`DTSTART;TZID=Europe/Berlin:20260813T170000` ist zulässig. Derzeit liefert die
Gegenstelle durchweg Weltzeit (`Z`). Behandlung: Bei `Z` exakt übernehmen; bei
Angabe ohne `Z` als Ortszeit deuten, also über den bestehenden, bereits
erprobten Weg. Eine fremde, von der Platzzone abweichende Zeitzone wird **nicht**
unterstützt — ein solcher Eintrag wird verworfen und gezählt, statt geraten zu
werden.

---

## E-06 — Wo der Abruf stattfindet und wie das Geheimnis geschützt wird

**Entscheidung**: Serverseitig in `apps/web/src/lib/server/kalender-holen.ts`,
die Adresse als Worker-Geheimnis `KALENDER_ABO_URL`.

**Warum die Adresse ein Geheimnis ist — und ein besonders unangenehmes**: Sie
wirkt wie ein Schlüssel, steckt aber im Pfad einer Adresse. Damit landet sie
überall dort, wo Adressen üblicherweise mitgeschrieben werden: in
Server-Protokollen, Verläufen, Weiterleitungsangaben, Zwischenstationen. Sie
lässt sich nicht wechseln, ohne alle bestehenden Abos zu brechen. Und sie gibt
**Mitgliedsnamen** preis — personenbezogene Daten.

**Schutz, mehrfach abgesichert**:

1. Ablage als Worker-Geheimnis, nie in der Quellcodeverwaltung (FR-003).
2. Datei unter `lib/server/`. SvelteKit weigert sich, so benannte Dateien in das
   Browserbündel aufzunehmen — der Schutz greift damit **beim Bauen**, nicht
   erst durch Sorgfalt.
3. Fehlermeldungen dürfen die Adresse nicht enthalten. Beim Fehlschlag wird nur
   die Art des Fehlschlags festgehalten, nie die angefragte Adresse.
4. Die Namen aus dem Kalender werden im Deuter verworfen, bevor irgendetwas den
   Kern verlässt (FR-013). Der bestehende Typ `Reservierung` hat dafür schon
   heute **kein Feld** — was es nicht gibt, kann nicht durchrutschen.

**Verworfen**: Abruf aus dem Browser. Er wäre einfacher und käme ohne
Server-Route aus — würde die Adresse aber jedem Besucher offenlegen. Nicht
diskutabel.

**Verworfen**: Ablage in einer Konfigurationsdatei mit Ausnahme in
`.gitignore`. Ein Versehen genügt, und das Geheimnis ist dauerhaft in der
Versionsgeschichte.

---

## E-07 — Wartezeit bis zum Abbruch

**Entscheidung**: 2 Sekunden.

**Begründung**: Gemessen wurden 0,18 – 0,24 s. Zwei Sekunden lassen also rund
das Zehnfache Luft für einen schlechten Tag und bleiben zugleich unter der
Schwelle, ab der eine Seite als hakelig empfunden wird. Wird sie überschritten,
ist der Rückfall ohnehin die bessere Antwort: ein halbstündlich gepflegter Stand
ist allemal besser als eine Seite, die lädt.

**Verworfen**: Kein Abbruch. Ein hängender Abruf würde die Anzeige mit in den
Stillstand ziehen — der Rückfall aus User Story 2 liefe ins Leere, obwohl er
bereitläge.

**Verworfen**: 500 ms. Nah genug an der Messung, dass ein einzelner langsamer
Abruf unnötig in den Rückfall führte.

---

## E-08 — Schutz der Gegenstelle vor Überlastung (FR-005)

**Entscheidung**: Kurzlebige Ablage des **Abrufs** am Rand, 30 Sekunden.

**Ausgangslage**: Der Kalender trägt `X-PUBLISHED-TTL:PT4H` — die Gegenstelle
bittet Kalenderprogramme, höchstens alle vier Stunden zu fragen. Diese Bitte
richtet sich an Programme, die **stur im Takt** fragen, ob jemand hinsieht oder
nicht. Unser Abruf erfolgt nur, wenn ein Mitglied tatsächlich hinsieht — bei der
Größe des Vereins sind das weniger Anfragen als sechs am Tag. Dem Sinn der Bitte
widerspricht das nicht.

Die Bitte schützt aber auch vor dem pathologischen Fall: ein Suchmaschinen-
Roboter, ein hängender Aktualisierungsknopf, ein Lastversuch. Dagegen hilft die
geringe Nutzerzahl nicht.

**Deshalb**: Der Abruf wird 30 Sekunden am Rand vorgehalten. Damit gilt
unabhängig von der Zahl der Aufrufe eine Obergrenze von zwei Abrufen je Minute.

**Wichtige Abgrenzung — hier lauert ein bereits einmal gemachter Fehler**: Diese
Ablage betrifft **ausschließlich den Abruf bei Vereinsflieger**, nicht die
Antwort an den Browser. Die Antwort bleibt `no-store`. Am 13.08.2026 hat eine
zwischengespeicherte Fehlantwort die Anzeige tagelang falsch aussehen lassen;
diese Trennung ist die Lehre daraus und gehört ausdrücklich geprüft.

**Prüfung gegen SC-001** („binnen einer Minute sichtbar"): 30 s Ablage plus
0,2 s Abruf liegen darunter. Eine Ablage von 60 s hätte das Kriterium
punktgenau ausgereizt — zu knapp.

---

## E-09 — Neuer Takt des Rückfall-Abrufs

**Entscheidung**: alle **30 Minuten** (`*/30 * * * *`) statt alle 10.

**Die Randbedingung, die den Ausschlag gibt**: `VERFALLSGRENZE_MS` steht auf
genau **60 Minuten**. Ab diesem Alter gilt ein Stand als veraltet. Ein
stündlicher Takt — der erste Gedanke — liefe damit frontal gegen diese Grenze:
Der Stand wäre unmittelbar vor jeder Auffrischung bereits abgelaufen. Die
Anzeige würde regelmäßig „veraltet" melden, obwohl alles funktioniert.

Bei 30 Minuten liegt der Rückfall im Regelfall bei höchstens 30 Minuten Alter,
also mit deutlichem Abstand unter der Grenze.

**Was bei einem ausgefallenen Durchgang passiert**: Der Stand erreicht 60
Minuten und gilt als veraltet. Das ist **richtig so** — nach zwei
fehlgeschlagenen Anläufen soll die Anzeige nicht mehr so tun, als sei alles in
Ordnung. Zusammen mit dem Hinweis „letzter bekannter Stand" (FR-019) ergibt das
eine ehrliche Aussage.

**Wirkung auf SC-004**: 144 Durchgänge je Tag sinken auf 48 — eine Drittelung
des Verbrauchs bei der Programmierschnittstelle.

**Verworfen**: stündlich (kollidiert mit der Verfallsgrenze, siehe oben).
**Verworfen**: den Cron ganz abschaffen. Dann hinge alles an einer einzigen,
nicht wechselbaren Adresse — User Story 2 verlöre ihre Grundlage.

---

## E-10 — Herkunft im Vertrag der Auskunft

**Entscheidung**: Die Antwort der Server-Route trägt ein zusätzliches Feld
`quelle` mit den Werten `kalender` oder `rueckfall`.

**Begründung**: FR-019 verlangt, den Rückfall zurückhaltend kenntlich zu machen.
Die Anzeige braucht dafür eine Tatsache, keine Vermutung. Sie aus dem Alter zu
erschließen wäre naheliegend, aber falsch: Ein Rückfall kann sekundenfrisch
sein, wenn der Cron gerade lief.

**Was `quelle` nicht ist**: kein Schalter für die Berechnung. `belegungsauskunft`
bekommt das Feld nicht zu sehen und entscheidet unverändert allein aus Zeiträumen
und Bezugszeitpunkt. Sonst entstünden zwei Auslegungen derselben Frage — der
Verstoß gegen Verfassungsprinzip IV, den FR-022 ausdrücklich verbietet.

---

## E-11 — Was aus Feature 047 unverändert bleibt

Ausdrücklich festgehalten, damit es beim Umbau nicht verlorengeht:

- **`belegung.ts`** — die Kettenbildung (`endeDerKette`) bleibt unangetastet.
  Sie ist der Grund, warum die Anzeige nicht „frei ab 15 Uhr" sagt, wenn um
  15 Uhr die nächste Reservierung beginnt. Berührt wird nur, *woraus* die
  Zeitpunkte gelesen werden, nicht *wie* gerechnet wird.
- **`zeit.ts`, `ortszeitZuZeitpunkt`** — die Auflösung der doppelten und der
  übersprungenen Stunde bleibt wie sie ist. Sie wird künftig früher aufgerufen
  (beim Deuten statt beim Auswerten), aber nicht verändert.
- **Kein Feld für Personen** in `Reservierung`. Die stärkste Zusicherung des
  Vorgängers; sie wird durch dieses Feature belastet, weil der Kalender Namen
  mitliefert — und muss sie aushalten.
- **`no-store`** auf der Auskunft und `cache: 'no-store'` beim Abruf der Seite.
  Am 13.08.2026 erarbeitet, nicht wieder aufzugeben.
- **Vereinsflieger als verbindliche Quelle** und der Weg zur Buchung (FR-020).
