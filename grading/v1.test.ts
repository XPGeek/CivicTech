/**
 * Grading rubric v1 — unit tests.
 *
 * Covers the five worked examples in GRADING.md § 5 and the edge cases
 * documented in § 4. If these tests regress, the user-facing verdicts will
 * shift — anyone changing the rubric should add an ADR per § 8.
 */

import { describe, it, expect } from 'vitest';
import { gradeSite } from './v1';
import type { NormalizedRecord } from '../connectors/shared/types';

const NOW = new Date('2026-05-18T14:00:00Z');

function r(
  partial: Partial<NormalizedRecord> & Pick<NormalizedRecord, 'parameter' | 'value' | 'observed_at'>,
): NormalizedRecord {
  return {
    source_id: partial.source_id ?? 'test-src',
    station_id: partial.station_id ?? 'STN-1',
    site_ids: partial.site_ids ?? ['site-1'],
    observed_at: partial.observed_at,
    parameter: partial.parameter,
    value: partial.value,
    units: partial.units ?? canonicalUnits(partial.parameter),
    qc_flag: partial.qc_flag,
    raw_url: partial.raw_url,
  };
}

function canonicalUnits(p: NormalizedRecord['parameter']): string {
  switch (p) {
    case 'e_coli':
    case 'enterococcus':
      return 'MPN/100mL';
    case 'turbidity':
      return 'NTU';
    case 'dissolved_oxygen':
      return 'mg/L';
    case 'water_temp':
      return '°C';
    case 'gauge_height':
      return 'feet';
    case 'streamflow':
      return 'cubic feet per second';
    case 'precipitation_48h':
      return 'inches';
    case 'chlorophyll':
      return 'µg/L';
    case 'pH':
      return 'unitless';
    case 'impairment_status':
      return 'unitless';
  }
}

function hoursAgo(h: number): string {
  return new Date(NOW.getTime() - h * 3600_000).toISOString();
}

describe('worked examples from GRADING.md § 5', () => {
  it('Example 1 — clean Sunday morning → green', () => {
    const records: NormalizedRecord[] = [
      r({ parameter: 'e_coli', value: 95, observed_at: hoursAgo(72) }),
      r({ parameter: 'precipitation_48h', value: 0.0, observed_at: hoursAgo(1) }),
      r({ parameter: 'turbidity', value: 8, observed_at: hoursAgo(0.2) }),
      r({ parameter: 'dissolved_oxygen', value: 8.1, observed_at: hoursAgo(0.2) }),
    ];
    const result = gradeSite({ site_id: 's', records, now: NOW, activity: 'paddle' });
    expect(result.grade).toBe('green');
    expect(result.reason).toMatch(/Bacteria low/i);
  });

  it('Example 2 — day after thunderstorm → red (rainfall override)', () => {
    const records: NormalizedRecord[] = [
      // Sampled Friday, before Saturday storm
      r({ parameter: 'e_coli', value: 110, observed_at: hoursAgo(48) }),
      // Storm fell overnight, observed 1 hour ago
      r({ parameter: 'precipitation_48h', value: 1.2, observed_at: hoursAgo(1) }),
      r({ parameter: 'turbidity', value: 78, observed_at: hoursAgo(1) }),
    ];
    const result = gradeSite({ site_id: 's', records, now: NOW, activity: 'paddle' });
    expect(result.grade).toBe('red');
    expect(result.reason).toMatch(/1\.2 inches of rain/i);
  });

  it('Example 3 — mild conditions, DO low → yellow', () => {
    const records: NormalizedRecord[] = [
      r({ parameter: 'e_coli', value: 180, observed_at: hoursAgo(24) }),
      r({ parameter: 'precipitation_48h', value: 0.1, observed_at: hoursAgo(1) }),
      r({ parameter: 'dissolved_oxygen', value: 4.2, observed_at: hoursAgo(0.5) }),
    ];
    const result = gradeSite({ site_id: 's', records, now: NOW, activity: 'paddle' });
    expect(result.grade).toBe('yellow');
    expect(result.reason).toMatch(/dissolved oxygen|low/i);
  });

  it('Example 4 — winter, no Riverkeeper sampling → yellow (out of season)', () => {
    const records: NormalizedRecord[] = [
      // Bacteria last sampled in October, > 7 days ago.
      r({ parameter: 'e_coli', value: 50, observed_at: hoursAgo(60 * 24) }),
      r({ parameter: 'precipitation_48h', value: 0.2, observed_at: hoursAgo(1) }),
      r({ parameter: 'turbidity', value: 6, observed_at: hoursAgo(0.25) }),
      r({ parameter: 'dissolved_oxygen', value: 11.4, observed_at: hoursAgo(0.25) }),
    ];
    const result = gradeSite({ site_id: 's', records, now: NOW, activity: 'paddle' });
    expect(result.grade).toBe('yellow');
    expect(result.reason).toMatch(/out of season/i);
  });

  it('Example 5 — total data outage → unknown', () => {
    const result = gradeSite({ site_id: 's', records: [], now: NOW, activity: 'paddle' });
    expect(result.grade).toBe('unknown');
    expect(result.reason).toMatch(/no fresh data/i);
  });
});

