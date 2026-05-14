# DMV Water Watch

> **Working title — rename freely.** This repo started at Civic Tech DC Project Night, 2026-05-13.

A mobile-first map that answers one question for paddlers, rowers, and (where legal) swimmers across the inner DMV:

> **Is it safe to get in the water today?**

We unify bacterial sampling from Riverkeeper networks, real-time DOEE sondes, USGS streamflow, EPA impairment status, and NOAA rainfall into a single traffic-light **report card** per recreation site. Everywhere else, this data is scattered across PDFs, dashboards, and dormant Water Reporter embeds. We are the consumer face that the data-producing orgs don't have the bandwidth to build themselves.

---

## Status

**Pre-MVP — planning complete, implementation phase 0.**

This repository currently contains the full implementation roadmap, requirements, architecture, grading rubric, and per-source connector specs. Code scaffolding begins in Phase 0 (see [`ROADMAP.md`](./ROADMAP.md)).

## The wedge in five bullets

1. **Paddler-first**, with a swimmer toggle for legal swim sites in MD/VA. DC prohibits swimming, so secondary-contact thresholds drive defaults. Nobody else owns this persona.
2. **First DMV product to automate the "48 hours after rain" rule** with a CSO-aware overlay on top of bacterial results.
3. **Freshness as a first-class UI primitive.** Every card shows lab-age, rain-age, sonde-age honestly. This is the single biggest credibility differentiator versus Swim Guide.
4. **Inner-DMV launches catalog** — Bladensburg to National Harbor, the corridor every other product underserves.
5. **Open source, MIT, civic-tech ethos.** Connectors are modular; new data sources are TypeScript files in `connectors/`.

## The orienting docs

Read in this order to onboard:

| Doc | What it answers |
|---|---|
| [`REQUIREMENTS.md`](./REQUIREMENTS.md) | Personas, user stories, functional + non-functional requirements, success metrics |
| [`ROADMAP.md`](./ROADMAP.md) | Phased delivery plan with acceptance criteria per phase |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Tech stack, data flow, deployment topology |
| [`GRADING.md`](./GRADING.md) | The traffic-light rubric, thresholds, edge cases, worked examples |
| [`DATA_SOURCES.md`](./DATA_SOURCES.md) | Per-source spec for every connector (live + planned) |
| [`UX.md`](./UX.md) | Screen inventory, states, accessibility, copy guidelines, disclaimer plan |
| [`docs/adr/`](./docs/adr/) | Architecture Decision Records — why we chose what we chose |
| [`docs/sites-curation.md`](./docs/sites-curation.md) | How the ~50 hand-curated recreation sites get selected and maintained |
| [`docs/outreach.md`](./docs/outreach.md) | Cold-outreach plan for Riverkeeper / DOEE partnerships post-prototype |

## Quickstart

```bash
# Phase 0 scaffolding — coming in week 1
git clone <this repo>
cd dmv-water-watch
npm install
npm run dev
```

Until Phase 0 lands, this repo is documentation-only. The data schema (`data/schema/normalized-record.schema.json`) and connector interface (`connectors/shared/types.ts`) are the only code artifacts.

## How to contribute

Read [`connectors/README.md`](./connectors/README.md) for the connector contract. New data sources are isolated TypeScript modules that emit normalized records — drop one in, register it in the workflow, and it appears on the map after the next scheduled build.

For non-code contributions, the highest-leverage work is:

- **Site curation** — physically verifying that a boat launch at `lat, lon` is real, signed, and has parking. See [`docs/sites-curation.md`](./docs/sites-curation.md).
- **Outreach** — building relationships with Anacostia Riverkeeper, Potomac Riverkeeper Network, and DC DOEE so we eventually get direct data feeds instead of scrapes. See [`docs/outreach.md`](./docs/outreach.md).

## License

[MIT](./LICENSE). © 2026 Samuel Giacinto and contributors.

## Disclaimer

This application provides aggregated water-quality information for **educational and recreational planning purposes only**. It does not guarantee safety. Sample-based water-quality data is by nature retrospective; conditions can change between samples. Always use your own judgment, observe posted signage, and follow guidance from local authorities. See [`UX.md` § Disclaimer](./UX.md#disclaimer) for the full user-facing copy.
