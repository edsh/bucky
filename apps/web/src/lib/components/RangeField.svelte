<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { NumericRange } from '@edsh-bucky/deelk-poh-core';

  /**
   * Ein Schieberegler mit Wertanzeige (FR-001, FR-013).
   *
   * Die Komponente kennt keine fachlichen Grenzen und keine Vorgabewerte: Sie
   * reicht den Bereich unverändert durch, den der Rechenkern über
   * `getFuelPlanInputDomain()` bekanntgibt (Zusicherung C-05). Auch die
   * Schrittweite stammt von dort — sonst müsste die Oberfläche sie erfinden.
   *
   * Formatiert wird über den Kern, nicht hier (C-03).
   */
  let {
    id,
    label,
    range,
    value = $bindable(),
    format,
    neben,
    folge,
    bedient
  }: {
    id: string;
    label: string;
    range: NumericRange;
    value: number;
    format: (value: number) => string;
    /** Kleiner Zusatz neben der Beschriftung, etwa eine Schnellwahl. */
    neben?: Snippet;
    /** Zeile unter dem Regler, etwa eine daraus errechnete Größe. */
    folge?: Snippet;
    /**
     * Wird gerufen, wenn der Wert **von Hand** verstellt wurde. Feuert
     * bewusst nicht, wenn der Wert von außen gesetzt wird — nur so lässt sich
     * eine eigene Eingabe von einer übernommenen unterscheiden.
     */
    bedient?: () => void;
  } = $props();
</script>

<div class="regler">
  <span class="beschriftung">
    <label for={id}>{label}</label>
    {#if neben}<span class="neben">{@render neben()}</span>{/if}
  </span>

  <input
    {id}
    type="range"
    bind:value
    oninput={bedient}
    min={range.min}
    max={range.max}
    step={range.step}
    aria-describedby="{id}-wert"
  />

  <!--
    <output> ist das dafür vorgesehene Element und wird von Vorlesewerkzeugen
    als Ergebnisanzeige behandelt. Eine eigene Tastenbehandlung braucht der
    Regler nicht — die Pfeiltasten bedienen ihn von Haus aus (FR-013).
  -->
  <output id="{id}-wert" for={id}>{format(value)}</output>

  {#if folge}
    <p class="folge">{@render folge()}</p>
  {/if}
</div>

<style>
  .regler {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: baseline;
    gap: 0.25rem 0.75rem;
  }

  .beschriftung {
    grid-column: 1 / -1;
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }

  .neben {
    font-size: 0.8em;
  }

  /*
    Die abgeleitete Groesse steht unter dem Regler, der sie erzeugt — nicht
    erst im Ergebnisblock. Wer am Regler zieht, sieht die Wirkung dort, wo er
    hinschaut.
  */
  /* Ohne Inhalt kein Abstand: sonst klaffte unter dem Regler eine Lücke. */
  .folge:empty {
    display: none;
  }

  /*
    Jeder Zusatz in eine eigene Zeile: Unter der Temperatur stehen zwei --
    die ISA-Ableitung und der Herkunftsvermerk. Nebeneinander lasen sie sich
    seit der Alterswarnung (Feature 041) wie ein einziger langer Satz.
  */
  .folge :global(> *) {
    display: block;
  }

  .folge {
    grid-column: 1 / -1;
    margin: 0.1rem 0 0;
    font-size: 0.85em;
    color: #555;
  }

  input {
    width: 100%;
  }

  output {
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    white-space: nowrap;
  }
</style>
