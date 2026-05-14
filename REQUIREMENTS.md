# Requirements

This document defines **what the product must do** to be considered an MVP. Implementation is in [`ROADMAP.md`](./ROADMAP.md). Technical decisions are in [`ARCHITECTURE.md`](./ARCHITECTURE.md).

Each requirement has an ID (`FR-N` for functional, `NFR-N` for non-functional). When a roadmap task lands, it should reference the requirements it satisfies.

---

## 1. Personas

We are designing for three personas, in priority order.

### 1.1 Primary — "Saturday Morning Paddler" (Maya)

- **Who:** 32, lives in Petworth, owns a kayak, paddles ~weekly during warm months.
- **Where:** Bladensburg Waterfront, Anacostia River, Buzzard Point, occasionally Belle Haven Marina.
- **The moment we serve:** It's 7:14 AM Saturday. Forecast looks decent. Before loading the kayak on the car, she opens our site on her phone to confirm she can launch.
- **What she needs in 5 seconds:** A clear go/caution/no-go verdict for her usual launch, with one-line reasoning ("E. coli low, no recent rain, normal flow").
- **What she doesn't need:** Long explanations, scientific jargon, EPA assessment cycles, ad-supported anything.
- **Failure mode:** If we make her tap more than twice or load slower than 2 seconds on LTE, she goes back to checking the Anacostia Riverkeeper Friday email.

### 1.2 Secondary — "New Paddler" (Jay)

- **Who:** 28, recently moved to Arlington, wants to try paddleboarding.
- **What they need:** A map view that shows them where the safe, accessible launches are, with photos and parking info.
- **The moment we serve:** Sunday afternoon, browsing for "where can I SUP near me." First-time visit.
- **What they don't need:** Anything that assumes they already know what "MPN/100mL" means.
- **Failure mode:** If our map is empty or pins are unhelpful, they leave for AllTrails or Reddit.

### 1.3 Tertiary — "Curious Citizen / Advocate" (Renee)

- **Who:** 45, lives in Hyattsville, follows local environmental issues, doesn't paddle but shares articles.
- **What they need:** Historical context, ability to see trends, share a specific site's report card on social.
- **What they don't need:** Verdict urgency — they're not trying to launch a boat.
- **Failure mode:** If we don't have shareable URLs, social embeds, or any historical view, they bounce to Anacostia Watershed Society's annual PDF report card.

We optimize for Maya. Jay's needs are mostly served by serving Maya well. Renee's needs are met by a single feature (shareable per-site URLs with a 30-day chart).

---

## 2. Functional requirements

### 2.1 Map and discovery

- **FR-1** A map view must be the default landing experience. Full-bleed on mobile.
- **FR-2** Pins represent **recreation sites** (curated, not raw sampling stations). See `data/sites.json` for the schema.
- **FR-3** Pins must be colored by their current grade: green, yellow, red, or gray (unknown / stale).
- **FR-4** The map must default to a viewport covering the inner DMV (DC + Arlington/Alexandria + PG/Montgomery), zoomed to show all sites.
- **FR-5** The map must request and use the user's geolocation, with fallback to default viewport if denied or unavailable.
- **FR-6** On location grant, the map must center on the user and surface the nearest site in the bottom sheet (mobile) or sidebar (desktop).
- **FR-7** The user must be able to tap a pin to open a detail card.
- **FR-8** The user must be able to filter pins by activity type (paddle, swim) via a visible toggle.

### 2.2 Site detail card

- **FR-9** Each detail card must display: site name, current grade (color + word), one-sentence reasoning, last-tested date, last-rain time and amount, latest sonde reading (if applicable).
- **FR-10** Each detail card must display a **freshness stamp** for every data signal it uses ("lab: 3 days ago", "rain: 14 hours ago", "sonde: 12 minutes ago").
- **FR-11** Each detail card must link to a **methodology page** explaining how the grade was computed.
- **FR-12** Each detail card must link to **source attribution** (Anacostia Riverkeeper, USGS, etc.) with hyperlinks to the original data.
- **FR-13** Each detail card must include a 30-day grade history (sparkline minimum; bar chart preferred).
- **FR-14** Each detail card must be deep-linkable: `/site/<site-id>` must render the same card as the standalone page.
- **FR-15** Each detail card must have a share button that copies the deep link.

### 2.3 Grading

- **FR-16** Each site must have a current grade computed from the rubric in [`GRADING.md`](./GRADING.md).
- **FR-17** Grades must be recomputed whenever any underlying signal updates (i.e., on every connector run).
- **FR-18** Grades must be `green`, `yellow`, `red`, or `unknown`. No other values.
- **FR-19** A grade older than its source's expected cadence (e.g., bacterial > 8 days, sonde > 4 hours) must downgrade to `unknown` for that signal.
- **FR-20** The activity toggle (paddle vs swim) must alter thresholds per the rubric, not just the displayed verdict.

### 2.4 Data freshness and honesty

- **FR-21** Every data signal must be timestamped at the source's reported time, not at our ingestion time.
- **FR-22** Stale data (per FR-19) must be visually distinguished — gray pin, "data is X days old" inline warning.
- **FR-23** If a site has zero fresh signals, its grade must be `unknown` and the card must say so plainly.
- **FR-24** The global "last updated" timestamp (from the most recent connector run) must be visible in the UI footer or About page.

### 2.5 PWA + offline

- **FR-25** The app must be installable as a PWA on iOS Safari and Android Chrome.
- **FR-26** The most recent successful data fetch must be cached and usable offline, with a clear "showing cached data" banner.
- **FR-27** Service worker must update opportunistically; users should never have to manually refresh to get new data.

### 2.6 Operational

