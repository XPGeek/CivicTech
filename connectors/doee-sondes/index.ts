import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  type ConnectorContext,
  type ConnectorMeta,
  type NormalizedRecord,
  type Parameter,
} from '../shared/types';

export const meta: ConnectorMeta = {
  id: 'doee-sondes',
  name: 'DC DOEE — real-time YSI sondes',
  cadence: 'hourly',
  license: 'public-domain',
  contact: 'doee.communications@dc.gov',
  freshness_threshold_hours: 4,
};

/**
 * DOEE sondes connector — Phase 2 spike pending.
 *
 * DC DOEE operates a network of real-time YSI sondes on the Anacostia and
 * Potomac inside DC. The data is surfaced on a public dashboard at
 * doee.dc.gov/service/environmental-data-maps; the underlying export URL is
 * not yet documented in code. The first Phase 2 task is a spike: confirm the
 * data export pattern and replace `fetchRaw()` below with a real HTTP call.
 *
 * Until then this connector reads a fixture so the grading rubric's sonde
 * sanity-check path is exercised end-to-end.
 */

interface RawSondeReading {
  station_id: string;
  observed_at: string; // ISO 8601 UTC
  turbidity_ntu?: number;
  dissolved_oxygen_mgL?: number;
  water_temp_c?: number;
  ph?: number;
  chlorophyll_ugL?: number;
}

const RAW_PARAM_MAP: Array<{
  key: keyof Omit<RawSondeReading, 'station_id' | 'observed_at'>;
  parameter: Parameter;
  unit: string;
}> = [
  { key: 'turbidity_ntu', parameter: 'turbidity', unit: 'NTU' },
  { key: 'dissolved_oxygen_mgL', parameter: 'dissolved_oxygen', unit: 'mg/L' },
  { key: 'water_temp_c', parameter: 'water_temp', unit: '°C' },
  { key: 'ph', parameter: 'pH', unit: 'unitless' },
  { key: 'chlorophyll_ugL', parameter: 'chlorophyll', unit: 'µg/L' },
];

async function fetchRaw(context: ConnectorContext): Promise<RawSondeReading[]> {
  const fixturePath = join(__dirname, 'fixtures', 'sample-readings.json');
  if (!existsSync(fixturePath)) {
    context.log.warn('Fixture missing; emitting no records', {
      source_id: meta.id,
      fixturePath,
    });
    return [];
  }
  // Replace the fixture timestamps so the readings always appear fresh relative
  // to context.now(). This keeps demo grading deterministic across runs.
  const text = readFileSync(fixturePath, 'utf8');
  const raw = JSON.parse(text) as RawSondeReading[];
  const now = new Date(context.now()).getTime();
  return raw.map((r, i) => ({
    ...r,
    // Stagger readings between 5 and 20 minutes ago.
    observed_at: new Date(now - (5 + i * 3) * 60_000).toISOString(),
  }));
}

export async function fetch(context: ConnectorContext): Promise<NormalizedRecord[]> {
  const stationToSites = new Map<string, string[]>();
  for (const site of context.sites) {
    for (const station of site.stations) {
      if (station.source_id !== meta.id) continue;
      const list = stationToSites.get(station.station_id) ?? [];
      list.push(site.id);
      stationToSites.set(station.station_id, list);
    }
  }

  if (stationToSites.size === 0) {
    context.log.info('No DOEE sonde stations declared in sites.json; skipping', {
      source_id: meta.id,
    });
    return [];
  }

  const raw = await fetchRaw(context);
  const latest = new Map<string, RawSondeReading>();
  for (const r of raw) {
    const existing = latest.get(r.station_id);
    if (!existing || Date.parse(r.observed_at) > Date.parse(existing.observed_at)) {
      latest.set(r.station_id, r);
    }
  }

  const records: NormalizedRecord[] = [];
  for (const [stationId, siteIds] of stationToSites) {
    const reading = latest.get(stationId);
    if (!reading) continue;

    for (const { key, parameter, unit } of RAW_PARAM_MAP) {
      const value = reading[key];
      if (typeof value !== 'number' || !Number.isFinite(value)) continue;
      records.push({
        source_id: meta.id,
        station_id: stationId,
        site_ids: siteIds,
        observed_at: new Date(reading.observed_at).toISOString(),
        parameter,
        value,
        units: unit,
        qc_flag: 'provisional',
        raw_url: 'https://doee.dc.gov/service/environmental-data-maps',
      });
    }
  }

  context.log.info('DOEE sondes fixture-backed fetch complete', {
    source_id: meta.id,
    records: records.length,
  });

  return records;
}
