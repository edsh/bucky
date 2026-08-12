# Tasks: Umzug nach Cloudflare Workers

**Feature**: 045 | **Branch**: `045-umzug-nach-cloudflare-workers`
**Eingaben**: [spec.md](./spec.md) · [plan.md](./plan.md) · [research.md](./research.md) · [quickstart.md](./quickstart.md)

## Lesehilfe

- `[P]` — kann parallel zur Nachbaraufgabe laufen (andere Datei, keine offene Abhängigkeit)
- `[US1]`/`[US2]`/`[US3]` — gehört zu dieser User Story aus der Spec

**Die Reihenfolge der Phasen ist hier nicht beliebig.** Phase 3 (Prüfstrecke)
steht bewusst **vor** allem, was veröffentlicht: Ab dann hält die Prüfung auch
das auf, was wir in den folgenden Phasen falsch machen. Und Phase 6 (die
Umstellung der Adresse) kommt **nach dem Merge**, weil erst dort veröffentlicht
wird.

---

## Phase 1: Setup

- [X] T001 In `apps/web/package.json` `@sveltejs/adapter-static` durch `@sveltejs/adapter-cloudflare` (^7.2.9) ersetzen und `wrangler` (^4.122.0) als Entwicklungsabhängigkeit aufnehmen; danach `npm install` und die Lockdatei mit übernehmen
- [X] T002 [P] `apps/web/wrangler.jsonc` anlegen: `$schema`, `name: "bucky"`, `compatibility_date`, Verweis auf das Bauergebnis des Adapters (`.svelte-kit/cloudflare`), Assets-Bindung — Vorlage in research.md E-02/E-03
- [X] T003 [P] `.gitignore` um `.wrangler/` ergänzen, damit der örtliche Zwischenstand nicht ins Repository gerät

---

## Phase 2: Grundlage — der Bau erzeugt etwas, das Cloudflare ausliefern kann

**Blockiert alles Weitere.** Ohne diese Phase gibt es nichts zu veröffentlichen.

- [X] T004 In `apps/web/svelte.config.js` den Adapter auf `adapter-cloudflare` umstellen und die `BASE_PATH`-Mechanik samt `paths.base` entfernen — sie diente allein GitHub Pages
- [X] T005 Prüfen, dass `apps/web/src/routes/+layout.ts` **unverändert** bleibt (`prerender`, `ssr`, `trailingSlash`) und der Bau weiterhin je Seite ein Verzeichnis mit `index.html` erzeugt; andernfalls ist FR-002 verletzt
- [X] T006 `npm run build` und danach `npx wrangler dev --config apps/web/wrangler.jsonc`; beide Seiten unmittelbar aufrufen (nicht nur über die Startseite)
- [X] T007 Klickpfad örtlich gegen den Wrangler-Server laufen lassen (`BASE=http://localhost:8787 node tests/ui/klickpfad.mjs`) — erwartet: 97 Prüfungen, 0 durchgefallen

**Prüfpunkt**: Der neue Ort liefert örtlich aus. Öffentlich ist bisher nichts angefasst.

---

## Phase 3 (US3, P1): Nichts Ungeprüftes geht live

**Ziel**: Die Prüfstrecke deckt das ab, was sie bisher nur auf dem Rechner des
Entwicklers abdeckte — Voraussetzung für FR-006.

**Unabhängig prüfbar**: Auf einem Zweig eine Prüfung absichtlich brechen; die
Ablaufsteuerung schlägt fehl.

- [X] T008 [US3] In `tests/ui/klickpfad.mjs` die Browserwahl über die Umgebung steuerbar machen (heute fest `channel: 'msedge'`); ohne gesetzte Variable bleibt das örtliche Verhalten **unverändert**, in der Ablaufsteuerung wird das mitgelieferte Chromium genutzt
- [X] T009 [US3] In `.github/workflows/ci.yml` nach dem Bau eine Stufe „Klickpfad" ergänzen: Playwright mit Chromium einrichten, Bauergebnis ausliefern, `node tests/ui/klickpfad.mjs`, Server danach beenden
- [X] T010 [US3] Node-Version in `.github/workflows/ci.yml` auf 24 anheben, damit geprüft und veröffentlicht wird, was dieselbe Laufzeit erzeugt hat; `engines` in der Wurzel-`package.json` mitziehen
- [ ] T011 [US3] Nachweisen, dass eine gebrochene Prüfung die Ablaufsteuerung rot macht — mit einer wegwerfbaren Änderung, die danach zurückgenommen wird

