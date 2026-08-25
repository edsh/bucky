<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import {
    alsDauerwort,
    alsLueckensatz,
    alsTagUndMonatWort,
    alsUhrzeitAusMinute,
    alsWahlfenster,
    alsWochentag,
    ausweichluecke,
    beginnSetzen,
    endeSetzen,
    fensterIn,
    kachelDauer,
    kachelMoeglich,
    kachelZiel,
    konflikte,
    luecken,
    minuteDesTages,
    modusFuer,
    naechsterTag,
    ortstag,
    RAHMEN,
    reservierungsVerweis,
    sonnenzeitenFuerTag,
    stundeVon,
    verschiebeBlock,
    zeitpunktFuerMinute,
    zieheKante,
    type Kachelart,
    type Kacheleinheit,
    type Reservierung,
    type Sonnenzeiten,
    type Wahlmodus,
    type Zeitwahlfenster
  } from '@edsh-bucky/reservierung-core';
  import Zeitbalken from './Zeitbalken.svelte';

  /**
   * Der Zeitwähler: das Sheet, in dem ein Fenster entsteht.
   *
   * Es bucht nichts. Es kann auch nichts buchen — diese Anwendung liest den
   * Reservierungskalender und schreibt nie hinein (Prinzip II). Was es tut, ist
   * zweierlei: Es lässt ein Zeitfenster festlegen und sagt, was dieses Fenster
   * antrifft; und es öffnet die Reservierungsmaske mit genau diesem Fenster
   * vorbelegt.
   *
   * Gerechnet wird hier nichts. Rasterung, Lückensuche, Gesten-Regeln,
   * Konflikte, Modus, Ausweichsuche und Adressbau stehen in `zeitwahl.ts` und
   * sind dort ohne Oberfläche geprüft (Prinzip IV, NFR-001). Diese Datei macht
   * daraus Kacheln, Prozente und Sätze — und hält den Merkzettel der laufenden
   * Geste, der nirgendwo sonst hingehört.
   *
   * ## Die Zeitform
   *
   * Innerhalb des Sheets ist ein Tag ein Ortstag `YYYY-MM-DD` und ein Fenster
   * ein Paar Tagesminuten. Zeitpunkte entstehen erst an der Grenze — beim
   * Absprung über `alsWahlfenster` (research.md, E-02).
   */
  interface Eigenschaften {
    kennung: string;
    /** Der Ortstag, auf dem das Sheet aufgeht; drinnen ist er wechselbar. */
    tag: string;
    /**
     * Die getippte Uhrzeit als Tagesminute, oder `null`, wenn der Tipp keinen
     * Ort hatte. Dann sucht das Sheet selbst eine Stelle (B-06).
     */
    minute: number | null;
    belegungen: Reservierung[];
    jetzt: Date;
    /** Alle abgelegten Sätze; der passende wird je Tag herausgesucht. */
    sonnenzeiten: Sonnenzeiten[] | null;
    schliessen: () => void;
  }

  const {
    kennung,
    tag: anfangstag,
    minute: anfangsminute,
    belegungen,
    jetzt,
    sonnenzeiten,
    schliessen
  }: Eigenschaften = $props();

  /** Heute plus sechs — der Bereich, den Vereinsflieger für Vorausbuchungen zeigt. */
  const TAGE = 7;

  /** Die Stundenbeschriftung unter dem Zieh-Balken. */
  const ACHSE = [6, 10, 14, 18, 22];

  const STUNDEN = Array.from(
    { length: RAHMEN.bis / 60 - RAHMEN.von / 60 + 1 },
    (_, i) => RAHMEN.von / 60 + i
  );
  const MINUTEN = [0, 15, 30, 45];

  /**
   * Die sieben wählbaren Tage, aus dem heutigen Ortstag fortgezählt.
   *
   * Über `naechsterTag` und nicht über `+ 86400000`: An den beiden
   * Umstellungstagen ist ein Tag nicht 24 Stunden lang, und der Wähler zeigte
   * dann zweimal denselben oder überspränge einen.
   */
  const heute = $derived(ortstag(jetzt));
  const tage = $derived.by(() => {
    const liste = [heute];
    for (let i = 1; i < TAGE; i += 1) liste.push(naechsterTag(liste[i - 1]));
    return liste;
  });

  /**
   * Die freien Abschnitte eines Tages — einmal ganz, einmal ab jetzt.
   *
   * Der ganze Tag ist der Bezug für „👍 Frei 09:00–14:00" und für die
   * Ausweichsuche: Rückwirkend eintragen ist erlaubt, Vergangenes zählt also
   * mit. Ab jetzt ist der Bezug für **Vorschläge** — eine Lücke, die vor einer
   * Stunde begann, schlägt niemand mehr vor.
   */
  function freieLuecken(fuerTag: string) {
    return luecken(belegungen, kennung, fuerTag);
  }

  function kommendeLuecken(fuerTag: string) {
    return luecken(
      belegungen,
      kennung,
      fuerTag,
      ortstag(jetzt) === fuerTag ? minuteDesTages(jetzt) : undefined
    );
  }

  /**
   * Das Fenster, mit dem ein Tag anfängt (B-06).
   *
   * Mit Uhrzeit: genau dort — auch wenn dort etwas steht. Wer eine belegte Zeit
   * antippt, will genau sie und bekommt die Auskunft, dass sie belegt ist
   * (FR-025, Grenzfall der Spec); der Rahmen der Wahl ist dann der Flugtag und
   * nicht die Lücke, die er verfehlt hat.
   *
   * Ohne Uhrzeit: die erste Lücke, die noch bevorsteht.
   *
   * Ohne jede Lücke: `null` — der Leerfall. Ein erfundenes Fenster wäre hier
   * der schlimmere Fehler, weil es aussähe wie eine Auskunft (FR-044).
   */
  function anfangsfenster(fuerTag: string, minute: number | null): Zeitwahlfenster | null {
    const alle = freieLuecken(fuerTag);
    if (alle.length === 0) return null;

    if (minute === null) {
      const luecke = kommendeLuecken(fuerTag)[0] ?? alle[0];
      return fensterIn(luecke, luecke.von);
    }

    const getroffen = alle.find((l) => minute >= l.von && minute < l.bis);
    return getroffen ? fensterIn(getroffen, minute) : fensterIn(RAHMEN, minute);
  }

  /*
    Tag und Fenster sind **Saatgut**, keine Ableitung: Die beiden Eigenschaften
    sagen, wo das Sheet aufgeht; danach gehört der Zustand dem Sheet. Ein
    `$derived` setzte jede Zieh-Bewegung wieder auf den Tipp zurück, mit dem
    alles anfing. `untrack` schreibt genau das hin — einmal lesen, dann nicht
    mehr zuhören.
  */
  let tag = $state(untrack(() => anfangstag));
  let fenster = $state<Zeitwahlfenster | null>(
    untrack(() => anfangsfenster(anfangstag, anfangsminute))
  );
  let variante = $state<'ziehen' | 'kacheln'>('ziehen');

  const tagesluecken = $derived(freieLuecken(tag));
  const tagesSonnenzeiten = $derived(sonnenzeitenFuerTag(sonnenzeiten, tag));

  const gefundeneKonflikte = $derived(
    fenster === null ? [] : konflikte(belegungen, kennung, tag, fenster)
  );

  /**
   * Der Modus wird **abgeleitet, nie gesetzt** (Key Entities der Spec). Es gibt
   * keinen Zustand „warteliste", den etwas einschaltet; es gibt ein Fenster, und
   * was es antrifft, ergibt den Modus.
   */
  const modus = $derived<Wahlmodus>(
    fenster === null ? 'frei' : modusFuer(fenster, tag, gefundeneKonflikte, jetzt)
  );

  const lueckensatz = $derived(
    fenster === null ? '' : alsLueckensatz(fenster, tagesluecken, gefundeneKonflikte)
  );

  const verweis = $derived(
    reservierungsVerweis(kennung, fenster === null ? null : alsWahlfenster(tag, fenster))
  );

  /**
   * Was stattdessen frei wäre — nur dort, wo es etwas zu umgehen gibt.
   *
   * Aus der Lücke wird über `fensterIn` ein Fenster von höchstens zwei Stunden,
   * nicht die volle Lücke: Ein Vorschlag „frei wäre 06:00–22:00" ist keiner.
   */
  const ausweich = $derived.by<Zeitwahlfenster | null>(() => {
    if (fenster === null) return null;
    if (modus !== 'warteliste' && modus !== 'gesperrt') return null;
    const luecke = ausweichluecke(tagesluecken, fenster);
    return luecke === null ? null : fensterIn(luecke, luecke.von);
  });

  /**
   * Die vier Abschlussformen (FR-038).
   *
   * `gesperrt` hat keine — für gesperrte Zeiten gibt es keinen Absprung
   * (FR-040). Das ist der einzige Modus, der irgendwo endet.
   *
   * Die drei übrigen sind **gleich gebaut**: Ort, Tätigkeit, Ellipse, Pfeil.
   * „Trotzdem eintragen" stand vorher neben „In Vereinsflieger reservieren" und
   * las sich wie eine andere Art von Handlung — dabei ist es dieselbe, nur mit
   * einem Konflikt darin (Auskunft des Auftraggebers, 25.08.2026).
   *
   * „Vormerken" sagt, was drüben geschieht, und verspricht hier nichts: Der
   * Eintrag entsteht im Vereinsflieger, und was aus der Überschneidung wird,
   * entscheidet der Verein — so steht es auch im Hinweis darunter (FR-041).
   *
   * Die Ellipse schließt ohne Leerzeichen an das Wort an. Sie ist hier kein
   * Auslassungszeichen im Satz, sondern gehört zur Beschriftung: „Hier geht es
   * weiter, aber woanders" (FR-042).
   */
  const AKTION: Record<Wahlmodus, string> = {
    frei: 'Im Vereinsflieger reservieren… ↗',
    nachtrag: 'Im Vereinsflieger nachtragen… ↗',
    warteliste: 'Im Vereinsflieger vormerken… ↗',
    gesperrt: ''
  };

  /**
   * Was unter der Aktion steht.
   *
   * Der Wartelisten-Satz sagt bewusst nur, wer entscheidet — **keine** Zusage
   * einer Benachrichtigung und keine Vormerkung (FR-041, research.md E-04).
   * Diese Anwendung kennt keine Nutzeridentität und hat keinen Melde-Weg; ein
   * „Bucky meldet sich" wäre eine Zusage, die niemand einlösen kann.
   */
  const FUSSHINWEIS: Record<Wahlmodus, string> = {
    frei: 'Gebucht wird dort — Anmeldung nötig. Diese Seite ändert in Vereinsflieger nichts.',
    nachtrag: 'Rückwirkend eintragen ist erlaubt; ob es passt, klärt der Verein — nicht diese Seite.',
    warteliste: 'Überschneidungen klärt der Verein, nicht diese Seite.',
    gesperrt: 'Eine Sperre hebt nur der Verein auf. Diese Seite ändert in Vereinsflieger nichts.'
  };

  // ---------------------------------------------------------------- Tagwechsel

  /**
   * Die ersten drei Tage tragen ihren Namen statt ihres Wochentags.
   *
   * „Morgen" ist die Auskunft, die jemand sucht; „Mittwoch" wäre dieselbe
   * Auskunft, nur mit einem Rechenschritt davor. Ab dem vierten Tag kippt es:
   * „In vier Tagen" zwingt zum Zählen, „Freitag" nicht.
   */
  const NAMEN = ['Heute', 'Morgen', 'Übermorgen'];

  /**
   * Der Tagesindex ist eine **Anzeigegröße**: Er entscheidet über „Heute" und
   * über die Anschläge der Pfeile, und er wird aus dem Ortstag gewonnen, nicht
   * umgekehrt (research.md, E-02).
   */
  const index = $derived(tage.indexOf(tag));
  const mittag = $derived(zeitpunktFuerMinute(tag, 12 * 60));

  /*
    Ausgeschrieben, nicht gekürzt: Hier steht eine ganze Zeile zur Verfügung.
    `Mi` und `31.08.` sind die Formen für die 40 Pixel breite Wochenspalte und
    die schmale Tagesliste — im Tageswechsler wären sie eine Abkürzung ohne
    Gegenleistung (Auskunft des Auftraggebers, 25.08.2026).
  */
  const tagesname = $derived(NAMEN[index] ?? alsWochentag(mittag));
  const tagesdatum = $derived(alsTagUndMonatWort(mittag));

  /**
   * Ein Tageswechsel setzt das Fenster neu (FR-037): erste freie Lücke, Dauer
   * wieder zwei Stunden. Das gewählte Fenster mitzunehmen wäre verlockend und
   * falsch — an einem anderen Tag steht dort womöglich etwas anderes, und das
   * Sheet behauptete beim Aufschlagen eine Wahl, die niemand getroffen hat.
   */
  function tagSetzen(neu: string) {
    tag = neu;
    fenster = anfangsfenster(neu, null);
  }

  function wechsle(um: number) {
    const ziel = tage[index + um];
    if (ziel !== undefined) tagSetzen(ziel);
  }

  function beiDatum(ereignis: Event & { currentTarget: HTMLInputElement }) {
    const wert = ereignis.currentTarget.value;
    if (tage.includes(wert)) tagSetzen(wert);
  }

  // ------------------------------------------------------------------- Ziehen

  /**
   * Der Merkzettel der laufenden Geste — eine **gewöhnliche Variable**, kein
   * `$state`.
   *
   * Er zeigt nichts an. Als Zustand geführt löste er bei jeder Zeigerbewegung
   * einen Durchlauf aus, der nichts ändert (research.md, E-05).
   *
   * `abstand` ist der Griff-Abstand: wie weit die Fassstelle vom Bezugspunkt
   * entfernt lag. Er wird hier abgezogen, damit der Kern die **gewünschte**
   * Minute bekommt und nicht die Zeigerposition (Z-04).
   */
  let merkzettel: {
    art: 'start' | 'ende' | 'block';
    abstand: number;
    messen: (ereignis: PointerEvent) => number;
  } | null = null;

  /**
   * Jedem Loslassen folgt ein `click`. Ohne diesen Merker setzte er das eben
   * gezogene Fenster auf die Zwei-Stunden-Vorgabe zurück (FR-032, Szenario 1.5).
   *
   * Gesetzt wird er schon beim Anfassen und nicht erst bei der ersten Bewegung:
   * Auch ein Tipp auf den Block — ohne jede Bewegung — darf das Fenster nicht
   * neu setzen. Das ist die eine Abweichung vom Prototyp, und sie deckt echt
   * mehr ab, statt weniger.
   */
  let zogGerade = false;

  function beiGriff(
    art: 'start' | 'ende' | 'block',
    minute: number,
    messen: (ereignis: PointerEvent) => number
  ) {
    if (fenster === null) return;
    const bezug = art === 'ende' ? fenster.bis : fenster.von;
    merkzettel = { art, abstand: minute - bezug, messen };
    zogGerade = true;

    /*
      An `window`, nicht am Balken: Auf einem Telefon verlässt der Finger den
      Balken während einer Zieh-Bewegung ständig. Am Balken gebunden bräche die
      Geste dann ab — der Normalfall, nicht der Ausnahmefall (NFR-002, E-05).
    */
    window.addEventListener('pointermove', beiBewegung);
    window.addEventListener('pointerup', beiLoslassen);
    window.addEventListener('pointercancel', beiLoslassen);
  }

  function beiBewegung(ereignis: PointerEvent) {
    if (merkzettel === null || fenster === null) return;
    const ziel = merkzettel.messen(ereignis) - merkzettel.abstand;
    fenster =
      merkzettel.art === 'block'
        ? verschiebeBlock(fenster, RAHMEN, ziel)
        : zieheKante(fenster, RAHMEN, merkzettel.art, ziel);
  }

  function beiLoslassen() {
    merkzettel = null;
    window.removeEventListener('pointermove', beiBewegung);
    window.removeEventListener('pointerup', beiLoslassen);
    window.removeEventListener('pointercancel', beiLoslassen);

    /*
      Erst nach dem `click`, der auf das Loslassen folgt — sonst hätte ihn
      niemand verbraucht. Und über eine Aufgabe statt im `click` selbst, damit
      ein Loslassen ohne folgenden Klick den Merker nicht stehen lässt und den
      übernächsten Tipp verschluckt.
    */
    setTimeout(() => {
      zogGerade = false;
    }, 0);
  }

  onDestroy(beiLoslassen);

  /** Ein Tipp auf den Sheet-Balken setzt ein neues Fenster — außer nach einer Geste. */
  function beiTipp(ereignis: { tag: string; minute: number | null }) {
    if (zogGerade) return;
    if (ereignis.minute === null) return;
    fenster = anfangsfenster(tag, ereignis.minute);
  }

  function achsenposition(stunde: number): string {
    return `${((stunde * 60 - RAHMEN.von) / (RAHMEN.bis - RAHMEN.von)) * 100}%`;
  }

  // ------------------------------------------------------------------ Kacheln

  interface Kachelstand {
    moeglich: boolean;
    gewaehlt: boolean;
    /** Die Dauer, die diese Wahl ergäbe — nie negativ, nie unmöglich (FR-034). */
    dauer: string;
    /** Ob die Wahl eine Belegung schnitte. Wählbar bleibt sie trotzdem (FR-031). */
    konflikt: boolean;
  }

  const LEERE_KACHEL: Kachelstand = {
    moeglich: false,
    gewaehlt: false,
    dauer: '',
    konflikt: false
  };

  function kachelstand(art: Kachelart, einheit: Kacheleinheit, wert: number): Kachelstand {
    if (fenster === null) return LEERE_KACHEL;

    const ziel = kachelZiel(fenster, art, einheit, wert);
    const moeglich = kachelMoeglich(fenster, RAHMEN, art, ziel);
    const aktuell = art === 'beginn' ? fenster.von : fenster.bis;
    const neu =
      art === 'beginn' ? beginnSetzen(fenster, RAHMEN, ziel) : endeSetzen(fenster, RAHMEN, ziel);

    return {
      moeglich,
      gewaehlt: einheit === 'stunde' ? stundeVon(aktuell) === wert : aktuell % 60 === wert,
      dauer: alsDauerwort(kachelDauer(fenster, RAHMEN, art, ziel)),
      konflikt: moeglich && konflikte(belegungen, kennung, tag, neu).length > 0
    };
  }

  /**
   * Gesetzt wird aus dem Fenster heraus, das gerade gilt — nicht aus einem, das
   * beim Zeichnen der Kachel galt. Zwei Taps im selben Frame wirken so beide
   * (Grenzfall der Spec).
   */
  function kachelWaehlen(art: Kachelart, einheit: Kacheleinheit, wert: number) {
    const jetziges = fenster;
    if (jetziges === null) return;

    const ziel = kachelZiel(jetziges, art, einheit, wert);
    if (!kachelMoeglich(jetziges, RAHMEN, art, ziel)) return;

    fenster =
      art === 'beginn'
        ? beginnSetzen(jetziges, RAHMEN, ziel)
        : endeSetzen(jetziges, RAHMEN, ziel);
  }

  function zweistellig(n: number): string {
    return String(n).padStart(2, '0');
  }

  /** Die beiden Kachelspalten. Eine Liste, damit die Spalte nicht zweimal dasteht. */
  const SPALTEN: { art: Kachelart; kopf: string }[] = [
    { art: 'beginn', kopf: '🛫 Beginn' },
    { art: 'ende', kopf: '🛬 Ende' }
  ];

  // ------------------------------------------- Sichtbarkeit der Kachelauswahl

  let sheetElement = $state<HTMLElement | null>(null);
  let kachelblock = $state<HTMLElement | null>(null);
  let spalteBeginn = $state<HTMLElement | null>(null);
  let spalteEnde = $state<HTMLElement | null>(null);

  /** −1 oberhalb, 0 sichtbar, 1 unterhalb des Sichtfelds. */
  let pfeilBeginn = $state(0);
  let pfeilEnde = $state(0);

  /**
   * Nachgeführt wird nur, wenn sich diese Kennung ändert. Ohne sie setzte jeder
   * Durchlauf das eigene Scrollen des Nutzers zurück, und die Spalte ließe sich
   * nicht bedienen (B-09, research.md E-06).
   */
  let letzteKennung = '';
  let letzteVariante: 'ziehen' | 'kacheln' | null = null;

  /**
   * Gemessen wird über `getBoundingClientRect`-Differenz, **nicht** über
   * `offsetTop`: Das misst gegen den nächsten positionierten Vorfahren, und das
   * Sheet ist `fixed` — also gegen etwas anderes als die Spalte.
   */
  function gewaehlteKachel(spalte: HTMLElement): HTMLElement | null {
    return spalte.querySelector<HTMLElement>('[data-gewaehlt="true"]');
  }

  function zentriere(spalte: HTMLElement) {
    const kachel = gewaehlteKachel(spalte);
    if (kachel === null) return;
    const rand = spalte.getBoundingClientRect();
    const eigen = kachel.getBoundingClientRect();
    spalte.scrollTop += eigen.top - rand.top - (rand.height - eigen.height) / 2;
  }

  function richtung(spalte: HTMLElement | null): number {
    if (spalte === null) return 0;
    const kachel = gewaehlteKachel(spalte);
    if (kachel === null) return 0;
    const rand = spalte.getBoundingClientRect();
    const eigen = kachel.getBoundingClientRect();
    if (eigen.bottom < rand.top + 6) return -1;
    if (eigen.top > rand.bottom - 6) return 1;
    return 0;
  }

  function pfeileAktualisieren() {
    pfeilBeginn = richtung(spalteBeginn);
    pfeilEnde = richtung(spalteEnde);
  }

  /**
   * Die Stundenspalte merken.
   *
   * Als Aktion und nicht als `bind:this`, weil beide Spalten aus derselben
   * Schleife kommen: `bind:this` will ein festes Ziel, hier hängt es am
   * Schleifenwert.
   */
  function merken(knoten: HTMLElement, art: Kachelart) {
    if (art === 'beginn') spalteBeginn = knoten;
    else spalteEnde = knoten;

    return {
      destroy() {
        if (art === 'beginn') spalteBeginn = null;
        else spalteEnde = null;
      }
    };
  }

  function nachfuehren(kennungJetzt: string) {
    if (spalteBeginn === null || spalteEnde === null) return;
    letzteKennung = kennungJetzt;
    zentriere(spalteBeginn);
    zentriere(spalteEnde);
    pfeileAktualisieren();
  }

  $effect(() => {
    if (variante !== 'kacheln' || fenster === null) return;

    const kennungJetzt = `${variante}|${tag}|${stundeVon(fenster.von)}|${stundeVon(fenster.bis)}`;
    if (kennungJetzt === letzteKennung) return;

    // Beim Umschalten der Variante stehen die Spalten noch nicht im DOM (B-09).
    if (spalteBeginn === null || spalteEnde === null) {
      const marke = requestAnimationFrame(() => nachfuehren(kennungJetzt));
      return () => cancelAnimationFrame(marke);
    }

    nachfuehren(kennungJetzt);
  });

  /**
   * Auf kurzen Bildschirmen den Kachelblock ins Sichtfeld holen (FR-050).
   *
   * Nur beim Umschalten und nicht bei jeder Wahl: Wer danach selbst scrollt,
   * soll dort bleiben, wo er hingescrollt hat.
   */
  $effect(() => {
    if (variante !== 'kacheln') {
      letzteVariante = variante;
      return;
    }
    if (variante === letzteVariante) return;
    if (sheetElement === null || kachelblock === null) return;
    letzteVariante = variante;

    const marke = requestAnimationFrame(() => {
      if (sheetElement === null || kachelblock === null) return;
      const ueberstand =
        kachelblock.getBoundingClientRect().bottom - sheetElement.getBoundingClientRect().bottom;
      if (ueberstand > 0) sheetElement.scrollTop += ueberstand + 12;
    });
    return () => cancelAnimationFrame(marke);
  });

  // ------------------------------------------------------------------- Rahmen

  /**
   * Der Fokus gehört ins Sheet, sobald es erscheint — sonst stünde er auf dem
   * Balken dahinter, und die nächste Taste bediente etwas Verdecktes.
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
    bind:this={sheetElement}
    use:anfangsfokus
  >
    <div class="grabber" aria-hidden="true"></div>

    <div class="kopf">
      <h2>{kennung} reservieren</h2>
      <button class="abbrechen" type="button" onclick={schliessen}>Abbrechen</button>
    </div>

    <!--
      Der Tageswechsler steht auch im Leerfall: Ein Tag ohne freie Zeit ist
      genau der Tag, an dem man weiterblättern will.
    -->
    <div class="tagwechsel">
      <button
        class="chevron"
        type="button"
        disabled={index <= 0}
        onclick={() => wechsle(-1)}
        aria-label="Einen Tag zurück">‹</button
      >

      <div class="tagmitte">
        <span class="tagname">{tagesname}</span>
        <span class="tagdatum">{tagesdatum}</span>
        <!--
          Der Datumswähler des Systems liegt unsichtbar über der Beschriftung
          (B-07). Sein Wertformat ist bereits der Ortstag — umgerechnet wird
          nichts.
        -->
        <input
          class="datumswahl"
          type="date"
          value={tag}
          min={tage[0]}
          max={tage[TAGE - 1]}
          onchange={beiDatum}
          aria-label="Tag wählen"
        />
      </div>

      <button
        class="chevron"
        type="button"
        disabled={index >= TAGE - 1}
        onclick={() => wechsle(1)}
        aria-label="Einen Tag vor">›</button
      >
    </div>

    {#if fenster === null}
      <!--
        FR-044: Kein Fenster, also kein Wähler und kein Absprung. Ein erfundener
        Vorschlag wäre hier der schlimmere Fehler — er sähe aus wie eine Auskunft.
      -->
      <p class="leerfall">
        An diesem Tag ist nichts frei. Es gibt kein Fenster, das sich vorschlagen ließe — ein
        anderer Tag geht oben.
      </p>
    {:else}
      <div class="statuszone">
        <div class="fensterzeile">
          <span class="zeitfenster">
            {alsUhrzeitAusMinute(fenster.von)}–{alsUhrzeitAusMinute(fenster.bis)}
          </span>
          <span class="dauerpille">{alsDauerwort(fenster.bis - fenster.von)}</span>
        </div>

        <!--
          Feste Höhe (B-08): Ein umbrechender Konflikttext verschöbe sonst alles
          darunter — und zwar genau dann, wenn jemand zieht (FR-051, SC-005).
        -->
        <div class="statustexte">
          <p class="statussatz">{lueckensatz}</p>
          {#if modus === 'nachtrag'}
            <p class="nachtragzeile">Liegt vor jetzt — das wird ein Nachtrag.</p>
          {/if}
        </div>
      </div>

      <div class="umschalter" role="tablist" aria-label="Art der Zeitwahl">
        <button
          type="button"
          role="tab"
          aria-selected={variante === 'ziehen'}
          class:aktiv={variante === 'ziehen'}
          onclick={() => (variante = 'ziehen')}>Ziehen</button
        >
        <button
          type="button"
          role="tab"
          aria-selected={variante === 'kacheln'}
          class:aktiv={variante === 'kacheln'}
          onclick={() => (variante = 'kacheln')}>Uhrzeit wählen</button
        >
      </div>

      {#if variante === 'ziehen'}
        <div class="ziehbereich">
          <div class="ziehbalken">
            <Zeitbalken
              {kennung}
              {belegungen}
              {tag}
              {jetzt}
              sonnenzeiten={tagesSonnenzeiten}
              auswahl={fenster}
              getippt={beiTipp}
              gegriffen={beiGriff}
            />
          </div>

          <div class="stundenachse" aria-hidden="true">
            {#each ACHSE as stunde (stunde)}
              <span style:left={achsenposition(stunde)}>{stunde}</span>
            {/each}
          </div>

          <p class="ziehhinweis">
            Block verschieben, Kanten für Beginn und Ende ziehen — es rastet in 15 Minuten.
          </p>
        </div>
      {:else}
        <div class="kachelblock" bind:this={kachelblock}>
          {#each SPALTEN as spalte (spalte.art)}
            <div class="kachelspalte">
              <span class="kachelkopf">{spalte.kopf}</span>

              <div class="spaltenpaar">
                <div class="stunden" use:merken={spalte.art} onscroll={pfeileAktualisieren}>
                  {#each STUNDEN as stunde (stunde)}
                    {@const stand = kachelstand(spalte.art, 'stunde', stunde)}
                    <button
                      type="button"
                      class="kachel"
                      class:gewaehlt={stand.gewaehlt}
                      class:konflikt={stand.konflikt}
                      class:unmoeglich={!stand.moeglich}
                      data-gewaehlt={stand.gewaehlt}
                      disabled={!stand.moeglich}
                      onclick={() => kachelWaehlen(spalte.art, 'stunde', stunde)}
                    >
                      <span class="kachelwert">{zweistellig(stunde)}</span>
                      <span class="kacheldauer">{stand.dauer}</span>
                    </button>
                  {/each}
                </div>

                <div class="minuten">
                  {#each MINUTEN as wert (wert)}
                    {@const stand = kachelstand(spalte.art, 'minute', wert)}
                    <button
                      type="button"
                      class="kachel"
                      class:gewaehlt={stand.gewaehlt}
                      class:konflikt={stand.konflikt}
                      class:unmoeglich={!stand.moeglich}
                      disabled={!stand.moeglich}
                      onclick={() => kachelWaehlen(spalte.art, 'minute', wert)}
                    >
                      <span class="kachelwert">:{zweistellig(wert)}</span>
                      <span class="kacheldauer">{stand.dauer}</span>
                    </button>
                  {/each}
                </div>

                <!--
                  Das Pfeilchen sagt, wo die gewählte Stunde liegt, wenn sie
                  gerade nicht zu sehen ist (FR-035, Szenario 2.5).
                -->
                {#if (spalte.art === 'beginn' ? pfeilBeginn : pfeilEnde) < 0}
                  <span class="pfeil oben" aria-hidden="true">▲</span>
                {:else if (spalte.art === 'beginn' ? pfeilBeginn : pfeilEnde) > 0}
                  <span class="pfeil unten" aria-hidden="true">▼</span>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}

      <!--
        Feste Höhen für Ausweichzone und Container: Der Moduswechsel darf die
        Abschlussaktion nicht verschieben (B-08, SC-005).
      -->
      <div class="abschluss">
        <div class="ausweichzone">
          {#if ausweich}
            <button class="ausweich" type="button" onclick={() => (fenster = ausweich)}>
              Frei wäre {alsUhrzeitAusMinute(ausweich.von)}–{alsUhrzeitAusMinute(ausweich.bis)} — stattdessen
              nehmen
            </button>
          {/if}
        </div>

        {#if modus === 'gesperrt'}
          <!-- FR-040: Für gesperrte Zeiten gibt es keinen Absprung. -->
          <p class="sperrbox">Gesperrt — hier hilft auch kein Eintrag.</p>
        {:else}
          <a class="weiter" href={verweis} rel="noopener noreferrer" target="_blank">
            {AKTION[modus]}
          </a>
        {/if}

        <p class="fuss">{FUSSHINWEIS[modus]}</p>
      </div>
    {/if}
  </div>
</div>

<style>
  /* Overlay und Sheet liegen über allem. */
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
    position: relative;
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

  /*
    Die Trefferfläche wächst, die Schrift nicht (FR-052). Über ein
    Pseudo-Element und nicht über `padding`: Die Kopfzeile richtet sich an der
    Schriftlinie aus, und Innenabstand verschöbe „Abbrechen" gegenüber der
    Überschrift daneben. Ein Wort in 13 px misst rund 16 px hoch — allein
    getroffen wird es auf einem Telefon nur mit Glück.
  */
  .abbrechen::after {
    content: '';
    position: absolute;
    inset: -15px -12px;
  }

  /* ------------------------------------------------------------ Tagwechsler */

  .tagwechsel {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 10px;
  }

  .chevron {
    flex: none;
    width: 52px;
    min-height: 52px;
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    font-size: 26px;
    line-height: 1;
    cursor: pointer;
  }

  /*
    Am Rand des Bereichs abgeschwächt **und** ohne Wirkung: Die Abschwächung
    allein wäre Zustandsinformation nur über Farbe (NFR-004, B-07).
  */
  .chevron:disabled {
    opacity: 0.3;
    cursor: default;
  }

  .tagmitte {
    position: relative;
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: center;
    gap: 1px;
    min-height: 52px;
    justify-content: center;
  }

  .tagname {
    font-size: 15px;
    font-weight: 650;
  }

  .tagdatum {
    font-size: 11.5px;
    opacity: 0.55;
  }

  .datumswahl {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    padding: 0;
    border: 0;
    background: none;
    color: transparent;
    opacity: 0;
    cursor: pointer;
  }

  /* -------------------------------------------------------------- Statuszone */

  .statuszone {
    margin-top: 8px;
  }

  .fensterzeile {
    display: flex;
    align-items: baseline;
    gap: 10px;
  }

  .zeitfenster {
    font-size: 27px;
    font-weight: 600;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    letter-spacing: -0.01em;
  }

  .dauerpille {
    padding: 3px 9px;
    border-radius: 999px;
    background: rgba(127, 127, 127, 0.16);
    font-size: 12px;
    font-weight: 600;
  }

  .statustexte {
    box-sizing: border-box;
    height: 36px;
    padding-top: 3px;
    overflow: hidden;
  }

  /*
    Nicht umbrechen: Ein zweizeiliger Konflikttext änderte die Höhe und
    verschöbe die Aktion darunter (B-08).
  */
  .statussatz,
  .nachtragzeile {
    margin: 0;
    font-size: 11.5px;
    line-height: 1.5;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .statussatz {
    opacity: 0.72;
  }

  .nachtragzeile {
    color: #d9a13c;
    font-weight: 600;
  }

  /* -------------------------------------------------------------- Umschalter */

  .umschalter {
    display: flex;
    gap: 4px;
    margin-top: 12px;
    padding: 3px;
    border-radius: 10px;
    background: rgba(127, 127, 127, 0.14);
  }

  /* 44 px, nicht 38 — auch der Variantenschalter ist ein Tippziel (FR-052). */
  .umschalter button {
    flex: 1;
    min-height: 44px;
    padding: 0 10px;
    border: 0;
    border-radius: 8px;
    background: none;
    color: inherit;
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }

  .umschalter button.aktiv {
    background: var(--bg, #fff);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.16);
  }

  /* ------------------------------------------------------------------ Ziehen */

  .ziehbereich {
    margin-top: 16px;
  }

  .ziehbalken {
    height: 46px;
  }

  .stundenachse {
    position: relative;
    height: 16px;
    margin-top: 7px;
    font-size: 10.5px;
    opacity: 0.45;
  }

  .stundenachse span {
    position: absolute;
    transform: translateX(-50%);
  }

  .ziehhinweis {
    margin: 4px 0 0;
    font-size: 11.5px;
    opacity: 0.45;
    text-wrap: pretty;
  }

  /* ----------------------------------------------------------------- Kacheln */

  .kachelblock {
    display: flex;
    gap: 12px;
    margin-top: 16px;
  }

  .kachelspalte {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }

  .kachelkopf {
    font-size: 11.5px;
    font-weight: 650;
    opacity: 0.6;
  }

  .spaltenpaar {
    position: relative;
    display: flex;
    gap: 6px;
  }

  /*
    Vier Kacheln à 44 px plus drei Fugen à 5 px ergeben 191 px — die Höhe, bei
    der die fünfte Kachel angeschnitten ist und die Spalte als scrollbar zu
    erkennen gibt.
  */
  .stunden {
    flex: 1;
    max-height: 191px;
    min-width: 0;
    overflow-y: auto;
    scrollbar-width: none;
    -webkit-mask-image: linear-gradient(180deg, transparent 0, #000 10px, #000 calc(100% - 10px), transparent 100%);
    mask-image: linear-gradient(180deg, transparent 0, #000 10px, #000 calc(100% - 10px), transparent 100%);
  }

  .stunden::-webkit-scrollbar {
    display: none;
  }

  .minuten {
    flex: none;
    width: 60px;
  }

  .stunden,
  .minuten {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  /* Kachelhöhe 44 px — das Mindestmaß für ein Tippziel (FR-052, B-10). */
  .kachel {
    box-sizing: border-box;
    display: flex;
    flex: none;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1px;
    height: 44px;
    padding: 0 4px;
    border: 1px solid rgba(127, 127, 127, 0.22);
    border-radius: 9px;
    background: none;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }

  .kachelwert {
    font-size: 14.5px;
    font-weight: 600;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }

  .kacheldauer {
    font-size: 9.5px;
    opacity: 0.5;
    white-space: nowrap;
  }

  .kachel.gewaehlt {
    border-color: #1f4e79;
    background: #1f4e79;
    color: #fff;
  }

  .kachel.gewaehlt .kacheldauer {
    opacity: 0.72;
  }

  /* Wählbar, aber gerandet: Ein Fenster darf über eine Belegung reichen (FR-031). */
  .kachel.konflikt {
    border-color: #c0442b;
  }

  .kachel.unmoeglich {
    opacity: 0.28;
    cursor: default;
  }

  .pfeil {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    font-size: 10px;
    opacity: 0.55;
    pointer-events: none;
    transition: opacity 0.25s;
  }

  .pfeil.oben {
    top: -2px;
  }

  .pfeil.unten {
    bottom: -2px;
  }

  /* --------------------------------------------------------------- Abschluss */

  .abschluss {
    box-sizing: border-box;
    min-height: 150px;
    margin-top: 16px;
  }

  .ausweichzone {
    box-sizing: border-box;
    height: 58px;
  }

  .ausweich {
    box-sizing: border-box;
    width: 100%;
    min-height: 44px;
    padding: 10px;
    border: 1px dashed rgba(127, 127, 127, 0.55);
    border-radius: 10px;
    background: none;
    color: inherit;
    font: inherit;
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
  }

  /* Das Tap-Ziel des ganzen Wegs — entsprechend groß (FR-017, FR-052). */
  .weiter {
    display: block;
    box-sizing: border-box;
    min-height: 44px;
    padding: 14px;
    border-radius: 10px;
    background: #1f4e79;
    color: #fff;
    font-size: 14.5px;
    font-weight: 650;
    text-align: center;
    text-decoration: none;
  }

  .sperrbox {
    box-sizing: border-box;
    margin: 0;
    min-height: 44px;
    padding: 14px;
    border: 1px solid rgba(176, 92, 80, 0.45);
    border-radius: 10px;
    background: rgba(176, 92, 80, 0.12);
    color: #b05c50;
    font-size: 13.5px;
    font-weight: 600;
    text-align: center;
  }

  .fuss {
    margin: 10px 0 0;
    font-size: 11.5px;
    opacity: 0.45;
    text-wrap: pretty;
  }

  .leerfall {
    margin: 18px 0 24px;
    font-size: 13px;
    opacity: 0.6;
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
    Wer Bewegung abbestellt hat, meint auch diese. Das Sheet erscheint dann ohne
    Fahrt, und die Pfeilchen blenden hart um — beides Verzierung, keine Auskunft
    (NFR-003, B-12).
  */
  @media (prefers-reduced-motion: reduce) {
    .overlay,
    .sheet {
      animation: none;
    }

    .pfeil {
      transition: none;
    }
  }
</style>
