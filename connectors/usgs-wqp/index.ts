import {
  ConnectorError,
  type ConnectorContext,
  type ConnectorMeta,
  type NormalizedRecord,
  type Parameter,
  type QCFlag,
} from '../shared/types';
import { groupStationsBySite } from '../shared/sites';

export const meta: ConnectorMeta = {
  id: 'usgs-wqp',
  name: 'USGS Water Quality Portal',
  cadence: 'weekly',
  license: 'public-domain',
  contact: 'https://www.waterqualitydata.us/',
  freshness_threshold_hours: 24 * 7,
};

// WQP characteristic names → our Parameter enum.
// `Enterococci, calculated value` is intentionally excluded — its comma
// breaks WQP's multi-value parser when combined with semicolon-joined site
// lists, and it's a numerical derivation of plain Enterococcus anyway.
const CHARACTERISTIC_MAP: Record<string, { parameter: Parameter; unit: string }> = {
  'Escherichia coli': { parameter: 'e_coli', unit: 'MPN/100mL' },
  Enterococcus: { parameter: 'enterococcus', unit: 'MPN/100mL' },
};

// Activity types that represent real water samples we want to ingest.
// "Quality Control Sample-Field Replicate" / "Field Msr/Obs-Habitat Assessment"
// and similar are filtered out.
const ACCEPTED_ACTIVITY_TYPES = new Set([
  'Sample-Routine',
  'Sample-Integrated Vertical Profile',
  'Field Msr/Obs',
]);

// State agencies upload to WQP with a 1-6 month lag, and some stations only
// see a few samples a year. A 3-year lookback is the smallest window that
// reliably returns at least one row per active station; the connector keeps
// only the freshest sample per (station × parameter), so the artifact size
// doesn't change.
const LOOKBACK_DAYS = 365 * 3;

// CSV is the documented mimeType for WQP Results. We parse with a permissive
// splitter rather than pulling a CSV lib — the only quoted fields we care
// about are short and unlikely to contain commas, but we still respect quotes.
function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      cells.push(current);
      current = '';
    } else {
      current += c;
    }
  }
  cells.push(current);
  return cells;
}

export async function fetch(context: ConnectorContext): Promise<NormalizedRecord[]> {
  // WQP uses the same USGS station IDs that the live NWIS connector does.
  // Reuse the `usgs-nwis` station declarations so we don't ask site curators
  // to add a second source_id for the same station.
  const stationToSites = groupStationsBySite(context.sites, 'usgs-nwis');
  if (stationToSites.size === 0) {
    context.log.info('No USGS stations declared; skipping WQP', { source_id: meta.id });
    return [];
  }

  const startDate = new Date(
    Date.parse(context.now()) - LOOKBACK_DAYS * 24 * 3600_000,
  );
  const startDateLo = `${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(
    startDate.getDate(),
  ).padStart(2, '0')}-${startDate.getFullYear()}`;

  // WQP expects `USGS-` prefix and semicolon-separated multi-value lists.
  const siteParam = Array.from(stationToSites.keys())
    .map((s) => `USGS-${s}`)
    .join(';');
  const characteristicParam = Object.keys(CHARACTERISTIC_MAP).join(';');

  const url =
    `https://www.waterqualitydata.us/data/Result/search` +
    `?siteid=${encodeURIComponent(siteParam)}` +
    `&characteristicName=${encodeURIComponent(characteristicParam)}` +
    `&mimeType=csv&startDateLo=${startDateLo}`;

  context.log.info('Fetching WQP results', {
    source_id: meta.id,
    station_count: stationToSites.size,
  });

  const userAgent = context.env.CONNECTOR_USER_AGENT ?? 'dmv-water-watch';
  let csv: string;
  try {
    const res = await globalThis.fetch(url, {
      headers: { Accept: 'text/csv', 'User-Agent': userAgent },
    });
    if (!res.ok) {
      throw new ConnectorError({
        code: `HTTP_${res.status}`,
        message: `WQP responded ${res.status}`,
        recoverable: res.status >= 500,
        source_id: meta.id,
      });
    }
    csv = await res.text();
  } catch (err) {
    if (err instanceof ConnectorError) throw err;
    throw new ConnectorError({
      code: 'NETWORK',
      message: `WQP fetch failed: ${(err as Error).message}`,
      recoverable: true,
      source_id: meta.id,
      cause: err,
    });
  }

  const lines = csv.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length < 2) {
    context.log.warn('WQP returned no data rows', { source_id: meta.id });
    return [];
  }
  const headers = parseCsvLine(lines[0]!);
  const idx = (name: string) => headers.indexOf(name);

  const col = {
    monitoringLocationId: idx('MonitoringLocationIdentifier'),
    startDate: idx('ActivityStartDate'),
    startTime: idx('ActivityStartTime/Time'),
    startTimeZone: idx('ActivityStartTime/TimeZoneCode'),
    characteristic: idx('CharacteristicName'),
    value: idx('ResultMeasureValue'),
    unit: idx('ResultMeasure/MeasureUnitCode'),
    activityType: idx('ActivityTypeCode'),
    status: idx('ResultStatusIdentifier'),
  };

  // Track the freshest sample per (stationId, parameter) — the grader only
  // uses the freshest record, so emitting all 180 days would just bloat the
  // build artifacts without changing any verdict.
  type Freshest = { record: NormalizedRecord; observedMs: number };
  const freshest = new Map<string, Freshest>();

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]!);

    const activityType = cells[col.activityType];
    if (!activityType || !ACCEPTED_ACTIVITY_TYPES.has(activityType)) continue;

    const status = cells[col.status];
    if (status === 'Rejected') continue;

    const rawValue = cells[col.value];
    const value = Number.parseFloat(rawValue ?? '');
    if (!Number.isFinite(value)) continue;

    const characteristic = cells[col.characteristic];
    const mapping = characteristic ? CHARACTERISTIC_MAP[characteristic] : undefined;
    if (!mapping) continue;

    const fullId = cells[col.monitoringLocationId] ?? '';
    const usgsId = fullId.startsWith('USGS-') ? fullId.slice(5) : fullId;
    const siteIds = stationToSites.get(usgsId);
    if (!siteIds || siteIds.length === 0) continue;

    const datePart = cells[col.startDate];
    const timePart = cells[col.startTime] || '12:00:00';
    if (!datePart) continue;
    // WQP gives local time; we treat the date as UTC since the per-day window
    // matters more than the hour for ≥7-day freshness rubric.
    const observedAt = `${datePart}T${timePart}Z`;
    const observedMs = Date.parse(observedAt);
    if (!Number.isFinite(observedMs)) continue;

    const key = `${usgsId}::${mapping.parameter}`;
    const prev = freshest.get(key);
    if (prev && prev.observedMs >= observedMs) continue;

    freshest.set(key, {
      observedMs,
      record: {
        source_id: meta.id,
        station_id: usgsId,
        site_ids: siteIds,
        observed_at: new Date(observedMs).toISOString(),
        parameter: mapping.parameter,
        value,
        units: mapping.unit,
        qc_flag: status === 'Accepted' ? 'final' : ('provisional' as QCFlag),
        raw_url: `https://www.waterqualitydata.us/data/Result/search?siteid=${encodeURIComponent(fullId)}&characteristicName=${encodeURIComponent(characteristic ?? '')}&mimeType=csv`,
      },
    });
  }

  const records = Array.from(freshest.values()).map((f) => f.record);
  context.log.info('WQP fetch complete', {
    source_id: meta.id,
    records: records.length,
    lookback_days: LOOKBACK_DAYS,
  });
  return records;
}
