# Data Sources

This document catalogs every data source we use or plan to use, with the engineering detail needed to write or maintain a connector. Each source entry is structured identically so they can be diffed, compared, and triaged.

> **Connector status legend:** 🟢 in MVP scope · 🟡 planned post-MVP · ⚪️ evaluated, deferred

---

## MVP flagship sources

### 🟢 USGS Water Quality Portal (WQP)

| Field | Value |
|---|---|
| Connector | `connectors/usgs-wqp/` |
| Phase | 4 |
| Cadence | Weekly |
| Auth | None |
| Format | CSV |
| License | Public domain (federal aggregator of state agency lab data) |
| Endpoint | `https://www.waterqualitydata.us/data/Result/search` |

**What we pull:** lab-measured **E. coli** and **enterococcus** samples for every USGS station declared by a site. WQP is the federal aggregator of every public water-quality sample taken in the US — for our stations it republishes MD DNR, VA DEQ, DC DOEE, and USGS NWIS sampling.

**Reuses NWIS station declarations.** Anywhere a site has `{ source_id: "usgs-nwis", station_id: "..." }`, this connector queries the same station against the WQP corpus — no extra declarations needed in `data/sites.json`.

**Known lag.** State agencies upload to WQP with a 1–6 month lag. We pull a 3-year lookback and keep only the freshest sample per (station × parameter). When fresher samples land in WQP, they're picked up on the next weekly build.

**Strengths:** federally authoritative, no key, free, covers the entire US.

**Risks:** the freshest WQP sample may be months old, in which case the rubric marks the bacteria signal as stale. Use alongside (eventually) Swim Guide for fresh weekly readings.

### 🟢 NOAA Tides & Currents (CO-OPS)

| Field | Value |
|---|---|
| Connector | `connectors/noaa-tides/` |
| Phase | 4 |
| Cadence | Hourly |
| Auth | None |
| Format | JSON |
| License | Public domain (federal) |
| Endpoint | `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter` |

**What we pull:** real-time **water level** readings at the NOAA CO-OPS Washington station (`8594900`) and any other CO-OPS station declared by a site. Emitted as `gauge_height` in feet (NAVD datum).

**Stations of interest:**
- `8594900` — Washington, DC (Potomac at SW Waterfront). Covers every tidal site inside the DMV.
- `8635150` — Solomons, MD. Useful for southern Potomac sites.

**Use.** Tide data is contextual on the detail card; it doesn't drive the grading verdict today. Future iterations can use it to compute "next high tide" for paddle-planning copy.

### 🟢 USGS National Water Information System (NWIS)

| Field | Value |
|---|---|
| Connector | `connectors/usgs-nwis/` |
| Phase | 1 |
| Cadence | Hourly |
| Auth | None |
| Format | JSON |
| License | Public domain (federal data) |
| Endpoint | `https://waterservices.usgs.gov/nwis/iv/?format=json&sites={ids}&parameterCd={params}` |
| Contact | https://water.usgs.gov/contact/ |
| Rate limit | Generous; ~per-second is fine |
| Active? | Yes — federal program, well-maintained |

**What we pull**

| Parameter code | Meaning | Our `parameter` enum |
|---|---|---|
| `00010` | Water temperature (°C) | `water_temp` |
| `00060` | Streamflow (ft³/s) | `streamflow` |
| `00065` | Gauge height (ft) | `gauge_height` |
| `00300` | Dissolved oxygen (mg/L) | `dissolved_oxygen` |
| `63680` | Turbidity (NTU) | `turbidity` |

**Inner-DMV stations of interest** (curate the full list during Phase 1):

- `01651000` — Northwest Branch Anacostia River near Hyattsville, MD
- `01649500` — Northeast Branch Anacostia River at Riverdale, MD
- `01651750` — Watts Branch at Washington, DC
- `01646500` — Potomac River near Washington (Little Falls)
- `01652500` — Rock Creek at Sherrill Drive, DC

**Strengths**: rock-solid API, real-time data, no scraping required.

**Risks / gotchas**: not every station reports every parameter. The connector should query each station for its available parameters at startup and emit only what's there. NWIS does occasional maintenance windows; handle 5xx with retries.

---

### 🟢 Anacostia Riverkeeper (via Swim Guide open data, with PDF scrape fallback)

| Field | Value |
|---|---|
| Connector | `connectors/anacostia-riverkeeper/` |
| Phase | 2 |
| Cadence | Every 6 hours (data publishes Fridays during May–Sept) |
| Auth | None for Swim Guide; none for PDF |
| Format | JSON (Swim Guide standard) or PDF (fallback) |
| License | CC BY (Swim Guide open data terms); to confirm for PDFs |
| Endpoint | https://github.com/swimdrinkfish/opendata defines the standard; check `theswimguide.org/affiliates/anacostia-riverkeeper` for current feed URL |
| Fallback URL | https://www.anacostiariverkeeper.org/programs/water-quality-monitoring/ (weekly PDF report) |
| Contact | info@anacostiariverkeeper.org |
| Rate limit | Be polite; weekly source updates so no need to hammer |
| Active? | Yes — actively sampling, posts every Friday May–Sept |

