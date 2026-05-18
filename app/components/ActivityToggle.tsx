'use client';

import { Column, SegmentedControl, Text } from '@once-ui-system/core/components';
import type { Activity } from '@lib/types';

interface Props {
  activity: Activity;
  onChange: (a: Activity) => void;
  /** False when the selected site is DC-only — swim option is suppressed. */
  swimAllowed: boolean;
}

export default function ActivityToggle({ activity, onChange, swimAllowed }: Props) {
  return (
    <Column
      gap="4"
      padding="8"
      radius="full"
      style={{
        background: '#ffffff',
        border: '1px solid rgba(15, 23, 42, 0.12)',
        boxShadow: '0 12px 32px -10px rgba(15, 23, 42, 0.35)',
      }}
    >
      <Text
        variant="label-default-xs"
        onBackground="neutral-weak"
        paddingX="12"
        paddingTop="4"
        style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}
      >
        Activity
      </Text>
      <SegmentedControl
        selected={activity}
        onToggle={(value) => onChange(value as Activity)}
        buttons={[
          { value: 'paddle', label: 'Paddle' },
          { value: 'swim', label: 'Swim', disabled: !swimAllowed },
        ]}
      />
    </Column>
  );
}
