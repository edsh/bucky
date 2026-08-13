# Tasks: Reservierungsstand der D-EELK anzeigen

**Feature**: 047 | **Branch**: `047-reservierungsstand-der-d`
**Input**: [spec.md](./spec.md), [plan.md](./plan.md), [data-model.md](./data-model.md),
[contracts/reservierungsstand.md](./contracts/reservierungsstand.md),
[research.md](./research.md), [quickstart.md](./quickstart.md)

**Prüfungen**: Für den Kern ausdrücklich vorgesehen — er ist der einzige Teil,
der sich ohne Netz und ohne Cloudflare vollständig prüfen lässt, und er trägt
die gesamte Fachlogik (Prinzip IV). Für die Anzeige der bestehende Klickpfad.
Für den Abruf-Worker keine eigenen Prüfungen: Er enthält nach dem Zuschnitt
keine Fachlogik mehr, sondern nur Anmelden, Holen, Ablegen — das prüft man
gegen die echte Gegenstelle, nicht gegen Attrappen.

**Wege**: Alle Pfade sind vom Verzeichnisstamm aus angegeben.

---

## Phase 1: Setup

- [x] T001 Paketgerüst `packages/reservierung-core/` anlegen — `package.json`
      (Name `@edsh-bucky/reservierung-core`, `private`, `type: module`,
      `exports` auf `./src/index.ts`, Skripte `build` und `test`) und
      `tsconfig.json` nach dem Vorbild von `packages/deelk-poh-core/`
- [x] T002 Workerverzeichnis `apps/reservierungs-abruf/` anlegen —
      `package.json` und `apps/reservierungs-abruf/wrangler.jsonc` mit
      `main` auf `src/index.ts`, `compatibility_date`, Cron `*/10 * * * *`
      und der KV-Bindung `RESERVIERUNGEN` (Kennung zunächst als Platzhalter)
- [x] T003 [P] KV-Bindung `RESERVIERUNGEN` in `apps/web/wrangler.jsonc`
      ergänzen — **ohne** `main` anzufassen (research.md E-01: der Adapter
      überschreibt die Einstiegsdatei)

---

## Phase 2: Foundational

**Sperrend für alle User Stories.** Ohne diese Grundlage kann keine Geschichte
umgesetzt werden.

- [x] T004 Aufgezeichnete Antwort von `reservation/list/active` als Prüfstoff
      in `packages/reservierung-core/tests/beispiele/antwort-echt.json`
      ablegen — bereinigt, mit Herkunftsnotiz in
      `packages/reservierung-core/tests/beispiele/README.md`
      ✅ **erledigt am 13.08.2026** — 19 echte Einträge, Struktur unverändert,
      44 personenbezogene Werte durch `PLATZHALTER` ersetzt und gegengeprüft
- [x] T005 Typen der drei Größen in
      `packages/reservierung-core/src/typen.ts` nach data-model.md —
      `Reservierung` (genau `kennung`, `beginn`, `ende`, `art`), `Abrufstand`,
      `Belegungsauskunft`. Für `Reservierung` **kein** Feld für Personen
      vorsehen (Vertrag Abschnitt A)
- [x] T006 Zeitwerkzeug in `packages/reservierung-core/src/zeit.ts` —
      `YYYY-MM-DD HH:MM:SS` ohne Zeitzone als `Europe/Berlin` deuten und
      umgekehrt formatieren, über `Intl`, ohne eigene Stundenrechnung (E-09)
- [x] T007 Prüfungen für das Zeitwerkzeug in
      `packages/reservierung-core/tests/zeit.test.ts` — Sommerzeit,
      Winterzeit und **ein Zeitraum über die Umstellung hinweg**
- [x] T008 Ausfuhr in `packages/reservierung-core/src/index.ts` sammeln und
      `packages/reservierung-core` als Abhängigkeit in `apps/web/package.json`
      und `apps/reservierungs-abruf/package.json` eintragen

**Prüfpunkt**: `npx vitest run packages/reservierung-core` läuft grün, ohne
dass je eine Netzverbindung nötig war.

---

## Phase 3: User Story 1 — Ist die D-EELK gerade frei? (P1) 🎯 MVP

**Ziel**: Ein Mitglied liest ohne Anmeldung in einem Satz, ob die D-EELK frei
ist und wann sich das ändert — ohne dass ein Name erscheint.

**Unabhängig prüfbar**: Seite aufrufen und die Aussage gegen den
Reservierungskalender in Vereinsflieger halten.

### Kern

- [x] T009 [P] [US1] Prüfungen für das Deuten der Antwort in
      `packages/reservierung-core/tests/antwort-deuten.test.ts` —
      objektindizierte Form, `httpstatuscode` überspringen, leere Antwort als
      **gültiges** Ergebnis mit leerer Liste, Einzeleintrag, unbrauchbarer
      Eintrag wird verworfen ohne den Abruf zu verwerfen