**What we pull**

- E. coli (MPN/100mL) at ~24 inner-DMV sites
- Turbidity, pH, water temp at the same sites
- Sample timestamp (when the water was collected, not when published)

**Stations (per Anacostia Riverkeeper's published list, subject to change)**

Anacostia mainstem and Watts Branch in DC; Northwest Branch and Sligo Creek in Montgomery County; Northeast Branch and Long Branch in Prince George's County. ~24 sites total. Cross-reference our `data/sites.json` so each ARK station maps to one or more recreation sites.

**Strengths**: only authoritative bacterial source for inner Anacostia at consumer granularity. Trusted by paddlers.

**Risks / gotchas**:
- Swim Guide's open-data feed has been quiet since 2017–2018 per public GitHub history; confirm during Phase 2 spike that data actually flows there in current season. If not, fall back to PDF scraping.
- PDF format may change year to year. The fallback parser must validate the schema each run and emit a structured warning on mismatch rather than silently producing bad data.
- October–April: no sampling. Connector must handle the off-season gracefully and not emit fake "no data" as "fail" (see [`GRADING.md`](./GRADING.md) § 4.3).

**Cold outreach** (see [`docs/outreach.md`](./docs/outreach.md)): once a working prototype exists, reach out to offer attribution and ask if a direct data feed is preferable to scraping.

---

### 🟢 DC DOEE — real-time YSI sondes

| Field | Value |
|---|---|
| Connector | `connectors/doee-sondes/` |
| Phase | 2 |
| Cadence | Hourly (sondes report every 15 min; hourly is fine) |
| Auth | TBD — agency dashboards are typically open; some require account |
| Format | TBD — likely CSV or JSON via their data portal |
| License | Public (DC government open data) |
| Endpoint | doee.dc.gov/service/environmental-data-maps (entry point); specific data export URLs to be confirmed during Phase 2 spike |
| Contact | doee.communications@dc.gov |
| Rate limit | Unknown; be conservative — hourly is plenty |
| Active? | Yes — public dashboard launched 2023, actively monitored |

**What we pull**

- Water temperature
- Dissolved oxygen
- pH
- Depth (gauge height proxy)
- Chlorophyll fluorescence (algal bloom proxy)
- Turbidity

**Stations**: DOEE operates real-time sondes on Anacostia River and Potomac River within DC. Exact station list to be confirmed during the Phase 2 spike. Initial estimate: 3–5 sondes spanning Buzzard Point to Bladensburg-DC-line.

**Strengths**: only **real-time** water-quality source for DC waters. Massive credibility lift; nobody else surfaces this for consumers.

**Risks / gotchas**:
- This is the source I'm most uncertain about format-wise. **First Phase 2 task is a spike** to confirm the data export pattern; spend a half-day before committing to the connector design.
- DOEE may rename or move the dashboard. Build the connector against a documented URL; alert on 404.
- Sonde data has its own QC flags (estimated vs final); preserve those in the `qc_flag` field of `NormalizedRecord`.

---

### 🟢 EPA How's My Waterway / ATTAINS

| Field | Value |
|---|---|
| Connector | `connectors/epa-hmw/` |
| Phase | 2 |
| Cadence | Weekly (impairment data moves slowly) |
| Auth | None |
| Format | JSON |
| License | Public domain (federal) |
| Endpoint | `https://attains.epa.gov/attains-public/api/...` (see ATTAINS docs) |
| Contact | https://www.epa.gov/waterdata |
| Rate limit | Documented; respect their guidance |
| Active? | Yes |

**What we pull**

- Assessment Unit (AU) impairment status for relevant Anacostia, Potomac, Rock Creek waterbodies
- Specific impairment causes (bacteria, sediment, nutrients) per AU
- Year of most recent assessment

**Stations**: not station-based; this is per-waterbody, per-state assessment data. We map each recreation site to the AU containing it.

**Strengths**: federally authoritative; the "chronic context" badge that makes our cards feel grown-up.

**Risks / gotchas**:
- Slow-moving data; freshness isn't a concern. We can cache for a week safely.
- AU geographies can change; the site-to-AU mapping should be refreshed annually.

---

### 🟢 NOAA precipitation

| Field | Value |
|---|---|
| Connector | `connectors/noaa-precip/` |
| Phase | 2 |
| Cadence | Hourly |
| Auth | None for `api.weather.gov`; token needed for some `ncei.noaa.gov` endpoints |
| Format | JSON |
| License | Public domain (federal) |
| Endpoint | `https://api.weather.gov/stations/{id}/observations` |
| Contact | https://www.weather.gov/contact |
| Rate limit | "Reasonable use"; identify with a User-Agent string |
| Active? | Yes |

**What we pull**

- 48-hour precipitation total at the nearest NOAA station for each site

**Stations of interest**:
- `KDCA` — Reagan National Airport (covers central DC and Arlington)
- `KIAD` — Dulles (western suburbs)
- `KCGS` — College Park (covers PG County and northeast)
- `KGAI` — Gaithersburg (covers upper Montgomery)

Each `data/sites.json` entry declares its nearest NOAA station.

**Strengths**: free, reliable, official. Drives the 48-hour rainfall override that is one of our key differentiators.

**Risks / gotchas**:
- `api.weather.gov` is generous but does occasionally drop requests; build in retry with exponential backoff.
- Precipitation totals across 48 hours requires summing hourly readings; missing hours need to be handled (treat as zero, but flag the gap if >25% of hours are missing).

---

## Planned post-MVP sources

### 🟡 Potomac Riverkeeper Network

- Currently overlaps with Swim Guide → Anacostia path. Same sampling cadence (Fridays, May–Sept). 39 sites across DC/MD/VA Potomac. **Reassess in Phase 3** whether their data flows into Swim Guide adequately or if we need a separate connector.
- Contact: info@potomacriverkeeper.org

### 🟡 Four Mile Run Conservatory Foundation

- Small volunteer org in Arlington with no public API. They publish to social media and email lists. Plan: **manual CSV ingest pattern** — they email us a CSV monthly, we upload to `data/manual-imports/four-mile-run/` and a connector reads from the filesystem.
- This pattern is generalizable; we should document it as the standard fallback for "volunteer org without API."
- Contact: TBD (reach out via their website)

### 🟡 Maryland DNR Eyes on the Bay

- Continuous monitoring extends into the tidal Potomac. Useful for sites south of Wilson Bridge (Belle Haven, Mt. Vernon Trail). Sparse in inner DMV proper.
- Endpoint: data downloads on eyesonthebay.dnr.maryland.gov; check for SOAP/REST services.

### 🟡 NOAA CBIBS — Chesapeake Bay Interpretive Buoy System

- Smart buoys with met/ocean data. Sparse coverage in inner DMV (no Anacostia buoy; closest is upper Potomac near Gunston Cove).
- Useful for any sites we add south of Mt. Vernon.

### 🟡 Maryland Department of the Environment — Healthy Beaches

- County health departments' bacteria sampling for designated beaches. MD coverage is mostly Bay/coastal; we'd extract the few inner DMV swim beaches if any.
- Endpoint: marylandhealthybeaches.com

### 🟡 Virginia DEQ

- For VA-side sites (Belle Haven, Four Mile Run mouth, Theodore Roosevelt Island access points).
- Endpoint: deq.virginia.gov/our-programs/water

---

## Evaluated and deferred

### ⚪️ Water Reporter (waterreporter.org)

- A platform, not a data source. Useful as an org tool for posting observations but doesn't fit our consumer-decision use case. Anacostia RK and Potomac RKN both use it for observation pin-boards but their relevant lab data is published elsewhere.

### ⚪️ Chesapeake Bay Program DataHub

- Aggregator of state monitoring. We get the same inner-DMV signal directly from USGS, EPA, and state agencies; no reason to add a second-order aggregator that adds latency.

### ⚪️ Anacostia Watershed Society — State of the River

- Annual letter grade in a PDF. Useful as a citation on the methodology page; not a real-time data source.

### ⚪️ Chesapeake Bay Foundation — State of the Bay

- Annual PDF. Same treatment as AWS.

### ⚪️ AirNow / EPA AQI

- Air quality is not water quality. Out of scope.

---

## Source attribution rules

Every grade card surfaces which sources contributed to it. The rule:

- If a source contributed a signal to the verdict, it appears in the "Sources" footer of the card.
- Each source name links to the original data, not to our app's methodology page.
- If a source's data was stale or missing, it appears in the card as "X: no fresh data" rather than being silently omitted.

Source attribution is contractual — building trust with the data producers depends on us being scrupulous here. See [`UX.md` § Attribution](./UX.md#attribution).

---

## Adding a new source — checklist

Before opening a PR for a new connector:

- [ ] Source has a documented endpoint or scraping target that has been stable for ≥ 6 months
- [ ] Data license permits redistribution / aggregation (or we have written permission)
- [ ] Connector emits `NormalizedRecord[]` per the schema in `data/schema/normalized-record.schema.json`
- [ ] Connector has a `README.md` documenting: endpoint, cadence, fields, license, contact, known failure modes
- [ ] Connector has unit tests for the normalization step using a recorded fixture
- [ ] Connector handles rate limits, retries, and structured errors via the shared HTTP helper
- [ ] New source entry added to this document (`DATA_SOURCES.md`) with status icon updated
- [ ] If new stations: `data/sites.json` updated to reference the relevant ones
- [ ] User-facing attribution copy reviewed
