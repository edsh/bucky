# Phase 0: Recherche und Entscheidungen

**Feature**: 054 — Reservierungsübersicht Flugzeugflotte
**Datum**: 2026-08-18

Jede Entscheidung trägt eine Kennung `E-nn`, auf die Plan, Verträge und später
die Aufgabenliste verweisen.

---

## E-01 — Woher die Flotte kommt

**Entscheidung**: Die angezeigte Flotte ist die **Vereinigung** aus zwei
Mengen: einer gepflegten Stammliste von Kennzeichen im Kern
(`packages/reservierung-core/src/flotte.ts`) und allen Kennzeichen, die im
Datenfenster tatsächlich in den Reservierungen auftauchen.

**Begründung**: Die Spec nimmt an, die Flotte lasse sich allein aus den
Datenquellen ableiten. Das trägt nicht. Beide Quellen kennen nur Flugzeuge,
für die im abgerufenen Zeitraum ein Eintrag existiert — eine Maschine, die
sieben Tage lang niemand gebucht hat, verschwände aus der Übersicht. Und zwar
**genau dann, wenn sie am interessantesten ist**: wenn sie frei ist. Der
eigene Grenzfall der Spec („Maschine ohne jede Reservierung: Ring komplett im
Frei-Farbton") wäre nicht darstellbar.

Umgekehrt darf die Liste nicht die einzige Quelle sein: Ein neu
angeschafftes Flugzeug soll erscheinen, sobald es gebucht wird, und nicht erst
nach einer Veröffentlichung der Anwendung. Deshalb die Vereinigung.

**Verhältnis zu Prinzip II (Vereinsflieger as System of Record)**: Die
Stammliste ist **keine zweite Datenhaltung**. Sie enthält keine Buchungen,
keine Mitglieder, keine Stammdaten mit Eigenleben — nur die Kennzeichen, für
die die Anzeige einen leeren Ring zeichnen soll, wenn nichts gebucht ist. Sie
*führt* keine Flugzeugdaten, sie *kennt* Kennungen.

Nicht ganz kostenlos ist das trotzdem: Ein verkauftes Flugzeug, das jemand in
der Liste vergisst, steht dauerhaft als „frei den ganzen Tag" in der Übersicht
— eine falsche Verfügbarkeitsaussage aus Nachlässigkeit statt aus einem
Rechenfehler. Der Auftraggeber hat diese Abweichung am 18.08.2026 ausdrücklich
hingenommen: „der Flugzeugpark ist statisch genug, dass wir ihn fest im Code
vorhalten können". Damit greift die Ausnahmeklausel von Prinzip II. Ausführlich
im Plan unter „Abweichung zu Prinzip II".

**Verworfene Alternativen**:
- *Nur aus den Daten ableiten*: siehe oben — verliert freie Flugzeuge.
- *Flottenliste über die Vereinsflieger-Programmierschnittstelle abrufen*
  (Ressourcenliste): ein zusätzlicher Aufruf gegen das Tageskontingent von 500
  für eine Information, die sich im Jahr vielleicht einmal ändert. Bleibt als
  spätere Verbesserung möglich, wenn der Abruf-Worker sie ohnehin einmal
  täglich mitnehmen kann.

---

## E-02 — Kategorie aus dem Kennzeichen ableiten, nicht pflegen

**Entscheidung**: Die Kategorie (Motorflugzeuge & UL / Segelflugzeuge) wird
**deterministisch aus dem Kennzeichen abgeleitet**: Ein deutsches Kennzeichen,
dessen Eintragungszeichen rein aus Ziffern besteht (`D-9021`, `D-4413`,
`D-3004`), ist ein Segelflugzeug; alles Übrige (`D-EELK`, `D-EXYZ`, `D-MRXS`)
zählt zu Motorflugzeuge & UL. Die Stammliste aus E-01 darf die Kategorie je
Kennzeichen **überschreiben**, tut es aber im Regelfall nicht.

**Begründung**: Die Zuordnung folgt der deutschen Luftfahrzeugkennzeichnung
und stimmt für den gesamten echten Prüfabzug (sechs Kennzeichen, sechs
Treffer). Eine gepflegte Spalte, die in 100 % der Fälle das reproduziert, was
eine Regel ohnehin liefert, ist eine Pflegepflicht ohne Gegenwert — und die
Stelle, an der die Anzeige später leise falsch wird, weil sie jemand vergisst.

Die Überschreibung bleibt, weil es echte Grenzfälle gibt: Ein Motorsegler
(`D-K…`) wird in manchen Vereinen zu den Segelflugzeugen gezählt. Das ist eine
Vereinsentscheidung, keine Regel — dafür ist die Liste da.

**Verworfene Alternative**: Kategorie je Kennzeichen zwingend pflegen. Macht
jedes neu auftauchende Kennzeichen (E-01) zu einem unkategorisierbaren
Sonderfall, der irgendwo landen müsste.

---

## E-03 — Typbezeichnung, Bild und POH-Verweis gehören in die Oberfläche

**Entscheidung**: Kennzeichen und Kategorie führt der Kern (E-01/E-02).
Typbezeichnung („Cessna 172"), Avatarbild und POH-Verweis führt die
Weboberfläche in `apps/web/src/lib/flotte/darstellung.ts`. Alle drei sind
**optional**; fehlt eines, zeigt die Anzeige die vorgesehene Ersatzform
(Kurzkennzeichen statt Bild, kein POH-Knopf, kein Typ in der Kopfzeile).

**Begründung**: Ein Pfad wie `/d-eelk/poh-rechner/` und eine Bilddatei sind
Eigenschaften **dieses Zugangswegs**, nicht der Sache. Der Kern sichert im
einleitenden Kommentar zu, nichts von SvelteKit zu wissen; ein Routenpfad
darin wäre der erste Bruch dieser Zusicherung. FR-018 (POH-Verweis nur für die
D-EELK) ist damit eine einzeilige Tabelle mit genau einem Eintrag.

---

## E-04 — Statuslogik und Geometrie in den Kern, nur die Erzeugung von CSS bleibt in Svelte

**Entscheidung**: In den Kern kommen als neue Module:

| Modul | Aufgabe |
|---|---|
| `flotte.ts` | Kategorieregel (E-02), Flottenbildung (E-01) |
| `zustand.ts` | Statuswert, Wechselzeitpunkt, nächste freie Lücke je Maschine |
| `tagesuhr.ts` | Minute → Winkel und zurück, Ringsegmente, Markerwinkel |
| `segmente.ts` | Tagesbalken und Wochenraster, Schnitt an Mitternacht |

Erweitert werden `formulieren.ts` (Statussätze, Dauerangaben) und `zeit.ts`
(Datums- und Wochentagsformate). Die Weboberfläche baut aus den gelieferten
Segmenten die `conic-gradient`- und `left/width`-Angaben — und rechnet
sonst nichts.

**Begründung**: Verfassungsprinzip IV verlangt einen Kern und dünne Adapter.
Die Winkelabbildung des Tagesuhr-Rings ist keine Gestaltung, sondern eine
Umrechnung: 21:00–06:00 auf 135°–225°, der Rest auf die verbleibenden 270°.
Sie hat Grenzfälle (Mitternacht mitten im Nachtband, Zeitumstellung, Sperre
über mehrere Tage), die sich in Vitest prüfen lassen und in einem
Svelte-Bauteil nicht. Dieselbe Erwägung, aus der in Feature 052 der
Kalender-Deuter in den Kern wanderte statt in die Route.

Die Grenze verläuft dort, wo aus Zahlen Zeichenketten für den Browser werden:
`conic-gradient(...)` ist CSS und gehört zur Oberfläche.

**Verworfene Alternative**: Ringlogik im Svelte-Bauteil. Der Prototyp macht es
so — er ist aber ausdrücklich „kein Produktionscode zum Kopieren"
(Design-Handoff). Sobald ein zweiter Zugangsweg (MCP, spätere native App) den
Tagesverlauf braucht, läge die Umrechnung zweimal im Haus.

---

## E-05 — „Bald belegt" ist ein Farbwert, kein Zustand

**Entscheidung**: `zustand.ts` liefert genau vier Statuswerte (`frei`,
`bald`, `belegt`, `sperre`) und zusätzlich eine Zahl `draengen` zwischen 0 und
1: `draengen = 1 − (nächsterStart − jetzt) / 3600000`, begrenzt auf [0, 1].
Die Oberfläche interpoliert daraus die Statusfarbe zwischen `#1f8f45` und
`#c0442b`. Der Ring bleibt bei `bald` grün.

**Begründung**: So steht es im Design-Handoff, und die Spec hat es unter
„Clarifications" bekräftigt (kein eigener Zustand „bald belegt"). Der Kern
liefert die Zahl statt der Farbe: Farbwerte sind Gestaltungstoken und gehören
nicht in ein UI-freies Modul, die Zeitrechnung dahinter schon.

Zu beachten: `bald` **ist** ein eigener Statuswert (für Wort und Satz —
„Heute noch frei"), nur eben kein eigener *Farb*zustand. Der Handoff meint mit
„kein eigener Farbzustand" ausdrücklich nur die Farbe.

---

## E-06 — Datenfenster: acht Tage, ungekürzte Belegungen

**Entscheidung**: Die Auskunft liefert alle Belegungen, die sich mit dem
Zeitraum **[heute 00:00 Ortszeit, heute + 8 Tage)** überschneiden. Die
Zeitpunkte werden dabei **nicht** auf das Fenster gekürzt; das Schneiden an
Tages- und Fenstergrenzen geschieht erst bei der Darstellung.

**Begründung**: Angezeigt werden sieben Tage. Acht, weil eine am siebten Tag
beginnende Belegung sonst mit falschem Ende erschiene und weil der Tageswechsel
bei geöffneter Seite (FR-016) den Blick um einen Tag weiterschiebt.

Ungekürzt, weil zwei Aussagen sonst falsch würden: „Belegt bis …" folgt der
lückenlosen Kette (`endeDerKette`), die über das Fenster hinausreichen kann,
und eine mehrtägige Sperre nennt ein Datum, das jenseits des achten Tages
liegen darf. Eine gekürzte Endzeit wäre ein Fehler in der schädlichen
Richtung: Jemand fährt zum Platz, weil das Flugzeug angeblich frei wird.

Größenordnung: Der echte Abzug vom 13.08.2026 enthält 59 Einträge über zehn
Wochen; im Achttagefenster bleiben davon rund 10–15 übrig, ohne Namen wenige
hundert Byte. SC-002 ist damit kein Thema.

---

## E-07 — Eine zweite Route, ein gemeinsamer Helfer

**Entscheidung**: Neue Route `GET /api/flotte` (Vertrag:
[contracts/api-flotte.md](./contracts/api-flotte.md)). Die bestehende Route
`GET /api/reservierung` bleibt **unverändert** im Vertrag. Der beiden gemeinsame
Ablauf — Kalender zuerst, Rückfall auf KV, Herkunft mitführen — wandert in
`apps/web/src/lib/server/stand-holen.ts`; beide Routen rufen ihn auf.

**Begründung**: Die zweistufige Beschaffung ist die Stelle, an der Feature 052
seine teuersten Lehren untergebracht hat (kein „frei" bei Fehlschlag,
`no-store`, Randablage nur für den Fremdabruf). Sie ein zweites Mal zu tippen
hieße, diese Lehren zu halbieren. Der bestehende Vertrag bleibt stehen, weil
die Seite `/d-eelk/reservierung/` weiterläuft und ihn erfüllt sieht; ob sie
später zugunsten der Übersicht entfällt, entscheidet ein eigenes Feature.

**Verworfene Alternative**: `/api/reservierung` um einen Parameter
`?kennung=` erweitern und die Übersicht n-mal aufrufen. Bei acht Maschinen
acht Anfragen für eine Seite, jede mit eigenem `Stand`-Zeitpunkt — die
Übersicht zeigte Zeitstände, die nicht zusammengehören.

---

## E-08 — Sonnenzeiten: zentral geholt, im KV abgelegt

**Entscheidung**: Der bestehende Abruf-Worker (`apps/reservierungs-abruf`)
holt die Sonnenzeiten bei Open-Meteo und legt sie unter dem KV-Schlüssel
`sonnenzeiten` ab. Die Weboberfläche liest **nur** diesen Schlüssel und ruft
den Wetterdienst nie selbst.

Anfrage (verifiziert am 2026-08-18):

```text
https://api.open-meteo.com/v1/forecast
  ?latitude=54.06&longitude=9.55
  &daily=sunrise,sunset
  &timezone=Europe/Berlin
  &forecast_days=8
```

Antwort: `daily.sunrise` / `daily.sunset` als `YYYY-MM-DDTHH:MM` **ohne**
Zeitzonenkennung, zu lesen in der angeforderten Zone.

**Warum `timezone=Europe/Berlin` und nicht `UTC`**: Die gelieferte Zeichenkette
ist dann die Ortszeit, die auch auf dem Ring steht. Sie wird beim Ablegen über
den bestehenden Kernweg `ortszeitZuZeitpunkt` → `alsIsoMitVersatz` in dieselbe
Form gebracht wie jede Reservierung seit Feature 052 (`2026-08-18T06:05:00+02:00`).
Damit gibt es im ganzen System **eine** Zeitform, und der Sonderfall der
Zeitumstellung wird an genau der Stelle behandelt, die dafür bereits geprüft
ist.

**Warum im Abruf-Worker und nicht in der Server-Route**: Verfassungsprinzip V
— eine Anfrage aus der Oberfläche darf keinen Fremdaufruf auslösen. Für den
Kalender gilt eine begründete Ausnahme (kein Kontingentverbrauch, Feature 052);
für einen fremden Dienst mit gezählten Aufrufen gilt sie nicht. Der Worker
läuft ohnehin alle 30 Minuten; er schreibt die Sonnenzeiten nur, wenn der
abgelegte Satz nicht mehr den kommenden acht Tagen entspricht — also einmal am
Tag. Das sind 365 von 10 000 erlaubten Aufrufen je Tag, unabhängig davon, wie
viele Mitglieder die Seite öffnen.

**Fehlschlag**: Fehlen die Sonnenzeiten, zeichnet die Anzeige Ring und
Jetzt-Marker unverändert, lässt die beiden Sonnenmarker weg und legt die
Hell/Dunkel-Grenze ersatzweise auf 21:00/06:00 (E-15, Zusicherung T-06a). Ein
fehlender Wetterdienst darf keine Aussage über Verfügbarkeit beeinflussen und
niemals eine Lücke im Ring erzeugen.

**Namensnennung**: Open-Meteo steht unter CC BY 4.0 und verlangt einen
sichtbaren Verweis dort, wo die Daten erscheinen. Die Detailansicht trägt ihn
in der Fußnote — wie der POH-Rechner es für QNH und Wind bereits tut.

**Quellen**: <https://open-meteo.com/en/docs>,
<https://open-meteo.com/en/terms>, <https://open-meteo.com/en/licence>

---

## E-09 — Minütlich neu rechnen, nicht minütlich neu abrufen

**Entscheidung**: Die Seite holt die Daten einmal (und beim Zurückkehren in
den Vordergrund erneut). Der Bezugszeitpunkt wird jede Minute zur vollen
Minute fortgeschrieben; Statuswert, Farbe, Satz, Jetzt-Marker und
Ringsegmente werden aus den bereits vorhandenen Rohdaten neu berechnet — mit
denselben Kernfunktionen, die auch der Server benutzt.

**Begründung**: FR-016 verlangt eine mitlaufende Anzeige, nicht frische Daten
im Minutentakt. Ein Abruf je Minute vervierzigfachte die Last auf den
Kalender-Weg, ohne dass sich der Reservierungsstand so oft ändert. Dass die
Kernfunktionen im Browser laufen, ist unproblematisch: Sie sind rein und
nehmen den Bezugszeitpunkt als Parameter entgegen (Feature 047, E-09).

Der Datenstand („Stand …") altert dabei sichtbar mit — das ist beabsichtigt
und genau der Sinn von FR-019.

---

## E-10 — Favoriten wie die Reglerwerte des POH-Rechners

**Entscheidung**: `apps/web/src/lib/flotte/favoriten.ts` nach dem Muster von
`lib/einstellungen/speicher.ts`: `localStorage`, versionierter Schlüssel
`bucky.favoriten`, unlesbarer oder fremdversionierter Inhalt wird stillschweigend
verworfen. Kein Serverzustand, keine Übertragung.

**Begründung**: Die Spec hat es so geklärt (FR-007a), das Muster existiert
bereits und hat sich bewährt. Wichtig für FR-007b: Kein gespeicherter Wert und
eine leere Liste sind zu unterscheiden — ohne je gesetzten Favoriten erscheint
**keine** Reihe, nicht einmal eine leere.

---

## E-11 — Eigene Reservierungen werden zurückgestellt

**Entscheidung**: In diesem Feature wird **jede** fremde wie eigene
Reservierung als „Reserviert" ausgegeben. Die Kennzeichnung „Deine
Reservierung" und der zugehörige Farbstreifen `#1f4e79` entfallen. FR-009 wird
insoweit nicht erfüllt; die Kennzeichnung wird als eigenes späteres Feature
geführt. Entschieden mit dem Auftraggeber am 2026-08-18.

**Begründung**: Bucky kennt keine Anmeldung und keine Nutzeridentität. Beide
Datenquellen liefern zwar Namen, aber FR-023 (und davor FR-006 aus Feature 047)
verlangen, sie so früh wie möglich zu verwerfen — `Reservierung` hat
deshalb bewusst *kein* Feld für Personen. Ohne Identität des Fragenden ist die
Kennzeichnung nicht bloß unbequem, sondern unentscheidbar.

Sie zu erzwingen hieße, entweder eine Anmeldung einzuführen (eigenes Feature,
deutlich größerer Umfang) oder Namen durch das System zu reichen und im Browser
zu vergleichen — also genau die Datenhaltung aufzubauen, die FR-023 verbietet.
Der Verzicht ist die einzige Variante, die weder ein Prinzip verletzt noch
etwas vortäuscht.

**Folge für die Spec**: US2-Szenario 3 und FR-009/FR-010 sind im Abschnitt
„Clarifications" der Spec entsprechend vermerkt.

---

## E-12 — Echte Routen statt umgeschalteter Ansichten

**Entscheidung**: `/reservierung/` (Übersicht) und `/reservierung/[kennung]/`
(Detailansicht) als echte SvelteKit-Routen. Der gemeinsame Datenstand liegt in
einem Modul-Zustand (`lib/flotte/stand.svelte.ts`) und wird beim ersten Aufruf
einmal geholt, sodass der Wechsel ohne zweiten Abruf geschieht.

**Begründung**: Der Prototyp schaltet zwischen Ansichten um, weil er eine
einzelne HTML-Datei ist. Im Browser eines Telefons ist die Zurück-Geste die am
häufigsten benutzte Bedienung überhaupt — mit umgeschalteten Ansichten
verließe sie die Seite statt zur Übersicht zurückzukehren. Echte Adressen sind
außerdem teilbar („schau dir mal die D-EXYZ an") und mit dem bestehenden
`trailingSlash: 'always'` verträglich.

Die Einblendeanimation des Handoffs bleibt erhalten; sie hängt am Einhängen
des Bauteils, nicht am Umschalten eines Zustands.

---

## E-13 — Der Reservieren-Verweis trägt eine beobachtete Vorbelegung

**Stand vom 2026-08-19 — diese Entscheidung wurde umgekehrt.** Die
ursprüngliche Fassung (2026-08-18) verzichtete auf jede Vorbelegung, weil für
Formularparameter dieses Endpunkts keine Zusage vorlag. Inzwischen liegt eine
Beobachtung aus dem Verein vor: Die Reservierungsmaske nimmt Parameter zur
Vorbelegung entgegen.

**Beobachtete Form** (Quelle: Beobachtung am laufenden System durch den
Auftraggeber, nicht Vereinsflieger-Dokumentation):

```
https://vereinsflieger.de/member/community/reservations/add
  ?type=0&inline=0
  &frm_apid=75132
  &frm_datefrom=25.08.2026
  &frm_dateto=25.08.2026
  &frm_datefromtime=00:00
```

| Parameter | Bedeutung | Format |
| --- | --- | --- |
| `frm_apid` | Kennung des Flugzeugs in Vereinsflieger (vermutlich *airplane id*); `75132` ist die D-EELK | Zahl |
| `frm_datefrom` | Beginn, Datumsteil | `TT.MM.JJJJ` |
| `frm_dateto` | Ende, Datumsteil | `TT.MM.JJJJ` |
| `frm_datefromtime` | Beginn, Uhrzeit | `HH:MM` |

**Entscheidung**: Das Sheet zeigt den berechneten Vorschlag „Von/Bis" weiterhin
als Text **und** hängt ihn an den Verweis an, in einem neuen Tab. Der Vorschlag
bleibt damit auch dann vollständig sichtbar, wenn die Vorbelegung ausbleibt —
das Mitglied kann ihn abtippen, statt ratlos vor einem leeren Formular zu
stehen. Genau daran scheitert die Begründung der alten Fassung: Sie fürchtete,
ein stillschweigend ignorierter Parameter lasse das Mitglied glauben, das
Fenster sei gesetzt. Solange der Vorschlag daneben steht und die Maske vor dem
Absenden sichtbar ist, ist das kein Blindflug, sondern eine Erleichterung, die
im schlechtesten Fall ausbleibt.

**Was daran unsicher bleibt** — und deshalb offen benannt gehört:

- Die Parameter sind **nicht dokumentiert**. Vereinsflieger kann sie bei einem
  Wartungsfenster ändern oder fallenlassen. Der Verweis muss deshalb auch ohne
  Wirkung der Parameter zu einer benutzbaren Maske führen (`type=0&inline=0`
  trägt für sich).
- Ein Gegenstück zu `frm_datefromtime` für das **Ende** ist noch nicht
  beobachtet. Naheliegend wäre `frm_datetotime`; das ist eine Vermutung und
  vor dem Einbau am laufenden System zu prüfen.
- Die `frm_apid` ist **je Maschine** nötig und bisher nur für die D-EELK
  bekannt (`75132`). Die übrigen Werte fehlen. Sie kommen nicht aus dem
  Kennzeichen; sie müssen einmal erhoben werden. Bis dahin trägt der Verweis
  für alle anderen Maschinen keine Flugzeugvorwahl.

**Folgen für die Umsetzung** (Phase 7 / US4):

- `STAMMLISTE` in `packages/reservierung-core/src/flotte.ts` ist heute eine
  reine Liste von Kennzeichen. Für `frm_apid` braucht sie je Eintrag ein
  zweites Feld. Das ist eine Vereinsangabe im Repository — dieselbe Abweichung,
  die E-01 für die Stammliste bereits begründet und in `plan.md` unter
  Prinzip II vermerkt ist; sie wächst hier um ein Feld, nicht um eine neue Art
  von Daten. Eine Geheimhaltung verlangt die Nummer nicht: Sie benennt ein
  Vereinsflugzeug, kein Konto und keine Person.
- Der Verweis wird gebaut, nicht getippt: Ein Helfer im Kern erzeugt ihn aus
  Kennung und Zeitfenster, damit Datumsformat und Parameternamen an **einer**
  Stelle stehen (Prinzip IV). Fehlt die `frm_apid`, entfällt genau dieser
  Parameter, nicht der ganze Verweis.

FR-011 ist entsprechend zurückgedreht: Der Vorschlag wird angezeigt **und**
übertragen, soweit die Maske ihn annimmt. Gebucht wird weiterhin
ausschließlich in Vereinsflieger — die Vorbelegung füllt ein Formular vor, sie
sendet es nicht ab (Prinzip II bleibt gewahrt).

---

## E-14 — Kein Sperrgrund in der Anzeige

**Entscheidung**: Eine Sperre erscheint als „Sperre", nicht als „Sperre ·
Wartung".

**Begründung**: Der Grund steht im Freitext des Kalendereintrags. Freitext aus
Vereinsflieger ist genau der Ort, an dem Namen, Telefonnummern und
Schadensbeschreibungen stehen; ihn durchzureichen liefe FR-023 zuwider. Der
Kern gibt ihn deshalb gar nicht erst heraus — das Feld existiert in
`Reservierung` nicht (Feature 047).

---

## E-15 — Ringgeometrie fix, Ringfarbe echt

**Entscheidung**: Die Winkelabbildung des Tagesuhr-Rings bleibt fest an
21:00/06:00 verankert und ist datumsunabhängig. Die Einfärbung hell/dunkel
folgt dagegen den tatsächlichen Sonnenzeiten des angezeigten Tages. Beides
sind ab jetzt zwei getrennte Dinge.

**Woher der Konflikt kam**: Der Design-Handoff legt beides auf dieselbe Kante
— „Die Kanten des Nachtbandes **sind** die Sonnenzeiten — deshalb bewusst
keine zusätzlichen Marker auf derselben Naht" — und führt drei Zeilen später
doch Marker für Sonnenaufgang und Sonnenuntergang in seiner Markertabelle. Das
Dokument widerspricht sich selbst.

Die Erklärung liegt im Kalender: Für Hohn geht die Sonne am 18. August um
06:07 auf und um 20:45 unter. Der Prototyp entstand Mitte August, und dort
fielen Stauchungsgrenze und Sonnenzeiten zufällig zusammen. Was wie eine
Entwurfsentscheidung aussieht, ist der eingefrorene Sonnenstand des Bautags.

Ein halbes Jahr später fällt das auseinander, und zwar in beide Richtungen:

| Datum | Sonnenaufgang | Sonnenuntergang | Was ein fixes Farbband behauptet hätte |
|---|---|---|---|
| 18. August | 06:07 | 20:45 | passt zufällig |
| 21. Juni | 04:47 | 21:55 | 04:47–06:00 und 21:00–21:55 dunkel, obwohl hell — genau die Randstunden, in denen im Sommer geflogen wird |
| 21. Dezember | 08:44 | 15:57 | 06:00–08:44 und 15:57–21:00 hell, obwohl dunkel — über fünf Stunden zu viel |

Für eine Anzeige, an der „schaffe ich das noch vor Sonnenuntergang?" abgelesen
wird, ist der Winterfall die falsche Richtung des Irrtums.

**Warum nicht auch die Geometrie mitlaufen lassen**: Das wäre die reine Lehre
und würde den Handoff-Satz wörtlich wahr machen — die Marker wären dann
tatsächlich überflüssig. Es kostet aber genau die Eigenschaft, für die dieser
Ring gebaut wird: Wer ihn einmal gelesen hat, soll 15:00 im Dezember an
derselben Stelle finden wie im Juni. Eine Skala, die übers Jahr atmet, ist
nicht mehr lernbar. Außerdem würden `winkelFuerMinute` und `minuteFuerWinkel`
datumsabhängig, und die Zusicherungen T-01 bis T-05 ließen sich nicht mehr als
feste Zahlen prüfen.

**Warum das billig ist**: Die Stauchung ist eine reine Platzverteilung — die
stillen Stunden bekommen wenig Ring, der Flugtag viel. Sie hat mit Helligkeit
nichts zu tun und muss deshalb auch nicht auf derselben Kante liegen. Die
Änderung betrifft allein die Frage, welche Füllung eine 1°-Zelle bekommt;
`winkelFuerMinute` bleibt unangetastet.

**Nebenwirkung, die passt**: Die Sonnenmarker markieren jetzt eine echte
Farbkante statt einer bloßen Stauchungsnaht. Sie sind damit nicht mehr
redundant, sondern lesen die Kante vor — hilfreich, wenn die beiden Töne bei
Sonnenlicht auf dem Telefondisplay verschwimmen.

**Rückfall**: Ohne Sonnenzeiten (Wetterdienst nicht erreichbar, oder Phase 3
vor der Anbindung in Phase 5) liegt die Farbgrenze ersatzweise auf
21:00/06:00. Der Ring bleibt vollständig; nur seine Aussage über Helligkeit
wird ungenau (T-06a). Das ist zugleich der Grund, warum die Übersicht schon
vor der Open-Meteo-Anbindung vollständig funktioniert.

**Quelle**: bestätigt vom Auftraggeber am 18.08.2026 — „die tatsächlichen
Zeiten bleiben fix, sodass man als erfahrener User immer weiß, wo auf der
Zeitscheibe welche Uhrzeit ist, auch über die Jahreszeiten hinweg. Die Farbe
hingegen verrät gleich mit, wann Sonnenauf- und Untergang ist."
