<script lang="ts">
  import { base } from '$app/paths';
  import {
    PohCalculationError,
    computeCruiseCapability,
    computeFuelPlan,
    computeTakeoffDistance,
    formatCelsius,
    formatCelsiusPrecise,
    formatFeet,
    formatHectopascal,
    formatKnots,
    formatNauticalMiles,
    formatPercent,
    getFuelPlanInputDomain,
    getOutsideAirTemperatureRange,
    getTakeoffInputDomain,
    toIsaDeviation,
    toOutsideAirTemperature,
    toPressureAltitude,
    type CruiseCapability,
    type FuelPlanResult,
    type TakeoffDistanceResult
  } from '@edsh-bucky/deelk-poh-core';
  import { EDSH } from '$lib/weather/edsh.js';
  import {
    ladeStand,
    sichereStand,
    istVeraltet,
    type Herkunft as GespeicherteHerkunft,
    type Stand
  } from '$lib/einstellungen/speicher.js';
  import { onMount } from 'svelte';
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
  type Herkunft = GespeicherteHerkunft | undefined;

  let qnhHerkunft = $state<Herkunft>(undefined);
  let temperaturHerkunft = $state<Herkunft>(undefined);
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
  function wetterUebernehmen(werte: Uebernahmewerte, herkunft: GespeicherteHerkunft): void {
    // Der Vergleichszeitpunkt wird sonst nur im Minutentakt nachgefuehrt. Ohne
    // diese Zeile stuende an einem eben abgerufenen Wert unter Umstaenden
    // schon die Alterswarnung.
    jetzt = Date.now();
    if (werte.qnhHpa !== undefined) {
      qnhHpa = werte.qnhHpa;
      qnhHerkunft = herkunft;
    }
    if (werte.outsideAirTemperatureC !== undefined) {
      outsideAirTemperatureC = werte.outsideAirTemperatureC;
      temperaturHerkunft = herkunft;
    }
    if (werte.runwayWindComponentKt !== undefined) {
      runwayWindComponentKt = werte.runwayWindComponentKt;
      pistenwindHerkunft = herkunft;
    }
    // Ohne Herkunftsvermerk, anders als die drei darüber: Ein Vermerk sagt
    // aus, dass ein Wert von einem Onlinedienst stammt und deshalb unverbindlich
    // ist. Die Graspiste stammt nicht von dort — sie ist eine feste Eigenschaft
    // des Platzes und genauso verbindlich wie die Platzhöhe.
    if (werte.dryGrassRunway === true) {
      dryGrassRunway = true;
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

  function temperaturVonHand(): void {
    temperaturHerkunft = undefined;
  }

  function pistenwindVonHand(): void {
    pistenwindHerkunft = undefined;
  }

  /**
   * Die Ausgangswerte an einer Stelle. Sie dienen doppelt: als Belegung beim
   * allerersten Besuch und als Rueckfallwert fuer jedes Feld, das sich aus dem
   * Speicher nicht zweifelsfrei lesen laesst (FR-009).
   */
  function ausgangswerte(): Stand {
    return {
      departureElevationFt: EDSH.elevationFt,
      cruiseAltitudeAmslFt: 4500,
      qnhHpa: 1013,
      outsideAirTemperatureC: 23,
      runwayWindComponentKt: 10,
      routeWindComponentKt: 10,
      distanceNm: 75,
      powerSettingPct: 70,
      dryGrassRunway: false,
      wetOrSnowRunway: false
    };
  }

  /**
   * Der gesicherte Stand wird erst **nach** dem ersten Rendern eingesetzt, nicht
   * schon bei der Belegung der Zustaende: Die Seite wird vorgerendert, und dort
   * gibt es keinen Browser-Speicher. Wuerde hier etwas anderes stehen als im
   * vorgerenderten HTML, widerspraechen sich Server- und Browserfassung.
   */
  onMount(() => {
    const stand = ladeStand(ausgangswerte());
    departureElevationFt = stand.departureElevationFt;
    cruiseAltitudeAmslFt = stand.cruiseAltitudeAmslFt;
    qnhHpa = stand.qnhHpa;
    outsideAirTemperatureC = stand.outsideAirTemperatureC;
    runwayWindComponentKt = stand.runwayWindComponentKt;
    routeWindComponentKt = stand.routeWindComponentKt;
    distanceNm = stand.distanceNm;
    powerSettingPct = stand.powerSettingPct;
    dryGrassRunway = stand.dryGrassRunway;
    wetOrSnowRunway = stand.wetOrSnowRunway;
    qnhHerkunft = stand.qnhHerkunft;
    temperaturHerkunft = stand.temperaturHerkunft;
    pistenwindHerkunft = stand.pistenwindHerkunft;
    geladen = true;

    /*
      Die Alterung der Vermerke laeuft auch bei offener Seite weiter: Wer die
      Seite eine Stunde lang stehen laesst, soll die Warnung sehen, ohne neu
      zu laden. Minutentakt genuegt -- die Grenze ist eine Stunde.
    */
    const takt = setInterval(() => (jetzt = Date.now()), 60_000);
    return () => clearInterval(takt);
  });

  let geladen = $state(false);
  let jetzt = $state(Date.now());

  /**
   * Sichert bei jeder Aenderung. Erst nach dem Laden, sonst schriebe der erste
   * Lauf die Ausgangswerte ueber den gerade noch ungelesenen Stand.
   */
  $effect(() => {
    const stand: Stand = {
      departureElevationFt,
      cruiseAltitudeAmslFt,
      qnhHpa,
      outsideAirTemperatureC,
      runwayWindComponentKt,
      routeWindComponentKt,
      distanceNm,
      powerSettingPct,
      dryGrassRunway,
      wetOrSnowRunway,
      qnhHerkunft,
      temperaturHerkunft,
      pistenwindHerkunft
    };
    if (geladen) sichereStand(stand);
  });

  /**
   * Der Herkunftsvermerk als fertiger Satz. Liegt der Abruf mehr als eine
   * Stunde zurueck, sagt der Vermerk das ausdruecklich und traegt ein
   * Warnzeichen: Ein gespeicherter Wetterwert sieht sonst genauso frisch aus
   * wie ein eben abgerufener (FR-006, Prinzip I). Der Wert selbst bleibt
   * unangetastet -- was damit geschieht, entscheidet der Pilot (FR-007).
   */
  function vermerk(herkunft: Herkunft): string | undefined {
    if (!herkunft) return undefined;
    const kopf = `aus ${herkunft.dienst}, gültig für ${herkunft.ort} ${herkunftZeit(herkunft.gueltigkeit)} Uhr`;
    return istVeraltet(herkunft, jetzt)
      ? `⚠️ ${kopf} — vor über einer Stunde abgerufen, bitte erneut abrufen`
      : `${kopf} — unverbindlich`;
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

  /**
   * Die Außentemperatur, in ganzen °C — die Größe, die der Pilot
   * ablesen kann. Bis Feature 031 stand hier die ISA-Abweichung; sie ist
   * seither die *Folgerung* (siehe `isaAbleitung`) und nicht mehr die Eingabe.
   *
   * Der Anfangswert entspricht der bisherigen Einstellung ISA +10 in der
   * Anfangsdruckhöhe von 977,78 ft: 13,06 °C Normtemperatur plus 10 ergeben
   * 23,06 °C, gerundet 23. Die daraus folgende Abweichung liegt damit bei
   * 9,94 statt glatt 10 — die unvermeidliche Folge davon, dass jetzt die
   * Temperatur die ganzzahlige Größe ist. An den angezeigten Ergebnissen
   * ändert das nichts.
   *
   * Er wird **einmalig** gesetzt und nicht laufend an die Höhe angepasst. Ein
   * `$effect`, der die Temperatur der Platzhöhe nachführte, machte aus der
   * Messung eine abgeleitete Größe — genau die Vermischung, die Feature 026
   * bei den beiden Windgrößen aufgelöst hat.
   */
  let outsideAirTemperatureC = $state(23);

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
   * Die Anschläge des Temperaturreglers. Anders als alle übrigen Bereiche ist
   * dieser nicht konstant: Eine Außentemperatur ist Normtemperatur plus
   * Abweichung und wandert deshalb mit der Platzdruckhöhe. Der Kern rechnet
   * ihn aus; die Oberfläche legt hier nichts fest (Zusicherung C-05).
   */
  const temperaturBereich = $derived(
    getOutsideAirTemperatureRange(platzDruckhoehe.pressureAltitudeFt)
  );

  /**
   * Die ISA-Abweichung als **Folgerung** aus der abgelesenen Temperatur und
   * der Platzdruckhöhe. Sie ist die Größe, mit der die Handbuchtabellen
   * arbeiten, und bleibt deshalb sichtbar — sie ist nur von der Eingabe in die
   * Folgezeile gewandert.
   *
   * Bewusst am **Platz** und nicht in Reiseflughöhe: Der Pilot misst am Boden.
   * Dass dieselbe Abweichung auch oben gilt, ist die übliche Annahme des
   * Standardgradienten und war schon vor Feature 031 die Grundlage der
   * Reiseleistungsrechnung.
   */
  const isaAbleitung = $derived(
    toIsaDeviation(platzDruckhoehe.pressureAltitudeFt, outsideAirTemperatureC)
  );

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
          //
          // Seit Feature 031 ist die Temperatur die Eingabe, und der Weg über
          // die Abweichung führt hier wieder zu ihr zurück. Der Rundlauf bleibt
          // trotzdem stehen: `computeTakeoffDistance` erwartet ein
          // `OutsideAirTemperatureResult` samt Quellenreferenz, und diese
          // Struktur nebenher zusammenzusetzen hieße, den Kern zu umgehen.
          pressureAltitude: platzDruckhoehe,
          outsideAirTemperature: toOutsideAirTemperature(
            platzDruckhoehe.pressureAltitudeFt,
            isaAbleitung.isaDeviationC
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
          isaDeviationC: isaAbleitung.isaDeviationC
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
        isaDeviationC: isaAbleitung.isaDeviationC,
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
      outsideAirTemperatureC,
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
          Die Platzhöhe steht an erster Stelle und der Luftdruck direkt
          dahinter: Beide zusammen ergeben die Druckhöhe, die in der Folgezeile
          der Platzhöhe steht. Wer sie liest, findet die zwei Regler, die sie
          bestimmen, davor — und nicht in zwei getrennten Rahmen, wie es bis
          Feature 039 war (Issue #9, Issue #39).
        -->
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
              aria-label="Platzhöhe und Bahnzustand von EDSH übernehmen"
              onclick={edshWaehlen}>EDSH</button
            >
          {/snippet}
          {#snippet folge()}
            ≙ Druckhöhe {formatFeet(platzDruckhoehe.pressureAltitudeFt)} @ {formatHectopascal(qnhHpa)}
          {/snippet}
        </RangeField>

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

              Bis Feature 031 war er der einzige Einstieg, obwohl der Dialog
              seit Feature 027 drei Regler bedient — mit der Begründung, ein
              zweiter Knopf verspräche eine Auswahl, die es erst im Dialog
              gibt. Sie hat nicht getragen: Wer den Pistenwind sucht, sucht ihn
              beim Pistenwind und nicht im Rahmen darüber. Alle drei Knöpfe
              öffnen denselben Dialog mit denselben drei Zeilen.
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
              <span data-testid="qnh-herkunft">{vermerk(qnhHerkunft)}</span>
            {/if}
          {/snippet}
        </RangeField>


        <RangeField
          id="temperatur"
          label="Außentemperatur (°C)"
          range={temperaturBereich}
          bind:value={outsideAirTemperatureC}
          format={formatCelsius}
          bedient={temperaturVonHand}
        >
          {#snippet neben()}
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
            <!--
              Die ISA-Abweichung ist seit Feature 031 die Folgerung und nicht
              mehr die Eingabe. Sie bleibt sichtbar, weil sie die Größe ist, mit
              der der Pilot die Zeile in der Handbuchtabelle findet
              (Constitution, Prinzip I).

              Mit einer Nachkommastelle und nicht wie der Regler auf ganze Grad:
              Sie dient als Beleg, und die angezeigte Zahl soll die sein, mit der
              gerechnet wurde.
            -->
            <span data-testid="isa-ableitung">
              ≙ ISA-Abweichung {formatCelsiusPrecise(isaAbleitung.isaDeviationC)}
            </span>
            {#if temperaturHerkunft}
              <span data-testid="temperatur-herkunft">{vermerk(temperaturHerkunft)}</span>
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
        temperaturBereich={temperaturBereich}
        pistenwindBereich={getTakeoffInputDomain().windComponentKt}
        uebernehmen={wetterUebernehmen}
      />

    </fieldset>
  </form>


  <!--
    Die Startstrecke steht seit Feature 039 unmittelbar unter den
    Grundbedingungen: Sie kommt mit genau diesen drei Größen aus. Alles
    darunter braucht zwei weitere — wer nur die Bahnlänge prüft, soll sie
    nicht erst einstellen müssen.
  -->
  <section id="startstrecke" class="bereich" aria-labelledby="startstrecke-titel">
    <h2 id="startstrecke-titel">Roll- und Startstrecke</h2>
    <TakeoffDistance
      result={startstrecke.wert}
      fehler={startstrecke.fehler}
      bind:dryGrass={dryGrassRunway}
      bind:wetOrSnow={wetOrSnowRunway}
      bind:windComponentKt={runwayWindComponentKt}
      windHerkunft={vermerk(pistenwindHerkunft)}
      windBedient={pistenwindVonHand}
      wetterAbrufen={() => wetterDialog?.oeffnen()}
    />
  </section>

  <!--
    Alles, was den Reiseflug betrifft, unter einer gemeinsamen Überschrift:
    Reiseflughöhe und Lasteinstellung wirken auf *beide* folgenden Blöcke, und
    ohne die Klammer stand nicht da, worauf sie sich beziehen. Die Regler
    standen bis Feature 039 oben bei den Grundbedingungen; dort gehörten sie
    nicht hin, weil die Startstrecke an keiner von beiden hängt (Issue #39).
  -->
  <section class="reiseflug-bereich" aria-labelledby="reiseflug-titel">
    <h2 id="reiseflug-titel">Reiseflug</h2>

    <form class="reiseflug" onsubmit={(event) => event.preventDefault()}>
      <fieldset>
        <!--
          Nicht noch einmal "Reiseflug": Die Überschrift darüber sagt das bereits,
          der Rahmen sagt, *welche* Bedingungen gemeint sind.
        -->
        <legend>Bedingungen im Reiseflug</legend>

        <div class="felder">
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
        </div>

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

    <section id="bedarf" class="bereich" aria-labelledby="bedarf-titel">
      <h3 id="bedarf-titel">Kraftstoffbedarf und Geschwindigkeiten</h3>

      <!--
        Beide Regler stehen erst hier und nicht oben bei den Grundbedingungen:
        Vor diesem Bereich werden sie nicht gebraucht — weder die Reiseleistung
        noch die Startstrecke hängen an ihnen (FR-014).
      -->
      <form onsubmit={(event) => event.preventDefault()}>
        <div class="felder einspaltig">
          <!--
            Der Streckenwind steht seit Feature 031 an erster Stelle, damit er
            auf einer Höhe mit dem Pistenwind des Nachbarbereichs liegt. Sein
            Bereich reicht weiter als der des Pistenwinds (−50 statt −10 kt),
            weil die Reiseleistung über die Geschwindigkeit über Grund rechnet
            und dabei keine Tabellengrenze für Rückenwind kennt.
          -->
          <RangeField
            id="streckenwind"
            label="Streckenwindkomponente (kt, positiv = Gegenwind)"
            range={domain.windComponentKt}
            bind:value={routeWindComponentKt}
            format={formatKnots}
          />

          <RangeField
            id="strecke"
            label="Streckenlänge (NM)"
            range={domain.distanceNm}
            bind:value={distanceNm}
            format={formatNauticalMiles}
          />
        </div>
      </form>

      {#if fehler}
        <p class="fehler" role="alert">{fehler}</p>
      {:else if result}
        <FuelResult {result} />
      {/if}
    </section>
  </section>
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

  /*
    Mehr Luft nach oben als ein Formular sonst hat: Darueber endet die
    Startstrecke mit ihrem aufklappbaren Rechenweg. Ohne diesen Abstand sieht
    der Reiseflug aus, als gehoerte er noch zu ihr -- er beginnt aber den
    naechsten Teil.
  */
  .reiseflug-bereich {
    margin-top: 2.5rem;
  }

  /*
    Die Rangfolge der Bloecke: <h2> fuer die beiden Teile "Roll- und
    Startstrecke" und "Reiseflug", <h3> fuer die beiden Ergebnisbloecke
    darunter, die derselben Reiseflughoehe und Lasteinstellung folgen.
  */
  .bereich h3,
  #startstrecke h2,
  .reiseflug-bereich > h2 {
    margin: 1.5rem 0 0.5rem;
  }

  /*
    Bis Feature 039 standen Startstrecke und Kraftstoffbedarf im Querformat
    nebeneinander. Das ging, solange beide dieselben Eingaben ueber sich
    hatten. Jetzt stehen die Reisegroessen zwischen ihnen -- zwei Spalten
    haetten die Reihenfolge zerschnitten, die dieses Feature herstellt.
  */
  .bereich {
    min-width: 0;
  }



  /*
    Im Querformat mehr Breite. Die Bedingung "Breite **und** Ausrichtung"
    stammt aus der Zeit der zwei Spalten: Ein Telefon quer ist 667 px breit,
    ein Tablet hoch 1032 px -- eine reine Breitenabfrage entschiede genau
    falsch herum. Sie bleibt, weil sie fuer die Textbreite dasselbe leistet.
  */
  @media (min-width: 40rem) and (orientation: landscape) {
    main {
      max-width: 64rem;
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

  /*
    Zwei Regler untereinander, auch wenn Platz für zwei Spalten wäre.
    Streckenlänge und Streckenwindkomponente tragen verschiedene Einheiten (NM
    und kt) bei fast gleichlautender Beschriftung — nebeneinander liest man
    leicht am falschen. Als Zusatzklasse und nicht als Änderung an `.felder`:
    Derselbe Raster trägt bei den Grundbedingungen fünf Regler, die
    nebeneinander richtig aufgehoben sind.
  */
  .felder.einspaltig {
    grid-template-columns: 1fr;
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
