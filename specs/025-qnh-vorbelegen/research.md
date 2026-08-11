# Phase 0 — Recherche: QNH für EDSH aus einem Onlinedienst vorbelegen

**Feature**: 025 · **Spec**: [spec.md](./spec.md) · **Datum**: 2026-08-11

Alle Messungen dieser Seite wurden am 11.08.2026 zwischen 06:45 und 08:00 UTC
erhoben. Sie sind Momentaufnahmen; die Größenordnungen sind belastbar, die
Einzelwerte nicht reproduzierbar.

---

## R0 — Wo liegt EDSH?

**Entscheidung**: EDSH ist **Backnang-Heiningen**, 48,9197 N / 9,4553 E,
296 m ≙ 971 ft, Sonderlandeplatz mit Graspiste 10/28 (500 m), PPR, betrieben vom
Luftsportverein Backnang-Heiningen — dem Verein, dem dieser Rechner dient.

**Warum das hier steht**: Eine frühere Fassung der Recherche zu diesem Feature
hatte den Platz auf 53,933 N / 9,996 E bei 18 m verortet. Das ist Hartenholm
(**EDHM**) in Schleswig-Holstein, 559 km entfernt. Sämtliche daraus abgeleiteten
Aussagen waren damit hinfällig — nicht nur die Zahlen, sondern eine
Schlussfolgerung (siehe R4).

**Woran es lag**: Zwei Fehlschlüsse, die sich gegenseitig gestützt haben.

1. „SH" wurde als Bundesland gelesen — Kfz-Systematik statt ICAO-Systematik. Bei
   deutschen Plätzen kodiert der **zweite** Buchstabe die Region: `EDS…` ist
   Baden-Württemberg (EDDS Stuttgart, EDSB Karlsruhe/Baden-Baden), `EDH…` ist
   der Norden (EDDH Hamburg, EDHI Finkenwerder, EDHL Lübeck, EDHM Hartenholm).
   Das `S` in EDSH sagt bereits „Baden-Württemberg"; das `H` ist ein laufender
   Kennbuchstabe.
2. Auf dieser Fährte wurde ein passender Nordplatz gesucht und gefunden. Danach
   fügte sich alles: nahe Kleinstationen ohne Druckgeber, ein Verkehrsflughafen
   in 34 km, flaches Gelände. Ein in sich stimmiges Bild ist aber kein Beleg für
   die Ausgangsannahme.

**Was es verhindert hätte**: Der Rest des Projekts war die ganze Zeit richtig —
das Repository gehört zum LSV Backnang-Heiningen, die Schnellwahl setzt seit
Feature 004 **971 ft**, und Feature 023 nennt die Graspiste. Mit 18 m wäre das
unvereinbar gewesen. **Regel für künftige Recherchen**: Bei einem ICAO-Code
zuerst den Platz nachschlagen und Name, Koordinaten und Höhe gegen eine Quelle
prüfen, statt sie aus dem Kürzel zu erschließen.

---

## R1 — Welcher Dienst kommt in Frage?

**Entscheidung**: **Open-Meteo** (`api.open-meteo.com`), ein Abruf, kein
Schlüssel, kein Konto.

```
GET https://api.open-meteo.com/v1/forecast
      ?latitude=48.9197&longitude=9.4553
      &current=surface_pressure,pressure_msl,temperature_2m,
               wind_speed_10m,wind_direction_10m
      &wind_speed_unit=kn&timezone=UTC
```

**Begründung — der Ausschlag gibt CORS.** Die Seite wird statisch ausgeliefert
(`adapter-static`, GitHub Pages); es gibt keinen eigenen Server, der den Abruf
übernehmen könnte. Der Dienst muss also **aus dem Browser** erreichbar sein.
Gemessen wurde deshalb nicht mit `curl` — das ignoriert CORS und führt zu
falschen Schlüssen —, sondern mit einem echten `fetch` aus einer Seite fremder
Herkunft in Chromium:

| Quelle | Im Browser | Schlüssel nötig |
| --- | --- | --- |
| `api.open-meteo.com` | **OK 200** | nein |
| `opendata.dwd.de` (Stationsbericht) | blockiert | – |
| `aviationweather.gov/api/data/metar` | blockiert | – |
| `aviationweather.gov/cgi-bin/data/metar.php` | blockiert | – |
| `tgftp.nws.noaa.gov` (METAR roh) | blockiert | – |
| `avwx.rest` | erreichbar, aber `401` | **ja** |

Bei den blockierten Quellen fehlt schlicht `Access-Control-Allow-Origin`:

