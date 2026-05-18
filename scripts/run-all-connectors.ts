/**
 * Convenience: run the full build pipeline. Equivalent to `npm run pipeline`.
 */

import { join } from 'node:path';
import { runBuild } from '../pipeline/build';

async function main(): Promise<void> {
  const rootDir = process.cwd();
  await runBuild({
    rootDir,
    outputDirs: [join(rootDir, 'public', 'data'), join(rootDir, 'data', 'snapshots', 'dev')],
  });
}

void main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
