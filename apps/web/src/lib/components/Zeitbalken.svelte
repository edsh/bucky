<script lang="ts">
  import {
    BALKEN_BIS,
    BALKEN_VON,
    balkensegmente,
    jetztAnteil,
    nachtstops,
    type Balkensegment,
    type Reservierung,
    type Sonnenzeiten,
    type Zeitwahlfenster
  } from '@edsh-bucky/reservierung-core';
  import { flaecheFuer, FREIE_FLAECHE, OHNE_AUSKUNFT } from '$lib/flotte/farben.js';

  /**
   * Der Balken, den es viermal gibt.
   *
   * Tagesbalken „Heute", Tageszeile der Sieben-Tage-Liste, Wochenspalte und
   * Sheet-Balken sind dieselbe Sache in vier Größen und zwei Richtungen: eine
   * Zeitachse von 06:00 bis 22:00, auf der Nacht, Belegungen, Vergangenheit,
   * eine Auswahl und der Jetzt-Zeitpunkt übereinanderliegen.
   *
   * Sie stehen deshalb in **einer** Datei und nicht in vier. Der Grund ist
   * nicht Sparsamkeit, sondern die Ebenenfolge: freie Zeit unter der Nacht,
   * Nacht unter den Segmenten, Segmente unter dem Schleier, Schleier unter der
   * Auswahl, Auswahl unter der Nadel. Vierfach gepflegt liefe sie
   * auseinander — und dann behauptete die Wochenansicht etwas anderes über
   * denselben Tag als die Tagesansicht.
   *
   * Gerechnet wird auch hier nichts: Segmente, Jetzt-Anteil und Nacht-Stops
   * kommen aus dem Kern (Prinzip IV). Diese Datei macht daraus Prozentwerte,
   * Farben und — als Einziges — aus einer Zeigerposition eine Minute.
   */
  interface Eigenschaften {
    kennung: string;
    /** `null` heißt „keine Auskunft" — nicht „nichts gebucht". */
    belegungen: Reservierung[] | null;
    /** Ortstag, den dieser Balken zeigt. */
    tag: string;
    jetzt: Date;
    /** Fehlen sie, entfällt die Nachttönung — geschätzt wird nichts (SC-009). */
    sonnenzeiten?: Sonnenzeiten | null;
    /** Waagerecht (Tag, Zeile, Sheet) oder senkrecht (Wochenspalte). */
    richtung?: 'waagerecht' | 'senkrecht';
    /** Der Auswahlblock — nur im Sheet. */
    auswahl?: Zeitwahlfenster | null;
    /** Radius des Balkens; die Nachttönung übernimmt ihn. */
    radius?: number;
    /** Radius der Segmente darin. */
    segmentradius?: number;
    /**
     * Meldung eines Tipps nach oben. `minute` ist `null`, wenn der Tipp keinen
     * Ort hatte (Tastatur) oder außerhalb des Balkens landete.
     */
    getippt?: (ereignis: { tag: string; minute: number | null }) => void;
    /**
     * Beginn einer Zieh-Geste auf dem Auswahlblock oder einem seiner Griffe.
     *
     * `minuteBei` reicht die Umrechnung mit nach oben. Die Geste selbst gehört
     * ins Sheet — dort stehen die Regeln, welche Kante stehen bleibt und wo ein
     * Block stoppt —, aber sie hört ab dem Loslassen am Fenster zu und bekommt
     * dort Zeigerpositionen statt Minuten. Ohne diese Mitgabe müsste das Sheet
     * die Abbildung Position → Minute ein zweites Mal hinschreiben, und genau
     * das soll B-05 verhindern.
     */
    gegriffen?: (
      art: 'start' | 'ende' | 'block',
      minute: number,
      minuteBei: (ereignis: PointerEvent) => number
    ) => void;
  }

  const {
    kennung,
    belegungen,
    tag,
    jetzt,
    sonnenzeiten = null,
    richtung = 'waagerecht',
    auswahl = null,
    radius = 8,
    segmentradius = 6,
    getippt,
    gegriffen
  }: Eigenschaften = $props();

  const senkrecht = $derived(richtung === 'senkrecht');
  const BREITE = BALKEN_BIS - BALKEN_VON;

  const segmente = $derived<Balkensegment[]>(
    belegungen === null ? [] : balkensegmente(belegungen, kennung, tag)
  );

  /**
   * Der Untergrund **ist** die Aussage „frei".
   *
   * Belegungen liegen als Segmente darüber; was durchscheint, ist unbelegte
   * Zeit. Deshalb braucht es keine eigene Lücken-Ebene mehr — sie zeichnete
   * dieselben Pixel ein zweites Mal, und zwar nur im Sheet, was denselben
   * Zustand an zwei Orten verschieden aussehen ließ.
   *
   * Ohne Reservierungsstand bleibt der Balken grau: Grün hieße dort „alles
   * frei", und das wüsste niemand.
   */
  const untergrund = $derived(belegungen === null ? OHNE_AUSKUNFT : FREIE_FLAECHE);

  const nadel = $derived(jetztAnteil(jetzt, tag));

  const stops = $derived(nachtstops(sonnenzeiten));

  /**
   * Der Verlauf der Nachttönung.
   *
   * Der Kern liefert Anteile, hier werden Prozente und die Farbe daraus. Die
   * Farbe ist in Hell und Dunkel **dieselbe**: Nacht soll in beiden
   * Darstellungen als Nacht lesbar sein, und ein Ton, der mit dem Farbschema
   * wechselt, wäre im hellen Schema irgendwann keine Nacht mehr.
   */
  const NACHT = 'rgba(9,15,33,.62)';

  const nachtverlauf = $derived.by(() => {
    if (stops === null) return null;
    if (stops.morgens === null && stops.abends === null) return null;

    const teile: string[] = [];
    if (stops.morgens) {
      teile.push(
        `${NACHT} 0`,
        `${NACHT} ${prozent(stops.morgens.sonne)}`,
        `transparent ${prozent(stops.morgens.klar)}`
      );
    } else {
      teile.push('transparent 0');
    }

    if (stops.abends) {
      teile.push(
        `transparent ${prozent(stops.abends.klar)}`,
        `${NACHT} ${prozent(stops.abends.sonne)}`,
        `${NACHT} 100%`
      );
    } else {
      teile.push('transparent 100%');
    }

    return `linear-gradient(${senkrecht ? 180 : 90}deg, ${teile.join(', ')})`;
  });

  /**
   * Wie weit die Vergangenheit reicht — nur am heutigen Tag.
   *
   * Sie ist kein Segment, sondern ein Schleier über allem darunter: Was
   * vorbei ist, bleibt sichtbar, tritt aber zurück.
   */
  const vergangen = $derived(nadel);

  function prozent(anteil: number): string {
    return `${anteil * 100}%`;
  }

  /**
   * Zeigerposition → Minute des Tages.
   *
   * Die einzige Rechnung in dieser Datei, und sie steht hier, weil ihre
   * Eingabe ein `DOMRect` ist — eine Größe, die der Kern nicht kennen darf.
   * Was sie tut, ist eine lineare Abbildung ohne Fachlogik; jede Rundung und
   * jede Regel darüber liegt in `zeitwahl.ts`.
   */
  function minuteAus(punkt: number, rechteck: DOMRect): number {
    const anteil = senkrecht
      ? (punkt - rechteck.top) / rechteck.height
      : (punkt - rechteck.left) / rechteck.width;
    return BALKEN_VON + Math.min(1, Math.max(0, anteil)) * BREITE;
  }

  /** Ob der Punkt überhaupt auf dem Balken liegt. */
  function trifft(punkt: number, rechteck: DOMRect): boolean {
    const von = senkrecht ? rechteck.top : rechteck.left;
    const bis = senkrecht ? rechteck.bottom : rechteck.right;
    return punkt >= von && punkt <= bis;
  }

  let spur = $state<HTMLElement | null>(null);

  /**
   * Ein Tipp meldet Tag und Uhrzeit — oder Tag und `null`.
   *
   * `null` bei Tastaturbedienung ist wichtig: `detail === 0` heißt, dass es
   * keinen Ort gibt, und `clientX` wäre dann 0 — also 06:00. Ein Zeitwähler,
   * der bei Enter stumm auf „sechs Uhr früh" springt, ist kaputt.
   */
  function beiTipp(ereignis: MouseEvent) {
    if (!getippt) return;

    if (ereignis.detail === 0 || spur === null) {
      getippt({ tag, minute: null });
      return;
    }

    const rechteck = spur.getBoundingClientRect();
    const punkt = senkrecht ? ereignis.clientY : ereignis.clientX;
    getippt({ tag, minute: trifft(punkt, rechteck) ? minuteAus(punkt, rechteck) : null });
  }

  /**
   * Die Zeigerposition eines Ereignisses als Tagesminute.
   *
   * Das Rechteck wird bei **jedem** Aufruf neu gemessen, nicht einmal beim
   * Griff: Zwischen zwei Bewegungen kann das Sheet gescrollt oder das Gerät
   * gedreht worden sein, und ein gemerktes Rechteck ließe den Block dann
   * neben dem Finger herlaufen.
   */
  function minuteBei(ereignis: PointerEvent): number {
    if (spur === null) return BALKEN_VON;
    const punkt = senkrecht ? ereignis.clientY : ereignis.clientX;
    return minuteAus(punkt, spur.getBoundingClientRect());
  }

  function beiGriff(ereignis: PointerEvent, art: 'start' | 'ende' | 'block') {
    if (!gegriffen || spur === null) return;
    ereignis.preventDefault();
    ereignis.stopPropagation();
    gegriffen(art, minuteBei(ereignis), minuteBei);
  }

  /** Anteil einer Tagesminute am dargestellten Fenster. */
  function anteil(minute: number): number {
    return (minute - BALKEN_VON) / BREITE;
  }