```bash
curl -s -D - -o /dev/null -H "Origin: https://edsh.github.io" \
  https://opendata.dwd.de/weather/weather_reports/poi/10739-BEOB.csv \
  | grep -i access-control
# (keine Ausgabe)
```

Open-Meteo ist damit die **einzige** geprüfte Quelle, die ohne Zusatzbau
funktioniert. Für jede andere bräuchte es einen Weiterleiter — ein Cloudflare
Worker oder ein GitHub-Actions-Cronjob, der die Werte als JSON neben die Seite
legt. Beides wäre zusätzlicher Betrieb für eine Bequemlichkeitsfunktion.

**Auflagen**: CC-BY 4.0, also Namensnennung („Wetterdaten von Open-Meteo.com"
mit Verweis) — daher FR-010. Kostenlos nicht-kommerziell bis 10 000 Abrufe/Tag;
bei einem Verein unkritisch.

**Verworfene Alternativen**: siehe R2 (DWD) und R3 (METAR).

---

## R2 — Warum nicht der DWD-Stationsbericht?

**Entscheidung**: Nicht verwendet.

**Begründung**:

*Erstens CORS* (R1) — allein schon ausschlaggebend.

*Zweitens messen die nächsten Stationen keinen Druck.* Die beiden
nächstgelegenen DWD-Stationen führen die Druckspalte auf `---`; erst ab rund
20 km gibt es Druck:

| Entfernung | Kennung | Station | Höhe | Druck |
| --- | --- | --- | --- | --- |
| 12 km | Q242 | Obersulm-Willsbach | 230 m | `---` |
| 14 km | Q351 | Großerlach-Mannenweiler | 523 m | `---` |
| 19 km | 10747 | Kaisersbach-Cronhütte | 489 m | 1021,6 |
| 21 km | 10739 | Stuttgart-Schnarrenberg | 314 m | 1021,8 |
| 23 km | 10742 | Öhringen | 276 m | 1022,2 |
| 31 km | 10738 | Stuttgart-Echterdingen | 371 m | 1021,4 |

Ermittelt über den MOSMIX-Stationskatalog gegen das POI-Verzeichnis.
**Zwei Fallen dabei**, beide sind beim ersten Anlauf zugeschnappt:

- Der Katalog notiert Breite und Länge in **Grad und Minuten**, nicht in
  Dezimalgrad. Eine naive Auswertung setzt die Stationen um mehrere Kilometer
  versetzt und ändert die Reihenfolge der Nachbarschaft.
- Die Spalte „Stationskennung" im DWD-Stationslexikon ist **nicht** die
  WMO-Nummer, unter der die POI-Dateien liegen. Wer sie gleichsetzt, bekommt
  Treffer, die es gibt, aber die falsche Station meinen — im ersten Anlauf eine
  angebliche Station „7 km entfernt", die tatsächlich im Harz stand. Erkennbar
  war es an der Physik: 4 hPa Streuung zwischen Nachbarstationen derselben
  Stunde gibt es nicht.

Für sich genommen wäre das kein Ausschlussgrund — Schnarrenberg liegt mit 314 m
nah an der Platzhöhe, und 21 km sind vertretbar.

*Drittens, und fachlich entscheidend: Der DWD liefert QFF, nicht QNH.* Siehe R4.

---

## R3 — Warum nicht METAR?

**Entscheidung**: Nicht verwendet.

**Begründung**: EDSH hat kein METAR — `aviationweather.gov` liefert für
`ids=EDSH` eine leere Antwort. Die nächsten Plätze mit METAR sind EDDS
(Stuttgart, 31 km SW) und EDTY (Schwäbisch Hall, 33 km NO). Bei kräftigem
Druckgradienten ist das schnell 1 hPa daneben. Vor allem aber sind alle frei
zugänglichen METAR-Endpunkte im Browser gesperrt (R1); es bräuchte zusätzlich
einen Weiterleiter. Ein METAR wäre die fachlich sauberste Quelle — es ist bereits
QNH und eine Messung —, nur ist keines erreichbar.

---

## R4 — QFF oder QNH? (die sicherheitsrelevante Frage)

**Entscheidung**: `pressure_msl` wird **nicht** verwendet. Der QNH entsteht aus
`surface_pressure` über die Standardatmosphäre.

**Begründung**: Beide Größen heißen umgangssprachlich „Luftdruck auf
Meereshöhe", sind aber verschieden:

