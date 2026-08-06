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
| Dokumentstand | Ausgabe 2, Änderung 7, Jan. 2018 |
| Stand des Abschnitts 5b | Issue/Revision 2/0 vom 18.04.2016 |

Das PDF selbst liegt **nicht** im Repository.

## Woran der Handbuchstand festgemacht wird

Maßgeblich ist nicht die Datei, sondern der Stand des Abschnitts, aus dem gelesen
wird. Die Prüfsumme der Datei ändert sich bereits durch einen anderen PDF-Export
bei unverändertem Inhalt; sie wird deshalb nur protokolliert
(`document.source_file_sha256`) und nirgends verglichen.

Geprüft wird stattdessen die "LISTE DER GÜLTIGEN ABSCHNITTE" auf Seite vi, die
den aktuell gültigen Stand jedes Abschnitts nennt:

| Abschnitt | Issue/Revision | Datum |
| --- | --- | --- |
| 5 | 2/5 | 18.04.2016 |
| 5a | 2/0 | 18.04.2016 |
| **5b** | **2/0** | **18.04.2016** |

Der Leistungsteil wurde zuletzt mit **Änderung 2/6 vom 18.04.2016** geändert, die
alle Abschnitte ersetzt hat. Die spätere **Änderung 2/7 vom 22.01.2018** betrifft
laut Änderungsverzeichnis nur die Abschnitte 1 bis 4 und lässt diese
Datengrundlage unberührt — das Dokument trägt deshalb den Stand 2/7, während die
digitalisierten Seiten in ihrer Fußzeile weiterhin "Änderung -, April 2016"
nennen. Auch diese Fußzeile wird je digitalisierter Seite geprüft.

Die Prüfung schlägt an, sobald ein künftiges Handbuch den Abschnitt 5, 5a oder 5b
anfasst — unabhängig davon, wie viele Änderungen zwischenzeitlich hinzugekommen
sind, denn die Liste nennt immer den aktuellen Stand. Sie ist dann kein
Werkzeugfehler, sondern der Anlass, die Digitalisierung samt menschlicher
Doppelprüfung zu wiederholen.

**Achtung bei der Prüfung von Hand**: Seite v mit den Änderungen 2/5 bis 2/7 ist
ein eingescanntes JPEG ohne Textebene. Sie lässt sich weder durchsuchen noch
maschinell auswerten und ist nur als Bild lesbar. Das Änderungsverzeichnis wird
daher bewusst nicht ausgewertet; die Abschnittsliste auf Seite vi beantwortet
dieselbe Frage und liegt als Text vor.

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

Digitalisiert wurde der Spaltenwert der Tabelle (70 KIAS). Am 2026-08-06 wurde
entschieden, dass der Spaltenwert maßgeblich ist. Der Widerspruch wird trotzdem
weiter mitgeliefert (Feld `source_anomalies`, jetzt mit `resolution`), damit er
beim Abgleich mit dem Original nicht als Digitalisierungsfehler missverstanden
wird.

## Anwendbarkeit auf D-EELK

D-EELK ist eine **Cessna 172N mit Standardtanks** (Stand 2026-08-06, vom
Halter bestätigt). Daraus folgt:

Der Dokumenttitel nennt "(Reims) Cessna (F)172 N&P". Die Klammern sind eine
Sammelangabe: das Handbuch gilt für Reims-gebaute F172 ebenso wie für
Cessna-gebaute 172, für die Baureihen N und P. Aus dem Titel folgt also nicht,
dass ein einzelnes Flugzeug eine Reims wäre — D-EELK ist es nicht.

- Maximale Abflugmasse **1043 kg** (2300 lbs). Die Tabellen für 1089 kg gelten
  laut POH nur für die Cessna 172P und sind für D-EELK **nicht anwendbar**.
- Ausfliegbare Kraftstoffmenge **127,4 l** (33,6 US gal). Die Tabellen für
  Langstrecken- und Integraltank sind **nicht anwendbar**.

Damit sind von den 13 Tabellen nur diese fünf für D-EELK anwendbar:

| Abbildung | Tabelle | Verwendung |
|---|---|---|
| 5-1a / 5-1b | Roll- und Startstrecke [m] / [ft], 1043 kg | Startstreckenberechnung |
| 5-2a | Maximale Steigrate, 1043 kg | Steigleistung |
| 5-3a | Steigflug: Zeit, Strecke, Kraftstoff, 1043 kg | Kraftstoffbedarf |
| 5-4a | Reiseleistung mit Standardtanks, 1043 kg | Kraftstoffbedarf |

Die übrigen acht bleiben digitalisiert, weil sie zum selben Abschnitt 5b gehören
und ihre Auslassung die Vollständigkeitsprüfung gegen das Original erschweren
würde. Sie sind in `index.json` und in jeder Tabellendatei unter
`applicability.applicable_to_d_eelk` als `false` gekennzeichnet und **dürfen für
D-EELK nicht zur Berechnung herangezogen werden**; das Feld
`applicability.not_applicable_reason` nennt jeweils den Grund.

## Offene Punkte

Keine offenen Punkte zur Datengrundlage. `aircraft.open_questions` in
`index.json` ist leer, der Vy-Widerspruch ist entschieden (siehe oben).
