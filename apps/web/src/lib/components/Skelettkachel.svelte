<script lang="ts">
  /**
   * Platzhalter für eine Kachel, solange der Stand noch unterwegs ist.
   *
   * Das Skelett zeigt genau die Form, die gleich kommt: runder Ring,
   * Kennzeichenzeile, Statuszeile. Deshalb springt beim Eintreffen der Daten
   * nichts — es füllt sich nur. Ein Ladekringel in der Seitenmitte könnte das
   * nicht, weil er nicht verrät, wie viel gleich erscheint.
   *
   * Wichtig ist, was das Skelett **nicht** tut: Es trägt keine Statusfarbe
   * und keinen Text. Ein grau pulsierender Ring behauptet nichts; ein grüner
   * Vorabring behauptete „frei", bevor irgendjemand nachgesehen hat (FR-022).
   */
  let { groesse = 74 }: { groesse?: number } = $props();
</script>

<div class="kachel" aria-hidden="true">
  <div class="ring puls" style:width="{groesse}px" style:height="{groesse}px"></div>
  <div class="balken puls" style:width="58px"></div>
  <div class="balken puls schmal" style:width="82px"></div>
</div>

<style>
  .kachel {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 9px;
  }

  .ring {
    border-radius: 50%;
  }

  .balken {
    max-width: 100%;
    height: 9px;
    border-radius: 5px;
  }

  .balken.schmal {
    height: 8px;
  }

  .puls {
    background: rgba(127, 127, 127, 0.18);
    animation: atmen 1.4s ease-in-out infinite;
  }

  @keyframes atmen {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.42;
    }
  }

  /* Wer bewegte Oberflächen abbestellt hat, bekommt einen ruhigen Platzhalter
     — die Form bleibt, das Pulsieren geht. */
  @media (prefers-reduced-motion: reduce) {
    .puls {
      animation: none;
    }
  }
</style>
