# NOAA precipitation connector

| Field | Value |
|---|---|
| Source | NOAA / National Weather Service |
| Endpoint | `https://api.weather.gov/stations/{id}/observations` |
| Auth | None (User-Agent identification required) |
| Cadence | hourly |
| License | Public domain (federal) |
| Rate limit | "Reasonable use"; identify with a User-Agent string |

## What we pull

A 48-hour precipitation total in inches for the nearest NOAA station to each site. This drives the rainfall override in the grading rubric (see [`GRADING.md`](../../GRADING.md) § 3 Step 3).

Stations declared in `data/sites.json`:

- `KDCA` — Reagan National Airport (central DC, Arlington)
- `KIAD` — Dulles (western suburbs)
- `KCGS` — College Park (PG, northeast suburbs)
- `KGAI` — Gaithersburg (upper Montgomery)

## Normalization rules

NWS reports precipitation in millimetres; we convert to inches (canonical unit). The connector emits one record per station with `parameter: 'precipitation_48h'`.

The sum walks forward through observations and prefers smaller windows (1h > 3h > 6h) to maximize precision and avoid double-counting. Missing slots are tracked; if more than 25% of expected hourly slots are missing, the record is flagged with `qc_flag: 'estimated'`.

## Known failure modes

| Symptom | Cause | Mitigation |
|---|---|---|
| 404 on station ID | Station decommissioned | Station logged and skipped; affected sites lose rainfall signal until `data/sites.json` is updated. |
| `precipitationLastHour: null` for every observation | Some stations report only 6-hour totals | Fallback chain to 3h then 6h windows in `sumPrecipitationMm`. |
| Sustained 5xx | NWS API maintenance | Retry with backoff via `shared/http`. Last successful build's value remains served. |

## Testing

```bash
npm test -- connectors/noaa-precip
```

Fixture: `fixtures/kdca-48h.json` — a recorded observations response. Re-record with:

```bash
START=$(date -u -v-48H +"%Y-%m-%dT%H:%M:%SZ")
curl "https://api.weather.gov/stations/KDCA/observations?start=${START}" \
  -H "User-Agent: dmv-water-watch (admin@example.org)" \
  | python3 -m json.tool > connectors/noaa-precip/fixtures/kdca-48h.json
```
