# Partnership Outreach Plan

Build first, talk later. Our public-data sources are aggregated under permissive licenses, so we don't need permission to launch. But the **right** way to build this is **with** the Riverkeepers and DOEE, not around them. This document plans the cold outreach we'll do once a working prototype exists.

> **Timing:** outreach starts when we have a public preview URL with at least one source live (end of Phase 1). It must be complete before public launch (end of Phase 3).

---

## 1. Why we wait until prototype

- A working demo gets a 10× higher response rate than a cold pitch.
- We can show, not tell, what we're trying to build.
- We can demonstrate that we're not extracting their data without attribution — the attribution is right there in the UI.
- We can ask for their input early enough that they feel ownership, but late enough that we're not asking them to imagine vaporware.

---

## 2. Audiences

### 2.1 Tier 1 — Direct data producers

We rely on their data; they deserve early notice and the opportunity to shape our use.

| Org | Why they matter | Outreach goal |
|---|---|---|
| **Anacostia Riverkeeper** | Their bacterial samples are the primary signal for ~24 inner-DMV sites | Confirm comfort with our use; ask if direct data feed preferable to Swim Guide scrape; offer attribution + traffic |
| **Potomac Riverkeeper Network** | Same role for Potomac sites | Same as above |
| **DC DOEE** | Real-time sonde data is our biggest differentiator | Confirm comfort with use; ask about preferred data export pattern; ask if their team would review our methodology page |
| **Anacostia Watershed Society** | Annual state-of-the-river report card; community visibility | Share methodology; ask if they want to be listed as a citation |

### 2.2 Tier 2 — Civic-tech and paddling communities

These are our distribution and early-feedback channels.

| Audience | Goal |
|---|---|
| Civic Tech DC | Already involved; share progress at Project Nights |
| Code for DC / Code for America | Listings and cross-promotion |
| Anacostia Paddle Club / DC Paddlers (FB groups) | Recruit beta testers; gather site-curation feedback |
| Local kayak rental operators (Boating in DC, Key Bridge Boathouse) | Validate accuracy; potential signage / QR partnership |
| Local environmental journalists (DCist, Washingtonian outdoor section) | Soft launch coverage |

### 2.3 Tier 3 — Federal data producers

We use their data but they don't need to know about us until usage is non-trivial.

- USGS — public domain data, no outreach needed
- EPA — same
- NOAA NWS — same

Mention them in our About / Sources page; no proactive outreach.

---

## 3. Outreach templates

### 3.1 First email to a Riverkeeper org

Subject: **DMV Water Watch — a paddler-facing map using your sampling data, asking for your input**

Hi [name],

I'm [name], a volunteer working with Civic Tech DC. I've been building a mobile-first map that helps paddlers, rowers, and kayakers across the inner DMV decide whether it's safe to get on the water on any given day.

The project unifies your bacterial sampling data with USGS streamflow, DC DOEE's real-time sondes, and NOAA rainfall into a single traffic-light "report card" per recreation site. Your data is the heart of it — without it, we'd be stuck with proxy signals.

A working prototype is live at [URL]. We're using your published data through [Swim Guide / scraped PDFs / etc.] with full attribution on every grade card.

Two reasons I'm reaching out:

1. **We want your input on accuracy.** Specifically the grading rubric ([URL/GRADING.md]) — does it match how you'd characterize the data you publish? Are our thresholds and freshness windows reasonable?
2. **We'd like to know if a direct data feed would be preferable to our current pull pattern.** We're happy to consume whatever format you'd find easiest to maintain.

This is fully open source (MIT, [repo URL]) and non-commercial. We are not monetizing your data and we don't intend to. Our goal is to be a credible consumer face for the work you do.

Would you have 20 minutes for a call in the next two weeks? Or, if email is easier, any feedback you can offer would be welcome.

Thanks,
[name]

### 3.2 First email to DC DOEE

Subject: **DMV Water Watch — using your real-time sonde data for paddler safety, asking for review**

Hi [name],

I'm [name] from Civic Tech DC. I've been building a mobile-first map that uses your real-time sonde network on the Anacostia and Potomac as part of a daily paddler-safety grade for sites across the District.

A working prototype is at [URL]. The sondes are surfaced as a "real-time sanity check" alongside Riverkeeper bacterial samples and NOAA rainfall.

Two specific asks:

1. **Could someone on your team review our methodology page ([URL/GRADING.md])?** Particularly the sonde thresholds — we'd rather match what your team considers actionable than invent our own.
2. **Is there a preferred data-export pattern we should target?** We're currently pulling from your public dashboard; if there's a more durable URL or format you'd prefer, we'll adapt.

The project is fully open source (MIT, non-commercial) and is intended as a consumer surface that respects DC water-quality science — including being honest that swimming is prohibited in DC waters, which is a framing nobody else uses correctly.

I appreciate any time you can spare.

Thanks,
[name]

### 3.3 Post to Anacostia Paddle Club / DC Paddlers

Hi all — I've been building a free, open-source map that pulls together water-quality data from Anacostia RK, Potomac RKN, DOEE, USGS, and NOAA into a single traffic-light grade per launch. Goal: replace the "is the river safe tomorrow?" group chat with something you can check on your phone in 5 seconds.

Prototype: [URL]

It would help me a lot if a few experienced paddlers could:

1. Confirm the launches I've got on the map (~50 sites across DC, NoVA, PG, Montgomery) are real, accessible, and described correctly.
2. Let me know which ones I'm missing.
3. Tell me when the grade feels wrong based on what you saw on the water.

DMs or [feedback link] welcome. Thanks!

---

## 4. Sequencing

| Week | Action |
|---|---|
| End of Phase 1 (week 3) | Send 3.1 to Anacostia Riverkeeper; observe response; iterate |
| Week 4 | Send 3.1 to Potomac Riverkeeper Network |
| Week 4 | Send 3.2 to DC DOEE |
| Week 5 | Post 3.3 to paddling community groups |
| Week 6 | Reach out to local journalists (only after legal review of disclaimer) |
| Post-launch | Open issue templates for community contributions |

---

## 5. What we will NOT do

- **Cold launch.** Going public without notifying the data producers would be discourteous and risks burning bridges we want.
- **Branded co-marketing without consent.** We don't put Riverkeeper logos on our pages until they explicitly approve.
- **Selling access.** This project is non-commercial. If we ever monetize, the relationship with data producers must be renegotiated from scratch.
- **Hide our use.** Every card surfaces who contributed which signal. Our use is in the open.
- **Promise things we can't deliver.** Don't commit to feature requests during outreach calls — log them as issues, evaluate them on the same backlog as any other proposal.

---

## 6. Tracking

A simple `docs/outreach-log.md` (created lazily, not version-pinned with secrets) tracks:

- Org name
- Contact person and email
- Date sent
- Date responded
- Outcome / next step
- Notes

This is **not** a CRM. It's a personal accountability ledger so we don't drop relationships.

Sensitive details (private contact info, off-record comments) are kept out of the public repo. Use a local `.outreach/` directory excluded by `.gitignore`.

---

## 7. Long-term partnership goals

If the project succeeds, the natural evolution is:

- **Direct data feeds** from each Riverkeeper, replacing scrapes
- **Pre-publication review** of methodology changes by partner orgs
- **Co-branded content** for advocacy moments (e.g., joint statement during a CSO event)
- **Sustainability funding** if the project's hosting / domain needs grow — pursued via Civic Tech DC's existing channels, not by monetizing the app

None of this happens in MVP. All of it depends on the outreach above being done well.
