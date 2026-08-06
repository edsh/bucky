<script lang="ts">
  import type { NumericRange } from '@edsh-bucky/deelk-poh-core';

  /**
   * Die Lasteinstellung als senkrechter Regler, der dem Leistungshebel im
   * Cockpit nachempfunden ist: oben viel Leistung, unten wenig.
   *
   * Grenzen und Schrittweite stammen aus `getFuelPlanInputDomain()`, nicht aus
   * dieser Datei (Zusicherung C-05). Die Schrittweite entspricht dem Raster der
   * Reiseleistungstabelle; Zwischenwerte gibt es dort nicht.
   *
   * Nicht jede Lasteinstellung ist in jeder Höhe verfügbar. Der Regler lässt
   * sie dennoch einstellen — die Prüfung gehört in den Kern, der die
   * verfügbaren Werte der jeweiligen Höhe kennt und sie in seiner Meldung
   * nennt. Die Oberfläche würde diese Auskunft sonst verdoppeln und könnte
   * dabei von ihr abweichen.
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

<div class="hebel">
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

  <output id="{id}-wert" for={id}>{format(value)}</output>
</div>

<style>
  .hebel {
    display: grid;
    justify-items: center;
    gap: 0.4rem;
    padding: 0 0.5rem;
  }

  label {
    font-size: 0.9em;
    text-align: center;
  }

  /*
    `writing-mode: vertical-lr` mit `direction: rtl` dreht den Regler so, dass
    der hoehere Wert oben liegt. Die Angabe `appearance: slider-vertical` ist
    veraltet und in aktuellen Browsern wirkungslos; sie steht deshalb nicht hier.
  */
  input {
    writing-mode: vertical-lr;
    direction: rtl;
    height: 9rem;
    width: 2rem;
  }

  output {
    font-variant-numeric: tabular-nums;
    font-weight: 700;
  }
</style>
