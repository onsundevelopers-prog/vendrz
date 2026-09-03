# How we redesigned the Linear UI (part Ⅱ)

**Source:** Linear blog — Karri Saarinen and 3 others · March 28, 2024
**Purpose:** Design reference for N4MA's UI work. This is the second post in a
two-part series (part one covered *why* redesigns matter; this one covers the
new UI and how the project was run — no infinite-loop processes, workshops, or
sticky notes).

---

## Introducing a more cohesive, timeless UI

> Karri Saarinen, Co-founder

Our environment plays an important role in the success of our projects. Among
all the variables that compose our environment, the tooling we choose has a
profound impact on the work we do, and, in the best case scenario, becomes a
standard for how we build products. This is why we put so much care into even
the tiniest details in Linear.

The result of many weeks of work redesigning Linear's interface: we adjusted
the sidebar, tabs, headers, and panels to reduce visual noise, maintain visual
alignment, and increase the hierarchy and density of navigation elements.
These changes make space for Linear to evolve from a simple issue tracker into
a purpose-built system for product development.

---

## Concept exploration

> Karri Saarinen, Co-founder

There is never a good time to do a redesign. Normally these projects require a
team of 5–7 people, but at the time the product and design team were busy with
ongoing projects. An opportunity presented itself after returning from
parental leave: the company was functioning mostly without direct involvement,
creating a window to get started on the concept design alone in Figma.

The most pressing problems:

- **Accommodating the product evolution**
- **Enhancing the clarity of the application chrome and views**
- **Improving the navigation**

Navigation was eventually set aside — the problems were complex and no longer
solely a design issue; updates would require significant engineering work and
change how users interact with the product. Scope was kept to a pure redesign.

Key principles from this phase:

- The design concept should feel like an **exciting evolution** of the product.
- A redesign should **not** completely disassemble the product to its atomic parts.
- Be ambitious but realistic; manage risk.
- Focus on the **inverted L-shape** — the global chrome that controls the
  content in the main view.
- Work in daily sets of screens/flows (one day Inbox, next day roadmap and
  projects…), experiment with sidebar/visual styles/colors, link screens into a
  prototype, gather feedback.

This process generated hundreds of screens and narrowed down a few major
directions; then the concept was brought to life.

---

## From a concept to prototype

> Yann-Edern Gillet, Design

- The concept wasn't fully figured out; it needed additional design work.
- Some changes were made off the bat (e.g. the color system); others were
  punted (e.g. different headers across the app).
- Two people tackled two different design parts simultaneously to spark
  conversation and speed up decisions.
- Guiding question kept the work honest: *"How real could this concept car be?"*
  — then push during tests to get as close to it as possible.

---

## What tests did we run before implementation?

> Yann-Edern Gillet, Design

Easy for UI-redesign scope to blow up. Stress tests (crash tests) were run
before implementation to keep everyone focused. Three focus areas:

### 1. Environment

- App runs on Electron → navigation must work on macOS, Windows (native), and
  any browser.
- Previous/next navigation, history, and tabs needed to be easily removable to
  work with browsers.
- Tested options from very condensed to more spacious configurations; Apple
  standards helped get close to a native-app feeling.
- Aligned labels, icons, and buttons vertically and horizontally in the sidebar
  and tabs — not immediately visible, but felt after a few minutes of use.

### 2. Appearance

- Light and dark modes, plus a custom theme generator.
- Explorations mostly used **opacities of black and white**, clarifying the
  intended relationship between elements, elevation, and hierarchy.
- Theme system rebuilt on the **LCH color space** instead of HSL:
  - LCH is perceptually uniform (a red and a yellow at lightness 50 appear
    roughly equally light to the human eye) → consistently good-looking themes
    regardless of base colors.
  - Theme generation uses just three inputs instead of 98 variables per theme:
    **base color, accent color, and contrast**.
  - A **contrast variable** (30–100) automatically provides super-high-contrast
    themes for accessibility.
  - LCH handles different elevations for surfaces (background, foreground,
    panels, dialogs, modals).
