# Architecture

This document captures the technical shape of the system. Implementation plan is in [`ROADMAP.md`](./ROADMAP.md). Requirements are in [`REQUIREMENTS.md`](./REQUIREMENTS.md). Specific design decisions are recorded as ADRs in [`docs/adr/`](./docs/adr/).

---

## 1. One-paragraph overview

The system is a **statically built map web app** that reads pre-computed JSON snapshots from object storage. Snapshots are produced by a fleet of independent **connectors** (one per data source) that run on a scheduled GitHub Action, normalize the data to a shared record schema, and feed it through a deterministic **grading function** that emits one current grade per site. There is no runtime database, no API server, no user accounts — the static frontend and the scheduled batch jobs are the entire system.

This shape is chosen for three reasons: (1) it stays under $20/month at any traffic level we realistically expect, (2) every layer is independently debuggable and replaceable, (3) civic-tech contributors can add a new data source in one self-contained TypeScript file.

---

## 2. System diagram

```
                       ┌──────────────────────────────────────┐
                       │   GitHub Actions (scheduled cron)    │
                       │   ─────────────────────────────       │
                       │    hourly   ─► usgs-nwis              │
                       │    hourly   ─► doee-sondes            │
                       │    hourly   ─► noaa-precip            │
                       │    6h       ─► anacostia-riverkeeper  │
                       │    weekly   ─► epa-hmw                │
                       └──────────────┬───────────────────────┘
                                      │
                                      ▼
                       ┌──────────────────────────────────────┐
                       │   Normalization layer                 │
                       │   each connector emits                │
                       │   NormalizedRecord[]                  │
                       └──────────────┬───────────────────────┘
                                      │
                                      ▼
                       ┌──────────────────────────────────────┐
                       │   Grading function (grading/v1.ts)    │
                       │   ─────────────────────────────       │
                       │   for each site:                       │
                       │     gather signals within freshness    │
                       │     apply rubric → GradeOutput         │
                       └──────────────┬───────────────────────┘
                                      │
                                      ▼
                       ┌──────────────────────────────────────┐
                       │   Build step                          │
                       │   writes to Cloudflare R2:            │
                       │   • sites.geojson  (pins + grades)   │
                       │   • grades.json    (current grade map)│
                       │   • history/<id>.json  (30d series)  │
                       │   • manifest.json  (build metadata)  │
                       └──────────────┬───────────────────────┘
                                      │
                                      ▼
                       ┌──────────────────────────────────────┐
                       │   Cloudflare Pages (Next.js)          │
                       │   ─────────────────────────────       │
                       │   Static shell, fetches JSON from R2  │
                       │   on load, renders MapLibre GL map    │
                       └──────────────┬───────────────────────┘
                                      │
                                      ▼
                       ┌──────────────────────────────────────┐
                       │   User on phone / desktop             │
                       └──────────────────────────────────────┘
```

---

## 3. Tech stack

### Frontend

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 14+ App Router** | Mature, free hosting on Cloudflare Pages, file-based routing, RSC for fast first paint |
| Map library | **MapLibre GL JS** | Open source, no token required, mature, identical API to legacy Mapbox GL |
| Map tiles | **Mapbox Standard style** | Free tier covers ~50k loads/month, beautiful default style. Fallback path: Protomaps self-hosted on R2 |
| Charts | **Observable Plot** or **Recharts** | Light bundle, accessible by default. Pick during Phase 2. |
| State | **Zustand** or **TanStack Query** | Minimal; we have no user state, just fetched data |
| Styling | **Tailwind CSS** | Cheap, mature, accessible defaults |
| PWA | **next-pwa** or hand-rolled service worker | For offline cache + installability |
| Type system | **TypeScript strict mode** | Non-negotiable for connector contracts |

### Data layer

| Layer | Choice | Why |
|---|---|---|
| Connectors | **TypeScript modules** under `connectors/` | Each is a pure function `() => Promise<NormalizedRecord[]>` |
| Scheduling | **GitHub Actions cron** | Free, simple, audit-logged, no separate scheduler to operate |
| Storage | **Cloudflare R2** | $0 at our volume, S3-compatible, no egress fees |
| Validation | **Zod** or **Ajv** | Validate normalized records against JSON Schema before publishing |
| HTTP client | **Native `fetch`** + small retry helper | No heavy dependency |

### Hosting + ops

