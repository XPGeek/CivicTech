import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fetch as usgsFetch, meta } from './index';
import { createLogger } from '../shared/log';
import type { ConnectorContext } from '../shared/types';

const fixture = JSON.parse(
  readFileSync(join(__dirname, 'fixtures/iv-response.json'), 'utf8'),
);

function makeContext(): ConnectorContext {
  return {
    sites: [
      {
        id: 'fletcher-cove',
        stations: [{ source_id: 'usgs-nwis', station_id: '01646500' }],
      },
      {
        id: 'thompson-boat-center',
        stations: [{ source_id: 'usgs-nwis', station_id: '01646500' }],
      },
      {
        id: 'bladensburg-waterfront',
        stations: [{ source_id: 'usgs-nwis', station_id: '01651800' }],
      },
      {
        id: 'not-relevant',
        stations: [{ source_id: 'doee-sondes', station_id: 'DOEE-X' }],
      },
    ],
    env: {},
    log: createLogger('test'),
    now: () => '2026-05-18T14:00:00Z',
  };
}

describe('usgs-nwis connector', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(fixture), {
        headers: { 'content-type': 'application/json' },
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('emits normalized records for each parameter present', async () => {
    const records = await usgsFetch(makeContext());
    // 5 valid records: streamflow, water_temp, gauge_height (Potomac);
    // turbidity, DO (Anacostia). One sentinel -999999 is filtered.
    expect(records).toHaveLength(5);
  });

  it('maps USGS parameter codes to our enum', async () => {
    const records = await usgsFetch(makeContext());
    const params = records.map((r) => r.parameter).sort();
    expect(params).toEqual([
      'dissolved_oxygen',
      'gauge_height',
      'streamflow',
      'turbidity',
      'water_temp',
    ]);
  });

  it('joins station IDs to multiple site IDs', async () => {
    const records = await usgsFetch(makeContext());
    const potomac = records.find((r) => r.parameter === 'streamflow');
    expect(potomac?.site_ids).toEqual(
      expect.arrayContaining(['fletcher-cove', 'thompson-boat-center']),
    );
  });

  it('picks the most recent observation in a series', async () => {
    const records = await usgsFetch(makeContext());
    const streamflow = records.find((r) => r.parameter === 'streamflow');
    // Fixture has three points: 09:30, 09:45, 10:00. The latest is 2810.
    expect(streamflow?.value).toBe(2810);
    expect(streamflow?.observed_at).toBe('2026-05-18T14:00:00.000Z');
  });

  it('maps qualifier letters to QC flags', async () => {
    const records = await usgsFetch(makeContext());
    const turbidity = records.find((r) => r.parameter === 'turbidity');
    expect(turbidity?.qc_flag).toBe('estimated'); // qualifier ['A', 'e']
  });

  it('emits canonical units', async () => {
    const records = await usgsFetch(makeContext());
    for (const r of records) {
      if (r.parameter === 'water_temp') expect(r.units).toBe('°C');
      if (r.parameter === 'streamflow') expect(r.units).toBe('cubic feet per second');
      if (r.parameter === 'gauge_height') expect(r.units).toBe('feet');
      if (r.parameter === 'turbidity') expect(r.units).toBe('NTU');
      if (r.parameter === 'dissolved_oxygen') expect(r.units).toBe('mg/L');
    }
  });

  it('attaches a citation URL to every record', async () => {
    const records = await usgsFetch(makeContext());
    for (const r of records) {
      expect(r.raw_url).toMatch(/waterdata\.usgs\.gov/);
      expect(r.raw_url).toContain(r.station_id);
    }
  });

  it('returns empty when no sites reference this source', async () => {
    const ctx = makeContext();
    ctx.sites = [
      { id: 'no-usgs', stations: [{ source_id: 'doee-sondes', station_id: 'X' }] },
    ];
    const records = await usgsFetch(ctx);
    expect(records).toEqual([]);
  });

  it('exposes connector meta', () => {
    expect(meta.id).toBe('usgs-nwis');
    expect(meta.cadence).toBe('hourly');
    expect(meta.license).toBe('public-domain');
  });
});
