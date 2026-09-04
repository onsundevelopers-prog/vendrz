---

## 1. Executive summary

**This plan optimizes for one thing:** turning n4ma from a strong story into a self-sustaining acquisition loop at zero marketing budget — visitor → free audit → evidence-backed finding → free workspace → 30-day Team Plus trial → one-time Team Plus purchase — and reaching **$10K CAD in cumulative paid revenue** by the end of twelve months. Today n4ma has a distinctive category ("AI financial watchdog for business software"), a working product (four real ingestion sources: upload, Gmail, Drive, Slack), a live trial + one-time purchase model (no payment processor, by design), a reworked landing page, and a flagship 60-second launch film. What it doesn't have is distribution: no audience, no SEO, no email, no analytics, no funnel data. This plan builds the machinery that takes a great product story and compounds it.

### Three big bets, ranked by leverage

**Bet 1 — The free audit is the wedge, and its single most important missing part is email capture.** n4ma already owns a lead magnet that most competitors lack: a no-signup audit that returns evidence-backed savings findings in two minutes. But today every audit is anonymous — a dead end. Adding an email field to the results page ("email me this review") turns the audit into a list, a nurture sequence, and a reactivation channel for the cost of one small change. This is the highest-leverage conversion fix in the plan, and it ships in Weeks 1–2.

**Bet 2 — Content + SEO around "money leaks" is the compounding channel.** The problem n4ma solves is searchable in a thousand phrasings ("how to stop SaaS auto-renewals," "software price increase," "duplicate subscriptions") and the market-quality math is the best quadrant: large problem × high frequency. Cornerstone guides, a savings calculator, glossary pages, and honest comparison pages build a buy-and-hold asset base that funnels into the audit from day one — and gets n4ma cited by AI answer engines as that ecosystem matures. Time in market beats timing the market.

**Bet 3 — The product's evidence loop is both the retention engine and the referral engine.** Weekly findings digests ("Acme renews Oct 24 — cancel window closes Sep 24") give paid users a reason to return that no marketing can fake, and "share-a-finding" makes the user's own savings proof the advertisement. The highest-trust referral channel — accountants and fractional CFOs, who live in their clients' money problems — becomes a revenue-share partner channel in Q2. Nothing about this bet requires budget, a public face, or a big team.

### What twelve months looks like, plausibly

- **Q1:** launch film live; GA4 + email capture wired; content hub + cornerstone 1 + savings calculator; guided first import; welcome/digest emails live; first Team Plus purchases (single digits).
- **Q2:** Product Hunt launch + directories; accountant partner channel active; share-a-finding shipped; trial-to-paid mechanics live (day-25 nudge, expiry screen); AI-answer presence started.
- **Q3:** programmatic SEO v1; first paid-cohort engagement math; purchase-friction reduction; case study #1 from a real activated user; second film asset.
- **Q4:** **~$10K CAD cumulative paid revenue** (roughly 40 Team Plus purchases); two best-converting assets doubled down; annual-season content; possible first paid pilot if revenue justifies it. Linear, honest growth — no hockey stick promised.

### 90-day priorities

1. Launch film live + embedded + 3–5 short-form cuts (Weeks 1–2).
2. Wire GA4 + UTM scheme; instrument the 6 funnel events (Weeks 1–2).
3. Add email capture to the audit results page + findings-delivery email (Weeks 1–2).
4. Content hub live: cornerstone 1, glossary v1, savings calculator (Weeks 3–4).
5. Guided first-import wizard + welcome/digest/reminder emails (Weeks 3–4).
6. Product Hunt launch with early-access referral twist; 10 accountant outreach emails; share-a-finding (Weeks 5–12).

**Stated cost:** ~$0–2K over the year (tooling only). **Stated risk:** CAC, retention, and every unit-economic number are unknown until the first cohort exists — the plan names what it doesn't know rather than guessing, and the 45-day checkpoint (§9) prevents buildup on an unmeasured funnel.
---

## 2. Strategic frame

### What n4ma is, in one sentence

n4ma is the AI financial watchdog for business software — it monitors contracts, invoices, and subscriptions for hidden fees, auto-renewals, price increases, and wasted spending, then shows a company exactly what to fix and how much it could save, with every finding tied back to evidence.

### The category we're claiming

We are claiming a new category inside the SaaS-spend space: **AI financial watchdog** — not "vendor management," not "procurement," not "spend analytics dashboard." The category frame is: *"Your business is leaking money. N4MA finds it."* The incumbent category (SaaS spend management — Vendr, Zylo, Torii, Cleary) is enterprise procurement software: expensive, deployment-heavy, built for procurement teams that most SMBs don't have. We are the self-serve, evidence-first watchdog for the other 99% — companies with 10–200 subscriptions and nobody watching them.

**Market-quality gate (problem size × frequency):** this sits in the *best quadrant* — large problem (real money leaving the business) × high frequency (renewals, escalations, and price increases recur monthly-to-quarterly, and the *watching* problem is constant). Large × frequent is the quadrant where the compounding-portfolio approach (Section 1, §4–§7) pays off most: every renewal season re-validates the product, and the anxiety ("what am I paying for?") is evergreen.

### Who we're for (ICP, distilled)

- **SMBs, $1M–$50M revenue**, 10–200 software subscriptions, no procurement function. The buyer is the founder/CEO, CFO, or an ops/finance manager who owns "why is this on the credit card."
- **Stated problem:** "Renewals sneak up on us," "prices went up again," "we don't know what we're paying for."
- **Real problem:** money quietly exits through auto-renewals, unused seats, duplicate tools, and contractual escalations — nobody is watching, so nobody catches it until it's too late.
- **What they're actually buying:** not a dashboard — *permission to stop a specific leak with proof.* The evidence (exact clause, document, page, calculation) is the product. That's why "trust the evidence, not the AI" is our differentiator, not a feature bullet.
- **Wedge ICP (free audit):** anyone who can upload a contract or invoice — the no-signup audit converts strangers into believers in two minutes, before any account exists.

### The business model logic

Trial wedge → one-time paid workspace. The **free no-signup audit** is the acquisition asset (a lead magnet that *is* the product). Signup is free and **auto-starts a full 30-day Team Plus trial** (server-side, no credit card); after it ends, **Team Plus ($250 CAD, one-time e-transfer)** unlocks the whole machine permanently — Gmail/Drive/Slack ingestion, renewal & cancellation-deadline alerts, price-increase detection, business workspace, unlimited AI — arranged by email and granted manually once the transfer clears; **Business** and **Enterprise Scale** are sales-led (team/roles, automations, governance). There is no payment processor by design: no subscriptions, no auto-charges, nothing to cancel — which also means paid state is a simple server-side grant (Clerk metadata, admin-confirmed), relevant to the ops stack (§11).

**Compounding channel thesis:** content + free-tool SEO around "money leaks" (the problem is searchable in a thousand phrasings), each piece funneling into the no-signup audit, the audit converting to trial workspaces, and the 30-day trial converting to Team Plus purchases. The launch film is the flagship asset that seeds every channel: YouTube, homepage, short-form cuts, social. Time in market beats timing the market — SEO and content are the buy-and-hold assets; the audit + trial clock is the conversion engine.

### Brand voice (the non-negotiable)

From the positioning rework and product language (see `src/lib/site.ts`, landing components):

- **Category words:** business spending leaks, wasted software spending, SaaS spending, contract intelligence, renewal intelligence, hidden costs, savings opportunities, "find wasted spending," "upcoming money leaks," "what should I fix?" — **never** "vendor management" as the category.
- **Tone:** serious, financial, precise, technical, evidence-driven. Bloomberg-level density × Linear-level polish. Calm and understated; no hype, no fake-AI badges, no gratuitous gradients or emoji.
- **Honesty rules:** never claim functionality that doesn't exist; savings numbers are always labeled (illustrative example, methodology stated); never fabricate customer results.
- **Spelling:** prose uses lowercase "n4ma"; display copy may use the spec-verbatim headlines ("Your business is leaking money. N4MA finds it.").
- **CTAs:** action-oriented and specific ("Find my savings"), never pressure-y.

Every section of this plan respects these rules.
---

## 3. Current state

*(Scored from materials — repo inspection + engagement history, 2026-09-04. Push back where you have better data.)*

### Team composition (marketing surface area)

| Person | Role | Marketing surface area |
|---|---|---|
| Founder (solo) | Product, engineering, design, marketing, support | 100% — everything. No dedicated marketing, design, content, or analytics capacity. |

**Gaps:** no marketing owner, no lifecycle/email infrastructure, no analytics wiring, no content surface, no sales motion. This plan + the agentic marketing stack (§11) is the marketing org for the next 12 months. When revenue or funding supports the first hire, it should be a π-shaped **Marketing Manager/Lead** (product marketing + growth or content), not a VP — per the team-and-agency model.