- [x] T010 [P] [US1] Prüfungen für die Belegungsableitung in
      `packages/reservierung-core/tests/belegung.test.ts` — frei, belegt,
      Grenze genau auf `beginn` (belegt), Grenze genau auf `ende` (frei),
      **lückenlose Kette** (Wechsel erst nach der letzten Belegung),
      überlappende Belegungen, Spalt von Minuten als echte Lücke, mehrtägige
      Belegung, keine Reservierung für die Kennung, **Sperre belegt ebenso**,
      **Kette aus Sperre und anschließender Reservierung**, `art` der laufenden
      Belegung wird durchgereicht
- [x] T011 [US1] `packages/reservierung-core/src/antwort-deuten.ts` — die
      objektindizierte Antwort in `Reservierung[]` überführen, Kennung
      vereinheitlichen, `type` auf `art` abbilden, Einträge ohne
      Luftfahrzeugkennzeichen verwerfen (FR-003a), alle übrigen Felder der
      Quelle fallen lassen, Zähler der verworfenen Einträge führen
- [x] T012 [US1] `packages/reservierung-core/src/belegung.ts` —
      `belegungsauskunft(stand, kennung, bezugszeitpunkt)` nach den Regeln aus
      data-model.md. Der Bezugszeitpunkt wird **übergeben**, nie geholt
- [x] T013 [US1] `packages/reservierung-core/src/formulieren.ts` — aus der
      Auskunft den deutschen Satz mit Wochentag und Uhrzeit in Ortszeit; bei
      einer Sperre **„Gesperrt bis …"** statt „Belegt bis …" (FR-007a)
- [x] T013a [P] [US1] Prüfungen für die Formulierung in
      `packages/reservierung-core/tests/formulieren.test.ts` — frei mit und
      ohne nächste Belegung, belegt, **gesperrt**, mehrtägig mit Wochentag

### Abruf

- [x] T014 [US1] Anmeldung in `apps/reservierungs-abruf/src/anmeldung.ts` —
      `accesstoken` holen, Kennwort per `crypto.subtle.digest('MD5', …)`
      (E-02), Zugangsschlüssel wiederverwenden und nur bei Ablehnung einmalig
      erneuern (E-04), Neuanmeldungen zählen
- [x] T015 [US1] `apps/reservierungs-abruf/src/index.ts` mit `scheduled()` —
      anmelden, `reservation/list/active` holen, durch den Kern schicken,
      `Abrufstand` unter dem Schlüssel `stand` ablegen. **Keine eigene
      Fachlogik** in dieser Datei
- [x] T016 [US1] Örtlich auslösen und belegen: `wrangler dev --test-scheduled`
      plus `curl "http://localhost:8787/__scheduled?cron=*/10+*+*+*+*"`, dann
      `wrangler kv key get stand --binding RESERVIERUNGEN --local`. Nur der
      Eintrag im Speicher zählt als Nachweis — Konsole **im Vordergrund**
      ansehen (E-05)

### Anzeige

- [x] T017 [US1] Server-Route `apps/web/src/routes/api/reservierung/+server.ts`
      mit `export const prerender = false` — Speicher über `platform.env`
      lesen, Kern mit dem Jetzt-Zeitpunkt aufrufen, Antwort nach
      contracts/reservierungsstand.md Abschnitt B ausgeben. Nur `GET`
- [x] T018 [US1] Seite
      `apps/web/src/routes/d-eelk/reservierung/+page.svelte` — den Satz
      anzeigen, schlicht, kein Kalender, kein Raster
- [x] T019 [P] [US1] Verweis auf die neue Seite von der Startseite
      `apps/web/src/routes/+page.svelte`
- [x] T020 [US1] Klickpfad-Prüfungen in `tests/ui/klickpfad.mjs` ergänzen —
      Satz vorhanden, Zustand genannt, nächster Wechsel genannt, und
      ausdrücklich: **kein Personenname im Quelltext der Seite**, nicht nur im
      Sichtbaren, und **kein `PLATZHALTER`** (der Prüfstoff macht ein
      Durchrutschen so sofort sichtbar)

**Prüfpunkt US1**: Der Klickpfad ist grün; die Aussage stimmt mit dem
Reservierungskalender in Vereinsflieger überein (SC-002); keine Anmeldung
nötig (SC-001).

---

## Phase 4: User Story 2 — Verlässlich statt aktuell um jeden Preis (P2)

**Ziel**: Eine Auskunft beansprucht nie mehr Vertrauen, als sie verdient.

**Unabhängig prüfbar**: Die Quelle künstlich unerreichbar machen; die Seite
zeigt den letzten Stand mit sichtbarem Alter statt einer Fehlermeldung.

