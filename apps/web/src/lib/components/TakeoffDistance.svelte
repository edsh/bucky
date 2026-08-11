<script lang="ts">
  import type { TakeoffDistanceResult } from '@edsh-bucky/deelk-poh-core';
  import {
    formatCelsius,
    formatFeet,
    formatKnots,
    formatMetres,
    formatNumber,
    getTakeoffInputDomain,
    unitText,
    withNonBreakingUnits
  } from '@edsh-bucky/deelk-poh-core';
  import CalculationSteps from './CalculationSteps.svelte';
  import RangeField from './RangeField.svelte';
  import SourceCitations from './SourceCitations.svelte';
  import SurfaceSwitch from './SurfaceSwitch.svelte';

  /**
   * Roll- und Startstrecke der D-EELK. Reine Darstellung: Interpolation,
   * Zuschläge und Rundung liegen im Kern (Constitution-Prinzip IV,
   * Zusicherungen C-02, C-03, C-07).
   *
   * Die beiden Schalter für den Bahnzustand stehen in dieser Komponente und
   * nicht bei den Grundbedingungen: Sie wirken allein auf die Startstrecke
   * (FR-018). Der Pistenwind steht seit Feature 026 aus demselben Grund hier —
   * er ist der Wind auf der Bahn 10/28 und hat mit dem Wind entlang der
   * Reisestrecke nichts zu tun. Druckhöhe und Temperatur kommen dagegen von
   * außen: Sie gelten für den ganzen Flug (FR-019).
   */
  let {
    result,
    fehler,
    dryGrass = $bindable(),
    wetOrSnow = $bindable(),
    windComponentKt = $bindable(),
    windHerkunft,
    windBedient
  }: {
    result?: TakeoffDistanceResult;
    fehler?: string;
    dryGrass: boolean;
    wetOrSnow: boolean;
    windComponentKt: number;
    /**
     * Woher der Pistenwind stammt, falls aus dem Wetterabruf. Kommt von außen
     * und wird hier nicht erfunden: Der Abruf gehört zur Seite, die den Dialog
     * trägt — diese Komponente kennt weder Dienst noch Gültigkeitszeit.
     */
    windHerkunft?: string;
    /** Meldet, dass der Pilot den Regler selbst bewegt hat (FR-015). */
    windBedient?: () => void;
  } = $props();

  /**
   * Der Wertebereich des Pistenwinds kommt aus dem Kern und wird hier bezogen
   * statt als Prop durchgereicht (Zusicherung C-05: kein Adapter legt eigene
   * Grenzen fest). Der Umweg über die aufrufende Seite wäre der schlechtere
   * Weg: Dort steht bereits der Bereich der *anderen* Windgröße, und zwei
   * gleich aussehende Bereiche nebeneinander sind genau die Verwechslung, die
   * Feature 026 abbaut.
   *
   * Die untere Grenze von 10 kt Rückenwind ist keine Betriebsgrenze — das
   * Original-POH nennt in Abschnitt 2 überhaupt keinen Windwert. Sie ist das
   * Ende der Tabelle: „For operation with tailwinds up to 10 knots"
   * (POH-Seite 5-12, Anmerkung 3 zu Abb. 5-4; im Diesel-Anhang Anmerkung 2 zu
   * Abb. 5-1a). Jenseits davon gibt es nichts zu interpolieren.
   */
  const pistenwindBereich = getTakeoffInputDomain().windComponentKt;

  /**
   * Die Erläuterung des Windschritts stammt wortgleich aus dem Kern. Sie steht
   * sichtbar und nicht erst im aufgeklappten Rechenweg: Der Windzuschlag ist
   * der Schritt, der die Tabellenwerte am stärksten verschiebt (FR-017).
   */
  const windErlaeuterung = $derived(
    result?.steps.find((step) => step.id === 'takeoff.windAdjustment')?.explanation
  );

  /**
   * Beitrag eines Schritts in Metern. Das Vorzeichen steht davor, weil ein
   * Beitrag ohne Vorzeichen wie ein Endwert aussähe — und ein Endwert steht in
   * dieser Tabelle nur in der letzten Zeile. Gebildet wird hier nichts: Die
   * Beträge kommen als eigene Felder aus dem Kern, damit die Zeilen sich auf
   * die Gesamtstrecke aufaddieren (Zusicherung C-03).
   */
  function beitrag(metres: number): string {
    if (metres === 0) {
      return '—';
    }
    return metres > 0 ? `+${formatMetres(metres)}` : `−${formatMetres(Math.abs(metres))}`;
  }

  /**
   * Anmerkung 4 nennt ihren Zuschlag ausdrücklich als *Mindest*wert. Sobald
   * sie greift, ist jede daraus gebildete Strecke eine Untergrenze und keine
   * feste Zahl — das Zeichen sagt das an genau den Stellen, an denen der Pilot
   * die Strecke abliest. Den Prozentsatz selbst kennt allein der Kern (C-07);
   * hier steht nur die Feststellung `isMinimumValue`.
   */
  const mindestens = $derived(result?.isMinimumValue === true);

  function untergrenze(text: string): string {
    return mindestens ? `≥\u00a0${text}` : text;
  }

  /**
   * Der Haken an einer Anmerkung zeigt, dass sie in dieser Rechnung
   * tatsaechlich angewandt wurde. Ohne ihn stehen alle vier Anmerkungen
   * gleichwertig da, und es bleibt offen, welche gerade wirkt.
   */
  function angewandt(noteId: string): boolean {
    return (noteId === 'takeoff.note3' && dryGrass) || (noteId === 'takeoff.note4' && wetOrSnow);
  }

  /** Der Anteil aus Anmerkung 2, mit Vorzeichen und ohne eigene Rundung. */
  const windAnteil = $derived(
    result === undefined || result.windAdjustmentPct === 0
      ? 'Windstille'
      : `${result.windAdjustmentPct > 0 ? '+' : '−'}${unitText(formatNumber(Math.abs(result.windAdjustmentPct), 1), '%')}`
  );
