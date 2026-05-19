# Getting Started

A friendly introduction to **DMV Water Watch** for newcomers — paddlers, neighbors, students, and community organizers — even if you've never written code.

> If you're a software developer, head to [`CONTRIBUTING.md`](./CONTRIBUTING.md) and [`TESTING.md`](./TESTING.md) instead. This guide is intentionally non-technical.

---

## 1. What is this project?

DMV Water Watch is a free, open-source map for the DC Metro Area. It answers one question:

> "Is it safe to get in the water today?"

Every recreation site (kayak launch, boat ramp, swim beach) gets a color-coded grade — **green**, **yellow**, **red**, or **gray** — based on the most recent bacterial samples, rainfall in the last 48 hours, and real-time water-quality sensors. The goal is to let a paddler at a boat ramp decide, in 5 seconds on their phone, whether to launch today.

The data we use is already public — it comes from the **U.S. Geological Survey**, the **National Weather Service**, the **EPA**, the **DC Department of Energy & Environment**, and the **Anacostia Riverkeeper**. Our job is to put it all in one place and translate it into plain English.

---

## 2. Who is the project for?

We design for three kinds of people:

1. **Maya** — a 32-year-old Petworth paddler who owns a kayak and wants to know on Saturday morning whether to load it on the car. She is the **primary** user.
2. **Jay** — a 28-year-old who recently moved to Arlington and wants to find a SUP launch for the first time.
3. **Renee** — a 45-year-old in Hyattsville who cares about local environmental issues, shares articles, and wants to track trends over time.

If a feature doesn't serve one of these people well, we don't ship it.

---

## 3. How can I help if I don't code?

A lot of the project's value comes from people who never touch a code editor. The biggest contributions you can make:

### 🗺️ Suggest a launch site

Our map is hand-curated. We try to have every public launch, ramp, dock, and put-in across the inner DC Metro area on it. If you know one we're missing, tell us.

**How to do it (zero code knowledge required):**