### Marketing budget (current)

| Line | Monthly |
|---|---|
| Paid acquisition | $0 |
| Marketing tooling (Ahrefs, GA4, ESP, Typefully, Dub) | $0 (none subscribed) |
| Existing infra reused for marketing (Vercel, Supabase, ElevenLabs, Remotion, GitHub) | ~$0–60 marginal |
| Retainers / fCMO | This engagement |
| **Total** | **~$0/mo** |
| Blended CAC | Unknown — top open decision (§13) |
| Spend as % of paid revenue | N/A (no paid revenue yet) |

**Funding tier:** **Tier 1 — Pre-seed / bootstrapped** ($0–$2K/mo, organic only). Every move in this plan must execute at $0 unless explicitly flagged as a future-tier unlock.

### Phase of SaaS growth

**$0–10K CAD paid revenue — the grueling phase.** Binding constraint: *proving a repeatable path from stranger → audit → trial → Team Plus purchase.* Growth pattern to expect: linear additions (a few signups and a first handful of Team Plus purchases per month) punctuated by step-functions (launch moments, a channel breakthrough). No hockey stick; the plan sequences S-curves honestly (§10).

### What's already done (acknowledge, then build on)

| Asset | Status | Marketing leverage |
|---|---|---|
| **Launch film** (60s, 1080p, VO + CC-BY music, dark-premium) | Ships today ~2pm to YouTube | Flagship. One asset, many returns: YouTube, homepage embed, 3–5 short-form cuts, social proof, sales tool |
| **Landing rework** — "Your business is leaking money. N4MA finds it." | Live | Strong positioning; conversion architecture still thin (no email capture, no proof points) |
| **Free no-signup audit** ("Find my savings") | Live | The wedge. Lead magnet that *is* the product; two-minute first review |
| **Four real ingestion sources** — Upload, Gmail, Google Drive, Slack | Live, real OAuth | Category credibility: "bring your own system" story; differentiator vs. spreadsheet workflows |
| **Evidence-first AI analysis** (Gemini) — renewal dates, cancellation deadlines, price escalations, annual spend | Live | The trust story: every finding links to source clause/document/page |
| **Pricing + access model** — auto 30-day Team Plus trial → one-time $250 CAD e-transfer purchase (manual, founder-confirmed); Business/Enterprise sales-led; no payment processor | Live | Monetization ready; purchase funnel is founder-in-the-loop until process is tight; conversion data doesn't exist yet |
| **AI chat workspace redesign** (Claude-grade polish) | Live | Retention surface; "ask questions in plain English" is a real demo moment |
| **Honest FAQ + savings methodology** | Live | Trust; answers "how do you calculate savings?" before it's asked |

### What's in-flight (drafted but not shipped)

| Item | Status | Blocker |
|---|---|---|
| YouTube promo of launch film | Ships today ~2pm | None — founder action |
| "Cancel subscription via email" dashboard tab | Requested, status unclear | Product scope decision |
| Short-form cuts from the film | Not started | Time; plan makes this a Week 1–2 item |

### What's stuck (and needs to unstick this quarter)

| Issue | Cost of inaction | Action |
|---|---|---|
| No email capture on the free audit | Every audit result is anonymous; no nurture, no reactivation, no referral channel | Add email capture + results-delivery email (Weeks 1–2, §5 Move 2) |
| No analytics wired | Marketing is flying blind; can't measure the funnel the plan depends on | GA4 + UTM scheme + key event tracking (Weeks 1–2, §4/§13) |
| No content surface | The compounding channel doesn't exist; SEO starts from zero | Launch content hub + cornerstone pieces (Weeks 3–4, §4 Move 2) |
| Plan-mix quirk: Business tier definitions gate Renewals/Risk/Savings behind "Team Plus" | Confusing upgrade path at the sales-led tiers | Product decision — reconcile plan gating (open decision §13) |

### Audit rubric snapshot

| # | Section | Score | Note |
|---|---|---|---|
| 1 | Positioning | 4 | Fresh rework, distinctive category claim, mostly aligned across surfaces; app/marketing copy still catching up in places |
| 2 | Customer research | 1 | No formal research; ICP is founder intuition + positioning spec; no customer interviews captured |
| 3 | Homepage | 3 | Strong headline + honest architecture; no email capture, no proof points, no social proof |
| 4 | Sales / product pages | 2 | Pricing section good; no dedicated product/feature pages beyond the one-pager homepage |
| 5 | Conversion pages | 1 | Audit funnel is the one conversion surface; no campaign/use-case/partner pages |
| 6 | Competitor comparison | 0 | Nothing; "vs. spreadsheets," "vs. enterprise spend platforms" pages don't exist |
| 7 | Resources / content | 0 | No blog, no glossary, no tools, no case studies |
| 8 | Onboarding | 2 | Free plan + guided import exist; no welcome email, no first-finding moment optimization |
| 9 | Email lifecycle | 0 | No ESP, no flows at all |
| 10 | Sales material | 1 | Film + landing can stand in; no one-pager, deck, or case study |
| 11 | Messaging | 4 | Documented voice, consistent across landing/FAQ/film; enforced honesty |
| 12 | Pricing | 3 | Clear tiers + auto 30-day trial; manual e-transfer purchase is founder-in-the-loop (conversion risk until reply SLA is tight); plan-mix quirk at Business tier; never pressure-tested against demand |
| 13 | CRO | 0 | No tests, no instrumentation |
| 14 | GTM launches | 1 | Film launch is the first structured moment; no playbook yet |
| 15 | Ads (paid) | 0 | No paid — appropriate at Tier 1, not a failure |
| 16 | SEO | 0 | New domain, 5 sitemap pages, zero organic strategy; domain authority ~0 |
| 17 | Internationalization | 0 | EN/US only — appropriate at this stage |
| | **Total** | **22 / 85 (26%)** | |

**Shape interpretation:** strong **story** (positioning, messaging, pricing readiness) and almost zero **distribution or conversion infrastructure** (SEO 0, content 0, email 0, CRO 0, analytics 0). That shape is the whole game for this plan: the founder can already tell the story — the plan's job is to build the surfaces that carry it (content, email, measurement, funnel) and the wedge that converts strangers (the audit). Acquisition is the longest section below because that's where the gap is widest.
---

## 4. Acquisition

*How strangers become aware of n4ma — and get pulled into the audit.*

### Current state

Nothing is live except the launch film going to YouTube today. No audience, no domain authority, no content, no paid budget. The good news: the problem is searchable in a thousand phrasings ("why does my company keep paying for software we don't use," "SaaS auto-renewal trap," "software price increase letter"), and the product has a built-in lead magnet (the free audit) that most competitors' marketing lacks. The plan below is Tier-1-organic: content + video + community + partners, all feeding the audit funnel.

### The plan

**Move 1 — The launch film + YouTube as the flagship compounding asset (Now).** The 60s film is one asset with many returns: the YouTube channel's first piece, embedded on the homepage, cut into 3–5 short-form clips (a per-leak format: "Auto-renewal caught in 4 seconds"), the thumbnail + title as its own A/B surface, and the film itself as the sales tool (§10). YouTube SEO from day one: keyword in title ("SaaS subscription audit — find wasted software spend"), description with timestamps + links, end-screen to the audit. Cadence: one film-grade asset per quarter, short-form cuts monthly.

