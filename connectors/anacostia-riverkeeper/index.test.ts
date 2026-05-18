import { describe, it, expect } from 'vitest';
import { fetch as arkFetch, meta } from './index';
import { createLogger } from '../shared/log';
import type { ConnectorContext } from '../shared/types';

function makeContext(stationIds: string[]): ConnectorContext {
  return {
    sites: stationIds.map((sid, i) => ({
      id: `site-${i}`,
      stations: [{ source_id: 'anacostia-riverkeeper', station_id: sid }],
    })),
    env: {},
    log: createLogger('test'),
    now: () => '2026-05-18T14:00:00Z',
  };
}

describe('anacostia-riverkeeper connector (fixture-backed)', () => {
  it('emits four parameters per declared station', async () => {
    const records = await arkFetch(makeContext(['TODO-ARK-BUZZARD']));
    const params = records.map((r) => r.parameter).sort();
    expect(params).toEqual(['e_coli', 'pH', 'turbidity', 'water_temp']);
  });

  it('picks the most recent reading per station', async () => {
    const records = await arkFetch(makeContext(['TODO-ARK-BUZZARD']));
    const ecoli = records.find((r) => r.parameter === 'e_coli');
    // Latest fixture row has e_coli_mpn=95 dated 2026-05-15
    expect(ecoli?.value).toBe(95);
    expect(ecoli?.observed_at).toBe('2026-05-15T13:30:00.000Z');
  });

  it('emits canonical MPN/100mL units for E. coli', async () => {
    const records = await arkFetch(makeContext(['TODO-ARK-BUZZARD']));
    const ecoli = records.find((r) => r.parameter === 'e_coli');
    expect(ecoli?.units).toBe('MPN/100mL');
  });

  it('joins multiple sites that share a station', async () => {
    const ctx: ConnectorContext = {
      ...makeContext([]),
      sites: [
        {
          id: 'site-a',
          stations: [{ source_id: 'anacostia-riverkeeper', station_id: 'TODO-ARK-BUZZARD' }],
        },
        {
          id: 'site-b',
          stations: [{ source_id: 'anacostia-riverkeeper', station_id: 'TODO-ARK-BUZZARD' }],
        },
      ],
    };
    const records = await arkFetch(ctx);
    const ecoli = records.find((r) => r.parameter === 'e_coli');
    expect(ecoli?.site_ids).toEqual(expect.arrayContaining(['site-a', 'site-b']));
  });

  it('skips stations not present in the fixture', async () => {
    const records = await arkFetch(makeContext(['TODO-ARK-NONEXISTENT']));
    expect(records).toEqual([]);
  });

  it('exposes meta', () => {
    expect(meta.id).toBe('anacostia-riverkeeper');
    expect(meta.cadence).toBe('6-hourly');
  });
});
