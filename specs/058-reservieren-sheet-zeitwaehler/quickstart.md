# Quickstart: Reservieren-Sheet v2 prüfen

**Feature**: 058-reservieren-sheet-zeitwaehler

Zwei Wege, und beide werden gebraucht. Der erste prüft, ob gerechnet wird, was
gerechnet werden soll; der zweite, ob sich das Ergebnis mit dem Daumen bedienen
lässt. Keiner ersetzt den anderen.

---

## 1. Die Rechnung — ohne Browser

```bash
npm test
```

Das läuft im Wurzelverzeichnis und deckt das ganze Haus ab. Nur der neue Kern:

```bash
npx vitest run packages/reservierung-core/tests/zeitwahl.test.ts packages/reservierung-core/tests/nacht.test.ts
```

**Was grün sein muss, bevor eine Komponente entsteht** (plan.md, Stufe 1) — die
Tests tragen die Nummern der Acceptance Scenarios aus `spec.md`:

| Test | Prüft | Szenario |
|---|---|---|
| Rasterung | jede Wahl ist ein Vielfaches von 15 | SC-002 |
| Kante ziehen | Dauer ändert sich, Gegenkante steht | 1.2 |
| Block verschieben | Dauer bleibt | 1.3 |
| Rahmenanschlag | Block stoppt bei 22:00, läuft nicht weiter | 1.4 |
| Beginn-Kachel | Ende bleibt stehen | 2.1 |
| Beginn überholt Ende | Ende springt auf +30 min | 2.2 |
| Stundenkachel | Minute bleibt erhalten | 2.3 |
| Kachel-Dauervorschau | nie negativ | FR-034 |
| Konflikttext | Doppelpunkt, Verkettung mit ` · ` | 4.1, FR-049 |
| Modus-Rangfolge | Nachtrag vor Sperre vor Warteliste | Z-07 |
| Ausweichsuche | ab dem gewählten **Ende** | 4.2 |
| Leerfall | ganztägig gesperrt → keine Lücke, kein Fenster | 3.3, SC-008 |
| Adressbau | `frm_apid=75132&…&frm_datefromtime=11:30&…` | 1.6 |
| Nacht-Stops | 06:05/20:40 → 0,52 % / 91,67 % | 5.1 |
| Nacht ohne Sonnenzeiten | `null`, nichts geschätzt | 5.3, SC-009 |

Zusätzlich müssen die **vorhandenen** Tests grün bleiben, insbesondere
`reservierungs-verweis.test.ts` (der Absprung baut auf unveränderter Adresslogik
auf) und `formulieren.test.ts` (`alsDauer` bleibt, wie es war — die zweite
Dauerform `alsDauerwort` tritt daneben, nicht an ihre Stelle).

```bash
npm run lint
```

---

## 2. Die Bedienung — am Gerät

Zwei Kriterien lassen sich nur so prüfen: **SC-005** (die Abschlussaktion springt
nicht) und **NFR-002** (das Ziehen bleibt flüssig). Ein Bildschirmfoto des
Agenten reicht dafür nicht — Gestaltungsfragen entscheidet, wer die Seite vor
sich hat (`AGENTS.md`).

### Der bequeme Weg

Liegt die Änderung in einem Vorschlag, lädt die Ablaufsteuerung sie nach
`https://pr-<nummer>-bucky.edsh.workers.dev` und schreibt die Adresse als
Kommentar hinein. Vom Telefon aus erreichbar — dafür ist sie da.

### Der örtliche Weg

Die Reservierungsseite liest einen KV-Speicher, den ein zweiter Worker füllt.
Örtlich hat jeder Worker seinen eigenen; der gemeinsame kommt über
`--persist-to`. Einzelheiten stehen im Abschnitt „Der zweite Worker" in
`README.md`.

```bash
npm run build
npx wrangler dev --config apps/web/wrangler.jsonc --port 8787 &
open http://localhost:8787/reservierung/d-eelk/
```

`wrangler dev` braucht rund 40 Sekunden bis zur ersten Antwort. Zum Schluss den
Server über seine PID beenden (`lsof -ti :8787`).

### Durchgang am Telefon (oder im schmalen Fenster, 430 px)

1. **Öffnen über den Tagesbalken.** Auf eine freie Stelle tippen → Sheet öffnet
   mit zwei Stunden ab dort, Variante „Ziehen". *(1.1)*
2. **Kante ziehen.** Rechte Kante nach rechts — der Beginn darf sich nicht
   bewegen. Loslassen: das Fenster bleibt stehen und springt **nicht** auf zwei
   Stunden zurück. *(1.2, 1.5 — die häufigste Fehlerquelle des Prototyps)*
3. **Block ans Tagesende schieben.** Er muss bei 22:00 stehen bleiben, nicht
   kürzer werden. *(1.4)*
4. **Auf „Uhrzeit wählen" umschalten.** Beide gewählten Stundenkacheln müssen
   sofort sichtbar sein, mittig in ihrer Spalte. *(2.4)*
5. **In der Stundenspalte scrollen**, bis die Auswahl aus dem Bild läuft — das
   Pfeilchen erscheint und blendet weich aus, wenn man zurückscrollt. *(2.5)*
6. **Über eine Belegung ziehen.** Statuszeile wird rot, Aktion heißt „Im
   Vereinsflieger vormerken… ↗", darüber steht der Ausweich-Vorschlag. **Dabei auf die
   Primäraktion achten: Sie darf sich nicht bewegen.** *(4.1, 4.2, SC-005)*
7. **Über eine Sperre ziehen.** Kein Absprung, Hinweisbox. *(4.3, SC-007)*
8. **Fenster in die Vergangenheit ziehen** (heute, vor jetzt). Aktion wird zu
   „Im Vereinsflieger nachtragen… ↗". *(4.4)*
9. **Tageswechsler.** Pfeile bis an beide Enden; auf „Heute" ist „‹" wirkungslos.
   Mitte antippen → Datumswähler des Systems, begrenzt auf heute … +6. *(3.1, 3.4)*
10. **Auf einen ganz gesperrten Tag wechseln** (D-MRXS ist heute ganztägig
    gesperrt). Hinweistext statt Wähler, kein erfundenes Fenster. *(3.3, SC-008)*
11. **Absprung prüfen.** Die Adresse in der Zwischenablage oder im neuen Tab muss
    Datum und beide Uhrzeiten des **gewählten** Fensters tragen. *(1.6)*
12. **Nacht und Nadel.** Balkenränder sichtbar abgedunkelt, in Hell **und**
    Dunkel derselbe Ton; die gestrichelte Nadel ragt oben und unten über. *(5.1,
    5.4, 5.5)*
13. **Detailansicht.** Keine klebende Leiste mehr am unteren Rand, kein
    POH-Knopf; die 7-Tage-Liste beginnt bei **morgen**. *(FR-023, FR-026, FR-048)*
14. **Bewegung abbestellen** (Systemeinstellung „Bewegung reduzieren") → Sheet
    erscheint ohne Fahrt. *(NFR-003)*

---

## 3. Was schiefgehen darf, ohne dass etwas kaputt ist

- **Keine Sonnenzeiten für einen Tag**: keine Nachttönung. Richtig, nur ärmer.
- **Maschine ohne `apid`**: Der Absprung führt weiterhin zur Maske, nur ohne
  vorgewähltes Flugzeug.
- **Kein Reservierungsstand abrufbar**: Die Seite meldet das wie bisher; das Sheet
  behauptet keine Verfügbarkeit.
- **Ein Tag ohne jede Lücke**: Leerfall. Kein Wähler, kein Fenster, kein Absprung
  mit erfundenen Zeiten.
