# NOAA Tides & Currents (CO-OPS) connector

| Field | Value |
|---|---|
| Source | NOAA Center for Operational Oceanographic Products and Services |
| Endpoint | `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter` |
| Auth | None |
| Cadence | hourly |
| License | Public domain (federal) |
| Rate limit | "Reasonable use"; no documented cap |

## What it adds

Real-time **water level** (tide gauge) readings for the inner DMV's tidal Potomac sites. Currently emitted as `parameter: 'gauge_height'` in feet (NAVD datum).

Today's grading rubric doesn't use water level as a verdict input, but the detail card surfaces it alongside the other signals and the methodology page now has a real "is the river rising or falling" signal at the tidal sites — useful context for paddlers planning around tide windows.

## Site connection

Each site that benefits from tide data should declare a `noaa-tides` station in `data/sites.json`:

```json
{ "source_id": "noaa-tides", "station_id": "8594900" }
```

Relevant CO-OPS stations near the inner DMV:

| ID | Location | Covers |
|---|---|---|
| `8594900` | Washington, DC (SW Waterfront) | Anacostia / Potomac inside DC, Hains Point, the Wharf, Diamond Teague |
| `8635150` | Solomons, MD | Downstream Bay; mostly out of scope but useful for Piscataway / National Harbor |
| `8632200` | Kiptopeke, VA | Far south, out of MVP scope |

The Washington gauge (`8594900`) covers almost every tidal site we list.

## Normalization

- `gauge_height` parameter, canonical unit `feet`, NAVD datum.
- `qc_flag`: `v` (verified) → `final`; everything else → `provisional`.
- Latest single reading per station.

## Known failure modes

| Symptom | Cause | Mitigation |
|---|---|---|
| `error.message` in response | Station offline / decommissioned | Logged warning, skipped; affected sites lose tide signal. |
| HTTP 503 | CO-OPS maintenance | Retry-with-backoff via `shared/http`. |
| Stale data (returns yesterday's) | Sensor outage at the station | Visible in the freshness stamp on the detail card. |

## Testing

```bash
npm test -- connectors/noaa-tides
```

Fixture: `fixtures/coops-washington.json`. Re-record with:

```bash
curl 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=water_level&station=8594900&date=latest&datum=NAVD&units=english&time_zone=lst&format=json' \
  > connectors/noaa-tides/fixtures/coops-washington.json
```
