<script lang="ts">
  import { base } from '$app/paths';

  /**
   * Startseite von Bucky. Sie rechnet nichts — sie fragt nur, worum es geht.
   *
   * Der Einstieg läuft bewusst über das **Flugzeug** und nicht über eine Liste
   * von Funktionen: Wer die App öffnet, hat in aller Regel eine bestimmte
   * Maschine im Sinn und sucht erst dann, was er mit ihr tun will. Deshalb
   * steht hier ein runder Avatar wie bei Personen in sozialen Netzen, und die
   * möglichen Handlungen erscheinen erst beim Antippen (Feature 043).
   */

  /**
   * Vorerst genau ein Flugzeug mit genau einer Handlung. Die Liste ist
   * trotzdem eine Liste, und die Handlung steht in einem Menü: Beides bekommt
   * demnächst einen zweiten Eintrag (Reservierung), und ein direkter Sprung
   * wäre dann wieder auszubauen (FR-008, FR-009).
   */
  const flugzeuge = [
    {
      kennzeichen: 'D-EELK',
      bild: `${base}/D-EELK_pixelart_192px.png`,
      handlungen: [{ name: 'POH-Rechner', ziel: `${base}/d-eelk/poh-rechner` }]
    }
  ];

  /** Kennzeichen des Flugzeugs, dessen Menü offen steht — oder nichts. */
  let offen = $state<string | undefined>(undefined);

  /**
   * Die Auslöser, um den Fokus beim Schließen dorthin zurückzugeben, wo er
   * herkam. Ohne das landet ein Tastaturnutzer nach Escape am Seitenanfang.
   */
  const auslöser: Record<string, HTMLButtonElement | undefined> = {};

  function umschalten(kennzeichen: string) {
    offen = offen === kennzeichen ? undefined : kennzeichen;
  }

  function schliessen(zurueckZum?: string) {
    offen = undefined;
    if (zurueckZum) auslöser[zurueckZum]?.focus();
  }

  /**
   * Setzt den Fokus auf den ersten Eintrag, sobald das Menü erscheint. Ohne das
   * bliebe er auf dem Avatar stehen, und der nächste Tastendruck schlösse das
   * eben geöffnete Menü wieder (FR-012).
   */
  function anfangsfokus(element: HTMLElement, ist: boolean) {
    if (ist) element.focus();
  }

  function beiTaste(ereignis: KeyboardEvent) {
    if (ereignis.key === 'Escape' && offen) {
      const war = offen;
      schliessen(war);
    }
  }
</script>

<svelte:head>
  <title>Bucky Highfly</title>
</svelte:head>

<svelte:window onkeydown={beiTaste} />

<main>
  <!--
    Der Splash traegt die Frage, auf die alles darunter die Antwort ist. Er
    steht auf derselben Seite wie die Auswahl: Ein vorgeschalteter Bildschirm,
    den man wegklicken muss, kostet einen Klick ohne Gegenwert (FR-003).
  -->
  <h1 class="unsichtbar">Bucky Highfly</h1>
  <img
    class="splash"
    src="{base}/bucky-start.gif"
    alt="Bucky steht auf einer Wiese neben einem Windsack und fragt: „Hi Pilot, was darf’s sein?“"
  />

  <!--
    Ein Klick neben ein offenes Menue schliesst es. Das Feld liegt nur dann
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

  <ul class="flugzeuge">
    {#each flugzeuge as flugzeug (flugzeug.kennzeichen)}
      <li>
        <div class="flugzeug">
          <button
            class="avatar"
            class:offen={offen === flugzeug.kennzeichen}
            bind:this={auslöser[flugzeug.kennzeichen]}
            aria-haspopup="menu"
            aria-expanded={offen === flugzeug.kennzeichen}
            aria-label="{flugzeug.kennzeichen} — Auswahl öffnen"
            onclick={() => umschalten(flugzeug.kennzeichen)}
          >
            <img src={flugzeug.bild} alt="" />
          </button>
          <span class="kennzeichen">{flugzeug.kennzeichen}</span>

          {#if offen === flugzeug.kennzeichen}
            <div class="menue" role="menu" aria-label="Was mit {flugzeug.kennzeichen} tun?">
              {#each flugzeug.handlungen as handlung, i (handlung.ziel)}
                <a role="menuitem" href={handlung.ziel} use:anfangsfokus={i === 0}>
                  {handlung.name}
                </a>
              {/each}
            </div>
          {/if}
        </div>
      </li>
    {/each}
  </ul>
</main>

<style>
  main {
    max-width: 48rem;
    margin: 0 auto;
    padding: 1rem;
    font-family: system-ui, sans-serif;
    line-height: 1.5;
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

  /*
    Der Splash zieht sich ueber den Innenabstand der Seite hinweg bis an den
    Rand: Ein weisser Streifen ringsum liesse ihn wie ein eingefuegtes Bild
    aussehen statt wie den Kopf der Seite. Der Abstand gilt weiter fuer alles
    andere, deshalb wird er hier nur oertlich zurueckgenommen.
  */
  .splash {
    display: block;
    width: calc(100% + 2rem);
    height: auto;
    margin: -1rem -1rem 0;
  }

  .flugzeuge {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
    margin: 1.25rem 0 0;
    padding: 0;
    list-style: none;
  }

  .flugzeug {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35rem;
  }

  /*
    Rund mit umlaufendem Rahmen wie ein Personenbild in sozialen Netzen. Der
    Rahmen ist heute neutral und bedeutet nichts; er ist als eigene Groesse
    angelegt, damit er spaeter einen Zustand tragen kann (FR-006).
  */
  .avatar {
    --rahmen: #b8c4d0;

    display: grid;
    place-items: center;
    width: 6rem;
    height: 6rem;
    padding: 0;
    border: 3px solid var(--rahmen);
    border-radius: 50%;
    background: #fff;
    cursor: pointer;
  }

  .avatar:hover {
    --rahmen: #7a8ea3;
  }

  .avatar.offen {
    --rahmen: #06c;
  }

  .avatar:focus-visible {
    outline: 3px solid #06c;
    outline-offset: 2px;
  }

  /*
    Das Flugzeug ist breit und flach: `contain` statt `cover`, sonst schnitte
    der Kreis Nase und Leitwerk ab. Ohne Weichzeichnen, damit die Pixelgrafik
    beim Vergroessern scharf bleibt.
  */
  .avatar img {
    width: 4.75rem;
    height: 4.75rem;
    object-fit: contain;
    image-rendering: pixelated;
  }

  .kennzeichen {
    font-weight: 700;
    letter-spacing: 0.03em;
  }

  /*
    Linksbuendig am Avatar statt unter ihm zentriert: Der erste Avatar steht am
    linken Seitenrand, ein mittig gehaengtes Menue ragte dort aus dem Fenster.
  */
  .menue {
    position: absolute;
    top: calc(100% + 0.4rem);
    left: 0;
    z-index: 2;
    display: flex;
    flex-direction: column;
    min-width: 11rem;
    border: 1px solid #ccc;
    border-radius: 0.5rem;
    background: #fff;
    box-shadow: 0 6px 18px rgb(0 0 0 / 18%);
  }

  .menue a {
    padding: 0.6rem 1rem;
    color: inherit;
    text-decoration: none;
  }

  .menue a:hover,
  .menue a:focus-visible {
    background: #eef4fb;
    outline: none;
  }

  .schliessfeld {
    position: fixed;
    inset: 0;
    z-index: 1;
  }
</style>
