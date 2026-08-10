import { z } from 'zod';
import {
  PohCalculationError,
  computeTakeoffDistance,
  formatCelsius,
  formatFeet,
  formatHectopascal,
  formatKnots,
  formatMetres,
  formatNumber,
  formatQuantity as formatCoreQuantity,
  getFuelPlanInputDomain,
  getTakeoffInputDomain,
  toOutsideAirTemperature,
  toPressureAltitude,
  unitText,
  type NumericRange,
  type TakeoffDistanceResult
} from '@edsh-bucky/deelk-poh-core';
import type { ToolResult } from './computeFuelPlan.js';

/**
 * Eigenes Werkzeug neben `compute_fuel_plan` und kein zusätzliches Feld darin:
 * Die Startstrecke ist eine andere Frage zu einem anderen Zeitpunkt, und ein
 * Fehler an der Startbahn darf die Kraftstoffplanung nicht mitreißen (FR-022,
 * research.md R6).
 *
 * Dünner Adapter über dem Kern: Interpolation, Zuschläge, Grenzen, Wortlaut
 * und Rundung liegen dort (Constitution-Prinzip IV, Zusicherungen C-02 bis
 * C-05, C-07).
 */

function numberField(range: NumericRange, description: string): z.ZodNumber {
  let field = z.number().describe(`${description} (${range.unit})`);
  if (Number.isFinite(range.min)) {
    field = field.min(range.min);
  }
  if (Number.isFinite(range.max)) {
    field = field.max(range.max);
  }
  return field;
}

/**
 * Das Eingabeschema. Es nimmt Platzhöhe und QNH entgegen, nicht die Druckhöhe:
 * Die Druckhöhe steht in keinem Wetterbericht und wird vom Kern gebildet
 * (Zusicherung C-04).
 */
export function buildInputShape(): z.ZodRawShape {
  const fuelDomain = getFuelPlanInputDomain();
  const takeoffDomain = getTakeoffInputDomain();

  return {
    departureElevationFt: numberField(
      fuelDomain.departureElevationFt,
      'Platzhöhe des Startplatzes über dem Meeresspiegel, wie sie auf der Karte steht'
    ),
    qnhHpa: numberField(
      fuelDomain.qnhHpa,
      'Aktueller Luftdruck (QNH) aus dem Wetterbericht; die Druckhöhe wird daraus errechnet'
    ),
    isaDeviationC: numberField(
      fuelDomain.isaDeviationC,
      'Abweichung von der ISA-Temperatur; daraus ergibt sich die Außentemperatur am Platz'
    ),
    windComponentKt: numberField(
      takeoffDomain.windComponentKt,
      'Windkomponente auf der Bahn, positiv = Gegenwind. Rückenwind ist nur so weit gedeckt, wie Anmerkung 2 reicht'
    ),
    dryGrassRunway: z
      .boolean()
      .describe('Anmerkung 3: trockene Grasbahn statt befestigter, trockener Bahn'),
    wetOrSnowRunway: z
      .boolean()
      .describe('Anmerkung 4: feuchte Grasbahn, aufgeweichter Untergrund oder Schnee')
  };
}

export const TOOL_DESCRIPTION =
  'Berechnet Startrollstrecke und Startstrecke über das Hindernis für die D-EELK nach ' +
  'Abb. 5-1a des Flughandbuchs, einschließlich der Zuschläge für Wind und Bahnzustand. ' +
  'Beantwortet die Frage, ob die Bahn lang genug ist — nicht die Frage nach dem ' +
  'Kraftstoffbedarf; dafür gibt es compute_fuel_plan. Alle Zahlen stammen aus dieser ' +
  'Berechnung; sie dürfen nicht selbst fortgeschrieben oder überschlagen werden.';

const argsSchema = z.object({
  departureElevationFt: z.number().finite(),
  qnhHpa: z.number().finite(),
  isaDeviationC: z.number().finite(),
  windComponentKt: z.number().finite(),
  dryGrassRunway: z.boolean(),
  wetOrSnowRunway: z.boolean()
});

