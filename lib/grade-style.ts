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
