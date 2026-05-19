'use client';

import { Column, Row, Text } from '@once-ui-system/core/components';
import type { Activity } from '@lib/types';

interface Props {
  activity: Activity;
  onChange: (a: Activity) => void;
  /** False when the selected site is DC-only — swim option is suppressed. */
  swimAllowed: boolean;
}

/**
 * Two-button pill. Replaces once-ui's `SegmentedControl` because the
 * controlled `selected` prop didn't propagate clicks reliably when the
 * toggle floats over the MapLibre canvas — plain `<button>` elements
 * eliminate the wrapper layers and let us style the active state directly.
 */
export default function ActivityToggle({ activity, onChange, swimAllowed }: Props) {
  return (
    <Column
      gap="4"
      padding="8"
      radius="full"
      horizontal="center"
      style={{
        background: '#ffffff',
        border: '1px solid rgba(15, 23, 42, 0.12)',
        boxShadow: '0 12px 32px -10px rgba(15, 23, 42, 0.35)',
      }}
    >
      <Text
        variant="label-default-xs"
        onBackground="neutral-weak"
        paddingTop="4"
        style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}
      >
        Activity
      </Text>
      <Row gap="4" role="tablist" aria-label="Activity">
        <PillButton
          active={activity === 'paddle'}
          onClick={() => onChange('paddle')}
        >
          Paddle
        </PillButton>
        <PillButton
          active={activity === 'swim'}
          disabled={!swimAllowed}
          onClick={() => onChange('swim')}
        >
          Swim
        </PillButton>
      </Row>
    </Column>
  );
}

interface PillButtonProps {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function PillButton({ active, disabled, onClick, children }: PillButtonProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      onClick={onClick}
      style={{
        appearance: 'none',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: active ? '#0f172a' : 'transparent',
        color: active ? '#ffffff' : disabled ? 'rgba(15,23,42,0.35)' : '#0f172a',
        fontWeight: active ? 600 : 500,
        fontSize: '14px',
        lineHeight: 1,
        padding: '8px 18px',
        borderRadius: 999,
        transition: 'background 120ms ease-out, color 120ms ease-out',
      }}
    >
      {children}
    </button>
  );
}
