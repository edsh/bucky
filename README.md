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

### Aufbau der Seite: von einfach nach komplex

Ganz oben stehen die **Grundbedingungen** — Platzhöhe, QNH und Außentemperatur.
Mehr braucht keine der Rechnungen als Fundament. Darunter folgt die **Roll- und
Startstrecke** mit ihrem eigenen Pistenwind und dem Bahnzustand: die Frage, die
sich vor jedem Start stellt und die mit den drei Grundwerten bereits
beantwortet ist.

Erst danach beginnt der **Reiseflug**. Reiseflughöhe und Lasteinstellung stehen
dort einmal und gelten für beides, was folgt: die Auskunft „Reichweite und
Flugdauer" und die Bedarfsrechnung für eine konkrete Strecke. Wer nur wissen
will, ob die Bahn reicht, muss den Reiseflug gar nicht erst aufschlagen.

### Eingaben: Höhe über dem Meeresspiegel, nicht Druckhöhe

Angegeben werden Platzhöhe und Reiseflughöhe über dem Meeresspiegel sowie das
QNH — beides steht auf der Karte bzw. im Wetterbericht. Die Druckhöhe, mit der
die Handbuchtabellen arbeiten, errechnet der Kern daraus nach der
barometrischen Höhenformel der ICAO-Standardatmosphäre (ICAO Doc 7488). Sie ist
damit die einzige Größe, die nicht aus dem Flughandbuch stammt und wird deshalb
getrennt ausgewiesen: in der Oberfläche unmittelbar unter dem Regler, der sie
erzeugt, im Rechenweg als eigener Schritt mit eigener Quellenangabe.

### Zwei Windangaben, nicht eine

Der Wind steht an zwei Stellen, weil es zwei verschiedene Größen sind: der
**Pistenwind** bei der Startstrecke — der Wind auf der Bahn 10/28 am Boden —
und die **Streckenwindkomponente** beim Kraftstoffbedarf, der Wind entlang der
Reisestrecke in Reiseflughöhe. Beide zählen positiv als Gegenwind und wirken
jeweils nur auf das Ergebnis, bei dem sie stehen.

