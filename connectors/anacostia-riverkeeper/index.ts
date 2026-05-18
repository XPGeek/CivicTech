import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  type ConnectorContext,
  type ConnectorMeta,
  type NormalizedRecord,
  type Parameter,
  type QCFlag,
} from '../shared/types';
import { groupStationsBySite } from '../shared/sites';

export const meta: ConnectorMeta = {
  id: 'anacostia-riverkeeper',
  name: 'Anacostia Riverkeeper (volunteer bacterial sampling)',
  cadence: '6-hourly',
  license: 'cc-by',
  contact: 'info@anacostiariverkeeper.org',
  freshness_threshold_hours: 24 * 8,
};

// TODO(phase-2): replace `fetchRaw` with a live Swim Guide / CMC integration.
// Current fixture-backed path documented in README.md.

interface RawReading {
  station_id: string;
  observed_at: string;
  e_coli_mpn?: number;
  turbidity_ntu?: number;
  ph?: number;
  water_temp_c?: number;
}

const RAW_PARAM_MAP: Array<{
  key: keyof Omit<RawReading, 'station_id' | 'observed_at'>;
  parameter: Parameter;
  unit: string;
}> = [
  { key: 'e_coli_mpn', parameter: 'e_coli', unit: 'MPN/100mL' },
  { key: 'turbidity_ntu', parameter: 'turbidity', unit: 'NTU' },
  { key: 'ph', parameter: 'pH', unit: 'unitless' },
  { key: 'water_temp_c', parameter: 'water_temp', unit: '°C' },
];

async function fetchRaw(context: ConnectorContext): Promise<RawReading[]> {
  const fixturePath = join(__dirname, 'fixtures', 'sample-readings.json');
  try {
    return JSON.parse(readFileSync(fixturePath, 'utf8')) as RawReading[];
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
}

export async function fetch(context: ConnectorContext): Promise<NormalizedRecord[]> {
  const stationToSites = groupStationsBySite(context.sites, meta.id);
  if (stationToSites.size === 0) {
    context.log.info('No Anacostia Riverkeeper stations declared in sites.json; skipping', {
      source_id: meta.id,
    });
    return [];
  }

  const raw = await fetchRaw(context);
  const records: NormalizedRecord[] = [];

  // Keep only the most recent reading per (station × parameter).
  const latest = new Map<string, RawReading>();
  for (const r of raw) {
    const existing = latest.get(r.station_id);
    if (!existing || Date.parse(r.observed_at) > Date.parse(existing.observed_at)) {
      latest.set(r.station_id, r);
    }
  }

  for (const [stationId, siteIds] of stationToSites) {
    const reading = latest.get(stationId);
    if (!reading) {
      context.log.warn('No reading for station in fixture', {
        source_id: meta.id,
        station: stationId,
      });
      continue;
    }

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
        qc_flag: 'final' as QCFlag,
        raw_url: 'https://www.anacostiariverkeeper.org/programs/water-quality-monitoring/',
      });
    }
  }

  context.log.info('Anacostia Riverkeeper fixture-backed fetch complete', {
    source_id: meta.id,
    records: records.length,
  });

  return records;
}
