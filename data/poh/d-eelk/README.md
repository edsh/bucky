# POH-Daten D-EELK (digitalisiert)

Digitalisierte Leistungstabellen aus dem Flughandbuch-Anhang der D-EELK.
Grundlage für alle deterministischen Berechnungen (Constitution Prinzip I).

## Quelle

| Feld | Wert |
| --- | --- |
| Dokument | Anhang Flughandbuch für (Reims) Cessna (F)172 N&P mit TAE 125-02-114 Installation |
| Herausgeber | Technify Motors GmbH, St. Egidien |
| Ausgabe | Ausgabe 2 |
| Zulassung | EASA STC 10014287 |
| Datei | `FHB-C-172N-P-2-7.pdf` |
| SHA-256 | `ac12813c0e1ecca1e406607dc5b2beb2ec1dc3a0150d54af808c909de6d0d598` |

Das PDF selbst liegt **nicht** im Repository. Es wird über den SHA-256-Hash
identifiziert; die Extraktion bricht ab, wenn der Hash abweicht, weil dann die
Seitenzuordnung nicht mehr garantiert wäre.

## Warum ausschließlich Abschnitt 5b

Der Anhang enthält die Leistungsdaten **doppelt**, einmal je Propellertyp:

| Abschnitt | Propeller | Für D-EELK |
| --- | --- | --- |
| 5a (Seite 5a-1 … 5a-28) | MTV-6-A/187-129 | nicht anwendbar |
| **5b (Seite 5b-1 … 5b-28)** | **MTV-6-A/190-69** | **anwendbar** |

D-EELK hat den Propeller MTV-6-A/190-69, daher wurde **nur Abschnitt 5b**
digitalisiert. Jede Tabellendatei trägt diese Begründung in den Feldern
`source.section_applicability` und `applicability.propeller` explizit mit,
damit später nachvollziehbar ist, warum genau diese Seiten die Grundlage sind.

## Inhalt

- `index.json` — Katalog aller Tabellen inkl. nicht digitalisierter Inhalte
  (`not_digitized`) mit Begründung
- `tables/<id>.json` — je eine Tabelle mit vollständiger Quellenreferenz

Digitalisiert (13 Tabellen, alle aus Abschnitt 5b):

| Abb. | Inhalt | POH-Seiten |
| --- | --- | --- |
| 5-1a / 5-1b | Roll- und Startstrecke [m] / [ft], 1043 kg | 5b-2 … 5b-4 |
| 5-1c / 5-1d | Roll- und Startstrecke [m] / [ft], 1089 kg (172P) | 5b-5 … 5b-7 |
| 5-2a / 5-2b | Maximale Steigrate, 1043 / 1089 kg | 5b-8, 5b-9 |
| 5-3a / 5-3b | Steigflug: Zeit, Strecke, Kraftstoff, 1043 / 1089 kg | 5b-10 … 5b-13 |
| 5-4a … 5-4e | Reiseleistung, Reichweite, Flugdauer (Standard-/Langstrecken-/Integraltanks) | 5b-14 … 5b-28 |

Bewusst **nicht** digitalisiert (in `index.json` unter `not_digitized` mit Grund):
Abb. 5-1 (Dichtehöhe) und Abb. 5-2 (Leistung über Höhe) sind Diagramme, keine
Tabellen; die Landestrecke steht laut Seite 5-6 nicht im Anhang, sondern im
Original-Flughandbuch der Zelle; Abschnitt 5a betrifft den anderen Propeller.

## Aufbau einer Tabellendatei

```jsonc
{
  "id": "5b-cruise-standard-1043kg",
  "figure": "Abb. 5-4a",
  "table_name": "Reiseleistung, Reichweite und Flugdauer mit Standardtanks, ...",
  "source": {
    "issue": "Ausgabe 2",
    "revision": "Änderung -, April 2016",
    "section": "Abschnitt 5b LEISTUNGEN",
    "section_applicability": "... gilt nur für Propeller MTV-6-A/190-69 ...",
    "poh_pages": ["5b-14", "5b-15", "5b-16"],
    "pages": [ { "poh_page": "5b-14", "pdf_page": 140, "role": "Bedingungen/Anmerkungen" } ],
    "citation": "... Ausgabe 2, Abschnitt 5b (Propeller MTV-6-A/190-69), Seite 5b-14/5b-15/5b-16, Abb. 5-4a - ..."
  },
  "applicability": { "propeller": "...", "models": ["..."], "weight_kg": 1043, "tank": "standard" },
  "conditions": ["Fluggewicht 1043 kg (2300 lbs)", "Klappen eingefahren", "Windstille"],
  "notes":      ["1. Flugdauerangaben basieren auf ..."],
  "columns":    [ { "key": "fuel_flow_lph", "label": "Kraftstoffverbrauch", "unit": "l/h" } ],
  "rows":       [ { "pressure_altitude_ft": 0, "power_setting_pct": 100, "fuel_flow_lph": 33.6 } ]
}
```