| Layer | Choice | Why |
|---|---|---|
| Frontend host | **Cloudflare Pages** | Free, fast, custom domains, preview deployments per PR |
| Object storage | **Cloudflare R2** | Same provider, fewer secrets to manage |
| Analytics | **Cloudflare Web Analytics** or **Plausible self-hosted** | Cookieless, GDPR-friendly, no consent banner |
| Error tracking | **Sentry** free tier | 5k events/month is plenty |
| Uptime | **Better Stack** free tier or Cloudflare-built | Status page + 1 monitor free |
| Domain | **Cloudflare Registrar** | At-cost pricing, integrated DNS |

### Out-of-stack (explicit)

- **No runtime database.** All data is precomputed JSON in R2. Adding one would invalidate the cost model and is a Phase 2+ decision (deferred to notifications work).
- **No backend API server.** Frontend reads R2 directly. CORS configured on bucket.
- **No CMS.** Site catalog and copy are version-controlled in this repo.
- **No auth.** No login screen, no JWT, no Cognito, no Auth0.
- **No queue, no Redis, no Postgres, no Kafka.** This is a six-week MVP, not a microservices kata.

---

## 4. Data flow

### 4.1 The connector contract

Every data source is implemented as a TypeScript module under `connectors/<source-id>/`. The module exports:

```typescript
export const meta: ConnectorMeta = {
  id: 'usgs-nwis',
  name: 'USGS National Water Information System',
  cadence: 'hourly',
  license: 'public-domain',
  contact: 'https://water.usgs.gov/contact/',
};

export async function fetch(
  context: ConnectorContext
): Promise<NormalizedRecord[]>;
```

The `NormalizedRecord` type is the universal currency:

```typescript
interface NormalizedRecord {
  source_id: string;             // e.g. 'usgs-nwis'
  station_id: string;            // source's native station ID
  site_ids: string[];            // our site IDs this station informs (1+)
  observed_at: string;           // ISO 8601 timestamp, source-reported
  parameter: Parameter;          // enum: 'e_coli' | 'turbidity' | etc.
  value: number;
  units: string;                 // 'MPN/100mL' | 'NTU' | 'mg/L' | etc.
  qc_flag?: 'estimated' | 'provisional' | 'final';
  raw_url?: string;              // citation back to source page
}
```

This shape is intentionally narrow. Connectors do **not** make grading decisions. They do **not** know about sites until the join step. They produce raw timestamped observations, period.

### 4.2 The join step

After all connectors run, a build script joins records to sites using the `data/sites.json` catalog. Each site declares which stations inform it:

```json
{
  "id": "buzzard-point",
  "name": "Buzzard Point Marina",
  "lat": 38.8636,
  "lon": -77.0218,
  "activity_types": ["paddle", "row"],
  "stations": [
    { "source_id": "anacostia-riverkeeper", "station_id": "ARK-MAIN-1" },
    { "source_id": "usgs-nwis", "station_id": "01651800" },
    { "source_id": "doee-sondes", "station_id": "ANA-3" },
    { "source_id": "noaa-precip", "station_id": "KDCA" }
  ]
}
```

The join is many-to-many. A station can inform multiple sites. A site can be informed by multiple stations.

### 4.3 Grading

The grading function (`grading/v1.ts`) takes one site's worth of normalized records and produces:

```typescript
interface GradeOutput {
  site_id: string;
  grade: 'green' | 'yellow' | 'red' | 'unknown';
  computed_at: string;
  reason: string;                // one-sentence human-readable
  signals: {
    bacteria?: SignalState;
    rainfall?: SignalState;
    sonde?: SignalState;
    chronic?: SignalState;
  };
}

interface SignalState {
  status: 'pass' | 'caution' | 'fail' | 'stale' | 'missing';
  observed_at: string;
  value: number;
  units: string;
  freshness_age_hours: number;
}
```

Full rubric details are in [`GRADING.md`](./GRADING.md). The function is **pure** (no I/O), so it is straightforward to unit-test against historical snapshots.

### 4.4 Build output

The build emits four artifact families to R2:

| Artifact | Path | Size estimate | Cadence |
|---|---|---|---|
| Site pins + grades | `sites.geojson` | ~50 KB | every connector run |
| Current grades map | `grades.json` | ~20 KB | every connector run |
| Per-site 30-day history | `history/<site-id>.json` | ~10 KB each, ~500 KB total | every connector run |
| Build manifest | `manifest.json` | < 1 KB | every connector run |

