import { roundTo } from '@edsh-bucky/deelk-poh-core';

/**
 * Der Heimatplatz an genau einer Stelle.
 *
 * **EDSH ist Backnang-Heiningen** in Baden-Württemberg — Sonderlandeplatz mit
 * Graspiste 10/28, 500 m, rund 25 km nordöstlich von Stuttgart. Nicht zu
 * verwechseln mit Hartenholm (EDHM) in Schleswig-Holstein, 559 km weiter
 * nördlich: Bei deutschen ICAO-Kennungen steht der **zweite** Buchstabe für die
 * Region (EDS… = Baden-Württemberg, EDH… = Norden), nicht der dritte für ein
 * Bundesland. Diese Verwechslung ist in der Recherche zu diesem Feature
 * tatsächlich passiert (siehe research.md R0) — daher der Hinweis hier, wo die
 * Koordinaten stehen.
 */
export interface EdshPlatz {
  /** Platzhöhe über dem Meeresspiegel in ft. */
  readonly elevationFt: number;
  /** Geografische Breite in Grad. */
  readonly latitude: number;
  /** Geografische Länge in Grad. */
  readonly longitude: number;
}

/**
 * Die einzige Stelle, an der die Platzhöhe steht (FR-025). Die Schnellwahl der
 * Platzhöhe und der Wetterabruf beziehen sie beide von hier — zwei Angaben
 * derselben Höhe darf es nicht geben, sonst belegte der Abruf eine andere Höhe
 * als der Regler.
 */
export const EDSH: EdshPlatz = {
  elevationFt: 971,
  latitude: 48.9197,
  longitude: 9.4553
};

const M_PER_FT = 0.3048;

/**
 * Die Platzhöhe in Metern, wie sie der Wetterdienst erwartet. Gerechnet und
 * nicht als vierte Zahl geführt: Eine zweite, von Hand gepflegte Angabe
 * derselben Höhe wäre genau die Doppelung, die FR-025 ausschließt.
 *
 * Auf ganze Meter gerundet, und zwar über `roundTo` aus dem Kern: Gerundet
 * wird ausschließlich dort (C-03). Ganze Meter, weil der Dienst die
 * Höhe zum Auswählen der Modellzelle benutzt: Ein reproduzierbarer,
 * mitlesbarer Wert in der Adresse ist beim Nachprüfen mehr wert als die
 * Nachkommastellen von 295,9848 m.
 */
export function elevationM(platz: EdshPlatz = EDSH): number {
  return roundTo(platz.elevationFt * M_PER_FT, 0);
}
