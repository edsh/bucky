<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { base } from '$app/paths';
  import {
    alsBelegungsart,
    alsDauer,
    alsKurzdatumUhrzeit,
    alsRueckfallHinweis,
    alsStatussatz,
    alsTagesdatum,
    alsTageszeile,
    alsTagUndMonat,
    alsWochentagKurz,
    alsZusatzzeile,
    kommendeBelegungen,
    tagesbelegungen,
    wochenbalken,
    zeitpunktFuerMinute,
    zustandFuer,
    type Statuswert
  } from '@edsh-bucky/reservierung-core';
  import TagesuhrAvatar from '$lib/components/TagesuhrAvatar.svelte';
  import Tagesbalken from '$lib/components/Tagesbalken.svelte';
  import Wochenraster from '$lib/components/Wochenraster.svelte';
  import { FARBEN, flaecheFuer, statusfarbe } from '$lib/flotte/farben.js';
  import { darstellungFuer } from '$lib/flotte/darstellung.js';
  import { farbschema } from '$lib/farbschema.svelte.js';
  import { Flottenstand } from '$lib/flotte/stand.svelte.js';

  /**
   * Die Detailansicht einer Maschine.
   *
   * Der Flugzeugpark beantwortet „welche kann ich jetzt nehmen?". Diese Seite
   * beantwortet die Frage danach: „und wann genau?" — mit dem heutigen
   * Balken, sieben Tagen und der Liste dessen, was eingetragen ist.
   *
   * Was hier **nicht** steht, ist so wichtig wie das, was hier steht: kein
   * Name, kein Sperrgrund, keine Kennzeichnung eigener Buchungen (FR-010,
   * E-11). Jeder Eintrag heißt „Reserviert" oder „Sperre". Bucky kennt keine
   * Nutzeridentität, und ein Verein ist kein Ort, an dem eine Webseite
   * ungefragt ausplaudert, wer wann fliegt.
   *
   * Gerechnet wird auch hier nichts: Segmente, Zeilen und Sätze kommen aus
   * dem Kern (Prinzip IV), damit Kachel und Detailseite nie verschiedene
   * Auskünfte über dieselbe Maschine geben.
   */
  const stand = new Flottenstand();

  const kennung = $derived((page.params.kennung ?? '').toUpperCase());

  /** Beim Öffnen stets „7 Tage" — der Reiter ist keine Einstellung, sondern ein Blick. */
  let ansicht = $state<'liste' | 'woche'>('liste');

  onMount(() => {
    farbschema.laden();
    void stand.starten();
    return () => stand.beenden();
  });

  const dunkel = $derived(farbschema.dunkel);

  const bekannt = $derived(stand.flotte.some((m) => m.kennung === kennung));
  const unbekannt = $derived(!bekannt && !stand.laedt && stand.flotte.length > 0);

  const zustand = $derived(
    stand.belegungen === null ? null : zustandFuer(stand.belegungen, kennung, stand.jetzt)
  );
  const farbe = $derived(zustand === null ? null : statusfarbe(zustand));
  const satz = $derived(
    zustand === null ? 'Gerade keine Auskunft möglich' : alsStatussatz(zustand, stand.jetzt)
  );
  const zusatz = $derived(zustand === null ? null : alsZusatzzeile(zustand, stand.jetzt));

  /**
   * Das Statuswort über dem Satz. „Heute noch frei" statt schlicht „Frei",
   * solange heute noch etwas kommt — der Satz darunter nennt dann die
   * Uhrzeit, das Wort darüber die Einordnung.
   */
  const STATUSWORT: Record<Statuswert, string> = {
    frei: 'Frei',
    bald: 'Heute noch frei',
    belegt: 'Belegt',
    sperre: 'Gesperrt'
  };
  const statuswort = $derived(zustand === null ? 'Kein Stand' : STATUSWORT[zustand.status]);

  const darstellung = $derived(darstellungFuer(kennung));

  const standText = $derived(
    stand.abgerufenAm === null ? null : `Stand ${alsKurzdatumUhrzeit(new Date(stand.abgerufenAm))}`
  );
  const rueckfallHinweis = $derived(
    stand.quelle === null ? null : alsRueckfallHinweis(stand.quelle)
  );

  /**
   * Die sieben Zeilen der Liste. Sie holen ihre Segmente aus derselben
   * Funktion wie das Wochenraster daneben — zwei getrennte Rechnungen
   * könnten auseinanderlaufen, und wer zwischen beiden umschaltet, sähe zwei
   * verschiedene Wochen.
   */
  const zeilen = $derived.by(() => {
    const belegungen = stand.belegungen;
    if (belegungen === null) return [];

    return wochenbalken(belegungen, kennung, stand.jetzt).map((tag) => {
      const mittag = zeitpunktFuerMinute(tag.tag, 12 * 60);
      return {
        tag: tag.tag,
        wochentag: alsWochentagKurz(mittag),
        datum: alsTagUndMonat(mittag),
        segmente: tag.segmente,
        text: alsTageszeile(tagesbelegungen(belegungen, kennung, tag.tag))
      };
    });
  });

  const kommend = $derived(
    stand.belegungen === null ? [] : kommendeBelegungen(stand.belegungen, kennung, stand.jetzt)
  );


  /**
   * Der vier Pixel schmale Farbstreifen links am Eintrag.
   *
   * Hier steht bewusst eine glatte Farbe statt des Absperrbands: Ein
   * Diagonalmuster mit zwölf Pixeln Wiederholung ergibt auf vier Pixeln
   * Breite kein erkennbares Muster, sondern Grieß. Der Handoff nennt für
   * diesen Streifen ohnehin einen eigenen Ton.
   */
  function streifenfarbe(art: 'reservierung' | 'sperre'): string {
    return art === 'sperre' ? FARBEN.sperreText : FARBEN.belegt;
  }

  function textfarbeFuer(text: string): string | undefined {
    if (text === 'frei') return FARBEN.frei;
    if (text === 'gesperrt') return FARBEN.sperreText;
    return undefined;
  }

  function alsProzent(anteil: number): string {
    return `${anteil * 100}%`;
  }

  /** Der Kopf eines Eintrags in „Kommende Belegungen": Tag und Spanne. */
  function eintragszeile(vonIso: string, vonUhr: string, bisUhr: string, ganztags: boolean) {
    const tagestext = alsTagesdatum(new Date(vonIso));
    return ganztags ? `${tagestext} · ganztägig` : `${tagestext} · ${vonUhr}–${bisUhr}`;
  }
