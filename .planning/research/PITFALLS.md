# Pitfalls Research

**Domain:** Adding touch-first mobile support and ported instructional/print features to an existing Next.js/React SVG-editor app (Shaper, milestone v1.2)
**Researched:** 2026-09-07
**Confidence:** HIGH — most findings are grounded in direct inspection of this codebase (`components/outline/outline-viewer.tsx`, `components/rocker/rocker-viewer.tsx`, `app/layout.tsx`, `components/ui/slider.tsx`, `components/design/measure-field.tsx`, `components/template/*`, `components/summary/use-print-fit.ts`, `reference/project/Rails.dc.html`) plus well-established, actively-maintained web-platform behavior (touch-action, Pointer Events, CSS dynamic viewport units, iOS input-zoom heuristics). A few items (exact current Safari version quirks) are MEDIUM — verify against the shaper's actual test device during execution.

## Starting-point reality check

Before the pitfalls: v1.2 is not starting from zero on touch. `outline-viewer.tsx` and `rocker-viewer.tsx` already drag via `onPointerDown`/`onPointerMove`/`onPointerUp`/`onPointerCancel`, already call `setPointerCapture`/`releasePointerCapture` (guarded by `hasPointerCapture`), and already carry a `touch-none` class plus a comment explaining why (`touch-action:none stops a touch drag scrolling the page instead of shaping the board`). This is good prior art — the fins viewer, by contrast, has zero pointer handlers (fin placement is slider/control-driven, not drag-driven), and the rails, volume and summary screens have zero responsive breakpoints at all. The pitfalls below are written against this specific starting point, not against a generic "add touch to an SVG app" checklist.

## Critical Pitfalls

### Pitfall 1: `touch-action: none` scoped to the hit circle, not the gesture surface

**What goes wrong:**
A drag starts fine because the finger landed on the transparent hit circle (`touch-none` is applied there), but a finger landing one pixel outside it — on the board fill, a construction line, or empty canvas space around the drawing — scrolls or rubber-bands the whole page instead of doing nothing (or starting a drag). On a phone, "aim slightly off the actual mark and scroll the page" reads as a broken app, not a missed tap.

**Why it happens:**
`touch-action: none` was added exactly where the drag handler lives (the hit circle), which is correct for *that* circle, but it doesn't establish a scroll-proof zone for the rest of the drawing. Nobody decided what a stray touch anywhere else on the SVG should do.

**How to avoid:**
Put `touch-action: none` (or `pan-x pan-y` as appropriate) on the outer SVG/container for every viewer that has drag targets, not only on the targets themselves, so a near-miss never falls through to the page's scroll gesture. Audit `outline-viewer.tsx` and `rocker-viewer.tsx` for this today — they may already be fine at the container level via a Tailwind class upstream, but this needs to be a checked fact, not an assumption, before any new draggable surface (the rails plan/side reference view, if it grows drag interactions later) copies the current per-target pattern.

**Warning signs:**
On a real phone (not just an emulator that never faithfully reproduces scroll-swallow behavior): drag started 2–3mm off a handle scrolls the page; pull-down at the top of the viewer triggers a pull-to-refresh browser gesture.

**Phase to address:**
Touch & Responsive Retrofit phase — as a verification item on every SVG viewer (outline, rocker, and whatever the rails plan/side view becomes), not just the two that already have partial protection.

---

### Pitfall 2: iOS long-press callout, text-selection magnifier, and double-tap zoom fire mid-drag

**What goes wrong:**
Holding a finger on an SVG element for iOS's callout threshold pops the "Copy/Look Up" bubble and a text-selection magnifier loupe over the drawing, hijacking the gesture the shaper meant as a drag start. Double-tapping near a control (a very plausible accidental input while trying to nudge a handle) zooms the whole page.

**Why it happens:**
`touch-action: none` stops scrolling and pinch-zoom, but it does **not** suppress iOS's text-selection callout or the `-webkit-touch-callout` long-press menu — those are governed by separate properties. `user-select` is likewise a separate axis from `touch-action`. A drag target with `touch-action: none` alone is still selectable and still eligible for the callout.

**How to avoid:**
Every draggable SVG element and the viewer container around it needs `-webkit-touch-callout: none` and `user-select: none` (`select-none` in this codebase's Tailwind vocabulary — already used on `slider.tsx`'s track/thumb, but not present on `outline-viewer.tsx`'s or `rocker-viewer.tsx`'s drag targets today) in addition to `touch-action: none`. Double-tap zoom is prevented by `touch-action: manipulation` (or `none`) being present on the *element actually receiving the tap*, so confirm it's not only on child hit circles but on any ancestor a fast double-tap could land on between them.

**Warning signs:**
Long-pressing a drag handle on an iPhone shows a magnifier loupe or a "Copy" bubble instead of starting a drag; double-tapping near (not on) a handle zooms the page.

**Phase to address:**
Touch & Responsive Retrofit phase — add `select-none -webkit-touch-callout:none` alongside every existing and new `touch-none` in the outline, rocker, and any rails/plan-view drag surfaces; verify on an actual iOS device, not just Chrome DevTools' touch emulation (DevTools does not reproduce the callout).

---

### Pitfall 3: Sticky `:hover` state after a tap (no mouse to leave)

**What goes wrong:**
A shaper taps a slider thumb or a `ViewerToolbarButton` on a touchscreen; the button's `hover:ring-3` or hover-only fill state applies and then never clears, because there is no `mouseleave` event on a touchscreen to remove it. The control looks permanently "focused/pressed" until the shaper taps something else that happens to trigger the same hover style, which then also gets stuck.

