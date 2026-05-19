/** Site loading + projection. */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import type { SiteForConnector } from '../connectors/shared/types';

const StationRef = z.object({
  source_id: z.string(),
  station_id: z.string(),
});

const SiteSchema = z.object({
  id: z
    .string()
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, 'site id must be kebab-case'),
  name: z.string().min(1),
  subname: z.string().optional(),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  jurisdiction: z.enum(['DC', 'VA', 'MD-PG', 'MD-MC', 'MD-OTHER']),
  river: z.string(),
  activity_types: z.array(z.enum(['paddle', 'row', 'swim', 'sup'])).min(1),
  launch_type: z.enum([
    'paved-ramp',
    'gravel-ramp',
    'dirt-putin',
    'dock',
    'beach',
    'seawall-ladder',
    'none',
  ]),
  parking: z.enum(['available', 'limited', 'none', 'unknown']),
  fee: z.boolean(),
  stations: z.array(StationRef).min(1),
  notes: z.string().optional(),
  links: z
    .array(
      z.object({
        label: z.string(),
        url: z.string().url(),
      }),
    )
    .optional(),
  verified_at: z.string().nullable().optional(),
  archived: z.boolean().optional(),
});

const SitesFileSchema = z.object({
  _meta: z
    .object({
      schema_version: z.string().optional(),
      last_curated: z.string().optional(),
      note: z.string().optional(),
    })
    .optional(),
  sites: z.array(SiteSchema),
});

export type Site = z.infer<typeof SiteSchema>;

export function loadSites(rootDir: string): Site[] {
  const path = join(rootDir, 'data', 'sites.json');
  const text = readFileSync(path, 'utf8');
  const json = JSON.parse(text) as unknown;
  const parsed = SitesFileSchema.parse(json);
  // DC waters cannot include swim per UX § 6 and ROADMAP risk register.
  for (const site of parsed.sites) {
    if (site.jurisdiction === 'DC' && site.activity_types.includes('swim')) {
      throw new Error(
        `Site '${site.id}' is in DC and includes 'swim' — swimming is prohibited in DC waters.`,
      );
    }
  }
  return parsed.sites.filter((s) => !s.archived);
}

export function projectForConnectors(sites: Site[]): SiteForConnector[] {
  return sites.map((s) => ({
    id: s.id,
    lat: s.lat,
    lon: s.lon,
    stations: s.stations,
  }));
}
