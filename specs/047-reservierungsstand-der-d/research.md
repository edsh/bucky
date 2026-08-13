# Recherche: Reservierungsstand der D-EELK anzeigen

**Feature**: 047 | **Stand**: 13.08.2026

Alle Entscheidungen mit Quelle. Wo etwas im Versuch belegt wurde, steht das
Vorgehen dabei — nachgelesene Ratschläge, die der Versuch widerlegt hat, sind
ausdrücklich als solche vermerkt.

---

## E-01: Der Abruf läuft in einem **eigenen Worker**, nicht im Web-Worker

**Entscheidung**: Ein zweiter, eigenständiger Cloudflare Worker (`apps/reservierungs-abruf`)
trägt den Cron Trigger und schreibt in den Zwischenspeicher. Die SvelteKit-App
liest nur.

**Warum nicht im selben Worker** — hier steckt die eigentliche Erkenntnis:

Der naheliegende Weg wäre, den vom Adapter erzeugten Worker zu umhüllen und um
einen `scheduled`-Handler zu ergänzen. Genau das empfehlen mehrere Anleitungen
im Netz:

```js
import handler from './.svelte-kit/cloudflare/_worker.js';
export default { ...handler, async scheduled(...) { … } };
```

**Das trägt nicht.** Im Versuch (13.08.2026, Wrangler 4.122.0,
`@sveltejs/adapter-cloudflare` 7.2.9) zeigte sich: Der Adapter schreibt seinen
erzeugten Worker **an genau den Pfad, den `main` in der Wrangler-Konfiguration
nennt**. Zeigt `main` auf die eigene Umhüllungsdatei, wird diese beim nächsten
`npm run build` überschrieben — aus 600 Bytes eigenem Code wurden 4359 Bytes
erzeugter Worker. Kein Fehler, keine Warnung; der Cron-Handler war schlicht
verschwunden. Nachweis: gesetzte Kopfzeile `x-spike-einstieg` fehlte in der
Antwort, und der `scheduled`-Lauf schrieb nichts in den Speicher, obwohl
Wrangler „Ran scheduled event" meldete.

Die offizielle Adapter-Dokumentation kennt **keine** Option für einen eigenen
Einstiegspunkt — nur `config`, `platformProxy`, `fallback` und `routes`. Eine
Umhüllung bliebe also ein Kampf gegen den Adapter, mit einem Nachbearbeitungs-
schritt nach jedem Bau. Das ist genau die Art Bastelei, die beim nächsten
Adapter-Wechsel still zerbricht.

**Vorteile der Trennung, unabhängig davon**: Ein Fehler im Abruf kann die
Website nicht mitreißen. Die Speichergrenzen des Abrufs (CPU-Zeit,
Ausführungsdauer) sind von denen der Auslieferung getrennt. Und der Abruf lässt
sich einzeln zurückrollen.

**Nachteil**: Zwei Veröffentlichungsschritte in der Ablaufsteuerung statt einem.

Quellen:
- https://svelte.dev/docs/kit/adapter-cloudflare (Optionsliste, kein Einstiegspunkt)
- https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/
- Eigener Versuch, siehe oben

---

## E-02: MD5 kommt aus der Laufzeit, nicht aus einem Fremdpaket

**Entscheidung**: `crypto.subtle.digest('MD5', …)`.

**Begründung**: Cloudflare unterstützt MD5 als **nicht-standardisierte
Erweiterung** der Web-Crypto-Schnittstelle, ausdrücklich für den Umgang mit
Altsystemen — und die Vereinsflieger-Schnittstelle ist genau so eines. Damit
entfällt ein Fremdpaket für einen Einzeiler.

Belegt in der Doku *und* im Versuch: `crypto.subtle.digest('MD5', …)` über
`geheim` ergab `e8636ea013e682faf61f56ce1cb1ab5c` — Ziffer für Ziffer dasselbe
wie `printf 'geheim' | md5` auf dem Rechner.

Die Doku hält fest: „MD5 is considered a weak algorithm. Do not rely upon MD5
for security." Das ist hier kein Widerspruch: MD5 schützt nichts, es ist bloß
das Format, in dem die Gegenstelle das Kennwort erwartet. Geschützt wird das
Kennwort durch die Transportverschlüsselung und dadurch, dass es als Geheimnis
im Worker liegt.