- **QFF** — mit der *tatsächlichen* Temperatur auf Meereshöhe reduziert. Das ist
  die DWD-Spalte `pressure_reduced_to_mean_sea_level` und das ist Open-Meteos
  `pressure_msl`.
- **QNH** — *altimeter setting*, mit der Normatmosphäre reduziert. Das ist der
  Wert im METAR und der, den der Höhenmesser braucht.

Der Unterschied wächst mit Höhe und Temperaturabweichung:

| Höhe | Temperatur | QNH − QFF |
| --- | --- | --- |
| **296 m (EDSH)** | +30 °C | **+2,0 hPa** |
| **296 m (EDSH)** | +20 °C | **+0,8 hPa** |
| **296 m (EDSH)** | ±0 °C | **−1,7 hPa** |
| **296 m (EDSH)** | −10 °C | **−3,1 hPa** |
| 18 m (Meereshöhe) | +20 °C | +0,04 hPa |
| 18 m (Meereshöhe) | −10 °C | −0,2 hPa |

**Genau hier schlägt der Ortsfehler aus R0 durch.** Die frühere Fassung schloss
aus der unteren Zeilengruppe: „Für EDSH ist der Unterschied belanglos (0,2 hPa
≈ 2 m)." Das galt für 18 m. Auf 296 m sind es an einem kalten Wintertag
**3,1 hPa, also rund 80 ft Höhenfehler** — aus einer Fußnote wird eine
Anforderung (FR-020, FR-024). Nachweisbar an einer Station, die beides liefert:

```bash
curl -s https://opendata.dwd.de/weather/weather_reports/poi/10738-BEOB.csv \
  | awk -F';' 'NR==4{print $1, $2, "QFF:", $37, "T:", $10}'
# 11.08.26 07:00 QFF: 1021,4 T: 22,0

curl -s "https://aviationweather.gov/api/data/metar?ids=EDDS&format=json" \
  | python3 -c "import json,sys; print(json.load(sys.stdin)[0]['rawOb'])"
# METAR EDDS 110750Z AUTO 09006KT 050V130 CAVOK 23/12 Q1023 NOSIG
```

1021,4 gegen Q1023 — der Temperatureffekt, an einem warmen Sommermorgen, in die
erwartete Richtung.

---

## R5 — Woher stammen die Werte von Open-Meteo?

**Entscheidung**: Der Wert wird als **Modellwert** gekennzeichnet, nicht als
Messung (FR-011), und mit seiner **Gültigkeitszeit** statt einer
Beobachtungszeit angezeigt (FR-005).

**Begründung**: In EDSH steht keine Wetterstation. Open-Meteo liefert
Rechenwerte aus dem ICON des DWD, für Deutschland in der feinsten Stufe
**ICON-D2** (2,2 km Gitter). Beobachtungen — Stationen, Radiosonden, Radar,
Satellit, Flugzeugmeldungen — stecken darin, aber als Anfangszustand eines
Modells, nicht als Messung an diesem Punkt.

*Am Gitter ablesbar*: Die Antwort rastet auf 0,02° ein, also rund 2,2 km.
Explizit angeforderte Modelle bestätigen es; `best_match` und `icon_seamless`
liefern für EDSH dasselbe wie `icon_d2`:

| Modell | Temperatur |
| --- | --- |
| `icon_d2` | 24,1 °C |
| `icon_eu` | 23,1 °C |
| `icon_global` | 23,5 °C |
| `best_match` / `icon_seamless` | 24,1 °C |

*Der Zeitstempel ist nicht das Alter.* ICON-D2 läuft alle drei Stunden und
braucht rund zwei Stunden bis zur Bereitstellung. Der Wert zur aktuellen Stunde
ist deshalb in der Regel eine kurzfristige Vorhersage, keine Analyse von gerade
eben. Angezeigt wird die **Gültigkeit** — Formulierung eher „Modellwert für
08:00 UTC" als „Beobachtung von 08:00 UTC".

*Für den Wind gilt der Vorbehalt am stärksten*: `wind_speed_10m` ist ein
Flächenmittel über 2,2 km in 10 m Höhe. Böen, Hangeffekte und die Lage in der
Backnanger Bucht bildet das nicht ab — mit ein Grund, den Wind aus diesem
Feature herauszuhalten.

---

## R6 — Auf welche Höhe bezieht sich `surface_pressure`?

**Entscheidung**: Die Platzhöhe wird dem Dienst mit `&elevation=296`
**ausdrücklich mitgegeben**, und die Umrechnung im Kern verwendet dieselbe Höhe
(971 ft, die Zahl der bestehenden Schnellwahl).

