# N4MA — Lifecycle Email Program

**Skills:** `emails` v2.0.0 (+ churn-prevention, paywalls copy folded in) · **Date:** 2026-09-04
**Voice rules (non-negotiable):** lowercase "n4ma" in prose; serious/financial/precise tone; no emoji in body copy; every claim honest (findings tied to evidence; savings labeled); one job per email; B2B — send weekdays at recipient's local morning; no more than 1–2 sends/week per person outside triggered flows.
**ESP:** Resend free tier (or equivalent) — needs `RESEND_API_KEY` + verified sending domain. Suppression + unsubscribe on every send. Single sender: founder name <hello@n4ma.online> until volume justifies more.

---

## Flow A — Audit results delivery
- **Trigger:** email captured on audit results page (already built in product; sender missing)
- **Goal:** deliver the value they were promised; open the account door
- **Exit:** opens account / subscribes to nothing further

**Email A1 — Your vendor review is ready**
Send: immediate · Subject: Your review found $X in potential savings
Preview: The details, plus how to keep watching.
Body: (with the actual findings summary rendered from the captured audit)
```
Hi {first name},

Your review is ready. Here's the short version:

• {Vendor} — renews {date}; cancellation window closes {date}
• {Vendor} — price increased ~{pct} since last period
• Estimated potential savings: ${low}–${high}/yr (methodology in the report)

Every figure links back to the source document, so you can verify it in seconds.

The review above is a snapshot. Renewals move, prices change, and new invoices
arrive — that's where n4ma earns its keep.

Create a free account and bring this review in:
[See my full review →]
[Keep watching my vendors →]

No credit card. 30 days of Team Plus included.

— {Founder}
```
CTA: primary → account signup (path A onboarding); secondary → view live review.

---

## Flow B — Welcome (signup)
- **Trigger:** account created (trial auto-started)
- **Goal:** one clear next action (first import); set the trial clock
- **Exit:** imports a source within 48h → jumps to Flow C day-2

**Email B1 — Your 30-day watch starts now**
Send: immediate · Subject: {first name}, your 30-day Team Plus trial is live
Preview: Everything unlocked, no credit card. Here's your first step.
```
Hi {first name},

Your workspace is ready and your 30-day Team Plus trial is already running —
every section unlocked, no credit card, nothing to cancel.

The fastest way to see what n4ma does: connect one source.

[Connect Gmail] [Connect Google Drive] [Connect Slack] [Upload a contract]

Pick whichever holds your vendor paperwork. Within a minute or two you'll see
actual findings — renewals, cancellation windows, price increases — each tied
to its source document.

One honest note: the trial is the whole product. If it doesn't show you money
you're at risk of wasting, you owe us nothing.

— {Founder}
```
CTA: single primary — "Connect your first source" (source picker). Secondary: "What happens after the trial?" → FAQ.

**Email B2 — The four ways in (only if no source connected after 48h)**
Send: +48h · Subject: Gmail, Drive, Slack, or a PDF — your call
Preview: Any of them works. Here's what each finds.
```
Hi {first name},

You signed up for a 30-day watch on your software spend — but nothing is being
watched yet. The good news: any one source is enough to start.

• Gmail — finds contract emails and attachments (renewal notices, order forms)
• Google Drive — imports the contracts you already store
• Slack — finds vendor discussions and files your team shared
• Upload — drop in a PDF or DOCX of a contract or invoice

One import is all it takes to see your first findings:

[Start your first import]

If you're stuck or a source misbehaves, reply to this email — it's me, not a bot.

— {Founder}
```
CTA: "Start your first import".

---

## Flow C — First-finding & activation (post-import)
- **Trigger:** source connected (or import complete)
- **Goal:** drive the first finding *review* (activation event)
- **Exit:** activated → Flow D teaser; also stops B nudges

