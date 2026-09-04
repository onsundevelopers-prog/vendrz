# N4MA — Customer Research Program

**Skill:** `customer-research` v2.0.2 · **Date:** 2026-09-04
**Current reality:** zero first-party data (no customers, no transcripts, no reviews). Personas in `.agents/product-marketing.md` are **hypotheses from the positioning spec — provisional, unproven**. The rubric scored customer research 1/5. This program closes that in three modes, cheapest first.

---

## Mode 2 — Mine existing signal (start now, before asking anyone anything)

Tells us what to ask and in whose words. Sources by ICP (SMB founders/CFOs + the accountants who advise them):

| Source | What to extract | Why |
|---|---|---|
| **G2/Capterra: competitor reviews** (Vendr, Zylo, Torii, Cleary) | Praise + complaints, especially 4-star; "we switched because…"; language about renewals/spend | Their customers describe the problem space; note what's missing (the SMB wedge) |
| **Reddit** — r/smallbusiness, r/Accounting, r/Entrepreneur, r/Bookkeeping | Unprompted pain: "we're paying for software nobody uses," renewal-surprise stories, price-increase threads | Raw VOC + trigger events + exact phrasing for copy |
| **Product Hunt discussions** on spend/subscription tools + our own launch comments | Objections, feature asks, category framing | Launch-day language + what to answer in the first comment |
| **Indie Hackers / founder communities** | How founders talk about SaaS bloat and "credit card audits" | Wedge language for the audit funnel |
| **HARO/response-source queries** (runs alongside plan §4 Move 5) | The questions journalists get asked about SaaS waste | Content + PR angles |

**Per-source extraction:** verbatim quote → context → sentiment → theme tag (pain / trigger / outcome / alternative / language) → customer-profile signals. Log into a VOC sheet. **Synthesis:** cluster → frequency × intensity → segment → money quotes (5–10) → contradictions. **Confidence labels:** High = 3+ independent sources, unprompted; Medium = 2; Low = single source. **Minimum viable sample:** don't draw persona/messaging conclusions under 5 independent points per segment.

**Volume target:** ≥25 logged verbatims across ≥4 sources before Mode 3 interview questions are finalized.

## Mode 3 — Go ask (first cohort)

### Who to recruit (in order)
1. **Activated users** (artifact 01 definition) — they've felt the peak; what made them stay?
2. **Audit email-captured leads who did NOT sign up** — why not? (the wedge's leak)
3. **Trial-expired non-buyers** — the model's "lost customer"; price or value?
4. **Paid (when they exist)** — what would make them recommend it?

Recruit via in-product nudge ("help shape n4ma — 20 minutes") + the outreach email below. Close every call with: *"Who else should we talk to?"* (the recruiting engine).

### Interview outreach (founder, personal)
```
Subject: {n} minutes to shape n4ma

Hi {first name},

You've seen what n4ma does — I'd like to make it better for the next person
like you. 20 minutes, no pitch, your honest opinion only. $50 CAD e-transfer
(or a donation) for your time either way.

Any day this week work?
```
Incentive: $50 CAD (matches the manual model — no processor needed); $5–10 for surveys. Aim 10 calls, be happy with 5.

### Interview method (per the skill)
- **Casual, not clinical** — no "research interview" framing; keep it a conversation.
- **Prove yourself wrong, not right** — hunt for what *doesn't* fit the hypothesis.
- **5-why laddering** — on every "that's useful" or "it's not for us," keep asking why down to the real job.
- **Ask about the past, not the future** — "last time a renewal surprised you, what happened?" beats "would you use X?"

### The PMF survey (Sean Ellis / Superhuman) — launch when ~100 users exist
- Question: *"How would you feel if you could no longer use n4ma?"* → **Very disappointed = PMF at 40%** (Superhuman: 58%).
- Segment answers by activated vs. not; passives' verbatims are the highest-signal complaints.
- One question is enough — resist adding a feature-priority grid (adds noise at this n).

## Persona discipline

- Current personas (founder/CEO, CFO/finance manager, ops) stay **labeled as hypotheses** until ≥5–10 first-party data points per segment exist (the skill's rule: never invent details; leave blanks blank).
- Replace proxy evidence with first-party quotes as audits/calls arrive; revisit quarterly.
- **Deliverables as data lands:** research synthesis report (themes + quotes + implications), a VOC quote bank for copywriting (money quotes only), and a JTBD map (functional / emotional / social job per segment).

## Cadence & owners
- Mode 2 mining: fCMO — Weeks 3–6, ongoing quarterly refresh (competitor landscape shifts).
- Mode 3 interviews: founder (voice) with fCMO prep — start the week the first ~10 activated users exist; then 2 calls/quarter minimum.
- PMF survey: fCMO builds, founder sends — at ~100 users.
- Output lands in `marketing/n4ma/research/` (raw verbatims) + this doc's synthesis section as it fills.

## Guardrails
- Never quote a user without permission; anonymize in shared docs.
- Sample bias labels: reviewers skew opinionated, Reddit skews technical/skeptical, tickets skew negative — factor into confidence.
- Recency window: weight the last 12 months (the market just moved — PayPal-era spend tools ≠ today).
