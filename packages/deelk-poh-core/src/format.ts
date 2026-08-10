/**
 * Die einzige Rundungs- und Zahlendarstellungsstelle des Projekts
 * (Zusicherung C-03). Adapter runden nicht nach — sonst könnten Web-Oberfläche
 * und MCP-Endpunkt verschiedene Zahlen zeigen (Constitution-Prinzip IV).
 *
 * Gerundet wird erst das Ergebnis, nie die Zwischenwerte (FR-020). Die Stellen
 * entsprechen der Darstellung im POH (FR-021).
 */

/**
 * Geschütztes Leerzeichen. Zahl und Einheit gehören zusammen und dürfen an
 * keinem Zeilenende auseinandergerissen werden — "87,6" allein am Zeilenende
 * ist bei einer Kraftstoffangabe im schlimmsten Fall irreführend. Dasselbe
 * gilt innerhalb einer mehrteiligen Einheit ("US gal").
 */
export const NBSP = '\u00A0';

/**
 * Zahl und Einheit, verbunden durch ein geschütztes Leerzeichen. Die einzige
 * Stelle, an der eine Einheit an einen Wert geheftet wird — Adapter setzen
 * Einheiten nicht selbst (Zusicherung C-03).
 */
export function unitText(valueText: string, unit: string): string {
  return unit === '' ? valueText : `${valueText}${NBSP}${unit.replaceAll(' ', NBSP)}`;
}

/**
 * Zahl mit Einheit in deutscher Schreibweise. Öffentlich, weil auch Meldungen
 * und Erläuterungen des Kerns Zahl und Einheit so verbinden — und nicht selbst
 * zusammensetzen dürfen.
 */
export function formatQuantity(value: number, decimals: number, unit: string): string {
  return unitText(formatNumber(value, decimals), unit);
}

/**
 * Einheiten, die in Fließtext hinter einer Zahl stehen können. Die Liste ist
 * bewusst geschlossen: Ein allgemeines „Wort hinter Zahl" würde auch
 * „5 Flugzeuge" zusammenbinden.
 */
const TEXT_EINHEITEN = [
  'US gal',
  'l',
  'kt',
  'ft',
  'NM',
  'hPa',
  'min',
  'h',
  'kg',
  'lbs',
  '%',
  '°C',
  // 'm' steht bewusst hinter 'min' und 'NM': Die Alternation greift von links,
  // sonst bliebe von "15 min" ein "15 m" mit angehaengtem "in".
  'm'
];

const EINHEIT_IM_TEXT = new RegExp(
  `(\\d)\\s+(${TEXT_EINHEITEN.map((unit) => unit.replaceAll(' ', '\\s')).join('|')})(?![\\p{L}\\d])`,
  'gu'
);

/**
 * Bindet in einem vorgegebenen Text jede Zahl an ihre Einheit. Gedacht für
 * wörtlich übernommenen Handbuchtext (Anmerkungen, Bedingungen): Der Wortlaut
 * bleibt unangetastet, nur das Leerzeichen wird durch ein geschütztes ersetzt
 * (Issue #13). Damit gilt die Regel auch dort, wo der Text nicht aus Zahlen
 * dieses Programms zusammengesetzt wird.
 */
export function withNonBreakingUnits(text: string): string {
  return text.replace(EINHEIT_IM_TEXT, (_treffer, zahl: string, einheit: string) =>
    unitText(zahl, einheit.replaceAll(/\s/g, ' '))
  );
}

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
  return formatQuantity(value, 1, 'l');
}

export function formatUsGallons(value: number): string {
  return formatQuantity(value, 1, 'US gal');
}

/**
 * Beide Einheiten in einer Zeile. Die US-Gallonen stammen aus den eigenen
 * Spalten des Handbuchs, nicht aus einer Umrechnung der Liter (FR-009).
 */
export function formatFuel(litres: number, usGallons: number): string {
  return `${formatLitres(litres)} (${formatUsGallons(usGallons)})`;
}

/**
 * Verbrauch je Stunde in beiden Einheiten. Die Einheit steht bei jeder Zahl:
 * "22,1 l (5,8 US gal)/h" liesse offen, worauf sich das /h bezieht.
 */
export function formatFuelFlow(litresPerHour: number, usGallonsPerHour: number): string {
  return `${formatLitres(litresPerHour)}/h (${formatUsGallons(usGallonsPerHour)}/h)`;
}

/**
 * Verbrauch je Seemeile in beiden Einheiten (Issue #12). Zwei
 * Nachkommastellen, weil die Zahl bei einer Cessna 172 in der Größenordnung
 * von 0,2 l/NM liegt — auf 0,1 gerundet wäre sie stumpf.
 *
 * Gerechnet wird die Größe nicht hier, sondern in `computeCruiseCapability`;
 * diese Funktion stellt sie nur dar.
 */
export function formatFuelPerNauticalMile(
  litresPerNm: number,
  usGallonsPerNm: number
): string {
  return `${formatQuantity(litresPerNm, 2, 'l')}/NM (${formatQuantity(usGallonsPerNm, 2, 'US gal')}/NM)`;
}

export function formatMinutes(value: number): string {
  return formatQuantity(value, 0, 'min');
}

/**
 * Dezimalstunden als Stunden und Minuten. "2,09 h" laesst sich schlecht in eine
 * Flugvorbereitung uebertragen; "2 h 05 min" schon.
 */
export function formatHours(value: number): string {
  const gesamtMinuten = roundTo(value * 60, 0);
  const stunden = Math.floor(gesamtMinuten / 60);
  const minuten = gesamtMinuten - stunden * 60;
  return `${formatQuantity(stunden, 0, 'h')} ${minuten < 10 ? '0' : ''}${formatQuantity(minuten, 0, 'min')}`;
}

export function formatNauticalMiles(value: number): string {
  return formatQuantity(value, 1, 'NM');
}

export function formatKnots(value: number): string {
  return formatQuantity(value, 0, 'kt');
}

/** Höhe auf ganze Fuß. */
export function formatFeet(value: number): string {
  return formatQuantity(value, 0, 'ft');
}

/**
 * Strecke am Boden auf ganze Meter. Mehr Stellen behaupteten eine Genauigkeit,
 * die die Interpolation nicht hat — die Tabelle selbst ist auf ganze Meter
 * gedruckt.
 */
export function formatMetres(value: number): string {
  return formatQuantity(value, 0, 'm');
}

/** Luftdruck auf ganze hPa. Das QNH wird auch im Wetterbericht so genannt. */
export function formatHectopascal(value: number): string {
  return formatQuantity(value, 0, 'hPa');
}

/** Temperaturangabe, etwa die ISA-Abweichung. */
export function formatCelsius(value: number): string {
  return formatQuantity(value, 0, '°C');
}

/** Anteilsangabe, etwa die Lasteinstellung. */
export function formatPercent(value: number): string {
  return formatQuantity(value, 0, '%');
}
