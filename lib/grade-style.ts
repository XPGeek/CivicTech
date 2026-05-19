import type { Grade } from './types';

/**
 * Grade visual styling. Every grade has BOTH a color and a shape so colorblind
 * users get a non-color signal (NFR-7, UX § 2.3).
 */

export const GRADE_COLORS: Record<Grade, string> = {
  green: '#10b981',
  yellow: '#f59e0b',
  red: '#dc2626',
  unknown: '#9ca3af',
};

/**
 * Numeric ordering of grades for charts. Unknown ranks above red because
 * gray pins read as "no info" rather than "bad" — drawing them at the
 * bottom of a chart would imply they're worse than red, which they aren't.
 */
export const GRADE_ORDINAL: Record<Grade, number> = {
  green: 4,
  yellow: 3,
  unknown: 2,
  red: 1,
};

export const GRADE_LABELS: Record<Grade, string> = {
  green: 'Paddle-safe',
  yellow: 'Caution',
  red: 'Avoid',
  unknown: 'No data',
};

export const GRADE_SWIM_LABELS: Record<Grade, string> = {
  green: 'Swim-safe',
  yellow: 'Caution',
  red: 'Avoid',
  unknown: 'No data',
};

/**
 * Long-form descriptions used on the methodology page. Keep these short and
 * specific to what drove the grade — not a definition of the threshold.
 */
export const GRADE_DESCRIPTIONS: Record<Grade, string> = {
  green:
    "Bacteria are within the activity threshold, there's no recent rain, and (when sondes are present) real-time sensors look normal.",
  yellow:
    "One signal is elevated above the safety band but hasn't crossed the fail threshold. Read the reason on the detail card.",
  red:
    'Bacteria exceed safe levels for this activity, or heavy rainfall makes recent values unreliable, or dissolved oxygen has collapsed.',
  unknown:
    'No fresh data is available for this site right now. Check directly with the operator or come back later.',
};

/**
 * SVG path for the pin shape per grade. Used by the map markers AND the legend.
 * Each shape is anchored at the bottom center of a 32×32 viewbox.
 */
export const GRADE_PIN_SVG: Record<Grade, string> = {
  green: `
    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Paddle-safe">
      <circle cx="16" cy="16" r="11" fill="#10b981" stroke="white" stroke-width="3"/>
    </svg>`,
  yellow: `
    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Caution">
      <polygon points="16,4 28,26 4,26" fill="#f59e0b" stroke="white" stroke-width="3" stroke-linejoin="round"/>
    </svg>`,
  red: `
    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Avoid">
      <rect x="5" y="5" width="22" height="22" fill="#dc2626" stroke="white" stroke-width="3"/>
    </svg>`,
  unknown: `
    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="No data">
      <circle cx="16" cy="16" r="11" fill="white" stroke="#9ca3af" stroke-width="3" stroke-dasharray="3 2"/>
    </svg>`,
};

/**
 * Faded variant for grades computed from bacteria past the 7-day freshness
 * window but within the 90-day grace window. Same shape and color as the
 * fresh pin (so the colorblind triple-encoding still works), but rendered
 * at 55% opacity with a dashed white outline to signal "last-known, not now."
 *
 * `unknown` is intentionally excluded — a "stale unknown" is a contradiction;
 * unknown means no data, not old data.
 */
export const GRADE_STALE_PIN_SVG: Record<Exclude<Grade, 'unknown'>, string> = {
  green: `
    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Paddle-safe (last known)">
      <circle cx="16" cy="16" r="11" fill="#10b981" fill-opacity="0.55" stroke="white" stroke-width="3" stroke-dasharray="3 2"/>
    </svg>`,
  yellow: `
    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Caution (last known)">
      <polygon points="16,4 28,26 4,26" fill="#f59e0b" fill-opacity="0.55" stroke="white" stroke-width="3" stroke-linejoin="round" stroke-dasharray="3 2"/>
    </svg>`,
  red: `
    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Avoid (last known)">
      <rect x="5" y="5" width="22" height="22" fill="#dc2626" fill-opacity="0.55" stroke="white" stroke-width="3" stroke-dasharray="3 2"/>
    </svg>`,
};

/** Returns the right pin SVG for a (grade, stale) pair. Unknown ignores stale. */
export function pinSvgFor(grade: Grade, stale: boolean): string {
  if (stale && grade !== 'unknown') return GRADE_STALE_PIN_SVG[grade];
  return GRADE_PIN_SVG[grade];
}
