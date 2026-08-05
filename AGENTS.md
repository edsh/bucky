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

@.specify/memory/constitution.md
