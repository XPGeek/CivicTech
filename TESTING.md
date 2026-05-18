# Testing the application

This is a quick reference for verifying the app works. For full contributor docs, see [`CONTRIBUTING.md`](./CONTRIBUTING.md).

---

## Fastest possible smoke test

```bash
npm install
npm run pipeline          # ~3s, hits real USGS + NOAA, plus fixture sources
npm run dev               # open http://localhost:3000
```

You should see ~10 colored pins on the inner-DMV map. Tap one — the detail panel shows a grade, a reason sentence, signal breakdown, and a sparkline.

If anything is broken, run `npm test` and `npm run typecheck` to localize the issue.

---

## Layered verification

Run in this order if you want to isolate problems:

| Layer | Command | Expected outcome |
|---|---|---|
| Static types | `npm run typecheck` | No output. |
| Sites catalog | `npm run validate:sites` | `Checked N site(s). OK.` |
| Unit tests | `npm test` | 6 test files, 66 tests pass. |
| Pipeline (offline) | `npm run pipeline` | Logs structured JSON; ends `Built N sites, M records.` |
| Pipeline (live) | with internet | USGS returns real records; NOAA returns whatever is current for KDCA etc. |
| Build | `npm run build:next` | Static export to `out/`. |
| Dev server | `npm run dev` | Map renders. |

---

## Running an individual connector

When debugging a flaky source, run just its connector:

```bash
npm run connector:run -- usgs-nwis | jq 'length'
npm run connector:run -- noaa-precip
npm run connector:run -- anacostia-riverkeeper
npm run connector:run -- doee-sondes
npm run connector:run -- epa-hmw
```

Each command:

1. Loads `data/sites.json`.
2. Projects sites into the connector's context.
3. Calls the connector's `fetch()` function.
4. Prints `NormalizedRecord[]` as JSON to stdout, summary to stderr.

If the connector throws, you get a stack trace and `ConnectorError.code` (e.g., `HTTP_503`, `NETWORK`, `SHAPE`).

---

## Testing the grading rubric

The rubric is the most consequential code in the project; it has 17 tests covering every worked example in [`GRADING.md`](./GRADING.md) plus the § 4 edge cases.

```bash
npm run grading:test
```

To debug a specific case, edit `grading/v1.test.ts` and add a `console.dir(result, { depth: null })` inside the failing `it()` block.

---

## Testing the build pipeline end-to-end

```bash
rm -rf public/data data/snapshots
npm run pipeline
ls public/data
# manifest.json  sites.geojson  grades.json  sources.json  history/
cat public/data/grades.json | jq 'keys'                    # site IDs that got graded
cat public/data/manifest.json | jq '.sources'              # what each source returned
cat public/data/history/buzzard-point.json | jq '.[-1]'    # most recent point for that site
```

History accumulates if you run the pipeline multiple times — each call appends one grade point per site and trims to the last 30 days.

---

## Testing the frontend

### Local browser smoke

```bash
npm run dev
```

Then verify:

- [ ] Map renders centered on inner DMV.
- [ ] ~10 pins appear, color-coded.
- [ ] Tapping a pin opens the detail panel.
- [ ] The activity toggle in the bottom-left switches paddle ↔ swim.
- [ ] Swim is greyed out (with tooltip) for DC sites.
- [ ] Direct navigation to `/site/buzzard-point` shows the standalone card.
- [ ] `/methodology`, `/about`, `/sources` render correctly.
- [ ] On a clean browser profile, the disclaimer interstitial appears once.

### Mobile viewport

In Chrome DevTools or Firefox Responsive Mode:

- [ ] iPhone SE (375 × 667) — no horizontal scroll, pins legible.
- [ ] Tablet portrait (768 × 1024) — layout flips from stacked to side-by-side correctly.

### Accessibility

```bash
npx @axe-core/cli http://localhost:3000
```

Targets per NFR-6: Lighthouse Accessibility ≥ 95.

### Static export

```bash
npm run build:next
npx serve out
```

The `out/` directory is what gets uploaded to Cloudflare Pages. If the export fails or `serve out` shows different behavior than dev mode, something is leaking server-only code into a client component.

---

## Adding a connector — verification checklist

Before opening a PR for a new connector:

- [ ] `npm run connector:run -- <new-id>` returns at least one record (or zero with a clear log explaining why).
- [ ] `npm test -- connectors/<new-id>` passes.
- [ ] The connector's `index.ts` imports nothing from `node:fs` except in fixture-loading paths (real connectors should be pure HTTP).
- [ ] The connector handles `SOURCE_UNREACHABLE` / `HTTP_5xx` via `ConnectorError({ recoverable: true })` so the pipeline degrades gracefully.
- [ ] `connectors/<new-id>/README.md` documents endpoint, cadence, known failure modes.
- [ ] [`DATA_SOURCES.md`](./DATA_SOURCES.md) has an entry with the green-circle status icon.

---

## Common problems and fixes

| Symptom | Likely cause | Fix |
|---|---|---|
| Map blank | OSM tiles blocked or network down | Check console; try `NEXT_PUBLIC_MAP_STYLE=mapbox` with a token. |
| All pins gray (`unknown`) | Pipeline never ran | `npm run pipeline` and refresh. |
| `grades.json` missing | `public/data/` got rm'd | Same — run the pipeline. |
| `npm test` fails on fresh clone | Stale snapshot in `data/snapshots/` | `rm -rf data/snapshots && npm test`. |
| NOAA returns no records | Real NWS API has a maintenance window OR the system clock is far from now | The build still completes; the rainfall override just won't fire. |
| Type error after pulling main | Connector contract changed | Check `connectors/shared/types.ts` for new fields. |

---

## Continuous integration

Two GitHub Actions workflows ship with the repo:

- **`.github/workflows/ci.yml`** — runs on every PR + push to main. Type-check, validate, test, build pipeline, build Next.js.
- **`.github/workflows/connectors.yml`** — scheduled cron (hourly / 6-hourly / weekly). Runs the pipeline and optionally syncs `public/data/` to Cloudflare R2.

Failing CI must be fixed before merge.
