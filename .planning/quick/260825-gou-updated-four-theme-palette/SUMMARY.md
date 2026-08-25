---
id: 260825-gou
slug: updated-four-theme-palette
date: 2026-08-25
type: quick
status: complete
---
# Updated four-theme palette

Applied the founder's bench export. **All four themes now clear every pairing in the
contract** — 0 under bar, so the WELL CAVEAT block is deleted rather than reworded.

## Daylight — warm paper, sage accent

Chrome stays white but canvas and wells carry a warm grey (`#dfdcd3`), making it the first
theme to actually *use* the region tokens rather than setting them all to the ground.

It also **resolves the two latent pairings** carried as a caveat since the palette landed:

| | before | after |
|---|---|---|
| accent-ink on well | `#2b799c`/`#d8d7cd` **3.36:1** | `#48605c`/`#dfdcd3` **4.94:1** |
| warning-ink on well | `#c93f10`/`#d8d7cd` **3.46:1** | `#ac3811`/`#dfdcd3` **4.60:1** |

## Phosphor — deeper, fully monochrome

Near-black chrome (`#050805`) with the canvas as the one lifted surface (`#142414`), and the
greens muted from the previous `#00ff40`.

**A real trade, named in the CSS:** every role including the warning is now a green, so
*nothing signals by hue*. A warning reads by being the brightest green (`#a6ffa6`, 16.75:1)
rather than a different colour. Deliberate for the aesthetic, but Phosphor cannot express
"different in kind", only "louder".

## Default dark: Phosphor → Slate

Slate is the conventional dark and the only one keeping a separate warning hue, which makes
it the safer thing to hand someone who never opens the menu. Phosphor stays one click away.

## The default now has a test

That default lives in **two files that must agree** — `DEFAULT_DARK_THEME` in `lib/theme.ts`
and whichever ramp the `prefers-color-scheme` block assigns — and the CSS is what paints
first, so a mismatch shows one theme while the menu claims another. New tests read
`globals.css` and assert: both defaults match, every registered theme has a ramp *and* a
block, and no block exists for an unregistered id. 669 tests total.

Writing that test caught its own bug: anchoring on `@media (prefers-color-scheme: dark)`
matched the **first** occurrence, which is inside `@custom-variant dark` near the top of the
file, and walked forward into the wrong block. Anchored on the generated `DEFAULT DARK`
comment instead.

## Bench

Re-synced — the coupling documented in `.planning/sketches/themes/README.md`, exercised for
the first time. Verified all 4 themes × 16 tokens + fill match `globals.css`, and republished
to the same URL.
