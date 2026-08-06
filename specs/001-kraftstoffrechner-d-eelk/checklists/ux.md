# UX Checklist: Kraftstoffrechner für D-EELK

**Purpose**: Prüft die **Qualität der Anforderungstexte** zu Eingabemaske und
Ergebnisdarstellung — ob beschrieben ist, was der Pilot sieht, eingibt und
zurückgemeldet bekommt, nicht ob die Oberfläche später funktioniert.
**Created**: 2026-08-06
**Feature**: [spec.md](../spec.md)
**Tiefe**: Formales Freigabe-Gate — jede offene Position blockiert die Freigabe.

## Eingabemaske

- [x] CHK048 ~~Ist je Eingabefeld festgelegt, ob eine freie Eingabe oder eine Auswahl aus zulässigen Werten vorgesehen ist? [Gap, Spec §FR-004]~~ **Erledigt 2026-08-06**: FR-024: Auswahl fuer die Lasteinstellung, freie Zahleneingabe fuer die uebrigen Felder.
- [x] CHK049 ~~Ist gefordert, dass jedes Feld seine Einheit anzeigt? Bei acht Feldern mit ft, NM, %, °C, kt, kg ist Verwechslung sonst wahrscheinlich. [Gap, Spec §FR-004]~~ **Erledigt 2026-08-06**: FR-024: jedes Feld zeigt seine Einheit.
- [x] CHK050 ~~Ist gefordert, dass Höhenfelder als Druckhöhe gekennzeichnet sind? Die Annahme steht nur in den Assumptions, nicht als Anforderung. [Consistency, Spec §Assumptions, §FR-004]~~ **Erledigt 2026-08-06**: FR-024: die Hoehenfelder sind als Druckhoehe gekennzeichnet.
- [x] CHK051 ~~Ist beschrieben, wie die Lasteinstellung dem Piloten gegenüber benannt wird, damit sie der Anzeige im Cockpit zuzuordnen ist? [Clarity, Spec §FR-004]~~ **Erledigt 2026-08-06**: FR-024: die Lasteinstellung wird in Prozent benannt, genau wie die Spalte der Reiseleistungstabelle.
- [x] CHK052 ~~Ist festgelegt, ob unzulässige Kombinationen vorab in der Auswahl gesperrt werden oder erst beim Absenden zur Fehlermeldung führen? [Gap, Spec §FR-008]~~ **Erledigt 2026-08-06**: FR-024: Pruefung beim Absenden mit Nennung der verfuegbaren Werte, statt still gesperrter Auswahl.
- [x] CHK053 ~~Ist gefordert, dass eingegebene Werte nach einer Fehlermeldung erhalten bleiben? [Gap, Spec §FR-008]~~ **Erledigt 2026-08-06**: FR-024: eingegebene Werte bleiben nach einer Fehlermeldung erhalten.
- [x] CHK054 ~~Sind Vorbelegungen für Felder definiert, oder startet die Maske vollständig leer? [Gap, Spec §FR-004]~~ **Erledigt 2026-08-06**: FR-024: die Maske startet mit plausiblen Vorbelegungen.

## Ergebnisdarstellung

- [x] CHK055 ~~Ist festgelegt, welche Werte ohne weitere Interaktion sichtbar sind und welche erst nach dem Aufklappen? Die Anforderung verlangt Zwischenwerte, sagt aber nichts über deren Sichtbarkeit. [Gap, Spec §FR-017, §User Story 2]~~ **Erledigt 2026-08-06**: FR-026: Aufschluesselung, Quellen, Pruefhinweis und Hinweise ohne Bedienschritt sichtbar, die Schrittfolge aufklappbar.
- [x] CHK056 ~~Ist die Reihenfolge der Aufschlüsselung festgelegt, sodass sie der Reihenfolge im Handbuch entspricht? [Clarity, Spec §FR-009]~~ **Erledigt 2026-08-06**: FR-026: Reihenfolge des Handbuchverfahrens.
- [x] CHK057 ~~Ist gefordert, dass jeder Rechenschritt seine Eingangswerte zeigt und nicht nur sein Ergebnis? [Completeness, Spec §User Story 2]~~ **Erledigt 2026-08-06**: FR-026: jeder Schritt zeigt Eingangswerte, Ergebnisse und Erlaeuterung.
- [x] CHK058 ~~Ist beschrieben, wie sich Hinweise ohne Abbruch von Fehlern mit Abbruch unterscheiden? [Clarity, Spec §Edge Cases]~~ **Erledigt 2026-08-06**: FR-025: Hinweise ohne Abbruch sind von abbrechenden Fehlern unterscheidbar dargestellt.
- [x] CHK059 ~~Ist definiert, wie die Quellenangaben dargestellt werden, wenn mehrere Tabellen beteiligt sind? [Gap, Spec §FR-005]~~ **Erledigt 2026-08-06**: FR-005: die gesammelte Quellenliste fuehrt jede beteiligte Tabelle einzeln auf.
- [x] CHK060 ~~Ist gefordert, dass der Prüfhinweis zusammen mit dem Ergebnis sichtbar ist und nicht nur auf einer Unterseite steht? [Clarity, Spec §FR-006]~~ **Erledigt 2026-08-06**: FR-006: zusammen mit dem Ergebnis sichtbar, nicht hinter einem Aufklappen.

