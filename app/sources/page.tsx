import { Column, Heading, Row, Text, Card, Tag } from '@once-ui-system/core';
import Header from '../components/Header';
import { loadInitialData } from '@lib/data-source';
import { formatFreshness } from '@lib/format';

export const metadata = {
  title: 'Sources',
  description: 'Every source we use, with last-updated timestamps.',
};

export const dynamic = 'force-static';

export default async function SourcesPage() {
  const { sources, manifest } = await loadInitialData();
  const builtAt = manifest ? new Date(manifest.built_at) : new Date();

  return (
    <Column as="main" fillWidth horizontal="center">
      <Header />
      <Column maxWidth={36} paddingX="24" paddingY="48" gap="32" fillWidth as="article">
        <Column gap="12">
          <Text variant="label-default-s" onBackground="brand-medium">
            SOURCES
          </Text>
          <Heading variant="display-strong-l" as="h1">
            Where the data comes from.
          </Heading>
          <Text variant="body-default-l" onBackground="neutral-medium">
            Every grade is built from public data. Below: each source, when it last published,
            and how often it refreshes.
          </Text>
          <Text variant="body-default-s" onBackground="neutral-weak">
            Last build: {builtAt.toLocaleString()} ({formatFreshness(builtAt.toISOString(), new Date())}).
          </Text>
        </Column>

        <Column gap="12">
          {sources.map((s) => (
            <Card key={s.id} padding="16" radius="m">
              <Column gap="8">
                <Row horizontal="between" vertical="center" gap="12" wrap>
                  <Column gap="2">
                    <Text variant="label-default-m" onBackground="neutral-strong">
                      {s.name}
                    </Text>
                    <Text variant="body-default-xs" onBackground="neutral-weak">
                      {s.contact}
                    </Text>
                  </Column>
                  <Row gap="8" wrap>
                    <Tag size="s" variant="brand">
                      {s.cadence}
                    </Tag>
                    <Tag size="s" variant={s.record_count > 0 ? 'success' : 'neutral'}>
                      {s.record_count} records
                    </Tag>
                  </Row>
                </Row>
                <Row gap="8" vertical="center">
                  <Text variant="body-default-s" onBackground="neutral-medium">
                    {s.last_updated
                      ? `Last updated ${formatFreshness(s.last_updated, new Date())}`
                      : '— no records in the latest build'}
                  </Text>
                </Row>
                {s.error && (
                  <Tag size="s" variant="danger">
                    error: {s.error}
                  </Tag>
                )}
              </Column>
            </Card>
          ))}
        </Column>

        <Text variant="body-default-s" onBackground="neutral-weak">
          A &ldquo;—&rdquo; means the source returned nothing in this build. For federal APIs
          (USGS, NOAA, EPA), that&rsquo;s usually a maintenance window. For Anacostia Riverkeeper,
          it can also be the off-season pause (October–April). Either way, the rubric degrades
          gracefully — affected sites lose that signal but the rest of the grade still works.
        </Text>
      </Column>
    </Column>
  );
}
