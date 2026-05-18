'use client';

import dynamic from 'next/dynamic';
import { useCallback, useState } from 'react';
import {
  Button,
  Column,
  Heading,
  Row,
  Skeleton,
  SmartLink,
  Text,
} from '@once-ui-system/core';
import type {
  Activity,
  GradeOutput,
  SitePinProperties,
  SourceSummary,
} from '@lib/types';
import GradeHero from './GradeHero';
import SignalRow from './SignalRow';

// Recharts is heavy (~70 KB gzipped); keep it out of the initial bundle.
const Sparkline = dynamic(() => import('./Sparkline'), {
  ssr: false,
  loading: () => <Skeleton shape="block" height="l" fillWidth aria-label="Loading history" />,
});

interface Props {
  site: SitePinProperties;
  grade: GradeOutput;
  activity: Activity;
  sources: SourceSummary[];
  /** True if rendered on the standalone /site/[id] page (uses h1 + larger type). */
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
      // user dismissed share sheet — non-error
    }
  }, [site.id, site.name, grade.reason]);

  const contributingSources = sources.filter((s) =>
    sourcesFromSignals(grade).has(s.id),
  );

  const headingId = `site-${site.id}-name`;

  return (
    <Column
      as="article"
      paddingX="20"
      paddingBottom="32"
      gap="16"
      aria-labelledby={headingId}
    >
      <Column gap="4" paddingTop={standalone ? '20' : '16'}>
        <Heading
          id={headingId}
          variant={standalone ? 'display-strong-s' : 'heading-strong-l'}
          as={standalone ? 'h1' : 'h2'}
        >
          {site.name}
        </Heading>
        {site.subname && (
          <Text variant="body-default-s" onBackground="neutral-weak">
            {site.subname}
          </Text>
        )}
      </Column>

      <GradeHero grade={grade.grade} activity={activity} reason={grade.reason} />

      <Text variant="body-default-xs" onBackground="neutral-weak">
        Conditions change between samples. Use your own judgment.
      </Text>

      <Column gap="0" aria-label="Signal breakdown">
        <Heading variant="label-default-s" as="h3" paddingBottom="4">
          Signals
        </Heading>
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

      <Column gap="8" aria-label="30-day history">
        <Heading variant="label-default-s" as="h3">
          30-day history
        </Heading>
        <Sparkline siteId={site.id} />
      </Column>

      <Column gap="8" aria-label="Site details">
        <Heading variant="label-default-s" as="h3">
          Site details
        </Heading>
        <Column gap="4">
          <Text variant="body-default-s">
            <strong>Launch:</strong> {site.launch_type.replace(/-/g, ' ')}
          </Text>
          <Text variant="body-default-s">
            <strong>Parking:</strong> {site.parking}
            {site.fee && ' · launch fee'}
          </Text>
          <Text variant="body-default-s">
            <strong>Activities:</strong> {site.activity_types.join(', ')}
          </Text>
          {site.notes && (
            <Text variant="body-default-s" onBackground="neutral-weak">
              {site.notes}
            </Text>
          )}
        </Column>
      </Column>

      <Column gap="8" aria-label="Sources">
        <Heading variant="label-default-s" as="h3">
          Sources
        </Heading>
        {contributingSources.length === 0 ? (
          <Text variant="body-default-xs" onBackground="neutral-weak">
            No data sources contributed fresh data to this grade.
          </Text>
        ) : (
          <Column gap="4">
            {contributingSources.map((s) => (
              <Text key={s.id} variant="body-default-xs" onBackground="neutral-medium">
                <strong>{s.name}</strong>
                {s.last_updated && (
                  <span style={{ opacity: 0.7 }}>
                    {' '}
                    · updated {new Date(s.last_updated).toLocaleString()}
                  </span>
                )}
              </Text>
            ))}
          </Column>
        )}
      </Column>

      <Row
        gap="12"
        vertical="center"
        paddingTop="16"
        borderTop="neutral-alpha-weak"
      >
        <Button
          variant="primary"
          size="s"
          onClick={onShare}
          prefixIcon={copied ? 'check' : 'link'}
        >
          {copied ? 'Link copied' : 'Share'}
        </Button>
        <SmartLink href="/methodology">How is this grade calculated?</SmartLink>
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
