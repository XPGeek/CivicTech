'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Banner, Button, Column, Row, Text } from '@once-ui-system/core';
import type { Activity, InitialData, SitePinProperties } from '@lib/types';
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
  const triggerGeolocateRef = useRef<(() => void) | null>(null);

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
        const km = haversineKm(coords, [
          feature.geometry.coordinates[0],
          feature.geometry.coordinates[1],
        ]);
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
  const activeActivity: Activity = swimAllowed ? activity : 'paddle';

  return (
    <Column fillWidth fillHeight>
      <Header />
      <StaleBanner manifest={data.manifest} />
      {refreshError && (
        <Banner
          role="status"
          paddingX="16"
          paddingY="8"
          background="neutral-alpha-weak"
          borderBottom="neutral-alpha-weak"
        >
          <Text variant="body-default-xs" onBackground="neutral-medium">
            Couldn&rsquo;t refresh data — showing the most recent build.
          </Text>
        </Banner>
      )}
      <Row
        fillWidth
        className="map-and-panel"
        style={{ flex: 1, minHeight: 0, position: 'relative' }}
        direction="column"
      >
        <Column
          className="map-area"
          style={{ flex: 1, position: 'relative', minHeight: '60vh' }}
          aria-label="Interactive map"
        >
          <SiteMap
            sites={data.sites}
            activity={activeActivity}
            selectedSiteId={selectedSiteId}
            onSelect={(id) => setSelectedSiteId(id)}
            onUserLocate={nearestPicker}
            triggerGeolocateRef={triggerGeolocateRef}
          />
          <div style={{ position: 'absolute', bottom: 16, left: 16, zIndex: 5 }}>
            <ActivityToggle
              activity={activity}
              onChange={(a) => setActivity(a)}
              swimAllowed={swimAllowed}
            />
          </div>
        </Column>

        <Column
          as="aside"
          aria-label="Site detail"
          fillWidth
          className="detail-panel"
        >
          {selectedSite && activeGrade ? (
            <DetailCard
              site={selectedSite}
              grade={activeGrade}
              activity={activeActivity}
              sources={data.sources}
            />
          ) : data.sites.features.length === 0 ? (
            <Column padding="20" gap="12">
              <Text variant="label-default-m" onBackground="neutral-strong">
                No launches loaded.
              </Text>
              <Text variant="body-default-s" onBackground="neutral-medium">
                If you&rsquo;re running this locally, the build pipeline hasn&rsquo;t produced
                data yet. Try <code>npm run pipeline</code> and reload.
              </Text>
            </Column>
          ) : (
            <Column padding="20" gap="16">
              <Column gap="8">
                <Text variant="label-default-s" onBackground="brand-medium">
                  PICK A LAUNCH
                </Text>
                <Text variant="heading-strong-m" onBackground="neutral-strong">
                  Tap a pin to see today&rsquo;s grade.
                </Text>
                <Text variant="body-default-s" onBackground="neutral-medium">
                  {data.sites.features.length} launches across the inner DMV.
                  {data.manifest && (
                    <> Built {new Date(data.manifest.built_at).toLocaleString()}.</>
                  )}
                </Text>
              </Column>
              <Button
                variant="primary"
                fillWidth
                onClick={() => triggerGeolocateRef.current?.()}
                arrowIcon
              >
                Find my nearest launch
              </Button>
              <Disclaimer />
            </Column>
          )}
        </Column>
      </Row>
      <DisclaimerInterstitial />
    </Column>
  );
}

function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
