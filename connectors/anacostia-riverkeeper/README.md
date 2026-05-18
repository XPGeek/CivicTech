# Anacostia Riverkeeper connector

| Field | Value |
|---|---|
| Source | Anacostia Riverkeeper — weekly volunteer bacterial sampling |
| Endpoint | TBD (Swim Guide standard or PDF fallback) |
| Auth | None (when feed is live) |
| Cadence | 6-hourly (data publishes Fridays May–Sept) |
| License | CC BY (Swim Guide), TBD for PDFs |
| Active? | Yes upstream; **fixture-backed in this MVP** |

> ⚠️ **Phase 2 spike pending.** This connector currently reads from a committed JSON fixture (`fixtures/sample-readings.json`) so the end-to-end pipeline and grading rubric can be exercised without depending on an unstable upstream. The shape of the connector — `meta`, `fetch(context)`, normalized `RawReading` intermediate — is identical to what a real implementation needs. Replacing the body of `fetchRaw()` with a real HTTP call is the entire upgrade path.

## Replacement paths (in priority order)

### Option A — Swim Guide open data (preferred)

Anacostia Riverkeeper is a Swim Guide affiliate. Swim Drink Fish maintains an open-data convention at https://github.com/swimdrinkfish/opendata. The feed has historically been quiet on GitHub but the Swim Guide UI does surface current data per site. The Phase 2 spike should:

1. Identify whether the open-data feed is current.
2. If yes, fetch it and parse.
3. If no, fall back to Option B and reach out to Swim Drink Fish about a feed.

### Option B — PDF scrape (fallback)

Anacostia RK publishes a Friday water-quality PDF at https://www.anacostiariverkeeper.org/programs/water-quality-monitoring/. The fallback parser must:

- Match site names in the PDF against `data/sites.json` station IDs.
- Extract E. coli (MPN/100mL), sample date, and any QC notes.
- Emit a structured warning (not silently produce bad data) if the table layout changes year-to-year.

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
