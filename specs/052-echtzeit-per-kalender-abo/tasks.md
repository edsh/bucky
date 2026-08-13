# Tasks: Reservierungsstand in Echtzeit über das Kalender-Abo

**Feature**: 052 | **Branch**: `052-echtzeit-per-kalender-abo`
**Input**: [spec.md](./spec.md), [plan.md](./plan.md), [data-model.md](./data-model.md),
[contracts/kalender-deuten.md](./contracts/kalender-deuten.md),
[contracts/api-reservierung.md](./contracts/api-reservierung.md),
[research.md](./research.md), [quickstart.md](./quickstart.md)

**Prüfungen**: Für den Kern ausdrücklich vorgesehen — wie in Feature 047 ist er
der einzige Teil, der sich ohne Netz und ohne Cloudflare vollständig prüfen
lässt, und er trägt die gesamte Fachlogik (Prinzip IV). Für die Anzeige der
bestehende Klickpfad, um neue Prüfungen ergänzt. Für den Netzabruf
(`kalender-holen.ts`) keine eigenen Prüfungen im Sinne von Unit-Tests, sondern
Nachweis gegen die echte Gegenstelle über quickstart.md — er enthält keine
Fachlogik, nur Holen, Warten, Weiterreichen.

**Wege**: Alle Pfade sind vom Verzeichnisstamm aus angegeben.

---

## Phase 1: Setup

- [X] T001 Geheimnis `KALENDER_ABO_URL` lokal bereitstellen (Umgebungsvariable,
      niemals in einer Datei dieser Ablage) und einmal manuell gegen die
      Gegenstelle prüfen — Vorgehen in quickstart.md, Nachweis 1
- [X] T002 [P] Echten Kalenderabzug als Prüfstoff in
      `packages/reservierung-core/tests/beispiele/kalender.ics` ablegen —
      **alle Personennamen durch erfundene ersetzt**, mit Herkunftsnotiz in
      `packages/reservierung-core/tests/beispiele/README.md` (dieselbe Datei
      wie in Feature 047, dort ergänzen statt anlegen)
- [X] T003 [P] Vorab prüfen und in `research.md` E-01 gegenzeichnen, dass der
      Kalenderabzug in T002 tatsächlich Sperren (`Grounding`) für die D-EELK
      enthält — sonst fehlt der Prüfstoff für User Story 3

---

## Phase 2: Foundational

**Sperrend für alle User Stories.** Ohne diese Grundlage kann keine Geschichte
umgesetzt werden.

- [X] T004 `Reservierung.beginn`/`.ende` in
      `packages/reservierung-core/src/typen.ts` auf ISO 8601 mit Zeitversatz
      umstellen (research.md E-04); `Quelle`-Typ (`'kalender' | 'rueckfall'`)
      ergänzen
- [X] T005 `ortszeitZuZeitpunkt` in `packages/reservierung-core/src/zeit.ts`
      um eine Gegenrichtung ergänzen (`zeitpunktAlsIsoMitVersatz` o. ä.), die
      einen `Date` als ISO-8601-Zeichenkette mit Versatz der Platzzone
      ausgibt — **ohne** die bestehende Auflösung der doppelten/übersprungenen
      Stunde zu verändern (research.md E-11)
- [X] T006 Prüfungen für T005 in
      `packages/reservierung-core/tests/zeit.test.ts` ergänzen: Sommerzeit,
      Winterzeit, und dass ein Wert mit Versatz beim erneuten Einlesen über
      `ortszeitZuZeitpunkt`-kompatible Wege denselben Zeitpunkt ergibt
