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

/** Eine der beiden Betriebsrichtungen der Graspiste. */
export interface EdshRunway {
  /** Die Kennung, wie sie auf der Bahn steht — **missweisend** und gerundet. */
  readonly ident: '10' | '28';
  /** Die Richtung derselben Bahn **rechtweisend**, in Grad. */
  readonly bearingDegTrue: number;
}

/**
 * Die beiden Bahnrichtungen von EDSH.
 *
 * **Der Fallstrick, den dieser Kommentar verhindern soll**: Die Kennungen 10
 * und 28 sind *missweisend* und auf zehn Grad gerundet. Die Windrichtung, die
 * der Wetterdienst liefert, ist *rechtweisend*. Wer die Kennung mal zehn nimmt
 * und gegen diese Windrichtung rechnet, verrechnet sich um die Ortsmissweisung
 * — bei 20 kt rund einen Knoten. Unauffällig, aber falsch. Deshalb stehen hier
 * die rechtweisenden Werte, und `bearingDegTrue` heißt so, wie es heißt.
 *
 * **Quelle**: OurAirports `runways.csv`, Datensatz zu EDSH:
 * `…,"EDSH",1640,98,"Grass",0,0,"10",…,103,,"28",…,283,` — also 103° und 283°
 * rechtweisend (siehe research.md R2). OurAirports ist keine amtliche Quelle;
 * die Zahl ist deshalb doppelt gegengeprüft:
 *
 * 1. **Bahnmaße**: 1640 × 98 ft sind 500 × 30 m und stimmen mit der AIP VFR
 *    überein. Der Datensatz beschreibt also denselben Platz.
 * 2. **Missweisung**: 103° − 3° ≈ 100° und 283° − 3° ≈ 280°; die
 *    Ortsmissweisung im Raum Stuttgart liegt bei rund 3° Ost. Die
 *    rechtweisenden Werte passen also genau zu den Kennungen 10 und 28.
 *
 * Eine verbindliche Betriebsrichtung gibt es in Heiningen nicht — sie richtet
 * sich nach dem Wind. Deshalb führt diese Liste beide Richtungen gleichrangig,
 * statt eine als „die" Bahn auszuzeichnen.
 */
export const RUNWAYS: readonly EdshRunway[] = [
  { ident: '10', bearingDegTrue: 103 },
  { ident: '28', bearingDegTrue: 283 }
];
