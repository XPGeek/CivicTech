'use client';

import { AccordionGroup, Column, Text } from '@once-ui-system/core';

export default function Disclaimer() {
  return (
    <AccordionGroup
      size="s"
      items={[
        {
          title: 'Important: this is an informational tool, not a safety guarantee',
          content: (
            <Column gap="12">
              <Text variant="body-default-s" onBackground="neutral-medium">
                <strong>DMV Water Watch is an informational tool, not a safety guarantee.</strong>
              </Text>
              <Text variant="body-default-s" onBackground="neutral-medium">
                We aggregate public water-quality data from USGS, EPA, NOAA, DC DOEE, the
                Anacostia Riverkeeper, and other sources. Our information is{' '}
                <strong>always at least somewhat retrospective</strong>. Conditions change fast
                after rain, sewer overflows, spills, and algal blooms.
              </Text>
              <Text variant="body-default-s" onBackground="neutral-medium">
                A &ldquo;paddle-safe&rdquo; grade is not a guarantee. Always:
              </Text>
              <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                <li>
                  <Text variant="body-default-s" onBackground="neutral-medium">
                    Watch for posted signs and follow local-authority guidance.
                  </Text>
                </li>
                <li>
                  <Text variant="body-default-s" onBackground="neutral-medium">
                    Avoid water for 48 hours after significant rain (≥ 0.5″), regardless of our
                    grade.
                  </Text>
                </li>
                <li>
                  <Text variant="body-default-s" onBackground="neutral-medium">
                    Trust what you see, smell, and observe on the water.
                  </Text>
                </li>
              </ul>
              <Text variant="body-default-s" onBackground="neutral-medium">
                Swimming is <strong>prohibited in DC waters</strong> except during permitted
                events. The swim toggle is educational, not an endorsement.
              </Text>
              <Text variant="body-default-s" onBackground="neutral-weak">
                Provided &ldquo;as is&rdquo;, no warranty. Using this app, you assume the risks of
                water-based recreation.
              </Text>
            </Column>
          ),
        },
      ]}
    />
  );
}
