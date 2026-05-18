'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Banner,
  Button,
  Column,
  Heading,
  IconButton,
  RevealFx,
  Row,
  Text,
} from '@once-ui-system/core';
import type {
  Activity,
  InitialData,
  SitePinProperties,
} from '@lib/types';
import { useActivity } from '@lib/activity';
import { fetchGrades, fetchManifest, fetchSites, fetchSources } from '@lib/client-data';
import ActivityToggle from './ActivityToggle';
import DetailCard from './DetailCard';
import Disclaimer from './Disclaimer';
import DisclaimerInterstitial from './DisclaimerInterstitial';
import Header from './Header';
import StaleBanner from './StaleBanner';

// MapLibre touches `window` at import time — load it client-only.
const SiteMap = dynamic(() => import('./Map'), { ssr: false });

interface Props {
  initialData: InitialData;
}

export default function MapShell({ initialData }: Props) {
  const [activity, setActivity] = useActivity();
  const [data, setData] = useState<InitialData>(initialData);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState(false);

  // Refresh from the network on mount so a returning user gets the latest grades.
  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchSites(), fetchGrades(), fetchManifest(), fetchSources()])
      .then(([sites, grades, manifest, sources]) => {
        if (cancelled) return;
        if (!sites || !grades) {
          setRefreshError(true);
          return;
        }
        setData((prev) => ({
          sites,
          grades,
          manifest: manifest ?? prev.manifest,
          sources: sources ?? prev.sources,
        }));
      })
      .catch(() => {
        if (!cancelled) setRefreshError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedSite: SitePinProperties | null = useMemo(() => {
    if (!selectedSiteId) return null;
    return (
      data.sites.features.find((f) => f.properties.id === selectedSiteId)?.properties ?? null
    );
  }, [selectedSiteId, data.sites]);

  const selectedGrades = selectedSiteId ? data.grades[selectedSiteId] : null;

  const nearestPicker = useCallback(
    (coords: [number, number]) => {
      let nearestId: string | null = null;
      let nearestKm = Infinity;
      for (const feature of data.sites.features) {
        const km = haversineKm(
          coords[1],
          coords[0],
          feature.geometry.coordinates[1],
          feature.geometry.coordinates[0],
        );
        if (km < nearestKm) {
          nearestKm = km;
          nearestId = feature.properties.id;
        }
      }
      if (nearestId) setSelectedSiteId(nearestId);
    },
    [data.sites],
  );

  const swimAllowed = selectedSite ? selectedSite.jurisdiction !== 'DC' : true;
  const activeGrade =
    selectedGrades && (activity === 'paddle' ? selectedGrades.paddle : selectedGrades.swim);

  const tally = useMemo(() => {
    const counts = { green: 0, yellow: 0, red: 0, unknown: 0 };
    for (const f of data.sites.features) {
      const g = activity === 'paddle' ? f.properties.grade_paddle : f.properties.grade_swim;
      counts[g] += 1;
    }
    return counts;
  }, [data.sites, activity]);

  return (
    <Column fillWidth fillHeight>
      <Header />
      <StaleBanner manifest={data.manifest} />
      {refreshError && (
        <Banner
          role="status"
          fillWidth
          paddingX="24"
          paddingY="8"
          background="neutral-alpha-weak"
          borderBottom="neutral-alpha-medium"
        >
          <Text variant="body-default-xs" onBackground="neutral-medium">
            Couldn&rsquo;t refresh data — showing the most recent build.
          </Text>
        </Banner>
      )}
      <Row fillWidth flex={1} s={{ direction: 'column' }}>
        {/* Map */}
        <div
          className="map-host"
          style={{ position: 'relative', flex: 1, minHeight: '60vh' }}
        >
          <SiteMap
            sites={data.sites}
            activity={activity}
            selectedSiteId={selectedSiteId}
            onSelect={(id) => setSelectedSiteId(id)}
            onUserLocate={nearestPicker}
          />
          <Row
            gap="8"
            vertical="center"
            paddingX="12"
            paddingY="8"
            radius="full"
            background="page"
            shadow="m"
            style={{
              position: 'absolute',
              bottom: 20,
              left: 20,
              zIndex: 10,
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            <ActivityToggle
              activity={activity}
              onChange={(a) => setActivity(a)}
              swimAllowed={swimAllowed}
            />
          </Row>
          <Row
            gap="8"
            paddingX="12"
            paddingY="4"
            radius="full"
            background="page"
            shadow="s"
            style={{
              position: 'absolute',
              top: 16,
              left: 16,
              zIndex: 10,
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            <Text variant="label-default-xs" onBackground="neutral-medium">
              {tally.green} clean · {tally.yellow} caution · {tally.red} avoid · {tally.unknown}{' '}
              no data
            </Text>
          </Row>
        </div>

        {/* Detail panel */}
        <Column
          as="aside"
          aria-label="Site detail"
          background="page"
          className="detail-panel"
        >
          {selectedSite && activeGrade ? (
            <RevealFx key={selectedSite.id} translateY="2" speed="fast">
              <DetailCard
                site={selectedSite}
                grade={activeGrade}
                activity={swimAllowed ? activity : 'paddle'}
                sources={data.sources}
              />
            </RevealFx>
          ) : data.sites.features.length === 0 ? (
            <Column padding="24" gap="12">
              <Heading variant="heading-strong-m">Nothing to show yet.</Heading>
              <Text variant="body-default-s" onBackground="neutral-medium">
                If you&rsquo;re running this locally, the pipeline hasn&rsquo;t run yet. Try{' '}
                <code style={{ background: 'var(--neutral-alpha-weak)', padding: '0 4px', borderRadius: 4 }}>
                  npm run pipeline
                </code>{' '}
                and refresh.
              </Text>
            </Column>
          ) : (
            <Column padding="24" gap="16">
              <Column gap="8">
                <Heading variant="display-strong-xs">
                  Is the water safe today?
                </Heading>
                <Text variant="body-default-m" onBackground="neutral-medium">
                  Tap any pin to see a plain-English verdict for paddle or swim, with the data
                  behind it.
                </Text>
              </Column>
              <Row gap="8" wrap>
                <Button
                  size="s"
                  variant="primary"
                  onClick={() => {
                    const btn = document.querySelector<HTMLButtonElement>(
                      '.maplibregl-ctrl-geolocate',
                    );
                    btn?.click();
                  }}
                  prefixIcon="world"
                >
                  Find my nearest launch
                </Button>
              </Row>
              <Column gap="4" paddingTop="8">
                <Text variant="label-default-xs" onBackground="neutral-weak">
                  {data.sites.features.length} sites loaded
                  {data.manifest && ` · built ${new Date(data.manifest.built_at).toLocaleString()}`}
                </Text>
              </Column>
              <Disclaimer />
            </Column>
          )}
        </Column>
      </Row>
      <DisclaimerInterstitial />
    </Column>
  );
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
