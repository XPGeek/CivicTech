# Grading Rubric (v1)

This document defines exactly how a site's grade is computed. The whole product hangs off this rubric — if the verdicts are wrong or feel arbitrary, the app has no value. **Treat this document as the authoritative spec.** Changes to the rubric require a new ADR.

> **Output:** one of `green`, `yellow`, `red`, or `unknown`, plus a one-sentence human-readable `reason` and a per-signal breakdown.

---

## 1. Inputs

| Signal | Source | Freshness window | Required for verdict? |
|---|---|---|---|
| **Bacteria** (E. coli or enterococcus) | Anacostia Riverkeeper, Potomac Riverkeeper, DOEE | ≤ 7 days | **Yes** (primary signal) |
| **Recent rainfall** (48-hour total at nearest station) | NOAA precipitation | ≤ 6 hours | Strongly recommended |
| **Real-time sonde** (turbidity, DO, water temp) | DC DOEE | ≤ 4 hours | Optional sanity check |
| **Streamflow / gauge height** | USGS NWIS | ≤ 2 hours | Optional sanity check |
| **Chronic impairment status** | EPA How's My Waterway | ≤ 90 days | Badge only; does not affect verdict |

---

## 2. Activity thresholds

The activity toggle (default: **paddle**) selects which bacterial threshold to apply.

| Activity | E. coli threshold (single sample) | Enterococcus threshold | Source |
|---|---|---|---|
| **Paddle / row / SUP / kayak** (secondary contact) | **≤ 575 MPN/100mL** | **≤ 130 MPN/100mL** | EPA 2012 RWQC, secondary contact derivation |
| **Swim** (primary contact) | **≤ 235 MPN/100mL** | **≤ 70 MPN/100mL** | EPA 2012 RWQC, primary contact |

Notes:

- DC waters: swimming is prohibited; the swim toggle is hidden for DC-only sites or shown with a "swimming prohibited" disclaimer.
- MD waters: swim toggle available where state law permits and a beach is identified.
- VA waters: same as MD.
- We use **single-sample maximum** values, not geometric mean. Geomean is for regulatory assessment over weeks; we are making a "today" decision.

---

## 3. Decision tree

The algorithm runs **in order**. The first matching condition produces the grade.

```
Step 1 — Check bacteria freshness:
  If bacteria signal is missing OR older than 7 days:
    bacteria_state = "stale"
    (continue; the verdict can still be computed if sonde data is fresh)

Step 2 — Apply bacterial threshold:
  Given the latest bacteria reading within 7 days:
    If reading ≤ threshold:               bacteria_state = "pass"
    Else if reading ≤ 2 × threshold:      bacteria_state = "caution"
    Else:                                 bacteria_state = "fail"

Step 3 — Apply rainfall override:
  Given 48-hour rainfall total at the nearest NOAA station:
    If rain ≥ 1.0 inch in 48h:            rainfall_state = "fail"
    Else if rain ≥ 0.5 inch in 48h:       rainfall_state = "caution"
    Else:                                 rainfall_state = "pass"

Step 4 — Apply DOEE sonde sanity check (if available, freshness ≤ 4h):
  turbidity:
    If > 50 NTU:                          sonde_turbidity = "caution"
    If > 100 NTU:                         sonde_turbidity = "fail"
  dissolved_oxygen:
    If < 5 mg/L:                          sonde_do = "caution"
    If < 3 mg/L:                          sonde_do = "fail"
  water_temp:
    If > 32 °C:                           sonde_temp = "caution"  (heat advisory)
  sonde_state = worst of the three

Step 5 — Combine signals:
  verdict = worst of (bacteria_state, rainfall_state, sonde_state)
  with these mappings:
    pass     → green
    caution  → yellow
    fail     → red
    stale    → contributes "stale" annotation but does not by itself
                produce a verdict if at least one other signal is fresh

Step 6 — Unknown fallback:
  If bacteria_state = "stale" AND no other fresh signal exists:
    verdict = "unknown"
    reason = "No fresh data available for this site."

Step 7 — Compose reason string:
  Pick the dominant contributing signal and produce a one-sentence reason.
  See § 6 for templates.
```

---

## 4. Edge cases and policy decisions

### 4.1 Missing rainfall but fresh bacteria

