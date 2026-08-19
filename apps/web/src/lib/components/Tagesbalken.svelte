<script lang="ts">
  import {
    alsTagesdatum,
    balkensegmente,
    BALKEN_BIS,
    BALKEN_VON,
    jetztAnteil,
    ortstag,
    tagesbelegungen,
    type Reservierung
  } from '@edsh-bucky/reservierung-core';
  import { flaecheFuer } from '$lib/flotte/farben.js';

  /**
   * Die Karte „Heute": ein maßstabsgetreuer Balken von 06:00 bis 22:00.
   *
   * Der Ring auf der Kachel zeigt den ganzen Tag und verzerrt ihn dafür; der
   * Balken macht es umgekehrt. Wer wissen will, *wann heute*, schaut auf den
   * Ring — wer wissen will, *wie lange genau*, auf den Balken. Deshalb
   * stehen beide auf derselben Seite, ohne einander zu wiederholen.
   *
   * Gerechnet wird hier nichts: Segmente, Jetzt-Linie und Zeiten kommen aus
   * dem Kern (Prinzip IV). Diese Datei macht daraus Prozentwerte und Farben,
   * mehr nicht.
   */
  interface Eigenschaften {
    kennung: string;
    /** `null` heißt „keine Auskunft" — nicht „nichts gebucht". */
    belegungen: Reservierung[] | null;
    jetzt: Date;
  }

  const { kennung, belegungen, jetzt }: Eigenschaften = $props();

  const tag = $derived(ortstag(jetzt));

  const segmente = $derived(
    belegungen === null ? [] : balkensegmente(belegungen, kennung, tag)
  );

  const linie = $derived(jetztAnteil(jetzt, tag));

  const zeiten = $derived(belegungen === null ? [] : tagesbelegungen(belegungen, kennung, tag));

  /**
   * Nur vier Beschriftungen für sechzehn Stunden. Eine Achse mit jeder
   * Stunde wäre auf 390 Pixeln unlesbar, und die Zahlen stünden dichter als
   * die Segmente, die sie erklären sollen.
   */
  const achse = [6, 10, 14, 18, 22];


  function alsProzent(anteil: number): string {
    return `${anteil * 100}%`;
  }
</script>

<section class="karte">
  <header>
    <h2>Heute</h2>
    <span class="datum">{alsTagesdatum(jetzt)}</span>
  </header>

  <div class="balken" data-fenster="{BALKEN_VON}-{BALKEN_BIS}">
    {#each segmente as segment, i (i)}
      <span
        class="segment"
        class:naht={segment.stoesstAn}
        style:left={alsProzent(segment.von)}
        style:width={alsProzent(segment.bis - segment.von)}
      >
        <span class="fuellung" style:background={flaecheFuer(segment.art)}></span>
      </span>
    {/each}

    {#if linie !== null}
      <span class="jetzt" style:left={alsProzent(linie)}></span>
    {/if}
  </div>

  <div class="achse">
    {#each achse as stunde (stunde)}
      <span>{stunde}</span>
    {/each}
  </div>

  {#if belegungen === null}
    <p class="chips stumm">Keine Auskunft über den heutigen Stand.</p>
  {:else if zeiten.length === 0}
    <p class="chips">Heute nichts eingetragen.</p>
  {:else}
    <p class="chips">
      {#each zeiten as zeit, i (i)}
        {#if i > 0}<span class="trenner"> · </span>{/if}<span class="zeit"
          >{zeit.vonUhr}–{zeit.bisUhr}</span
        >
      {/each}
    </p>
  {/if}
</section>

<style>
  .karte {
    margin: 22px 16px 0;
    padding: 16px 14px 12px;
    border-radius: 14px;
    background: rgba(127, 127, 127, 0.09);
  }

  header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  h2 {
    margin: 0;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.06em;
  }

  .datum {
    font-size: 11.5px;
    opacity: 0.5;
  }

  .balken {
    position: relative;
    height: 38px;
    border-radius: 8px;
    background: rgba(127, 127, 127, 0.16);
    overflow: visible;
  }

  .segment {
    position: absolute;
    top: 0;
    bottom: 0;
  }

  .fuellung {
    position: absolute;
    inset: 0;
    border-radius: 6px;
  }

  /*
    Zwei Reservierungen, die lückenlos aneinander anschließen, sind zwei
    Belegungen mit zwei Nutzern -- und sähen ohne diese Fuge wie eine aus.
    Die Füllung rückt zwei Pixel ein, sodass die Spur durchscheint; das
    Segment selbst behält seine wahre Breite, damit die Zeitachse stimmt.
  */
  .segment.naht .fuellung {
    left: 2px;
  }

  /*
    Die Jetzt-Linie steht oben und unten drei Pixel über. Das ist kein
    Schmuck: Ohne den Überstand verschwindet sie in einem Segment derselben
    Höhe, und ausgerechnet dann, wenn die Maschine gerade belegt ist -- also
    in dem Moment, in dem man sie am dringendsten sucht.
  */
  .jetzt {
    position: absolute;
    top: -3px;
    bottom: -3px;
    width: 2px;
    margin-left: -1px;
    background: var(--text, currentColor);
    border-radius: 1px;
  }

  .achse {
    display: flex;
    justify-content: space-between;
    margin-top: 6px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px;
    opacity: 0.45;
  }

  .chips {
    margin: 10px 0 0;
    font-size: 12px;
    line-height: 1.5;
    opacity: 0.7;
  }

  .chips.stumm {
    opacity: 0.5;
  }

  .zeit {
    font-weight: 650;
  }

  .trenner {
    opacity: 0.5;
  }
</style>
