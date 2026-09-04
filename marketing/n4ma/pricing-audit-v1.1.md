# N4MA — Pricing Audit (v1.1 access model)

**Date:** 2026-09-04 · **Skill:** `pricing` v2.1.1 · **Auditor:** fCMO (agentic)
**Subject:** 30-day trial → one-time $250 CAD Team Plus (e-transfer) → sales-led Business/Enterprise.

Sources: `src/lib/displayMode.tsx` (plan definitions), `src/lib/site.ts` (PRICING_PLANS, FAQ), `src/components/landing/Pricing.tsx` (pricing page), `src/app/page.tsx` (OfferCatalog JSON-LD), `.agents/product-marketing.md` (positioning context).

---

## Part A — Strategy diagnosis

### A.1 The three pricing axes

| Axis | Current state | Verdict |
|---|---|---|
| **Packaging** | Free (trial entry) → **Team Plus** (purchasable) → Business (sales) → Enterprise Scale (sales) | Coherent. Feature gating is clean (simple vs. business workspace; locked sections). The "Everything in X, plus:" card grouping keeps the ladder legible |
| **Value metric** | Flat workspace fee | **Correct call.** The value delivered scales with *leaks found*, but usage-based pricing on "savings found" would punish the product's own success and feel extractive. Flat + trust-first matches the positioning ("evidence, not vibes") |
| **Price point** | $250 CAD (~$185 USD) one-time | **Below the value-based ceiling — deliberately conservative.** See A.2 |

### A.2 Value-based check (is the price defensible?)

- **Cost to serve:** ~$0 marginal (AI + infra) → irrelevant as a floor.
- **Next best alternative:** enterprise spend platforms at ~$10K+/yr (Vendr/Zylo/Torii — the anti-persona), spreadsheets (free but manual/stale). The real comparator a founder picks against is "paying nothing and staying unwatched."
- **Perceived value:** product's own *illustrative* finding is **$18,420/yr**; a single vendor contract can be $48K/yr. Even one caught leak repays the price 70x.
- **The skill's SMB bucket** is ~$100/mo → ~$1,200/yr. $250 CAD one-time is ≈ 2 months of that bucket — i.e., the product is priced like *less than one quarter* of the value it returns, in exchange for permanent use.

**Verdict:** as a **launch bet** this is fine — it buys first-10-customer learning at low friction, and the no-processor constraint makes it the natural number to start from. But it under-prices demonstrated value, and every sale is founder-in-the-loop (e-transfer), so the price must also cover founder time per sale. Two implications:

1. **Plan a price test once the first cohort proves willingness** (after ~10–20 purchases): test new-buyer pricing at $350–500 CAD. One-time model makes this *clean* — existing buyers are already done; there's no recurring base to grandfather, so raising for new signups has no resentment surface (rollout methodology: "test on new customers first").
2. **Don't let the number anchor the category.** The marketing message should sell the *return* ("costs less than one month of the average leak it finds") rather than the price.

### A.3 Structural tradeoff: one-time vs. recurring (honest flag)

The model has no recurring revenue by design (no processor). Consequences, named plainly:

- **No compounding base** — every dollar must be re-earned from a *new* customer; revenue grows only by acquisition. The 12-month goal is correctly framed as cumulative, not ARR (§8 of the marketing plan).
- **Expansion still exists at the top:** engaged Team Plus owners are the Business/Enterprise pipeline (team/roles, governance) — §6 Move 6 already says this.
- **Referral economics are clean:** one purchase, flat $50 CAD commission (§7) — a referred buyer is as valuable as a direct buyer.
- **Keep the door open:** an optional annual "monitoring" tier (recurring) would need a processor — out of scope under the current constraint. Revisit when revenue justifies it. Not recommended before ~$10K CAD.

**Recommendation:** keep the model through the first $10K CAD of purchases (it matches the no-processor constraint and the trust-first story), then reassess.

### A.4 E-transfer friction (the model's real cost)

