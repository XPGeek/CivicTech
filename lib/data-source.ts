/**
 * Server-only helpers for loading build artifacts at static-export time.
 *
 * Do NOT import this file from a client component. It uses `node:fs`, which
 * is not bundled into the browser bundle. Client-side fetching is in
 * `lib/client-data.ts`.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type {
  GradesMap,
  HistoryPoint,
  InitialData,
  Manifest,
  SitesGeoJson,
  SourceSummary,
} from './types';

const PUBLIC_DATA = join(process.cwd(), 'public', 'data');

function readJsonOrNull<T>(path: string): T | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T;
  } catch {
    return null;
  }
}

export async function loadInitialData(): Promise<InitialData> {
  const sites =
    readJsonOrNull<SitesGeoJson>(join(PUBLIC_DATA, 'sites.geojson')) ?? {
      type: 'FeatureCollection',
      features: [],
    };
  const grades = readJsonOrNull<GradesMap>(join(PUBLIC_DATA, 'grades.json')) ?? {};
  const manifest = readJsonOrNull<Manifest>(join(PUBLIC_DATA, 'manifest.json'));
  const sources = readJsonOrNull<SourceSummary[]>(join(PUBLIC_DATA, 'sources.json')) ?? [];
  return { sites, grades, manifest, sources };
}

export function loadHistory(siteId: string): HistoryPoint[] {
  return (
    readJsonOrNull<HistoryPoint[]>(join(PUBLIC_DATA, 'history', `${siteId}.json`)) ?? []
  );
}

export function listSiteIds(): string[] {
  const data = readJsonOrNull<SitesGeoJson>(join(PUBLIC_DATA, 'sites.geojson'));
  return data?.features.map((f) => f.properties.id) ?? [];
}
