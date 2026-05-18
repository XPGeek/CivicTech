import { Suspense } from 'react';
import MapShell from './components/MapShell';
import { loadInitialData } from '@lib/data-source';

export const dynamic = 'force-static';

export default async function HomePage() {
  const initial = await loadInitialData();

  return (
    <main className="flex-1 flex flex-col">
      <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading map…</div>}>
        <MapShell initialData={initial} />
      </Suspense>
    </main>
  );
}
