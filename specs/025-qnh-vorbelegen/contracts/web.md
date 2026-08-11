# Vertrag: Weboberfläche

## Bedienung

### Der Button am QNH-Regler

Im Fieldset **„Grundbedingungen"** steht neben der Beschriftung „Luftdruck QNH
(hPa)" ein Button **„EDSH"** — im `neben`-Steckplatz von `RangeField`, in
derselben Gestalt (`.schnellwahl`) wie die bestehende Schnellwahl bei der
Platzhöhe (FR-001).

Der Unterschied zur Platzhöhe ist bewusst: Dort setzt der Klick den Wert sofort,
hier öffnet er einen Dialog. Die Platzhöhe ist eine feste, nachprüfbare
Eigenschaft des Platzes; der Luftdruck ist ein fremder, veränderlicher
Modellwert. Nur der zweite braucht eine Bestätigung.

### Der Dialog

Ein natives `<dialog>`, geöffnet mit `showModal()`. Damit sind Fokusführung,
`Esc` und die Inaktivierung des Hintergrunds ohne Nachbau erfüllt (FR-008).

**Immer sichtbar, in jedem Zustand:**

- dass jetzt Daten von einem Onlinedienst geladen werden (FR-003)
- dass der Wert aus einem **Wettermodell** stammt und keine Messung am Platz ist
  (FR-011)
- dass er ein unverbindlicher Vorschlag ist und vor dem Flug das **ATIS** gilt
  (FR-003)
- der Name des Dienstes mit Verweis (FR-010, Auflage CC-BY)

**Je nach Zustand** (siehe [data-model.md](../data-model.md)):

| Zustand | Zusätzlich sichtbar |
|---|---|
| `laedt` | eine Ladeanzeige (FR-004) |
| `vorschau` | der QNH in ganzen hPa, der ungerundete Wert, die Gültigkeitszeit (FR-005) |
| `fehler` | eine verständliche Meldung und „Erneut versuchen" (FR-014) |

**Knöpfe**: „Übernehmen" und „Abbrechen" (FR-006). „Übernehmen" ist gesperrt,
solange kein übernehmbarer Wert vorliegt — beim Laden, nach einem Fehlschlag und
bei einem Wert außerhalb 950–1050 hPa (FR-007).

### Nach der Übernahme

Unter dem QNH-Regler steht im `folge`-Steckplatz eine Zeile mit Dienst und
Gültigkeitszeit (FR-009). Sie verschwindet, sobald der Pilot den Regler selbst
bewegt.

## `lib/weather/openMeteo.ts`

Zerfällt in zwei Teile, damit der prüfbare Teil ohne Netz prüfbar ist.

### `baueAnfrage(platz): URL` (rein)

Baut die Adresse. Setzt `latitude`, `longitude`, `current=surface_pressure`,
`timezone=UTC` und — ausdrücklich — `elevation` in Metern, gerechnet aus der
Platzhöhe in Fuß (→ [R6](../research.md)).

### `deuteAntwort(rohdaten): WetterAbruf` (rein)

Prüft und übersetzt. **Wirft**, wenn:

- `current.surface_pressure` fehlt, keine endliche Zahl oder außerhalb
  500–1100 hPa liegt
- `current.time` fehlt oder keine deutbare Zeit ist
- `elevation` fehlt oder keine endliche Zahl ist

Der Bereich 500–1100 hPa ist bewusst weit: Er fängt Unsinn ab (`null`, `0`, ein
Text), beurteilt aber kein Wetter. Die eigentliche Grenze zieht danach der
Reglerbereich.

`pressure_msl` wird nicht gelesen. Es ist QFF und damit die falsche Größe
(→ [R4](../research.md)); ein Feld, das man versehentlich benutzen kann, wird
gar nicht erst durchgereicht.

### `holeWetter(platz, signal): Promise<WetterAbruf>` (unrein)

Die dünne Hülle: `fetch` mit `AbortSignal`, danach `deuteAntwort`. Rechnet
nichts. Zeitüberschreitung nach 10 s (FR-013) — der Aufrufer gibt das Signal
vor, damit derselbe Abbruch auch beim Schließen des Dialogs greift.

**Jeder Fehlschlag sieht für den Aufrufer gleich aus**: Netzfehler,
Zeitüberschreitung und unbrauchbare Antwort führen zum selben Zustand `fehler`
(FR-015). Für den Piloten ist eine unbrauchbare Antwort dasselbe wie keine.

## Zusicherungen der Oberfläche

- **W-01**: Die Oberfläche rechnet den QNH **nicht** selbst. Sie ruft `toQnh`
  auf und zeigt `settableQnhHpa` und `qnhHpa` (Prinzip IV, C-04).
- **W-02**: Die Oberfläche rundet **nicht**. Der übernehmbare Wert kommt fertig
  aus dem Kern (C-03).
- **W-03**: Ein Abbruch, ein Fehlschlag oder das Schließen des Dialogs verändert
  **keine** Eingabe (FR-016).
- **W-04**: Der Abruf geschieht **ausschließlich** auf Knopfdruck, nie beim Laden
  der Seite (FR-017). Ohne Netz bleibt die Seite vollständig bedienbar.
- **W-05**: Eine Antwort, die nach dem Schließen des Dialogs eintrifft,
  verändert nichts (FR-018).
- **W-06**: Die Platzhöhe für Anfrage und Umrechnung stammt aus **derselben**
  Konstanten wie die Schnellwahl der Platzhöhe (FR-025).

## Nicht Teil dieses Vertrags

- Der MCP-Zugang. `apps/mcp` wird nicht angefasst; `toQnh` steht einem
  Chat-Agenten über das Kernpaket ohnehin offen.
- Temperatur und Wind. Der Abruf fordert sie nicht einmal an.