</script>

<svelte:head>
  <title>{kennung} · Bucky Highfly</title>
</svelte:head>

<div class="aussen" class:dunkel>
  <main>
    <header class="kopf">
      <a class="zurueck" href="{base}/" aria-label="Zurück zum Flugzeugpark">‹</a>

      <div class="kopfavatar">
        <TagesuhrAvatar
          {kennung}
          belegungen={stand.belegungen}
          jetzt={stand.jetzt}
          groesse={40}
          statusfarbe={farbe}
          gesperrt={zustand?.status === 'sperre'}
        />
      </div>

      <div class="kopftext">
        <h1>{kennung}</h1>
        {#if darstellung.typ}
          <p class="typ">{darstellung.typ}</p>
        {/if}
      </div>

      <button
        class="schema"
        type="button"
        onclick={() => farbschema.umschalten()}
        aria-label={dunkel ? 'Helle Darstellung' : 'Dunkle Darstellung'}
      >
        {dunkel ? '☀' : '☾'}
      </button>
    </header>

    {#if unbekannt}
      <p class="hinweis" role="status">
        Diese Kennung gehört nicht zur Vereinsflotte. Der <a href="{base}/">Flugzeugpark</a> zeigt,
        welche Maschinen es gibt.
      </p>
    {:else}
      <section class="statusblock">
        <p class="statuswort">
          <span
            class="punkt"
            class:pulst={zustand !== null}
            style:background={farbe ?? 'rgba(127,127,127,.45)'}
          ></span>
          {statuswort}
        </p>
        <p class="satz" style:color={farbe ?? 'inherit'}>{satz}</p>
        {#if zusatz && !satz.includes(zusatz)}
          <p class="danach">{zusatz}</p>
        {/if}
        {#if standText}
          <p class="stand">
            {standText}{#if rueckfallHinweis}<span> · {rueckfallHinweis}</span>{/if}
          </p>
        {/if}
      </section>

      <Tagesbalken {kennung} belegungen={stand.belegungen} jetzt={stand.jetzt} />

      <div class="umschalter" role="tablist" aria-label="Zeitraum">
        <button
          type="button"
          role="tab"
          aria-selected={ansicht === 'liste'}
          class:aktiv={ansicht === 'liste'}
          onclick={() => (ansicht = 'liste')}>7 Tage</button
        >
        <button
          type="button"
          role="tab"
          aria-selected={ansicht === 'woche'}
          class:aktiv={ansicht === 'woche'}
          onclick={() => (ansicht = 'woche')}>Woche</button
        >
      </div>

      <section class="zeitraum">
        {#if stand.belegungen === null}
          <p class="leer">Keine Auskunft über die kommenden Tage möglich.</p>
        {:else if ansicht === 'liste'}
          <ul class="tage">
            {#each zeilen as zeile (zeile.tag)}
              <li>
                <span class="tagname"><b>{zeile.wochentag}</b> {zeile.datum}</span>
                <span class="tagbalken">
                  {#each zeile.segmente as segment, i (i)}
                    <span
                      class="segment"
                      style:left={alsProzent(segment.von)}
                      style:width={alsProzent(segment.bis - segment.von)}
                      style:background={flaecheFuer(segment.art)}
                    ></span>
                  {/each}
                </span>
                <span class="tagtext" style:color={textfarbeFuer(zeile.text)}>{zeile.text}</span>
              </li>
            {/each}
          </ul>
        {:else}
          <Wochenraster {kennung} belegungen={stand.belegungen} jetzt={stand.jetzt} />
        {/if}
      </section>

      <section class="kommende">
        <h2>Kommende Belegungen</h2>
        {#if stand.belegungen === null}
          <p class="leer">Keine Auskunft möglich.</p>
        {:else if kommend.length === 0}
          <p class="leer">Nichts eingetragen in den nächsten sieben Tagen.</p>
        {:else}
          <ul>
            {#each kommend as eintrag (eintrag.vonIso + eintrag.art)}
              <li>
                <span class="streifen" style:background={streifenfarbe(eintrag.art)}></span>
                <span class="wann">
                  <span class="spanne"
                    >{eintragszeile(
                      eintrag.vonIso,
                      eintrag.vonUhr,
                      eintrag.bisUhr,
                      eintrag.ganztags
                    )}</span
                  >
                  <span class="wer">{alsBelegungsart(eintrag.art)}</span>
                </span>
                <span class="dauer">{alsDauer(eintrag.vonIso, eintrag.bisIso)}</span>
              </li>
            {/each}
          </ul>
        {/if}
      </section>
    {/if}

    <p class="fussnote">
      Unverbindliche Anzeige. Verbindlich ist der Reservierungskalender in Vereinsflieger. Namen
      werden hier grundsätzlich nicht angezeigt.
    </p>

    {#if darstellung.pohPfad}
      <div class="aktionen">
        <a class="poh" href="{base}{darstellung.pohPfad}">POH-Rechner</a>
      </div>
    {/if}
  </main>
</div>

<style>
  .aussen {
    --bg: #ffffff;
    --aussen: #eceef1;
    --text: #1b2027;
    --avatarflaeche: #ffffff;
    --balken: rgba(255, 255, 255, 0.86);

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
    --balken: rgba(20, 24, 29, 0.86);
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

  .kopf {
    position: sticky;
    top: 0;
    z-index: 3;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    background: var(--bg);
    border-bottom: 1px solid rgba(127, 127, 127, 0.18);
  }

  .zurueck {
    flex: none;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: rgba(127, 127, 127, 0.12);
    color: inherit;
    text-decoration: none;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    line-height: 1;
  }

  .kopfavatar {
    flex: none;
    display: flex;
  }

  .kopftext {
    flex: 1;
    min-width: 0;
  }

  h1 {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 0.02em;
  }

  .typ {
    margin: 1px 0 0;
    font-size: 11.5px;
    opacity: 0.5;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .schema {
    flex: none;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 50%;
    background: rgba(127, 127, 127, 0.12);
    color: inherit;
    font-size: 15px;
    cursor: pointer;
  }

  .statusblock {
    padding: 22px 16px 0;
  }

  .statuswort {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    opacity: 0.5;
  }

  .punkt {
    width: 9px;
    height: 9px;
    border-radius: 50%;
  }

  .punkt.pulst {
    animation: puls 2.4s ease-in-out infinite;
  }

  /*
    Der Punkt pulst, weil die Aussage lebt: Sie gilt fuer diesen Moment und
    rechnet minuetlich weiter. Wer die Seite offen liegen laesst, soll sehen,
    dass sie nicht eingefroren ist.
  */
  @keyframes puls {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.35;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .punkt.pulst {
      animation: none;
    }
  }

  .satz {
    margin: 8px 0 0;
    font-size: 27px;
    font-weight: 650;
    line-height: 1.25;
    letter-spacing: -0.01em;
    text-wrap: balance;
  }

  .danach {
    margin: 6px 0 0;
    font-size: 13px;
    opacity: 0.6;
  }

  .stand {
    margin: 8px 0 0;
    font-size: 12.5px;
    opacity: 0.5;
  }

  .hinweis {
    margin: 22px 16px 0;
    padding: 12px 14px;
    border-radius: 10px;
    background: rgba(127, 127, 127, 0.09);
    font-size: 12.5px;
    line-height: 1.5;
  }

  .hinweis a {
    color: inherit;
  }

  .umschalter {
    display: flex;
    gap: 3px;
    margin: 24px 16px 0;
    padding: 3px;
    border-radius: 10px;
    background: rgba(127, 127, 127, 0.12);
  }

  .umschalter button {
    flex: 1;
    padding: 7px 0;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: inherit;
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
  }

  .umschalter button.aktiv {
    background: var(--bg);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.14);
  }

  .zeitraum {
    padding: 0 16px;
  }

  .tage {
    list-style: none;
    margin: 6px 0 0;
    padding: 0;
  }

  .tage li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 0;
    border-bottom: 1px solid rgba(127, 127, 127, 0.14);
  }

  .tagname {
    flex: none;
    width: 56px;
    font-size: 12.5px;
  }

  .tagbalken {
    position: relative;
    flex: 1;
    min-width: 0;
    height: 14px;
    border-radius: 5px;
    background: rgba(127, 127, 127, 0.16);
  }

  .segment {
    position: absolute;
    top: 0;
    bottom: 0;
    border-radius: 5px;
  }

  .tagtext {
    flex: none;
    width: 112px;
    text-align: right;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11.5px;
  }

  .kommende {
    padding: 0 16px;
    margin-top: 26px;
  }

  .kommende h2 {
    margin: 0 0 6px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    opacity: 0.5;
  }

  .kommende ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .kommende li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 0;
    border-bottom: 1px solid rgba(127, 127, 127, 0.14);
  }

  .streifen {
    flex: none;
    width: 4px;
    align-self: stretch;
    border-radius: 2px;
  }

  .wann {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .spanne {
    font-size: 13.5px;
    font-weight: 600;
  }

  .wer {
    font-size: 12px;
    opacity: 0.55;
  }

  .dauer {
    flex: none;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11.5px;
    opacity: 0.45;
  }

  .leer {
    margin: 10px 0 0;
    font-size: 12.5px;
    opacity: 0.55;
  }

  .fussnote {
    margin: 24px 16px 0;
    font-size: 11.5px;
    line-height: 1.55;
    opacity: 0.45;
  }

  /*
    Die Aktionsleiste haengt am unteren Rand, weil sie dorthin gehoert, wo
    der Daumen ist. Der „Reservieren"-Knopf kommt in US4 daneben; bis dahin
    steht hier nur der POH-Verweis -- und auch nur bei den Maschinen, fuer
    die es einen Rechner gibt (FR-018).
  */
  .aktionen {
    position: sticky;
    bottom: 0;
    display: flex;
    gap: 10px;
    padding: 12px 16px 16px;
    margin-top: 24px;
    background: var(--balken);
    backdrop-filter: blur(8px);
    border-top: 1px solid rgba(127, 127, 127, 0.18);
  }

  .poh {
    padding: 11px 16px;
    border: 1px solid rgba(127, 127, 127, 0.3);
    border-radius: 10px;
    color: inherit;
    text-decoration: none;
    font-size: 13px;
    font-weight: 600;
  }
</style>
