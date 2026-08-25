<script lang="ts">
  import {
    alsTagesdatum,
    ortstag,
    tagesbelegungen,
    type Reservierung,
    type Sonnenzeiten
  } from '@edsh-bucky/reservierung-core';
  import Zeitbalken from './Zeitbalken.svelte';

  /**
   * Die Karte „Heute": ein maßstabsgetreuer Balken von 06:00 bis 22:00.
   *
   * Der Ring auf der Kachel zeigt den ganzen Tag und verzerrt ihn dafür; der
   * Balken macht es umgekehrt. Wer wissen will, *wann heute*, schaut auf den
   * Ring — wer wissen will, *wie lange genau*, auf den Balken. Deshalb
   * stehen beide auf derselben Seite, ohne einander zu wiederholen.
   *
   * Gerechnet wird hier nichts: Segmente, Nacht, Nadel und Zeiten kommen aus
   * dem Kern (Prinzip IV) und werden von `Zeitbalken` gezeichnet. Diese Datei
   * ist nur noch die Karte drumherum — Überschrift, Achse, Chipzeile.
   */
  interface Eigenschaften {
    kennung: string;
    /** `null` heißt „keine Auskunft" — nicht „nichts gebucht". */
    belegungen: Reservierung[] | null;
    jetzt: Date;
    /** Fehlen sie, bleibt der Balken ohne Nachttönung (SC-009). */
    sonnenzeiten?: Sonnenzeiten | null;
    /** Ein Tipp auf den Balken öffnet das Reservieren-Sheet (FR-024). */
    getippt?: (ereignis: { tag: string; minute: number | null }) => void;
  }

  const { kennung, belegungen, jetzt, sonnenzeiten = null, getippt }: Eigenschaften = $props();

  const tag = $derived(ortstag(jetzt));

  const zeiten = $derived(belegungen === null ? [] : tagesbelegungen(belegungen, kennung, tag));

  /**
   * Nur vier Beschriftungen für sechzehn Stunden. Eine Achse mit jeder
   * Stunde wäre auf 390 Pixeln unlesbar, und die Zahlen stünden dichter als
   * die Segmente, die sie erklären sollen.
   */
  const achse = [6, 10, 14, 18, 22];
</script>

<section class="karte">
  <header>
    <h2>Heute</h2>
    <span class="datum">{alsTagesdatum(jetzt)}</span>
  </header>

  <div class="balken">
    <Zeitbalken {kennung} {belegungen} {tag} {jetzt} {sonnenzeiten} {getippt} />
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

  /*
    Die Höhe steht hier, das Innenleben in `Zeitbalken`. Der Rahmen hat keinen
    `overflow: hidden` -- die Jetzt-Nadel ragt fünf Pixel über den Balken
    hinaus und darf nicht abgeschnitten werden.
  */
  .balken {
    height: 38px;
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
