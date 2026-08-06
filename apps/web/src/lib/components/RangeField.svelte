<script lang="ts">
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
    format
  }: {
    id: string;
    label: string;
    range: NumericRange;
    value: number;
    format: (value: number) => string;
  } = $props();
</script>

<div class="regler">
  <label for={id}>{label}</label>

  <input
    {id}
    type="range"
    bind:value
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
</div>

<style>
  .regler {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: baseline;
    gap: 0.25rem 0.75rem;
  }

  label {
    grid-column: 1 / -1;
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
