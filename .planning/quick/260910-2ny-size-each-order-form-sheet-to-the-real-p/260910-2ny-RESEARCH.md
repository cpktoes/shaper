# Quick task 260910-2ny — Size each order form sheet to the real printable page box

**Researched:** 2026-09-10
**Domain:** CSS paged media — what resolves to "the printable page area" across Blink / WebKit / Gecko
**Confidence:** HIGH on desktop engines, **LOW on iOS Safari** (the failing case) — see the gate below

---

## User Constraints (locked, from the task brief)

### Locked decision
> **Size each sheet to whatever page it lands on.** Stop naming an inch figure at all — each sheet should be
> exactly one printable page tall and wide, whatever margins, header and footer the browser or printer imposes.

Rejected alternatives, not to be re-opened: (a) shrinking every sheet to the 9.10in worst case, (b) a phone-only
smaller box.

**Accepted condition:** if page-relative sizing is not reliable across the browsers this app serves, fall back to
(a) or (b) and say why.

### Non-negotiable, from `use-print-fit.ts`'s own head comment
The sheet must keep a **definite** height. The bands are `fr`: given a definite height they divide it; left to
size themselves they go content-proportional and inflate. Any recommendation must replace *where the definite
number comes from*, never remove definiteness.

### Project constraints (CLAUDE.md)
- Print/paper measurements are the documented exception to the `lib/geometry/units.ts` rule — `use-print-fit.ts`
  and `order-form.css`'s `@media print` block are each explicitly allowed their own inch/mm constants because
  they size paper, not surfboards. A change here does not touch Rule 2.
- Do not start `next dev`. Verification is `npm test` plus the founder's own printer.

---

## Finding 1 — The measurement already tells us iOS inserted **zero** page breaks

Not a new claim, a deduction from the founder's measured PDF, and it changes what the fix has to achieve.

- 3 sheets → 4 pages, and the drawing-coordinate y-shift between pages 1→2 and 2→3 is a **constant** 655.3pt.
- A constant pitch is what a single continuous rendering sliced at page height looks like. Real CSS
  fragmentation honouring `break-after: page` on a sheet 1.134 pages tall would have produced 6 pages
  (each sheet spilling onto a second page, then forced to start a fresh one), not 4.
- 3 × 1.134 = 3.40 pages → rounds up to exactly the 4 pages observed. ✅ The arithmetic closes.

**Consequence:** on iOS Safari, `break-after: page` and `break-inside: avoid` are doing nothing at all. The only
lever that produces "one sheet per page" there is **the sheet height being exactly the slice pitch** — not merely
*less than* it. `[VERIFIED: derived from the founder's measured PDF figures in the task brief]`

This also explains why 86% is "a little under" the 88% the height implies, and predicts a visible artefact the
founder may not have noticed: at 86% each sheet is 0.975 of a pitch, so sheet 2 begins 2.5% of a page *above*
page 2's top — a ~6mm sliver of sheet 2's top border should be printing at the foot of page 1. Worth asking him.

**This kills `FIT_SAFETY` as a proportional shave.** A 0.5% shave is harmless on an engine that fragments
(desktop) and *cumulative* on an engine that slices (iOS): by sheet 3 the drift is ~1.5% of a page ≈ 3.5mm of
sheet 3 printed on page 2. Whatever replaces the height must shave an **absolute** amount (≤1px) or nothing.

---

## Finding 2 — Viewport units in print: the spec says page area, and all three desktop engines ship it

**Spec:** "The viewport-percentage lengths are relative to the size of the initial containing block—which is
itself based on the size of either the viewport (for continuous media) or **the page area (for paged media)**."
`[CITED: https://www.w3.org/TR/css-values-4/#viewport-relative-lengths]`

**Shipping behaviour**, from the CSSWG issue where the three engines' implementers compared notes
`[CITED: https://github.com/w3c/csswg-drafts/issues/5437]`:

| Engine | What `100vh` resolves to when printing | Confidence |
|---|---|---|
| **Blink** (Chrome/Edge) | page box **minus margins, accounting for `@page` rules** | HIGH |
| **WebKit** (Safari) | page box **minus margins** — but at the time of that issue "doesn't seem to support `@page { margin }` or `@page { size }`", so the margins are the print dialog's | HIGH for desktop |
| **Gecko** (Firefox) | page size minus **default** page margins, since **Firefox 81** — bug 1414600, RESOLVED FIXED: "Make media queries and viewport units in print be evaluated against the default page size minus margins" `[CITED: https://bugzilla.mozilla.org/show_bug.cgi?id=1414600]` | HIGH that it's page-relative, MEDIUM on whether `@page { margin }` is honoured |

Caveats worth carrying into the plan:

- **Firefox uses *default* margins, not the `@page` margin.** With Gecko's 0.5in default on Letter,
  `100vh` = 10.00in against an actual `@page: 8mm` area of 10.37in — the sheet comes out **0.37in shorter than
  the page**. That is the safe direction (fits, one sheet per page, ~3.5% smaller print). It is not exact.
- **Firefox bug 1622017** ("vh & vw units are too large, and depend on DPI, in printed documents") is still
  marked NEW/unassigned, last touched ~5 years ago
  `[CITED: https://bugzilla.mozilla.org/show_bug.cgi?id=1622017]`. It was filed in March 2020, *before* the
  Firefox 81 fix landed in September 2020, and is most likely stale rather than live — but nobody closed it.
  **Needs a real Firefox print-preview check** before shipping. `[ASSUMED: that 1414600 superseded it]`
- **`@page` in Safari is very new: 18.2** (Dec 2024), including the margin descriptors
  `[VERIFIED: mdn/browser-compat-data css/at-rules/page.json — safari "version_added": "18.2",
  impl_url https://webkit.org/b/15548]`. iOS is recorded as `"mirror"` of desktop, i.e. **inferred, not
  measured** — and a comment on that same WebKit bug from April 2025 reports `@page` "appears broken in
  iOS 18.3.2 / iPadOS 18.3" while working in macOS Safari 18.2. The founder's own PDF is the harder evidence:
  his `@page { margin: 8mm }` was ignored.

---

## Finding 3 — Percentage heights cannot do this job here

`html, body { height: 100% }` + `sheet { height: 100% }` would in principle resolve to the page area (same ICB).
It is the wrong tool for three independent reasons, any one of which is fatal:

1. **It contradicts a load-bearing rule.** `order-form.css`'s print block forces
   `html, body { height: auto !important; overflow: visible !important }` because `app/layout.tsx` clamps both to
   the viewport with `overflow: hidden` for on-screen panel scrolling; without the release the sheet clips to one
   screen's worth of content. `height: auto` breaks the percentage chain — the sheet's `height: 100%` computes to
   `auto`, which is exactly the `fr`-inflation failure mode `use-print-fit.ts` documents. **One has to give.**
2. **`vh` needs no chain at all.** It reads the ICB directly, so it delivers the same number without touching
   `html`/`body`. That alone settles the choice.
3. **Three sheets, one body.** A body whose used height is one page cannot honestly parent three page-tall
   children; the whole arrangement depends on overflow behaviour nobody should rely on across engines.

**Verdict:** percentage height is not a candidate. `[VERIFIED: app/design/summary/order-form.css:435-440]` —
verbatim: `html,\n  body {\n    height: auto !important;\n    overflow: visible !important;\n    background: #fff !important;\n  }`

---

## Finding 4 — There is no way to *read* the page box, and the JS hook is not a fallback

- **No CSS or JS exposes the printable area.** The CSSWG has an open issue proposing to add it —
  "The size of these unprintable areas are available to applications (such as browsers) in most OSes, but
  currently **it's not web-exposed**", proposing a future `env(unprintable-area-width)`. Opened Dec 2024, still
  open. `[CITED: https://github.com/w3c/csswg-drafts/issues/11395]`
- **`@page` margin boxes** (`@top-center` etc.) are Chrome-131-only; `false` in both Safari and Firefox
  `[VERIFIED: mdn/browser-compat-data css/at-rules/page.json — every margin-box key reads
  chrome:"131" safari:false firefox:false]`. They cannot size content in any case.