- [x] T021 [P] [US2] Prüfungen für Alter und Verfall in
      `packages/reservierung-core/tests/verfall.test.ts` — frisch, veraltet,
      genau an der Grenze
- [x] T022 [US2] Verfallsgrenze und Altersberechnung im Kern
      (`packages/reservierung-core/src/verfall.ts`) — der Kern gibt die Grenze
      vor, nicht die Anzeige (Prinzip IV)
- [x] T023 [US2] Fehlerverhalten in
      `apps/reservierungs-abruf/src/index.ts` — ein misslungener oder
      unverständlicher Durchgang **schreibt nicht** (FR-004). Ein einzelner
      kaputter Eintrag dagegen verwirft nur sich selbst
- [x] T024 [US2] Fall „kein Stand vorhanden" in der Server-Route —
      `{"stand": "fehlt"}` **ohne** Fehlerstatus (Vertrag Fall 2). Das ist ein
      gültiges Ergebnis, kein Ausfall
- [x] T025 [US2] Anzeige um Alter, Veraltet-Kennzeichnung und den Fall ohne
      Stand erweitern in
      `apps/web/src/routes/d-eelk/reservierung/+page.svelte` — bei fehlendem
      Stand offen sagen, dass keine Auskunft möglich ist, und **nicht**
      behaupten, das Flugzeug sei frei (FR-010)
- [x] T026 [US2] Fehlerfall örtlich belegen: ein Geheimnis verfälschen, Cron
      auslösen, Speicher lesen — `abgerufenAm` muss **unverändert** sein
      (quickstart.md Schritt 5), danach zurücksetzen
- [x] T027 [US2] Klickpfad-Prüfungen für Alter, Veraltet-Kennzeichnung und den
      Fall ohne Stand in `tests/ui/klickpfad.mjs`

**Prüfpunkt US2**: SC-004 belegt — bei ausgefallener Quelle bleibt die Seite
auskunftsfähig und die Auskunft erkennbar alt.

---

## Phase 5: User Story 3 — Von der Auskunft zur Buchung (P3)

**Ziel**: Die Auskunft endet nicht in einer Sackgasse.

**Unabhängig prüfbar**: Den Verweis anklicken und in Vereinsflieger landen.

- [ ] T028 [US3] Deutlich benannter Weg nach Vereinsflieger auf
      `apps/web/src/routes/d-eelk/reservierung/+page.svelte`, samt Hinweis,
      dass dort verbindlich gebucht wird (FR-011)
- [ ] T029 [US3] Klickpfad-Prüfung für Vorhandensein und Ziel des Verweises in
      `tests/ui/klickpfad.mjs`

---

## Phase 6: Polish & Inbetriebnahme

- [ ] T030 [P] Vertragsprüfung in
      `packages/reservierung-core/tests/vertrag.test.ts` — die ausgelieferte
      Antwort enthält **ausschließlich** die in
      contracts/reservierungsstand.md Abschnitt B genannten Felder — geprüft
      gegen den **echten** Prüfstoff aus T004. Ein neues Feld muss diese
      Prüfung umwerfen, nicht stillschweigend durchrutschen
- [ ] T031 [P] `apps/reservierungs-abruf` in `.github/workflows/ci.yml`
      aufnehmen — zweiter Veröffentlichungsschritt neben `apps/web`
- [ ] T032 [P] `README.md` und `AGENTS.md` um den zweiten Worker, den
      KV-Namensraum und die Geheimnisse ergänzen
- [ ] T033 Vollständiger Prüflauf: `npm test`, `npm run lint`,
      `npm run build`, Klickpfad
- [ ] T034 Inbetriebnahme nach quickstart.md Schritte 1, 2 und 7 — KV-Namensraum
      anlegen, Geheimnisse setzen, ersten Deploy **von Hand** (`versions
      upload` setzt einen bestehenden Worker voraus)
- [ ] T035 Ersten echten Durchlauf beobachten: nach zehn Minuten den Speicher
      erneut lesen, `abgerufenAm` muss sich bewegt haben. Veröffentlichen
      allein ist kein Nachweis
- [ ] T036 Nach einem vollen Tag `neuanmeldungen` im gespeicherten Stand
      betrachten und gegen SC-003 halten. Eine Zahl nahe 144 bedeutet, dass die
      Rechnung aus E-04 nicht aufgeht und der Takt vergrößert werden muss

---

## Abhängigkeiten

```text
Phase 1 (Setup)
   └─> Phase 2 (Foundational)  ← sperrend für alles Weitere
          ├─> Phase 3 (US1, P1)  ← MVP, für sich lieferbar
          │      ├─> Phase 4 (US2, P2)   baut auf der Anzeige aus US1 auf
          │      └─> Phase 5 (US3, P3)   baut auf der Anzeige aus US1 auf
          └─> Phase 6 (Polish)  ← nach US1; T030 kann früher
```

