# PostHog Self-driving setup report

## Summary

PostHog Self-driving is configured with Session Replay, Error Tracking, and Support enabled, plus health, error, and support signal sources. The focused scout troop is enabled and will begin running within about 30 minutes; findings will appear in the [Self-driving inbox](https://us.posthog.com/project/587205/inbox).

No application source files were changed during this Self-driving setup. The repository already declares the intended product event taxonomy in `.posthog-events.json`, but the browser SDK initialization call was not found.

## AI data processing

Approved.

## GitHub

GitHub was already connected before this setup. No GitHub Issues responder was enabled because the connected-tools selection was cancelled.

## Products enabled

| Product | Result | Notes |
|---|---|---|
| Session Replay | enabled | This is a web app, but no `posthog.init(...)` call was located in `src`; recordings will not arrive until the client SDK is initialized without a recording-disabling override. |
| Error Tracking | enabled | Exception autocapture is enabled server-side; it likewise depends on a working browser SDK initialization. |
| Support | enabled | Tickets begin reaching Self-driving after an inbound email, inbox, or Slack channel is connected in PostHog. |

## Signal sources

| Signal source | Action | Details |
|---|---|---|
| `signals_scout` / `cross_source_issue` | enabled by default | No row was created because the scout gate is on by default. |
| `health_checks` / `health_issue` | enabled | Source config `01a06a04-6f57-7d53-850f-868afda9c713`. |
| `error_tracking` / `issue_created` | enabled | Source config `01a06a04-7161-79de-bb8d-76ccd874f65f`. |
| `error_tracking` / `issue_reopened` | enabled | Source config `01a06a04-6f7d-7228-a257-6f37925f1467`. |
| `error_tracking` / `issue_spiking` | enabled | Source config `01a06a04-6fa9-754c-8993-11e03e150dcb`. |
| `conversations` / `ticket` | enabled | Source config `01a06a04-6f41-7ad7-8141-9fe84f7fba29`; dormant until an inbound channel is connected. |
| Session Replay signal source | skipped | Replay observations are routed through Replay Vision scanners, not a source row. |
| Connected-tool responders | skipped | No external tools were selected. |

## Connected tools

No tool was selected in the connected-tools picker. The project has no warehouse sources configured. GitHub remains connected at the integration level, but GitHub Issues was not authorized as a Self-driving responder.

## Scout troop

**Enabled (4):**

| Scout | Why it is enabled |
|---|---|
| `signals-scout-general` | Cross-product patterns and otherwise-uncovered surfaces. |
| `signals-scout-web-analytics` | Acquisition, landing-page, traffic, attribution, and bounce health for this web application. |
| `signals-scout-revenue-analytics` | Payment/revenue configuration health; the repository uses PayPal subscription flows. |
| `signals-scout-health-checks` | High-impact PostHog instrumentation and configuration health. |

**Disabled (23):**

| Scout | Why it is disabled |
|---|---|
| `signals-scout-ai-observability` | The app uses AI providers, but no PostHog LLM trace surface was found. |
| `signals-scout-anomaly-detection` | No established PostHog dashboards or insights were found to monitor. |
| `signals-scout-apm` | No APM/OpenTelemetry surface was found. |
| `signals-scout-conversations` | Support tickets have a dedicated native source. |
| `signals-scout-csp-violations` | No PostHog CSP reporting was found. |
| `signals-scout-customer-analytics` | No PostHog account/group analytics usage was found. |
| `signals-scout-data-pipelines` | No CDP or export pipeline use was found. |
| `signals-scout-data-warehouse` | There are no warehouse sources. |
| `signals-scout-error-tracking` | Covered by the native Error Tracking source. |
| `signals-scout-experiments` | No active PostHog experiments were found. |
| `signals-scout-feature-flags` | No active PostHog feature flag surface was found. |
| `signals-scout-inbox-validation` | Fresh setup has no resolved reports to validate. |
| `signals-scout-insight-alerts` | No established insight alerts were found. |
| `signals-scout-logs` | No PostHog logs product use was found. |
| `signals-scout-mcp-tool-calls` | No product-specific need for MCP telemetry monitoring was identified. |
| `signals-scout-observability-gaps` | Health checks are the more actionable initial instrumentation coverage. |
| `signals-scout-product-analytics` | No established funnels or saved product insights were found. |
| `signals-scout-replay-vision` | No existing Replay Vision observation set exists; the analyst layer remains off. |
| `signals-scout-session-replay` | Covered by Replay Vision scanners once scanner API access is granted. |
| `signals-scout-skills-store` | No project-owned PostHog skill-maintenance surface was identified. |
| `signals-scout-surveys` | No surveys exist. |
| `signals-scout-tasks` | No PostHog Tasks delivery surface was identified. |
| `signals-scout-web-vitals` | No web-vitals evidence was found; web traffic monitoring is the higher-priority initial coverage. |

**Run budget:** 100 runs/day maximum; 0 used today; 100 remaining. The project announcement says: “Scouts are in early access. Each project gets up to 100 scout runs a day. Contact team-self-driving@posthog.com if you need more.”

## Custom scouts

No custom scouts were created because the proposal selection was cancelled. The setup proposed these two product-specific candidates, based on the declared event taxonomy in `.posthog-events.json`:

| Candidate | Surface and discriminator | Why it is distinct |
|---|---|---|
| Contract analysis completion | Contract uploads through completed or failed analysis; speak up when completion drops or failures rise while upload demand holds. | Generic web analytics watches traffic; it does not specifically test this product’s upload-to-analysis outcome. |
| AI action approval health | AI vendor-action requests through approval or rejection; speak up when approval falls or rejection rises. | This measures trust in the product’s consequential AI recommendations rather than generic traffic behavior. |

Error spikes and replay friction were ruled out as custom-scoped surfaces because they already have dedicated native Error Tracking and Replay Vision routes. If any future custom scout is noisy, set `emit: false` on its scout config in PostHog to leave it running in dry-run mode.

## Replay Vision scanners

A Replay Vision scanner is an LLM that watches individual session recordings on a schedule and pushes qualifying observations to the inbox. It is the only part of this setup that spends Replay Vision quota; findings arrive at half weight and require corroboration before promotion to a report.

| Brief | Status | Intended scope | Sampling rate / estimate |
|---|---|---|---|
| Contract analysis breakage monitor | skipped | The contract upload, processing, and results flow — the product’s completion path from submitted contract to analysis result. | 0.5 / unavailable |
| User-frustration monitor | skipped | Sessions containing rage-click behavior, without URL filtering. | 1.0 / unavailable |

Both scanners were deferred because the Replay Vision API returned `INVALID_API_KEY` when listing scanner inventory. There are no recordings yet, and the repo’s browser SDK initialization must also be completed before recordings can begin. Scanner quota and estimates could not be retrieved.

## Files created or modified

| File | Change |
|---|---|
| `posthog-self-driving-report.md` | Created this setup record. |

No existing application files were modified.

## Follow-ups

- [ ] Initialize `posthog-js` in the web application using the configured PostHog environment values, without `disable_session_recording: true` or `capture_exceptions: false`; then verify recordings arrive.
- [ ] Grant or refresh the PostHog MCP credential with Replay Vision scanner access, then create the two deferred monitors.
- [ ] Connect an inbound Support channel (email, inbox, or Slack) in PostHog so Support tickets can flow to Self-driving.
- [ ] Optionally authorize GitHub Issues or another external tool in the Self-driving connected-tools flow if draft-PR automation is desired.
- [ ] Revisit the two declined custom-scoped checks once upload, analysis, and AI-action event volume is established.

## What happens next

Fresh scout configurations are picked up by the coordinator within about 30 minutes. Their findings cluster into reports in the [Self-driving inbox](https://us.posthog.com/project/587205/inbox), where immediately actionable reports can begin coding tasks.
