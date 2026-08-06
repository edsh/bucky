import { z } from 'zod';
import {
  PohCalculationError,
  computeFuelPlan,
  formatFuel,
  formatKnots,
  formatLitres,
  formatUsGallons,
  formatMinutes,
  formatNauticalMiles,
  getFuelPlanInputDomain,
  type FuelPlanResult,
  type NumericRange
} from '@edsh-bucky/deelk-poh-core';

/** Ergebnis eines Werkzeugaufrufs in der Form, die der MCP-Server erwartet. */
export interface ToolResult {
  /**
   * Index-Signatur und veränderliche Felder verlangt das SDK an dieser
   * Stelle; ohne sie ist der Rückgabewert dort nicht zuweisbar.
   */
  [key: string]: unknown;
  content: { type: 'text'; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

/**
 * Ein Zahlenfeld, dessen Grenzen aus der Datengrundlage stammen. Die
 * Wertebereiche werden nicht doppelt gepflegt, sondern aus
 * `getFuelPlanInputDomain()` abgeleitet (T044, Prinzip IV).
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

/** Das Eingabeschema, erzeugt aus den Wertebereichen des Kerns. */
export function buildInputShape(): z.ZodRawShape {
  const domain = getFuelPlanInputDomain();
  const settings = domain.powerSettingsByPressureAltitude
    .map((entry) => `${entry.pressureAltitudeFt} ft: ${entry.powerSettingsPct.join('/')} %`)
    .join('; ');

  return {
    departureAltitudeFt: numberField(domain.departureAltitudeFt, 'Druckhöhe des Startplatzes'),
    cruiseAltitudeFt: numberField(
      domain.cruiseAltitudeFt,
      'Druckhöhe des Reiseflugs, muss über der Platzhöhe liegen'
    ),
    distanceNm: numberField(domain.distanceNm, 'Gesamtflugstrecke, größer als null'),
    powerSettingPct: numberField(
      domain.powerSettingPct,
      `Lasteinstellung; belegt sind ${settings}`
    ),
    isaDeviationC: numberField(domain.isaDeviationC, 'Abweichung von der ISA-Temperatur'),
    windComponentKt: numberField(domain.windComponentKt, 'Windkomponente, positiv = Gegenwind')
  };
}

export const TOOL_DESCRIPTION =
  'Berechnet den Kraftstoffbedarf eines Flugvorhabens für die D-EELK nach dem Verfahren ' +
  'des Flughandbuchs. Liefert die Aufschlüsselung, den Rechenweg mit den abgelesenen ' +
  'Tabellen-Eckwerten, die Quellenangaben und den Prüfhinweis. Alle Zahlen stammen aus ' +
  'dieser Berechnung; sie dürfen nicht selbst fortgeschrieben oder überschlagen werden.';

/** Lesbare Zusammenfassung. Zitat und Prüfhinweis wortgleich aus dem Kern (M-01). */
export function formatSummary(result: FuelPlanResult): string {
  const lines: string[] = [];

  lines.push(
    `Kraftstoffbedarf D-EELK: ${formatFuel(result.breakdown.totalL, result.breakdownUsGal.totalUsGal)} gesamt.`,
    '',
    `- Anlassen, Rollen und Start: ${formatFuel(result.breakdown.taxiTakeoffL, result.breakdownUsGal.taxiTakeoffUsGal)}`,
    `- Steigflug: ${formatFuel(result.breakdown.climbL, result.breakdownUsGal.climbUsGal)}`,
    `- Reiseflug: ${formatFuel(result.breakdown.cruiseL, result.breakdownUsGal.cruiseUsGal)}`,
    '',
    result.exceedsUsableFuel
      ? `Der Bedarf erreicht oder übersteigt die ausfliegbare Menge von ${formatFuel(result.usableFuelL, result.usableFuelUsGal)}. Dieser Flug ist so nicht durchführbar.`
      : `Ausfliegbar sind ${formatFuel(result.usableFuelL, result.usableFuelUsGal)}; rechnerisch bleiben ${formatFuel(result.remainingFuelL, result.remainingFuelUsGal)} übrig. Das ist keine Reserve.`
  );

  lines.push('', 'Rechenweg:');
  for (const step of result.steps) {
    const values = Object.entries(step.results)
      .map(([name, quantity]) => `${name} ${formatQuantity(quantity.value, quantity.unit)}`)
      .join(', ');
    lines.push(`- ${step.label}: ${values}`);
  }

  if (result.advisories.length > 0) {
    lines.push('', 'Hinweise:');
    for (const advisory of result.advisories) {
      lines.push(`- ${advisory.text}`);
    }
  }

  lines.push('', 'Verwendete Tabellen:');
  for (const source of result.sources) {
    lines.push(
      `- ${source.figure} — ${source.tableName}, Seite ${source.pohPages.join(', ')} (${source.issue}, ${source.revision})`
    );
    lines.push(`  ${source.citation}`);
  }

  lines.push('', result.preflightCheckNotice);
  return lines.join('\n');
}

/** Formatierung ausschließlich über den Kern (C-03): hier wird nicht gerundet. */
function formatQuantity(value: number, unit: string): string {
  switch (unit) {
    case 'l':
      return formatLitres(value);
    case 'US gal':
      return formatUsGallons(value);
    case 'min':
      return formatMinutes(value);
    case 'NM':
      return formatNauticalMiles(value);
    case 'kt':
      return formatKnots(value);
    default:
      return `${value} ${unit}`;
  }
}

/**
 * Führt die Berechnung aus. Im Fehlerfall wird kein einziger Zahlenwert
 * zurückgegeben, damit das Modell nichts zum Weiterrechnen erhält (T046).
 */
export function handleComputeFuelPlan(args: unknown): ToolResult {
  try {
    const result = computeFuelPlan(args);
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