The frontend fetches `sites.geojson` and `grades.json` on initial load; `history/<site-id>.json` is fetched lazily when a user opens a detail card.

---

## 5. Frontend topology

### 5.1 Routes

```
/                          # Map + bottom sheet on mobile, sidebar on desktop
/site/<site-id>            # Standalone detail page (deep-linkable, shareable)
/methodology               # How grades are computed (plain English)
/about                     # Credits, data sources, disclaimer
/api/og?site=<site-id>     # Edge-rendered Open Graph image for shares
```

All routes are statically generated at build time except `/api/og`, which runs as a Cloudflare Pages Function.

### 5.2 Rendering strategy

- **Map shell**: client-rendered (MapLibre requires DOM).
- **Site detail**: server-rendered from build-time JSON, hydrated client-side for interactions.
- **History chart**: lazy-loaded on detail open.

### 5.3 Caching

- `sites.geojson` and `grades.json`: cached by service worker with `stale-while-revalidate`. Showing slightly stale pins for 1 minute is fine.
- `history/<id>.json`: cached forever in service worker; build hash query string invalidates.
- Mapbox tiles: cached by browser per their default headers.

---

## 6. Failure modes and graceful degradation

Reliability is achieved by **making no single failure fatal**, not by making each component highly available.

| Failure | Detection | Behavior |
|---|---|---|
| One connector errors | Action job logs + Sentry | Build proceeds; that source's data shows "stale" on affected sites. Grades degrade gracefully. |
| All connectors error | Action job fails entirely | No new artifacts uploaded. Frontend serves previous build. Banner: "data may be delayed." |
| R2 unreachable | Frontend fetch fails | Service worker serves last cached data with offline banner. |
| Cloudflare Pages outage | External monitoring | No automated mitigation. Accept SLO of 99.5% monthly. |
| Mapbox token exceeds free tier | Mapbox error in console | Manual switch to Protomaps self-hosted tiles. Runbook documents this. |
| Source schema changes (e.g., USGS adds a field) | Zod validation fails | Connector emits structured warning; partial data still flows. Triggers maintenance ticket. |

---

## 7. Security

- All third-party API tokens stored as GitHub repository secrets.
- Mapbox token URL-restricted to production and preview domains.
- R2 bucket configured with CORS allowing only our domains for `GET`; no `PUT/DELETE` from the public internet.
- Dependabot enabled for npm.
- No user input is accepted anywhere in the app (no comment forms, no search inputs that hit servers); thus no input validation surface area.

---

## 8. Observability

- **Logs**: GitHub Actions stdout for connector runs. Retention: 90 days (default).
- **Errors**: Sentry for frontend; connector errors thrown as Sentry events from within the Action via `@sentry/node`.
- **Metrics**: Cloudflare Web Analytics for pageviews, top sites, geography. No user-level data.
- **Uptime**: Better Stack monitor on the homepage URL. Alerts to email.
- **Build status**: Failing connector workflow posts to a Slack webhook (post-Phase 1).

---

## 9. Local development

```bash
git clone <repo>
cd dmv-water-watch
npm install
cp .env.example .env             # add MAPBOX_TOKEN
npm run dev                      # Next.js dev server
npm run connectors:run -- usgs   # run a single connector locally
npm run grading:test             # snapshot tests for grading rubric
npm run build                    # production build
```

Connectors write to a local `data/snapshots/` directory in dev. The frontend reads from there instead of R2 when `NEXT_PUBLIC_DATA_SOURCE=local`.

---

## 10. Deployment

- **Frontend**: Cloudflare Pages auto-deploys on push to `main`. Preview deployments for every PR.
- **Connectors**: GitHub Actions cron, separate workflow per cadence (hourly, six-hourly, weekly).
- **Manual rebuilds**: workflow_dispatch trigger on the connector workflow for ad-hoc refreshes.
- **Rollback**: Cloudflare Pages keeps 100 previous deployments; one-click rollback. R2 snapshots are immutable per-build via a content hash; older builds can be re-pointed by editing `manifest.json` if data is bad.

---

## 11. Decisions logged as ADRs

See [`docs/adr/`](./docs/adr/):

- ADR-0001 — Static build, no runtime database
- ADR-0002 — MapLibre GL + Mapbox tiles (with Protomaps fallback documented)
- ADR-0003 — Connector interface and normalized record schema
- ADR-0004 — Grading rubric v1 (paddle/swim split, rainfall override, freshness windows)
