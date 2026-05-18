'use client';

import { SegmentedControl } from '@once-ui-system/core';
import type { Activity } from '@lib/types';

interface Props {
  activity: Activity;
  onChange: (a: Activity) => void;
  /** False when the selected site is DC-only — swim option is suppressed. */
  swimAllowed: boolean;
}

export default function ActivityToggle({ activity, onChange, swimAllowed }: Props) {
  return (
    <SegmentedControl
      selected={activity}
      onToggle={(value) => onChange(value as Activity)}
      buttons={[
        { value: 'paddle', label: 'Paddle' },
        { value: 'swim', label: 'Swim', disabled: !swimAllowed },
      ]}
      style={{
        background: 'var(--surface-background-alpha-strong, rgba(255,255,255,0.9))',
        borderRadius: 999,
        boxShadow: '0 8px 24px -8px rgba(15,23,42,0.18)',
      }}
    />
  );
}
