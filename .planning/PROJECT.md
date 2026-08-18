# Shaper

## What This Is

A web app that helps surfboard shapers — hobbyist, professional, and curious surfers — design custom boards. Users set overall dimensions, then shape an outline curve, rocker profile, rail contour, and foil, and place fins, with rail-band dimensions, fin placement, and board volume *calculated* from real shaping formulas rather than just hand-drawn. Designs are saved as named models, can be exported as printable full-size templates, and can be published publicly for the shaping community.

## Core Value

The rail-band and fin-placement calculators produce numbers a shaper trusts enough to cut foam to — everything else (visualization, templates, saving, sharing) supports that.

## Business Context

- **Customer**: Hobbyist/backyard shapers, professional shapers, and surfers who want to understand board design or brief a shaper for a custom build
- **Revenue model**: Free tier (core design tools) + paid tier (advanced features — specifics TBD)
- **Success metric**: Not yet defined — revisit once free/paid split is scoped
- **Strategy notes**: —

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User can set overall board dimensions (length, width, thickness) as the starting point for a design
- [ ] User can shape an outline curve within those dimension bounds
- [ ] User can define a rocker curve (nose/tail rocker profile)
- [ ] App calculates rail band dimensions (thickness/apex/tuck at each station) derived from outline + rocker
- [ ] User can define a foil (thickness distribution along the board)
- [ ] User can place fins using compiled placement formulas (rule-of-thumb and derived equations) per fin system/configuration (single, thruster, quad, etc.)
- [ ] App calculates board volume (litres) live from the shaped geometry
- [ ] User can save a design as a named model
- [ ] User can view a 2D visualization of outline, rocker, rail, and fin placement
- [ ] User can export/print a full-size template of the board design
- [ ] User can publish a saved model publicly for others to view
- [ ] UI displays measurements in inches and litres while data is stored in metric internally
- [ ] Free tier gives access to core design tools; paid tier unlocks advanced features (scope TBD)

### Out of Scope

- CNC file export — this tool is explicitly for hand shapers working foam by hand, not CNC-cut boards
- 3D visualization — good v2 idea, not needed to prove out the core calculators
- Brand-specific fin box geometry (e.g. exact FCS2/Futures cutout templates) — v1 fin placement calculates *where* fins go by system/configuration, not brand-specific box cutting geometry

## Context

- Originated from the founder shaping a board with his son and hitting a wall: no good resource for where to start on templates, or how to place fins and shape rail contours for what they were picturing.
- The founder has already compiled a library of fin-placement formulas — some rule-of-thumb, some complex equations derived from tables — sourced from semi-published shaping resources, organized per fin system/configuration.
- Existing competitor **iShaper** already handles printable templates reasonably well. This app's differentiation is the *calculators* (rail band from outline+rocker, fin placement from compiled formulas) — not competing on template drawing alone.
- Repo is currently empty — this is a greenfield build, no existing code or tech stack chosen yet.

## Constraints

- **Geometry math**: All geometry math (outline, rocker, rail band, foil, fin placement, volume) must live in pure TypeScript files under `lib/`, with unit tests — the calculators are the core value proposition, so their correctness must be verifiable in isolation from UI code
- **Units**: UI displays inches and litres (how shapers think and talk); all data is stored in metric internally — for internal precision/consistency while matching shaper-familiar units at the surface
- **Audience**: Users are shapers and surfers, not developers — UI must be approachable to non-technical users, and changes/explanations should be communicated in plain English

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Differentiate on calculators (rail band + fin placement), not template drawing | iShaper already covers templates well; the real gap is trustworthy calculation | — Pending |
| v1 fin placement is system/configuration-based (single, thruster, quad) using compiled formulas, not brand-specific box geometry | Founder already has formulas ready to encode; box-specific geometry is a larger scope for later | — Pending |
| Rail contour calculator included in v1, not deferred | Rail contour was one of the two original pain points alongside fin placement | — Pending |
| Public/shareable models included in v1 | Core to the "value for the broader community" premise, not an afterthought | — Pending |
| Free tier + paid tier monetization | Supports the educational/community angle while still selling access | — Pending |
| Geometry math in pure TypeScript under `lib/` with unit tests | Calculation correctness is the core value; must be testable independent of UI | — Pending |
| UI in inches/litres, internal storage in metric | Match shaper mental model in the UI while keeping consistent internal precision | — Pending |

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
*Last updated: 2026-08-18 after initialization*
