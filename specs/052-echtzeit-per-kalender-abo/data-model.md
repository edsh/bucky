# Data Model: Reservierungsstand in Echtzeit über das Kalender-Abo

**Feature**: 052 | **Datum**: 2026-08-13

Grundlage ist das Datenmodell aus Feature 047. Hier steht nur, **was sich
ändert** und **was neu hinzukommt** — Unverändertes wird nicht wiederholt.

---

## Geändert: `Reservierung`

```ts
export interface Reservierung {
	kennung: string;      // unverändert: 'D-EELK'
	beginn: string;       // GEÄNDERT: ISO 8601 mit Versatz
	ende: string;         // GEÄNDERT: ISO 8601 mit Versatz
	art: Belegungsart;    // unverändert: 'reservierung' | 'sperre'
}
```

**Was sich ändert**: `beginn` und `ende` tragen künftig `2026-08-13T17:00:00+02:00`
statt `2026-08-13 17:00:00`.

**Warum** — ausführlich in [research.md](./research.md), E-04. Kurz: Der
Kalender kennt den Zeitpunkt exakt. Das versatzlose Format könnte ihn nicht
tragen und müsste ihn in der doppelten Stunde der Zeitumstellung durch
Konvention neu erraten.

**Was sich *nicht* ändert**: Es gibt weiterhin **kein Feld für Personen** —
weder ein leeres noch ein auskommentiertes. Der Kalender liefert Namen in
`SUMMARY` mit; sie werden im Deuter verworfen und erreichen diese Struktur nie.
Diese Zusicherung aus Feature 047 wird durch das neue Feature stärker
beansprucht als zuvor und muss deshalb ausdrücklich geprüft werden.

### Prüfregeln

| Regel | Verhalten bei Verstoß |
|---|---|
| `kennung` trägt einen Bindestrich zwischen Staats- und Eintragungszeichen | Eintrag verworfen und gezählt (kein Flugzeug) |
| `beginn` und `ende` sind lesbare Zeitangaben | Eintrag verworfen und gezählt |
| `ende` liegt nach `beginn` | Eintrag verworfen und gezählt |
| Zeitzone weicht von der Platzzone ab | Eintrag verworfen und gezählt — **nicht geraten** |

Ein einzelner fehlerhafter Eintrag verwirft nie den ganzen Abruf (FR-012).

### Verträglichkeit mit Altbeständen

Im KV liegen Stände im alten Format. Der Leser MUSS **beide** verstehen:

- Angabe **mit** Versatz → dieser gilt, ohne weitere Deutung
- Angabe **ohne** Versatz → wie bisher über `ortszeitZuZeitpunkt` gedeutet

Damit ist keine Umstellung des Speichers nötig und es entsteht kein Zeitfenster,
in dem die Anzeige stolpert. Der Cron überschreibt den Stand ohnehin binnen
einer halben Stunde.

---

## Geändert: `Abrufstand`

```ts
export interface Abrufstand {
	abgerufenAm: string;            // unverändert
	reservierungen: Reservierung[]; // unverändert
	verworfeneEintraege: number;    // unverändert
	neuanmeldungen: number;         // unverändert — nur der Cron füllt es
}
```

**Unverändert.** Die Herkunft gehört bewusst **nicht** hierher: Ein
`Abrufstand` beschreibt einen Abruf, nicht die Entscheidung, welcher Abruf
gerade gilt. Diese Entscheidung trifft die Server-Route, und dort wird sie auch
festgehalten (siehe `Quelle` unten).

**Zu `neuanmeldungen`**: Das Feld bleibt, füllt sich aber nur noch aus dem
halbstündlichen Cron. Ein aus dem Kalender gewonnener Stand trägt hier `0` —
korrekt, denn dieser Weg meldet sich nirgends an. Genau das ist der Grund,
warum SC-004 nun leicht zu erfüllen ist.

---

## Neu: `Quelle`