Quelle: https://developers.cloudflare.com/workers/runtime-apis/web-crypto/
(Fußnote 3 zur Algorithmentabelle)

---

## E-03: Workers KV als Zwischenspeicher

**Entscheidung**: Ein KV-Namensraum, ein einziger Schlüssel mit dem gesamten
Abrufstand als JSON.

**Begründung**: Der Zugriff ist genau der, für den KV gemacht ist — selten
geschrieben (alle zehn Minuten), oft gelesen, ein kleiner Datensatz. D1 wäre
eine Datenbank für Daten, die wir gar nicht abfragen wollen; ein Durable Object
wäre ein Rechenknoten für eine Aufgabe ohne Zustand zwischen Anfragen.

Die eventuale Konsistenz von KV — ein Leser kann kurz einen älteren Wert sehen —
ist hier belanglos: Die Daten sind ohnehin bis zu zehn Minuten alt, und FR-009
verlangt, das Alter offen auszuweisen. Ein paar Sekunden Verzögerung ändern
daran nichts.

**Ein Schlüssel statt einer je Reservierung**: Die Auskunft braucht immer den
ganzen Stand (welche Belegung ist die nächste?). Viele Schlüssel bedeuteten
viele Lesevorgänge je Seitenaufruf, ohne Gewinn.

Grenzen im kostenlosen Tarif: 100 000 Lesevorgänge und 1 000 Schreibvorgänge je
Tag, Werte bis 25 MB. Der Abruf schreibt 144-mal am Tag — ein Siebtel des
Erlaubten.

Quelle: https://developers.cloudflare.com/kv/platform/limits/

---

## E-04: Abruftakt alle zehn Minuten

**Entscheidung**: `*/10 * * * *`.

**Rechnung**: Ein Durchgang kostet mehrere Aufrufe bei Vereinsflieger
(`accesstoken`, `signin`, `reservation/list/active`, `signout`) — rund vier.
144 Durchgänge à 4 Aufrufe sind **576** und damit **über** dem Tageskontingent
von 500. Das ist der Grund, warum der Takt allein nicht reicht:

**Der Zugangsschlüssel wird wiederverwendet.** Solange ein `accesstoken` gilt,
kostet ein Durchgang nur den einen Listen-Aufruf: 144 am Tag. Erst wenn die
Gegenstelle den Schlüssel ablehnt, wird neu angemeldet. Damit bleibt der
Verbrauch selbst bei mehreren Neuanmeldungen am Tag deutlich unter einem Drittel
des Kontingents (SC-003).

Die Lebensdauer eines `accesstoken` ist **nicht dokumentiert** (siehe
`tools/vereinsflieger-api/README.md`). Deshalb wird sie nicht geraten, sondern
der abgelaufene Schlüssel am Fehlschlag erkannt und einmalig erneuert.

**Cron im kostenlosen Tarif**: erlaubt, bis zu fünf Zeitpläne je Worker. Die
kleinste sinnvolle Auflösung ist eine Minute; zehn Minuten sind unkritisch.

Quellen:
- https://developers.cloudflare.com/workers/configuration/cron-triggers/
- https://developers.cloudflare.com/workers/platform/limits/

---

## E-05: Cron lokal auslösen

**Entscheidung**: `wrangler dev --test-scheduled`, dann
`curl "http://localhost:8787/__scheduled?cron=*/10+*+*+*+*"`.

Im Versuch bestätigt: Der Aufruf antwortet mit `Ran scheduled event`. **Achtung**,
zwei Fallstricke, beide selbst erlebt:

1. Die Konsolenausgaben des Workers erscheinen **nicht**, wenn die Ausgabe von
   `wrangler dev` in eine Datei umgeleitet wird. Wer damit prüfen will, ob der
   Handler lief, prüft ins Leere — besser über eine sichtbare Wirkung (Eintrag
   im Speicher, gesetzte Kopfzeile).
2. `Ran scheduled event` heißt **nur**, dass Wrangler das Ereignis ausgelöst hat,
   nicht dass der eigene Handler es bekommen hat. Genau daran wäre der Irrtum aus
   E-01 fast unbemerkt geblieben.

Quelle: https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/

---

## E-06: Die Rechenlogik liegt im Kern, nicht im Worker

