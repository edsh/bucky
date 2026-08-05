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

### Architektur (Startpunkt)

Tabellen + Interpolationslogik als kleiner **MCP-Server**, öffentlich per HTTPS
erreichbar, als Custom Connector in Claude nutzbar (claude.ai, Desktop, Mobile) –
kein eigenes App-Frontend nötig, um schnell mobil nutzbar zu sein. Eigenständiges
PWA-Frontend ist eine spätere Option, falls eigenes Branding/UI gewünscht ist.

## Entwicklungsmethodik

Dieses Projekt folgt [GitHub Spec Kit](https://github.com/github/spec-kit):

```
Constitution → Specify → Plan → Tasks → Implement
```

Alle Architektur- und Produktentscheidungen werden als versionierte Markdown-Dateien
im Repo festgehalten, anstatt in Chat-Verläufen zu verschwinden:

- [`.specify/memory/constitution.md`](.specify/memory/constitution.md) – Projektprinzipien und -leitplanken
- `specs/<NNN-feature-name>/` – Spezifikation, Plan und Tasks je Feature

Diese Dateien sind **agent-agnostisch** (reines Markdown). Werkzeugspezifische
Dateien wie `CLAUDE.md` (Claude Code) sind dünne Einstiegspunkte, die auf die
Constitution/Specs verweisen, statt Inhalte zu duplizieren.

## Status

Frühe Phase, Constitution noch nicht erstellt. Offene Fragen:

1. Tech-Stack (Frontend/Backend/Hosting)?
2. Authentifizierung/Rollenmodell für Vereinsmitglieder?
3. Wahl der Datenbank?
4. Wie fügt sich das POH-Modul (MCP-Server) sauber als eines von mehreren Modulen ein?
