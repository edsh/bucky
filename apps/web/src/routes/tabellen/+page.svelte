<script lang="ts">
  import { base } from '$app/paths';
  import { listTables } from '@edsh-bucky/deelk-poh-core';

  /**
   * Übersicht der digitalisierten Tabellen. Sie macht sichtbar, worauf die
   * Berechnung beruht, und zeigt die beim Digitalisieren vermerkten
   * Widersprüche des Originals (Constitution-Prinzip I).
   */
  const tables = listTables();
</script>

<svelte:head>
  <title>Digitalisierte Tabellen — Bucky Highfly</title>
</svelte:head>

<main>
  <h1>Digitalisierte Tabellen der D-EELK</h1>

  <p class="einleitung">
    Grundlage aller Berechnungen. Aufgeführt sind nur die Tabellen, die für D-EELK anwendbar sind —
    Abschnitt 5b, Propeller MTV-6-A/190-69, Abfluggewicht 1043 kg. Die Tabellen für 1089 kg sowie
    für Langstrecken- und Integraltank sind digitalisiert, aber für dieses Flugzeug gesperrt.
  </p>

  {#each tables as table (table.id)}
    <article>
      <h2>{table.figure} — {table.tableName}</h2>

      <dl>
        <dt>Seiten im Handbuch</dt>
        <dd>{table.source.pohPages.join(', ')}</dd>

        <dt>Zeilen</dt>
        <dd>{table.rowCount}</dd>

        <dt>Zitat</dt>
        <dd class="zitat">{table.source.citation}</dd>
      </dl>

      {#if table.conditions.length > 0}
        <h3>Bedingungen</h3>
        <ul>
          {#each table.conditions as condition (condition)}
            <li>{condition}</li>
          {/each}
        </ul>
      {/if}

      {#if table.notes.length > 0}
        <h3>Anmerkungen</h3>
        <ul>
          {#each table.notes as note (note)}
            <li>{note}</li>
          {/each}
        </ul>
      {/if}

      {#if table.anomalies.length > 0}
        <div class="anomalie">
          <h3>Widerspruch im Original</h3>
          {#each table.anomalies as anomaly (anomaly.kind)}
            <p>{anomaly.description}</p>
            {#if anomaly.digitized_value}
              <p><strong>Übernommen:</strong> {anomaly.digitized_value}</p>
            {/if}
            {#if anomaly.action}
              <p>{anomaly.action}</p>
            {/if}
          {/each}
        </div>
      {/if}
    </article>
  {/each}

  <p class="zurueck"><a href="{base}/">Zurück zum Kraftstoffrechner</a></p>
</main>

<style>
  main {
    max-width: 48rem;
    margin: 0 auto;
    padding: 1.5rem;
    font-family: system-ui, sans-serif;
    line-height: 1.5;
  }

  article {
    margin-bottom: 2.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #ddd;
  }

  h2 {
    font-size: 1.15rem;
  }

  h3 {
    font-size: 1rem;
    margin-bottom: 0.25rem;
  }

  dt {
    font-weight: 700;
  }

  dd {
    margin: 0 0 0.4rem;
  }

  .zitat {
    font-size: 0.85em;
    color: #666;
  }

  .anomalie {
    margin-top: 0.75rem;
    padding: 0.75rem;
    border-left: 4px solid #c60;
    background: #fff8f0;
  }

  .anomalie h3 {
    margin-top: 0;
  }
</style>