**Begründung**: Ohne diesen Parameter meldet der Dienst eine Höhe von 296 m —
verlockend nah an der AIP-Höhe von EDSH, aber es ist ein **Geländemodell**, auf
das Open-Meteo die Werte herunterrechnet, nicht die Modellorografie. Sichtbar
mit `elevation=nan`, das dieses Herunterrechnen abschaltet:

| Abruf | gemeldete Höhe | Stationsdruck |
| --- | --- | --- |
| Standard (Höhenmodell) | 296 m | 987,9 hPa |
| `&elevation=nan` (rohe Modellorografie) | 305 m | 986,9 hPa |

Dass die Standardantwort die AIP-Höhe trifft, ist erfreulich, aber eine
Eigenschaft des Geländemodells und damit nichts, worauf sich eine
sicherheitsrelevante Rechnung stillschweigend verlassen sollte. Mit
ausdrücklicher Höhe ist eindeutig, auf welche Höhe sich der gelieferte Druck
bezieht — und es ist genau die Höhe, mit der der Kern zurückrechnet. Ein
stillschweigender Wechsel des Geländemodells könnte das Ergebnis sonst
verschieben, ohne dass sich am Code etwas ändert.

**Verworfene Alternative**: *Die vom Dienst gemeldete Höhe übernehmen.* Sie
funktioniert heute, koppelt das Ergebnis aber an fremde Daten und macht die
Prüfung „stimmt die Höhe noch?" zu einer laufenden Aufgabe.

---

## R7 — Wie robust ist der Rechenweg?

**Entscheidung**: Der Rechenweg über `surface_pressure` + Standardatmosphäre
wird übernommen; die Nachbarschaftsprobe unten ist der Beleg.

**Begründung — die ISA-Reduktion macht die Gitterzelle nahezu gleichgültig.**
Über zwölf Nachbarzellen um EDSH schwankt die Zellenhöhe zwischen 279 und 483 m
und der Stationsdruck entsprechend zwischen 967 und 990 hPa. Der daraus
gerechnete QNH schwankt nur zwischen **1023,2 und 1023,7 hPa** — die einzige
abweichende Zelle (1024,3) ist der 483 m hohe Welzheimer Wald. Aus 22 hPa
Streuung im Rohwert werden 0,5 hPa im Ergebnis. Ein Griff in die Nachbarzelle
wäre also unkritisch.

**Gegenprobe an Plätzen mit METAR**, dieselbe Stunde (11.08.2026, 0750Z):

| Platz | METAR | aus `surface_pressure` gerechnet | aus `pressure_msl` (QFF) |
| --- | --- | --- | --- |
| EDDS (396 m) | Q1023 | 1023,5 | 1022,0 |
| EDTY (398 m) | Q1023 | 1024,1 | 1022,5 |
| EDDN (310 m) | Q1023 | 1023,9 | 1022,8 |

Der gerechnete Wert liegt innerhalb von etwa 1 hPa und trifft nach dem
Abschneiden auf ganze hPa zweimal von drei Mal exakt. `pressure_msl` liegt
durchgängig 0,5–1 hPa zu tief — der Rechenweg über den Stationsdruck ist also
nicht nur formal richtiger, sondern messbar besser (SC-004).

**Modell gegen echte Messung** (DWD-Stationsberichte derselben Stunde,
Modellwert am Stationsort, QFF gegen QFF verglichen):

| Station | T gemessen | T Modell | Δ | Druck gemessen | Druck Modell | Δ |
| --- | --- | --- | --- | --- | --- | --- |
| Stuttgart-Schnarrenberg | 21,7 °C | 21,1 °C | −0,6 | 1021,8 | 1022,0 | +0,2 |
| Kaisersbach-Cronhütte | 20,4 °C | 19,7 °C | −0,7 | 1021,6 | 1022,3 | +0,7 |
| Öhringen | 21,1 °C | 21,4 °C | +0,3 | 1022,2 | 1022,3 | +0,1 |
| Stuttgart-Echterdingen | 22,0 °C | 21,1 °C | −0,9 | 1021,4 | 1022,0 | +0,6 |

Rund 1 K bei der Temperatur, unter 1 hPa beim Druck. Für einen Vorschlagswert
taugt das; als ATIS-Ersatz nicht.

---

## R8 — Welche Formel, und wo?

**Entscheidung**: Der Kern bekommt eine Umkehrfunktion zu `toPressureAltitude`,
etwa `toQnh(stationPressureHpa, elevationFt)` in `atmosphere/`. Sie verwendet
die **bereits vorhandenen** Konstanten und dieselbe Quellenreferenz
`ICAO_STANDARD_ATMOSPHERE_SOURCE`.

