/**
 * Frontend-facing types. These mirror the shapes written by `pipeline/`.
 *
 * The connector / grading types live in `connectors/shared/types.ts` and
 * `grading/v1.ts`; this file re-exports just what the UI needs.
 */

import type { Grade, GradeOutput, SignalState } from '../connectors/shared/types';

export type { Grade, GradeOutput, SignalState };

export type Activity = 'paddle' | 'swim';

export interface SitePinProperties {
  id: string;
  name: string;
  subname: string | null;
  jurisdiction: 'DC' | 'VA' | 'MD-PG' | 'MD-MC' | 'MD-OTHER';
  river: string;
  activity_types: Array<'paddle' | 'row' | 'swim' | 'sup'>;
  launch_type: string;
  parking: 'available' | 'limited' | 'none' | 'unknown';
  fee: boolean;
  grade_paddle: Grade;
  grade_swim: Grade;
  /** True when the bacteria signal is past the 7-day freshness window. The
   *  grade is the threshold-based verdict from the last known sample. */
  stale_paddle: boolean;
  stale_swim: boolean;
  reason_paddle: string | null;
  reason_swim: string | null;
  notes: string | null;
}

export interface SitesGeoJson {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: { type: 'Point'; coordinates: [number, number] };
    properties: SitePinProperties;
  }>;
}

export interface GradesPair {
  paddle: GradeOutput;
  swim: GradeOutput;
}

export type GradesMap = Record<string, GradesPair>;

export interface SourceSummary {
  id: string;
  name: string;
  last_updated: string | null;
  record_count: number;
  cadence: string;
  contact: string;
  error?: string;
}

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

export interface HistoryPoint {
  computed_at: string;
  grade: Grade;
  reason: string;
}

export interface InitialData {
  sites: SitesGeoJson;
  grades: GradesMap;
  manifest: Manifest | null;
  sources: SourceSummary[];
}
