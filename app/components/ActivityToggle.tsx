'use client';

import { SegmentedControl } from '@once-ui-system/core';
import type { Activity } from '@lib/types';

interface Props {
  activity: Activity;
  onChange: (a: Activity) => void;
  /** True if the user has selected a DC-only site (swim option suppressed). */
  swimAllowed: boolean;
}

export default function ActivityToggle({ activity, onChange, swimAllowed }: Props) {
  return (
    <SegmentedControl
      buttons={[
        { value: 'paddle', label: 'Paddle' },
        {
          value: 'swim',
          label: 'Swim',
          disabled: !swimAllowed,
        },
      ]}
      selected={activity}
      onToggle={(value) => onChange(value as Activity)}
      compact
    />
  );
}
