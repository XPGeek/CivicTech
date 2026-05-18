# DC DOEE sondes connector

| Field | Value |
|---|---|
| Source | DC DOEE — real-time YSI sonde network |
| Endpoint | TBD (Phase 2 spike) |
| Auth | TBD |
| Cadence | hourly (sondes report every 15 min; we sample hourly) |
| License | Public (DC government open data) |
| Active? | Yes upstream; **fixture-backed in this MVP** |

> ⚠️ **Phase 2 spike pending.** DOEE's real-time sonde dashboard lives at https://doee.dc.gov/service/environmental-data-maps but the machine-readable export URL has not been confirmed in code yet. This is the source we are most uncertain about format-wise. The first Phase 2 task per [`ROADMAP.md`](../../ROADMAP.md) is a half-day spike to confirm the export pattern; until then this connector reads from a fixture so the grading rubric's sonde sanity-check path is exercised.

## Replacing the stub

The data shape we need is one row per (station × timestamp) with turbidity, dissolved oxygen, water temperature, pH, and chlorophyll. Replace the body of `fetchRaw()` in `index.ts` with whatever HTTP fetch + parse logic DOEE's actual export requires.

The downstream code is already shape-stable — once `fetchRaw` returns `RawSondeReading[]`, the rest works.

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
