import {
  ConnectorError,
  type ConnectorContext,
  type ConnectorMeta,
  type NormalizedRecord,
  type Parameter,
  type QCFlag,
} from '../shared/types';
import { httpJson } from '../shared/http';

export const meta: ConnectorMeta = {
  id: 'usgs-nwis',
  name: 'USGS National Water Information System',
  cadence: 'hourly',
  license: 'public-domain',
  contact: 'https://water.usgs.gov/contact/',
  freshness_threshold_hours: 6,
};

// USGS parameter code → our internal parameter enum + canonical unit.
const USGS_PARAM_MAP: Record<string, { parameter: Parameter; unit: string }> = {
  '00010': { parameter: 'water_temp', unit: '°C' },
  '00060': { parameter: 'streamflow', unit: 'cubic feet per second' },
  '00065': { parameter: 'gauge_height', unit: 'feet' },
  '00300': { parameter: 'dissolved_oxygen', unit: 'mg/L' },
  '63680': { parameter: 'turbidity', unit: 'NTU' },
};

// USGS qualifier letters → our QC flag enum. The full qualifier array is
// passed in (e.g. ['A', 'e']); 'estimated' wins if present because it's the
// more cautious flag and a downstream consumer should know the value was
// derived rather than directly measured.
function mapQualifier(qualifiers: string[] | undefined): QCFlag | undefined {
  if (!qualifiers || qualifiers.length === 0) return undefined;
  const joined = qualifiers.join('');
  if (joined.includes('e')) return 'estimated';
  if (joined.includes('P')) return 'provisional';
  if (joined.includes('A')) return 'final';
  return undefined;
}

interface USGSResponse {
  value: {
    timeSeries: Array<{
      sourceInfo: { siteCode: Array<{ value: string }> };
      variable: {
        variableCode: Array<{ value: string }>;
        unit?: { unitCode: string };
      };
      values: Array<{
        value: Array<{
          value: string;
          qualifiers: string[];
          dateTime: string;
        }>;
      }>;
    }>;
  };
}

export async function fetch(context: ConnectorContext): Promise<NormalizedRecord[]> {
  // Collect every station ID this connector should query, grouped so we can
  // emit one record per (station × parameter × latest observation).
  const stationToSites = new Map<string, string[]>();
  for (const site of context.sites) {
    for (const station of site.stations) {
      if (station.source_id !== meta.id) continue;
      const list = stationToSites.get(station.station_id) ?? [];
      list.push(site.id);
      stationToSites.set(station.station_id, list);
    }
  }

  if (stationToSites.size === 0) {
    context.log.info('No USGS stations referenced in sites.json; skipping', { source_id: meta.id });
    return [];
  }

  const stationIds = Array.from(stationToSites.keys()).join(',');
  const paramCodes = Object.keys(USGS_PARAM_MAP).join(',');
  const url =
    `https://waterservices.usgs.gov/nwis/iv/?format=json` +
    `&sites=${stationIds}&parameterCd=${paramCodes}&siteStatus=active`;

  context.log.info('Fetching USGS NWIS', {
    source_id: meta.id,
    station_count: stationToSites.size,
    url,
  });

  const userAgent = context.env.CONNECTOR_USER_AGENT ?? 'dmv-water-watch';
  const body = await httpJson<USGSResponse>(url, {
    source_id: meta.id,
    headers: { 'User-Agent': userAgent },
  });

  if (!body?.value?.timeSeries) {
    throw new ConnectorError({
      code: 'SHAPE',
      message: 'USGS response missing value.timeSeries',
      recoverable: false,
      source_id: meta.id,
    });
  }

  const records: NormalizedRecord[] = [];
  for (const series of body.value.timeSeries) {
    const stationId = series.sourceInfo?.siteCode?.[0]?.value;
    const usgsCode = series.variable?.variableCode?.[0]?.value;
    if (!stationId || !usgsCode) continue;

    const mapping = USGS_PARAM_MAP[usgsCode];
    if (!mapping) continue;

    const siteIds = stationToSites.get(stationId);
    if (!siteIds || siteIds.length === 0) continue;

    const points = series.values?.[0]?.value ?? [];
    if (points.length === 0) continue;

    // Pick the most recent observation in the series.
    const latest = points.reduce((acc, p) =>
      Date.parse(p.dateTime) > Date.parse(acc.dateTime) ? p : acc,
    );
    const value = Number.parseFloat(latest.value);
    if (!Number.isFinite(value) || value === -999999) continue;

    records.push({
      source_id: meta.id,
      station_id: stationId,
      site_ids: siteIds,
      observed_at: new Date(latest.dateTime).toISOString(),
      parameter: mapping.parameter,
      value,
      units: mapping.unit,
      qc_flag: mapQualifier(latest.qualifiers),
      raw_url: `https://waterdata.usgs.gov/nwis/uv?site_no=${stationId}`,
    });
  }

  context.log.info('USGS NWIS fetch complete', {
    source_id: meta.id,
    records: records.length,
  });

  return records;
}
