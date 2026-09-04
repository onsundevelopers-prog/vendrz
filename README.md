# n4ma

> Find the money hiding in your vendor contracts.

n4ma is a spend-management app that lets anyone upload a vendor contract with **no
signup**, instantly surfaces renewal dates, cancellation deadlines, auto-renewal terms,
price escalations, and dollar-quantified savings opportunities **with evidence** - then
invites the user to create an account to save and track it.

Stack: Next.js (App Router) + TypeScript + Tailwind CSS + Framer Motion. Auth is
**Clerk**; workspace data and uploaded documents persist in **Supabase**; every new
account gets a 30-day **Team Plus trial**, after which Team Plus is a one-time $250 CAD
payment via e-transfer (manual, no payment processor); and the AI provider is **Gemini**
(primary) with an automatic **Ollama Cloud** fallback.

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
| Add vendor data | `/dashboard/import` | Four-source ingestion picker: Upload, Gmail, Google Drive and Slack. Each connected source browses/searches real data and imports documents through the shared pipeline. |
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
| Gmail OAuth | `api/gmail/*` | Real Google OAuth at `/dashboard/settings` or `/dashboard/import` → Connect; read-only `gmail.readonly`, tokens stored server-side (encrypted at rest on a persistent disk). |
| Google Drive | `api/drive/*` | Real Google Drive OAuth (read-only `drive.readonly`). Browse folders, search files (name/type/modified date/owner/location), multi-select and import PDF/DOCX/TXT/CSV plus Google Docs/Sheets (exported to text/CSV) through the shared ingestion pipeline with duplicate detection. |
| Slack | `api/slack/*` | Real Slack OAuth with the user's own token (no bot). Search messages and files across channels the user can access (channel/sender/timestamp metadata), then import selected items. Nothing is scraped; tokens are stored server-side, encrypted at rest. |

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
- Access is resolved server-side and bound to the Clerk account: the 30-day Team Plus
  trial auto-starts on first sign-in and can never be extended by the browser; paid
  Team Plus (one-time $250 CAD e-transfer) is granted manually by the founder via
  /api/entitlement. Status follows the user across browsers and devices.

### Why sign-in can get stuck (and how it self-heals)

n4ma moved between Clerk instances/domains during development, and the live
publishable key encodes a decommissioned frontend domain, so all Clerk traffic
is proxied through this app at `/__clerk` (`src/proxy.ts`). A browser that
visited under an older Clerk setup can keep stale first-party `__session` /
`__client` cookies that the current stack can't validate - the sign-in widget
hangs and it looks like "only incognito works". The middleware now clears those
cookies whenever the server has already determined there is no valid session
(`src/lib/clerkCookies.ts`), and the sign-in recovery box offers a "Reset
sign-in state" action, so affected users recover on their next visit without
incognito. Do not set `CLERK_DISABLE_AUTO_PROXY` on the deployment - it points
clerk-js back at the dead domain.

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
      `documents` bucket, then set `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.- [ ] **Gmail OAuth** - register `https://<your-domain>/api/gmail/callback` as an authorized
      redirect URI in Google Cloud Console; set
      `GOOGLE_OAUTH_CLIENT_ID/SECRET` + `GMAIL_TOKEN_SECRET`.
- [ ] **Google Drive OAuth** - register `https://<your-domain>/api/drive/callback` on the
      same OAuth client (or a dedicated client with `GOOGLE_DRIVE_CLIENT_ID/SECRET`);
      set `GOOGLE_CLIENT_ID/SECRET` (falls back to the Gmail pair) +
      `DRIVE_TOKEN_FILE=/data/drive-tokens.json` (+ optional `DRIVE_TOKEN_SECRET`).
- [ ] **Slack OAuth** - create the Slack app with user scopes
      `search:read files:read users:read` and redirect URI
      `https://<your-domain>/api/slack/callback`; set `SLACK_CLIENT_ID/SECRET` +
      `SLACK_TOKEN_FILE=/data/slack-tokens.json` (+ optional `SLACK_TOKEN_SECRET`).
- [ ] **Documents source columns** - run the `ALTER TABLE documents ADD COLUMN
      IF NOT EXISTS source_type/source_meta` migration from `.env.example` (or the
      provisioning script) so imports are deduplicated and the free-tier import
      allowance counts correctly. New installs get the columns from the CREATE TABLE.

- [ ] **Access model** - optional: set `ADMIN_UPGRADE_TOKEN` so you can grant Team
      Plus (or Business/Enterprise) via `POST /api/entitlement` after an e-transfer
      is confirmed, and `NEXT_PUBLIC_SUPPORT_EMAIL` to override where purchase
      emails go. Trial length defaults to 30 days (`ENTITLE_TRIAL_DAYS`).
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
  user-data, feature-section gates, plan (trial/entitlement source of truth),
  entitlement (manual founder upgrade), redeem, agent tasks (SSE), Gmail OAuth
  (auth/callback/status/messages), payments.
- **`src/lib/documents.ts`** - Supabase-backed upload persistence (table + private
  bucket), ownership-scoped reads/writes/delete and signed-URL access. Rows carry
  source provenance (`source_type` + `source_meta` jsonb: external id, url, mime,
  checksum) when the migration has run.
- **`src/lib/ingest.ts`** - the single normalized ingestion pipeline every source
  feeds into: documents row + bucket → text extraction → LLM extraction →
  deterministic analysis. Manual uploads, Gmail, Google Drive and Slack all land
  here, with duplicate prevention and the free-tier import allowance.
- **`src/lib/drive/` + `src/app/api/drive/*`** - Google Drive OAuth, token manager
  and Drive REST client (search/browse/export/import), scoped to files the user
  explicitly searches for or selects.
- **`src/lib/slack/` + `src/app/api/slack/*`** - Slack OAuth (user token only),
  search over messages/files and import, with graceful handling of revoked tokens.

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
