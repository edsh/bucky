# Calculation Checklist: Kraftstoffrechner für D-EELK

**Purpose**: Prüft die **Qualität der Anforderungstexte** zum Rechenverfahren —
Interpolation, Korrekturen, Einheiten und Rundung. Es geht darum, ob das Verfahren
so beschrieben ist, dass zwei Personen unabhängig voneinander dasselbe Ergebnis
erhalten würden.
**Created**: 2026-08-06
**Feature**: [spec.md](../spec.md)
**Tiefe**: Formales Freigabe-Gate — jede offene Position blockiert die Freigabe.

## Interpolationsverfahren

- [ ] CHK023 Ist das Interpolationsverfahren in der Spec benannt, oder steht "deterministische Interpolation" ohne Angabe, welche? [Gap, Spec §FR-003]
- [ ] CHK024 Ist festgelegt, über welche Achsen überhaupt interpoliert werden darf — Druckhöhe, Lasteinstellung, beide? [Gap, Spec §FR-003]
- [ ] CHK025 Ist geregelt, ob zwischen den Lasteinstellungen in 10-Prozent-Schritten interpoliert werden darf, oder ob nur die Rasterwerte zulässig sind? [Ambiguity, Spec §FR-004]
- [ ] CHK026 Ist beschrieben, wie mit Eingaben umzugehen ist, die exakt auf einer Stützstelle liegen, und ob das im Ergebnis erkennbar sein muss? [Gap, Spec §FR-005]
- [ ] CHK027 Ist berücksichtigt, dass Steigflug- und Reiseflugtabelle unterschiedliche Höhenraster haben (1000 ft gegen 2000 ft), und ergibt sich daraus eine Anforderung? [Gap, Spec §FR-010]

## Steigflug

- [ ] CHK028 Ist eindeutig, dass Zeit, Strecke und Kraftstoff jeweils als Differenz zweier Tabellenwerte zu bilden sind und nicht der Wert bei Reiseflughöhe allein zählt? [Clarity, Spec §FR-010]
- [ ] CHK029 Ist die Reihenfolge festgelegt — erst Differenz bilden, dann Temperatur korrigieren, oder umgekehrt? Beide Reihenfolgen liefern hier dasselbe, das sollte aber nicht dem Zufall überlassen bleiben. [Clarity, Spec §FR-010, §FR-012]
- [ ] CHK030 Ist der Festbetrag von 4 l als temperaturunabhängig gekennzeichnet, oder könnte man ihn als von FR-012 miterfasst lesen? [Ambiguity, Spec §FR-011, §FR-012]
- [x] CHK031 ~~Ist die Anwendung auf den Kraftstoff begründet dokumentiert?~~ **Erledigt 2026-08-06**: begründet in `research.md` §3 und im Abschnitt "Geklärte Punkte" der Spec, offengelegt über FR-019.
- [x] CHK032 ~~Stufenweise oder stetig?~~ **Erledigt 2026-08-06**: stetig, als Formel in FR-012 festgeschrieben. [Spec §FR-012]

## Reiseflug

- [x] CHK033 ~~Ist begründet, warum FR-013 mit 1 % rechnet, während das Rechenbeispiel 2 % nennt?~~ **Erledigt 2026-08-06**: kein Widerspruch — die 2 % sind das Ergebnis für ISA+20 bei 1 % je 10 °C. Anmerkung 3 ist in 5a und 5b wortgleich. Festgehalten in `reference-calculation.md`, Befund 1.
- [x] CHK034 ~~Gilt für die KTAS-Korrektur dieselbe Frage?~~ **Erledigt 2026-08-06**: ebenfalls stetig, als Formel in FR-013 festgeschrieben. [Spec §FR-013]
- [ ] CHK035 Ist das Vorzeichen der Windkomponente definiert — ist ein positiver Wert Gegen- oder Rückenwind? [Clarity, Spec §FR-004, §FR-014]
- [ ] CHK036 Ist festgelegt, dass die Windkomponente entlang der Strecke gemeint ist und nicht Windrichtung und -stärke? [Ambiguity, Spec §FR-004]
- [ ] CHK037 Ist eine über die gesamte Strecke konstante Windkomponente als Annahme dokumentiert? [Assumption, Gap]
- [ ] CHK038 Ist geregelt, ob die Verbrauchsrate im Reiseflug bereits die Höhe berücksichtigt oder ausschließlich von der Lasteinstellung abhängt, und ist diese Aussage in den Anforderungen und nicht nur in den Annahmen verankert? [Consistency, Spec §Assumptions, §FR-014]

