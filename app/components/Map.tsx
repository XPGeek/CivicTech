'use client';

import { useEffect, useRef } from 'react';
import maplibregl, { Map as MapLibreMap, Marker } from 'maplibre-gl';
import type { Activity, SitePinProperties, SitesGeoJson } from '@lib/types';
import { GRADE_PIN_SVG } from '@lib/grade-style';

interface MapProps {
  sites: SitesGeoJson;
  activity: Activity;
  selectedSiteId: string | null;
  onSelect: (id: string) => void;
  onUserLocate?: (coords: [number, number]) => void;
}

const DEFAULT_VIEW = {
  center: [-77.02, 38.9] as [number, number],
  zoom: 11,
};

function buildStyle(): maplibregl.StyleSpecification {
  const useMapbox =
    process.env.NEXT_PUBLIC_MAP_STYLE === 'mapbox' && !!process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (useMapbox) {
    // The Mapbox Standard style URL; MapLibre can consume it because it's a
    // version 8 spec. The token gets appended as a query param.
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
        tiles: [
          'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        ],
        tileSize: 256,
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
        maxzoom: 19,
      },
    },
    layers: [{ id: 'osm-base', type: 'raster', source: 'osm' }],
  };
}

export default function Map({
  sites,
  activity,
  selectedSiteId,
  onSelect,
  onUserLocate,
}: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new globalThis.Map<string, Marker>());

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

    // Geolocate-me button.
    const geo = new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: false, timeout: 6000 },
      trackUserLocation: false,
      showAccuracyCircle: false,
    });
    map.addControl(geo, 'top-right');

    geo.on('geolocate', (e) => {
      const coords = e.target?._lastKnownPosition?.coords;
      if (coords) onUserLocate?.([coords.longitude, coords.latitude]);
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
    // We intentionally don't list onUserLocate as a dep — boot is one-time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-render markers when sites or activity change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const existing = markersRef.current;
    const nextIds = new Set(sites.features.map((f) => f.properties.id));

    // Remove markers that no longer exist.
    for (const [id, marker] of existing) {
      if (!nextIds.has(id)) {
        marker.remove();
        existing.delete(id);
      }
    }

    for (const feature of sites.features) {
      const props = feature.properties;
      const grade = activity === 'paddle' ? props.grade_paddle : props.grade_swim;
      const el = document.createElement('button');
      el.className = 'pin';
      el.type = 'button';
      el.setAttribute(
        'aria-label',
        `${props.name}, ${labelFor(grade)} for ${activity}`,
      );
      el.innerHTML = GRADE_PIN_SVG[grade];
      el.style.cursor = 'pointer';
      if (selectedSiteId === props.id) {
        el.style.transform = 'scale(1.2)';
      }
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onSelect(props.id);
      });

      const prev = existing.get(props.id);
      if (prev) prev.remove();
      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([feature.geometry.coordinates[0], feature.geometry.coordinates[1]])
        .addTo(map);
      existing.set(props.id, marker);
    }
  }, [sites, activity, selectedSiteId, onSelect]);

  // Pan to selection.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedSiteId) return;
    const feature = sites.features.find((f) => f.properties.id === selectedSiteId);
    if (!feature) return;
    map.easeTo({
      center: [feature.geometry.coordinates[0], feature.geometry.coordinates[1]],
      duration: 600,
    });
  }, [selectedSiteId, sites]);

  return <div ref={containerRef} className="absolute inset-0" aria-label="Map of recreation sites" />;
}

function labelFor(grade: 'green' | 'yellow' | 'red' | 'unknown'): string {
  switch (grade) {
    case 'green':
      return 'safe';
    case 'yellow':
      return 'caution';
    case 'red':
      return 'avoid';
    case 'unknown':
      return 'no fresh data';
  }
}
