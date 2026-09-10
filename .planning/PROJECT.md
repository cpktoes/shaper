# Shaper Assistant

## What This Is

A web app that helps surfboard shapers — hobbyist, professional, and curious surfers — design custom boards. Users set overall dimensions, then shape an outline curve, rocker profile, rail contour, and foil, and place fins, with rail-band dimensions, fin placement, and board volume *calculated* from real shaping formulas rather than just hand-drawn. Designs are saved as named models and can be exported as printable full-size templates. Public sharing and paid tiers come later, once real shapers have used the free version.

## Core Value

The rail-band and fin-placement calculators produce numbers a shaper trusts enough to cut foam to — everything else (visualization, templates, saving) supports that.

## Business Context

- **Customer**: Hobbyist/backyard shapers, professional shapers, and surfers who want to understand board design or brief a shaper for a custom build
- **Revenue model**: Free tier (core design tools) at launch; paid tier (billing/gating) introduced in a later milestone once free-tier usage with real shapers validates what's worth paying for
- **Success metric**: Not yet defined — revisit once free/paid split is scoped
- **Strategy notes**: See `M1`–`M6` build order in Context below

## Current State

**In progress: v1.2 — Rails Finished, Phone Ready.** Phase 8 complete (2026-09-08, 9 plans): the
rails screen is finished. It has the INSTRUCTIONS tab the prototype always had — a live example
rail a shaper can flip between Flat and Domed, every mark named beside it, and a plan-and-side
view of the whole board showing where the nose, centre and tail sections sit — plus "View Full
Sized", the rail cross-section at 1:1 on screen and on a landscape printed page with a 2 in /
50.8 mm check bar, and an "Include Rail Band Instructions in Print" preference that folds the
reference sheet into the order form as a third page in either system. The shaper's own UAT passed
seven of ten tests; the three failures (the full-sized print sat half off the page, Metric axis
numbers collided on the small example rail, US Letter printed blank pages around the order form)
were closed by three gap plans and re-measured with headless Chrome. Phase 9, the design screens
on a phone, is next.

**Shipped: v1.1 — Imperial vs Metric** (2026-09-06, Phases 5–7, 21 plans)

A shaper picks Imperial or Metric from the gear menu and the whole app follows: the setup screen's
preset and rack cards, all five design screens, and everything that comes out of a printer — the
Summary order form, the Overview Sheet, the Full Sized Template and the Paper Saver. Metric is
all-metric, split into two families of number: dims (length, widths, headline thickness) in
centimetres to one decimal, and marks (rail bands, rocker heights, foil stations, every fin
placement figure) in whole millimetres. Litres are litres in both. The choice is saved on the
shaper's account and follows them across devices; signed out, the browser remembers it alone.

Underneath, nothing changed: every board is still stored in metric millimetres, and the preference
lives outside a saved board's own data, so switching systems can never rewrite a design. A shaper
who never opens the chooser gets byte-for-byte the app they had before — proven by rebuilding every
Imperial PDF from the pre-milestone commit and finding all 68 pages identical.

Before that, **v1.0 — the design tool, in inches** (2026-08-29, Phases 1–4): the Claude Design
prototype ported into a real Next.js app and live on Vercel, with accounts and saved designs,
verified geometry math, live volume, printable full-size templates, and the rocker and foil editors.

Archives: [v1.1](milestones/v1.1-ROADMAP.md) · [v1.0 phases](milestones/v1.0-phases/)

## Current Milestone: v1.2 Rails Finished, Phone Ready

**Goal:** Finish the rails screen the prototype always had, and make the whole app something a shaper can actually use on a phone.

**Target features:**
- The rails screen's third tab, INSTRUCTIONS ("Understanding Rail Markings") — a live example rail with every mark named by a callout, and a Flat / Domed toggle, ported from the prototype
- An "Include Rail Band Instructions in Print" option that folds that sheet into printed output, in the shaper's chosen system
- "View Full Sized" — the rail cross-section at 1:1 on screen, to hold against the foam; standard-screen assumption, same as the prototype, with no calibration step
- A board-outline plan and side reference view on the rails screen, with legend checkboxes, showing where each rail section sits along the board
- Every screen works on a phone, end to end: sign in, pick a preset, open a saved board from the rack, shape it across all five design screens, save it, read the summary
- Touch-first, not merely unbroken: finger-sized sliders and buttons, viewers that fill the screen, and drag handles that work under a thumb

