# N4MA — Free-Tool Pack (engineering as marketing)

**Skill:** `free-tools` v2.0.1 (+ lead-magnets overlap) · **Date:** 2026-09-04
**Principle:** take a capability competitors monetize ($10Ks/yr spend platforms) and give the SMB version away as an acquisition channel. n4ma already owns the strongest free tool in the category — **the audit itself**. This pack stacks three tools, each with a natural path to the product.

## Tool 1 — The free audit (live; the flagship analyzer)

The no-signup, ~2-minute document review is an *analyzer* free tool that *is* the product demo (Moz-Keyword-Explorer pattern: the free tool surfaces the paid product's value). Already: email capture (built), findings-with-evidence (live), film/shorts as distribution.
**Optimization to-do (from artifact 01/08):** UTM scheme wired, `audit_start`/`audit_result` events, and the audit→account path tightened (path A onboarding). This is the highest-leverage free tool — everything else feeds it.

## Tool 2 — Savings calculator (build; Weeks 3–6, /tools/savings-calculator)

**Job:** SMB founder who won't upload documents yet — give an instant "how much are you leaking?" estimate to convert the *curious* visitor.
**Inputs (keep to 5, MVP discipline):** number of software subscriptions · estimated seats/tools unused · last year's renewal surprises · number of vendors with auto-renew · rough annual software spend.
**Output:** low–high annual leak estimate + the top 3 leak types to check — **transparent methodology line** ("based on typical patterns; your real number comes from the free audit of your actual contracts — [run it]"). No invented precision; estimates labeled.
**Lead capture:** email optional on results (partial gate); the tool's CTA is the audit. Ungated page (SEO + link-building: "savings calculator" type pages attract links — 1.38× format).
**MVP skip:** account creation, saving results, history, perfect design.
**Scoring check (1–5):** search demand 4 · audience match 5 · uniqueness 4 (vs. generic SaaS-blоat checkers) · path to product 5 · build feasibility 4 (static client calc, no API — no maintenance/security debt) · link potential 4 · share-worthiness 4 → **~30/35: build.**

## Tool 3 — Template library (build; Weeks 3–6, under /tools + glossary spine)

High-intent, immediate standalone value (content-strategy "template library" format), each template a *use case* that ends in "keep watching with n4ma":
1. **Auto-renewal cancellation letter** (per vendor — window, contract ref, ask)
2. **Renewal negotiation email** (price-increase pushback with evidence language)
3. **Software subscription audit checklist** (the cornerstone's printable companion — artifact 07)
4. **Vendor contract pre-sign checklist** (artifact 07 piece 9's template)
Ungated (email optional), copy-paste ready, honest ("n4ma drafts; you send" — consistent with FAQ).

## Distribution & measurement
- Every tool page: internal link from blog/guides (artifact 07) + llms.txt; shareable result cards (screenshot-worthy → social atoms, artifact 11).
- Track: `tool_visit`, `calculator_result`, `template_download`, then `audit_start` conversion per tool (artifact 08 events). **Vanity-metric guardrail:** usage alone doesn't count — audit starts and email capture do.
- Review at 90 days: which tool converts; kill or iterate per plan §10.

## Pitfalls avoided
Over-engineering (each tool is one job, static, no scraping/APIs → no maintenance debt); no path-to-product (every output ends at the audit); vanity tracking (conversion events only).