- **`break-inside: avoid` is advisory when the box is too big.** css-break-3: "If the above doesn't provide
  enough break points to keep content from overflowing the fragmentainer, then rule 3 is dropped… if there are
  no possible break points below the top of the fragmentainer, and not all the content fits, the UA may break
  anywhere in order to avoid losing content." `[CITED: https://www.w3.org/TR/css-break-3/#break-within]`
  So today's `break-inside: avoid` was never going to save an oversized sheet on *any* engine.
- **`beforeprint` on iOS:** MDN's compat data records it as `"mirror"` of desktop Safari 13 — i.e. **assumed,
  not measured** `[VERIFIED: mdn/browser-compat-data api/Window.json — beforeprint_event safari_ios: "mirror"]`.
  The brief states it does not fire on iOS; I could not confirm that from a primary source either way, so treat
  it as `[ASSUMED]` and settle it with the probe below. It matters less than it looks: since G-08-10 the
  stylesheet is already the source of truth and the hook is belt-and-braces.
- **`zoom` in print** is supported everywhere that matters — Chrome 1, Safari 3.1, **Safari iOS 3**, Firefox
  **126** (with SVG scaling bugs before 131) `[VERIFIED: mdn/browser-compat-data css/properties/zoom.json]`.
  But it is only reachable from `beforeprint`, so it cannot be the mechanism — only the existing guard. Note in
  passing that the guard is a no-op on Firefox < 126.

---

## Finding 5 — What page-relative sizing costs on desktop (it is small, and mostly upward)

Today: width `7.6401in`, height `10.3182in` (both = min(Letter, A4) − 16mm, height × 0.995).

| Paper | `100vw` @ 8mm | vs today | `100vh` @ 8mm | vs today |
|---|---|---|---|---|
| US Letter | 7.8701in | **+3.0%** | 10.3701in | **+0.5%** |
| A4 | 7.6401in | 0.0% | 11.0601in | **+7.2%** |

Nothing shrinks on desktop, which is what the founder cares about. The A4 sheet grows 7% taller — a real design
change (the `fr` bands each get 7% more room on A4 than on Letter, so the same board prints slightly differently
on the two papers). That is inherent to "size each sheet to whatever page it lands on" and should be stated to
him rather than engineered around.

**Second consumer that must be updated:** `components/rocker/rocker-view-frame.ts` hard-codes
`ORDER_FORM_ROCKER_BOX_PX = { width: 451.5, height: 88.6 }`, derived in its head comment from exactly these two
numbers ("printable page width min(8.5in Letter, 8.27in A4) − 2 × 8mm @page margin = 7.640in = 733.4px…",
"printable page height 10.370in × 0.995 FIT_SAFETY = 990.5px"). That constant backs the rocker readings' 9pt type
floor (`compactValuePrintPx(layout) >= 11.9`). `[VERIFIED: components/rocker/rocker-view-frame.ts:802-827]`

It does **not** need new arithmetic, but it does need a new sentence: with a page-relative sheet the box becomes
*a share of whatever page the sheet lands on*, and 451.5 × 88.6 is the **narrowest desktop case** (A4 width,
Letter height) — every desktop page is that wide or wider, so the 9pt floor holds on desktop. On a page area
narrower than 7.640in (iOS) the whole sheet scales down together, type included — which is precisely what the
founder's manual 86% already does today, so it is not a new regression.

---

## Finding 6 — The rails "View Full Sized" dialog has the same iOS exposure, and worse consequences

Out of scope for this task; flagged as instructed, not fixed.

`components/rails/view-full-sized-dialog.tsx` injects `"@page { size: landscape; margin: 8mm; }"` verbatim
`[VERIFIED: components/rails/view-full-sized-dialog.tsx:161-166 — line 163]`. It does **not** size anything to a fixed page
box — it prints an **actual-size** rail template and relies on the browser not scaling it.

On iOS Safari all three of its assumptions fail: `@page { size: landscape }` is ignored (a developer-forum thread
titled "Print from iPhone device renders only in portrait mode" is exactly this), `@page { margin }` is ignored,
and iOS scales the rendering. **An "Actual Size" rail printed from an iPhone is almost certainly not actual
size** — a shaper cutting foam to it would cut it wrong. That is a more dangerous bug than the page count this
task fixes, and it deserves its own quick task. It has a printed 2in scale-check square in it, which is exactly
the artefact needed to prove or disprove this on the founder's phone in one page.