```ts
export type Quelle = 'kalender' | 'rueckfall';
```

Woher die gerade gezeigte Aussage stammt.

| Wert | Bedeutung | Wirkung auf die Anzeige |
|---|---|---|
| `kalender` | Unmittelbar bei Vereinsflieger geholt | Regelfall, kein besonderer Hinweis |
| `rueckfall` | Aus dem Zwischenspeicher, weil der Abruf scheiterte | Zurückhaltender Hinweis „letzter bekannter Stand" (FR-019) |

**Wozu das Feld nicht dient**: Es geht **nicht** in `belegungsauskunft` ein. Die
Entscheidung „frei oder belegt" fällt unverändert allein aus Zeiträumen und
Bezugszeitpunkt. Eine Berechnung, die sich nach der Herkunft richtet, wäre die
zweite Auslegung derselben Frage — verboten durch FR-022 und
Verfassungsprinzip IV.

**Warum nicht aus dem Alter erschließen**: Naheliegend, aber falsch. Ein
Rückfall kann sekundenfrisch sein, wenn der Cron gerade lief. Alter und Herkunft
sind zwei verschiedene Tatsachen.

---

## Neu: `Kalendereintrag` *(nur innerhalb des Deuters)*

Zwischenstufe beim Auswerten, verlässt den Deuter nicht:

```ts
interface Kalendereintrag {
	beschriftung: string;   // aus SUMMARY, enthält noch den Namen
	beginn: string;         // roh aus DTSTART, samt etwaiger Parameter
	ende: string;           // roh aus DTEND
}
```

**Wichtig**: `beschriftung` trägt an dieser Stelle **noch personenbezogene
Daten** (`Reservierung D-EELK - (Nachname, Vorname)`). Der Deuter zerlegt sie in
Art und Kennung und verwirft den Rest. Dass diese Struktur den Deuter nicht
verlässt, ist keine Stilfrage, sondern die Umsetzung von FR-013.

Ein `DESCRIPTION`-Feld wird gar nicht erst gelesen — im Abzug stand dort
„Feier", „Flieger in Wartung/ 200h-Kontrolle" und Ähnliches. Es könnte
jederzeit Persönliches enthalten und wird nicht gebraucht.

---

## Unverändert: `Belegungsauskunft`, `Belegungsart`, `Wechselziel`, `Deutungsergebnis`

Diese Strukturen bleiben, wie Feature 047 sie geschaffen hat.

`Deutungsergebnis` ist dabei die entscheidende Nahtstelle: **Beide** Deuter —
der bestehende für die Programmierschnittstelle und der neue für den Kalender —
liefern genau diese Struktur. Alles dahinter kennt den Unterschied nicht mehr.
Das ist die konkrete Umsetzung von Verfassungsprinzip IV in diesem Feature.

```text
Programmierschnittstelle ──▶ antwortDeuten()  ──┐
                                                 ├──▶ Deutungsergebnis ──▶ belegungsauskunft()
Kalender-Abo             ──▶ kalenderDeuten() ──┘
```

---

## Zustandsübergänge der Anzeige

```text
                    ┌──────────────┐
                    │    lädt      │
                    └──────┬───────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   Abruf gelingt     Abruf scheitert,    beides fehlt
        │            Speicher hat Stand        │
        ▼                  ▼                   ▼
  ┌───────────┐     ┌─────────────┐    ┌──────────────┐
  │  Auskunft │     │  Auskunft   │    │ „kein Stand  │
  │  (frisch) │     │ + Hinweis   │    │  verfügbar"  │
  └───────────┘     │ „letzter    │    └──────────────┘
                    │  bekannter  │     NIE „frei"
                    │  Stand"     │     (FR-008)
                    └─────────────┘
```

Der Übergang zurück aus dem mittleren in den linken Zustand geschieht ohne
Zutun beim nächsten Aufruf — geprüft durch Abnahmeszenario 5 der User Story 2.
