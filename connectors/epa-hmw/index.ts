import {
  ConnectorError,
  type ConnectorContext,
  type ConnectorMeta,
  type NormalizedRecord,
} from '../shared/types';
import { httpJson } from '../shared/http';

export const meta: ConnectorMeta = {
  id: 'epa-hmw',
  name: "EPA How's My Waterway / ATTAINS",
  cadence: 'weekly',
  license: 'public-domain',
  contact: 'https://www.epa.gov/waterdata',
  freshness_threshold_hours: 24 * 30,
};

/**
 * Encoded impairment status (canonical: see ADR-0003).
 *   0 — unimpaired / Good
 *   1 — partial / "Not assessed" / category 3
 *   2 — impaired for primary contact recreation
 */
export type ImpairmentValue = 0 | 1 | 2;

interface AssessmentsResponse {
  items?: Array<{
    organizationIdentifier?: string;
    organizationName?: string;
    assessmentUnits?: Array<{
      assessmentUnitIdentifier?: string;
      assessmentUnitName?: string;
      useAttainments?: Array<{
        useName?: string;
        useAttainmentCode?: string;
      }>;
    }>;
  }>;
}

/**
 * Classify ATTAINS use-attainment codes for primary contact recreation.
 *   "X" / "I" / "N" → impaired (value 2)
 *   "F"             → fully supporting (value 0)
 *   anything else   → partial/unassessed (value 1)
 */
function classifyAttainment(code: string | undefined): ImpairmentValue {
  if (!code) return 1;
  if (code === 'F') return 0;
  if (['X', 'I', 'N'].includes(code)) return 2;
  return 1;
}

const PRIMARY_CONTACT_USE_PATTERNS = [
  /primary contact recreation/i,
  /recreation in and on the water/i,
  /swimming/i,
];

export async function fetch(context: ConnectorContext): Promise<NormalizedRecord[]> {
  // Each site can declare an epa-hmw "station" whose `station_id` is the
  // Assessment Unit identifier. Build the unique set.
  const auToSites = new Map<string, string[]>();
  for (const site of context.sites) {
    for (const station of site.stations) {
      if (station.source_id !== meta.id) continue;
      const list = auToSites.get(station.station_id) ?? [];
      list.push(site.id);
      auToSites.set(station.station_id, list);
    }
  }

  if (auToSites.size === 0) {
    context.log.info(
      'No EPA Assessment Units declared in sites.json; chronic impairment badge will be omitted',
      { source_id: meta.id },
    );
    return [];
  }

  const records: NormalizedRecord[] = [];

  // ATTAINS exposes assessments per-AU via the same endpoint. We make one
  // request per AU to keep the response payload small.
  for (const [auId, siteIds] of auToSites) {
    const url = `https://attains.epa.gov/attains-public/api/assessments?assessmentUnitIdentifier=${encodeURIComponent(auId)}`;
    context.log.info('Fetching EPA ATTAINS assessment', { source_id: meta.id, au: auId });

    let body: AssessmentsResponse;
    try {
      body = await httpJson<AssessmentsResponse>(url, { source_id: meta.id });
    } catch (err) {
      if (err instanceof ConnectorError && err.recoverable) {
        context.log.warn('ATTAINS unavailable for AU; skipping', {
          source_id: meta.id,
          au: auId,
          code: err.code,
        });
        continue;
      }
      throw err;
    }

    const au = body.items?.[0]?.assessmentUnits?.[0];
    if (!au) {
      context.log.warn('No assessment data returned for AU', { source_id: meta.id, au: auId });
      continue;
    }

    const recreationUse = au.useAttainments?.find((u) =>
      PRIMARY_CONTACT_USE_PATTERNS.some((rx) => rx.test(u.useName ?? '')),
    );
    const value = classifyAttainment(recreationUse?.useAttainmentCode);

    records.push({
      source_id: meta.id,
      station_id: auId,
      site_ids: siteIds,
      observed_at: context.now(),
      parameter: 'impairment_status',
      value,
      units: 'unitless',
      qc_flag: 'final',
      raw_url: `https://mywaterway.epa.gov/waterbody-report/${encodeURIComponent(body.items?.[0]?.organizationIdentifier ?? '')}/${encodeURIComponent(auId)}`,
    });
  }

  context.log.info('EPA HMW fetch complete', { source_id: meta.id, records: records.length });
  return records;
}
