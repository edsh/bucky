# Phase 0 — Recherche: Windregler trennen

Feature: [spec.md](./spec.md) · Plan: [plan.md](./plan.md) · Issue
[#26](https://github.com/edsh/bucky/issues/26)

## R1 — Wie führt der Kern die beiden Windgrößen heute?

**Befund**: Getrennt, mit zwei verschiedenen Bereichen.

- `packages/deelk-poh-core/src/fuel/input.ts` führt
  `WIND_COMPONENT_RANGE = { min: -50, max: 50, unit: 'kt', step: 1 }`. Dieser
  Bereich beschreibt den Wind entlang der Reisestrecke; er geht in
  `computeFuelPlan` und über `getFuelPlanInputDomain()` an die Oberfläche.
- `packages/deelk-poh-core/src/takeoff/input.ts` führt in
  `getTakeoffInputDomain()` ein eigenes `windComponentKt` mit
  `min: -MAX_TAILWIND_KT` (also −10) und derselben Obergrenze wie oben. Der
  Kommentar dort sagt ausdrücklich, dass dieser Bereich **neben** dem des
  Kraftstoffbedarfs steht und ihn nicht verengt.

**Was daraus folgt**: Die Oberfläche bezog bisher `domain.windComponentKt` aus
`getFuelPlanInputDomain()` und schickte denselben Wert in beide Rechnungen.
`getTakeoffInputDomain().windComponentKt` wurde nie benutzt — der Kern hielt
eine Trennung bereit, die kein Adapter abgerufen hat.

**Entscheidung**: Beide Bereiche werden benutzt, jeder an seinem Regler. Kein
neuer Bereich, keine Änderung am Kern.

**Verworfen**: Einen gemeinsamen Bereich in den Kern einziehen und beide Regler
daraus speisen. Das hätte entweder die Startstreckentabelle überdehnt (−50 kt
Rückenwind, wofür es keine Werte gibt) oder die Bedarfsrechnung ohne fachlichen
Grund beschnitten (−10 kt Streckenwind, obwohl die Reiseleistungstabelle
beliebigen Gegen- und Rückenwind verkraftet).

## R2 — Was sagt das Original-POH zu Windgrenzen?

Recherchiert im Original-Flughandbuch der D-EELK
(`Model_172172N1978_172NPOHD1109-1-13.pdf`, 242 Seiten, reiner Scan ohne
Textebene; Seiten mit `pdftoppm` gerendert und einzeln gelesen).

**Befund 1 — Abschnitt 2 (LIMITATIONS) nennt keinen Windwert.** Das
Inhaltsverzeichnis auf POH-Seite 2-1 führt: Airspeed Limitations, Power Plant
Limitations, Weight Limits, Center Of Gravity Limits, Maneuver Limits, Flight
Load Factor Limits, Kinds Of Operation Limits, Fuel Limitations, Placards. Wind
kommt nicht vor. Es gibt bei der 172N schlicht keine Windgrenze im Sinne einer
Betriebsgrenze.

**Befund 2 — POH-Seite 4-20, „CROSSWIND LANDING"**:

> The maximum allowable crosswind velocity is dependent upon pilot capability as
> well as aircraft limitations. With average pilot technique, direct crosswinds
> of 15 knots can be handled with safety.

Zwei Gründe, warum das für diesen Regler nicht taugt: Es ist erstens keine
Grenze, sondern ein demonstrierter Wert mit ausdrücklichem Vorbehalt auf die
Fähigkeit des Piloten. Und es ist zweitens die **Quer**komponente, während unser
Regler die **Längs**komponente führt. Die beiden Zahlen beantworten
verschiedene Fragen.

**Befund 3 — POH-Seite 5-12, Abb. 5-4 „TAKEOFF DISTANCE", Anmerkung 3**:

> Decrease distances 10% for each 9 knots headwind. For operation with tailwinds
> up to 10 knots, increase distances by 15% for each 2 knots.

Das ist die einzige belegte Aussage über die Längskomponente: Die
Startstreckentabelle deckt Rückenwind bis 10 kt ab, darüber hinaus nicht. Der
Diesel-Anhang (Abb. 5-1a, Anmerkung 2) sagt dasselbe — der Kern führt es bereits
als `MAX_TAILWIND_KT`.

**Entscheidung**: Der Pistenwindregler endet bei −10 kt. Nicht weil dort etwas
verboten wäre, sondern weil dort die Tabelle endet. Für den Streckenwind gibt es
keine entsprechende Tabellengrenze — die Reiseleistung rechnet mit der
Geschwindigkeit über Grund und bleibt über den ganzen bisherigen Bereich
sinnvoll.

**Nebenbefund zur Seitenzuordnung**: Die `source.pages[].pdf_page` in
`data/poh/d-eelk/tables/*.json` verweisen auf das **separate**
TAE-Anhang-Dokument, nicht auf dieses Basis-POH. PDF-Seite 128 ist im Basis-POH
die Seite 7-14, nicht 5b-2. Das ist konsistent — die `document_id` sagt es —,
beim Nachschlagen aber leicht zu verwechseln.

## R3 — Was passiert mit Klickpfad-Prüfung 32?

**Heutiger Stand**: Prüfung 32 stellt den einen Windregler auf −15 kt und
erwartet bei der Startstrecke die Meldung des Kerns (sie nennt „Anmerkung 2" und
„Rückenwind"), während der Kraftstoffbedarf weiter ausgewiesen wird. Sie belegt
damit zweierlei: dass die Meldung durchgereicht wird (C-02) und dass ein Fehler
in einem Bereich den anderen nicht mitreißt (FR-020 aus Feature 023).

**Problem**: Mit einer Reglergrenze bei −10 kt lässt sich −15 kt über die
Oberfläche nicht mehr einstellen. Die Prüfung verliert ihren Auslöser.

**Entscheidung**: Prüfung 32 wird umgebaut, nicht gestrichen. Sie belegt künftig,
dass der Pistenwindregler bei −10 kt endet und die Startstrecke dort noch
ausgewiesen wird — also dass die Grenze am Regler sitzt statt in einer Meldung
danach. Der zweite Teil der alten Aussage (Unabhängigkeit der Bereiche) wandert
in eine Prüfung, die die beiden Regler gegeneinander bewegt und die
Ergebnisbereiche beobachtet; das ist ohnehin die Kernaussage dieses Features
(SC-002).

**Verworfen**: Die Prüfung ersatzlos zu streichen. Die Durchreichung der
Kernmeldung ist eine Zusicherung, die nicht unbeobachtet bleiben soll — sie wird
weiterhin von anderen Klickpfad-Prüfungen getragen (etwa der unerfüllbaren
Bedarfsrechnung) und im Kern von den Vitest-Tests zu `MAX_TAILWIND_KT`.

**Verworfen**: Die Reglergrenze so zu wählen, dass die Meldung erreichbar
bleibt. Das war die Alternative in der Entscheidungsfrage zum Bereich und wurde
bewusst nicht gewählt: Eine Grenze, die man überschreiten darf, um dann zu
erfahren, dass man sie überschritten hat, ist die schlechtere Bedienung.

## R4 — Wohin genau gehören die beiden Regler?

**Pistenwind** — in `TakeoffDistance.svelte`, unmittelbar nach dem Fieldset
„Bahnzustand". Die Komponente trägt bereits zwei Eingaben, die allein auf die
Startstrecke wirken (die Bahnzustandsschalter), und ihr Kopfkommentar begründet
das ausdrücklich mit FR-018 aus Feature 023. Der Pistenwind fällt in dieselbe
Kategorie.

**Streckenwindkomponente** — in `+page.svelte`, im bestehenden `.felder`-Block
neben der Streckenlänge. Dort steht schon die eine Eingabe, die allein den
Bedarf betrifft; der Kommentar dort begründet das mit FR-014.

**Was oben übrig bleibt**: das Fieldset mit der Platzhöhe und ihrer
EDSH-Schnellwahl. Es heißt danach „Platzhöhe". Der Kommentar davor („Platzhöhe
und Wind gehören beiden Bereichen darunter", FR-013) wird gegenstandslos und
muss mitgezogen werden — für die Platzhöhe allein gilt er weiter, für den Wind
nicht mehr.

## R5 — Welche Prüfungen im Klickpfad sind betroffen?

| Prüfung | Betroffen weil | Anpassung |
|---------|----------------|-----------|
| `fuellen()` (Hilfsfunktion) | stellt den Regler über die alte Beschriftung | setzt künftig beide Regler |
| 13 (Reglergrenzen) | erwartet sieben Regler und `wind: −50…50` | acht Regler; `pistenwind: −10…50`, `streckenwind: −50…50` |
| 21 (Reihenfolge der Bereiche) | erwartet die Aufschrift „Platzhöhe und Windkomponente" | „Platzhöhe" |
| 31 (Gliederung) | sucht das Fieldset über dieselbe Aufschrift | „Platzhöhe" |
| 32 (Rückenwindmeldung) | nicht mehr auslösbar | siehe R3 |
| 36 (Windzeile der Startstrecke) | greift auf `#wind` zu | `#pistenwind` |
| 23 (Wind ändert den Bedarf) | stellt den Regler über die alte Beschriftung | „Streckenwindkomponente" |

Neu hinzu kommt eine Prüfung für SC-002: Der eine Regler bewegt sich, das
Ergebnis des anderen Bereichs bleibt Zeichen für Zeichen gleich.

## R6 — Bleiben die Zahlen gleich?

**Ja, und das ist prüfbar.** Solange beide Regler denselben Wert tragen, ist die
Eingabe an den Kern identisch zu vorher — es gibt keine Umrechnung dazwischen.
SC-003 verlangt genau das. Der Anfangswert beider Regler bleibt deshalb 10 kt;
wer die Seite frisch öffnet, sieht dieselben Zahlen wie vor der Umstellung.
