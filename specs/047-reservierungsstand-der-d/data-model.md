# Data Model: Reservierungsstand der D-EELK

**Feature**: 047 | **Grundlage**: [spec.md](./spec.md) Key Entities,
[research.md](./research.md) E-08/E-09

Drei Größen, in der Reihenfolge, in der die Daten sie durchlaufen:
**Reservierung** (was aus der Quelle kommt) → **Abrufstand** (was gespeichert
wird) → **Belegungsauskunft** (was der Mensch liest).

---

## 1. Reservierung

Ein Zeitraum, in dem ein Flugzeug belegt ist.

### Was aus der Quelle kommt

`POST reservation/list/active` liefert je Eintrag: `prid`, `datefrom`, `dateto`,
`comment`, `freeseats`, `uid`/`user`, `uidfi`/`fi`, `type`, `ressource`,
`daterange`, `duration`.

Die Antwort ist **objektindiziert**, nicht als Liste: `{"0": {…}, "1": {…}}`
(E-08). Zusätzlich enthält sie einen `httpstatuscode`-Eintrag, der **keine**
Reservierung ist und beim Deuten übersprungen werden muss.

### Was übernommen wird

| Feld | Herkunft | Typ | Regel |
|---|---|---|---|
| `kennung` | `ressource` | Text | nicht leer; wird auf Großbuchstaben ohne Leerzeichen vereinheitlicht, damit `D-EELK`, `D EELK` und `d-eelk` dasselbe Flugzeug sind |
| `beginn` | `datefrom` | Zeitpunkt | `YYYY-MM-DD HH:MM:SS` **ohne Zeitzone**, zu deuten als Ortszeit `Europe/Berlin` (E-09) |
| `ende` | `dateto` | Zeitpunkt | wie `beginn`; **muss** nach `beginn` liegen |
| `art` | `type` | `reservierung` \| `sperre` | `Reservierung` → `reservierung`, `Sperre` → `sperre`; ein unbekannter Wert gilt als `reservierung` (belegt ist belegt) |

### Was ausdrücklich verworfen wird

`comment`, `uid`, `user`, `uidfi`, `fi`, `prid`, `freeseats`, `daterange`,
`duration`, `createtime`, `modifytime`, `uidcreate`, `uidmodify`,
`defaultairport`.

**Warum das eine Regel und keine Auslassung ist**: `user` und `fi` sind
Klarnamen. FR-006 verbietet sie nach außen. Die Struktur `Reservierung` hat
deshalb **kein Feld dafür** — nicht ein leeres, sondern gar keins. Ein Klarname
kann so nicht versehentlich durchrutschen, weil es keinen Ort gibt, an dem er
stehen könnte.

### Prüfregeln beim Deuten

Ein Eintrag wird verworfen (nicht der ganze Abruf), wenn:

- `ressource` fehlt, leer ist oder **kein Luftfahrzeugkennzeichen** ist
  (FR-003a) — im aufgezeichneten Abzug stehen auch `Werkstatt` und `GRILL`
- `datefrom` oder `dateto` nicht dem erwarteten Muster entspricht
- `dateto` nicht nach `datefrom` liegt

Der **ganze Abruf** gilt dagegen als misslungen, wenn die Antwort überhaupt
nicht objektindiziert ist oder `httpstatuscode` einen Fehler meldet. Dann wird
nichts geschrieben (FR-004).

Die Unterscheidung ist beabsichtigt: Ein einzelner kaputter Eintrag darf nicht
die Auskunft für alle unmöglich machen; eine unverständliche Gesamtantwort
dagegen ist kein Grund, den bisherigen Stand wegzuwerfen.

---

## 2. Abrufstand

Was im Zwischenspeicher liegt — ein einziger Eintrag, der den ganzen Verein
umfasst (E-03).

| Feld | Typ | Bedeutung |
|---|---|---|
| `abgerufenAm` | Zeitpunkt (ISO, UTC) | Wann dieser Stand erfolgreich geholt wurde. Grundlage für FR-005 und FR-009. |
| `reservierungen` | Liste von `Reservierung` | **Alle** Flugzeuge, nicht nur die D-EELK (FR-003) |
| `verworfeneEintraege` | Zahl | Wie viele Einträge die Prüfregeln nicht bestanden haben |
| `neuanmeldungen` | Zahl | Wie oft in diesem Durchgang neu angemeldet werden musste — der Verbrauchszähler aus der Risikotabelle des Plans |

### Regeln

- Es gibt **immer höchstens einen** gültigen Abrufstand. Kein Verlauf, keine
  Versionen.
- Geschrieben wird **nur nach einem vollständig gelungenen Durchgang** (FR-004).
- `abgerufenAm` ist der Zeitpunkt des **Abrufs**, nicht des Schreibens.
- Alle Flugzeuge werden gespeichert, obwohl vorerst nur eines angezeigt wird —
  die Entscheidung des Nutzers in der Vorklärung. Ein zweites Flugzeug ist
  später eine Anzeigefrage, kein neuer Abruf.

### Zustände

| Zustand | Bedingung | Folge für die Anzeige |
|---|---|---|
| **frisch** | Alter unter der Verfallsgrenze | Normale Auskunft mit Alter (FR-009) |
| **veraltet** | Alter über der Verfallsgrenze | Auskunft **mit Kennzeichnung** als veraltet (FR-009) |
| **nicht vorhanden** | kein Eintrag im Speicher | Offen sagen, dass nichts vorliegt (FR-010) |

