# EPA How's My Waterway (ATTAINS) connector

| Field | Value |
|---|---|
| Source | EPA ATTAINS — Assessment, Total Maximum Daily Load Tracking and Implementation System |
| Endpoint | `https://attains.epa.gov/attains-public/api/assessments` |
| Auth | None |
| Cadence | weekly |
| License | Public domain (federal) |
| Rate limit | Documented in their portal; weekly cadence keeps us under any reasonable cap |

## What we pull

Per-Assessment-Unit impairment status for **primary contact recreation**. We classify the ATTAINS `useAttainmentCode` into three integer values:

| Encoded value | Meaning |
|---|---|
| `0` | Fully supporting primary contact recreation |
| `1` | Partial / not assessed / category 3 |
| `2` | Impaired for primary contact recreation |

The grading rubric ([`GRADING.md`](../../GRADING.md) § 4.5) treats this as a **badge only** — it does not influence the daily traffic-light verdict. It surfaces on the detail card as "Listed as impaired for recreation since 20XX — EPA."

## Site → Assessment Unit mapping

Each site can declare an Assessment Unit by adding an entry to its `stations` array in [`data/sites.json`](../../data/sites.json):

```json
{ "source_id": "epa-hmw", "station_id": "PB12_001" }
```

The `station_id` here is the ATTAINS Assessment Unit Identifier. Inner-DMV AUs of interest are listed in [`docs/sites-curation.md`](../../docs/sites-curation.md).

> **Phase 2 spike pending.** The current `data/sites.json` does not yet declare AU IDs because the AU-to-recreation-site mapping requires a half-day audit against ATTAINS' published catalogues. Until that happens, this connector returns zero records. Adding AU declarations to sites.json is the entire effort — no code change needed.

## Known failure modes

| Symptom | Cause | Mitigation |
|---|---|---|
| Empty `items[]` for a valid AU | AU's reporting cycle changed | Connector logs structured warning; site loses chronic badge until next assessment cycle. |
| Schema drift (`useAttainments` shape) | EPA ATTAINS revision | `ConnectorError` with code `SHAPE`; build emits warning, previous build's record served. |

## Testing

```bash
npm test -- connectors/epa-hmw
```

Fixture: `fixtures/attains-anacostia.json`.
