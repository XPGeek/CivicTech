import { Column, Heading, Row, Text, SmartLink, Card } from '@once-ui-system/core';
import Header from '../components/Header';
import Disclaimer from '../components/Disclaimer';

export const metadata = {
  title: 'About',
  description: 'Credits, data sources, and how this project came to be.',
};

export default function AboutPage() {
  return (
    <Column as="main" fillWidth horizontal="center">
      <Header />
      <Column maxWidth={36} paddingX="24" paddingY="48" gap="32" fillWidth as="article">
        <Column gap="12">
          <Text variant="label-default-s" onBackground="brand-medium">
            ABOUT
          </Text>
          <Heading variant="display-strong-l" as="h1">
            Built so paddlers don&rsquo;t guess.
          </Heading>
          <Text variant="body-default-l" onBackground="neutral-medium">
            DMV Water Watch is an open-source map for paddlers, rowers, and (where legal)
            swimmers across the inner DC Metro Area. One question, answered in five seconds:
            is it safe to get in the water today?
          </Text>
        </Column>

        <Column gap="16">
          <Heading variant="heading-strong-l" as="h2">
            What we do
          </Heading>
          <Text variant="body-default-m" onBackground="neutral-medium">
            We pull water-quality data from authoritative sources — USGS, EPA, NOAA, DC DOEE,
            and the Anacostia Riverkeeper — apply a transparent rubric, and surface a single
            traffic-light grade at every recreation site. The same data already exists; nobody
            had unified it for the people actually getting in the water.
          </Text>
        </Column>

        <Column gap="16">
          <Heading variant="heading-strong-l" as="h2">
            How to learn more
          </Heading>
          <Row gap="12" wrap>
            <LinkCard
              href="/methodology"
              title="Methodology"
              body="Every grade is derived. Read the rubric."
            />
            <LinkCard
              href="/sources"
              title="Sources"
              body="Per-source last-updated timestamps."
            />
            <LinkCard
              href="https://github.com/sgiacinto/CivicTech"
              title="GitHub"
              body="Open source under MIT. Contributions welcome."
            />
          </Row>
        </Column>

        <Column gap="16">
          <Heading variant="heading-strong-l" as="h2">
            Acknowledgments
          </Heading>
          <Text variant="body-default-m" onBackground="neutral-medium">
            This project exists because of the public data that USGS, EPA, NOAA, DC DOEE, the
            Anacostia Riverkeeper, and the Potomac Riverkeeper Network publish freely. We aim
            to be a credible consumer surface for the work those organizations already do.
            Built at Civic Tech DC project nights.
          </Text>
        </Column>

        <Disclaimer />
      </Column>
    </Column>
  );
}

function LinkCard({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <SmartLink href={href} unstyled style={{ flex: '1 1 220px', minWidth: 220 }}>
      <Card padding="16" radius="m" cursor="interactive" transition="micro-medium">
        <Column gap="8">
          <Text variant="label-default-m" onBackground="neutral-strong">
            {title} →
          </Text>
          <Text variant="body-default-s" onBackground="neutral-medium">
            {body}
          </Text>
        </Column>
      </Card>
    </SmartLink>
  );
}
