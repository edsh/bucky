<script lang="ts">
  import {
    alsWochentagKurz,
    BALKEN_BIS,
    BALKEN_VON,
    ortstag,
    sonnenzeitenFuerTag,
    wochenbalken,
    zeitpunktFuerMinute,
    type Reservierung,
    type Sonnenzeiten
  } from '@edsh-bucky/reservierung-core';
  import Zeitbalken from './Zeitbalken.svelte';

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
    /** Der ganze Satz; jede Spalte holt sich ihren Tag daraus. */
    sonnenzeiten?: readonly Sonnenzeiten[] | null;
    /** Ein Tipp auf eine Spalte öffnet das Reservieren-Sheet (FR-024). */
    getippt?: (ereignis: { tag: string; minute: number | null }) => void;
  }

  const { kennung, belegungen, jetzt, sonnenzeiten = null, getippt }: Eigenschaften = $props();

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
      <div class="spalte">
        <div class="spur" class:heute={tag.tag === heute}>
          <Zeitbalken
            {kennung}
            {belegungen}
            tag={tag.tag}
            {jetzt}
            sonnenzeiten={sonnenzeitenFuerTag(sonnenzeiten, tag.tag)}
            richtung="senkrecht"
            radius={6}
            segmentradius={4}
            {getippt}
          />
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
    width: 100%;
    height: 210px;
  }

  /*
    Die heutige Spalte trägt einen kräftigeren Untergrund. Er steht hier und
    nicht in `Zeitbalken`, weil er nichts über die Zeit aussagt, sondern über
    die Ansicht: „diese Spalte ist die, auf der du stehst".
  */
  .spur.heute :global(.spur) {
    background: rgba(127, 127, 127, 0.22);
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
