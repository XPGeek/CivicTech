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

/**
 * Geographic match for connectors that don't have per-site station bindings.
 * Returns the closest site to (lat, lon) along with its distance in km, or
 * `null` if every site is farther than `maxDistanceKm`.
 *
 * Used by the WQP connector: WQP aggregates samples from MD DEQ, MWCOG, VA DEQ,
 * county labs, etc., none of which use USGS station IDs. We discover monitoring
 * locations within a bbox and snap each one to the nearest paddler launch.
 */
export function nearestSiteWithin(
  lat: number,
  lon: number,
  sites: SiteForConnector[],
  maxDistanceKm: number,
): { site: SiteForConnector; distanceKm: number } | null {
  let best: { site: SiteForConnector; distanceKm: number } | null = null;
  for (const site of sites) {
    const distanceKm = haversineKm(lat, lon, site.lat, site.lon);
    if (distanceKm > maxDistanceKm) continue;
    if (!best || distanceKm < best.distanceKm) {
      best = { site, distanceKm };
    }
  }
  return best;
}

/** Great-circle distance in km between two (lat, lon) points. */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
