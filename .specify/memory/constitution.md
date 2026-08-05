<!--
Sync Impact Report
Version change: 1.2.0 → 1.2.1
Modified principles: III. Svelte as Frontend Standard → III. SvelteKit as
  Frontend Standard (corrected technology choice: plain Svelte lacks routing/
  server-route support this multi-page, growing app needs; SvelteKit is the
  correct fit)
Added sections: none
Removed sections: none
Follow-up TODOs: none
Templates requiring updates:
  - ⚠ .specify/templates/plan-template.md — not yet checked against this version
  - ⚠ .specify/templates/spec-template.md — not yet checked against this version

Sync Impact Report (previous, 1.2.0)
Version change: 1.1.0 → 1.2.0
Modified principles: n/a
Added sections: Core Principle III. Svelte as Frontend Standard
Removed sections: none
Follow-up TODOs: README.md Status section — "Tech-Stack" open question narrowed
  to Backend/Hosting only (Frontend now decided here)

Sync Impact Report (previous, 1.1.0)
Version change: 1.0.0 → 1.1.0
Added sections: none (existing "Development Workflow" section materially expanded)
Modified guidance: Development Workflow — added GitHub-Issue-first feature
  numbering rule (issue number is the authoritative ID allocator; feature folder
  numbers must be created via `create-new-feature.sh --number <issue-nummer>`)

Sync Impact Report (previous, 1.0.0 — initial ratification)
Version change: [TEMPLATE] → 1.0.0
Added sections: Core Principles (I. Deterministic Safety-Critical Calculations,
  II. Vereinsflieger as System of Record), Agent-Agnostic Project Knowledge,
  Development Workflow, Governance
Removed sections: none (template placeholders III–V not used)
-->

# Bucky Highfly Constitution

## Core Principles

### I. Deterministic Safety-Critical Calculations (NON-NEGOTIABLE)

POH-Leistungsdaten (Startstrecke, Kraftstoffverbrauch, Landestrecke, Steigrate) MÜSSEN
einmalig sorgfältig aus dem Original-Flughandbuch in strukturierte Daten (JSON/CSV)
digitalisiert und gegen das Original doppelt geprüft werden. Die Interpolation
zwischen Tabellenwerten (Luftdichte, Temperatur, Höhe, Gewicht) MUSS als
deterministischer Code laufen. Ein LLM DARF Tabellenwerte niemals aus dem Gedächtnis
oder per freier Interpolation erzeugen — es ruft die Berechnung ausschließlich als
Tool auf. Jede Antwort MUSS die verwendete Tabelle/die Eckwerte nennen sowie den
Hinweis enthalten, das Ergebnis vor dem Flug gegen das Original-POH gegenzuchecken.

Rationale: Startstrecke, Kraftstoffreserve etc. sind sicherheitskritisch; ein
Interpolationsfehler des LLM ist bei diesen Werten nicht akzeptabel.

### II. Vereinsflieger as System of Record

Vereinsseitige Daten (Mitglieder, Buchungen, Flugzeuge) MÜSSEN weiterhin in
Vereinsflieger geführt werden. Bucky Highfly DARF diese Daten nicht redundant
vorhalten oder eigenständig verwalten; neue Funktionen MÜSSEN als Ergänzung
konzipiert werden (lesend/integrierend), nicht als Ersatz — sofern nicht künftig
explizit anders entschieden wird.

Rationale: Vermeidet Datenduplikate und Drift zwischen zwei Systemen und respektiert
bestehende Vereinsprozesse rund um Vereinsflieger.

### III. SvelteKit as Frontend Standard

Alle Frontend-Oberflächen von Bucky Highfly MÜSSEN mit SvelteKit umgesetzt werden,
projektübergreifend für alle Module. Eine erneute Tech-Stack-Entscheidung pro
Feature findet nicht statt, solange diese Constitution nicht geändert wird.

Rationale: Einheitlicher Frontend-Stack vermeidet Fragmentierung über mehrere
Vereins-Module hinweg und reduziert Wartungsaufwand. SvelteKit statt reinem
Svelte, da die App mehrseitig wächst (Routing) und serverseitige Logik
(z. B. die deterministische POH-Interpolation aus Prinzip I) benötigt.