- [X] T007 `belegung.ts` in `packages/reservierung-core/src/belegung.ts` auf
      das neue Zeitformat umstellen: Eine Angabe **mit** Versatz wird direkt
      geparst (`new Date(...)`), eine Angabe **ohne** Versatz weiterhin über
      `ortszeitZuZeitpunkt` gedeutet (data-model.md, Abschnitt
      „Verträglichkeit mit Altbeständen") — `endeDerKette` bleibt inhaltlich
      unverändert
- [X] T008 `antwort-deuten.ts` in
      `packages/reservierung-core/src/antwort-deuten.ts` anpassen: Die
      Umrechnung der Ortszeit-Angaben der Programmierschnittstelle in
      Zeitpunkte mit Versatz geschieht jetzt **beim Deuten**, nicht mehr erst
      in `belegung.ts` (research.md E-04, Abschnitt „Auswirkung auf den
      Bestand")
- [X] T009 Bestehende Prüfungen in
      `packages/reservierung-core/tests/antwort-deuten.test.ts` und
      `packages/reservierung-core/tests/belegung.test.ts` auf das neue Format
      umstellen und `npx tsc -p packages/reservierung-core` grün bekommen
      (`noUncheckedIndexedAccess` ist aktiv)

**Checkpoint**: Der Kern kennt das neue Zeitformat und rechnet mit ihm exakt so
wie zuvor mit dem alten. Alle bestehenden Prüfungen sind grün. Ab hier können
die User Stories beginnen.

---

## Phase 3: User Story 1 — Der Stand ist aktuell, nicht bis zu zehn Minuten alt (Priority: P1) 🎯 MVP

**Goal**: Die Anzeige liest den Reservierungsstand beim Aufruf unmittelbar aus
dem Kalender-Abo, statt aus einem alle zehn Minuten gefüllten Zwischenspeicher.

**Independent Test**: In Vereinsflieger eine Reservierung für die D-EELK
anlegen, die Seite ohne Wartezeit aufrufen und prüfen, ob sie bereits
erscheint (quickstart.md, Nachweis 7).

### Tests for User Story 1

- [ ] T010 [P] [US1] Prüfungen für `kalenderDeuten` in
      `packages/reservierung-core/tests/kalender-deuten.test.ts`:
      Grundfall (Reservierung, Sperre, aussortierter Nicht-Flugzeug-Eintrag),
      Weltzeit, Ortszeit ohne Kennung, ganztägiger Eintrag,
      maskierte Sonderzeichen, umbrochene Zeile (contracts/kalender-deuten.md)
- [ ] T011 [P] [US1] Der wichtigste Einzelfall zuerst und eigens benannt: eine
      Prüfung, dass `kalenderDeuten` bei einer Eingabe, die **kein** Kalender
      ist (z. B. eine HTML-Fehlerseite), **wirft** statt ein leeres Ergebnis zu
      liefern — in
      `packages/reservierung-core/tests/kalender-deuten.test.ts`
      (contracts/kalender-deuten.md, „Der entscheidende Unterschied")
- [ ] T012 [US1] Vertragsprüfung gegen den echten Abzug in
      `packages/reservierung-core/tests/kalender-vertrag.test.ts` — liest
      `tests/beispiele/kalender.ics` (T002), prüft Anzahl der Einträge für
      D-EELK, mindestens eine Sperre, keine aussortierten Ressourcen als
      Flugzeug. **Gegenprobe verlangt**: einmal eine `SUMMARY`-Zeile im Abzug
      verfälschen, prüfen dass die Prüfung rot wird, danach zurücknehmen
      (quickstart.md, Nachweis 2)

### Implementation for User Story 1

- [ ] T013 [US1] `kalenderDeuten` in
      `packages/reservierung-core/src/kalender-deuten.ts` erstellen:
      Zeilen zusammenfügen (umbrochene Fortsetzungen), `VEVENT`-Blöcke
      extrahieren, `SUMMARY`/`DTSTART`/`DTEND` lesen, Beschriftung in Art und
      Kennung zerlegen, Nicht-Flugzeuge aussortieren, Ergebnis als
      `Deutungsergebnis` liefern — netzfrei, ohne Namen im Ergebnis
      (contracts/kalender-deuten.md)
- [ ] T014 [US1] In `kalender-deuten.ts` das Erkennungsmerkmal für „kein
      Kalender" ergänzen (Prüfung auf `BEGIN:VCALENDAR` zu Beginn der
      Eingabe) und bei Fehlen werfen, **bevor** irgendein Eintrag verarbeitet
      wird
- [ ] T015 [US1] `kalenderDeuten` in
      `packages/reservierung-core/src/index.ts` ausführen; `Quelle`-Typ
      mit ausführen
- [ ] T016 [US1] Netzabruf in `apps/web/src/lib/server/kalender-holen.ts`
      erstellen: liest `platform.env.KALENDER_ABO_URL`, ruft mit 2 s
      Wartezeit ab (`AbortController`), reicht den rohen Text zurück oder
      wirft bei Zeitüberschreitung/Netzfehler/HTTP-Fehler — **kein**
      Fachlogik, keine Auswertung des Inhalts (research.md E-06, E-07)
- [ ] T017 [US1] Kurzlebige Randablage des Abrufs in `kalender-holen.ts`
      ergänzen (30 s, research.md E-08) — betrifft **ausschließlich** diesen
      Netzabruf, nicht die Antwort der Server-Route
- [ ] T018 [US1] `apps/web/src/routes/api/reservierung/+server.ts` umbauen:
      zuerst `kalenderHolen()` und `kalenderDeuten()` versuchen; bei Erfolg
      `quelle: 'kalender'`, `abgerufenAm: jetzt`; bei jedem Fehlschlag
      (Zeitüberschreitung, Netzfehler, kein gültiger Kalender) auf den
      bestehenden KV-Weg zurückfallen (contracts/api-reservierung.md)
- [ ] T019 [US1] Sicherstellen, dass ein Fehlschlag von T018 **nicht** in den
      KV-Speicher schreibt (FR-006) — Prüfung dafür in
      `apps/web/tests/` falls dort bereits ein Prüfrahmen für Server-Routen
      existiert, sonst als Vermerk in quickstart.md Nachweis 3 belassen
- [ ] T020 [P] [US1] Antwortstruktur um `quelle` erweitern — betrifft
      `apps/web/src/app.d.ts` (falls dort typisiert) und die Antwortformung
      in `+server.ts`
- [ ] T021 [US1] `apps/web/src/routes/d-eelk/reservierung/+page.svelte`: Alter
      und Zustand unverändert übernehmen; `quelle` aus der Antwort auslesen
      und für T029 (User Story 2) vorbereiten, ohne dort schon den Hinweis
      auszugeben (das gehört zu US2)

**Checkpoint**: Eine frisch angelegte Reservierung erscheint ohne Wartezeit auf
der Seite. Der bisherige Zwischenspeicher bleibt unberührt — User Story 1 ist
für sich lauffähig und liefert bereits den Kernnutzen.

---

## Phase 4: User Story 2 — Auch wenn die Quelle schweigt, bleibt eine Aussage übrig (Priority: P1)

**Goal**: Schlägt der Kalenderabruf fehl, zeigt die Seite den zuletzt
gespeicherten Stand mit ehrlichem Alter und einem zurückhaltenden Hinweis,
statt eine Fehlermeldung oder ein trügerisches „frei".

**Independent Test**: Die Abo-Adresse vorübergehend unbrauchbar machen und die
Seite aufrufen — der zuletzt gespeicherte Stand muss samt Hinweis erscheinen
(quickstart.md, Nachweis 3, Abschnitt „Rückfall").

### Tests for User Story 2

- [ ] T022 [P] [US2] Prüfung, dass eine Antwort, die kein gültiger Kalender
      ist (z. B. eine HTML-Seite mit Status 200), in der Server-Route als
      Fehlschlag behandelt wird und **nicht** zu `frei: true` ohne
      Datengrundlage führt — härtester Grenzfall aus contracts/api-reservierung.md
- [ ] T023 [P] [US2] Klickpfad-Prüfungen in `tests/ui/klickpfad.mjs`
      ergänzen: Rückfall bei abgefangener Fehlantwort zeigt „letzter bekannter
      Stand"; nach Rückkehr einer gültigen Antwort verschwindet der Hinweis
      ohne weiteres Zutun (Abnahmeszenario 5 der User Story 2 in spec.md) —
      Abfangregeln mit `page.route`/`page.unroute` sauber trennen (Lehre aus
      Feature 047)

### Implementation for User Story 2

- [ ] T024 [US2] Takt des bisherigen Abruf-Workers in
      `apps/reservierungs-abruf/wrangler.jsonc` von `*/10 * * * *` auf
      `*/30 * * * *` umstellen (research.md E-09) — Kommentar über die
      Verfallsgrenze von 60 Minuten ergänzen
- [ ] T025 [US2] In `+server.ts`: Bei Rückfall auf KV `quelle: 'rueckfall'`
      setzen und `abgerufenAm` aus dem gespeicherten Stand übernehmen, nicht
      aus der aktuellen Zeit
- [ ] T026 [US2] `formulieren.ts` in
      `packages/reservierung-core/src/formulieren.ts` um einen
      zurückhaltenden Zusatz „letzter bekannter Stand" erweitern — ohne
      Ursache, ohne Technik, ohne Schuldzuweisung (FR-019); nur ausgegeben,
      wenn `quelle === 'rueckfall'`
- [ ] T027 [US2] `+page.svelte` (`d-eelk/reservierung/`): Hinweis aus T026
      anzeigen, wenn `quelle === 'rueckfall'`; verschwindet beim nächsten
      erfolgreichen Laden von selbst
- [ ] T028 [US2] Fall „weder Kalender noch gespeicherter Stand" in
      `+server.ts` nachziehen: `{"stand": "fehlt", "quelle": "rueckfall"}`
      mit Status 200 (FR-008, bereits aus Feature 047 bestehend — hier nur
      um `quelle` ergänzen)

**Checkpoint**: Fällt die Gegenstelle vollständig aus, bleibt die Anzeige
ehrlich und nutzbar. User Stories 1 und 2 funktionieren zusammen: Echtzeit im
Regelfall, robuster Rückfall im Störfall.

---

## Phase 5: User Story 3 — Wartungssperren werden endlich sichtbar (Priority: P2)

**Goal**: Beruht eine Belegung auf einer Sperre (z. B. Werkstattaufenthalt),
benennt die Anzeige das ausdrücklich statt es als Reservierung auszugeben.

**Independent Test**: Einen Zeitraum prüfen, in dem im Kalender eine Sperre für
die D-EELK liegt, und nachsehen, ob die Anzeige sie als Sperre benennt.

### Tests for User Story 3

- [ ] T029 [P] [US3] Prüfung in
      `packages/reservierung-core/tests/kalender-deuten.test.ts`, dass ein
      `Grounding`-Eintrag als `art: 'sperre'` gedeutet wird (ergänzt T010,
      falls dort noch nicht abgedeckt)
- [ ] T030 [P] [US3] Klickpfad-Prüfung in `tests/ui/klickpfad.mjs`: Bei einer
      abgefangenen Antwort mit `art: 'sperre'` benennt die Seite eine Sperre,
      nicht eine Reservierung (bereits vorhandener Wortlaut aus FR-007a von
      Feature 047 wiederverwenden, nicht neu erfinden)

### Implementation for User Story 3

- [ ] T031 [US3] Prüfen, dass `formulieren.ts` den bestehenden Wortlaut aus
      FR-007a (Feature 047) unverändert auch für Sperren nutzt, die aus dem
      Kalender stammen — vermutlich **keine Codeänderung nötig**, nur
      Nachweis, dass der bestehende Pfad jetzt erstmals mit echten Daten
      durchlaufen wird

**Checkpoint**: Alle drei User Stories sind unabhängig voneinander nutzbar. Die
seit Feature 047 unbelegte Zusicherung FR-007a ist jetzt erstmals mit echten
Daten geprüft.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T032 [P] Überlastschutz aus T017 gegenprüfen: mehrere schnelle Aufrufe
      der Server-Route lösen nur einen tatsächlichen Netzabruf innerhalb von
      30 s aus (research.md E-08)
- [ ] T033 [P] `README.md` und `AGENTS.md` um den neuen Ablauf ergänzen:
      zweite Quelle, geändertes Zeitformat, neuer Takt des Abruf-Workers
- [ ] T034 CI (`.github/workflows/ci.yml`) prüfen, ob die neue Typprüfung
      (`npx tsc -p packages/reservierung-core` mit geändertem Zeitformat)
      weiterhin abgedeckt ist; keine neue Anmeldung an der
      Programmierschnittstelle in der Vorschau auslösen (unverändert aus
      Feature 047)
- [ ] T035 Vollständigen Prüfstand fahren: `npm run lint`, `npm test`,
      `npm run build`, `npm run check --workspace @edsh-bucky/web`,
      `npx tsc -p packages/reservierung-core`,
      `npx tsc -p apps/reservierungs-abruf`, Klickpfad örtlich
      (quickstart.md, Nachweis 5)
- [ ] T036 Geheimnis `KALENDER_ABO_URL` produktiv setzen
      (`npx wrangler secret put`), Abruf-Worker mit neuem Takt
      veröffentlichen, live nachweisen: `quelle: 'kalender'`, kein
      `cf-cache-status: HIT` (quickstart.md, Nachweis 6)
- [ ] T037 Von Hand am lebenden System nachweisen (quickstart.md, Nachweis 7):
      Reservierung anlegen, sofort auf der Seite sehen, wieder entfernen,
      Testreservierung **nicht** stehen lassen
- [ ] T038 Geheimnis-Kontrolle vor dem Zusammenführen: keine Abo-Adresse und
      keine echten Namen in der Versionsgeschichte (quickstart.md, Nachweis 8)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: keine Abhängigkeiten
- **Foundational (Phase 2)**: nach Setup — **sperrt** alle User Stories, weil
  das Zeitformat sich ändert und jede Story darauf aufbaut
- **User Story 1 (Phase 3)**: nach Foundational — liefert den Kernnutzen
  allein
- **User Story 2 (Phase 4)**: nach Foundational, **inhaltlich auf US1
  aufbauend** (der Rückfall greift erst, wenn es überhaupt einen
  Kalenderabruf gibt, von dem zurückgefallen werden kann) — abweichend vom
  Regelfall nicht unabhängig von US1, aber unabhängig **prüfbar**
- **User Story 3 (Phase 5)**: nach Foundational und nach US1 (braucht den
  Kalender-Deuter aus T013), unabhängig von US2
- **Polish (Phase 6)**: nach allen gewünschten User Stories

### Parallel Opportunities

- T002, T003 parallel zu T001
- T010, T011 parallel zueinander (unterschiedliche Prüffälle, dieselbe Datei —
  in **einer** Datei, aber unabhängige `it`-Blöcke; als [P] markiert im Sinne
  von „keine Code-Abhängigkeit", vor dem Committen zusammenführen)
- T020 parallel zu T016–T019 (unterschiedliche Dateien)
- T022, T023 parallel zueinander
- T029, T030 parallel zueinander
- T032, T033 parallel zueinander

---

## Implementation Strategy

### MVP zuerst (User Story 1 allein)

1. Phase 1 (Setup) und Phase 2 (Foundational) abschließen — **Phase 2 ist die
   kritischste**, weil sie das Zeitformat im ganzen Kern ändert
2. Phase 3 (User Story 1) umsetzen
3. **Stopp und Prüfung**: quickstart.md Nachweis 7 von Hand durchführen
4. Bereits hier liefert die Anzeige Echtzeit — aber noch **ohne** den
   robusten Rückfall. Für einen produktiven Zwischenstand ist Phase 4
   (User Story 2) vor der Veröffentlichung dringend angeraten, auch wenn P1
   und P1 beide „zuerst" bedeuten

### Empfohlene Reihenfolge

Da User Story 2 wie oben begründet nicht unabhängig von User Story 1 ist,
empfiehlt sich hier abweichend vom Regelfall die Reihenfolge **1 → 2 → 3**
statt eines parallelen Angriffs. User Story 3 lässt sich danach unabhängig
anhängen.

1. Setup + Foundational → Grundlage steht, altes Verhalten unverändert geprüft
2. User Story 1 → Echtzeit funktioniert, Rückfall noch nicht geprüft
3. User Story 2 → Robustheit hergestellt, **erst ab hier veröffentlichungsreif**
4. User Story 3 → Sperren sichtbar, wertvolle Ergänzung, kein Blocker
5. Polish → Inbetriebnahme und Nachweis am lebenden System

---

## Notes

- [P] = unterschiedliche Dateien oder unabhängige Prüffälle ohne Code-Abhängigkeit
- [Story]-Kennzeichnung ordnet jede Aufgabe eindeutig einer User Story zu
- Phase 2 ist ungewöhnlich stark sperrend, weil das Zeitformat feature-übergreifend
  ist (research.md E-04) — hier nicht abzukürzen
- Der gefährlichste Einzeltest des ganzen Features ist T011: Er verhindert, dass
  ein Ausfall der Gegenstelle als „alles frei" missverstanden wird
- Vor jedem Commit: `npx tsc -p packages/reservierung-core` — 
  `noUncheckedIndexedAccess` lässt Lint und Vitest grün sein, während `tsc`
  scheitert
- Klickpfad-Prüfungen dürfen nicht vom Speicherinhalt abhängen (Lehre aus
  Feature 047) — `page.route`/`page.unroute` je Block sauber trennen
- Die Abo-Adresse gehört in keine Datei dieser Ablage, keinen Commit, keinen
  Vorschlagstext — T038 ist deshalb keine Formsache
