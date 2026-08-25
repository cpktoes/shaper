---
id: 260824-tef
slug: borders-onto-the-line-tokens
date: 2026-08-24
type: quick
status: complete
---
# Borders onto the line tokens

45 borders were hand-mixed opacities of the muted token — 10, 15, 20, 25, 30 and 60 percent,
six weights doing the job of two roles. `--surf-line` and `--surf-line-faint` existed but had
two consumers between them, so the bench's Line pickers did essentially nothing.

- **5 → `--surf-line`** — rounded control edges (fin/tail pills, two preset buttons). A
  control's own boundary is what WCAG 1.4.11's 3:1 bar applies to.
- **37 → `--surf-line-faint`** — dividers, section rules, table grids, dialog edges.
- **3 left alone** — not borders: one placeholder text, two highlight fills.

**Asymmetric visual effect, stated rather than discovered.** Light is a no-op (old mix
rendered `#dadde1`, token is `#d8d7cd`). Dark is dramatic: old mix was `#30433b`, the green
ramp's `line-faint` is `#00ff40`, so every hairline now glows. That is the value already in
the ramp finally having something to act on.

**A second set was found later, hiding in CSS** — `--outline-sidebar-input-border` and
`--outline-sidebar-divider` were 20% muted mixes declared one derivation layer down, invisible
to a `.tsx` grep. Caught by measuring a border in the browser. Fixed in a follow-up commit.
Three color-mix values remain on purpose: board wash, station lines, widepoint line are
*drawing weights* that must sit behind the outline, not UI boundaries.
