import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/**
 * Die Seite liegt an der Wurzel ihrer eigenen Domain, deshalb ohne Basispfad.
 * Bis Feature 045 kam er über `BASE_PATH` aus der Umgebung — GitHub Pages legt
 * ein Projekt sonst unter `/<repo>/` ab.
 *
 * Ausgeliefert wird weiterhin ausschließlich Vorgerendertes: `prerender = true`
 * und `ssr = false` in `src/routes/+layout.ts` bleiben unangetastet. Der
 * Adapter wechselt nur die Form der Ablage — und schafft nebenbei die
 * Möglichkeit für Server-Routen, die die Reservierung brauchen wird
 * (Verfassungsprinzip V). Gebaut wird hier keine.
 */
/** @type {import('@sveltejs/kit').Config} */
export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter()
  }
};
