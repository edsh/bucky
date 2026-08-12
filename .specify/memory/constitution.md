<!--
Sync Impact Report
Version change: 1.4.0 → 1.5.0
Modified principles: none renamed or redefined
Added sections: Core Principle V. Serverseitige Anteile auf Cloudflare, mit
  geteiltem Zwischenspeicher — Laufzeitumgebung entschieden (war offene Frage
  "Backend/Hosting" im README-Status); fremde Schnittstellen werden zentral und
  zwischengespeichert abgerufen, Geheimnisse gehören nie ins Repo
Removed sections: none
Follow-up TODOs:
  - README.md — Status-Abschnitt: "Backend/Hosting?" ist keine offene Frage mehr
    (im selben Durchgang nachgezogen)
  - Das Reservierungs-Feature ist noch nicht spezifiziert; es ist der erste
    Anwendungsfall dieses Prinzips
Templates requiring updates:
  - ⚠ .specify/templates/plan-template.md — not yet checked against this version
  - ⚠ .specify/templates/spec-template.md — not yet checked against this version

Sync Impact Report (previous, 1.4.0)
Version change: 1.3.0 → 1.4.0
Modified principles: none renamed or redefined
Added sections: Core Principle IV. Shared Deterministic Core, Multiple Access
  Paths — die deterministische Berechnungslogik ist ein eigenständiges Kernmodul;
  SvelteKit-Server-Routes und ein MCP-Endpunkt sind dünne Adapter darüber
Removed sections: none
Follow-up TODOs:
  - README.md — Architektur- und Status-Abschnitt im selben Durchgang auf
    Prinzip IV nachgezogen (erledigt)
  - specs/001-kraftstoffrechner-d-eelk/plan.md — noch nicht erstellt; legt das
    konkrete Grundgerüst (Projektstruktur, Backend/Hosting, Testansatz) fest
Templates requiring updates:
  - ⚠ .specify/templates/plan-template.md — not yet checked against this version
  - ⚠ .specify/templates/spec-template.md — not yet checked against this version

Sync Impact Report (previous, 1.3.0)
Version change: 1.2.1 → 1.3.0
Modified principles: I. Deterministic Safety-Critical Calculations — materially
  expanded: digitization must capture a source reference (page number + table
  name) per table; every answer must cite that exact reference, not just
  "table/reference points" generically
Added sections: none
Removed sections: none
Follow-up TODOs: specs/001-kraftstoffrechner-d-eelk/spec.md — FR-001/FR-005/
  Key Entities updated in the same pass to require page+table-name capture and
  citation, to stay consistent with this amendment
Templates requiring updates:
  - ⚠ .specify/templates/plan-template.md — not yet checked against this version
  - ⚠ .specify/templates/spec-template.md — not yet checked against this version

Sync Impact Report (previous, 1.2.1)
Version change: 1.2.0 → 1.2.1
Modified principles: III. Svelte as Frontend Standard → III. SvelteKit as
  Frontend Standard (corrected technology choice: plain Svelte lacks routing/
  server-route support this multi-page, growing app needs; SvelteKit is the
  correct fit)

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
digitalisiert und gegen das Original doppelt geprüft werden. Bei der Digitalisierung
MUSS zu jeder Tabelle eine Quellenreferenz (Seitenzahl und Tabellenname/-bezeichnung
im Original-POH) mitgespeichert werden. Die Interpolation zwischen Tabellenwerten
(Luftdichte, Temperatur, Höhe, Gewicht) MUSS als deterministischer Code laufen. Ein
LLM DARF Tabellenwerte niemals aus dem Gedächtnis oder per freier Interpolation
erzeugen — es ruft die Berechnung ausschließlich als Tool auf. Jede Antwort MUSS die
verwendete(n) Tabelle(n) exakt referenzieren (Seitenzahl und Tabellenname aus dem
Original-POH) sowie die verwendeten Eckwerte nennen und den Hinweis enthalten, das
Ergebnis vor dem Flug gegen das Original-POH gegenzuchecken.