describe('edge cases from GRADING.md § 4', () => {
  it('§ 4.1 — rainfall that pre-dates the bacterial sample does NOT override', () => {
    const records: NormalizedRecord[] = [
      // Bacteria sampled 2 hours ago, after the storm.
      r({ parameter: 'e_coli', value: 100, observed_at: hoursAgo(2) }),
      // Rain observation is older — represents an aggregate that ended before the sample.
      r({ parameter: 'precipitation_48h', value: 1.2, observed_at: hoursAgo(6) }),
    ];
    const result = gradeSite({ site_id: 's', records, now: NOW, activity: 'paddle' });
    // Bacteria says pass (100 < 575) and the rainfall doesn't override because
    // the sample is more recent than the rainfall window.
    expect(result.grade).toBe('green');
  });

  it('§ 4.2 — sonde turbidity fail with bacteria pass yields yellow, not red', () => {
    const records: NormalizedRecord[] = [
      r({ parameter: 'e_coli', value: 50, observed_at: hoursAgo(48) }),
      r({ parameter: 'precipitation_48h', value: 0, observed_at: hoursAgo(1) }),
      r({ parameter: 'turbidity', value: 150, observed_at: hoursAgo(0.25) }), // > 100 = fail-level
    ];
    const result = gradeSite({ site_id: 's', records, now: NOW, activity: 'paddle' });
    expect(result.grade).toBe('yellow');
  });

  it('§ 4.2 — DO collapse below 3 mg/L can push pass → red', () => {
    const records: NormalizedRecord[] = [
      r({ parameter: 'e_coli', value: 50, observed_at: hoursAgo(48) }),
      r({ parameter: 'precipitation_48h', value: 0, observed_at: hoursAgo(1) }),
      r({ parameter: 'dissolved_oxygen', value: 2.5, observed_at: hoursAgo(0.25) }),
    ];
    const result = gradeSite({ site_id: 's', records, now: NOW, activity: 'paddle' });
    expect(result.grade).toBe('red');
    expect(result.reason).toMatch(/collapsed/i);
  });

  it('§ 4.5 — chronic impairment shows as a signal but does not change verdict', () => {
    const records: NormalizedRecord[] = [
      r({ parameter: 'e_coli', value: 50, observed_at: hoursAgo(48) }),
      r({ parameter: 'precipitation_48h', value: 0, observed_at: hoursAgo(1) }),
      r({ parameter: 'impairment_status', value: 2, observed_at: hoursAgo(24 * 14) }),
    ];
    const result = gradeSite({ site_id: 's', records, now: NOW, activity: 'paddle' });
    expect(result.grade).toBe('green');
    expect(result.signals.chronic?.value).toBe(2);
  });

  it('§ 4.6 — borderline reading just under threshold is pass', () => {
    const records: NormalizedRecord[] = [
      r({ parameter: 'e_coli', value: 234, observed_at: hoursAgo(24) }),
      r({ parameter: 'precipitation_48h', value: 0, observed_at: hoursAgo(1) }),
    ];
    const swim = gradeSite({ site_id: 's', records, now: NOW, activity: 'swim' });
    expect(swim.grade).toBe('green');
  });

  it('§ 4.6 — borderline reading just over threshold is caution', () => {
    const records: NormalizedRecord[] = [
      r({ parameter: 'e_coli', value: 236, observed_at: hoursAgo(24) }),
      r({ parameter: 'precipitation_48h', value: 0, observed_at: hoursAgo(1) }),
    ];
    const swim = gradeSite({ site_id: 's', records, now: NOW, activity: 'swim' });
    expect(swim.grade).toBe('yellow');
  });
});

describe('activity toggle affects bacterial threshold', () => {
  const records: NormalizedRecord[] = [
    r({ parameter: 'e_coli', value: 400, observed_at: hoursAgo(24) }),
    r({ parameter: 'precipitation_48h', value: 0, observed_at: hoursAgo(1) }),
  ];

  it('paddle threshold (575) lets 400 pass', () => {
    const result = gradeSite({ site_id: 's', records, now: NOW, activity: 'paddle' });
    expect(result.grade).toBe('green');
  });

  it('swim threshold (235) flags 400 as caution (≤ 470 = 2×235)', () => {
    const result = gradeSite({ site_id: 's', records, now: NOW, activity: 'swim' });
    expect(result.grade).toBe('yellow');
  });
});

