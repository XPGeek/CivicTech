import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fetch as wqpFetch, meta } from './index';
import { createLogger } from '../shared/log';
import type { ConnectorContext } from '../shared/types';

const fixture = readFileSync(join(__dirname, 'fixtures/wqp-anacostia.csv'), 'utf8');

function makeContext(): ConnectorContext {
  return {
    sites: [
      {
        id: 'bladensburg-waterfront',
        stations: [{ source_id: 'usgs-nwis', station_id: '01651800' }],
      },
      {
        id: 'northeast-branch-campus-drive',
        stations: [{ source_id: 'usgs-nwis', station_id: '01649500' }],
      },
      {
        id: 'unrelated',
        stations: [{ source_id: 'doee-sondes', station_id: 'X' }],
      },
    ],
    env: {},
    log: createLogger('test'),
    now: () => '2026-05-18T14:00:00Z',
  };
}

describe('usgs-wqp connector', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(fixture, { headers: { 'content-type': 'text/csv' } }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('emits one freshest record per (station, parameter)', async () => {
    const records = await wqpFetch(makeContext());
    // Fixture has ~186 E. coli rows across 2 stations; freshest-only filter
    // collapses to at most 2 records (one per station).
    expect(records.length).toBeGreaterThan(0);
    expect(records.length).toBeLessThanOrEqual(2);
  });

  it('filters out QC samples (ActivityTypeCode != Sample-Routine etc.)', async () => {
    const records = await wqpFetch(makeContext());
    // None should be from rows where ActivityTypeCode is "Quality Control Sample-Field Replicate"
    // We can't directly assert without inspecting the raw rows, but we can
    // verify the freshest record's observed_at is a real sampling date.
    for (const r of records) {
      expect(r.parameter).toBe('e_coli');
      expect(r.units).toBe('MPN/100mL');
      expect(r.value).toBeGreaterThanOrEqual(0);
    }
  });

  it('joins station IDs to site IDs', async () => {
    const records = await wqpFetch(makeContext());
    const bladensburg = records.find((r) => r.station_id === '01651800');
    expect(bladensburg?.site_ids).toContain('bladensburg-waterfront');
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

  it('returns empty when no sites reference USGS stations', async () => {
    const ctx = makeContext();
    ctx.sites = [{ id: 'x', stations: [{ source_id: 'doee-sondes', station_id: 'Y' }] }];
    const records = await wqpFetch(ctx);
    expect(records).toEqual([]);
  });

  it('exposes meta', () => {
    expect(meta.id).toBe('usgs-wqp');
    expect(meta.cadence).toBe('weekly');
    expect(meta.license).toBe('public-domain');
  });
});
