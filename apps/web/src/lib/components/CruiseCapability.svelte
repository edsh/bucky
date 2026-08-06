<script lang="ts">
  import type { CruiseCapability } from '@edsh-bucky/deelk-poh-core';
  import {
    formatFuelFlow,
    formatHours,
    formatKnots,
    formatNauticalMiles
  } from '@edsh-bucky/deelk-poh-core';

  /**
   * Was die D-EELK unter den eingestellten Bedingungen leistet — abgelesen aus
   * Abb. 5-4a, nicht gerechnet. Reine Darstellung: Rundung und Wortlaut
   * stammen aus dem Kern (Zusicherungen C-02, C-03).
   *
   * Liegt statt eines Ergebnisses eine Meldung vor, wird nur sie gezeigt. Ein
   * halb gefüllter Kasten mit veralteten Werten wäre bei einer
   * Flugvorbereitung schlimmer als gar keiner.
   */
  let {
    capability,
    fehler
  }: {
    capability?: CruiseCapability;
    fehler?: string;
  } = $props();
</script>

<section class="uebersicht" aria-labelledby="uebersicht-titel">
  <h2 id="uebersicht-titel">Reichweite und Flugdauer</h2>

  {#if fehler}
    <p class="fehler" role="alert">{fehler}</p>
  {:else if capability}
    <dl class="werte">
      <div>
        <dt>Eigengeschwindigkeit</dt>
        <dd>{formatKnots(capability.ktas)} KTAS</dd>
      </div>
      <div>
        <dt>Verbrauch je Stunde</dt>
        <dd>{formatFuelFlow(capability.fuelFlowLph, capability.fuelFlowUsGph)}</dd>
      </div>
      <div>
        <!--
          "Maximale Reichweite" statt schlicht "Strecke": Weiter unten steht
          die eingegebene Streckenlänge des Vorhabens. Beide Zahlen sind NM und
          dürfen sich nicht verwechseln lassen (FR-010).
        -->
        <dt>Maximale Reichweite</dt>
        <dd>{formatNauticalMiles(capability.maxRangeNm)}</dd>
      </div>
      <div>
        <dt>Maximale Flugdauer</dt>
        <dd>{formatHours(capability.enduranceH)}</dd>
      </div>
    </dl>

    <p class="hinweis">
      Reichweite und Flugdauer gelten für volle Standardtanks bei {capability.windlessNote}.
      Laut Handbuch, Anmerkung {capability.inclusionsNote}
    </p>

    <p class="quelle">
      {capability.source.figure}, Seite {capability.source.pohPages.join(', ')}
    </p>
  {/if}
</section>

<style>
  /*
    Ohne Rahmen und ohne Farbflaeche: Die Uebersicht ist eine Ergebnisangabe
    wie der Kraftstoffbedarf weiter unten und soll genauso aussehen.
  */
  .uebersicht {
    margin: 1rem 0;
  }

  h2 {
    margin: 0 0 0.5rem;
    font-size: 1.05rem;
  }

  .werte {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
    gap: 0.5rem 1.5rem;
    margin: 0;
  }

  dt {
    font-size: 0.85em;
    color: #555;
  }

  dd {
    margin: 0;
    font-variant-numeric: tabular-nums;
    font-weight: 700;
  }

  .hinweis {
    margin: 0.75rem 0 0;
    font-size: 0.85em;
    color: #333;
  }

  .quelle {
    margin: 0.25rem 0 0;
    font-size: 0.8em;
    color: #555;
  }

  .fehler {
    margin: 0;
    color: #a00;
    font-weight: 700;
  }
</style>
