import {
  ConnectorError,
  type ConnectorContext,
  type ConnectorMeta,
  type NormalizedRecord,
} from '../shared/types';
import { httpJson } from '../shared/http';
import { mm_to_inches } from '../shared/units';
import { groupStationsBySite } from '../shared/sites';

export const meta: ConnectorMeta = {
  id: 'noaa-precip',
  name: 'NOAA / National Weather Service',
  cadence: 'hourly',
  license: 'public-domain',
  contact: 'https://www.weather.gov/contact',
  freshness_threshold_hours: 6,
};

interface NWSObservation {
  properties: {
    timestamp: string;
    precipitationLastHour?: { unitCode?: string; value: number | null };
    precipitationLast3Hours?: { unitCode?: string; value: number | null };
    precipitationLast6Hours?: { unitCode?: string; value: number | null };
  };
}

interface NWSResponse {
  features: NWSObservation[];
}

const WINDOW_HOURS = 48;

export async function fetch(context: ConnectorContext): Promise<NormalizedRecord[]> {
  const stationToSites = groupStationsBySite(context.sites, meta.id);
  if (stationToSites.size === 0) {
    context.log.info('No NOAA stations referenced in sites.json; skipping', { source_id: meta.id });
    return [];
  }

  const userAgent = context.env.CONNECTOR_USER_AGENT ?? 'dmv-water-watch (admin@example.org)';

  // Don't pass `start=`. Previously we computed start = context.now() - 48h
  // and let the API filter, but when the build clock runs ahead of real wall
  // time (CI clock skew, fixed-build snapshots, replay tests), the start
  // parameter sits in the future and NWS returns an empty feature collection.
  // Letting the API return its default ~72-hour history lets the connector
  // anchor the window to the freshest observation it actually saw, so a small
  // clock skew never silently zeroes out rainfall.
  const settled = await Promise.allSettled(
    Array.from(stationToSites, async ([stationId, siteIds]) => {
      const url = `https://api.weather.gov/stations/${encodeURIComponent(stationId)}/observations`;
      context.log.info('Fetching NOAA observations', { source_id: meta.id, station: stationId });
      const body = await httpJson<NWSResponse>(url, {
        source_id: meta.id,
        headers: { 'User-Agent': userAgent, Accept: 'application/geo+json' },
      });
      return { stationId, siteIds, body };
    }),
  );

  const records: NormalizedRecord[] = [];
  const buildClock = new Date(context.now());
  for (const result of settled) {
    if (result.status === 'rejected') {
      const err = result.reason;
      if (err instanceof ConnectorError && err.recoverable) {
        context.log.warn('NOAA station unavailable; skipping', {
          source_id: meta.id,
          code: err.code,
        });
        continue;
      }
      throw err;
    }
    const { stationId, siteIds, body } = result.value;
    const features = body.features ?? [];
    if (features.length === 0) {
      // Station entirely silent — likely offline or invalid ID. Skip.
      context.log.warn('No precipitation observations in window', {
        source_id: meta.id,
        station: stationId,
      });
      continue;
    }

    // Anchor the 48h window to whichever moment is fresher: the build clock
    // or the freshest observation. In production these are within minutes; in
    // a future-dated build the observation wins (and we surface the lag via
    // qc_flag below).
    const freshestObservedMs = freshestObservationMs(features);
    const anchorMs =
      freshestObservedMs && freshestObservedMs < buildClock.getTime()
        ? freshestObservedMs
        : buildClock.getTime();
    const anchor = new Date(anchorMs);
    const windowStart = new Date(anchorMs - WINDOW_HOURS * 3600_000);

    const total = sumPrecipitationMm(features, windowStart, anchor);

    // Many METAR-derived stations encode "no rain detected" as null on every
    // precipitation field — KDCA in dry weather returns 500 observations
    // with ~498 null precip values. Treating that as missing wastes a real
    // signal: a station reporting hourly but never logging precip is strong
    // evidence of no rainfall. Use 0 as the total but mark as estimated
    // because we're inferring rather than reading a 0 directly.
    const inferredZero = total.observationCount === 0;
    const totalMm = inferredZero ? 0 : total.totalMm;

    // If the freshest observation is well behind the build clock, mark the
    // reading as estimated — the grader's freshness rule will discount it.
    const lagHours = (buildClock.getTime() - anchorMs) / 3600_000;
    const lagged = lagHours > (meta.freshness_threshold_hours ?? 6);

    records.push({
      source_id: meta.id,
      station_id: stationId,
      site_ids: siteIds,
      observed_at: anchor.toISOString(),
      parameter: 'precipitation_48h',
      value: mm_to_inches(totalMm),
      units: 'inches',
      qc_flag:
        inferredZero || lagged || total.missingFraction > 0.25
          ? 'estimated'
          : 'final',
      raw_url: `https://www.weather.gov/wrh/timeseries?site=${encodeURIComponent(stationId)}`,
    });
  }

  context.log.info('NOAA precip fetch complete', {
    source_id: meta.id,
    records: records.length,
  });

  return records;
}

/** Latest valid observation timestamp in ms, or undefined if none parseable. */
function freshestObservationMs(features: NWSObservation[]): number | undefined {
  let max: number | undefined;
  for (const f of features) {
    const ms = Date.parse(f.properties.timestamp);
    if (!Number.isFinite(ms)) continue;
    if (max === undefined || ms > max) max = ms;
  }
  return max;
}

interface SumResult {
  totalMm: number;
  observationCount: number;
  missingFraction: number;
}

/**
 * Compute a 48-hour precipitation total in millimetres from a series of NWS
 * observations. Strategy: use the most informative non-overlapping window per
 * observation, preferring 1-hour totals, falling back to 3-hour, then 6-hour.
 * We walk forward in time and skip observations whose window overlaps an
 * already-counted span.
 */
export function sumPrecipitationMm(
  features: NWSObservation[],
  windowStart: Date,
  windowEnd: Date,
): SumResult {
  const observations = features
    .map((f) => ({
      timestamp: Date.parse(f.properties.timestamp),
      hour: f.properties.precipitationLastHour?.value,
      threeHour: f.properties.precipitationLast3Hours?.value,
      sixHour: f.properties.precipitationLast6Hours?.value,
    }))
    .filter((o) => Number.isFinite(o.timestamp))
    .sort((a, b) => a.timestamp - b.timestamp);

  if (observations.length === 0) {
    return { totalMm: 0, observationCount: 0, missingFraction: 1 };
  }

  let totalMm = 0;
  let consumedUntil = windowStart.getTime();
  let observationsCounted = 0;
  let missingSlots = 0;

  for (const obs of observations) {
    if (obs.timestamp < consumedUntil) continue;
    if (obs.timestamp > windowEnd.getTime()) break;

    // Prefer the smallest window that's non-null. Fall back upward.
    let mm: number | null | undefined = obs.hour;
    let coverHours = 1;
    if (mm == null && obs.threeHour != null) {
      mm = obs.threeHour;
      coverHours = 3;
    }
    if (mm == null && obs.sixHour != null) {
      mm = obs.sixHour;
      coverHours = 6;
    }

    if (mm == null) {
      missingSlots += 1;
      // Advance one hour so we don't loop forever on a station that never
      // reports precip explicitly (some stations omit the field entirely).
      consumedUntil = obs.timestamp + 3600_000;
      continue;
    }

    totalMm += mm;
    observationsCounted += 1;
    consumedUntil = obs.timestamp + coverHours * 3600_000;
  }

  const missingFraction = Math.min(1, missingSlots / WINDOW_HOURS);

  return {
    totalMm,
    observationCount: observationsCounted,
    missingFraction,
  };
}