`conditions` und `notes` stammen wörtlich aus dem POH und sind Teil der
Gültigkeit der Werte (z. B. "Je 10 °C über ISA … +1 %", "Für je 9 Knoten
Gegenwind Strecken um 10 % verringern"). Sie **müssen** bei der Ausgabe eines
Berechnungsergebnisses berücksichtigt bzw. mit angezeigt werden.

## Pflicht zur Quellenangabe bei Berechnungen

Constitution Prinzip I und Spec FR-005 verlangen, dass jede Berechnung exakt
angibt, aus welcher Tabelle welcher Seite sie stammt. Dafür ist das Feld
`source.citation` gedacht — es ist die fertige, zitierfähige Zeile, z. B.:

> Anhang Flughandbuch für (Reims) Cessna (F)172 N&P mit TAE 125-02-114
> Installation, Ausgabe 2, Abschnitt 5b (Propeller MTV-6-A/190-69),
> Seite 5b-14/5b-15/5b-16, Abb. 5-4a – Reiseleistung, Reichweite und Flugdauer
> mit Standardtanks, Fluggewicht 1043 kg (2300 lbs)

Zusätzlich sind die verwendeten Eckwerte (die Stützstellen der Interpolation)
und der Hinweis auf die Vorflug-Prüfung gegen das Original-POH auszugeben.

## Reproduzierbarkeit

Die JSON-Dateien werden **nicht von Hand gepflegt**, sondern deterministisch aus
dem PDF erzeugt. Gleiches PDF ⇒ bitgleiche Ausgabe:

```bash
python3 tools/poh/extract_d_eelk.py --pdf ~/Downloads/FHB-C-172N-P-2-7.pdf
```

Kein LLM erzeugt oder interpoliert dabei Werte; die Extraktion ist reiner,
prüfbarer Code (`pdftotext` + Parser). Voraussetzung: `pdftotext` (poppler).

## Doppelte Prüfung (Spec FR-002)

```bash
python3 tools/poh/verify_d_eelk.py --pdf ~/Downloads/FHB-C-172N-P-2-7.pdf
```

Aktueller Stand: **2619 Einzelprüfungen, 0 Abweichungen.** Geprüft wird auf drei
unabhängigen Wegen:

1. **Zweitextraktion** — die Daten entstehen mit `pdftotext -layout`
   (spaltenerhaltend) und werden gegen einen zweiten Durchlauf mit
   `pdftotext -raw` (völlig anderer Textordnungs-Algorithmus) Wert für Wert
   verglichen.
2. **Seiten-/Quellenprüfung** — jede referenzierte POH-Seitenzahl und
   Abbildungsnummer muss tatsächlich auf der referenzierten PDF-Seite stehen und
   zu Abschnitt 5b gehören.
3. **Konsistenzprüfung** — u. a. Umrechnung l/h zu US gal/h (1 US gal =
   3,785411784 l), vollständige Druckhöhen-/Temperatur-/Lastraster, Monotonie
   (Startstrecke steigt mit Höhe und Temperatur, Steigrate fällt mit der Höhe,
   Steigflugwerte kumulieren), ISA-Reihe -2 °C/1000 ft, Verbrauch hängt nur von
   der Lasteinstellung ab, Plausibilitätsrahmen für Reichweite/Flugdauer.

Diese maschinelle Prüfung ersetzt **nicht** die menschliche Gegenprüfung
einzelner Stichproben gegen das gedruckte Handbuch — sie stellt sicher, dass
kein Wert beim Auslesen verrutscht, verschluckt oder falsch gerundet wurde.

## Bekannte Abweichung im Original

Die vier Steigflugtabellen tragen das Feld `source_anomalies`:

> Die Bedingungen auf Seite 5b-8/5b-9/5b-10/5b-12 nennen `vy = 69 KIAS`,
> die Spalte "Vy" der Tabellen 5-2a/5-2b/5-3a/5-3b nennt **70 KIAS**.

Digitalisiert wurde der Spaltenwert der Tabelle (70 KIAS); der Widerspruch wird
bewusst nicht stillschweigend aufgelöst, sondern mitgeliefert und ist mit dem
Original-POH bzw. dem Halter zu klären.

## Offene Punkte

In `index.json` unter `aircraft.open_questions` geführt:

- **Muster (172N oder 172P)**: Die Tabellen für 1089 kg (2400 lbs) gelten laut
  POH nur für die 172P. Solange das Muster nicht hinterlegt ist, dürfen für
  D-EELK nur die 1043-kg-Tabellen als gesichert gelten.
- **Tankkonfiguration**: Standard (127,4 l), Langstrecke (158,6 l) oder Integral
  (196,8 l ausfliegbar) — bestimmt, welche der Tabellen 5-4a … 5-4e für
  Reichweite/Flugdauer gilt. Für die reine Verbrauchsrate (l/h) ist die
  Tankwahl irrelevant, da der Verbrauch dort nur von der Lasteinstellung abhängt.
