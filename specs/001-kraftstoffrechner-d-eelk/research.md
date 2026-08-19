# Phase 0 — Research: Kraftstoffrechner für D-EELK

Grundlage sind die digitalisierten Tabellen unter `data/poh/d-eelk/` sowie der
Fließtext des POH auf den Seiten 5-3 bis 5-5 ("Erforderliche Kraftstoffmenge").

## 1. Rechenverfahren

**Decision**: Das Verfahren des POH wird Schritt für Schritt übernommen:

1. Anlassen, Rollen und Start: Festbetrag 4 l (Anmerkung 1 der Steigflugtabelle).
2. Steigflugwerte als Differenz der Tabellenwerte bei Reiseflughöhe und Platzhöhe
   des Startplatzes (Zeit, Strecke, Kraftstoff).
3. Temperaturkorrektur des Steigflugs: je 10 °C über ISA plus 10 %.
4. KTAS aus der Reiseleistungstabelle, Temperaturkorrektur je 10 °C über ISA plus 1 %.
5. Reiseflugstrecke = Gesamtstrecke − korrigierte Steigflugstrecke.
6. Geschwindigkeit über Grund = korrigierte KTAS − Gegenwindkomponente.
7. Reiseflugzeit = Reiseflugstrecke / Geschwindigkeit über Grund.
8. Reiseflug-Kraftstoff = Reiseflugzeit × Verbrauchsrate.
9. Summe der drei Anteile, Gegenüberstellung zur ausfliegbaren Kraftstoffmenge.

**Rationale**: Das POH beschreibt dieses Verfahren als das für die Flugplanung
vorgesehene und rechnet es auf Seite 5-4/5-5 vollständig vor. Ein eigenes,
"besseres" Verfahren wäre nicht mehr gegen das Handbuch prüfbar und würde
Prinzip I verletzen.

**Alternatives considered**: Ablesen von Reichweite und Flugdauer direkt aus den
Spalten der Reiseleistungstabelle. Verworfen, weil diese Spalten laut Anmerkung 2
bereits 4 l für Start und Rollen, den kompletten Steigflug und 45 min Reserve
enthalten und sich deshalb nicht auf ein konkretes Flugvorhaben mit abweichender
Streckenlänge übertragen lassen.

## 2. Verbrauchsrate hängt nur von der Lasteinstellung ab

**Decision**: Die Verbrauchsrate wird ausschließlich über die Lasteinstellung
bestimmt und über diese eine Achse interpoliert.

**Rationale**: Über alle fünf Reiseleistungstabellen hinweg — also über alle
Druckhöhen von 0 bis 18000 ft, beide Abfluggewichte und alle drei Tankvarianten —
sind die Werte identisch: 100 % = 33,6 l/h, 90 % = 29,6 l/h, 80 % = 25,8 l/h,
70 % = 22,1 l/h, 60 % = 18,6 l/h, 50 % = 15,3 l/h. Druckhöhe und Temperatur wirken
in diesen Tabellen auf KTAS, Reichweite und Flugdauer, nicht auf die Rate.

**Alternatives considered**: Eine Interpolation über Druckhöhe und Lasteinstellung
gemeinsam. Fachlich nicht falsch, aber sie würde eine Höhenabhängigkeit der Rate
suggerieren, die in den Daten nicht existiert, und die Ausgabe der Eckwerte
unnötig verkomplizieren. Die Interpolation über die Druckhöhe wird dort gemacht,
wo sie hingehört: bei KTAS.

## 3. Temperaturkorrektur — welcher Prozentsatz, worauf angewendet

**Decision**: Steigflug mit dem Faktor `1 + (ΔISA / 10) × 0,10` auf Zeit, Strecke
**und** Kraftstoff. KTAS mit dem Faktor `1 + (ΔISA / 10) × 0,01`. Beide Korrekturen
wirken **stetig**, nicht in Stufen. Bei ISA-Abweichung nach unten wird nicht
korrigiert.

