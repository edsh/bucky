# Quickstart: Reservierungsstand in Echtzeit über das Kalender-Abo

**Feature**: 052 | **Datum**: 2026-08-13

Nachweisführung für dieses Feature — was zu tun ist, um zu belegen, dass es
wirklich funktioniert. Kein Umsetzungsleitfaden; der entsteht in `tasks.md`.

---

## Voraussetzungen

### Die Abo-Adresse

Sie ist ein **Geheimnis** und liegt nirgends in dieser Ablage. Zu beziehen aus
Vereinsflieger unter Mitglieder → Community → Reservierungen → Kalender-Abo.

**Regeln im Umgang damit**:

- Nicht in eine Datei dieser Ablage schreiben — auch nicht vorübergehend
- Nicht in eine Commit-Botschaft, nicht in einen Vorschlagstext, nicht in ein
  Issue
- Nicht in ein Bildschirmfoto
- Örtlich über eine Umgebungsvariable in der Sitzung, nicht über eine Datei

```bash
# Nur in der laufenden Sitzung, ohne Ablage auf der Platte:
read -rs KALENDER_ABO_URL && export KALENDER_ABO_URL
```

Abgerufene Kalenderdaten enthalten **Mitgliedsnamen**. Nach dem Prüfen löschen,
nicht in `/tmp` liegen lassen.

### Örtlich einrichten

```bash
npm install
npm run build
```

---

## Nachweis 1 — Der Kalender ist tatsächlich echtzeitfähig *(E-01)*

Der Befund, auf dem das ganze Feature ruht. Vor der Umsetzung zu wiederholen,
falls seit dem 13.08.2026 Zeit vergangen ist.

```bash
date -u "+jetzt   %Y%m%dT%H%M%SZ"
curl -s "$KALENDER_ABO_URL" | grep -m1 "^CREATED:"
sleep 20
curl -s "$KALENDER_ABO_URL" | grep -m1 "^CREATED:"
date -u "+jetzt   %Y%m%dT%H%M%SZ"
```

**Erwartung**: Beide `CREATED`-Werte entsprechen dem jeweiligen Abrufzeitpunkt
und unterscheiden sich um rund 20 Sekunden.

**Schlägt das fehl** — sind die Werte gleich oder alt —, dann liefert die
Gegenstelle einen vorgehaltenen Abzug, und die Grundannahme des Features
trägt nicht mehr. In diesem Fall **abbrechen und neu klären**, nicht umbauen.

```bash
# Antwortzeit und Umfang, für E-07 und SC-002
for i in 1 2 3; do
  curl -s -o /dev/null -w "%{time_total}s  %{size_download} B\n" "$KALENDER_ABO_URL"
done
```

**Erwartung**: rund 0,2 s, rund 20 KB.

---

## Nachweis 2 — Der Deuter im Kern

```bash
npx vitest run --project reservierung-core
npx tsc -p packages/reservierung-core
```

`tsc` ist **nicht optional**: `noUncheckedIndexedAccess` ist aktiv, und Lint und
Prüfungen können grün sein, während die Typprüfung scheitert.

### Der wichtigste Einzelnachweis

Dass eine Fehlerseite **nicht** als leerer Kalender durchgeht:

```bash
npx vitest run --project reservierung-core -t "kein Kalender"
```

**Erwartung**: `kalenderDeuten('<html>…')` wirft, statt ein leeres Ergebnis zu
liefern. Wäre es umgekehrt, erschiene bei jedem Ausfall der Gegenstelle jedes
Flugzeug als frei — der schädlichste denkbare Fehler dieses Features.

### Gegenprobe der Vertragsprüfung *(Pflicht, nicht Kür)*

Eine Prüfung, die nie scheitert, beweist nichts. Deshalb einmal absichtlich
brechen:

1. In `tests/beispiele/kalender.ics` eine `SUMMARY`-Zeile verfälschen
2. `npx vitest run --project reservierung-core` — die Vertragsprüfung MUSS rot
   werden
3. Änderung zurücknehmen, erneut prüfen — wieder grün

Ohne diesen Durchgang ist FR-016 nicht belegt, sondern nur behauptet.

---

## Nachweis 3 — Zusammenspiel örtlich

Die Reservierungsseite braucht den KV-Speicher, den ein zweiter Worker füllt.
Örtlich hat jeder Worker seinen eigenen — der gemeinsame kommt über
`--persist-to`:

```bash
cd apps/web
npx wrangler dev --port 8787 --persist-to ../reservierungs-abruf/.wrangler/state
```

`wrangler dev` braucht rund 40–45 Sekunden bis zur ersten Antwort.

### Regelfall — die Auskunft kommt aus dem Kalender

```bash
curl -s http://localhost:8787/api/reservierung | python3 -m json.tool
```

**Erwartung**: `"quelle": "kalender"`, `abgerufenAm` liegt Sekunden zurück.

```bash
curl -s -D - -o /dev/null http://localhost:8787/api/reservierung | grep -i cache-control
```

**Erwartung**: `no-store, no-cache, must-revalidate, max-age=0`. **Nicht**
`public`, **nicht** `max-age=30` — jene 30 Sekunden gehören zum Abruf bei
Vereinsflieger, nicht zu dieser Antwort. Die Verwechslung dieser beiden Ebenen
ist der Fehler vom 13.08.2026.

### Rückfall — Kalender unerreichbar