Sie unterscheiden sich auch im Bereich. Der Pistenwind endet bei 10 kt
Rückenwind, weil dort die Startstreckentabelle endet („For operation with
tailwinds up to 10 knots", POH-Seite 5-12). Das ist **keine** Betriebsgrenze —
die nennt für die 172N überhaupt keinen Wind. Für die Strecke gibt es keine
solche Tabellengrenze; dort reicht der Regler von 50 kt Rückenwind bis 50 kt
Gegenwind.

Der demonstrierte Seitenwind von 15 kt (POH-Seite 4-20) ist hier bewusst nicht
abgebildet: Er ist eine Querkomponente, während beide Regler die
Längskomponente führen, und er ist ausdrücklich pilotenabhängig statt eine
Grenze.

### Reichweite und Flugdauer: eine Auskunft, kein Bedarf

Über den Angaben zum Streckenflug steht, was die Maschine unter den
eingestellten Grundbedingungen leistet: Eigengeschwindigkeit, Verbrauch je
Stunde, Verbrauch je Seemeile, maximale Reichweite und maximale Flugdauer.
Diese Werte hängen allein an Reiseflughöhe, QNH, Lasteinstellung und
Temperatur — Streckenlänge, Platzhöhe und Wind ändern sie nicht. Wer noch keine Strecke im Sinn hat, bekommt so schon
eine Antwort; und wenn die Bedarfsrechnung an Wind oder Strecke scheitert,
bleibt diese Auskunft stehen.

Der Verbrauch je Seemeile ist dabei der einzige dieser Werte, der nicht in der
Tabelle steht: Er entsteht aus Stundenverbrauch geteilt durch
Eigengeschwindigkeit und macht zwei Lasteinstellungen unmittelbar
vergleichbar — ob mehr Leistung eine Strecke teurer macht, sieht man an
Verbrauch und Geschwindigkeit einzeln nicht. Anders als Reichweite und
Flugdauer enthält er weder Rollen noch Steigflug noch Reserve.

**Sie ist ausdrücklich kein Bedarf.** Reichweite und Flugdauer stammen als
eigene Spalten aus Abb. 5-4a und schließen laut Anmerkung 2 bereits 4 l für
Motorstart und Rollen, den gesamten Steigflug sowie 45 Minuten Reserve ein. Der
darunter ausgewiesene Kraftstoffbedarf enthält keine Reserve. Beide Zahlen
dürfen nicht miteinander verrechnet werden.

**Sie lässt sich nicht nachrechnen.** Geschwindigkeit mal Flugdauer ergibt
weniger als die Reichweite der Tabelle — bei 0 ft und 100 % Last 362,5 NM
gegenüber 365 NM, und der Abstand wächst mit der Höhe, weil die im Steigflug
zurückgelegte Strecke in der Reichweite steckt. Deshalb werden beide Werte
nachgeschlagen und nie gebildet: Eine eigene Rechnung wiese systematisch zu
wenig aus, also in die gefährliche Richtung. Ein Vertragstest (C-06) hält fest,
dass kein Adapter diese Spalten anfasst.

### Roll- und Startstrecke: reicht die Bahn?

Neben dem Kraftstoffbedarf steht die zweite Frage vor dem Start: ob die Bahn
lang genug ist. Ausgewiesen werden beide Werte aus Abb. 5-1a — die
Startrollstrecke bis zum Abheben und die Startstrecke über ein 15 m hohes
Hindernis. Die zweite ist die maßgebliche, wenn am Bahnende Bäume, Zäune oder
eine Straße stehen; die erste sagt nur, wo das Fahrwerk den Boden verlässt.

Die Tabelle ist zweifach gestützt: Druckhöhe (0 bis 10 000 ft) und
Außentemperatur (−20 bis 50 °C). Zwischen den Stützstellen wird bilinear
interpoliert, außerhalb wird abgelehnt statt fortgeschrieben. Eingegeben wird
die Außentemperatur — dieselbe Grundbedingung, die auch die
Reiseleistung trägt (Prinzip IV).

Darauf wirken die Anmerkungen des Handbuchs, in dieser Reihenfolge:

1. **Wind (Anmerkung 2)** — je 9 kt Gegenwind 10 % weniger, je 2 kt Rückenwind
   10 % mehr. Angewandt wird das *anteilig* statt in vollen Stufen: 4,5 kt
   Gegenwind ergeben 5 %, nicht 0 %. Die Stufen addieren sich, sie
   multiplizieren sich nicht — 18 kt Gegenwind ergeben 20 % und nicht 19 %.
   Über 10 kt Rückenwind endet der Wortlaut der Anmerkung; der Regler
   „Pistenwind" endet deshalb genau dort. Der Kern lehnt darüber hinausgehende
   Werte weiterhin ab — über die Oberfläche kommen sie nur nicht mehr an.
2. **Bahnzustand (Anmerkungen 3 und 4)** — 15 % für trockenes Gras, mindestens
   20 % für feuchtes Gras, aufgeweichten Untergrund oder Schnee.

Beide Bahnzuschläge wirken **additiv**: Gras und feucht ergeben 35 %, nicht
1,15 × 1,20 = 38 %. Der Wortlaut („um 15 % erhöhen") beschreibt eine Erhöhung
des Tabellenwerts, nicht eine Erhöhung des schon erhöhten Werts. Und die
Anmerkungen sprechen ausdrücklich vom *Startlauf*: Der Zuschlag wird deshalb
einmal aus dem windkorrigierten Startlauf gebildet und als **derselbe
Meterbetrag** auf beide Strecken geschlagen — die zusätzliche Strecke entsteht
am Boden, nicht in der Luft. Beides ist eine Auslegung und steht deshalb genau
einmal im Kern; ein Vertragstest (C-07) hält fest, dass kein Adapter diese
Prozentsätze kennt.

Die Schnellwahl **EDSH** setzt neben der Platzhöhe von 971 ft auch den Schalter
für trockenes Gras: Der Heimatplatz hat eine Graspiste. Dasselbe tut die
Übernahme im Wetterdialog — jeder Weg, der EDSH als Platz benennt, bringt
dessen Belag mit. Der Schalter bleibt danach frei wählbar und wird weder beim
Verstellen der Platzhöhe noch sonst zurückgesetzt.

### Temperatur statt Abweichung

Eingestellt wird die **Außentemperatur** — die Zahl, die ATIS, Thermometer
und Wetterdienst nennen. Die ISA-Abweichung, mit der das Handbuch rechnet, steht
als Folgezeile darunter und wird laufend mitgeführt. Sie ist damit der Beleg, mit
dem sich die verwendete Handbuchzeile nachschlagen lässt, und wird deshalb mit
einer Nachkommastelle angezeigt: Die gezeigte Zahl ist die, mit der gerechnet
wurde (Prinzip I).

Der einstellbare Temperaturbereich wandert mit der Druckhöhe. Er entspricht immer
derselben Abweichungsspanne von −30 bis +40 °C — in Bodennähe reicht er deshalb
weiter nach oben, in großer Höhe weiter nach unten. Ein Wechsel der Platzhöhe
verschiebt nur die Abweichung, nicht die eingestellte Temperatur: Die Temperatur
ist eine Messung und folgt nicht aus einer Reglerbewegung an anderer Stelle.

### Wetterwerte aus dem Netz

Neben dem QNH-Regler, dem Temperaturregler und dem Pistenwindregler steht je ein
Knopf **EDSH**. Alle drei öffnen denselben Dialog — der Abruf holt bei Open-Meteo
in **einer** Anfrage Luftdruck, Temperatur und Wind für den Platz und bildet daraus
drei Vorschläge. Drei Einstiege, weil ein Pilot von der Größe her denkt, die er
gerade sucht, und nicht wissen muss, dass sie zusammen ankommen.

| Zeile im Dialog | Woraus sie entsteht |
|---|---|
| Luftdruck QNH | Stationsdruck, auf die Platzhöhe von 971 ft bezogen |
| Außentemperatur | Platztemperatur des Modells; die Erläuterung nennt die zugehörige ISA-Abweichung |
| Pistenwind | Wind, zerlegt gegen die gewählte Bahn 10 oder 28 |

Kommt der Wind auf einer Bahn von hinten, steht neben ihrem Auswahlknopf ein
**⚠️** — an beiden Bahnen gerechnet, damit man es vor dem Umschalten sieht und
nicht erst danach. Ist genau diese Bahn gewählt, steht das Zeichen zusätzlich
neben dem Windwert: Rückenwind unterscheidet sich vom Gegenwind nur durch ein
Vorzeichen, und das übersieht man beim Überfliegen einer Zahlenreihe leicht.

Unter den drei Zeilen steht der **Bahnzustand: trockenes Gras** — ohne Kästchen.
Er ist kein abgerufener Messwert, sondern eine feste Eigenschaft des Platzes,
und wird bei jeder Übernahme mitgesetzt. Ein viertes Kästchen hätte die
Graspiste zu einer Ansichtssache gemacht, die sie nicht ist; ein vergessener
Haken ginge zulasten der Startstrecke. Wer ihn nicht mitgesetzt haben will,
bricht ab und stellt ihn von Hand ein.

Jede Wetterzeile hat ein Kästchen; „Übernehmen" setzt **nur** die angehakten Regler.
Was fehlt oder außerhalb eines Reglerbereichs liegt, sperrt seine eigene Zeile
und nicht den ganzen Abruf. Die Bahnwahl steht **in** der Windzeile, weil sie nur
dort etwas ändert: Vorausgewählt ist die Bahn mit Gegenwind, ein Wechsel rechnet
allein den Pistenwind neu und löst keine zweite Anfrage aus. Sie bleibt auch dann
stehen, wenn der Wind auf der gewählten Bahn jenseits der Reglergrenze liegt —
sonst gäbe es keinen Weg zurück zur anderen Bahn.

Der Unterschied zur Schnellwahl der Platzhöhe ist beabsichtigt. Die Platzhöhe
ist eine feste Eigenschaft des Platzes; die Wetterwerte sind **Rechenwerte aus
dem Wettermodell ICON-D2**, keine Messung am Platz. Sie sind eine
Bequemlichkeit und ersetzen das ATIS nicht — der Dialog sagt das, und nach der
Übernahme bleibt die Herkunft unter jedem Regler stehen, bis genau dieser Wert
von Hand verstellt wird.

Der Abruf geschieht ausschließlich auf Knopfdruck. Ohne Netz bleibt die Seite
vollständig bedienbar; beim Laden geht keine Anfrage nach außen.

**Der Fallstrick beim Pistenwind**: Die Bahnkennungen 10 und 28 sind
*missweisend* und auf zehn Grad gerundet, die Windrichtung des Wetterdienstes
ist *rechtweisend*. Gerechnet wird deshalb mit **103°** und **283°** — den
rechtweisenden Richtungen derselben Bahn. Wer stattdessen die Kennung mal zehn
nähme, verrechnete sich um die Ortsmissweisung von rund 3°: bei 20 kt etwa
einen Knoten. Unauffällig, aber falsch. Die Zerlegung selbst steht im
Rechenkern, nicht in der Oberfläche; ein Prüflauf stellt sicher, dass keine
Adapterdatei eine Winkelfunktion enthält.

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
