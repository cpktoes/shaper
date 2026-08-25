---
id: 260824-tih
slug: shadcn-neutrals-onto-the-surf-contract
date: 2026-08-24
type: quick
status: complete
---
# shadcn's neutrals onto the surf contract

`components/ui/*` is generated and styles itself with shadcn's token names, which held their
own oklch grey scale. A shadcn Select in the sidebar was a different grey from everything
around it, and stayed grey while the app turned green. Two palettes, one screen.

18 live tokens mapped onto the surf contract; 13 unused ones (`chart-*`, `sidebar-*`) mapped
too so a regenerated component cannot hit an undefined name.

**Mapped in globals.css, not by editing `components/ui/*`** — that is what keeps shadcn
regeneration safe: the generated files never mention a surf token. And because surf tokens
already theme, these need defining **once**, deleting 83 declarations previously kept in step
by hand across four theme blocks. Net −90 lines.

**Two traps avoided:**
- shadcn's `--accent` is a *hover surface*, not a brand accent. Pointing it at `--surf-accent`
  would make every menu hover a bright block. It takes the well.
- `--destructive` is used as ink *and* as a tinted fill, so it takes `--surf-warning-ink`.

**Closes a long-standing gap:** `--border` and `--input` were 1.26:1 and 1.31:1 against the
3:1 non-text bar — flagged when the theming system first landed and left as a founder
decision. They now inherit the line tokens and clear it.

After this there is **no oklch left in globals.css outside a comment**. Every colour in the
app resolves from the two ramps.
