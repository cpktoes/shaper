# Phase 4: Rocker & Foil Editors - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-29
**Phase:** 4-Rocker & Foil Editors
**Areas discussed:** Where the editors live, Shaping the rocker, Shaping the foil, The new litres number

---

## Todo Cross-Reference (pre-discussion)

| Option | Description | Selected |
|--------|-------------|----------|
| Fold none (Recommended) | All three adjacent todos stay in the backlog; bottom contours gets a design-consideration note | ✓ |
| Bottom contours | Selectable contour shapes + shading — a new capability needing its own requirement | |
| Presets for rails & fins | Extend presets beyond outline | |
| Copy-spec to clipboard | Copy-the-numbers button across screens | |

**User's choice:** Fold none
**Notes:** 10 keyword matches total; 8 already reviewed as backlog at Phase 3. All four gray areas were selected for discussion.

---

## Where the editors live

| Option | Description | Selected |
|--------|-------------|----------|
| One side-view screen (Recommended) | Both edited on one side-profile drawing; nav stays at six tabs | ✓ |
| Two tabs: ROCKER and FOIL | Each its own screen; seven tabs, each showing half the picture | |
| Rocker tab; foil on VOLUME | Foil controls live next to the number they drive | |

**User's choice:** One side-view screen

| Option | Description | Selected |
|--------|-------------|----------|
| ROCKER, after TEMPLATE (Recommended) | TEMPLATE · ROCKER · RAILS · VOLUME · FINS · SUMMARY — shaping order | ✓ |
| PROFILE, after TEMPLATE | Named for the whole side view | |
| ROCKER, before SUMMARY | New work lands at the end of the row | |

**User's choice:** ROCKER, after TEMPLATE

| Option | Description | Selected |
|--------|-------------|----------|
| Horizontal, nose left (Recommended) | The board as sighted on the rack; matches sketch 005/006 convention | ✓ |
| Vertical, nose up | Matches the plan-view screens; how the prototype drew it | |
| Rotatable, like Template | Defaults one way with the sketch-006 rotate button | |

**User's choice:** Horizontal, nose left — later amended during the foil area: the screen also gets the Template-style rotate button, since blank datasheets read vertically.

| Option | Description | Selected |
|--------|-------------|----------|
| Fill the Summary box (Recommended) | The order form's reserved ROCKER box gets the real curve | ✓ |
| Summary + Rails screen | Also restore the prototype's Rails-page side profile | |
| New screen only | Summary box keeps its placeholder for now | |

**User's choice:** Fill the Summary box

---

## Shaping the rocker

**Question:** Which measurements define the rocker curve?
Options presented: Tip lift + lift at 12" (Recommended) / Tip lift + feel sliders / Tips, 12" and center.

**User's choice:** Free-text — dismissed the first ask and supplied an Arctic Foam 7'3" SBF blank datasheet instead. The model: five stations (nose tip, nose 12", center, tail 12", tail tip); rocker always referenced from the bottom (center = 0); thickness at all five stations defines the deck profile. Spline controls "very similar to the outline generator, including construction lines and sliders," plus direct typed entry of datasheet values.
**Notes:** Also raised, and deferred at the user's own suggestion: a blank picker / blank-recommendation tool ("later").

| Option | Description | Selected |
|--------|-------------|----------|
| Nothing — thickness drives bands (Recommended) | Side profile redraws; band dims only move when thickness moves | |
| I have a shaping rule | User supplies a rocker-to-band rule to encode | |
| Research it first | Mine prototype/references before committing | |

**User's choice:** Free-text — thickness on the Rocker and Rails pages is the same value (changing one changes the other); rocker precedes rails the way fins derive tail width from the outline; Rails gains an override option for standalone-calculator use. Net effect matches option 1 plus the shared-thickness architecture.

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — full character (Recommended) | Each preset gains tuned rocker + thickness, tune-in-editor capture-back workflow | ✓ |
| One shared default | One default side profile for all presets | |
| You decide | Claude picks per-type starting values | |

**User's choice:** Yes — full character

---

## Shaping the foil

*(Mostly settled by the shared-thickness answer above; one open question asked.)*

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — full datasheet view (Recommended) | Width (read-only from outline) + thickness + rocker at each station | ✓ |
| No — thickness and rocker only | Keep the screen focused on what it edits | |
| You decide | Claude judges during design | |

**User's choice:** Yes — full datasheet view
**Notes:** Free-text additions: (1) a button to hide the outline/width reference to focus on rocker only; (2) the rotate button noted above, since datasheets typically read vertically.

---

## The new litres number

| Option | Description | Selected |
|--------|-------------|----------|
| Accurate for designed boards; estimator stays standalone (Recommended) | Real cross-section litres everywhere; board-type-slider estimator survives as standalone mode | ✓ |
| Clean cutover — estimator retires | Always compute from drawn geometry | |
| Show both | Display both figures side by side | |

**User's choice:** Accurate for designed boards; estimator stays standalone

| Option | Description | Selected |
|--------|-------------|----------|
| Blank datasheets (Recommended) | Model a published blank (7'3" SBF, 77.17 L) and require computed litres to land close | ✓ |
| My own measured boards | 2–3 real boards as permanent fixtures | |
| Shaping-software cross-check | One-time CAD comparison | |
| Old-estimator sanity band | Stay within a few percent of the ported estimator | |

**User's choice:** Blank datasheets only (multi-select; one chosen)

| Option | Description | Selected |
|--------|-------------|----------|
| Just show the better number (Recommended) | Opens with default side profile and accurate litres, no ceremony | ✓ |
| One-time note | Dismissable note on first reopen | |
| Keep old figure until touched | Old litres until the side profile is first edited | |

**User's choice:** Just show the better number

---

## Claude's Discretion

- Spline fitting between the five stations, handle behaviour, monotonicity enforcement, slider set
- Rails override toggle default, wording, and re-link behaviour
- Simpson integration details (station count, real rail sections vs named profiles)
- Tip-thickness defaults; datasheet-view layout; typed-entry parsing; all copy
- Validation tolerance vs the blank's stated volume; litre-constant revisit per volume.ts deviation 2

## Deferred Ideas

- Blank picker / blank-recommendation tool (user: "later") — future phase
- Bottom contours, Presets for rails & fins, Copy-spec to clipboard, and the seven other keyword-matched todos — all remain in the backlog
