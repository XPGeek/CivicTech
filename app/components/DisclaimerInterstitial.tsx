'use client';

import { Button, Column, Dialog, Text } from '@once-ui-system/core';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'dmv-water-watch.disclaimer-acked';

export default function DisclaimerInterstitial() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(STORAGE_KEY)) setOpen(true);
    } catch {
      // Safari private mode and friends — fall back to assuming acked.
    }
  }, []);

  const close = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
    setOpen(false);
  };

  return (
    <Dialog
      isOpen={open}
      onClose={close}
      title="Before you head out"
      description="Five-second context before you trust the grade."
      footer={
        <Button variant="primary" onClick={close} fillWidth>
          Got it — show me the map
        </Button>
      }
    >
      <Column gap="12">
        <Text variant="body-default-m" onBackground="neutral-medium">
          DMV Water Watch shows water-quality grades aggregated from federal and local sources.
          These grades are <strong>informational, not a safety guarantee</strong>. Conditions can
          change between samples — observe posted signage and use your own judgment.
        </Text>
        <Text variant="body-default-s" onBackground="neutral-weak">
          Swimming is prohibited in DC waters except during permitted events.
        </Text>
      </Column>
    </Dialog>
  );
}
