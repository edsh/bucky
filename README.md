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

- ein **MCP-Server**, derzeit lokal über stdio; ein per HTTPS erreichbarer
  Endpunkt als Custom Connector in Claude (claude.ai, Desktop, Mobile) ist das
  Ziel, aber noch nicht umgesetzt
- die **SvelteKit-App** (Constitution, Prinzip III) mit eigener Eingabemaske,
  Branding und Platz für die weiteren Vereinsmodule

Beide rufen denselben Kern auf; Rechen- und Rundungslogik wird nicht dupliziert.
Quellenangabe (Seite + Tabellenname) und Prüfhinweis kommen aus dem Kern und
werden von beiden Zugangswegen unverändert durchgereicht.

### Eingaben: Höhe über dem Meeresspiegel, nicht Druckhöhe

Angegeben werden Platzhöhe und Reiseflughöhe über dem Meeresspiegel sowie das
QNH — beides steht auf der Karte bzw. im Wetterbericht. Die Druckhöhe, mit der
die Handbuchtabellen arbeiten, errechnet der Kern daraus nach der
barometrischen Höhenformel der ICAO-Standardatmosphäre (ICAO Doc 7488). Sie ist
damit die einzige Größe, die nicht aus dem Flughandbuch stammt; das Ergebnis
weist sie deshalb getrennt aus, zusammen mit dem Abstand zur verbreiteten
Faustformel von 30 ft je hPa. Aus dieser Faustformel entsteht in größerer Höhe
ein Unterschied von über hundert Fuß — wer im Kopf überschlägt, soll das nicht
für einen Rechenfehler halten.

## Veröffentlichte Oberfläche

<https://edsh.github.io/bucky/>

Jeder Push auf `main` baut das statische Bundle und veröffentlicht es
(`.github/workflows/pages.yml`). Der Basispfad kommt aus
`actions/configure-pages`, damit die internen Verweise unter `/bucky/`
ebenso tragen wie lokal unter `/`.

## Bauen und starten

Voraussetzung ist Node 22 oder neuer.

```bash
npm ci
npm test
npm run lint
npm run build
```

`npm ci` holt die Abhängigkeiten aller Workspaces, `npm test` prüft Kern und
MCP-Adapter, `npm run build` erzeugt Typprüfung des Kerns, statisches
Web-Bundle und MCP-Bundle.

Die Erklärungen stehen bewusst nicht als Kommentar hinter den Befehlen. Reicht
eine Umgebung das `#` an npm weiter, statt es als Kommentar zu verwerfen,
landet es bei `vite build` als positionsabhängiges Argument — Vite liest es
dann als Projektwurzel und meldet `apps/web/#`.

Die Weboberfläche im Entwicklungsmodus:

```bash
npm run dev --workspace @edsh-bucky/web
```

Der MCP-Server läuft über stdio und muss vor dem ersten Start gebaut werden
(`npm run build`). Der Kern ist ein Quellpaket ohne Emit; `apps/mcp` wird
deshalb zu einer einzelnen Datei gebündelt, die Node direkt ausführen kann.
Eintrag in ein MCP-fähiges Werkzeug (Claude Desktop, VS Code, Copilot CLI):

```json
{
  "mcpServers": {
    "bucky-deelk-poh": {
      "command": "node",
      "args": ["<Pfad zum Repo>/apps/mcp/dist/server.js"]
    }
  }
}
```

Der Server stellt zwei Werkzeuge bereit: `compute_fuel_plan` berechnet den
Kraftstoffbedarf, `list_poh_tables` nennt die digitalisierten Tabellen mit
Seitenzahl und bekannten Widersprüchen. Rohtabellen zum Selberrechnen gibt er
bewusst nicht heraus.

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

Constitution liegt vor (v1.4.0). Feature 1 ist spezifiziert, geplant und
implementiert: die POH-Tabellen der D-EELK sind digitalisiert, der
Berechnungskern rechnet den Kraftstoffbedarf mitsamt Rechenweg und
Quellenangaben, beide Zugangswege stehen. Offen ist die Stichprobe der
digitalisierten Werte gegen das gedruckte Handbuch durch einen Menschen.

Entschieden: Frontend SvelteKit (Prinzip III), Architektur mit gemeinsamem
Berechnungskern und den Zugangswegen SvelteKit-UI und MCP-Endpunkt (Prinzip IV).

Offene Fragen:

1. Backend/Hosting?
2. Authentifizierung/Rollenmodell für Vereinsmitglieder?
3. Wahl der Datenbank?

Geklärt: Die D-EELK ist eine Cessna 172N mit Standardtanks; damit sind
die Tabellen aus Abschnitt 5b für 1043 kg maßgeblich (siehe
`data/poh/d-eelk/README.md`).
