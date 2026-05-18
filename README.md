# DMV Water Watch

> **Working title — rename freely.** This repo started at Civic Tech DC Project Night, 2026-05-13.

A mobile-first map that answers one question for paddlers, rowers, and (where legal) swimmers across the inner DMV:

> **Is it safe to get in the water today?**

We unify bacterial sampling from Riverkeeper networks, real-time DOEE sondes, USGS streamflow, EPA impairment status, and NOAA rainfall into a single traffic-light **report card** per recreation site. Everywhere else, this data is scattered across PDFs, dashboards, and dormant Water Reporter embeds. We are the consumer face that the data-producing orgs don't have the bandwidth to build themselves.

---

## Status

**MVP scaffolding landed (Phase 0–2 implemented, Phase 3 polish pending).**

What works today:

- ✅ Next.js 14 App Router static export, MapLibre map with OSM raster tiles (token-free).
- ✅ Five connectors wired up: USGS NWIS, NOAA precip, EPA ATTAINS (all real APIs); Anacostia Riverkeeper and DOEE sondes (fixture-backed, replacement path documented).
- ✅ Deterministic grading rubric per [`GRADING.md`](./GRADING.md) — 17 tests covering all 5 worked examples + 12 edge cases.
- ✅ Build pipeline: connectors → normalize → grade → emit `sites.geojson`, `grades.json`, `history/<id>.json`, `manifest.json`, `sources.json`.
- ✅ 10 starter sites in `data/sites.json`, validated against the bounding box + DC swim prohibition.
- ✅ Site detail cards with grade hero, reason sentence, freshness-stamped signal breakdown, 30-day sparkline, source attribution, share button, deep-linkable `/site/<id>` pages.
- ✅ Activity toggle (paddle ↔ swim) re-grades thresholds per FR-20.
- ✅ Methodology, About, Sources pages + first-visit disclaimer interstitial.
- ✅ PWA manifest + service worker (cache-first shell, network-first data).
- ✅ GitHub Actions workflows: `ci.yml` (per-PR) and `connectors.yml` (scheduled cron).
- ✅ 49 unit tests + sites validator + type-check all green.

What's queued for Phase 3 polish:

- Production deploy on a real Cloudflare Pages + R2 setup (env vars + secrets — see [`CONTRIBUTING.md`](./CONTRIBUTING.md) § 9).
- Legal review of the disclaimer copy.
- Phase 2 spike on Anacostia Riverkeeper Swim Guide / PDF integration (fixture replaces this for now).
- Phase 2 spike on DOEE sonde live export endpoint.
- Add EPA Assessment Unit IDs to `data/sites.json` to light up the chronic-impairment badge.

---

## Quickstart

```bash
git clone <this-repo>
cd dmv-water-watch
npm install
npm run pipeline           # fetch + grade + write artifacts (≈3 sec)
npm run dev                # http://localhost:3000
```

Open the browser. You should see ~10 colored pins across the inner DMV. Tap one to see its grade, reasoning, and 30-day history.

No API keys or accounts are required for local dev. The default map style is OpenStreetMap raster, served token-free.

For deeper testing and contribution guidance, see [`CONTRIBUTING.md`](./CONTRIBUTING.md) and [`TESTING.md`](./TESTING.md).

## The wedge in five bullets

1. **Paddler-first**, with a swimmer toggle for legal swim sites in MD/VA. DC prohibits swimming, so secondary-contact thresholds drive defaults. Nobody else owns this persona.
2. **First DMV product to automate the "48 hours after rain" rule** with a CSO-aware overlay on top of bacterial results.
3. **Freshness as a first-class UI primitive.** Every card shows lab-age, rain-age, sonde-age honestly. This is the single biggest credibility differentiator versus Swim Guide.
4. **Inner-DMV launches catalog** — Bladensburg to National Harbor, the corridor every other product underserves.
5. **Open source, MIT, civic-tech ethos.** Connectors are modular; new data sources are TypeScript files in `connectors/`.

## The orienting docs

| Doc | What it answers |
|---|---|
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | How to install, run, test, and extend the app. Start here. |
| [`TESTING.md`](./TESTING.md) | Smoke tests, layered verification, troubleshooting. |
| [`REQUIREMENTS.md`](./REQUIREMENTS.md) | Personas, user stories, functional + non-functional requirements, success metrics |
| [`ROADMAP.md`](./ROADMAP.md) | Phased delivery plan with acceptance criteria per phase |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Tech stack, data flow, deployment topology |
| [`GRADING.md`](./GRADING.md) | The traffic-light rubric, thresholds, edge cases, worked examples |
| [`DATA_SOURCES.md`](./DATA_SOURCES.md) | Per-source spec for every connector (live + planned) |
| [`UX.md`](./UX.md) | Screen inventory, states, accessibility, copy guidelines, disclaimer plan |
| [`docs/adr/`](./docs/adr/) | Architecture Decision Records — why we chose what we chose |
| [`docs/sites-curation.md`](./docs/sites-curation.md) | How the ~50 hand-curated recreation sites get selected and maintained |
| [`docs/outreach.md`](./docs/outreach.md) | Cold-outreach plan for Riverkeeper / DOEE partnerships post-prototype |

## Daily-driver commands

```bash
npm run dev              # start the dev server
npm run pipeline         # regenerate public/data/ from all connectors
npm test                 # run unit tests (49 tests)
npm run grading:test     # only the grading-rubric tests (17 tests)
npm run validate:sites   # lint data/sites.json
npm run typecheck        # tsc --noEmit
npm run build            # pipeline + production static export to out/

npm run connector:run -- usgs-nwis     # run a single connector to stdout
```

Full command reference: [`CONTRIBUTING.md`](./CONTRIBUTING.md) § 4.

## How to contribute

Read [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the full guide. The connector contract is in [`connectors/README.md`](./connectors/README.md). New data sources are isolated TypeScript modules that emit normalized records — drop one in, register it in `pipeline/connectors.ts`, and it appears on the map after the next pipeline run.

For non-code contributions, the highest-leverage work is:

- **Site curation** — physically verifying that a boat launch at `lat, lon` is real, signed, and has parking. See [`docs/sites-curation.md`](./docs/sites-curation.md).
- **Outreach** — building relationships with Anacostia Riverkeeper, Potomac Riverkeeper Network, and DC DOEE so we eventually get direct data feeds instead of scrapes. See [`docs/outreach.md`](./docs/outreach.md).

## License

[MIT](./LICENSE). © 2026 Samuel Giacinto and contributors.

## Disclaimer

This application provides aggregated water-quality information for **educational and recreational planning purposes only**. It does not guarantee safety. Sample-based water-quality data is by nature retrospective; conditions can change between samples. Always use your own judgment, observe posted signage, and follow guidance from local authorities. See [`UX.md` § Disclaimer](./UX.md#disclaimer) for the full user-facing copy.
