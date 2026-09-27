# Phase 12: Foil the Way a Shaper Cuts It - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-26
**Phase:** 12-foil-the-way-a-shaper-cuts-it
**Areas discussed:** Deck skin & planer passes, Tip thinning & the pin choice, Older boards, presets & litres, Fit check & the blank list

Before the areas: the founder locked the brief as `12-SPEC.md` ("Lock it") and folded one of four matching todos (the foil brief itself); the other three were reviewed and left in the backlog.

---

## Deck skin & planer passes

| Option | Description | Selected |
|--------|-------------|----------|
| Fit & Tip Default + per-board value | Account default in the gear menu, per-board value on ROCKER, new board follows the live default until first edited | ✓ |
| Per-board control only | A ROCKER control with a fixed starting value | |
| One fixed amount, no control | A constant in the geometry | |

**Default skin:** 1/8" ✓ · 3/16" · 1/4"
**Planer passes:** A setting, default 1/8" per pass ✓ · A setting, default 1/16" · Fixed 1/8", no setting
**User's choice:** Fit & Tip Default with a per-board value; 1/8"; a setting at 1/8" per pass.
**Notes:** "Next area" without follow-ups.

---

## Tip thinning & the pin choice

| Option | Description | Selected |
|--------|-------------|----------|
| Per-board toggle by the tip thicknesses, default Pin deck | Two words on the sidebar, saved with the board, no account default | |
| Account default too | The toggle plus a default in Fit & Tip Defaults | |
| You decide | Leave the control's home to the design pass | |

**User's choice (free text):** "Account only, no need for a rocker page toggle. those who want it will find it." — later REVISED in the third area (see below).
**Thinning shape:** Eased — no kink at the 12" station ✓ · Straight taper · You decide
**Tip rocker readouts:** The board's own rocker, blank's beside it ✓ · The blank's rocker only, lift shown separately · You decide
**Notes:** "Next area".

---

## Older boards, presets & litres

| Option | Description | Selected |
|--------|-------------|----------|
| Keep the five station numbers | Default skin and centre gap applied; the two 12" fine-tunes absorb the residual | ✓ |
| Let the numbers move once, with a note | Re-derive with the default skin and show a one-time note | |
| You decide | | |

**Pin memory question:** options were "Remember it once the board is edited or saved" / "Always follow the account's current choice" / "You decide".
**User's choice (free text):** "Great catch, this is reason to include a rocker page setting for it. Settings changes the users default." — the pin choice becomes an account default AND a per-board ROCKER setting (D-04), reversing the previous area's "account only".
**Presets & litres:** Re-pick the presets, litres follow everywhere ✓ · Keep the current picks, litres follow · You decide
**Notes:** "Next area".

---

## Fit check & the blank list

| Option | Description | Selected |
|--------|-------------|----------|
| Skin and gap never negative, width as today | Zero gap at the centre still counts | ✓ with an addition |
| Also at least one pass off the bottom | Centre gap ≥ one planer pass | |
| You decide | | |

**User's choice (free text):** "1, but the blank thickness must be greater than BoardThickness + 2 planer passes (one on deck and one on bottom as a minimum). This may change the Extra Center Thickness in settings to use a Planers' Max Depth setting instead."
**Centre floor:** options "The skin replaces it" / "Keep both" / "You decide" — free text: "We are re-writing this with the planer max depth, so we need at least one deck and one bottom pass as our new min thickness measure."
**List order:** As today ✓ · Least foam to remove first · You decide
**No blank picked:** Unchanged: five typed stations, no skin or passes ✓ · You decide

**Closing clarifications:**
- Floor rule: Target + skin + one bottom pass ✓ (equal to target + 2 passes at the defaults; keeps a bottom pass when the skin is deeper) · Target + 2 passes, always · You decide
- Setting name: Planer Max Depth ✓ · Planer Pass Depth · You decide
- Done: "I'm ready for context" ✓ · Explore more gray areas

## Claude's Discretion

- Placement and copy of the foam-off-bottom figure (sidebar centre figure; DATASHEET Foam Off split into deck and bottom per station).
- Reason wording for greyed rows under the new centre floor.
- Whether Phase 11's D-18 ratio keeps any role (expected to retire by construction).
- The exact ease function for the tip thinning, with the no-kink property tested.
- How the retiring Extra Center Thickness column leaves (stop reading now; remove after the deploy).

## Deferred Ideas

None raised outside the phase. Reviewed todos left in the backlog: the smoother drawn curve, manufacturer tick-boxes, live pointer coordinates.
