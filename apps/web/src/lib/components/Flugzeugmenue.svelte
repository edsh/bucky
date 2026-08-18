<script lang="ts">
  import type { Handlung } from '$lib/flotte/handlungen.js';

  /**
   * Das Kontextmenü zu einem Flugzeug — aus der bisherigen Startseite
   * herausgelöst (Feature 043), damit der Flugzeugpark es unverändert
   * weiterbenutzt.
   *
   * Es stellt sich wie ein Kontextmenü dorthin, wo Platz ist: bevorzugt
   * rechts neben den Anker, sonst links daneben, sonst darunter — in jedem
   * Fall innerhalb des Fensters. Eine feste Seite geht nicht: Die erste
   * Kachel steht am linken Rand, auf einem Telefon ist rechts von ihr
   * womöglich kein Platz mehr (FR-020).
   */
  let {
    kennung,
    handlungen,
    anker,
    schliessen
  }: {
    kennung: string;
    handlungen: Handlung[];
    /** Element, an dem das Menü ausgerichtet wird — die Kachel. */
    anker: HTMLElement | undefined;
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

      let x = a.right + luecke;
      let y = a.top;

      if (x + m.width > breite - rand) {
        // Rechts ist kein Platz: links daneben versuchen.
        x = a.left - luecke - m.width;
      }
      if (x < rand) {
        // Auch links nicht: darunter, am Anker ausgerichtet und ins Fenster geklemmt.
        x = Math.min(Math.max(a.left, rand), Math.max(breite - rand - m.width, rand));
        y = a.bottom + luecke;
      }

      // Senkrecht nur so weit verschieben, dass nichts unten heraushaengt.
      y = Math.min(y, Math.max(hoehe - rand - m.height, rand));

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
    const eintraege = [...menue.querySelectorAll<HTMLElement>('[role="menuitem"]')];
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

  .menue a {
    padding: 0.6rem 1rem;
    color: inherit;
    text-decoration: none;
    font-size: 13.5px;
  }

  .menue a:hover,
  .menue a:focus-visible {
    background: rgba(0, 102, 204, 0.14);
    outline: none;
  }
</style>
