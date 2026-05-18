import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  type ConnectorContext,
  type ConnectorMeta,
  type NormalizedRecord,
  type Parameter,
  type QCFlag,
} from '../shared/types';

export const meta: ConnectorMeta = {
  id: 'anacostia-riverkeeper',
  name: 'Anacostia Riverkeeper (volunteer bacterial sampling)',
  cadence: '6-hourly',
  license: 'cc-by',
  contact: 'info@anacostiariverkeeper.org',
  freshness_threshold_hours: 24 * 8,
};

/**
 * Anacostia Riverkeeper connector — Phase 2 spike pending.
 *
 * In production this connector should consume one of:
 *   - The Swim Guide open-data feed (https://github.com/swimdrinkfish/opendata)
 *   - The Friday weekly water-quality PDF (anacostiariverkeeper.org)
 *
 * For now it reads from a committed JSON fixture in `fixtures/sample-readings.json`
 * so the build pipeline and grading rubric can exercise the bacterial-signal path
 * end-to-end without depending on an unstable upstream. The fixture mirrors the
 * shape of the published weekly PDF.
 *
 * Replacing this with a real fetch is a one-file change: implement the `fetchRaw`
 * function below to return the same `RawReading[]` shape from a real source.
 */

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
  // Fixture-only implementation. See module docstring; replace this body when
  // upgrading to a live Swim Guide / PDF integration.
  const fixturePath = join(__dirname, 'fixtures', 'sample-readings.json');
  if (!existsSync(fixturePath)) {
    context.log.warn('Fixture file missing; emitting no records', {
      source_id: meta.id,
      fixturePath,
    });
    return [];
  }
  const text = readFileSync(fixturePath, 'utf8');
  return JSON.parse(text) as RawReading[];
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
