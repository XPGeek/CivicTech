import { Column } from '@once-ui-system/core';
import { Suspense } from 'react';
import MapShell from './components/MapShell';
import { loadInitialData } from '@lib/data-source';

export const dynamic = 'force-static';

export default async function HomePage() {
  const initial = await loadInitialData();

  return (
    <Column as="main" fillWidth fillHeight>
      <Suspense fallback={null}>
        <MapShell initialData={initial} />
      </Suspense>
    </Column>
  );
}
