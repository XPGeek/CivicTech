# Runbook

How we keep the lights on when something breaks. This document is short on purpose — the system has few moving parts and most failures self-heal.

> **Audience.** Maintainers and on-call volunteers. If you found this and you're a paddler with a question, head to [`GETTING_STARTED.md`](../GETTING_STARTED.md) instead.

---

## 1. Severities

| Level | Definition | Example | Response time |
|---|---|---|---|
| **P0** | Site is down or showing materially incorrect grades to real users. | Map blank in production; red pin for a paddle-safe site that just had a clean sample. | Drop everything; investigate within the hour. |
| **P1** | A signal source is dark but the rest of the system is up; grades degrade per rubric. | USGS NWIS returning 503 for > 6 h; ARK fixture file deleted. | Same day. Site loses that signal until fixed. |
| **P2** | Cosmetic or data-quality issue that doesn't change verdicts. | Pin coordinates off by ~200 m; sparkline labels misformatted. | Within the week. |

> We are not paged. There is no on-call rotation. P0s get a manual response from whichever maintainer notices first. The disclaimer copy makes it clear that this service is not safety-critical and provides "advisory only" guidance.

---

## 2. Common P0 / P1 incidents

### 2.1 Map is blank in production

**Symptom.** Homepage loads but pins never appear. Console shows a fetch error for `/data/sites.geojson`.

**Diagnose.**

```bash
curl -I https://<r2-public-url>/sites.geojson
```

If 404 or 403 → R2 bucket misconfigured. If 200 → frontend bug; check Sentry.

**Mitigate.**

- If the most recent GitHub Actions `connectors` workflow failed, re-run it manually via the Actions UI (`workflow_dispatch`).
- If the bucket is misconfigured, restore the previous build's artifacts: every R2 build is content-addressed; the `manifest.json` lists the build_id and you can re-point the alias.

**Root-cause checklist.**

- [ ] Did a connector throw an unhandled error (vs. structured `ConnectorError`)?
- [ ] Did the build step fail to upload to R2 (credential rotation, quota)?
- [ ] Did a schema change in `sites.geojson` break the frontend parser?

---

### 2.2 Stale data older than 24 h

**Symptom.** `/sources` page shows a build timestamp > 1 day old. Stale banner is visible.

**Diagnose.**

1. Check the latest GitHub Actions run for the `connectors` workflow. Most recent failure log is the lead.
2. If the workflow is failing because of a single connector, the build still completes (graceful degradation) — but the `manifest.json` shows that source's `error` field. Confirm by inspecting `manifest.json` directly.
3. If the workflow itself isn't firing, check the cron schedule; GitHub occasionally throttles free-tier crons during busy windows.

**Mitigate.**

- Trigger a manual rebuild from the Actions UI.
- If the issue is a flaky upstream source, leave the build degraded and document in a follow-up issue. The user-facing stale banner already communicates the situation.

---

### 2.3 A connector starts throwing schema errors

**Symptom.** Build logs show `ConnectorError { code: 'SHAPE' }`. The source's records stop flowing.

**Diagnose.** Read the connector's `index.ts` to see what shape it expects. Compare to the upstream response (live curl or a captured HAR).

**Mitigate.** The build automatically continues with the previous successful records for that source (per `ARCHITECTURE.md` § 6). The user-facing impact is the affected sites lose that signal — grades degrade but the app keeps working.

**Fix.** Adjust the connector to accommodate the new shape. Add a regression test using the new response as a fixture. Bump the connector's `meta.id` only if the change is wire-incompatible (it shouldn't ever be for a single source schema change).

---

### 2.4 Mapbox token rate-limited

**Symptom.** Map tiles fail to load in production. Console shows 401 / 429 from `api.mapbox.com`.

**Mitigate.** Switch to OpenStreetMap raster tiles immediately:

```
NEXT_PUBLIC_MAP_STYLE=osm-raster
```

Set this env var in the Cloudflare Pages dashboard and trigger a redeploy. The map will work within minutes — slightly less polished tiles, no token needed.

**Long-term fix.** Switch to Protomaps self-hosted on R2 per ADR-0002 § Fallback trigger. Estimated effort: half a day to generate tiles for the inner-DMV bounding box plus configuration.

---

### 2.5 R2 unreachable

**Symptom.** Frontend can't fetch `/data/*.json` from R2. Cloudflare status page may show an outage.

**Mitigate.** The service worker serves the last successful cached copies (stale-while-revalidate per `public/sw.js`). Returning users see slightly stale grades — flagged by the stale banner.

If you have evidence that R2 is durably down (> 30 min), post a status update on the project's discussions page or wherever you communicate with users. No code action is required; CF Pages will retry automatically.

---

### 2.6 Cloudflare Pages outage

**Symptom.** Domain doesn't resolve.

**Mitigate.** Nothing automated. CF Pages SLO is 99.9% monthly; we live with the rare hour or two. NFR-14 explicitly accepts up to 99.5% monthly uptime.

---

## 3. Source schema change response (paste-able)

When a source changes its response shape:

1. Open an issue, severity P1.
2. Confirm the new shape with a live curl + diff against the recorded fixture.
3. Update the connector's TypeScript types + parsing logic.
4. Re-record the fixture under `connectors/<id>/fixtures/`.
5. Update existing tests; add a regression test for the new shape.
6. If the change affects emitted `NormalizedRecord`s materially (e.g., a unit change), bump the connector's notes in `DATA_SOURCES.md`.
7. Open a PR, link the issue, ship.

The pipeline keeps emitting the previous build's data for the affected source while the fix is in flight, so users don't see broken grades — just slightly stale ones.

---

## 4. Disclaimer + safety questions

Sometimes a user emails saying "I went paddling and the water was bad but your app said green." Follow the [`Report incorrect grade`](../.github/ISSUE_TEMPLATE/report-incorrect-grade.yml) issue template internally:

1. Confirm the site, date, and what the user saw vs. what the app said.
2. Pull the historical grade for that site/date from `data/snapshots/dev/history/<id>.json` or — if production — from R2.
3. Look at the underlying signals: was the bacterial sample stale? Was a CSO event reported but missed? Was the rainfall override applied?
4. Reply with what you found. Don't speculate; the rubric is deterministic and the answer is always derivable from the inputs.
5. If the rubric itself is wrong, open an ADR per `GRADING.md` § 8.

This is the most important loop in the project. Every "your grade was wrong" report is a calibration data point.

---

## 5. Releases

There is no "release." The frontend deploys on every push to `main` via Cloudflare Pages. The data refreshes on each scheduled GitHub Actions run. There are no version numbers, no release notes, no changelogs beyond `git log`.

If you change the grading rubric, write an ADR documenting the change. The ADR doubles as the user-facing change communication on the methodology page.

---

## 6. Postmortems

When a P0 happens:

1. Fix it.
2. Write a one-page postmortem in `docs/postmortems/YYYY-MM-DD-<slug>.md`. Cover: what happened, user impact, root cause, what we changed.
3. Link it from the relevant ADR or issue.
4. Move on. We are not blamelessly running a SaaS.

---

## 7. Phone numbers / contacts

- **Maintainers:** see GitHub commit history. Reach out via GitHub or Civic Tech DC Slack.
- **Data partners:** see [`docs/outreach.md`](./outreach.md).
- **Cloudflare support:** free-tier projects get community forums only. There's nobody to escalate to. Plan accordingly.
