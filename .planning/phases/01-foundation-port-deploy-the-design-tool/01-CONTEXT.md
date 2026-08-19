# Phase 1: Foundation — Port & Deploy the Design Tool - Context

**Gathered:** 2026-08-19
**Status:** Ready for planning

<domain>
## Phase Boundary

The ported prototype runs as a real Next.js/TypeScript/Tailwind v4/shadcn app, live on Vercel: a user starts a new design from a setup screen, shapes an outline, and sees rail-band and fin-placement numbers calculated from real formulas — all geometry math as pure TypeScript under `lib/` with tests. Requirements: SETUP-01, OUTL-01, RAIL-01, FIN-01/02/03, VIZ-01, UNIT-01.

**Already delivered via quick tasks (pre-discussion):** outline, rails, fins, volume, and summary screens ported (`app/design/*`); geometry in `lib/geometry/` with Vitest tests and golden values extracted from the prototype; units conversion (`lib/geometry/units.ts`). **Remaining:** setup screen / entry flow (SETUP-01), landing + nav integration, Vercel deployment.

</domain>

<decisions>
## Implementation Decisions

### New-design entry flow (setup screen)
- **D-01:** A setup screen is the entry point for starting a design. It presents board-type preset cards: the core four — Shortboard, Fish, Mid-length, Longboard. Groveler and Gun presets are deferred (see Deferred Ideas).
- **D-02:** Each preset sets **dims + outline character** — not just length/width/thickness, but nose angle, fullness, tail shape, etc., so a Fish starts looking like a fish.
- **D-03:** Preset values workflow: Claude drafts sensible per-type values → the user tunes each preset **in the live outline editor** (they need access to the template maker to adjust nose/tail angle, fullness, tail shape and see what the default curves actually look like) → tuned values are captured back as the preset definitions. The plan must include a way to read/capture the current outline state as a preset (a dev-only "copy current values" affordance is acceptable).
- **D-04:** Clicking a preset card drops the user **straight into the outline editor** with the preset applied — no intermediate dims-tweaking step on the setup screen. Dims are adjusted in the editor via the existing sliders.

### Landing page & nav
- **D-05:** `/` (root) **is** the setup screen — it replaces the current redirect to `/design/outline`. No separate marketing page in Phase 1. — **Reversibility:** reversible
- **D-06:** The SHAPER wordmark in the nav links home to the setup screen. The five design tabs (TEMPLATE / RAILS / VOLUME / FINS / SUMMARY) stay as-is; no new tab.
- **D-07:** The in-progress design survives in-session: the store keeps the current board while the tab is open, and the setup screen shows a "Continue current board" card alongside the presets. Picking a new preset replaces the current board **with a confirm**. Real persistence arrives in Phase 2.
- **D-08:** Preset cards show **outline thumbnails** rendered from each preset's actual curve (reuse existing outline viewer geometry), so a shaper instantly recognizes fish vs longboard.

### Claude's Discretion
- **Vercel deployment mechanics** — production setup, URL, preview deploys: user did not select this area; use sensible defaults (deploy from `main`, default vercel.app URL acceptable for Phase 1).
- **Prototype-parity / done checklist** — what remains to port from `reference/` is Claude's judgment against the phase success criteria; rocker and foil editors are explicitly Phase 4.
- **Setup screen layout details** beyond the decisions above.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project scope & phase definition
- `.planning/PROJECT.md` — core value, constraints (geometry in `lib/`, metric storage / inches+litres display, prescribed stack)
- `.planning/REQUIREMENTS.md` — SETUP-01, OUTL-01, RAIL-01, FIN-01..03, VIZ-01, UNIT-01 definitions
- `.planning/ROADMAP.md` — Phase 1 goal and success criteria

### Prototype source
- `reference/` — the Claude Design prototype the app is ported from; golden values are extracted from it via `scripts/extract-prototype-*.mjs` (`npm run golden`)

No other external specs — remaining decisions fully captured above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/design/design-store.tsx` — shared client-side board state read by every screen; presets apply into this store, and the "continue current board" card reads from it
- `components/outline/outline-viewer.tsx` + `lib/geometry/outline.ts` — outline rendering/geometry, reusable for preset card thumbnails (D-08)
- `components/outline/outline-controls.tsx` — existing dims sliders (Board Length, Widepoint Width, tail shape); the editor the user lands in after picking a preset (D-04) and tunes presets with (D-03)
- `components/ui/*` — shadcn primitives (Card, Button, Select, etc.) for the setup screen
- `components/site-nav.tsx` — NAV_LINKS array + SHAPER wordmark; wordmark becomes a link to `/` (D-06)

### Established Patterns
- Units: geometry stored metric (mm), displayed inches via `lib/geometry/units.ts` helpers (`mmToInches`, `formatFeetInches`, `formatInchesFraction`) — preset dims must be defined/stored in metric
- Geometry math pure TS in `lib/geometry/` with Vitest tests + golden values from the prototype — preset outline-character values belong in `lib/` (e.g. a `presets.ts`), testable in isolation
- One screen per route under `app/design/*` with shared layout/nav

### Integration Points
- `app/page.tsx` — currently `redirect("/design/outline")`; becomes the setup screen (D-05)
- `components/design/design-store.tsx` — needs a "apply preset" action and a notion of "board started" for the continue card (D-07)
- GitHub remote exists (`cpktoes/shaper`); no Vercel project yet — deployment is net-new setup

</code_context>

<specifics>
## Specific Ideas

- "A Fish starts looking like a fish" — presets are about recognizable board character, not just numbers
- The user (a shaper) wants to personally tune each preset's curves in the editor before they ship — preset quality is a trust matter, same ethos as the calculators
- Setup screen should be designed so a saved-boards section can slot in during Phase 2 without a redesign

</specifics>

<deferred>
## Deferred Ideas

- **Groveler & Gun presets** — add to the preset roster after the core four ship (later Phase 1 pass or backlog)
- **Saved boards on the setup screen with a working/done status indicator** — Phase 2 (Accounts & Saved Designs); the status indicator is an addition Phase 2 doesn't currently spell out
- **Community board database** — boards built by other (free/low-tier) users, rateable by the community, sortable by board type, length, rating, etc. — v2 sharing milestone (extends SHAR2-01/02 with ratings + browsing)
- **localStorage persistence of in-progress board** — considered for Phase 1, deliberately left to Phase 2's real persistence

</deferred>

---

*Phase: 1-Foundation — Port & Deploy the Design Tool*
*Context gathered: 2026-08-19*