**Why it happens:**
Mobile Safari and Chrome-on-Android synthesize a single hover event on tap (for compatibility with hover-authored sites) but never fire the matching un-hover, since there was never a real pointer resting there. Any Tailwind `hover:` class is affected — this codebase leans on `hover:ring-3` (slider thumb) and hover-driven affordances throughout, all written for a mouse.

**How to avoid:**
Wrap hover-only visual states in `@media (hover: hover) and (pointer: fine)` (Tailwind's `hover:` utilities already compile to this on modern Tailwind v4 by default — confirm this project's Tailwind v4 config hasn't overridden that), so touch devices never enter a hover state they can't leave. Where a state needs to be visible on touch too (e.g., "this is draggable"), use `:active`/`data-pressed` instead of `:hover`.

**Warning signs:**
Tap a slider or toolbar button on a phone, then look away without touching it again — the ring/fill stays lit.

**Phase to address:**
Touch & Responsive Retrofit phase — sweep every `hover:` class touched by the phone-support pass (slider thumbs, `ViewerToolbarButton`, drag-target cursor styles) rather than trusting Tailwind's default media-query gating without checking it against this project's actual compiled CSS.

---

### Pitfall 4: Touch targets that were fine on desktop shrink further once the layout goes responsive

**What goes wrong:**
`outline-viewer.tsx` and `rocker-viewer.tsx` size their drag hit circles as `DRAG_HIT_PX * handleUnit`, where `handleUnit = 1 / fitScale` and `fitScale` is how much the SVG's `viewBox` is scaled to fit its container. `DRAG_HIT_PX` (currently `15`, a viewBox-unit radius) was tuned against the desktop two-column layout's viewer panel. Squeeze that same viewer into a phone-width column and `fitScale` goes up (more scale-down needed to fit), which shrinks `handleUnit` and therefore the on-screen hit radius — the exact opposite of what a thumb needs. The shadcn `Slider` thumb (`size-3` = 12px, with an `after:-inset-2` invisible hit-area extension bringing it to roughly 28px) has the same problem independent of any responsive change: 28px is already short of the ~44–48px touch-target guidance both Apple's HIG and Android's Material spec use.

**Why it happens:**
Hit-target sizing was chosen once, empirically, for a mouse pointer on a desktop-sized viewer, and expressed as a constant relative to viewBox space rather than a floor in physical (CSS px) space. Nothing recomputes or clamps it for a narrower container.

**How to avoid:**
Treat touch hit-target size as a CSS-pixel floor, not a viewBox constant: compute the minimum acceptable `DRAG_HIT_PX * handleUnit` at the narrowest supported phone width and bump the constant (or clamp `handleUnit`) so it never drops under ~44 CSS px there, even though that may look oversized on desktop with a mouse. For the shadcn `Slider`, either grow the thumb's own hit box on touch (a `@media (pointer: coarse)` variant, matching the font-size fix in Pitfall 8) or accept a wider visual thumb on phone.

**Warning signs:**
Resize the outline or rocker editor to a phone-width viewport and try to grab a handle with a simulated 40px-diameter touch contact (Chrome DevTools' touch simulator lets you check this) — if it frequently grabs the wrong handle or misses, the target is too small at that width.

**Phase to address:**
Touch & Responsive Retrofit phase — an explicit check ("hit targets measured at the narrowest supported width, not just eyeballed at full width") belongs in that phase's verification criteria, not left to "looks fine on my laptop."

---

### Pitfall 5: Replacing/duplicating pointer handlers regresses desktop drag while "adding" touch

**What goes wrong:**
Because `outline-viewer.tsx` and `rocker-viewer.tsx` already use Pointer Events (which unify mouse, touch and pen), the correct move for v1.2 is to **audit and extend** the existing handlers — not to bolt on parallel `onTouchStart`/`onTouchMove` handlers "for touch" alongside the existing pointer ones. Doing the latter causes double-handling: a touch now fires both the pointer path and the new touch path, and a subsequent compatibility mouse event synthesized by the browser can fire a third time, each potentially calling `updateOutline`/`onDrag` with a slightly different computed point — jittering the drag or, worse, both handlers racing to grab a different handle.

**Why it happens:**
It's an easy mistake for a task framed as "add touch support" to reach for touch-specific APIs (`ontouchstart`, `e.touches[0]`) as a mental default, without first checking that Pointer Events already cover touch, mouse and pen in one code path in this exact file.

**How to avoid:**
Grep for `onPointerDown`/`onPointerMove`/`onPointerUp` in every viewer before writing anything, and add new behavior (bigger hit targets, `touch-action`, `select-none`) to those existing handlers/elements rather than introducing a second event system. If a genuinely touch-only affordance is needed (e.g., a two-finger pan on the plan/side view), gate it on `event.pointerType === "touch"` inside the same pointer handlers, not a separate listener family.

**How to keep desktop drag provably intact:**
Since there is no Playwright suite yet (per `CLAUDE.md`: "Playwright remains prescribed but not yet installed"), desktop regression protection for this milestone has to come from (a) a deliberate manual pass with an actual mouse on every viewer after each touch-related change, exercising drag-start, drag-move across the full range, and drag-end/cancel, and (b) keeping the geometry math itself (`solveSideProfileDrag`, the outline drag solver) completely untouched — those are pure functions already covered by golden-fixture unit tests, so a touch change should only ever touch event wiring, never the solver call it feeds.

**Warning signs:**
A drag that used to feel smooth with a mouse now stutters, snaps, or occasionally drags the wrong handle after a touch-support change; `git diff` on a "touch support" commit shows edits inside `solveSideProfileDrag`/`updateOutline` call sites rather than only in event-handler/DOM code.

**Phase to address:**
Touch & Responsive Retrofit phase — call out "no `onTouchStart`/`onTouchMove`/`onTouchEnd` additions; extend the existing Pointer Event handlers" as an explicit plan constraint, and require a manual desktop-mouse pass as a check, not just a phone pass.

---

### Pitfall 6: `h-full`/`overflow-hidden` viewport-height chain breaks under iOS Safari's dynamic toolbar

**What goes wrong:**
`app/layout.tsx` deliberately clamps `html` and `body` to `h-full` (which resolves against the viewport) with `overflow-hidden`, specifically so that only inner panels scroll, never the whole page — the file's own comment explains this was chosen over `min-h-full` to prevent page-level scroll from swallowing panel-level scroll. On iOS Safari, the viewport height Tailwind's `h-full`/`vh`-based sizing resolves against is **the largest possible viewport** (toolbar hidden), not the currently visible one — so on load, with the address bar and tab bar showing, the bottom slice of every design screen (controls footer, VIEWER/DATA tab strip, save button) sits behind Safari's chrome and is clipped rather than scrollable, because the whole point of this layout was to make the *outer* box non-scrolling.

**Why it happens:**
`100vh`/`h-full` was a correct, deliberate choice for desktop browsers, where the viewport height is stable. iOS Safari's collapsing/expanding toolbar makes "the viewport height" a moving target that classic viewport units don't track.

**How to avoid:**
Switch the outer clamp in `app/layout.tsx` from `h-full` (in the sense that resolves off `100vh`) to `100dvh` (dynamic viewport height, supported in all major engines since 2023, including current iOS Safari) with a `100vh` fallback via `@supports`, per this app's principle of "one place owns the rule" rather than patching every screen individually. Since this is the single shared clamp every design screen inherits (`app/layout.tsx`'s own comment: "passes full-height flex sizing down to the design screens' own flex-1 panels"), fixing it once here is the correct scope — don't chase it screen-by-screen.

**Warning signs:**
On an actual iPhone (not desktop Safari's responsive mode, which doesn't reproduce the collapsing toolbar), the bottom of a design screen's sidebar or tab strip is cut off or unreachable when the address bar is showing, and only appears after scrolling triggers the toolbar to collapse.

**Phase to address:**
Touch & Responsive Retrofit phase, and specifically early in it — this is the shared root-layout clamp every other phone-layout fix sits on top of, so getting it wrong first means re-testing every screen twice.

---

### Pitfall 7: The fixed two-column shell "stacks" by hiding content, not reflowing it

**What goes wrong:**
Every design screen editor (`outline-editor.tsx`, `rail-band-editor.tsx`, `fin-placement-editor.tsx`) is `flex flex-nowrap` with a `basis-[340px]` sidebar and a `basis-[480px]` main panel — there is no `flex-wrap`, no `md:flex-col`, nothing that lets these stack today. The tempting quick fix under time pressure is `hidden md:flex` on the sidebar (or on the viewer) to make *something* fit on a phone, which "works" in the sense that the layout no longer overflows — but it silently removes the controls (or the drawing) rather than reflowing them below/above each other. `SiteNav`'s six nav links plus wordmark, settings, save and auth control are in the same position: a flex row with no wrap or overflow handling, so on a 375px-wide screen they will either overflow horizontally or need to be hidden behind a menu that doesn't exist yet.

**Why it happens:**
Building responsive layout from zero breakpoints under a milestone deadline creates strong pressure to reach for `hidden` as a one-line fix, because it's the fastest way to make a `git diff` look small and a screenshot look "not broken."

**How to avoid:**
For each editor, the stacking answer is a real reflow — sidebar controls above (or in a bottom sheet/tab below) the viewer, not a `hidden` sidebar — because every control the sidebar holds is required to shape the board; hiding it makes the screen decorative on a phone, not "touch-first." For `SiteNav`, this milestone's own requirement ("sign in, pick a preset, open a saved board... shape it across all five design screens... save it, read the summary" *on a phone*) is unreachable if the screen-switching nav links are hidden with no replacement — they need a genuine phone nav pattern (a menu, a bottom bar, a scrollable strip), not `hidden sm:flex`.
As a mechanical check: grep the diff of every "make it responsive" commit for `hidden` classes added without an adjacent `md:hidden`/replacement control appearing in the same file — a one-way `hidden` with no counterpart is the smell.

**Warning signs:**
A phone screenshot of a design screen "looks clean" but a control that exists on desktop (a slider, the construction-lines toggle, a nav link) is nowhere on the phone version and there's no way to reach it.

**Phase to address:**
Touch & Responsive Retrofit phase — make "every control reachable on a phone, not merely not-overflowing" an explicit UAT criterion per screen, since the milestone's stated goal ("Touch-first, not merely unbroken") is exactly the failure mode this pitfall describes.

---

### Pitfall 8: iOS Safari zooms the whole page when a shaper taps a measurement field

**What goes wrong:**
`components/design/measure-field.tsx` — the numeric input every slider row's typed-entry box uses across all five design screens — sets its input class to `text-sm` (14px in this project's Tailwind scale) unconditionally. iOS Safari auto-zooms the viewport on focus for any input whose *rendered* font size is under 16px (an Apple accessibility heuristic, not a bug to work around by disabling zoom). On a phone, tapping any dimension field zooms the whole page in, and the shaper has to manually pinch back out to keep working — on a screen already narrow, this is disruptive on every single numeric entry.

