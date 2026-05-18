/**
 * Validate data/sites.json. Exits non-zero on any issue.
 *
 *   npm run validate:sites
 *
 * Checks:
 *   - Schema (via pipeline/sites.ts zod schema)
 *   - DMV bounding box (NFR-27 geographic scope)
 *   - Station references point at known connector IDs
 *   - No duplicate IDs
 *   - DC sites do not advertise swimming
 *   - Either jurisdiction is DC or `swim` is permitted; else flag
 */

import { loadSites } from '../pipeline/sites';
import { ALL_CONNECTORS } from '../pipeline/connectors';

// NFR-27 geographic scope: DC + Arlington + Alexandria + PG + Montgomery.
// Rough bounding box (latitude/longitude). Sites outside are not necessarily
// invalid — they're out of MVP scope per the requirements.
const BBOX = {
  minLat: 38.65,
  maxLat: 39.35,
  minLon: -77.35,
  maxLon: -76.7,
};

async function main(): Promise<void> {
  let issues = 0;
  const knownSources = new Set(ALL_CONNECTORS.map((c) => c.meta.id));

  let sites;
  try {
    sites = loadSites(process.cwd());
  } catch (err) {
    process.stderr.write(`Failed to parse sites.json: ${(err as Error).message}\n`);
    process.exit(1);
  }

  const seenIds = new Set<string>();
  for (const site of sites) {
    if (seenIds.has(site.id)) {
      report(`duplicate site id '${site.id}'`);
      issues += 1;
    }
    seenIds.add(site.id);

    if (
      site.lat < BBOX.minLat ||
      site.lat > BBOX.maxLat ||
      site.lon < BBOX.minLon ||
      site.lon > BBOX.maxLon
    ) {
      report(
        `${site.id} is outside the inner-DMV bounding box ` +
          `(lat ${site.lat}, lon ${site.lon}); NFR-27 limits scope to DC + Arlington + Alexandria + PG + Montgomery`,
      );
      issues += 1;
    }

    for (const station of site.stations) {
      if (!knownSources.has(station.source_id)) {
        report(
          `${site.id} references unknown source '${station.source_id}'; ` +
            `known: ${[...knownSources].join(', ')}`,
        );
        issues += 1;
      }
    }

    if (site.jurisdiction === 'DC' && site.activity_types.includes('swim')) {
      report(`${site.id} is DC but lists swim — swimming is prohibited in DC waters`);
      issues += 1;
    }

    if (site.stations.length === 0) {
      report(`${site.id} has no station references; grade will always be unknown`);
      // Not an error — warn only.
    }
  }

  process.stderr.write(`\nChecked ${sites.length} site(s).\n`);
  if (issues > 0) {
    process.stderr.write(`${issues} issue(s) found.\n`);
    process.exit(1);
  } else {
    process.stderr.write(`OK.\n`);
  }
}

function report(msg: string): void {
  process.stderr.write(`  ✗ ${msg}\n`);
}

void main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