**Entscheidung**: Ein neues Paket `packages/reservierung-core` enthält alles
Fachliche: das Deuten der Antwort, das Zusammenfassen zu Belegungen, die
Ableitung „frei/belegt und nächster Wechsel". Beide Zugangswege — der Cron-Worker
und die SvelteKit-Server-Route — sind dünne Adapter darüber.

**Begründung**: Prinzip IV der Verfassung. Die Regel entstand für die
POH-Berechnung, greift hier aber genauso: Die Frage „ab wann ist frei?" bei
lückenlos aneinandergrenzenden Belegungen ist eine Rechenregel mit Randfällen —
sie darf nicht zweimal, leicht verschieden, existieren.

**Nebenwirkung, die den Ausschlag gibt**: Reine Funktionen ohne Cloudflare-Bezug
sind mit dem vorhandenen `vitest` prüfbar, ohne Worker-Laufzeit und ohne
Netzzugriff. Das gilt gerade für die Randfälle aus der Spec (Zeitumstellung,
lückenlose Ketten, mehrtägige Belegungen), die sich gegen eine echte
Schnittstelle kaum herstellen ließen.

---

## E-07: Geheimnisse als Worker-Secrets

**Entscheidung**: Benutzername, MD5-Kennwort und `appkey` liegen als Secrets am
Cron-Worker (`wrangler secret put`), nicht in der Wrangler-Konfiguration.

**Begründung**: `vars` in der Konfiguration stehen im Klartext im Repository —
für Zugangsdaten ausgeschlossen (FR-013). Secrets sind verschlüsselt, nur zur
Laufzeit lesbar und überstehen ein `wrangler deploy`; sie müssen also nicht bei
jeder Veröffentlichung neu gesetzt werden.

**Das Kennwort wird bereits als MD5 hinterlegt**, nicht im Klartext. Die
Gegenstelle verlangt ohnehin nur den Hashwert; damit liegt das eigentliche
Kennwort nirgends im System. Das ist kein Sicherheitsgewinn gegen einen
Angreifer mit Zugriff auf die Secrets (der Hash genügt zur Anmeldung), wohl aber
gegen die versehentliche Weiterverwendung des Kennworts an anderer Stelle.

**Nur der Cron-Worker bekommt sie.** Die SvelteKit-App braucht sie nicht — sie
liest ausschließlich den Zwischenspeicher. Das ist die technische Absicherung
von FR-013: Zugangsdaten können gar nicht in den Browser gelangen, weil der
Worker, der die Seite ausliefert, sie nicht kennt.

Quelle: https://developers.cloudflare.com/workers/configuration/secrets/

---

## E-08: Die Antwort der Gegenstelle ist objektindiziert

**Befund** (aus der Vorklärung, `tools/vereinsflieger-api/README.md`): Die
Antwort kommt nicht als Liste, sondern als Objekt mit Zifferschlüsseln:
`{"0": {…}, "1": {…}}` — eine Eigenheit von PHP.

**Folge**: Vor jeder Verarbeitung steht ein Umwandlungsschritt. Der gehört in
den Kern und braucht eigene Prüfungen für die Grenzfälle: leere Antwort
(`{}` statt `[]`), ein einzelner Eintrag, und die Frage, ob neben den
Zifferschlüsseln noch andere Felder stehen (etwa ein Statusfeld), die nicht als
Reservierung missdeutet werden dürfen.

---

## E-09: Zeitzone

**Entscheidung**: Alle Zeitangaben werden mit `Intl.DateTimeFormat` und
`timeZone: 'Europe/Berlin'` erzeugt.

**Begründung**: Der Worker läuft in UTC, die Gegenstelle liefert Ortszeit ohne
Zeitzonenangabe (`datefrom`/`dateto` im Format `YYYY-MM-DD HH:MM:SS`). Ohne
ausdrückliche Zeitzone verschöbe sich jede Anzeige im Sommer um zwei Stunden.
`Intl` ist in Workers vorhanden; eine Zeitzonenbibliothek ist nicht nötig.

**Prüfbar gemacht**: Der Kern bekommt den Bezugszeitpunkt als Parameter
übergeben, statt `Date.now()` selbst aufzurufen. Nur so lassen sich der letzte
Sonntag im März und der letzte im Oktober als Prüffälle stellen.
