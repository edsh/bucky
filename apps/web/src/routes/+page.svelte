<script lang="ts">
  import { base } from '$app/paths';
  import {
    PohCalculationError,
    computeFuelPlan,
    getFuelPlanInputDomain,
    type FuelPlanResult
  } from '@edsh-bucky/deelk-poh-core';
  import FuelResult from '$lib/components/FuelResult.svelte';

  /**
   * Dünner Adapter: nimmt die sechs Felder entgegen und reicht sie an den Kern
   * weiter. Wertebereiche und Auswahllisten stammen aus dem Kern, nicht aus
   * dieser Datei (Constitution-Prinzip IV, Zusicherung C-02).
   */
  const domain = getFuelPlanInputDomain();

  const alleLasteinstellungen = [
    ...new Set(domain.powerSettingsByPressureAltitude.flatMap((eintrag) => eintrag.powerSettingsPct))
  ].sort((a, b) => a - b);

  let departureAltitudeFt = $state(1000);
  let cruiseAltitudeFt = $state(6000);
  let distanceNm = $state(400);
  let powerSettingPct = $state(70);
  let isaDeviationC = $state(20);
  let windComponentKt = $state(10);

  let result = $state<FuelPlanResult | undefined>(undefined);
  let fehler = $state<string | undefined>(undefined);

  function berechnen(event: SubmitEvent): void {
    event.preventDefault();
    try {
      result = computeFuelPlan({
        departureAltitudeFt,
        cruiseAltitudeFt,
        distanceNm,
        powerSettingPct,
        isaDeviationC,
        windComponentKt
      });
      fehler = undefined;
    } catch (error) {
      // Die Meldung kommt wortgleich aus dem Kern; der Adapter formuliert sie
      // nicht um (Zusicherung C-02).
      fehler =
        error instanceof PohCalculationError ? error.message : 'Unerwarteter Fehler bei der Berechnung.';
      result = undefined;
    }
  }
</script>

<svelte:head>
  <title>Kraftstoffrechner D-EELK — Bucky Highfly</title>
</svelte:head>

<main>
  <h1>Kraftstoffrechner D-EELK</h1>
  <p class="einleitung">
    Reims/Cessna F172N mit TAE 125-02-114, Standardtanks. Grundlage ist Abschnitt 5b des
    Flughandbuch-Anhangs — <a href="{base}/tabellen">die verwendeten Tabellen im Einzelnen</a>.
  </p>

  <form onsubmit={berechnen}>
    <label>
      Platzhöhe Startplatz (ft)
      <input
        type="number"
        bind:value={departureAltitudeFt}
        min={domain.departureAltitudeFt.min}
        max={domain.departureAltitudeFt.max}
        step="100"
        required
      />
    </label>

    <label>
      Reiseflughöhe (ft)
      <input
        type="number"
        bind:value={cruiseAltitudeFt}
        min={domain.cruiseAltitudeFt.min}
        max={domain.cruiseAltitudeFt.max}
        step="100"
        required
      />
    </label>

    <label>
      Streckenlänge (NM)
      <input type="number" bind:value={distanceNm} min="1" step="1" required />
    </label>

    <label>
      Lasteinstellung (%)
      <select bind:value={powerSettingPct}>
        {#each alleLasteinstellungen as einstellung (einstellung)}
          <option value={einstellung}>{einstellung} %</option>
        {/each}
      </select>
    </label>

    <label>
      ISA-Abweichung (°C)
      <input
        type="number"
        bind:value={isaDeviationC}
        min={domain.isaDeviationC.min}
        max={domain.isaDeviationC.max}
        step="1"
        required
      />
    </label>

    <label>
      Windkomponente (kt, positiv = Gegenwind)
      <input
        type="number"
        bind:value={windComponentKt}
        min={domain.windComponentKt.min}
        max={domain.windComponentKt.max}
        step="1"
        required
      />
    </label>

    <button type="submit">Berechnen</button>
  </form>

  {#if fehler}
    <p class="fehler" role="alert">{fehler}</p>
  {/if}

  {#if result}
    <FuelResult {result} />
  {/if}
</main>

<style>
  main {
    max-width: 48rem;
    margin: 0 auto;
    padding: 1.5rem;
    font-family: system-ui, sans-serif;
    line-height: 1.5;
  }

  form {
    display: grid;
    gap: 0.75rem;
    max-width: 32rem;
  }

  label {
    display: grid;
    gap: 0.25rem;
  }

  input,
  select {
    padding: 0.4rem;
    font-size: 1rem;
  }

  button {
    justify-self: start;
    padding: 0.5rem 1.25rem;
    font-size: 1rem;
  }

  .fehler {
    margin-top: 1rem;
    padding: 0.75rem;
    border: 2px solid #a00;
    color: #a00;
  }
</style>