Die Verfallsgrenze ist eine Angabe des Kerns, kein fest verdrahteter Wert in der
Anzeige — damit Server-Route und künftige Zugangswege dieselbe Grenze benutzen
(Prinzip IV).

---

## 3. Belegungsauskunft

Das Ergebnis, aus dem der Satz auf der Seite entsteht.

| Feld | Typ | Bedeutung |
|---|---|---|
| `kennung` | Text | Das Flugzeug, um das es geht |
| `frei` | Ja/Nein | Zustand **zum übergebenen Bezugszeitpunkt** |
| `art` | `reservierung` \| `sperre` \| nichts | Woraus die laufende Belegung stammt; leer, wenn frei |
| `wechselAm` | Zeitpunkt oder nichts | Wann sich der Zustand ändert |
| `wechselZu` | `frei` \| `belegt` \| nichts | Was danach gilt |
| `standAlter` | Dauer | Wie alt der zugrunde liegende Abrufstand ist |
| `standVeraltet` | Ja/Nein | Ergebnis der Verfallsprüfung |

### Ableitung

Der Bezugszeitpunkt wird **übergeben**, nie im Kern geholt (E-09). Sonst ließen
sich Zeitumstellung und Grenzfälle nicht prüfen.

1. Reservierungen auf die gefragte Kennung eingrenzen.
2. Nach Beginn sortieren.
3. Deckt eine Reservierung den Bezugszeitpunkt ab → **belegt**.
4. Sonst → **frei**.

### Der Wechselzeitpunkt — der einzige wirklich knifflige Teil

**Ist frei**: `wechselAm` ist der Beginn der nächsten Reservierung, `wechselZu`
ist `belegt`. Gibt es keine → beide leer („frei, keine Belegung in Sicht").

**Ist belegt**: `wechselAm` ist das Ende der laufenden Reservierung — **es sei
denn, eine weitere schließt lückenlos oder überlappend an**. Dann zählt deren
Ende, und so weiter, bis eine echte Lücke kommt.

Das ist die Regel, die der Randfall „lückenlose Kette" aus der Spec verlangt.
Ohne sie würde die Anzeige sagen „frei ab 15 Uhr", obwohl um 15 Uhr die nächste
Reservierung beginnt — die Auskunft wäre nicht nur ungenau, sondern **falsch in
der Richtung, die schadet**: Jemand fährt zum Platz, weil er glaubt, das
Flugzeug werde frei.

Zwei Belegungen gelten als lückenlos, wenn die spätere spätestens beim Ende der
früheren beginnt. Ein Spalt von wenigen Minuten ist eine echte Lücke und wird
als solche behandelt — er zu überbrücken hieße zu raten, wie kurz „zu kurz zum
Fliegen" ist. Das ist eine Entscheidung des Piloten, nicht der App.

### Sperre und Reservierung in einer Kette

Für die Frage **ob** belegt ist, zählen beide Arten gleich — eine Sperre macht
das Flugzeug ebenso unverfügbar. Ketten werden deshalb über beide Arten hinweg
gebildet: Schließt eine Reservierung lückenlos an eine Sperre an, ist der
Wechsel erst nach der Reservierung.

Für die Frage **wie es benannt wird** zählt allein die Art der **gerade
laufenden** Belegung. Wer am Samstag fragt, während die Sperre läuft, liest
„Gesperrt bis …" — auch wenn danach eine gewöhnliche Reservierung folgt. Die
Sperre ist die Nachricht, die für ihn zählt: Das Flugzeug ist nicht bloß
vergeben, es ist womöglich zerlegt.

### Randfälle

| Fall | Verhalten |
|---|---|
| Bezugszeitpunkt genau auf `beginn` | belegt (Beginn zählt mit) |
| Bezugszeitpunkt genau auf `ende` | frei (Ende zählt nicht mehr mit) |
| Mehrtägige Belegung | ein Eintrag, kein Aufteilen nach Tagen |
| Zeitumstellung im Zeitraum | Ortszeit über `Intl`, keine eigene Rechnung |
| Gar keine Reservierung für die Kennung | frei, kein Wechsel |
| Leere Antwort der Quelle | gültiger Stand mit leerer Liste — **nicht** ein Fehlschlag |
| Sperre über mehrere Tage, `00:00:00` bis `00:00:00` | gewöhnlicher Fall, kein Sonderfall — im Abzug der Regelfall bei Sperren |
| Unbekannter `type`-Wert | als `reservierung` behandeln; belegt ist belegt |

Der letzte Fall verdient die ausdrückliche Nennung: „Niemand hat reserviert" und
„der Abruf ging schief" sind für den Piloten gegensätzliche Aussagen. Sie zu
verwechseln wäre die schlimmste Verwechslung, die dieses Feature machen kann.

---

## Was hier bewusst fehlt

**Kein Flugzeug als eigene Größe.** Eine Kennung ist Text. Ein Verzeichnis der
Vereinsflugzeuge zu führen hieße, Stammdaten neben Vereinsflieger zu halten —
genau das, was Prinzip II untersagt.

**Kein Mitglied, kein Pilot.** Siehe oben: Was es nicht gibt, kann nicht
durchrutschen.
