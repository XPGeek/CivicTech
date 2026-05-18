import { Column, Heading, Row, Text, Card } from '@once-ui-system/core';
import Header from '../components/Header';
import { GRADE_LABELS, GRADE_PIN_SVG } from '@lib/grade-style';
import type { Grade } from '@lib/types';

export const metadata = {
  title: 'How we grade the water',
  description:
    "Bacteria, rainfall, sondes, and impairment — the four signals behind every DMV Water Watch grade.",
};

const GRADE_DESCRIPTIONS: Record<Grade, string> = {
  green: 'Bacteria are within the safety threshold, no recent heavy rain, and live sensors look normal.',
  yellow: 'One signal is elevated above the safe band but below the fail threshold. Read the reason on the card.',
  red: 'Bacteria exceed safe levels for this activity, rainfall makes recent data unreliable, or dissolved oxygen has collapsed.',
  unknown: 'No fresh data right now. Check directly with the site operator, or come back later.',
};

export default function MethodologyPage() {
  return (
    <Column as="main" fillWidth horizontal="center">
      <Header />
      <Column
        maxWidth={36}
        paddingX="24"
        paddingY="48"
        gap="40"
        fillWidth
        as="article"
      >
        <Column gap="12">
          <Text variant="label-default-s" onBackground="brand-medium">
            METHODOLOGY
          </Text>
          <Heading variant="display-strong-l" as="h1">
            How we grade the water.
          </Heading>
          <Text variant="body-default-l" onBackground="neutral-medium">
            Every site gets one of four grades. No machine learning, no proprietary scoring.
            The rubric is in <code>grading/v1.ts</code> in our public repo — read it, fork it,
            argue with it.
          </Text>
        </Column>

        <Column gap="24">
          <Heading variant="heading-strong-l" as="h2">
            The four signals
          </Heading>
          <Row gap="12" wrap>
            <SignalCard
              title="Bacteria"
              body="Single-sample E. coli or enterococcus from Anacostia Riverkeeper or DOEE labs, within the past 7 days. This is the primary signal."
            />
            <SignalCard
              title="Rainfall"
              body="48-hour precipitation from the nearest NOAA station. Heavy rain stirs up bacteria and triggers CSOs."
            />
            <SignalCard
              title="Real-time sondes"
              body="DOEE's YSI sondes report turbidity, dissolved oxygen, and water temp every 15 minutes."
            />
            <SignalCard
              title="Chronic impairment"
              body="EPA's How's My Waterway listing — context, not verdict. Surfaces as a badge on the card."
            />
          </Row>
        </Column>

        <Column gap="16">
          <Heading variant="heading-strong-l" as="h2">
            Activity thresholds
          </Heading>
          <Text variant="body-default-m" onBackground="neutral-medium">
            EPA 2012 Recreational Water Quality Criteria, applied per activity:
          </Text>
          <Card padding="16" radius="m">
            <Column gap="12">
              <Row horizontal="between">
                <Text variant="label-default-s" onBackground="neutral-strong">
                  Paddle / row / SUP
                </Text>
                <Text variant="body-default-s" onBackground="neutral-medium">
                  ≤ 575 MPN/100mL E. coli
                </Text>
              </Row>
              <Row horizontal="between">
                <Text variant="label-default-s" onBackground="neutral-strong">
                  Swim
                </Text>
                <Text variant="body-default-s" onBackground="neutral-medium">
                  ≤ 235 MPN/100mL E. coli
                </Text>
              </Row>
            </Column>
          </Card>
          <Text variant="body-default-s" onBackground="neutral-weak">
            Up to 2× the pass threshold shows as caution. Higher shows as fail.
          </Text>
        </Column>

        <Column gap="16">
          <Heading variant="heading-strong-l" as="h2">
            Rainfall override
          </Heading>
          <Text variant="body-default-m" onBackground="neutral-medium">
            Heavy rain dominates everything else — only if it fell <em>after</em> the most recent bacterial sample:
          </Text>
          <Column gap="8">
            <Text variant="body-default-s">
              <strong>≥ 0.5″ in 48 hours</strong> → at least caution.
            </Text>
            <Text variant="body-default-s">
              <strong>≥ 1.0″ in 48 hours</strong> → red regardless of bacteria.
            </Text>
          </Column>
        </Column>

        <Column gap="16">
          <Heading variant="heading-strong-l" as="h2">
            Sonde sanity check
          </Heading>
          <Text variant="body-default-m" onBackground="neutral-medium">
            Real-time sensors can <em>downgrade</em> a passing site to caution if turbidity is above
            50 NTU, dissolved oxygen below 5 mg/L, or water temp above 32 °C. They never push a
            passing site to red — except on dissolved-oxygen collapse below 3 mg/L, which is a
            real wildlife and health indicator.
          </Text>
        </Column>

        <Column gap="16">
          <Heading variant="heading-strong-l" as="h2">
            What the grades mean
          </Heading>
          <Column gap="12">
            {(Object.keys(GRADE_DESCRIPTIONS) as Grade[]).map((g) => (
              <Card key={g} padding="16" radius="m">
                <Row gap="16" vertical="center">
                  <div
                    aria-hidden
                    style={{ width: 36, height: 36, flexShrink: 0 }}
                    dangerouslySetInnerHTML={{ __html: GRADE_PIN_SVG[g] }}
                  />
                  <Column gap="4" fillWidth>
                    <Text variant="label-default-m" onBackground="neutral-strong">
                      {GRADE_LABELS[g]}
                    </Text>
                    <Text variant="body-default-s" onBackground="neutral-medium">
                      {GRADE_DESCRIPTIONS[g]}
                    </Text>
                  </Column>
                </Row>
              </Card>
            ))}
          </Column>
        </Column>

        <Column gap="12">
          <Heading variant="heading-strong-l" as="h2">
            What this rubric is not
          </Heading>
          <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
            <li>
              <Text variant="body-default-m" onBackground="neutral-medium">
                Not regulatory. EPA uses 30-day geometric means for assessment. We use single
                samples because you&rsquo;re deciding about <em>today</em>.
              </Text>
            </li>
            <li>
              <Text variant="body-default-m" onBackground="neutral-medium">
                Not a guarantee. We can&rsquo;t detect a sewer overflow that happened 20 minutes
                ago.
              </Text>
            </li>
            <li>
              <Text variant="body-default-m" onBackground="neutral-medium">
                Not a substitute for posted signs. If the launch has a &ldquo;no swimming&rdquo;
                sign, the sign wins.
              </Text>
            </li>
            <li>
              <Text variant="body-default-m" onBackground="neutral-medium">
                Not predictive. We do not forecast tomorrow.
              </Text>
            </li>
          </ul>
        </Column>
      </Column>
    </Column>
  );
}

function SignalCard({ title, body }: { title: string; body: string }) {
  return (
    <Card padding="16" radius="m" style={{ flex: '1 1 240px', minWidth: 240 }}>
      <Column gap="8">
        <Text variant="label-default-m" onBackground="brand-medium">
          {title}
        </Text>
        <Text variant="body-default-s" onBackground="neutral-medium">
          {body}
        </Text>
      </Column>
    </Card>
  );
}
