# Prüfstoff aus der echten Quelle

## `antwort-echt.json`

Eine **echte** Antwort von `POST reservation/list/active`, abgerufen am
13.08.2026 gegen `https://www.vereinsflieger.de` mit dem Dienstkonto des
Vereins. 19 Reservierungen, dazu `httpstatuscode`.

### Was verändert wurde

Die **Struktur ist unverändert** — alle 18 Felder je Eintrag stehen noch da,
in der Reihenfolge der Quelle. Verändert wurden nur die Werte, die
Personenbezug haben:

| Feld | Behandlung |
|---|---|
| `comment` | durch `PLATZHALTER Bemerkung` ersetzt, wo eine Bemerkung vorlag; leere bleiben leer |
| `user`, `fi` | durch `PLATZHALTER, Pilot` bzw. `PLATZHALTER, Fluglehrer` ersetzt |
| `uid`, `uidfi`, `uidcreate`, `uidmodify` | durch erfundene Zahlen ab 7000 ersetzt |
| `prid` | neu vergeben ab 9000 |

Unverändert blieben: `datefrom`, `dateto`, `daterange`, `duration`,
`freeseats`, `type`, `ressource`, `defaultairport`, `createtime`,
`modifytime`.

**Luftfahrzeugkennzeichen wurden bewusst nicht verfremdet.** Sie sind
öffentlich und kein Personendatum — und der Prüfstoff soll die echte Vielfalt
zeigen (siehe unten).

### Warum die Felder nicht gelöscht, sondern ersetzt wurden

Ein Prüfstoff ohne `user` und `comment` würde nicht prüfen, was er prüfen
soll. Der Deutungsschritt muss zeigen, dass er diese Felder **fallen lässt**,
obwohl sie da sind. Wären sie gar nicht erst vorhanden, ginge die Prüfung
auch dann durch, wenn der Code sie brav durchreichte.

Aus demselben Grund ist `PLATZHALTER` ein auffälliges Wort: Taucht es je in
einer ausgelieferten Antwort auf, ist die Prüfung fehlgeschlagen und man sieht
es sofort.

## Was dieser Abzug über die Quelle verrät

Drei Dinge, die man der Spezifikation nicht ansieht:

1. **`type` kennt mindestens zwei Werte**: `Reservierung` (13×) und `Sperre`
   (6×). Die D-EELK hat eine Sperre über drei Tage. Eine Sperre belegt das
   Flugzeug ebenso, hat aber einen anderen Grund — Wartung statt Flugvorhaben.
2. **`ressource` ist nicht immer ein Flugzeug.** Im Abzug stehen auch
   `Werkstatt` und `GRILL`. Wer alle Einträge für Flugzeuge hält, zeigt den
   Grillplatz als Luftfahrzeug an.
3. **Sperren beginnen und enden oft auf `00:00:00`** und laufen über Tage —
   der mehrtägige Fall aus dem Datenmodell ist kein Sonderfall, sondern
   Alltag.

## Herkunft nachvollziehen

Der Abruf lässt sich mit `tools/vereinsflieger-api/api.http` wiederholen.
**Zwei Dinge, die dabei nicht in der Spezifikation stehen** und beim Erzeugen
dieses Abzugs Aufrufe gekostet haben:

- Der `PHPSESSID`-Keks aus dem `accesstoken`-Aufruf **muss** beim `signin`
  mitgeschickt werden.
- `cid` darf **nicht** mitgeschickt werden, wenn das Konto nur einem Verein
  zugeordnet ist. Sonst antwortet die Anmeldung mit
  `403 Wrong User or wrong Password` — eine irreführende Meldung, die zum
  Suchen an der falschen Stelle verleitet.

## `kalender.ics`

Ein **echter** Abzug des Kalender-Abos aus Vereinsflieger (Feature 052),
abgerufen am 13.08.2026 gegen `https://vereinsflieger.de/…/cal.ics`. Die
Adresse selbst ist ein Geheimnis und steht in **keiner** Datei dieser Ablage
(research.md, E-06) — sie wird ausschließlich als Worker-Geheimnis
`KALENDER_ABO_URL` gehalten.

