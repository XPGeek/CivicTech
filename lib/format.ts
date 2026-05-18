/** Human-readable formatters for freshness, units, etc. */

export function formatFreshness(observedAt: string | undefined, now: Date = new Date()): string {
  if (!observedAt) return 'no data';
  const ageMin = Math.max(0, (now.getTime() - Date.parse(observedAt)) / 60_000);
  if (ageMin < 60) return `${Math.round(ageMin)} min ago`;
  const ageH = ageMin / 60;
  if (ageH < 24) return `${Math.round(ageH)} hr ago`;
  const ageD = ageH / 24;
  if (ageD < 7) return `${Math.round(ageD)} day${Math.round(ageD) === 1 ? '' : 's'} ago`;
  const ageW = ageD / 7;
  if (ageW < 8) return `${Math.round(ageW)} week${Math.round(ageW) === 1 ? '' : 's'} ago`;
  const ageMo = ageD / 30;
  return `${Math.round(ageMo)} month${Math.round(ageMo) === 1 ? '' : 's'} ago`;
}

/**
 * Compact value formatter for the signal breakdown rows. Avoids scientific
 * notation and clips long decimals.
 */
export function formatValue(value: number | undefined, units: string | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  let formatted: string;
  if (Math.abs(value) >= 1000) formatted = value.toFixed(0);
  else if (Math.abs(value) >= 10) formatted = value.toFixed(1);
  else formatted = value.toFixed(2);
  // Trim trailing zeros.
  formatted = formatted.replace(/\.?0+$/, '');
  return units ? `${formatted} ${units}` : formatted;
}

export function formatActivityLabel(activity: 'paddle' | 'swim'): string {
  return activity === 'paddle' ? 'Paddle' : 'Swim';
}
