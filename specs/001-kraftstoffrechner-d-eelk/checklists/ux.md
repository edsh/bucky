# UX Checklist: Kraftstoffrechner für D-EELK

**Purpose**: Prüft die **Qualität der Anforderungstexte** zu Eingabemaske und
Ergebnisdarstellung — ob beschrieben ist, was der Pilot sieht, eingibt und
zurückgemeldet bekommt, nicht ob die Oberfläche später funktioniert.
**Created**: 2026-08-06
**Feature**: [spec.md](../spec.md)
**Tiefe**: Formales Freigabe-Gate — jede offene Position blockiert die Freigabe.

## Eingabemaske

- [ ] CHK048 Ist je Eingabefeld festgelegt, ob eine freie Eingabe oder eine Auswahl aus zulässigen Werten vorgesehen ist? [Gap, Spec §FR-004]
- [ ] CHK049 Ist gefordert, dass jedes Feld seine Einheit anzeigt? Bei acht Feldern mit ft, NM, %, °C, kt, kg ist Verwechslung sonst wahrscheinlich. [Gap, Spec §FR-004]
- [ ] CHK050 Ist gefordert, dass Höhenfelder als Druckhöhe gekennzeichnet sind? Die Annahme steht nur in den Assumptions, nicht als Anforderung. [Consistency, Spec §Assumptions, §FR-004]
- [ ] CHK051 Ist beschrieben, wie die Lasteinstellung dem Piloten gegenüber benannt wird, damit sie der Anzeige im Cockpit zuzuordnen ist? [Clarity, Spec §FR-004]
- [ ] CHK052 Ist festgelegt, ob unzulässige Kombinationen vorab in der Auswahl gesperrt werden oder erst beim Absenden zur Fehlermeldung führen? [Gap, Spec §FR-008]
- [ ] CHK053 Ist gefordert, dass eingegebene Werte nach einer Fehlermeldung erhalten bleiben? [Gap, Spec §FR-008]
- [ ] CHK054 Sind Vorbelegungen für Felder definiert, oder startet die Maske vollständig leer? [Gap, Spec §FR-004]

## Ergebnisdarstellung

- [ ] CHK055 Ist festgelegt, welche Werte ohne weitere Interaktion sichtbar sind und welche erst nach dem Aufklappen? Die Anforderung verlangt Zwischenwerte, sagt aber nichts über deren Sichtbarkeit. [Gap, Spec §FR-017, §User Story 2]
- [ ] CHK056 Ist die Reihenfolge der Aufschlüsselung festgelegt, sodass sie der Reihenfolge im Handbuch entspricht? [Clarity, Spec §FR-009]
- [ ] CHK057 Ist gefordert, dass jeder Rechenschritt seine Eingangswerte zeigt und nicht nur sein Ergebnis? [Completeness, Spec §User Story 2]
- [ ] CHK058 Ist beschrieben, wie sich Hinweise ohne Abbruch von Fehlern mit Abbruch unterscheiden? [Clarity, Spec §Edge Cases]
- [ ] CHK059 Ist definiert, wie die Quellenangaben dargestellt werden, wenn mehrere Tabellen beteiligt sind? [Gap, Spec §FR-005]
- [ ] CHK060 Ist gefordert, dass der Prüfhinweis zusammen mit dem Ergebnis sichtbar ist und nicht nur auf einer Unterseite steht? [Clarity, Spec §FR-006]

## Fehlermeldungen

- [ ] CHK061 Ist gefordert, dass eine Fehlermeldung das betroffene Feld benennt? [Gap, Spec §FR-008]
- [ ] CHK062 Ist gefordert, dass die Meldung den zulässigen Bereich und dessen Herkunft aus dem Handbuch nennt, statt nur "ungültig" zu sagen? [Completeness, Spec §FR-007]
- [ ] CHK063 Ist ausgeschlossen, dass bei einem Fehler ein Teilergebnis stehen bleibt, das für ein gültiges Ergebnis gehalten werden könnte? [Gap, Spec §FR-007]

## Nutzungskontext

- [ ] CHK064 Ist die Nutzung ohne Netzverbindung als Anforderung formuliert? Der Plan setzt darauf, die Spec verlangt es nicht. [Gap, Spec §Success Criteria]
- [ ] CHK065 Ist die Nutzung auf einem Mobilgerät als Anforderung formuliert? Die Flugvorbereitung findet selten am Schreibtisch statt. [Gap]
- [ ] CHK066 Ist die Sprache der Oberfläche festgelegt? [Gap, Spec §FR-004]
- [ ] CHK067 Sind Anforderungen an die Bedienbarkeit ohne Maus und an ausreichenden Kontrast formuliert, oder fehlen Barrierefreiheitsanforderungen vollständig? [Gap]
- [ ] CHK068 Ist gefordert, dass ein Ergebnis samt Rechenweg und Quellenangaben für die Flugvorbereitungsunterlagen gesichert werden kann? [Gap, Spec §Out of Scope]

## Messbarkeit

- [ ] CHK069 Ist "innerhalb weniger Sekunden" mit einem Schwellwert beziffert? [Measurability, Spec §SC-001]
- [ ] CHK070 Lässt sich SC-002 objektiv prüfen, oder fehlt die Festlegung, was als vollständige Quellenangabe gilt? [Measurability, Spec §SC-002]

## Notes

- CHK064 und CHK065 sind Anforderungen, die der Plan bereits voraussetzt. Bleiben
  sie ungeschrieben, kann ein späterer Adapterwechsel sie stillschweigend
  aufheben.
- CHK068 betrifft eine bewusste Auslassung: Sichern und Teilen steht nicht in der
  Spec. Die Position ist entweder als Anforderung aufzunehmen oder ausdrücklich
  als nicht gewollt zu vermerken.
