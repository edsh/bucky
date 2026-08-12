# Phase 0 — Recherche: Umzug nach Cloudflare Workers

**Feature**: 045 | **Stand**: 2026-08-12

Alle Angaben wurden am 12.08.2026 an der offiziellen Cloudflare- und
SvelteKit-Dokumentation geprüft. Wo eine Quelle nicht eindeutig war, steht das
ausdrücklich dabei.

---

## E-01: Workers statt Pages

**Entscheidung**: Cloudflare **Workers mit Static Assets**, nicht Cloudflare
Pages.

**Begründung**: Cloudflare empfiehlt Workers seit April 2025 für neue Projekte;
Pages bekommt keine neuen Funktionen mehr. Ausschlaggebend ist aber nicht die
Empfehlung, sondern der Grund unseres Umzugs: **Cron Triggers gibt es bei Pages
gar nicht.** Wir ziehen ausschließlich deshalb um, weil wir zeitgesteuert
abrufen wollen (Prinzip V) — auf Pages zu landen hieße, in einem Jahr noch
einmal umzuziehen.

**Verworfen**: Cloudflare Pages. Vertrauter, aber ohne Cron und ohne Zukunft.

Quelle: https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/

---

## E-02: `@sveltejs/adapter-cloudflare` statt `adapter-static`

**Entscheidung**: Wechsel auf `@sveltejs/adapter-cloudflare` (7.2.9).

**Begründung**: Es ist der einzige empfohlene Adapter — `adapter-cloudflare-workers`
ist offiziell abgekündigt, `adapter-static` ist zwar weiterhin nutzbar, kennt
aber keine Server-Routen. Der Wechsel jetzt spart genau den zweiten Umbau, den
dieses Ticket vermeiden soll: Die Reservierung braucht eine Server-Route, und
die Grundlage dafür ist dann bereits einmal durch die volle Prüfstrecke
gelaufen.

**Wichtig — es bleibt statisch**: `prerender = true` und `ssr = false` bleiben
unverändert. Alle Seiten werden weiterhin vorgerendert; der Adapter ändert nur,
in welcher Form das Ergebnis abgelegt wird.

**Abgewogene Alternative**: `adapter-static` behalten und die Ausgabe als reine
Assets ausliefern. Das wäre der kleinstmögliche Eingriff und hätte einen realen
Vorteil: Anfragen auf reine Assets sind bei Cloudflare **kostenlos und
unbegrenzt**, während Anfragen, die Worker-Code ausführen, gegen die 100 000 je
Tag zählen. Dagegen steht: Bei Workers-with-Assets wird ein Treffer in den
Assets ohnehin direkt ausgeliefert, **ohne** den Worker aufzurufen — der
Kostenvorteil bleibt also weitgehend erhalten. Der doppelte Umbau wiegt
schwerer.

Quelle: https://svelte.dev/docs/kit/adapter-cloudflare

---

## E-03: `wrangler.jsonc` statt `wrangler.toml`

**Entscheidung**: `wrangler.jsonc`.

**Begründung**: Cloudflare empfiehlt es für neue Projekte seit Wrangler 3.91;
einzelne neuere Funktionen erscheinen nur noch für das JSON-Format. Zudem
erlaubt `$schema` die Prüfung im Editor.

Quelle: https://developers.cloudflare.com/workers/wrangler/configuration/

---

## E-04: Veröffentlichung und Vorschau in **einem** Workflow

**Entscheidung**: Der bestehende CI-Workflow bekommt zwei zusätzliche Aufgaben,
die beide `needs: pruefen` tragen — eine für die Vorschau (bei
Änderungsvorschlägen), eine für die Veröffentlichung (nur auf `main`). Der
Pages-Workflow entfällt ersatzlos.

**Begründung**: FR-007 verlangt, dass es **keinen** zweiten Weg an der Prüfung
vorbei gibt. Zwei getrennte Workflows könnten das nur über Umwege zusichern;
mit `needs` im selben Workflow ist es strukturell erzwungen — die
Veröffentlichung existiert gar nicht als eigenständig auslösbarer Vorgang.

Nebenbei behoben: Der alte Pages-Workflow baute mit **Node 24**, die CI prüft
mit **Node 22**. Veröffentlicht wurde also ein Bau, den so nie jemand geprüft
hat. Künftig eine Version an einer Stelle.

**Verworfen**: Cloudflare das Repository beobachten lassen. Bequemer und
unabhängig von GitHubs Warteschlange, aber es baut ohne Rücksicht auf die
Prüfungen — bei einem Rechner für Startstrecken nicht vertretbar (User Story 3).

Quelle: https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/

---

## E-05: Vorschau-Adresse je Änderungsvorschlag

**Entscheidung**: `wrangler versions upload --preview-alias pr-<nummer>` über
`cloudflare/wrangler-action@v4`; die entstandene Adresse wird als Kommentar in
den Vorschlag geschrieben.

**Begründung**: `versions upload` lädt eine Fassung hoch, **ohne** sie zu
veröffentlichen — der öffentliche Stand bleibt unberührt (FR-013). Der Alias
macht die Adresse vorhersagbar (`pr-45-bucky.<konto>.workers.dev`) statt an
einen wechselnden Kennzeichner gebunden; damit erfüllt sie FR-014 gleich mit:
Man sieht ihr an, dass sie eine Vorschau ist.

**Beim ersten Versuch geklärt** (12.08.2026): Der Tarif war nicht das Hindernis.
`versions upload` scheiterte an etwas anderem — *„You cannot upload a new version
of a Worker that does not yet exist. Please run the `deploy` command first."*
Eine Vorschau setzt also einen bereits bestehenden Worker voraus. Da die
Veröffentlichung nur auf `main` läuft, kann die Ablaufsteuerung diese Henne-Ei-
Lage im ersten Vorschlag nicht selbst auflösen; der Worker wurde einmalig von
Hand angelegt (T016). Ab dem zweiten Vorschlag stellt sich die Frage nicht mehr.

