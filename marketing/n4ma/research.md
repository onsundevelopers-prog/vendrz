# N4MA — Marketing Plan Research Record

**Date:** 2026-09-04
**Author:** fCMO (agentic marketing strategist)

## Company snapshot
- **One-sentence description:** N4MA is the AI financial watchdog for business software — it monitors contracts, invoices, and subscriptions for hidden fees, auto-renewals, price increases, and wasted spend, and proves every finding with evidence.
- **Stage:** Pre-seed / bootstrapped. **Zero revenue to date.**
- **Product status:** Live and GA — real OAuth integrations (Gmail, Google Drive, Slack), manual upload, free no-signup audit funnel, AI analysis (Gemini), trial + one-time e-transfer access model (no payment processor), Clerk auth, Supabase backend, deployed on Vercel at n4ma.online.
- **Positioning (just reworked, 2026-09):** "Your business is leaking money. N4MA finds it." Category claim: *AI financial watchdog for business software* — deliberately NOT "vendor management."

## ICP
- **Primary ICP:** Founders, CFOs, and operations/finance managers at SMBs (~$1M–$50M revenue) managing 10–200 software subscriptions and vendor contracts with no dedicated procurement function.
- **Secondary ICP (wedge users):** Anyone who can get a free audit — the no-signup funnel accepts uploaded contracts/invoices and returns evidence-backed findings in ~2 minutes.
- **Stated problem:** "We don't know what we're paying for / renewals sneak up on us / prices went up again."
- **Real problem:** Money quietly leaves the business through auto-renewals, escalations, unused seats, and duplicate tools — nobody watches, so nobody catches it until it's too late.
- **Firmographics:** small/mid companies; founder-led or small finance/ops teams; high SaaS subscription counts; low procurement maturity.
- **Buyers:** Founder/CEO (DM + financial buyer), CFO/finance manager (evaluator + buyer), Office/IT ops (user + champion). Enterprise procurement = anti-persona at this stage.

## Funnel state today
- **Numbers:** No signup/activation/paid data exists yet — funnel is effectively zero-volume pre-launch. `[TBD]`
- **Funnel shape:** Free audit (no signup) → results page → account signup → 30-day Team Plus trial → import → finding → Team Plus purchase ($250 CAD one-time). Bottleneck unknown — nothing has shipped to an audience yet.
- **Biggest leak:** Unknown (pre-traffic). Highest-risk leaks: (a) audit results not captured (no email capture on the audit), (b) no measurement/analytics wired, (c) no activation path after signup beyond an empty workspace.

## Funding
- **Raised:** $0. Bootstrapped. **Marketing budget: $0/mo.**
- **Runway:** Not disclosed — founder-run, infrastructure costs only (Vercel, Supabase, ElevenLabs, domain).
- **Upcoming round:** None planned in the plan horizon; plan assumes organic-only until revenue justifies spend.

## Team
- **Founder (sole):** Owns product, engineering, design, marketing, support — everything. Marketing surface area: 100%. Shape: product/engineering-first; marketing is a greenfield surface.
- **Gaps:** No marketing owner, no designer (film/landing were agent-produced), no content capacity, no analytics, no email infrastructure, no sales motion.
- **fCMO role:** This plan + the agentic marketing-skills stack are the marketing org for the next 12 months. First external hire (when revenue or funding allows) should be a π-shaped Manager/Lead, not a VP.

## Current marketing budget
- **Paid acquisition:** $0
- **Marketing tooling:** $0 today (ElevenLabs + Remotion used for the launch film; Ahrefs, GA4, email ESP all unsubscribed/unwired)
- **Retainers:** fCMO (this engagement)
- **Blended CAC:** Unknown — no acquisition history. Top open decision; every projection depends on it.
- **% of paid revenue:** N/A (no paid revenue). Maps to funding tier **Tier 1 — Pre-seed / bootstrapped ($0–$2K/mo, organic only).**

## Channels currently active
- **Acquisition:** None. First asset (60s launch film, dark-premium, VO + music) goes to YouTube today ~2pm. `[in-flight]`
- **Activation:** Free audit funnel exists and works; no email capture; signup via Clerk.
- **Retention:** None (no lifecycle email, no ESP wired).
- **Referral:** None.
- **Revenue:** Live access model, no payment processor — every account gets an auto 30-day Team Plus trial; after expiry, Team Plus is **$250 CAD one-time via e-transfer** (arranged by email to the configured support address, manually confirmed); Business/Enterprise are sales-led (custom). Zero purchases to date.

## Already done (acknowledge in plan)
- **Launch film** (60s, 1080p, VO + licensed CC-BY music) — flagship asset, shipping today.
- **Landing-page rework** (2026-09) — full repositioning to "AI financial watchdog," evidence-first, savings-section with illustrative example, honest FAQ.
- **Four real ingestion sources:** Manual upload, Gmail, Google Drive, Slack — all real OAuth, working in production.
- **Free no-signup audit funnel** — "Find my savings," ~2-minute first review.
- **AI analysis** (Gemini) with extraction of renewal dates, cancellation deadlines, price escalations, annual spend.
- **Pricing + access model** — Free (30-day Team Plus trial on signup) → Team Plus $250 CAD one-time e-transfer → Business/Enterprise sales-led.
- **AI chat workspace redesign** (Claude-grade polish pass).
- **Product foundation:** contracts/vendors/renewals/risk/activity/savings sections (paid tiers), CSV/PDF export, team/roles on Business.

## In-flight and stuck
| Item | Status | Blocker |
|---|---|---|
| YouTube promo of launch film | Ships today ~2pm | None — founder action |
| Analytics (GA4 or equivalent) | Not wired | No decision; no account set up |
| Email capture on free audit | Not built | Product/priority decision |
| Lifecycle email (welcome/findings digests) | Not built | No ESP chosen; no decision |
| "Cancel subscription via email" dashboard feature | Requested; status unclear | Product scope |
| Plan-mix reconciliation (Business tier gates Renewals/Risk/Savings behind "Team Plus" in plan definitions) | Likely a product bug | Needs product decision |

## Strategic posture
- **Founder's top priority this quarter:** Get the first users + first revenue proof from the free-audit wedge; ship the launch film.
- **Most important thing to ignore:** Paid ads, brand campaigns, any spend-requiring channel — there is no budget.
- **Constraint — "no face":** The founder does not want to be a public persona/on-camera. All content must be no-face: voiceover + screen capture, ghostwritten founder essays, screen-recorded demos.
- **Constraint — honesty:** Marketing must never claim functionality that doesn't exist (the landing rework already enforced this; the plan must keep it).
- **Category tone:** Serious, financial, precise, evidence-driven; Bloomberg density × Linear polish; no hype, no gradients-everywhere, no fake-AI badges.

## Current-state rubric scores
Scored from materials (repo inspection + conversation history), 2026-09-04. See sections/03.md for the table and shape interpretation.

## Materials read
- Repo: landing components, pricing/plan definitions (`src/lib/displayMode.tsx`), sitemap, robots, audit funnel, integrations (Gmail/Drive/Slack routes + configs), auth (Clerk), README.
- Conversation history: positioning rework spec, launch-film build, integration builds, intake answers (2026-09-04): bootstrapped $0 revenue; solo founder; no audience; no face; no channels active; YouTube promo at 2pm today.