<script lang="ts">
  import type { Handlung } from '$lib/flotte/handlungen.js';
  import Stern from './Stern.svelte';

  /**
   * Das Kontextmenü zu einem Flugzeug — aus der bisherigen Startseite
   * herausgelöst (Feature 043), damit der Flugzeugpark es unverändert
   * weiterbenutzt.
   *
   * Es erscheint dort, wo getippt wurde, und weicht aus, wo es sonst aus dem
   * Fenster ragte. Wurde es mit der Tastatur geöffnet, gibt es keinen
   * Berührungspunkt; dann tritt die Kachel an seine Stelle — bevorzugt rechts
   * daneben, sonst links, sonst darunter. Eine feste Seite geht nicht: Die
   * erste Kachel steht am linken Rand, auf einem Telefon ist rechts von ihr
   * womöglich kein Platz mehr (FR-020).
   */
  let {
    kennung,
    handlungen,
    anker,
    zeiger,
    favorit,
    favoritUmschalten,
    schliessen
  }: {
    kennung: string;
    handlungen: Handlung[];
    /** Element, an dem das Menü ausgerichtet wird, wenn kein Zeigerpunkt vorliegt. */
    anker: HTMLElement | undefined;
    /**
     * Der Berührungspunkt in Seitenkoordinaten. Fehlt er — Tastatur —, zählt
     * der Anker.
     */
    zeiger?: { seiteX: number; seiteY: number };
    /** Ob die Maschine oben festgehalten ist. */
    favorit: boolean;
    favoritUmschalten: () => void;
    schliessen: () => void;
  } = $props();

  /**
   * Setzt den Fokus auf den ersten Eintrag, sobald das Menü erscheint. Ohne
   * das bliebe er auf der Kachel stehen, und der nächste Tastendruck schlösse
   * das eben geöffnete Menü wieder (FR-012).
   */
  function anfangsfokus(element: HTMLElement, ist: boolean) {
    if (ist) element.focus();
  }

  function platzieren(menue: HTMLElement) {
    const luecke = 8;
    const rand = 8;

    function stellen() {
      const halter = menue.parentElement;
      if (!halter || !anker) return;

      // Erst zuruecksetzen, sonst misst der Browser die alte Stellung mit.
      menue.style.left = '0px';
      menue.style.top = '0px';

      const h = halter.getBoundingClientRect();
      const a = anker.getBoundingClientRect();
      const m = menue.getBoundingClientRect();
      const breite = window.innerWidth;
      const hoehe = window.innerHeight;

      // Der Berührungspunkt zurück in Fensterkoordinaten. Beim Scrollen
      // wandert das Menü so mit der Kachel, statt auf dem Schirm zu kleben.
      const zx = zeiger ? zeiger.seiteX - window.scrollX : null;
      const zy = zeiger ? zeiger.seiteY - window.scrollY : null;

      let x: number;
      let y: number;

      if (zx !== null && zy !== null) {
        // Rechts unterhalb des Fingers -- so, dass er nicht auf dem Menü
        // liegt und die oberen Einträge verdeckt.
        x = zx + luecke;
        y = zy + luecke;

        if (x + m.width > breite - rand) x = zx - luecke - m.width;
        if (x < rand) x = Math.min(Math.max(zx - m.width / 2, rand), Math.max(breite - rand - m.width, rand));
        if (y + m.height > hoehe - rand) y = zy - luecke - m.height;
      } else {
        x = a.right + luecke;
        y = a.top;

        if (x + m.width > breite - rand) {
          // Rechts ist kein Platz: links daneben versuchen.
          x = a.left - luecke - m.width;
        }
        if (x < rand) {
          // Auch links nicht: darunter, am Anker ausgerichtet und ins Fenster geklemmt.
          x = Math.min(Math.max(a.left, rand), Math.max(breite - rand - m.width, rand));
          y = a.bottom + luecke;
        }
      }

      // Senkrecht nur so weit verschieben, dass nichts heraushaengt -- weder
      // unten noch, nach dem Hochklappen ueber den Finger, oben.
      y = Math.min(y, Math.max(hoehe - rand - m.height, rand));
      y = Math.max(y, rand);

      menue.style.left = `${x - h.left}px`;
      menue.style.top = `${y - h.top}px`;
    }

    stellen();
    window.addEventListener('resize', stellen);
    window.addEventListener('scroll', stellen, true);
    return {
      destroy: () => {
        window.removeEventListener('resize', stellen);
        window.removeEventListener('scroll', stellen, true);
      }
    };
  }

  /**
   * Pfeiltasten im Menü.
   *
   * Ein `role="menu"` verspricht diese Steuerung — wer sie erwartet und nur
   * Tab vorfindet, verlässt das Menü, statt sich darin zu bewegen.
   *
   * Das Menü trägt dafür `tabindex="-1"`: nicht in der Tab-Reihenfolge, aber
   * fokussierbar — was Tastendrücke verarbeitet, muss den Fokus halten können.
   */
  function beiMenuetaste(ereignis: KeyboardEvent) {
    const tasten = ['ArrowDown', 'ArrowUp', 'Home', 'End'];
    if (!tasten.includes(ereignis.key)) return;

    const menue = ereignis.currentTarget as HTMLElement;
    const eintraege = [
      ...menue.querySelectorAll<HTMLElement>('[role="menuitem"], [role="menuitemcheckbox"]')
    ];
    if (eintraege.length === 0) return;

    const jetzt = eintraege.indexOf(document.activeElement as HTMLElement);
    // Umlaufend: Am letzten Eintrag nach unten landet man wieder oben. Das
    // ist bei einem kurzen Menü der kürzere Weg zurück.
    const ziel =
      ereignis.key === 'Home'
        ? 0
        : ereignis.key === 'End'
          ? eintraege.length - 1
          : ereignis.key === 'ArrowDown'
            ? (jetzt + 1) % eintraege.length
            : (jetzt - 1 + eintraege.length) % eintraege.length;

    ereignis.preventDefault();
    eintraege[ziel]?.focus();
  }