Rationale: Startstrecke, Kraftstoffreserve etc. sind sicherheitskritisch; ein
Interpolationsfehler des LLM ist bei diesen Werten nicht akzeptabel. Eine exakte
Quellenangabe (Seite + Tabellenname) macht die Vorflug-Prüfung gegen das
Original-POH erst praktikabel — ohne sie müsste der Pilot das gesamte Handbuch nach
der passenden Tabelle durchsuchen.

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

### IV. Shared Deterministic Core, Multiple Access Paths

Die deterministische Berechnungslogik (POH-Tabellenzugriff und Interpolation nach
Prinzip I) MUSS als eigenständiges, UI-freies Kernmodul implementiert werden, das
weder von SvelteKit noch von einem Chat-Protokoll abhängt. Zugangswege — mindestens
die SvelteKit-Oberfläche (Prinzip III) und ein MCP-Endpunkt für Chat-Agenten —
MÜSSEN dünne Adapter über genau diesem Kern sein. Ein Zugangsweg DARF Rechen-,
Interpolations- oder Rundungslogik weder duplizieren noch abweichend
reimplementieren. Die Quellenreferenz und der Prüfhinweis aus Prinzip I MÜSSEN vom
Kern geliefert und von jedem Zugangsweg unverändert an den Nutzer durchgereicht
werden.

Rationale: Beide Zugangswege sind gewollt — der MCP-Endpunkt macht die Funktion
sofort mobil im Chat nutzbar, die SvelteKit-App trägt Branding und die weiteren
Vereinsmodule. Sicherheitskritisch ist dabei, dass es nur *eine* Wahrheit für die
Berechnung gibt: zwei Implementierungen derselben Interpolation würden früher oder
später auseinanderlaufen und genau den Fehler erzeugen, den Prinzip I ausschließen
soll.

### V. Serverseitige Anteile auf Cloudflare, mit geteiltem Zwischenspeicher

Serverseitige Anteile von Bucky Highfly MÜSSEN auf Cloudflare Workers laufen;
der SvelteKit-Bau richtet sich danach. Eine erneute Hosting-Entscheidung pro
Feature findet nicht statt, solange diese Constitution nicht geändert wird.

Zugriffe auf fremde Schnittstellen mit begrenztem Aufrufkontingent — allen voran
Vereinsflieger mit 500 Aufrufen je Tag und Anwendungsschlüssel — MÜSSEN
**zentral und zeitgesteuert** erfolgen und in einem von allen Anfragen geteilten
Speicher abgelegt werden. Eine Anfrage aus der Oberfläche DARF keinen Aufruf der
fremden Schnittstelle auslösen; sie liest ausschließlich den Zwischenspeicher.
Die Zahl der Fremdaufrufe MUSS damit unabhängig vom Besucheraufkommen sein.

Zugangsdaten für fremde Dienste (Dienstkonten, Anwendungsschlüssel) DÜRFEN
niemals im Repository liegen, weder im Klartext noch verschleiert; sie gehören
in die Geheimnisverwaltung der Laufzeitumgebung. Persönliche Zugangsdaten von
Vereinsmitgliedern DÜRFEN weder abgefragt noch entgegengenommen oder
gespeichert werden.

Rationale: Ein Kontingent von 500 Aufrufen am Tag gilt für den ganzen Verein
zusammen. Würde jede Seitenansicht selbst abrufen, wäre der Dienst nach gut
hundert Sitzungen für alle gesperrt — und zwar auf eine Weise, die sich mit
wachsender Nutzung verschlimmert. Der geteilte Zwischenspeicher macht diesen
Fehler strukturell unmöglich statt ihn nur unwahrscheinlich zu machen. Dass
Mitglieder ihre eigenen Zugangsdaten nicht herausgeben müssen, ist kein
Nebeneffekt, sondern Bedingung: Eine Vereins-App, die nach fremden Passwörtern
fragt, erzieht ihre Nutzer zu genau dem Verhalten, das sie angreifbar macht.

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
und die Abweichung begründen. Aktuell sind fünf Kernprinzipien definiert (I–V);
weitere werden ergänzt, sobald sich echte, nicht verhandelbare Regeln aus der
Praxis ergeben — Platzhalter für ungenutzte Prinzipien werden nicht künstlich befüllt.

**Version**: 1.5.0 | **Ratified**: 2026-08-05 | **Last Amended**: 2026-08-12
