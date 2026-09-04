# N4MA — Referral & Affiliate Program Spec

**Skills:** `referrals` v2.0.1 (+ marketing-loops folded in) · **Date:** 2026-09-04
**Builds on:** plan §7 (moves + $50 CAD accountant commission) — this doc makes them executable: mechanics, incentives, fraud rules, tracking, launch checklist.

---

## 1. Viral potential check (design the right mechanism)

N4MA sits **between "natural" and "limited"** on the spectrum:
- The product itself is internal (a watch on your vendors) — no inherent exposure.
- **But its outputs are shareable:** a finding ("Acme renews Oct 24 — cancel window closes Sep 24. Potential saving: $4,800/yr") is a *user-facing output* — the natural viral mechanism is **sharing the finding**, not sharing the app.

**Therefore:** lead with product-embedded sharing (share-a-finding) + a reward-bearing *affiliate* program for the accountants (the audience channel), and treat double-sided customer referral as the second wave once a paid cohort exists. Don't force a "refer a friend for credits" widget on a pre-paid product.

## 2. Program 1 — Customer referral via share-a-finding (Q1, Weeks 5–8)

**Trigger moment (ask at the peak):** right after the finding-review celebration (activation — artifact 01) and on every digest with a strong finding. Also after the first "share this finding" click.

**Mechanism (ranked per the skill):**
1. In-product share → generates a clean, branded finding card (leak → proof → savings estimate → n4ma link with `?ref=` attribution) — *the finding is the ad*, honest because it's the user's own data.
2. Email/share text pre-written (one click).
3. Referred friend lands on the audit (the wedge — no signup wall), then account.

**Incentive (double-sided, launched when the first paid cohort exists — Q2):**
- Referrer: **$50 CAD** cash (e-transfer — matches the manual model, no processor needed) per confirmed Team Plus purchase by their referral.
- Referred friend: **$50 CAD off** Team Plus ($250 → $200 CAD one-time).
- Present the numbers plainly ("$50 for you, $50 off for them") — at this price point the bigger *feeling* number rule favors the flat $50 over a percentage.
- Cap abuse: per-account limit (e.g., 5 rewarded referrals/account/quarter), same-person/self-referral detection on email + payment identity, no reward until the referred purchase is confirmed (manual grant already exists).

**Attribution:** Dub.co tracked link (`?ref={user_id}`), cookie + click time, confirmed on purchase. Reward payout logged manually next to the entitlement grant (a simple sheet — see §6).

**Placement:** findings page + digest footer + upgrade overlay (a buyer who just paid is a great referrer) + one Settings line. Not a popup.

## 3. Program 2 — Accountant & fractional-CFO affiliate (Q2, per plan §7/§4 Move 6)

**Structure (operationalized):**
- **Commission:** flat **$50 CAD per confirmed Team Plus purchase** via their tracked link (one-time model = clean math; no revenue share to track across months). Business/Enterprise: negotiated per deal (typically 10–15% of first-year value once those sales exist).
- **Who:** 10–25 practitioners recruited warm (outreach in `05-cold-outreach.md`); power-law expectation — **~20% of affiliates drive ~80% of revenue**; recruit broadly, double down on the few who convert.
- **What they get:** tracked link + co-branded "client spend review" asset (co-marketing Play A) + monthly "what your referrals found" digest (proof the program works) + the $50/purchase.
- **Recruitment funnel:** warm email (personally from the founder) → 15-min call (walk through one client scenario live with the free audit) → approved → onboarding email (link, asset, terms).
- **Fraud/quality:** their own clients only (not cold lists); reward only on confirmed purchase; no self-dealing (their own firm's purchase doesn't count unless disclosed).

## 4. Referral nurture (emails, per `02-email-lifecycle.md` conventions)

- Program launch email (when live): "You can now earn $50 for sharing n4ma" → their link.
- Day-7 post-activation: referral prompt (if they've reviewed a finding).
- Day-30: "Know a founder who's leaking money?" (personal, not template-y).
- Milestone: after their first paid purchase → "You're a Team Plus owner now — want to pass the tip along?" 
- Accountant monthly digest = proof-of-work beats all other nurture.

## 5. Metrics & targets

| Metric | Target (directional) |
|---|---|
| Share rate (activated users who share ≥1 finding in 30d) | ≥15% |
| Referral click → audit start | ≥40% |
| Referred → paid conversion | ≥10% (referred users start with more intent) |
| % of new purchases from referral/affiliate | ≥20% by Q4 (plan §7 target) |
| Active referrers (30d) | Measure; grow with prompt placement |
| Affiliate power curve | Identify top ~20% by Q3 |

Typical benchmark (for later validation): referred customers carry 16–25% higher LTV and 18–37% lower churn — worth watching once cohorts exist (paid is permanent here, so "churn" = dormancy, artifact 02 Flow G).

## 6. Launch checklist + ops

**Build (product):** finding-card share UI + `?ref=` links + reward-state tracking (product table or the audit_leads pattern — document SQL like the repo convention). **Tool:** Dub.co free tier for links. **Payout log:** spreadsheet keyed to entitlement grants (manual, matches e-transfer model). **Terms page:** short, honest (rewards paid on confirmed purchase; no self-referrals; $50 CAD flat; we may end the program with 30 days' notice).

Sequence: share-a-finding (Weeks 5–8) → double-sided $50/$50 when first paid cohort exists (Q2) → accountant program private (Q2) → public page + per-partner dashboards (Q3). First-30-days review: conversion funnel, top referrers, friction points, reminder email to non-referrers.