**Email C1 — What n4ma found in your {source}**
Send: when processing completes (usually minutes) · Subject: n4ma found {n} things worth your attention
Preview: {Vendor} renews {date} — and one price increase to check.
```
Hi {first name},

Your {Gmail/Drive/Slack/upload} is connected and n4ma has finished its first pass.
Top findings:

• {Vendor} renews {date} — cancellation window closes {date} ({n} days left)
• {Vendor} shows a ~{pct} price escalation clause ({$} impact)
• {n} contracts imported total

Each finding links to the exact clause or document — verify anything you doubt.

[Review your findings]

This first pass is the snapshot. The watch (renewal alerts, price-increase
detection, risk scoring) runs continuously from here.

— {Founder}
```
CTA: "Review your findings" → the finding review screen (the peak moment).

**Email C2 — Your watch is on (activated users, day 4)**
Send: +4 days after activation · Subject: Your watch is on — what happens next
Preview: What n4ma does with the next 26 days of your trial.
```
Hi {first name},

Your first review is done — your watch is on. Here's what n4ma does now:

• Monitors every imported contract for renewal and cancellation windows
• Flags price increases and escalations as they appear
• Re-scores risk as documents come in

You'll get a short digest each week (below). Between digests, ask the AI
anything: "What needs attention this month?" or "What are we overpaying for?"

[Open your dashboard]

One thing worth deciding this week: which of your vendors matter most. Those
become your priority watch. (That's a small feature we're finishing — until
then, every contract gets the same watch.)

— {Founder}
```

---

## Flow D — Weekly findings digest (the retention beat)
- **Trigger:** every Monday, if ≥1 finding is active (new or changed) or a window moved
- **Goal:** re-prove value weekly; drive return visits; shareable (§7)
- **Rule:** if nothing changed and nothing is approaching, **don't send** — silence is honest; only send when there's a real finding
- **Format:** short — 3 rows max + one "share" link

**Email D1 — This week in your vendor watch**
Send: Monday morning, local · Subject: {n} renewals coming up · {vendor} price change detected
Preview: The windows that moved this week.
```
Hi {first name},

Three things changed in your watch this week:

• {Vendor} renews {date} — {n} days left to cancel or renegotiate ({$})
• {Vendor} price increase detected — ~{pct}, effective {date}
• {Vendor} risk score moved to {level} ({reason})

Evidence for each is one click away.

[Review this week's findings]

Worth sharing with whoever owns the budget:
[Share this finding]

— {Founder}
```
Metrics: open ≥45%, click-to-review (the number that matters), shares per digest.

---

## Flow E — Trial ending (day 25) — the revenue moment
- **Trigger:** trialDaysLeft == 5 (server-side, from Clerk metadata)
- **Goal:** buy before expiry OR at least get them to the decision with eyes open
- **Copy truth:** purchase now = Team Plus simply continues; nothing auto-charges either way

**Email E1 — Your trial ends in 5 days**
Send: day 25 · Subject: Your Team Plus trial ends {day name}
Preview: What you keep either way — and what buying looks like.
```
Hi {first name},

Your 30-day Team Plus trial ends on {date}. Two honest notes:

What you keep either way — your workspace, your findings, your imported
documents, and manual upload + 5 AI messages a month on Free.

What changes — Gmail/Drive/Slack imports, renewal alerts, price-increase
detection, the full Business workspace, and unlimited AI move behind Team Plus.

If n4ma has shown you even one renewal window or price increase you'd have
missed, Team Plus pays for itself many times over — it's a one-time $250 CAD
(≈ $185 USD), no subscription, nothing auto-charged, refunds within 14 days.

[Keep Team Plus — $250 CAD one-time]

Buying now means no gap — Team Plus simply continues when the trial ends.

— {Founder}
```
CTA: "Keep Team Plus" → mailto purchase (in-product button already builds the email); secondary: "What does Free include?" → pricing.

---

