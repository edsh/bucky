<script lang="ts">
  import type { FuelPlanResult } from '@edsh-bucky/deelk-poh-core';
  import { formatFuel, formatHours, formatKnots } from '@edsh-bucky/deelk-poh-core';
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
  <h2>Kraftstoffbedarf und Geschwindigkeiten</h2>

  <!--
    Die Druckhöhen stehen unter den Reglern, die sie erzeugen, nicht hier. Eine
    zweite Anzeige an dieser Stelle waere ein Duplikat und muesste bei jeder
    Aenderung mitgepflegt werden.

    Ebenso Eigengeschwindigkeit und Stundenverbrauch: Sie haengen allein an den
    Bedingungen des Reiseflugs und stehen deshalb oben in der Uebersicht. Hier
    bleiben die Groessen des konkreten Vorhabens — beide haengen an der
    eingegebenen Strecke und am Wind und gehoeren nirgendwo sonst hin.
  -->
  <dl class="leistung">
    <div>
      <dt>Geschwindigkeit über Grund</dt>
      <dd>{formatKnots(result.cruisePerformance.groundSpeedKt)}</dd>
    </div>
    <div>
      <dt>Reiseflugzeit dieser Strecke</dt>
      <dd>{formatHours(result.cruisePerformance.timeH)}</dd>
    </div>
  </dl>

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
  /*
    Der Bedarf ist die Folge der Angaben zum Streckenflug, keine eigene
    Hauptsache. Die Ueberschriftebene bleibt deshalb erhalten -- sie traegt die
    Gliederung fuer Vorlesewerkzeuge --, das optische Gewicht nicht.
  */
  h2 {
    margin: 0 0 0.5rem;
    font-size: 1.05rem;
  }

  .leistung {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 2rem;
    margin: 0 0 1rem;
  }

  .leistung dt {
    font-weight: 400;
    font-size: 0.85em;
    color: #555;
  }

  .leistung dd {
    margin: 0;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
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
