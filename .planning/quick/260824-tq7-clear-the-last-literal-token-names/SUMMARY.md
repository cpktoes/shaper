---
id: 260824-tq7
slug: clear-the-last-literal-token-names
date: 2026-08-24
type: quick
status: complete
---
# Retire the literal token names

The final 45 sites, and then the alias block itself.

| old | new |
|---|---|
| `surf-base` | `surf-ground` |
| `surf-accent-cyan` | `surf-accent` |
| `surf-accent-cyan-ink` | `surf-accent-ink` |
| `surf-accent-orange` | `surf-warning` |
| `surf-accent-orange-ink` | `surf-warning-ink` |

54 occurrences across `.tsx` and `.css`, replaced in **one longest-first alternation**.
Sequential passes would have rewritten `surf-accent-cyan` inside `surf-accent-cyan-ink` and
produced `surf-accent-ink-ink`.

## Deleting the alias block stopped being optional

The rename hit the alias block's own declarations, so `--color-surf-base` became
`--color-surf-ground` and so on — **duplicating five entries the semantic bridge already
declared**. Identical values, so no behaviour change, but one token declared twice is exactly
what drifts later. Verified no consumer remained — `var()` or utility class, across
tsx/ts/css/mjs, excluding node_modules/.next/reference — then removed it.

## End state

The bridge is **17 tokens, each declared once**, and every one confirmed to resolve in both
themes by reading them back out of the live document. A name that lies about the value it
holds can no longer be reached at all.

The comments explaining *why* the old names were dangerous are deliberately kept. That
reasoning — `surf-black` holding `#00ff40`, drawing 1:1 on its own fill — is the reason the
naming rule exists, and deleting it would leave the rule looking arbitrary.

## Where the whole cleanup landed

Literal names **291 → 0**. Semantic **59 → ~330**. No `oklch` in globals.css outside a
comment. All colour in the app resolves from the two ramps.
