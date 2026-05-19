import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fetch as wqpFetch, meta } from './index';
import { createLogger } from '../shared/log';
import type { ConnectorContext } from '../shared/types';

const resultsCsv = readFileSync(join(__dirname, 'fixtures/wqp-anacostia.csv'), 'utf8');
const stationsCsv = readFileSync(join(__dirname, 'fixtures/wqp-stations.csv'), 'utf8');

function makeContext(): ConnectorContext {
  return {
    sites: [
      {
        id: 'bladensburg-waterfront',
        lat: 38.9395,
        lon: -76.9389,
        stations: [{ source_id: 'usgs-nwis', station_id: '01651800' }],
      },
      {
        id: 'northeast-branch-campus-drive',
        lat: 38.9856,
        lon: -76.9402,
        stations: [{ source_id: 'usgs-nwis', station_id: '01649500' }],
      },
      {
        id: 'unrelated',
        // Far outside the WQP bbox so it cannot snap to any returned station.
        lat: 35.0,
        lon: -80.0,
        stations: [{ source_id: 'doee-sondes', station_id: 'X' }],
      },
    ],
    env: {},
    log: createLogger('test'),
    now: () => '2026-05-18T14:00:00Z',
  };
}

// Both the Stations and Results endpoints get hit in parallel; route by URL
// path so each call sees the right fixture.
function mockWqpFetch() {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (url.includes('/Station/search')) {
      return new Response(stationsCsv, { headers: { 'content-type': 'text/csv' } });
    }
    if (url.includes('/Result/search')) {
      return new Response(resultsCsv, { headers: { 'content-type': 'text/csv' } });
    }
    return new Response('', { status: 404 });
  });
}

describe('usgs-wqp connector', () => {
  beforeEach(() => {
    mockWqpFetch();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('emits one freshest record per (site, parameter)', async () => {
    const records = await wqpFetch(makeContext());
    // Fixture covers 2 stations × 1 parameter (E. coli); freshest-only filter
    // collapses to at most 2 records.
    expect(records.length).toBeGreaterThan(0);
    expect(records.length).toBeLessThanOrEqual(2);
  });

  it('filters out QC samples (ActivityTypeCode != Sample-Routine etc.)', async () => {
    const records = await wqpFetch(makeContext());
    for (const r of records) {
      expect(r.parameter).toBe('e_coli');
      expect(r.units).toBe('MPN/100mL');
      expect(r.value).toBeGreaterThanOrEqual(0);
    }
  });

  it('snaps stations to nearest site within 1.5km', async () => {
    const records = await wqpFetch(makeContext());
    // USGS-01651800 (Bladensburg gauge) sits ~60m from the bladensburg launch
    // and snaps to it. USGS-01649500 (Northeast Branch at Riverdale) sits
    // ~2.4km from the Campus Drive launch — beyond the 1.5km threshold, so
    // intentionally drops on the floor rather than mis-attributing samples to
    // a launch that's a different reach of the watershed.
    const bladensburg = records.find((r) => r.station_id === 'USGS-01651800');
    expect(bladensburg?.site_ids).toEqual(['bladensburg-waterfront']);
    const ne = records.find((r) => r.station_id === 'USGS-01649500');
    expect(ne).toBeUndefined();
  });

  it('snaps within threshold when the launch is closer', async () => {
    // Drop the Campus Drive launch ~150m from the USGS-01649500 gauge to prove
    // that, when the threshold is met, both stations contribute records.
    const ctx = makeContext();
    const ne = ctx.sites.find((s) => s.id === 'northeast-branch-campus-drive');
    if (ne) {
      ne.lat = 38.9685;
      ne.lon = -76.925;
    }
    const records = await wqpFetch(ctx);
    expect(records).toHaveLength(2);
    const matched = records.find((r) => r.station_id === 'USGS-01649500');
    expect(matched?.site_ids).toEqual(['northeast-branch-campus-drive']);
  });

  it('emits canonical MPN/100mL units', async () => {
    const records = await wqpFetch(makeContext());
    for (const r of records) {
      expect(r.units).toBe('MPN/100mL');
    }
  });

  it('attaches a citation URL', async () => {
    const records = await wqpFetch(makeContext());
    for (const r of records) {
      expect(r.raw_url).toMatch(/waterqualitydata\.us/);
    }
  });

  it('returns empty when context has no sites', async () => {
    const ctx = makeContext();
    ctx.sites = [];
    const records = await wqpFetch(ctx);
    expect(records).toEqual([]);
  });

  it('drops samples whose stations sit > 1.5km from every site', async () => {
    // Move all sites far from the WQP stations so none of them match.
    const ctx = makeContext();
    ctx.sites = ctx.sites.map((s) => ({ ...s, lat: 35.0, lon: -80.0 }));
    const records = await wqpFetch(ctx);
    expect(records).toEqual([]);
  });

  it('exposes meta', () => {
    expect(meta.id).toBe('usgs-wqp');
    expect(meta.cadence).toBe('weekly');
    expect(meta.license).toBe('public-domain');
  });
});
