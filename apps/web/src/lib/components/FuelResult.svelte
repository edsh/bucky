<script lang="ts">
  import type { FuelPlanResult } from '@edsh-bucky/deelk-poh-core';
  import { formatLitres } from '@edsh-bucky/deelk-poh-core';

  /**
   * Reine Darstellung. Gerechnet und gerundet wird ausschließlich im Kern
   * (Constitution-Prinzip IV, Zusicherungen C-02 und C-03) — dieser Adapter
   * ruft nur dessen Formatierfunktionen auf.
   */
  let { result }: { result: FuelPlanResult } = $props();

  const zahl = (value: number): string =>
    value.toLocaleString('de-DE', { maximumFractionDigits: 4 });
</script>

<section class="ergebnis">
  <h2>Kraftstoffbedarf</h2>

  <table>
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
          <span class="quelle">{advisory.source.citation}</span>
        {/if}
      </li>
    {/each}
  </ul>

  <h3>Rechenweg</h3>
  <ol class="schritte">
    {#each result.steps as step (step.id)}
      <li>
        <strong>{step.label}</strong>
        <span class="werte">
          {#each Object.entries(step.results) as [key, quantity], index (key)}
            {index > 0 ? ' · ' : ''}{zahl(quantity.value)}{quantity.unit ? ` ${quantity.unit}` : ''}
          {/each}
        </span>
        <p class="erklaerung">{step.explanation}</p>
        {#if step.anchors.length > 0}
          <p class="eckwerte">
            Verwendete Tabellenwerte:
            {#each step.anchors as anchor, index (index)}
              {index > 0 ? ' und ' : ''}{Object.entries(anchor.at)
                .map(([schluessel, wert]) => `${schluessel} ${zahl(wert)}`)
                .join(', ')}
            {/each}
          </p>
        {/if}
      </li>
    {/each}
  </ol>

  <h3>Quellen</h3>
  <ul class="quellen">
    {#each result.sources as source (source.tableId)}
      <li>{source.citation}</li>
    {/each}
  </ul>

  <p class="pruefhinweis">{result.preflightCheckNotice}</p>
</section>

<style>
  .ergebnis {
    margin-top: 2rem;
  }

  table {
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

  .pruefhinweis {
    margin-top: 1.5rem;
    padding: 0.75rem;
    border: 2px solid #a00;
    font-weight: 700;
  }

  .quelle,
  .eckwerte,
  .erklaerung {
    display: block;
    font-size: 0.9em;
    color: #444;
  }

  .werte {
    font-variant-numeric: tabular-nums;
  }

  .schritte li {
    margin-bottom: 0.75rem;
  }
</style>