**Prüfpunkt**: Die 97 Klickpfad-Prüfungen laufen bei jedem Push mit.

---

## Phase 4 (US1, P1): Veröffentlichen — noch ohne die öffentliche Adresse

**Ziel**: Der Worker steht unter `workers.dev` und ist dort vollständig
abgenommen. Die öffentliche Adresse zeigt weiterhin auf GitHub Pages.

**Unabhängig prüfbar**: Der Klickpfad läuft grün gegen die `workers.dev`-Adresse.

- [ ] T012 [US1] **Von Hand (Nutzer)**: Cloudflare-Token nach Vorlage „Edit Cloudflare Workers" anlegen und mit der Konto-Kennung als Geheimnisse `CLOUDFLARE_API_TOKEN` und `CLOUDFLARE_ACCOUNT_ID` im Repository hinterlegen — ohne DNS-Recht, siehe research.md E-09
- [ ] T013 [US1] **Vor jeder Umstellung**: den Sollzustand der öffentlichen Seite festhalten — `BASE=https://bucky.edsh.de node tests/ui/klickpfad.mjs` sowie einen festen Satz Eingaben samt aller angezeigten Werte und Quellenangaben sichern (Grundlage für SC-001)
- [ ] T014 [US1] In `.github/workflows/ci.yml` die Aufgabe „veroeffentlichen" ergänzen: `needs: pruefen`, nur auf `main`, `cloudflare/wrangler-action@v4` mit `deploy`
- [ ] T015 [US1] `.github/workflows/pages.yml` löschen — sie ist der zweite Weg an der Prüfung vorbei, den FR-007 ausschließt
- [ ] T016 [US1] Einmalig von Hand `npx wrangler deploy` ausführen, damit der Worker vor dem Merge unter `bucky.<konto>.workers.dev` prüfbar ist (die Ablaufsteuerung veröffentlicht erst auf `main`)
- [ ] T017 [US1] Klickpfad gegen die `workers.dev`-Adresse laufen lassen und den festgehaltenen Eingabesatz von Hand vergleichen — jeder Wert muss Ziffer für Ziffer übereinstimmen (SC-001)

**Prüfpunkt**: Der neue Ort ist vollständig abgenommen. Die öffentliche Seite ist unverändert.

---

## Phase 5 (US2, P2): Vorschau je Änderungsvorschlag

**Ziel**: Wer einen Vorschlag eröffnet, bekommt eine Adresse zum Ansehen — auch
vom Telefon.

**Unabhängig prüfbar**: Am Änderungsvorschlag dieses Features selbst.

- [ ] T018 [US2] In `.github/workflows/ci.yml` die Aufgabe „vorschau" ergänzen: `needs: pruefen`, nur bei Änderungsvorschlägen, `wrangler versions upload --preview-alias pr-<nummer>`
- [ ] T019 [US2] Die entstandene Adresse als Kommentar in den Vorschlag schreiben; benötigte Rechte (`pull-requests: write`) im Workflow setzen
- [ ] T020 [US2] Prüfen, dass die Vorschau den öffentlichen Stand **nicht** verändert (FR-013) — `versions upload` veröffentlicht nicht, das ist am Stand der öffentlichen Adresse nachzuweisen
- [ ] T021 [US2] Falls Vorschau-Adressen im kostenlosen Tarif nicht verfügbar sind (research.md E-05, unsicher): den Befund in research.md nachtragen, die Aufgabe entfernen und den lokalen Weg in `AGENTS.md` stehen lassen