**Key context:** No new geometry math: the prototype passes a `halveDeckMark1` flag when computing the INSTRUCTIONS example rail, but its `computeSection` never reads it (verified 2026-09-07 — the flag appears once, at the call site on `Rails.dc.html` line 1359, and not in the parameter list on line 704), so the existing `computeRailSection` already produces the example rail exactly as the prototype drew it. The page's background artwork moves from `reference/project/assets/rail-bands-plan-bg.png` into `public/`. The design screens have zero responsive breakpoints today, so phone layout is built from scratch across effectively every screen, including touch drag on the outline, rocker and foil editors. Everything new reads the shaper's chosen units under the v1.1 dims-in-cm / marks-in-mm split. The board-outline plan view was originally blocked by the rails screen owning its own state; the shared design store from Phase 1 removed that blocker.

<details>
<summary>Carried forward — not in v1.2</summary>

- **Free/paid tier gating** (Clerk Billing) — build-guide milestones M4–M5, waiting on real shapers using the free version so it's clear what's worth paying for. The first candidate feature is branding the order form with a shaper's own logo and contact details (todo, 2026-09-06)
- **Public sharing / model gallery** — build-guide milestone M6
- **Retroactive coverage on v1.1** — a security pass for Phase 5 (it added a database table and a server action) and Nyquist validation for Phases 5–7, none of which was run

</details>

## Requirements

### Validated

