# Connectors

Each subdirectory under `connectors/` implements **one data source**. The connector contract is defined in [`shared/types.ts`](./shared/types.ts) and explained in [ADR-0003](../docs/adr/0003-connector-interface.md). Adding a new data source is one self-contained TypeScript module plus one workflow-registration line.

> **The contract in one sentence:** a connector is a pure async function that returns an array of `NormalizedRecord` objects. It does not grade, persist, or know about sites.

---

## Directory layout

```
connectors/
  README.md                        ← you are here
  shared/
    types.ts                       ← NormalizedRecord, ConnectorMeta, etc.
    http.ts                        ← fetch helper with retry/backoff
    units.ts                       ← canonical unit conversions
  usgs-nwis/
    index.ts                       ← exports `meta` and `fetch`
    README.md                      ← source-specific docs
    fixtures/                      ← recorded fixtures for tests
    index.test.ts                  ← normalization unit tests
  anacostia-riverkeeper/
    ...
  doee-sondes/
    ...
  epa-hmw/
    ...
  noaa-precip/
    ...
```

---

## The contract

Every connector must export exactly two things:

```typescript
import type { ConnectorMeta, ConnectorContext, NormalizedRecord } from '../shared/types';

export const meta: ConnectorMeta = {
  id: 'my-source',
  name: 'My Data Source',
  cadence: 'hourly',
  license: 'public-domain',
  contact: 'https://example.gov/contact',
};

export async function fetch(context: ConnectorContext): Promise<NormalizedRecord[]> {
  // ...
}
```

### Requirements

- **Pure-ish.** The function may do network I/O. It must not write files, mutate global state, or call other connectors.
- **Deterministic on retry.** If called twice with the same context, it returns the same records (modulo source-side updates). Never include `Date.now()` in record IDs.
- **Validated.** Every emitted record is validated against `data/schema/normalized-record.schema.json` by the build step. Invalid records cause the build to fail.
- **Self-documenting.** Each connector has a `README.md` documenting its endpoint, cadence, fields, license, and known failure modes.
- **Tested.** Each connector has at least one unit test that feeds a recorded fixture into the normalization logic and asserts the output records.
- **No secrets in source.** If credentials are required, they come from `context.env` (sourced from `.env` in dev, GitHub Secrets in CI).

### Failure handling

Connectors should throw a structured error rather than returning partial data:

```typescript
import { ConnectorError } from '../shared/types';

throw new ConnectorError({
  code: 'SOURCE_UNREACHABLE',
  message: 'NWIS responded with 503',
  recoverable: true,
  source_id: meta.id,
});
```

The build step:

- Logs the error structurally
- Reports to Sentry (via the workflow)
- Continues building with the most recent successful data for this source
- Does **not** fail the overall build (per [`ARCHITECTURE.md` § Failure modes](../ARCHITECTURE.md#6-failure-modes-and-graceful-degradation))

---

## How to add a new connector

1. Create `connectors/<source-id>/` (kebab-case ID).
2. Add `index.ts` exporting `meta` and `fetch`.
3. Add `README.md` matching the template in `_template/README.md`.
4. Add `index.test.ts` with at least one normalization test using a recorded fixture.
5. Register the connector in `.github/workflows/connectors.yml` under the appropriate cadence bucket.
6. Add an entry to [`DATA_SOURCES.md`](../DATA_SOURCES.md) with the green-circle status icon.
7. Open a PR. CI runs your normalization tests and lints the records against the schema.

---

## Canonical units

Connectors must emit records in canonical units. The full table is in [ADR-0003](../docs/adr/0003-connector-interface.md). Helpers in `shared/units.ts` cover common conversions:

```typescript
import { fahrenheitToCelsius, mlPerL_to_mgL } from '../shared/units';
```

Unsupported conversions should throw a clear error rather than be approximated.

---

## Cadence buckets

GitHub Actions cron workflows are grouped by cadence:

| Cadence | Cron | Sources |
|---|---|---|
| Hourly | `0 * * * *` | usgs-nwis, doee-sondes, noaa-precip |
| 6-hourly | `0 */6 * * *` | anacostia-riverkeeper |
| Weekly | `0 12 * * 1` | epa-hmw |

A source can shift buckets if its underlying cadence changes; document the move in the connector's `README.md`.

---

## Local development

```bash
# Run a single connector locally; outputs to data/snapshots/dev/
npm run connector:run -- usgs-nwis

# Run all connectors locally
npm run connectors:run

# Run unit tests
npm run test -- connectors/usgs-nwis
```

Local snapshots are gitignored. The frontend in dev mode reads from `data/snapshots/dev/` instead of R2 when `NEXT_PUBLIC_DATA_SOURCE=local`.

---

## Anti-patterns

Things connector authors are tempted to do that they must not:

- ❌ Computing a "good/bad" verdict inside the connector. Grading is centralized.
- ❌ Filtering out records that "look wrong." Emit them with `qc_flag: 'estimated'` and let the grader decide.
- ❌ Caching across runs in module-level state. Each invocation is independent.
- ❌ Reading or writing files outside `data/snapshots/dev/` in tests.
- ❌ Hardcoding station IDs in the connector. Stations come from `data/sites.json` via `context`.
- ❌ Logging via `console.log`. Use the structured logger from `shared/log.ts` (Phase 1 will add).
- ❌ Wrapping `fetch` in a different retry library per connector. Use `shared/http.ts`.

When in doubt, look at how `usgs-nwis` does it. That connector is intended as the reference implementation.