</script>

<div class="startstrecke">
  <fieldset class="bahn">
    <legend>Bahnzustand</legend>
    <SurfaceSwitch
      id="gras"
      label="Trockenes Gras"
      note="Anmerkung 3"
      bind:checked={dryGrass}
    />
    <SurfaceSwitch
      id="nass"
      label="Nass oder Schnee"
      note="Anmerkung 4"
      bind:checked={wetOrSnow}
    />
  </fieldset>

  <!--
    Der Pistenwind steht über der Ergebnistabelle: Eingaben oben, Ergebnis
    unten — dieselbe Leserichtung wie beim Kraftstoffbedarf, wo die
    Streckenlänge ebenfalls über dem Ergebnis steht.
  -->
  <div class="pistenwind">
    <RangeField
      id="pistenwind"
      label="Pistenwind (kt, positiv = Gegenwind)"
      range={pistenwindBereich}
      bind:value={windComponentKt}
      format={formatKnots}
      bedient={windBedient}
    >
      {#snippet folge()}
        {#if windHerkunft}
          <span data-testid="pistenwind-herkunft">{windHerkunft}</span>
        {/if}
      {/snippet}
    </RangeField>
  </div>

  {#if fehler}
    <p class="fehler" role="alert">{fehler}</p>
  {:else if result}
    <!--
      Die Eckwerte der Rechnung stehen über der Tabelle: Druckhoehe und
      Temperatur sind die beiden Groessen, mit denen der Pilot die Zeile in der
      Handbuchtabelle wiederfindet (Constitution, Prinzip I).
    -->
    <p class="eckwerte">
      Druckhöhe {formatFeet(result.pressureAltitude.pressureAltitudeFt)},
      Außentemperatur {formatCelsius(result.outsideAirTemperature.outsideAirTemperatureC)}
    </p>

    <!--
      Die beiden Strecken stehen nur einmal, naemlich als Spalten. Die
      Zwischenzeilen zeigen den Beitrag des jeweiligen Schritts in Metern und
      nicht den Zwischenstand: So stehen alle Betraege einer Spalte
      untereinander und addieren sich sichtbar auf die Gesamtstrecke.

      Der Bahnzuschlag ist dabei in beiden Spalten derselbe. Genau das ist die
      Auslegung der Anmerkungen 3 und 4: Der Zuschlag entsteht aus dem
      Startlauf und wirkt am Boden, nicht in der Luft — er waechst nicht mit
      der Strecke ueber das Hindernis mit.
    -->
    <table class="aufschluesselung">
      <thead>
        <tr>
          <td></td>
          <th scope="col">Startrollstrecke</th>
          <th scope="col">Startstrecke über {withNonBreakingUnits(result.obstacleLabel)}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row">Laut Tabelle</th>
          <td>{formatMetres(result.tableGroundRollM)}</td>
          <td>{formatMetres(result.tableOverObstacleM)}</td>
        </tr>
        <tr>
          <th scope="row">
            Wind
            <span class="anteil">{windAnteil}</span>
          </th>
          <td>{beitrag(result.windAdjustmentGroundRollM)}</td>
          <td>{beitrag(result.windAdjustmentOverObstacleM)}</td>
        </tr>
        <tr>
          <th scope="row">
            Bahnzustand
            <span class="anteil">
              {result.surfaceAllowancePct === 0
                ? 'befestigt und trocken'
                : `+${unitText(formatNumber(result.surfaceAllowancePct, 0), '%')} des Startlaufs`}
            </span>
          </th>
          <td class:mindestwert={mindestens}>{untergrenze(beitrag(result.surfaceAllowanceM))}</td>
          <td class:mindestwert={mindestens}>{untergrenze(beitrag(result.surfaceAllowanceM))}</td>
        </tr>
        <tr class="summe">
          <th scope="row">Gesamtstrecke</th>
          <td class:mindestwert={mindestens}>{untergrenze(formatMetres(result.groundRollM))}</td>
          <td class:mindestwert={mindestens}>{untergrenze(formatMetres(result.overObstacleM))}</td>
        </tr>
      </tbody>
    </table>

    <!--
      Der Hinweis steht immer und nicht nur im Zweifelsfall: Ob die gerundeten
      Zeilen im Einzelfall aufgehen, liesse sich nur durch eigenes Runden
      feststellen — und gerundet wird ausschliesslich im Kern (C-03). In etwa
      drei von zehn Faellen weicht eine Spalte um einen Meter ab; ohne diesen
      Satz sieht das aus wie ein Rechenfehler.
    -->
    <p class="rundungshinweis">
      Auf ganze Meter gerundet. Die Zeilen können sich deshalb um einen Meter
      von der Gesamtstrecke unterscheiden.
    </p>

    {#if windErlaeuterung}
      <p class="erlaeuterung">{windErlaeuterung}</p>
    {/if}

    <!--
      Erst die Anmerkungen, dann die Bedingungen — in dieser Reihenfolge stehen
      sie auch im Flughandbuch. Andersherum las sich "Windstille" unter "Es
      gilt" wie eine Einschraenkung des Ergebnisses, obwohl der Wind zwei
      Zeilen darueber gerade eingerechnet wurde: Die Bedingung gilt fuer die
      *Tabelle*, nicht fuer die Rechnung.
    -->
    <h4>Hinweise</h4>
    <ul class="hinweise">
      {#each result.advisories as advisory (advisory.id)}
        <li>{advisory.text}</li>
      {/each}
      {#each result.notes as note (note.id)}
        <!--
          Anmerkung 4 traegt dieselbe gelbe Hervorhebung wie die Werte in der
          Tabelle, sobald sie greift. Ohne sie steht die Farbe oben ohne
          Erklaerung da: Der Grund fuer das Groesser-Gleich-Zeichen ist genau
          dieser Satz, und die gemeinsame Farbe stellt die Verbindung her.
        -->
        <li class:angewandt={angewandt(note.id)}>
          {#if note.id === 'takeoff.note4' && mindestens}
            <mark class="mindestwert">{note.text}</mark>
          {:else}
            {note.text}
          {/if}{#if angewandt(note.id)}<span
              class="haken"
              title="in dieser Rechnung berücksichtigt">&nbsp;✓</span
            >{/if}
        </li>
      {/each}
    </ul>

    <!--
      Die Bedingungen der Tabelle stehen im Wortlaut der Digitalisierung.
      Ohne sie liesse sich nicht erkennen, dass die Werte etwa fuer volle
      Landeklappen und Hoechstabflugmasse gelten (FR-016).
    -->
    <h4>Es gilt</h4>
    <ul class="hinweise bedingungen">
      {#each result.conditions as condition (condition)}
        <li>{condition}</li>
      {/each}
    </ul>

    <SourceCitations
      sources={[result.source]}
      preflightCheckNotice={result.preflightCheckNotice}
    />

    <CalculationSteps steps={result.steps} />
  {/if}
</div>

<style>
  .bahn {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1.5rem;
    border: 1px solid #ccc;
    border-radius: 0.25rem;
    padding: 0.5rem 0.75rem 0.75rem;
    /*
      Seitlich buendig zum uebrigen Text, wie die Fieldsets der Seite: Der
      Ausbruch entspricht genau Innenabstand plus Rahmenstaerke, damit der
      *Inhalt* des Rahmens auf der Textkante steht und nicht nach innen
      versetzt.
    */
    margin: 0 calc(-0.75rem - 1px) 1rem;
    min-width: 0;
  }

  /* Derselbe Abstand nach unten wie beim Fieldset darüber. */
  .pistenwind {
    margin-bottom: 1rem;
  }

  legend {
    padding: 0 0.35rem;
    font-size: 0.85em;
    color: #555;
  }

  .eckwerte {
    margin: 0 0 0.75rem;
    font-size: 0.85em;
    color: #555;
  }

  /*
    Die Spaltenueberschriften tragen die beiden Streckenarten. Sie duerfen
    umbrechen -- "Startstrecke ueber 15 m Hindernis" passt auf einem Telefon
    nicht in eine Zeile, und eine abgeschnittene Ueberschrift laesst offen,
    welche der beiden Strecken in der Spalte steht.
  */
  thead th {
    text-align: right;
    /*
      Oben ausgerichtet: Die rechte Ueberschrift bricht auf schmalen Anzeigen
      auf zwei Zeilen um. Bei unterer Ausrichtung saesse die einzeilige linke
      Ueberschrift dann tiefer als ihre Nachbarin.
    */
    vertical-align: top;
    font-size: 0.85em;
    font-weight: 400;
    color: #555;
  }

  .aufschluesselung {
    border-collapse: collapse;
    width: 100%;
  }

  th,
  td {
    text-align: left;
    padding: 0.35rem 0.5rem;
    border-bottom: 1px solid #ddd;
  }

  td {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .anteil {
    display: block;
    font-weight: 400;
    font-size: 0.8em;
    color: #666;
  }

  .summe th,
  .summe td {
    font-weight: 700;
    border-top: 2px solid #333;
  }

  .summe td {
    font-size: 1.1em;
  }

  .rundungshinweis {
    margin: 0.35rem 0 0;
    font-size: 0.8em;
    color: #666;
  }

  .erlaeuterung {
    margin: 0.5rem 0 0;
    font-size: 0.85em;
    color: #333;
  }

  h4 {
    margin: 1rem 0 0.5rem;
  }

  /*
    Gelb und nicht rot: Ein Mindestwert ist keine Fehlermeldung, sondern eine
    Zahl, die nach oben offen ist. Das Zeichen davor traegt die Aussage; die
    Farbe fuehrt nur das Auge dorthin.
  */
  .mindestwert {
    background: #fff3b0;
    /* `mark` faerbt den Text sonst nach Browservorgabe um. */
    color: inherit;
    border-radius: 0.2rem;
    padding: 0 0.2rem;
  }

  .haken {
    color: #1a7f37;
    font-weight: 700;
  }

  .angewandt {
    color: #1a1a1a;
  }

  .hinweise li {
    margin-bottom: 0.5rem;
    font-size: 0.9em;
  }

  .fehler {
    margin: 0;
    color: #a00;
    font-weight: 700;
  }
</style>