- Founder-in-the-loop per sale = **founder hours are the capacity ceiling.** The 24h reply SLA (§8 Move 3) isn't a nicety — it *is* the conversion funnel.
- In-product flow is already good: pre-filled purchase email → "Already paid? Refresh my access."
- **Currency clarity for US SMBs:** the price is CAD. A US founder reading "$250 CAD" converts and hesitates. Add "≈ $185 USD" next to the price (see Fix 2) — honest, removes a needless objection.

---

## Part B — Pricing page teardown

**Page:** n4ma.online `#pricing` (4 cards, no monthly/annual toggle by design).

### B.1 Human-buyer axis

| Dimension | Score | Notes |
|---|---|---|
| Value-prop clarity | 4/5 | Strong heading ("Start free. Scale when the leaks do.") + subtext that explains the trial and the one-time model in two sentences |
| Plan differentiation | 4/5 | "Everything in X, plus:" laddering; featured card clearly the purchasable tier |
| Cognitive load | 3/5 | 4 cards are fine; Team Plus's 8-feature list is long, and two footnote paragraphs under the grid repeat the same no-auto-charge message |
| Trust signals | 3/5 | "No credit card" + "never auto-charged" repeated well. **Missing:** a refund/recourse note (relevant when payment is a manual transfer — see Fix 3) and a "what happens after the trial?" pointer near the cards |
| Pricing psychology | 2/5 | Featured/"Most popular" present. **Weak anchors:** Business/Enterprise show "Custom" with no number, so the top of the ladder gives buyers no magnitude to compare against; no value-framing line next to the price |
| Price transparency | 4/5 | Prices in plain text, e-transfer mechanics stated, no hidden fees. Minor: no USD hint |

### B.2 AI-agent readiness axis (the "paste test")

The page's prices ARE machine-readable (plain text + OfferCatalog) — but the structured data is **wrong**, which is worse than absent for the LLM shortlist moment ("what's the best X and what does it cost?"):

| Dimension | Score | Notes |
|---|---|---|
| Machine-readable prices | 2/5 | OfferCatalog exists but `priceCurrency: "USD"` while the page sells **CAD** — an AI quoting the plan would quote the wrong currency. Free's description still says "…on Team, Business, or Enterprise" (pre-rename wording) |
| Structured-data correctness | 2/5 | Currency mismatch above; no cadence expressed in schema (one-time vs. recurring) |
| Extractable FAQ/objections | 4/5 | FAQ JSON-LD live; FAQ covers price, savings methodology, "does it replace my finance team," cancellation honesty |
| Tier depth in text | 4/5 | Full feature lists as plain HTML |

---

## Part C — Prioritized fixes

| # | Fix | Effort | When |
|---|---|---|---|
| 1 | **OfferCatalog: `priceCurrency` → "CAD"** for Team Plus; description "Team" → "Team Plus" (homepage JSON-LD) | 5 min | **Now — factual bug** |
| 2 | Show "≈ $185 USD" beside the $250 CAD price (Pricing.tsx + in-app overlay) | 10 min | Now |
| 3 | Add a one-line payment-trust note: "Payment is confirmed manually by email — ask about a refund within 14 days if it's not for you" (decide the refund policy first) | 10 min | Decision needed |
| 4 | One value-framing line near the Team Plus card ("less than one month of the average leak it finds — illustrative") | 10 min | Now (copy) |
| 5 | Price test at $350–500 CAD for new buyers after the first 10–20 purchases | — | Q2/Q3 |
| 6 | Add "What happens after my 30-day trial?" one-liner under the grid (drives the trial→purchase mechanic) | 10 min | Now (copy) |

Fixes 1–4 and 6 are copy/schema — zero product-risk. Fix 5 is a strategy decision for later; Fix 3 needs the founder to pick a refund stance first.

**Fix status (2026-09-04):** 1 ✅ applied (`src/app/page.tsx` OfferCatalog — CAD, Team Plus naming); 2 ✅ applied (pricing page + upgrade overlay); 3 ✅ applied (14-day refund note on pricing page + overlay); 4 ✅ applied (value-framing footer on pricing page); 6 ✅ applied (post-trial explainer footer). 5 — open for Q2/Q3 after the first ~10–20 purchases.
