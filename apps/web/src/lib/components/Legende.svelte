<script lang="ts">
  import { FARBEN } from '$lib/flotte/farben.js';

  /**
   * Die Legende zu den Statusfarben.
   *
   * Aus der Übersicht herausgelöst, weil sie an zwei Stellen stehen kann:
   * neben einer kurzen Favoritenreihe oder als eigene Zeile. Zwei Fassungen
   * desselben Markups liefen unweigerlich auseinander — und eine Legende, die
   * je nach Ort etwas anderes erklärt, wäre schlimmer als keine.
   *
   * Der dunkle Nachtanteil des Rings steht bewusst **nicht** dabei: Er ist
   * keine Verfügbarkeitsaussage, sondern Beiwerk zur Orientierung auf der Uhr
   * — in einer Legende, die sonst nur Status erklärt, sähe er wie ein vierter
   * Status aus.
   */
  let { spaltig = false }: { spaltig?: boolean } = $props();

  const eintraege = [
    { farbe: FARBEN.frei, text: 'frei' },
    { farbe: FARBEN.belegt, text: 'belegt' },
    { farbe: FARBEN.sperreFlaeche, text: 'gesperrt' }
  ];
</script>

<div class="legende" class:spaltig>
  {#each eintraege as eintrag (eintrag.text)}
    <span class="eintrag">
      <span class="punkt" style:background={eintrag.farbe}></span>
      {eintrag.text}
    </span>
  {/each}
</div>

<style>
  .legende {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 14px;
    padding: 10px 12px;
    border-radius: 10px;
    background: rgba(127, 127, 127, 0.09);
  }

  /* Neben einer kurzen Favoritenreihe steht sie hochkant: Dort ist die Reihe
     hoch und schmal, und drei Einträge nebeneinander passten nicht mehr in
     den verbleibenden Streifen. */
  .legende.spaltig {
    flex-direction: column;
    gap: 7px;
  }

  .eintrag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11.5px;
    opacity: 0.75;
  }

  .punkt {
    width: 11px;
    height: 11px;
    border-radius: 50%;
    flex: none;
  }
</style>
