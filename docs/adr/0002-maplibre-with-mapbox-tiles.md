# ADR-0002 — MapLibre GL JS rendering with Mapbox Standard tiles

**Status:** Accepted (with documented fallback)
**Date:** 2026-05-13
**Deciders:** project bootstrap

## Context

We need a map rendering library and a tile source. The choice shapes the visual quality, the bundle size, and the long-term cost ceiling.

Constraints:

- ≤ $20/month operational cost
- Mobile performance is the priority — bundle size matters
- Accessibility (color contrast, focus rings, keyboard nav) must be customizable
- Self-hosting paths must remain open in case of provider issues

## Options considered

### Map library

- **MapLibre GL JS** (chosen): open-source fork of Mapbox GL JS v1, free, no token required, ~200 KB gzipped
- Mapbox GL JS (proprietary v2+): token required, similar capabilities, charges per session
- Leaflet: lighter (~40 KB) but raster-only by default, less crisp on retina, harder to do smooth interactions
- OpenLayers: powerful but ~300 KB and overkill for our pin-on-map use case
- Google Maps JS API: paid, vendor lock-in, against the civic-tech ethos

### Tile source

- **Mapbox Standard style** (chosen for MVP): beautiful out of the box, free tier covers 50,000 map loads/month
- Protomaps (self-hosted on R2): genuinely $0/month, requires more setup, less polished default style
- OpenStreetMap raster tiles (Stamen, Carto, OSM.org): free or freemium, raster only (less crisp), some require attribution placement
- MapTiler Cloud: 100,000 tile requests/month free; comparable to Mapbox

## Decision

We will use **MapLibre GL JS** as the rendering library and **Mapbox Standard** as the tile source for MVP. Both work together (MapLibre is API-compatible with Mapbox).

We will keep a documented fallback path to **Protomaps self-hosted on R2** in case Mapbox traffic exceeds the free tier or pricing changes.

## Consequences

### Positive

- **No vendor lock-in to the rendering library.** MapLibre is fully open-source. We could swap the tile source without rewriting our map code.
- **Beautiful default visuals.** Mapbox Standard is a polished style with good defaults for water, land, labels, and contour visibility.
- **Free at MVP scale.** 50,000 loads/month is comfortably above our 30-day expected traffic.
- **Mobile-optimized.** Vector tiles render crisp at any pixel density and respond well to pinch-zoom.

### Negative

- **Mapbox token management:** we need to URL-restrict it to our production and preview domains. Easy but a real ops step.
- **Mapbox free tier could change.** Their pricing history shows they've changed terms before. Hence the fallback path.
- **Protomaps fallback is real work.** Generating and hosting the tiles for the DMV bounding box takes ~2 hours of effort plus a 1.5 GB R2 bucket. We've estimated this and the cost remains within budget.

### Fallback trigger

We switch to Protomaps within 24 hours if any of:

- Mapbox monthly load count exceeds 80% of free tier in two consecutive months
- Mapbox changes pricing such that our projected monthly cost exceeds $5
- Mapbox restricts a feature we depend on

## Related

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) § Frontend
- Runbook (Phase 3) — includes the Mapbox-to-Protomaps switch procedure
