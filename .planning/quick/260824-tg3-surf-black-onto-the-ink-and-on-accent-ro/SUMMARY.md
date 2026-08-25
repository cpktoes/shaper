---
id: 260824-tg3
slug: surf-black-onto-the-ink-and-on-accent-ro
date: 2026-08-24
type: quick
status: complete
---
# surf-black onto ink and on-accent

84 sites carried a name that stopped being true when dark mode arrived — `surf-black` holds
`#f2f4f7` in the blue ramp and `#00ff40` in the green one.

- **79 → `*-surf-ink`** — text, the order-form drafting rules, one hairline drawn as a filled div.
- **4 → `border-surf-on-accent`** — the edge around accent-filled pills and the Print button.

Those four were not cosmetic. A border drawn ON the accent fill must contrast with *that
fill*, and in the green ramp ink and accent are both `#00ff40`, so the edge had gone
invisible — losing the very thing it existed for. It now reads in every ramp.

Behaviour-preserving apart from those four edges reappearing.
