<script lang="ts">
  import {
    alsKurzdatumUhrzeit,
    alsUhrzeitKurz,
    gleicherTag,
    reservierungsVerweis,
    type Zeitfenster
  } from '@edsh-bucky/reservierung-core';

  /**
   * Das Reservieren-Sheet: der Übergang nach Vereinsflieger.
   *
   * Es bucht nichts. Es kann auch nichts buchen — diese Anwendung liest den
   * Reservierungskalender und schreibt nie hinein (Prinzip II). Was es tut,
   * ist zweierlei: Es nennt das Zeitfenster, das nach dem gerade angezeigten
   * Stand frei wäre, und es öffnet die Reservierungsmaske mit genau diesem
   * Fenster vorbelegt.
   *
   * Warum der Vorschlag **trotz** Vorbelegung als Text dasteht: Die
   * Parameter der Maske sind beobachtet, nicht zugesichert (research.md,
   * E-13). Fallen sie eines Tages weg, steht das Mitglied vor einem leeren
   * Formular — dann soll es den Vorschlag wenigstens abtippen können, statt
   * ihn erneut suchen zu müssen.
   *
   * Gerechnet wird hier nichts: Die Lücke kommt aus `zustandFuer`, die
   * Adresse aus `reservierungsVerweis` (Prinzip IV).
   */
  let {
    kennung,
    luecke,
    statussatz,
    schliessen
  }: {
    kennung: string;
    /** Der Vorschlag aus dem Kern, oder `null`, wenn keiner bleibt (Z-08). */
    luecke: Zeitfenster | null;
    /** Der Statussatz der Maschine — er tritt an die Stelle des Vorschlags. */
    statussatz: string;
    schliessen: () => void;
  } = $props();

  const von = $derived(luecke === null ? null : new Date(luecke.von));
  const bis = $derived(luecke === null ? null : new Date(luecke.bis));

  /**
   * Das Ende nennt seinen Tag nur, wenn es ein anderer ist. „Di., 25.08.,
   * 09:00" bis „Di., 25.08., 11:00" liest sich wie zwei Termine; in aller
   * Regel ist es einer.
   */
  const bisText = $derived(
    von === null || bis === null
      ? ''
      : gleicherTag(von, bis)
        ? alsUhrzeitKurz(bis)
        : alsKurzdatumUhrzeit(bis)
  );

  const verweis = $derived(reservierungsVerweis(kennung, luecke));

  /**
   * Der Fokus gehört ins Sheet, sobald es erscheint — sonst stünde er auf dem
   * Knopf dahinter, und die nächste Taste bediente etwas Verdecktes.
   */
  function anfangsfokus(element: HTMLElement) {
    element.focus();
  }

  function beiTaste(ereignis: KeyboardEvent) {
    if (ereignis.key === 'Escape') {
      ereignis.stopPropagation();
      schliessen();
    }
  }
</script>

<svelte:window onkeydown={beiTaste} />

<!--
  Das Overlay ist eine echte Schaltfläche, kein `div` mit Klickhandler: Wer
  mit der Tastatur unterwegs ist, findet so einen Weg heraus, der nicht nur
  Escape heißt.
-->
<button class="overlay" type="button" aria-label="Schließen" onclick={schliessen}></button>

