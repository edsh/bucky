# Sollwerte für SC-005 — von Hand aus dem Handbuch gerechnet

**Erstellt**: 2026-08-06 · **Erstellt von**: Copilot CLI im Auftrag von afoeder ·
**Grundlage**: Anhang FHB (Reims) Cessna (F)172 N&P mit TAE 125-02-114,
Ausgabe 2, Abschnitt 5b (Revision 2/0 vom 18.04.2016)

Dieses Dokument hält die Erwartungswerte fest, gegen die der Berechnungskern
geprüft wird (Aufgabe T008, SC-005, Zusicherung C-05). Es entstand **vor** jeder
Zeile Implementierungscode; zum Zeitpunkt der Erstellung existierte weder
`packages/deelk-poh-core` noch sonst ein Rechenweg im Repository.

## Zur Unabhängigkeit dieser Werte

Die Zahlen wurden Schritt für Schritt aus den Tabellen abgelesen und mit einem
Taschenrechner (Python `Decimal`, ohne jede Projektbibliothek) verknüpft. Damit
ist ausgeschlossen, dass ein Implementierungsfehler sich selbst bestätigt.

**Nicht** ausgeschlossen ist, dass derselbe Bearbeiter das POH-Verfahren an
derselben Stelle missversteht — Sollwert und spätere Implementierung stammen aus
einer Hand. Fall C unten mildert das erheblich, weil er gegen die vom Hersteller
selbst veröffentlichten Zahlen prüft und nicht gegen eine eigene Rechnung. Eine
menschliche Stichprobe gegen das gedruckte Handbuch bleibt vor der Freigabe
dennoch offen.

## Verwendete Tabellen

| Tabelle | Abbildung | Seiten | Zweck |
| --- | --- | --- | --- |
| `5b-climb-time-dist-fuel-1043kg` | Abb. 5-3a | 5b-10, 5b-11 | Zeit, Strecke, Kraftstoff Steigflug |
| `5b-cruise-standard-1043kg` | Abb. 5-4a | 5b-14 … 5b-16 | KTAS und Verbrauchsrate |

Abgelesene Eckwerte:

| Quelle | Druckhöhe | Werte |
| --- | --- | --- |
| Abb. 5-3a | 1000 ft | 1,1 min · 1,3 NM · 0,6 l |
| Abb. 5-3a | 2000 ft | 2,2 min · 2,6 NM · 1,2 l |
| Abb. 5-3a | 6000 ft | 6,7 min · 8,5 NM · 3,7 l |
| Abb. 5-3a | 7000 ft | 7,8 min · 10,1 NM · 4,4 l |
| Abb. 5-4a | 6000 ft / 70 % | KTAS 116 · 22,1 l/h |
| Abb. 5-4a | 6000 ft / 60 % | KTAS 109 · 18,6 l/h |
| Abb. 5-4a | 8000 ft / 60 % | KTAS 111 · 18,6 l/h |

---

## Fall A — alle Eingaben auf Stützstellen

Bewusst dasselbe Flugvorhaben wie im Rechenbeispiel des Handbuchs (Seite 5-3 bis
5-5), damit Fall C direkt vergleichbar ist.

| Eingabe | Wert |
| --- | --- |
| Platzhöhe Startplatz | 1000 ft |
| Reiseflughöhe | 6000 ft |
| Streckenlänge | 400,0 NM |
| Lasteinstellung | 70 % |
| ISA-Abweichung | +20 °C |
| Windkomponente | +10 kt (Gegenwind) |

| # | Schritt | Rechnung | Ergebnis |
| --- | --- | --- | --- |
| 1 | `startup.taxiTakeoff` | Festbetrag, Anmerkung 1 | 4,0 l |
| 2 | `climb.atDeparture` | Abb. 5-3a bei 1000 ft | 1,1 min · 1,3 NM · 0,6 l |
| 3 | `climb.atCruise` | Abb. 5-3a bei 6000 ft | 6,7 min · 8,5 NM · 3,7 l |
| 4 | `climb.difference` | Zeile 3 − Zeile 2 | 5,6 min · 7,2 NM · 3,1 l |
| 5 | `climb.temperatureCorrection` | × (1 + 20/10 × 0,10) = × 1,20 | 6,72 min · 8,64 NM · 3,72 l |
| 6 | `cruise.tableLookup` | Abb. 5-4a bei 6000 ft / 70 % | KTAS 116 · 22,1 l/h |
| 7 | `cruise.ktasTemperatureCorrection` | 116 × (1 + 20/10 × 0,01) = × 1,02 | 118,32 kt |
| 8 | `cruise.distance` | 400,0 − 8,64 | 391,36 NM |
| 9 | `cruise.groundSpeed` | 118,32 − 10 | 108,32 kt |
| 10 | `cruise.time` | 391,36 / 108,32 | 3,61300 h |
| 11 | `cruise.fuel` | 3,61300 × 22,1 | 79,847 l |
| 12 | `total.fuel` | 4,0 + 3,72 + 79,847 | 87,567 l → **87,6 l** |
| 13 | `total.usableFuelComparison` | 127,4 − 87,6 | 39,8 l verbleiben |