**Rationale**: Die 10 % stehen in Anmerkung 2 der Steigflugtabelle, die 1 % in
Anmerkung 3 der Reiseleistungstabellen. Das Rechenbeispiel auf Seite 5-3 nennt
2 % — das ist kein Widerspruch, sondern das Ergebnis für ISA+20 (zweimal 1 % je
10 °C). Anmerkung 3 lautet in den Abschnitten 5a und 5b wortgleich.
Anmerkung 2 nennt wörtlich nur Zeit und Steigstrecke, das Rechenbeispiel des POH
wendet die Korrektur jedoch ausdrücklich auch auf den Kraftstoff an
(3,3 l × 20 % = 0,7 l). Wir folgen dem Rechenbeispiel, weil das mehr Kraftstoff
einplant und damit die sichere Auslegung ist. Für Temperaturen unter ISA nach unten
zu korrigieren wäre eine Extrapolation ins Nicht-Belegte und würde weniger
Kraftstoff einplanen — das unterbleibt.

Dass die Korrektur stetig wirkt, gibt das Handbuch selbst vor: es rechnet
`20 °C / 10 °C × 10 % = 20 %`. Eine stufenweise Auslegung ("je volle 10 °C")
erzeugte zudem einen Sprung zwischen ISA+9,9 und ISA+10 und plante bei
Zwischenwerten weniger Kraftstoff ein.

**Alternatives considered**: Anmerkung 2 wörtlich nehmen und den Kraftstoff
unkorrigiert lassen. Verworfen, weil es gegen das Rechenbeispiel desselben
Handbuchs steht und zu wenig Kraftstoff einplant; die Abweichung von der wörtlichen
Anmerkung wird stattdessen in der Ausgabe offengelegt (FR-019). Ebenfalls verworfen:
stufenweise Korrektur je voller 10 °C, siehe oben.

## 4. Lückenhaftes Raster der Reiseleistungstabellen

**Decision**: Kombinationen aus Druckhöhe und Lasteinstellung, die im Raster nicht
belegt sind, werden abgewiesen — auch dann, wenn eine der beiden Nachbarhöhen sie
enthielte.

**Rationale**: Das Raster ist nicht rechteckig, weil das Triebwerk mit der Höhe
Leistung verliert:

| Druckhöhe | verfügbare Lasteinstellungen |
|---|---|
| 0 – 8000 ft | 50 – 100 % |
| 10000 – 14000 ft | 50 – 90 % |
| 16000 – 18000 ft | 50 – 80 % |

Über eine fehlende Stützstelle hinweg zu interpolieren hieße, eine Leistung
anzunehmen, die das Triebwerk in dieser Höhe laut Handbuch nicht abgibt. Das ist
Extrapolation und durch FR-007 ausgeschlossen.

**Alternatives considered**: Auf die höchste in der Zielhöhe verfügbare
Lasteinstellung zurückfallen. Verworfen — das Ergebnis würde stillschweigend eine
andere Frage beantworten als die gestellte.

## 5. Abflugmasse und Tankvariante sind keine Eingaben

**Decision**: Es wird genau eine Steigflugtabelle (Abb. 5-3a) und genau eine
Reiseleistungstabelle (Abb. 5-4a) verwendet. Der Pilot wählt weder Abflugmasse noch
Tankvariante.

**Rationale**: D-EELK ist eine Cessna 172N mit Standardtanks (das Original-
Handbuch deckt die Muster F172N und F172P ab; die Tabellen führen diesen
Geltungsbereich wörtlich mit). Damit gilt die
maximale Abflugmasse von 1043 kg — die Tabellen für 1089 kg sind laut POH der 172P
vorbehalten — und eine ausfliegbare Menge von 127,4 l. Von den 13 digitalisierten
Tabellen sind nur fünf für D-EELK überhaupt anwendbar, davon zwei für dieses
Feature. Die Datengrundlage führt das je Tabelle als
`applicability.applicable_to_d_eelk`, damit eine unanwendbare Tabelle nicht
versehentlich herangezogen wird.

Ein Vergleich der Tankvarianten bei 1043 kg stützt das zusätzlich: KTAS und
Verbrauchsrate sind zwischen Standard- und Langstreckentank in allen 53 Zeilen
identisch; nur Reichweite und Flugdauer unterscheiden sich, und die verwendet dieses
Feature nicht. Die Tankvariante beeinflusst also ohnehin nur, gegen welche
ausfliegbare Menge der Bedarf geprüft wird.

