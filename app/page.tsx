import { Column } from '@once-ui-system/core/components';
import { Suspense } from 'react';
import MapShell from './components/MapShell';
import { loadInitialData } from '@lib/data-source';

export const dynamic = 'force-static';

export default async function HomePage() {
  const initial = await loadInitialData();

  // The map page is the one route that wants viewport-locked height. Static
  // pages (methodology, about, sources) flow naturally; only this Column
  // constrains to 100dvh so the map can fill the available space.
  return (
    <Column as="main" fillWidth style={{ height: '100dvh' }}>
      <Suspense fallback={null}>
        <MapShell initialData={initial} />
      </Suspense>
    </Column>
  );
}
