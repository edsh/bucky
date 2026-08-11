<script lang="ts">
  import { base } from '$app/paths';
  import {
    PohCalculationError,
    computeCruiseCapability,
    computeFuelPlan,
    computeTakeoffDistance,
    formatCelsius,
    formatFeet,
    formatHectopascal,
    formatKnots,
    formatNauticalMiles,
    formatPercent,
    getFuelPlanInputDomain,
    getTakeoffInputDomain,
    toOutsideAirTemperature,
    toPressureAltitude,
    type CruiseCapability,
    type FuelPlanResult,
    type TakeoffDistanceResult
  } from '@edsh-bucky/deelk-poh-core';
  import { EDSH } from '$lib/weather/edsh.js';
  import CruiseCapabilityView from '$lib/components/CruiseCapability.svelte';
  import FuelResult from '$lib/components/FuelResult.svelte';
  import PowerLever from '$lib/components/PowerLever.svelte';
  import WetterAbrufDialog, {
    type Uebernahmewerte
  } from '$lib/components/WetterAbrufDialog.svelte';  import RangeField from '$lib/components/RangeField.svelte';
  import TakeoffDistance from '$lib/components/TakeoffDistance.svelte';

  /**
   * Dünner Adapter: nimmt die sechs Felder entgegen und reicht sie an den Kern
   * weiter. Wertebereiche und Auswahllisten stammen aus dem Kern, nicht aus
   * dieser Datei (Constitution-Prinzip IV, Zusicherung C-02).
   */
  const domain = getFuelPlanInputDomain();

  // Vorgaben eines typischen Fluges ab dem Heimatplatz: EDSH, eine Höhe unter
  // der Transponderpflicht, eine Strecke in der Größenordnung eines
  // Nachmittagsausflugs. Wer etwas anderes vorhat, verstellt einen Regler.
  let departureElevationFt = $state(EDSH.elevationFt);
  let cruiseAltitudeAmslFt = $state(4500);
  let qnhHpa = $state(1013);

  /**
   * Woher die drei Wetterwerte stammen, sofern sie aus dem Onlinedienst kamen.
   * Der Vermerk gehört zum **Wert**, nicht zum Dialog: Ein von Hand
   * verstellter Wert hat keine Herkunft mehr (FR-015). Deshalb drei getrennte
   * Vermerke und nicht einer für den ganzen Abruf — wer den Pistenwind
   * nachjustiert, hat den Luftdruck deswegen nicht selbst gesetzt.
   */
  type Herkunft = { dienst: string; gueltigkeit: string } | undefined;

  let qnhHerkunft = $state<Herkunft>(undefined);
  let isaHerkunft = $state<Herkunft>(undefined);
  let pistenwindHerkunft = $state<Herkunft>(undefined);

  let wetterDialog: ReturnType<typeof WetterAbrufDialog> | undefined = $state();

  /**
   * Übernimmt die abgerufenen Werte. Der einzige Weg, auf dem der Dialog eine
   * Eingabe verändert (W-03) — Abbrechen, Fehlschlag und Schließen bleiben
   * folgenlos.
   *
   * Eine **nicht enthaltene** Größe lässt Regler und bisherigen Vermerk
   * unangetastet (W-09): Abwählen ist kein Zurücksetzen. Wer den Luftdruck
   * beim zweiten Abruf abwählt, will den ersten behalten, nicht löschen.
   */
  function wetterUebernehmen(
    werte: Uebernahmewerte,
    herkunft: { dienst: string; gueltigkeit: string }
  ): void {
    if (werte.qnhHpa !== undefined) {
      qnhHpa = werte.qnhHpa;
      qnhHerkunft = herkunft;
    }
    if (werte.isaDeviationC !== undefined) {
      isaDeviationC = werte.isaDeviationC;
      isaHerkunft = herkunft;
    }
    if (werte.runwayWindComponentKt !== undefined) {
      runwayWindComponentKt = werte.runwayWindComponentKt;
      pistenwindHerkunft = herkunft;
    }
  }

  /**
   * Jede andere Änderung am Regler löscht **dessen** Vermerk. Bewusst als
   * Wächter am Ereignis und nicht als $effect auf dem Wert: Ein Effekt liefe
   * auch beim Übernehmen und löschte den Vermerk im selben Atemzug, in dem er
   * entsteht.
   *
   * Drei Wächter statt einem, aus demselben Grund wie drei Vermerke: Der
   * Pistenwind hat nichts mit dem Luftdruck zu tun.
   */
  function qnhVonHand(): void {
    qnhHerkunft = undefined;
  }

  function isaVonHand(): void {
    isaHerkunft = undefined;
  }

  function pistenwindVonHand(): void {
    pistenwindHerkunft = undefined;
  }

  /** Gültigkeitszeitpunkt in Ortszeit — dieselbe Schreibweise wie im Dialog. */
  function herkunftZeit(iso: string): string {
    return new Date(iso.endsWith('Z') ? iso : `${iso}Z`).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  let distanceNm = $state(75);
  let powerSettingPct = $state(70);
  let isaDeviationC = $state(10);

  /**
   * Zwei Windgrößen, die nichts miteinander zu tun haben: der Wind auf der Bahn
   * 10/28 am Boden und der Wind entlang der Strecke in Reiseflughöhe. Sie
   * standen bis Feature 026 in einem einzigen Regler und wurden in beide
   * Rechnungen geschickt — der Pilot musste sich für einen Kompromisswert
   * entscheiden.
   *
   * Sie sind bewusst **nicht** gekoppelt: Kein `$effect` leitet den einen aus
   * dem anderen ab, auch nicht als Anfangsbelegung. Eine Kopplung stellte genau
   * die Vermischung wieder her, die dieses Feature auflöst.
   *
   * Der Kern führt beide längst getrennt (`getTakeoffInputDomain()` und
   * `getFuelPlanInputDomain()`) — bis hierher war es die Oberfläche, die diese
   * Trennung wieder eingeebnet hat.
   */
  let runwayWindComponentKt = $state(10);
  let routeWindComponentKt = $state(10);

  /**
   * Der Bahnzustand wirkt allein auf die Startstrecke (FR-018). Beide Schalter
   * stehen hier und nicht in der Komponente, weil die Schnellwahl „EDSH" den
   * Grasschalter mitsetzt — der Heimatplatz hat eine Graspiste (FR-023).
   */
  let dryGrassRunway = $state(false);
  let wetOrSnowRunway = $state(false);

  /**
   * Setzt Platzhöhe **und** Bahnzustand auf EDSH. Der Schalter bleibt danach
   * frei wählbar: Wer die Platzhöhe anschließend verstellt, hat deshalb nicht
   * zwingend eine andere Bahnart vor sich — der Schalter wird also nicht
   * zurückgesetzt (FR-023).
   */
  function edshWaehlen(): void {
    departureElevationFt = EDSH.elevationFt;
    dryGrassRunway = true;
  }

  /**
   * Die Druckhöhe zu beiden Höhen, unabhängig von der Gesamtrechnung. Sie soll
   * auch dann unter dem Regler stehen, wenn die Rechnung scheitert — gerade
   * dann erklärt sie nämlich, warum. Gerechnet wird dabei nicht selbst: die
   * Funktion stammt aus dem Kern (Zusicherung C-04).
   */
  const platzDruckhoehe = $derived(toPressureAltitude(departureElevationFt, qnhHpa));
  const reiseDruckhoehe = $derived(toPressureAltitude(cruiseAltitudeAmslFt, qnhHpa));

  /**
   * Die Startstrecke steht für sich: Sie hängt an Platzhöhe, Luftdruck,
   * Temperatur, Wind und Bahnzustand — nicht an Strecke oder Lasteinstellung.
   * Sie wird deshalb eigens ermittelt und in `{ wert, fehler }` gekapselt,
   * damit ein Fehler hier den Kraftstoffbedarf nicht mitreißt und umgekehrt
   * (FR-020).
   */
  const startstrecke = $derived.by((): { wert?: TakeoffDistanceResult; fehler?: string } => {
    try {
      return {
        wert: computeTakeoffDistance({
          // Druckhöhe und Temperatur kommen als fertige Ergebnisse des Kerns
          // herein; der Adapter rechnet sie nicht selbst (Zusicherung C-04).
          pressureAltitude: platzDruckhoehe,
          outsideAirTemperature: toOutsideAirTemperature(
            platzDruckhoehe.pressureAltitudeFt,
            isaDeviationC
          ),
          windComponentKt: runwayWindComponentKt,
          dryGrassRunway,
          wetOrSnowRunway
        })
      };
    } catch (error) {
      return {
        fehler:
          error instanceof PohCalculationError
            ? error.message
            : 'Unerwarteter Fehler bei der Startstreckenberechnung.'
      };
    }
  });

  /**
   * Die Reiseleistung hängt allein an den Bedingungen des Reiseflugs. Sie wird
   * deshalb eigens ermittelt und nicht aus dem Gesamtergebnis gezogen: Sonst
   * verschwände sie genau dann, wenn Strecke oder Wind die Bedarfsrechnung
   * scheitern lassen — also gerade dann, wenn der Pilot sie braucht (FR-009).
   */
  const reiseleistung = $derived.by((): { wert?: CruiseCapability; fehler?: string } => {
    try {
      return {
        wert: computeCruiseCapability({
          cruiseAltitudeAmslFt,
          qnhHpa,
          powerSettingPct,
          isaDeviationC
        })
      };
    } catch (error) {
      return {
        fehler:
          error instanceof PohCalculationError
            ? error.message
            : 'Unerwarteter Fehler beim Nachschlagen der Reiseleistung.'
      };
    }
  });

  /**
   * Das Flugzeug-Avatar wandert beim Scrollen mit und schrumpft dabei: Es soll
   * die ganze Vorbereitung über sichtbar bleiben (Situationsbewusstsein), ohne
   * in voller Größe die Ergebnistabellen zu verdecken (Issue #14). Gerechnet
   * wird in Pixeln, weil der Scrollstand in Pixeln kommt.
   */
  let scrollY = $state(0);

  const AVATAR_GROSS_PX = 96;
  const AVATAR_KLEIN_PX = 72;
  /** Nach dieser Scrollstrecke ist die Endgröße erreicht. */
  const SCHRUMPFSTRECKE_PX = 260;
  /** Abstand des Avatars zum oberen Rand, sobald es mitwandert. */
  const ABSTAND_OBEN_PX = 8;
  /** Der Innenabstand von `main`; dort steht das Avatar ungescrollt. */
  const KOPF_ABSTAND_PX = 24;

  const schrumpf = $derived(Math.min(1, Math.max(0, scrollY / SCHRUMPFSTRECKE_PX)));
  const avatarBreitePx = $derived(
    AVATAR_GROSS_PX - (AVATAR_GROSS_PX - AVATAR_KLEIN_PX) * schrumpf
  );
  const avatarObenPx = $derived(Math.max(ABSTAND_OBEN_PX, KOPF_ABSTAND_PX - scrollY));
  /**
   * Streuradius des weißen Scheins um den Umriss des Avatars. In Pixeln statt
   * Prozent, weil `drop-shadow` keine prozentualen Radien kennt; er folgt der
   * Bildgröße, damit der Schein beim Schrumpfen nicht plump wirkt.
   */
  const avatarScheinPx = $derived(avatarBreitePx * 0.045);

  let result = $state<FuelPlanResult | undefined>(undefined);
  let fehler = $state<string | undefined>(undefined);

  /**
   * Gerechnet wird bei jeder Reglerbewegung, nicht erst beim Absenden: Ein
   * Regler lebt davon, dass die Wirkung der Bewegung sichtbar wird. Das
   * Formular bleibt trotzdem ein Formular — wer die Eingabetaste drückt oder
   * ohne Zeigegerät arbeitet, kommt sonst nicht ans Ergebnis.
   */
  function berechnen(): void {
    try {
      result = computeFuelPlan({
        departureElevationFt,
        cruiseAltitudeAmslFt,
        qnhHpa,
        distanceNm,
        powerSettingPct,
        isaDeviationC,
        windComponentKt: routeWindComponentKt
      });
      fehler = undefined;
    } catch (error) {
      // Die Meldung kommt wortgleich aus dem Kern; der Adapter formuliert sie
      // nicht um (Zusicherung C-02).
      fehler =
        error instanceof PohCalculationError ? error.message : 'Unerwarteter Fehler bei der Berechnung.';
      result = undefined;
    }
  }

  $effect(() => {
    // Liest die sieben Eingaben von `computeFuelPlan` und läuft daher bei jeder
    // ihrer Änderungen erneut. Der Pistenwind steht bewusst **nicht** darin: Er
    // geht in die Startstrecke ein, und die ist ein `$derived` — sie folgt ihm
    // von selbst. Ihn hier aufzuführen ließe den Bedarf ohne Anlass neu rechnen.
    void [
      departureElevationFt,
      cruiseAltitudeAmslFt,
      qnhHpa,
      distanceNm,
      powerSettingPct,
      isaDeviationC,
      routeWindComponentKt
    ];
    berechnen();
  });
</script>

<svelte:head>
  <title>POH-Rechner D-EELK — Bucky Highfly</title>
</svelte:head>

<svelte:window bind:scrollY />

<!--
  Das Avatar steht bewusst außerhalb von <main>: Es ist fest im Sichtfeld
  verankert, nicht Teil des Textflusses. Im Kopfbereich bleibt ein Platzhalter
  derselben Größe stehen, damit die Überschrift nicht darunterläuft.

  Die Umhüllung trägt den Bodenschatten als Pseudo-Element; er sitzt deutlich
  unter dem Flugzeug und ist kleiner als dieses, wie ein Schatten aus der Höhe.
-->
<div
  class="flugzeug"
  style="width: {avatarBreitePx}px; top: {avatarObenPx}px; --schein: {avatarScheinPx}px;"
>
  <img src="{base}/D-EELK_pixelart_192px.png" alt="Die D-EELK als Pixelgrafik" />
</div>

<main>
  <header class="kopf">
    <h1>POH-Rechner D-EELK</h1>
    <div class="flugzeug-platzhalter" aria-hidden="true"></div>
  </header>
  <p class="einleitung">
    Cessna 172N mit TAE 125-02-114, Standardtanks und Propeller MTV-6-A/190-69.
    Grundlage ist Abschnitt 5b des
    Flughandbuch-Anhangs — <a href="{base}/tabellen">die verwendeten Tabellen im Einzelnen</a>.
  </p>

  <!--
    Die Gliederung folgt dem Gedankengang: erst die Bedingungen des
    Reiseflugs, dann was die Maschine darunter leistet, erst danach das
    konkrete Vorhaben. Wer noch keine Strecke im Sinn hat, bekommt schon nach
    der ersten Gruppe eine Antwort.
  -->
  <form onsubmit={(event) => event.preventDefault()}>
    <fieldset>
      <legend>Grundbedingungen</legend>

      <div class="felder">
        <!--
          Der Luftdruck steht an erster Stelle, weil er in beide Druckhöhen
          eingeht: Wer die Folgezeile „≙ Druckhöhe … @ …" liest, findet den
          Regler, der sie verstellt, davor und nicht dahinter (Issue #9).
        -->
        <RangeField
          id="qnh"
          label="Luftdruck QNH (hPa)"
          range={domain.qnhHpa}
          bind:value={qnhHpa}
          format={formatHectopascal}
          bedient={qnhVonHand}
        >
          {#snippet neben()}
            <!--
              Anders als die Schnellwahl der Platzhöhe setzt dieser Knopf den
              Wert nicht sofort: Die Wetterwerte sind fremde, veränderliche
              Modellwerte und brauchen eine Bestätigung.

              Er bleibt der einzige Einstieg, obwohl der Dialog seit Feature 027
              drei Regler bedient. Ein zweiter Knopf am ISA- oder Pistenwind-
              regler wäre ein zweiter Weg zu demselben Abruf und versprächen eine
              Auswahl, die es erst im Dialog gibt.
            -->
            <button
              type="button"
              class="schnellwahl"
              aria-label="Wetterwerte für EDSH abrufen"
              onclick={() => wetterDialog?.oeffnen()}
            >
              EDSH
            </button>
          {/snippet}
          {#snippet folge()}
            {#if qnhHerkunft}
              <span data-testid="qnh-herkunft">
                aus {qnhHerkunft.dienst}, gültig für {herkunftZeit(qnhHerkunft.gueltigkeit)} Uhr —
                unverbindlich
              </span>
            {/if}
          {/snippet}
        </RangeField>

        <RangeField
          id="reiseflughoehe"
          label="Reiseflughöhe ASL (ft)"
          range={domain.cruiseAltitudeAmslFt}
          bind:value={cruiseAltitudeAmslFt}
          format={formatFeet}
        >
          {#snippet folge()}
            ≙ Druckhöhe {formatFeet(reiseDruckhoehe.pressureAltitudeFt)} @ {formatHectopascal(qnhHpa)}
          {/snippet}
        </RangeField>

        <RangeField
          id="isa"
          label="ISA-Abweichung (°C)"
          range={domain.isaDeviationC}
          bind:value={isaDeviationC}
          format={formatCelsius}
          bedient={isaVonHand}
        >
          {#snippet folge()}
            {#if isaHerkunft}
              <span data-testid="isa-herkunft">
                aus {isaHerkunft.dienst}, gültig für {herkunftZeit(isaHerkunft.gueltigkeit)} Uhr —
                unverbindlich
              </span>
            {/if}
          {/snippet}
        </RangeField>
      </div>

      <!--
        Der Leistungshebel gehoert fachlich hierher: Er bestimmt gemeinsam mit
        Hoehe, Druck und Temperatur, was die Maschine leistet. Er steht im
        selben Rahmen, nur seitlich -- wie im Cockpit neben den Anzeigen.
      -->
      <!--
        Der Dialog steht im selben Formular wie sein Knopf, aber außerhalb des
        Feldblocks: Als <dialog> wird er ohnehin über der Seite dargestellt,
        seine Stelle im Baum wirkt sich nicht auf die Anordnung aus.
      -->
      <WetterAbrufDialog
        bind:this={wetterDialog}
        qnhBereich={domain.qnhHpa}
        isaBereich={domain.isaDeviationC}
        pistenwindBereich={getTakeoffInputDomain().windComponentKt}
        uebernehmen={wetterUebernehmen}
      />

      <PowerLever
        id="last"
        label="Lasteinstellung"
        range={domain.powerSettingPct}
        bind:value={powerSettingPct}
        format={formatPercent}
      />
    </fieldset>
  </form>

  <CruiseCapabilityView capability={reiseleistung.wert} fehler={reiseleistung.fehler} />

  <!--
    Die Platzhöhe gehört beiden Bereichen darunter: Die Startstrecke braucht sie
    ebenso wie der Kraftstoffbedarf. Sie steht deshalb einmal oben und nicht
    doppelt in den Spalten (FR-013).

    Der Wind stand bis Feature 026 aus demselben Grund hier — zu Unrecht: Es
    sind zwei Größen, nicht eine. Der Wind auf der Bahn und der Wind auf der
    Strecke stehen jetzt jeweils bei dem Ergebnis, auf das sie wirken.
  -->
  <h2 class="bereich-titel">Start und Streckenflug</h2>

  <form onsubmit={(event) => event.preventDefault()}>
    <fieldset>
      <legend>Platzhöhe</legend>

      <div class="felder">
        <RangeField
          id="platzhoehe"
          label="Platzhöhe ASL (ft)"
          range={domain.departureElevationFt}
          bind:value={departureElevationFt}
          format={formatFeet}
        >
          {#snippet neben()}
            <!--
              Zwei Knöpfe tragen jetzt die Aufschrift „EDSH"; ohne eigene
              Beschriftung wären sie für Vorlesewerkzeuge nicht zu
              unterscheiden.
            -->
            <button
              type="button"
              class="schnellwahl"
              aria-label="Platzhöhe von EDSH übernehmen"
              onclick={edshWaehlen}>EDSH</button
            >
          {/snippet}
          {#snippet folge()}
            ≙ Druckhöhe {formatFeet(platzDruckhoehe.pressureAltitudeFt)} @ {formatHectopascal(qnhHpa)}
          {/snippet}
        </RangeField>
      </div>
    </fieldset>
  </form>

  <!--
    Zwei nebeneinanderstehende Bereiche, sobald genug Breite da ist. Die
    Startstrecke steht zuerst, weil sie zeitlich zuerst gebraucht wird — beim
    Rollen zur Bahn, nicht unterwegs.
  -->
  <div class="bereiche">
    <section id="startstrecke" class="bereich" aria-labelledby="startstrecke-titel">
      <h3 id="startstrecke-titel">Roll- und Startstrecke</h3>
      <TakeoffDistance
        result={startstrecke.wert}
        fehler={startstrecke.fehler}
        bind:dryGrass={dryGrassRunway}
        bind:wetOrSnow={wetOrSnowRunway}
        bind:windComponentKt={runwayWindComponentKt}
        windHerkunft={pistenwindHerkunft
          ? `aus ${pistenwindHerkunft.dienst}, gültig für ${herkunftZeit(pistenwindHerkunft.gueltigkeit)} Uhr — unverbindlich`
          : undefined}
        windBedient={pistenwindVonHand}
      />
    </section>

    <section id="bedarf" class="bereich" aria-labelledby="bedarf-titel">
      <h3 id="bedarf-titel">Kraftstoffbedarf und Geschwindigkeiten</h3>

      <!--
        Die Streckenlänge steht erst hier: Vor diesem Bereich wird sie nicht
        gebraucht — weder die Reiseleistung noch die Startstrecke hängen an
        ihr (FR-014).
      -->
      <form onsubmit={(event) => event.preventDefault()}>
        <div class="felder">
          <RangeField
            id="strecke"
            label="Streckenlänge (NM)"
            range={domain.distanceNm}
            bind:value={distanceNm}
            format={formatNauticalMiles}
          />

          <!--
            Der Streckenwind steht hier und nicht mehr oben bei der Platzhöhe:
            Er wirkt allein auf Kraftstoffbedarf und Reisezeit. Sein Bereich
            reicht weiter als der des Pistenwinds (−50 statt −10 kt), weil die
            Reiseleistung über die Geschwindigkeit über Grund rechnet und dabei
            keine Tabellengrenze für Rückenwind kennt.
          -->
          <RangeField
            id="streckenwind"
            label="Streckenwindkomponente (kt, positiv = Gegenwind)"
            range={domain.windComponentKt}
            bind:value={routeWindComponentKt}
            format={formatKnots}
          />
        </div>
      </form>

      {#if fehler}
        <p class="fehler" role="alert">{fehler}</p>
      {:else if result}
        <FuelResult {result} />
      {/if}
    </section>
  </div>
</main>

<style>
  main {
    max-width: 48rem;
    margin: 0 auto;
    padding: 1.5rem;
    font-family: system-ui, sans-serif;
    line-height: 1.5;
  }

  form {
    margin: 0 0 1rem;
  }

  .bereich-titel,
  .bereich h3 {
    margin: 1.5rem 0 0.5rem;
  }

  /*
    Untereinander als Vorgabe, nebeneinander erst ab genug Breite. Die
    Startstrecke steht in der Reihenfolge des Auszeichnungstexts zuerst und
    damit im Hochformat oben (FR-015).
  */
  .bereiche {
    display: grid;
    /*
      Untereinander braucht es mehr Luft als nebeneinander: Ohne Spalte, die
      sie trennt, gehen die beiden Bereiche sonst ineinander ueber. Waagerecht
      genuegt der Spaltenabstand, weil die Spalten selbst schon trennen.
    */
    gap: 2.5rem 2rem;
  }

  .bereich {
    min-width: 0;
  }

  .bereich h3 {
    margin-top: 0;
  }

  /*
    Zwei Spalten erst im Querformat und nicht allein nach Breite. Eine reine
    Breitenabfrage kann beides nicht auseinanderhalten: Ein Telefon im
    Querformat ist 667 px breit, ein Tablet im Hochformat 1032 px. Ein
    Haltepunkt dazwischen wuerde genau falsch herum entscheiden -- einspaltig
    auf dem Telefon quer, zweispaltig auf dem Tablet hoch. Ein Haltepunkt
    darunter ergaebe zwei Spalten auf dem Telefon *hochkant*; einer darueber
    keine im Querformat. Erst Breite **und** Ausrichtung zusammen treffen die
    Faustregel: hochkant einspaltig, quer zweispaltig.
  */
  @media (min-width: 40rem) and (orientation: landscape) {
    main {
      max-width: 64rem;
    }

    .bereiche {
      grid-template-columns: 1fr 1fr;
      align-items: start;
      row-gap: 0;
    }

    /* Das Avatar folgt der breiteren Textspalte, sonst ueberdeckt es sie. */
    .flugzeug {
      right: max(1.5rem, calc((100vw - 64rem) / 2 + 1.5rem));
    }
  }

  /* Der Leistungshebel steht seitlich, wie im Cockpit neben den Anzeigen. */
  /*
    Der Rahmen bricht seitlich aus der Textspalte aus, damit sein *Inhalt*
    buendig zum uebrigen Fliesstext steht statt um Rahmen und Innenabstand
    nach innen versetzt. Der Ausbruch entspricht genau Innenabstand plus
    Rahmenstaerke; er bleibt damit innerhalb des Innenabstands von `main`.
  */
  fieldset {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    border: 1px solid #ccc;
    border-radius: 0.25rem;
    padding: 0.5rem 0.75rem 0.75rem;
    margin-inline: calc(-0.75rem - 1px);
    min-width: 0;
  }

  /*
    Die Spaltenzahl ergibt sich aus der Breite, nicht aus festen Haltepunkten
    (FR-003). Die Mindestbreite von 14 rem bestimmt selbst, wann umgebrochen
    wird: Ein Regler darunter wird zu ungenau, um ihn noch zu bedienen.

    Oben ausgerichtet und nicht unten: Nur ein Teil der Regler traegt eine
    Folgezeile mit der Druckhoehe. Bei unterer Ausrichtung saessen die uebrigen
    Regler dadurch tiefer als ihre Nachbarn.
  */
  .felder {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
    gap: 0.75rem 1.5rem;
    align-items: start;
    min-width: 0;
  }

  legend {
    padding: 0 0.35rem;
    font-size: 0.85em;
    color: #555;
  }

  .schnellwahl {
    padding: 0.05rem 0.4rem;
    font: inherit;
    color: #036;
    background: none;
    border: 1px solid #036;
    border-radius: 0.75rem;
    cursor: pointer;
  }

  /*
    Oben buendig statt mittig: Das Avatar haengt am oberen Rand, eine
    vertikal zentrierte Ueberschrift bekaeme daneben einen Rand nach oben,
    der wie ein Fehler aussieht.
  */
  .kopf {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }

  /*
    Die Ueberschrift darf umbrechen, statt das Bild aus dem Fenster zu
    schieben: Auf 390 px Breite passen Titel und Grafik sonst nicht
    nebeneinander (FR-027).
  */
  .kopf h1 {
    margin: 0;
    flex: 1;
    min-width: 0;
    /*
      "POH-Rechner D-EELK" traegt zwei unteilbare Bestandteile: In fester
      Groesse ragt die Zeile auf einem Telefon in das Avatar hinein. Die
      Schriftgroesse folgt deshalb der Fensterbreite (FR-027).
    */
    font-size: clamp(1.4rem, 6.5vw, 2rem);
    /*
      Enge Zeilenhoehe, damit die erste Zeile oben tatsaechlich buendig zum
      Avatar steht: Bei 1.5 liegt die haelftige Durchschusshoehe darueber und
      wirkt wie ein zusaetzlicher Rand.
    */
    line-height: 1.15;
  }

  /*
    Das Avatar haengt am Sichtfeld und schrumpft mit der Scrollstrecke
    (Issue #14). Es klebt nicht bloss am Kopfbereich fest: Ein `position:
    sticky` reichte nur so weit, wie sein umgebender Block hoch ist -- also
    kaum ueber die Einleitung hinaus. `right` folgt dem rechten Innenrand von
    `main`: Solange das Fenster breiter als die Textspalte ist, sitzt es in der
    freien Flaeche daneben; darunter am Fensterrand. Breite und Abstand nach
    oben setzt das Skript, weil sie am Scrollstand haengen.
  */
  .flugzeug {
    position: fixed;
    right: max(1.5rem, calc((100vw - 48rem) / 2 + 1.5rem));
    /* Kein Zeilenabstand unter dem Bild: Der Kasten soll genau das Bild sein. */
    line-height: 0;
    z-index: 10;
    /* Zeigegeraete sollen durch das Avatar hindurch auf den Inhalt treffen. */
    pointer-events: none;
  }

  .flugzeug img {
    display: block;
    width: 100%;
    height: auto;
    /* Pixelgrafik: die Kanten sollen Kanten bleiben. */
    image-rendering: pixelated;
    /*
      Weiter unten liegt das Avatar ueber dem Fliesstext. Ein weisser Schein
      entlang des Umrisses trennt beide voneinander. `drop-shadow` folgt der
      Silhouette der Grafik statt ihrem rechteckigen Kasten -- ein
      Hintergrund, egal wie weich, laege als Flaeche um das Flugzeug herum
      und wirkte als Fleck. Mehrfach gestapelt, weil ein einzelner Schatten
      zu duenn deckt, um Text darunter verschwinden zu lassen; die Radien
      bleiben klein, damit es ein Umriss bleibt und kein Hof.
    */
    filter: drop-shadow(0 0 var(--schein) #fff) drop-shadow(0 0 var(--schein) #fff)
      drop-shadow(0 0 var(--schein) #fff);
  }

  /*
    Der Schatten auf dem Boden. Er haengt nicht am Flugzeug, sondern liegt als
    eigener Fleck weit darunter und deutlich kleiner als dieses -- so entsteht
    Hoehe. Ein `drop-shadow` am Bild taugt dafuer nicht: Der bildet die
    Silhouette in Originalgroesse ab und klebt damit unmittelbar hinter dem
    Flugzeug, statt sich als Schatten aus der Distanz zu lesen.

    Alle Masse sind Anteile des Bildkastens, damit der Schatten beim
    Schrumpfen mitgeht. Die Ellipse laeuft nach aussen in die Transparenz und
    braucht deshalb keine Weichzeichnung.
  */
  .flugzeug::after {
    content: '';
    position: absolute;
    left: 30%;
    width: 40%;
    top: 210%;
    height: 30%;
    background: radial-gradient(
      closest-side at 50% 50%,
      rgba(0, 0, 0, 0.3),
      rgba(0, 0, 0, 0.16) 45%,
      rgba(0, 0, 0, 0) 100%
    );
  }

  /*
    Haelt im Kopfbereich die Breite frei, die das Avatar ungescrollt einnimmt.
    Ohne ihn liefe die Ueberschrift unter das Bild.

    Nur Breite, keine Hoehe: Das Avatar liegt `fixed` darueber und traegt zur
    Hoehe des Kopfbereichs ohnehin nichts bei. Ein 6 rem hoher Platzhalter
    machte die Kopfzeile hoeher als ihre Ueberschrift und schob den Text
    darunter grundlos nach unten.
  */
  .flugzeug-platzhalter {
    width: 6rem;
    flex: none;
  }

  .fehler {
    margin-top: 1rem;
    padding: 0.75rem;
    border: 2px solid #a00;
    color: #a00;
  }
</style>
