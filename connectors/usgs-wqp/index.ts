import {
  type ConnectorContext,
  type ConnectorMeta,
  type NormalizedRecord,
  type Parameter,
  type QCFlag,
  type SiteForConnector,
} from '../shared/types';
import { httpText } from '../shared/http';
import { nearestSiteWithin } from '../shared/sites';

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

// 1-year lookback covers a full recreation season plus state-agency upload
// lag (typically 1-6 months). Older results are unlikely to be the freshest
// at any active station and would bloat the build artifact for no verdict gain.
const LOOKBACK_DAYS = 365;

// How far a WQP monitoring location can sit from a launch and still be
// considered "the same water." 1.5 km is roughly the spatial autocorrelation
// scale of bacterial counts in tidal reaches — closer would miss the USGS
// gauge that's typically 0.5-1.0 km from a public boat ramp, farther would
// snap suburban storm-drain samples to mainstem-river launches.
const MAX_MATCH_DISTANCE_KM = 1.5;

// Padded bbox covering every launch in the catalog plus the nearby monitoring
// stations. Kept slightly larger than the site bbox so an off-launch USGS
// station at the edge still surfaces.
const DMV_BBOX = {
  westLon: -77.3,
  southLat: 38.65,
  eastLon: -76.85,
  northLat: 39.1,
} as const;

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

interface StationLocation {
  lat: number;
  lon: number;
}

function parseStations(csv: string): Map<string, StationLocation> {
  const out = new Map<string, StationLocation>();
  const lines = csv.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length < 2) return out;

  const headers = parseCsvLine(lines[0]!);
  const idIdx = headers.indexOf('MonitoringLocationIdentifier');
  const latIdx = headers.indexOf('LatitudeMeasure');
  const lonIdx = headers.indexOf('LongitudeMeasure');
  if (idIdx < 0 || latIdx < 0 || lonIdx < 0) return out;

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]!);
    const id = cells[idIdx];
    const lat = Number.parseFloat(cells[latIdx] ?? '');
    const lon = Number.parseFloat(cells[lonIdx] ?? '');
    if (!id || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    out.set(id, { lat, lon });
  }
  return out;
}

