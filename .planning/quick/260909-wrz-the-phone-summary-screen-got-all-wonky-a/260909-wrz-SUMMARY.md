---
quick_id: 260909-wrz
status: complete
completed: 2026-09-10
plan: 260909-wrz-PLAN.md
---

# Quick task 260909-wrz — The phone Summary preview stands up again, and its plots print with normal tick numbers

## What a shaper sees now

On a phone, the Summary shows each page of the order form the right way up, shrunk as one piece to
the width of the screen, one under the other, with the Print button below them — instead of a tiny
upside-down thumbnail at the top of an empty screen. The three rail plots on page 1 carry axis
numbers the same size a computer draws them, on screen and on paper, instead of numbers two and a
half times too big. Nothing changes on a computer.

## What was wrong — two faults, both from the phone preview (260909-i7r)

1. **Safari computes `tan(atan2())` wrongly with a container unit.** The preview's scale was written
   as `min(1, tan(atan2(100cqw, var(--order-form-design-width))))`, the CSS idiom for dividing one
   length by another. Measured on this Mac's own Safari 26.5.2 with a probe page: the angle
   `atan2(100cqw, 880px)` comes out right (21.237937deg), but `tan()` of it comes out as -0.937614 —
   tan(21.24 *radians*), the degree figure fed to `tan()` as radians. The same sum in pixels only is
   right (0.388636), and so is the container-unit form on Playwright's newer WebKit build (26.6),
   which is why every emulated phone run passed. A negative scale is a half turn plus a shrink, and
   the scaler's `width`/`height` calc() went negative and clamped to zero, which is why the rest of
   the screen was empty. On the founder's phone (402 dots wide, so a 354-dot page) the same
   arithmetic gives about -0.07: the sheet one-fourteenth its width, upside down — the screenshot.

2. **The plots' numbers were sized from the shrunken picture.** `useSvgFitScale` measured each svg
   with `getBoundingClientRect()`, which reports the box after every ancestor transform. Under the
   preview's `scale(0.39)` a plot measured 0.39 of its laid-out width, so its axis numbers were drawn
   2.6 times too large in the drawing's own units — "normal" on the shrunken picture, huge in the
   drawing, and huge on paper, because a phone's print snapshot is taken from that state.

## What changed

- `app/design/summary/order-form.css`: the scale is `min(1, calc(100cqw / var(--order-form-design-width)))`
  — CSS typed arithmetic (Safari 18.2+, Chrome 140+), measured right on Safari 26.5.2, WebKit 26.6
  and Chromium 153. The comment records the Safari finding.
- `components/summary/use-preview-scale.ts` (new): a measured backstop for engines that cannot yet
  divide lengths (Firefox, older Chromium forks). A ResizeObserver on the page wrapper writes the
  same `min(1, width / design width)` inline on the scaler; the design width is read from the
  stylesheet's own variable, never carried as a second 880. `order-form.tsx` wires the two refs.
- `components/viewer/callout-primitives.tsx`: `useSvgFitScale` and `useSvgClientSize` measure the
  svg's laid-out box (`clientWidth`/`clientHeight`, then the observer's content box) — reported
  before any transform on every engine (probed 400 laid-out vs 160 painted under `scale(0.4)` on
  Safari 26.5.2, WebKit 26.6, Chromium 153). Every pinned callout on every screen benefits the same
  way; on the design screens, where nothing is transformed, the numbers are identical.
- `components/rails/rail-section-plot.tsx`: `data-rail-section-plot` on the svg, a handle for the
  browser test.

## Tests

- `components/summary/order-form-preview.test.ts`: the scale is the typed division; no `atan2(`
  anywhere in the stylesheet; the order form wires the backstop and the backstop reads the
  stylesheet's two properties and carries no 880 of its own.
- `components/summary/use-preview-scale.test.ts`: the pure `previewScale()` rule, and that it is the
  stylesheet's expression.
- `e2e/summary-preview.spec.ts`: on both phones and the desktop, the inline backstop equals
  `min(1, content width / 880)` and each rail plot's first tick number is 11px laid out. Red before
  the callout-primitives change (28.3px on the iPhone, 26.6px on the Pixel; the desktop already
  passed), green after.

## Measured

- Real Safari 26.5.2, 342px container: `tan(atan2(100cqw, 880px))` = -0.937614 (wrong);
  `tan(atan2(342px, 880px))` = 0.388636; `atan2(100cqw, 880px)` = 21.237937deg;
  `calc(100cqw / 880px)` = 0.388636; `@supports (opacity: calc(1px / 1px))` true; an svg 400px wide
  under `scale(0.4)`: `clientWidth` 400, `getBoundingClientRect().width` 160, ResizeObserver content
  box 400.
- Production build in Chromium 153, the Summary framed at 390 and 402 dots wide: transform
  `matrix(0.388636 …)` / `matrix(0.402273 …)`, inline backstop 0.38864 / 0.40227, first sheet 342 /
  354 wide at left 24, scaler 913.7 / 945.8 tall for two sheets, no sideways scroll, every tick
  number 11.00px laid out.
- The Safari fault itself cannot be reproduced by the browser suite (Playwright's WebKit is newer and
  already right), so the stylesheet contract test is its guard. A framed check on the Mac's Safari
  was attempted but Safari left the frames blank (Clerk's dev cookies for localhost), so the Safari
  proof is the primitive-level probe above plus WebKit 26.6 and Chromium at app level.

## Proof

`npx tsc --noEmit` clean; `npx vitest run` 2406 passed / 2 skipped; `npm run lint` 0 errors (12
pre-existing warnings, none in touched files); `npm run build` clean; `PW_PORT=3100 npx playwright
test` 169 passed, 0 failed, five desktop baselines unchanged.

## Human verification deferred

- On the iPhone: Summary shows two upright pages fitted to the screen; Print Order Form → the plots'
  axis numbers are small, as on a computer's print.
