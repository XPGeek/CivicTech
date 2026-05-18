# USGS NWIS connector

| Field | Value |
|---|---|
| Source | USGS National Water Information System |
| Endpoint | `https://waterservices.usgs.gov/nwis/iv/` |
| Auth | None |
| Cadence | hourly |
| License | Public domain (federal) |
| Rate limit | Generous; treat ~1 req/sec as a courtesy cap |

## What we pull

The connector queries the **instantaneous values (IV)** endpoint for the union of every station any site declares under `source_id: "usgs-nwis"`. Parameter codes pulled:

| USGS code | Our parameter | Canonical unit |
|---|---|---|
| `00010` | `water_temp` | °C |
| `00060` | `streamflow` | cubic feet per second |
| `00065` | `gauge_height` | feet |
| `00300` | `dissolved_oxygen` | mg/L |
| `63680` | `turbidity` | NTU |

USGS already reports in our canonical units, so no conversion is needed beyond parsing.

## Normalization rules

- Only the most recent observation per (station, parameter) is emitted. Historical points are out of scope for this connector — the build's history endpoint reads from the rolling artifact, not from the live API.
- The qualifier letter (`P`, `A`, `e`) is mapped to the QC flag enum (`provisional`, `final`, `estimated`).
- Sentinel value `-999999` is treated as missing and the record is skipped.
- Stations that don't report a given parameter are silently skipped — not every site has every sensor.

## Citation

Each record has `raw_url` set to `https://waterdata.usgs.gov/nwis/uv?site_no=<station_id>` for direct linking from grade cards.

## Known failure modes

| Symptom | Cause | Mitigation |
|---|---|---|
| 503 Service Unavailable | NWIS maintenance window | Retry with backoff is built into `shared/http`. If sustained > 1h, the build emits "USGS stale" and proceeds. |
| Empty `timeSeries` for some stations | Station inactive or sensor outage | Skipped silently; affected sites lose that signal. Site's grade degrades per rubric. |
| Slow response (>20s) | High load | Per-attempt timeout in `shared/http` aborts and retries. |
| Schema change in `value.timeSeries[].variable.unit` | USGS API revision | `ConnectorError` with code `SHAPE`; build logs structured warning. |

## Testing

```bash
npm test -- connectors/usgs-nwis
```

Tests use a recorded fixture (`fixtures/iv-response.json`) so they don't hit the live API. To re-record the fixture:

```bash
curl 'https://waterservices.usgs.gov/nwis/iv/?format=json&sites=01646500,01651800&parameterCd=00010,00060,00065,00300,63680&siteStatus=active' \
  | python3 -m json.tool > connectors/usgs-nwis/fixtures/iv-response.json
```

## Inner-DMV stations of interest

- `01651000` — Northwest Branch Anacostia River near Hyattsville, MD
- `01649500` — Northeast Branch Anacostia River at Riverdale, MD
- `01651750` — Watts Branch at Washington, DC
- `01646500` — Potomac River near Washington (Little Falls)
- `01651800` — Anacostia River near Bladensburg
- `01652500` — Rock Creek at Sherrill Drive, DC

These are declared in `data/sites.json`. To add a new station, declare it in a site's `stations` array; the connector picks it up automatically — no code change needed.
