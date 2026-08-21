---
quick_id: 260821-prf
slug: preset-rails-fins
date: 2026-08-21
status: planned
source: user request + phase 01 code review (REVIEW.md WR-01, WR-02)
files_modified:
  - components/design/design-store.tsx
  - lib/geometry/presets.ts
  - lib/geometry/presets.test.ts
  - components/rails/rail-band-editor.tsx
  - components/fins/fin-placement-editor.tsx
---

# Quick Task: Extend presets to rail bands and fin setups, and fix board-replacement state

Board-type presets currently carry only an outline. Extend them to also seed rail bands and fin
setup, so picking "Fish" gives a coherent starting board rather than only a starting outline.

The two code-review findings are fixed FIRST, in the same task, because both rewrite the same
function (`applyPreset`) and the preset work is meaningless on top of a store that does not reset
those fields.

**User decision (2026-08-21):** preset rail/fin values must be shaper-tuned via the capture loop,
matching the documented D-03 convention in `lib/geometry/presets.ts` — never hand-guessed. This
task builds the structure and the capture affordances; the user supplies the values in a
follow-up tuning session.

## Task 1 — Fix WR-01 and WR-02 in the design store

`components/design/design-store.tsx`.

**WR-01 — `applyPreset` does not replace the board.** Line 134 currently sets only `outline`, so
"Discard & Start New" leaves `rails`, `fins`, `volume`, `finsImportTemplate` and `boardName`
carrying over from the board the user just discarded — contradicting the confirm dialog's own
"This replaces your current board in progress" copy.

Fix: `applyPreset` must produce a genuinely fresh board. Every field not supplied by the preset
resets to its `DEFAULT_DESIGN_STATE` value — specifically `volume`, `finsImportTemplate` and
`boardName` — while `outline` (and, after Task 2, `rails`/`fins`) come from the preset.
`boardStarted` stays `true`.

**WR-02 — `boardStarted` only tracks outline edits.** `updateRailSection`, `toggleTailHardEdge`,
`updateFins`, `updateVolume` and `setFinsImportTemplate` never set `boardStarted: true`, so a user
who edits only rails or fins is not treated as having a board in progress — the replace-board
confirm dialog would not fire and their work could be silently discarded.

Fix: every action that mutates design data sets `boardStarted: true`. `setBoardName` should also
count — naming a board is starting one.

Keep the existing doc comments accurate: `DesignState.boardStarted` documents itself as "set true
the first time a board is applied or edited (`applyPreset`/`updateOutline`)" — update that wording
to match the corrected behaviour.

## Task 2 — Extend `BoardPreset` to carry rails and fins

`lib/geometry/presets.ts`.

Add `rails: RailBandSpec` and `fins: FinPlacementSpec` to the `BoardPreset` interface, keeping the
existing "a preset is a complete spec, not a patch" contract that the file header documents.

**Initial values:** seed all four presets from the existing defaults — `DEFAULT_RAIL_BAND_SPEC`
and `DEFAULT_FIN_PLACEMENT_SPEC` — so every preset is complete and working immediately. Do NOT
invent per-board-type rail or fin numbers: those are the shaper's to supply via Task 3's capture
affordances. Note this explicitly in the file header's D-03 tuning-status block, recording that
rails/fins are seeded-but-untuned for all four presets as of this task.

`applyPreset` (Task 1) then seeds `rails` and `fins` from the preset alongside `outline`.

**Note on fin dimensional fields:** `FinPlacementSpec` includes `boardLength`, `tailWidth12` and
`tailShape`, which are overridden by the outline whenever `finsImportTemplate` is true (via
`effectiveFins`). Storing the full spec is still correct and consistent with the outline
approach — the import toggle continues to govern which values actually apply. Do not special-case
or strip those fields.

Extend `lib/geometry/presets.test.ts` to cover the new fields: every preset has a complete,
structurally valid `rails` and `fins` spec, and the existing bounds/round-trip style of the suite
is preserved.

## Task 3 — Add dev-only capture affordances to the Rails and Fins screens

Mirror the existing outline affordance in `components/outline/outline-editor.tsx` (the
"Copy preset values" button, gated on `process.env.NODE_ENV === "development"`, which serialises
live state into pasteable `presets.ts` source).

Add the equivalent to `components/rails/rail-band-editor.tsx` and
`components/fins/fin-placement-editor.tsx`, each emitting its own spec block in the same pasteable
form, authored through `inchesToMm()` / `degrees()` rather than bare numbers or raw millimetre
brands, exactly as the outline capture does.

**Constraints:**
- Same dev-only gate; must not appear in production output (verify with a production build grep).
- Same dark-sidebar styling as the corrected outline button (quick task 260821-dmg) — legible at
  rest, clear hover state.

## Verification

- `npm run test` — all pass, including new preset rails/fins coverage
- `npm run lint` — 0 errors
- `npm run build` — succeeds
- Production build contains no capture-button text
- Manual: "Discard & Start New" from a board with edited rails, fins, volume and a board name
  produces a genuinely fresh board with none of those carried over
- Manual: editing ONLY a rail control then returning to `/` shows the Continue Current Board card
  and triggers the replace-board confirm dialog on picking a different preset
