# Vendrz

> Find the money hiding in your vendor contracts.

Vendrz is an AI SaaS that lets anyone upload a vendor contract with **no
signup**, instantly surfaces renewal dates, cancellation deadlines, auto-renewal terms,
price escalations, and dollar-quantified savings opportunities **with evidence** — then
invites the user to create an account to save and monitor it.

This repo is the **frontend MVP (V1 + V1.5)** — a Next.js (App Router) + TypeScript +
Tailwind CSS app with Framer Motion and lucide-react. It implements the full user flow
end-to-end against a localStorage-backed data layer that mirrors the FastAPI API
contract, so the entire product works with zero backend while being trivial to swap
onto the real server.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

## What's implemented

| Page | Route | Notes |
| --- | --- | --- |
| Landing | `/` | Hero per the detailed spec: badge → headline → subhead → dual CTA → reassurance → results preview → trust strip. Supporting sections: How It Works, Evidence-first product, Pricing, FAQ, CTA, Footer. |
| Upload | `/upload` | Drag-and-drop + file picker, PDF/DOCX only, no required fields, optional sample contract. |
| Processing | `/processing/[id]` | Multi-step sequential status tied to real pipeline stages (extraction → classification → segmentation → LLM → validation → risk rules → savings → results). |
| Results (pre-signup) | `/results/[id]` | Risk score 0–100 with label, evidence-linked findings (source section + page), savings range with a "how we calculated this" breakdown and not-guaranteed disclaimer, persistent but dismissible signup CTA. |
| Auth | `/auth?mode=signup\|login` | Google (identity only — never requests mailbox scope) + email/password via **Clerk** (or demo-mode fallback without keys). Anonymous session is transferred to the new account on signup; the analysis is never lost. |
| Dashboard | `/dashboard` | Real vendor-intelligence overview: spend trend + category charts, AI insights, renewal timeline, cancellation deadlines, risk distribution, contract value by vendor, attention list, and a live activity feed — all from the same underlying vendor model. |
| Vendor spreadsheet | `/dashboard/vendors` | Operational spreadsheet with 12 columns (vendor, contract, status, contract value, renewal, cancellation deadline, auto-renew, risk, potential savings, owner, last reviewed, actions). Sortable, searchable, status/category/owner filters, clear empty states. |
| Vendor profile | `/dashboard/vendors/[id]` | Spend, status, renewal, cancellation deadline, escalation, risk, opportunity, invoices, usage, savings, and activity — tabbed deep-dive per vendor. |
| Vendor agent | `/dashboard/agent` | Gemini-powered vendor-management agent: check vendor status, summarize vendor emails from the connected inbox, draft replies, and execute cancellations. Every send is gated behind an explicit approval card and recorded in the activity log. |
| Contracts table | `/dashboard/contracts` | Vendor, annual spend, renewal countdown, risk score, opportunity range; filterable by status, searchable, sortable. |
| Connect Gmail | `/dashboard/gmail` | Reached only from the dashboard; plain-language scope explanation; visually distinct from the login screen; read-only `gmail.readonly` + `gmail.metadata`. |
| Gmail discovery | `/dashboard/gmail/discovery` | Reviewable candidate list (filename, subject, sender, date, vendor, type, confidence). Nothing imports until explicitly selected; selections flow through the same pipeline. |
| Settings | `/dashboard/settings` | Connected Accounts with Gmail Disconnect flow (stops future discovery; keeps already-imported contracts and login untouched). |

## Authentication (Clerk)

Auth is powered by [Clerk](https://clerk.com) (`@clerk/nextjs`):

1. Create an app at **https://dashboard.clerk.com** and enable the **Google** and
   **Email / Password** connections.
2. Copy your keys into `.env.local` (see `.env.example`):
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
   CLERK_SECRET_KEY=...
   ```
3. Restart `npm run dev`.

What changes once keys are present:

- `/dashboard/**` becomes protected — unauthenticated visitors are redirected to
  `/auth?mode=login`.
- The `/auth` page signs in/up through Clerk: Google OAuth, email + password, and
  email-verification codes. The anonymous audit session is transferred to the new
  user automatically (nothing re-runs, nothing is lost).
- The navbar shows a user button with account menu instead of the plain login link.

**Without keys** the app runs in demo mode: local demo accounts, open dashboard, and
no middleware — the whole product still works out of the box.

## Deployment (git → Vercel)

1. **Push to git** — the repo is initialized already:
   ```bash
   git add .
   git commit -m "Vendrz"
   git branch -M main
   git remote add origin https://github.com/<you>/vendrz.git
   git push -u origin main
   ```
2. **Import on Vercel** — create a new project from the GitHub repo (framework preset:
   Next.js). Build command `npm run build`, output `Next.js (static output is not used)`.
3. **Add environment variables** in Vercel → Settings → Environment Variables:
   `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and optionally
   `GOOGLE_API_KEY`. Never commit `.env.local` (it's git-ignored).
4. **Point Clerk at production** — in the Clerk dashboard add your Vercel deployment
   URL (and `http://localhost:3000` for local dev) to the allowed origins.

## Architecture notes

- **`src/lib/types.ts`** — domain types mirroring the PRD data model (User, Organization,
  Vendor, Contract, Finding, Opportunity, SavingsOutcome, AnonymousSession,
  GmailConnection, DiscoveredDocument).
- **`src/lib/pipeline.ts`** — ordered pipeline stages and deterministic result
  generation. Savings figures are produced by **rules**, never by the LLM: the model
  proposes terms, a validation layer confirms them, and dollar amounts come from
  escalation rates × annual value × benchmarks.
- **`src/lib/store.ts`** — localStorage persistence implementing sessions, accounts,
  anonymous→account transfer, Gmail connection/disconnect, discovery candidates, and
  dashboard aggregation. Anonymous sessions expire after 14 days.
- **`src/lib/api.ts`** — documents the FastAPI endpoint each client function maps to;
  swapping in the real backend means replacing the store bodies with `fetch()` calls.

## Design system

- **Palette**: black/dark canvas with cool-gray surfaces and hairline borders; one
  sharp accent — emerald (`#34D399`) — used only for savings/positive actions;
  amber/red reserved for risk. No gradients-for-decoration, no decorative dots.
- **Type**: Inter (400–700) for precision UI. No monospaced chrome — figures and
  labels render in the same sans type.
- **Texture**: flat surfaces, subtle borders, restrained motion (fade/rise only).
  The product looks like a serious B2B procurement tool, not a template.
