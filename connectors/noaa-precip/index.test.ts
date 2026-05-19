import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fetch as noaaFetch, sumPrecipitationMm, meta } from './index';
import { mm_to_inches } from '../shared/units';
import { createLogger } from '../shared/log';
import type { ConnectorContext } from '../shared/types';

const fixture = JSON.parse(
  readFileSync(join(__dirname, 'fixtures/kdca-48h.json'), 'utf8'),
);

function makeContext(): ConnectorContext {
  return {
    sites: [
      {
        id: 'buzzard-point',
        lat: 0,
        lon: 0,
        stations: [{ source_id: 'noaa-precip', station_id: 'KDCA' }],
      },
      {
        id: 'fletcher-cove',
        lat: 0,
        lon: 0,
        stations: [{ source_id: 'noaa-precip', station_id: 'KDCA' }],
      },
      {
        id: 'unrelated',
        lat: 0,
        lon: 0,
        stations: [{ source_id: 'usgs-nwis', station_id: '01646500' }],
      },
    ],
    env: {},
    log: createLogger('test'),
    now: () => '2026-05-18T14:00:00Z',
  };
}

describe('sumPrecipitationMm', () => {
  it('sums hourly precipitation across the window without double-counting', () => {
    const result = sumPrecipitationMm(
      fixture.features,
      new Date('2026-05-16T14:00:00Z'),
      new Date('2026-05-18T14:00:00Z'),
    );
    // Hourly values: 0 + 0 + 5.3 + 7.1 + 2.2 + 0 + 0 + 0 + 0 = 14.6 mm
    expect(result.totalMm).toBeCloseTo(14.6, 5);
    expect(result.observationCount).toBe(9);
    expect(result.missingFraction).toBeLessThan(0.25);
  });

  it('returns zero with high missing fraction when no observations', () => {
    const result = sumPrecipitationMm(
      [],
      new Date('2026-05-16T14:00:00Z'),
      new Date('2026-05-18T14:00:00Z'),
    );
    expect(result.totalMm).toBe(0);
    expect(result.observationCount).toBe(0);
    expect(result.missingFraction).toBe(1);
  });

  it('falls back from 1h to 3h to 6h when finer windows are null', () => {
    const features = [
      {
        properties: {
          timestamp: '2026-05-17T00:00:00Z',
          precipitationLastHour: { value: null },
          precipitationLast3Hours: { value: null },
          precipitationLast6Hours: { value: 12 },
        },
      },
    ];
    const result = sumPrecipitationMm(
      features as never,
      new Date('2026-05-16T14:00:00Z'),
      new Date('2026-05-18T14:00:00Z'),
    );
    expect(result.totalMm).toBe(12);
    expect(result.observationCount).toBe(1);
  });
});

describe('noaa-precip connector', () => {
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

  it('emits one record per NOAA station referenced by sites', async () => {
    const records = await noaaFetch(makeContext());
    expect(records).toHaveLength(1);
    expect(records[0]?.station_id).toBe('KDCA');
    expect(records[0]?.parameter).toBe('precipitation_48h');
    expect(records[0]?.units).toBe('inches');
  });

  it('converts mm to inches', async () => {
    const records = await noaaFetch(makeContext());
    expect(records[0]?.value).toBeCloseTo(mm_to_inches(14.6), 4);
  });

  it('joins station to multiple sites', async () => {
    const records = await noaaFetch(makeContext());
    expect(records[0]?.site_ids).toEqual(
      expect.arrayContaining(['buzzard-point', 'fletcher-cove']),
    );
  });

  it('exposes meta', () => {
    expect(meta.id).toBe('noaa-precip');
    expect(meta.cadence).toBe('hourly');
  });
});
