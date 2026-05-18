import type { SiteForConnector } from './types';

/**
 * Build a station-id → site-ids map for one connector. Every connector starts
 * its `fetch()` with this projection so it knows which stations to query and
 * which site IDs each station belongs to.
 */
export function groupStationsBySite(
  sites: SiteForConnector[],
  sourceId: string,
): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const site of sites) {
    for (const station of site.stations) {
      if (station.source_id !== sourceId) continue;
      const list = out.get(station.station_id) ?? [];
      list.push(site.id);
      out.set(station.station_id, list);
    }
  }
  return out;
}
