/** Öffentliche Schnittstelle des Kernpakets (Constitution-Prinzip IV). */

export type {
  Advisory,
  SourceAnomaly,
  CalculationStep,
  InputDomain,
  NumericRange,
  PohSourceReference,
  PowerSettingAvailability,
  Quantity,
  SourceReference,
  StandardSourceReference,
  TableAnchor,
  TableSummary
} from './types.js';

export {
  ICAO_STANDARD_ATMOSPHERE_SOURCE,
  toPressureAltitude,
  type PressureAltitudeResult
} from './atmosphere/pressureAltitude.js';

export {
  PohCalculationError,
  pressureAltitudeOutOfRange,
  type PohCalculationErrorKind
} from './errors.js';

export {
  CLIMB_TABLE_ID,
  CRUISE_TABLE_ID,
  USABLE_FUEL_L,
  USABLE_FUEL_US_GAL,
  getSourceReference,
  getTableCondition,
  getTableNote,
  getTableSummary,
  listApplicableTableIds,
  listTables
} from './tables.js';

export { interpolate, type InterpolationQuery, type InterpolationResult } from './interpolate.js';

export {
  NBSP,
  formatFeet,
  formatFuel,
  formatFuelFlow,
  formatHectopascal,
  formatHours,
  formatKnots,
  formatLitres,
  formatLitresPerNauticalMile,
  formatUsGallons,
  formatMinutes,
  formatNauticalMiles,
  formatNumber,
  unitText,
  roundKnots,
  roundLitres,
  roundMinutes,
  roundNauticalMiles,
  roundTo,
  roundUsGallons
} from './format.js';

export { computeClimb, climbTemperatureFactor, type ClimbSegment } from './fuel/climb.js';
export { computeCruise, ktasTemperatureFactor } from './fuel/cruise.js';
export {
  computeCruiseCapability,
  type CruiseCapability,
  type CruiseConditionsInput
} from './fuel/cruiseCapability.js';
export { buildAdvisories } from './fuel/advisories.js';
export {
  computeFuelPlan,
  PREFLIGHT_CHECK_NOTICE,
  type CruisePerformance,
  type FuelBreakdown,
  type FuelBreakdownUsGal,
  type FuelPlanResult
} from './fuel/fuelPlan.js';

export {
  bracketingAltitudes,
  getCruisePressureAltitudeRange,
  getFuelPlanInputDomain,
  getPressureAltitudeRange,
  getPowerSettingsByPressureAltitude,
  validateFlightPlan,
  type FlightPlanInput,
  type ValidatedFlightPlan
} from './fuel/input.js';