**Erwartetes Ergebnis**: Anlassen/Rollen/Start 4,0 l · Steigflug 3,7 l ·
Reiseflug 79,8 l · **Gesamt 87,6 l** · verbleibend 39,8 l · keine Warnung, da
87,6 l < 127,4 l.

---

## Fall B — mit Interpolation

Prüft die Interpolation in beiden Tabellen sowie Rückenwind und eine
ISA-Abweichung, die kein Vielfaches von 10 °C ist.

| Eingabe | Wert |
| --- | --- |
| Platzhöhe Startplatz | 1500 ft |
| Reiseflughöhe | 7000 ft |
| Streckenlänge | 250,0 NM |
| Lasteinstellung | 60 % |
| ISA-Abweichung | +5 °C |
| Windkomponente | −5 kt (Rückenwind) |

| # | Schritt | Rechnung | Ergebnis |
| --- | --- | --- | --- |
| 1 | `startup.taxiTakeoff` | Festbetrag | 4,0 l |
| 2 | `climb.atDeparture` | zwischen 1000 und 2000 ft, Faktor 0,5 | 1,65 min · 1,95 NM · 0,9 l |
| 3 | `climb.atCruise` | Abb. 5-3a bei 7000 ft (Stützstelle) | 7,8 min · 10,1 NM · 4,4 l |
| 4 | `climb.difference` | Zeile 3 − Zeile 2 | 6,15 min · 8,15 NM · 3,5 l |
| 5 | `climb.temperatureCorrection` | × (1 + 5/10 × 0,10) = × 1,05 | 6,4575 min · 8,5575 NM · 3,675 l |
| 6 | `cruise.tableLookup` | zwischen 6000 (109 kt) und 8000 ft (111 kt) | KTAS 110 · 22,1 → 18,6 l/h |
| 7 | `cruise.ktasTemperatureCorrection` | 110 × (1 + 5/10 × 0,01) = × 1,005 | 110,55 kt |
| 8 | `cruise.distance` | 250,0 − 8,5575 | 241,4425 NM |
| 9 | `cruise.groundSpeed` | 110,55 − (−5) | 115,55 kt |
| 10 | `cruise.time` | 241,4425 / 115,55 | 2,08951 h |
| 11 | `cruise.fuel` | 2,08951 × 18,6 | 38,865 l |
| 12 | `total.fuel` | 4,0 + 3,675 + 38,865 | 46,540 l → **46,5 l** |
| 13 | `total.usableFuelComparison` | 127,4 − 46,5 | 80,9 l verbleiben |

Die Verbrauchsrate ist bei 6000 und 8000 ft identisch (18,6 l/h), die
Interpolation ändert sie daher nicht — das ist erwartet, nicht übersehen: die
Rate hängt allein von der Lasteinstellung ab.

---

## Fall C — Nachrechnen des Handbuch-Beispiels

Das Handbuch rechnet auf Seite 5-3 bis 5-5 ein vollständiges Beispiel vor. Es
verwendet die Tabellen des **Abschnitts 5a** (Propeller MTV-6-A/187-129) und
gilt daher nicht für D-EELK. Als Prüfung des *Verfahrens* ist es dennoch die
beste verfügbare Grundlage, weil die Erwartungswerte vom Hersteller stammen.

Speist man dieselben vier Werte aus 5a in dasselbe Verfahren ein — Steigflug
1000 → 6000 ft: 3,3 l und 7,6 NM; Reiseflug 6000 ft / 70 %: KTAS 120 und
22,1 l/h — und rundet wie das Handbuch nach jedem Schritt, ergibt sich:

