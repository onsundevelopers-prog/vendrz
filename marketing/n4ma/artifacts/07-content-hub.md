# N4MA — Content Hub Strategy

**Skills:** `content-strategy` v2.1.1 (+ site-architecture, lead-magnets folded in) · **Date:** 2026-09-04
**Goal:** turn n4ma.online from a 5-page marketing site into a compounding content surface — searchable base, shareable spikes, every piece funneling into the free audit.
**Cadence reality:** fCMO writes; founder edits/approves. Sustainable rate = **2 pieces/week** (mix: 1 searchable + 1 shareable/short), rising only if it compounds.

## 1. Content pillars (the topics n4ma owns)

| Pillar | Frame | Why | Sample demand |
|---|---|---|---|
| **P1 — Money leaks in software spend** | The leak-finding lens: auto-renewals, price increases, unused seats, duplicate tools | Core category + the wedge language | "how to stop SaaS auto-renewals," "software we're paying for but not using," "SaaS price increase" |
| **P2 — Contracts & renewal intelligence** | What to check when signing, what to watch after; cancellation windows, escalations | Owns the *evidence* story + the four sources | "vendor contract renewal," "cancel before auto-renewal," "software contract review" |
| **P3 — Evidence & methodology (trust)** | How n4ma calculates savings; why evidence beats AI claims; honest reviews | The differentiator + E-E-A-T | "how to find hidden fees in contracts," AI-analysis trust questions |
| **P4 — Founder stories (shareable)** | Real renewals that slipped, the two-minute audit, honest numbers | Shareable spikes + meta content | none — this pillar is distribution, not search |

Priority: P1 > P2 > P3 (searchable base first), P4 sprinkled weekly.

## 2. Site architecture (hub/spoke where depth earns it; /blog elsewhere)

```
n4ma.online
├── /                       # product + pricing (unchanged)
├── /audit                  # the conversion engine (every piece ends here)
├── /blog/                  # standard posts (most of P1–P4)
├── /guides/software-subscription-audit/   # cornerstone hub (P1) — checklist CTA
├── /glossary/[term]/       # glossary v1 (~20 terms, P1/P2) — internal-link spine
├── /compare/[target]/      # vs. pages: spreadsheets, enterprise spend platforms (artifact 09)
├── /tools/savings-calculator/  # free tool (artifact 10)
└── /llms.txt               # AI surface (implemented — artifact 08)
```

Internal-linking rule: every content page links to ≥1 pillar/hub + ends in the audit CTA (or the calculator, which ends in the audit). No orphans. New URLs lowercase-hyphenated, keyword-bearing.

## 3. Editorial queue (first 90 days, prioritized)

Scoring: customer impact 40 / content-market fit 30 / search potential 20 / resources 10 (content-strategy method). Launch order:

| # | Piece | Pillar | Searchable/Shareable | Buyer stage | Type | Priority |
|---|---|---|---|---|---|---|
| 1 | **The Software Subscription Audit** (cornerstone hub + checklist) | P1 | Searchable | Awareness→Consideration | Hub | 9.0 |
| 2 | **SaaS spending statistics** (maintained stat page) | P1 | Both (4.25× link format) | Awareness | Stat roundup | 8.5 |
| 3 | How to stop SaaS auto-renewals (guide) | P1 | Searchable | Consideration | Guide | 8.0 |
| 4 | How to find SaaS price increases in your contracts | P2 | Searchable | Consideration | Guide | 8.0 |
| 5 | Auto-renewal cancellation windows: a cheat sheet | P2 | Searchable | Consideration | Template/cheat sheet | 7.5 |
| 6 | Glossary v1 (20 terms: auto-renewal, escalation clause, MSA, seat license…) | P1/P2 | Searchable | Awareness | Glossary | 7.5 |
| 7 | How n4ma calculates savings (methodology, transparent) | P3 | Both | Consideration | Explainable | 7.5 |
| 8 | "Your business is leaking money" — ghostwritten founder essay | P4 | Shareable | Awareness | Thought leadership | 7.0 |
| 9 | What to check before you sign a vendor contract | P2 | Searchable | Decision | Checklist | 7.0 |
| 10 | How we built the 2-minute vendor audit (meta) | P4 | Shareable | — | Meta | 6.5 |
| 11 | vs. spreadsheets: why the manual audit fails | P1 | Searchable | Decision | Comparison | 6.5 |
| 12 | vs. enterprise spend platforms (Vendr/Zylo/Torii) | P1 | Searchable | Decision | Comparison | 6.5 |
| 13 | Duplicate software: finding tools you pay for twice | P1 | Searchable | Consideration | Use-case | 6.0 |
| 14 | How to ask for a refund on a renewal (template) | P2 | Searchable | Decision | Template | 6.0 |

**Split:** ~60% searchable (1–7, 9, 11–14), ~30% shareable (8, 10 + weekly finding-of-the-week), 10% experimental (video cuts, interactive). First 4 weeks = items 1, 2, 3, 4 (hub before spokes, per the skill).

## 4. Per-format discipline (content-as-product)

- **Title first:** 10 title options per piece before drafting (skill rule). H1 = search query for searchable; hook + payoff for shareable.
- **Distribution hooks at creation:** every piece gets (a) 2–3 subheads that stand alone as social posts, (b) 1 quotable stat/line for graphics, (c) the film-cut hook if it maps to a video (P1/P4 pieces → the launch-film short cuts).
- **Every piece ships with its distribution slot** (see 08/11): 1 social post + 1 digest mention + 1 relevant-community answer where honest.
- **Honesty rule:** no fabricated savings/customers; stats pages label sources; methodology pieces are the trust engine, not marketing fluff.

## 5. Lead magnets (lead-magnets skill folded in)

Primary lead magnet = **the free audit** (product-as-magnet, already live + email capture built). Supporting:
- **Software Subscription Audit checklist** (printable PDF from the cornerstone) — ungated download; email optional (don't gate behind a second form where the audit already captures).
- **Savings calculator** (artifact 10) — the interactive lead magnet; email capture optional on results.
- **Cancellation-letter + renewal-negotiation templates** (P2 content → templates): email-optional, built to be *used* — the "your template shows n4ma's watch" adoption play.
Gate policy: never gate the audit; gate depth only (full guide PDF vs. page).

## 6. Owners & cadence

fCMO drafts + schedules; founder edits (voice pass) + approves; 2/wk sustained; quarterly review: which pieces drive audit starts (UTM + GA4 events from artifact 08/10), double down / kill per plan §10. First ship target: cornerstone + stats page + 2 guides in Weeks 3–6 (plan §9 alignment).
