<script lang="ts">
  import {
    alsStatussatz,
    alsZusatzzeile,
    zustandFuer,
    type Reservierung,
    type Sonnenzeiten
  } from '@edsh-bucky/reservierung-core';
  import TagesuhrAvatar from './TagesuhrAvatar.svelte';
  import { statusfarbe } from '$lib/flotte/farben.js';
  import { darstellungFuer } from '$lib/flotte/darstellung.js';

  /**
   * Eine Maschine in der Übersicht: Avatar mit Tagesuhr, Kennzeichen,
   * Kurzsatz und — wo es etwas zu sagen gibt — eine zweite Zeile „danach …".
   *
   * Der Zustand wird hier bei **jeder** Änderung von `jetzt` neu berechnet,
   * nicht vom Server geliefert (E-09). Eine vom Server mitgeschickte Aussage
   * über „jetzt" wäre schon beim Eintreffen eine Minute alt.
   *
   * Der Zustand hängt nie allein an der Farbe (FR-005, SC-005): Der
   * Statuspunkt trägt ihn, der Text sagt ihn aus. Wer Rot und Grün nicht
   * unterscheiden kann, liest „Belegt bis 14:00" — und weiß dasselbe.
   */
  let {
    kennung,
    belegungen,
    jetzt,
    sonnenzeiten = null,
    avatargroesse = 96
  }: {
    kennung: string;
    /** `null` heißt „keine Auskunft möglich" — dann bleibt die Kachel stumm. */
    belegungen: Reservierung[] | null;
    jetzt: Date;
    sonnenzeiten?: Sonnenzeiten | null;
    avatargroesse?: number;
  } = $props();

  const zustand = $derived(belegungen === null ? null : zustandFuer(belegungen, kennung, jetzt));
  const farbe = $derived(zustand === null ? null : statusfarbe(zustand));
  const satz = $derived(zustand === null ? 'Kein Stand' : alsStatussatz(zustand, jetzt));
  const rohzusatz = $derived(zustand === null ? null : alsZusatzzeile(zustand, jetzt));

  /**
   * Bei einer Sperre liefert der Kern vertragsgemäß beides: „Gesperrt bis
   * Freitag, 21. Aug." und „bis Freitag, 21. Aug.". In der Detailansicht, wo
   * das Statuswort allein über dem Satz steht, ergänzen sie einander — auf
   * einer 118 Pixel breiten Kachel stünde dasselbe Datum zweimal
   * untereinander. Die Kachel lässt die Wiederholung deshalb weg; der Kern
   * bleibt unverändert.
   */
  const zusatz = $derived(
    rohzusatz !== null && satz.includes(rohzusatz) ? null : rohzusatz
  );
  const typ = $derived(darstellungFuer(kennung).typ);
</script>

<div class="kachel" style:width="118px">
  <TagesuhrAvatar
    {kennung}
    {belegungen}
    {jetzt}
    {sonnenzeiten}
    groesse={avatargroesse}
    statusfarbe={farbe}
    gesperrt={zustand?.status === 'sperre'}
  />

  <span class="kennzeichen">{kennung}</span>
  {#if typ}
    <span class="typ">{typ}</span>
  {/if}

  <span class="satz" style:color={farbe ?? 'inherit'} class:stumm={farbe === null}>{satz}</span>

  {#if zusatz}
    <span class="danach">{zusatz}</span>
  {/if}
</div>

<style>
  .kachel {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 7px;
    text-align: center;
  }

  .kennzeichen {
    font-size: 13.5px;
    font-weight: 700;
    letter-spacing: 0.04em;
  }

  .typ {
    font-size: 10.5px;
    opacity: 0.45;
    margin-top: -5px;
  }

  .satz {
    font-size: 11.5px;
    font-weight: 600;
    text-wrap: pretty;
  }

  /* Ohne Auskunft steht der Satz in der Textfarbe, nicht in einer Statusfarbe
     — jede Statusfarbe wäre hier eine Behauptung. */
  .satz.stumm {
    opacity: 0.5;
    font-weight: 500;
  }

  .danach {
    font-size: 11px;
    opacity: 0.5;
    margin-top: -4px;
  }
</style>
