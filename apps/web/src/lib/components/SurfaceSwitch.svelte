<script lang="ts">
  /**
   * Ein Schalter für eine Anmerkung des Flughandbuchs.
   *
   * Die Beschriftung benennt den **Bahnzustand** und nicht die Nummer der
   * Anmerkung (FR-018): „Anmerkung 3" sagt am Platz niemandem, ob die Bahn
   * gemeint ist, auf der er steht. Die Nummer steht daneben, damit sich das
   * Ergebnis trotzdem gegen das Handbuch halten lässt.
   */
  let {
    id,
    label,
    note,
    checked = $bindable()
  }: {
    id: string;
    label: string;
    /** Nummer der Anmerkung, etwa „Anmerkung 3". */
    note: string;
    checked: boolean;
  } = $props();
</script>

<label class="schalter" for={id}>
  <input {id} type="checkbox" bind:checked />
  <span class="text">
    {label}
    <span class="anmerkung">{note}</span>
  </span>
</label>

<style>
  .schalter {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    cursor: pointer;
  }

  input {
    /* Groesser als die Vorgabe: Der Schalter wird am Platz mit dem Daumen
       bedient, nicht mit der Maus. */
    width: 1.1rem;
    height: 1.1rem;
    margin: 0.15rem 0 0;
    flex: none;
  }

  .text {
    min-width: 0;
  }

  .anmerkung {
    display: block;
    font-size: 0.8em;
    color: #666;
  }
</style>
