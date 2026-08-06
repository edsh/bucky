/** Öffentliche Schnittstelle des Kernpakets (Constitution-Prinzip IV). */

export type {
  CalculationStep,
  InputDomain,
  NumericRange,
  PowerSettingAvailability,
  Quantity,
  SourceReference,
  TableAnchor,
  TableSummary
} from './types.js';

export { PohCalculationError, type PohCalculationErrorKind } from './errors.js';

export {
  CLIMB_TABLE_ID,
  CRUISE_TABLE_ID,
  USABLE_FUEL_L,
  getSourceReference,
  getTableNote,
  getTableSummary,
  listApplicableTableIds
} from './tables.js';

export { interpolate, type InterpolationQuery, type InterpolationResult } from './interpolate.js';

export {
  formatKnots,
  formatLitres,
  formatMinutes,
  formatNauticalMiles,
  formatNumber,
  roundKnots,
  roundLitres,
  roundMinutes,
  roundNauticalMiles,
  roundTo
} from './format.js';

export {
  bracketingAltitudes,
  getFuelPlanInputDomain,
  getPowerSettingsByPressureAltitude,
  validateFlightPlan,
  type FlightPlanInput
} from './fuel/input.js';