- Light and dark themes were migrated to the same generation system so design
  and engineering shared the same language.

### 3. Hierarchy

- Linear relies on structured layouts supporting navigation elements and
  content: additional headers for filters/display options, side panels for meta
  properties, and the display itself (list, board, timeline, split, fullscreen).
- Testing was done **by view type** (list, board, split, etc.) to focus and
  ensure every decision works in all cases.

---

## Milestones

> Yann-Edern Gillet, Design

1. **Stress tests** — after the November 2023 explorations, test the direction
   in the main views: Inbox, Triage, My Issues, Issues List, Project, Cycles,
   Roadmap, Search.
2. **Behavior definitions** — document and define the behaviors of the main
   components: sidebar, tabs, app headers, view headers.
3. **Sidebar and chrome refresh** — implement the first bits (sidebar, tabs,
   view headers); improve appearance/contrast of light and dark themes; ship
   behind a **feature flag** for internal testing.
4. **Private beta** — roll out to get initial feedback, then to a percentage of
   workspaces each day.
5. **GA** — release to all workspaces.

---

## How did we prioritize the refresh with other projects?

> Karri Saarinen, Co-founder · Romain Cascino, Engineering

- **Do a redesign quickly** — otherwise it blocks almost every project and
  creates design debt (new features get redesigned soon after creation).
- Once the direction was set, a **small team** led the effort. All in all the
  project took **about six weeks**.
- Kicked off at an offsite in Athens: a big chunk of initial work on sidebar,
  tabs, and header levels.
- Each afternoon, coding portions were divided into **pairs of engineers** while
  designers iterated on other parts — a daily pipeline that produced the first
  working version of the new UI by the end of the week (behind a feature flag).
- Next: **Inbox** — notifications centered around notification type, emphasized
  teammate faces, simplified headers/filters, harmonized comments and buttons
  with the new themes.
- Color theme polish: limit chrome (blue) usage in color-system calculations for
  a more **neutral, timeless appearance**; darker text/neutral icons in light
  mode, lighter in dark mode.
- Typography: **Inter Display** for headings (more expression, maintained
  readability); regular **Inter** for the rest.

---

## How did the wider team help test the new UI?

> Romain Cascino, Engineering · Yann-Edern Gillet, Design

- **Dogfood everything** before public release.
- After ~a week of refinement post-offsite, the feature flag was turned on
  internally and everyone was invited to try it and give feedback.
- Crucial to get feedback from different teams (Product, Customer Success,
  Sales, Brand) since they use specific parts of the app: Product/Sales look at
  roadmap, project leads use documents, Customer Experience files issues to
  Triage.
- An internal developer toolbar toggle switched the new-UI flag on/off for easy
  comparison.
- A dedicated Slack channel linked to the project in Linear kept all updates
  findable; weekly project update discussions synced automatically to Linear so
  context wasn't lost between tools.

---

## Welcome to the new Linear

Explore the new UI in your Linear workspace. Let them know what you think on
Twitter, LinkedIn, or in their Slack community.

*If you like how they build, apply to join — they're hiring for product,
design, and brand roles.*

---

## Takeaways for N4MA

- **Chrome and hierarchy over decoration:** sidebar, tabs, headers, panels —
  reduce visual noise, keep alignment, increase density.
- **Three theme inputs (base, accent, contrast) on LCH** instead of a sprawling
  variable set; design for light, dark, and high-contrast.
- **Inverted-L global chrome** controls the main view; focus redesign effort there.
- **Feature-flag the rollout:** internal testing → private beta → percentage
  rollout → GA.
- **Small dedicated team, fast iteration, daily designer–engineer pipeline.**
- **Neutral, timeless appearance:** minimize accent-chrome usage; adjust text
  contrast per mode.
- **Inter Display for headings, Inter for body.**