**Prüfpunkt**: Der Vorschlag zu diesem Feature trägt eine funktionierende Vorschau-Adresse.

---

## Phase 6 (US1, P1): Die Adresse umhängen — **nach dem Merge**

**Achtung**: Erst ausführen, wenn dieses Feature auf `main` liegt und die
Ablaufsteuerung dort einmal grün veröffentlicht hat. Diese Phase erzeugt die
angekündigte Lücke aus FR-016.

- [ ] T022 [US1] Umstellung ankündigen und in eine Zeit legen, zu der nicht geflogen wird (FR-016)
- [ ] T023 [US1] **Von Hand (Nutzer)**: in Cloudflare den DNS-Eintrag `bucky` auf `edsh.github.io` löschen, dann am Worker die Custom Domain `bucky.edsh.de` anlegen und die Ausstellung des Zertifikats abwarten — Schritt für Schritt in quickstart.md
- [ ] T024 [US1] Abnehmen: `BASE=https://bucky.edsh.de node tests/ui/klickpfad.mjs`, den festgehaltenen Eingabesatz vergleichen, einmal hart neu laden und prüfen, dass die gesicherten Einstellungen aus Feature 041 noch da sind (FR-004)
- [ ] T025 [US1] **Von Hand (Nutzer)**: GitHub Pages abschalten (Settings → Pages → Source: None), damit kein zweiter, veraltender Stand erreichbar bleibt (FR-017)

**Prüfpunkt**: `bucky.edsh.de` wird vom Worker ausgeliefert, und es gibt nur noch einen Stand.

---

## Phase 7: Dokumentation und Aufräumen

- [ ] T026 [P] `AGENTS.md`: den Absatz „Vorschau vor dem Merge" auf die Vorschau-Adresse umstellen; der lokale Server bleibt als Weg für Zwischenstände, die noch in keinem Vorschlag liegen
- [ ] T027 [P] `README.md`: Ort der Veröffentlichung, Rückweg (`wrangler rollback`) und die vereinheitlichte Node-Version beschreiben; Verweise auf GitHub Pages entfernen (FR-018)
- [ ] T028 [P] In `tests/ui/klickpfad.mjs` den Kopfkommentar an den neuen Ablauf anpassen — er beschreibt heute den Weg über `python3 -m http.server`
- [ ] T029 Vollständiger Prüflauf zum Abschluss: `npm run lint`, `npm run check --workspace @edsh-bucky/web`, `npx vitest run` (541), `npm run build`, Klickpfad gegen die öffentliche Adresse (97)

---

## Abhängigkeiten

```text
Phase 1 (Setup)
   └── Phase 2 (Grundlage)
          └── Phase 3 (US3 — Pruefstrecke)     ← muss vor allem Veroeffentlichen stehen
                 ├── Phase 4 (US1 — workers.dev)
                 │      └── Phase 6 (US1 — Adresse umhaengen, NACH dem Merge)
                 └── Phase 5 (US2 — Vorschau)
                        └── Phase 7 (Doku)
```

**Phase 4 und Phase 5 sind voneinander unabhängig** — beide setzen nur auf der
Prüfstrecke und den hinterlegten Geheimnissen auf. Sie ändern allerdings
dieselbe Datei (`.github/workflows/ci.yml`), taugen also nicht zum gleichzeitigen
Bearbeiten.

**Parallel bearbeitbar**: T002/T003 (Phase 1) und T026/T027/T028 (Phase 7).

---

## Kleinster sinnvoller Umfang

**Phasen 1 bis 4 und 6** ergeben den Umzug: Die Seite kommt von Cloudflare, alles
rechnet wie vorher. Die Vorschau (Phase 5) ist Bequemlichkeit und könnte
entfallen, ohne dass der Umzug unvollständig wäre.

**Nicht weglassen lässt sich Phase 3.** Ohne sie ist FR-006 nicht erfüllt, und
der Umzug hätte die einzige automatische Absicherung des Rechners
unverändert lückenhaft gelassen.
