'use client';

import { Banner, Button, Row, Text } from '@once-ui-system/core';
import { useEffect, useState } from 'react';
import { formatFreshness } from '@lib/format';
import type { Manifest } from '@lib/types';

interface Props {
  manifest: Manifest | null;
}

const STALE_AFTER_HOURS = 6;

export default function StaleBanner({ manifest }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
  }, []);

  if (!manifest || !now || dismissed) return null;
  const ageHours = (now.getTime() - Date.parse(manifest.built_at)) / 3600_000;
  if (ageHours < STALE_AFTER_HOURS) return null;

  return (
    <Banner
      role="status"
      paddingX="16"
      paddingY="12"
      gap="12"
      vertical="center"
      horizontal="between"
      background="warning-alpha-weak"
      borderTop="warning-alpha-medium"
      borderBottom="warning-alpha-medium"
    >
      <Row gap="8" vertical="center" fillWidth>
        <Text variant="body-default-s" onBackground="warning-strong">
          Data may be delayed — last successful refresh {formatFreshness(manifest.built_at, now)}.
        </Text>
      </Row>
      <Button variant="tertiary" size="s" onClick={() => setDismissed(true)}>
        Dismiss
      </Button>
    </Banner>
  );
}
