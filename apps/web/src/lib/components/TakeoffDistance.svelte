<script lang="ts">
  import type { TakeoffDistanceResult } from '@edsh-bucky/deelk-poh-core';
  import {
    formatCelsius,
    formatFeet,
    formatMetres,
    formatNumber,
    unitText
  } from '@edsh-bucky/deelk-poh-core';
  import CalculationSteps from './CalculationSteps.svelte';
  import SourceCitations from './SourceCitations.svelte';
  import SurfaceSwitch from './SurfaceSwitch.svelte';

  /**
   * Roll- und Startstrecke der D-EELK. Reine Darstellung: Interpolation,
   * Zuschläge und Rundung liegen im Kern (Constitution-Prinzip IV,
   * Zusicherungen C-02, C-03, C-07).
   *
   * Die beiden Schalter für den Bahnzustand stehen in dieser Komponente und
   * nicht bei den Grundbedingungen: Sie wirken allein auf die Startstrecke
   * (FR-018). Druckhöhe und Temperatur kommen dagegen von außen — sie gelten
   * für den ganzen Flug (FR-019).
   */
  let {
    result,
    fehler,
    dryGrass = $bindable(),
    wetOrSnow = $bindable()
  }: {
    result?: TakeoffDistanceResult;
    fehler?: string;
    dryGrass: boolean;
    wetOrSnow: boolean;
  } = $props();

  /**
   * Die Erläuterung des Windschritts stammt wortgleich aus dem Kern. Sie steht
   * sichtbar und nicht erst im aufgeklappten Rechenweg: Der Windzuschlag ist
   * der Schritt, der die Tabellenwerte am stärksten verschiebt (FR-017).
   */
  const windErlaeuterung = $derived(
    result?.steps.find((step) => step.id === 'takeoff.windAdjustment')?.explanation
  );
</script>

<div class="startstrecke">
  <fieldset class="bahn">
    <legend>Bahnzustand</legend>
    <SurfaceSwitch
      id="gras"
      label="Trockenes Gras"
      note="Anmerkung 3"
      bind:checked={dryGrass}
    />
    <SurfaceSwitch
      id="nass"
      label="Nass oder Schnee"
      note="Anmerkung 4"
      bind:checked={wetOrSnow}
    />
  </fieldset>

  {#if fehler}
    <p class="fehler" role="alert">{fehler}</p>
  {:else if result}
    <dl class="werte">
      <div>
        <dt>Startrollstrecke</dt>
        <dd>{formatMetres(result.groundRollM)}</dd>
      </div>
      <div>
        <dt>Startstrecke über {result.obstacleLabel}</dt>
        <dd>{formatMetres(result.overObstacleM)}</dd>
      </div>
    </dl>

    <!--
      Die Eckwerte der Rechnung stehen direkt unter dem Ergebnis: Druckhoehe
      und Temperatur sind die beiden Groessen, mit denen der Pilot die Zeile in
      der Handbuchtabelle wiederfindet (Constitution, Prinzip I).
    -->
    <p class="eckwerte">
      Druckhöhe {formatFeet(result.pressureAltitude.pressureAltitudeFt)},
      Außentemperatur {formatCelsius(result.outsideAirTemperature.outsideAirTemperatureC)}
    </p>

    <table class="aufschluesselung">
      <tbody>
        <tr>
          <th scope="row">Laut Tabelle</th>
          <td>{formatMetres(result.tableGroundRollM)}</td>
          <td>{formatMetres(result.tableOverObstacleM)}</td>
        </tr>
        <tr>
          <th scope="row">
            Wind
            <span class="anteil">
              {unitText(formatNumber(result.windAdjustmentPct, 1), '%')}
            </span>
          </th>
          <td>{formatMetres(result.windAdjustedGroundRollM)}</td>
          <td>{formatMetres(result.windAdjustedOverObstacleM)}</td>
        </tr>
        <tr class="summe">
          <th scope="row">
            Bahnzustand
            <span class="anteil">
              +{unitText(formatNumber(result.surfaceAllowancePct, 0), '%')}
              ≙ {formatMetres(result.surfaceAllowanceM)}
            </span>
          </th>
          <td>{formatMetres(result.groundRollM)}</td>
          <td>{formatMetres(result.overObstacleM)}</td>
        </tr>
      </tbody>
    </table>

    {#if windErlaeuterung}
      <p class="erlaeuterung">{windErlaeuterung}</p>
    {/if}

    <h3>Hinweise</h3>
    <ul class="hinweise">
      {#each result.advisories as advisory (advisory.id)}
        <li>{advisory.text}</li>
      {/each}
      {#each result.notes as note (note.id)}
        <li>{note.text}</li>
      {/each}
    </ul>

    <!--
      Die Bedingungen der Tabelle stehen im Wortlaut der Digitalisierung.
      Ohne sie liesse sich nicht erkennen, dass die Werte etwa fuer volle
      Landeklappen und Hoechstabflugmasse gelten (FR-016).
    -->
    <h3>Es gilt</h3>
    <ul class="hinweise bedingungen">
      {#each result.conditions as condition (condition)}
        <li>{condition}</li>
      {/each}
    </ul>

    <SourceCitations
      sources={[result.source]}
      preflightCheckNotice={result.preflightCheckNotice}
    />

    <CalculationSteps steps={result.steps} />
  {/if}
</div>

<style>
  .bahn {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1.5rem;
    border: 1px solid #ccc;
    border-radius: 0.25rem;
    padding: 0.5rem 0.75rem 0.75rem;
    margin: 0 0 1rem;
    min-width: 0;
  }

  legend {
    padding: 0 0.35rem;
    font-size: 0.85em;
    color: #555;
  }

  .werte {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
    gap: 0.5rem 1.5rem;
    margin: 0 0 0.5rem;
  }

  dt {
    font-size: 0.85em;
    color: #555;
  }

  dd {
    margin: 0;
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    font-size: 1.15em;
  }

  .eckwerte {
    margin: 0 0 1rem;
    font-size: 0.85em;
    color: #555;
  }

  .aufschluesselung {
    border-collapse: collapse;
    width: 100%;
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

  .anteil {
    display: block;
    font-weight: 400;
    font-size: 0.8em;
    color: #666;
  }

  .summe th,
  .summe td {
    font-weight: 700;
    border-top: 2px solid #333;
  }

  .erlaeuterung {
    margin: 0.5rem 0 0;
    font-size: 0.85em;
    color: #333;
  }

  h3 {
    margin: 1rem 0 0.5rem;
    font-size: 0.95rem;
  }

  .hinweise li {
    margin-bottom: 0.5rem;
    font-size: 0.9em;
  }

  .fehler {
    margin: 0;
    color: #a00;
    font-weight: 700;
  }
</style>
