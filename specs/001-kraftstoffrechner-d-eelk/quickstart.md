# Phase 1 — Quickstart: Kraftstoffrechner für D-EELK

Anleitung, um das Feature lokal zu bauen und zu prüfen, dass es tut, was die Spec
verlangt. Implementierungsdetails stehen nicht hier, sondern in
[data-model.md](./data-model.md) und [contracts/](./contracts/).

## Voraussetzungen

- Node.js 22 LTS und npm
- Python 3 und `pdftotext` (nur für die erneute Prüfung der Datengrundlage)
- Das Original-PDF unter `~/Downloads/FHB-C-172N-P-2-7.pdf`, falls die
  Datengrundlage neu erzeugt oder geprüft werden soll. Es liegt bewusst nicht im
  Repository.

## Einrichten

```bash
npm install
```

Installiert die Workspaces `packages/deelk-poh-core`, `apps/web` und `apps/mcp`.

## Datengrundlage prüfen (optional, aber vor jeder Freigabe)

```bash
python3 tools/poh/verify_d_eelk.py --pdf ~/Downloads/FHB-C-172N-P-2-7.pdf
```

**Erwartet**: 2619 Prüfungen, 0 Abweichungen. Die Prüfung extrahiert die Tabellen
ein zweites Mal mit einem anderen Verfahren, weist jede Tabelle auf der
referenzierten PDF-Seite nach und prüft die Werte auf innere Konsistenz.

## Kern testen

```bash
npm test --workspace @edsh-bucky/deelk-poh-core
```

**Erwartet** — die Tests decken mindestens diese Fälle ab:

| Prüfung                                        | Erwartetes Verhalten                                                          | Bezug          |
|------------------------------------------------|-------------------------------------------------------------------------------|----------------|
| Flugvorhaben mit Werten genau auf Stützstellen | Ergebnis stimmt mit der von Hand aus dem Handbuch gerechneten Vorgabe überein | SC-005         |
| Flugvorhaben mit Werten zwischen Stützstellen  | Ergebnis liegt zwischen den Ergebnissen der beiden Nachbarstützstellen        | FR-003         |
| Jeder Rechenschritt                            | trägt Quellenreferenz und, wo Tabellenwerte einfließen, die Eckwerte          | FR-005, SC-002 |
| Handbuch-Beispiel mit 5a-Werten                | trifft 85,4 l und jeden Zwischenwert                                          | SC-005, Fall C |
| Reiseflughöhe 20000 ft                         | wirft `OUT_OF_RANGE`                                                          | FR-007, SC-003 |
| 100 % Last bei 12000 ft                        | wirft `UNSUPPORTED_COMBINATION`                                               | V-03           |
| Nur anwendbare Tabellen herangezogen           | keine Tabelle mit `applicable_to_d_eelk === false` beteiligt                  | V-04, FR-015   |
| Reiseflughöhe gleich Platzhöhe                 | wirft `INVALID_INPUT`                                                         | V-01           |
| Strecke kürzer als die Steigflugstrecke        | wirft `NOT_COMPUTABLE`                                                        | V-05           |
| Gegenwind größer als die KTAS                  | wirft `NOT_COMPUTABLE`                                                        | V-06           |
| Zweimal dieselbe Eingabe                       | bitgleich dasselbe Ergebnis                                                   | Prinzip I      |

## Web-Oberfläche starten

```bash
npm run dev --workspace apps/web
```

**Erwartet**: Eingabemaske unter `http://localhost:5173` mit den Feldern aus
[data-model.md](./data-model.md). Nach dem Absenden erscheinen der aufgeschlüsselte
Kraftstoffbedarf, die Folge der Rechenschritte, die Quellenangaben und der
Prüfhinweis.

Manuell zu prüfen:

1. Ein gültiges Flugvorhaben liefert innerhalb weniger Sekunden ein Ergebnis (SC-001).
2. Jedes Ergebnis zeigt Seitenzahl und Tabellenname jeder verwendeten Tabelle sowie
   den Prüfhinweis (SC-002).
3. Eine Lasteinstellung über 75 % erzeugt den Hinweis aus Anmerkung 4, blockiert die
   Rechnung aber nicht.
4. Jedes Ergebnis weist darauf hin, dass die Summe keine Reserve enthält.
5. Übersteigt der Bedarf die ausfliegbare Menge, ist das deutlich sichtbar (FR-016).

