<script lang="ts">
  import {
    markerwinkel,
    ringsegmente,
    type Reservierung,
    type Ringsegment,
    type Sonnenzeiten
  } from '@edsh-bucky/reservierung-core';
  import { FARBEN } from '$lib/flotte/farben.js';
  import { darstellungFuer, kurzkennung } from '$lib/flotte/darstellung.js';

  /**
   * Der Tagesuhr-Avatar: das Bild der Maschine in einem Ring, der den ganzen
   * Tag zeigt.
   *
   * Der Ring entsteht aus `ringsegmente()` im Kern — diese Datei übersetzt die
   * gelieferten Winkel und Namen nur in `conic-gradient` und Farbwerte
   * (Prinzip IV). Sie rechnet selbst nichts aus; wäre hier eine zweite
   * Winkelabbildung, liefe sie irgendwann gegen die geprüfte auseinander.
   *
   * Die Zahlen „6" und „21" außen bezeichnen die **Skalennaht**, nicht den
   * Sonnenstand. Sie wandern nie mit: Wer den Ring einmal gelesen hat, findet
   * 15:00 im Dezember an derselben Stelle wie im Juni. Die Sonnenmarker
   * dagegen sitzen auf der echten Kante des Tages und erzählen die Jahreszeit
   * (E-15).
   */
  let {
    kennung,
    belegungen,
    jetzt,
    sonnenzeiten = null,
    groesse = 96,
    statusfarbe = null,
    gesperrt = false
  }: {
    kennung: string;
    /** `null` heißt „keine Auskunft möglich" — dann bleibt der Ring neutral. */
    belegungen: Reservierung[] | null;
    jetzt: Date;
    sonnenzeiten?: Sonnenzeiten | null;
    groesse?: number;
    /** `null` lässt den Statuspunkt entfallen (Fall „kein Stand"). */
    statusfarbe?: string | null;
    gesperrt?: boolean;
  } = $props();

  /** Ringbreite nach Handoff: 7 px beim 96er, 6 px beim 74er, 4 px im Header. */
  const ringbreite = $derived(groesse >= 90 ? 7 : groesse >= 60 ? 6 : 4);

  const darstellung = $derived(darstellungFuer(kennung));
  const kurz = $derived(kurzkennung(kennung));

  const segmente = $derived(
    belegungen === null ? [] : ringsegmente(belegungen, kennung, jetzt, sonnenzeiten)
  );

  const marker = $derived(markerwinkel(jetzt, sonnenzeiten));

  const RINGFARBEN: Record<Ringsegment['fuellung'], string> = {
    frei: FARBEN.frei,
    nacht: FARBEN.nacht,
    reservierung: FARBEN.belegt,
    sperre: FARBEN.sperreFlaeche
  };

  /**
   * Die Segmente als `conic-gradient`.
   *
   * `conic-gradient` beginnt bei 0° oben und läuft im Uhrzeigersinn — genau
   * die Zählweise des Kerns, deshalb ist hier keine Umrechnung nötig. Ein
   * Segment mit negativem `vonGrad` ist das über 0° hinweg geschlossene; es
   * wird in zwei Stops geteilt, sonst zeigte der Ring dort einen Sprung.
   */
  const gradient = $derived.by(() => {
    if (segmente.length === 0) return null;

    const stops: string[] = [];
    for (const s of segmente) {
      const farbe = RINGFARBEN[s.fuellung];
      if (s.vonGrad < 0) {
        stops.push(`${farbe} ${360 + s.vonGrad}deg 360deg`);
        stops.push(`${farbe} 0deg ${s.bisGrad}deg`);
      } else {
        stops.push(`${farbe} ${s.vonGrad}deg ${s.bisGrad}deg`);
      }
    }
    // Aufsteigend sortiert, weil der über 0° geschlossene Teil hinten steht.
    stops.sort((a, b) => startwinkel(a) - startwinkel(b));
    return `conic-gradient(${stops.join(', ')})`;
  });

  function startwinkel(stop: string): number {
    const treffer = /([\d.]+)deg/.exec(stop);
    return treffer ? Number(treffer[1]) : 0;
  }

  /** Radius der Strichmitte, gemessen von der Mitte des Avatars (Handoff). */
  const markerRadius = $derived(groesse / 2 + ringbreite / 2);
  const jetztRadius = $derived(markerRadius - 2.5);
  // Ohne Rundung: CSS nimmt Bruchteile von Pixeln entgegen, und C-03 aus
  // Feature 001 haelt Adapter von jeder Rundung fern.
  const strichbreite = $derived(Math.max(2, ringbreite * 0.34));

  /** Radius der Zahlen „6"/„21" außerhalb des Rings. */
  const schrift = $derived(groesse >= 90 ? 10 : 9);
  const zahlRadius = $derived(groesse / 2 + ringbreite + schrift * 0.6);

  const statuspunkt = $derived(groesse >= 90 ? 20 : 17);
  const punktAbstand = $derived(groesse >= 90 ? 9 : 6);
