<script lang="ts">
  import type { FuelPlanResult } from '@edsh-bucky/deelk-poh-core';
  import { formatLitres } from '@edsh-bucky/deelk-poh-core';
  import CalculationSteps from './CalculationSteps.svelte';
  import SourceCitations from './SourceCitations.svelte';

  /**
   * Reine Darstellung. Gerechnet und gerundet wird ausschließlich im Kern
   * (Constitution-Prinzip IV, Zusicherungen C-02 und C-03) — dieser Adapter
   * ruft nur dessen Formatierfunktionen auf.
   */
  let { result }: { result: FuelPlanResult } = $props();
</script>

<section class="ergebnis">
  <h2>Kraftstoffbedarf</h2>

  <table class="aufschluesselung">
    <tbody>
      <tr>
        <th scope="row">Anlassen, Rollen und Start</th>
        <td>{formatLitres(result.breakdown.taxiTakeoffL)}</td>
      </tr>
      <tr>
        <th scope="row">Steigflug</th>
        <td>{formatLitres(result.breakdown.climbL)}</td>
      </tr>
      <tr>
        <th scope="row">Reiseflug</th>
        <td>{formatLitres(result.breakdown.cruiseL)}</td>
      </tr>
      <tr class="summe">
        <th scope="row">Gesamt</th>
        <td>{formatLitres(result.breakdown.totalL)}</td>
      </tr>
    </tbody>
  </table>

  <p class="vergleich" class:warnung={result.exceedsUsableFuel}>
    {#if result.exceedsUsableFuel}
      Der Bedarf erreicht oder übersteigt die ausfliegbare Menge von
      {formatLitres(result.usableFuelL)}. Dieser Flug ist so nicht durchführbar.
    {:else}
      Ausfliegbar sind {formatLitres(result.usableFuelL)}. Rechnerisch bleiben
      {formatLitres(result.remainingFuelL)} übrig — das ist keine Reserve.
    {/if}
  </p>

  <h3>Hinweise</h3>
  <ul class="hinweise">
    {#each result.advisories as advisory (advisory.id)}
      <li>
        {advisory.text}
        {#if advisory.source}
          <span class="quelle">{advisory.source.figure}, Seite {advisory.source.pohPages.join(', ')}</span>
        {/if}
      </li>
    {/each}
  </ul>

  <SourceCitations sources={result.sources} preflightCheckNotice={result.preflightCheckNotice} />

  <CalculationSteps steps={result.steps} />
</section>

<style>
  .ergebnis {
    margin-top: 2rem;
  }

  .aufschluesselung {
    border-collapse: collapse;
    width: 100%;
    max-width: 32rem;
  }

  th,
  td {
    text-align: left;
    padding: 0.35rem 0.5rem;
    border-bottom: 1px solid #ddd;
  }

  td {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .summe th,
  .summe td {
    font-weight: 700;
    border-top: 2px solid #333;
  }

  .vergleich.warnung {
    color: #a00;
    font-weight: 700;
  }

  .hinweise li {
    margin-bottom: 0.5rem;
  }

  .quelle {
    display: block;
    font-size: 0.85em;
    color: #666;
  }
</style>