</script>

<!--
  Die ganze Zeile hört zu, der Balken darin bestimmt nur die Uhrzeit. Deshalb
  liegt der Klickhandler außen und die Messung an `.spur`.
-->
<!--
  Rolle und `tabindex` hängen beide an derselben Bedingung: Ohne `getippt` ist
  der Balken eine Zeichnung und bekommt weder das eine noch das andere. Der
  Prüfer kann das zur Übersetzungszeit nicht sehen und nimmt den schlechteren
  der beiden Fälle an.
-->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  class="spur"
  class:senkrecht
  bind:this={spur}
  style:border-radius="{radius}px"
  style:background={untergrund}
  onclick={beiTipp}
  role={getippt ? 'button' : 'presentation'}
  tabindex={getippt ? 0 : undefined}
  onkeydown={getippt
    ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          getippt({ tag, minute: null });
        }
      }
    : undefined}
>
  <!-- Ebene 0: Nacht. Ohne Sonnenzeiten gibt es sie gar nicht. -->
  {#if nachtverlauf}
    <span
      class="nacht"
      aria-hidden="true"
      style:background={nachtverlauf}
      style:border-radius="{radius}px"
    ></span>
  {/if}

  <!-- Ebene 2: Belegungen. Was sie freilassen, ist die freie Zeit. -->
  {#each segmente as segment, i (i)}
    <span
      class="segment"
      class:naht={segment.stoesstAn}
      style:--von={prozent(segment.von)}
      style:--groesse={prozent(segment.bis - segment.von)}
    >
      <span
        class="fuellung"
        style:background={flaecheFuer(segment.art)}
        style:border-radius="{segmentradius}px"
      ></span>
    </span>
  {/each}

  <!-- Ebene 2: der Schleier über allem Vergangenen. -->
  {#if vergangen !== null && vergangen > 0}
    <span class="schleier" aria-hidden="true" style:--groesse={prozent(vergangen)}></span>
  {/if}

  <!-- Ebene 3: der Auswahlblock (nur im Sheet). -->
  {#if auswahl}
    <span
      class="auswahl"
      style:--von={prozent(anteil(auswahl.von))}
      style:--groesse={prozent(anteil(auswahl.bis) - anteil(auswahl.von))}
      onpointerdown={(e) => beiGriff(e, 'block')}
      role="presentation"
    >
      <span class="griff anfang" onpointerdown={(e) => beiGriff(e, 'start')} role="presentation">
        <span class="strich"></span>
      </span>
      <span class="griff ende" onpointerdown={(e) => beiGriff(e, 'ende')} role="presentation">
        <span class="strich"></span>
      </span>
    </span>
  {/if}

  <!-- Ebene 4: die Jetzt-Nadel, mit Überstand. -->
  {#if nadel !== null}
    <span class="jetzt" aria-hidden="true" style:--von={prozent(nadel)}></span>
  {/if}
</div>

<style>
  /*
    Kein `overflow: hidden` — die Nadel ragt oben und unten hinaus, und der
    Balken darf sie nicht abschneiden. Die Segmente runden sich deshalb selbst.
  */
  .spur {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: visible;
    border: 0;
    padding: 0;
    cursor: inherit;
  }

  .spur[role='button'] {
    cursor: pointer;
  }

  .nacht {
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
  }

  .segment {
    position: absolute;
    z-index: 2;
  }

  .fuellung {
    position: absolute;
    inset: 0;
  }

  /*
    Zwei Reservierungen, die lückenlos aneinander anschließen, sind zwei
    Belegungen mit zwei Nutzern — und sähen ohne diese Fuge wie eine aus.
  */
  .segment.naht .fuellung {
    inset-inline-start: 2px;
  }

  /*
    Der Schleier beginnt links (bzw. oben) und rundet deshalb nur dort: Sein
    anderes Ende ist eine Schnittkante mitten im Balken, keine Ecke.
  */
  .schleier {
    position: absolute;
    z-index: 2;
    background: var(--balken, rgba(255, 255, 255, 0.58));
    pointer-events: none;
  }

  .auswahl {
    position: absolute;
    z-index: 3;
    background: #1f4e79;
    border-radius: 7px;
    cursor: grab;
    touch-action: none;
  }

  /*
    Die Trefferfläche misst mindestens 44 Pixel (FR-017), der sichtbare Strich
    darin 4×22. Ein Griff, den man am Flugplatz im Stehen dreimal antippen
    muss, ist kein Griff.
  */
  .griff {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    touch-action: none;
  }

  .strich {
    background: rgba(255, 255, 255, 0.9);
    border-radius: 2px;
  }

  /*
    Die Nadel: eine Haarlinie aus Strichen, mit fünf Pixeln Überstand. Ohne ihn
    verschwände sie in einem Segment derselben Höhe — ausgerechnet dann, wenn
    die Maschine gerade belegt ist und man sie am dringendsten sucht.
  */
  .jetzt {
    position: absolute;
    z-index: 4;
    pointer-events: none;
  }

  /* ---------- waagerecht: die Zeit läuft nach rechts ---------- */

  .spur:not(.senkrecht) .segment,
  .spur:not(.senkrecht) .auswahl {
    top: 0;
    bottom: 0;
    left: var(--von);
    width: var(--groesse);
  }

  .spur:not(.senkrecht) .schleier {
    top: 0;
    bottom: 0;
    left: 0;
    width: var(--groesse);
    border-radius: 8px 0 0 8px;
  }

  .spur:not(.senkrecht) .griff {
    top: -6px;
    bottom: -6px;
    width: 30px;
    cursor: ew-resize;
  }

  .spur:not(.senkrecht) .griff.anfang {
    left: -10px;
  }

  .spur:not(.senkrecht) .griff.ende {
    right: -10px;
  }

  .spur:not(.senkrecht) .strich {
    width: 4px;
    height: 22px;
  }

  .spur:not(.senkrecht) .jetzt {
    top: -5px;
    bottom: -5px;
    left: var(--von);
    width: 1px;
    margin-left: -0.5px;
    background: linear-gradient(to bottom, var(--text, currentColor) 0 3px, transparent 3px 6px);
    background-size: 1px 6px;
    background-repeat: repeat-y;
  }

  /* ---------- senkrecht: die Zeit läuft nach unten ---------- */

  .spur.senkrecht .segment,
  .spur.senkrecht .auswahl {
    left: 1px;
    right: 1px;
    top: var(--von);
    height: var(--groesse);
  }

  .spur.senkrecht .segment.naht .fuellung {
    inset-inline-start: 0;
    top: 2px;
  }

  .spur.senkrecht .schleier {
    left: 0;
    right: 0;
    top: 0;
    height: var(--groesse);
    border-radius: 6px 6px 0 0;
  }

  .spur.senkrecht .griff {
    left: -6px;
    right: -6px;
    height: 30px;
    cursor: ns-resize;
  }

  .spur.senkrecht .griff.anfang {
    top: -10px;
  }

  .spur.senkrecht .griff.ende {
    bottom: -10px;
  }

  .spur.senkrecht .strich {
    width: 22px;
    height: 4px;
  }

  .spur.senkrecht .jetzt {
    left: -5px;
    right: -5px;
    top: var(--von);
    height: 1px;
    margin-top: -0.5px;
    background: linear-gradient(to right, var(--text, currentColor) 0 3px, transparent 3px 6px);
    background-size: 6px 1px;
    background-repeat: repeat-x;
  }
</style>