---

## The one artefact that settles iOS — spec it into the plan

Everything above leaves exactly one unknown: **does WebKit-on-iOS resolve `100vh` / `100vw` against the real
slice pitch?** No documentation answers it. One printed page from the founder's iPhone answers all of it.

Serve a static probe (e.g. `public/__print-probe.html`, opened on the phone from the deployed site or over the
LAN from the dev server already running on 3005 — **do not start a new one**) containing, print-visible:

1. **A `vh` ruler:** ten stacked bands, each `height: 10vh`, labelled `10vh #1` … `#10`, alternating shading.
   *If `100vh` is the page area, band #10 ends exactly at the bottom of printed page 1 and #1 of the second
   ruler starts page 2.* Where the page boundary actually falls, read off the labels, gives the ratio directly.
2. **An absolute ruler beside it:** ten bands of `height: 1in`, labelled. The two rulers together give
   `1vh` in inches *as printed*, i.e. both the pitch and the print scale.
3. **A `vw` bar:** a `width: 100vw` bar with tick labels at 10% intervals, plus a `width: 7.6401in` bar beneath
   it. Whether the second overhangs, and by how much, measures the real printable width and confirms or refutes
   the width half of the founder's 86%.
4. **A break test:** two `div`s of `height: 100vh; break-after: page` reading "SHEET A" / "SHEET B". If they land
   on their own pages, iOS honours the combination and the fix is exactly right.
5. **Two JS-written flags:** a `<span>` set on `DOMContentLoaded` to `JS: yes`, and a second set inside a
   `beforeprint` listener to `BEFOREPRINT: fired`. Whichever appears on paper settles the `beforeprint` question.
6. **A 2in scale-check square** with a `50.8 mm` caption, matching the existing convention.

Ask for the printed **PDF**, not a photo — the drawing-coordinate offsets are the measurement.

---

## Contract test — the new invariant (question 5)

`components/summary/order-form-print.test.ts`'s fourth case ("the stylesheet's printed sheet box and the print
handler's own box describe the same piece of paper") pins two sources of truth to each other by regex. If the
height stops being an inch figure that test cannot survive as written — and the right move is not to weaken it
but to **make the drift impossible instead of merely detected**:

| Old case | New invariant |
|---|---|
| height `calc()` figures match `PORTRAIT_PAPER_IN` + `FIT_SAFETY` | **The printed sheet's height and width are page-relative and carry no paper figure at all**: the `height` value matches `/100vh/` and the `width` value matches `/100vw/`, and **neither contains any `in` or `mm` literal**. Fails loudly the moment anyone re-introduces a guessed inch. |
| — (new) | **Any shave is absolute, not proportional**: if the height expression subtracts anything, it is in `px` and ≤ 2px, and it carries no `* <fraction>` multiplier. This is the Finding-1 lesson, encoded — a proportional shave accumulates into a printed sliver on an engine that slices instead of fragmenting. |
| — (new) | **The root and the sheet stay in lockstep**: `[data-order-form-root]`'s print `width` and `[data-order-form-sheet]`'s print `width` are the *same* expression. The root is the `@container` every `cqw` font size resolves against, so a drift between them silently changes the printed type size. |
| "both files describe the same paper" | **Only one file decides**: assert `use-print-fit.ts` writes no `style.height` on a sheet. Single-sourcing beats mirroring — there is nothing left to drift. |
| `@page` margin ↔ `PAGE_MARGIN_MM` mirror | **Keep**, but only if the hook keeps `PAGE_MARGIN_MM`. If the hook loses its paper constants, delete this case rather than leave it asserting a tautology. Keep `@page { margin: 8mm }` itself: on Blink and Safari 18.2+ it *defines* the page area that `100vh` then reads. |
| "fitted sheet + wrapper padding fits the shortest printable height" | **Rewrite as the padding rule only** — `[data-order-form-page]` still declares `padding: 0 !important` in print. With a page-relative sheet there is no slack left at all (the sheet *is* the page), so the padding reset goes from "important" to "load-bearing", and the test should say so. |