describe('rainfall caution band (≥0.5, <1.0)', () => {
  it('downgrades a passing site to yellow when rainfall is 0.6"', () => {
    const records: NormalizedRecord[] = [
      r({ parameter: 'e_coli', value: 50, observed_at: hoursAgo(72) }),
      r({ parameter: 'precipitation_48h', value: 0.6, observed_at: hoursAgo(1) }),
    ];
    const result = gradeSite({ site_id: 's', records, now: NOW, activity: 'paddle' });
    expect(result.grade).toBe('yellow');
    expect(result.reason).toMatch(/0\.6 inches/i);
  });
});

describe('signal freshness windows', () => {
  it('bacteria older than 7 days is marked stale', () => {
    const records: NormalizedRecord[] = [
      r({ parameter: 'e_coli', value: 50, observed_at: hoursAgo(8 * 24) }),
      r({ parameter: 'precipitation_48h', value: 0, observed_at: hoursAgo(1) }),
    ];
    const result = gradeSite({ site_id: 's', records, now: NOW, activity: 'paddle' });
    expect(result.signals.bacteria?.status).toBe('stale');
  });

  it('bacteria 8-30 days old still drives a stale grade (not unknown)', () => {
    // 14-day-old E. coli at 50 MPN — well under paddle threshold (575) and
    // 30-day grace window. Should emit a green grade flagged stale, not gray.
    const records: NormalizedRecord[] = [
      r({ parameter: 'e_coli', value: 50, observed_at: hoursAgo(14 * 24) }),
    ];
    const result = gradeSite({ site_id: 's', records, now: NOW, activity: 'paddle' });
    expect(result.grade).toBe('green');
    expect(result.stale).toBe(true);
    expect(result.reason).toMatch(/14 days ago/);
  });

  it('stale bacteria over the threshold yields a stale red grade', () => {
    const records: NormalizedRecord[] = [
      r({ parameter: 'e_coli', value: 2000, observed_at: hoursAgo(20 * 24) }),
    ];
    const result = gradeSite({ site_id: 's', records, now: NOW, activity: 'paddle' });
    expect(result.grade).toBe('red');
    expect(result.stale).toBe(true);
  });

  it('bacteria older than 90 days falls back to unknown', () => {
    const records: NormalizedRecord[] = [
      r({ parameter: 'e_coli', value: 50, observed_at: hoursAgo(120 * 24) }),
    ];
    const result = gradeSite({ site_id: 's', records, now: NOW, activity: 'paddle' });
    expect(result.grade).toBe('unknown');
    expect(result.stale).toBeFalsy();
  });

  it('fresh bacteria still drives a non-stale grade', () => {
    const records: NormalizedRecord[] = [
      r({ parameter: 'e_coli', value: 50, observed_at: hoursAgo(48) }),
    ];
    const result = gradeSite({ site_id: 's', records, now: NOW, activity: 'paddle' });
    expect(result.grade).toBe('green');
    expect(result.stale).toBeFalsy();
  });

  it('sonde older than 4 hours is excluded from sanity check', () => {
    const records: NormalizedRecord[] = [
      r({ parameter: 'e_coli', value: 50, observed_at: hoursAgo(48) }),
      r({ parameter: 'precipitation_48h', value: 0, observed_at: hoursAgo(1) }),
      // 6h old — outside sonde freshness window
      r({ parameter: 'dissolved_oxygen', value: 2.0, observed_at: hoursAgo(6) }),
    ];
    const result = gradeSite({ site_id: 's', records, now: NOW, activity: 'paddle' });
    // Stale sonde should be ignored; the would-be DO collapse should not push to red.
    expect(result.grade).toBe('green');
  });
});

describe('multi-station freshest-wins rule (§ 4.4)', () => {
  it('uses the freshest bacterial reading across stations', () => {
    const records: NormalizedRecord[] = [
      // Older station
      r({
        parameter: 'e_coli',
        value: 800,
        observed_at: hoursAgo(48),
        station_id: 'STN-A',
      }),
      // Newer station — should win
      r({
        parameter: 'e_coli',
        value: 50,
        observed_at: hoursAgo(12),
        station_id: 'STN-B',
      }),
      r({ parameter: 'precipitation_48h', value: 0, observed_at: hoursAgo(1) }),
    ];
    const result = gradeSite({ site_id: 's', records, now: NOW, activity: 'paddle' });
    expect(result.signals.bacteria?.value).toBe(50);
    expect(result.grade).toBe('green');
  });
});