Die Adresse vorübergehend unbrauchbar machen:

```bash
KALENDER_ABO_URL="https://vereinsflieger.de/gibtsnicht/cal.ics" \
  npx wrangler dev --port 8787 --persist-to ../reservierungs-abruf/.wrangler/state
```

```bash
curl -s http://localhost:8787/api/reservierung | python3 -m json.tool
```

**Erwartung**: `"quelle": "rueckfall"`, `stand` weiterhin `vorhanden`,
`abgerufenAm` älter. **Niemals** `"frei": true` ohne Datengrundlage.

### Der gefährliche Fall — Antwort ist keine Kalenderdatei

Eine Adresse setzen, die mit 200 antwortet, aber HTML liefert. **Erwartung**:
`"quelle": "rueckfall"`. Käme hier `"quelle": "kalender"` mit leerer
Reservierungsliste, wäre FR-007 verletzt und das Flugzeug erschiene fälschlich
als frei.

### Beides fehlt

Bei unbrauchbarer Adresse **und** leerem Speicher:

**Erwartung**: `{"stand": "fehlt", "quelle": "rueckfall"}` mit **Status 200**,
und die Seite sagt es offen (FR-008).

---

## Nachweis 4 — Klickpfad

```bash
BASE=http://localhost:8787 node tests/ui/klickpfad.mjs
```

**Erwartung**: alle Prüfungen grün, einschließlich der neuen für Herkunft,
Rückfallhinweis und die Rückkehr in den Normalzustand.

**Auflage**: Die neuen Prüfungen dürfen **nicht vom Speicherinhalt abhängen** —
sonst sind sie zu Hause grün und in der Ablaufsteuerung rot, wo der Speicher
leer ist. Sie arbeiten mit abgefangenen Antworten (`page.route`) und geben die
Abfangregel danach wieder frei (`page.unroute`). Diese Lehre stammt aus
Feature 047 und hat dort einen halben Prüflauf gekostet.

---

## Nachweis 5 — Der ganze Prüfstand

```bash
npm run lint
npm test
npm run build
npm run check --workspace @edsh-bucky/web
npx tsc -p packages/reservierung-core
npx tsc -p apps/reservierungs-abruf
```

---

## Nachweis 6 — Inbetriebnahme

### Geheimnis setzen

```bash
cd apps/web
npx wrangler secret put KALENDER_ABO_URL
# Adresse eingeben — sie erscheint nicht auf dem Bildschirm
```

### Takt umstellen

In `apps/reservierungs-abruf/wrangler.jsonc` von `*/10 * * * *` auf
`*/30 * * * *`. Nach dem Veröffentlichen prüfen:

```bash
cd apps/reservierungs-abruf
npx wrangler deploy
npx wrangler kv key get stand --namespace-id 16eb6c9466464025be4066bf52c82da3 --remote \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['abgerufenAm'], d['neuanmeldungen'])"
```

**Achtung — aus Feature 047 gelernt**: Der Cron greift **nicht sofort**. Der
erste Eintrag erschien rund zwanzig Minuten nach dem Veröffentlichen. Wer früher
nachsieht, hält es fälschlich für einen Fehlschlag.

**Erwartung nach zwei Durchgängen**: Der Abstand zwischen zwei `abgerufenAm`
beträgt rund 30 Minuten.

### Live nachweisen

```bash
curl -s https://bucky.edsh.de/api/reservierung | python3 -m json.tool
curl -s -D - -o /dev/null https://bucky.edsh.de/api/reservierung | grep -iE "cache-control|cf-cache-status"
```

**Erwartung**: `"quelle": "kalender"`, `cache-control: no-store…`, **kein**
`cf-cache-status: HIT`.

---

## Nachweis 7 — Der Kernnutzen, von Hand

Der Nachweis für SC-001, und der einzige, den kein automatischer Prüflauf
ersetzt:

1. In Vereinsflieger eine Reservierung für die D-EELK anlegen
2. **Sofort** `https://bucky.edsh.de/d-eelk/reservierung/` aufrufen
3. **Erwartung**: Die Reservierung ist bereits berücksichtigt — ohne Wartezeit,
   ohne Neuladen, ohne zehn Minuten Verzögerung
4. Reservierung in Vereinsflieger wieder entfernen
5. Seite erneut aufrufen — **Erwartung**: das Flugzeug gilt wieder als frei

Danach unbedingt aufräumen: Die Testreservierung darf nicht stehen bleiben, sonst
hält ein Mitglied das Flugzeug für belegt.

---

## Nachweis 8 — Kein Geheimnis, keine Namen entwichen

Vor dem Zusammenführen:

```bash
git --no-pager log -p | grep -ciE "vereinsflieger\.de/[0-9a-f]{16,}" || echo "sauber"
git --no-pager grep -riE "cal\.ics" -- . | grep -v "specs/" || echo "keine Fundstelle"
```

**Erwartung**: keine Adresse in der Versionsgeschichte.

Ebenso prüfen, dass im versionierten Abzug `tests/beispiele/kalender.ics`
**alle Namen ersetzt** sind:

```bash
grep "^SUMMARY:" packages/reservierung-core/tests/beispiele/kalender.ics
```

**Erwartung**: nur erfundene Namen. Ein echter Name im Prüfstoff wäre eine
Weitergabe personenbezogener Daten an jeden, der die Ablage lesen kann.
