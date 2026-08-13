# Quickstart: Reservierungsstand aufsetzen und prüfen

**Feature**: 047 | **Voraussetzung**: [plan.md](./plan.md) gelesen,
`npx wrangler login` erledigt

Diese Anleitung führt vom leeren Konto zum laufenden Abruf — und, wichtiger,
sagt bei jedem Schritt, **woran man erkennt, dass er wirklich gewirkt hat**.

---

## 0. Was gebraucht wird

Vom Nutzer, einmalig:

- **`VF_APPKEY`** — der Anwendungsschlüssel des Vereins bei Vereinsflieger
- **`VF_USERNAME`** und **`VF_PASSWORD`** — das Dienstkonto
- **`VF_CID`** — die Vereinskennung, falls das Konto mehreren zugeordnet ist

Diese vier gehören **ausschließlich** in die Geheimnisse des Abruf-Workers.
Nicht in die Web-App, nicht ins Verzeichnis, nicht in die Ablaufsteuerung
(FR-013, E-07).

---

## 1. Speicher anlegen

```bash
cd apps/reservierungs-abruf
npx wrangler kv namespace create RESERVIERUNGEN
```

Die ausgegebene Kennung in **beide** `wrangler.jsonc` eintragen — die des
Abruf-Workers und die von `apps/web`. Zwei Worker, ein Namensraum.

**Prüfen**:

```bash
npx wrangler kv namespace list
```

Der Namensraum steht in der Liste. (Ob zwei Worker sich denselben Namensraum
teilen können, war beim Planen nicht belegt — hier zeigt es sich. Schlägt die
zweite Bindung fehl, ist das der Punkt zum Innehalten, nicht zum Umgehen.)

---

## 2. Geheimnisse setzen

```bash
cd apps/reservierungs-abruf
npx wrangler secret put VF_APPKEY
npx wrangler secret put VF_USERNAME
npx wrangler secret put VF_PASSWORD
npx wrangler secret put VF_CID
```

**Prüfen**: `npx wrangler secret list` zeigt vier Einträge — **ohne Werte**.
Erscheint irgendwo ein Wert im Klartext, ist etwas falsch gelaufen.

---

## 3. Den Kern prüfen — ohne Netz

```bash
npx vitest run packages/reservierung-core
```

Läuft vollständig ohne Verbindung. Geht hier etwas nicht auf, hat es mit
Cloudflare und Vereinsflieger nichts zu tun — dann stimmt die Fachlogik nicht.

Erwartet werden Prüfungen für: leere Antwort, Einzeleintrag, lückenlose Kette,
mehrtägige Belegung, Zeitumstellung, Grenzen bei Beginn und Ende, verworfene
Einträge.

---

## 4. Den Abruf örtlich auslösen

```bash
cd apps/reservierungs-abruf
npx wrangler dev --test-scheduled
```

In einem **zweiten** Fenster:

```bash
curl "http://localhost:8787/__scheduled?cron=*/10+*+*+*+*"
```

**Prüfen — und hier genau hinsehen**:

```bash
npx wrangler kv key get stand --binding RESERVIERUNGEN --local
```

Es muss ein Eintrag dastehen, dessen `abgerufenAm` von eben ist.

> **Zwei Fallen** (E-05): Erstens erscheinen Konsolenausgaben des Workers
> **nicht**, wenn `wrangler dev` in eine Datei umgeleitet wird — wer so prüft,
> prüft ins Leere. Zweitens heißt `Ran scheduled event` nur, dass Wrangler
> ausgelöst hat, **nicht**, dass der eigene Handler es bekommen hat. Der einzige
> belastbare Nachweis ist der Eintrag im Speicher.

---

## 5. Den Fehlerfall prüfen

Das ist der Schritt, den man gern überspringt und später bereut.

Ein Geheimnis vorübergehend verfälschen (etwa `VF_PASSWORD` örtlich falsch
setzen), den Cron erneut auslösen, dann:

```bash
npx wrangler kv key get stand --binding RESERVIERUNGEN --local
```

**Erwartet**: Der Eintrag ist **unverändert** — dasselbe `abgerufenAm` wie
vorher. Kein leerer Stand, keine leere Liste (FR-004).

Danach das Geheimnis zurücksetzen.

---

## 6. Die Anzeige örtlich ansehen

```bash
cd apps/web
npx wrangler dev --port 8787
```

Dann `http://localhost:8787/d-eelk/reservierung/` aufrufen.

**Prüfen**:

- Ein Satz sagt frei oder belegt und den nächsten Wechsel (FR-007)
- Das Alter der Auskunft steht dabei (FR-009)
- **Kein Name** taucht auf (FR-006) — auch nicht im Quelltext der Seite; im
  Browser nachsehen, nicht nur im Sichtbaren
- Der Weg nach Vereinsflieger führt hin (FR-011)

---

## 7. In Betrieb nehmen

```bash
cd apps/reservierungs-abruf && npx wrangler deploy
```

Der erste Deploy muss **von Hand** kommen: `versions upload` in der
Ablaufsteuerung setzt einen bereits bestehenden Worker voraus (Erfahrung aus
Feature 045).

**Prüfen**:

```bash
npx wrangler deployments list
npx wrangler kv key get stand --binding RESERVIERUNGEN --remote
```

Dann **zehn Minuten warten** und den Speicher erneut lesen: `abgerufenAm` muss
sich bewegt haben. Erst dann läuft der Cron wirklich.

---

## 8. Verbrauch nachhalten

Nach einem vollen Tag:

```bash
npx wrangler kv key get stand --binding RESERVIERUNGEN --remote
```

`neuanmeldungen` betrachten. Erwartet wird eine kleine Zahl. Steht dort etwas
nahe an 144, wird bei jedem Durchgang neu angemeldet — dann ist die Rechnung aus
E-04 hinfällig und das Tageskontingent des Vereins in Gefahr (SC-003). Das ist
der Punkt, an dem der Takt vergrößert oder die Schlüsselhaltung überdacht werden
muss.

---

## Wenn etwas nicht geht

| Beobachtung | Wahrscheinliche Ursache |
|---|---|
| Kein Eintrag nach dem Cron | Der Handler läuft nicht — Konsole **im Vordergrund** ansehen, nicht in einer Datei |
| „Worker does not yet exist" | Erster Deploy fehlt; von Hand deployen |
| Anmeldung abgelehnt | `VF_CID` fehlt oder das Dienstkonto ist mehreren Vereinen zugeordnet |
| Zeiten um eine Stunde daneben | Ortszeitdeutung umgangen; die Quelle liefert **ohne** Zeitzone (E-09) |
| Port belegt | `lsof -ti :8787` kann **mehrere** PIDs liefern — alle beenden, sonst antwortet ein alter Server mit altem Stand |