**Zweiter Stolperstein derselben Art**: Ein Konto ohne `workers.dev`-Subdomain
kann überhaupt nicht veröffentlichen. Wrangler verweist auf einen
`…/workers/onboarding`-Link, den es in der heutigen Oberfläche nicht mehr gibt —
die Subdomain wird in der Workers-Übersicht gesetzt. Ob eine besteht, beantwortet
`GET /accounts/<konto>/workers/subdomain` verlässlicher als die Fehlermeldung:
In unserem Fall behauptete Wrangler, es gebe keine, während die Schnittstelle
längst eine auswies. Sie wurde anschließend auf `edsh` geändert
(`bucky.edsh.workers.dev`); nach der Änderung steht das Zertifikat erst nach
einigen Minuten.

Quelle: https://developers.cloudflare.com/workers/wrangler/commands/

---

## E-06: Der Klickpfad zieht in die Prüfstrecke

**Entscheidung**: Die 97 Klickpfad-Prüfungen laufen künftig in der CI, gegen den
dort gebauten Stand — **nicht** gegen die Vorschau-Adresse.

**Begründung**: Ohne das ist FR-006 unerfüllbar. Heute prüft die CI Lint, Typen,
541 Tests und den Bau; der Klickpfad läuft ausschließlich auf dem Rechner des
Entwicklers. Ein Fehler, den nur er findet, hält nichts auf.

Gegen die Vorschau zu prüfen wäre verlockend, dreht aber die Reihenfolge um: Die
Vorschau entsteht erst **nach** der Prüfung. Prüfte man gegen sie, wäre bereits
etwas hochgeladen, bevor der Klickpfad urteilt.

**Zu ändern**: Der Klickpfad nimmt heute den Browser über `channel: 'msedge'`
aus dem System. Auf dem Bauknecht gibt es kein Edge; die Kanalwahl muss über die
Umgebung steuerbar werden, ohne den lokalen Weg zu verändern.

---

## E-07: Der Umstieg der Adresse ist ein Schnitt, kein Übergang

**Feststellung, keine Wahl**: Auf `bucky.edsh.de` liegt heute ein DNS-Eintrag
auf GitHub Pages. Cloudflare **weigert sich**, eine Custom Domain auf einen
Namen zu legen, für den bereits ein CNAME besteht — der alte Eintrag muss von
Hand weichen. Dazwischen liegt eine **kurze Nichterreichbarkeit**, zusätzlich
die Ausstellung des Zertifikats (einige Minuten).

**Folge für den Ablauf**: Der Worker wird vorher **vollständig** unter
`bucky.<konto>.workers.dev` geprüft — einschließlich Klickpfad gegen diese
Adresse. Erst wenn dort alles steht, wird geschnitten. FR-016 wurde daraufhin
angepasst: wenige Minuten, angekündigt, zu flugfreier Zeit.

**Richtig ist „Custom Domain", nicht „Route"**: Die Custom Domain legt Eintrag
und Zertifikat selbst an; eine Route setzt einen bestehenden Eintrag voraus.

Quelle: https://developers.cloudflare.com/workers/configuration/routing/custom-domains/

---

## E-08: Rückweg

**Entscheidung**: `wrangler rollback` bzw. `wrangler versions deploy <id>`.

**Fakten**: Die letzten **100** Fassungen bleiben erhalten, ein Rückschritt gilt
**sofort** und baut nichts neu. Grenzen: Was in einem Zwischenspeicher liegt,
wird nicht mit zurückgerollt, und gelöschte Bindungen lassen einen Rückschritt
scheitern. Beides betrifft uns heute nicht — wir haben noch keinen
Zwischenspeicher —, gehört aber in die Dokumentation, bevor es uns betrifft.

Quelle: https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/

---

## E-09: Zugangsschlüssel

**Entscheidung**: Ein Token nach der Vorlage **„Edit Cloudflare Workers"**,
hinterlegt als `CLOUDFLARE_API_TOKEN`; dazu `CLOUDFLARE_ACCOUNT_ID`. Beides als
Geheimnis im Repository, nichts davon in einer Datei (Prinzip V).

**Zu beachten**: Für das **Anhängen der Domain** braucht es zusätzlich
**Zone → DNS → Edit**, das die Vorlage nicht mitbringt. Dieses Recht ist
**einmalig** nötig und wird nicht dem Veröffentlichungs-Token gegeben: Die
Domain wird von Hand angehängt. Ein Token, das täglich in der CI liegt und
DNS-Einträge ändern darf, wäre unnötig mächtig.

---

## E-10: Grenzen des kostenlosen Tarifs

| Größe | Grenze | Unser Bedarf |
|---|---|---|
| Worker-Anfragen | 100 000/Tag | weit darunter |
| Anfragen auf Assets | **kostenlos, unbegrenzt** | der Normalfall |
| CPU-Zeit je Anfrage | 10 ms | nichts zu rechnen |
| Cron Triggers | 5 | später 1 |
| KV lesen | 100 000/Tag | später gering |
| KV schreiben | 1 000/Tag | später 144 (alle 10 min) |
| Assets je Fassung | 20 000 Dateien, je 25 MiB | zweistellige Zahl Dateien |

Die Grenzen sind für unseren Fall reichlich bemessen. Alles wird täglich um
00:00 UTC zurückgesetzt.

Quellen: https://developers.cloudflare.com/workers/platform/limits/ ·
https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/