export async function fetch(context: ConnectorContext): Promise<NormalizedRecord[]> {
  if (context.sites.length === 0) {
    context.log.info('No sites declared; skipping WQP', { source_id: meta.id });
    return [];
  }

  const startDate = new Date(
    Date.parse(context.now()) - LOOKBACK_DAYS * 24 * 3600_000,
  );
  const startDateLo = `${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(
    startDate.getDate(),
  ).padStart(2, '0')}-${startDate.getFullYear()}`;

  // WQP expects bBox as `westLon,southLat,eastLon,northLat`.
  const bbox = `${DMV_BBOX.westLon},${DMV_BBOX.southLat},${DMV_BBOX.eastLon},${DMV_BBOX.northLat}`;
  const characteristicParam = Object.keys(CHARACTERISTIC_MAP).join(';');

  // The Result endpoint doesn't include station coordinates, so we run two
  // queries in parallel: one to discover monitoring locations in the bbox,
  // one to pull their recent bacterial samples. Join on MonitoringLocationIdentifier.
  const stationUrl =
    `https://www.waterqualitydata.us/data/Station/search` +
    `?bBox=${encodeURIComponent(bbox)}` +
    `&characteristicName=${encodeURIComponent(characteristicParam)}` +
    `&mimeType=csv`;
  const resultUrl =
    `https://www.waterqualitydata.us/data/Result/search` +
    `?bBox=${encodeURIComponent(bbox)}` +
    `&characteristicName=${encodeURIComponent(characteristicParam)}` +
    `&startDateLo=${startDateLo}` +
    `&mimeType=csv`;

  context.log.info('Fetching WQP stations + results', {
    source_id: meta.id,
    bbox,
    lookback_days: LOOKBACK_DAYS,
  });

  const userAgent = context.env.CONNECTOR_USER_AGENT ?? 'dmv-water-watch';
  const httpOpts = {
    source_id: meta.id,
    accept: 'text/csv',
    headers: { 'User-Agent': userAgent },
  };
  const [stationCsv, resultCsv] = await Promise.all([
    httpText(stationUrl, httpOpts),
    httpText(resultUrl, httpOpts),
  ]);

  const stations = parseStations(stationCsv);
  if (stations.size === 0) {
    context.log.warn('WQP returned no stations in bbox', { source_id: meta.id });
    return [];
  }

  const lines = resultCsv.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length < 2) {
    context.log.warn('WQP returned no result rows', { source_id: meta.id });
    return [];
  }
  const headers = parseCsvLine(lines[0]!);
  const idx = (name: string) => headers.indexOf(name);

  const col = {
    monitoringLocationId: idx('MonitoringLocationIdentifier'),
    startDate: idx('ActivityStartDate'),
    startTime: idx('ActivityStartTime/Time'),
    characteristic: idx('CharacteristicName'),
    value: idx('ResultMeasureValue'),
    activityType: idx('ActivityTypeCode'),
    status: idx('ResultStatusIdentifier'),
  };

  // Memoize "which site does this WQP station snap to?" — a single station
  // typically appears in hundreds of result rows, so we don't want to redo
  // the linear nearest-neighbor scan for each.
  const stationToSite = new Map<
    string,
    { site: SiteForConnector; distanceKm: number } | null
  >();
  const resolveSite = (wqpStationId: string) => {
    if (stationToSite.has(wqpStationId)) return stationToSite.get(wqpStationId)!;
    const loc = stations.get(wqpStationId);
    if (!loc) {
      stationToSite.set(wqpStationId, null);
      return null;
    }
    const match = nearestSiteWithin(
      loc.lat,
      loc.lon,
      context.sites,
      MAX_MATCH_DISTANCE_KM,
    );
    stationToSite.set(wqpStationId, match);
    return match;
  };

  // Keep only the freshest sample per (site, parameter) — the grader uses the
  // single most recent reading at each site, so emitting older rows would bloat
  // build artifacts without affecting any verdict.
  type Freshest = { record: NormalizedRecord; observedMs: number };
  const freshest = new Map<string, Freshest>();

  let matchedRows = 0;
  let unmatchedRows = 0;

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]!);

    const activityType = cells[col.activityType];
    if (!activityType || !ACCEPTED_ACTIVITY_TYPES.has(activityType)) continue;

    const status = cells[col.status];
    if (status === 'Rejected') continue;

    const value = Number.parseFloat(cells[col.value] ?? '');
    if (!Number.isFinite(value)) continue;

    const characteristic = cells[col.characteristic];
    const mapping = characteristic ? CHARACTERISTIC_MAP[characteristic] : undefined;
    if (!mapping) continue;

    const wqpStationId = cells[col.monitoringLocationId];
    if (!wqpStationId) continue;
    const match = resolveSite(wqpStationId);
    if (!match) {
      unmatchedRows++;
      continue;
    }

    const datePart = cells[col.startDate];
    const timePart = cells[col.startTime] || '12:00:00';
    if (!datePart) continue;
    // WQP gives local time; we treat the date as UTC since the per-day window
    // matters more than the hour for ≥7-day freshness rubric.
    const observedAt = `${datePart}T${timePart}Z`;
    const observedMs = Date.parse(observedAt);
    if (!Number.isFinite(observedMs)) continue;

    matchedRows++;
    const key = `${match.site.id}::${mapping.parameter}`;
    const prev = freshest.get(key);
    if (prev && prev.observedMs >= observedMs) continue;

    freshest.set(key, {
      observedMs,
      record: {
        source_id: meta.id,
        station_id: wqpStationId,
        site_ids: [match.site.id],
        observed_at: new Date(observedMs).toISOString(),
        parameter: mapping.parameter,
        value,
        units: mapping.unit,
        qc_flag: status === 'Accepted' ? 'final' : ('provisional' as QCFlag),
        raw_url: `https://www.waterqualitydata.us/data/Result/search?siteid=${encodeURIComponent(wqpStationId)}&characteristicName=${encodeURIComponent(characteristic ?? '')}&mimeType=csv`,
      },
    });
  }

  const records = Array.from(freshest.values()).map((f) => f.record);
  context.log.info('WQP fetch complete', {
    source_id: meta.id,
    records: records.length,
    stations_in_bbox: stations.size,
    matched_rows: matchedRows,
    unmatched_rows: unmatchedRows,
  });
  return records;
}
