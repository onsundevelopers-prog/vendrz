# N4MA — Onboarding & Activation Spec

**Skill:** `onboarding` v2.0.1 (+ `signup`) · **Date:** 2026-09-04
**Goal:** get every new account from signup to **first evidence-backed finding reviewed** in one session, then keep the trial clock working for us.
**Inputs:** product-marketing context, plan §5, live code (SimpleOverview, displayMode gating, audit/results flow, 4-source import).

---

## 1. Activation definition (single source of truth)

**Activation = workspace with ≥1 imported source AND ≥1 evidence-backed finding reviewed.**

- *Why this, not "import" or "signup":* it's the first moment the product's actual value loop (leak → proof → decision) has run. It's the metric §13's north star ("findings reviewed per week") builds from.
- **Instrument:** GA4 event `activated` when fired; also product-level so the digest/welcome triggers read it.

**Two entry paths** (different first sessions — design for both):

| Path | Who | First session goal |
|---|---|---|
| **A — Audit → account** | Came through the free audit, already saw findings | Get those findings *into their workspace* (signup → auto-prompt "bring your review in") → review one finding → done. Fastest path to activation, highest intent |
| **B — Direct signup** | Landed on homepage, clicked trial | One guided import (source → import → findings) → review one finding. No data pre-exists |

---

## 2. Current state (grounded in code)

- ✅ Signup: one-click Clerk/Google default; account auto-granted 30-day Team Plus trial (server-side, no card).
- ✅ Four real sources (Upload / Gmail / Drive / Slack) with an import surface.
- ⚠️ **Dashboard home (`SimpleOverview`) assumes data exists.** On a brand-new account with zero contracts it renders a financial terminal of empty cards: "No renewal dates yet — they appear here once extracted", "No elevated risk right now", "Actions you take will appear here." **No empty state points to the first import.** This is the single biggest activation gap.
- ⚠️ No guided first-import wizard, no checklist, no welcome email, no 48h nudge (all plan §5 Weeks 3–4 items, unbuilt).
- ⚠️ No in-product trial countdown placement decision (displayMode knows `trialDaysLeft`; UI shows it only in the upgrade overlay).

## 3. Onboarding psychology applied

- **Minimum Path to Value (MPTV):** signup → pick source → import → findings → review = **4 steps, ~4–6 minutes**. Every extra field/step is a blocker; the wizard removes them.
- **Endowed progress:** the first-session checklist opens at **20% done** ("✓ Trial started for you") — never at zero.
- **Peak-end:** engineer the peak at the *finding review* ("Acme renews in 14 days — cancel window closes Sep 24") with a clear celebration beat; end the session on that, not on settings.
- **One goal per session:** session 1 = one import + one finding review. AI chat, exports, CSV edits are sessions 2+.
- **Boosters, not blockers:** pre-fill nothing but offer the *audit results they already saw* on path A; kill any required onboarding form fields beyond a company name (optional).

## 4. First-session flow spec (path B; path A = same wizard, step 2 pre-skipped)

**Session 1 (post-signup, mode = business on trial):**

1. **Home empty state** (replaces the empty terminal) — one clear action:
   - Copy: *"Nothing's being watched yet."* + one line: *"Connect a source and n4ma starts finding renewals, price increases, and cancellation windows you'd otherwise miss."*
   - Primary: **"Add your first source"** → import wizard. Secondary link: "Upload a contract instead."
   - Visual: the dashboard skeleton behind it, so they see what data will look like (empty-state best practice).
2. **Wizard (3 steps, dismissable, progress visible):**
   - Step 1 — **Source:** four cards (Upload / Gmail / Drive / Slack). One line each + the "bring your own system" framing. (Trial = all four unlocked; that IS the differentiator, say it.)
   - Step 2 — **Connect/Select:** real OAuth (Gmail/Drive/Slack) or file picker (Upload). If they connected Drive/Slack earlier, show "pick documents" directly.
   - Step 3 — **Findings:** post-import processing → "here's what it found" — renewal windows, price increases, risks, with the evidence links.
3. **Finding review + celebration (the peak):** one recommended finding surfaced ("Start here") → open evidence → **activation fired** → small confirmation state: *"Your watch is on. 29 days of Team Plus left — n4ma will email you what changes."*
4. **Exit:** home now shows the live terminal (SimpleOverview with real data). Footer nudge only: "Ask AI anything about your contracts."

**Path A (from audit):** signup CTA carries `?from=audit` → wizard starts at step 2 with a banner: *"Your review found $X in potential savings — bring it into your workspace to keep watching."*

## 5. In-product checklist (optional task list on home, dismissable)

Pre-marked **✓ Trial started** (endowed progress), then value-ordered:
1. ✓ Trial started — 30 days of Team Plus (done for you)
2. Connect your first source (Gmail / Drive / Slack / upload)
3. Review your first finding
4. Set your renewal watch — tell n4ma which vendors matter most *(Q2+, needs vendor-watch UI)*
5. Ask AI one question about your contracts

Checklist collapses after completion (or dismiss anytime; returning users never see it).

## 6. Signup-flow notes (signup skill)

- Keep one-click Google/Clerk as the default; email+password secondary. Goal: zero required fields before the workspace.
- **Post-signup destination:** `/dashboard` with `?onboard=1` to trigger the wizard — not a bare dashboard.
- Audit → signup: keep the audit's finding context (path A above) — this converts "lead magnet" into "workspace starter", the plan's whole wedge thesis.
- Trial messaging at signup: "30 days of Team Plus — no credit card" is already the value prop; show the countdown chip on first dashboard load.

## 7. Email triggers (owned by `02-email-lifecycle.md`)

| Trigger | Email |
|---|---|
| Audit email captured | Results delivery (immediate) |
| Signup | Welcome (immediate) |
| Signed up, no import | 48h "your evaluation import is ready" |
| Imported, no finding reviewed | Day-2 "what n4ma found" nudge |
| Activated | Day-4 "your watch is on" + digest preview |
| Day 25 of trial | "Your trial ends in 5 days" (+ buy-before-expiry) |
| Trial expired | "Your 30-day trial has ended" (+ purchase path) |

## 8. Metrics plan

| Metric | Definition | Target (directional) |
|---|---|---|
| Activation rate | activated / signups | Measure; ≥30% of signups → activated within 7 days (Q3 goal) |
| Time to activation | signup → first finding reviewed | Under one session for path A; ≤48h for path B |
| Steps to activation | 4 (wizard) — watch drop-off per step | Funnel: signup→step1→step2→activated |
| Session-1 completion | % finishing wizard | ≥60% |
| Day 1 / 7 / 30 retention | return visits | Day-7 ≥40% once baseline exists |
| Trial-end conversion | purchase / trial-expired (see §8 plan) | Baseline first cohort |

**Funnel to watch:** `signup → wizard start → source connected → import complete → finding reviewed` — instrument each; biggest drop is the fix target (onboarding skill: "focus there").

## 9. First experiments (when traffic exists, Q2+)

1. Home empty state vs. current (control): does the guided CTA lift wizard starts?
2. Wizard step 1 order: Upload-first vs. Gmail-first (Gmail is the "recommended" source on the audit page — test the same nudge here).
3. Endowed-progress checklist on vs. off (lift in wizard completion).
4. Path A "bring your review in" banner: lift in audit→activated rate.

## 10. Build owners

Wizard + empty states + checklist + `?onboard=1` + `?from=audit`: product (founder + agent) — Weeks 3–4 per plan §9. Emails: fCMO (artifact 02). All copy above is ready to lift.