<div class="halter">
  <div
    class="sheet"
    role="dialog"
    aria-modal="true"
    aria-label="{kennung} reservieren"
    tabindex="-1"
    use:anfangsfokus
  >
    <div class="grabber" aria-hidden="true"></div>

    <div class="kopf">
      <h2>{kennung} reservieren</h2>
      <button class="abbrechen" type="button" onclick={schliessen}>Abbrechen</button>
    </div>

    {#if von === null || bis === null}
      <!--
        Z-08: Kein Fenster, also keine Felder. Ein erfundener Vorschlag wäre
        hier der schlimmere Fehler — er sähe aus wie eine Auskunft.
      -->
      <p class="hinweis">{statussatz}</p>
    {:else}
      <p class="hinweis">
        Vorschlag aus der nächsten freien Lücke — reserviert wird in Vereinsflieger.
      </p>

      <div class="felder">
        <div class="feld">
          <span class="marke">Von</span>
          <span class="wert">{alsKurzdatumUhrzeit(von)}</span>
        </div>
        <div class="feld">
          <span class="marke">Bis</span>
          <span class="wert">{bisText}</span>
        </div>
      </div>
    {/if}

    <a class="weiter" href={verweis} rel="noopener noreferrer" target="_blank">
      In Vereinsflieger reservieren ↗
    </a>

    <p class="fuss">
      Gebucht wird dort — Anmeldung nötig. Diese Seite ändert in Vereinsflieger nichts.
    </p>
  </div>
</div>

<style>
  /*
    Overlay und Sheet liegen über allem, auch über der klebenden Aktionsleiste,
    aus der das Sheet kommt.
  */
  .overlay {
    position: fixed;
    z-index: 8;
    inset: 0;
    border: 0;
    background: rgba(0, 0, 0, 0.42);
    animation: einblenden 0.2s;
    cursor: pointer;
  }

  .halter {
    position: fixed;
    z-index: 9;
    right: 0;
    bottom: 0;
    left: 0;
    display: flex;
    justify-content: center;
    pointer-events: none;
  }

  .sheet {
    box-sizing: border-box;
    width: 100%;
    max-width: 430px;
    max-height: 100dvh;
    padding: 8px 18px 22px;
    border-radius: 18px 18px 0 0;
    background: var(--bg, #fff);
    color: var(--text, #1b2027);
    box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.25);
    overflow-y: auto;
    overscroll-behavior: contain;
    pointer-events: auto;
    animation: hoch 0.3s cubic-bezier(0.22, 0.7, 0.3, 1);
  }

  .grabber {
    width: 38px;
    height: 4px;
    margin: 0 auto 14px;
    border-radius: 2px;
    background: rgba(127, 127, 127, 0.4);
  }

  .kopf {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
  }

  .kopf h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 650;
    line-height: 1.3;
  }

  .abbrechen {
    flex: none;
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    font-size: 13px;
    opacity: 0.5;
    cursor: pointer;
  }

  .hinweis {
    margin: 10px 0 0;
    font-size: 12.5px;
    opacity: 0.55;
    text-wrap: pretty;
  }

  .felder {
    display: flex;
    gap: 10px;
    margin-top: 14px;
  }

  .feld {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
    padding: 11px 12px;
    border: 1px solid rgba(127, 127, 127, 0.28);
    border-radius: 10px;
  }

  .marke {
    font-size: 10.5px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    opacity: 0.45;
  }

  .wert {
    font-size: 15px;
    font-weight: 600;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }

  /* Das Tap-Ziel des ganzen Wegs -- entsprechend groß (FR-017). */
  .weiter {
    display: block;
    box-sizing: border-box;
    min-height: 44px;
    margin-top: 18px;
    padding: 14px;
    border-radius: 10px;
    background: #1f4e79;
    color: #fff;
    font-size: 14.5px;
    font-weight: 650;
    text-align: center;
    text-decoration: none;
  }

  .fuss {
    margin: 10px 0 0;
    font-size: 11.5px;
    opacity: 0.45;
    text-wrap: pretty;
  }

  @keyframes einblenden {
    from {
      opacity: 0;
    }
  }

  @keyframes hoch {
    from {
      transform: translateY(100%);
    }
  }

  /*
    Wer Bewegung abbestellt hat, meint auch diese. Das Sheet erscheint dann
    ohne Fahrt -- es ist eine Verzierung, keine Auskunft.
  */
  @media (prefers-reduced-motion: reduce) {
    .overlay,
    .sheet {
      animation: none;
    }
  }
</style>