- **FR-28** New data sources must be addable as standalone TypeScript modules in `connectors/` without modifying core code beyond a single workflow registration line.
- **FR-29** Site curation must be editable by a non-engineer through `data/sites.json` with a documented schema and review process.
- **FR-30** Disclaimer copy must appear on every detail card, the About page, and as a one-time interstitial on first visit.

---

## 3. Non-functional requirements

### 3.1 Performance

- **NFR-1** First Contentful Paint on a mid-tier Android phone over LTE must be ≤ 1.5 seconds (Lighthouse, 4G simulation).
- **NFR-2** Lighthouse Performance score ≥ 90 on mobile, ≥ 95 on desktop.
- **NFR-3** Total JS bundle (initial route) ≤ 200 KB gzipped.
- **NFR-4** The map must render the first paint of pins within 2 seconds of page load on LTE.
- **NFR-5** Geolocation prompt must appear within 500 ms of map load.

### 3.2 Accessibility

- **NFR-6** Lighthouse Accessibility score ≥ 95.
- **NFR-7** All grade pins must convey state via **shape or icon as well as color**, so colorblind users have non-color signal.
- **NFR-8** All interactive elements must have minimum 44×44 px touch targets.
- **NFR-9** All text must meet WCAG AA contrast (4.5:1 minimum for body, 3:1 for large).
- **NFR-10** Keyboard navigation must work for the full map → detail flow on desktop.
- **NFR-11** Screen reader must announce grade changes via `aria-live`.

### 3.3 Reliability

- **NFR-12** A single connector failure must not break the build. The site renders with the most recent successful data per source.
- **NFR-13** Connector runs must produce structured logs that can be inspected via GitHub Actions UI.
- **NFR-14** A complete frontend outage (Cloudflare Pages down) is acceptable up to 99.5% monthly uptime; we are not paging anyone.
- **NFR-15** Data freshness SLO: bacterial samples updated within 24 hours of source publication; sonde data within 1 hour; rainfall within 2 hours.

### 3.4 Security and privacy

- **NFR-16** No personally identifiable information collected. Period.
- **NFR-17** No third-party trackers; analytics provider must be GDPR/CCPA-friendly and cookieless (Plausible or Cloudflare Web Analytics).
- **NFR-18** No consent banner needed (we don't set tracking cookies).
- **NFR-19** All third-party API tokens (Mapbox) stored as GitHub secrets, never committed.
- **NFR-20** Mapbox token URL-restricted to production and preview domains.

### 3.5 Cost

- **NFR-21** Operational cost must remain at or below $20/month at MVP traffic levels (≤ 10k unique visitors/month).
- **NFR-22** Cost line items: Mapbox tiles (free tier sufficient until ~50k loads/month), Cloudflare Pages (free), Cloudflare R2 (≈$0 at our volume), domain registration (~$1/month amortized).

### 3.6 Maintainability

- **NFR-23** Every connector must have a `README.md` documenting the source, fetch pattern, rate limits, and known failure modes.
- **NFR-24** Every connector must have at least one unit test covering the normalization step.
- **NFR-25** No connector may require credentials that aren't checked into a `.env.example` with stub values.
- **NFR-26** All architectural decisions must be recorded as ADRs in `docs/adr/`.

### 3.7 Geographic scope

- **NFR-27** MVP coverage: District of Columbia + Arlington County + Alexandria + Prince George's County + Montgomery County. Sites outside this bounding box are out of scope for v1.
- **NFR-28** The site catalog must contain a minimum of 30 sites, target of 50, before Phase 3 launch.

---

## 4. Success metrics

### 4.1 Launch criteria (Phase 3 gate)

- ≥ 30 sites with at least one fresh data point each
- All four flagship connectors running on schedule for ≥ 14 consecutive days
- Lighthouse mobile Performance ≥ 90, Accessibility ≥ 95
- Disclaimer reviewed by legal contact
- A non-technical friend completes the "find nearest site → see grade" flow without intervention

### 4.2 30-day post-launch

- ≥ 500 unique visitors (modest; this is a niche civic product)
- ≥ 100 PWA installs OR ≥ 30% return-visit rate (either qualifies)
- Zero data-correctness incidents requiring takedown
- ≥ 1 unsolicited mention from a Riverkeeper org, paddling club, or local news outlet

### 4.3 What we are NOT measuring

- Time on site (this product should be **fast in, fast out**)
- Engagement depth (irrelevant; the win is "decision made and user leaves")
- Conversion (no funnel)
- Daily active users (paddling is seasonal; weekly active is the right frame, but we aren't optimizing for it)

---

## 5. Explicit non-requirements

To prevent scope creep, the following are explicitly **out of scope** for MVP and require a fresh requirements pass before being added:

- User accounts, login, profiles
- Saved sites / favorites beyond `localStorage`
- Notifications (email, push, SMS)
- Crowd-sourced reporting / photo upload
- Comments, reviews, ratings
- Native iOS/Android apps
- Localization beyond English
- Routing, distance, trip planning
- Weather forecast (rainfall *history* yes; forecast no)
- Tides, currents, water level forecast
- Air quality, fish advisory, drinking water
- Embeddable widgets
- Premium / paid features
- Ads of any kind

---

## 6. Open questions (to resolve during Phase 0–1)

- [ ] Final product name (rename from "DMV Water Watch")
- [ ] Final domain (placeholder: `dmv-water.civictechdc.org`)
- [ ] Specific list of starter 10 sites for Phase 1 (see [`docs/sites-curation.md`](./docs/sites-curation.md))
- [ ] Whether Swim Guide open-data feed is usable for current data or if we fall back to scraping Anacostia RK PDFs (Phase 2 spike)
- [ ] Exact DOEE sonde export endpoint and format (Phase 2 spike)
- [ ] Legal contact for disclaimer review (ask Civic Tech DC organizers)
