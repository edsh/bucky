<script lang="ts">
  import type { FuelPlanResult } from '@edsh-bucky/deelk-poh-core';
  import { formatFeet, formatFuel, formatHectopascal } from '@edsh-bucky/deelk-poh-core';
  import CalculationSteps from './CalculationSteps.svelte';
  import SourceCitations from './SourceCitations.svelte';

  /**
   * Reine Darstellung. Gerechnet und gerundet wird ausschließlich im Kern
   * (Constitution-Prinzip IV, Zusicherungen C-02 und C-03) — dieser Adapter
   * ruft nur dessen Formatierfunktionen auf.
   */
  let { result }: { result: FuelPlanResult } = $props();

  /**
   * Zu jeder Höhe erscheinen beide Werte (FR-007, SC-005) und der Abstand zur
   * Faustformel (FR-009) — wer im Kopf mit 30 ft/hPa überschlägt, erhält eine
   * andere Zahl und soll das nicht für einen Fehler halten.
   */
  const hoehen = $derived([
    { name: 'Startplatz', wert: result.pressureAltitudes.departure },
    { name: 'Reiseflug', wert: result.pressureAltitudes.cruise }
  ]);
</script>

<section class="ergebnis">
  <h2>Kraftstoffbedarf</h2>

  <!--
    Die vier Spalten passen auf einem Telefon nicht nebeneinander. Statt die
    Seite waagerecht scrollen zu lassen, scrollt nur die Tabelle selbst; die
    Zahlen bleiben dabei in einer Zeile beieinander und damit vergleichbar.
  -->
  <div class="hoehen-rahmen">
    <table class="hoehen">
    <caption>
      Druckhöhen, errechnet aus Höhe und QNH — sie stehen so nicht im Flughandbuch
    </caption>
    <thead>
      <tr>
        <th scope="col"></th>
        <th scope="col">über dem Meeresspiegel</th>
        <th scope="col">Druckhöhe</th>
        <th scope="col">Faustformel 30 ft/hPa</th>
      </tr>
    </thead>
    <tbody>
      {#each hoehen as zeile (zeile.name)}
        <tr>
          <th scope="row">{zeile.name}</th>
          <td>{formatFeet(zeile.wert.elevationFt)} bei {formatHectopascal(zeile.wert.qnhHpa)}</td>
          <td class="druckhoehe">{formatFeet(zeile.wert.pressureAltitudeFt)}</td>
          <td class="abweichung">
            {formatFeet(zeile.wert.deviationFromRuleOfThumbFt)} Abstand
          </td>
        </tr>
      {/each}
      </tbody>
    </table>
  </div>

  <table class="aufschluesselung">
    <tbody>
      <tr>
        <th scope="row">Anlassen, Rollen und Start</th>
        <td>{formatFuel(result.breakdown.taxiTakeoffL, result.breakdownUsGal.taxiTakeoffUsGal)}</td>
      </tr>
      <tr>
        <th scope="row">Steigflug</th>
        <td>{formatFuel(result.breakdown.climbL, result.breakdownUsGal.climbUsGal)}</td>
      </tr>
      <tr>
        <th scope="row">Reiseflug</th>
        <td>{formatFuel(result.breakdown.cruiseL, result.breakdownUsGal.cruiseUsGal)}</td>
      </tr>
      <tr class="summe">
        <th scope="row">Gesamt</th>
        <td>{formatFuel(result.breakdown.totalL, result.breakdownUsGal.totalUsGal)}</td>
      </tr>
    </tbody>
  </table>

  <p class="vergleich" class:warnung={result.exceedsUsableFuel}>
    {#if result.exceedsUsableFuel}
      Der Bedarf erreicht oder übersteigt die ausfliegbare Menge von
      {formatFuel(result.usableFuelL, result.usableFuelUsGal)}. Dieser Flug ist so nicht durchführbar.
    {:else}
      Ausfliegbar sind {formatFuel(result.usableFuelL, result.usableFuelUsGal)}. Rechnerisch bleiben
      {formatFuel(result.remainingFuelL, result.remainingFuelUsGal)} übrig — das ist keine Reserve.
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
  .hoehen-rahmen {
    overflow-x: auto;
    margin-bottom: 1rem;
  }

  .hoehen {
    border-collapse: collapse;
  }

  .hoehen td,
  .hoehen th {
    white-space: nowrap;
  }

  .hoehen caption {
    text-align: left;
    font-size: 0.85em;
    color: #555;
    padding-bottom: 0.35rem;
  }

  .hoehen th,
  .hoehen td {
    text-align: left;
    padding: 0.2rem 0.75rem 0.2rem 0;
    font-size: 0.95em;
  }

  .druckhoehe {
    font-weight: 700;
  }

  .abweichung {
    color: #555;
  }

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
