# N4MA — Launch Playbook (Product Hunt + Directories)

**Skills:** `launch` v2.0.2 (+ directory-submissions) · **Date:** 2026-09-04
**Context:** launch film already shipped to YouTube (2026-09-04). This playbook covers the **Product Hunt launch (plan Weeks 5–8)** and the **directory wave** around it, then the post-launch machine.
**Stage reality:** ~zero owned audience → PH success here comes from *preparation and day-of effort*, not existing reach.

---

## 0. Readiness gate (SLC) before the PH date

- **Simple:** one clear job — "find the money your business is wasting on software, with proof." ✓ (positioning says exactly this)
- **Lovable:** the free no-signup audit returns evidence-backed findings in ~2 minutes — this is the lovable wedge; it *is* the demo. ✓
- **Complete:** audit → account → import → findings → watch all work in production (Gmail/Drive/Slack real OAuth). Gap check before PH: onboarding wizard + empty states (artifact 01) should ship **before** the PH date — a PH visitor who signs up and meets an empty terminal is a lost vote. **Gate decision:** PH date = wizard shipped + 7 days.
- **Not in stealth mode:** film is live; date the PH week now (target: Week 6–7) and hold it.

## 1. Product Hunt plan

### Pre-launch (2 weeks out)
1. **Listing assets** (all from existing work — the film + audit are the demo):
   - Name: n4ma · Tagline: *"Your business is leaking money. n4ma finds it."* (their tagline field ~60 chars max — this fits the framing).
   - First comment: the honest story — what it is, how the audit works, the four sources, the evidence-first rule, the one-time $250 CAD model ("no subscription, because we'd rather earn it once").
   - Media: 1080p hero (film still S1), the 60s film as the video, 3–4 product screenshots (dashboard terminal, finding + evidence, AI chat, sources).
   - Maker profile: founder, no face needed — use product screens + film.
2. **Hunter:** find 1–2 credible hunters (fintech/ops/SaaS-spend niche) with a personal note. No hunter = still launchable; prep a backer list instead.
3. **Backer/community list:** build 30–50 warm supporters *before* launch day (early users from the audit, film viewers, Reddit/community contacts made in Q1 value posts — never bought). Prepare a pre-launch ask email (see flow in `05-cold-outreach.md`).
4. **Landing prep:** homepage CTA → audit (already), plus `?from=ph` UTM on every launch link; the audit email-capture is the PH→owned conversion (launch skill: "convert PH traffic into owned relationships").
5. **Day-of calendar for a solo founder** (all-day engagement is the standard; bound it honestly — 3 focused windows + async replies):
   - 00:00–00:30 ET: listing goes live; post the first comment; notify backers (email pre-written).
   - Morning window (1h): reply to every comment; answer 3–5 "how is this different from X" questions with the evidence answer.
   - Midday window (30 min): reply again; spark 2 discussions (ask users to paste a finding they'd want checked).
   - Evening window (30 min): close the loop; thank every commenter; pin the top answer.
6. **Post-launch (next 7 days):** follow up with everyone who engaged → send the audit link personally; add PH badge to the site footer/launch page; email the captured leads the "you found us on Product Hunt" welcome (flow A/B in artifact 02); publish the announcement post on the content hub; fold the PH moment into the weekly digest ("how the launch went" — honest numbers).

### Success metrics
#1 Product of the Day is luck-adjacent; the *usable* targets: **top-10 day**, ≥50 upvotes, **≥20% of PH visitors start an audit**, ≥15% of those capture an email. Votes decay fast — the email capture + audit starts are the durable win.

## 2. Directory wave (same week)

Submit in priority order (each is a backlink + a discovery surface; screenshots/copy already exist from the film + pricing page):
1. **AlternativeTo** (n4ma → category: SaaS management / spend) — free, quick.
2. **BetaList** (early-stage + "coming soon" audience; live product = "launched" listing).
3. **AI/specialized directories** — N4MA is an AI product: Toolify, There's An AI For That (TAFT), Futurepedia, plus agent/MCP directories where listed. Use the film's demo framing.
4. **G2 / Capterra** — slower, later (Q3); needs a few organic reviews first (honest: don't plant reviews).
Track every directory with `utm_source=directory-name`; kill any that returns nothing in 60 days.

## 3. After PH: keep launching (staggered cadence)

The launch skill's core: launch again and again. N4MA's next launch moments (each = a small campaign, not full fanfare):
- **Wizard + empty states ship** (announcement to existing accounts + changelog).
- **"Finding of the week"** series (weekly demo asset — already in plan §9).
- **Second film asset** (Q3): "how a renewal almost slipped through" (plan §10).
- **Accountant program public page** (Q3, after private beta).
- **v2 feature launches** (vendor priority watch, share-a-finding) — medium announcements: email to relevant segment + in-app banner + one social post each.

## 4. Pre-launch checklist (tick as done)

- [ ] PH date set = wizard live + 7 days
- [ ] Listing text + media done (film stills, dashboard screens, demo = audit walkthrough video or loom)
- [ ] Hunter + 30–50 backers contacted (pre-written, personalized 1-liners)
- [ ] UTM scheme (`?from=ph`, directories) wired into GA4 events
- [ ] Audit email capture live (product: done; sender: needs RESEND key)
- [ ] Welcome/onboarding emails live (artifact 02)
- [ ] Day-of calendar + 3 pre-written reply buckets ready
- [ ] Announcement post drafted for the content hub (artifact 07)
- [ ] Directory list + submission copies ready
- [ ] Post-launch follow-up template ready (artifact 05)