/** Formatierung ausschließlich über den Kern (C-03): hier wird nicht gerundet. */
function formatQuantity(value: number, unit: string): string {
  switch (unit) {
    case 'm':
      return formatMetres(value);
    case 'ft':
      return formatFeet(value);
    case '°C':
      return formatCelsius(value);
    case 'kt':
      return formatKnots(value);
    case 'hPa':
      return formatHectopascal(value);
    case '%':
      return unitText(formatNumber(value, 1), '%');
    default:
      return formatCoreQuantity(value, 1, unit);
  }
}

/** Lesbare Zusammenfassung. Zitat und Prüfhinweis wortgleich aus dem Kern (M-01). */
export function formatSummary(result: TakeoffDistanceResult): string {
  const lines: string[] = [];

  lines.push(
    `Roll- und Startstrecke D-EELK: ${formatMetres(result.groundRollM)} Startrollstrecke, ` +
      `${formatMetres(result.overObstacleM)} über ${result.obstacleLabel}.`,
    '',
    `Bedingungen: Druckhöhe ${formatFeet(result.pressureAltitude.pressureAltitudeFt)} ` +
      `(${formatFeet(result.pressureAltitude.elevationFt)} bei ${formatHectopascal(result.pressureAltitude.qnhHpa)}), ` +
      `Außentemperatur ${formatCelsius(result.outsideAirTemperature.outsideAirTemperatureC)} ` +
      `(ISA ${formatCelsius(result.outsideAirTemperature.isaDeviationC)}).`
  );

  lines.push('', 'Rechenweg:');
  for (const step of result.steps) {
    const values = Object.entries(step.results)
      .map(([name, quantity]) => `${name} ${formatQuantity(quantity.value, quantity.unit)}`)
      .join(', ');
    lines.push(`- ${step.label}: ${values}`);
    if (step.explanation !== undefined) {
      lines.push(`  ${step.explanation}`);
    }
  }

  if (result.advisories.length > 0) {
    lines.push('', 'Hinweise:');
    for (const advisory of result.advisories) {
      lines.push(`- ${advisory.text}`);
    }
  }

  lines.push('', 'Die Tabelle gilt unter diesen Bedingungen:');
  for (const condition of result.conditions) {
    lines.push(`- ${condition}`);
  }

  lines.push('', 'Anmerkungen des Flughandbuchs:');
  for (const note of result.notes) {
    lines.push(`- ${note.text}`);
  }

  lines.push(
    '',
    'Verwendete Tabelle:',
    `- ${result.source.figure} — ${result.source.tableName}, Seite ${result.source.pohPages.join(', ')} (${result.source.issue}, ${result.source.revision})`,
    `  ${result.source.citation}`
  );

  lines.push('', result.preflightCheckNotice);
  return lines.join('\n');
}

/**
 * Führt die Berechnung aus. Im Fehlerfall wird kein einziger Zahlenwert
 * zurückgegeben, damit das Modell nichts zum Weiterrechnen erhält.
 */
export function handleComputeTakeoffDistance(args: unknown): ToolResult {
  try {
    const parsed = argsSchema.safeParse(args);
    if (!parsed.success) {
      throw new PohCalculationError(
        'INVALID_INPUT',
        `Die Eingabe ist unvollständig oder nicht als Zahl deutbar: ${parsed.error.issues
          .map((issue) => `${issue.path.join('.')} (${issue.message})`)
          .join(', ')}`
      );
    }
    const pressureAltitude = toPressureAltitude(
      parsed.data.departureElevationFt,
      parsed.data.qnhHpa
    );
    const result = computeTakeoffDistance({
      pressureAltitude,
      outsideAirTemperature: toOutsideAirTemperature(
        pressureAltitude.pressureAltitudeFt,
        parsed.data.isaDeviationC
      ),
      windComponentKt: parsed.data.windComponentKt,
      dryGrassRunway: parsed.data.dryGrassRunway,
      wetOrSnowRunway: parsed.data.wetOrSnowRunway
    });
    return {
      content: [{ type: 'text', text: formatSummary(result) }],
      structuredContent: result as unknown as Record<string, unknown>
    };
  } catch (error) {
    if (error instanceof PohCalculationError) {
      return {
        content: [
          {
            type: 'text',
            text: `Die Berechnung ist nicht möglich: ${error.message} Es wird kein Zahlenwert geliefert; die Eingabe ist zu korrigieren und das Werkzeug erneut aufzurufen.`
          }
        ],
        isError: true
      };
    }
    throw error;
  }
}
