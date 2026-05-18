# Anacostia Riverkeeper connector

| Field | Value |
|---|---|
| Source | Anacostia Riverkeeper — weekly volunteer bacterial sampling |
| Endpoint | TBD (Swim Guide standard or PDF fallback) |
| Auth | None (when feed is live) |
| Cadence | 6-hourly (data publishes Fridays May–Sept) |
| License | CC BY (Swim Guide), TBD for PDFs |
| Active? | Yes upstream; **fixture-backed in this MVP** |

> ⚠️ **Fixture-backed pending API key from Swim Drink Fish.** Phase 2 spike (2026-05-18) confirmed Anacostia Riverkeeper publishes weekly DC + biweekly MD bacterial results via the Swim Guide platform. The connector currently reads from a committed JSON fixture (`fixtures/sample-readings.json`) so the end-to-end pipeline exercises the bacterial-signal path. Replacing the body of `fetchRaw()` with a real HTTP call is the entire upgrade path once an API token is in hand.

## Replacement paths (in priority order)

### Option A — Swim Guide v1 API (preferred)

Anacostia Riverkeeper is a Swim Guide affiliate. Spike findings (2026-05-18):

- Swim Guide exposes `https://www.theswimguide.org/api/v1/beach` — confirmed via WebFetch returning HTTP 401 Unauthorized (the endpoint exists but is auth-gated).
- Their open-data **standards** repo (`github.com/swimdrinkfish/opendata`) is a spec, not a feed. Real data lives behind the API.
- 8 Anacostia Riverkeeper Swim Guide stations are public:

  | Station name | Jurisdiction |
  |---|---|
  | Anacostia Park | DC |
  | Bladensburg Waterfront Park | MD-PG |
  | Buzzard Point | DC |
  | Hickey Run | DC |
  | Kingman Lake | DC |
  | Lower Beaverdam Creek | MD-PG |
  | National Arboretum | DC |
  | Northeast Branch at Campus Drive | MD-PG |

**Implementation outline:**

```typescript
async function fetchRaw(context: ConnectorContext): Promise<RawReading[]> {
  const token = context.env.SWIM_GUIDE_API_TOKEN;
  if (!token) {
    context.log.warn('SWIM_GUIDE_API_TOKEN missing; falling back to fixture');
    return readFixture();
  }
  // Per /api/v1/beach docs (to be obtained from Swim Drink Fish):
  //   GET /api/v1/affiliates/anacostia-riverkeeper/beaches
  //   Authorization: Token <token>
  // Returns { beaches: [{ id, name, current_sample: { e_coli, taken_at, ... } }] }
  // Map name → station_id in data/sites.json.
}
```

**To obtain a token:** Email Gabrielle Parent-Doliner at gabrielle@swimdrinkfish.ca (per their public contact). The outreach template is in [`docs/outreach.md`](../../docs/outreach.md) § 3.1. They allocate keys for non-commercial civic projects.

### Option B — Chesapeake Monitoring Cooperative (alternative)

Anacostia RK's data is also accessible via CMC at `https://cmc.vims.edu/data-explorer`. Their UI does support filtered exports; an API path may exist but wasn't confirmed during the spike. Spike continuation: open browser DevTools on the CMC explorer and inspect the network tab while filtering by an ARK group ID.

### Option C — PDF scrape (fallback)

Anacostia RK publishes annual PDF reports (e.g., "2025 DC Water Quality Report") at https://www.anacostiariverkeeper.org/programs/water-quality-monitoring/. The page does **not** appear to publish weekly results as standalone PDFs — those go directly to Swim Guide. PDF scraping would only yield annual rollups, which are too stale for daily grading.

### Option D — Direct request

Their water-quality page links a "Request Data" form that grants access to their full dataset. This is the slowest path but the cleanest one for a long-term partnership; document the outreach in `docs/outreach-log.md` (gitignored).

## Cold outreach

Before either option ships in production, reach out to Anacostia Riverkeeper per [`docs/outreach.md`](../../docs/outreach.md) § 3.1. We don't need permission to use their published data, but the right way to build this is with them.

## Schema

The fixture and any future real fetcher must emit `RawReading[]` matching:

```typescript
interface RawReading {
  station_id: string;     // matches station_id declared in data/sites.json
  observed_at: string;    // ISO 8601 timestamp of when the water was sampled
  e_coli_mpn?: number;    // Primary signal — drives the grading rubric
  turbidity_ntu?: number; // Optional sanity check
  ph?: number;
  water_temp_c?: number;
}
```

Only readings whose `station_id` matches one declared in `data/sites.json` are emitted as `NormalizedRecord`s. Stations referenced in the fixture but not in sites.json are ignored.

## Testing

```bash
npm test -- connectors/anacostia-riverkeeper
```
