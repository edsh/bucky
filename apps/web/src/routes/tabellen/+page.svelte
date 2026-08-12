<script lang="ts">
  import { base } from '$app/paths';

  /**
   * Alte Adresse der Tabellenübersicht. Sie lag vor Feature 043 unter
   * `/tabellen`; seither gehört sie unter das Flugzeug. Diese Seite hält
   * bestehende Lesezeichen am Leben (FR-014) und weist ihnen den Weg — die
   * Weiterleitung geschieht über den Browser selbst und braucht kein
   * JavaScript, damit sie auch dann trägt, wenn sonst nichts lädt.
   */
  const ziel = `${base}/d-eelk/poh-rechner/tabellen`;
</script>

<svelte:head>
  <title>Umgezogen — Bucky Highfly</title>
  <meta http-equiv="refresh" content="0; url={ziel}" />
</svelte:head>

<main>
  <h1>Diese Seite ist umgezogen</h1>
  <p>
    Die digitalisierten Tabellen stehen jetzt beim POH-Rechner der D-EELK.
    <a href={ziel}>Weiter zu den Tabellen</a>
  </p>
</main>

<style>
  main {
    max-width: 48rem;
    margin: 0 auto;
    padding: 1.5rem;
    font-family: system-ui, sans-serif;
    line-height: 1.5;
  }
</style>
