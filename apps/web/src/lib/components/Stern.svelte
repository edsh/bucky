<script lang="ts">
  /**
   * Der Stern, mit dem eine Maschine oben festgehalten wird.
   *
   * Gefüllt oder nur umrissen — mehr sagt er nicht, und mehr muss er nicht
   * sagen: Die Form ist an beiden Orten dieselbe (Kontextmenü und
   * Detailansicht), damit sie an beiden dasselbe bedeutet.
   *
   * `currentColor` statt einer eigenen Farbe: Der Stern gehört jeweils dem
   * Text, neben dem er steht, und folgt damit von selbst dem hellen wie dem
   * dunklen Schema.
   */
  let { gefuellt, groesse = 15 }: { gefuellt: boolean; groesse?: number } = $props();
</script>

<svg
  width={groesse}
  height={groesse}
  viewBox="0 0 24 24"
  fill={gefuellt ? 'currentColor' : 'none'}
  stroke="currentColor"
  stroke-width="1.8"
  stroke-linejoin="round"
  aria-hidden="true"
  focusable="false"
>
  <path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.5-5.8-3.05-5.8 3.05 1.1-6.5-4.7-4.6 6.5-.95z" />
</svg>
