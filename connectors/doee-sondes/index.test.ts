import { describe, it, expect } from 'vitest';
import { fetch as doeeFetch, meta } from './index';
import { createLogger } from '../shared/log';
import type { ConnectorContext } from '../shared/types';

function makeContext(stationIds: string[]): ConnectorContext {
  return {
    sites: stationIds.map((sid, i) => ({
      id: `site-${i}`,
      stations: [{ source_id: 'doee-sondes', station_id: sid }],
    })),
    env: {},
    log: createLogger('test'),
    now: () => '2026-05-18T14:00:00Z',
  };
}

describe('doee-sondes connector (fixture-backed)', () => {
  it('emits all five sonde parameters for declared stations', async () => {
    const records = await doeeFetch(makeContext(['ANA-LOWER-1']));
    const params = records.map((r) => r.parameter).sort();
    expect(params).toEqual(['chlorophyll', 'dissolved_oxygen', 'pH', 'turbidity', 'water_temp']);
  });

  it('respects canonical units', async () => {
    const records = await doeeFetch(makeContext(['POT-UPPER-1']));
    const do_ = records.find((r) => r.parameter === 'dissolved_oxygen');
    const turb = records.find((r) => r.parameter === 'turbidity');
    expect(do_?.units).toBe('mg/L');
    expect(turb?.units).toBe('NTU');
  });

  it('marks every reading as fresh relative to context.now()', async () => {
    const records = await doeeFetch(makeContext(['ANA-MID-1']));
    const ageMs = records.map(
      (r) => new Date('2026-05-18T14:00:00Z').getTime() - Date.parse(r.observed_at),
    );
    // All fixture readings should be < 1 hour old.
    for (const age of ageMs) {
      expect(age).toBeLessThan(3600_000);
      expect(age).toBeGreaterThanOrEqual(0);
    }
  });

  it('emits provisional QC flag', async () => {
    const records = await doeeFetch(makeContext(['ANA-LOWER-1']));
    for (const r of records) {
      expect(r.qc_flag).toBe('provisional');
    }
  });

  it('exposes meta', () => {
    expect(meta.id).toBe('doee-sondes');
    expect(meta.cadence).toBe('hourly');
  });
});
