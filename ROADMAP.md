# Roadmap

This is the canonical implementation plan. Phases are sequential. Each phase has an explicit **Definition of Done** that gates progression. Estimates assume one engineer at ~10 hrs/week, which is the realistic Civic Tech DC Project Night cadence; double the pace if there are two contributors, halve if it's a single hobbyist.

> **North star:** A user lands on the homepage on a Saturday morning, sees a Green pin near their location, taps it, and reads "Buzzard Point — paddle-safe — bacteria low, no rain in 72 hours, real-time turbidity normal" in under 5 seconds. Everything else serves that moment.

---

## Phase 0 — Foundations (Week 1)

**Goal:** Empty room is wired up. We can deploy a hello-world Next.js app to Cloudflare Pages and a GitHub Action can write a JSON file to R2. No data yet.

### Tasks

- [ ] Replace working title `DMV Water Watch` with whatever final name (optional; can defer)
- [ ] Initialize Next.js 14+ App Router project at repo root (or `web/` subdir)
- [ ] Install MapLibre GL JS and verify it renders an empty map
- [ ] Set up Cloudflare account + Pages project pointing at this repo
- [ ] Provision Cloudflare R2 bucket: `dmv-water-watch-data` (or chosen name)
- [ ] Provision Mapbox account, generate token with **URL restriction** to production + preview domains, store as `MAPBOX_TOKEN` GitHub secret
- [ ] Add Mapbox Standard style URL to map config
- [ ] Configure custom domain (provisional: `dmv-water.civictechdc.org` or registrar-issued)
- [ ] Implement `connectors/shared/types.ts` — the `NormalizedRecord` and `GradeOutput` interfaces (see [`ARCHITECTURE.md`](./ARCHITECTURE.md))
- [ ] Author `data/schema/normalized-record.schema.json` — JSON Schema for validation
- [ ] Wire up a placeholder GitHub Action workflow `.github/workflows/connectors.yml` that runs hourly, writes a `manifest.json` with the current timestamp, uploads to R2
- [ ] Frontend reads `manifest.json` from R2 and renders the timestamp in the corner — proves the end-to-end pipe works
- [ ] Set up Plausible or Cloudflare Web Analytics (privacy-respecting, no consent banner needed)
- [ ] Set up Sentry (free tier) for frontend error tracking

### Definition of Done

- The map renders on `https://<domain>` on mobile and desktop, full-bleed
- A GitHub Action runs hourly, pushes a JSON file to R2, and the frontend reads it
- A new contributor can `git clone && npm install && npm run dev` and see the map locally
- No water-quality data yet — that's Phase 1

---

## Phase 1 — First working slice with one source (Weeks 2–3)

**Goal:** USGS NWIS data flows end-to-end to ~10 sites. We can point at the live URL and say "this works for real water data, just for one source."

### Why USGS first

It is the **easiest connector** of the four: well-documented REST API, no auth, generous rate limits, machine-readable JSON, mature stations. It is the fastest path to validating the entire pipeline before tackling Riverkeeper data (which requires HTML scraping or Swim Guide partnership) or DOEE (which requires understanding their data export format).

### Tasks

- [ ] Curate `data/sites.json` with **~10 starter sites** in the inner DMV (full ~50 curation comes in Phase 2)
- [ ] Each site needs: `id`, `name`, `lat`, `lon`, `activity_types`, `usgs_station_id` (nearest)
- [ ] Implement `connectors/usgs-nwis/` — fetches instantaneous values (`/iv` endpoint) for turbidity, gauge height, water temp, dissolved oxygen
- [ ] Implement `grading/v1.ts` — produces a `GradeOutput` per site. For Phase 1, grading is **provisional**: green if turbidity normal AND gauge height in expected range, yellow if either is elevated, red if either is extreme. This is a placeholder rubric, replaced in Phase 2.
- [ ] Frontend: render pins on map colored by grade
- [ ] Frontend: bottom sheet on mobile / sidebar on desktop showing site detail
- [ ] Frontend: geolocation prompt, "find nearest site" CTA
- [ ] Frontend: "Last updated X minutes ago" stamp visible on every card
- [ ] PWA manifest + service worker for offline-cached last-known data
- [ ] Hard-coded "BETA — provisional rubric, swim/paddle decisions are your responsibility" banner

### Definition of Done

- Real USGS data displayed for ~10 sites on the live URL
- Mobile Lighthouse score ≥ 90 on Performance, ≥ 95 on Accessibility
- A first-time visitor can complete the "find nearest site → see grade" flow in under 5 seconds on a mid-tier phone
- PWA install banner appears on supported browsers
- A friendly skeptic can poke the prototype on their phone, on a real river, and have it not embarrass us

---

## Phase 2 — Multi-source unification (Weeks 4–5)

**Goal:** All four flagship sources flowing. The grading rubric is the real one defined in [`GRADING.md`](./GRADING.md), not the Phase 1 placeholder.

### Tasks

- [ ] Expand `data/sites.json` to **~50 sites** covering inner DMV (see [`docs/sites-curation.md`](./docs/sites-curation.md) for selection criteria)
- [ ] Implement `connectors/anacostia-riverkeeper/`
  - Option A (preferred): consume Swim Guide's published data via their open-data standard at `github.com/swimdrinkfish/opendata`
  - Option B (fallback): scrape the Friday water-quality report PDF from `anacostiariverkeeper.org`
  - Document both paths in the connector README so the choice is reversible
