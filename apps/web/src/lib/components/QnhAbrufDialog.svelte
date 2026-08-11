<script lang="ts">
  import {
    formatHectopascal,
    formatNumber,
    toQnh,
    type NumericRange
  } from '@edsh-bucky/deelk-poh-core';
  import { EDSH } from '$lib/weather/edsh.js';
  import { holeWetter, type WetterAbruf } from '$lib/weather/openMeteo.js';

  /**
   * Bestätigungsdialog für den Luftdruck aus dem Onlinedienst.
   *
   * Warum überhaupt ein Dialog — die Schnellwahl der Platzhöhe setzt ihren Wert
   * ja ohne Rückfrage: Die Platzhöhe ist eine feste, nachprüfbare Eigenschaft
   * des Platzes; der Luftdruck ist ein fremder, veränderlicher Modellwert. Nur
   * der zweite braucht eine Bestätigung — und die Aufklärung darüber, woher er
   * kommt (FR-003, FR-011).
   *
   * Gerechnet und gerundet wird hier **nicht**: Der übernehmbare Wert kommt
   * fertig aus dem Kern (Zusicherungen W-01, W-02).
   */
  let {
    bereich,
    uebernehmen
  }: {
    /** Der Bereich, den der Regler annehmen kann — aus dem Kern, nicht von hier. */
    bereich: NumericRange;
    /** Wird mit dem übernehmbaren Wert und seiner Herkunft gerufen. */
    uebernehmen: (qnhHpa: number, herkunft: { dienst: string; gueltigkeit: string }) => void;
  } = $props();

  type Zustand =
    | { art: 'laedt' }
    | { art: 'vorschau'; abruf: WetterAbruf; qnhHpa: number; settableQnhHpa: number }
    | { art: 'fehler'; meldung: string };

  let dialog: HTMLDialogElement;
  let zustand = $state<Zustand>({ art: 'laedt' });

  /**
   * Bricht einen laufenden Abruf ab. Deckt beides ab: die Zeitüberschreitung
   * und das Schließen des Dialogs, damit eine später eintreffende Antwort
   * nichts mehr verändert (FR-018, W-05).
   */
  let laufend: AbortController | undefined;

  const ZEITGRENZE_MS = 10_000;

  /** Ob der Wert überhaupt in den Regler passt (FR-007). */
  const uebernehmbar = $derived(
    zustand.art === 'vorschau' &&
      zustand.settableQnhHpa >= bereich.min &&
      zustand.settableQnhHpa <= bereich.max
  );

  async function abrufen(): Promise<void> {
    laufend?.abort();
    const eigener = new AbortController();
    laufend = eigener;
    zustand = { art: 'laedt' };

    // Zwei Anlässe, ein Signal: die Zeitgrenze und das Schließen des Dialogs.
    const zeitgrenze = AbortSignal.timeout(ZEITGRENZE_MS);
    const signal = AbortSignal.any([eigener.signal, zeitgrenze]);

    try {
      const abruf = await holeWetter(EDSH, signal);
      // Die Umrechnung macht der Kern. Die Höhe stammt aus derselben
      // Konstanten wie die Schnellwahl der Platzhöhe (W-06).
      const ergebnis = toQnh(abruf.stationPressureHpa, EDSH.elevationFt);
      if (eigener.signal.aborted) {
        return;
      }
      zustand = {
        art: 'vorschau',
        abruf,
        qnhHpa: ergebnis.qnhHpa,
        settableQnhHpa: ergebnis.settableQnhHpa
      };
    } catch (fehler) {
      if (eigener.signal.aborted) {
        // Der Dialog wurde geschlossen. Ein Fehlerbild aufzubauen, das niemand
        // mehr sieht, wäre bestenfalls wirkungslos.
        return;
      }
      zustand = {
        art: 'fehler',
        meldung:
          zeitgrenze.aborted && fehler instanceof Error
            ? 'Der Wetterdienst hat nicht rechtzeitig geantwortet.'
            : fehler instanceof Error
              ? fehler.message
              : 'Der Abruf ist fehlgeschlagen.'
      };
    }
  }

  /** Öffnet den Dialog und startet den Abruf sofort (FR-012). */
  export function oeffnen(): void {
    dialog.showModal();
    void abrufen();
  }

  function schliessen(): void {
    laufend?.abort();
    dialog.close();
  }

  function bestaetigen(): void {
    if (zustand.art !== 'vorschau' || !uebernehmbar) {
      return;
    }
    uebernehmen(zustand.settableQnhHpa, {
      dienst: zustand.abruf.dienst.name,
      gueltigkeit: zustand.abruf.gueltigkeit
    });
    schliessen();
  }

  /** Zeigt die Gültigkeit in Ortszeit, damit sie sich am Platz einordnen lässt. */
  function zeitText(iso: string): string {
    const zeit = new Date(iso.endsWith('Z') ? iso : `${iso}Z`);
    return zeit.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
</script>

<!--
  Ein natives <dialog> mit showModal(): Fokusführung, Esc und die
  Inaktivierung des Hintergrunds sind damit ohne Nachbau erfüllt (FR-008).
  `oncancel` fängt Esc ab, damit auch dieser Weg den Abruf abbricht.
-->
<dialog bind:this={dialog} oncancel={() => laufend?.abort()} aria-labelledby="qnh-abruf-titel">
  <h2 id="qnh-abruf-titel">Luftdruck für EDSH abrufen</h2>

  <!--
    Die Aufklärung steht in JEDEM Zustand, nicht nur neben dem Ergebnis. Wer
    den Dialog abbricht, soll denselben Satz gelesen haben wie der, der
    übernimmt.
  -->
  <p class="aufklaerung">
    Es werden gerade aktuelle Daten von einem Onlinedienst geladen. Der Wert
    stammt aus einem <strong>Wettermodell</strong> und ist
    <strong>keine Messung am Platz</strong> — er ist ein unverbindlicher
    Vorschlag zur Bequemlichkeit. Vor dem Flug gilt das ATIS, und das Ergebnis
    ist gegen das Original-Flughandbuch gegenzuprüfen.
  </p>

  <div class="ergebnis" aria-live="polite">
    {#if zustand.art === 'laedt'}
      <p class="laedt" data-testid="qnh-laedt">
        <span class="spinner" aria-hidden="true"></span>
        Luftdruck wird abgerufen …
      </p>
    {:else if zustand.art === 'vorschau'}
      <p class="wert" data-testid="qnh-vorschau">
        {formatHectopascal(zustand.settableQnhHpa)}
      </p>
      <p class="genauer">
        ungerundet {formatNumber(zustand.qnhHpa, 2)} hPa · gültig für
        {zeitText(zustand.abruf.gueltigkeit)} Uhr
      </p>
      {#if !uebernehmbar}
        <p class="warnung" data-testid="qnh-ausserhalb">
          Dieser Wert liegt außerhalb des Bereichs, den der Regler abdeckt
          ({bereich.min} bis {bereich.max} hPa). Er kann nicht übernommen werden.
        </p>
      {/if}
    {:else}
      <p class="fehler" data-testid="qnh-fehler">{zustand.meldung}</p>
      <button type="button" onclick={() => void abrufen()}>Erneut versuchen</button>
    {/if}
  </div>

  <!-- Namensnennung, wie CC-BY 4.0 sie verlangt (FR-010). -->
  <p class="quelle">
    Wetterdaten von <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
      Open-Meteo.com</a
    >, Rechenwerte des Modells ICON-D2 des Deutschen Wetterdienstes.
  </p>

  <div class="knoepfe">
    <button type="button" onclick={schliessen}>Abbrechen</button>
    <button type="button" class="haupt" disabled={!uebernehmbar} onclick={bestaetigen}>
      Übernehmen
    </button>
  </div>
</dialog>

<style>
  dialog {
    max-width: 32rem;
    padding: 1.25rem;
    border: 1px solid #036;
    border-radius: 0.5rem;
  }

  dialog::backdrop {
    background: rgb(0 0 0 / 40%);
  }

  h2 {
    margin: 0 0 0.75rem;
    font-size: 1.1rem;
  }

  .aufklaerung {
    margin: 0 0 1rem;
    font-size: 0.9em;
    line-height: 1.45;
  }

  /*
    Feste Mindesthöhe: Sonst springt der Dialog beim Wechsel von der
    Ladeanzeige zum Ergebnis, und der Knopf „Übernehmen" wandert genau in dem
    Moment unter den Zeigefinger.
  */
  .ergebnis {
    min-height: 4.5rem;
    margin-bottom: 1rem;
  }

  .laedt {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    color: #555;
  }

  .spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid #ccc;
    border-top-color: #036;
    border-radius: 50%;
    animation: drehen 0.8s linear infinite;
  }

  @keyframes drehen {
    to {
      transform: rotate(360deg);
    }
  }

  /* Wer die Bewegung nicht verträgt, bekommt eine ruhige Anzeige. */
  @media (prefers-reduced-motion: reduce) {
    .spinner {
      animation: none;
      border-top-color: #ccc;
    }
  }

  .wert {
    margin: 0;
    font-size: 1.8rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .genauer {
    margin: 0.15rem 0 0;
    font-size: 0.85em;
    color: #555;
  }

  .warnung,
  .fehler {
    margin: 0.5rem 0;
    color: #900;
  }

  .quelle {
    margin: 0 0 1rem;
    font-size: 0.8em;
    color: #555;
  }

  .knoepfe {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
  }

  button {
    padding: 0.3rem 0.9rem;
    font: inherit;
    color: #036;
    background: none;
    border: 1px solid #036;
    border-radius: 0.25rem;
    cursor: pointer;
  }

  .haupt {
    color: #fff;
    background: #036;
  }

  button:disabled {
    color: #888;
    background: none;
    border-color: #bbb;
    cursor: not-allowed;
  }
</style>