A bacterial sample taken **after** rainfall already encodes the rainfall effect. If the bacteria sample is from yesterday and there was rain three days ago, the rainfall doesn't override — the lab result is more authoritative.

**Rule:** Rainfall override only applies if rainfall occurred *after* the latest bacterial sample timestamp.

### 4.2 Conflicting signals

If bacteria says `pass` but DOEE turbidity is at `fail` levels, we surface `yellow` (caution), not `red`. Rationale: turbidity alone is not a health threshold; it's a sanity signal. We don't override a real lab result with an unmodeled proxy.

**Rule:** Sonde signals can downgrade a `pass` to `yellow`, but cannot push a `pass` to `red`. Sonde signals can downgrade `yellow` to `red` only on dissolved oxygen collapse (< 3 mg/L), which is a real health/wildlife indicator.

### 4.3 No bacteria within 7 days, but fresh sonde

This is the DC-in-winter scenario: Riverkeeper sampling pauses October–April. We don't pretend the sonde tells us about bacteria. The verdict is `yellow` with a clear reason: "Bacterial sampling out of season. Real-time water quality looks normal."

**Rule:** Out-of-season periods (no Riverkeeper sampling) downgrade `unknown` to `yellow` rather than gray-pinning the site. We show the site as cautiously usable based on real-time signals, with the staleness called out explicitly.

### 4.4 Site has multiple stations

A site like Bladensburg Waterfront may have an Anacostia Riverkeeper station AND a DOEE sonde nearby. We use:

- **Bacteria:** the freshest reading from any contributing station; if multiple are within 24 hours, we use the closest one geographically.
- **Sonde:** the closest sonde within 4 hours.
- **Rainfall:** always the nearest NOAA station.

**Rule:** Never average bacterial samples across stations. They're snapshots from different points. Use the freshest and document the choice.

### 4.5 Chronic impairment (EPA 305(b))

A waterbody listed as "Impaired for primary contact recreation" doesn't automatically downgrade today's verdict. It's a slow-moving regulatory designation, not a daily signal.

**Rule:** Chronic impairment shows as a persistent badge on the detail card ("Listed as impaired for recreation since 2018 — EPA"). It does not affect the daily traffic-light grade.

### 4.6 Borderline values

A reading of 234 MPN/100mL E. coli (just under the swim threshold of 235) is treated as `pass`. We do not introduce fuzzy bands. This is a regulatory threshold; we honor it exactly.

**Rule:** Thresholds are strict inequalities as defined. Confidence intervals on sample-based testing are real but out of scope for v1. Future versions may surface uncertainty bands; today we just defer to the published threshold.

---

## 5. Worked examples

### Example 1 — Clean Sunday morning

| Signal | Value | State |
|---|---|---|
| Bacteria (3 days ago) | 95 MPN/100mL E. coli | pass (paddle threshold 575) |
| Rainfall (48h) | 0.0 inches | pass |
| Sonde turbidity (12 min ago) | 8 NTU | pass |
| Sonde DO (12 min ago) | 8.1 mg/L | pass |

**Verdict: 🟢 Green.** Reason: "Bacteria within paddle-safe range; no recent rain; real-time turbidity normal."

### Example 2 — Day after Saturday thunderstorm