- [ ] Implement `connectors/doee-sondes/` — real-time YSI sonde data from DC DOEE's water-quality dashboard. Cadence: hourly (sondes report every 15 min; hourly is fine for grading purposes).
- [ ] Implement `connectors/epa-hmw/` — fetch impairment status per AU via the ATTAINS API. Cadence: weekly.
- [ ] Implement `connectors/noaa-precip/` — fetch precipitation totals for the last 48 hr at the nearest NOAA station for each site. Cadence: hourly.
- [ ] Implement the real `grading/v1.ts` per [`GRADING.md`](./GRADING.md):
  - Primary signal: bacterial sample within 7 days vs activity threshold
  - Rainfall override: >0.5" in last 48 hr downgrades one step
  - DOEE real-time sanity check: turbidity spike or DO collapse → caution
  - EPA chronic context: badge on detail page, doesn't affect verdict
- [ ] Per-site **30-day history charts** on detail pages (Recharts or Observable Plot)
- [ ] **Activity toggle** in UI: Paddle (default) / Swim (legal sites only). Switches thresholds.
- [ ] **Per-site share URLs**: `/site/buzzard-point` deep links for advocacy spread
- [ ] Empty / loading / error / stale states for every component
- [ ] Honest "data is X days/hours old" warnings inline on cards

### Definition of Done

- All four flagship connectors run on schedule and produce valid normalized records
- Grading rubric is the real one, not the placeholder
- Activity toggle works and changes pin colors live
- A user can deep-link to a specific site
- All four connectors have unit tests for the normalization step
- ≥ 50 sites with at least one fresh data point each

---

## Phase 3 — Polish for launch (Week 6)

**Goal:** Ship. Tell people about it. Not embarrassed if it ends up on Hacker News.

### Tasks

- [ ] Disclaimer banner reviewed by a lawyer or pro-bono legal contact (offered by Civic Tech DC community)
- [ ] About page with credits to data sources and contributor list
- [ ] Methodology page explaining the grading rubric in plain English (link from every card)
- [ ] Open Graph + Twitter card meta tags so shared links look good
- [ ] Favicon, app icon, splash screen, accessible color contrast verified
- [ ] Error budget: define what counts as a P0 incident, document in `docs/runbook.md`
- [ ] Status page (Cloudflare Pages allows simple status badges, or use Better Stack free tier)
- [ ] Soft launch: Civic Tech DC Slack, local paddling FB groups, Riverkeeper newsletter mention if relationship exists
- [ ] Listen for first 2 weeks of user feedback before iterating further

### Definition of Done

- App is on a custom domain with HTTPS
- Disclaimer is conspicuous, legally reviewed, and on every grade card
- We have a feedback channel (email or simple feedback form)
- We have a runbook for the most likely failures (connector outage, source schema change, R2 outage)
- A non-technical friend can use the app end-to-end without help

---

## Post-MVP backlog (loose priority order)

The roadmap stops here for the MVP. Items below are intentionally **not in scope** for v1 and should be re-validated before starting any of them.

- **Notification subscriptions** — email alerts via Resend free tier when a saved site changes grade. Needs accounts; needs a small DB (Cloudflare D1).
- **Additional connectors:**
  - Four Mile Run Conservatory Foundation (manual CSV ingest pattern, no API)
  - Potomac Riverkeeper Network (currently overlaps with Swim Guide → Anacostia path; reconfirm value)
  - Maryland DNR Eyes on the Bay (for tidal-Potomac extension)
  - NOAA CBIBS Smart Buoys (for sites near sparse buoys)
- **Crowd-sourced observation reports** — "I saw a sheen at site X" — needs moderation, abuse handling. Likely not worth it; defer to Water Reporter who already does this.
- **Native iOS/Android wrapper** — Capacitor wrapping the PWA. Only justified if PWA install metrics underperform.
- **Embeddable widgets** — for partner orgs' sites. Pursue once we have 2+ orgs asking for them.
- **Forecasting** — predict tomorrow's grade based on rainfall forecast. Real value but real risk; needs validation against historical samples first.
- **Spanish localization** — meaningful population in PG and Montgomery counties. Cheap to add once copy is stable.
- **Trash / pollution event overlay** — coordinate with Water Reporter rather than rebuild.

---

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Swim Guide open-data standard is stale or undocumented for current data | Medium | High | Fallback: scrape Anacostia RK Friday PDF. Both paths documented in `connectors/anacostia-riverkeeper/README.md`. |
| DOEE sonde data export changes format or goes offline | Medium | High | Connector emits structured warnings; grading degrades gracefully — sonde signal becomes "unknown" not "fail". |
| Site curation is more work than expected | High | Medium | Start with 10 sites in Phase 1, expand to 50 in Phase 2, accept that we may launch with 30 if needed. |
| Liability concern over a graded site causing harm | Low | Very High | Conspicuous disclaimer, source attribution on every verdict, "advisory not guarantee" copy, legal review pre-launch. |
| Mapbox token usage exceeds free tier after a viral moment | Low | Medium | URL restrictions on token; switch to Protomaps self-hosted tiles within 24 hr if rate-limited. |
| Riverkeeper org objects to scraping or rebranding their data | Medium | Medium | Proactive cold outreach (see [`docs/outreach.md`](./docs/outreach.md)) post-prototype but pre-launch; offer attribution + traffic. |
| Hand-curated site list becomes stale (closed launches, new ones) | High | Low | Quarterly curation review; community edit form post-Phase 3. |

---

## What we are explicitly NOT doing for MVP

- User accounts and login
- Notifications / push / email alerts
- Native iOS/Android apps
- Spanish or other localizations
- Crowd-sourced reporting
- Embeddable widgets
- Forecasts beyond current-state
- Tidal predictions
- Air quality, weather, or other non-water layers
- Trip planning, route logging, distance tracking

Every item above is a real ask we will hear. The discipline of saying no is what makes Phase 3 ship.
