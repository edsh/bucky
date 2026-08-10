<script lang="ts">
  import { base } from '$app/paths';
  import {
    PohCalculationError,
    computeCruiseCapability,
    computeFuelPlan,
    formatCelsius,
    formatFeet,
    formatHectopascal,
    formatKnots,
    formatNauticalMiles,
    formatPercent,
    getFuelPlanInputDomain,
    toPressureAltitude,
    type CruiseCapability,
    type FuelPlanResult
  } from '@edsh-bucky/deelk-poh-core';
  import CruiseCapabilityView from '$lib/components/CruiseCapability.svelte';
  import FuelResult from '$lib/components/FuelResult.svelte';
  import PowerLever from '$lib/components/PowerLever.svelte';
  import RangeField from '$lib/components/RangeField.svelte';

  /**
   * Dünner Adapter: nimmt die sechs Felder entgegen und reicht sie an den Kern
   * weiter. Wertebereiche und Auswahllisten stammen aus dem Kern, nicht aus
   * dieser Datei (Constitution-Prinzip IV, Zusicherung C-02).
   */
  const domain = getFuelPlanInputDomain();

  /** Platzhöhe von EDSH (Hohn) als Schnellwahl — der Heimatplatz der D-EELK. */
  const EDSH_ELEVATION_FT = 971;

  // Vorgaben eines typischen Fluges ab dem Heimatplatz: EDSH, eine Höhe unter
  // der Transponderpflicht, eine Strecke in der Größenordnung eines
  // Nachmittagsausflugs. Wer etwas anderes vorhat, verstellt einen Regler.
  let departureElevationFt = $state(EDSH_ELEVATION_FT);
  let cruiseAltitudeAmslFt = $state(4500);
  let qnhHpa = $state(1013);
  let distanceNm = $state(75);
  let powerSettingPct = $state(70);
  let isaDeviationC = $state(10);
  let windComponentKt = $state(10);

  /**
   * Die Druckhöhe zu beiden Höhen, unabhängig von der Gesamtrechnung. Sie soll
   * auch dann unter dem Regler stehen, wenn die Rechnung scheitert — gerade
   * dann erklärt sie nämlich, warum. Gerechnet wird dabei nicht selbst: die
   * Funktion stammt aus dem Kern (Zusicherung C-04).
   */
  const platzDruckhoehe = $derived(toPressureAltitude(departureElevationFt, qnhHpa));
  const reiseDruckhoehe = $derived(toPressureAltitude(cruiseAltitudeAmslFt, qnhHpa));

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
  const AVATAR_KLEIN_PX = 34;
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
        windComponentKt
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
    // Liest alle sieben Eingaben und läuft daher bei jeder Änderung erneut.
    void [
      departureElevationFt,
      cruiseAltitudeAmslFt,
      qnhHpa,
      distanceNm,
      powerSettingPct,
      isaDeviationC,
      windComponentKt
    ];
    berechnen();
  });
</script>

<svelte:head>
  <title>Kraftstoffrechner D-EELK — Bucky Highfly</title>
</svelte:head>

<svelte:window bind:scrollY />

<!--
  Das Avatar steht bewusst außerhalb von <main>: Es ist fest im Sichtfeld
  verankert, nicht Teil des Textflusses. Im Kopfbereich bleibt ein Platzhalter
  derselben Größe stehen, damit die Überschrift nicht darunterläuft.
-->
<img
  class="flugzeug"
  src="{base}/D-EELK_pixelart_192px.png"
  alt="Die D-EELK als Pixelgrafik"
  style="width: {avatarBreitePx}px; top: {avatarObenPx}px;"
/>

<main>
  <header class="kopf">
    <h1>Kraftstoffrechner D-EELK</h1>
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
        />

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
        />
      </div>

      <!--
        Der Leistungshebel gehoert fachlich hierher: Er bestimmt gemeinsam mit
        Hoehe, Druck und Temperatur, was die Maschine leistet. Er steht im
        selben Rahmen, nur seitlich -- wie im Cockpit neben den Anzeigen.
      -->
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

  <form onsubmit={(event) => event.preventDefault()}>
    <fieldset>
      <legend>Streckenflug</legend>

      <div class="felder">

        <RangeField
          id="platzhoehe"
          label="Platzhöhe ASL (ft)"
          range={domain.departureElevationFt}
          bind:value={departureElevationFt}
          format={formatFeet}
        >
          {#snippet neben()}
            <button
              type="button"
              class="schnellwahl"
              onclick={() => (departureElevationFt = EDSH_ELEVATION_FT)}
            >
              EDSH
            </button>
          {/snippet}
          {#snippet folge()}
            ≙ Druckhöhe {formatFeet(platzDruckhoehe.pressureAltitudeFt)} @ {formatHectopascal(qnhHpa)}
          {/snippet}
        </RangeField>

        <RangeField
          id="strecke"
          label="Streckenlänge (NM)"
          range={domain.distanceNm}
          bind:value={distanceNm}
          format={formatNauticalMiles}
        />

        <RangeField
          id="wind"
          label="Windkomponente (kt, positiv = Gegenwind)"
          range={domain.windComponentKt}
          bind:value={windComponentKt}
          format={formatKnots}
        />
      </div>
    </fieldset>
  </form>

  {#if fehler}
    <p class="fehler" role="alert">{fehler}</p>
  {/if}

  {#if result}
    <FuelResult {result} />
  {/if}
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

  /* Der Leistungshebel steht seitlich, wie im Cockpit neben den Anzeigen. */
  fieldset {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    border: 1px solid #ccc;
    border-radius: 0.25rem;
    padding: 0.5rem 0.75rem 0.75rem;
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

  .kopf {
    display: flex;
    align-items: center;
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
      "Kraftstoffrechner" ist ein langes, unteilbares Wort: In fester Groesse
      ragt es auf einem Telefon in das Avatar hinein. Die Schriftgroesse folgt
      deshalb der Fensterbreite (FR-027).
    */
    font-size: clamp(1.4rem, 6.5vw, 2rem);
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
    display: block;
    height: auto;
    z-index: 10;
    /* Pixelgrafik: die Kanten sollen Kanten bleiben. */
    image-rendering: pixelated;
    /* Zeigegeraete sollen durch das Avatar hindurch auf den Inhalt treffen. */
    pointer-events: none;
  }

  /*
    Haelt im Kopfbereich den Platz frei, den das Avatar ungescrollt einnimmt.
    Ohne ihn liefe die Ueberschrift unter das Bild.
  */
  .flugzeug-platzhalter {
    width: 6rem;
    height: 6rem;
    flex: none;
  }

  .fehler {
    margin-top: 1rem;
    padding: 0.75rem;
    border: 2px solid #a00;
    color: #a00;
  }
</style>
