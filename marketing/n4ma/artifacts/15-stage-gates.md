# 15. Stage Gates — Tier-2+ Skills

**Purpose:** Every skill gated out of the Tier-1 run has an exact, measurable trigger and a prep list. The point is not "later" — it's "cheap to activate the moment the trigger hits." Revisit this file quarterly (§10 cadence) and when any trigger trips.

**Legend:** 🔒 gated · trigger = the measurable condition · prep = do now, zero/low cost · first move = the action within 30 days of trigger.

---

## 1. ab-testing 🔒

- **Unlocks:** statistically valid conversion experiments instead of guesses (CRO fixes in `13-cro-plan.md` are the pre-test baseline).
- **Why gated:** tests need traffic — at <20 audit submissions/mo a test takes months to reach significance.
- **Trigger:** **≥20 audit submissions per month** for 2 consecutive months (≈200 visitors/mo at current conversion assumptions).
- **Prep now:** the 3 pre-registered tests in `artifacts/13-cro-plan.md` are written and ready to ship as-is. Instrument the funnel events from `artifacts/08` (§GA4) so baseline conversion data exists *before* the first test. Pick the tool the day the trigger hits (Vercel Edge Config / PostHog experiments — free tier).
- **First move:** run Test 1 (hero CTA copy) as a 50/50 split for one month; document the decision rule (lift ≥5% at 90% confidence = ship; else revert).

---

## 2. ads / ad-creative 🔒

- **Unlocks:** paid distribution (LinkedIn, Google Search, retargeting, YouTube) once there's a paying business case to spend against.
- **Why gated:** $0 budget and no conversion baseline — paid spend before CAC math exists is tuition, not marketing.
- **Trigger:** either (a) a funding event (§10 funding-stage unlocks: seed close = $5–15K/mo test budget) **or** (b) 6+ consecutive months where the audit → purchase funnel shows positive unit economics from organic alone.
- **Prep now:** `artifacts/03` (launch) + `artifacts/11` (social) produce the ad library — film cuts, finding screenshots, audit screen-captures — all natively ad-ready. Save every asset as it's made; never re-produce. Write the CAC assumption into `ops-run-status.md` the day the first paid test launches.
- **First move:** one $500–1,000 test on the best-converting organic asset, 2 ad variants, 2-week window. Kill criterion: CPA > 2× target from the start.

---

## 3. attribution 🔒

- **Unlocks:** knowing which channel actually produces audit starts + purchases — required before any paid spend.
- **Why gated:** with one funnel (audit → workspace) and near-zero traffic, a single-touch model already explains 100% of conversions. Multi-channel attribution is overhead, not insight, at this stage.
- **Trigger:** a second acquisition channel consistently driving ≥10% of audit starts **or** first paid campaign goes live.
- **Prep now:** the UTM scheme in `artifacts/08` (§GA4) is already the attribution backbone — every link from every artifact uses it. Keep the audit-lead + `activated` event as the conversion definition so attribution has one agreed "success" metric.
- **First move:** compare UTM-source cohorts in GA4 (audit-start rate by source) — first-touch for acquisition, last-touch for purchase.

---

## 4. popups 🔒