**US2 und US3 sind untereinander unabhängig** und könnten in beliebiger
Reihenfolge oder nebeneinander entstehen. Beide setzen aber die Seite aus US1
voraus — ohne Auskunft gibt es weder ein Alter zu kennzeichnen noch einen
Weiterweg anzubieten.

## Was nebeneinander laufen kann

**In Phase 2**: T004 (Prüfstoff) und T005 (Typen) — verschiedene Dateien.

**In Phase 3**: T009, T010 und T013a (Prüfungen, verschiedene Dateien) vor
T011/T012/T013. Danach ist die Kette eng: T011 → T012 → T013 → T015 → T017 → T018,
weil jeder Schritt auf der Ausfuhr des vorigen aufsetzt.

**In Phase 6**: T030, T031 und T032 berühren getrennte Dateien.

## Empfohlener Zuschnitt

**MVP ist Phase 1–3.** Damit steht die Frage beantwortet, um die es geht. Die
Anzeige wäre dann noch ohne Altersangabe — deshalb ist US2 kein Beiwerk,
sondern die erste Ergänzung, die folgen sollte: Eine Auskunft ohne erkennbares
Alter behauptet mehr Aktualität, als sie hat.

## Anmerkungen

- **T016 und T026 sind Nachweise, keine Umsetzungsschritte.** Sie stehen
  ausdrücklich in der Liste, weil beide Fälle sich der Beobachtung entziehen:
  Ein Cron, der nicht läuft, sieht aus wie ein Cron, der nichts zu tun fand;
  ein Fehlerfall, der doch schreibt, fällt erst auf, wenn jemand wegen einer
  leeren Auskunft zum Platz fährt.
- **Vom Nutzer gebraucht**: `VF_APPKEY`, `VF_USERNAME`, `VF_PASSWORD` für T034.
  Sie liegen örtlich in `tools/vereinsflieger-api/http-client.private.env.json`.
  **`VF_CID` wird nicht gebraucht** — siehe unten.
- **Beim Erzeugen des Prüfstoffs gelernt** (betrifft T014): Der
  `PHPSESSID`-Keks aus dem `accesstoken`-Aufruf **muss** beim `signin`
  mitgeschickt werden, und `cid` darf **nicht** mitgeschickt werden. Sonst
  antwortet die Anmeldung mit `403 Wrong User or wrong Password` — eine
  Meldung, die die Suche in die falsche Richtung schickt.
- **Offen und beim Bauen zu klären** (T001/T003): ob zwei Worker denselben
  KV-Namensraum binden können. Sehr wahrscheinlich ja, KV ist kontoweit — aber
  unbelegt. Schlägt es fehl, ist das ein Punkt zum Innehalten, nicht zum
  Umgehen.
- **Beim Bauen des Workers gelernt** (betrifft T015): Die Workers-Laufzeit
  deutet **jeden benannten Export der Einstiegsdatei** als Einstiegspunkt. Eine
  exportierte Konstante lässt den Start scheitern mit `Incorrect type for map
  entry '…': the provided value is not of type 'function or ExportedHandler'`.
  Deshalb trägt `src/index.ts` nur den Standard-Export; alles Übrige liegt in
  `src/abruf.ts`.
- **Beim Nachweisen gelernt** (betrifft T016/T026): `wrangler kv key put`
  verlangt bei einer Bindung mit `id` **und** `preview_id` ausdrücklich
  `--preview false` (beim `get` nicht). Für T026 genügt es nicht, das Kennwort
  zu verfälschen — der abgelegte Zugangsschlüssel funktioniert ja weiter. Er
  muss zusätzlich ungültig gemacht werden, sonst prüft man gar nicht den
  Fehlerfall.
- **Örtlich teilen sich die beiden Worker den Speicher nicht von allein.**
  Wrangler legt den nachgebildeten KV unter dem jeweiligen App-Verzeichnis ab.
  Damit die Weboberfläche sieht, was der Abruf-Worker geschrieben hat:
  `npx wrangler dev --persist-to ../reservierungs-abruf/.wrangler/state` aus
  `apps/web`. In Betrieb stellt sich die Frage nicht, dort zählt die Kennung
  des Namensraums.
- **Die Reihenfolge im Avatar-Menü wurde entschieden** (betrifft T019): Die
  Reservierung steht **vor** dem POH-Rechner — die Frage „ist sie überhaupt
  frei?" kommt vor der Flugplanung. Der Rechner kostet damit einen
  Tastaturanschlag mehr; Klickpfad-Prüfung 91 ist entsprechend angepasst.
  Dabei fiel auf, dass das Menü nie eine Pfeiltastensteuerung hatte — bei
  einem Eintrag unsichtbar, bei zweien ein Mangel. Sie wurde ergänzt.
