export const prerender = true;
export const ssr = false;

/**
 * Jede Seite wird als eigenes Verzeichnis mit `index.html` abgelegt, statt als
 * `name.html` daneben. Seit die Seiten geschachtelt liegen (Feature 043), ist
 * das der Unterschied zwischen einer Adresse, die ein einfacher Dateiserver
 * ausliefern kann, und einer, die nur GitHub Pages versteht — der Klickpfad
 * ruft die Rechnerseite unmittelbar auf und nicht mehr nur über die Startseite.
 */
export const trailingSlash = 'always';
