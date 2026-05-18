/** Validate emitted NormalizedRecords against the JSON schema. */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import type { NormalizedRecord } from '../connectors/shared/types';

const NormalizedRecordSchema = z.object({
  source_id: z.string().regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/),
  station_id: z.string().min(1),
  site_ids: z.array(z.string().regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/)).min(1),
  observed_at: z.string().datetime({ offset: true }),
  parameter: z.enum([
    'e_coli',
    'enterococcus',
    'turbidity',
    'dissolved_oxygen',
    'water_temp',
    'gauge_height',
    'streamflow',
    'precipitation_48h',
    'chlorophyll',
    'pH',
    'impairment_status',
  ]),
  value: z.number().finite(),
  units: z.string().min(1),
  qc_flag: z.enum(['estimated', 'provisional', 'final']).optional(),
  raw_url: z.string().url().optional(),
});

export function validateRecords(records: NormalizedRecord[]): {
  valid: NormalizedRecord[];
  invalid: Array<{ record: NormalizedRecord; issues: string[] }>;
} {
  const valid: NormalizedRecord[] = [];
  const invalid: Array<{ record: NormalizedRecord; issues: string[] }> = [];
  for (const r of records) {
    const result = NormalizedRecordSchema.safeParse(r);
    if (result.success) {
      valid.push(r);
    } else {
      invalid.push({
        record: r,
        issues: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
      });
    }
  }
  return { valid, invalid };
}

/** Sanity check the on-disk schema file is parseable JSON. */
export function loadSchema(rootDir: string): unknown {
  const path = join(rootDir, 'data', 'schema', 'normalized-record.schema.json');
  return JSON.parse(readFileSync(path, 'utf8'));
}
