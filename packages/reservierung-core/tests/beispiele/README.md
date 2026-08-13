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
