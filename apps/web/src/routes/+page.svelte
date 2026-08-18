<script lang="ts">
  import { onMount } from 'svelte';
  import {
    alsKurzdatumUhrzeit,
    alsRueckfallHinweis,
    kategorieFuer,
    STAMMLISTE
  } from '@edsh-bucky/reservierung-core';
  import Flugzeugmenue from '$lib/components/Flugzeugmenue.svelte';
  import Maschinenkachel from '$lib/components/Maschinenkachel.svelte';
  import Skelettkachel from '$lib/components/Skelettkachel.svelte';
  import { FARBEN } from '$lib/flotte/farben.js';
  import { handlungenFuer } from '$lib/flotte/handlungen.js';
  import { Flottenstand } from '$lib/flotte/stand.svelte.js';

  /**
   * Der Flugzeugpark — die Startseite.
   *
   * Sie ist zuerst eine Übersicht über die **Flugzeuge**, nicht über die
   * Reservierungen: Wer die App öffnet, hat in aller Regel eine bestimmte
   * Maschine im Sinn und entscheidet erst danach, was er mit ihr tun will.
   * Dass die Belegung am Ring gleich mit ablesbar ist, ist die angenehme
   * Nebenwirkung — deshalb führt ein Tipp auf eine Maschine nicht zwingend
   * in die Reservierung, sondern zu dem, was diese Maschine hergibt
   * (`handlungenFuer`). Heute ist das nur bei der D-EELK mehr als eines;
   * künftige Fähigkeiten kommen dort dazu, ohne diese Seite anzufassen.
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

  /** Kennzeichen des Flugzeugs, dessen Menü offen steht — oder nichts. */
  let offen = $state<string | undefined>(undefined);

  /**
   * Die Kacheln als Anker: Das Menü richtet sich an ihnen aus, und beim
   * Schließen bekommt der Fokus den Weg zurück. Ohne das landet ein
   * Tastaturnutzer nach Escape am Seitenanfang.
   */
  const kacheln: Record<string, HTMLButtonElement | undefined> = {};

  function umschalten(kennung: string) {
    offen = offen === kennung ? undefined : kennung;
  }

  function schliessen(zurueckZu?: string) {
    offen = undefined;
    if (zurueckZu) kacheln[zurueckZu]?.focus();
  }

  function beiTaste(ereignis: KeyboardEvent) {
    if (ereignis.key === 'Escape' && offen) schliessen(offen);
  }

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

  /**
   * Solange noch nichts da ist, steht die Struktur trotzdem: Die Stammliste
   * kommt aus dem Kern und ist auch die Grundlage der Antwort von
   * `/api/flotte` — dieselbe Wahrheit, nur eine Millisekunde früher. Dadurch
   * springt beim Eintreffen der Daten nichts, es füllt sich nur.
   */
  const skelett = STAMMLISTE.map((kennung) => ({ kennung, kategorie: kategorieFuer(kennung) }));

  const maschinen = $derived(stand.flotte.length > 0 ? stand.flotte : skelett);

  const laedtNoch = $derived(stand.laedt && stand.abgerufenAm === null);

  const gruppen = $derived([
    { titel: 'Motorflugzeuge & UL', maschinen: maschinen.filter((m) => m.kategorie === 'motor') },
    { titel: 'Segelflugzeuge', maschinen: maschinen.filter((m) => m.kategorie === 'segelflug') }
  ]);

  const standText = $derived(
    stand.abgerufenAm === null
      ? null
      : `Stand ${alsKurzdatumUhrzeit(new Date(stand.abgerufenAm))}`
  );

  const rueckfallHinweis = $derived(
    stand.quelle === null ? null : alsRueckfallHinweis(stand.quelle)
  );

  /**
   * Die drei Zustände, die eine Aussage treffen. Der dunkle Nachtanteil des
   * Rings steht bewusst **nicht** dabei: Er ist keine Verfügbarkeitsaussage,
   * sondern Beiwerk zur Orientierung auf der Uhr — und in einer Legende, die
   * sonst nur Status erklärt, sähe er wie ein vierter Status aus.
   */
  const legende = [
    { farbe: FARBEN.frei, text: 'frei' },
    { farbe: FARBEN.belegt, text: 'belegt' },
    { farbe: FARBEN.sperreFlaeche, text: 'gesperrt' }
  ];
</script>

<svelte:head>
  <title>Bucky Highfly</title>
  <meta
    name="description"
    content="Der Flugzeugpark des Luftsportvereins auf einen Blick — mit der Belegung gleich dazu."
  />
