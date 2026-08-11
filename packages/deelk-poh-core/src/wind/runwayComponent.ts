import { PohCalculationError } from '../errors.js';
import { roundKnots } from '../format.js';

/**
 * Zerlegung eines Windes in die Komponente entlang einer Bahnachse und die quer
 * dazu.
 *
 * **Warum ein eigener Ordner.** Die Rechnung gehört nicht unter `atmosphere/`:
 * Sie folgt keiner Norm, sondern der Trigonometrie, und sie trägt deshalb auch
 * keine Quellenreferenz — eine erfundene Seitenzahl wäre schlimmer als keine
 * (Prinzip I). Sie gehört ebenso wenig unter `takeoff/`: Sie hängt an keiner
 * Tabelle und gilt für die Landung genauso wie für den Start.
 *
 * **Warum überhaupt im Kern.** Sie ist drei Zeilen lang und genau deshalb
 * gefährlich: kurz genug, dass man sie „schnell" im Dialog erledigen möchte.
 * Ein Vorzeichenfehler dort machte aus Gegenwind Rückenwind und aus einer
 * sicheren eine gefährliche Startstrecke — und der Wert sähe weiterhin völlig
 * plausibel aus. Zusicherung C-09 hält mechanisch dagegen.
 */

/** Ergebnis der Zerlegung, mit den Eingangsgrößen zum Nachvollziehen. */
export interface RunwayWindComponent {
  /** Richtung, **aus** der der Wind weht, rechtweisend in Grad. */
  readonly windFromDegTrue: number;
  /** Windgeschwindigkeit in kt. */
  readonly windSpeedKt: number;
  /** Rechtweisende Richtung der betrachteten Bahn in Grad. */
  readonly runwayBearingDegTrue: number;
  /** Winkel zwischen Wind und Bahn, auf −180 bis 180 gebracht. */
  readonly angleDeg: number;
  /** Längskomponente in kt, **positiv = Gegenwind**, ungerundet. */
  readonly headwindComponentKt: number;
  /** Querkomponente in kt als Betrag, ungerundet. */
  readonly crosswindComponentKt: number;
  /**
   * Die Längskomponente auf ganze Knoten gerundet — der einzige Wert, den der
   * Pistenwindregler annehmen kann. Ein Rechen-, kein Anzeigewert.
   */
  readonly settableHeadwindComponentKt: number;
}

const DEG_PER_TURN = 360;
const HALF_TURN = 180;

/** Bringt einen Winkel in Grad auf den Bereich −180 bis 180. */
function normalisiere(winkelDeg: number): number {
  // Der Umweg über den Rest zu 360 statt einer while-Schleife: Er greift auch
  // bei Windrichtungen jenseits von 360, wie sie ein fremder Dienst durchaus
  // liefern kann, und braucht dafür keine Annahme über die Größenordnung.
  const rest = ((winkelDeg % DEG_PER_TURN) + DEG_PER_TURN) % DEG_PER_TURN;
  return rest > HALF_TURN ? rest - DEG_PER_TURN : rest;
}

function requireFiniteNumber(value: number, field: string): void {
  if (!Number.isFinite(value)) {
    throw new PohCalculationError('INVALID_INPUT', 'Der Wert ist keine gültige Zahl.', {
      field,
      actual: value
    });
  }
}

/**
 * Zerlegt einen Wind gegen eine Bahnachse.
 *
 *     α  = Windrichtung − Bahnrichtung   (auf −180…180 gebracht)
 *     HW = Geschwindigkeit · cos α       positiv = Gegenwind
 *     XW = |Geschwindigkeit · sin α|
 *
 * **Warum das Vorzeichen so herum stimmt**: Die meteorologische Windrichtung
 * nennt, *woher* der Wind weht. Steht sie gleich der Bahnrichtung, bläst er der
 * startenden Maschine entgegen — α ist null, der Kosinus eins, die Komponente
 * positiv. Das ist die Probe, die das Vorzeichen festnagelt, und sie steht als
 * erster Test in `tests/wind/runwayComponent.test.ts`.
 *
 * **Beide Winkel müssen denselben Bezug haben.** Rechtweisend gegen
 * rechtweisend. Eine Bahnkennung wie „10" ist *missweisend* und gerundet; sie
 * mal zehn zu nehmen ergäbe einen Wert, der um die Ortsmissweisung daneben
 * liegt — bei 20 kt rund einen Knoten, also unauffällig falsch. Welche Zahl
 * hier hineingeht, entscheidet der Aufrufer; diese Funktion kennt keine Bahn
 * und keinen Platz, so wie `toQnh` keine Platzhöhe kennt.
 *
 * Prüft **keinen** Reglerbereich. Rundet nicht selbst (C-03).
 */
export function toRunwayWindComponent(
  windFromDegTrue: number,
  windSpeedKt: number,
  runwayBearingDegTrue: number
): RunwayWindComponent {
  requireFiniteNumber(windFromDegTrue, 'windFromDegTrue');
  requireFiniteNumber(windSpeedKt, 'windSpeedKt');
  requireFiniteNumber(runwayBearingDegTrue, 'runwayBearingDegTrue');

  if (windSpeedKt < 0) {
    // Eine Windgeschwindigkeit hat kein Vorzeichen — das trägt die Richtung.
    // Ohne diese Prüfung ergäben −20 kt aus der Bahnrichtung einen Rückenwind
    // von 20 kt, und der sähe völlig plausibel aus.
    throw new PohCalculationError(
      'INVALID_INPUT',
      'Eine negative Windgeschwindigkeit ergibt keinen Sinn; die Richtung trägt das Vorzeichen.',
      { field: 'windSpeedKt', actual: windSpeedKt }
    );
  }

  const angleDeg = normalisiere(windFromDegTrue - runwayBearingDegTrue);
  const angleRad = (angleDeg * Math.PI) / HALF_TURN;

  // Das `+ 0` befreit von negativer Null: Bei Windstille ergibt 0 · cos α für
  // einen stumpfen Winkel −0, und das erschiene in einer Anzeige als „−0 kt".
  const headwindComponentKt = windSpeedKt * Math.cos(angleRad) + 0;
  const crosswindComponentKt = Math.abs(windSpeedKt * Math.sin(angleRad));

  return {
    windFromDegTrue,
    windSpeedKt,
    runwayBearingDegTrue,
    angleDeg,
    headwindComponentKt,
    crosswindComponentKt,
    settableHeadwindComponentKt: roundKnots(headwindComponentKt)
  };
}