**Begründung**: Die Quellenreferenz im Kern führt die Beziehung bereits im
Wortlaut:

```
p = QNH · (1 − L·h/T₀)^5,25588
```

Der gesuchte Wert ist deren Umstellung, mehr nicht:

```
QNH = p_stat / (1 − L·h/T₀)^5,25588
```

Es entsteht also **keine neue Physik und keine zweite Formel** — genau das
verlangt Prinzip IV. Die anderswo gebräuchliche Schreibweise
`p·(1 + L·h/(T₀ − L·h))^(g/(R·L))` ist algebraisch dieselbe; sie wird nicht
übernommen, weil sie zweite Konstanten (g, R) einführen würde, wo der Kern
bereits einen zusammengefassten Exponenten führt.

**Probe**: 987,9 hPa auf 971 ft ergibt **1023,30 hPa**, passend zum regionalen
Q1023. Über den Meterweg gerechnet (296 m) kommen 1023,305 heraus — die
Abweichung von 0,005 hPa stammt allein aus der Rundung 971 ft ↔ 296 m und liegt
weit unter der Anzeigegenauigkeit.

**Der Kern bleibt netzfrei** (FR-022): Er bekommt zwei Zahlen und gibt eine
zurück. Das Holen ist Adapterarbeit.

---

## R9 — Runden: wie und in welche Richtung?

**Entscheidung**: Auf ganze hPa **abrunden** (FR-024). Der ungerundete Wert
bleibt sichtbar.

**Begründung**: Der Regler kennt nur ganze hPa (Bereich 950–1050, Schritt 1, aus
dem Kern). Es muss also gerundet werden. Die Richtung ist keine
Geschmacksfrage:

- **Es entspricht der Praxis.** Ein METAR schneidet den QNH auf ganze hPa ab; aus
  1023,7 wird Q1023. Der Pilot bekommt damit denselben Wert, den er auch vom
  ATIS ablesen würde.
- **Es ist die sichere Richtung.** Ein zu niedrig angesetzter QNH ergibt eine
  **größere** Druckhöhe — und damit eine längere ausgewiesene Startstrecke und
  einen höheren Verbrauch. Wer sich danach richtet, plant konservativer. Ein zu
  hoch angesetzter QNH täte das Gegenteil.

**Größenordnung**: 1 hPa entspricht rund 27 ft Druckhöhe (auf 971 ft
Platzhöhe: 707,5 ft bei QNH 1023, 680,6 ft bei 1024). Die Rundung ist also
kein Rauschen, aber auch keine Größe, die eine Startstreckenentscheidung kippt.

---

## R10 — Was passiert bei Ausfall?

**Entscheidung**: Zeitüberschreitung nach 10 Sekunden, Fehlermeldung im Dialog,
erneuter Versuch möglich, keine Veränderung an den Eingaben (FR-013 bis FR-017).

**Begründung**: Der Rechner wird am Platz gebraucht, und dort ist das Netz
schlecht. Eine Bequemlichkeitsfunktion darf den Rechner nicht verletzlicher
machen als er ohne sie wäre. Daraus folgt auch, dass der Abruf **nicht** beim
Laden der Seite geschieht: Sonst hinge die Seite an einem fremden Dienst, bevor
der Pilot überhaupt etwas angefordert hat. Zehn Sekunden sind lang genug für
eine träge Mobilverbindung und kurz genug, dass niemand auf einen Spinner
starrt.

---

## Offene Punkte für spätere Features

- **Temperatur vorbelegen.** Die Oberfläche führt eine ISA-Abweichung, keine
  Platztemperatur. Aus `temperature_2m` und der Druckhöhe ließe sie sich
  herleiten — das ist aber eine eigene fachliche Entscheidung, samt der Frage,
  ob zwei Wege zur selben Temperatur nebeneinander bestehen dürfen.
- **Wind vorbelegen.** `wind_direction_10m` und `wind_speed_10m` gegen die Bahn
  10/28 gerechnet ergäbe die Komponente. Offen ist, wie mit Seitenwind und mit
  der schlechten Modellgüte in Bodennähe umzugehen ist.
- **Andere Plätze.** Sobald der Rechner über EDSH hinaus genutzt wird, braucht
  es eine Platzauswahl statt einer Schnellwahl — dann auch mit der Frage, woher
  Koordinaten und Platzhöhe kommen.
