---
id: 260825-rqm
slug: order-form-shade-hardcoded-white
date: 2026-08-25
type: quick
status: complete
---
# The order form's shade mixed into a hardcoded white

Spotted on the Summary screen in Phosphor: near-white blocks behind the logo and the vertical
spine, in a palette whose lightest token is `#a6ffa6`. Nothing that light exists in Phosphor,
so it could not be a token.

It was `--order-form-shade` in `app/design/summary/order-form.css`:

```css
color-mix(in srgb, var(--color-surf-accent) 7%, white)   /* the literal is the bug */
```

At 7% over white that gives **`#f0f9f0` on Phosphor** and **`#f0f5f8` on Slate** — both dark
themes were wrong; Phosphor is just where it showed. Now mixes into `--color-surf-panel`, the
sheet's own surface.

| | before | after |
|---|---|---|
| Daylight | `#f7fbfa` | `#f7fbfa` — identical |
| Chalk | `#edfdff` | `#edfdff` — identical |
| Slate | `#f0f5f8` | **`#1b232d`** |
| Phosphor | `#f0f9f0` | **`#081308`** |

Light themes are byte-identical because their `panel` *is* white. The comment's contrast claim
survives: `ink-muted` on the new shade measures 5.10–6.62 across the four, clear of 4.5:1.

## Fourth hiding place for the same class of bug

A colour literal that cannot follow a theme has now turned up in four kinds of place:

1. a `color-mix` in `globals.css` (`--outline-board-fill`) — caught during theming
2. class-based borders (`border-surf-muted/N`) — caught by the border migration
3. inline `style={{ }}` objects (outline-controls chips) — caught last task
4. **a route-scoped stylesheet** (`order-form.css`) — this one

Each sweep was scoped to where the previous bug lived, so each missed the next. This time
every `.css` in the repo was swept: the only literals left are inside `@media print`, where
the paper genuinely is white.

## Verified

build ✓ · tsc ✓ · 670 tests ✓. Phosphor summary re-scanned: zero backgrounds above 0.55
luminance, down from seven. Daylight visually unchanged.
