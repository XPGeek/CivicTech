import Header from '../components/Header';
import { loadInitialData } from '@lib/data-source';
import { formatFreshness } from '@lib/format';

export const metadata = {
  title: 'Sources — DMV Water Watch',
  description: 'Every data source we use, with last-updated timestamps.',
};

export const dynamic = 'force-static';

export default async function SourcesPage() {
  const { sources, manifest } = await loadInitialData();
  const builtAt = manifest ? new Date(manifest.built_at) : new Date();

  return (
    <main className="flex-1">
      <Header />
      <article className="max-w-2xl mx-auto p-4 prose prose-slate prose-sm sm:prose-base">
        <h1>Data sources</h1>
        <p className="text-sm">
          Built {builtAt.toLocaleString()} ({formatFreshness(builtAt.toISOString(), new Date())}
          ).
        </p>

        <table>
          <thead>
            <tr>
              <th>Source</th>
              <th>Last updated</th>
              <th>Records</th>
              <th>Cadence</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.id}>
                <td>
                  <strong>{s.name}</strong>
                  {s.contact && (
                    <span className="block text-xs text-slate-500">{s.contact}</span>
                  )}
                </td>
                <td>{s.last_updated ? formatFreshness(s.last_updated, new Date()) : '—'}</td>
                <td>{s.record_count}</td>
                <td>{s.cadence}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p>
          A "—" in the Last updated column means the source returned no records in the most
          recent build. For federal APIs (USGS, NOAA, EPA) this usually indicates an upstream
          maintenance window. For Anacostia Riverkeeper, it can also reflect the off-season pause
          (October–April). Either way, the rubric degrades gracefully — sites lose that signal
          for the current grade, but other signals still drive the verdict.
        </p>
      </article>
    </main>
  );
}
