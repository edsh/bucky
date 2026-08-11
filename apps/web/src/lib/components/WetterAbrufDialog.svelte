<script module lang="ts">
  /**
   * Was der Pilot übernehmen kann. Nicht angehakt heißt nicht enthalten —
   * deshalb sind alle drei Felder optional, und ein fehlendes Feld ist etwas
   * anderes als ein Nullwert (W-09).
   *
   * Steht im Modulblock, weil ein Typ nichts mit einer einzelnen Einbindung
   * des Dialogs zu tun hat: Die aufrufende Seite muss ihn benennen können,
   * ohne den Dialog zu bauen.
   */
  export interface Uebernahmewerte {
    qnhHpa?: number;
    outsideAirTemperatureC?: number;
    runwayWindComponentKt?: number;
    /**
     * Der Bahnzustand. Anders als die drei Wetterwerte ist er nicht abwählbar
     * und deshalb bei jeder Übernahme gesetzt: EDSH hat eine Graspiste, und
     * das ist keine Frage des Wetters, sondern eine feste Eigenschaft des
     * Platzes. Er steht trotzdem im selben Typ, damit die Seite an einer
     * Stelle erfährt, was der Dialog gesetzt hat.
     */
    dryGrassRunway?: boolean;
  }
</script>

<script lang="ts">
  import {
    formatCelsius,
    formatCelsiusPrecise,
    formatHectopascal,
    formatKnots,
    formatNumber,
    roundCelsius,
    toIsaDeviation,
    toPressureAltitude,
    toQnh,
    toRunwayWindComponent,
    type NumericRange
  } from '@edsh-bucky/deelk-poh-core';
  import { EDSH, RUNWAYS, type EdshRunway } from '$lib/weather/edsh.js';
  import { holeWetter, type WetterAbruf } from '$lib/weather/openMeteo.js';

  /**
   * Bestätigungsdialog für die Werte aus dem Onlinedienst: Luftdruck,
   * Außentemperatur und Pistenwind.
   *
   * Warum überhaupt ein Dialog — die Schnellwahl der Platzhöhe setzt ihren Wert
   * ja ohne Rückfrage: Die Platzhöhe ist eine feste, nachprüfbare Eigenschaft
   * des Platzes; die drei Wetterwerte sind fremde, veränderliche Modellwerte.
   * Nur die zweiten brauchen eine Bestätigung — und die Aufklärung darüber,
   * woher sie kommen.
   *
   * Warum ein Dialog für drei Größen, obwohl es seit Feature 031 drei Knöpfe
   * gibt, die ihn öffnen: Der Abruf holt die drei Werte ohnehin in einer
   * Antwort, und damit gelten sie alle für denselben Zeitpunkt. Die Auswahl
   * trifft man hier, mit den drei Kästchen — nicht schon beim Knopf.
   *
   * Gerechnet und gerundet wird hier **nicht**: Die übernehmbaren Werte kommen
   * fertig aus dem Kern (Zusicherungen W-01, W-02, W-08).
   */

  let {
    qnhBereich,
    temperaturBereich,
    pistenwindBereich,
    uebernehmen
  }: {
    /** Bereiche der drei Regler — aus dem Kern, keiner steht hier (C-05). */
    qnhBereich: NumericRange;
    /**
     * Anders als die beiden anderen **nicht konstant**: Der Temperaturbereich
     * wandert mit der Platzdruckhöhe. Er kommt deshalb bei jeder Änderung neu
     * herein und darf hier nicht zwischengespeichert werden.
     */
    temperaturBereich: NumericRange;
    pistenwindBereich: NumericRange;
    /** Wird mit den angehakten Größen und ihrer gemeinsamen Herkunft gerufen. */
    uebernehmen: (
      werte: Uebernahmewerte,
      herkunft: { dienst: string; ort: string; gueltigkeit: string }
    ) => void;
  } = $props();

  type Zustand =
    | { art: 'laedt' }
    | { art: 'vorschau'; abruf: WetterAbruf }
    | { art: 'fehler'; meldung: string };

  /**
   * Eine Zeile im Dialog. Drei Ausprägungen, eine Form — so bleibt das Markup
   * eine Schleife statt dreier fast gleicher Blöcke.
   */
  interface Vorschlag {
    /** Der übernehmbare Wert, gerundet vom Kern. Fehlt, wenn es keinen gibt. */
    wert?: number;
    /** Derselbe Wert in der Darstellung seines Reglers. */
    angezeigt?: string;
    /** Woraus er entstand — die Angabe, die den Wert nachprüfbar macht. */
    erlaeuterung?: string;
    /** Warum er nicht übernommen werden kann; leer heißt: er kann. */
    hindernis?: string;
  }

  let dialog: HTMLDialogElement;
  let zustand = $state<Zustand>({ art: 'laedt' });

  /**
   * Die Bahn, gegen die der Wind zerlegt wird. Ein Zustand und **kein**
   * `$derived`: Als abgeleiteter Wert spränge die Wahl zurück, sobald der
   * Pilot umschaltet. Die Vorauswahl geschieht deshalb einmalig beim
   * Eintreffen der Antwort.
   */
  let gewaehlteBahn = $state<EdshRunway>(RUNWAYS[0]);

  /**
   * Was der Pilot angehakt hat. Getrennt vom Vorschlag geführt, weil es ihm
   * gehört und nicht dem Abruf: Ein Bahnwechsel rechnet den Pistenwind neu,
   * setzt aber kein Kästchen zurück, das der Pilot abgewählt hat (FR-011).
   */
  let angehakt = $state({ qnh: true, temperatur: true, wind: true });

  /**
   * Bricht einen laufenden Abruf ab. Deckt beides ab: die Zeitüberschreitung
   * und das Schließen des Dialogs, damit eine später eintreffende Antwort
   * nichts mehr verändert (FR-018, W-05).
   */
  let laufend: AbortController | undefined;

  const ZEITGRENZE_MS = 10_000;

  function imBereich(wert: number, bereich: NumericRange): boolean {
    return wert >= bereich.min && wert <= bereich.max;
  }

  /**
   * Formt einen gerundeten Wert zu einem Vorschlag — oder zu einem Hindernis,
   * wenn er außerhalb des Reglerbereichs liegt.
   *
   * Geprüft wird der **gerundete** Wert. Das ist keine Kleinigkeit: Ein
   * Rückenwind von 10,06 kt rundet auf 10 kt und liegt damit genau auf der
   * unteren Reglergrenze — also innerhalb. Wer gegen den ungerundeten Wert
   * prüfte, sperrte eine Zeile, deren angezeigter Wert sich sehr wohl setzen
   * ließe, mit einer Begründung, die am Bildschirm nicht nachvollziehbar wäre.
   */
  function vorschlagen(
    wert: number,
    bereich: NumericRange,
    darstellen: (wert: number) => string,
    erlaeuterung: string
  ): Vorschlag {
    const angezeigt = darstellen(wert);
    if (!imBereich(wert, bereich)) {
      return {
        angezeigt,
        erlaeuterung,
        hindernis: `Dieser Wert liegt außerhalb des Bereichs, den der Regler abdeckt (${bereich.min} bis ${bereich.max} ${bereich.unit}).`
      };
    }
    return { wert, angezeigt, erlaeuterung };
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

  /**
   * Der QNH-Vorschlag. Die Höhe stammt aus derselben Konstanten wie die
   * Schnellwahl der Platzhöhe (W-06).
   */
  const qnhErgebnis = $derived(
    zustand.art === 'vorschau'
      ? toQnh(zustand.abruf.stationPressureHpa, EDSH.elevationFt)
      : undefined
  );

  const qnhVorschlag = $derived.by((): Vorschlag => {
    if (zustand.art !== 'vorschau' || qnhErgebnis === undefined) {
      return {};
    }
    return vorschlagen(
      qnhErgebnis.settableQnhHpa,
      qnhBereich,
      formatHectopascal,
      `ungerundet ${formatNumber(qnhErgebnis.qnhHpa, 2)} hPa · gültig für ${zeitText(zustand.abruf.gueltigkeit)} Uhr`
    );
  });

  const temperaturVorschlag = $derived.by((): Vorschlag => {
    if (zustand.art !== 'vorschau' || qnhErgebnis === undefined) {
      return {};
    }
    const temperatur = zustand.abruf.temperatureC;
    if (temperatur === undefined) {
      return { hindernis: 'Der Wetterdienst hat keine Temperatur geliefert.' };
    }
    // Seit Feature 031 nimmt der Regler die Temperatur, die der Dienst ohnehin
    // liefert — der Umweg über die ISA-Abweichung entfällt hier. Die Abweichung
    // steht nur noch in der Erläuterung, und zwar aus demselben Grund, aus dem
    // vorher die Temperatur dort stand: Die eine Zahl macht die andere
    // nachprüfbar.
    //
    // Die Druckhöhe dafür entsteht aus dem **abgerufenen** Druck, nicht aus dem
    // eingestellten QNH-Regler (W-07): Sonst hinge die Erläuterung an einem
    // Wert, den der Pilot vielleicht gar nicht übernimmt. Und zwar mit dem
    // ungerundeten `qnhHpa` — die Rundung des einen Vorschlags darf keinen
    // Sprung in den anderen tragen.
    const druckhoehe = toPressureAltitude(EDSH.elevationFt, qnhErgebnis.qnhHpa);
    const abweichung = toIsaDeviation(druckhoehe.pressureAltitudeFt, temperatur);
    return vorschlagen(
      roundCelsius(temperatur),
      temperaturBereich,
      formatCelsius,
      `ungerundet ${formatNumber(temperatur, 1)} °C · entspricht ISA ${formatCelsiusPrecise(abweichung.isaDeviationC)}`
    );
  });

  /**
   * Ob der Dienst überhaupt einen Wind geliefert hat.
   *
   * Steuert die Bahnwahl — und zwar bewusst nicht über `windVorschlag.wert`:
   * Auf Bahn 10 kann derselbe Wind jenseits der Reglergrenze liegen und damit
   * ohne Wert dastehen. Hätte die Bahnwahl daran gehängen, wäre sie in
   * ebendiesem Moment verschwunden und der Pilot käme nicht mehr auf Bahn 28
   * zurück. Eine Sackgasse, die im Klickpfad von Feature 031 auffiel.
   */
  const windGeliefert = $derived(zustand.art === 'vorschau' && zustand.abruf.wind !== undefined);

  /**
   * Zu jeder Bahn, ob der abgerufene Wind auf ihr von hinten kommt.
   *
   * Gerechnet wird für **beide** Bahnen, nicht nur für die gewählte: So sieht
   * der Pilot schon an den Auswahlknöpfen, welche Bahn Rückenwind hätte,
   * statt es erst nach dem Umschalten zu erfahren.
   *
   * Maßgeblich ist die ungerundete Komponente, nicht der einstellbare
   * Vorschlag: Bei −0,4 kt zeigt der Regler 0 kt, von hinten kommt der Wind
   * trotzdem. Und der Vorschlag fehlt ganz, wenn er jenseits der Reglergrenze
   * liegt — also gerade bei kräftigem Rückenwind, wo die Warnung am nötigsten
   * ist.
   */
  const rueckenwindJeBahn = $derived.by((): Record<string, boolean> => {
    if (zustand.art !== 'vorschau' || zustand.abruf.wind === undefined) {
      return {};
    }
    const wind = zustand.abruf.wind;
    return Object.fromEntries(
      RUNWAYS.map((bahn) => [
        bahn.ident,
        toRunwayWindComponent(wind.fromDegTrue, wind.speedKt, bahn.bearingDegTrue)
          .headwindComponentKt < 0
      ])
    );
  });

  const windVorschlag = $derived.by((): Vorschlag => {
    if (zustand.art !== 'vorschau') {
      return {};
    }
    const wind = zustand.abruf.wind;
    if (wind === undefined) {
      return { hindernis: 'Der Wetterdienst hat keinen Wind geliefert.' };
    }
    const ergebnis = toRunwayWindComponent(
      wind.fromDegTrue,
      wind.speedKt,
      gewaehlteBahn.bearingDegTrue
    );
    return vorschlagen(
      ergebnis.settableHeadwindComponentKt,
      pistenwindBereich,
      formatKnots,
      `Wind aus ${formatNumber(wind.fromDegTrue, 0)}° mit ${formatKnots(wind.speedKt)} auf Bahn ${gewaehlteBahn.ident}`
    );
  });

  /**
   * Sperrt „Übernehmen", solange nichts übernommen werden könnte (FR-005).
   * Ein Kästchen, das angehakt aussieht, dessen Wert aber fehlt, zählt nicht —
   * gesperrte Zeilen sind ohnehin nicht angehakt.
   */
  const etwasAngehakt = $derived(
    (angehakt.qnh && qnhVorschlag.wert !== undefined) ||
      (angehakt.temperatur && temperaturVorschlag.wert !== undefined) ||
      (angehakt.wind && windVorschlag.wert !== undefined)
  );

  /**
   * Wählt die Bahn mit dem größeren Gegenwind vor (FR-010). Bei Gleichstand —
   * Windstille oder Wind genau quer — bleibt es bei der ersten, damit die
   * Vorauswahl nicht vom Rundungsrest einer Winkelfunktion abhängt.
   */
  function bahnMitGegenwind(abruf: WetterAbruf): EdshRunway {
    const wind = abruf.wind;
    if (wind === undefined) {
      return RUNWAYS[0];
    }
    let beste = RUNWAYS[0];
    let bester = toRunwayWindComponent(
      wind.fromDegTrue,
      wind.speedKt,
      beste.bearingDegTrue
    ).headwindComponentKt;
    for (const bahn of RUNWAYS.slice(1)) {
      const komponente = toRunwayWindComponent(
        wind.fromDegTrue,
        wind.speedKt,
        bahn.bearingDegTrue
      ).headwindComponentKt;
      if (komponente > bester) {
        beste = bahn;
        bester = komponente;
      }
    }
    return beste;
  }

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
      if (eigener.signal.aborted) {
        return;
      }
      gewaehlteBahn = bahnMitGegenwind(abruf);
      angehakt = { qnh: true, temperatur: true, wind: true };
      zustand = { art: 'vorschau', abruf };
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
    if (zustand.art !== 'vorschau' || !etwasAngehakt) {
      return;
    }
    const werte: Uebernahmewerte = {};
    if (angehakt.qnh && qnhVorschlag.wert !== undefined) {
      werte.qnhHpa = qnhVorschlag.wert;
    }
    if (angehakt.temperatur && temperaturVorschlag.wert !== undefined) {
      werte.outsideAirTemperatureC = temperaturVorschlag.wert;
    }
    if (angehakt.wind && windVorschlag.wert !== undefined) {
      werte.runwayWindComponentKt = windVorschlag.wert;
    }
    // Immer mit, ohne Kästchen: Der Dialog sagt es vorher an, und wer den
    // Bahnzustand nicht mitgesetzt haben will, bricht ab. Ein viertes
    // Kästchen hätte die Graspiste zu einer Ansichtssache gemacht, die sie
    // nicht ist — und ein vergessener Haken ginge zulasten der Startstrecke.
    werte.dryGrassRunway = true;
    uebernehmen(werte, {
      dienst: zustand.abruf.dienst.name,
      // Der Ort gehört in den Vermerk, weil die Werte einer Modellzelle über
      // EDSH gelten und nicht dort, wo der Nutzer gerade sitzt. Ohne ihn liest
      // sich „gilt für 16:45 Uhr“ so, als gälte es überall.
      ort: EDSH.kennung,
      gueltigkeit: zustand.abruf.gueltigkeit
    });
    schliessen();
  }