**Why it happens:**
`text-sm` was a reasonable choice for a compact desktop control (this codebase's shadcn `Input` base component, by contrast, is `text-base` — 16px — with a deliberate `md:text-sm` override that only shrinks it back down on wider ("desktop") viewports, i.e. shadcn already ships the correct pattern; `measure-field.tsx` doesn't follow it).

**How to avoid:**
Match the shadcn `Input` pattern already present in this repo: 16px (`text-base`) by default, shrunk to `text-sm` only at `md:` and above, or gate on `@media (pointer: coarse)` if the intent is "coarse pointer gets bigger text" rather than "narrow viewport gets bigger text" (a phone in landscape or an iPad can be "wide" while still being touch). Do this for every fixed-`text-sm`/`text-xs` numeric input the phone-support pass touches, not only `measure-field.tsx` — check the fin toe-aim table, order-form inputs, and any other typed-entry field.

**Warning signs:**
On an iPhone, tap any dimension/measurement input on any design screen — if the page visibly zooms in, the fix hasn't landed. This is trivially reproducible on real hardware or Safari's iOS Simulator (not Chrome DevTools, which doesn't model this behavior).

**Phase to address:**
Touch & Responsive Retrofit phase — treat this as a single, testable rule ("no numeric input renders under 16px effective font size") verified across all five design screens, since `measure-field.tsx` is shared by all of them and one fix likely closes most instances at once.

---

### Pitfall 9: Porting the prototype's `halveDeckMark1` flag as a name instead of a decision

**What goes wrong:**
The prototype (`reference/project/Rails.dc.html`) calls its rail-section calculator for the INSTRUCTIONS example with `halveDeckMark1: true` (line ~1359), but that same file's `computeSection` function (line ~704) does **not** destructure or use a `halveDeckMark1` parameter anywhere — it is a dead flag in the reference implementation itself. A faithful line-for-line port would either (a) silently carry the same dead flag into `lib/geometry/rail-bands.ts`, producing an INSTRUCTIONS example rail with the ordinary, un-halved `deckMark1`, which technically "matches the prototype's actual behavior" but not its evident *intent* (a flag named `halveDeckMark1` was clearly meant to do something to the diagram's spacing), or (b) implement literal halving without checking whether that's what the founder actually wants the instructional diagram to look like — since the prototype has never rendered the halved version, there is no existing visual to match it against.

**Why it happens:**
"Port the prototype into a real formula" reads as "transcribe what the code does," but here what the code does and what its own naming/intent suggests are two different things — a mismatch that's invisible unless someone actually traces the parameter through `computeSection`'s destructuring, which is easy to skip when skimming a ~1600-line single-file prototype.

**How to avoid:**
Treat this as a genuine design decision, not a transcription task: trace `halveDeckMark1` through the reference file (confirmed above: it currently does nothing), then decide with the founder what a `halveDeckMark1` variant of `deckMark1` should actually compute (most likely `deckMark1 / 2`, given the existing `deckMark2 = deckMark1 / 2` pattern in the same function, but confirm rather than assume) before adding it as a real, tested parameter to `computeRailSection`/`computeSection` in `lib/geometry/rail-bands.ts`. Per Rule 1, this is pure geometry math: new parameter, unit tests for both `true` and `false`, and a regenerated golden fixture via `scripts/extract-prototype-rails-golden.mjs` reading the *founder's confirmed* intended behavior — not a hand-guessed number typed into the fixture, and not silently reproducing the prototype's current no-op.

**Warning signs:**
A PR that adds `halveDeckMark1` to `rail-bands.ts` with no accompanying change to `RailBandSpec`'s test coverage for `halveDeckMark1: true` producing a visibly different `deckMark1` than `false`; a golden fixture value for the INSTRUCTIONS example that was typed by hand rather than emitted by the extraction script.

**Phase to address:**
Rails Screen Completion phase — flag this explicitly in that phase's plan as "confirm intended `halveDeckMark1` behavior with the founder before implementing" rather than treating it as a mechanical port.

---

### Pitfall 10: Hand-transcribing the INSTRUCTIONS example's expected numbers instead of regenerating the fixture

**What goes wrong:**
The INSTRUCTIONS tab's example rail is a new, previously-unported code path with no existing golden fixture. Under time pressure, it's tempting to eyeball the prototype's rendered output (or compute the numbers by hand from the formulas) and type the expected values straight into a new test, rather than running `scripts/extract-prototype-rails-golden.mjs` (or extending it) against the prototype's own functions with `halveDeckMark1` wired in. This is exactly the practice `CLAUDE.md`'s Rule 1 forbids: "Never hand-transcribe an expected number — regenerate the fixture."

**Why it happens:**
The extraction scripts are built to pull fixtures for the *existing* rail-band code paths; a brand-new variant (`halveDeckMark1`) isn't wired into `extract-prototype-rails-golden.mjs` yet, so producing a fixture for it requires touching the extraction script first — a step that's easy to skip if a hand-typed number "looks about right" and the test passes.

**How to avoid:**
Extend `scripts/extract-prototype-rails-golden.mjs` to also call the prototype's `computeSection` with the `howToRead`-style inputs (once `halveDeckMark1` is actually implemented per Pitfall 9) and emit its result into `prototype-rails-golden.json` (or a new fixture file alongside it), then write the new `lib/geometry/rail-bands.ts` test against that generated fixture, matching this project's existing pattern for every other geometry function.

**Warning signs:**
A new test file for the INSTRUCTIONS example rail with literal numeric expectations and no corresponding new entries in `lib/geometry/__fixtures__/prototype-rails-golden.json`, or `npm run golden` not touching any file when it's run after the INSTRUCTIONS work.

**Phase to address:**
Rails Screen Completion phase — this is a mechanical, checkable gate: run `npm run golden` as part of that phase's own verification and confirm the diff includes the new fixture values, not zero diff.

---

### Pitfall 11: Coordinate-system mismatch porting the plan/side reference SVGs and the moved background asset

**What goes wrong:**
The prototype's board-outline plan and side reference views are raw SVG `path` data baked against a specific `viewBox` (e.g. `viewBox="0 0 3.7135 10.4996"` for the plan, `viewBox="3.98 0.32 1.09 9.87"` for the side) that is tightly coupled to the accompanying `assets/rail-bands-plan-bg.png`'s own pixel dimensions and crop. The milestone context notes this background artwork moves from `reference/project/assets/rail-bands-plan-bg.png` into `public/`. If the move changes the image's dimensions (re-export, re-compression, or an accidental crop) without re-deriving the `viewBox`/path coordinates to match, the reference paths will silently drift off the background artwork — legend lines land in the wrong place relative to the board outline, off by an amount too subtle to notice at a glance but wrong enough to mislead a shaper about where a rail section actually sits.

**Why it happens:**
The prototype's SVG paths are pre-computed decorative overlay geometry (not derived live from `lib/geometry/` at path-string granularity), so nothing programmatically ties them to the PNG's exact pixel grid — the coupling is implicit, established once by eye when the prototype was built, and easy to break by treating the asset move as "just copy the file."

**How to avoid:**
Move the PNG byte-for-byte (same dimensions, same crop) rather than re-exporting it, and carry the prototype's exact `viewBox` values across unchanged. Verify visually, side-by-side, that the ported plan/side view's overlay lines land on the same features of the background art as the prototype's own rendering — not just that the component renders without errors.

**Warning signs:**
The plan/side reference view renders without console errors but a rail-section boundary line visibly doesn't align with the board outline drawn in the background image when compared against a screenshot of the prototype.

**Phase to address:**
Rails Screen Completion phase — a specific verification step: screenshot the prototype's plan/side view and the ported one at the same zoom and diff them visually.

---

### Pitfall 12: Two different print pipelines exist in this app — folding INSTRUCTIONS into "print" without picking one

**What goes wrong:**
This codebase already has two structurally different print paths: (1) the jsPDF-built, millimetre-precise PDF pipeline (`build-template-pdf.ts`, `build-overview-pdf.ts`, `build-strip-pdf.ts` — programmatic `doc.rect()`/`doc.text()` calls against an `mm`-unit `jsPDF` document, with dedicated snapshot tests for furniture placement like the scale-square), and (2) the Summary order form's native browser `@media print` DOM path (`order-form.css`, driven by `use-print-fit.ts`'s CSS-`zoom` fit-to-page hook). The prototype's own "Include Rail Band Instructions in Print" feature is neither of these — it builds a raw HTML string and prints it via a hidden `<iframe>` + `window.print()`, with its own ad hoc `zoom:0.74` CSS scale factor and `page-break-before` declarations that have meaning only inside *that* throwaway document. Naively porting "fold this into print" without first deciding which of this app's two existing pipelines the INSTRUCTIONS sheet joins — and then reusing the prototype's `zoom:0.74` number, or its `page-break-before` CSS, as if it means something in either pipeline — produces either a broken jsPDF call (jsPDF has no CSS, no `zoom`, no `page-break-before` — it's imperative drawing in mm) or a `@media print` page that scales wrong for no derivable reason.

