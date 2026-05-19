import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fetch as tidesFetch, meta } from './index';
import { createLogger } from '../shared/log';
import type { ConnectorContext } from '../shared/types';

const fixture = JSON.parse(
  readFileSync(join(__dirname, 'fixtures/coops-washington.json'), 'utf8'),
);

function makeContext(): ConnectorContext {
  return {
    sites: [
      {
        id: 'hains-point',
        stations: [{ source_id: 'noaa-tides', station_id: '8594900' }],
      },
      {
        id: 'the-wharf-dc',
        stations: [{ source_id: 'noaa-tides', station_id: '8594900' }],
      },
      {
        id: 'unrelated',
        stations: [{ source_id: 'usgs-nwis', station_id: 'X' }],
      },
    ],
    env: {},
    log: createLogger('test'),
    now: () => '2026-05-18T20:00:00Z',
  };
}

describe('noaa-tides connector', () => {
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

  it('emits a single gauge_height record per station', async () => {
    const records = await tidesFetch(makeContext());
    expect(records).toHaveLength(1);
    expect(records[0]?.parameter).toBe('gauge_height');
    expect(records[0]?.units).toBe('feet');
  });

  it('parses the value as a number', async () => {
    const records = await tidesFetch(makeContext());
    expect(records[0]?.value).toBeCloseTo(0.297, 3);
  });

  it('joins the station to multiple sites that share it', async () => {
    const records = await tidesFetch(makeContext());
    expect(records[0]?.site_ids).toEqual(
      expect.arrayContaining(['hains-point', 'the-wharf-dc']),
    );
  });

  it('maps q="p" to provisional QC flag', async () => {
    const records = await tidesFetch(makeContext());
    expect(records[0]?.qc_flag).toBe('provisional');
  });

  it('returns empty when no sites declare a tide station', async () => {
    const ctx = makeContext();
    ctx.sites = [{ id: 'x', stations: [{ source_id: 'usgs-nwis', station_id: '1' }] }];
    const records = await tidesFetch(ctx);
    expect(records).toEqual([]);
  });

  it('exposes meta', () => {
    expect(meta.id).toBe('noaa-tides');
    expect(meta.cadence).toBe('hourly');
  });
});