## Statisches Bundle bauen

```bash
npm run build --workspace apps/web
```

**Erwartet**: ein rein statisches Verzeichnis ohne Serveranteil. Prüfen, dass die
gebaute Seite auch ohne laufenden Node-Prozess funktioniert, indem das
Ausgabeverzeichnis mit einem beliebigen statischen Dateiserver ausgeliefert wird.

## MCP-Server prüfen

```bash
npm run build --workspace apps/mcp
node apps/mcp/dist/server.js
```

Der Server spricht über stdio. Zum Prüfen in einem MCP-fähigen Werkzeug eintragen
und dasselbe Flugvorhaben rechnen lassen wie zuvor in der Oberfläche.

**Erwartet**: identische Zahlen wie in der Web-Oberfläche (M-02), Quellenangaben und
Prüfhinweis wortgleich (M-01), und kein Werkzeug, das Rohtabellen herausgibt (M-03).

## Prüfprotokoll

Durchgeführt am 2026-08-06 auf macOS, Node 26.5.0, Microsoft Edge über
Playwright. Die Weboberfläche wurde dabei zum ersten Mal tatsächlich bedient.

| Prüfung                                                        | Ergebnis | Anmerkung                                                |
|----------------------------------------------------------------|----------|-----------------------------------------------------------|
| Datengrundlage gegen das PDF                                   | bestanden | 2619 Einzelprüfungen, 0 Abweichungen                     |
| Automatische Tests                                             | bestanden | 125 Tests, Kern und MCP-Adapter                          |
| 1. Gültiges Flugvorhaben liefert ein Ergebnis (SC-001)         | bestanden | 77 ms von Klick bis Ergebnis                             |
| 2. Seitenzahl, Tabellenname und Prüfhinweis sichtbar (SC-002)  | bestanden | ohne Aufklappen, Abb. 5-3a und 5-4a mit Seitenangabe     |
| 3. Über 75 % Last erzeugt den Hinweis, blockiert nicht         | bestanden | Anmerkung 4 erscheint, die Aufschlüsselung bleibt sichtbar |
| 4. Hinweis, dass die Summe keine Reserve enthält               | bestanden |                                                          |
| 5. Bedarf über der ausfliegbaren Menge deutlich sichtbar       | bestanden | 900 NM, 100 % Last, 40 kt Gegenwind                      |
| Rechenweg aufklappbar mit dreizehn Schritten                   | bestanden |                                                          |
| Reiseflughöhe unter Platzhöhe                                  | bestanden | Meldung des Kerns wortgleich                             |
| Tabellenseite erreichbar, zeigt den Vy-Widerspruch             | bestanden |                                                          |
| Statisches Bundle ohne Node-Prozess                            | bestanden | mit `python3 -m http.server` ausgeliefert                |
| MCP-Server über echtes stdio                                   | bestanden | `initialize` und `tools/call`, Antwort vollständig       |

Der Klickpfad liegt als `tests/ui/klickpfad.mjs` im Repository und lässt sich
wiederholen; er wird nicht von `npx vitest run` ausgeführt, weil er einen
gebauten Bundle, einen Webserver und einen echten Browser braucht. Der
Kopfkommentar der Datei nennt die vier nötigen Befehle; Playwright wird mit
`--no-save` installiert und steht deshalb in keinem Manifest.

Dabei gefunden und behoben: der Browser fragte vergeblich `/favicon.ico` an.
`app.html` enthält jetzt ein leeres Symbol. Die Höhenfelder waren nicht als
Druckhöhe gekennzeichnet; die Beschriftungen lauten jetzt "Druckhöhe
Startplatz" und "Druckhöhe Reiseflug".

**Nicht geprüft**: die Stichprobe der digitalisierten Werte gegen das gedruckte
Handbuch durch einen Menschen. Der maschinelle Abgleich prüft gegen dieselbe
PDF-Datei und kann einen Lesefehler des Originals nicht ausschließen.

## Vor der Freigabe

Die fachlichen Fragen sind entschieden (Spec, Abschnitt "Geklärte Punkte"). Vor der
Freigabe muss zusätzlich der von Hand aus den 5b-Tabellen erstellte Sollwert für
SC-005 vorliegen und dokumentiert sein — er muss unabhängig vom Code entstanden
sein, sonst prüft er nichts.
