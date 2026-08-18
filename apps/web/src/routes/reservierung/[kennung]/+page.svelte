<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { base } from '$app/paths';
  import {
    alsKurzdatumUhrzeit,
    alsStatussatz,
    alsZusatzzeile,
    zustandFuer
  } from '@edsh-bucky/reservierung-core';
  import TagesuhrAvatar from '$lib/components/TagesuhrAvatar.svelte';
  import { statusfarbe } from '$lib/flotte/farben.js';
  import { darstellungFuer } from '$lib/flotte/darstellung.js';
  import { Flottenstand } from '$lib/flotte/stand.svelte.js';

  /**
   * Die Detailansicht einer Maschine — vorerst in ihrer knappen Form.
   *
   * Sie beantwortet schon jetzt die Frage, die vom Flugzeugpark aus gestellt
   * wird: Wie steht es gerade um diese Maschine? Tagesbalken, Wochenraster
   * und die Liste der kommenden Belegungen kommen in Phase 4 dazu (T040 ff.);
   * bis dahin ist die Seite kurz, aber nicht falsch — und vor allem ist sie
   * da, statt ins Leere zu führen.
   */
  const stand = new Flottenstand();

  const kennung = $derived((page.params.kennung ?? '').toUpperCase());

  onMount(() => {
    void stand.starten();
    return () => stand.beenden();
  });

  const bekannt = $derived(stand.flotte.some((m) => m.kennung === kennung));

  const zustand = $derived(
    stand.belegungen === null ? null : zustandFuer(stand.belegungen, kennung, stand.jetzt)
  );
  const farbe = $derived(zustand === null ? null : statusfarbe(zustand));
  const satz = $derived(zustand === null ? 'Kein Stand' : alsStatussatz(zustand, stand.jetzt));
  const zusatz = $derived(zustand === null ? null : alsZusatzzeile(zustand, stand.jetzt));
  const typ = $derived(darstellungFuer(kennung).typ);

  const standText = $derived(
    stand.abgerufenAm === null ? null : `Stand ${alsKurzdatumUhrzeit(new Date(stand.abgerufenAm))}`
  );
</script>

<svelte:head>
  <title>{kennung} · Bucky Highfly</title>
</svelte:head>

<main>
  <p class="zurueck"><a href="{base}/">‹ Flugzeugpark</a></p>

  <div class="kopf">
    <TagesuhrAvatar
      {kennung}
      belegungen={stand.belegungen}
      jetzt={stand.jetzt}
      groesse={132}
      statusfarbe={farbe}
      gesperrt={zustand?.status === 'sperre'}
    />
    <h1>{kennung}</h1>
    {#if typ}
      <p class="typ">{typ}</p>
    {/if}
    <p class="satz" style:color={farbe ?? 'inherit'}>{satz}</p>
    {#if zusatz && !satz.includes(zusatz)}
      <p class="danach">{zusatz}</p>
    {/if}
  </div>

  {#if !bekannt && !stand.laedt && stand.flotte.length > 0}
    <p class="hinweis" role="status">
      Diese Kennung gehört nicht zur Vereinsflotte. Der Flugzeugpark zeigt, welche Maschinen es
      gibt.
    </p>
  {/if}

  {#if standText}
    <p class="stand">{standText}</p>
  {/if}

  <p class="fussnote">
    Unverbindliche Anzeige. Verbindlich ist der Reservierungskalender in Vereinsflieger.
  </p>
</main>

<style>
  main {
    max-width: 430px;
    margin: 0 auto;
    padding: 12px 16px 24px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  }

  .zurueck {
    margin: 0 0 8px;
    font-size: 13px;
  }

  .zurueck a {
    color: inherit;
    text-decoration: none;
    opacity: 0.6;
  }

  .kopf {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    text-align: center;
  }

  h1 {
    margin: 6px 0 0;
    font-size: 22px;
    letter-spacing: 0.04em;
  }

  .typ {
    margin: -4px 0 0;
    font-size: 12.5px;
    opacity: 0.5;
  }

  .satz {
    margin: 4px 0 0;
    font-size: 14.5px;
    font-weight: 600;
  }

  .danach {
    margin: -2px 0 0;
    font-size: 12.5px;
    opacity: 0.55;
  }

  .hinweis {
    margin: 16px 0 0;
    padding: 12px 14px;
    border-radius: 10px;
    background: rgba(127, 127, 127, 0.09);
    font-size: 12.5px;
    line-height: 1.5;
  }

  .stand {
    margin: 20px 0 0;
    font-size: 11.5px;
    opacity: 0.45;
    text-align: right;
  }

  .fussnote {
    margin: 12px 0 0;
    font-size: 11.5px;
    line-height: 1.55;
    opacity: 0.45;
  }
</style>