**Why it happens:**
The prototype's print mechanism is self-contained and coherent *within its own single-file architecture*, but it was never built against either of this app's two production print pipelines, so its literal scale/page-break numbers are prototype-local constants with no cross-pipeline meaning.

**How to avoid:**
Decide explicitly, as a design step before implementation, which pipeline "Include Rail Band Instructions in Print" belongs to — most likely the Overview Sheet's jsPDF builder (`build-overview-pdf.ts`), given the milestone's framing of "everything a shaper prints" and that INSTRUCTIONS content (a diagram plus explanatory text) is closer to that sheet's one-page-of-everything model than to the order form's DOM-based layout. Whichever is chosen, express the instructions sheet's scale in the pipeline's own native units (mm for jsPDF, matching `PAGE_MARGIN_MM`/paper-size constants already in `use-print-fit.ts` and `build-*-pdf.ts`) rather than translating the prototype's `zoom:0.74` number, which was tuned for an entirely different rendering context and carries no correct value here.

**Warning signs:**
A PR that introduces a literal `0.74` (or any prototype-sourced CSS `zoom`/scale constant) into a `.ts` file under `components/template/`; new print code that imports both a `jsPDF` builder and CSS `@media print` rules for the same feature, suggesting the pipeline choice was never actually made.

**Phase to address:**
Rails Screen Completion phase — resolve the pipeline choice during planning/discussion, before any print code is written, since it determines which files the feature touches at all.

