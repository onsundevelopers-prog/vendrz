# N4MA Launch Film - Design Spec

**Date:** 2026-09-03
**Canvas:** 1920x1080 @ 30fps, 1800 frames (60s)
**Genre:** Cinematic SaaS launch / product film
**Mode:** VO-driven (5 ElevenLabs lines, voice "Eric") - NO beat grid; frame-budget timing.
**Audio:** soundtrack (Echoes of Time, Kevin MacLeod, CC-BY 4.0) at low volume under VO.

## Palette (matches N4MA app: dark, zinc neutrals, restrained accent)

| Token | Hex | Use |
|---|---|---|
| bg | #08090A | canvas |
| bgRaised | #101014 | panels |
| panel | #14141A | cards, windows |
| hairline | rgba(255,255,255,0.08) | 1px borders |
| fg | #F4F4F5 | primary text |
| fg2 | #A1A1AA | secondary text |
| fg3 | #71717A | tertiary / captions |
| danger | #F2555A | renewal / price alerts |
| warn | #F0A030 | cancellation window |
| teal | #34BFA5 | savings / positive |
| white | #FFFFFF | hero type, buttons |

Type: Inter (Google), display headings weight 650-700 tight tracking (-0.03em), body 420-480.

## Structure (frames)

| Scene | Time | Frames | Title | VO |
|---|---|---|---|---|
| S1 | 0:00-0:04 | 0-120 | THE PROBLEM (stacking alerts) | - |
| S2 | 0:04-0:10 | 120-300 | INTRODUCING N4MA (logo + real footage push) | - |
| S3 | 0:10-0:18 | 300-540 | EVERYTHING IN ONE PLACE (sources -> workspace) | vo1 @ 312 |
| S4 | 0:18-0:27 | 540-810 | AI UNDERSTANDS (contract scan, field extraction) | vo2 @ 556 |
| S5 | 0:27-0:36 | 810-1080 | THE AI (chat question + answer cards) | vo3 @ 830 |
| S6 | 0:36-0:45 | 1080-1350 | ACTION (vendor panel + recommendation) | vo4 @ 1100 |
| S7 | 0:45-0:53 | 1350-1590 | THE OVERVIEW (stat counters over footage) | vo5 @ 1400 |
| S8 | 0:53-0:60 | 1590-1800 | ENDING (logo, tagline, CTA) | - |

Sum = 1800.

## Voiceover lines

1. "N4MA brings your vendor information together, so nothing gets buried in an inbox, spreadsheet, or folder." (vo1.mp3, 6.36s)
2. "N4MA turns messy vendor data into information your team can actually act on." (vo2.mp3, 4.97s)
3. "Ask questions in plain English. Find risks. Understand contracts. And take action." (vo3.mp3, 4.32s)
4. "N4MA doesn't just tell you what's happening. It helps you decide what to do next." (vo4.mp3, 4.32s)
5. "See your entire vendor landscape at a glance." (vo5.mp3, 2.37s)

## Real footage

public/footage-demo.mp4 (the user's 20s 1080p60 silent demo screen recording).
- S2 (120-300): full-bleed, slow push-in, dark gradient overlays, real product reveal under "Meet N4MA".
- S7 (1350-1590): windowed, dimmed backdrop behind animated stat counters.
Footage keeps fps via Remotion's natural frame sampling at 30fps master.

## Motion language
- Ease: cubic-bezier(0.22,1,0.36,1) entrances; (0.4,0,0.2,1) micro. Never linear.
- Reveals: clip-path/opacity rises 200-400ms; cards PopIn with overshoot spring-ish bezier.
- Counter: eased numeric count.
- Cuts between scenes: hard cut at beat, interior fades only within scenes.

## Writing style
No em-dashes in on-screen copy, no curly quotes, sentence case labels.
