# Phase 10 — Discussion Log

**Date:** 2026-09-10
**Areas selected by the founder:** all four offered — picking a board, the rack's card actions,
signing in, the gear menu and the bottom tab bar.

## What the scout measured before any question was asked

Grounding every option in a real number rather than a guess:

| Surface | Measured | Verdict |
|---|---|---|
| Preset card on a 375x812 phone | 343 x 693px; drawing 529px = 76% of it; 4.2 screens for all the boards | needs work (D-01) |
| `rack-card-menu.tsx` trigger | 44 x 44 (`coarse:size-11`) | already done |
| `rack-card-menu.tsx` rows | `coarse:min-h-11` | already done |
| Nav hamburger trigger | 44 x 44 | already done |
| Nav menu units + theme rows | 46px, all seven | already done |
| Nav menu "Sign in" row | **20px** | needs work (D-06) |
| Five dialogs | zero `coarse:` variants; two carry text inputs | needs work (D-03) |
| Summary on a phone | no sideways scroll, buttons on screen | already done |

**The scout changed the shape of the phase.** Two of the four areas the founder picked turned out
to be largely finished: the rack's card MENU was fully touch-sized already, and the gear menu's
rows clear 44px on their own. What remained in those areas was narrower and more specific — the
dialogs, and one 20px row.

## Decisions, in the order they were taken

1. **Preset cards** — shrink the drawing, one per row (~280-320px). Two alternatives put with their
   costs: a two-up grid (drawings to ~150px, silhouettes only) and a sideways carousel (biggest
   drawings, cannot compare two boards, new pattern). Founder took the first option.
2. **Rack cards** — same rule as presets. One card system, not two.
3. **The five dialogs** — touch-sized and centred. Bottom sheets and full-screen both declined as a
   second layout for five dialogs and a pattern the app does not have.
4. **Delete safety** — the confirm dialog is enough, thumb-sized. Undo declined as a new capability.
5. **Clerk's `<UserButton />`** — measure first, wrap to 44px only if it comes up short. Explicitly
   not "always wrap", to avoid writing a wrapper that does nothing.
6. **Bottom tab bar** — hidden on the home screen until a board is picked. This is the one place the
   founder went against the recommendation: the option offered as recommended was to leave the tabs
   always present for consistency with the desktop nav, and he chose to hide them. The reasoning
   that carried it is in D-07 — the tabs are noise while you are still choosing a board, and the
   space goes to the cards being shortened.

## Raised, not discussed

- **Success criterion 3 is stale.** "Printing stays a desktop job" was written before quick task
  260910-2ny made the order form print correctly from the founder's own iPhone the same day.
  Flagged as a fact to record, not a question to put — recorded in Specific Ideas.
- **Phase 9's deferred landscape tab placement** — phase 9 settled it as a recommendation and named
  Phase 10's real-device use as the place to revisit it. Surfaced so the end-to-end sweep looks at
  it on purpose.
- The founder declined a separate discussion of what "proven end to end" means for criterion 4;
  that is left to the UI-SPEC and planning.

## Scope creep redirected

None arose during the discussion. Two items were recorded as deferred when they surfaced as
alternatives rather than requests: undo/trash for a deleted board, and anything touching the five
design screens (Phase 9's territory).
