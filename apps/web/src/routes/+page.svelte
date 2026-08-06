<script lang="ts">
  import { base } from '$app/paths';
  import {
    PohCalculationError,
    computeFuelPlan,
    formatFeet,
    formatHectopascal,
    formatKnots,
    formatNauticalMiles,
    formatNumber,
    getFuelPlanInputDomain,
    type FuelPlanResult
  } from '@edsh-bucky/deelk-poh-core';
  import FuelResult from '$lib/components/FuelResult.svelte';
  import RangeField from '$lib/components/RangeField.svelte';

  /**
   * Dünner Adapter: nimmt die sechs Felder entgegen und reicht sie an den Kern
   * weiter. Wertebereiche und Auswahllisten stammen aus dem Kern, nicht aus
   * dieser Datei (Constitution-Prinzip IV, Zusicherung C-02).
   */
  const domain = getFuelPlanInputDomain();

  const alleLasteinstellungen = [
    ...new Set(domain.powerSettingsByPressureAltitude.flatMap((eintrag) => eintrag.powerSettingsPct))
  ].sort((a, b) => a - b);

  let departureElevationFt = $state(1000);
  let cruiseAltitudeAmslFt = $state(6000);
  let qnhHpa = $state(1013);
  let distanceNm = $state(400);
  let powerSettingPct = $state(70);
  let isaDeviationC = $state(20);
  let windComponentKt = $state(10);

  const grad = (wert: number): string => `${formatNumber(wert, 0)} °C`;
  const prozent = (wert: number): string => `${formatNumber(wert, 0)} %`;

  let result = $state<FuelPlanResult | undefined>(undefined);
  let fehler = $state<string | undefined>(undefined);

  /**
   * Gerechnet wird bei jeder Reglerbewegung, nicht erst beim Absenden: Ein
   * Regler lebt davon, dass die Wirkung der Bewegung sichtbar wird. Das
   * Formular bleibt trotzdem ein Formular — wer die Eingabetaste drückt oder
   * ohne Zeigegerät arbeitet, kommt sonst nicht ans Ergebnis.
   */
  function berechnen(): void {
    try {
      result = computeFuelPlan({
        departureElevationFt,
        cruiseAltitudeAmslFt,
        qnhHpa,
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

  $effect(() => {
    // Liest alle sieben Eingaben und läuft daher bei jeder Änderung erneut.
    void [
      departureElevationFt,
      cruiseAltitudeAmslFt,
      qnhHpa,
      distanceNm,
      powerSettingPct,
      isaDeviationC,
      windComponentKt
    ];
    berechnen();
  });
</script>

<svelte:head>
  <title>Kraftstoffrechner D-EELK — Bucky Highfly</title>
</svelte:head>

<main>
  <header class="kopf">
    <img class="maskottchen" src="{base}/bucky-maskottchen.svg" alt="Bucky, das Maskottchen" />
    <h1>Kraftstoffrechner D-EELK</h1>
  </header>
  <p class="einleitung">
    Cessna 172N mit TAE 125-02-114, Standardtanks. Grundlage ist Abschnitt 5b des
    Flughandbuch-Anhangs — <a href="{base}/tabellen">die verwendeten Tabellen im Einzelnen</a>.
  </p>

  <form onsubmit={(event) => event.preventDefault()}>
    <RangeField
      id="platzhoehe"
      label="Platzhöhe ASL (ft)"
      range={domain.departureElevationFt}
      bind:value={departureElevationFt}
      format={formatFeet}
    />

    <RangeField
      id="reiseflughoehe"
      label="Reiseflughöhe ASL (ft)"
      range={domain.cruiseAltitudeAmslFt}
      bind:value={cruiseAltitudeAmslFt}
      format={formatFeet}
    />

    <RangeField
      id="qnh"
      label="Luftdruck QNH (hPa)"
      range={domain.qnhHpa}
      bind:value={qnhHpa}
      format={formatHectopascal}
    />

    <RangeField
      id="strecke"
      label="Streckenlänge (NM)"
      range={domain.distanceNm}
      bind:value={distanceNm}
      format={formatNauticalMiles}
    />

    <RangeField
      id="isa"
      label="ISA-Abweichung (°C)"
      range={domain.isaDeviationC}
      bind:value={isaDeviationC}
      format={grad}
    />

    <RangeField
      id="wind"
      label="Windkomponente (kt, positiv = Gegenwind)"
      range={domain.windComponentKt}
      bind:value={windComponentKt}
      format={formatKnots}
    />

    <!--
      Die Lasteinstellung bleibt eine Auswahl: Das Handbuch kennt dafür nur
      einzelne Werte, Zwischenwerte existieren fachlich nicht (FR-011). Sie
      darf nicht der Einheitlichkeit halber in einen Regler überführt werden.
    -->
    <label class="auswahl" for="last">
      Lasteinstellung (%)
      <select id="last" bind:value={powerSettingPct}>
        {#each alleLasteinstellungen as einstellung (einstellung)}
          <option value={einstellung}>{prozent(einstellung)}</option>
        {/each}
      </select>
    </label>
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

  /*
    Die Spaltenzahl ergibt sich aus der Breite, nicht aus festen Haltepunkten
    (FR-003). Die Mindestbreite von 14 rem bestimmt selbst, wann umgebrochen
    wird: Ein Regler darunter wird zu ungenau, um ihn noch zu bedienen.
  */
  form {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
    gap: 0.75rem 1.5rem;
    align-items: end;
  }

  .kopf {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .kopf h1 {
    margin: 0;
  }

  .maskottchen {
    width: 4.5rem;
    height: auto;
    flex: none;
  }

  .auswahl {
    display: grid;
    gap: 0.25rem;
    align-content: end;
  }

  select {
    padding: 0.4rem;
    font-size: 1rem;
  }

  .fehler {
    margin-top: 1rem;
    padding: 0.75rem;
    border: 2px solid #a00;
    color: #a00;
  }
</style>
