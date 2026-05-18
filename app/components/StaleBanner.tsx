'use client';

import { useEffect, useState } from 'react';
import { Banner, Text, IconButton } from '@once-ui-system/core';
import { formatFreshness } from '@lib/format';
import type { Manifest } from '@lib/types';

interface Props {
  manifest: Manifest | null;
}

const STALE_AFTER_HOURS = 6;

export default function StaleBanner({ manifest }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  // Hydration: only compute "now" after mount so SSR + client agree.
  useEffect(() => {
    setNow(new Date());
  }, []);

  if (!manifest || !now || dismissed) return null;
  const ageHours = (now.getTime() - Date.parse(manifest.built_at)) / 3600_000;
  if (ageHours < STALE_AFTER_HOURS) return null;

  return (
    <Banner
      role="status"
      fillWidth
      paddingX="24"
      paddingY="12"
      vertical="center"
      horizontal="between"
      background="warning-alpha-weak"
      borderBottom="warning-alpha-medium"
    >
      <Text variant="body-default-s" onBackground="warning-medium">
        Data may be delayed — last successful refresh:{' '}
        {formatFreshness(manifest.built_at, now)}.
      </Text>
      <IconButton
        icon="close"
        size="s"
        variant="tertiary"
        onClick={() => setDismissed(true)}
        tooltip="Dismiss"
      />
    </Banner>
  );
}