## Fehlermeldungen

- [x] CHK061 ~~Ist gefordert, dass eine Fehlermeldung das betroffene Feld benennt? [Gap, Spec §FR-008]~~ **Erledigt 2026-08-06**: FR-007: die Meldung benennt das betroffene Feld.
- [x] CHK062 ~~Ist gefordert, dass die Meldung den zulässigen Bereich und dessen Herkunft aus dem Handbuch nennt, statt nur "ungültig" zu sagen? [Completeness, Spec §FR-007]~~ **Erledigt 2026-08-06**: FR-007: die Meldung nennt den zulaessigen Bereich beziehungsweise die verfuegbaren Werte.
- [x] CHK063 ~~Ist ausgeschlossen, dass bei einem Fehler ein Teilergebnis stehen bleibt, das für ein gültiges Ergebnis gehalten werden könnte? [Gap, Spec §FR-007]~~ **Erledigt 2026-08-06**: FR-025: ein zuvor angezeigtes Ergebnis verschwindet bei einem Fehler.

## Nutzungskontext

- [x] CHK064 ~~Ist die Nutzung ohne Netzverbindung als Anforderung formuliert? Der Plan setzt darauf, die Spec verlangt es nicht. [Gap, Spec §Success Criteria]~~ **Erledigt 2026-08-06**: FR-027: rechnet nach dem ersten Laden ohne Netzverbindung.
- [x] CHK065 ~~Ist die Nutzung auf einem Mobilgerät als Anforderung formuliert? Die Flugvorbereitung findet selten am Schreibtisch statt. [Gap]~~ **Erledigt 2026-08-06**: FR-027: auf einem Mobilgeraet bedienbar.
- [x] CHK066 ~~Ist die Sprache der Oberfläche festgelegt? [Gap, Spec §FR-004]~~ **Erledigt 2026-08-06**: FR-027: Deutsch.
- [x] CHK067 Sind Anforderungen an die Bedienbarkeit ohne Maus und an ausreichenden Kontrast formuliert, oder fehlen Barrierefreiheitsanforderungen vollständig? [Gap]
- [x] CHK068 Ist gefordert, dass ein Ergebnis samt Rechenweg und Quellenangaben für die Flugvorbereitungsunterlagen gesichert werden kann? [Gap, Spec §Out of Scope]

## Messbarkeit

- [x] CHK069 ~~Ist "innerhalb weniger Sekunden" mit einem Schwellwert beziffert? [Measurability, Spec §SC-001]~~ **Erledigt 2026-08-06**: SC-001 nennt jetzt hoechstens eine Sekunde.
- [x] CHK070 ~~Lässt sich SC-002 objektiv prüfen, oder fehlt die Festlegung, was als vollständige Quellenangabe gilt? [Measurability, Spec §SC-002]~~ **Erledigt 2026-08-06**: SC-002 zaehlt die Bestandteile einer vollstaendigen Quellenangabe auf.

## Notes

- CHK064 und CHK065 sind Anforderungen, die der Plan bereits voraussetzt. Bleiben
  sie ungeschrieben, kann ein späterer Adapterwechsel sie stillschweigend
  aufheben.
- CHK068 betrifft eine bewusste Auslassung: Sichern und Teilen steht nicht in der
  Spec. Die Position ist entweder als Anforderung aufzunehmen oder ausdrücklich
  als nicht gewollt zu vermerken.
- CHK067 und CHK068 sind für dieses Feature bewusst zurückgestellt und damit
  geschlossen: Barrierefreiheit und das Sichern eines Ergebnisses für die
  Flugvorbereitungsunterlagen werden als eigenes Folge-Feature aufgenommen,
  nicht im Kraftstoffrechner nachgezogen (Issue #3). Bis dahin gilt für beide Punkte
  ausdrücklich: nicht Bestandteil von Feature 001.