</script>

<!--
  Ein natives <dialog> mit showModal(): Fokusführung, Esc und die
  Inaktivierung des Hintergrunds sind damit ohne Nachbau erfüllt (FR-008).
  `oncancel` fängt Esc ab, damit auch dieser Weg den Abruf abbricht.
-->
<dialog bind:this={dialog} oncancel={() => laufend?.abort()} aria-labelledby="wetter-abruf-titel">
  <h2 id="wetter-abruf-titel">Wetterwerte für EDSH abrufen</h2>

  <!--
    Die Aufklärung steht in JEDEM Zustand, nicht nur neben dem Ergebnis. Wer
    den Dialog abbricht, soll denselben Satz gelesen haben wie der, der
    übernimmt.
  -->
  <p class="aufklaerung">
    Es werden gerade aktuelle Daten von einem Onlinedienst geladen. Die Werte
    stammen aus einem <strong>Wettermodell</strong> und sind
    <strong>keine Messung am Platz</strong> — sie sind unverbindliche
    Vorschläge zur Bequemlichkeit. Vor dem Flug gilt das ATIS, und das Ergebnis
    ist gegen das Original-Flughandbuch gegenzuprüfen.
  </p>

  <div class="ergebnis" aria-live="polite">
    {#if zustand.art === 'laedt'}
      <p class="laedt" data-testid="wetter-laedt">
        <span class="spinner" aria-hidden="true"></span>
        Wetterwerte werden abgerufen …
      </p>
    {:else if zustand.art === 'vorschau'}
      <ul class="zeilen">
        {#each [{ schluessel: 'qnh' as const, titel: 'Luftdruck QNH', bahnwahl: false, vorschlag: qnhVorschlag }, { schluessel: 'temperatur' as const, titel: 'Außentemperatur', bahnwahl: false, vorschlag: temperaturVorschlag }, { schluessel: 'wind' as const, titel: 'Pistenwind (positiv = Gegenwind)', bahnwahl: true, vorschlag: windVorschlag }] as zeile (zeile.schluessel)}
          <li data-testid={`wetter-zeile-${zeile.schluessel}`}>
            <label class="kopf">
              <!--
                Ein Vorschlag ohne Wert ist gesperrt UND nicht angehakt: Ein
                angehaktes, aber gesperrtes Kästchen versprächen eine Übernahme,
                die nicht stattfindet. Die übrigen Zeilen bleiben bedienbar
                (FR-007) — ein fehlender Wind verwirft nicht den ganzen Abruf.
              -->
              <input
                type="checkbox"
                data-testid={`wetter-haken-${zeile.schluessel}`}
                disabled={zeile.vorschlag.wert === undefined}
                checked={angehakt[zeile.schluessel] && zeile.vorschlag.wert !== undefined}
                onchange={(ereignis) =>
                  (angehakt[zeile.schluessel] = ereignis.currentTarget.checked)}
              />
              <span class="titel">{zeile.titel}</span>
              <!--
                Ein Rückenwind ist der Fall, den man beim Überfliegen einer
                Zahlenreihe am ehesten übersieht — er unterscheidet sich vom
                Gegenwind nur durch ein Vorzeichen, und gerade bei den kleinen
                Beträgen fällt das kaum auf. Das Zeichen trägt eine
                Textalternative, weil ein Warnbild ohne Worte keine Warnung ist.

                Es steht **vor** dem Wert: Stellte es hinter ihm, rückte die
                Zahl beim Umschalten der Bahn nicht — wohl aber alles rechts
                davon, und die Zeile würde beim Vergleichen der beiden Bahnen
                unruhig. Vor dem Wert wächst die Zeile nach rechts weg.
              -->
              {#if zeile.bahnwahl && rueckenwindJeBahn[gewaehlteBahn.ident]}
                <span
                  class="warnzeichen"
                  role="img"
                  aria-label="Rückenwind"
                  title="Der Wind kommt auf dieser Bahn von hinten."
                  data-testid="wetter-rueckenwind-wert">⚠️</span
                >
              {/if}
              {#if zeile.vorschlag.angezeigt}
                <span class="wert" data-testid={`wetter-wert-${zeile.schluessel}`}>
                  {zeile.vorschlag.angezeigt}
                </span>
              {/if}
            </label>
            {#if zeile.vorschlag.erlaeuterung}
              <p class="genauer" data-testid={`wetter-genauer-${zeile.schluessel}`}>
                {zeile.vorschlag.erlaeuterung}
              </p>
            {/if}
            {#if zeile.vorschlag.hindernis}
              <p class="warnung" data-testid={`wetter-hindernis-${zeile.schluessel}`}>
                {zeile.vorschlag.hindernis}
              </p>
            {/if}
            <!--
              Die Bahnwahl steht in der Windzeile und nicht mehr über allen
              dreien. Bis Feature 031 stand sie oben, damit man den Wert darunter
              springen sieht — sie sah dadurch aber aus, als beträfe sie alle
              drei Zeilen. Beim Luftdruck und bei der Temperatur ist die Bahn
              bedeutungslos.

              Sie erscheint nur, wenn der Dienst einen Wind geliefert hat — ohne
              Wind gäbe es nichts zu zerlegen. Ein Wechsel löst keinen neuen
              Abruf aus und setzt kein Kästchen zurück (FR-011).
            -->
            {#if zeile.bahnwahl && windGeliefert}
              <fieldset class="bahnwahl" data-testid="wetter-bahnwahl">
                <legend>Bahn</legend>
                {#each RUNWAYS as bahn (bahn.ident)}
                  <label>
                    <input
                      type="radio"
                      name="bahn"
                      value={bahn.ident}
                      checked={gewaehlteBahn.ident === bahn.ident}
                      onchange={() => (gewaehlteBahn = bahn)}
                    />
                    {bahn.ident}
                    {#if rueckenwindJeBahn[bahn.ident]}
                      <span
                        class="warnzeichen"
                        role="img"
                        aria-label="Rückenwind"
                        title="Auf dieser Bahn käme der Wind von hinten."
                        data-testid={`wetter-rueckenwind-bahn-${bahn.ident}`}>⚠️</span
                      >
                    {/if}
                  </label>
                {/each}
              </fieldset>
            {/if}
          </li>
        {/each}
        <!--
          Ohne Kästchen, und das ist der Unterschied zu den drei Zeilen darüber:
          Der Bahnzustand ist kein abgerufener Messwert, sondern eine feste
          Eigenschaft des Platzes. Er steht hier, damit die Übernahme nichts
          tut, was nicht vorher dasteht — wer ihn nicht mitgesetzt haben
          will, bricht ab und stellt ihn im Bereich „Roll- und Startstrecke"
          von Hand ein.

          Als schlichter Satz und nicht im Bau der Zeilen darüber (Titel, Wert,
          Erläuterung): Diese Gliederung trägt die drei wählbaren Zeilen, weil
          sie zu vergleichen sind. Hier gibt es nichts zu vergleichen und nichts
          zu wählen — nachgebaut sah die Zeile nur nach mehr aus, als sie ist.
        -->
        <li class="feststehend" data-testid="wetter-zeile-bahnzustand">
          EDSH hat eine Graspiste. Bahnzustand trockenes Gras wird gesetzt.
        </li>
      </ul>
    {:else}
      <p class="fehler" data-testid="wetter-fehler">{zustand.meldung}</p>
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
    <button type="button" class="haupt" disabled={!etwasAngehakt} onclick={bestaetigen}>
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
    font-size: 1.15rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    margin-left: auto;
  }

  /*
    Die Bahnwahl steht als Fieldset, damit die beiden Optionen eine gemeinsame
    Beschriftung tragen: „10" und „28" allein sagen nicht, wovon die Rede ist.

    Seit Feature 031 sitzt sie **innerhalb** der Windzeile. Sie ist deshalb
    eingerückt statt ganz links: Der Einzug zeigt, dass sie zu der Zeile gehört
    und nicht zu allen. Der Abstand liegt jetzt oben statt unten, weil sie dem
    Wert folgt, den sie verändert, statt ihm voranzugehen.
  */
  .bahnwahl {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    margin: 0.4rem 0 0 1.6rem;
    padding: 0.35rem 0.6rem;
    border: 1px solid #ccc;
    border-radius: 0.25rem;
  }

  .bahnwahl legend {
    padding: 0 0.3rem;
    font-size: 0.85em;
    color: #555;
  }

  .bahnwahl label {
    display: flex;
    gap: 0.3rem;
    align-items: center;
  }

  /*
    Ohne eigene Schriftgroesse: Das Zeichen soll die Zeile begleiten, nicht sie
    beherrschen. `cursor: help` weist auf den Hinweistext hin, den es traegt.
  */
  .warnzeichen {
    cursor: help;
  }

  /*
    Abgesetzt von den drei waehlbaren Zeilen darueber: eine duenne Linie und
    etwas Luft. Der Einzug entspricht dem der anderen Titel, die durch ihr
    Kaestchen eingerueckt sind -- sonst stuende diese Zeile weiter links und
    saehe wie eine Ueberschrift aus.

    Klein und grau wie die Erlaeuterungen: ein Hinweis, keine vierte Wahl.
  */
  .feststehend {
    margin-top: 0.8rem;
    padding-top: 0.6rem;
    padding-left: 1.4rem;
    border-top: 1px solid #ddd;
    font-size: 0.85em;
    color: #555;
  }

  .zeilen {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .zeilen li + li {
    margin-top: 0.6rem;
  }

  .kopf {
    display: flex;
    gap: 0.5rem;
    align-items: baseline;
  }

  /* Eine gesperrte Zeile bleibt lesbar, sieht aber nicht bedienbar aus. */
  .kopf:has(input:disabled) {
    color: #888;
  }

  .genauer {
    margin: 0.15rem 0 0 1.6rem;
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
