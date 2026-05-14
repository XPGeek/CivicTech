# ADR-0003 — Connector interface and normalized record schema

**Status:** Accepted
**Date:** 2026-05-13
**Deciders:** project bootstrap

## Context

We will integrate data from at least four sources for MVP, with more to follow. Each source has its own schema, cadence, and access pattern (JSON API, CSV, scraped PDF, etc.).

Without a strict interface contract, every connector becomes its own snowflake: different error handling, different output shapes, different idioms. This kills our two main contributor goals — "add a new data source in one self-contained file" and "swap a source without touching downstream code."

## Decision

Every data source is implemented as a TypeScript module under `connectors/<source-id>/` that exports two things:

```typescript
export const meta: ConnectorMeta;
export async function fetch(context: ConnectorContext): Promise<NormalizedRecord[]>;
```

`NormalizedRecord` is the universal currency. All connectors emit arrays of this shape — never anything else:

```typescript
interface NormalizedRecord {
  source_id: string;             // e.g. 'usgs-nwis', stable identifier
  station_id: string;            // source's native station ID
  site_ids: string[];            // our site IDs this station informs (1+)
  observed_at: string;           // ISO 8601 UTC; source-reported, not ingestion time
  parameter: Parameter;          // closed enum, see types.ts
  value: number;
  units: string;
  qc_flag?: 'estimated' | 'provisional' | 'final';
  raw_url?: string;              // direct link to source page for citation
}
```

The `parameter` enum is closed and lives in `connectors/shared/types.ts`. Adding a new parameter requires a PR that updates the enum, the grading function, and the UI's display formatter. This friction is intentional — drift in parameter naming is a major risk in multi-source aggregation.

Connectors **do not**:

- Make grading decisions (that's `grading/v1.ts`)
- Know about sites (the join happens in the build step using `data/sites.json`)
- Produce side effects beyond returning records or throwing structured errors
- Write to R2 directly (the build script does that)

## Consequences

### Positive

- Adding a source is a small, isolated change. Reviewer cognitive load is bounded.
- The grading function operates on a single normalized type, not a soup of per-source shapes.
- Connector tests are trivial: feed in a recorded fixture, assert the records array.
- A bad connector cannot corrupt the build — its records are validated against `data/schema/normalized-record.schema.json` before joining.

### Negative

- Source-specific richness is lost. If USGS exposes a "site rating" field, we either map it into our schema or drop it.
- Parameter normalization is fiddly. E. coli reported as "MPN/100mL" by ARK and "mg/L" by some other source needs explicit unit mapping. We will not auto-convert; we will require source-specific normalization to a canonical unit per parameter.

### Canonical units (committed to in this ADR)

| Parameter | Canonical units |
|---|---|
| `e_coli` | MPN/100mL |
| `enterococcus` | MPN/100mL |
| `turbidity` | NTU |
| `dissolved_oxygen` | mg/L |
| `water_temp` | °C |
| `gauge_height` | feet |
| `streamflow` | cubic feet per second |
| `precipitation_48h` | inches |
| `chlorophyll` | µg/L |
| `pH` | unitless |
| `impairment_status` | (no units, value is encoded as 0/1/2 — see types.ts) |

Connectors that receive other units must convert before emitting. Conversion failure is an error, not a silent best-effort.

## Related

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) § Data flow
- [`connectors/README.md`](../../connectors/README.md) — how to write a connector
- ADR-0001 — Static build, no runtime DB (the consumer of these records)
