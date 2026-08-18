<script lang="ts">
  import { onMount } from 'svelte';
  import { alsKurzdatumUhrzeit, alsRueckfallHinweis } from '@edsh-bucky/reservierung-core';
  import Maschinenkachel from '$lib/components/Maschinenkachel.svelte';
  import { FARBEN } from '$lib/flotte/farben.js';
  import { Flottenstand } from '$lib/flotte/stand.svelte.js';

  /**
   * Die Reservierungsübersicht der ganzen Flotte.
   *
   * Sie holt ihre Daten genau einmal und rechnet danach minütlich neu (E-09).
   * Was hier steht, ist deshalb immer aktuell in Bezug auf die Uhr — und
   * sichtbar alt in Bezug auf den Datenstand. Genau diese Trennung ist
   * beabsichtigt: „Stand Do., 13.08., 11:20" altert vor den Augen des
   * Lesers, statt Frische vorzutäuschen (FR-019).
   *
   * Der Fall „kein Stand" zeigt die Flotte, aber für keine einzige Maschine
   * eine Verfügbarkeitsaussage — kein Grün, kein „frei" (FR-022, SC-003). Wer
   * zum Platz fährt, weil eine Anzeige geraten hat, hat einen Vormittag
   * verloren; wer liest „gerade keine Auskunft möglich", schaut vorher in
   * Vereinsflieger nach.
   */
  const stand = new Flottenstand();

  let dunkel = $state(false);

  onMount(() => {
    const gespeichert = localStorage.getItem('bucky.farbschema');
    dunkel =
      gespeichert === 'dunkel' ||
      (gespeichert === null && window.matchMedia('(prefers-color-scheme: dark)').matches);

    void stand.starten();
    return () => stand.beenden();
  });

  function schemaUmschalten() {
    dunkel = !dunkel;
    localStorage.setItem('bucky.farbschema', dunkel ? 'dunkel' : 'hell');
  }

  const gruppen = $derived([
    { titel: 'Motorflugzeuge & UL', maschinen: stand.flotte.filter((m) => m.kategorie === 'motor') },
    { titel: 'Segelflugzeuge', maschinen: stand.flotte.filter((m) => m.kategorie === 'segelflug') }
  ]);

  const standText = $derived(
    stand.abgerufenAm === null
      ? null
      : `Stand ${alsKurzdatumUhrzeit(new Date(stand.abgerufenAm))}`
  );

  const rueckfallHinweis = $derived(
    stand.quelle === null ? null : alsRueckfallHinweis(stand.quelle)
  );

  const legende = [
    { farbe: FARBEN.frei, text: 'frei' },
    { farbe: FARBEN.belegt, text: 'belegt' },
    { farbe: FARBEN.sperreFlaeche, text: 'gesperrt' },
    { farbe: FARBEN.nacht, text: 'Nacht' }
  ];
</script>

<svelte:head>
  <title>Reservierungen · Bucky Highfly</title>
  <meta name="description" content="Verfügbarkeit der Vereinsflotte auf einen Blick." />
</svelte:head>

<div class="aussen" class:dunkel>
  <main>
    <div class="splash">
      <img src="/bucky-splash.png" alt="" />
      <button
        class="schema"
        type="button"
        onclick={schemaUmschalten}
        aria-label={dunkel ? 'Helle Darstellung' : 'Dunkle Darstellung'}
      >
        {dunkel ? '☀' : '☾'}
      </button>
    </div>

    {#if stand.belegungen === null && !stand.laedt}
      <!-- Offen sagen, statt zu raten: Eine stumme Anzeige sähe aus wie „alles
           frei" und wäre genau die Verwechslung, die FR-022 ausschließt. -->
      <p class="kein-stand" role="status">
        Gerade ist keine Auskunft über den Reservierungsstand möglich. Die Maschinen stehen unten,
        aber ohne Verfügbarkeit — bitte im Reservierungskalender in Vereinsflieger nachsehen.
      </p>
    {/if}

    {#each gruppen as gruppe (gruppe.titel)}
      {#if gruppe.maschinen.length > 0}
        <section>
          <h2>
            <span>{gruppe.titel}</span>
            <span class="zaehler">{gruppe.maschinen.length}</span>
          </h2>

          <div class="raster">
            {#each gruppe.maschinen as maschine (maschine.kennung)}
              <Maschinenkachel
                kennung={maschine.kennung}
                belegungen={stand.belegungen}
                jetzt={stand.jetzt}
                avatargroesse={74}
              />
            {/each}
          </div>
        </section>
      {/if}
    {/each}

    {#if standText}
      <p class="stand">
        {standText}{#if rueckfallHinweis}<span class="rueckfall"> · {rueckfallHinweis}</span>{/if}
      </p>
    {/if}

    <div class="legende">
      {#each legende as eintrag (eintrag.text)}
        <span class="eintrag">
          <span class="punkt" style:background={eintrag.farbe}></span>
          {eintrag.text}
        </span>
      {/each}
    </div>

    <p class="fussnote">
      Unverbindliche Anzeige. Verbindlich ist der Reservierungskalender in Vereinsflieger.
    </p>
  </main>
</div>

<style>
  .aussen {
    --bg: #ffffff;
    --aussen: #eceef1;
    --text: #1b2027;
    --avatarflaeche: #ffffff;

    background: var(--aussen);
    color: var(--text);
    min-height: 100vh;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  }

  .aussen.dunkel {
    --bg: #14181d;
    --aussen: #0c0f12;
    --text: #e8ecf1;
    --avatarflaeche: #1d232a;
  }

  main {
    max-width: 430px;
    margin: 0 auto;
    background: var(--bg);
    border-left: 1px solid rgba(127, 127, 127, 0.18);
    border-right: 1px solid rgba(127, 127, 127, 0.18);
    min-height: 100vh;
    padding-bottom: 24px;
  }

  .splash {
    position: relative;
  }

  .splash img {
    width: 100%;
    height: auto;
    display: block;
  }

  .schema {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.5);
    background: rgba(0, 0, 0, 0.35);
    backdrop-filter: blur(4px);
    color: #fff;
    font-size: 15px;
    cursor: pointer;
    line-height: 1;
  }

  section {
    padding: 16px 16px 0;
  }

  h2 {
    display: flex;
    align-items: baseline;
    gap: 8px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    opacity: 0.5;
    margin: 0;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(127, 127, 127, 0.2);
  }

  .zaehler {
    font-size: 11px;
    opacity: 0.35;
    letter-spacing: 0;
  }

  .raster {
    display: flex;
    flex-wrap: wrap;
    gap: 16px 14px;
    padding-top: 16px;
  }

  .stand {
    padding: 16px 16px 0;
    margin: 0;
    font-size: 11.5px;
    opacity: 0.45;
    text-align: right;
  }

  .rueckfall {
    font-style: italic;
  }

  .kein-stand {
    margin: 16px 16px 0;
    padding: 12px 14px;
    border-radius: 10px;
    background: rgba(127, 127, 127, 0.09);
    font-size: 12.5px;
    line-height: 1.5;
  }

  .legende {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 14px;
    margin: 16px 16px 0;
    padding: 10px 12px;
    border-radius: 10px;
    background: rgba(127, 127, 127, 0.09);
  }

  .eintrag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11.5px;
    opacity: 0.75;
  }

  .punkt {
    width: 11px;
    height: 11px;
    border-radius: 50%;
  }

  .fussnote {
    margin: 16px 16px 0;
    font-size: 11.5px;
    line-height: 1.55;
    opacity: 0.45;
  }
</style>
