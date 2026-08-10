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

  /**
   * Wind und Bahnzuschlag als Zellinhalt. Das Vorzeichen steht davor, weil ein
   * Zuschlag ohne Vorzeichen wie ein Endwert aussähe — und ein Endwert steht
   * in dieser Tabelle nur in der letzten Zeile.
   */
  const windAnteil = $derived(
    result === undefined || result.windAdjustmentPct === 0
      ? '—'
      : `${result.windAdjustmentPct > 0 ? '+' : '−'}${unitText(formatNumber(Math.abs(result.windAdjustmentPct), 1), '%')}`
  );

  const bahnZuschlag = $derived(
    result === undefined || result.surfaceAllowanceM === 0
      ? '—'
      : `+${formatMetres(result.surfaceAllowanceM)}`
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
    <!--
      Die Eckwerte der Rechnung stehen über der Tabelle: Druckhoehe und
      Temperatur sind die beiden Groessen, mit denen der Pilot die Zeile in der
      Handbuchtabelle wiederfindet (Constitution, Prinzip I).
    -->
    <p class="eckwerte">
      Druckhöhe {formatFeet(result.pressureAltitude.pressureAltitudeFt)},
      Außentemperatur {formatCelsius(result.outsideAirTemperature.outsideAirTemperatureC)}
    </p>

    <!--
      Die beiden Strecken stehen nur einmal, naemlich als Spalten. Der Wind
      erscheint als Anteil und nicht als Zwischenstand in Metern: Ein
      gerundeter Zwischenstand plus gerundeter Zuschlag ergaebe sichtbar einen
      anderen Wert als die Gesamtstrecke, obwohl die Rechnung stimmt.

      Der Bahnzuschlag steht dagegen in Metern, und in beiden Spalten
      derselbe. Genau das ist die Auslegung der Anmerkungen 3 und 4: Der
      Zuschlag entsteht aus dem Startlauf und wirkt am Boden, nicht in der
      Luft — er waechst nicht mit der Strecke ueber das Hindernis mit.
    -->
    <table class="aufschluesselung">
      <thead>
        <tr>
          <td></td>
          <th scope="col">Startrollstrecke</th>
          <th scope="col">Startstrecke über {result.obstacleLabel}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row">Laut Tabelle</th>
          <td>{formatMetres(result.tableGroundRollM)}</td>
          <td>{formatMetres(result.tableOverObstacleM)}</td>
        </tr>
        <tr>
          <th scope="row">
            Wind
            {#if result.windAdjustmentPct === 0}
              <span class="anteil">Windstille</span>
            {/if}
          </th>
          <td>{windAnteil}</td>
          <td>{windAnteil}</td>
        </tr>
        <tr>
          <th scope="row">
            Bahnzustand
            <span class="anteil">
              {result.surfaceAllowancePct === 0
                ? 'befestigt und trocken'
                : `+${unitText(formatNumber(result.surfaceAllowancePct, 0), '%')} des Startlaufs`}
            </span>
          </th>
          <td>{bahnZuschlag}</td>
          <td>{bahnZuschlag}</td>
        </tr>
        <tr class="summe">
          <th scope="row">Gesamtstrecke</th>
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

  .eckwerte {
    margin: 0 0 0.75rem;
    font-size: 0.85em;
    color: #555;
  }

  /*
    Die Spaltenueberschriften tragen die beiden Streckenarten. Sie duerfen
    umbrechen -- "Startstrecke ueber 15 m Hindernis" passt auf einem Telefon
    nicht in eine Zeile, und eine abgeschnittene Ueberschrift laesst offen,
    welche der beiden Strecken in der Spalte steht.
  */
  thead th {
    text-align: right;
    vertical-align: bottom;
    font-size: 0.85em;
    font-weight: 400;
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

  .summe td {
    font-size: 1.1em;
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
