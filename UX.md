# UX Specification

This document defines the user experience in enough detail that a designer or front-end engineer can build it without further guesswork. Visuals are described in words and ASCII; mockups are produced in Phase 0.

> **The single UX commitment we are making to the user**: from cold open on a mobile phone over LTE, "is this launch safe?" is answered in ≤ 5 seconds with ≤ 2 taps.

---

## 1. Screen inventory

| Screen | Path | Purpose |
|---|---|---|
| **Map** | `/` | Primary surface. Pins on map, bottom sheet (mobile) or sidebar (desktop). |
| **Site detail** | `/site/<id>` | Deep-linkable full card. Shareable. |
| **Methodology** | `/methodology` | How grades are computed, plain English. |
| **About** | `/about` | Credits, data sources, disclaimer, contact. |
| **Sources** | `/sources` | List of each source with last-updated time. Trust-building page. |

No login, no settings, no profile, no notifications (MVP).

---

## 2. Map screen (mobile)

### 2.1 Layout

```
┌────────────────────────────┐
│ ☰  DMV Water Watch    [⊙] │  ← Header: 56px, sticky.
│                            │     ⊙ = locate-me button.
│                            │
│                            │
│                            │
│         (map)              │
│                            │
│                            │
│                            │
│        [🚣 Paddle ▼]       │  ← Activity toggle, floating bottom-left.
│                            │
├────────────────────────────┤
│ ╱ ──── peek handle ──── ╲  │  ← Bottom sheet, default state "peek".
│ Nearest: Buzzard Point     │
│ 🟢 Paddle-safe             │
│ Bacteria low; no rain      │
│ in 72 hr                   │
└────────────────────────────┘
```

### 2.2 States

**First load:**
1. Map renders with all pins (gray skeleton while data loads, target <500 ms).
2. Geolocation prompt appears within 500 ms.
3. On grant: map flies to user, nearest site populated in peek sheet, sheet pulses subtly to draw attention.
4. On deny: map remains at default DMV view, sheet shows "Tap a pin to see details" hint.

**Pin tap:**
- Sheet expands to medium height (40% viewport) showing the tapped site detail card.
- Map smoothly pans to keep pin visible above sheet.

**Sheet drag-up:**
- Sheet expands to full height; map dims to 30% opacity but remains visible behind.
- Full site detail is scrollable.

**Search / list view:**
- Not in MVP. Sheet drag-up reveals all sites as a scrollable list below the current site detail; tap one to switch context.

### 2.3 Pin styling

Every pin is a **shape + color** glyph, not color alone (NFR-7):

| Grade | Color | Shape | Description |
|---|---|---|---|
| Green | `#10b981` | filled circle | "Pass" |
| Yellow | `#f59e0b` | filled triangle | "Caution" |
| Red | `#dc2626` | filled square | "Fail" |
| Unknown | `#9ca3af` | hollow circle with dashed border | "No data" |

Pins also have a 4px white outer ring for contrast against busy map tiles, and a subtle drop shadow.

When the user has selected paddle vs swim, pins reflect the appropriate threshold and may change color/shape live.

---

## 3. Map screen (desktop)

```
┌────────────────────────────────────────────────────────────────┐
│ DMV Water Watch                              [About] [Methodology] │
├──────────────────────────┬─────────────────────────────────────┤
│                          │ Buzzard Point Marina                 │
│                          │ Anacostia River, DC                  │
│                          │                                       │
│                          │     🟢 Paddle-safe                   │
│       (map)              │                                       │
│                          │ Bacteria low; no recent rain;        │
│                          │ real-time sensors normal.            │
│                          │                                       │
│                          │ • Bacteria: 95 MPN/100mL (3 days)   │
│                          │ • Rainfall: 0.0″ last 48 hr          │
│                          │ • Turbidity: 8 NTU (12 min)         │
│                          │ • DO: 8.1 mg/L (12 min)             │
│                          │                                       │
│                          │ [30-day chart]                       │
│                          │                                       │
│                          │ Sources: Anacostia RK · USGS · NOAA │
│                          │ [Share] [Methodology]                │
└──────────────────────────┴─────────────────────────────────────┘
```

The sidebar replaces the bottom sheet. Same content; different layout. Width: 380px fixed.

---

## 4. Detail card content

Anatomy from top to bottom:

