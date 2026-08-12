# Vereinsflieger-REST-Schnittstelle

Notizen zur Schnittstelle von vereinsflieger.de, gesammelt bei der Vorklärung
zur Reservierungsanzeige. `api.http` daneben enthält die zugehörigen Aufrufe im
JetBrains-Format; die Zugangsdaten liegen in `http-client.private.env.json` und
sind von der Versionsverwaltung ausgenommen — **sie gehören nirgends ins Repo**.

Grundlage ist die offizielle Spezifikation (`VereinsfliegerRestInterface.pdf`,
Stand 12.05.2026, abrufbar aus dem angemeldeten Vereinsflieger unter
Hilfe → Downloads). Wo hier eine andere Quelle gilt, steht es dabei.

## Was die Planung bestimmt

**500 Aufrufe je Tag und appkey.** Das Kontingent gilt für alle Nutzer dieses
Schlüssels zusammen, nicht je Person. Eine persönliche Anmeldung kostet allein
drei bis vier Aufrufe (`accesstoken`, `signin`, `getuser`, Abfrage) — damit wäre
nach gut hundert Sitzungen am Tag für den ganzen Verein Schluss. Fremde Quellen
nennen zusätzlich **einen Aufruf je Sekunde** als technische Grenze.

Daraus folgt: Es wird **einmal zentral abgerufen und zwischengespeichert**, nicht
je Besucher. Ein Abruf alle zehn Minuten kostet rund 150 Aufrufe am Tag,
unabhängig davon, wie viele Mitglieder zuschauen.

**Keine CORS-Kopfzeilen.** Geprüft am 12.08.2026: Die Antwort auf
`GET /interface/rest/auth/accesstoken` enthält kein `Access-Control-Allow-Origin`.
Ein Browser kann die Schnittstelle also nicht unmittelbar ansprechen — es braucht
einen Serverteil dazwischen, der zugleich den Zwischenspeicher hält.

**Anmeldung nur mit persönlichen Zugangsdaten.** Es gibt kein OAuth, keinen
Weiterleitungsablauf und kein reines Anwendungstoken: `auth/signin` verlangt
Benutzername und `md5(passwort)` nebst `appkey`. MD5 ist keine Wahl, sondern
Vorgabe der Schnittstelle.

Für Bucky heißt das: Mitglieder geben ihre Zugangsdaten **nicht** an uns. Gelesen
wird mit einem Dienstkonto des Vereins, dessen Zugangsdaten auf dem Server
liegen. Das Konto sollte **keine Zwei-Faktor-Anmeldung** haben — sonst verlangt
jede Anmeldung ein Einmalkennwort (`auth_secret`).

Den `appkey` erstellt der Verein selbst unter Stammdaten → Einstellungen →
REST Interface. Kommerzielle Nutzung ist untersagt.

## Reservierungen

Die Spezifikation kennt genau **einen** Endpunkt, und der ist lesend:
`POST reservation/list/active`. Er liefert je Reservierung `prid`, `datefrom`,
`dateto`, `comment`, `freeseats`, `uid`/`user` (Pilot), `uidfi`/`fi`
(Fluglehrer), `type`, `ressource`, `daterange`, `duration`.

Freie, quelloffene Clients (etwa `termigrator/vereinsflieger_nodejs_api`) rufen
darüber hinaus `reservation/add`, `reservation/edit/{id}` und
`reservation/delete/{id}` auf. Diese Endpunkte stehen **nicht** in der
Spezifikation. Darauf zu bauen heißt, sich auf etwas zu verlassen, das ohne
Ankündigung verschwinden kann — und Schreiben über ein Dienstkonto hieße,
Reservierungen im Namen fremder Mitglieder anzulegen. Gebucht wird deshalb
weiterhin in Vereinsflieger; Bucky verweist dorthin (Constitution, Prinzip II).

## Zu beachten

- Die Antworten sind **numerisch objektindiziert** (PHP-Art): `{"0": {…},
  "1": {…}}`, nicht als Liste.
- Die Reservierungsliste enthält **Klarnamen**. Sie darf nicht offen im Netz
  stehen; die Anzeige braucht eine Zugangshürde.
- Die Lebensdauer eines `accesstoken` ist nicht dokumentiert; es wird ein
  PHP-Sitzungskeks mitgeliefert. `DELETE auth/signout/{accesstoken}` meldet ab.
- Grundadresse ist `https://www.vereinsflieger.de`, für Flightcenter-Kunden
  `https://www.flightcenterplus.de`.
