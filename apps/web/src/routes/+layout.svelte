<script lang="ts">
  let { children } = $props();
</script>

{@render children()}

<style>
  /*
    Der voreingestellte Aussenabstand des Browsers am `body` (8 px) verschiebt
    den Seiteninhalt gegenueber allem, was am Sichtfeld haengt -- etwa das
    mitscrollende Avatar auf der Rechnerseite, das dadurch acht Pixel hoeher
    stand als die Hauptueberschrift daneben. Beide Seiten setzen ihren
    Innenabstand ohnehin selbst am `main`.
  */
  :global(body) {
    margin: 0;
  }
</style>
