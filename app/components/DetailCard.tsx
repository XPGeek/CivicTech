'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useState } from 'react';
import { Button, Card, Column, Heading, Row, Tag, Text } from '@once-ui-system/core/components';
import type {
  Activity,
  GradeOutput,
  SitePinProperties,
  SourceSummary,
} from '@lib/types';
import Eyebrow from './Eyebrow';
import GradeHero from './GradeHero';
import SignalRow from './SignalRow';

// Recharts is heavy (~70 KB gzipped); keep it out of the initial bundle.
// The placeholder shares the `.skeleton` class with Sparkline's own loading
// state so the module-loading and data-loading phases look identical.
const Sparkline = dynamic(() => import('./Sparkline'), {
  ssr: false,
  loading: () => <div className="skeleton" aria-label="Loading history" />,
});

interface Props {
  site: SitePinProperties;
  grade: GradeOutput;
  activity: Activity;
  sources: SourceSummary[];
  standalone?: boolean;
}

export default function DetailCard({ site, grade, activity, sources, standalone }: Props) {
  const [copied, setCopied] = useState(false);

  const onShare = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}/site/${site.id}`;
    const shareData = { title: site.name, text: grade.reason, url };
    try {
      const nav = navigator as unknown as {
        share?: (data: { title: string; text: string; url: string }) => Promise<void>;
        clipboard?: { writeText: (s: string) => Promise<void> };
      };
      if (typeof nav.share === 'function') {
        await nav.share(shareData);
      } else if (nav.clipboard?.writeText) {
        await nav.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // user dismissed share sheet
    }
  }, [site.id, site.name, grade.reason]);

  const contributingSourceIds = sourcesFromSignals(grade);
  const contributingSources = sources.filter((s) => contributingSourceIds.has(s.id));

  return (
    <Column as="article" padding="20" gap="16" aria-labelledby={`site-${site.id}-name`}>
      <Column gap="4">
        <Heading
          as={standalone ? 'h1' : 'h2'}
          id={`site-${site.id}-name`}
          variant={standalone ? 'display-strong-s' : 'heading-strong-l'}
          wrap="balance"
        >
          {site.name}
        </Heading>
        {site.subname && (
          <Text variant="body-default-s" onBackground="neutral-weak">
            {site.subname}
          </Text>
        )}
      </Column>

      <GradeHero
        grade={grade.grade}
        activity={activity}
        reason={grade.reason}
        stale={grade.stale ?? false}
      />

      <Text variant="body-default-xs" onBackground="neutral-weak">
        Conditions can change between samples. Use your own judgment.
      </Text>

      <Column gap="8">
        <Eyebrow>
          Signals
        </Eyebrow>
        <Column>
          <SignalRow label="Bacteria" signal={grade.signals.bacteria} computedAt={grade.computed_at} />
          <SignalRow label="Rainfall (48h)" signal={grade.signals.rainfall} computedAt={grade.computed_at} />
          <SignalRow label="Real-time sonde" signal={grade.signals.sonde} computedAt={grade.computed_at} />
          {grade.signals.chronic && (
            <SignalRow
              label="EPA impairment"
              signal={grade.signals.chronic}
              computedAt={grade.computed_at}
            />
          )}
        </Column>
      </Column>

      <Column gap="8">
        <Eyebrow>
          30-day history
        </Eyebrow>
        <Sparkline siteId={site.id} />
      </Column>

      <Card padding="16" radius="m" gap="12" direction="column">
        <Eyebrow>
          Site details
        </Eyebrow>
        <Row gap="8" wrap>
          <Tag size="s" variant="neutral">
            {site.launch_type.replace(/-/g, ' ')}
          </Tag>
          <Tag size="s" variant="neutral">
            Parking: {site.parking}
          </Tag>
          {site.fee && (
            <Tag size="s" variant="warning">
              Launch fee
            </Tag>
          )}
          {site.activity_types.map((a) => (
            <Tag key={a} size="s" variant="brand">
              {a}
            </Tag>
          ))}
        </Row>
        {site.notes && (
          <Text variant="body-default-xs" onBackground="neutral-weak">
            {site.notes}
          </Text>
        )}
      </Card>

      <Column gap="8">
        <Eyebrow>
          Sources
        </Eyebrow>
        {contributingSources.length === 0 ? (
          <Text variant="body-default-xs" onBackground="neutral-weak">
            No sources contributed fresh data to this grade.
          </Text>
        ) : (
          <Column gap="8">
            {contributingSources.map((s) => (
              <Column key={s.id} gap="2">
                <Text variant="body-default-s" onBackground="neutral-strong">
                  {s.name}
                </Text>
                {s.last_updated && (
                  <Text variant="body-default-xs" onBackground="neutral-weak">
                    Updated {new Date(s.last_updated).toLocaleString()}
                  </Text>
                )}
              </Column>
            ))}
          </Column>
        )}
      </Column>

      <Row gap="12" vertical="center" wrap paddingTop="12" borderTop="neutral-alpha-weak">
        <Button variant="primary" onClick={onShare} prefixIcon="copy">
          {copied ? 'Link copied' : 'Share'}
        </Button>
        <Link href="/methodology" style={{ textDecoration: 'none' }}>
          <Text variant="body-default-s" onBackground="brand-medium">
            How is this grade calculated? →
          </Text>
        </Link>
      </Row>
    </Column>
  );
}

function sourcesFromSignals(grade: GradeOutput): Set<string> {
  const ids = new Set<string>();
  if (grade.signals.bacteria) ids.add('anacostia-riverkeeper');
  if (grade.signals.rainfall) ids.add('noaa-precip');
  if (grade.signals.sonde) {
    ids.add('doee-sondes');
    ids.add('usgs-nwis');
  }
  if (grade.signals.chronic) ids.add('epa-hmw');
  return ids;
}
