/**
 * Die einzige Rundungs- und Zahlendarstellungsstelle des Projekts
 * (Zusicherung C-03). Adapter runden nicht nach — sonst könnten Web-Oberfläche
 * und MCP-Endpunkt verschiedene Zahlen zeigen (Constitution-Prinzip IV).
 *
 * Gerundet wird erst das Ergebnis, nie die Zwischenwerte (FR-020). Die Stellen
 * entsprechen der Darstellung im POH (FR-021).
 */

/** Kraftstoffmenge auf 0,1 l. */
export function roundLitres(value: number): number {
  return roundTo(value, 1);
}

/** Kraftstoffmenge auf 0,1 US gal. */
export function roundUsGallons(value: number): number {
  return roundTo(value, 1);
}

/** Zeit auf ganze Minuten. */
export function roundMinutes(value: number): number {
  return roundTo(value, 0);
}

/** Strecke auf 0,1 NM. */
export function roundNauticalMiles(value: number): number {
  return roundTo(value, 1);
}

/** Geschwindigkeit auf ganze Knoten. */
export function roundKnots(value: number): number {
  return roundTo(value, 0);
}

/**
 * Kaufmännisches Runden auf eine feste Stellenzahl. Der Umweg über die
 * Exponentialschreibweise vermeidet, dass Werte wie 2,675 wegen ihrer
 * Binärdarstellung abgerundet werden.
 */
export function roundTo(value: number, decimals: number): number {
  if (!Number.isFinite(value)) {
    return value;
  }
  const shifted = Number(`${value}e${decimals}`);
  return Number(`${Math.round(shifted)}e-${decimals}`);
}

/** Zahl in deutscher Schreibweise, mit fester Stellenzahl. */
export function formatNumber(value: number, decimals: number): string {
  return roundTo(value, decimals).toFixed(decimals).replace('.', ',');
}

export function formatLitres(value: number): string {
  return `${formatNumber(value, 1)} l`;
}

export function formatUsGallons(value: number): string {
  return `${formatNumber(value, 1)} US gal`;
}

/**
 * Beide Einheiten in einer Zeile. Die US-Gallonen stammen aus den eigenen
 * Spalten des Handbuchs, nicht aus einer Umrechnung der Liter (FR-009).
 */
export function formatFuel(litres: number, usGallons: number): string {
  return `${formatLitres(litres)} (${formatUsGallons(usGallons)})`;
}

export function formatMinutes(value: number): string {
  return `${formatNumber(value, 0)} min`;
}

export function formatNauticalMiles(value: number): string {
  return `${formatNumber(value, 1)} NM`;
}

export function formatKnots(value: number): string {
  return `${formatNumber(value, 0)} kt`;
}
