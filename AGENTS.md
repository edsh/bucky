# Projektkontext: Bucky Highfly

Diese Datei ist der werkzeugneutrale Einstiegspunkt für KI-Coding-Agenten
(Copilot CLI, Claude Code, ...) — bewusst dünn gehalten und kein Ort für
Projektinhalte (siehe Prinzip "Agent-Agnostic Project Knowledge" in der
Constitution). Verbindliche Inhalte liegen ausschließlich hier:

- **Projektüberblick (für Menschen):** `README.md`
- **Prinzipien/Leitplanken (verbindlich):** `.specify/memory/constitution.md`
  — wird unten automatisch eingebunden, nicht kopiert
- **Feature-Specs/Pläne/Tasks:** `specs/<NNN-feature>/`

Werkzeugspezifische Profildateien (z. B. `CLAUDE.md`) verweisen auf diese Datei,
statt eigene Kopien der Inhalte zu pflegen — so bleibt das Projekt möglichst
lange werkzeugunabhängig.

**Spec-Kit-Workflow:** Constitution → Specify → Plan → Tasks → Implement. Die
zugehörigen Skills liegen unter `.claude/skills/speckit-*` und werden von
Copilot CLI ebenfalls als Projekt-Skills geladen. Feature-Nummern werden über
GitHub-Issues vergeben (`create-new-feature.sh --number <issue-nummer>`).

**Vorschau vor dem Merge:** Bei allem, was das Aussehen oder die Bedienung der
Oberfläche verändert, gehört vor der Merge-Rückfrage eine Vorschau angeboten.
Liegt die Änderung bereits in einem Vorschlag, gibt es sie geschenkt: Die
Ablaufsteuerung lädt jeden Vorschlag nach `https://pr-<nummer>-bucky.edsh.workers.dev`
und schreibt die Adresse als Kommentar hinein. Sie ist auch vom Telefon aus
erreichbar — dafür ist sie da.

Für Zwischenstände, die noch in keinem Vorschlag liegen, bleibt der örtliche Weg:

```bash
npm run build
npx wrangler dev --config apps/web/wrangler.jsonc --port 8787 &
open http://localhost:8787/
```

`wrangler dev` braucht rund 40 Sekunden bis zur ersten Antwort. Ein
Bildschirmfoto des Agenten ersetzt die Vorschau nicht: Gestaltungsfragen
entscheidet, wer die Seite vor sich hat. Zum Schluss den Server über seine PID
beenden (`lsof -ti :8787`).

Für die Reservierungsseite reicht das nicht: Sie liest einen KV-Speicher, den
ein zweiter Worker füllt, und örtlich hat jeder Worker seinen eigenen. Der
gemeinsame Speicher kommt über `--persist-to` — Einzelheiten im Abschnitt „Der
zweite Worker" in `README.md`.

## Welches Sprachmodell für welchen Schritt

Die Modelle unterscheiden sich in Preis und Urteilskraft deutlich. Beides
durchgehend auf der teuersten Stufe zu fahren ist Verschwendung; alles auf der
günstigsten zu fahren rächt sich dort, wo Denkfehler entstehen. Deshalb:

**Das kleinere, günstigere Modell (z. B. Claude Sonnet) genügt, wenn das *Was*
bereits entschieden ist und nur das *Wie* auszuführen bleibt:**

- Aufgaben aus einer fertigen `tasks.md` abarbeiten (`/speckit-implement`)
- Prüfungen nach vorhandenem Muster ergänzen
- Prüfläufe fahren, Fehlermeldungen einordnen, Offensichtliches beheben
- Commit-Botschaften, Vorschlagstexte, Doku-Pflege
- Umbenennungen, Aufräumarbeiten, mechanische Umbauten

**Das größere Modell (z. B. Claude Opus) lohnt sich, wenn das *Was* oder das
*Warum* offen ist:**

- Klärungsgespräch und Spezifikation (`/speckit-clarify`, `/speckit-specify`) —
  hier entstehen die Denkfehler, die später teuer werden
- Planung und Architekturentscheidungen (`/speckit-plan`)
- Fehlersuche ohne klare Spur, besonders wenn die erste Erklärung nicht trägt
- Alles, was Verfassungsprinzip I berührt (sicherheitskritische Berechnung)
- Entscheidungen, bei denen eine Zusicherung aus einer früheren Spezifikation
  brechen könnte

Ein Beleg aus der Praxis: Bei der Suche nach einer angeblich falsch gecachten
Auskunft lag die erste Erklärung („eine Regel der Cloudflare-Zone schreibt den
Header um") daneben, und die zweite („das Bild fehlt live") ebenfalls. Erst das
beharrliche Nachmessen brachte die Wahrheit — Cloudflare liefert *während eines
Deploys* kurzzeitig 404, und der Jahres-Header stammte aus SvelteKits eigener
`_headers`. Solche Sackgassen zu erkennen, statt die erste plausible Geschichte
zu glauben, ist genau das, wofür sich das größere Modell rechnet.

**Der Agent schlägt den Wechsel von sich aus vor.** Wer weiß, unter welchem
Modell er läuft, sagt es beim Übergang zwischen den Schritten: vor dem
Abarbeiten einer fertigen `tasks.md` das Herunterschalten, vor Klärung, Planung
oder verworrener Fehlersuche das Heraufschalten. Der Vorschlag ist eine
Empfehlung, keine Selbstverständlichkeit — entschieden wird er vom Menschen.
Umgeschaltet wird in Copilot CLI mit `/model`.

@.specify/memory/constitution.md