## Flow F — Trial expired (day 31+)
- **Trigger:** entitlement == expired
- **Goal:** reactivate the purchase (the model's closest thing to a lost customer)
- **Two sends:** F1 at expiry +7d, F2 at expiry +30d (then stop)

**Email F1 — Your 30-day trial has ended**
Send: +7d after expiry · Subject: Your findings are still here
Preview: Nothing was charged. Team Plus is one email away.
```
Hi {first name},

Your 30-day Team Plus trial ended on {date} — nothing was charged, and your
workspace is on Free. Your findings and imported documents are all still here.

If the trial caught even one window you'd have missed, here's the whole pitch:

• One-time $250 CAD (≈ $185 USD) via e-transfer — arranged by email, no
  subscription, nothing auto-charged, refunds within 14 days
• Gmail/Drive/Slack imports, renewal alerts, price-increase detection, the
  full workspace, unlimited AI — permanent once confirmed

[Buy Team Plus]

If it didn't earn its keep, no hard feelings — Free stays useful.

— {Founder}
```
CTA: purchase mailto. (F2 = shorter variant, "your watch is off" framing.)

---

## Flow G — Paid dormancy (churn-prevention for a no-churn model)
- **Trigger:** paid (confirmed) account, no finding review for 30 days; then 60
- **Goal:** re-engage with the product's own evidence; no "we miss you" fluff

**Email G1 — What your vendors have done since {last visit}**
Send: 30d after last review · Subject: {n} things changed in your watch since {month}
Preview: Your watch kept running. Here's what it caught.
```
Hi {first name},

You bought Team Plus for the watch — it's still on. Since you last looked:

• {Vendor} renewal window opened ({date} — {n} days to act)
• {Vendor} price change detected
• {n} contracts re-scored

[See what changed]

One review a week is enough to stay ahead of every window n4ma watches for you.

— {Founder}
```
G2 (60d): "Still there?" — shorter, plus "want me to adjust what n4ma watches?" (personal founder reply invite).

---

## Flow H — Stalled free (never activated)
- **Trigger:** signup, no import and no finding review at day 14
- **Goal:** last-chance activation or honest silence

**Email H1 — One import, two minutes**
Send: day 14 · Subject: The fastest way to see if n4ma is worth it
```
Hi {first name},

You haven't connected a source yet, so n4ma hasn't had anything to watch. That's
fine — but the trial clock is running, and the only way to judge the product is
to see it find something.

[Start your first import]

Any source works (Gmail, Drive, Slack, or a plain upload). If two minutes of
your time isn't worth a shot at catching a missed renewal, delete this and
enjoy the unsubscribe.

— {Founder}
```

---

## Flow I — Partner lifecycle (brief; owned by §7)
Accountants/fractional CFOs on the affiliate program: welcome-on-approval (tracked link + $50 CAD/purchase terms), monthly "what your referrals found" digest, quarterly check-in. Details in `04-referral-program.md` (Batch 2).

---

## Sending rules & ESP setup
1. **Resend:** add `RESEND_API_KEY`, verify `n4ma.online`, add `MAIL_FROM` (default `Founder <hello@n4ma.online>`).
2. **Suppression:** hard-bounce + complaint + unsubscribe lists shared across flows.
3. **Local-time sending** (B2B weekdays); digest fixed to Monday morning local.
4. **Frequency cap:** a user in flows B→C→D can get 3 emails week 1, then 1/wk max. Trial users get E1 at day 25 regardless of digest.
5. **Segments:** state from Clerk/Supabase — `trial_days_left`, `activated`, `last_review_at`, `entitlement`, `source_connected`. Emails trigger on these; never on client dates.
6. **Metrics per flow:** open, click, conversion-to-goal (flow A: signup; B: import; C: finding review; D: click-to-review; E/F: purchase email sent; G: return review). Benchmarks: welcome open ≥50%, transactional ≥60%, digest open ≥45%, trial-ender open ≥55% (it's the money email).

## Copy-edit pass
All copy above drafted per voice rules; run `copy-editing` pass on the full set before wiring (Batch 4) and again after 3 real sends.
