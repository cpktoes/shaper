---
quick_id: 260909-wrz
type: quick
executed_inline: true
---

# Quick task 260909-wrz — the phone Summary preview stands up again, and its plots print with normal tick numbers

**Founder's report (with an iPhone screenshot):** "the phone summary screen got all wonky and prints
plot tick marks huge." The screenshot shows the order form as a thumbnail about 66 screen dots wide,
drawn upside down, cut off at the top of an otherwise empty screen.

## Cause — two separate faults, both introduced by the phone preview (260909-i7r)

**1. Safari evaluates `tan(atan2())` wrongly when a container unit is involved.** The preview's
scale was `min(1, tan(atan2(100cqw, var(--order-form-design-width))))` — the CSS idiom for dividing
one length by another. Measured on this Mac's own Safari 26.5.2 with a probe page (a 342px-wide
container, the design width 880px): `atan2(100cqw, 880px)` itself comes out right (21.237937deg),
but `tan()` of it comes out as **-0.937614** — which is tan(21.24 *radians*), the angle's degree
figure fed to `tan()` as radians. `tan(atan2(342px, 880px))`, the same sum in pixels only, comes out
right (0.388636), and so does `tan(atan2(...))` in Playwright's newer WebKit build (26.6) — which is
why every emulated phone run passed and only real phones and Macs broke. A negative scale is a
180-degree turn plus a shrink, and the `width`/`height` calc() on the scaler goes negative and
clamps to zero, which is why nothing reserves any space below the thumbnail: exactly the screenshot.
On the founder's phone (a 402-dot-wide iPhone, page content 354 dots) the same arithmetic gives
about -0.07: a thumbnail one-fourteenth the design width, upside down.

**2. The rail plots' tick numbers are sized from a measurement the preview's shrink corrupts.**
`useSvgFitScale` in `components/viewer/callout-primitives.tsx` sizes every pinned callout and the
rail plots' axis numbers from `getBoundingClientRect()`, which reports the box *after* every ancestor
transform. Under the preview's `transform: scale(0.39)` the plot measures 0.39 times its laid-out
size, so the numbers are drawn 2.6 times too big in the drawing's own units — "normal" on the shrunken
screen picture, huge in the drawing. A phone's print snapshot is taken from that state, so the
numbers print huge too. (The desktop preview is at scale 1, so a computer never saw it.)

## Fix

- `app/design/summary/order-form.css`: the scale is `min(1, calc(100cqw / var(--order-form-design-width)))`
  — CSS typed arithmetic, a plain division of two lengths into a number. Measured right on Safari 26.5.2
  (0.388636), Playwright WebKit 26.6 and Chromium 153; supported since Safari 18.2 and Chrome 140.
- `components/summary/use-preview-scale.ts` (new): a measured backstop for engines that cannot yet
  divide lengths (Firefox, older Chromium forks): a ResizeObserver on the page wrapper writes the same
  `min(1, width / design width)` onto the scaler as an inline custom property. Where the stylesheet
  already computes it, the two agree; where it cannot, the inline number takes over on hydration.
  `components/summary/order-form.tsx` wires the two refs.
- `components/viewer/callout-primitives.tsx`: `useSvgFitScale` and `useSvgClientSize` measure the
  svg's laid-out box — `clientWidth`/`clientHeight` at mount, the ResizeObserver entry's content box
  after — which every engine reports before any ancestor transform (probed: 400 laid-out vs 160
  painted under `scale(0.4)` on Safari 26.5.2, WebKit 26.6 and Chromium 153).
- `components/rails/rail-section-plot.tsx`: `data-rail-section-plot` on the svg so a browser test can
  find the plots.

## Tests

- `components/summary/order-form-preview.test.ts`: the scale expression is the typed division and no
  `atan2(` survives anywhere in the stylesheet; the order form wires the measured backstop.
- `components/summary/use-preview-scale.test.ts`: the pure `previewScale()` rule.
- `e2e/summary-preview.spec.ts`: on both phones and the desktop, each rail plot's first tick number,
  in laid-out screen pixels, is the pinned 11px — red before the callout-primitives change (28px on
  a phone), green after.

The Safari fault itself cannot be reproduced by the browser suite (Playwright's WebKit is already
fixed); it is pinned by the stylesheet contract test and was verified by hand on Safari 26.5.2.

Executed inline by the orchestrator: the diagnosis needed a real Safari, which no agent has.
