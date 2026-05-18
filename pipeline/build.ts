/**
 * End-to-end build:
 *   1. Load sites.json
 *   2. Run every connector in parallel (degrading on individual failures)
 *   3. Validate emitted records against the JSON Schema
 *   4. Join records to sites; run the grading rubric per site
 *   5. Emit manifest.json, sites.geojson, grades.json, history/<id>.json, sources.json
 *
 * Outputs are written to data/snapshots/dev/ and mirrored into public/data/ so
 * the Next.js dev server can serve them directly. CI uploads the same artifacts
 * to Cloudflare R2.
 */

import { join } from 'node:path';
import { ALL_CONNECTORS } from './connectors';
import { loadSites, projectForConnectors, type Site } from './sites';
import { validateRecords } from './validate';
import {
  buildSitesGeoJson,
  buildSourcesSummary,
  bucketRecordsBySite,
  appendHistory,
  writeArtifacts,
  type Manifest,
  type HistoryPoint,
} from './output';
import { createLogger } from '../connectors/shared/log';
import { ConnectorError } from '../connectors/shared/types';
import type {
  GradeOutput,
  NormalizedRecord,
  ConnectorContext,
} from '../connectors/shared/types';
import { gradeSite } from '../grading/v1';

interface SourceRunResult {
  id: string;
  name: string;
  cadence: string;
  contact: string;
  records: NormalizedRecord[];
  last_updated: string | null;
  error?: string;
}

export async function runBuild(opts: {
  rootDir: string;
  outputDirs: string[];
  now?: Date;
}): Promise<Manifest> {
  const log = createLogger('build');
  const now = opts.now ?? new Date();
  const buildId =
    process.env.GITHUB_SHA?.slice(0, 7) ??
    process.env.NEXT_PUBLIC_BUILD_ID ??
    now.toISOString().replace(/[:.]/g, '-');

  log.info('Build starting', { buildId, sites_path: 'data/sites.json' });

  const sites = loadSites(opts.rootDir);
  log.info('Sites loaded', { count: sites.length });

  const projected = projectForConnectors(sites);
  const env = process.env as Record<string, string | undefined>;

  // Run all connectors in parallel.
  const results: SourceRunResult[] = await Promise.all(
    ALL_CONNECTORS.map((c) => runOneConnector(c, projected, env, now, log)),
  );

  // Validate every emitted record. Drop invalid ones with a warning.
  const allRecords: NormalizedRecord[] = [];
  for (const result of results) {
    const { valid, invalid } = validateRecords(result.records);
    if (invalid.length > 0) {
      log.warn('Dropping invalid records', {
        source: result.id,
        invalid_count: invalid.length,
        first_issue: invalid[0]?.issues.join('; '),
      });
    }
    result.records = valid;
    allRecords.push(...valid);
  }

  // Join records to sites and grade twice — once per activity. The activity
  // toggle on the frontend swaps which grade is shown without re-running the
  // pipeline. See REQUIREMENTS.md § FR-20.
  const byId = bucketRecordsBySite(allRecords);
  const grades: Record<string, { paddle: GradeOutput; swim: GradeOutput }> = {};
  for (const site of sites) {
    const records = byId[site.id] ?? [];
    grades[site.id] = {
      paddle: gradeSite({ site_id: site.id, records, now, activity: 'paddle' }),
      swim: gradeSite({ site_id: site.id, records, now, activity: 'swim' }),
    };
  }

  log.info('Grading complete', {
    grades_green: Object.values(grades).filter((g) => g.paddle.grade === 'green').length,
    grades_yellow: Object.values(grades).filter((g) => g.paddle.grade === 'yellow').length,
    grades_red: Object.values(grades).filter((g) => g.paddle.grade === 'red').length,
    grades_unknown: Object.values(grades).filter((g) => g.paddle.grade === 'unknown').length,
  });

  // Append to per-site history (using paddle as the canonical activity for the
  // sparkline; swim history is recomputable from the same data on demand).
  // Reads existing history/<id>.json and trims to the last 30 days.
  const histories: Record<string, HistoryPoint[]> = {};
  const primaryOutDir = opts.outputDirs[0] ?? join(opts.rootDir, 'public', 'data');
  for (const site of sites) {
    const grade = grades[site.id]!.paddle;
    histories[site.id] = appendHistory(primaryOutDir, site.id, {
      computed_at: grade.computed_at,
      grade: grade.grade,
      reason: grade.reason,
    });
  }

  const sourcesSummary = buildSourcesSummary(
    results.map((r) => ({
      id: r.id,
      name: r.name,
      cadence: r.cadence,
      contact: r.contact,
      records: r.records.length,
      last_updated: r.last_updated,
      error: r.error,
    })),
  );

  const manifest: Manifest = {
    build_id: String(buildId),
    built_at: now.toISOString(),
    sites: sites.length,
    records: allRecords.length,
    sources: sourcesSummary.map((s) => ({
      id: s.id,
      name: s.name,
      records: s.record_count,
      last_updated: s.last_updated,
      error: s.error,
    })),
  };

  writeArtifacts(opts.outputDirs, {
    sitesGeoJson: buildSitesGeoJson(sites, grades),
    grades,
    manifest,
    sources: sourcesSummary,
    histories,
  });

  log.info('Build complete', {
    buildId,
    sites: sites.length,
    records: allRecords.length,
    out: opts.outputDirs.join(', '),
  });

  return manifest;
}

async function runOneConnector(
  connector: typeof ALL_CONNECTORS[number],
  sites: ReturnType<typeof projectForConnectors>,
  env: Record<string, string | undefined>,
  now: Date,
  log: ReturnType<typeof createLogger>,
): Promise<SourceRunResult> {
  const childLog = createLogger(`build.${connector.meta.id}`);
  const ctx: ConnectorContext = {
    sites,
    env,
    log: childLog,
    now: () => now.toISOString(),
  };

  try {
    const records = await connector.fetch(ctx);
    const last = records.reduce<string | null>((acc, r) => {
      if (!acc) return r.observed_at;
      return Date.parse(r.observed_at) > Date.parse(acc) ? r.observed_at : acc;
    }, null);
    return {
      id: connector.meta.id,
      name: connector.meta.name,
      cadence: connector.meta.cadence,
      contact: connector.meta.contact,
      records,
      last_updated: last,
    };
  } catch (err) {
    const code =
      err instanceof ConnectorError ? `${err.code}` : (err as Error).message ?? 'UNKNOWN';
    log.error('Connector failed; degrading gracefully', {
      source_id: connector.meta.id,
      code,
    });
    return {
      id: connector.meta.id,
      name: connector.meta.name,
      cadence: connector.meta.cadence,
      contact: connector.meta.contact,
      records: [],
      last_updated: null,
      error: code,
    };
  }
}

// CLI entry point — invoked by `npm run pipeline`.
async function main(): Promise<void> {
  const rootDir = process.cwd();
  const outputDirs = [join(rootDir, 'public', 'data'), join(rootDir, 'data', 'snapshots', 'dev')];
  const manifest = await runBuild({ rootDir, outputDirs });
  // eslint-disable-next-line no-console
  console.log(`Built ${manifest.sites} sites, ${manifest.records} records.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
}