---

### Pitfall 13: Adding a new print sheet regresses the print output that already measures true

**What goes wrong:**
v1.1's Phase 7 proved every existing printed page byte-identical to the pre-milestone build and ruler-true 1:1 for the Full Sized Template. Folding a new optional INSTRUCTIONS sheet into whichever pipeline it joins (Pitfall 12) risks silently changing that guarantee if the new sheet's page is inserted *before* existing pages (shifting page numbers/ordering any downstream code or test asserts against), if it changes the measured content height `use-print-fit.ts` scales against (if it lands in the order-form's DOM path), or if it nudges shared furniture-placement constants (`PAGE_MARGIN_MM`, the 2in scale-check square's position) while being implemented.

**Why it happens:**
Print code in this app is already tuned to sub-millimetre precision with dedicated regression tests (`build-template-pdf.test.ts`'s "page-0 furniture never overlaps" suite, `build-strip-pdf.test.ts`'s scale-square/name-block placement checks) — any shared constant or shared measurement hook touched "just to plumb the new sheet through" can move a rectangle by a fraction of a millimetre that a human reviewer won't see on a rendered preview but that an existing snapshot test would catch, if run.

**How to avoid:**
Make the INSTRUCTIONS sheet strictly additive: its own new page(s), added in a way that never renumbers, resizes, or reflows existing pages when the "Include Rail Band Instructions in Print" toggle is off (the default should almost certainly be off, mirroring the prototype's `printIncludeInstructions: true` default being a red flag to check rather than copy — confirm with the founder whether v1.2 wants it on or off by default). Before merging, regenerate every Imperial fixture/PDF from the pre-v1.2 commit and diff byte-for-byte against the post-v1.2 output **with the new toggle left off** — repeating exactly the verification method that closed out Phase 7 — plus a second pass with the toggle on, verified against a ruler for anything claiming 1:1 scale.

**Warning signs:**
`npm test` passes but nobody re-ran the byte-identical PDF diff from Phase 7's verification method; the scale-square's rect coordinates in `build-template-pdf.test.ts` or `build-strip-pdf.test.ts` change in a diff that also touches unrelated instructions-sheet code.

**Phase to address:**
Rails Screen Completion phase — carry forward Phase 7's exact verification method ("every Imperial PDF from the pre-milestone commit, byte-identical") as this phase's own regression gate for the toggle-off case.

---

### Pitfall 14: The on-screen "1:1 actual size" claim is a CSS convention, not a physical guarantee — and the codebase already knows this

**What goes wrong:**
"View Full Sized" claims a rail cross-section renders at true 1:1 scale on screen, to be held against foam. CSS defines `1in = 96px` (and `1mm`, `1cm` etc. derived from that) as a fixed, device-independent *reference pixel* convention — browsers are not required to make that correspond to an actual physical inch on the display it's rendered on, and in practice it doesn't reliably: it depends on the screen's real pixel density and on any OS-level display scaling, both of which the browser reports incompletely (`window.devicePixelRatio` reflects device pixel density relative to CSS pixels, but does **not** reveal a display's physical PPI, and does **not** change when a user pinch-zooms or uses the browser's own zoom control — meaning a shaper who has zoomed their browser to 125% for readability gets a "1:1" rail cross-section that is actually 25% oversized, with no signal anywhere that this happened).

**Why it happens:**
It's an extremely common, reasonable-looking assumption that "1 CSS inch on screen ≈ 1 real inch," because on a large fraction of standard desktop monitors it happens to be close. It breaks down hardest on phones (where "standard screen" density assumptions vary far more, and where OS text-size/zoom accessibility settings are commonly non-default) — exactly the surface this milestone is adding the modal to.

**How to avoid:**
The milestone context is explicit that v1.2 accepts the prototype's own approach — a standard-screen assumption, no calibration step — so the right prevention here is not "add calibration" (out of scope by decision) but "be honest and consistent about the assumption": (1) express the modal's SVG dimensions using the same fixed CSS-absolute-unit convention the prototype used (`width="Xin" height="Yin"` or an equivalent 96px/inch constant), matching the same mental model `use-print-fit.ts` already documents in this codebase ("CSS px per inch, measured rather than assumed — a zoomed or high-DPI context is not 96" — note that hook actually *measures* a live 1-inch probe element rather than hardcoding 96, which is the more defensible technique and worth reusing here rather than a bare 96 constant); (2) never let this modal's SVG take the "scale to fill its container" treatment every *other* viewer in this app deliberately uses (`preserveAspectRatio`, `viewBox`-driven auto-fit) — that pattern is correct for interactive editors and actively wrong for a view whose entire purpose is a fixed physical size; and (3) word the UI honestly (something like "sized for a standard screen — your actual screen or browser zoom may vary slightly"), rather than presenting an unqualified "actual size."

**Warning signs:**
The modal's SVG is given `width="100%"` or wrapped in a responsive/auto-fit container instead of a fixed physical dimension; browser zoom changes the rendered size of the modal's cross-section (it should, honestly, since that's the real limitation — but the UI should say so rather than imply otherwise); no on-screen disclaimer exists at all.

**Phase to address:**
Rails Screen Completion phase — reuse `use-print-fit.ts`'s "measure a live probe element, don't hardcode 96" technique for the modal's scale constant, and require the honesty-disclaimer copy as part of that phase's UAT, not as a follow-up polish item.

---

### Pitfall 15: Touch-first rework drops keyboard and screen-reader access that already worked

**What goes wrong:**
Reworking controls for touch tends to optimize for "big enough to tap" and quietly lose "reachable by Tab" or "announced correctly" along the way — e.g., the plan/side reference view's legend checkboxes could be reimplemented as large touch-friendly chips that are `div`s with `onClick`/`onPointerDown` instead of real `<input type="checkbox">`/`<button>` elements, losing native keyboard activation, focus rings, and checked-state announcement; or a drag-only interaction (nudging an outline/rocker handle) gains no keyboard equivalent even though the mouse-era version was already keyboard-inaccessible and this was the natural moment to fix it, not just port the gap forward onto touch too.

**Why it happens:**
Touch and keyboard/screen-reader access are easy to conflate as "the same non-mouse input problem," but they're orthogonal — a control can be touch-friendly and keyboard-invisible at the same time, and testing on a phone (the milestone's explicit acceptance method) will never surface a keyboard/screen-reader regression.

**How to avoid:**
Keep real interactive elements (`<button>`, `<input>`) under any new touch-sized visual chrome rather than reimplementing them as styled `div`s with pointer handlers — Base UI (this project's component foundation) already gives accessible primitives for checkboxes/toggles; use them instead of hand-rolled touch chips. For drag-only handles that remain mouse/touch-only after this milestone, that's an accepted pre-existing gap (don't scope-creep it into v1.2), but don't let *new* v1.2 controls (legend checkboxes, the INSTRUCTIONS Flat/Domed toggle, "View Full Sized" trigger) introduce a *fresh* keyboard/screen-reader gap where none existed before.

**Warning signs:**
Tab through a design screen after the phone-support pass lands — any new control from this milestone that a mouse/touch user can operate but Tab skips over, or that a screen reader announces as an unlabeled `div`, is a regression introduced by this work, not a carried-forward gap.

**Phase to address:**
Touch & Responsive Retrofit phase and Rails Screen Completion phase both — each new interactive element either phase introduces needs a keyboard-and-labeling check alongside its touch check, not after.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|-----------------|------------------|
| `hidden md:flex` on a sidebar/nav to "fix" phone overflow | Layout stops overflowing today, fast | Controls become unreachable on a phone; contradicts the milestone's own "touch-first, not merely unbroken" goal | Never for this milestone — acceptable only as a *temporary* dev-time scaffold immediately replaced by a real reflow before the phase's UAT |
| Copying the prototype's `zoom:0.74`/CSS-print constants into the new print path | Saves re-deriving a scale value | Produces a wrong or meaningless scale in either of this app's actual print pipelines (Pitfall 12) | Never — always re-derive in the target pipeline's own units |
| Adding `onTouchStart` handlers alongside existing `onPointerDown` handlers | Feels like "explicitly handling touch" | Double-fires drag logic, regresses desktop pointer/mouse behavior (Pitfall 5) | Never in this codebase — Pointer Events already unify the input types |
| Disabling pinch-zoom (`user-scalable=no`/`maximum-scale=1`) to stop iOS input-zoom | One-line fix, no font-size auditing needed | Removes a core accessibility affordance for low-vision users app-wide, for every screen, to fix a problem that's local to a handful of undersized inputs | Never — fix the font-size instead (Pitfall 8) |
| Hand-typing the INSTRUCTIONS example's expected numbers into a new test | Faster than wiring up the extraction script | Violates Rule 1 directly; a wrong hand-derived number ships as "verified" | Never — this project's own constitution forbids it |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|-----------------|-------------------|
| jsPDF (`build-overview-pdf.ts`, `build-template-pdf.ts`) | Treating it like a DOM/CSS renderer (reaching for `zoom`, `page-break-before`, `%`-based sizing) | Everything is imperative mm-unit drawing calls (`doc.rect`, `doc.text`); express any new content that way |
| Base UI `Dialog`/`SliderPrimitive` (`components/ui/*`) | Reimplementing touch-sized variants as custom markup instead of using the primitive's own props/data-attributes | Extend the existing shadcn/Base UI wrapper components (size variants, `data-*` styling) rather than forking new touch-only components |
| Pointer Events (native browser API, not a package) | Assuming `touch-action`/`user-select`/`-webkit-touch-callout` are redundant with each other | They are three independent CSS properties governing three independent iOS behaviors (scroll/zoom gesture, text selection, long-press callout) — set all three where needed |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|-----------------|
| Re-rendering the full SVG viewer tree on every `pointermove` during a phone drag | Visible jank/frame drops on lower-powered phone GPUs, worse than the same drag felt on a desktop | Confirm drag updates still flow through the same uncached, props-driven redraw path already used for mouse (per `rocker-viewer.tsx`'s own comment: "nothing here is cached across renders") and that nothing new memoizes incorrectly mid-drag | Noticeable on mid-range Android devices well before it's noticeable on any desktop or recent iPhone |
| Loading the moved `rail-bands-plan-bg.png` at full desktop resolution on a phone viewport that displays it much smaller | Slower first paint of the rails plan/side view on cellular connections | Serve it via Next's `<Image>` with responsive sizing now that it lives in `public/`, rather than a bare `<img>` at native resolution | Matters once the image is reasonably large and the plan/side view is on the initial-load critical path for the rails screen |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| None specific to this milestone beyond the app's existing surface | Touch/responsive/print work here is presentation-layer only — no new data paths, auth changes, or server actions are implied by the milestone description | Confirm this remains true during planning; if the INSTRUCTIONS/print work ends up needing any new persisted preference (e.g., a per-shaper default for the print toggle), route it through the existing units-preference precedent (account column + per-browser fallback) rather than inventing a new storage pattern |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-------------------|
| "1:1" claimed without any caveat | A shaper cuts foam to a screen measurement that's quietly off by their browser zoom level or screen density | Honest, visible caveat text plus the measured-probe scale technique (Pitfall 14) |
| Nav links/controls hidden with no phone equivalent | Shaper can't reach a screen or control they could reach on desktop | Real reflow/menu, never a bare `hidden` (Pitfall 7) |
| Hover-only "this is draggable" affordance | Touch users get no visual hint a point is grabbable until they've already started dragging it | Pair hover affordances with a persistent touch-visible cue (the existing ring/dot drag-target styling in `outline-viewer.tsx` is mostly already visible without hover — verify the rocker/rails equivalents are too) |

## "Looks Done But Isn't" Checklist

- [ ] **Touch drag on outline/rocker viewers:** Often missing `select-none`/`-webkit-touch-callout:none` alongside the existing `touch-none` — verify a real iPhone long-press doesn't pop the text-selection callout over a drag handle.
- [ ] **Phone layout for each design screen:** Often "passes" only because a control was hidden — verify every desktop-reachable control (including nav links) has a phone-reachable equivalent, not zero equivalent.
- [ ] **INSTRUCTIONS print toggle:** Often wired into a print path that renders but hasn't been re-verified against Phase 7's byte-identical/ruler-true guarantee for the toggle-off case — verify by regenerating and diffing PDFs with the toggle off before considering this done.
- [ ] **`halveDeckMark1` geometry:** Often "ported" as a literal no-op copy of the prototype's own dead parameter — verify a unit test actually asserts `deckMark1` differs between `halveDeckMark1: true` and `false`, backed by a regenerated (not hand-typed) fixture.
- [ ] **"View Full Sized" on-screen modal:** Often built with a responsive/auto-fit SVG (matching every other viewer's pattern in this app) — verify the SVG uses a fixed physical-unit dimension instead, and that a disclaimer about screen/zoom variance is visible in the UI.
- [ ] **Input font sizes on phone:** Often "fixed" only in the one field someone happened to test — verify every numeric input across all five design screens (not just `measure-field.tsx`) renders at ≥16px effective size on a touch device.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|----------------|------------------|
| Nav/controls hidden instead of reflowed | LOW–MEDIUM | Revert the `hidden` classes, design an actual phone nav pattern (menu/bottom bar), re-verify every screen is reachable |
| `zoom:0.74`-style prototype constant leaked into jsPDF code | LOW | Delete the constant, re-derive the instructions sheet's scale in mm against the chosen pipeline's own paper-size math |
| `halveDeckMark1` shipped as a silent no-op | MEDIUM | Confirm intended behavior with the founder, implement it as a real parameter, regenerate the fixture, add the differential unit test, re-run `npm run golden` |
| Byte-identical print guarantee broken by the new sheet | MEDIUM–HIGH (touches trusted, ruler-verified output) | Bisect which shared constant/measurement moved, restore it, re-run the full pre/post PDF diff from Phase 7's method before re-attempting the new feature |
| Keyboard/screen-reader access lost on a new touch control | LOW | Swap the custom `div`+pointer-handler markup for the equivalent Base UI primitive; re-check Tab order and screen-reader labels |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|-------------------|----------------|
| 1–8, 15 (touch gesture handling, desktop regression, viewport/layout/input-zoom, accessibility) | Touch & Responsive Retrofit phase | Manual pass on a real iPhone and a real Android phone (not only DevTools emulation) plus a manual desktop-mouse pass on every viewer touched; Tab-order/screen-reader spot check on every new control |
| 9–14 (INSTRUCTIONS geometry variant, prototype porting fidelity, print-pipeline choice, print regression, on-screen 1:1 honesty) | Rails Screen Completion phase | `npm test` + `npm run golden` diff showing new fixture entries (not zero diff); byte-identical PDF re-diff from Phase 7's method with the new print toggle off; visual side-by-side of the ported plan/side view against the prototype |

## Sources

- Direct inspection: `components/outline/outline-viewer.tsx`, `components/rocker/rocker-viewer.tsx`, `components/fins/fin-viewer.tsx`, `components/ui/slider.tsx`, `components/ui/input.tsx`, `components/design/measure-field.tsx`, `app/layout.tsx`, `components/site-nav.tsx`, `components/summary/use-print-fit.ts`, `components/template/build-overview-pdf.ts`, `components/template/build-template-pdf.ts`, `components/template/build-strip-pdf.ts`, `lib/geometry/rail-bands.ts`, `reference/project/Rails.dc.html` (this repo, read 2026-09-07)
- `/Users/kontoes/Code/shaper/CLAUDE.md` and `/Users/kontoes/Code/shaper/.planning/PROJECT.md` (project constraints, Rule 1, Phase 7 verification precedent)
- [Bram.us — The Large, Small, and Dynamic Viewports](https://www.bram.us/2021/07/08/the-large-small-and-dynamic-viewports/) — `dvh`/`svh`/`lvh` semantics and browser support
- [CSS-Tricks — 16px or Larger Text Prevents iOS Form Zoom](https://css-tricks.com/16px-or-larger-text-prevents-ios-form-zoom/) — iOS input auto-zoom threshold
- [Defensive CSS — Input zoom on iOS Safari](https://defensivecss.dev/tip/input-zoom-safari/) — practical fix patterns including `@media (pointer: coarse)`
- MDN Web Docs — `touch-action`, `user-select`, `-webkit-touch-callout`, Pointer Events, `devicePixelRatio` (general web-platform reference, not independently re-fetched this session but consistent with current spec/behavior)

---
*Pitfalls research for: touch-first mobile support and prototype-ported print/instructional features, Shaper v1.2*
*Researched: 2026-09-07*
