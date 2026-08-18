# Vertrag: Tagesuhr-Ring (`tagesuhr.ts`)

**Feature**: 054 · **Modul**: `packages/reservierung-core/src/tagesuhr.ts`

Die Umrechnung von Ortszeit in Ringwinkel und die daraus gebildeten Segmente.
Verbindliche Quelle ist der Abschnitt „Tagesuhr-Ring" des Design-Handoffs; er
verlangt ausdrücklich pixelgenauen Nachbau. Dieses Modul ist die Stelle, an
der sich das prüfen lässt (E-04).

## Zwei Dinge, die nicht dasselbe sind

Dieses Modul trennt streng zwischen **Geometrie** und **Farbe**:

- Die **Winkelabbildung** ist fest und datumsunabhängig. Sie verteilt nur
  Platz: die stillen Nachtstunden bekommen wenig, der Flugtag viel. Wer den
  Ring einmal gelesen hat, findet 15:00 im Dezember an derselben Stelle wie
  im Juni.
- Die **Zellfarbe** folgt den **tatsächlichen** Sonnenzeiten des Tages. Sie
  erzählt die Jahreszeit.

Ein früherer Entwurf ließ beides auf derselben Kante zusammenfallen (21:00 und
06:00 waren zugleich Stauchungsgrenze *und* Farbgrenze). Das stimmte nur
deshalb, weil der Prototyp Mitte August entstand — da geht die Sonne in Hohn
um 06:07 auf und um 20:45 unter. Im Dezember hätte derselbe Ring über fünf
Stunden Tageslicht behauptet, die es nicht gibt, im Juni die hellen Rand­stunden
verschwiegen, in denen tatsächlich geflogen wird. Für eine Anzeige, an der
„passt das noch vor Sonnenuntergang?" abgelesen wird, ist beides untragbar.

## Winkelabbildung (fest, datumsunabhängig)

0° liegt **oben**, gezählt wird im **Uhrzeigersinn**. Grundlage ist die Minute
seit Ortsmitternacht (0 … 1439).

| Zeitraum | Minuten | Winkel |
|---|---|---|
| Gestauchte Zone 21:00 → 06:00 | 1260 … 1440, 0 … 360 (540 Min.) | 135° → 225° |
| Gedehnte Zone 06:00 → 21:00 | 360 … 1260 (900 Min.) | 225° → 495°, also mod 360 über 0° hinweg bis 135° |

```text
winkel(m) =
  Nacht:  135 + (((m - 1260) mod 1440) / 540) * 90
  Tag:    (225 + ((m - 360) / 900) * 270) mod 360
```

## Zusicherungen

| Nr. | Zusicherung |
|---|---|
| T-01 | `winkelFuerMinute(1260) === 135` (21:00) und `winkelFuerMinute(360) === 225` (06:00) — die beiden Nahtstellen sitzen exakt. |
| T-02 | `winkelFuerMinute(0) === 165` — Mitternacht liegt mitten im Nachtband, nicht oben. Das ist die Falle dieses Rings: Wer 0 Uhr auf 0° legt, dreht den halben Tag falsch herum. |
| T-03 | Die Abbildung ist auf [0, 1440) **streng monoton im Uhrzeigersinn** und stetig an beiden Nähten. |
| T-04 | `minuteFuerWinkel` ist die Umkehrung von `winkelFuerMinute` auf Minutengenauigkeit. |
| T-05 | Die gelieferten Segmente decken die vollen 360° **lückenlos und überschneidungsfrei** ab. Eine Lücke wäre ein durchsichtiger Keil im Ring — sichtbar als Fehler, aber erst spät. |
| T-06 | Die **Winkelabbildung** bleibt fix an 21:00/06:00 verankert, unabhängig von den Sonnenzeiten und vom Datum: `winkelFuerMinute` nimmt keine Sonnenzeiten entgegen. Die **Farbe** dagegen wechselt an den tatsächlichen Sonnenzeiten des Tages — eine Zelle ist `nacht`, wenn ihre Uhrzeit vor Sonnenaufgang oder nach Sonnenuntergang liegt (FR-004). |
| T-06a | Fehlen die Sonnenzeiten, fällt allein die Farbgrenze auf 21:00/06:00 zurück (E-08). Der Ring bleibt vollständig und behält seine Form; nur seine Aussage über Helligkeit wird ungenau. Ein ausgefallener Wetterdienst darf nie eine Lücke im Ring erzeugen. |
| T-06b | Im Juni liegt die Farbgrenze in der gestauchten Zone (Sonnenaufgang ~04:47), im Dezember in der gedehnten (~08:44). Beides MUSS geprüft werden — die Farbgrenze darf keine der beiden Zonen als Ganzes einfärben. |
| T-07 | Bei Überschneidung gewinnt `sperre` über `reservierung`, `reservierung` über `nacht`/`frei` (Grenzfall der Spec). |
| T-08 | Ohne jede Belegung besteht der Ring aus genau zwei Segmenten: `nacht` und `frei`. Deren Naht liegt bei den Sonnenzeiten des Tages — bei fehlenden Sonnenzeiten bei 135°/225° (T-06a). |
| T-09 | Die Segmente werden auf 1°-Zellen gebildet und gleichfarbige Nachbarn zusammengefasst (Handoff). Damit ist die Zahl der Segmente durch 360 begrenzt und der Rundungsfehler auf ein Grad. |
| T-10 | Der Bezugszeitpunkt wird **übergeben**, nie im Modul geholt (Feature 047, E-09) — sonst ließen sich Zeitumstellung und Tageswechsel nicht prüfen. |
| T-11 | Alle Tagesgrenzen werden in `Europe/Berlin` gebildet, nie in der Zone des Geräts. Ein Telefon in einer anderen Zeitzone zeigt denselben Ring. |

## Marker

| Marker | Winkel aus |
|---|---|
| Sonnenaufgang | `Sonnenzeiten.aufgang` des angezeigten Ortstages |
| Sonnenuntergang | `Sonnenzeiten.untergang` desselben Tages |
| Jetzt | Bezugszeitpunkt |

Fehlen die Sonnenzeiten, liefert das Modul für diese beiden `null` (T-12) —
und der Ring bleibt im Übrigen vollständig (T-06a).

Die Marker sitzen damit **genau auf der Farbkante**. Das ist gewollt und der
Grund, warum sie überhaupt tragen: Sie benennen die Kante, die man ohnehin
sieht, und machen sie auf einen Blick ablesbar, auch wenn die beiden Grüntöne
im hellen Sonnenlicht auf dem Telefon verschwimmen. Der Handoff hielt die
Marker für redundant („keine zusätzlichen Marker auf derselben Naht") und
führte sie zugleich in seiner Markertabelle — dieser Widerspruch löst sich
hier zugunsten der Marker auf.

## Was dieses Modul nicht tut

Es erzeugt **kein CSS**. Weder `conic-gradient(...)` noch Farbwerte noch
Strichmaße — die stehen im Handoff als Gestaltungstoken und gehören in die
Svelte-Bauteile. Das Modul liefert Zahlen und Namen; die Übersetzung in
Aussehen ist Sache des Zugangswegs (Prinzip IV).
