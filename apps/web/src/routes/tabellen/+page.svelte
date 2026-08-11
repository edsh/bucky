<script lang="ts">
  import { base } from '$app/paths';
  import { ICAO_STANDARD_ATMOSPHERE_SOURCE, listTables } from '@edsh-bucky/deelk-poh-core';

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

  <p class="einleitung">
    Die Reiseleistungstabelle führt neben Geschwindigkeit und Verbrauch je Stunde zwei weitere
    Spalten: die maximale Reichweite und die maximale Flugdauer. Beide gelten für volle
    Standardtanks und schließen laut Anmerkung 2 Motorstart, Rollen, den Steigflug und 45 Minuten
    Reserve bereits ein. Sie beantworten „wie weit käme die Maschine überhaupt", nicht „wie viel
    Kraftstoff braucht dieser Flug" — die auf der Startseite eingegebene Streckenlänge ist etwas
    anderes als die hier ausgewiesene Reichweite. In den Kraftstoffbedarf fließen diese beiden
    Spalten deshalb nicht ein; sie stehen dort als eigenständige Auskunft über dem Formular.
  </p>

  <p class="einleitung">
    Die Startstreckentabelle Abb. 5-1a führt zu jeder Kombination aus Druckhöhe und Außentemperatur
    zwei Werte: die Startrollstrecke bis zum Abheben und die Startstrecke über ein 15 m hohes
    Hindernis. Beide beschreiben denselben Start, aber zwei verschiedene Fragen — die erste, wo das
    Fahrwerk den Boden verlässt, die zweite, ob hinter dem Bahnende ein Baum oder ein Zaun noch
    überflogen wird. Maßgeblich für die Entscheidung ist in aller Regel die zweite. Die Zuschläge
    für Wind und Bahnzustand aus den Anmerkungen 2 bis 4 sind in den Tabellenwerten noch nicht
    enthalten; sie legt der Rechner darüber.
  </p>

  {#each tables as table (table.id)}
    <article>
      <h2>{table.figure} — {table.tableName}</h2>

      <dl>
        <dt>Seiten im Handbuch</dt>
        <dd>{table.source.pohPages.join(', ')}</dd>

        <dt>Stand</dt>
        <dd>{table.source.issue}, {table.source.revision}</dd>

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

  <section class="nichtpoh">
    <h2>Nicht aus dem Flughandbuch: die Druckhöhe</h2>
    <p>
      Eingegeben werden die Höhe über dem Meeresspiegel und das QNH; die Druckhöhe, mit der die
      obigen Tabellen arbeiten, errechnet der Kern selbst. Diese Umrechnung steht in keiner Tabelle
      des Handbuchs und wird deshalb hier getrennt ausgewiesen — sonst entstünde der Eindruck, auch
      sie sei gegen das Original geprüft.
    </p>
    <dl>
      <dt>Norm</dt>
      <dd>{ICAO_STANDARD_ATMOSPHERE_SOURCE.standard}</dd>

      <dt>Formel</dt>
      <dd>{ICAO_STANDARD_ATMOSPHERE_SOURCE.formula}</dd>
    </dl>
  </section>

  <p class="zurueck"><a href="{base}/">Zurück zum POH-Rechner</a></p>
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

  h3 {
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

  .nichtpoh {
    margin-top: 2rem;
    padding-top: 1rem;
    border-top: 2px solid #333;
  }
</style>
