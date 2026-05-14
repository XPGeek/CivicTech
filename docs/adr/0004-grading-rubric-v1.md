# ADR-0004 — Grading rubric v1

**Status:** Accepted (calibration items open)
**Date:** 2026-05-13
**Deciders:** project bootstrap

## Context

The entire product hangs on the grading rubric. If the verdicts are arbitrary or wrong, we have no value. If the rubric is too conservative, every pin is yellow and we look broken. If it's too permissive, we lose credibility.

We considered three rubric philosophies:

1. **Pure regulatory pass-through:** show EPA assessment status. Honest but stale and not actionable for daily decisions.
2. **ML model over historical data:** predict bacterial level from rainfall, temperature, and recent samples. Tempting but requires training data we don't have and credibility we haven't earned.
3. **Deterministic decision tree using authoritative thresholds + temporal context:** combine bacterial samples (the gold-standard signal) with the 48-hour rainfall rule (the most important post-sample modifier) and DOEE real-time sondes (the most important sanity check).

Option 3 is the choice. It's transparent (we can show our work), defensible (each threshold has a citation), and tractable (deterministic, testable).

## Decision

We adopt the rubric specified in [`GRADING.md`](../../GRADING.md). Summary:

- **Primary signal:** latest bacterial sample within 7 days, evaluated against EPA RWQC thresholds (235 MPN/100mL primary contact, 575 MPN/100mL secondary).
- **Rainfall override:** if ≥ 0.5" precipitation fell after the latest bacterial sample within the last 48 hours, downgrade one step. ≥ 1.0" downgrades to red regardless of bacteria.
- **Sonde sanity check:** DOEE real-time turbidity / DO / temp can downgrade pass→yellow but cannot push pass→red except on dissolved oxygen collapse (< 3 mg/L).
- **Chronic impairment:** EPA 305(b) status shows as a badge but does not affect the daily verdict.
- **Activity toggle:** paddle (default, secondary contact) vs swim (primary contact). Selects which bacterial threshold applies.
- **Out-of-season:** when Riverkeepers don't sample (October–April), real-time sonde signals can produce a yellow verdict rather than gray-pinning the site.

Full algorithm, edge cases, and worked examples are in [`GRADING.md`](../../GRADING.md).

## Consequences

### Positive

- **Transparent.** Every grade has a derivable explanation; methodology page can publish the algorithm verbatim.
- **Testable.** A pure function takes signals and produces a grade. Unit tests cover ~20 edge cases.
- **Improvable.** We can swap to `grading/v2.ts` later without touching connectors or UI.
- **Defensible.** Each threshold has a primary citation (EPA RWQC 2012, DOEE methodology, etc.).
- **Honest.** Single-sample thresholds are the right tool for "today" decisions; the rubric explicitly calls out that it is not a regulatory assessment.

### Negative

- **Calibration debt.** Several thresholds (especially the "2× threshold = caution" band) are educated guesses informed by what other Riverkeeper communications suggest. We'll need real-data review during Phase 2.
- **No uncertainty quantification.** A reading of 234 MPN/100mL is "pass" and 236 is "caution"; reality is fuzzier. v1 ships with strict thresholds; future versions may add confidence bands.
- **Sonde override rules are judgment calls.** "Sondes can downgrade pass→yellow but not pass→red" reflects our priority on not overriding lab science with proxy signals; a future debate may revisit this.

## Open calibration items (resolved during Phase 2)

- Confirm 0.5" / 1.0" rainfall thresholds match what DC DOEE and Riverkeepers communicate publicly
- Confirm secondary contact threshold derivation (we use 4 × primary; verify against DOEE's actual practice)
- Validate the "2 × threshold = caution" band against historical Riverkeeper distributions

## Related

- [`GRADING.md`](../../GRADING.md) — full rubric specification
- ADR-0003 — Connector interface (the rubric's input)
