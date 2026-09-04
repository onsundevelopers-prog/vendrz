# N4MA — CRO Plan (conversion surfaces, pre-traffic)

**Skill:** `cro` v2.0.0 · **Date:** 2026-09-04
**Reality check:** traffic ≈ 0 — nothing to A/B yet. This plan (a) fixes what's cheaply fixable now, (b) pre-registers the first 3 tests so they run the moment a baseline exists (≥20 audit submissions/mo). Conversions: homepage → **audit start**; audit → **email capture / signup**; signup → **activation** (artifact 01); trial → **purchase** (artifact 02 E/F).

## Surfaces & current state (grounded)

| Surface | Primary goal | Strengths | Gaps |
|---|---|---|---|
| Homepage | Audit start | Sharp headline; honest architecture; illustrative-example labeling | Trust signals thin (no logos/testimonials — must not fake); single CTA moment early, mid-page CTAs inconsistent |
| Pricing (#pricing) | Trial signup / Team Plus purchase intent | Clear ladder; featured card; payment mechanics honest; no-auto-charge repeated | Long Team Plus list; two repeating footnote paragraphs; no near-card "what happens after trial" (now added as footer line) |
| /audit funnel | Email capture + signup | Product-as-wedge; real findings | Message-match from homepage strong; verify nav doesn't leak attention |
| Upgrade overlay (in-app) | Purchase email click | Pre-filled mailto; honest steps; refresh button | Relies on manual flow — the 24h founder reply is part of conversion |
| Dashboard home (new users) | Activation | Terminal design once data exists | Empty state doesn't point to import (artifact 01 — the fix) |

## Quick wins (implement now, no traffic needed)

1. **Audit-page single-mindedness:** keep the funnel page free of competing nav where possible (landing-page CRO rule); primary CTA + capture only. *(Verify current nav; tighten.)*
2. **Mid-page CTA rhythm:** homepage repeats the audit CTA after Savings and before Pricing ("See it on your own contracts →").
3. **Trust near CTAs:** place the two honest trust lines — *"Read-only · No signup required · First review in under two minutes"* (hero trust line, exists) and *"Nothing is ever auto-charged"* (exists on pricing) — adjacent to the signup/purchase CTAs, not only in footers.
4. **Objection at the point of doubt:** link the FAQ's payment/savings answers under the pricing cards (anchor to #faq) rather than only site FAQ below.
5. **Microcopy on the audit CTA path:** "Get my review" (outcome) instead of bare "Start"/"Run" where button copy is generic — audit page CTA copy check.

## High-impact changes (build with content/onboarding waves)

1. Home empty-state → wizard (artifact 01): converts signups into activation — the funnel's real conversion event.
2. Email capture on audit results (shipped) + results-delivery email (artifact 02 A): turns anonymous audits into owned leads.
3. Calculator + templates (artifact 10) as mid-funnel CTAs from content (artifact 07): more surfaces, same audit goal.
4. The pricing page "Email to purchase" prominence once paid cohort exists — test placement (see tests).

## Pre-registered test list (first 3, when baseline ≥20 audit subs/mo)

| # | Hypothesis | Variants | Success metric |
|---|---|---|---|
| 1 | Hero CTA copy lifts audit starts | "Find my savings" (control) vs. "Get my free review" vs. "See what you're wasting" | audit_start rate |
| 2 | Trust placement near CTA lifts capture | Control vs. adding read-only/no-credit-card line directly under primary CTA | audit_result → capture/signup |
| 3 | Wizard step-1 order lifts imports | Upload-first vs. Gmail-first (audit page recommends Gmail) vs. "bring your own system" framing | import completion (activation funnel) |

(Test 3 doubles as the onboarding experiment from artifact 01 §9 — run once, count once.)

## Copy alternatives (ready when tests run)
- Hero secondary CTA: "See how it works" (control) vs. "Watch the 60-second film" vs. "See a live finding".
- Pricing Team Plus button: "Start with Team Plus" vs. "Start your free trial" (alignment: free card CTA is the trial; Team Plus CTA is purchase — reduce confusion by making the featured card's job "trial → purchase later"? Test once data exists).
- Overlay header: "Upgrade your plan" vs. "Keep your watch" (trial-expiry users aren't upgrading — they're continuing).

## Guardrails
No A/B until baseline exists (statistical noise otherwise); no fake social proof to "improve" trust (red line — CRO never overrides honesty rules); every test logged with UTM + GA4 events (artifact 08); the 24h founder reply to purchase emails is measured as part of the purchase funnel (artifact 08/02).
