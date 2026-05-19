'use client';

import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import maplibregl, { Map as MapLibreMap, Marker } from 'maplibre-gl';
import type { Activity, Grade, SitesGeoJson } from '@lib/types';
import { pinSvgFor } from '@lib/grade-style';

interface MapProps {
  sites: SitesGeoJson;
  activity: Activity;
  selectedSiteId: string | null;
  onSelect: (id: string) => void;
  onUserLocate?: (coords: [number, number]) => void;
  /** Receives a `trigger()` so the parent can fire geolocate from a CTA. */
  triggerGeolocateRef?: RefObject<(() => void) | null>;
}

interface MarkerEntry {
  marker: Marker;
  el: HTMLElement;
}

const DEFAULT_VIEW = {
  center: [-77.02, 38.9] as [number, number],
  zoom: 11,
};

const GRADE_LABEL: Record<Grade, string> = {
  green: 'safe',
  yellow: 'caution',
  red: 'avoid',
  unknown: 'no fresh data',
};

function buildStyle(): maplibregl.StyleSpecification {
  const useMapbox =
    process.env.NEXT_PUBLIC_MAP_STYLE === 'mapbox' && !!process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (useMapbox) {
    // Raster tiles at 512px @2x for sharp text on retina. MapLibre can't
    // consume Mapbox's vector style URL directly because the v8 spec
    // includes a top-level `name` property MapLibre rejects.
    return {
      version: 8,
      sources: {
        mapbox: {
          type: 'raster',
          // mapbox/outdoors-v12 has the right palette for a paddler app:
          // bluer water, greener parks, hiking + boat-launch icons surfaced.
          // streets-v12 is the safe default but renders too light for our DMV
          // viewport which is mostly residential. Override via the
          // NEXT_PUBLIC_MAPBOX_STYLE env var if needed.
          tiles: [
            `https://api.mapbox.com/styles/v1/mapbox/${
              process.env.NEXT_PUBLIC_MAPBOX_STYLE || 'outdoors-v12'
            }/tiles/512/{z}/{x}/{y}@2x?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`,
          ],
          tileSize: 512,
          attribution: '© Mapbox © OpenStreetMap contributors',
        },
      },
      layers: [{ id: 'mapbox-base', type: 'raster', source: 'mapbox' }],
    };
  }
  return {
    version: 8,
    sources: {
      osm: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
        maxzoom: 19,
      },
    },
    layers: [{ id: 'osm-base', type: 'raster', source: 'osm' }],
  };
}

export default function SiteMap({
  sites,
  activity,
  selectedSiteId,
  onSelect,
  onUserLocate,
  triggerGeolocateRef,
}: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Map<string, MarkerEntry>>(new Map());
  const previousSelectedRef = useRef<string | null>(null);

  const onSelectRef = useRef(onSelect);
  const onUserLocateRef = useRef(onUserLocate);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);
  useEffect(() => {
    onUserLocateRef.current = onUserLocate;
  }, [onUserLocate]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;
    const map = new maplibregl.Map({
      container,
      style: buildStyle(),
      ...DEFAULT_VIEW,
      attributionControl: { compact: true },
      // Default is `window.devicePixelRatio` but some embeddings (Next.js
      // dev previews, headless screenshots) report 1 at construction. Force
      // the real DPR so retina screens get the full-res @2x tiles painted
      // sharp instead of downsampled.
      pixelRatio:
        typeof window !== 'undefined' && window.devicePixelRatio
          ? window.devicePixelRatio
          : 1,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current = map;

    // MapLibre measures the container once at construction and never
    // remeasures unless the *window* resizes (per its trackResize default).
    // Layout reflow inside our flex grid doesn't trigger it. The fix is a
    // stack of resize hooks:
    //   1. ResizeObserver for runtime reflow (sidebar opens, viewport rotate).
    //   2. `load` event resize so the canvas snaps to size as soon as the
    //      style finishes loading.
    //   3. A short setTimeout backstop for environments where (2) misses.
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(container);
    map.on('load', () => map.resize());
    const resizeTimer = window.setTimeout(() => map.resize(), 400);

    const geo = new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: false, timeout: 6000 },
      trackUserLocation: false,
      showAccuracyCircle: false,
    });
    map.addControl(geo, 'top-right');

    if (triggerGeolocateRef) {
      triggerGeolocateRef.current = () => geo.trigger();
    }

    geo.on('geolocate', (e) => {
      const pos = e as unknown as GeolocationPosition;
      if (pos?.coords) {
        onUserLocateRef.current?.([pos.coords.longitude, pos.coords.latitude]);
      }
    });

    return () => {
      ro.disconnect();
      clearTimeout(resizeTimer);
      markersRef.current.forEach(({ marker }) => marker.remove());
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
      if (triggerGeolocateRef) triggerGeolocateRef.current = null;
    };
  }, [triggerGeolocateRef]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const existing = markersRef.current;
    const nextIds = new Set(sites.features.map((f) => f.properties.id));

    for (const [id, { marker }] of existing) {
      if (!nextIds.has(id)) {
        marker.remove();
        existing.delete(id);
      }
    }

    for (const feature of sites.features) {
      const props = feature.properties;
      const grade = activity === 'paddle' ? props.grade_paddle : props.grade_swim;
      const stale = activity === 'paddle' ? props.stale_paddle : props.stale_swim;
      const svg = pinSvgFor(grade, stale);
      const ariaLabel = `${props.name}, ${GRADE_LABEL[grade]} for ${activity}${
        stale ? ' (last known)' : ''
      }`;
      const prev = existing.get(props.id);

      if (prev) {
        prev.el.innerHTML = svg;
        prev.el.setAttribute('aria-label', ariaLabel);
        continue;
      }

      const el = document.createElement('button');
      el.className = 'pin';
      el.type = 'button';
      el.style.cursor = 'pointer';
      el.innerHTML = svg;
      el.addEventListener('click', (event) => {
        event.stopPropagation();
        onSelectRef.current(props.id);
      });

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([feature.geometry.coordinates[0], feature.geometry.coordinates[1]])
        .addTo(map);
      // MapLibre's addTo overrides aria-label with its default "Map marker"
      // string. Reset ours after so screen readers say the site name.
      el.setAttribute('aria-label', ariaLabel);
      existing.set(props.id, { marker, el });
    }
  }, [sites, activity]);

  useEffect(() => {
    const prevId = previousSelectedRef.current;
    if (prevId !== selectedSiteId) {
      const prevEntry = prevId ? markersRef.current.get(prevId) : undefined;
      if (prevEntry) prevEntry.el.style.transform = '';
      const nextEntry = selectedSiteId ? markersRef.current.get(selectedSiteId) : undefined;
      if (nextEntry) nextEntry.el.style.transform = 'scale(1.2)';
      previousSelectedRef.current = selectedSiteId;
    }

    const map = mapRef.current;
    if (!map || !selectedSiteId) return;
    const feature = sites.features.find((f) => f.properties.id === selectedSiteId);
    if (!feature) return;
    map.easeTo({
      center: [feature.geometry.coordinates[0], feature.geometry.coordinates[1]],
      duration: 600,
    });
  }, [selectedSiteId, sites]);

  return <div ref={containerRef} className="map-canvas" aria-label="Map of recreation sites" />;
}