| Schritt | Handbuch | nachgerechnet |
| --- | --- | --- |
| Steigflug-Kraftstoff korrigiert | 4,0 l | 4,0 l |
| Steigflugstrecke korrigiert | 9,1 NM | 9,1 NM |
| KTAS korrigiert | 122 kt | 122 kt |
| Reiseflugstrecke | 390,9 NM | 390,9 NM |
| Geschwindigkeit über Grund | 112 kt | 112 kt |
| Reiseflugzeit | 3,5 h | 3,5 h |
| Reiseflug-Kraftstoff | 77,4 l | 77,4 l |
| **Gesamt** | **85,4 l** | **85,4 l** |

Jeder Zwischenwert und die Summe stimmen überein. Das Verfahren ist damit gegen
die Zahlen des Herstellers abgesichert.

**Wichtig für die Umsetzung**: Diese vier 5a-Werte sind ausschließlich
Testvorgaben. Sie dürfen nicht als Tabelle in den Kern gelangen, sonst wäre
FR-015 verletzt. Sie gehören als Zahlenkonstanten in den Test, nicht in
`data/poh/`.

### Herleitung der Differenz zu Fall A

Fall A rechnet dasselbe Flugvorhaben mit den Tabellen der D-EELK und kommt auf
87,6 l statt 85,4 l. Die Differenz von 2,2 l löst sich vollständig auf:

| Schritt | Wirkung | Zwischensumme |
| --- | --- | --- |
| Handbuch-Beispiel (Abschnitt 5a) | | 85,4 l |
| Zwischenrundung des Handbuchs entfernt | −0,59 l | 84,8 l |
| Steigflugwerte 5a → 5b (3,3 → 3,1 l; 7,6 → 7,2 NM) | −0,15 l | 84,7 l |
| KTAS 120 → 116 kt (Propeller MTV-6-A/190-69) | +2,90 l | 87,6 l |

Der Hauptanteil ist der Propeller: D-EELK fliegt bei gleicher Lasteinstellung
4 kt langsamer, braucht für dieselbe Strecke länger und verbraucht daher mehr.
Das ist plausibel und kein Rechenfehler.

---

## Befunde aus dieser Rechnung

1. **Anmerkung 3 ist in 5a und 5b wortgleich**: „Je 10 °C über ISA Temperatur
   erhöhen sich die wahre Fluggeschwindigkeit (KTAS) und die maximale Reichweite
   (NM) um 1 %." Die im Rechenbeispiel genannten „2 %" sind das Ergebnis für
   ISA+20, keine abweichende Regel. Eine frühere Annahme, 5a und 5b würden
   unterschiedlich korrigieren, war falsch und ist in `spec.md` und
   `research.md` korrigiert worden.

2. **Das Handbuch rundet nach jedem Schritt, wir runden einmal** (Zusicherung
   C-03). Beide Wege sind vertretbar, liefern aber leicht unterschiedliche
   Zahlen: in Fall A ergibt schrittweises Runden 87,3 l statt 87,6 l, beim
   5a-Beispiel dagegen 85,4 l statt 84,8 l. Die Abweichung liegt in der
   Größenordnung von ±0,6 l und hat kein festes Vorzeichen. Ein Pilot, der von
   Hand nach dem Handbuch nachrechnet, wird diese Differenz sehen — sie sollte
   erklärt werden, sonst wirkt sie wie ein Fehler.

3. **Das Handbuch nennt den Restkraftstoff „Kraftstoffreserve"** (Seite 5-5:
   „Somit bleibt bei vollen Tanks eine Kraftstoffreserve von 42,0 l"). FR-018
   weicht davon bewusst ab und stellt klar, dass der Rest keine Reserve im
   betrieblichen Sinne ist. Die Abweichung vom Wortlaut ist beabsichtigt, weil
   die 45-Minuten-Reserve in dieser Zahl gerade nicht enthalten ist.

4. **Anmerkung 2 der Reiseleistungstabelle ist eine Falle**: Sie besagt, dass
   *Reichweite und Flugdauer* der Tabelle bereits Rollen, Steigflug und 45 min
   Reserve berücksichtigen. Das gilt nur für die Spalten `range_nm` und
   `endurance_h` — nicht für die Verbrauchsrate, mit der wir rechnen. Wer die
   Spalten verwechselt, zieht diese Posten doppelt ab.