</script>

<div
  class="uhr"
  style:--groesse="{groesse}px"
  style:--ring="{ringbreite}px"
  style:--gradient={gradient ?? 'none'}
  style:width="{groesse}px"
  style:height="{groesse}px"
>
  <div class="ring" class:neutral={gradient === null}>
    <div class="flaeche" class:absperrband={gesperrt}>
      {#if darstellung.bild}
        <img src={darstellung.bild} alt="" />
      {:else}
        <span class="kurz" style:font-size="{groesse >= 90 ? 18 : groesse >= 60 ? 14 : 10.5}px">
          {kurz}
        </span>
      {/if}
    </div>
  </div>

  {#if marker.sonnenaufgang !== null}
    <span
      class="marker"
      style:background={FARBEN.sonnenaufgang}
      style:width="{strichbreite}px"
      style:height="{ringbreite + 1}px"
      style:transform="translate(-50%, -50%) rotate({marker.sonnenaufgang}deg) translateY(-{markerRadius}px)"
    ></span>
  {/if}

  {#if marker.sonnenuntergang !== null}
    <span
      class="marker"
      style:background={FARBEN.sonnenuntergang}
      style:width="{strichbreite}px"
      style:height="{ringbreite + 1}px"
      style:transform="translate(-50%, -50%) rotate({marker.sonnenuntergang}deg) translateY(-{markerRadius}px)"
    ></span>
  {/if}

  <span
    class="marker jetzt"
    style:width="{strichbreite}px"
    style:height="{ringbreite + 1}px"
    style:transform="translate(-50%, -50%) rotate({marker.jetzt}deg) translateY(-{jetztRadius}px)"
  ></span>

  {#if groesse >= 60}
    <!--
      Gesetzt wie die Marker: erst auf den Winkel drehen, dann nach außen
      schieben. Die Zahl selbst dreht innen wieder zurück, damit sie
      aufrecht steht. Das spart die Trigonometrie im Adapter — dieselbe
      Rechnung an zwei Stellen ist eine Fehlerquelle, keine Ersparnis.
    -->
    <span
      class="zahlpos"
      style:transform="translate(-50%, -50%) rotate(225deg) translateY(-{zahlRadius}px)"
    >
      <span class="zahl" style:font-size="{schrift}px" style:transform="rotate(-225deg)">6</span>
    </span>
    <span
      class="zahlpos"
      style:transform="translate(-50%, -50%) rotate(135deg) translateY(-{zahlRadius}px)"
    >
      <span class="zahl" style:font-size="{schrift}px" style:transform="rotate(-135deg)">21</span>
    </span>
  {/if}

  {#if statusfarbe !== null}
    <span
      class="punkt"
      style:background={statusfarbe}
      style:width="{statuspunkt}px"
      style:height="{statuspunkt}px"
      style:right="{punktAbstand}px"
      style:bottom="{punktAbstand}px"
    ></span>
  {/if}
</div>

<style>
  .uhr {
    position: relative;
    flex: none;
  }

  .ring {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    padding: var(--ring);
    background: var(--gradient);
    box-sizing: border-box;
  }

  /* Ohne Auskunft bleibt der Ring grau — nie grün, denn Grün hieße „frei". */
  .ring.neutral {
    background: rgba(127, 127, 127, 0.28);
  }

  .flaeche {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: var(--avatarflaeche, #fff);
    overflow: hidden;
    display: grid;
    place-items: center;
  }

  .flaeche img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  /* Das Absperrband liegt auf der Avatarfläche, nicht auf dem Ring: Der Ring
     zeigt weiterhin das Tagesmuster (Handoff). */
  .absperrband {
    background-image: repeating-linear-gradient(
      45deg,
      rgba(200, 80, 64, 0.42) 0 6px,
      rgba(255, 255, 255, 0.5) 6px 12px
    );
  }

  .kurz {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-weight: 700;
    opacity: 0.6;
    letter-spacing: 0.02em;
  }

  .marker {
    position: absolute;
    left: 50%;
    top: 50%;
    border-radius: 1px;
    /* Der Halo trennt den Strich vom Ring darunter — ohne ihn verschwindet
       der Jetzt-Marker im belegten Rot. */
    box-shadow: 0 0 0 1.5px var(--bg, #fff);
  }

  .marker.jetzt {
    background: var(--text, #1b2027);
  }

  .zahlpos {
    position: absolute;
    left: 50%;
    top: 50%;
  }

  .zahl {
    display: block;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-weight: 600;
    opacity: 0.45;
    line-height: 1;
  }

  .punkt {
    position: absolute;
    border-radius: 50%;
    box-shadow: 0 0 0 3px var(--bg, #fff);
  }
</style>
