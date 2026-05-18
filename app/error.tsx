'use client';

import { useEffect } from 'react';
import { Column, Heading, Row, Text, Button } from '@once-ui-system/core';
import { captureError } from '@lib/sentry';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureError(error);
  }, [error]);

  return (
    <Column as="main" fillWidth fillHeight horizontal="center" vertical="center" padding="24">
      <Column
        maxWidth={28}
        padding="32"
        gap="16"
        background="surface"
        radius="l"
        shadow="m"
        border="neutral-alpha-weak"
      >
        <Column gap="8">
          <Text variant="label-default-s" onBackground="danger-medium">
            SOMETHING BROKE
          </Text>
          <Heading variant="heading-strong-l">Hmm, that wasn&rsquo;t supposed to happen.</Heading>
          <Text variant="body-default-m" onBackground="neutral-medium">
            The data is fine — this is a frontend hiccup. Reload, or click below to retry.
          </Text>
        </Column>
        <Row gap="12" vertical="center" wrap>
          <Button variant="primary" onClick={() => reset()}>
            Try again
          </Button>
          <Button variant="secondary" href="/">
            Back to map
          </Button>
        </Row>
        {error.digest && (
          <Text variant="body-default-xs" onBackground="neutral-weak">
            Error ref: <code>{error.digest}</code>
          </Text>
        )}
      </Column>
    </Column>
  );
}
