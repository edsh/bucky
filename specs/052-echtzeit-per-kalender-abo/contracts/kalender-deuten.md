# Vertrag: `kalenderDeuten` im Kern

**Feature**: 052 | Teil von `@edsh-bucky/reservierung-core`

## Zusicherung

```ts
export function kalenderDeuten(roh: string): Deutungsergebnis;
```

Wertet den Text eines Kalender-Abos aus und liefert **dieselbe Struktur** wie
`antwortDeuten`. Netzfrei, laufzeitfrei, ohne Nebenwirkung, ohne Uhrzugriff.

| Zusicherung | Begründung |
|---|---|
| Liefert `Deutungsergebnis` — nichts anderes | Alles dahinter darf die Herkunft nicht bemerken (FR-022, Prinzip IV) |
| Wirft **nie** bei einzelnen fehlerhaften Einträgen | Ein kaputter Eintrag darf nicht 58 gute mitreißen (FR-012) |
| Wirft bei einer Eingabe, die **kein Kalender** ist | Eine Fehlerseite darf nicht als „keine Belegungen" durchgehen (FR-007) — der gefährlichste Fall überhaupt |
| Enthält **keine** personenbezogenen Daten im Ergebnis | FR-013; die Zielstruktur hat kein Feld dafür |
| Ist deterministisch | Gleiche Eingabe, gleiches Ergebnis — Vorbedingung jeder Prüfbarkeit |

## Der entscheidende Unterschied zwischen „leer" und „kaputt"

```ts
kalenderDeuten('BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR')
// → { reservierungen: [], verworfeneEintraege: 0 }   gültig und leer

kalenderDeuten('<html><body>Not found</body></html>')
// → wirft                                            kein Kalender
```

**Warum das der wichtigste Punkt dieses Vertrags ist**: Würde die zweite Zeile
ebenfalls ein leeres Ergebnis liefern, erschiene bei jedem Ausfall der
Gegenstelle jedes Flugzeug schlagartig als **frei**. Ein Mitglied führe zum
Platz, weil die App sagte, die Maschine sei verfügbar. Genau diesen Fehler
verbietet FR-007, und genau deshalb ist er hier als Vertrag festgeschrieben und
nicht nur als Absicht formuliert.

Erkennungsmerkmal: Eine gültige Eingabe beginnt mit `BEGIN:VCALENDAR`. Fehlt
das, ist es kein Kalender.

## Eingabeformat — was verarbeitet werden MUSS

| Fall | Beispiel | Behandlung |
|---|---|---|
| Weltzeit | `DTSTART:20260813T150000Z` | Exakt übernehmen |
| Ortszeit ohne Kennung | `DTSTART:20260813T170000` | Über `ortszeitZuZeitpunkt` deuten |
| Platzzone benannt | `DTSTART;TZID=Europe/Berlin:20260813T170000` | Wie Ortszeit |
| Fremde Zeitzone | `DTSTART;TZID=America/New_York:…` | **Verwerfen und zählen** — nicht raten |
| Ganzer Tag | `DTSTART;VALUE=DATE:20260813` | Ortstag 00:00 bis 24:00 |
| Umbrochene Zeile | `SUMMARY:Reservierung D-EE`⏎` LK - (…)` | Vor der Auswertung zusammenfügen (FR-015) |
| Maskierte Zeichen | `SUMMARY:Reservierung D-EELK - (A\, B)` | Maskierung auflösen |
| Zeilenende `\r\n` oder `\n` | beides | Beides zulassen |

## Beschriftung → Art und Kennung

```text
SUMMARY:Reservierung D-EELK - (Nachname, Vorname)   →  art 'reservierung', kennung 'D-EELK'
SUMMARY:Grounding D-EELK - (Nachname, Vorname)      →  art 'sperre',       kennung 'D-EELK'
SUMMARY:Reservierung GRILL - (Nachname, Vorname)    →  verworfen (kein Flugzeug)
```

Der Namensteil wird verworfen, nicht durchgereicht (FR-013).

**Unbekanntes erstes Wort gilt als `reservierung`**, nicht als Fehler. Dieselbe
Festlegung wie in `antwort-deuten.ts` und aus demselben Grund: Belegt ist
belegt. Die Art bestimmt nur die Wortwahl, nicht die Verfügbarkeit — im Zweifel
lieber unscharf benannt als fälschlich frei.

## Erkennung eines Luftfahrzeugs

Es gilt dasselbe Muster wie im bestehenden Deuter — bewusst grob, damit
Raumbuchungen (`GRILL`, `LANDEBAR`, `Werkstatt`) aussortiert werden, ohne ein
ungewöhnlich benanntes Flugzeug zu verschlucken. Der Ausdruck wird **geteilt**
und nicht kopiert: Zwei Fassungen desselben Musters liefen unweigerlich
auseinander.

## Vertragsprüfung gegen den echten Abzug

Unter `packages/reservierung-core/tests/beispiele/kalender.ics` liegt ein
echter Abzug, in dem **alle Personennamen ersetzt** sind. Er ist damit
gefahrlos versionierbar und gibt trotzdem Aufbau und Eigenheiten des Originals
wieder.

Die zugehörige Prüfung MUSS anschlagen, wenn sich Aufbau oder Beschriftung
ändern (FR-016, SC-005) — und sie MUSS absichern, dass sie überhaupt etwas zu
prüfen hatte. Eine Prüfung über eine leere Liste ist still grün und damit
gefährlicher als eine rote.

**Gegenprobe ist Pflicht**: Die Prüfung ist einmal absichtlich zum Scheitern zu
bringen (etwa durch eine eingeschmuggelte Beschriftung), um zu belegen, dass sie
greift. So geschehen bei `vertrag.test.ts` in Feature 047.
