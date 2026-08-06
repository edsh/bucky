# Bucky Highfly

Wingman-App des Luftsportvereins – offen für alles, was den Vereinsalltag
leichter macht.

- **Kurzform (App-Name/Icon):** Bucky
- **Vollform (Store-Listing, Startbildschirm):** Bucky Highfly

## Vision

Startpunkt ist ein einzelnes Feature (POH-Leistungsrechner, siehe unten), aber
Bucky Highfly soll mit der Zeit um weitere Funktionen wachsen, die Vereinsmitgliedern
den Alltag erleichtern (z. B. Buchungssystem, Wetterbriefing – noch nicht final
festgelegt). Als Datenbasis bleibt weiterhin **Vereinsflieger** im Einsatz; Bucky
ergänzt dessen Funktionsumfang, statt ihn zu ersetzen.

## Aktueller Fokus: Feature 1 – POH-Leistungsrechner

**Problem:** Das Flughandbuch (POH) enthält Leistungsdaten (Startstrecke,
Kraftstoffverbrauch, Landestrecke, Steigrate) in vielen Tabellen, gestaffelt nach
Luftdichte, Temperatur, Höhe und Gewicht.

**Ziel:** Ein Chat-Agent, der für konkrete Flugbedingungen die passenden Werte aus
dem Handbuch berechnet bzw. heraussucht.

### Kernprinzip (sicherheitsrelevant – nicht verhandelbar)

Das LLM interpoliert **keine** Tabellenwerte aus dem Gedächtnis. Die Tabellen werden
einmalig sorgfältig digitalisiert (JSON/CSV, gegen das Original geprüft); die
Interpolation läuft als **deterministischer Code**, das LLM ruft diesen nur als Tool
auf. Jede Antwort nennt die verwendete Tabelle/Eckwerte und den Hinweis, das Ergebnis
vor dem Flug gegen das Original-POH gegenzuchecken.

### Architektur

Die digitalisierten Tabellen und die Interpolationslogik bilden einen
eigenständigen, UI-freien **Berechnungskern**. Darüber liegen zwei dünne
Zugangswege (Constitution, Prinzip IV):

- ein **MCP-Endpunkt**, per HTTPS erreichbar und als Custom Connector in Claude
  nutzbar (claude.ai, Desktop, Mobile) – sofort mobil im Chat verfügbar
- die **SvelteKit-App** (Constitution, Prinzip III) mit eigener Eingabemaske,
  Branding und Platz für die weiteren Vereinsmodule

Beide rufen denselben Kern auf; Rechen- und Rundungslogik wird nicht dupliziert.
Quellenangabe (Seite + Tabellenname) und Prüfhinweis kommen aus dem Kern und
werden von beiden Zugangswegen unverändert durchgereicht.

## Entwicklungsmethodik

Dieses Projekt folgt [GitHub Spec Kit](https://github.com/github/spec-kit):

```
Constitution → Specify → Plan → Tasks → Implement
```

Alle Architektur- und Produktentscheidungen werden als versionierte Markdown-Dateien
im Repo festgehalten, anstatt in Chat-Verläufen zu verschwinden:

- [`.specify/memory/constitution.md`](.specify/memory/constitution.md) – Projektprinzipien und -leitplanken
- `specs/<NNN-feature-name>/` – Spezifikation, Plan und Tasks je Feature

Diese Dateien sind **agent-agnostisch** (reines Markdown). `AGENTS.md` ist der
werkzeugneutrale Einstiegspunkt für KI-Coding-Agenten; werkzeugspezifische Dateien
wie `CLAUDE.md` (Claude Code) sind dünne Verweise darauf, statt Inhalte zu
duplizieren.

## Status

Frühe Phase. Constitution liegt vor (v1.4.0), Feature 1 ist spezifiziert, die
POH-Tabellen der D-EELK sind digitalisiert und geprüft. Als Nächstes steht der
Implementierungsplan für Feature 1 an (`/speckit-plan`).

Entschieden: Frontend SvelteKit (Prinzip III), Architektur mit gemeinsamem
Berechnungskern und den Zugangswegen SvelteKit-UI und MCP-Endpunkt (Prinzip IV).

Offene Fragen:

1. Backend/Hosting?
2. Authentifizierung/Rollenmodell für Vereinsmitglieder?
3. Wahl der Datenbank?
4. Muster (Cessna 172N oder 172P) und Tankkonfiguration der D-EELK – bestimmt,
   welche POH-Tabellen gesichert anwendbar sind (siehe
   `data/poh/d-eelk/README.md`).