</svelte:head>

<svelte:window onkeydown={beiTaste} />

<div class="aussen" class:dunkel>
  <main>
    <h1 class="unsichtbar">Bucky Highfly</h1>
    <div class="splash">
      <img
        class="splashbild"
        src="/bucky-splash.png"
        alt="Bucky steht auf dem Vereinsgelände vor dem Vereinsheim des Luftsportvereins Backnang-Heiningen und fragt: „Hey Pilot, was darf’s sein?“"
      />
      <button
        class="schema"
        type="button"
        onclick={schemaUmschalten}
        aria-label={dunkel ? 'Helle Darstellung' : 'Dunkle Darstellung'}
      >
        {dunkel ? '☀' : '☾'}
      </button>
    </div>

    <!--
      Ein Tipp neben ein offenes Menue schliesst es. Das Feld liegt nur dann
      ueber der Seite, wenn ueberhaupt etwas offen ist.
    -->
    {#if offen}
      <div
        class="schliessfeld"
        role="presentation"
        onclick={() => schliessen()}
        onkeydown={() => {}}
      ></div>
    {/if}

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
              {@const handlungen = handlungenFuer(maschine.kennung)}
              <div class="halter">
                {#if laedtNoch}
                  <Skelettkachel groesse={74} />
                {:else if handlungen.length === 1}
                  <!-- Genau eine Fähigkeit: Ein Menü mit einem Eintrag wäre ein
                       Klick, der nichts entscheidet — also direkt dorthin. -->
                  <a
                    class="tastenkachel"
                    data-kennung={maschine.kennung}
                    href={handlungen[0]?.ziel}
                  >
                    <Maschinenkachel
                      kennung={maschine.kennung}
                      belegungen={stand.belegungen}
                      jetzt={stand.jetzt}
                      avatargroesse={74}
                    />
                  </a>
                {:else}
                  <button
                    class="tastenkachel"
                    type="button"
                    data-kennung={maschine.kennung}
                    bind:this={kacheln[maschine.kennung]}
                    aria-haspopup="menu"
                    aria-expanded={offen === maschine.kennung}
                    aria-label="{maschine.kennung} — Auswahl öffnen"
                    onclick={() => umschalten(maschine.kennung)}
                  >
                    <Maschinenkachel
                      kennung={maschine.kennung}
                      belegungen={stand.belegungen}
                      jetzt={stand.jetzt}
                      avatargroesse={74}
                    />
                  </button>

                  {#if offen === maschine.kennung}
                    <Flugzeugmenue
                      kennung={maschine.kennung}
                      {handlungen}
                      anker={kacheln[maschine.kennung]}
                      schliessen={() => schliessen()}
                    />
                  {/if}
                {/if}
              </div>
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

  /*
    Drei Maschinen je Reihe, und zwar unabhaengig von der Fensterbreite. Mit
    festen Kachelbreiten und Umbruch entschied darueber die Rechnung
    3 x 118 px + 2 x 14 px Abstand gegen den verfuegbaren Platz -- die ging
    knapp auf, bis die Schaltflaeche ringsum Luft bekam, und dann brach die
    dritte Kachel um. Ein Raster mit drei gleichen Spalten teilt den Platz,
    statt ihn zu beanspruchen.
  */
  .raster {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px 6px;
    padding-top: 16px;
  }

  .halter {
    position: relative;
    min-width: 0;
  }

  /*
    Die Kachel ist die Schaltflaeche — Ring, Kennzeichen und Satz gehoeren
    zusammen und sind gemeinsam das Ziel. Ein Tippziel von 118 x 130 Pixeln
    trifft auch, wer im Stehen am Flugplatz auf sein Telefon schaut.
  */
  .tastenkachel {
    display: block;
    width: 100%;
    padding: 6px 2px;
    border: none;
    border-radius: 12px;
    background: none;
    color: inherit;
    font: inherit;
    text-align: inherit;
    text-decoration: none;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .tastenkachel:hover {
    background: rgba(127, 127, 127, 0.1);
  }

  .tastenkachel:focus-visible {
    outline: 3px solid #06c;
    outline-offset: 1px;
  }

  .schliessfeld {
    position: fixed;
    inset: 0;
    z-index: 1;
  }

  /*
    Die Ueberschrift steht fuer Vorleser und Suchmaschinen da; sichtbar traegt
    das Splash-Bild den Titel besser, als eine Zeile Text es koennte.
  */
  .unsichtbar {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
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
