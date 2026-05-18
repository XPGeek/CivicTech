import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  type ConnectorContext,
  type ConnectorMeta,
  type NormalizedRecord,
  type Parameter,
} from '../shared/types';
import { groupStationsBySite } from '../shared/sites';

export const meta: ConnectorMeta = {
  id: 'doee-sondes',
  name: 'DC DOEE — real-time YSI sondes',
  cadence: 'hourly',
  license: 'public-domain',
  contact: 'doee.communications@dc.gov',
  freshness_threshold_hours: 4,
};

// TODO(phase-2): replace `fetchRaw` with a live DOEE EQuIS export.
// Current fixture-backed path documented in README.md.

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
  let raw: RawSondeReading[];
  try {
    raw = JSON.parse(readFileSync(fixturePath, 'utf8')) as RawSondeReading[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      context.log.warn('Fixture missing; emitting no records', {
        source_id: meta.id,
        fixturePath,
      });
      return [];
    }
    throw err;
  }
  // Rewrite timestamps relative to context.now() so the readings are always
  // fresh in the demo. Real DOEE data carries its own timestamps and would
  // skip this step.
  const now = new Date(context.now()).getTime();
  return raw.map((r, i) => ({
    ...r,
    observed_at: new Date(now - (5 + i * 3) * 60_000).toISOString(),
  }));
}

export async function fetch(context: ConnectorContext): Promise<NormalizedRecord[]> {
  const stationToSites = groupStationsBySite(context.sites, meta.id);
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
