import {
  ConnectorError,
  type ConnectorContext,
  type ConnectorMeta,
  type NormalizedRecord,
} from '../shared/types';
import { httpJson } from '../shared/http';
import { groupStationsBySite } from '../shared/sites';

export const meta: ConnectorMeta = {
  id: 'noaa-tides',
  name: 'NOAA Tides & Currents (CO-OPS)',
  cadence: 'hourly',
  license: 'public-domain',
  contact: 'https://api.tidesandcurrents.noaa.gov/',
  freshness_threshold_hours: 6,
};

interface CoopsResponse {
  data?: Array<{
    t?: string; // local time, "YYYY-MM-DD HH:MM"
    v?: string; // value (string-encoded number)
    s?: string;
    f?: string;
    q?: string;
  }>;
  metadata?: { id?: string; name?: string; lat?: string; lon?: string };
  error?: { message?: string };
}

/**
 * NOAA CO-OPS station IDs near the inner DMV:
 *   8594900 — Washington, DC (Potomac at SW Waterfront)
 *   8635150 — Solomons, MD (downstream Bay)
 * Sites that should declare one are added in data/sites.json under
 * `source_id: 'noaa-tides'`.
 */
export async function fetch(context: ConnectorContext): Promise<NormalizedRecord[]> {
  const stationToSites = groupStationsBySite(context.sites, meta.id);
  if (stationToSites.size === 0) {
    context.log.info('No NOAA tide stations declared; skipping', { source_id: meta.id });
    return [];
  }

  const records: NormalizedRecord[] = [];

  // CO-OPS is per-station and fast. Fan out with allSettled so a single dead
  // station doesn't block the rest.
  const settled = await Promise.allSettled(
    Array.from(stationToSites, async ([stationId, siteIds]) => {
      const url =
        `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter` +
        `?product=water_level&station=${encodeURIComponent(stationId)}` +
        `&date=latest&datum=NAVD&units=english&time_zone=lst&format=json`;
      const body = await httpJson<CoopsResponse>(url, { source_id: meta.id });
      return { stationId, siteIds, body };
    }),
  );

  for (const result of settled) {
    if (result.status === 'rejected') {
      const err = result.reason;
      if (err instanceof ConnectorError && err.recoverable) {
        context.log.warn('CO-OPS station unavailable; skipping', {
          source_id: meta.id,
          code: err.code,
        });
        continue;
      }
      throw err;
    }
    const { stationId, siteIds, body } = result.value;
    if (body.error?.message) {
      context.log.warn('CO-OPS returned an error', {
        source_id: meta.id,
        station: stationId,
        message: body.error.message,
      });
      continue;
    }
    const point = body.data?.[0];
    if (!point?.t || point.v == null) {
      context.log.warn('CO-OPS returned no data point', {
        source_id: meta.id,
        station: stationId,
      });
      continue;
    }
    const value = Number.parseFloat(point.v);
    if (!Number.isFinite(value)) continue;

    // CO-OPS returns local-station time as "YYYY-MM-DD HH:MM" (no seconds, no
    // TZ). Append ":00Z" so the result is a strict ISO 8601 datetime. We treat
    // the timestamp as UTC because the freshness window (6 h) tolerates the
    // ±5h drift and freshness is what matters here, not exact wall-clock
    // alignment.
    const observedAt = `${point.t.replace(' ', 'T')}:00Z`;

    records.push({
      source_id: meta.id,
      station_id: stationId,
      site_ids: siteIds,
      observed_at: observedAt,
      parameter: 'gauge_height',
      value,
      units: 'feet',
      qc_flag: point.q === 'v' ? 'final' : 'provisional',
      raw_url: `https://tidesandcurrents.noaa.gov/stationhome.html?id=${encodeURIComponent(stationId)}`,
    });
  }

  context.log.info('NOAA tides fetch complete', { source_id: meta.id, records: records.length });
  return records;
}
