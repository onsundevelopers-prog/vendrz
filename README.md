# n4ma

> Find the money hiding in your vendor contracts.

n4ma is a spend-management app that lets anyone upload a vendor contract with **no
signup**, instantly surfaces renewal dates, cancellation deadlines, auto-renewal terms,
price escalations, and dollar-quantified savings opportunities **with evidence** - then
invites the user to create an account to save and track it.

Stack: Next.js (App Router) + TypeScript + Tailwind CSS + Framer Motion. Auth is
**Clerk**; workspace data and uploaded documents persist in **Supabase**; subscriptions
charge via **PayPal**; and the AI provider is **Gemini** (primary) with an automatic
**Ollama Cloud** fallback.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

## What's implemented

| Page | Route | Notes |
| --- | --- | --- |
| Landing | `/` | Badge → headline → subhead → dual CTA → results preview → trust strip, plus How It Works, Product, Pricing, FAQ, CTA and Footer sections. |
| Upload | `/upload` | Drag-and-drop + file picker, PDF/DOCX/TXT/MD up to 25 MB, no required fields, single or multi-file. Authenticated uploads persist the file + analysis server-side. |
| Processing | `/processing/[id]` | Multi-step sequential status tied to the real pipeline stages (extraction → classification → segmentation → LLM → validation → risk rules → savings → results). |
| Results (pre-signup) | `/results/[id]` | Risk score 0–100 with label, evidence-linked findings, savings range with a not-guaranteed disclaimer, persistent but dismissible signup CTA. |
| Free review | `/audit` | Run a free vendor spend review; upload a contract for real results. Gmail/AWS connect options disclose honestly when not yet connected. |
| Auth | `/auth?mode=signup\|login` | Google (identity only - never requests mailbox scope) + email/password via **Clerk**. Anonymous analysis sessions transfer to the new account on signup; nothing is lost. |
| Dashboard | `/dashboard` | Real vendor-intelligence overview: KPIs, renewal exposure, risk distribution, spend by vendor, renewals, risk watch, activity, correspondence - all derived from your real analyzed contracts. Has Simple and Business display modes. |
| Vendors | `/dashboard/companies` | Operational spreadsheet with real extracted terms: vendor, category, annual spend, renewal, cancel-by, risk, opportunity, status. Sortable, searchable, filterable, with an Ask-AI advisor. |
| AI workbench | `/dashboard/ai` | Autonomous agent: give a job, watch the plan/steps stream live, and approve consequential actions before anything is sent. Tasks persist per account. |
| Contracts | `/dashboard/contracts` | Document library (uploads with real status) plus the contract register: vendor, document, renewal, notice deadline, cost, auto-renew, risk. |
| Renewals | `/dashboard/renewals` | Renewal calendar sorted by urgency with notice deadlines. Gated by plan (Business locks to Team). |
| Risk | `/dashboard/risks` | Elevatated-risk register with drivers and recommended actions. Gated by plan. |
| Savings | `/dashboard/savings` | Every savings opportunity by vendor with estimated annual impact. Gated by plan. |
| Activity | `/dashboard/activity` | Chronological, filterable workspace event log - real records only. |
| Settings | `/dashboard/settings` | Plan, coverage, members, integrations (Gmail connect/disconnect with real OAuth), AI provider status, billing, notifications. |
| Gmail OAuth | `api/gmail/*` | Real Google OAuth at `/dashboard/settings` → Connect; read-only `gmail.readonly`, tokens stored server-side (encrypted at rest on a persistent disk). |

## Authentication (Clerk)

