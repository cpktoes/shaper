---
id: 260825-wrq
slug: rotate-button-size-border
date: 2026-08-25
type: quick
status: complete
---

# 260825-wrq: Rotate button size and border

Enlarged the Template viewer's rotate button and gave it a visible border, per the founder's request. Icon grows `size-5` to `size-6` (20px to 24px); button gains `border border-surf-line`, `bg-surf-ground`, and `hover:bg-surf-well`, growing the rendered box from 28px to 34px. No orientation behaviour, glyph paths, or other files changed — one edit in `components/outline/outline-editor.tsx`.

The two stale comments this touches were rewritten in place rather than deleted: the `RotateBoardIcon` docstring's `size-5` rationale now names 24px and the founder's request/sketch-006 caveat, and the button's "Ghost/unfilled" comment now describes the bordered/filled treatment — border token is `surf-line` (not `surf-line-faint`, per the rule at `components/viewer/tabbed-panel.tsx`), and the accent-fill warning survives (a fill now exists, and it's deliberately not the accent).

**Non-obvious finding surfaced by the plan's research:** `--surf-ground` and `--surf-panel` hold identical values in all four themes, so `bg-surf-ground` adds no visible plate against the panel behind it. Its real job is opacity — the button is absolutely positioned and `z-10` over the drawing, so an opaque interior is what stops board lines running under the glyph, not a colour distinction from the surrounding panel.

## Verified

- `npx tsc --noEmit` — clean
- `npm run lint` — clean (9 pre-existing warnings, unrelated to this change)
- `npm test` — 670 tests passed
- `npm run build` — succeeded
- Grep checks for `size-6` and `border border-surf-line bg-surf-ground` both matched
- `git status --short` confirmed only `components/outline/outline-editor.tsx` changed

**Pending:** the four-theme visual pass (Daylight, Chalk, Slate, Phosphor) is the orchestrator's `<human-check>` — not driven here.

## Commits

- `235c209` — feat(outline): bigger bordered rotate button on the Template viewer
