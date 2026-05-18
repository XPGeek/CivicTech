import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fetch as epaFetch, meta } from './index';
import { createLogger } from '../shared/log';
import type { ConnectorContext } from '../shared/types';

const fixture = JSON.parse(
  readFileSync(join(__dirname, 'fixtures/attains-anacostia.json'), 'utf8'),
);

function makeContext(): ConnectorContext {
  return {
    sites: [
      {
        id: 'buzzard-point',
        stations: [{ source_id: 'epa-hmw', station_id: 'DCANA00E_00' }],
      },
    ],
    env: {},
    log: createLogger('test'),
    now: () => '2026-05-18T14:00:00Z',
  };
}

describe('epa-hmw connector', () => {
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

  it('emits an impairment_status record for the configured AU', async () => {
    const records = await epaFetch(makeContext());
    expect(records).toHaveLength(1);
    expect(records[0]?.parameter).toBe('impairment_status');
    expect(records[0]?.units).toBe('unitless');
  });

  it('encodes "X" (impaired) for primary contact recreation as value 2', async () => {
    const records = await epaFetch(makeContext());
    expect(records[0]?.value).toBe(2);
  });

  it('links to the How\'s My Waterway report', async () => {
    const records = await epaFetch(makeContext());
    expect(records[0]?.raw_url).toContain('mywaterway.epa.gov');
    expect(records[0]?.raw_url).toContain('DCANA00E_00');
  });

  it('returns empty when no sites declare an AU', async () => {
    const ctx = makeContext();
    ctx.sites = [];
    const records = await epaFetch(ctx);
    expect(records).toEqual([]);
  });

  it('exposes meta', () => {
    expect(meta.id).toBe('epa-hmw');
    expect(meta.cadence).toBe('weekly');
  });
});