</script>

<div
  class="menue"
  role="menu"
  aria-label="Was mit {kennung} tun?"
  tabindex="-1"
  onkeydown={beiMenuetaste}
  use:platzieren
>
  {#each handlungen as handlung, i (handlung.ziel)}
    <a role="menuitem" href={handlung.ziel} onclick={schliessen} use:anfangsfokus={i === 0}>
      {handlung.name}
    </a>
  {/each}

  <!--
    Der Schalter steht zuletzt: Er fuehrt nirgendwohin, waehrend alles ueber
    ihm ein Weg ist. Als `menuitemcheckbox` sagt er einem Vorleser seinen
    Zustand von selbst -- der gefuellte Stern allein taete das nicht.
  -->
  <button
    class="schalter"
    type="button"
    role="menuitemcheckbox"
    aria-checked={favorit}
    onclick={favoritUmschalten}
    use:anfangsfokus={handlungen.length === 0}
  >
    <Stern gefuellt={favorit} />
    Lieblingsmaschine
  </button>

</div>

<style>
  /*
    Die Stellung rechnet `platzieren` aus; hier stehen nur Aussehen und der
    Ausgangspunkt. `overflow: hidden` haelt den hellen Grund eines
    angesteuerten Eintrags innerhalb der abgerundeten Ecken.
  */
  .menue {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 2;
    display: flex;
    overflow: hidden;
    flex-direction: column;
    min-width: 11rem;
    border: 1px solid rgba(127, 127, 127, 0.35);
    border-radius: 0.5rem;
    background: var(--bg, #fff);
    color: var(--text, #1b2027);
    box-shadow: 0 6px 18px rgb(0 0 0 / 28%);
  }

  .menue a,
  .menue .schalter {
    display: flex;
    align-items: center;
    /*
      Mindestens 44 Pixel hoch (FR-017) -- ein Menü, das man am Flugplatz im
      Stehen bedient, verträgt keine 36er Zeilen.

      `box-sizing` gehört ausdrücklich dazu: Eine Schaltfläche rechnet die
      Innenabstände von sich aus in ihre Höhe ein, ein Verweis nicht. Ohne
      diese Zeile stünden 44 Pixel neben 63 -- gleiche Regel, verschiedene
      Rechnung, und der letzte Eintrag sähe gedrängt aus.
    */
    box-sizing: border-box;
    min-height: 44px;
    padding: 0.6rem 1rem;
    color: inherit;
    text-decoration: none;
    font-size: 13.5px;
  }

  /*
    Der Schalter muss aussehen wie die Verweise ueber ihm -- eine Schaltflaeche
    bringt Rahmen, eigene Schrift und zentrierten Text mit, die ihn sonst als
    Fremdkoerper zeigten.
  */
  .menue .schalter {
    gap: 0.55rem;
    border: none;
    border-top: 1px solid rgba(127, 127, 127, 0.2);
    background: none;
    font-family: inherit;
    text-align: left;
    cursor: pointer;
  }

  .menue a:hover,
  .menue a:focus-visible,
  .menue .schalter:hover,
  .menue .schalter:focus-visible {
    background: rgba(0, 102, 204, 0.14);
    outline: none;
  }
</style>