Dass die Steigflugtabelle für die maximale Abflugmasse gilt, ist unkritisch: ein
leichter beladenes Flugzeug steigt besser und verbraucht dabei weniger. Die Rechnung
liegt damit auf der sicheren Seite.

**Alternatives considered**: Masse und Tank trotzdem abfragen, um später andere
Flugzeuge zu unterstützen. Verworfen — für D-EELK gäbe es nur eine gültige Antwort,
und zwei Felder mit je einer zulässigen Auswahl sind eine Fehlerquelle ohne Nutzen.
Die Verallgemeinerung gehört in das Feature, das ein zweites Flugzeug aufnimmt.

## 6. Betriebsform: statisch statt Server

**Decision**: SvelteKit mit `@sveltejs/adapter-static`, ausgeliefert über GitHub
Pages. Der MCP-Server läuft als lokaler Node-Prozess über stdio.

**Rationale**: Die Berechnung ist eine reine Funktion, die Datengrundlage sind 13
versionierte JSON-Dateien im Repository. Es gibt nichts zu persistieren, nichts zu
authentifizieren und keine serverseitigen Geheimnisse. Ein statisches Bundle ist
kostenlos zu betreiben, hat keine Angriffsfläche und funktioniert nach dem ersten
Laden auch ohne Netz — was in einem Flugzeug oder auf einem Vorfeld ein echter
Vorteil ist. Für den MCP-Zugang ist stdio der Normalfall der lokal laufenden
Assistenzwerkzeuge und erspart einen öffentlich erreichbaren Endpunkt.

**Alternatives considered**: `adapter-node` auf einem eigenen Server oder ein
Serverless-Hosting. Beide lösen ein Problem, das dieses Feature nicht hat, und
erzeugen Betriebsaufwand beziehungsweise eine Anbieterbindung. Sobald
Vereinsflieger-Integration und Login dazukommen, ist der Adapterwechsel in
SvelteKit eine Konfigurationsänderung — die Entscheidung ist also umkehrbar und muss
jetzt nicht vorweggenommen werden.

## 7. Rundung

**Decision**: Im Kern wird durchgängig mit ungerundeten Gleitkommazahlen gerechnet;
gerundet wird nur einmal bei der Aufbereitung der Ausgabe, und zwar auf eine
Nachkommastelle für Liter, NM und Stunden und auf ganze Zahlen für KTAS und Minuten.
Die Rundung liegt im Kern, nicht in den Adaptern.

**Rationale**: Zwischenrundung akkumuliert Fehler und würde dazu führen, dass
Web-Oberfläche und MCP-Antwort bei identischer Eingabe verschiedene Zahlen zeigen —
genau das schließt Prinzip IV aus. Eine Nachkommastelle entspricht der
Darstellungsgenauigkeit der Tabellen im Handbuch.

**Alternatives considered**: Rundung in jeder Ausgabeschicht. Verworfen wegen der
Gefahr divergierender Ergebnisse zwischen den Zugangswegen.

## 8. Interpolationsverfahren

**Decision**: Lineare Interpolation zwischen den beiden benachbarten Stützstellen.
Jeder interpolierte Wert führt die beiden verwendeten Eckwerte im Rechenprotokoll
mit. Liegt der Eingabewert exakt auf einer Stützstelle, wird der Tabellenwert
unverändert übernommen und als solcher gekennzeichnet.

**Rationale**: Die Tabellen sind Stützstellenrasten ohne dokumentiertes
Zwischenverhalten; lineare Interpolation ist das im Handbuch implizit unterstellte
und für den Piloten von Hand nachvollziehbare Verfahren. Splines wären genauer
aussehend, aber nicht nachprüfbar.

**Alternatives considered**: Spline- oder polynomiale Interpolation. Verworfen —
nicht von Hand gegen das Handbuch nachrechenbar und damit gegen den Zweck von
Prinzip I.

## Offen

Alle fachlichen Fragen zum Flugzeug und zum Rechenverfahren sind entschieden; sie
stehen in der Spec unter "Geklärte Punkte". Backend, Datenbank und
Authentifizierung bleiben projektweit offen; dieses Feature benötigt keines davon.

Für das Folge-Feature bleibt offen, woher die Werte für Sinkflug und
Ausweichflugplatz stammen sollen — die POH-Ergänzung enthält dazu keine Tabellen.
