---
id: 260824-th9
slug: surf-muted-onto-ink-muted
date: 2026-08-24
type: quick
status: complete
---
# surf-muted onto surf-ink-muted

95 occurrences renamed. Pure rename, no value changed. After the border migration nearly all
of it was text; the three non-text uses are tints of the same token and keep their `/10`,
`/15`, `/60` suffixes and exact rendered values.

**Follow-up noted, not taken:** the order form's scroll backdrop (`order-form.tsx:198`) is a
10% muted tint standing in for a working-area background. That is what `--surf-canvas` is for
now, but swapping it would drop the tint — a deliberate choice, not part of a rename.
