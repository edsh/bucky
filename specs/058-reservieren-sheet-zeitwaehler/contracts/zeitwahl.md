# Vertrag: `zeitwahl.ts` und `nacht.ts`

**Feature**: 058-reservieren-sheet-zeitwaehler

Die Zusicherungen des neuen Kernmoduls. Jede Regel hier ist ein Test in
`packages/reservierung-core/tests/zeitwahl.test.ts` bzw. `nacht.test.ts`.

Alle Funktionen sind **rein**: keine Uhr, kein Netz, kein DOM, kein
Zufallsgenerator. Der Bezugszeitpunkt wird übergeben, nie geholt — dieselbe Regel
wie im ganzen Kern (E-09 aus 054), und der Grund, warum sich Tageswechsel und
Zeitumstellung überhaupt prüfen lassen.

---

## Konstanten

| Name | Wert | Quelle |
|---|---|---|
| `RASTER` | `15` | Handoff, „Raster: 15 Minuten" |
| `MINDESTDAUER` | `15` | Handoff |
| `NACHRUECKDAUER` | `30` | Handoff, Beginn-Überholung |
| `VORSCHLAGSDAUER` | `120` | Handoff, „Vorschlagsdauer 2 h" |
| `RAHMEN` | `{ von: 360, bis: 1320 }` | Flugtag 06:00–22:00 |

`RAHMEN` ist derselbe Bereich wie `FENSTER_FLUGTAG` in `segmente.ts` und wird von
dort abgeleitet (`BALKEN_VON`/`BALKEN_BIS`), nicht neu hingeschrieben. Zwei
Stellen mit „06:00" wären zwei Stellen, an denen sich das ändern kann.

---

## Z-01 `aufRaster(minute: number): number`

Rundet auf das nächste Vielfache von 15.

- `aufRaster(547)` → `540`; `aufRaster(548)` → `555`
- Die Mitte rundet auf: `aufRaster(547.5)` → `555`
- Negative Werte und Werte über 1440 werden **nicht** beschnitten — das
  Beschneiden ist Sache der aufrufenden Funktion, die ihren Rahmen kennt.

---

## Z-02 `luecken(reservierungen, kennung, tag, abMinute?): Luecke[]`

Die freien Abschnitte eines Ortstages innerhalb des Rahmens.

- Sortiert nach `von`, überschneidungsfrei, alle innerhalb `RAHMEN`.
- Abschnitte kürzer als `MINDESTDAUER` fallen weg.
- Ohne `abMinute`: der ganze Rahmen ist Ausgangslage.
- Mit `abMinute`: die Untergrenze ist `max(RAHMEN.von, aufRaster-aufwärts(abMinute))`.
  Aufgerundet, nicht gerundet — eine Lücke, die vor einer Minute begann, ist als
  Vorschlag vorbei.
- Liegt `abMinute` hinter `RAHMEN.bis`, ist das Ergebnis leer.
- Belegungen, die über Mitternacht in den Tag hineinreichen, zählen mit ihrem
  Anteil an diesem Tag — geschnitten wird bei der Darstellung, nie an den Daten
  (E-06 aus 054).
- Sperren und Reservierungen sind hier gleichwertig: beides ist nicht frei.

**Grenzfall**: Ein ganztägig gesperrter Tag liefert `[]`. Das ist der Leerfall
(FR-044), und er ist von „keine Auskunft" zu unterscheiden — den trifft die
Route, nicht der Kern.

---

## Z-03 `fensterIn(luecke: Luecke, minute: number): Zeitwahlfenster`

Das Fenster, das ein Tipp an dieser Stelle ergibt.

- Dauer ist `min(VORSCHLAGSDAUER, luecke.bis - luecke.von)`.
- Der Beginn ist `clamp(aufRaster(minute), luecke.von, luecke.bis - dauer)`.
- **Passt die volle Dauer nicht mehr ans Ende, rückt der Beginn nach vorn** —
  die Dauer wird nicht gekürzt. Erst wenn die Lücke selbst kürzer als zwei
  Stunden ist, wird das Fenster kürzer.

Beispiel: Lücke 09:00–14:00, Tipp bei 13:30 → `13:30` wäre 12:00–14:00, nicht
13:30–14:00.

---

## Z-04 Gesten

### `zieheKante(fenster, rahmen, kante, minute): Zeitwahlfenster`

`kante` ist `'start'` oder `'ende'`.

- `'start'`: `von = clamp(aufRaster(minute), rahmen.von, fenster.bis - MINDESTDAUER)`.
  **`bis` bleibt unverändert** — die Dauer ändert sich.
- `'ende'`: `bis = clamp(aufRaster(minute), fenster.von + MINDESTDAUER, rahmen.bis)`.
  **`von` bleibt unverändert.**

### `verschiebeBlock(fenster, rahmen, minute): Zeitwahlfenster`

- Die **Dauer bleibt erhalten**.
- `von = clamp(aufRaster(minute), rahmen.von, rahmen.bis - dauer)`, `bis = von + dauer`.
- Am Rahmenrand **stoppt** der Block. Er wird nicht gekürzt, nicht umgebrochen,
  läuft nicht in den nächsten Tag (FR-030).

