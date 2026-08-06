import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/**
 * Auf GitHub Pages liegt die Seite unter /<repo>/. Der Basispfad kommt aus
 * der Umgebung, damit die interne Verlinkung dort und lokal gleichermaßen
 * trägt; lokal ist er leer.
 */
const base = process.env.BASE_PATH ?? '';

/** @type {import('@sveltejs/kit').Config} */
export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({ fallback: '404.html' }),
    paths: { base }
  }
};