| Signal | Value | State |
|---|---|---|
| Bacteria (sampled Friday, 2 days ago) | 110 MPN/100mL E. coli | pass (taken before rain) |
| Rainfall (48h, fell Saturday night) | 1.2 inches | fail (>= 1.0") |
| Sonde turbidity (1 hr ago) | 78 NTU | caution |

Rainfall fell **after** the bacterial sample, so the override applies.

**Verdict: 🔴 Red.** Reason: "1.2 inches of rain in the last 48 hours; CSO advisory in effect for ~48–72 hours after heavy rain."

### Example 3 — Mid-summer, mild conditions, fresh sonde anomaly

| Signal | Value | State |
|---|---|---|
| Bacteria (yesterday) | 180 MPN/100mL E. coli | pass (paddle), caution (swim) |
| Rainfall (48h) | 0.1 inches | pass |
| Sonde DO (30 min ago) | 4.2 mg/L | caution |

User has paddle activity selected.

**Verdict: 🟡 Yellow.** Reason: "Dissolved oxygen below typical range; possible algal bloom or warm-water stress. Use judgment."

User toggles to swim — threshold becomes 235 MPN/100mL, reading of 180 still passes but is closer:

**Verdict: 🟡 Yellow.** Reason: same as above, swim threshold is also satisfied but DO anomaly persists.

### Example 4 — Winter, no Riverkeeper sampling

| Signal | Value | State |
|---|---|---|
| Bacteria | None within 7 days; last sample was October | stale |
| Rainfall (48h) | 0.2 inches | pass |
| Sonde turbidity (15 min ago) | 6 NTU | pass |
| Sonde DO (15 min ago) | 11.4 mg/L | pass |

**Verdict: 🟡 Yellow.** Reason: "Bacterial sampling out of season. Real-time water-quality signals normal."

(Per § 4.3, we surface cautious-usable rather than `unknown` when real-time signals are healthy.)

### Example 5 — Total data outage

| Signal | Value | State |
|---|---|---|
| Bacteria | Missing | missing |
| Rainfall | Missing | missing |
| Sonde | Missing | missing |

**Verdict: ⬜ Unknown (gray pin).** Reason: "No data available right now. Check directly with the site operator or check back later."

---

## 6. Reason string templates

The `reason` string is the most consequential UX surface in the product. It must be:

- Specific (which signal drove the verdict)
- Honest about uncertainty
- Free of jargon (no "MPN/100mL" in the reason; that's on the detail page)
- ≤ 90 characters when possible

Templates:

```
Green:
  "Bacteria low; no recent rain; conditions normal."
  "Bacteria low. Real-time sensors look healthy."

Yellow — rainfall driver:
  "0.6 inches of rain in the last 48 hours — caution."

Yellow — sonde driver:
  "Dissolved oxygen is low — possible algal bloom or warm-water stress."
  "Turbidity is elevated — water is murkier than usual."

Yellow — stale bacteria, sonde fresh:
  "Bacterial sampling out of season; real-time signals look normal."

Red — bacterial:
  "Bacteria exceed safe levels for paddling (last sampled {N} days ago)."

Red — rainfall:
  "{N} inches of rain in the last 48 hours; CSO advisory likely in effect."

Red — DO collapse:
  "Dissolved oxygen has collapsed — fish kill or severe algal bloom possible."

Unknown:
  "No fresh data available for this site right now."
```

Translation hooks (`i18n.gradeReason.*`) are added in Phase 3 polish even though we ship English-only.

---

## 7. What this rubric is NOT

- **Not a regulatory threshold.** EPA and state regulators use 30-day geometric means for assessment. Our single-sample approach is appropriate for daily decisions, not for legal compliance reporting.
- **Not a guarantee.** Even a green verdict can be wrong. Lab samples are point-in-time; we cannot detect a sewer overflow that happened 20 minutes ago.
- **Not a substitute for posted advisories.** If the site has a posted "No Swimming" sign, the sign wins. The app links out to authoritative advisories where they exist.
- **Not predictive.** We do not forecast tomorrow's grade. Forecasting based on rainfall predictions is a Post-MVP item that requires validation against historical samples.

This is documented in user-facing copy on the methodology page and on every detail card.

---

## 8. Versioning

The current rubric is **v1**. When we change thresholds or logic:

- Bump the rubric version (`grading/v2.ts`).
- Write an ADR documenting the change and the data that motivated it.
- Keep v1 callable for retroactive grading of historical samples in the 30-day chart.
- Surface "rubric updated" in release notes; this is the kind of thing that erodes trust if done silently.

---

## 9. Open calibration questions

Items to validate during Phase 1–2 against real DMV data and feedback from Riverkeepers:

- [ ] Is 0.5" / 1.0" the right rainfall threshold ladder? Anacostia RK uses a 72-hour window in some communications; we use 48h. Reconcile.
- [ ] Is `2 × threshold` the right "caution" band? Could be `1.5 ×`.
- [ ] Does the secondary-contact derivation (`4 × primary`) match what DOEE actually uses internally? Confirm with DOEE post-outreach.
- [ ] Should warm-water temperature (>32°C) be a `caution` or just a note?
- [ ] How do we handle Watts Branch and other sites that have ARK sampling but are not navigable by paddle — exclude entirely or show as advocacy-only?
