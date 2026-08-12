<script lang="ts">
  import { type CalculationStep, unitText } from '@edsh-bucky/deelk-poh-core';

  /**
   * Stellt die Schrittfolge dar (FR-017). Reine Darstellung — die Werte kommen
   * fertig aus dem Kern, hier wird nichts gerechnet (Prinzip IV, C-03).
   */
  let { steps }: { steps: readonly CalculationStep[] } = $props();

  const zahl = (value: number): string =>
    value.toLocaleString('de-DE', { maximumFractionDigits: 4 });

  const mitEinheit = (value: number, unit: string): string => unitText(zahl(value), unit);
</script>

<details class="rechenweg">
  <summary>Rechenweg in {steps.length} Schritten</summary>

  <ol>
    {#each steps as step (step.id)}
      <li>
        <h4>{step.label}</h4>

        <p class="ergebnis">
          {#each Object.entries(step.results) as [key, quantity], index (key)}{index > 0
              ? ' · '
              : ''}{mitEinheit(quantity.value, quantity.unit)}{/each}
        </p>

        {#if Object.keys(step.inputs).length > 0}
          <p class="eingaben">
            aus
            {#each Object.entries(step.inputs) as [key, quantity], index (key)}{index > 0
                ? ', '
                : ''}{key} = {mitEinheit(quantity.value, quantity.unit)}{/each}
          </p>
        {/if}

        <p class="erklaerung">{step.explanation}</p>

        {#if step.anchors.length > 0}
          <table class="eckwerte">
            <caption>Abgelesene Tabellenwerte</caption>
            <tbody>
              {#each step.anchors as anchor, index (index)}
                <tr>
                  <th scope="row">
                    {Object.entries(anchor.at)
                      .map(([schluessel, wert]) => `${schluessel} ${zahl(wert)}`)
                      .join(' / ')}
                  </th>
                  <td>
                    {Object.entries(anchor.values)
                      .map(([schluessel, wert]) => `${schluessel} ${zahl(wert)}`)
                      .join(' · ')}
                  </td>
                  <td class="quelle">{anchor.source.figure}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        {/if}
      </li>
    {/each}
  </ol>
</details>

<style>
  .rechenweg {
    margin-top: 1.5rem;
  }

  summary {
    cursor: pointer;
    font-weight: 700;
  }

  ol {
    margin-top: 1rem;
  }

  li {
    margin-bottom: 1.25rem;
  }

  h4 {
    margin: 0;
  }

  .ergebnis {
    margin: 0.15rem 0;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .eingaben,
  .erklaerung {
    margin: 0.15rem 0;
    font-size: 0.9em;
    color: #444;
  }

  .eckwerte {
    margin-top: 0.4rem;
    border-collapse: collapse;
    font-size: 0.85em;
  }

  .eckwerte caption {
    text-align: left;
    color: #666;
  }

  .eckwerte th,
  .eckwerte td {
    text-align: left;
    padding: 0.15rem 0.6rem 0.15rem 0;
    font-weight: 400;
  }

  .quelle {
    color: #666;
  }
</style>
