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

@.specify/memory/constitution.md
