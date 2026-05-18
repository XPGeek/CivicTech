import { Column, Heading, Row, Text } from '@once-ui-system/core';
import Header from '../components/Header';
import Disclaimer from '../components/Disclaimer';
import PageHero from '../components/PageHero';
import LinkCard from '../components/LinkCard';

export const metadata = {
  title: 'About',
  description: 'Credits, data sources, and how this project came to be.',
};

export default function AboutPage() {
  return (
    <Column as="main" fillWidth horizontal="center">
      <Header />
      <Column maxWidth={36} paddingX="24" paddingY="48" gap="32" fillWidth as="article">
        <PageHero
          eyebrow="ABOUT"
          title="Built so paddlers don&rsquo;t guess."
          lede="DMV Water Watch is an open-source map for paddlers, rowers, and (where legal) swimmers across the inner DC Metro Area. One question, answered in five seconds: is it safe to get in the water today?"
        />

        <Column gap="16">
          <Heading variant="heading-strong-l" as="h2">
            What we do
          </Heading>
          <Text variant="body-default-m" onBackground="neutral-medium">
            We pull water-quality data from authoritative sources — USGS, EPA, NOAA, DC DOEE, and
            the Anacostia Riverkeeper — apply a transparent rubric, and surface a single traffic-
            light grade at every recreation site. The same data already exists; nobody had unified
            it for the people actually getting in the water.
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
              href="https://github.com/XPGeek/CivicTech"
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
            Anacostia Riverkeeper, and the Potomac Riverkeeper Network publish freely. We aim to
            be a credible consumer surface for the work those organizations already do. Built at
            Civic Tech DC project nights.
          </Text>
        </Column>

        <Disclaimer />
      </Column>
    </Column>
  );
}