- **Unlocks:** exit-intent / scroll-triggered email capture on high-traffic pages.
- **Why gated:** at current traffic, popups convert noise into noise — and a popup on a 2-minute audit page would cannibalize the audit itself (the real capture mechanism).
- **Trigger:** **≥50 audit submissions/mo** (site traffic high enough that a popup's marginal captures are meaningful).
- **Prep now:** nothing to build — the capture pattern already exists (audit-lead form in the blur gate). When triggered, reuse that exact component/flow rather than a third-party popup tool.
- **First move:** one scroll-trigger on the cornerstone guide, capture-only (no discount bait — off-brand), suppression for anyone who already captured.

---

## 5. community-marketing 🔒

- **Unlocks:** genuine presence in r/Accounting, r/smallbusiness, and finance-ops communities.
- **Why gated:** a brand-new account with zero history posting about its own product reads as spam and burns the community's goodwill — the plan's §4 already has the alternative (participate with value first, link later).
- **Trigger:** 5–8 weeks of consistent value-first participation (the §4 timeline) **and** at least 3 real users who came through the audit (so there's a story to tell, not a pitch).
- **Prep now:** `artifacts/06` (customer research) mines these exact communities for verbatims — that research *is* the participation prep. Keep the "delete-the-opening test" from `artifacts/05` as the post-format rule.
- **First move:** one value post per week in one subreddit, no links in the body; audit link only in comments when someone asks "what do you use."

---

## 6. events 🔒

- **Unlocks:** webinars, virtual summits, conference presence.
- **Why gated:** zero audience to invite + zero budget for sponsorship; a webinar with 4 attendees costs the same hours as the ones with 40.
- **Trigger:** email list ≥250 (from audit capture + newsletter) **or** a funding event.
- **Prep now:** `artifacts/12` (sales enablement) contains the demo script that *is* the webinar content. The free-tools pack (`artifacts/10`) gives the natural CTA. Nothing to build; everything to reuse.
- **First move:** a 30-minute "find your savings" live demo — the §4/Q2 idea 65 — promoted to the list, recorded, and clipped into social.

---

## 7. influencer-marketing 🔒

- **Unlocks:** sponsored mentions/reviews from SaaS-review or finance YouTubers/newsletters.
- **Why gated:** needs budget (Tier-2 spend) and a product story polished enough to survive a reviewer's first 10 minutes (wizard gap — `artifacts/01` — must be closed first).
- **Trigger:** revenue or funding event **and** the guided first-import wizard shipped.
- **Prep now:** nothing to buy. When ready, the launch one-pager from `artifacts/12` becomes the press kit; the film cuts from `artifacts/11` become b-roll for reviewers.
- **First move:** 3–5 micro-influencer outreach emails using the `artifacts/05` co-marketing sequence, product-gifting model (free Team Plus for review, no payment).

---

## 8. public-relations 🔒

- **Unlocks:** earned press coverage.
- **Why gated:** journalists need a story — a data point, a raise, or a real customer — and n4ma has none of the three yet. Pitching before that burns the list.
- **Trigger:** **case study #1 from a real activated user** (Q3 per §10) **or** a funding event.
- **Prep now:** the honest-evidence positioning (`artifacts/09` red lines, `artifacts/14` voice checklist) is the PR narrative. The savings methodology one-pager (`artifacts/12`) answers the journalist's hardest question before it's asked.
- **First move:** 5 reporter pitches built on the case study's numbers ("small business was losing $X/yr to auto-renewals — here's how they found out"), not product features.

---

## 9. revops 🔒

- **Unlocks:** pipeline management, deal desk, quotes for Business/Enterprise sales-led deals.
- **Why gated:** no pipeline — the revenue model is self-serve one-time purchases, and Business/Enterprise is inbound-only until demand exists.
- **Trigger:** first inbound Business/Enterprise inquiry **or** ≥3 Team Plus purchases in one month (signal that sales-assisted volume is near).
- **Prep now:** `artifacts/12` (sales enablement) has the 24h-SLA inbound template and objection table — the process docs already exist; revops only formalizes them into a tracker.
- **First move:** a 3-column spreadsheet (inquiry → proposal → close) + the 24h SLA, before any CRM. Upgrade to a CRM at the second sales-cycle month.

---

## 10. offers 🔒

- **Unlocks:** proper offer construction (bonuses, guarantees, value framing) for the Business/Enterprise sales-led tier.
- **Why gated:** offers engineering without buyers to test against is speculation; the Team Plus tier deliberately has no offer mechanics (one price, one path — clarity is the offer).
- **Trigger:** first sales-led conversation (Business/Enterprise inbound) — the moment someone asks "what's included for $X."
- **Prep now:** the pricing audit (`pricing-audit-v1.1.md`) already scoped the $350–500 CAD new-buyer price test and the 14-day refund default — both are offer inputs, parked until there are buyers.
- **First move:** draft one Business/Enterprise offer (scope + deliverable + guarantee) for the specific inbound prospect, using the pricing-audit levers. Never generalize an offer before 3 deals.

---

## Not applicable (❌) — no gate needed

- **sms** — no SMS infrastructure or mobile surface; revisit only if a mobile app ships.
- **aso** — no mobile app; revisit only at mobile launch.

## On-demand (🎲/🎞️) — invoke, don't gate

- **marketing-council** — invoke for any decision where the plan's sections conflict or a §13 open decision blocks progress (acts as a board of advisors).
- **image / video / video-use** — asset production on demand (film cuts, social graphics, landing assets); currently serviced by the launch-film project + short-form cuts.

---

## Quarterly review checklist

At the start of each month (aligned with the §9 roadmap cadence), re-read this file and update:

- [ ] Which triggers tripped last month? (audit subs/mo, list size, purchases, inbound inquiries)
- [ ] Any gate that should open early (e.g., surprise organic channel)? — record why in `ops-run-status.md`
- [ ] Any prep item that's now stale (e.g., artifact superseded by product change)?
- [ ] Update the four funnel numbers in `ops-run-status.md` so the triggers have live inputs.