# N4MA — Technical SEO & AI-Search Audit

**Skills:** `seo-audit` v2.0.1 (+ ai-seo, schema, analytics folded in) · **Date:** 2026-09-04
**Method:** code-level audit of the live repo (n4ma.online). No Search Console/analytics access yet — where data is needed, it's flagged as a check, not guessed.

## Executive summary

**Health: good foundation, zero distribution surface.** The 5 public pages are crawlable, indexable, fast by construction (Next.js SSR, no Clerk JS on marketing pages), HTTPS-only, with server-rendered structured data and per-page metadata. The gap is not technical — it's **surface**: 5 pages can't rank for a category. Fixes below: llms.txt (done), a content hub (artifact 07), vs./glossary pages (artifact 09), and the analytics baseline.

## Findings by priority

### Crawlability & indexation — ✅ healthy
- `robots.txt`: allows all crawlers; sitemap advertised; host declared. ✓
- `sitemap.xml`: exactly the 5 indexable public pages (`/`, `/audit`, `/upload`, `/privacy`, `/terms`); auth/session pages correctly excluded. ✓ → **action:** extend automatically as /blog, /guides, /glossary, /compare, /tools pages ship (Next `sitemap.ts` handles this from route lists).
- No orphan risk at this size; every marketing page is ≤2 clicks from home.

### Technical foundations
| Issue | Impact | Fix | Priority |
|---|---|---|---|
| **`/llms.txt` absent** (ai-seo) | High for AI-answer surface — the fastest-growing discovery channel for exactly this ICP | **Implemented** (see §3 + `public/llms.txt`) | Done |
| Core Web Vitals unverified | Medium | Run PageSpeed Insights on `/` + `/audit` once live; Next SSR + no marketing-JS suggests green | Check |
| OG/ social image coverage unverified | Medium | Confirm `openGraph.images` present on all key pages (layout has OG metadata; verify the image URL resolves) | Check |
| No trailing-slash/`www` drift | Low | Next default canonical handling is fine | — |

### On-page
| Issue | Impact | Fix | Priority |
|---|---|---|---|
| Marketing lives on one page → thin keyword coverage | High | Content hub (artifact 07): pillar hubs, guides, glossary | Weeks 3+ |
| No comparison/alternative pages | High (SaaS pattern) | `vs.` pages (artifact 09) | Weeks 9+ |
| No glossary/educational content | Medium | Glossary v1 (artifact 07 item 6) | Weeks 3+ |
| `/audit` title/metadata | Low | Verify it carries its own unique title/description (funnel page — already set per layout; double-check output) | Check |
| Internal linking | Medium | New hub/spoke rules (artifact 07 §2); every page ends in audit CTA | With content |

### Schema (schema skill) — ✅ mostly strong
Server-rendered JSON-LD (no JS-injection problem — visible in first HTML): `Organization`, `WebSite`, `SoftwareApplication`, `FAQPage` (layout) and `OfferCatalog` on home (**currency fixed to CAD, Team Plus naming fixed — earlier this session**). Terms/privacy carry their own legal-type schema.
→ **Add when content ships:** `Article`/`BlogPosting` per post, `BreadcrumbList`, `FAQPage` on glossary terms where natural. Validate via Rich Results Test after the blog launch (schema is SSR here, so curl/HTML checks are valid — the skill's JS-injection caveat doesn't apply).

### Content quality / E-E-A-T
- No author pages (no-face constraint) → rely on **Experience** via founder-ghostwritten first-person pieces + **original data** (stat page, methodology), **Trust** via public privacy/terms/contact, honest FAQ.
- Never fabricate case studies (existing rule); first real case study (plan §10, Q3) becomes the top trust asset.

### Authority & links
- Domain is new; authority ~0. Link budget (cheap first): directory wave (artifact 03), stat-roundup page (4.25× link format — artifact 07 item 2), co-marketing link swaps (artifact co-marketing), HARO quotes (plan §4 Move 5). Long-game: original research paired with its own citable stat page.

## AI-search (ai-seo) plan

Three surfaces, in order:
1. **`/llms.txt`** — implemented (below): title, one-paragraph summary, key pages, key facts, pricing (CAD — matches the fixed schema), FAQ. This is what agents/LLMs read first.
2. **Structured data** — already live (Organization/SoftwareApplication/FAQ/OfferCatalog in CAD) → LLMs can quote plans/prices correctly now.
3. **Citable content** — stat roundups + methodology pieces written as one-line-citable facts (artifact 07); the honesty rule is an AI-seo asset (accurate claims get lifted).
Check monthly: ask an AI "what is n4ma and what does it cost" — the pricing paste-test from the pricing audit.

## Analytics instrumentation (analytics skill — baseline now, no data yet)

GA4 via tag on the marketing layout + dashboard (respect Clerk sessions for user-scoped events):
- **Events already specified** (plan §9): `audit_start`, `audit_result`, `signup`, `trial_start`, `import`, `finding`, `upgrade_open`, `purchase_email_click`, `transfer_confirmed` (+ `activated` from artifact 01).
- **UTM scheme:** `?from=ph|directory-name|newsletter|partner|social|referral` on every external link; GA4 records source/medium.
- **Content:** per-piece UTM + `audit_start` rate = the kill/double-down metric (plan §10).
- **Guardrail:** no client-side-only revenue truth (paid state is server-side); events enrich, never decide access.
- **GSC:** submit sitemap + verify domain on day one of the content hub (authority/impressions baseline).

## Prioritized action list
1. ✅ llms.txt (done this pass)
2. Content hub first 4 pieces (artifact 07) — Weeks 3–6
3. Glossary v1 + internal-link spine — Weeks 3–6
4. vs. pages (artifact 09) — Weeks 9+
5. GA4 + GSC baseline (owner: fCMO wiring, founder account) — Week 1–2
6. PageSpeed + OG-image verification on live deploy — Week 1–2
7. Article/Breadcrumb schema with blog launch; Rich Results validation — With blog
8. Programmatic-SEO v1 outline (integration/pain-point pages) — Q3 (plan §10)