---

## Pitfalls to carry into the plan

1. **Do not keep `FIT_SAFETY`'s 0.995 on a `100vh` height.** See Finding 1 — proportional shaves accumulate on
   iOS. If a shave is wanted, `calc(100vh - 1px)`. Better still: exact `100vh` plus making the existing
   `overflow: hidden` on sheets **unconditional in print** rather than gated on `[data-order-form-root][data-printing]`,
   so it holds on a phone where the hook never runs.
2. **The `zoom` overflow guard silently stops matching reality.** It compares `scrollHeight` against a height the
   hook computed. If CSS now owns the height, the hook's number is a *different* number. Either drop the guard
   in favour of `overflow: hidden`, or keep the old arithmetic explicitly labelled "conservative estimate for
   the overflow guard only, not the printed size".
3. **A very short page area compresses the `fr` bands further.** Definiteness is preserved (that is the
   non-negotiable), but on a genuinely small page area the bands divide less. This is the same compression the
   founder's manual 86% already produces, so it is not new — but it is now automatic and silent, which is worth
   one sentence in the comment.
4. **A4 desktop prints get 7% taller.** State it; do not hide it.
5. **`100vw` and the `@container`.** The root carries the printed width for `cqw` type sizing. If the sheet
   becomes `100vw` and the root does not, every font size on the sheet is computed against the wrong container.
   They must change together — hence the new lockstep test.

---

## RECOMMENDATION

**(a) Take the page-relative mechanism. It is `100vh` / `100vw`, gated on one iPhone probe.**

In `order-form.css`'s `@media print` block, replace both `calc(min(…in, …in) − 16mm)` expressions on
`[data-order-form-sheet]` — and the matching `width` on `[data-order-form-root]` — with `100vw` and `100vh`
(at most `calc(100vh - 1px)`), keep `@page { margin: 8mm }`, make `overflow: hidden` on sheets unconditional in
print, and stop `use-print-fit.ts` writing a height at all.

**Why this and not a fallback:**
- The spec says viewport units resolve against the page area in paged media, and **all three engines ship
  page-relative** — Blink accounting for `@page`, WebKit against page-minus-margins, Gecko since Firefox 81.
- On desktop nothing shrinks: Letter is +0.5% tall / +3.0% wide, A4 +7.2% tall. The founder's stated objection
  to fallback (a) — "my prints get 12% smaller" — does not apply.
- On iOS it is the *only* mechanism that can work at all, because Finding 1 shows iOS honours no page breaks:
  the sheet height must equal the slice pitch **exactly**, and only a page-relative unit can be exact without
  the app guessing Apple's margins, header and footer.

**What it costs:** A4 desktop sheets get 7% taller (a visible design change, worth telling him);
`ORDER_FORM_ROCKER_BOX_PX`'s head comment must be re-scoped to "narrowest desktop page area"; `FIT_SAFETY`'s
proportional shave must go; and the two contract tests must be rewritten around single-sourcing rather than
mirroring.

**The gate — and the honest caveat.** I could not verify from any source what iOS Safari resolves `100vh`
against in its print path; MDN's iOS entries for `@page` and `beforeprint` are `"mirror"` values, which are
*inferred* from desktop, not measured, and a WebKit bug comment already reports `@page` behaving differently on
iOS 18.3 than macOS 18.2. **Ship the probe page in Finding 6's spec, get one printed PDF from the founder's
iPhone, and read bands #1–#10 off it before touching `order-form.css`.**

If the probe shows iOS resolving `100vh` against the screen viewport rather than the page, page-relative sizing
is not reliable on the one browser that needs it, and the fallback is **(b), a phone-only box** — not (a).
Reason: (a) shrinks the founder's own desktop prints ~12% to fix a phone, which he rejected and which Finding 5
shows is unnecessary since desktop is already correct; whereas (b) at least confines the compromise to the
device that is broken. His objection to (b) — "the same board prints at two different sizes" — is already true
today, since he prints from the phone at 86% by hand.
