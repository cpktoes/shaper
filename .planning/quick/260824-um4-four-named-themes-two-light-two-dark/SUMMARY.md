---
id: 260824-um4
slug: four-named-themes-two-light-two-dark
date: 2026-08-24
type: quick
status: complete
---
# Four themes — two light, two dark

Generalised from a light/dark binary to a **registry**. `THEMES` in `lib/theme.ts` is the one
list; the settings menu, the provider and the pre-hydration script all read it. A fifth theme
is an entry there plus its ramp and `:root.theme-<id>` block — no other file changes.

| | mode | |
|---|---|---|
| **Daylight** | light | blue on white — *default light*, unchanged |
| **Chalk** | light | black on white, cyan accent |
| **Slate** | dark | chalk on matte black |
| **Phosphor** | dark | green terminal — *default dark*, unchanged |

**The two new themes are not placeholders.** Chalk is the original published palette and Slate
is the blue dark ramp — both already contrast-verified earlier in this project. Reviving them
means all four are real, tuned palettes from day one. Chalk needed one fix: its line was
2.78:1 on its own well against a 3:1 bar, now `#8d8d8d` at 3.04:1.

Audit: Chalk, Slate and Phosphor pass 27/27. Daylight shows its two documented latent well
pairings, unchanged.

## The selectors got simpler, not harder

Four themes removed the need for `:not()` guards entirely — specificity and source order do
the whole job:

```
:root                 (0,1,0)  default light
@media dark  :root    (0,1,0)  later in source, wins under a dark OS
:root.theme-<id>      (0,2,0)  explicit, always wins
```

So `:root.light` and `:root:not(.light)` are gone. An explicit choice also sets a bare
`light`/`dark` class carrying **no tokens** — it exists so Tailwind's `dark:` variant fires
for *either* dark theme without knowing their names.

All four blocks are **generated from one definition**, not hand-edited, after the near-miss
in 260824-pdg where a substring anchor gave one block its assignments twice and another none.

Old stored values migrate: `light` and `dark` map to the default of each mode, so a choice
made under the two-theme version survives.

## Two bugs found while building

1. **A wrapper `<div>` grouping rows by mode left them inert.** Base UI registers menu items
   by walking the RadioGroup's children, so an intervening DOM node breaks click *and*
   keyboard while the rows still render. Fragments instead. Same family as the earlier
   `Menu.GroupLabel` context error — Base UI cares about child structure.
2. **The System row named the theme on screen, not the one System resolves to.** With Chalk
   picked it read "Chalk right now", claiming the OS had chosen it. The provider now exposes
   `systemTheme` alongside `resolved`.

## Bench

Two-way toggle replaced by a four-chip picker showing each theme's mode and which are the
system defaults. Export now emits **all four** ramps and blocks in one paste, plus the two
default ids for `lib/theme.ts`. Tests: 27, including a drift guard that runs the real
pre-hydration script against every registered theme.

One audit row was **demoted from FAIL to ADVISORY**: `ink on accent` is 1:1 in Phosphor, but
the app takes `--surf-on-accent` there, so it is not a failure. A red row for something the
app does not do teaches you to ignore red.
