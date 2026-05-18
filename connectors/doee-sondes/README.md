# DC DOEE sondes connector

| Field | Value |
|---|---|
| Source | DC DOEE — real-time YSI sonde network |
| Endpoint | TBD (Phase 2 spike) |
| Auth | TBD |
| Cadence | hourly (sondes report every 15 min; we sample hourly) |
| License | Public (DC government open data) |
| Active? | Yes upstream; **fixture-backed in this MVP** |

> ⚠️ **Fixture-backed pending DOEE EQuIS query confirmation.** Phase 2 spike (2026-05-18) found that DC DOEE's real water-quality data flows through an **EQuIS Public Access portal** at https://dcdoeepub.equisonline.com/PUBLIC.html. The portal claims to contain "all of DOEE's water quality data dating from 2000" but its query/export pattern isn't documented externally; the next spike task is interactive (open DevTools, inspect network tab during a search, capture the underlying request URL). Until then this connector reads a fixture so the grading rubric's sonde-sanity path is exercised.

## Replacing the stub

The data shape we need is one row per (station × timestamp) with turbidity, dissolved oxygen, water temperature, pH, and chlorophyll. Replace the body of `fetchRaw()` in `index.ts` with whatever HTTP fetch + parse logic DOEE's actual export requires.

The downstream code is already shape-stable — once `fetchRaw` returns `RawSondeReading[]`, the rest works.

### Spike continuation steps (for the next contributor)

1. Open https://dcdoeepub.equisonline.com/PUBLIC.html in a browser with DevTools → Network tab.
2. Run a query for a recent date range on the Anacostia River; capture the request URL.
3. EQuIS portals are EarthSoft software; they often expose REST endpoints with query-string filters. Look for `/eqWebApi/` or `/EDP/` paths in the captured traffic.
4. If the export is XLSX or CSV only, evaluate whether a scheduled download + parse pipeline is acceptable.

### Alternative path

If the EQuIS portal proves too complex, write a polite email to `doee.communications@dc.gov` per [`docs/outreach.md`](../../docs/outreach.md) § 3.2 asking which export pattern DOEE recommends for a non-commercial paddler-safety project. DOEE has historically been open to data partnerships for civic tech.

## What we pull

| Parameter | Canonical units | Drives… |
|---|---|---|
| Turbidity | NTU | Sonde sanity check (caution at > 50, fail at > 100) |
| Dissolved oxygen | mg/L | Sonde sanity check (caution at < 5, fail at < 3 → DO collapse) |
| Water temperature | °C | Heat advisory (caution at > 32) |
| pH | unitless | Detail-card display only |
| Chlorophyll | µg/L | Algal-bloom proxy (display only) |

All thresholds source from [`GRADING.md`](../../GRADING.md) § 3 Step 4.

## Cold outreach

Before the real fetch ships, reach out to DC DOEE per [`docs/outreach.md`](../../docs/outreach.md) § 3.2. Ask their team to review the methodology page (specifically the sonde thresholds) so we match what they consider actionable.

## Testing

```bash
npm test -- connectors/doee-sondes
```