**Move 2 — Content + SEO around "money leaks" (Now → compounding).** Cornerstone pieces, each built to rank and to funnel into the audit:
- *The Software Subscription Audit* (definitive guide + checklist — the audit page *is* the product, so the guide sells the tool)
- *How to find SaaS price increases* (with a letter/cancellation template — link-worthy)
- *Auto-renewal cancellation windows cheat sheet* (by vendor — searchable, practical)
- *Glossary marketing* — SaaS-spend terms ("escalation clause," "auto-renewal," "price protection") (idea #3)
- *Savings calculator* (free tool, idea #18) — "How much is your company leaking?" → email → audit
- Competitor/alternative pages (idea #11, Q2): "n4ma vs. spreadsheets," "vs. enterprise spend platforms" — honest, evidence-led comparisons
- Programmatic SEO v1 (Q3+, idea #4): integration/pain-point pages ("find vendor contracts in Gmail/Drive/Slack")
- AI-SEO (ai-seo skill, Q2): llms.txt + structured data so n4ma shows up in AI answers to "how do I find SaaS overspending"

**Move 3 — No-face founder-led content (Now).** The founder won't be a public persona — the format is screen-capture + voiceover (exactly the film's format). Weekly cadence: one LinkedIn post (a real "finding of the week" demo: upload a contract → four fields extract → savings estimate), one X thread (the money-leak angle), both ending in the audit link. Written by the founder, produced with the agentic video pipeline. No face, no video of the founder — the product is the star.

**Move 4 — The audit as the acquisition mechanic (Now, cross-ref §5).** Every asset ends in "Find my savings." The audit is shareable: results page gets a "share this finding" affordance (§7). UTM everything so we learn which asset converts.

**Move 5 — Community value posts (Q1→Q2).** Reddit (r/smallbusiness, r/Accounting, r/Entrepreneur, r/sysadmin-adjacent) and Quora: genuinely useful answers to "how do I stop auto-renewals / negotiate SaaS prices" — with the audit offered where it's relevant, never spammed. HARO/response-source queries for "SaaS overspending" expert comments (idea #59) — one good quote becomes a backlink + credibility. Review/listing surfaces when GA: AlternativeTo, Product Hunt (idea #78 — see Move 7), G2/Capterra later.

**Move 6 — Accountant & fractional-CFO partner channel (Q2, cross-ref §7).** Accountants, bookkeepers, and fractional CFOs have clients with this exact pain and no tool. Outreach to 10–25 practitioners: "n4ma finds savings for your clients; you look like the hero; you earn a referral share." This is acquisition *and* referral — it's listed here because a partner network is a compounding channel, and it's cheap (zero CAC, trusted voice).

**Move 7 — Launch mechanics (GA moment, Weeks 5–8).** Product Hunt launch with the film + audit as the demo; AlternativeTo + directories the same week; early-access framing ("first 100 workspaces" or launch pricing at Team). One launch playbook, reused for future feature launches (idea #78/#82).

**Skipped (this tier):** paid ads (all — Tier 2 unlock, $5–15K/mo), podcast advertising, conferences/events, own-hosted podcast, media acquisitions, OOH, PR agency. All noted in the idea bank (§12) with reasons.

### 90-day acquisition moves

| Weeks | Move | Owner |
|---|---|---|
| 1–2 | Film live + embedded on homepage; YouTube channel SEO-complete; 3 short-form cuts; GA4 + UTMs wired | Founder + fCMO |
| 3–4 | Content hub live; cornerstone 1 (Software Subscription Audit) + glossary v1; savings calculator built; LinkedIn/X cadence starts (2/wk) | Founder + fCMO |
| 5–8 | Cornerstones 2–3; Product Hunt launch; AlternativeTo/directories; first Reddit/Quora value posts; 10 accountant outreach emails | Founder + fCMO |
| 9–12 | Programmatic SEO v1 planning; vs-pages drafted; first "finding of the week" series established; 90-day review of which asset converts | Founder + fCMO |

### 12-month acquisition outlook

- **Q1:** launch, foundation, first content assets, measurement live. Expect: film views in the low thousands, first organic impressions.
- **Q2:** content compounding (2 posts/wk), PH launch spike, accountant channel active. Expect: first consistent audit submissions (dozens/mo).
- **Q3:** programmatic SEO v1, vs-pages, ai-seo (AI-answer presence), second film asset. Expect: organic traffic growing month-over-month.
- **Q4:** review + double down on the 2 best-converting assets; annual-plan content season ("2027 software audit"); if revenue allows, first paid test (Tier 2 pilot).

### Skills + tools

- **Skills:** `launch`, `seo-audit`, `ai-seo`, `programmatic-seo`, `schema`, `content-strategy`, `competitors`, `social`, `cold-email`, `free-tools`, `marketing-website-design`, `copywriting`
- **Tools:** GA4 (wire in Weeks 1–2), Ahrefs Webmaster Tools/free tier (keyword research), GitHub (site/content repo), YouTube Studio, Typefully (scheduling — later), the film pipeline (Remotion + ElevenLabs) as the video-content engine
---

## 5. Activation

*How a stranger who lands in the audit becomes a believer, then a workspace, then a paying customer.*

### Current state

The funnel exists: audit (no signup) → results page → account → 30-day Team Plus trial → import → finding → purchase. What's missing: the audit results are anonymous (no email capture), the post-signup workspace is empty and unguided, there is no welcome email, and there's no measurement of where the funnel leaks. The product already auto-starts a full **30-day Team Plus trial** on signup (no credit card) — Free's limits (5 AI messages/mo + 1 evaluation import from Drive/Slack) apply only after it expires. That gift-and-timer mechanic is genuinely good and under-marketed.

### The plan

**Move 1 — The first-finding moment is the activation metric (Now, cross-ref §13).** Define activation as: *workspace with ≥1 imported source and ≥1 evidence-backed finding reviewed.* Everything in this section optimizes time-to-first-finding. Instrument it (GA4 event + product event) before optimizing anything else.

**Move 2 — Email capture on the audit (Weeks 1–2).** The highest-leverage activation fix in the whole plan: add an email field ("email me this review") on the audit results page, deliver the findings by email, and use it as the welcome/nurture entry point. Without this, every audit is a dead end. This is idea #48 (dynamic email capture) executed at the exact moment of highest intent.

**Move 3 — Guided first import (Weeks 3–4).** Post-signup, replace the empty workspace with a 3-step wizard: (1) "bring your own system" — Gmail / Drive / Slack / upload (the four-source story is the differentiator — say it), (2) one import (the 30-day trial makes it unrestricted — the perfect first step), (3) "here are your findings" — surfaced as renewal windows, price increases, risks. One-click signup via Clerk/Google (idea #90) already works; make sure it's the default path from the audit.

**Move 4 — Onboarding email flow (Weeks 3–4, cross-ref §6).** ESP wired (Resend or similar — $0 tier), welcome email at signup (idea #47: founder-signed, story-first, no pressure), findings-delivery email after first import, "your evaluation import is ready" nudge if they haven't imported in 48h (idea #51).

**Move 5 — Purchase-moment design (Q2).** The paid pitch is embedded in the product already (locked sections with "included with Team Plus" notes; purchase overlay). Improve it: make the locked sections show *why* ("Renewals — Team Plus" with a one-line value), and place a purchase nudge right after the first-finding moment ("See every renewal window across your vendors"). In-app upsell = idea #91. Test one variant (CRO skill, idea #96).

**Move 6 — Let the trial clock do the selling (Q2).** The 30-day trial *is* the mechanic now — no invented limits needed. Frame it in-app (the countdown is already visible: "X days left in your Team Plus trial"), in the welcome email, and with a buy-before-expiry nudge ("purchase now — Team Plus simply continues when the trial ends"). The expiry moment (day 30+) must be a designed purchase screen, not an error: "Your 30-day Team Plus trial has ended" → Email to Purchase → $250 CAD e-transfer. The day-25 email is the highest-leverage send in the funnel (cross-ref §6, §8).

**Skipped (this tier):** concierge setup (Q3+, high-value only), app-store optimization (no mobile app), paid onboarding ads.

### 90-day activation moves

| Weeks | Move | Owner |
|---|---|---|
| 1–2 | Email capture on audit + results-delivery email; GA4 events for audit→signup→import→finding | Founder + fCMO |
| 3–4 | Guided first-import wizard; welcome email live; 48h import nudge | Founder + fCMO |
| 5–8 | First-finding upgrade nudge live; one CRO test on the audit page | Founder + fCMO |
| 9–12 | Measure funnel leak points; iterate on the highest-leak step; trial-ending + expiry-screen copy shipped | Founder + fCMO |

### 12-month activation outlook

- **Q1:** capture + measure; funnel shape known.
- **Q2:** activation rate (audit→finding) baseline established; first variants tested.
- **Q3:** onboarding optimized against data; activation at a defensible rate (target: ≥30% of signups reach first-finding within 7 days).
- **Q4:** onboarding as a compounding asset — case studies written from activated users (§10).

### Skills + tools

- **Skills:** `onboarding`, `signup`, `cro`, `copywriting`, `emails` (onboarding flow), `ab-testing`, `paywalls`
- **Tools:** GA4 (events), Resend or equivalent ESP ($0 tier), GitHub (product code), the existing Clerk auth + displayMode gating (already built — polish, don't rebuild)
---

## 6. Retention

*How a Team Plus owner stays engaged, deepens, and keeps the product top-of-mind.*

### Current state

No lifecycle email, no ESP, no win-back, no paid cohort yet. One structural fact reframes this whole section: **Team Plus is a permanent one-time grant — there is no subscription to lapse, so financial churn is ~0% by design.** The real retention risks are (a) trial users who never convert at day 30 (§5/§8 own that moment) and (b) paid owners who go dormant — they can't churn, but a silent owner generates no findings, no referrals, and no Business/Enterprise signal. The strategic advantage: **the product itself is an engagement engine.** Renewal alerts, cancellation-deadline warnings, and price-increase detection give an owner a reason to open n4ma every time a vendor does something — the product creates its own return visits. Retention work should amplify that, not invent a parallel engagement layer.

### The plan

**Move 1 — Wire the lifecycle backbone (Weeks 3–4, cross-ref §5).** ESP live with: welcome/founder email, findings digest (weekly: "3 renewal windows this month, 1 price increase detected"), evaluation-import reminder. Keep it small — 3 flows, not 20.

**Move 2 — Findings digest as the retention beat (Q2).** The weekly digest is the single most valuable retention email: it re-proves the product's worth with fresh, specific evidence every week ("Acme renews Oct 24 — cancel window closes Sep 24"). It's also an acquisition asset (§4 Move 4: shareable). Ship it before win-back or lapsed flows.

**Move 3 — Trial-expiry + dormancy beats (Q2→Q3).** There's no cancellation flow to build (nothing auto-charges); the churn-equivalents are expiry and silence. Two flows: (1) trial-expiry reactivation — a day-31+ email to expired users ("your findings are still here — Team Plus keeps the watch on"), since a trial that ends without a purchase is the closest thing this model has to a lost customer; (2) paid-dormancy beats — owners who haven't opened in 30/60 days get "what your vendors have done since" digests, the product's own evidence as the hook. Ideas #52/#53 territory.

**Move 4 — Win-back + reactivation (Q3).** Lapsed free workspaces (signed up, never imported) get the "your evaluation import is still waiting" email; dormant Team Plus owners get a "what your vendors have done since you left" email — the product's own evidence as the hook. (Ideas #46/#52.)

**Move 5 — Support as marketing (Q2).** Solo founder = personal, fast support. Every support interaction is a retention moment: same-day replies, honest answers, "here's how to use this finding." Turn the best exchanges into FAQ entries and case-study seeds (idea #135).

**Move 6 — Paid-engagement expansion (Q3, cross-ref §8).** One-time owners have no renewal hook, so engagement is the expansion lever: the most active Team Plus owners are the Business/Enterprise signals (team/roles, governance) and the strongest referrers (§7). Track weekly-finding-review cohorts from purchase date and feed the most engaged into the sales conversation.

**Skipped (this tier):** in-app messaging platforms (Customer.io-class tooling is Tier 2+), certification programs, community building (premature at zero users — community is a Q3+/Tier-2 unlock, idea #35).

### 90-day retention moves

| Weeks | Move | Owner |
|---|---|---|
| 3–4 | ESP wired; welcome + findings-digest + trial-reminder flows live | Founder + fCMO |
| 5–8 | Digest iterated on open rates; trial-expiry + dormancy flows drafted | Founder + fCMO |
| 9–12 | Trial-expiry reactivation + paid-dormancy beats live; support-as-marketing habit established; first engagement numbers read | Founder + fCMO |

### 12-month retention outlook

- **Q1:** backbone live; no data yet.
- **Q2:** first paid cohort; digest open rates as the leading indicator.
- **Q3:** trial-expiry + dormancy flows live; first paid-cohort engagement analysis.
- **Q4:** retention baseline named — financial churn ~0% structurally (permanent grants), so the target is engagement (≥50% of Team Plus owners still reviewing findings weekly at month 3); reactivation flows firing.

### Skills + tools

- **Skills:** `emails`, `churn-prevention`, `copywriting`, `ab-testing`, `paywalls` (purchase overlay)
- **Tools:** Resend or equivalent ESP, GA4 (return visits), GitHub (product flows), product state (Supabase/Clerk — dormancy segments)
---

## 7. Referral

*How retained users and trusted intermediaries bring more users.*

### Current state

Nothing exists. But the product has an inherent referral mechanic waiting to be built: **findings are naturally shareable.** "n4ma found $18,420 of potential annual savings" is a screenshot a founder will send to another founder. The job is to make that sharing frictionless and reward the highest-trust channel — accountants/fractional CFOs — not to build a generic points program.

### The plan

**Move 1 — Share-a-finding, built into the product (Q1, Weeks 5–8).** On the findings/results page and in the digest, a "share this finding" affordance that generates a clean, branded, evidence-backed summary (leak → proof → savings estimate → n4ma link). This is the natural viral loop (idea #93, lightweight version): the finding *is* the ad, and it's honest because it's the user's own data.

**Move 2 — Accountant & fractional-CFO affiliate program (Q2, cross-ref §4 Move 6).** The highest-trust referral source for this category. Structure: practitioners get a tracked link + flat revenue share (e.g., 20% = **$50 CAD per confirmed Team Plus purchase** — clean because the payment is one-time; Business/Enterprise commissions negotiated per deal); per-practitioner landing content ("n4ma for accountants"); monthly digest of what their referrals found. Start with 10–25 warm outreach emails (cold-email skill), not a public program page. Idea #62, executed personally at this stage.

**Move 3 — Founder as referrer-zero (Now).** Before any program: the founder asks the first 10 users (by name, personally) for one intro each — the "referrer-zero" motion. Every happy user gets asked at the moment of their best finding, not generically.

**Move 4 — Early-access referral framing (GA moment, Weeks 5–8).** Product Hunt launch with a referral twist: "invite your accountant/ops lead, both get X" — a light early-access referral (idea #79) that seeds the two-sided dynamic early.

**Skipped (this tier):** newsletter referrals (no newsletter yet — Q3+, idea #92), full viral-loop engineering (premature), ambassador programs at scale (premature at zero users).

### 90-day referral moves

| Weeks | Move | Owner |
|---|---|---|
| 5–8 | Share-a-finding on results page + digest; PH launch with referral twist | Founder + fCMO |
| 9–12 | First 10 accountant outreach emails sent; referral tracking (Dub or equivalent) live; founder asks first 10 users for intros | Founder + fCMO |

### 12-month referral outlook

- **Q1:** share-a-finding ships; referral mechanics instrumented.
- **Q2:** accountant channel active (target: 3–5 active partners); first referral conversions.
- **Q3:** program formalized (public page, per-partner dashboards); referral share of new signups named (target: 20%+).
- **Q4:** two-sided referral (both parties rewarded) if the base is big enough; case-study-driven partner growth.

### Skills + tools

- **Skills:** `referrals`, `cold-email`, `social` (partner-shareable content), `copywriting`, `emails` (partner lifecycle)
- **Tools:** Dub.co or equivalent (link + attribution), GitHub (partner landing pages), a simple commission log keyed to the entitlement grant record (Notion or spreadsheet — no processor to report from), the digest pipeline
---

## 8. Revenue

*What we charge, who pays, and how it compounds.*

### Current state

Pricing and access are live and defensible under the new model (no payment processor): **every account auto-starts a 30-day Team Plus trial** on first sign-in (server-side, in Clerk metadata — not restartable, not client-extendable). When it ends, the user drops to **Free** (manual upload & analysis, 5 AI messages/mo, 1 evaluation import from Drive/Slack, simple workspace; Vendors/Contracts/Renewals/Risk/Activity/Savings locked) and sees the upgrade screen: **Team Plus — $250 CAD one-time via e-transfer**, arranged by email to the configured support address. Once the transfer is confirmed by the founder (admin endpoint), Team Plus is granted **permanently** — no subscription, never auto-charged. **Business** (team/roles, automations, priority AI) and **Enterprise Scale** (governance, SLA) are **sales-led, custom-priced**. Zero paid cohort exists yet — no conversion data, no request-to-confirmed cycle time.

### Unit economics (required table — mostly TBD, honestly)

| Metric | Value | Note |
|---|---|---|
| ARPC | $250 CAD (one-time) | ≈ $185 USD. No ARR by design — revenue is cumulative one-time grants |
| Blended CAC | TBD | Top open decision — no acquisition history |
| Structural churn | ~0% | Paid is a permanent grant — no subscription to lapse. Real losses are trial non-conversion and paid dormancy, not cancellations |
| LTV (rough) | $250 CAD + referral/expansion potential | LTV ≈ ARPC unless a Team Plus buyer upgrades to Business/Enterprise or refers others |
| LTV / CAC | TBD | Health benchmark: >3 |

Every TBD here feeds §10's budget math and belongs in §13's open decisions.

### The plan

**Move 1 — Measure the money funnel before touching pricing (Weeks 1–4).** Audit → signup → trial start → import → finding → upgrade-overlay open → purchase-email click → e-transfer request received → transfer confirmed. Instrument every step (the last two are manual — log them in the support inbox or a simple spreadsheet). The e-transfer step is founder-in-the-loop: a 24h reply SLA and a clean "Already paid? Refresh my access" path (already in product) are part of the funnel, not afterthoughts. No pricing changes until there's a baseline.

**Move 2 — The 30-day clock is the trial-to-paid mechanic (Q2).** The trial is already automatic and full-featured — the work is designing the expiry moment, which is the product's single biggest revenue surface: day-25 "your trial ends soon" email, the expiry screen already built ("Your 30-day Team Plus trial has ended"), and a buy-before-expiry nudge during the trial ("purchase now — Team Plus simply continues when the trial ends"). Test one upgrade-copy variant. (Cross-ref §5 — activation and revenue share the same moment.)

**Move 3 — Reduce manual-purchase friction (Q2→Q3).** The e-transfer path is deliberately human, so make the human steps painless: auto-drafted purchase email (already in product), founder reply within 24h with transfer details, confirmation on payment, permanent grant. Measure request→confirmed conversion and cycle time; a founder response that takes days will leak revenue at exactly the moment of highest intent. Once the first cohort exists, A/B the nudge copy and the expiry email.

**Move 4 — Reconcile the plan mix (Q1).** Open decision from §3: Business tier definitions still gate Renewals/Risk/Savings behind Team Plus — a Business buyer would see those locked. Decide: bundle (Business is sold *on top of* Team Plus) or fix the gating so Business ≥ Team Plus plus its own adds. Keep the sales story simple: Team Plus is the purchasable tier; Business/Enterprise are for companies that need team/roles and governance on top.

**Move 5 — Sales material from real evidence (Q2→Q3).** The film is the demo. Add: one-pager ("How n4ma calculates savings" — methodology as a sales document, because trust is the product), and the first case study written from a real activated user (not fabricated — per the honesty rule). Business/Enterprise inbound ("contact us") gets a reply within a day from the founder.

**Move 6 — Revenue levers held for later (Q4+).** Price localization, Business/Enterprise upsell from engaged Team Plus buyers, expansion revenue from new sources (more integrations = more data = more findings = more value). Flagged, not executed in this 12-month plan.

### 90-day revenue moves

| Weeks | Move | Owner |
|---|---|---|
| 1–4 | Purchase funnel instrumented (incl. manual request/confirm logging); plan-mix gating decision made | Founder |
| 5–8 | Trial-ending nudge + expiry-screen copy tested; 24h e-transfer reply SLA in force | Founder + fCMO |
| 9–12 | First purchase read; request→confirmed cycle-time review; methodology one-pager drafted | Founder + fCMO |

### 12-month revenue outlook

- **Q1:** baseline funnel; first handful of Team Plus purchases (realistic: single digits).
- **Q2:** trial-to-paid mechanics live (day-25 email, buy-before-expiry nudge); first cohort forming.
- **Q3:** purchase-friction reduction live; case study #1; first paid-cohort engagement math real.
- **Q4:** **goal: first $10K CAD cumulative paid revenue** (~40 Team Plus purchases or a mix including Business/Enterprise deals) — linear, honest growth, $0 CAC-driven. One-time model means revenue is cumulative, not recurring; this is the funding-stage proof point for any future round.

### Skills + tools

- **Skills:** `pricing`, `sales-enablement`, `revops`, `ab-testing`, `emails` (trial-ending flow)
- **Tools:** GA4 (funnel events incl. mailto-click), Supabase/Clerk entitlement admin (grant tracking), support inbox or spreadsheet (e-transfer request log), Notion (pricing decisions log) — no payment processor, by design.

---

## 9. 90-day roadmap

*Every move ships with an owner. This is the executable layer of Sections 4–8.*

**Owner key:** F = Founder · fC = fCMO (agentic stack) · Both = shared.

### Weeks 1–2 — Unblock (highest-confidence, lowest-cost)

| Move | Stage | Owner |
|---|---|---|
| Launch film live on YouTube + embedded on homepage (+ thumbnail/title/description SEO, end-screen to audit) | Acquisition | Both |
| 3–5 short-form cuts from the film (per-leak format) drafted | Acquisition | fC |
| GA4 + UTM scheme wired; events: audit_start, audit_result, signup, trial_start, import, finding, upgrade_open, purchase_email_click, transfer_confirmed | All stages | fC |
| Email capture on audit results page + results-delivery email | Activation | Both |
| Plan-mix gating decision made (Business vs. Team Plus section locks) | Revenue | F |

### Weeks 3–4 — Foundation

| Move | Stage | Owner |
|---|---|---|
| Content hub live (blog section on n4ma.online); cornerstone 1: *The Software Subscription Audit* (guide + checklist → audit CTA) | Acquisition | fC |
| Glossary v1 (SaaS-spend terms — idea #3) | Acquisition | fC |
| Savings calculator ("How much is your company leaking?") with email capture | Acquisition | fC |
| Guided first-import wizard (3-step: source → import → findings; four-source story front and center) | Activation | Both |
| ESP wired; welcome email (founder-signed) + findings-digest + 48h evaluation-import reminder live | Activation + Retention | Both |
| LinkedIn/X no-face cadence starts (2/wk, screen-capture demos) | Acquisition | Both |

### Weeks 5–8 — Velocity

| Move | Stage | Owner |
|---|---|---|
| Product Hunt launch (film + audit demo; early-access referral twist); AlternativeTo + directories same week | Acquisition + Referral | Both |
| Cornerstones 2–3 (*How to find SaaS price increases* + *Auto-renewal cancellation windows cheat sheet*) | Acquisition | fC |
| Share-a-finding on results page + digest ("share this finding" → branded summary) | Referral | Both |
| First-finding upgrade nudge + one upgrade-copy CRO test | Activation + Revenue | fC |
| First Reddit/Quora value posts (3–5 genuine answers) + HARO/response-source outreach | Acquisition | fC |
| 10 accountant/fractional-CFO outreach emails (tracked links) | Acquisition + Referral | Both |
| First 10 users asked personally for one intro each (referrer-zero) | Referral | F |

### Weeks 9–12 — Compound

| Move | Stage | Owner |
|---|---|---|
| "Finding of the week" series established (weekly demo → audit link) | Acquisition | Both |
| vs-pages drafted (spreadsheets, enterprise spend platforms) | Acquisition | fC |
| Programmatic SEO v1 plan (integration/pain-point pages) | Acquisition | fC |
| Trial-expiry reactivation + paid-dormancy flows drafted (no subscriptions to cancel — the model's churn risks are expiry and silence) | Retention | Both |
| Methodology one-pager ("How n4ma calculates savings") | Revenue | fC |
| 90-day review: which asset converts (audit→signup→paid), what to double down, what to kill | All stages | Both |

**45-day checkpoint:** if email capture, GA4, and the audit funnel aren't live by week 6, everything else pauses — they're the measurement and conversion backbone every compounding asset depends on.
---

## 10. 12-month outlook

### Framing

**Budget method:** Revenue-Based (Method 1) — but revenue is $0, so the practical rule is "spend what's proven, which is nothing yet." The plan is organic-only (Tier 1) until revenue data exists; the first paid-test budget unlocks only from revenue or funding, not from a projection. **Annual marketing budget:** ~$0–2K (tooling only: Ahrefs free tier, ESP free tier, Typefully ~$13–39/mo later). Experimental buffer: the 10–20% rule applies to the *time* portfolio, not dollars — 10% of weekly effort is reserved for tests (a new channel, a new format).

**Resulting end-of-year revenue goal (honest):** **$10K CAD cumulative paid revenue** — the exit from the "grueling" phase. ~40 Team Plus purchases at $250 CAD one-time (or a mix including 2–3 Business/Enterprise deals). One-time model: there is no ARR by design, so revenue compounds as cumulative purchases, not recurring spend — and each purchase is founder-in-the-loop until the transfer confirms. At $0 CAC this is achievable through the organic stack; it is a *linear* forecast, not a hockey stick.

**Growth pattern expected:** layering S-curves — Channel × Product × Market. Each quarter starts a new curve while the current one still grows: Q1 content/SEO + video; Q2 Product Hunt/momentum + accountants; Q3 programmatic SEO + AI-answer presence; Q4 second film asset + possible paid pilot. No single channel carries the plan (no silver bullets, a hundred golden pellets).

### Q1 — Months 1–3 (foundation)

**Funding state:** Tier 1 (bootstrapped, $0).
**Focus:** Ship the launch, wire the funnel, build the compounding base.
**Outcomes:**
- Launch film living on YouTube + homepage; 3–5 short-form cuts
- Audit email capture + GA4 events live; funnel shape known
- Content hub + cornerstone 1 + glossary + savings calculator
- Guided first-import wizard; welcome + digest + reminder emails live
- No-face social cadence established (2/wk)
**KPI targets:** 1–5 Team Plus purchases (first revenue); audit→finding activation baseline measured; 10+ content assets published; film views ≥2K.
**S-curves:** Content/SEO curve → launching. Video curve → launching. Measurement is now the platform under both.

### Q2 — Months 4–6 (momentum)

**Funding state:** Tier 1 (revenue may justify first tooling only).
**Focus:** Product Hunt + partner channel + trial-to-purchase mechanics.
**Outcomes:**
- Product Hunt launch + directories live
- Accountant/fractional-CFO channel active (3–5 partners; tracked links; revenue share)
- Share-a-finding shipped; referral mechanics instrumented
- Purchase moment designed after first-finding; trial-ending nudge (day-25) live
- Trial-expiry + dormancy flows drafted; digest optimizing on opens
- AI-SEO v1 (llms.txt, structured data); vs-pages live
**KPI targets:** 10+ Team Plus purchases (cumulative); 15–30 audit submissions/mo; first referral conversions; digest open ≥45%.
**S-curves:** PH/momentum curve → launch (may be a step-function). Partner curve → no-face founder content compounding. Product-led trial curve → start.

### Q3 — Months 7–9 (acceleration)

**Funding state:** Tier 1 (or Tier 2 pilot if revenue/funding allows).
**Focus:** Programmatic SEO, paid-cohort engagement math, purchase-friction reduction, second film.
**Outcomes:**
- Programmatic SEO v1 (integration/pain-point pages)
- AI-search presence: n4ma shows up in AI answers to money-leak questions
- Purchase-friction reduction live (24h e-transfer reply SLA); first paid-cohort engagement analysis; trial-expiry reactivation flows firing
- Case study #1 from a real activated user (honest, evidence-led)
- Second film-grade asset produced (e.g., "how a renewal almost slipped through" narrative)
**KPI targets:** 20+ Team Plus purchases ($5K+ CAD cumulative); organic traffic growing MoM; paid-engagement baseline named from data; case study published.
**S-curves:** Programmatic/ai-seo curve → next S-curve starting while content/partner curves still grow.

### Q4 — Months 10–12 (compound + review)

**Funding state:** Tier 1 (or Tier 2 pilot).
**Focus:** Double down on the 2 best-converting assets; annual-season content; possible first paid test.
**Outcomes:**
- "2027 Software Audit" annual-season content (forecast, checklist, renewal calendar)
- Quarterly asset review → double down / kill decisions documented
- If revenue supports it: first paid pilot (Tier 2: $5–15K/mo test on 1–2 channels with best CAC evidence)
- Funding-stage proof package ready (funnel numbers, engagement math, cumulative paid revenue) if a raise is considered
**KPI targets:** **$10K CAD cumulative paid revenue** (exit grueling phase); CAC known from pilot if run; referral ≥20% of new signups; audited savings-claimed metric public-ready.
**S-curves:** Paid curve → pilot. Annual-content curve → seasonal wave. The portfolio now has 4–5 lanes; the 70/20/10 split governs effort.

### Tier transition triggers (what changes when)

- **Confirmed purchases ≥ $500/mo** (≈2 Team Plus/mo): upgrade tooling (Ahrefs full, Typefully) — still Tier 1.
- **First $10K CAD cumulative:** the plan's Tier-1 phase is proven; decide with a raise rather than from revenue alone whether to enter Tier 2 (first marketing hire, paid pilot $5–15K/mo).
- **Any funding round closes:** Section 11's capability table applies — paid channels, second hire, agency relationships. The organic stack built in this 12-month plan is what makes that spend efficient.
---

## 11. Marketing operations stack

### The thesis

A solo founder + fCMO + the marketing-skills library can output the work of a 15–20-person marketing org, because the skills encode workflows that previously required dedicated headcount per channel. The proof for n4ma is already on the record: the launch film (60s, 1080p, VO + licensed music, dark-premium) was produced by one founder *with* an agentic stack — script, TTS voice, music, eight scenes, master render, review contact sheets — no agency, no video editor. The same pattern extends to SEO, email, social, and referral work in this plan.

### Skills mapped to AARRR stages

| Stage | Primary skills | Supporting skills |
|---|---|---|
| Acquisition | `launch`, `seo-audit`, `content-strategy`, `competitors`, `social` | `ai-seo`, `programmatic-seo`, `schema`, `cold-email`, `free-tools`, `marketing-website-design`, `copywriting` |
| Activation | `onboarding`, `signup`, `cro` | `copywriting`, `paywalls`, `ab-testing` |
| Retention | `emails`, `churn-prevention` | `copywriting`, `ab-testing`, `paywalls` |
| Referral | `referrals`, `cold-email` | `social`, `copywriting`, `emails` (partner lifecycle) |
| Revenue | `pricing`, `paywalls` | `sales-enablement`, `revops`, `ab-testing` |
| Cross-cutting | `product-marketing` (context source), `customer-research`, `marketing-ideas` | `marketing-psychology` |

### MCPs / APIs mapped to stages

| Stage | Existing connections | To wire (Q1) |
|---|---|---|
| Acquisition | GitHub (site/content repo), film pipeline (Remotion + ElevenLabs), YouTube | GA4 (events + channels); Ahrefs Webmaster Tools (free keyword data); defuddle (research extraction) |
| Activation | Clerk (signup), Supabase (product state) | GA4 events; ESP (Resend or equivalent) |
| Retention | Product state in Supabase/Clerk (trial expiry + dormancy segments — grants are permanent, no processor state) | ESP flows; GA4 retention curves |
| Referral | Manual commission log keyed to the entitlement grant record | Dub.co (tracked links + attribution) |
| Revenue | Supabase/Clerk entitlement admin (trial + grant state; manual upgrade endpoint) | GA4 paid events (incl. purchase-email clicks) |
| Cross-cutting | GitHub, Notion (knowledge base) | Notion API (decisions log) |

### A concrete example that proves the stack

The **launch film** is the demonstration: a single founder + agentic pipeline produced a broadcast-quality, storyboarded, VO + music-scored 60-second film — script adaptation from the positioning doc, ElevenLabs narration, CC-BY soundtrack selection (tempo/energy analysis), eight Remotion scenes matching the real product's design system, master 1080p render at CRF 14. That is normally a $5–20K agency deliverable. The same pattern now produces the short-form cuts (§4), the finding-of-the-week demos (§4 Move 3), and future film assets — *at $0 marginal cost, on cadence.*

### Capability unlocks by funding stage

| Stage | Headcount | Tooling | Channels live |
|---|---|---|---|
| **Today (Tier 1 — pre-seed/bootstrapped)** | Founder + fCMO | Marketing-skills library + film pipeline + GitHub + free tiers (GA4, ESP, Ahrefs Webmaster) | Organic: YouTube + content/SEO + no-face social + audit funnel + value posts + accountant channel |
| **After first $10K CAD in purchases (Tier 1.5)** | Same + first contractor (design or content) | Ahrefs full, Typefully, Dub paid tier | All above + annual-content season + first paid pilot prep |
| **Seed close (Tier 2)** | + first marketing hire (Manager/Lead, π-shaped) | + paid ad accounts (Google/LinkedIn) + `ads`/`ad-creative` skills; Mixpanel/Amplitude if needed | + paid pilot $5–15K/mo + PR push on the raise + structured launch motion |
| **Seed deployment (Tier 3)** | + designer (fractional) + second marketer | + dedicated tooling $2–5K/mo + agency relationships for niche execution | Paid scaling $20–50K/mo; weekly content cadence sustainable |
| **Series A (Tier 4)** | Full team forming (performance lead, content lead) | $5–10K/mo tooling; possible PR firm | Aggressive paid; brand campaigns; international consideration |

### Team and agency model (RACI)

| Function | Owned by (internal) | Executed by |
|---|---|---|
| Growth marketing (demand engine) | Founder (strategy) + fCMO | Agentic stack (skills + MCPs); first marketing hire at Tier 2 |
| Product marketing (story engine) | Founder (positioning owner) | fCMO `product-marketing` + `copywriting`; design via agentic design stack |
| Content marketing (trust engine) | Founder (voice) + fCMO | Agentic stack (cornerstones, glossary, calculator, short-form); first content contractor at $10K CAD in purchases |
| Paid (future) | fCMO strategy at Tier 2 | Niche agency or performance contractor (not in-house until Series A) |

**First-hire rule:** title Manager or Lead, never VP/CMO; look for π-shaped (product-marketing + growth or content). Until then, execution is contractor + agentic stack, per the team-and-agency model.
---

## 12. Tactical idea bank

Sections 4–8 prescribe what n4ma *is doing*. This section maps what's *possible* — all 139 ideas from the `marketing-ideas` library, cross-referenced to AARRR with an n4ma-specific status. Status reflects Tier-1 reality (zero budget, solo founder, no face) and brand voice (serious, evidence-driven, honest).

**Status legend:** **Now (Q1)** — in the 90-day plan · **Q2** — post-foundation layer-in · **Q3+** — post-seed-close / post-GA expansion · **Q4+** — long-game / large-investment · **Skip** — off-brand or unfit (with reason).

### 12.1 Acquisition ideas

**Now (Q1)**

| # | Idea | Client note |
|---|---|---|
| 42 | Short Form Video | Film cuts are the fastest asset pipeline — per-leak clips (auto-renewal / price-increase / duplicate software), 20–40s, end-screen to audit |
| 127 | YouTube Channel | The film is the channel's launch piece; cadence = quarterly film-grade + monthly short-form |
| 100 | Promo Videos | The film *is* this — reuse for homepage, social, ads later |
| 109 | Public Demos | "Watch a contract become findings in 60 seconds" — screen-capture demo, no face needed |
| 102 | Social Screenshots | The money-leak finding screenshot is n4ma's native format — user's own evidence as the ad |
| 78 | Product Hunt Launch | Weeks 5–8; film + audit as the demo, launch pricing framing |
| 82 | Product Hunt Alternatives | AlternativeTo + launch directories same week |
| 79 | Early-Access Referrals | PH twist: "invite your accountant/ops lead, both get X" |
| 1 | Easy Keyword Ranking | Long-tail "money leak" phrases with low competition — the cornerstone anatomy |
| 2 | SEO Audit | Run quarterly (Ahrefs Webmaster free tier) — technical base before content compounds |
| 3 | Glossary Marketing | SaaS-spend glossary v1 in Weeks 3–4 |
| 5 | Content Repurposing | Cornerstones → 3 posts each: LinkedIn, X, Quora answer |
| 7 | Internal Linking | Every asset links to the audit + to sibling cornerstones |
| 18 | Calculator Marketing | "How much is your company leaking?" savings calculator with email capture |
| 36 | Quora Marketing | Answer "how do I stop SaaS auto-renewals / negotiate price increases" with the audit as the tool |
| 37 | Reddit Keyword Research | Mine r/smallbusiness, r/Accounting, r/Entrepreneur for exact customer language → content topics |
| 39 | LinkedIn Audience | No-face founder format: screen capture + VO "finding of the week," 2/wk |
| 41 | X Audience | Same finding-of-week threads; money-leak angle |
| 59 | Article Quotes (HARO) | Respond to "SaaS overspending / subscription waste" queries — quote + backlink |
| 12 | Marketing Jiu-Jitsu | Turn enterprise spend-platform pitches into wedge copy: "we don't require a procurement team" |
| 114 | Moneyball Marketing | Ongoing methodology — track asset-to-audit conversion, double down, kill the rest |
| 139 | Customer Language | Foundational — capture exact words from every signup/support conversation into the marketing context file |

**Q2**

| # | Idea | Client note |
|---|---|---|
| 10 | Parasite SEO | 2–4 guest posts on established finance/operations newsletters/blogs |
| 11 | Competitor Comparison Pages | "n4ma vs. spreadsheets," "vs. enterprise spend platforms" — honest, evidence-led |
| 16 | Importers as Marketing | The four-source import story is marketing: "bring your own system — Gmail, Drive, Slack" |
| 17 | Quiz Marketing | "What's your money-leak score?" — leads into the audit |
| 38 | Reddit Marketing | Value posts in the 3 target subreddits (after 5–8 weeks of genuine participation) |
| 44 | Comment Marketing | High-value comments on finance/ops LinkedIn posts — no face needed, just substance |
| 49 | Monthly Newsletters | Start the list (from audit email capture); newsletter is the compounding asset later |
| 54 | Affiliate Discovery via Backlinks | Spot which finance sites link to spend-analysis content → pitch |
| 58 | Newsletter Swaps | Swap with 2–3 finance/ops newsletters (audiences overlap) |
| 65 | Live Webinars | 30-min "find your savings" demo webinar — captures + pipeline |
| 98 | Template Marketing | Cancellation letter / renewal-negotiation email templates (link-worthy, practical) |
| 115 | Curation as Marketing | A curated "money leaks of the month" digest (doubles as the retention digest) |
| 125 | App Marketplaces | The integrations are real — list n4ma in Slack App Directory + Google Workspace Marketplace (Q2–Q3) |
| 129 | Review Sites | AlternativeTo now; G2/Capterra once there are users |
| 138 | Podcast Tours | Guest on finance/ops podcasts — voice-only works with the no-face constraint |

**Q3+**

| # | Idea | Client note |
|---|---|---|
| 4 | Programmatic SEO | Integration/pain-point pages at scale once template system exists |
| 6 | Proprietary Data Content | *Only* when real (anonymized) savings data exists — never fabricated |
| 9 | Knowledge Base SEO | After help docs exist |
| 14 | Side Projects | Renewal-calendar tool, cost-per-seat tracker — free tools spinning into the funnel |
| 15 | Engineering as Marketing | Publish the parsing/extraction pipeline's capabilities as explainers |
| 35 | Community Marketing | r/accounting + a small Slacks/communities presence — premature at zero users |
| 57 | Expert Networks | Get cited by spend-management thought leaders |
| 63 | Integration Marketing | Deepen the Gmail/Drive/Slack story as "the anti-enterprise integration" |
| 74 | Press Coverage | When there's a data story or raise — founder sees it as credibility, not vanity |
| 97 | Playlists as Marketing | YouTube playlists: "software subscription audits," "vendor renewals 101" |
| 101 | Industry Interviews | Interview finance/ops operators (you host, they provide face) |
| 126 | YouTube Reviews | Sponsor/earn reviews from SaaS-review YouTubers once budget allows |
| 128 | Source Platforms | G2/Capterra once users exist |

**Q4+**

| # | Idea | Client note |
|---|---|---|
| 19 | Chrome Extensions | "Leak alert" extension — browser-relevant, big surface, defer |
| 87 | Powered By Marketing | "Findings powered by n4ma" badges on partner content |
| 84 | Giveaways | Not a priority — off-brand for the serious tone unless product-anchored |
| 131 | International Expansion | EN/US only this year; revisit after product-market fit |

**Skip (with rationale)**

| # | Idea | Reason |
|---|---|---|
| 13, 23–33, 55, 60 | Paid ads + influencer whitelisting + pixel sharing | No budget until Tier 2; revisiting at the funding trigger (§10) |
| 70 | Conference Speaking | No-face constraint; consider ghosted talks Q4+ |
| 43 | Engagement Pods | Inauthentic; conflicts with evidence-first brand voice |
| 83 | Twitter Giveaways | Off-brand for a serious financial brand |
| 86 | Lifetime Deals | Damages LTV math; off-brand for premium positioning |
| 99 | Graphic Novel Marketing | Off-brand |
| 112 | Reality TV Marketing | Off-brand |
| 118 | Cameo Marketing | Off-brand |
| 119 | OOH Advertising | Series A+ spend only |
| 76, 110, 116 | Documentaries / Awards / Grants | Q4+ long-game; not this 12 months |
| 117, 123, 136, 22 | Developer-tool ideas (competitions, OSS, DevRel, public APIs) | Not a dev tool |
| 124 | App Store Optimization | No mobile app |

### 12.2 Activation ideas

| # | Idea | Status | Client note |
|---|---|---|---|
| 48 | Dynamic Email Capture | Now | The single highest-leverage conversion fix — email on the audit results |
| 90 | One-Click Registration | Now | Clerk one-click is live; make it the default post-audit path |
| 96 | Onboarding Optimization | Now | 3-step guided first import (source → import → findings) |
| 51 | Onboarding Emails | Now | Welcome + findings-digest + 48h import reminder |
| 47 | Founder Welcome Email | Now | Founder-signed, story-first, no pressure |
| 91 | In-App Upsells | Q2 | Locked-section value copy + post-first-finding upgrade nudge |
| 95 | Concierge Setup | Q3+ | For Business/Enterprise inbound only |
| 124 | App Store Optimization | Skip | No app store product |

### 12.3 Retention ideas

| # | Idea | Status | Client note |
|---|---|---|---|
| 135 | Support as Marketing | Now | Solo-founder same-day support; best exchanges → FAQ + case-study seeds |
| 50 | Inbox Placement | Q2 | Deliverability setup so digests actually land |
| 46 | Reactivation Emails | Q3 | "Your evaluation import is still waiting" for lapsed free workspaces |
| 52 | Win-back Emails | Q3 | "What you'd have caught this month" — the product's own evidence as the hook |
| 53 | Trial Reactivation | Q3 | Day-31+ email to expired trials: "your findings are still here" — the closest thing this model has to a lost customer |
| 94 | Offboarding Flows | Q3 | No subscription to cancel (permanent one-time grant) — use the save-moment pattern on trial expiry: show what they'd lose + the e-transfer purchase as the exit |
| 134 | Certifications | Q4+ | "n4ma-certified accountant" — interesting long-game for the partner channel |

### 12.4 Referral ideas

| # | Idea | Status | Client note |
|---|---|---|---|
| 79 | Early-Access Referrals | Now | PH launch twist |
| 62 | Affiliate Program | Now (Q2 formal) | Accountant/fractional-CFO revenue-share program — highest-trust channel |
| 93 | Viral Loops | Q2 | Share-a-finding: the finding *is* the ad, honest because it's the user's data |
| 137 | Two-Sided Referrals | Q3+ | Reward both referrer + referee when the base is big enough |
| 92 | Newsletter Referrals | Q3+ | After the newsletter exists |

### 12.5 Revenue ideas

| # | Idea | Status | Client note |
|---|---|---|---|
| 91 | In-App Upsells | Q2 | Cross-cut with Activation — upgrade moment after first finding |
| 132 | Price Localization | Q4+ | Not this year; revisit after international demand |

### 12.6 Cross-cutting / brand foundation ideas

| # | Idea | Status | Client note |
|---|---|---|---|
| 139 | Customer Language | Now | Foundational — every conversation feeds the messaging context |
| 114 | Moneyball Marketing | Now | The operating methodology of the whole plan |

### Idea-bank summary

- **Acquisition:** 47 ideas applicable (21 Now, 15 Q2, 7 Q3+, 4 Q4+) — the dominant stage at n4ma's current position; distribution is the gap.
- **Activation:** 7 applicable (4 Now, 2 Q2+, 1 Q3+) · **Retention:** 7 applicable (1 Now, 1 Q2, 4 Q3, 1 Q4+) · **Referral:** 5 applicable (2 Now, 2 Q2/Q3+, 1 Q3+) · **Revenue:** 2 applicable (1 Q2, 1 Q4+) · **Cross-cutting:** 2 (both Now).
- **Skipped:** ~25 ideas skipped for brand fit (giveaways, lifetime deals, engagement pods, humor/reality/cameo), budget tier (all paid), or category fit (developer-tool ideas, ASO).

**What this proves:** n4ma is at ~45% of the available tactical surface area — appropriate for a Tier-1 solo founder. The bank is the inventory: as capacity or funding unlocks (Q2 → Q3 → Tier 2), the shelf is pre-labeled and sequenced, so scaling activity doesn't sacrifice strategic coherence. The idea bank's shape also confirms the story: **story is strong, distribution is the gap, and the audit is the conversion engine that makes raw distribution count** (§13's open decisions rely on it).

### Idea-bank sync (2026-09-04 — post full-skill run)

Statuses above are current as of the full marketingskills run (Batches 1–5, see `ops-run-status.md`). The artifacts produced in that run are the *working specs* for the Now/Q2 rows — and four timing refinements landed:

- **#48 Dynamic Email Capture (Now)** — **shipped in product** (audit-lead capture on the results blur gate + rate-limited capture endpoint). Idea status confirmed by a live feature.
- **#96 Onboarding Optimization (Now)** — full wizard spec (source → import → findings) in `artifacts/01-onboarding-activation.md`; build it before the Product Hunt date (`artifacts/03` gates PH on the wizard being shipped).
- **#18 Calculator Marketing (Now)** — build-scored ~30/35 in `artifacts/10-free-tool-pack.md`; static/no-API implementation so it carries no maintenance debt.
- **#78/#79/#82 (PH launch, early-access referrals, alternatives)** — `artifacts/03-launch-playbook.md` refines timing from "Weeks 5–8" to **wizard-shipped + 7 days** (SLC readiness gate) and gives the day-of calendar + directory wave.
- **#125 App Marketplaces (Q2)** — listing copy + screenshots prep scoped in `co-marketing-partners-v1.md` (play C); submit Q3.
- **#62 Affiliate Program (Now/Q2 formal)** — full mechanics (double-sided $50 referrer/$50 referee, accountant flat $50 CAD, Dub.co attribution, fraud rules) in `artifacts/04-referral-program.md`.
- **#46/#52/#53 (reactivation, win-back, trial reactivation, Q3)** — **full copy already drafted** in `artifacts/02-email-lifecycle.md`; they move from "write" to "enable" the day the ESP is wired. `artifacts/02` is also the spec for #47/#51 (Now) and #50 (Q2).
- **#14 Side Projects (Q3+)** — the savings calculator + template library in `artifacts/10` are the first two, already scoped.

Every gated row (paid ads, events, community, PR, etc.) now has an exact trigger + prep list in `artifacts/15-stage-gates.md` — the bank's Q3+/Q4+ rows are pre-staged, not deferred indefinitely.
---

## 13. Measurement, RACI, open decisions, appendix

### Measurement — the metrics that matter

**North star (proposed):** **Evidence-backed findings reviewed per week** (across all workspaces). This captures the product's actual value loop — someone sees a leak, proof attached, decision made — and it compounds: more findings → more savings discovered → more shareable evidence → more referral → more revenue. It's the metric that makes paid revenue a lagging indicator of a healthy flywheel, and it's specific to n4ma (not a generic revenue target).

**Leading indicators by AARRR stage:**

| Stage | Leading indicators |
|---|---|
| Acquisition | Asset→audit conversion per asset; audit starts/mo by channel (UTM); organic impressions/keywords ranking; film views + end-screen CTR |
| Activation | Audit→signup rate; audit→finding rate; time-to-first-finding; free-workspace first-import rate |
| Retention | Findings-digest open rate; weekly finding reviews per workspace; return-visit rate; cancel-save rate |
| Referral | Shares per finding; tracked-link signups (accountants); referral % of new signups |
| Revenue | Trial→purchase conversion (purchase-email click → e-transfer request → transfer confirmed); upgrade-overlay opens; ARPC ($250 CAD one-time); request→confirmed cycle time; paid-dormancy rate |

**Review cadence:**
- **Weekly:** founder + fCMO on leading indicators (§9's 6 events) — 30 min, kill/double-down decisions.
- **Monthly:** funnel review (audit→paid by stage), content performance, digest metrics; update the plan's progress file.
- **Quarterly:** plan recalibration — what compounds, what plateaus, next S-curve per §10.

### RACI

| Domain | Responsible | Accountable | Consulted | Informed |
|---|---|---|---|---|
| Strategic plan | fCMO | Founder | — | Investors (if any) |
| Brand voice / positioning | Founder | Founder | fCMO | Team |
| Website / landing | fCMO (agentic) | Founder | — | Users |
| Audit funnel + conversion | fCMO | Founder | Product | — |
| Content / SEO | fCMO (agentic) | Founder | — | — |
| Video / film assets | fCMO (agentic) | Founder | — | — |
| Founder-led social | Founder | Founder | fCMO | — |
| Lifecycle email | fCMO (agentic) | Founder | — | — |
| Partner / referral program | fCMO | Founder | — | — |
| Pricing / billing | Founder | Founder | fCMO | — |
| Analytics / measurement | fCMO | Founder | — | — |
| Future hires | Founder | Founder | fCMO | — |

### Open decisions blocking the plan

Ranked by impact.

1. **CAC (and all unit economics) unknown** — no revenue, no acquisition history. Every §8/§10 projection depends on it. **Blocked by:** time; unblocks when the first cohort exists (Q3 at the earliest). Not guessing — flagged.
2. **Does the free audit capture an email?** — the single highest-leverage conversion decision in the plan (§5 Move 2). **Blocked by:** product priority + ESP choice. Needed by Week 2.
3. **Plan-mix gating quirk** — Business tier definitions lock Renewals/Risk/Savings behind "Team Plus" (§3, §8 Move 4). A Business buyer would see locked sections. **Blocked by:** product decision — bundle (Business sold on top of Team Plus) or fix gating. Do in Q1.
4. **"Cancel subscription via email" feature** — requested, status unclear. Blocks the revenue/automation story and the FAQ claim around it. **Blocked by:** product scope decision.
5. **Analytics stack choice** — GA4 is the default (free, standard) but nothing is wired. **Blocked by:** same Week-2 decision as #2.
6. **Founder's time allocation** — the no-face social cadence (2/wk) and 10 user intro asks are founder-owned; if they slide, those channels stall. **Blocked by:** founder capacity — the agentic stack covers execution, not the founder's voice.
7. **ESP choice** — Resend (or equivalent) free tier assumed; final pick belongs with decision #2.
8. **Localization / international** — explicitly out of scope this year (§12); revisit only if international demand appears.

### Appendix — deep-dive links

**Published in this repo / shared with team:**
- `marketing/n4ma/final_plan.md` — this plan (v1)
- `marketing/n4ma/research.md` — the research record behind Sections 2–3
- `marketing/n4ma/sections/` — section-by-section artifacts (canonical, Notion-paste-ready individually)
- Product context: `.agents/product-marketing.md` (foundational context file for all marketing skills)

**Founder-authored strategic context (internal):** positioning rework spec (2026-09), landing-page copy (`src/lib/site.ts`), plan definitions (`src/lib/displayMode.tsx`) — the pricing facts in §8 came from here.

**fCMO working drafts (not yet published):** the 90-day sprint artifacts (keyword shortlist, cornerstone outlines, PH launch checklist, accountant outreach list) — generated per §9 and stored alongside this plan as the weeks run.

> Note: paths here are descriptive repo-relative references; no machine-local paths ship with this plan.