1. Open https://github.com/sgiacinto/CivicTech in your browser.
2. Click the **Issues** tab.
3. Click **New issue** → choose the **Suggest a site** template (we publish issue templates so you don't have to start from scratch).
4. Fill in: site name, approximate location (a Google Maps link works), what kind of launch it is (kayak / SUP / boat ramp), whether parking exists, and whether you've personally launched from there.
5. Click **Submit new issue**.

A volunteer reviews it, double-checks the location, and adds it to the catalog. You don't have to do anything else.

### 🛟 Tell us when a grade looks wrong

If you went paddling on the Anacostia yesterday and the water looked terrible but our map said green, please tell us. The grading rubric is calibrated against real-world conditions, and your "I was actually there" observations are gold.

Use the **Report incorrect grade** issue template. Mention:

- The site
- The date and time you were there
- What you saw (color, smell, debris, fish kill, etc.)
- What our app said at the time

We'll investigate. If the rubric needs adjusting, we'll write that up publicly and explain the change.

### 📞 Help us reach data partners

We rely on data from Anacostia Riverkeeper, Potomac Riverkeeper Network, DC DOEE, and others. The right way to build this app is **with** those organizations — get a real data feed, share credit, and let them shape what we do.

If you have a contact at any of these orgs — or paddle with someone who does — please make an introduction. The outreach plan is in [`docs/outreach.md`](./docs/outreach.md); we'll use templates and respect everyone's time.

### 📣 Share the project

Once we launch publicly, the single most valuable thing you can do is mention it to one paddling group, one canoe club, one local environmental email list. Word-of-mouth from real paddlers carries more weight than any advertising we could do.

### ✅ Verify a launch you visit

When we list a site on the map, we mark it `verified_at: null` until someone has physically confirmed it. If you visit Buzzard Point Marina and see that the ramp is paved, parking is free, and the kayak rentals are open — open an issue saying "I was there on May 18, 2026, here's what I saw." We'll update the `verified_at` field and other people will trust the listing more.

---

## 4. How do I just look at the app?

Once we deploy publicly, the URL will be on the project page. While we're still in development, the easiest way to see the app is to ask a contributor to send you a preview link from one of the open pull requests.

If you want to look at the *code* (you don't have to install anything to browse it):

- **GitHub web view**: https://github.com/sgiacinto/CivicTech
- The map screen is in [`app/page.tsx`](./app/page.tsx).
- The list of sites is in [`data/sites.json`](./data/sites.json) — that's the file to edit to suggest a new site.
- How grades are computed is explained in plain English on the [`/methodology`](./app/methodology/page.tsx) page once the app is live.

---

## 5. What's the project's status?

A working MVP is on the branch. The full phase history:

- **Phase 0 — Foundations.** Empty Next.js app + a single end-to-end pipeline. ✅ Done.
- **Phase 1 — One real source.** USGS streamflow data flowing. ✅ Done.
- **Phase 2 — Four real sources unified.** Bacterial samples, rainfall, sondes, impairment — all flowing or stubbed against real integration paths. ✅ Done.
- **Phase 3 — Polish for launch.** Error boundary, PWA, 30-day sparkline, Lighthouse CI, runbook, 34-site catalog. ✅ Done.
- **Phase 4 — Design + stack refresh.** Once UI System, Next.js 16 / React 19, Mapbox tiles. ✅ Done.
- **Phase 5 — Keyless data unlock + UI cohesion.** USGS Water Quality Portal (bbox query, hundreds of monitoring stations), NOAA Tides, stale-grade pin variant for bacteria 7-90 days old, design token system, eyebrow component. ✅ Done.
- **Phase 6 — Production launch.** Real Anacostia Riverkeeper data (pending Swim Guide API token), real DOEE sonde data, EPA AU IDs verified, legal disclaimer review, Cloudflare Pages + R2 deploy. ⏳ Next.

See [`ROADMAP.md`](./ROADMAP.md) for the full plan and [`README.md`](./README.md) § Status for the day-to-day state.

---

## 6. How do I know I can trust this app?

Three things make us auditable:

1. **Every grade shows its sources.** Tap any site, scroll to the "Sources" footer, and you'll see exactly which organizations contributed data. Each one is a clickable link out to the original.
2. **Every grade shows its age.** "Bacteria: 3 days ago." "Rainfall: 14 hours ago." We don't hide stale data — we display it honestly so you can decide.
3. **Our methodology is public.** Tap "How is this grade calculated?" on any card — the full algorithm is on [`/methodology`](./app/methodology/page.tsx) in plain English. The source code is on GitHub under an MIT license. There's no proprietary scoring.

We also publish a **disclaimer**: water-quality data is always at least somewhat retrospective. A green grade does not mean "safe" — it means "the most recent data we have suggests low risk for the activity you selected." Conditions can change between samples. Use your own judgment.

---

## 7. Have a question?

- **General questions** — open a GitHub Discussion at https://github.com/sgiacinto/CivicTech/discussions.
- **Bug reports** — open an Issue.
- **Site suggestions** — open an Issue with the "Suggest a site" template.
- **Partnership inquiries (for data providers, journalists, environmental orgs)** — see the outreach plan in [`docs/outreach.md`](./docs/outreach.md), or just open an Issue tagged "partnership."

If you'd rather email a human, ask one of the project maintainers (visible on the project's GitHub page) for their contact. We don't list a generic email here because we don't want to make commitments we can't keep.

---

## 8. A short glossary

| Term | What it means |
|---|---|
| **E. coli** | A bacterium that lives in animal guts. Finding it in water means recent fecal contamination — sewage, stormwater runoff, or wildlife. The primary "is the water safe?" signal. |
| **MPN/100mL** | "Most probable number per 100 milliliters" — how E. coli is measured. EPA's primary-contact threshold is 235 MPN/100mL; we use 575 for paddlers (less stringent because you're not drinking it). |
| **CSO** | Combined Sewer Overflow. When heavy rain overwhelms a city's sewer system, raw sewage spills into rivers. DC has a long-running CSO mitigation project; until it's done, heavy rain = elevated bacteria. |
| **Sonde** | A floating sensor that measures water continuously. DC DOEE operates several on the Anacostia and Potomac. They tell us turbidity, dissolved oxygen, and temperature in real time. |
| **Turbidity** | How cloudy the water is. High turbidity often follows heavy rain (sediment runoff) and can hint at upstream problems. |
| **Dissolved oxygen** | How much oxygen is in the water. Low DO means stressed water — algal bloom, hot weather, or pollution. Fish die when DO collapses. |
| **AU (Assessment Unit)** | EPA's way of describing a chunk of a river or lake. Each AU is rated periodically as "supporting" or "impaired" for things like recreation. |
| **PWA** | Progressive Web App. You can "install" our website on your phone home screen like an app — no app store required. Just tap the share button in your browser. |

---

## 9. What it's like to use the app

A typical Saturday morning flow for Maya:

1. She wakes up at 7:14 AM. Forecast says low 70s, partly sunny.
2. She opens DMV Water Watch on her phone. It loads in about a second.
3. The map centers on her location (Petworth). She sees Bladensburg Waterfront Park glowing green about three miles east.
4. She taps the pin. The card says: **"Bladensburg Waterfront Park — Paddle-safe — Bacteria low, no rain in 72 hours, real-time sensors normal."**
5. Below the verdict, four signal rows show E. coli 95 MPN/100mL (sampled 3 days ago), 48-hour rainfall 0.0 inches, turbidity 8 NTU (12 minutes ago), DO 8.1 mg/L (12 minutes ago).
6. She closes her phone, loads the kayak, drives over.

Total elapsed time: under 30 seconds.

---

## 10. The compact ask

If you've made it this far and care about clean rivers in the DMV, the single highest-leverage thing you can do today is:

- **Tell one other paddler** the project exists.
- **Open one issue** suggesting one launch site we're missing.
- **Verify one site** you've personally been to recently.

Three small contributions like that, multiplied across the community, are how the catalog reaches 50 sites and becomes the kind of resource that the Riverkeeper newsletters point to instead of the other way around.

Thanks for reading. Welcome aboard.

— *DMV Water Watch contributors*