**`minute` ist bereits um den Griff-Abstand bereinigt** — das ist Sache der
Geste, nicht des Kerns. Der Kern bekommt die gewünschte Beginn-Minute, nicht die
Zeigerposition; sonst müsste er wissen, wo jemand hingefasst hat.

---

## Z-05 Kacheln

### `beginnSetzen(fenster, rahmen, ziel): Zeitwahlfenster`

- `von = clamp(ziel, rahmen.von, rahmen.bis - NACHRUECKDAUER)`
- `bis` **bleibt stehen**, solange `fenster.bis >= von + MINDESTDAUER`.
- Überholt der Beginn das Ende, springt es auf `min(rahmen.bis, von + NACHRUECKDAUER)`.

Aus Szenario 2.1: Ende 14:45, Beginn auf 09:00 → 09:00–14:45 (5:45 h).
Aus Szenario 2.2: Ende 10:00, Beginn auf 11:00 → 11:00–11:30 (30 min).

### `endeSetzen(fenster, rahmen, ziel): Zeitwahlfenster`

- `bis = clamp(ziel, fenster.von + MINDESTDAUER, rahmen.bis)`, `von` bleibt.

### `stundeVon(minute): number`

Die volle Stunde einer Tagesminute; `stundeVon(585)` → `9`, `stundeVon(1320)` → `22`.
Rundet **ab**, nie zur nächsten Stunde.

Steht im Kern und nicht in der Komponente, obwohl es eine Zeile ist: Die
Kachelspalte fragt damit „ist das meine Stunde?" und der Nachführer „welche
Stunde soll sichtbar sein?". Beides sind Aussagen über Minuten, und Adapter
dürfen die Zahlen des Kerns anzeigen, aber nicht selbst mit ihnen rechnen
(Vertrag C-03 aus `deelk-poh-core`).

### `kachelZiel(fenster, art, einheit, wert): number`

Welche Minute eine Kachel meint. Die beiden Spalten sind **unabhängig**:

- Stundenkachel: `wert * 60 + (aktuelleMinute % 60)` — die Minute bleibt.
- Minutenkachel: `floor(aktuelleMinute / 60) * 60 + wert` — die Stunde bleibt.

Aus Szenario 2.3: Beginn 09:20, Stundenkachel 14 → 14:20.

### `kachelMoeglich(fenster, rahmen, art, ziel): boolean`

- Beginn: `rahmen.von <= ziel <= rahmen.bis - NACHRUECKDAUER`
- Ende: `fenster.von + MINDESTDAUER <= ziel <= rahmen.bis`

### `kachelDauer(fenster, rahmen, art, ziel): number`

Die Dauer, die diese Wahl ergäbe — also `beginnSetzen`/`endeSetzen` angewandt und
die Differenz genommen. **Nie negativ, nie unmöglich** (FR-034): Die Vorschau
zeigt exakt das Ergebnis der Regeln, nicht `ziel - fenster.von`.

---

## Z-06 `konflikte(reservierungen, kennung, tag, fenster): Konflikt[]`

Was im gewählten Fenster schon steht.

- Überschneidung, nicht Berührung: `z.von < fensterEnde && z.bis > fensterBeginn`.
  Eine Reservierung, die um 11:00 endet, kollidiert nicht mit einem Fenster ab
  11:00 — dieselbe Grenze wie überall im Haus (Z-01 aus 054).
- Sortiert nach Beginn.
- Text: `'14:00–17:30: reserviert'`, bei Sperren `'14:00–17:30: gesperrt'`.
- Deckt der Eintrag den ganzen Ortstag: `'ganztägig reserviert'` /
  `'ganztägig gesperrt'`.
- Reicht er über den Tag hinaus, gelten die auf den Tag zugeschnittenen
  Uhrzeiten — wie in `tagesbelegungen` (`00:00` / `24:00`).
- **Kein Name, keine Kennzeichnung eigener Buchungen.**

---

## Z-07 `modusFuer(fenster, tag, konflikte, bezugszeitpunkt): Wahlmodus`

Rangfolge, in dieser Reihenfolge geprüft:

1. `tag` ist der Ortstag von `bezugszeitpunkt` **und** `fenster.von <
   minuteDesTages(bezugszeitpunkt)` → `'nachtrag'`
2. `konflikte` enthält eine Sperre → `'gesperrt'`
3. `konflikte` ist nicht leer → `'warteliste'`
4. sonst → `'frei'`

Ein Fenster an einem **künftigen** Tag ist nie `'nachtrag'`, auch wenn seine
Uhrzeit vor der jetzigen liegt.

---

## Z-08 `ausweichluecke(luecken, fenster): Luecke | null`

1. erste Lücke mit `l.von >= fenster.bis`
2. sonst erste mit `l.bis > fenster.von`
3. sonst `luecken[0]`
4. sonst `null` (keine Lücke am Tag)

Der Vorschlag wird anschließend über `fensterIn(luecke, luecke.von)` zu einem
Fenster — höchstens zwei Stunden, nicht die volle Lücke.