## Agent-Agnostic Project Knowledge

Verbindliches Projektwissen (Prinzipien, Specs, Pläne) MUSS als werkzeugneutrales
Markdown unter `.specify/memory/constitution.md` bzw. `specs/<NNN-feature>/` geführt
werden — das ist die einzige Quelle der Wahrheit. Werkzeugspezifische Profildateien
(z. B. `CLAUDE.md` für Claude Code, oder künftige Äquivalente für andere Coding-
Agenten) DÜRFEN diese Inhalte nicht duplizieren; sie MÜSSEN als dünner Verweis auf
diese Dateien fungieren. `README.md` darf die Inhalte in eigenen Worten
zusammenfassen (das ist keine Duplikation im governance-relevanten Sinn, sondern
die für Menschen lesbare Einstiegsseite), MUSS aber bei inhaltlichen Änderungen mit
der Constitution konsistent gehalten werden.

Rationale: Das Projekt soll möglichst lange unabhängig von einem einzelnen
KI-Coding-Tool bleiben; Wissen, das nur in einer Tool-spezifischen Konfigurationsdatei
steht, ist faktisch an dieses Tool gebunden und geht bei einem Werkzeugwechsel verloren.

## Development Workflow

Features durchlaufen den Spec-Kit-Ablauf Constitution → Specify → Plan → Tasks →
Implement; jede Stufe wird als versioniertes Markdown unter `specs/<NNN-feature>/`
festgehalten. Änderungen, die über triviale Fixes hinausgehen, MÜSSEN diesen Ablauf
durchlaufen statt als unspezifiziertes "Vibe Coding" direkt implementiert zu werden.

Offene, noch nicht entschiedene Fragen (z. B. Tech-Stack, Auth/Rollenmodell,
Datenbankwahl) sind KEINE Constitution-Inhalte, solange sie unentschieden sind; sie
werden im Status-Abschnitt von `README.md` bzw. im jeweiligen Feature-Spec
(`/speckit-clarify`) geführt und wandern erst nach Entscheidung als Prinzip oder
Constraint hierher.

**Feature-Nummerierung via GitHub Issues:** Jedes Feature MUSS zuerst als GitHub
Issue angelegt werden (Titel = Feature-Name); die GitHub-Issue-Nummer ist die
verbindliche ID-Vergabestelle. Die Spec-Kit-Feature-Nummer MUSS der Issue-Nummer
entsprechen — beim Anlegen des Feature-Ordners MUSS `--number <issue-nummer>` an
`create-new-feature.sh` übergeben werden, statt die automatische, ordnerbasierte
Nummerierung zu verwenden. Lücken in der Nummernfolge (weil Issues und Pull
Requests sich denselben GitHub-Zähler teilen) sind erwartbar und kein Fehler.

Rationale: Lokale, ordnerbasierte Nummerierung kann bei parallelen, noch nicht
gemergten Branches kollidieren (zwei Branches ziehen unabhängig voneinander
dieselbe nächste Nummer). GitHub serialisiert Issue-Nummern zentral und liefert
zugleich einen Diskussions- und Statusort pro Feature.

## Governance

Diese Constitution hat Vorrang vor Einzelentscheidungen und Tool-Konventionen.
Änderungen erfolgen über `/speckit-constitution` und folgen Semantic Versioning:
MAJOR für unvereinbare Streichungen/Neudefinitionen bestehender Prinzipien, MINOR für
neue Prinzipien/Abschnitte, PATCH für Klarstellungen. Jede Änderung aktualisiert den
Sync-Impact-Report am Dateianfang. Pull Requests bzw. Specs, die gegen ein
Kernprinzip verstoßen oder es berühren, MÜSSEN das betroffene Prinzip referenzieren
und die Abweichung begründen. Aktuell sind drei Kernprinzipien definiert (I–III);
weitere werden ergänzt, sobald sich echte, nicht verhandelbare Regeln aus der
Praxis ergeben — Platzhalter für ungenutzte Prinzipien werden nicht künstlich befüllt.

**Version**: 1.2.1 | **Ratified**: 2026-08-05 | **Last Amended**: 2026-08-05
