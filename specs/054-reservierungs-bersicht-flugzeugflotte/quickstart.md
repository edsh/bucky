# Quickstart: Reservierungsübersicht Flugzeugflotte

**Feature**: 054 | **Datum**: 2026-08-18

Nachweisführung für dieses Feature — was zu tun ist, um zu belegen, dass es
wirklich funktioniert. Kein Umsetzungsleitfaden; der entsteht in `tasks.md`.

---

## Voraussetzungen

### Die Abo-Adresse

Unverändert aus Feature 052: ein **Geheimnis**, das in keiner Datei dieser
Ablage steht, in keiner Commit-Botschaft, keinem Issue und keinem
Bildschirmfoto. Örtlich nur in der laufenden Sitzung:

```bash
read -rs KALENDER_ABO_URL && export KALENDER_ABO_URL
```

Abgerufene Kalenderdaten enthalten **Mitgliedsnamen**. Nach dem Prüfen löschen.

### Örtlich einrichten

```bash
npm install
npm run build
```

### Beide Worker mit gemeinsamem Speicher

Die Übersicht liest den KV-Speicher, den der Abruf-Worker füllt — und seit
diesem Feature auch die Sonnenzeiten (E-08). Örtlich hat jeder Worker seinen
eigenen Speicher, deshalb `--persist-to` auf denselben Ort (Abschnitt „Der
zweite Worker" in `README.md`).

---

## Nachweis 1 — Der Kern deutet die ganze Flotte *(E-01, E-02)*

```bash
npm run test -- --project reservierung-core
```

**Erwartung**: Die Vertragsprüfung gegen den echten Kalenderabzug findet
**sechs** Kennzeichen — `D-EELK`, `D-EXYZ`, `D-MRXS` (Motorflugzeuge & UL)
sowie `D-9021`, `D-4413`, `D-3004` (Segelflugzeuge) — und ordnet jedes allein
aus dem Kennzeichen der richtigen Kategorie zu. `GRILL`, `LANDEBAR` und
`Werkstatt` sind **nicht** darunter.

**Schlägt das fehl**, ist die Kategorieregel aus E-02 widerlegt und muss durch
eine gepflegte Spalte ersetzt werden — bevor weitergebaut wird, nicht danach.

## Nachweis 2 — Der Ring sitzt *(contracts/tagesuhr.md)*

```bash
npm run test -- --project reservierung-core -t tagesuhr
```

**Erwartung**: T-01 bis T-12 grün, insbesondere `winkelFuerMinute(0) === 165`
(T-02) und die lückenlose 360°-Abdeckung (T-05).

Zusätzlich mit bloßem Auge am Bildschirm: Der Jetzt-Strich steht dort, wo die
Uhr es sagt. Ein Ring, der rechnerisch stimmt und optisch verdreht ist, fällt
nur so auf.

## Nachweis 2a — Die Skala steht still, die Farbe wandert *(E-15, T-06)*

Denselben Reservierungssatz einmal mit den Sonnenzeiten des 21. Juni
(04:47/21:55), einmal mit denen des 21. Dezember (08:44/15:57) und einmal mit
`null` durch die Segmentbildung schicken.

**Erwartung**: Die Winkel sind in allen drei Fällen **identisch** — dieselbe
Uhrzeit liegt an derselben Ringstelle, das ganze Jahr über. Nur die Füllung
`nacht` verschiebt sich: im Dezember reicht sie sichtbar in den Nachmittag
hinein, im Juni schrumpft sie in die gestauchte Zone, bei `null` liegt sie
exakt auf 135°–225°.

Das ist der Nachweis gegen den Fehler, den der Design-Handoff eingebaut hatte:
Ein im August gebauter Ring, dessen Farbgrenze fest auf 21:00/06:00 sitzt,
behauptet im Dezember über fünf Stunden Tageslicht, die es nicht gibt.

## Nachweis 3 — Eine freie Maschine ohne jede Reservierung erscheint *(E-01)*

Eine Kennung in die Stammliste aufnehmen, die im Kalender **nicht** vorkommt,
und die Übersicht öffnen.

**Erwartung**: Die Maschine erscheint mit durchgehend grünem Ring (mit dunklem
Nachtanteil an den echten Sonnenzeiten) und dem Kurzsatz „frei den ganzen
Tag". Sie erscheint **nicht** in
der Favoritenreihe und **nicht** doppelt.

Das ist der Nachweis, den die ursprüngliche Annahme der Spec („Flotte aus den
Daten ableiten") nicht bestanden hätte.

## Nachweis 4 — Kein Stand heißt kein „frei" *(F-03, SC-003)*

```bash
# Kalender-Weg unerreichbar machen und den Rückfall leeren:
KALENDER_ABO_URL=https://example.invalid/kalender.ics \
  npx wrangler dev --config apps/web/wrangler.jsonc --port 8787 --persist-to .wrangler-gemeinsam
curl -s http://localhost:8787/api/flotte | head -c 400
```

**Erwartung**: Status `200`, `"stand": "fehlt"`, **kein** Feld `belegungen`,
aber eine gefüllte `flotte`. Die Oberfläche sagt offen, dass keine Auskunft
vorliegt, und behauptet für **keine** Maschine „frei".

**Auf keinen Fall** darf hier eine Maschine grün erscheinen. Das ist der
Fehler, der jemanden zum Platz fahren lässt.

## Nachweis 5 — Die Antwort trägt keine Namen *(F-05, FR-023, SC-006)*

```bash
curl -s http://localhost:8787/api/flotte > /tmp/flotte.json
grep -ci "pilot\|name\|bemerkung\|lehrer" /tmp/flotte.json
rm /tmp/flotte.json
```

**Erwartung**: `0`. Zusätzlich stichprobenhaft gegen die Namen aus dem echten
Kalenderabzug prüfen — der Zähler findet nur Feldnamen, nicht jeden möglichen
Inhalt.

## Nachweis 6 — Die Anzeige zieht nach *(FR-016, E-09)*

Die Übersicht öffnen, die Systemuhr des Rechners um 70 Minuten vorstellen
(oder eine Maschine wählen, deren Belegung in wenigen Minuten beginnt) und
**ohne Neuladen** warten.

**Erwartung**: Innerhalb einer Minute wandert der Jetzt-Strich, die
Statusfarbe verschiebt sich Richtung Rot und der Satz ändert sich. Das
Netzwerkprotokoll zeigt dabei **keinen** neuen Abruf von `/api/flotte`.

## Nachweis 7 — Der Wetterdienst wird nicht je Besucher gefragt *(F-09, Prinzip V)*

Die Übersicht zehnmal neu laden und das Netzwerkprotokoll des Workers ansehen.

**Erwartung**: **null** ausgehende Aufrufe an `api.open-meteo.com`. Die
Sonnenzeiten kommen aus dem KV-Schlüssel `sonnenzeiten`, den der Abruf-Worker
höchstens einmal am Tag schreibt.

Gegenprobe: den Schlüssel löschen und die Seite laden.

**Erwartung**: Der Ring erscheint vollständig, nur die beiden Sonnenmarker
fehlen (E-08).

## Nachweis 8 — Favoriten bleiben auf dem Gerät *(FR-007a/b, SC-004)*

1. In einem frischen privaten Fenster die Übersicht öffnen →
   **keine** Favoritenreihe, auch keine leere.
2. Eine Maschine als Favorit markieren, neu laden → sie steht oben und
   **nicht** zusätzlich in ihrer Kategoriegruppe.
3. Ein zweites privates Fenster öffnen → dort keine Markierung.
4. Alle Favoriten wieder abwählen, neu laden → die Reihe verschwindet ganz.

## Nachweis 9 — Vorschau auf dem Telefon

Dieses Feature ändert Aussehen und Bedienung grundlegend. Vor der
Merge-Rückfrage gehört die Vorschau angeboten: Die Ablaufsteuerung lädt jeden
Vorschlag nach `https://pr-<nummer>-bucky.edsh.workers.dev` und schreibt die
Adresse als Kommentar hinein.

**Erwartung**: Auf einem echten Telefon einspaltig, Tap-Ziele bequem
treffbar, Ring und Statuspunkt scharf, Hell- und Dunkeldarstellung beide
brauchbar.

Ein Bildschirmfoto des Agenten ersetzt das nicht. Ob der Ring „richtig
aussieht", entscheidet, wer die Seite in der Hand hält.

---

## Was dieses Feature **nicht** nachweist

- **Eigene Reservierungen** sind zurückgestellt (E-11). Jeder fremde wie eigene
  Eintrag erscheint als „Reserviert"; es gibt nichts zu prüfen.
- **Vorbelegung des Vereinsflieger-Formulars** findet nicht statt (E-13). Der
  Vorschlag steht im Sheet, der Verweis ist unparametrisiert.
- **POH-Verweise** existieren nur für die D-EELK (FR-018).
