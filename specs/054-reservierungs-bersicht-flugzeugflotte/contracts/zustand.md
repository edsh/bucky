# Vertrag: Zustand einer Maschine (`zustand.ts`)

**Feature**: 054 · **Modul**: `packages/reservierung-core/src/zustand.ts`

Die Statuslogik aus dem Abschnitt „Statuslogik (verbindlich)" des
Design-Handoffs. Sie ersetzt `belegung.ts` **nicht**, sondern baut darauf auf:
Die Frage „läuft gerade etwas, und wann endet die lückenlose Kette?"
beantwortet weiterhin `endeDerKette` — die einzige Stelle im Haus, die das
tut (FR-003, Prinzip IV).

## Ablauf

```text
zustandFuer(reservierungen, kennung, bezugszeitpunkt) →

  1. Läuft eine Sperre?          → 'sperre',  wechselAm = Ende der Kette
  2. Läuft eine Reservierung?    → 'belegt',  wechselAm = Ende der Kette
  3. Beginnt heute noch eine?    → 'bald',    wechselAm = deren Beginn
  4. sonst                       → 'frei',    wechselAm = Beginn der nächsten
                                              Belegung oder null
```

## Zusicherungen

| Nr. | Zusicherung |
|---|---|
| Z-01 | Der Beginn zählt mit, das Ende nicht mehr — wer genau zum Ende fragt, bekommt „frei" (übernommen aus `belegung.ts`). |
| Z-02 | Lückenlos oder überlappend anschließende Belegungen zählen zu **einem** Block; ein Spalt von einer Minute ist eine echte Lücke (FR-003). Reservierung und Sperre bilden dabei gemeinsam eine Kette. |
| Z-03 | Läuft eine Sperre **und** eine Reservierung, gewinnt die Sperre den Status. Für den Piloten ist „gesperrt" die weiter reichende Nachricht: Das Flugzeug ist womöglich zerlegt, nicht bloß gebucht. |
| Z-04 | `'bald'` gilt nur, wenn die nächste Belegung am **selben Ortstag** beginnt. Eine Belegung morgen um 08:00 macht heute Abend nicht „heute noch frei". |
| Z-05 | `draengen = min(1, max(0, 1 − (beginn − jetzt) / 3600000))`, sonst 0. Außerhalb der letzten Stunde exakt 0, im Moment des Beginns exakt 1 (FR-006). |
| Z-06 | `draengen` ist **kein** Statuswert und erzeugt keinen fünften Zustand (E-05). Der Ring bleibt bei `'bald'` grün. |
| Z-07 | `naechsteLuecke.von` = nächste volle 30 Minuten ab dem früheren von „jetzt" und „Ende des laufenden Blocks"; `bis` = `von` + 2 h, gekappt am Beginn der folgenden Belegung (FR-011). |
| Z-08 | Gibt es keine freie Lücke von mindestens 30 Minuten in den nächsten sieben Tagen, ist `naechsteLuecke === null` — die Oberfläche zeigt dann keinen Vorschlag statt eines unmöglichen. |
| Z-09 | Der Bezugszeitpunkt wird übergeben, nie geholt. |
| Z-10 | Das Modul kennt **keine** Farben, **keine** Sätze und **keine** Personen. Sätze bildet `formulieren.ts`, Farben die Oberfläche. |
| Z-11 | Eine leere Reservierungsliste ergibt `'frei'` mit `wechselAm: null`. Das ist **nicht** dasselbe wie „kein Stand vorhanden" — diesen Fall trifft die Route, nicht der Kern (FR-022). |
| Z-12 | `danachAm` ist der **übernächste** Wechsel: bei laufender Belegung der Beginn der folgenden, bei `'bald'` das **Ende der Kette**, die dann beginnt. `null`, wenn danach nichts mehr absehbar ist. Ohne dieses Feld ließen sich die Zusatzzeilen unten nicht bilden, ohne die Kettenlogik ein zweites Mal zu schreiben. |

## Sätze (`formulieren.ts`, erweitert)

| Status | Satz | Zusatzzeile |
|---|---|---|
| `sperre` | „Gesperrt bis {Wochentag, Datum}" | „bis {Datum}" |
| `belegt` | „Belegt bis {Uhrzeit}" | „danach frei bis {`danachAm`}" bzw. „danach den ganzen Tag frei", wenn `danachAm === null` |
| `bald` | „Frei bis {Uhrzeit}" | „danach bis {`danachAm`} belegt" |
| `frei` | „Frei" / Kurzsatz „frei den ganzen Tag" | „nächste Reservierung {`wechselAm`}" bzw. — , wenn `wechselAm === null` |

**Warum „frei" eine Zusatzzeile braucht.** „Frei" allein ist um 22 Uhr eine
seltsame Auskunft: Frei ist die Maschine dann immer, die Frage ist, ab wann
sie es nicht mehr ist. Bei `frei` liegt die nächste Reservierung
ausdrücklich **nicht** am selben Ortstag (Z-04), deshalb trägt die Zeitangabe
hier immer den Tag mit — „14:30" allein läse sich als heute.

Zeitformate (FR-015): heute `HH:MM`, später `Sa., 15.08., 12:00`, Sperren und
Tagesbezüge `Samstag, 15. Aug.`, Dauern mit Dezimalkomma („3,5 h"),
ganztägig „24 h".

**Sperren zählen in Tagen, nicht in Uhrzeiten.** Eine Werkstattsperre bis
„Freitag" ist eine andere Nachricht als eine bis „Freitag, 16:00" — die
zweite verspricht eine Genauigkeit, die eine Wartung nicht hat.
