/** Emit build artifacts to data/snapshots/<env>/ (and mirror into public/data/). */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { GradeOutput, NormalizedRecord } from '../connectors/shared/types';
import type { Site } from './sites';

export interface Manifest {
  build_id: string;
  built_at: string;
  sites: number;
  records: number;
  sources: Array<{
    id: string;
    name: string;
    records: number;
    last_updated: string | null;
    error?: string;
  }>;
}

export interface SourceSummary {
  id: string;
  name: string;
  last_updated: string | null;
  record_count: number;
  cadence: string;
  contact: string;
  error?: string;
}

export interface BuildArtifacts {
  sitesGeoJson: unknown;
  grades: Record<string, { paddle: GradeOutput; swim: GradeOutput }>;
  manifest: Manifest;
  sources: SourceSummary[];
  histories: Record<string, HistoryPoint[]>;
}

export interface HistoryPoint {
  computed_at: string;
  grade: GradeOutput['grade'];
  /** One-letter reason shorthand for the sparkline tooltip. */
  reason: string;
}

const HISTORY_DAYS = 30;

/** Build the GeoJSON FeatureCollection for the map pin layer. */
export function buildSitesGeoJson(
  sites: Site[],
  grades: Record<string, { paddle: GradeOutput; swim: GradeOutput }>,
): unknown {
  return {
    type: 'FeatureCollection',
    features: sites.map((s) => {
      const pair = grades[s.id];
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [s.lon, s.lat],
        },
        properties: {
          id: s.id,
          name: s.name,
          subname: s.subname ?? null,
          jurisdiction: s.jurisdiction,
          river: s.river,
          activity_types: s.activity_types,
          launch_type: s.launch_type,
          parking: s.parking,
          fee: s.fee,
          grade_paddle: pair?.paddle.grade ?? 'unknown',
          grade_swim: pair?.swim.grade ?? 'unknown',
          reason_paddle: pair?.paddle.reason ?? null,
          reason_swim: pair?.swim.reason ?? null,
          notes: s.notes ?? null,
        },
      };
    }),
  };
}

export function buildSourcesSummary(
  meta: Array<{
    id: string;
    name: string;
    cadence: string;
    contact: string;
    records: number;
    last_updated: string | null;
    error?: string;
  }>,
): SourceSummary[] {
  return meta.map((m) => ({
    id: m.id,
    name: m.name,
    last_updated: m.last_updated,
    record_count: m.records,
    cadence: m.cadence,
    contact: m.contact,
    error: m.error,
  }));
}

export function appendHistory(
  outDir: string,
  siteId: string,
  point: HistoryPoint,
): HistoryPoint[] {
  const path = historyPath(outDir, siteId);
  let series: HistoryPoint[] = [];
  if (existsSync(path)) {
    try {
      series = JSON.parse(readFileSync(path, 'utf8')) as HistoryPoint[];
    } catch {
      series = [];
    }
  }
  series.push(point);
  // Trim to last HISTORY_DAYS days.
  const cutoff = Date.now() - HISTORY_DAYS * 24 * 3600_000;
  series = series.filter((p) => Date.parse(p.computed_at) >= cutoff);
  return series;
}

function historyPath(outDir: string, siteId: string): string {
  return join(outDir, 'history', `${siteId}.json`);
}

/** Write all build artifacts to disk. Mirrors into multiple targets if requested. */
export function writeArtifacts(
  targets: string[],
  artifacts: BuildArtifacts,
): void {
  for (const dir of targets) {
    writeJson(join(dir, 'manifest.json'), artifacts.manifest);
    writeJson(join(dir, 'sites.geojson'), artifacts.sitesGeoJson);
    writeJson(join(dir, 'grades.json'), artifacts.grades);
    writeJson(join(dir, 'sources.json'), artifacts.sources);
    for (const [siteId, history] of Object.entries(artifacts.histories)) {
      writeJson(join(dir, 'history', `${siteId}.json`), history);
    }
  }
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

/** Compact in-memory record buffer keyed by site for diagnostic snapshots. */
export function bucketRecordsBySite(
  records: NormalizedRecord[],
): Record<string, NormalizedRecord[]> {
  const byId: Record<string, NormalizedRecord[]> = {};
  for (const r of records) {
    for (const siteId of r.site_ids) {
      (byId[siteId] ??= []).push(r);
    }
  }
  return byId;
}
