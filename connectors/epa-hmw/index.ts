import {
  ConnectorError,
  type ConnectorContext,
  type ConnectorMeta,
  type NormalizedRecord,
} from '../shared/types';
import { httpJson } from '../shared/http';
import { groupStationsBySite } from '../shared/sites';

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
  // For epa-hmw, each "station" is an EPA Assessment Unit identifier.
  const auToSites = groupStationsBySite(context.sites, meta.id);
  if (auToSites.size === 0) {
    context.log.info(
      'No EPA Assessment Units declared in sites.json; chronic impairment badge will be omitted',
      { source_id: meta.id },
    );
    return [];
  }

  // ATTAINS exposes assessments per-AU via the same endpoint. Fan out so the
  // weekly run finishes in seconds instead of minutes.
  const settled = await Promise.allSettled(
    Array.from(auToSites, async ([auId, siteIds]) => {
      const url = `https://attains.epa.gov/attains-public/api/assessments?assessmentUnitIdentifier=${encodeURIComponent(auId)}`;
      context.log.info('Fetching EPA ATTAINS assessment', { source_id: meta.id, au: auId });
      const body = await httpJson<AssessmentsResponse>(url, { source_id: meta.id });
      return { auId, siteIds, body };
    }),
  );

  const records: NormalizedRecord[] = [];
  for (const result of settled) {
    if (result.status === 'rejected') {
      const err = result.reason;
      if (err instanceof ConnectorError && err.recoverable) {
        context.log.warn('ATTAINS unavailable for AU; skipping', {
          source_id: meta.id,
          code: err.code,
        });
        continue;
      }
      throw err;
    }
    const { auId, siteIds, body } = result.value;
    const au = body.items?.[0]?.assessmentUnits?.[0];
    if (!au) {
      context.log.warn('No assessment data returned for AU', { source_id: meta.id, au: auId });
      continue;
    }
    const recreationUse = au.useAttainments?.find((u) =>
      PRIMARY_CONTACT_USE_PATTERNS.some((rx) => rx.test(u.useName ?? '')),
    );
    records.push({
      source_id: meta.id,
      station_id: auId,
      site_ids: siteIds,
      observed_at: context.now(),
      parameter: 'impairment_status',
      value: classifyAttainment(recreationUse?.useAttainmentCode),
      units: 'unitless',
      qc_flag: 'final',
      raw_url: `https://mywaterway.epa.gov/waterbody-report/${encodeURIComponent(body.items?.[0]?.organizationIdentifier ?? '')}/${encodeURIComponent(auId)}`,
    });
  }

  context.log.info('EPA HMW fetch complete', { source_id: meta.id, records: records.length });
  return records;
}
