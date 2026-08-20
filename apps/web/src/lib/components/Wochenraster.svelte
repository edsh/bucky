<script lang="ts">
  import {
    alsWochentagKurz,
    BALKEN_BIS,
    BALKEN_VON,
    jetztAnteil,
    ortstag,
    wochenbalken,
    zeitpunktFuerMinute,
    type Reservierung
  } from '@edsh-bucky/reservierung-core';
  import { flaecheFuer } from '$lib/flotte/farben.js';

  /**
   * Sieben Tage nebeneinander, die Zeit läuft nach unten.
   *
   * Dieselben sieben Tage wie die Liste daneben, nur um neunzig Grad
   * gedreht — beide holen sie aus derselben Funktion (`wochenbalken`). Wer
   * zwischen den beiden Ansichten umschaltet und zwei verschiedene Wochen
   * sähe, hätte den auffälligsten denkbaren Fehler vor sich.
   *
   * Was das Raster kann und die Liste nicht: Muster zeigen. Dass jeden
   * Samstagvormittag dieselbe Maschine belegt ist, sieht man erst, wenn die
   * Tage nebeneinander stehen.
   */
  interface Eigenschaften {
    kennung: string;
    belegungen: Reservierung[] | null;
    jetzt: Date;
  }

  const { kennung, belegungen, jetzt }: Eigenschaften = $props();

  const heute = $derived(ortstag(jetzt));

  const tage = $derived(belegungen === null ? [] : wochenbalken(belegungen, kennung, jetzt));

  /** Der Wochentagskopf braucht einen Zeitpunkt; die Tagesmitte ist der sichere. */
  function kopf(tag: string): string {
    return alsWochentagKurz(zeitpunktFuerMinute(tag, 12 * 60));
  }

  const achse = [6, 10, 14, 18, 22];

  /** Wo eine Stunde der Achse senkrecht steht — 0 = oben (06:00). */
  function achsenAnteil(stunde: number): number {
    return (stunde * 60 - BALKEN_VON) / (BALKEN_BIS - BALKEN_VON);
  }


  function alsProzent(anteil: number): string {
    return `${anteil * 100}%`;
  }
</script>

<div class="raster">
  <div class="achse">
    {#each achse as stunde (stunde)}
      <span style:top={alsProzent(achsenAnteil(stunde))}>{stunde}</span>
    {/each}
  </div>

  <div class="spalten">
    {#each tage as tag (tag.tag)}
      {@const linie = jetztAnteil(jetzt, tag.tag)}
      <div class="spalte">
        <div class="spur" class:heute={tag.tag === heute} data-tag={tag.tag}>
          {#each tag.segmente as segment, i (i)}
            <span
              class="segment"
              class:naht={segment.stoesstAn}
              style:top={alsProzent(segment.von)}
              style:height={alsProzent(segment.bis - segment.von)}
            >
              <span class="fuellung" style:background={flaecheFuer(segment.art)}></span>
            </span>
          {/each}

          {#if linie !== null}
            <span class="jetzt" style:top={alsProzent(linie)}></span>
          {/if}
        </div>
        <span class="label" class:istHeute={tag.tag === heute}>{kopf(tag.tag)}</span>
      </div>
    {/each}
  </div>
</div>

<style>
  .raster {
    display: flex;
    gap: 4px;
    margin-top: 14px;
  }

  .achse {
    position: relative;
    width: 30px;
    height: 210px;
    flex: none;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 10.5px;
    opacity: 0.45;
  }

  .achse span {
    position: absolute;
    right: 4px;
    /* Die Zahl soll auf der Höhe ihrer Stunde stehen, nicht darunter
       beginnen -- ohne diese halbe Zeilenhöhe zeigt „6" auf 06:20. */
    transform: translateY(-50%);
  }

  .spalten {
    display: flex;
    flex: 1;
    gap: 3px;
    min-width: 0;
  }

  .spalte {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
  }

  .spur {
    position: relative;
    width: 100%;
    height: 210px;
    border-radius: 6px;
    background: rgba(127, 127, 127, 0.14);
  }

  .spur.heute {
    background: rgba(127, 127, 127, 0.22);
  }

  .segment {
    position: absolute;
    left: 1px;
    right: 1px;
  }

  .fuellung {
    position: absolute;
    inset: 0;
    border-radius: 4px;
  }

  /* Hier läuft die Zeit von oben nach unten -- die Fuge entsprechend. */
  .segment.naht .fuellung {
    top: 2px;
  }

  .jetzt {
    position: absolute;
    left: -1px;
    right: -1px;
    height: 2px;
    margin-top: -1px;
    background: var(--text, currentColor);
    border-radius: 1px;
  }

  .label {
    font-size: 10.5px;
    font-weight: 600;
    opacity: 0.6;
  }

  .label.istHeute {
    opacity: 1;
  }
</style>
