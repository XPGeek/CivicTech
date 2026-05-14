# ADR-0001 — Static build, no runtime database

**Status:** Accepted
**Date:** 2026-05-13
**Deciders:** project bootstrap

## Context

We need to decide the fundamental shape of the system: serverless API + database, full-stack application, or static-built site with pre-computed data.

Our requirements:

- ≤ $20/month total operating cost (NFR-21)
- Sub-2-second LCP on mobile LTE (NFR-1)
- Connector-modular architecture so civic-tech contributors can add data sources easily (FR-28)
- No user accounts, no user-generated content, no realtime user interaction in MVP
- Six-week MVP delivery with intermittent contributor availability

The data we display has the property that **it changes on the timescale of hours or days, not seconds**. Bacterial samples publish weekly; sonde data updates every 15 minutes; rainfall every hour; EPA impairment status changes annually. There is no interactive query that demands sub-second freshness.

## Options considered

1. **Static build with pre-computed JSON in object storage** (chosen)
2. Serverless API (Cloudflare Workers or Vercel Functions) backed by a managed database (D1, Supabase, Postgres)
3. Full-stack Next.js with API routes and a managed Postgres
4. Realtime stream architecture (Kafka, Materialize, etc.) — included for completeness; obviously overkill

## Decision

We will build a **statically generated frontend** that reads pre-computed JSON snapshots from Cloudflare R2 object storage. All data ingestion happens in scheduled GitHub Actions that run TypeScript connector modules and write JSON artifacts to R2.

There is no runtime database. There is no API server. The frontend is a Cloudflare Pages static deployment.

## Consequences

### Positive

- **Cost:** $0 for compute, $0 for database, ~$0 for R2 at our volume. Domain + Mapbox token are the only line items.
- **Reliability:** No runtime DB to operate. The frontend is just static files. Any single connector failure leaves the site usable.
- **Performance:** First paint is essentially HTML + CSS. Map and data are progressive. Edge caching is automatic.
- **Reproducibility:** Each build is a content-addressed snapshot. Rollback is one click.
- **Contributor friendliness:** Adding a connector is one TypeScript file + one workflow line. No infrastructure knowledge required.
- **Audit:** Every data refresh is a git-traceable build with timestamped artifacts.

### Negative

- **Latency to update:** Data changes appear on the live site after the next scheduled build (hourly for most signals). Acceptable per our cadence requirements.
- **No interactivity:** We cannot accept user input for filtering server-side; everything is client-side. Fine for our scope; would block crowd-sourced features.
- **No notifications:** Email or push alerts require a database. We've explicitly punted those to post-MVP.
- **Lock-in to GitHub Actions** for scheduling. Migration path: a Cloudflare Cron Trigger is a trivial port if needed.

### When to revisit

Revisit if any of the following becomes true:

- We need to ship a feature that requires per-user state (accounts, saved sites, notifications)
- Build size grows beyond ~5 MB total artifacts (currently estimated < 1 MB)
- A data source requires authenticated, per-request fetches (none do today)
- Real-time data (sub-minute freshness) becomes a product requirement

## Related

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — system topology
- ADR-0003 — Connector interface (depends on this choice)
