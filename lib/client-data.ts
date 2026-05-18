/**
 * Client-side data loader. Fetches build artifacts from the configured source
 * (either /data/ in dev or a remote R2 base URL in production) and is safe to
 * call from a `'use client'` component.
 */

'use client';

import type {
  GradesMap,
  HistoryPoint,
  Manifest,
  SitesGeoJson,
  SourceSummary,
} from './types';

const REMOTE = process.env.NEXT_PUBLIC_R2_BASE_URL;
const SOURCE = process.env.NEXT_PUBLIC_DATA_SOURCE ?? 'local';

function base(): string {
  if (SOURCE === 'remote' && REMOTE) return REMOTE.replace(/\/$/, '');
  return '/data';
}

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${base()}${path}`);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchSites(): Promise<SitesGeoJson | null> {
  return getJson<SitesGeoJson>('/sites.geojson');
}

export async function fetchGrades(): Promise<GradesMap | null> {
  return getJson<GradesMap>('/grades.json');
}

export async function fetchManifest(): Promise<Manifest | null> {
  return getJson<Manifest>('/manifest.json');
}

export async function fetchSources(): Promise<SourceSummary[] | null> {
  return getJson<SourceSummary[]>('/sources.json');
}

export async function fetchHistory(siteId: string): Promise<HistoryPoint[] | null> {
  return getJson<HistoryPoint[]>(`/history/${siteId}.json`);
}
