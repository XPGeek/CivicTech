'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
const Map = dynamic(() => import('./Map'), { ssr: false });

interface Props {
  initialData: InitialData;
}

export default function MapShell({ initialData }: Props) {
  const [activity, setActivity] = useActivity();
  const [data, setData] = useState<InitialData>(initialData);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);

  const [refreshError, setRefreshError] = useState(false);

  // Refresh from the network on mount so a returning user gets the latest
  // grades without waiting for the next Cloudflare Pages deploy.
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

  return (
    <div className="flex-1 flex flex-col">
      <Header />
      <StaleBanner manifest={data.manifest} />
      {refreshError && (
        <div
          role="status"
          className="bg-slate-100 border-b border-slate-300 text-slate-700 text-xs px-4 py-1"
        >
          Couldn&rsquo;t refresh data — showing the most recent build.
        </div>
      )}
      <div className="relative flex-1 flex flex-col md:flex-row">
        {/* Map */}
        <div className="relative flex-1 min-h-[60vh]">
          <Map
            sites={data.sites}
            activity={activity}
            selectedSiteId={selectedSiteId}
            onSelect={(id) => setSelectedSiteId(id)}
            onUserLocate={nearestPicker}
          />
          <div className="absolute bottom-4 left-4 z-10">
            <ActivityToggle
              activity={activity}
              onChange={(a) => setActivity(a)}
              swimAllowed={swimAllowed}
            />
          </div>
        </div>

        {/* Detail panel: bottom sheet on mobile, sidebar on desktop. */}
        <aside
          aria-label="Site detail"
          className="border-t border-slate-200 bg-white md:border-t-0 md:border-l md:w-[380px] overflow-y-auto max-h-[60vh] md:max-h-none"
        >
          {selectedSite && activeGrade ? (
            <DetailCard
              site={selectedSite}
              grade={activeGrade}
              activity={swimAllowed ? activity : 'paddle'}
              sources={data.sources}
            />
          ) : data.sites.features.length === 0 ? (
            <div className="p-4 text-sm text-slate-600 space-y-3">
              <p className="font-medium text-slate-900">No sites loaded.</p>
              <p>
                If you&rsquo;re running this locally, the build pipeline hasn&rsquo;t run yet.
                Try <code className="bg-slate-100 px-1 rounded">npm run pipeline</code> and
                reload. See{' '}
                <a href="/about" className="underline">
                  the About page
                </a>{' '}
                if you&rsquo;re visiting the live site and seeing this — something is wrong with
                our deploy.
              </p>
            </div>
          ) : (
            <div className="p-4 text-sm text-slate-600 space-y-3">
              <p>
                Tap a pin to see its grade, or use the locate-me button (top right) to find the
                nearest site.
              </p>
              <p>
                {data.sites.features.length} site
                {data.sites.features.length === 1 ? '' : 's'} loaded
                {data.manifest && (
                  <>
                    {' '}
                    · built {new Date(data.manifest.built_at).toLocaleString()}
                  </>
                )}
              </p>
              <Disclaimer />
            </div>
          )}
        </aside>
      </div>
      <DisclaimerInterstitial />
    </div>
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
