import { Row, Text, Tag } from '@once-ui-system/core';
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
        paddingY="8"
        horizontal="between"
        vertical="center"
        borderBottom="neutral-alpha-weak"
      >
        <Text variant="body-default-s" onBackground="neutral-weak">
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
    <Row paddingY="8" horizontal="between" vertical="center" borderBottom="neutral-alpha-weak">
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
        <Tag size="s" variant={stale ? 'warning' : 'neutral'}>
          {formatFreshness(signal.observed_at ?? computedAt, new Date(computedAt))}
        </Tag>
      </Row>
    </Row>
  );
}
