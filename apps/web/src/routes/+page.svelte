<script lang="ts">
  import { onMount, tick } from 'svelte';
  import {
    alsKurzdatumUhrzeit,
    alsRueckfallHinweis,
    kategorieFuer,
    ortstag,
    sonnenzeitenFuerTag,
    STAMMKENNUNGEN
  } from '@edsh-bucky/reservierung-core';
  import Flugzeugmenue from '$lib/components/Flugzeugmenue.svelte';
  import Legende from '$lib/components/Legende.svelte';
  import Maschinenkachel from '$lib/components/Maschinenkachel.svelte';
  import Skelettkachel from '$lib/components/Skelettkachel.svelte';
  import { farbschema } from '$lib/farbschema.svelte.js';
  import {
    istFavorit,
    ladeFavoriten,
    sichereFavoriten,
    umschalten as favoritUmgeschaltet
  } from '$lib/flotte/favoriten.js';
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

  const dunkel = $derived(farbschema.dunkel);

  /**
   * Die Sonnenzeiten des heutigen Ortstages — oder nichts.
   *
   * `null` ist hier kein Ausfall, sondern der vorgesehene Normalfall am Rand:
   * Der abgelegte Satz deckt acht Tage ab; hat der Abruf-Worker noch nie
   * gelaufen oder war der Wetterdienst nicht erreichbar, gibt es ihn gar
   * nicht. Dann entfallen allein die beiden Sonnenmarker und die
   * Hell/Dunkel-Kante fällt auf 21:00/06:00 zurück (E-15, T-06a). Eine
   * Aussage über Verfügbarkeit hängt daran nie.
   */
  const sonnenzeiten = $derived(sonnenzeitenFuerTag(stand.sonnenzeiten, ortstag(stand.jetzt)));


  /** Kennzeichen des Flugzeugs, dessen Menü offen steht — oder nichts. */
  let offen = $state<string | undefined>(undefined);

  /**
   * Die Kacheln als Anker: Das Menü richtet sich an ihnen aus, und beim
   * Schließen bekommt der Fokus den Weg zurück. Ohne das landet ein
   * Tastaturnutzer nach Escape am Seitenanfang.
   */
  const kacheln: Record<string, HTMLButtonElement | undefined> = {};

  /**
   * Wo zuletzt getippt oder geklickt wurde — in Seitenkoordinaten, nicht in
   * Fensterkoordinaten.
   *
   * Ein Kontextmenü gehört dorthin, wo der Finger ist. An der Kachel
   * ausgerichtet stand es weit rechts vom Berührungspunkt und ließ den Nutzer
   * zweimal greifen. Gespeichert wird die Stelle **auf der Seite**: Beim
   * Scrollen soll das Menü mit der Kachel wandern und nicht auf dem Schirm
   * kleben bleiben.
   */
  let zeiger = $state<{ seiteX: number; seiteY: number } | undefined>(undefined);

  function umschalten(kennung: string, ereignis: MouseEvent) {
    // `detail === 0` heißt: mit der Tastatur ausgelöst. Dann sind clientX und
    // clientY beide 0 — die linke obere Ecke des Fensters ist aber kein Ort,
    // an dem jemand etwas erwartet. In diesem Fall bleibt die Kachel der Anker.
    zeiger =
      ereignis.detail > 0
        ? { seiteX: ereignis.clientX + window.scrollX, seiteY: ereignis.clientY + window.scrollY }
        : undefined;
    offen = offen === kennung ? undefined : kennung;
  }

  function schliessen(zurueckZu?: string) {
    offen = undefined;
    zeiger = undefined;
    if (zurueckZu) kacheln[zurueckZu]?.focus();
  }

  /**
   * Die gemerkten Maschinen — `null`, solange nichts geladen ist, und auch
   * dann, wenn auf diesem Gerät noch nie etwas gemerkt wurde.
   *
   * Beides sieht gleich aus, und das ist richtig so: Vor `onMount` gibt es
   * keinen `localStorage`, und eine Favoritenreihe, die beim ersten Bild noch
   * fehlt und dann erscheint, springt weniger als eine, die erscheint und
   * wieder verschwindet.
   */
  let favoriten = $state<string[] | null>(null);

  /**
   * Setzt oder entfernt eine Markierung.
   *
   * Danach schließt das Menü, denn die Kachel darunter wandert: aus ihrer
   * Gruppe nach oben oder zurück. Ein Menü, das an einer verschwindenden
   * Kachel hängt, stünde im Nichts. Der Fokus geht erst nach dem Umbau
   * zurück — die Kachel unter diesem Kennzeichen ist dann eine andere.
   */
  async function lieblingUmschalten(kennung: string) {
    const neu = favoritUmgeschaltet(favoriten ?? [], kennung);
    favoriten = neu;
    sichereFavoriten(neu);
    offen = undefined;
    zeiger = undefined;
    await tick();
    kacheln[kennung]?.focus();
  }

  function beiTaste(ereignis: KeyboardEvent) {
    if (ereignis.key === 'Escape' && offen) schliessen(offen);
  }

  onMount(() => {
    farbschema.laden();
    favoriten = ladeFavoriten();

    void stand.starten();
    return () => stand.beenden();
  });

  function schemaUmschalten() {
    farbschema.umschalten();
  }

  /**
   * Solange noch nichts da ist, steht die Struktur trotzdem: Die Stammliste
   * kommt aus dem Kern und ist auch die Grundlage der Antwort von
   * `/api/flotte` — dieselbe Wahrheit, nur eine Millisekunde früher. Dadurch
   * springt beim Eintreffen der Daten nichts, es füllt sich nur.
   */
  const skelett = STAMMKENNUNGEN.map((kennung) => ({ kennung, kategorie: kategorieFuer(kennung) }));

  const maschinen = $derived(stand.flotte.length > 0 ? stand.flotte : skelett);

  const laedtNoch = $derived(stand.laedt && stand.abgerufenAm === null);

  /**
   * Die gemerkten Maschinen in der Reihenfolge, in der sie gemerkt wurden —
   * und nur die, die es auch gibt.
   *
   * Der Speicher darf ein Kennzeichen behalten, das gerade nicht in der
   * Flotte steht (etwa nach einem Verkauf): Gefiltert wird hier, damit eine
   * Merkliste einen vorübergehend fehlenden Eintrag übersteht, statt ihn beim
   * ersten Laden stillschweigend zu verlieren.
   */
  const favoritenmaschinen = $derived(
    (favoriten ?? [])
      .map((kennung) => maschinen.find((m) => m.kennung === kennung))
      .filter((m) => m !== undefined)
  );

  const gruppen = $derived(
    [
      { titel: 'Motorflugzeuge & UL', kategorie: 'motor' as const },
      { titel: 'Segelflugzeuge', kategorie: 'segelflug' as const }
    ].map((gruppe) => ({
      titel: gruppe.titel,
      // Ein Favorit steht oben und **nicht** zusaetzlich in seiner Gruppe
      // (FR-007). Der Zaehler zaehlt deshalb, was die Gruppe zeigt, nicht was
      // der Verein besitzt -- sonst nennte er eine Zahl, die sich nicht
      // nachzaehlen laesst.
      maschinen: maschinen.filter(
        (m) => m.kategorie === gruppe.kategorie && !istFavorit(favoriten, m.kennung)
      )
    }))
  );

  const standText = $derived(
    stand.abgerufenAm === null
      ? null
      : `Stand ${alsKurzdatumUhrzeit(new Date(stand.abgerufenAm))}`
  );

  const rueckfallHinweis = $derived(
    stand.quelle === null ? null : alsRueckfallHinweis(stand.quelle)
  );

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
        <span class="rund">{dunkel ? '☀' : '☾'}</span>
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

    {#snippet maschinenknopf(maschine: { kennung: string }, avatargroesse: number)}
      {@const handlungen = handlungenFuer(maschine.kennung)}
      <div class="halter">
        {#if laedtNoch}
          <Skelettkachel groesse={avatargroesse} />
        {:else}
          <button
            class="tastenkachel"
            type="button"
            data-kennung={maschine.kennung}
            bind:this={kacheln[maschine.kennung]}
            aria-haspopup="menu"
            aria-expanded={offen === maschine.kennung}
            aria-label="{maschine.kennung} — Auswahl öffnen"
            onclick={(ereignis) => umschalten(maschine.kennung, ereignis)}
          >
            <Maschinenkachel
              kennung={maschine.kennung}
              belegungen={stand.belegungen}
              jetzt={stand.jetzt}
              {sonnenzeiten}
              {avatargroesse}
            />
          </button>

          {#if offen === maschine.kennung}
            <Flugzeugmenue
              kennung={maschine.kennung}
              {handlungen}
              anker={kacheln[maschine.kennung]}
              {zeiger}
              favorit={istFavorit(favoriten, maschine.kennung)}
              favoritUmschalten={() => void lieblingUmschalten(maschine.kennung)}
              schliessen={() => schliessen()}
            />
          {/if}
        {/if}
      </div>
    {/snippet}

    <!--
      Die gemerkten Maschinen zuerst -- und nur, wenn es welche gibt. Ohne je
      gesetzten Favoriten erscheint hier gar nichts, nicht einmal eine leere
      Reihe (FR-007b): Eine Ueberschrift ueber einem leeren Streifen erklaerte
      eine Funktion, nach der niemand gefragt hat.
    -->
    {#if favoritenmaschinen.length > 0}
      <div class="oben">
        <div class="favoritenreihe">
          {#each favoritenmaschinen as maschine (maschine.kennung)}
            <div class="favorit">
              {@render maschinenknopf(maschine, 96)}
            </div>
          {/each}
        </div>

        {#if favoritenmaschinen.length <= 2}
          <div class="legende-daneben">
            <Legende spaltig />
          </div>
        {/if}
      </div>

      {#if favoritenmaschinen.length > 2}
        <div class="legende-darunter">
          <Legende />
        </div>
      {/if}
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
              {@render maschinenknopf(maschine, 74)}
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

    <!--
      Ohne Favoriten steht die Legende am Fuss, wo sie seit jeher steht. Gibt
      es eine Favoritenreihe, ist sie dort schon erklaert worden -- zweimal
      dieselbe Legende auf einer Seite laesst den Leser nach dem Unterschied
      suchen, den es nicht gibt.
    -->
    {#if favoritenmaschinen.length === 0}
      <div class="legende-unten">
        <Legende />
      </div>
    {/if}

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

  /*
    Sichtbar bleibt der 34er Kreis aus dem Handoff, getroffen wird eine Flaeche
    von 44 Pixeln (FR-017). Der Rahmen und die Milchglasscheibe muessen dafuer
    am inneren Kreis haengen -- ein Rahmen am Knopf selbst waere mitgewachsen.
  */
  .schema {
    position: absolute;
    top: 5px;
    right: 5px;
    width: 44px;
    height: 44px;
    padding: 0;
    border: none;
    background: none;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 15px;
    cursor: pointer;
    line-height: 1;
  }

  .schema .rund {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.5);
    background: rgba(0, 0, 0, 0.35);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
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

  /*
    Der Kopfbereich: die gemerkten Maschinen und -- solange es hoechstens zwei
    sind -- die Legende daneben. Bei dreien waere der Streifen rechts zu
    schmal; dann bekommt sie eine eigene Zeile darunter.
  */
  .oben {
    display: flex;
    gap: 18px;
    align-items: flex-start;
    padding: 16px 16px 0;
  }

  /*
    Umbruch, sobald es mehr sind, als nebeneinander passen: Bei 118 Pixeln je
    Kachel gehen in die 430er Spalte genau drei. Ohne Umbruch liefe die vierte
    aus der Seite hinaus -- und wer alle sechs Maschinen merkt, saehe die
    letzten drei nicht mehr.
  */
  .favoritenreihe {
    display: flex;
    flex-wrap: wrap;
    gap: 18px;
    align-items: flex-start;
  }

  .favorit {
    width: 118px;
  }

  .legende-daneben {
    flex: 1;
    align-self: flex-end;
    min-width: 0;
  }

  .legende-darunter,
  .legende-unten {
    margin: 16px 16px 0;
  }

  .fussnote {
    margin: 16px 16px 0;
    font-size: 11.5px;
    line-height: 1.55;
    opacity: 0.45;
  }
</style>
