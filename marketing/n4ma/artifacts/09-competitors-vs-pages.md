# N4MA — Competitor & Alternative Pages

**Skill:** `competitors` v2.0.1 (+ ai-seo citation expectations) · **Date:** 2026-09-04
**Purpose:** capture "Vendr/Zylo/Torii alternative" search intent from the SMB founders/CFOs who can't afford enterprise spend platforms — and build the honest sales-enablement layer for Business/Enterprise conversations.
**Honesty rules (per the skill + brand voice):** acknowledge competitor strengths; be explicit about who n4ma is *not* for; never misrepresent features or prices; verify all competitor pricing/features at build time and refresh quarterly (placeholders below are flagged, not scraped).

## 1. Page-set plan (priority order)

| # | Page | Format | Intent | Priority |
|---|---|---|---|---|
| 1 | `/compare/n4ma-vs-vendr` | 3 — you vs competitor | "vendr vs n4ma," "vendr alternative" | High |
| 2 | `/compare/n4ma-vs-zylo` | 3 | "zylo vs n4ma," "zylo for small business" | High |
| 3 | `/alternatives/vendr-alternatives` | 2 — plural, real options | "vendr alternatives," "best SaaS spend tools" | High |
| 4 | `/compare/n4ma-vs-torii` | 3 | "torii alternative" | Medium |
| 5 | `/blog/spreadsheets-vs-spend-tools` (or category piece, not a vs page) | Content | "software audit spreadsheet" DIY framing | Medium |
| 6 | `/alternatives/` hub page linking all comparison content | Hub | internal linking + AI citation hub | With #1 |

Covered implicitly by #3 but honest to include as real alternatives: **Ramp/Brex** (finance platforms with spend features — different job), **Vendr/Zylo/Torii** themselves (enterprise), **spreadsheets + doing nothing** (the actual SMB incumbent). n4ma belongs in the list — but the skill warns emerging brands often earn only the *citation*, not the *recommendation*; publish for search intent + category framing, set expectations.

## 2. Central competitor data (single source of truth — YAML per competitor)

Each `_data/competitors/{slug}.yml` holds: positioning · target buyer · pricing tiers (verify quarterly — `[verify]` placeholders) · feature ratings (contract watch, renewals, evidence, integrations, procurement workflows, team/roles, security/compliance) · strengths · weaknesses · best-for / not-ideal-for · common complaints (from G2/Capterra review mining — artifact 06 Mode 2) · migration notes. Pages render from these files so updates propagate everywhere.

## 3. Positioning per page (honest spine — draft)

**TL;DR (all pages):** Vendr, Zylo, and Torii are procurement-grade spend platforms for companies with procurement teams. n4ma is the self-serve financial watchdog for the other 99% — companies with 10–200 subscriptions and nobody watching them. If you have a procurement function and need deployment + workflows, they're the right tool. If you don't, they're $10Ks/yr of software to solve a problem you can solve in an afternoon.

**Who n4ma is best for:** SMBs $1M–$50M revenue, founder/CFO/ops-led, no procurement team, want findings with evidence in minutes, want to bring their own systems (Gmail/Drive/Slack/upload), and prefer a one-time $250 CAD price with no subscription to a $50K/yr platform.

**Who they're best for (say it plainly):** larger orgs with procurement teams, vendor-management workflows, SSO/enterprise security requirements, and budget for deployment + ongoing licenses. Their review-mining complaints (implementation cost/time, price, overkill for small stacks) are *our* SMB wedge — quote carefully, cite sources.

**Honest n4ma limitations (page 1 of each):** no team roles/permissions below Business (sales-led); no procurement workflow engine; no public API/integration marketplace; one-time model means no annual contract management from us — by design.

## 4. Page structure (Format 3, per skill)

1. TL;DR (2–3 sentences) → 2. At-a-glance table (buyer, deploy time, price shape, contract watch, evidence, integrations, team/roles) → 3. Paragraph comparisons by category (Features, Pricing incl. total-cost-for-10-seat-stack worked example, Support, Ease of use, Integrations) — explain *why* the difference matters → 4. Who n4ma is for → 5. Who {competitor} is for → 6. Migration/what-you-can-import (upload contracts, Gmail/Drive/Slack import — "bring your existing files; no vendor lock-in") → 7. CTA → the free audit (never a hard pitch).
Plural page (#3): pain points → criteria framework → 4–7 real options (n4ma first, honestly labeled) → comparison table → recommendation by use case.

## 5. SEO + schema

- FAQ schema per page ("Is n4ma a Vendr alternative?", "Is Vendr worth it for a small business?") — validated via Rich Results Test on publish.
- Internal linking: `/alternatives/` hub ↔ each vs. page ↔ glossary terms (artifact 07) ↔ the audit CTA. No orphans.
- Titles: "n4ma vs Vendr — the self-serve alternative for SMBs" pattern (brand-last per seo-audit).
- These pages are also **sales enablement** (Business/Enterprise conversations reference them) — build the YAML data files before any sales conversation.

## 6. Ownership & cadence

Build order: data files (2 competitors deep + 1 shallow) → vs. Vendr → plural alternatives → vs. Zylo → hub → Torii. Owner: fCMO drafts from review mining (artifact 06) + founder verify on pricing/claims; quarterly refresh of the YAML data (skill rule). Launch with the Q2 content wave (plan §9), tracked via the UTM scheme (artifact 08).

## 7. Red lines
No fake switcher testimonials (none exist yet — leave the section out until real ones do); no "we're cheaper and better at everything" framing; every competitor claim carries a source; pricing cells marked `[verify]` are never published unverified.