Auth is powered by [Clerk](https://clerk.com) (`@clerk/nextjs`):

1. Create an app at **https://dashboard.clerk.com** and enable the **Google** and
   **Email / Password** connections.
2. Copy your keys into `.env.local` (see `.env.example`):
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
   CLERK_SECRET_KEY=...
   ```
3. Restart `npm run dev` (or set them on your deployment host).

Clerk is the only auth path:

- `/dashboard/**` is protected - unauthenticated visitors are redirected to
  `/auth?mode=login`.
- The `/auth` page signs in/up through Clerk: Google OAuth, email + password, and
  email-verification codes. Anonymous analysis and free-review sessions transfer to
  the new account automatically (nothing re-runs, nothing is lost).
- Paid plans are verified server-side against PayPal and bound to the Clerk account,
  so a paid status follows the user across browsers and devices.

## Deployment (Render Blueprint)

The repo ships a `render.yaml` blueprint that deploys n4ma as a Node web service
(persistent disk mounted at `/data`, health check at `/api/health`).

1. **Push to git** - the repo is initialized already:
   ```bash
   git add .
   git commit -m "n4ma"
   git branch -M main
   git remote add origin https://github.com/<you>/noma.git
   git push -u origin main
   ```
2. **Import on Render** - "New + > Blueprint" and select this repo. Render reads
   `render.yaml`, prompts for the `sync: false` env vars, and creates the service
   plus the persistent disk automatically.
3. **Set the prompted environment variables** in the Render dashboard. Never
   commit `.env.local` (it's git-ignored).

### Go-live checklist

- [ ] **Clerk** - set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY`;
      add the production URL (and `http://localhost:3000`) to Clerk's allowed
      origins.
- [ ] **AI provider** - set `GEMINI_API_KEY` (and optionally `OLLAMA_API_KEY` as
      fallback). Anonymous extraction is rate-limited via `EXTRACT_RATE_LIMIT`
      (default 10/hour/IP, `0` disables).
- [ ] **NEXT_PUBLIC_SITE_URL** - set it to the live origin so robots.txt,
      sitemap.xml and canonical/OpenGraph tags point at the real domain instead
      of the `n4ma.app` default.
- [ ] **Supabase** - create the production project, run the table SQL from
      `.env.example` (or `scripts/provision-documents.mjs`), create the private
      `documents` bucket, then set `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] **Gmail OAuth** - register `https://<your-domain>/api/gmail/callback` as an
      authorized redirect URI in Google Cloud Console; set
      `GOOGLE_OAUTH_CLIENT_ID/SECRET` + `GMAIL_TOKEN_SECRET`.
- [ ] **PayPal** - set the client id, plan ids and the REST pair; create the
      webhook pointing at `https://<your-domain>/api/paypal/webhook` and set
      `PAYPAL_WEBHOOK_ID`.
- [ ] **PAYMENT_ADMINS** - comma-separated Clerk user ids allowed to confirm
      outgoing payments. Without it payments can be created but never executed
      (safe default, but intentional if you plan to use RBC payments).
- [ ] **Persistent disk** - confirm the `noma-data` disk is mounted at `/data`
      (payments, Gmail tokens and in-flight extraction jobs survive restarts).
- [ ] **Health check** - verify `GET /api/health` returns `{"ok":true}` after the
      first deploy.

## Architecture notes

- **`src/lib/types.ts`** - the domain data model (AnalysisResult, ContractExtraction,
  RichContractExtraction, AgentTask/Event, PaymentRecord, Gmail types, etc.).
- **`src/lib/pipeline.ts`** - ordered pipeline stages and deterministic result
  generation. Savings figures are produced by **rules**, never by the LLM: the model
  proposes terms, a validation layer confirms them, and dollar amounts come from
  escalation rates × annual value × benchmarks.
- **`src/lib/store.ts`** - localStorage workspace registers (render-time source of
  truth) plus anonymous→account transfer and dashboard aggregation. `src/lib/sync.ts`
  mirrors each user's data to/from Supabase so it survives browsers, devices and
  logouts.
- **`src/lib/ai/`** - provider abstraction (`provider.ts`), Ollama + Gemini transports,
  and the staged parallel extraction pipeline (`extractPipeline.ts`). Gemini is the
  default primary provider with an automatic Ollama Cloud fallback (and vice versa).
- **`src/lib/payments/`** - server-side payment records with idempotency + audit
  trail, and the RBC Move Money adapter (admin-gated, never fakes success).
- **`src/app/api/`** - the server layer: extraction, documents (Supabase storage),
  user-data, feature-section gates, PayPal verify/webhook/plan, redeem, agent tasks
  (SSE), Gmail OAuth (auth/callback/status/messages), payments.
- **`src/lib/documents.ts`** - Supabase-backed upload persistence (table + private
  bucket), ownership-scoped reads/writes/delete and signed-URL access.

Plans (Free/Team/Business/Enterprise) gate workspace sections and features on both the
frontend and, via `/api/features/[section]`, the backend, so restricting a route or
calling an API directly cannot bypass a plan lock.

## Design system

- **Theme**: Linear-style midnight command center - void canvas (`#08090a`),
  carbon surfaces (`#0f1011`), obsidian panels (`#161718`), and graphite
  hairlines (`#23252a`). Elevation comes from 1px borders and inset shadows,
  never drop-shadow stacks.
- **Accent**: one neutral action color - grey (`#e4e4e7`) - reserved for
  the single primary CTA per view. Supporting accents (pulse green, coral,
  signal teal, iris, lavender) are decorative/tag-only, never actions.
- **Type**: Inter Variable at 400 / 510 / 590 with tight tracking
  (-0.022em display, -0.011em body) and `cv01` / `ss03` / `zero` OpenType
  features; Berkeley Mono stack (Geist Mono) for kbd hints and mono metadata.
  No weights above 590.
- **Radii**: 6px buttons/inputs, 12px cards, 9999px pills - the whole radius
  vocabulary.
- **Texture**: flat surfaces, hairline borders, restrained motion (fade/rise only).
  The product looks like a serious B2B procurement tool, not a template.