### Was verändert wurde

Alle 25 echten Namen in `SUMMARY` und `DESCRIPTION` (Schreibweise
`Nachname, Vorname`) wurden durch **erfundene** Namen ersetzt, 1:1 zugeordnet
über den ganzen Abzug hinweg. Der Hinweistext im Kalendertitel
(„Bucky Highfly, technischer API-User, … fragen") wurde ebenso anonymisiert.
Struktur, Zeiten, Kennungen, `UID`s und alle Sachbeschreibungen
(„Flugplatzfest", „Flieger defekt. LFZ muss in Werft." etc.) blieben
unverändert — sie enthalten keinen Personenbezug.

### Was dieser Abzug über die Quelle verrät

- **59 `VEVENT`-Blöcke**, davon 32 Reservierungen und 2 Sperren (`Grounding`)
  für die D-EELK — ausreichend Prüfstoff für User Story 1 und User Story 3.
- **22 ganztägige Einträge** (`DTSTART;VALUE=DATE:…`, ohne Uhrzeit) — der in
  research.md E-05 beschriebene Fall ist hier **Alltag**, kein Sonderfall.
- **8 Einträge ohne Luftfahrzeug-Kennung** (`GRILL`, `LANDEBAR`, `Werkstatt`)
  — müssen wie beim API-Weg aussortiert werden.
- **Keine umbrochenen Zeilen** trotz Zeilen über 74 Zeichen (Verstoß gegen
  RFC 5545) und **keine `TZID`-Angabe** — die Gegenstelle liefert
  durchgehend Weltzeit (`Z`). Beide Fallstricke aus research.md E-05 sind
  im Abzug nicht ausgelöst, müssen aber dennoch behandelt werden (Falle mit
  Zeitzünder).

### Herkunft nachvollziehen

Abruf gegen `$KALENDER_ABO_URL` (Umgebungsvariable, niemals eine Datei),
siehe quickstart.md, Nachweis 1. Die Anonymisierung erfolgte unmittelbar nach
dem Abruf; die Rohdatei wurde danach gelöscht.

### Ab Feature 054 auch Prüfstoff für die Flottenbildung

Derselbe Abzug dient ab Feature 054 als Grundlage für `flotteBilden` — ein
neuer Abzug ist dafür nicht nötig. Er enthält sechs Luftfahrzeugkennzeichen:

| Kennung | Kommt vor als | Abgeleitete Kategorie (E-02) |
|---|---|---|
| `D-EELK` | Reservierung und Sperre | Motor/UL |
| `D-EXYZ` | Reservierung und Sperre | Motor/UL |
| `D-MRXS` | **nur** Sperre | Motor/UL |
| `D-9021` | **nur** Sperre | Segelflug |
| `D-4413` | **nur** Sperre | Segelflug |
| `D-3004` | genau eine Reservierung | Segelflug |

Dazu die drei Nicht-Flugzeuge `GRILL`, `LANDEBAR` und `Werkstatt`, die schon
beim Deuten aussortiert werden.

Zwei Dinge machen den Abzug für diesen Zweck wertvoll:

1. **Drei der sechs Maschinen erscheinen ausschließlich in Sperren.** Wer die
   Flotte nur aus Reservierungen bildet, verliert sie — und zwar die drei
   Segelflugzeuge, also fast die halbe Flotte.
2. **Die Kategorieregel aus E-02 trifft hier sechsmal von sechs**: Ein rein
   ziffriges Eintragungszeichen bedeutet Segelflug, sonst Motor/UL. Der Abzug
   ist damit der Beleg, dass die Regel keine Erfindung am Schreibtisch ist.

Was der Abzug **nicht** belegt: dass diese sechs die ganze Flotte sind. Ein
Flugzeug, das im Abrufzeitraum niemand gebucht hat, steht hier nicht — genau
deshalb gibt es die Stammliste (E-01).
