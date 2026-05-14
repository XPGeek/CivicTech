# Sites Curation

How we choose, document, and maintain the ~50 recreation sites that make up our map.

> **A "site" is a recreation point.** It is not a sampling station. A site can be informed by zero, one, or many stations from our data sources. The mapping is declared in `data/sites.json`.

---

## 1. Selection criteria

A location qualifies as a site if **all** of these are true:

1. **It is publicly accessible.** No private docks, no permission-required marinas, no fenced-off areas.
2. **People actually launch / swim / row from it.** We are not cataloging every inch of riverbank. Look for: kayak/canoe storage, paved or graded launches, posted "Boat Launch" signage, dock pilings, paddler trip reports.
3. **It is within our geographic scope** (NFR-27): DC + Arlington + Alexandria + PG County + Montgomery County.
4. **At least one of our data sources has a station within ~5 km / 3 miles** that plausibly characterizes the water at this site. If no station is nearby, we may include it but its default grade is `unknown` with a clear "no nearby sampling" note.

A location is **disqualified** if:

- It's an upstream stream segment with no real recreation use, even if Anacostia RK samples there (e.g. Watts Branch — included as a sampling station but not as a recreation site)
- It's a private marina or yacht club requiring membership
- It's a restricted area (e.g., security exclusion zones near federal buildings)
- It's a tidal flat without launch infrastructure

---

## 2. Starter list — Phase 1 (~10 sites)

This is the bootstrap list for Phase 1. Coordinates are approximate; verify on the ground or via official sources before publishing.

| ID | Name | River | Jurisdiction | Activity types |
|---|---|---|---|---|
| `buzzard-point` | Buzzard Point Marina | Anacostia | DC | paddle, row |
| `key-bridge-boathouse` | Key Bridge Boathouse | Potomac | DC | paddle |
| `thompson-boat-center` | Thompson Boat Center | Potomac | DC | paddle, row |
| `bladensburg-waterfront` | Bladensburg Waterfront Park | Anacostia | MD (PG) | paddle |
| `belle-haven-marina` | Belle Haven Marina | Potomac | VA (Fairfax) | paddle, swim* |
| `national-harbor` | National Harbor Marina | Potomac | MD (PG) | paddle, swim* |
| `four-mile-run-mouth` | Four Mile Run at Potomac confluence | Potomac/Four Mile Run | VA (Arlington) | paddle |
| `kingman-island` | Kingman Island launch | Anacostia | DC | paddle |
| `fletcher-cove` | Fletcher's Cove | Potomac | DC | paddle |
| `rock-creek-confluence` | Rock Creek at Potomac confluence | Rock Creek/Potomac | DC | paddle |

\* Swim option shown subject to legal status; DC sites never show swim as available.

---

## 3. Expansion to ~50 sites — Phase 2

Sources to mine for candidate sites:

- **Anacostia Riverkeeper trip planning page** — they publish a paddler trip guide with launches
- **Potomac Riverkeeper Network site list** — 39 sampling sites, many at launches
- **NPS Chesapeake Explorer app** — 400+ Bay-region sites with paddle/fish/launch categorization
- **Boater Resource Map** (Coast Guard, NOAA) — official launch points
- **WaterTrails.org Anacostia & Potomac Water Trails** — designated water trail launches
- **Local FB groups** (Anacostia Paddle Club, DC Paddlers) — ground-truth where people actually launch
- **AllTrails** filtered by "paddle" / "kayak" — popular routes start from launches

Curation workflow:

1. Compile candidate list from above sources into `docs/site-candidates.md` (a working file, not version-pinned)
2. For each candidate, verify on satellite imagery + Street View that the launch exists
3. Map to nearest stations from each data source within 5 km
4. Add an entry to `data/sites.json` with full metadata
5. PR review: a contributor confirms the launch is real, public, and described accurately

---

## 4. `data/sites.json` schema

Each entry must include:

```json
{
  "id": "buzzard-point",
  "name": "Buzzard Point Marina",
  "subname": "Anacostia River, DC",
  "lat": 38.8636,
  "lon": -77.0218,
  "jurisdiction": "DC",
  "river": "Anacostia",
  "activity_types": ["paddle", "row"],
  "launch_type": "paved-ramp",
  "parking": "available",
  "fee": false,
  "stations": [
    { "source_id": "anacostia-riverkeeper", "station_id": "ARK-MAIN-1" },
    { "source_id": "usgs-nwis", "station_id": "01651800" },
    { "source_id": "doee-sondes", "station_id": "ANA-3" },
    { "source_id": "noaa-precip", "station_id": "KDCA" }
  ],
  "notes": "Public launch with paved ramp. Limited parking on busy weekends.",
  "links": [
    { "label": "DC Boater's Guide", "url": "..." }
  ],
  "verified_at": "2026-05-13"
}
```

Notes on fields:

- `activity_types` must include only activities legally permitted at this site. DC sites cannot include `swim`.
- `launch_type` enum: `paved-ramp`, `gravel-ramp`, `dirt-putin`, `dock`, `beach`, `seawall-ladder`, `none`. `none` means "people get in here but there is no infrastructure."
- `parking` enum: `available`, `limited`, `none`, `unknown`.
- `fee` boolean indicates a launch fee, not a parking fee.
- `verified_at` is the ISO date of the most recent ground-truth check. Quarterly review re-verifies.

---

## 5. Maintenance

### 5.1 Quarterly review

Every quarter (Q1/Q2/Q3/Q4):

- Open issues for any site whose `verified_at` is more than 12 months old.
- Audit each site against current satellite imagery.
- Update `notes` for material changes (new dock, closed launch, etc.).
- Close issues with a PR updating `verified_at`.

### 5.2 Adding a new site mid-cycle

A non-engineer contributor can propose a new site by:

1. Forking the repo (GitHub web UI works)
2. Editing `data/sites.json` to add the entry
3. Opening a PR
4. A maintainer verifies the location and merges

Future enhancement (post-MVP): a web form that generates the PR; not worth the complexity for v1.

### 5.3 Removing a site

If a launch closes or becomes inaccessible:

1. Open an issue documenting why
2. PR: change `activity_types` to empty array and add `archived: true`
3. The frontend hides archived sites by default but keeps them in the data file for historical continuity

---

## 6. Quality bar

A site list is good when:

- Every entry has been ground-truthed by a real human within the last 12 months
- No entry is for a location that turns out to be private, closed, or hostile to recreators
- The list covers the corridors paddlers actually use (Anacostia mainstem, central Potomac, Rock Creek mouth)
- No glaring omissions when a local paddler reads it

A site list is bad when:

- Pins exist where launching is physically impossible (steep banks, dense reeds)
- Pins are clustered near sampling stations instead of where people actually put in
- Pins reflect "official" launches but miss the dirt put-ins that locals use
- The list feels machine-generated

---

## 7. Out of scope

We are not building:

- Paid / membership marinas
- Whitewater put-ins in upper-watershed sections (no inner-DMV whitewater)
- Fishing-only piers (no water contact)
- Park amenities (we are not AllTrails)
- Tidal access points without launch use (we are not a tide gauge)
- Sites in NOVA outside Arlington/Alexandria (geographic scope limit)

If the community wants any of these post-launch, we re-evaluate after Phase 3.
