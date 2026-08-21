---
created: 2026-08-21
source: sweep of deferred items in quick task 260818-lm0
resolves_phase:
---

# Rails viewer: "View Full Sized" modal and the board-outline plan view

Two rails-screen viewer features deferred in `260818-lm0-PLAN.md` and never tracked.

## 1. "View Full Sized" actual-size modal

Prototype exposes an actual-size (1:1) view of the rail cross-section via `plotSvgHtml`. Listed out
of scope alongside "and all printing".

Directly useful to a shaper: a 1:1 rail cross-section can be held against the foam. Worth
considering alongside TMPL-01 (Phase 3, full-size outline templates) since both are true-scale
output and will share scaling concerns — but this one is a screen modal, not a tiled print job,
so it can ship independently.

## 2. Board-outline plan view and legend checkboxes

`buildBoardOutlinePlot`, `planRefPaths`, `sideRefPaths` and their legend checkboxes — a plan/side
reference view on the rails screen showing where the rail sections sit along the board.

Note this was deferred partly because the rails screen "owns its own state" and had no access to the
outline. That is no longer true — the shared design store landed in Phase 1 — so the blocker is gone.
