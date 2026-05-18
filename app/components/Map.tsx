'use client';

import { useEffect, useRef } from 'react';
import maplibregl, { Map as MapLibreMap, Marker } from 'maplibre-gl';
import type { Activity, Grade, SitesGeoJson } from '@lib/types';
import { GRADE_PIN_SVG } from '@lib/grade-style';

interface MapProps {
  sites: SitesGeoJson;
  activity: Activity;
  selectedSiteId: string | null;
  onSelect: (id: string) => void;
  onUserLocate?: (coords: [number, number]) => void;
  /** Receives a function that triggers the geolocate control. */
  triggerGeolocateRef?: React.MutableRefObject<(() => void) | null>;
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
    return {
      version: 8,
      sources: {
        mapbox: {
          type: 'raster',
          tiles: [
            `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`,
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

  // Latest callbacks stashed in refs so the marker effect doesn't re-run when
  // a parent re-renders and passes a new closure.
  const onSelectRef = useRef(onSelect);
  const onUserLocateRef = useRef(onUserLocate);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);
  useEffect(() => {
    onUserLocateRef.current = onUserLocate;
  }, [onUserLocate]);

  // Boot the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildStyle(),
      ...DEFAULT_VIEW,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current = map;

    const geo = new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: false, timeout: 6000 },
      trackUserLocation: false,
      showAccuracyCircle: false,
    });
    map.addControl(geo, 'top-right');

    if (triggerGeolocateRef) {
      triggerGeolocateRef.current = () => geo.trigger();
    }

    // The geolocate event payload follows the standard GeolocationPosition shape.
    geo.on('geolocate', (e) => {
      const pos = e as unknown as GeolocationPosition;
      if (pos?.coords) {
        onUserLocateRef.current?.([pos.coords.longitude, pos.coords.latitude]);
      }
    });

    return () => {
      markersRef.current.forEach(({ marker }) => marker.remove());
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Build or update markers when sites or the active activity change. Selection
  // styling is applied by a separate effect so selecting a pin doesn't churn
  // the entire marker layer.
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
      const prev = existing.get(props.id);

      if (prev) {
        prev.el.innerHTML = GRADE_PIN_SVG[grade];
        prev.el.setAttribute(
          'aria-label',
          `${props.name}, ${GRADE_LABEL[grade]} for ${activity}`,
        );
        continue;
      }

      const el = document.createElement('button');
      el.className = 'pin';
      el.type = 'button';
      el.style.cursor = 'pointer';
      el.setAttribute('aria-label', `${props.name}, ${GRADE_LABEL[grade]} for ${activity}`);
      el.innerHTML = GRADE_PIN_SVG[grade];
      el.addEventListener('click', (event) => {
        event.stopPropagation();
        onSelectRef.current(props.id);
      });

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([feature.geometry.coordinates[0], feature.geometry.coordinates[1]])
        .addTo(map);
      existing.set(props.id, { marker, el });
    }
  }, [sites, activity]);

  // Selection styling: only touch the two affected elements per change.
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

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 bg-slate-100"
      aria-label="Map of recreation sites"
    />
  );
}