---

## Z-09 Formulierungen

### `alsUhrzeitAusMinute(minute): string`

`540` → `'09:00'`. Immer zweistellig, 24-Stunden-Form. `1440` → `'24:00'`, nicht
`'00:00'` — dieselbe Regel wie in `tagesbelegungen`.

### `alsDauerwort(minuten): string`

| Eingabe | Ausgabe |
|---|---|
| `45` | `'45 min'` |
| `120` | `'2 h'` |
| `135` | `'2:15 h'` |
| `15` | `'15 min'` |

Unter 60 Minuten: Minuten. Volle Stunden: `'N h'`. Sonst: `'H:MM h'`.

**`alsDauer(vonIso, bisIso)` aus `formulieren.ts` bleibt unverändert daneben
bestehen.** Der ursprüngliche Entwurf wollte beide zusammenführen; das war ein
Fehler. Sie sagen dasselbe in verschiedenen Formaten, und beide Formate sind
richtig gewählt:

| | `alsDauer` | `alsDauerwort` |
|---|---|---|
| Form | `'3,5 h'` (Dezimalkomma) | `'3:30 h'` (Uhrzeitform) |
| Ort | „Kommende Belegungen" | Dauer-Pille im Sheet |
| Wozu | Dauern **vergleichen** — `3,5 h` neben `2 h` ist auf einen Blick mehr | eine Spanne **ablesen** — sie steht neben `11:30–13:30` |
| Grenze | darf 24 h überschreiten (`'25 h'` am Umstellungstag) | bleibt im Flugtag |

Eine Zusammenführung hätte die Liste „Kommende Belegungen" auf ein Format
umgestellt, das dort schlechter liest, ohne dass irgendjemand das verlangt hätte.
Das Risiko, das die Zusammenführung vermeiden sollte — zwei Formeln laufen
auseinander —, besteht hier nicht: Es sind nicht zwei Formeln für dieselbe
Ausgabe, sondern zwei Ausgaben.

### `alsLueckensatz(fenster, luecken, konflikte): string`

- Mit Konflikten: `'🙅 Überschneidet '` + Texte, verkettet mit `' · '`
- Ohne, und das Fenster liegt in einer Lücke: `'👍 Frei 09:00–14:00'`
- Ohne, aber in keiner Lücke (kommt bei Nachtrag vor): `'👍 Frei'`

Die Emoji sind Teil der Aussage, ersetzen aber keinen Text (Handoff, Abschnitt 7;
NFR-004).

---

## Z-10 `alsWahlfenster(tag, fenster): Zeitfenster`

Aus Ortstag und Tagesminuten das ISO-Paar, das `reservierungsVerweis` erwartet.

- Über `zeitpunktFuerMinute` und `alsIsoMitVersatz` — keine eigene
  Datumsarithmetik.
- Damit gilt Szenario 1.6 ohne neue Adress-Logik:
  `reservierungsVerweis('D-EELK', alsWahlfenster('2026-08-13', { von: 690, bis: 810 }))`
  → `…&frm_apid=75132&frm_datefrom=13.08.2026&frm_dateto=13.08.2026&frm_datefromtime=11:30&frm_datetotime=13:30`

`reservierungs-verweis.ts` bleibt **unverändert**. Der Wähler liefert nur ein
anderes Fenster als bisher der Kernvorschlag.

---

## N-01 `nachtstops(sonnenzeiten, tag, fenster?): Nachtstops | null`

**Aus `nacht.ts`.**

- `null`, wenn keine Sonnenzeiten für den Tag vorliegen (SC-009).
- `morgens.klar` = Anteil von `(aufgang + DAEMMERUNG - fenster.vonMinute) /
  breite`; `morgens` ist `null`, wenn der Aufgang vor `fenster.vonMinute` liegt.
- `abends.klar` = Anteil von `(untergang - DAEMMERUNG - fenster.vonMinute) /
  breite`; `abends` ist `null`, wenn der Untergang nach `fenster.bisMinute` liegt.
- `DAEMMERUNG` = 10 Minuten (Handoff).
- Anteile werden auf `0…1` beschnitten.
- Voreinstellung für `fenster` ist `FENSTER_FLUGTAG` — dieselbe Größe, mit der
  `balkensegmente` rechnet.

**Prüfung am Beispiel des Handoffs**: Aufgang 06:05, Untergang 20:40, Fenster
06:00–22:00 (960 min) →  Sonnenzeit-Stops bei 0,52 % und 91,67 %, klare Stops bei
1,56 % und 90,63 %. Das sind die Zahlen, die der Prototyp fest eingetragen hat.

---

## Was ausdrücklich **nicht** im Vertrag steht

- Farben, Pixel, Prozentzeichen, CSS. Der Kern liefert Zahlen (Prinzip IV).
- Der Tagesindex 0…6. Er ist eine Anzeigegröße des Tageswechslers und wird an der
  Oberfläche aus dem Ortstag gebildet (research.md, E-02).
- Zeigerpositionen, Rechtecke, Scrollstände.
- Der Merkzettel der laufenden Geste.