- [x] User can set overall board dimensions (length, width, thickness) as the starting point for a design — Validated in Phase 1: Foundation — Port & Deploy the Design Tool
- [x] User can shape an outline curve within those dimension bounds — Validated in Phase 1: Foundation — Port & Deploy the Design Tool
- [x] App calculates rail band dimensions (thickness/apex/tuck at each station) derived from outline + rocker — Validated in Phase 1: Foundation — Port & Deploy the Design Tool
- [x] User can place fins using compiled placement formulas (rule-of-thumb and derived equations) per fin system/configuration (single, thruster, quad, twin/2+1) — Validated in Phase 1: Foundation — Port & Deploy the Design Tool
- [x] App calculates board volume (litres) live from the shaped geometry — Validated in Phase 1: Foundation — Port & Deploy the Design Tool
- [x] User can view a 2D visualization of outline, rocker, rail, and fin placement — Validated in Phase 1: Foundation — Port & Deploy the Design Tool
- [x] UI displays measurements in inches and litres while data is stored in metric internally — Validated in Phase 1: Foundation — Port & Deploy the Design Tool
- [x] User can sign up, log in, and reset their password (email/password and Google via Clerk) — Validated in Phase 2: Accounts & Saved Designs
- [x] User can save a design as a named model, reopen it, and see their list of saved models (plus rename, duplicate, delete from the rack) — Validated in Phase 2: Accounts & Saved Designs
- [x] User can export/print a full-size template of the board design, tiled across pages — Validated in Phase 3: Volume, Templates & Verified Math (ruler-verified 1:1 scale, alignment-box tiling, shaper marks, plus a one-page Overview Sheet; geometry suites gate every push via GitHub Actions)
- [x] User can define a rocker curve (nose/tail rocker profile) — Validated in Phase 4: Rocker & Foil Editors (five-station rocker on a fold-back-proof monotone spline; adjustable by slider, typed imperial fractions, or dragging the curve; per-preset rocker character; survives save/reopen)
- [x] User can define a foil (thickness distribution along the board) — Validated in Phase 4: Rocker & Foil Editors (five-station foil drives the rail-band thickness through a default-on link and feeds a Simpson-integrated cross-section volume validated within 1.01% of a published blank; one litres figure quoted on every screen)
- [x] User can choose Imperial or Metric from the settings menu; the choice is saved on their account and remembered per browser when signed out — Validated in Phase 5: The Units Chooser (gear-menu chooser, account column with per-browser fallback, setup screen's preset and rack cards follow)
- [x] Every measurement on the five design screens (sliders, typed entry, callouts, tables) reads in the chosen system — cm for length and widths, mm for rail band, rocker and foil values, litres for volume either way — Validated in Phase 6: The Design Screens in Metric (one display boundary in lib/geometry/measure-display.ts; every design-screen file pinned converted by the units-isolation ledger; fin placement numbers read as whole-millimetre marks after the shaper's UAT decision; UAT 18/18, security 34/34)
- [x] Everything a shaper prints — the Summary order form, the Overview Sheet, the Full Sized Template and the Paper Saver — reads in the chosen system, with 1:1 templates still measuring dead true against a ruler — Validated in Phase 7: Metric on Paper (all four print surfaces pinned converted by the units-isolation ledger; the scale-check square stays exactly two inches in both systems but is captioned 50.8 mm in Metric; every Imperial page byte-identical to the pre-milestone build; UAT 9/9)
- [x] User can read the rails screen's INSTRUCTIONS page — a live example rail with every mark named — and fold that sheet into what they print — Validated in Phase 8: The Rails Screen, Finished (INSTRUCTIONS tab with a Flat/Domed example rail and its callouts; "Include Rail Band Instructions in Print" saved on the account with a per-browser fallback; the sheet prints as the order form's third page in either system, and unticked output is byte-identical; UAT 7/10, the three gaps closed and re-measured)
- [x] User can view the rail cross-section at actual size on screen, and see where each rail section sits along the board outline — Validated in Phase 8: The Rails Screen, Finished (View Full Sized dialog with a 2 in / 50.8 mm check bar, true size on screen and on a landscape printed page; plan-and-side reference figure with a nine-item legend)

### Active

- [ ] User can do everything the app does from a phone, with controls sized for a thumb

### Out of Scope

- CNC file export — this tool is explicitly for hand shapers working foam by hand, not CNC-cut boards
- 3D visualization — good v2 idea, not needed to prove out the core calculators
- Brand-specific fin box geometry (e.g. exact FCS2/Futures cutout templates) — v1 fin placement calculates *where* fins go by system/configuration, not brand-specific box cutting geometry
- Free/paid tier gating (Clerk Billing) — deferred until real shapers have used the free version and it's clear what's worth paying for (build guide milestones M4–M5)
- Public sharing / model gallery — deferred alongside billing (build guide milestone M6)

## Context

**Current state (Phase 2 complete, 2026-08-28):** The app is live at
https://www.shaperassistant.com, auto-deploying from `main`, with accounts and saved designs
working end to end. A shaper can sign in (email/password or Google via Clerk), design a board,
and have it autosave to their own rack — named models they can reopen, rename, duplicate, and
delete. Sign-in is a nudge, never a gate: every design tool works signed out. Data lives in
Neon Postgres (two branches — production for the live site, a copy-on-write development branch
for local work), every read and write ownership-scoped, with a 20-threat STRIDE register fully
closed (02-SECURITY.md). Rail-band and fin-placement math remains pure TypeScript under `lib/`
pinned against golden fixtures. Next: Phase 3 — tested geometry, live volume, printable
templates ("the math is right").

- Originated from the founder shaping a board with his son and hitting a wall: no good resource for where to start on templates, or how to place fins and shape rail contours for what they were picturing.
- The founder has already compiled a library of fin-placement formulas — some rule-of-thumb, some complex equations derived from tables — sourced from semi-published shaping resources, organized per fin system/configuration.
- Existing competitor **iShaper** already handles printable templates reasonably well. This app's differentiation is the *calculators* (rail band from outline+rocker, fin placement from compiled formulas) — not competing on template drawing alone.
- The founder already built a working prototype of the design tool in Claude Design (a single self-contained page) that includes the rail-band and fin-placement calculators — the "secret sauce." It will be ported into this repo as reference/ and rebuilt as a proper Next.js app; the geometry logic is expected to transfer, not be re-derived from scratch.
- The founder is following a written field guide ("Shaping Bay to Production") for taking the prototype to a real, deployed app. It prescribes a milestone order: **M1** live+saving (port prototype, deploy, accounts, persistence) → **M2** the math is right (tested geometry, volume, templates) → **M3** shaper features (rocker/foil editors, fin placement UI, saved-model rack) → **M4** invite real shapers, free for everyone → **M5** turn on Pro (billing/gating) → **M6** depth (exports, sharing, gallery). This roadmap covers M1–M3; M4–M6 are future milestones.
- Repo was empty at project init — this is a greenfield build from GSD's perspective, even though a working prototype exists outside the repo and will be ported in during Phase 1.

## Constraints

- **Geometry math**: All geometry math (outline, rocker, rail band, foil, fin placement, volume) must live in pure TypeScript files under `lib/`, with unit tests — the calculators are the core value proposition, so their correctness must be verifiable in isolation from UI code
- **Units**: UI displays the shaper's chosen system — Imperial (feet-inches and fractions) by default, or Metric (cm and mm) from milestone v1.1 — with litres for volume either way; all data is stored in metric internally and every conversion goes through `lib/geometry/units.ts` — for internal precision/consistency while matching how each shaper reads a tape measure
- **Audience**: Users are shapers and surfers, not developers — UI must be approachable to non-technical users, and changes/explanations should be communicated in plain English
- **Tech stack**: Prescribed by the founder's build guide — Next.js (latest, App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui; Neon Postgres via Drizzle ORM; Clerk for auth (Clerk Billing later for subscriptions); hosted on Vercel; Vitest for unit tests, Playwright for e2e — not to be substituted without discussion

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Differentiate on calculators (rail band + fin placement), not template drawing | iShaper already covers templates well; the real gap is trustworthy calculation | — Pending |
| v1 fin placement is system/configuration-based (single, thruster, quad, twin/2+1) using compiled formulas, not brand-specific box geometry | Founder already has formulas ready to encode; box-specific geometry is a larger scope for later | — Pending |
| Rail contour calculator included in v1, not deferred | Rail contour was one of the two original pain points alongside fin placement | — Pending |
| Free/paid tier gating and public sharing deferred to v2 (post M3) | Founder's build guide recommends validating the free tier with real shapers before building billing and sharing infrastructure | — Pending |
| Geometry math in pure TypeScript under `lib/` with unit tests | Calculation correctness is the core value; must be testable independent of UI | — Pending |
| UI in inches/litres, internal storage in metric | Match shaper mental model in the UI while keeping consistent internal precision | — Pending |
| Adopt prescribed stack (Next.js/TypeScript/Tailwind/shadcn, Neon+Drizzle, Clerk, Vercel, Vitest+Playwright) | Founder's build guide specifies this exact stack with rationale (Vercel+Next.js integration, Claude Code's familiarity with these tools) | — Pending |
| Existing Claude Design prototype ported into repo during Phase 1, not rebuilt from scratch | Prototype already implements the rail-band and fin-placement "secret sauce" calculators | — Pending |
| Sign-in is a nudge, never a gate — all design tools work signed out | Shapers should feel the tool's value before being asked for an account; enforced mechanically by `lib/auth/open-access.test.ts`, which fails if any route guard appears | Working (Phase 2) |
| Autosave (debounced, with failure backoff) instead of manual-save-first | A shaper mid-design shouldn't lose work to a forgotten button; save state shown in the nav, dirty only clears when the server confirms the latest snapshot | Working (Phase 2) |
| Delete has no trash/undo — a typed-name confirm is the safety (D-13) | Keeps v1 simple; recorded as an accepted risk (AR-02-02) so a later phase revisits it deliberately | Accepted (Phase 2) |
| Two Neon branches: production + copy-on-write development; code deploys before production migrates | Local work can never touch a real shaper's boards, and the live site always understands the schema it reads | Working (Phase 2) |
| Units chooser reads Imperial vs Metric, not inches vs cm | The choice is a measuring system, not a pair of units: feet-inches and fractions on one side, cm and mm on the other (founder, v1.1 kickoff) | Validated (Phase 5) |
| Metric is all-metric, length included: cm for length and widths, whole mm for rail band, rocker and foil values | One rule, the way Shape3d and BoardCAD switch; mm is what a metric tape measure reads at small sizes | Validated (Phase 6) — amended: fin placement numbers (off-tail, off-rail, toe-in, base length, toe-aim distances) are whole-mm marks too |
| Units preference lives on the account, with a per-browser fallback when signed out | Follows the shaper across devices; sign-in stays a nudge, never a gate | Validated (Phase 5) |
| Fin placement numbers are millimetre marks, board dims stay centimetres | Shaper decision during Phase 6 UAT: a fin's distance off the tail, off the rail, its toe-in and base length are read off a rule on the blank, so they read in whole mm like every other mark; board length and tail width stay the cm dims they are everywhere else (supersedes Phase 6 D-01) | Validated (Phase 6, plan 06-08) |
| The Summary order form stays part-metric until Phase 7 | Its own dims block, thickness, size line and fin rows are the same component on screen and on paper; Phase 7 (PRNT-01) converts every printed output together rather than splitting the order form across two phases | Accepted (Phase 6 UAT, deferred follow-up) |
| The printed scale-check square stays two inches in both systems | It is a calibration reference measured with a ruler, so it must agree with what is actually drawn; only its caption changes, making `50.8 mm` the app's one millimetre value that carries a decimal | Validated (Phase 7, plan 07-01) |
| A unit is carried once per line of running text; a value alone in its own box carries its own | The Full Sized Template's wrapped dims row takes `cm` once at the end while the order form's seven bordered cells each take their own — the same numbers, formatted two ways, on purpose | Validated (Phase 7, plans 07-01 and 07-04) |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-09-08 after Phase 8: The Rails Screen, Finished*
