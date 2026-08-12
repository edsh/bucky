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
Oberfläche verändert, gehört vor der Merge-Rückfrage eine Vorschau angeboten —
bauen, ausliefern, Browser öffnen:

```bash
npm run build
python3 -m http.server 8899 --directory apps/web/build &
open http://localhost:8899/
```

Ein Bildschirmfoto des Agenten ersetzt das nicht: Gestaltungsfragen entscheidet,
wer die Seite vor sich hat. Nach jeder Änderung neu bauen, der Server liefert
statische Dateien aus. Zum Schluss den Server über seine PID beenden
(`lsof -ti :8899`).

@.specify/memory/constitution.md
