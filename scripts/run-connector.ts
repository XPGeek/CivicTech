/**
 * Run a single connector locally. Outputs the emitted NormalizedRecord array
 * to stdout (compact JSON) plus a summary to stderr.
 *
 *   npm run connector:run -- usgs-nwis
 */

import { findConnector } from '../pipeline/connectors';
import { loadSites, projectForConnectors } from '../pipeline/sites';
import { createLogger } from '../connectors/shared/log';

async function main(): Promise<void> {
  const id = process.argv[2];
  if (!id) {
    process.stderr.write('Usage: tsx scripts/run-connector.ts <connector-id>\n');
    process.exit(2);
  }
  const connector = findConnector(id);
  if (!connector) {
    process.stderr.write(`Unknown connector '${id}'. Known: see pipeline/connectors.ts\n`);
    process.exit(2);
  }
  const sites = loadSites(process.cwd());
  const ctx = {
    sites: projectForConnectors(sites),
    env: process.env as Record<string, string | undefined>,
    log: createLogger(`cli.${id}`),
    now: () => new Date().toISOString(),
  };
  const records = await connector.fetch(ctx);
  process.stdout.write(JSON.stringify(records, null, 2));
  process.stderr.write(`\nEmitted ${records.length} record(s).\n`);
}

void main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
