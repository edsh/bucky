# Implementation Plan: Außentemperatur statt ISA-Abweichung, Wetterabruf an allen Reglern, Winde nach oben

**Branch**: `031-aussentemperatur-und-anordnung` | **Datum**: 2026-08-11 | **Spec**: [spec.md](./spec.md)

**Input**: Issue [#31](https://github.com/edsh/bucky/issues/31)

## Summary

Der Regler „ISA-Abweichung" wird zum Regler „Außentemperatur"; die Abweichung
rutscht in die Folgezeile darunter und bleibt die Größe, mit der gerechnet wird.
Dafür kommt ein mitwandernder Wertebereich aus dem Kern. Der Wetterabrufdialog
wird von allen drei betroffenen Reglern aus erreichbar, schlägt die Temperatur
absolut statt als Abweichung vor und trägt die Bahnwahl innerhalb der Windzeile.
Zuletzt wandern beide Windregler an die Spitze ihres Bereichs.

Der Kern bekommt genau zwei neue Bausteine: einen Bereichsrechner und eine
Formatierfunktion. Alles Übrige ist Oberfläche.

## Technical Context

**Sprache/Version**: TypeScript 5, Node 22, SvelteKit 2 mit Svelte 5 (Runes)

**Betroffene Pakete**:
- `packages/deelk-poh-core` — neue Funktion `getOutsideAirTemperatureRange`, neue Formatierfunktion
- `apps/web` — Seite, Dialog, Startstreckenkomponente

**Testarten**: Vitest (Kern und Adapter), Zusicherungen in `tests/contract.test.ts`, Klickpfad `tests/ui/klickpfad.mjs` (Playwright)

**Nicht betroffen**: `apps/mcp` (führt keinen Temperaturregler), die Tabellendaten, die Wetteranfrage selbst

**Entschiedene Fragen**: siehe [research.md](./research.md) — R1 (mitwandernder Bereich), R2 (ungerundet rechnen, eine Nachkommastelle anzeigen), R3 (Anfangswert), R4 (Dialog wird einfacher), R5 (betroffene Klickpfadprüfungen)

**Offene Fragen**: keine

## Constitution Check

| Prinzip | Bewertung |
|---|---|
| **I — Deterministische Berechnung** | Die Umrechnung Temperatur ↔ ISA-Abweichung liegt bereits im Kern (`atmosphere/temperature.ts`, beide Richtungen). Neu ist allein der Bereichsrechner, der ebenfalls dorthin gehört. Keine neue Tabelle, keine neue Quellenreferenz. Die Eckwerte bleiben nachvollziehbar — die Abweichung verschwindet nicht, sie wird nur abgeleitet statt eingegeben, und wird nach R2 sogar genauer angezeigt als bisher. ✅ |
| **II — Vereinsflieger** | Nicht berührt. ✅ |
| **III — SvelteKit** | Nur bestehende Komponenten. ✅ |
| **IV — Gemeinsamer Kern** | Bereich und Umrechnung kommen aus dem Kern (FR-006). Die Oberfläche rechnet nichts und legt keine Grenze fest. Zusicherung C-05 wird um den neuen Bereich erweitert. ✅ |

Keine Abweichung, kein Eintrag in der Komplexitätsverfolgung.

## Project Structure

### Documentation (this feature)

```
specs/031-aussentemperatur-und-anordnung/
├── spec.md
├── plan.md              # diese Datei
├── research.md          # Phase 0 — R1..R5
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── core-api.md      # Phase 1 — die neuen Kernschnittstellen
└── checklists/
    └── requirements.md
```

### Source Code

```
packages/deelk-poh-core/
├── src/
│   ├── atmosphere/temperature.ts   # + getOutsideAirTemperatureRange
│   ├── format.ts                   # + formatCelsiusPrecise
│   └── index.ts                    # beide ausführen
└── tests/
    ├── atmosphere/temperature.test.ts
    └── contract.test.ts            # C-05 erweitern

apps/web/src/
├── routes/+page.svelte             # Regler, Ableitung, drei Knöpfe, Anordnung
└── lib/components/
    ├── WetterAbrufDialog.svelte    # Temperaturzeile, Bahnwahl in der Windzeile
    └── TakeoffDistance.svelte      # Pistenwind nach oben, EDSH-Knopf

tests/ui/klickpfad.mjs              # nach R5 anpassen und erweitern
README.md                           # Abschnitt „Wetterwerte aus dem Netz"
```

---

## Umsetzungsschritte

### Schritt 1 — Kern: Bereich und Format

**`getOutsideAirTemperatureRange(pressureAltitudeFt): NumericRange`** in
`atmosphere/temperature.ts`.

Verschiebt den Abweichungsbereich um die Normtemperatur der Druckhöhe und
rundet nach innen:

```
std  = T₀_C − L·h
min  = ceil(std + isaMin)
max  = floor(std + isaMax)
```

Der Abweichungsbereich kommt aus `ISA_DEVIATION_RANGE` — dazu muss dieser aus
`fuel/input.ts` ausgeführt werden. **Achtung Ringschluss**: `fuel/input.ts`
importiert bereits aus `atmosphere/`. Der Bereich wandert deshalb nach
`atmosphere/temperature.ts` und wird von `fuel/input.ts` dort bezogen, nicht
umgekehrt. Fachlich ist das ohnehin die richtige Stelle: Es ist eine Aussage
über die Atmosphäre, nicht über die Kraftstoffrechnung.

Aufrunden und Abrunden geschehen über `format.ts` (C-03) — dort liegen bereits
`floorHectopascal` und Verwandte.

**`formatCelsiusPrecise(value): string`** in `format.ts`, eine Nachkommastelle,
über das vorhandene `formatQuantity(value, 1, '°C')`.

Beide in `index.ts` ausführen.

**Tests**: Bereichsgrenzen bei 0 ft und bei großer Höhe; die Zusicherung, dass
jeder ganzzahlige Wert im Bereich eine Abweichung innerhalb von
`ISA_DEVIATION_RANGE` ergibt (das ist der eigentliche Zweck der Funktion und
gehört als Eigenschaftstest geprüft, nicht als Einzelfall).

### Schritt 2 — Zusicherung C-05 erweitern

Der neue Bereich darf ebenso wenig in einem Adapter stehen wie die übrigen.
C-05 um `getOutsideAirTemperatureRange` ergänzen und prüfen, dass kein Adapter
die Zahlen `-30`/`40` als Temperaturgrenze führt.

### Schritt 3 — Seite: Temperatur statt Abweichung

In `+page.svelte`:

- `isaDeviationC = $state(10)` weicht `outsideAirTemperatureC = $state(…)`.
  Anfangswert nach R3: Normtemperatur der Anfangsdruckhöhe + 10 °C, gerundet.
  Einmalig, **kein** `$effect`.
- Ein `$derived` `temperaturBereich = getOutsideAirTemperatureRange(platzDruckhoehe.pressureAltitudeFt)`.
- Ein `$derived` `isaAbleitung = toIsaDeviation(platzDruckhoehe.pressureAltitudeFt, outsideAirTemperatureC)`.
- Die drei Verwendungsstellen ziehen `isaAbleitung.isaDeviationC` (ungerundet,
  R2): `toOutsideAirTemperature` in der Startstrecke, `computeCruiseCapability`,
  `computeFuelPlan`. In der `$effect`-Abhängigkeitsliste steht künftig
  `outsideAirTemperatureC` statt `isaDeviationC`.

  *Hinweis*: In der Startstrecke wird die Temperatur damit über die Abweichung
  wieder in eine Temperatur zurückgerechnet — ein Rundlauf, der denselben Wert
  liefert. Er bleibt trotzdem stehen: `computeTakeoffDistance` erwartet ein
  `OutsideAirTemperatureResult` samt Quellenreferenz, und diese Struktur
  nebenher zu bauen hieße, den Kern zu umgehen (C-04).
- Der Regler `#isa` wird zu `#temperatur`, Beschriftung „Außentemperatur am
  Platz (°C)", `range={temperaturBereich}`, `format={formatCelsius}`.
- Die `folge`-Zeile trägt künftig zwei Dinge: die Ableitung
  („≙ ISA {formatCelsiusPrecise(isaAbleitung.isaDeviationC)}") und, wie
  gehabt, den Herkunftsvermerk.

### Schritt 4 — Drei Knöpfe

`wetterDialog?.oeffnen()` steht heute nur am QNH-Regler. Der Kommentar dort
begründet ausführlich, warum es nur einer ist — er wird ersetzt, denn diese
Begründung trägt nicht mehr.

- Am Temperaturregler: derselbe `neben`-Snippet-Knopf.
- In `TakeoffDistance.svelte`: ein neuer Prop `wetterAbrufen?: () => void`.
  Ist er gesetzt, erscheint der Knopf im `neben`-Snippet des Pistenwindreglers.
  Der Dialog bleibt in der Seite — die Komponente kennt ihn nicht und soll ihn
  nicht kennen (dieselbe Begründung wie bei `windHerkunft`).

### Schritt 5 — Dialog

- Prop `isaBereich` → `temperaturBereich`.
- `Uebernahmewerte.isaDeviationC` → `outsideAirTemperatureC`.
- Zeilenschlüssel `isa` → `temperatur`, Titel „Außentemperatur"; der
  Windzeilentitel wird „Pistenwind (positiv = Gegenwind)" (FR-013, dieselbe
  Schreibweise wie am Regler).
- Der Vorschlag ist jetzt `roundCelsius(temperatur)` geprüft gegen den
  Temperaturbereich; `toIsaDeviation` wird hier nicht mehr gebraucht (R4). Die
  Erläuterung darf die abgeleitete Abweichung nennen — das ist die Umkehrung
  der bisherigen Zeile, die die absolute Temperatur nannte.
- Die Bahnwahl wandert aus der Kopfzeile in die Windzeile (FR-011). Das
  Zeilenobjekt im `#each` bekommt dazu ein Merkmal `bahnwahl: true`; gezeigt
  wird sie nur, wenn zusätzlich `vorschlag.wert !== undefined` (FR-012).
- `angehakt` und `bestaetigen` folgen der Umbenennung. Verhalten bei
  Bahnwechsel unverändert (FR-014).

### Schritt 6 — Anordnung

- `TakeoffDistance.svelte`: Der `.pistenwind`-Block wandert vor
  `fieldset.bahn` (FR-017). Der Kommentar über ihm („steht über der
  Ergebnistabelle") wird auf die neue Begründung umgeschrieben.
- `+page.svelte`, Bereich `#bedarf`: Streckenwind vor Streckenlänge im Markup
  (FR-016), und der `.felder`-Block bekommt eine Zusatzklasse
  `.einspaltig` mit `grid-template-columns: 1fr` (FR-015). Die Zusatzklasse
  statt einer Änderung an `.felder`, weil derselbe Block bei den
  Grundbedingungen mehrspaltig bleiben soll.
- FR-018 folgt daraus von selbst: Beide Bereiche beginnen mit einer `<h3>`
  gleicher Größe, danach steht in beiden der Windregler. **Zu prüfen**, ob die
  unterschiedliche Zeilenzahl der Beschriftungen („Pistenwind (kt, positiv =
  Gegenwind)" gegen „Streckenwindkomponente (kt, positiv = Gegenwind)") bei
  mittlerer Breite einen Versatz erzeugt.

### Schritt 7 — Tests nachziehen

- `apps/web/tests/` — alles, was `isaDeviationC` als Übernahmewert prüft.
- `tests/ui/klickpfad.mjs` — nach R5. Neu: die drei Knöpfe öffnen denselben
  Dialog (FR-008/SC-003); die Folgezeile zeigt die Ableitung; die Bahnwahl
  steht in der Windzeile.
- Eine Prüfung für SC-001: bei einer Temperatur, die genau ISA+10 ergibt,
  dieselben Ergebniszahlen wie vor der Umstellung.

### Schritt 8 — README

Der Abschnitt „Wetterwerte aus dem Netz" nennt die drei Zeilen namentlich und
den einen Einstiegsknopf. Beides ändert sich.

---

## Reihenfolge und Abhängigkeiten

```
Schritt 1 (Kern)
   ├── Schritt 2 (C-05)
   └── Schritt 3 (Seite: Regler)
          ├── Schritt 4 (Knöpfe)  ─┐
          └── Schritt 5 (Dialog)  ─┴── Schritt 7 (Tests) ── Schritt 8 (README)
Schritt 6 (Anordnung) — unabhängig, kann jederzeit
```

Schritt 6 hängt an nichts und lässt sich zuerst erledigen, wenn ein früher
sichtbarer Fortschritt gewünscht ist. Die Schritte 3–5 gehören zusammen: Zwischen
ihnen ist die Anwendung nicht übersetzbar, weil der Dialog Props hält, die die
Seite nicht mehr liefert.

## Complexity Tracking

Keine Abweichung von der Constitution, keine Einträge.

## Risiken

| Risiko | Umgang |
|---|---|
| Der Temperaturbereich wandert beim Verstellen der Platzhöhe und wirft eine stehende Temperatur heraus | Gewollt und in FR-005 beschrieben; der Kern meldet es. Im Klickpfad prüfen, dass die Meldung erscheint und nicht stillschweigend zurechtgerückt wird |
| Ringschluss zwischen `fuel/input.ts` und `atmosphere/temperature.ts` | `ISA_DEVIATION_RANGE` wandert nach `atmosphere/`; Richtung der Abhängigkeit bleibt einseitig |
| Der Rundlauf Temperatur → Abweichung → Temperatur in der Startstrecke könnte Rundungsdrift erzeugen | Beide Richtungen verwenden dieselben Konstanten und runden nicht; ein Rundlauftest besteht bereits |
| Viele Umbenennungen (`isa` → `temperatur`) über Tests hinweg | Vollständige Suche nach `isaDeviationC`, `isa-herkunft`, `wetter-*-isa`, `#isa` vor dem Abschluss |
