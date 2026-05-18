import { Row, Text } from '@once-ui-system/core';
import { formatFreshness, formatValue } from '@lib/format';
import type { SignalState } from '@lib/types';

interface Props {
  label: string;
  signal: SignalState | undefined;
  /** ISO time the grade was computed; used to age-stamp the signal. */
  computedAt: string;
}

export default function SignalRow({ label, signal, computedAt }: Props) {
  if (!signal || signal.status === 'missing') {
    return (
      <Row
        horizontal="between"
        vertical="center"
        paddingY="8"
        style={{ borderBottom: '1px solid var(--neutral-alpha-weak, rgba(15,23,42,0.06))' }}
      >
        <Text variant="body-default-s" onBackground="neutral-medium">
          {label}
        </Text>
        <Text variant="body-default-s" onBackground="neutral-weak">
          no fresh data
        </Text>
      </Row>
    );
  }
  const stale = signal.status === 'stale';
  return (
    <Row
      horizontal="between"
      vertical="center"
      paddingY="8"
      style={{ borderBottom: '1px solid var(--neutral-alpha-weak, rgba(15,23,42,0.06))' }}
    >
      <Text variant="body-default-s" onBackground="neutral-medium">
        {label}
      </Text>
      <Row gap="8" vertical="center">
        <Text
          variant="body-default-s"
          onBackground={stale ? 'neutral-weak' : 'neutral-strong'}
        >
          {formatValue(signal.value, signal.units)}
        </Text>
        <Text variant="body-default-xs" onBackground="neutral-weak">
          {formatFreshness(signal.observed_at ?? computedAt, new Date(computedAt))}
        </Text>
      </Row>
    </Row>
  );
}
