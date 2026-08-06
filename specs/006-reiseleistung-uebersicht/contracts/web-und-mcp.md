# Contract: Oberfläche und MCP-Adapter

Ergänzt [Feature 004](../../004-schieberegler-und-hoehe/contracts/web-ui.md).

## Gliederung der Startseite (`apps/web`)

Von oben nach unten (FR-008):

1. **Gruppe „Bedingungen des Reiseflugs"** — Reiseflughöhe ASL, Luftdruck QNH,
   ISA-Abweichung; seitlich der Leistungshebel für die Lasteinstellung.
2. **Übersicht** — die vier Werte samt Hinweis.
3. **Gruppe „Angaben zum Vorhaben"** — Platzhöhe ASL (mit Schnellwahl EDSH),
   Streckenlänge, Windkomponente.
4. Ergebnis des Kraftstoffbedarfs wie bisher.

**Sichert zu**:

- Die Übersicht steht **zwischen** Gruppe 1 und Gruppe 3, nicht im
  Ergebnisblock (SC-004).
- Änderungen an Streckenlänge oder Windkomponente lassen alle vier Werte der
  Übersicht unverändert (SC-003). Der Klickpfad prüft das durch Vergleich der
  angezeigten Texte vor und nach der Änderung.
- Beide Höhenregler zeigen weiterhin unmittelbar darunter ihre Druckhöhe,
  obwohl der Luftdruck nun in einer anderen Gruppe steht als die Platzhöhe
  (FR-014).

## Komponente: Übersicht der Reiseleistung

**Nimmt entgegen**: das `CruiseCapability`-Ergebnis des Kerns oder eine
Fehlermeldung.

**Sichert zu**:

- Zeigt genau vier Werte: Eigengeschwindigkeit (KTAS), Verbrauch je Stunde,
  maximale Strecke, Flugdauer (FR-005).
- Rechnet und rundet nicht (C-02, C-03); sie ruft ausschließlich die
  Formatierfunktionen des Kerns auf.
- Zeigt keinen dieser Werte ohne den Hinweis aus Anmerkung 2 und die Bedingung
  „Windstille" (FR-006). Der Wortlaut stammt aus dem Ergebnis, nicht aus der
  Komponente.
- Nennt die Quelle mit Abbildung und Seitenzahl (FR-013).
- Benennt die maximale Strecke so, dass sie nicht mit der eingegebenen
  Streckenlänge verwechselt wird (FR-010).
- Zeigt bei einem Fehler die Meldung des Kerns wortgleich und keine Werte
  (FR-011).

## MCP-Adapter (`apps/mcp`)

- Das Werkzeug `compute_fuel_plan` gibt die Übersicht in seiner Zusammenfassung
  aus, sprachlich getrennt vom ermittelten Bedarf.
- Es formuliert den Hinweis aus Anmerkung 2 nicht um, sondern gibt ihn im
  Wortlaut des Kerns wieder.
- Es errechnet keine der vier Größen selbst (C-06).
- Die Paritätsprüfung (`parity.test.ts`) deckt die neuen Felder mit ab: Web und
  MCP sehen dieselben Zahlen.
