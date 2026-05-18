'use client';

import { useEffect, useState } from 'react';
import { Dialog, Column, Text, Button } from '@once-ui-system/core';

const STORAGE_KEY = 'dmv-water-watch.disclaimer-acked';

export default function DisclaimerInterstitial() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(STORAGE_KEY)) setOpen(true);
    } catch {
      // ignore
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
      title="Before you set off"
      footer={
        <Button onClick={close} variant="primary" fillWidth>
          Got it
        </Button>
      }
    >
      <Column gap="12">
        <Text variant="body-default-m" onBackground="neutral-medium">
          DMV Water Watch shows water-quality grades aggregated from federal and local sources.
          These grades are <strong>informational</strong>, not a safety guarantee.
        </Text>
        <Text variant="body-default-m" onBackground="neutral-medium">
          Conditions change between samples. Watch for posted signs, use your own judgment, and
          remember swimming is prohibited in DC waters.
        </Text>
      </Column>
    </Dialog>
  );
}
