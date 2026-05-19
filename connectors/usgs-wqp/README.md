# USGS Water Quality Portal connector

| Field | Value |
|---|---|
| Source | USGS Water Quality Portal — federal aggregator of every public water-quality sample taken in the US |
| Endpoint | `https://www.waterqualitydata.us/data/Result/search` |
| Auth | None |
| Cadence | weekly |
| License | Public domain (federal) |
| Rate limit | "Be polite"; weekly cadence keeps us deep under |

## What it adds

Real lab-measured **E. coli** and **enterococcus** samples for every USGS station declared in `data/sites.json`. These come from state agencies (MD DNR, VA DEQ, DC DOEE) plus USGS itself, all republished through the federal Water Quality Portal.

This is the cleanest no-key bacterial source we have. For a station like Anacostia at Bladensburg (USGS-01651800), the API returns ~90 samples per year. The connector keeps only the freshest sample per (station × parameter) — historical samples don't drive grading and would just bloat the build artifacts.

## Site connection

The connector reuses each site's existing `usgs-nwis` station declaration. **You do not need to add a separate `usgs-wqp` station** — anywhere a site already has `{ source_id: "usgs-nwis", station_id: "..." }`, this connector queries the same station against the WQP corpus.

## What we pull

| WQP CharacteristicName | Our parameter | Canonical unit |
|---|---|---|
| `Escherichia coli` | `e_coli` | MPN/100mL |
| `Enterococcus` | `enterococcus` | MPN/100mL |
| `Enterococci, calculated value` | `enterococcus` | MPN/100mL |

## Normalization

- **Activity type filter.** Only `Sample-Routine`, `Sample-Integrated Vertical Profile`, and `Field Msr/Obs` are kept. QC replicates, lab blanks, and equipment rinsates are dropped.
- **Status filter.** Records with `ResultStatusIdentifier: "Rejected"` are dropped. `Accepted` → `qc_flag: "final"`, everything else → `"provisional"`.
- **Freshest only.** One record per (station × parameter); freshest by `ActivityStartDate + Time`. The grading rubric only uses the freshest sample anyway.
- **180-day lookback.** USGS publishes most lab data with a 2–6 week lag through state water-science centers; 180 days is enough to capture the freshest available row for almost any station with active monitoring.

## Known failure modes

| Symptom | Cause | Mitigation |
|---|---|---|
| HTTP 503 | WQP maintenance | `ConnectorError({ recoverable: true })`; build keeps the previous week's records. |
| Empty CSV | No matching samples in the lookback window | Logged warning, no records emitted. Site loses the bacterial signal for the week. |
| Long response time | Some agency datasets are large | The connector's response is streamed to text and parsed in one pass; no streaming guards needed at our volume. |

## Testing

```bash
npm test -- connectors/usgs-wqp
```

Fixture: `fixtures/wqp-anacostia.csv` — recorded response for Anacostia at Bladensburg. Re-record with:

```bash
curl 'https://www.waterqualitydata.us/data/Result/search?siteid=USGS-01651800&characteristicName=Escherichia%20coli&mimeType=csv&startDateLo=01-01-2024' > connectors/usgs-wqp/fixtures/wqp-anacostia.csv
```
