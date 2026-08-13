<script lang="ts">
  import { base } from '$app/paths';
  import {
    alsAltersangabe,
    alsSatz,
    type Belegungsauskunft
  } from '@edsh-bucky/reservierung-core';

  /**
   * Der Reservierungsstand der D-EELK — bewusst ein Satz und kein Kalender.
   *
   * Wer vor dem Losfahren aufs Telefon schaut, hat genau eine Frage: Kann ich
   * jetzt hin? Ein Wochenraster beantwortet sie nicht schneller, es verlangt
   * nur, dass man sie sich selbst beantwortet (spec.md, US1).
   *
   * Gerechnet wird hier nichts. Ob das Flugzeug frei ist und wie der Satz
   * lautet, entscheidet der Kern; diese Seite zeigt ihn (Prinzip IV).
   */

  type Antwort =
    | ({ stand: 'vorhanden' } & Belegungsauskunft)
    | { stand: 'fehlt' };

  let zustand = $state<'laedt' | 'da' | 'unerreichbar'>('laedt');
  let antwort = $state<Antwort | undefined>(undefined);

  /**
   * Der Zeitpunkt, auf den sich der Satz bezieht. Er wird beim Laden gesetzt
   * und nicht fortgeschrieben: Ein Satz, der sich unter dem Blick des Lesers
   * aendert, ist schwerer zu pruefen als einer, der stillsteht.
   */
  let bezug = $state(new Date());

  async function laden() {
    zustand = 'laedt';
    try {
      const ergebnis = await fetch(`${base}/api/reservierung`);
      if (!ergebnis.ok) throw new Error(String(ergebnis.status));
      antwort = (await ergebnis.json()) as Antwort;
      bezug = new Date();
      zustand = 'da';
    } catch {
      // Kein Wort daraus machen, das nach "frei" klingt (FR-010).
      zustand = 'unerreichbar';
    }
  }

  $effect(() => {
    void laden();
  });
</script>

<svelte:head>
  <title>Reservierung D-EELK · Bucky</title>
</svelte:head>

<main>
  <h1>D-EELK</h1>

  {#if zustand === 'laedt'}
    <p class="satz gedaempft">Wird abgerufen …</p>
  {:else if zustand === 'unerreichbar' || antwort?.stand === 'fehlt'}
    <p class="satz unbekannt">Kein Reservierungsstand verfügbar</p>
    <p class="hinweis">
      Die Auskunft konnte nicht geladen werden. Ob das Flugzeug frei ist, lässt
      sich daraus <strong>nicht</strong> ableiten — bitte im
      Reservierungskalender nachsehen.
    </p>
  {:else if antwort}
    <p class="satz" class:belegt={!antwort.frei} class:frei={antwort.frei}>
      {alsSatz(antwort, bezug)}
    </p>
    <p class="alter" class:veraltet={antwort.veraltet}>
      {alsAltersangabe(antwort, bezug)}
    </p>
  {/if}

  <p class="hinweis">
    Unverbindliche Anzeige. Verbindlich ist der Reservierungskalender in
    Vereinsflieger.
  </p>

  <p class="zurueck"><a href="{base}/">← Übersicht</a></p>
</main>

<style>
  main {
    max-width: 34rem;
    margin: 0 auto;
    padding: 2rem 1rem;
    font-family: system-ui, sans-serif;
  }

  h1 {
    font-size: 1.25rem;
    letter-spacing: 0.08em;
    color: #555;
    margin: 0 0 0.5rem;
  }

  /*
    Der Satz ist der Inhalt der Seite, nicht eine Zeile darin. Deshalb traegt
    er die Groesse, die sonst eine Ueberschrift traegt -- er soll aus einem
    Meter Entfernung lesbar sein, mit dem Telefon in einer Hand.
  */
  .satz {
    font-size: 1.75rem;
    line-height: 1.3;
    font-weight: 600;
    margin: 0 0 0.5rem;
  }

  .frei {
    color: #1b6b2f;
  }
  .belegt {
    color: #9a3412;
  }
  .unbekannt {
    color: #555;
  }
  .gedaempft {
    color: #777;
    font-weight: 400;
  }

  .alter {
    margin: 0 0 1.5rem;
    color: #666;
    font-size: 0.9rem;
  }

  /*
    Die Kennzeichnung haengt nicht allein an der Farbe: Das Wort
    "moeglicherweise veraltet" steht im Text selbst. Farbe unterstuetzt hier
    nur, was ohnehin dasteht.
  */
  .veraltet {
    color: #92400e;
    font-weight: 600;
  }

  .hinweis {
    color: #666;
    font-size: 0.85rem;
    line-height: 1.5;
    margin: 0 0 1rem;
  }

  .zurueck {
    margin-top: 2rem;
    font-size: 0.9rem;
  }

  .zurueck a {
    color: #555;
  }
</style>