1. **Site name** — large, bold.
2. **Sub-location** — "Anacostia River, DC" or "Belle Haven Marina, VA".
3. **Grade hero** — large icon + word ("Paddle-safe" / "Caution — sensors elevated" / "Avoid — recent heavy rain" / "No fresh data").
4. **Reason sentence** — the one-liner from the grading function.
5. **Signal breakdown** — each contributing signal with its value, units, and freshness age.
6. **30-day history** — sparkline minimum; bar chart of daily verdicts preferred.
7. **Site metadata** — parking, access, activity types supported, launch type (concrete ramp, dirt put-in, etc.). From `data/sites.json`.
8. **Sources footer** — comma-separated list of sources that contributed, each linking out to the original data.
9. **Methodology link** — "How is this grade calculated?"
10. **Share button** — copies `/site/<id>` deep link.
11. **Disclaimer** — collapsed by default; expandable.

---

## 5. Empty / loading / error states

Every component has explicit states; never blank.

### 5.1 Loading

- Map: skeleton tile grid for ~500 ms then real tiles.
- Pins: shimmer-circle placeholders during JSON fetch.
- Detail card: skeleton bars for name + grade + reason; never a spinner.

### 5.2 Empty data

- A site with no fresh data shows the gray pin and "No fresh data" in the card. The card still includes site metadata (parking, etc.) so it's not useless.
- A site with stale bacteria but fresh sonde shows yellow + the seasonal explanation.

### 5.3 Errors

- Frontend JS error → Sentry captures, user sees a single non-modal banner: "Something went wrong loading the map. Refresh, or [share what happened]."
- Network error fetching JSON → service worker serves cached version; banner reads: "Showing data cached at {time}."
- Geolocation denied → no error UI; just don't auto-center.
- Geolocation timeout → silent fallback to default view.

### 5.4 Stale

A whole-system stale state appears if `manifest.json` is older than 6 hours: top-of-page banner reads "Data may be delayed — last successful refresh: {time}." Banner is dismissible per session.

---

## 6. Activity toggle

Two-position toggle: **Paddle** (default) / **Swim**.

- Mobile: floating button bottom-left; tap opens a small menu.
- Desktop: pill toggle in the header.
- Swim option is greyed out with an info icon for DC-only sites; tooltip: "Swimming is prohibited in DC waters."
- Switching the toggle re-renders pins live without a reload.
- Choice persists in `localStorage` so a return visitor doesn't re-toggle.

---

## 7. Search and filtering (deferred)

Not in MVP. Map browse + geolocation are sufficient for ~50 sites.

If feedback demands it post-launch, the cheapest add is a Cmd-K / search-by-name palette using fuse.js client-side.

---

## 8. Accessibility checklist

| Requirement | How |
|---|---|
| Color-independent state | Pin shape varies by grade (circle / triangle / square / hollow); verdict text accompanies icon |
| Touch targets ≥ 44px | All interactive elements measured; pins use 32px visual + 44px hit area |
| WCAG AA contrast | Tested with Lighthouse + axe; pin colors verified on Mapbox Standard light + dark |
| Keyboard navigation | Tab order: header → locate-me → activity toggle → first pin (focuses sheet); arrow keys move between pins |
| Screen reader | Pin `aria-label`: "Buzzard Point Marina, paddle-safe, last tested 3 days ago." Detail card has logical heading hierarchy. |
| Reduced motion | `prefers-reduced-motion` honored: no map fly-to animation, no sheet bounce |
| Live region | Grade changes (on activity toggle) announced via `aria-live="polite"` |
| Focus visible | Custom focus ring on all interactives, never `outline: none` |

---

## 9. Performance budget

| Metric | Target |
|---|---|
| First Contentful Paint (LTE, mid-tier Android) | ≤ 1.5 s |
| Largest Contentful Paint | ≤ 2.5 s |
| Time to Interactive | ≤ 3 s |
| Total Blocking Time | ≤ 200 ms |
| Cumulative Layout Shift | ≤ 0.05 |
| JS bundle (initial route, gzipped) | ≤ 200 KB |
| Pin data fetch (sites.geojson + grades.json) | ≤ 100 KB combined |

Measured per release via Lighthouse CI in the deploy pipeline.

---

## 10. Copy guidelines

### 10.1 Tone

