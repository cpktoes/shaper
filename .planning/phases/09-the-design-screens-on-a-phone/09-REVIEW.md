---
phase: 09-the-design-screens-on-a-phone
reviewed: 2026-09-09T10:05:31Z
depth: standard
files_reviewed: 49
files_reviewed_list:
  - .gitignore
  - CLAUDE.md
  - app/design/layout.tsx
  - app/globals.css
  - app/layout.tsx
  - components/design/design-screen-shell.tsx
  - components/design/fine-adjust-group.tsx
  - components/design/measure-field.tsx
  - components/design/phone-menu.tsx
  - components/design/phone-tab-bar.tsx
  - components/design/phone-top-bar.tsx
  - components/design/use-viewer-media.ts
  - components/fins/fin-controls.tsx
  - components/fins/fin-placement-editor.tsx
  - components/outline/outline-controls.tsx
  - components/outline/outline-editor.tsx
  - components/outline/outline-viewer.tsx
  - components/rails/rail-band-editor.tsx
  - components/rails/rail-controls.tsx
  - components/rails/rail-data-table.tsx
  - components/rails/rail-instructions.tsx
  - components/rails/view-full-sized-dialog.test.ts
  - components/rails/view-full-sized-dialog.tsx
  - components/rocker/rocker-controls.tsx
  - components/rocker/rocker-datasheet.tsx
  - components/rocker/rocker-editor.tsx
  - components/rocker/rocker-viewer.tsx
  - components/settings-menu.tsx
  - components/site-nav.tsx
  - components/ui/button.tsx
  - components/ui/input.tsx
  - components/ui/slider.tsx
  - components/viewer/drag-pick-wiring.test.ts
  - components/viewer/drag-readout-chip.test.ts
  - components/viewer/drag-spacing.test.ts
  - components/volume/volume-controls.tsx
  - components/volume/volume-estimator.tsx
  - e2e/desktop-baseline.spec.ts
  - e2e/desktop-regression.spec.ts
  - e2e/phone-layout.spec.ts
  - e2e/phone-rails.spec.ts
  - e2e/phone-screens.spec.ts
  - e2e/touch-drag.spec.ts
  - e2e/touch-sizing.spec.ts
  - lib/geometry/outline-drag.test.ts
  - lib/geometry/outline-drag.ts
  - lib/geometry/rocker-drag.test.ts
  - lib/geometry/rocker-drag.ts
  - package.json
  - playwright.config.ts
findings:
  critical: 1
  warning: 3
  info: 1
  total: 5
status: issues_found
---

# Phase 9: Code Review Report

**Reviewed:** 2026-09-09T10:05:31Z
**Depth:** standard
**Files Reviewed:** 49
**Status:** issues_found

## Summary