## Einheiten und Wertebereiche

- [ ] CHK039 Ist die Einheit der Streckenlänge in den Anforderungen genannt? FR-004 sagt "Streckenlänge" ohne Einheit. [Gap, Spec §FR-004]
- [ ] CHK040 Ist die Einheit der Windkomponente genannt? [Gap, Spec §FR-004]
- [ ] CHK041 Ist festgelegt, ob Ergebnisse zusätzlich in US-Gallonen auszugeben sind, wie es das Handbuch durchgängig tut? [Gap, Spec §FR-009]
- [ ] CHK042 Sind zulässige Bereiche für Streckenlänge und Windkomponente definiert, oder nur im Datenmodell? [Consistency, Spec §FR-008]
- [x] CHK043 ~~Ist begründet, warum Abflugmasse und Tankvariante diskret geführt werden?~~ **Hinfällig 2026-08-06**: beide sind keine Eingaben mehr, da für D-EELK je Tabellenart genau eine Tabelle anwendbar ist. [Spec §FR-015]
- [ ] CHK043a Ist als Anforderung festgehalten, dass die Steigflugtabelle für die maximale Abflugmasse gilt und die Rechnung damit für leichtere Beladung auf der sicheren Seite liegt? Steht bisher nur in den Annahmen. [Consistency, Spec §Assumptions, §FR-010]

## Rundung und Genauigkeit

- [ ] CHK044 Ist eine Rundungsvorgabe in den Anforderungen enthalten? Die Spec erwähnt Rundung nur beiläufig im Akzeptanzkriterium. [Gap, Spec §User Story 1]
- [ ] CHK045 Ist "innerhalb der durch Interpolation und Rundung bedingten Genauigkeit" mit einer zulässigen Abweichung beziffert, sodass sich das Akzeptanzkriterium objektiv entscheiden lässt? [Measurability, Spec §User Story 1]
- [ ] CHK046 Ist ausgeschlossen, dass zwischen den Rechenschritten gerundet wird? [Gap, Spec §FR-017]
- [x] CHK047 ~~Ist SC-005 überprüfbar formuliert?~~ **Erledigt 2026-08-06**: SC-005 prüft jetzt das Verfahren gegen einen von Hand erstellten Sollwert statt gegen die 5a-Zahlen. [Spec §SC-005]
- [x] CHK047a ~~Ist festgelegt, wer den Sollwert erstellt und wo er dokumentiert wird?~~ **Erledigt 2026-08-06**: `reference-calculation.md`, erstellt vor jeder Zeile Code. Fall C prüft gegen die Zahlen des Herstellers statt gegen eine eigene Rechnung. Offen bleibt die menschliche Stichprobe gegen das gedruckte Handbuch.

## Notes

- CHK032 und CHK034 betreffen denselben Punkt an zwei Stellen — beide sollten
  gemeinsam entschieden werden, damit die Anforderungen konsistent bleiben.
- CHK047 ist der kritischste Punkt dieser Liste: ein Erfolgskriterium, das sich
  nicht eindeutig entscheiden lässt, ist als Gate wertlos.
- [x] CHK048 Ist die Rundungsregel selbst spezifiziert — auf wie viele Nachkommastellen Liter, Zeiten und Strecken gerundet werden? FR-020 legt fest, *wann* gerundet wird, FR-021 *wie genau*. [Gelöst, Spec §FR-021]