- **Direct.** "Bacteria are high" not "Bacterial levels appear elevated relative to recreational thresholds."
- **Confident without overclaiming.** "Paddle-safe" not "Probably fine."
- **Honest about uncertainty.** "Bacterial sampling out of season" not silence.
- **Plain.** No jargon in the primary surface. Units and acronyms only on the detail breakdown and methodology page.

### 10.2 Forbidden words

- "Crystal clear" (we don't measure clarity)
- "Pristine" (no waterway in inner DMV qualifies)
- "Safe" used unconditionally (always paired with activity: "paddle-safe", "swim-safe")
- Anything implying we predict the future

### 10.3 Required disclaimers on every card

Below the grade hero, in 12px text, always visible:

> Conditions can change between samples. Use your own judgment.

The full disclaimer (§ 11) is one tap away via "More info."

### 10.4 Localization

English only for MVP. Strings extracted into `i18n/en.json` so a future translator can drop in additional locales without touching components.

---

## 11. Disclaimer (full text)

Surfaced on About page, expandable on every detail card, and as a one-time interstitial on first visit.

> **DMV Water Watch is an informational tool, not a safety guarantee.**
>
> We aggregate publicly available water-quality data from the U.S. Geological Survey, the U.S. Environmental Protection Agency, the National Oceanic and Atmospheric Administration, the District of Columbia Department of Energy and Environment, the Anacostia Riverkeeper, and other sources. The data is updated on the schedules those sources publish, which means our information is **always at least somewhat retrospective**. Water conditions can change rapidly due to rainfall, sewer overflows, spills, algal blooms, and other events that may not be reflected in our current grade.
>
> A "paddle-safe" or "swim-safe" grade does not mean conditions are guaranteed to be safe. Always:
> - Observe posted signage and follow guidance from local authorities.
> - Avoid water contact for at least 48 hours after significant rainfall (≥ 0.5 inch), regardless of our grade.
> - Use your own judgment based on what you can see, smell, and observe.
>
> Swimming is **prohibited in District of Columbia waters** except during specifically permitted events. Our swim toggle shows hypothetical thresholds for educational purposes; it is not an endorsement of swimming in DC waters.
>
> This service is provided "as is," without warranty of any kind. By using DMV Water Watch you acknowledge that you assume all risks of water-based recreation and that we are not liable for any harm arising from use of this information.
>
> For questions, contact: [email].

---

## 12. Sharing and embedding

### 12.1 Share

- Every detail card has a Share button that copies `/site/<id>` to clipboard.
- On supporting browsers (iOS Safari, Android Chrome), Share invokes the native share sheet.
- A dynamic Open Graph image is generated at `/api/og?site=<id>` showing site name, current grade, and a tiny map.

### 12.2 Embedding (post-MVP)

Not in MVP. Tracked in [`ROADMAP.md` § Post-MVP backlog](./ROADMAP.md#post-mvp-backlog).

---

## 13. Onboarding (or lack thereof)

We do not have an onboarding flow. The product is a map; the map is the onboarding. The first-visit interstitial is the disclaimer (one tap to dismiss), not a tutorial.

Rationale: every onboarding flow we've ever built has had < 30% completion. Our users are arriving with intent ("is the river safe?") and any interstitial wastes their attention.

---

## 14. What an MVP visual prototype looks like

By the end of Phase 1, the following should be true on the live URL:

- Mobile: full-bleed map, ~10 colored pins, working geolocation, bottom sheet with detail card
- Desktop: same map + sidebar
- The card content matches § 4 above (signal breakdown, freshness stamps, sources footer, share button)
- Disclaimer is conspicuous

By the end of Phase 2, the same flows work with ~50 sites and the full grading rubric.

By Phase 3, all the polish details from § 5 (empty / loading / error / stale states) are in place and the legal disclaimer has been reviewed.

---

## 15. Future UX backlog

Items deliberately omitted from MVP. Re-evaluate post-launch:

- Search palette (Cmd-K, search by site name)
- List view as primary alternative to map
- Saved sites / favorites (requires `localStorage` + UI work)
- Notification subscription UI
- User-submitted observations or photos
- Trip planning / routing
- Tide and current overlays
- Air quality overlay
- Layered data: clicking a USGS station directly (not via a site)
- Site comparison view (two cards side by side)
- "Why" expandable explanation on each signal row (link to glossary)
- Glossary page
- Dark mode toggle (system default for now)
- Map style toggle (street / satellite)
