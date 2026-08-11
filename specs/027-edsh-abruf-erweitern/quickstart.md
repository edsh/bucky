# Quickstart — EDSH-Abruf um Temperatur und Pistenwind prüfen

Feature: [spec.md](./spec.md) · Plan: [plan.md](./plan.md)

Alle Befehle laufen im Wurzelverzeichnis des Repos.

## Voraussetzungen

```bash
npm install
```

## 1 — Kern und Verträge

```bash
npx vitest run
```

**Erwartet**: alle Tests grün, darunter die neuen:

- der Rundlauf `toOutsideAirTemperature` ↔ `toIsaDeviation` auf neun
  Nachkommastellen
- **C-09** — keine Winkelfunktion in einer Adapterdatei, und
  `toRunwayWindComponent` genau einmal im Kern
- **C-03** und **C-05** unverändert grün: kein Adapter rundet, kein Adapter legt
  Grenzen fest. Beide sind hier keine Formsache — der umgebaute Dialog prüft drei
  Werte gegen drei Bereiche und ist damit genau die Stelle, an der eine feste
  Zahl hineinrutscht.

Zwei Handproben für die Windzerlegung, mit den Bahnrichtungen aus
[R2](./research.md):

| Wind | Bahn | Erwartete Längskomponente |
|---|---|---|
| aus 103°, 20 kt | 10 (103°) | +20 kt, genau Gegenwind |
| aus 013°, 20 kt | 10 (103°) | 0 kt, genau quer |
| aus 283°, 20 kt | 10 (103°) | −20 kt, genau Rückenwind |
| aus 250°, 12 kt | 28 (283°) | +10,06 kt → 10 kt übernehmbar |
| aus 250°, 12 kt | 10 (103°) | −10,06 kt → 10 kt Rückenwind, **nicht** übernehmbar |

Die letzte Zeile ist die wichtigste: Sie ist der Fall, in dem die Reglergrenze
aus Feature 026 greift und das Kästchen gesperrt bleibt, während QNH und
Temperatur weiter übernehmbar sind.

## 2 — Typen und Stil

```bash
npm run lint
npm exec --workspace @edsh-bucky/web -- svelte-kit sync
npm run check --workspace @edsh-bucky/web
```

**Erwartet**: ESLint ohne Befund, `svelte-check` mit 0 Fehlern und 0 Warnungen.

Die optionalen Felder in `WetterAbruf` sind hier der Prüfstein: Wer
`abruf.temperatureC` ohne Prüfung weiterreicht, erfährt es an dieser Stelle und
nicht erst im Browser.

## 3 — Der Abruf gegen den echten Dienst, einmal von Hand

Nur um zu sehen, dass die Anfrage stimmt — nicht als Teil der Prüfungen:

```bash
curl -s "https://api.open-meteo.com/v1/forecast?latitude=48.9197&longitude=9.4553&elevation=296&current=surface_pressure,temperature_2m,wind_speed_10m,wind_direction_10m&wind_speed_unit=kn&timezone=UTC" | python3 -m json.tool
```

**Erwartet**: `current_units.wind_speed_10m` ist `"kn"`, und `current` enthält
alle vier Größen. Steht dort `"km/h"`, fehlt der Einheitenparameter — und der
Pistenwind wäre um den Faktor 1,85 zu groß, bei 10 kt also 19 kt. Das sähe wie
ein kräftiger, aber möglicher Wind aus.

## 4 — Klickpfad im echten Browser

```bash
npm run build
python3 -m http.server 8899 --directory apps/web/build &
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --no-save playwright
node tests/ui/klickpfad.mjs
```

Danach den Server beenden (`kill <PID>`).

Der Klickpfad fängt die Antwort des Wetterdienstes ab und ersetzt sie durch eine
feste (→ [R6](./research.md)). Er ruft den Dienst **nicht** auf.

**Erwartet**: alle Prüfungen grün, darunter die neuen:

- Nach dem Abruf stehen drei Zeilen mit angehakten Kästchen im Dialog.
- „Übernehmen" setzt alle drei Regler; die Streckenwindkomponente bleibt
  unberührt.
- Ein abgewähltes Kästchen lässt seinen Regler auf dem alten Wert.
- Sind alle drei Kästchen abgewählt, ist „Übernehmen" gesperrt.
- Ein Wechsel der Bahn ändert allein den Pistenwind-Vorschauwert und löst keine
  zweite Anfrage aus.
- Bei einem Rückenwind über 10 kt ist allein das Pistenwind-Kästchen gesperrt.
- Fehlt der Wind in der Antwort, bleiben QNH und Temperatur übernehmbar.
- Jeder übernommene Regler trägt einen Herkunftsvermerk; das Verstellen eines
  Reglers löscht nur dessen Vermerk.
- „Abbrechen" verändert keinen der drei Regler.

## 5 — Von Hand nachvollziehen, was der Dialog vorschlägt

```bash
npm run dev
```

1. „EDSH" beim Luftdruck drücken und den Dialog abwarten.
2. Die Erläuterung unter „Pistenwind" ablesen: Windrichtung, Geschwindigkeit,
   Bahn.
3. Nachrechnen: `Komponente = Geschwindigkeit · cos(Windrichtung − Bahnrichtung)`
   mit 103° für Bahn 10 und 283° für Bahn 28.

**Erwartet**: Der gezeigte Wert stimmt (SC-004). Weicht er um wenige Knoten ab,
ist mit der falschen Bahnrichtung gerechnet worden — das ist genau der Fehler,
vor dem [R2](./research.md) warnt, und er sieht plausibel aus.

4. Die Bahn umschalten. **Erwartet**: Der Wert kehrt sein Vorzeichen um, sofern
   der Wind nicht genau quer steht; QNH und Temperatur bleiben stehen.

## 6 — Gegenprobe: die Seite bleibt ohne Netz bedienbar

Im Browser die Netzverbindung abschalten (Entwicklerwerkzeuge → Netzwerk →
Offline) und die Seite neu laden.

**Erwartet**: Die Seite lädt und rechnet vollständig. Erst der Knopf „EDSH"
führt zu einer Fehlermeldung im Dialog, und die verändert keinen Regler (W-03,
W-04).