I read every file in the required-reading list in full and cross-checked the phase's own claims
(D-05/D-11 "the phase's only two removed controls," the touch-sizing test's own stated scope,
`DesignScreenShell`'s doc comments about which element is "the actual scrolling box") against
what the code and `git diff 47f4ae9..HEAD` actually show. `npx tsc --noEmit` and `npx eslint` are
clean on the touched files, and the geometry-layer drag math (`outline-drag.ts`/`rocker-drag.ts`)
is symmetric, well-tested, and unit-clean (mm in, mm out, no bare `25.4`).

The one real defect is in `DesignScreenShell`'s reuse of an existing desktop-only affordance
("Wide view") without any phone-width gating: on TEMPLATE and ROCKER, a shaper on a phone can tap
a toolbar button that removes the entire stacked control column — the phone's only way to reach
every slider — for no corresponding benefit (the pinned drawing area's height cap is unaffected).
No e2e test in this phase's own new suite exercises the interaction. Beyond that, a couple of
this phase's own contracts (a test-only DOM hook, and the "every control grows for touch" sweep)
have gaps that are worth fixing but don't misbehave for a shaper today.

## Critical Issues

### CR-01: "Wide view" on TEMPLATE/ROCKER strips every phone control with no phone-side gating or benefit

**File:** `components/design/design-screen-shell.tsx:91-120`, `components/outline/outline-editor.tsx:188-196`, `components/rocker/rocker-editor.tsx:250-258`

**Issue:** `DesignScreenShell`'s `wideView` prop removes `<aside>` from the tree entirely
(`{!wideView && (<aside>...)}`, `design-screen-shell.tsx:103`) so `main` can take the sidebar's
width on desktop. On a phone, `<aside>` isn't "a sidebar beside the canvas" — per this phase's own
design, it's the *entire* stacked control column (every slider, section header, and the Settings
checkbox), rendered below the pinned drawing. The toolbar button that toggles `wideView`
(`ViewerToolbarButton` at `outline-editor.tsx:188-196` and `rocker-editor.tsx:250-258`, slot 3/2
respectively) carries no `max-shell:hidden` guard, unlike the Rotate button right next to it,
which the same files correctly hide below the shell breakpoint (`outline-editor.tsx:171`,
`rocker-editor.tsx:238`) with the explicit comment "the rotate button's one job on a phone is done
by turning the phone... one of the phase's only two removed controls." Wide view was not counted
among those two removed controls, and it was never re-audited against the new stacked shell.

The result: a shaper on an iPhone/Android who taps "Hide the sidebar for a wider view" loses every
control on TEMPLATE or ROCKER — with zero benefit, because `main`'s phone height is still capped
by `phonePinned` (`PHONE_PINNED_MAX_HEIGHT_CLASS[phonePinned]`, `design-screen-shell.tsx:95-99`)
regardless of whether `<aside>` exists; "wide view" only ever changed *width*, and the phone shell
is already full width. What remains on screen is the pinned drawing plus a block of empty
canvas-coloured space down to the bottom tab bar, with no visible cue that the same small icon
button (still on screen, inside the drawing) is what caused it and is the only way back. No test
in `e2e/phone-layout.spec.ts`, `e2e/phone-screens.spec.ts`, or `e2e/touch-sizing.spec.ts` exercises
this control on a phone project, so nothing in this phase's own new suite catches the regression.

**Fix:** Gate the wide-view toggle the same way Rotate is gated, or make `DesignScreenShell`
ignore `wideView` below the shell breakpoint:
```tsx
// outline-editor.tsx / rocker-editor.tsx
<ViewerToolbarButton
  onClick={handleToggleWideView}
  pressed={wideView}
  label={wideView ? "Show the sidebar" : "Hide the sidebar for a wider view"}
  title={wideView ? "Show the sidebar" : "Wide view"}
  slot={3}
  className="max-shell:hidden"
>
```
or, more robustly, have `design-screen-shell.tsx` never drop `<aside>` on a phone regardless of
the `wideView` prop (`{!(wideView && !isPhone) && (<aside>...)}`), since there is no phone-side
concept of "widening the canvas" — width is already full — to preserve. Add an
`e2e/phone-layout.spec.ts` (or `phone-screens.spec.ts`) case asserting the controls region stays
reachable after the wide-view toggle is pressed on the `iphone`/`android` projects.

## Warnings

### WR-01: `data-design-controls-scroll` is placed on an element that doesn't actually scroll on a phone for its one real consumer

**File:** `components/design/design-screen-shell.tsx:77-87, 108`

**Issue:** The doc comment on this attribute says it is "placed on whichever element is the actual
scrolling box: the aside itself in `simpleSidebar` mode (VOLUME has no inner scroll div)." VOLUME
is the only caller that ever sets `simpleSidebar` (`components/volume/volume-estimator.tsx:61-62`),
and it always pairs it with `phonePinned="none"`. In that combination, the `<aside>` phone class
list ends in `max-shell:overflow-visible` (line 80) — it deliberately does *not* scroll on a
phone — while the root row instead gets `max-shell:overflow-y-auto` (`nonePinned` branch of
`rootClassName`, line 74) so the *whole shell* becomes VOLUME's one phone scroller. So on a phone,
`[data-design-controls-scroll]` sits on an element that never scrolls; the element that does scroll
(the shell's root `<div>`) carries no identifying attribute at all. `e2e/phone-screens.spec.ts`'s
own VOLUME test already works around this — it locates the scroller via
`card.locator("xpath=..")` instead of the hook `design-screen-shell.tsx` itself advertises as the
canonical Playwright locator for exactly this purpose, which is a symptom that this was already a
known trap. A future test (or the fixer for this finding) that trusts the doc comment and queries
`[data-design-controls-scroll]` on VOLUME's phone layout will get the wrong element. As a
consequence the `simpleSidebar && !nonePinned` half of the ternary at lines 79-82 is also
currently unreachable code — no caller exercises it.

**Fix:** Either move the phone-scroll attribute onto the shell root when `nonePinned` is true
(so the hook always names the element that is actually scrolling), e.g.:
```tsx
<div
  className={rootClassName}
  data-print-hide={printHide ? true : undefined}
  data-design-controls-scroll={simpleSidebar && nonePinned ? true : undefined}
>
```
and drop it from the `<aside>` in that branch, or update the comment to state plainly that
`simpleSidebar` + `phonePinned="none"` is scrolled by the root, not the aside, and have
`phone-screens.spec.ts` keep using its own locator on purpose (in which case simplify
`asideClassName`'s dead `simpleSidebar && !nonePinned` branch away, or add a caller that actually
uses it).

### WR-02: Hand-rolled selection-grid buttons on TEMPLATE and FINS never received the phase's touch-sizing treatment

**File:** `components/outline/outline-controls.tsx:320-357`, `components/fins/fin-controls.tsx:96-125, 407-424, 430-451, 453-469, 471-497, 510-526`

**Issue:** Every other interactive control this phase touched — `Button`, `Input`, `Slider`
(`components/ui/*`), the Fine-adjust disclosure, checkbox label rows — carries a `coarse:` variant
that grows it to at least 44px for a touch pointer (verified in `e2e/touch-sizing.spec.ts`, whose
own comment at line 50-57 explicitly scopes that file's assertions to shadcn `Button` instances via
`[data-slot="button"].h-8, [data-slot="button"].size-8`). The tail-shape selector grid on TEMPLATE
(`outline-controls.tsx:320-357`) and every pill/icon selector on FINS — `PillButton`
(`fin-controls.tsx:96-125`), the tail-shape grid (`407-424`), the Fin Setup grid (`430-451`), the
Thruster Model row (`453-469`), the Quad Model grid (`471-497`), and the Twin Template row
(`510-526`) — are all plain hand-rolled `<button>` elements with fixed padding (`px-0.5 py-1.5`,
`px-1 py-2.5`, `px-0.5 py-2`) and no `coarse:` sizing rule of any kind, and none of them carry the
`data-slot="button"` marker the touch-sizing suite filters on. These are exactly the kind of
primary tap targets PHON-03 exists to protect (a shaper picking a tail shape or a fin setup with a
thumb), yet they were left out of both the sizing sweep and its test coverage, so a
below-44px target here would ship silently.

**Fix:** Add a `coarse:` height/padding floor to these buttons (mirroring `Button`'s own
`coarse:h-11`/`coarse:size-11` pattern) and extend `e2e/touch-sizing.spec.ts` to cover them, e.g.
by locating the tail-shape and fin-setup grids directly rather than relying on the
`data-slot="button"` filter.

## Info

### IN-01: `RailControls`'s `<Sym>`/`<Hard Edge>` checkbox rows use `coarse:min-h-11` while the Family/Ratio sliders beside them rely on the shared `Slider` primitive's own touch ring

**File:** `components/rails/rail-controls.tsx:243-249, 260-264`

**Issue:** Not a defect — the shared `Slider` component's `coarse:after:-inset-4` (verified in
`components/ui/slider.tsx`) already gives every `<Slider>` instance in the app a 44px touch ring —
but it's worth a maintainer note that this file mixes two different touch-sizing mechanisms
(inline `coarse:min-h-11` on hand-written label rows vs. the primitive's own built-in coarse
variant) with no comment explaining why the two differ, which makes it easy for a future editor to
assume the primitives alone are sufficient everywhere and copy the pattern for a new hand-rolled
row without adding an explicit `coarse:` class.

**Fix:** A one-line comment beside the label rows' `coarse:min-h-11` noting that only the shared
`Button`/`Input`/`Slider` primitives get their touch sizing "for free," and any other hand-rolled
interactive element (see WR-02) needs its own explicit `coarse:` rule.

---

_Reviewed: 2026-09-09T10:05:31Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
