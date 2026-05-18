import type { Parameter } from './types';

export function fahrenheitToCelsius(f: number): number {
  return (f - 32) * (5 / 9);
}

export function celsiusToFahrenheit(c: number): number {
  return c * (9 / 5) + 32;
}

/** mL/L → mg/L for dissolved oxygen (1 mL O2/L ≈ 1.4276 mg/L at STP). */
export function mlPerL_to_mgL(mlPerL: number): number {
  return mlPerL * 1.4276;
}

/** ppm is numerically equal to mg/L for dilute aqueous solutions. */
export function ppm_to_mgL(ppm: number): number {
  return ppm;
}

export function mm_to_inches(mm: number): number {
  return mm / 25.4;
}

export function inches_to_mm(inches: number): number {
  return inches * 25.4;
}

/** CFU and MPN are not strictly equivalent but are treated as interchangeable
 *  for E. coli and enterococcus reporting per EPA Method 1603/1611 guidance.
 *  This function is a no-op identity but exists to document the conversion. */
export function cfu_to_mpn(cfu: number): number {
  return cfu;
}

/** Canonical units lookup; useful for validation. */
export const CANONICAL_UNITS_MAP: Record<Parameter, string> = {
  e_coli: 'MPN/100mL',
  enterococcus: 'MPN/100mL',
  turbidity: 'NTU',
  dissolved_oxygen: 'mg/L',
  water_temp: '°C',
  gauge_height: 'feet',
  streamflow: 'cubic feet per second',
  precipitation_48h: 'inches',
  chlorophyll: 'µg/L',
  pH: 'unitless',
  impairment_status: 'unitless',
};

export function isCanonicalUnit(parameter: Parameter, units: string): boolean {
  return CANONICAL_UNITS_MAP[parameter] === units;
}
