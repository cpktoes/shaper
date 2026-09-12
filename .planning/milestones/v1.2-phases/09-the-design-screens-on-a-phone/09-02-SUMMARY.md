---
phase: 09-the-design-screens-on-a-phone
plan: 02
subsystem: design-screens
tags: [phone-layout, tailwind-v4, touch, playwright, base-ui-menu]

requires:
  - "09-01: @playwright/test iphone/android/desktop projects; desktop baseline PNGs; data-drag-target hooks on outline/rocker viewers"
provides:
  - "--breakpoint-shell (820px) and the coarse-pointer custom variant in app/globals.css — the phase's two CSS switches, declared once"
  - "app/layout.tsx viewport export (viewportFit cover, resizing keyboard, no pinch-zoom limit) and an h-dvh height chain"
  - "components/design/design-screen-shell.tsx (DesignScreenShell) — the shared aside/main layout with its full prop surface (controls, canvas, wideView, sidebarFooter, outsideColumns, printHide, simpleSidebar, phonePinned), desktop-identical, phone stack layered on with max-shell: only"
  - "components/design/phone-tab-bar.tsx (PhoneTabBar) — the six-tab bottom nav, mounted in app/design/layout.tsx"
  - "components/design/phone-top-bar.tsx (PhoneTopBar) + components/design/phone-menu.tsx (PhoneMenu) — the compact top bar and its one Base UI popup (Units/Theme + account)"
  - "components/settings-menu.tsx SettingsMenuContent — the desktop gear menu's popup content, factored out and reused by PhoneMenu so the two can never drift"
  - "components/design/use-viewer-media.ts — useCoarsePointer, usePortraitViewport (the one sanctioned JS media-query read in this phase)"
  - "components/design/fine-adjust-group.tsx (FineAdjustDisclosure) — the closed-by-default disclosure header for folded sliders"
  - "NAV_LINKS exported from components/site-nav.tsx"
  - "e2e/phone-layout.spec.ts — 21 tests across iphone/android/desktop proving the phone shell, top/bottom bars, orientation, overlay default and Fine adjust group"
affects: [09-03, 09-04, 09-05, 09-06, 09-07]

actuals:
  tokens: 18700
  tasks: 4
  commits: 4

tech-stack:
  added: []
  patterns:
    - "DesignScreenShell's phone rules are additive max-shell: overrides on an unprefixed desktop base — never a second branch, never a default flip; phonePinned selects a pinned-height mode via a lookup record of complete literal class strings (never concatenated) so Tailwind can see every class"
    - "useCoarsePointer/usePortraitViewport follow sign-in-banner.tsx's useSyncExternalStore shape (subscribe + client snapshot + fixed server snapshot) so a touch-only default settles at most one frame after hydration with no hydration-mismatch warning"
    - "Pointer-driven view-state defaults (construction overlay, orientation) are read as plain computed values each render — override-over-default (constructionOverride ?? coarsePointer) or live-derivation-over-state (coarsePointer ? liveOrientation : orientation) — never synced into a second piece of state via an effect or a render-time setState, both of which this project's eslint-plugin-react-hooks config (set-state-in-effect, set-state-in-render) now rejects"
    - "A shared popup-content component (SettingsMenuContent) factored out of an existing Menu.Root-owning component, so a second consumer (PhoneMenu) can stack it inside its own popup without copying the Base UI RadioGroup markup"
    - "data-design-controls-scroll / data-drag-target-style test-only DOM hooks for Playwright locators that must resolve to the actual scrolling/interactive element, not a same-purpose-looking ancestor"

key-files:
  created:
    - components/design/design-screen-shell.tsx
    - components/design/phone-tab-bar.tsx
    - components/design/phone-top-bar.tsx
    - components/design/phone-menu.tsx
    - components/design/use-viewer-media.ts
    - components/design/fine-adjust-group.tsx
    - e2e/phone-layout.spec.ts
  modified:
    - app/globals.css
    - app/layout.tsx
    - app/design/layout.tsx
    - components/site-nav.tsx
    - components/settings-menu.tsx
    - components/outline/outline-editor.tsx
    - components/outline/outline-controls.tsx

key-decisions:
  - "The shell's final prop surface — controls, canvas, wideView, sidebarFooter, outsideColumns, printHide, simpleSidebar, phonePinned — is now fixed and wave 3 (09-03/09-04) must pass props into it, never edit design-screen-shell.tsx itself, per the plan's own contract."
  - "phonePinned='none' pins nothing and turns the whole shell into one vertical scroller (root gets max-shell:overflow-y-auto, both columns get max-shell:flex-none/h-auto/overflow-visible) — built and wired through the prop surface in this plan even though TEMPLATE (this plan's only migrated screen) never uses it; VOLUME and the RAILS INSTRUCTIONS tab will in wave 3."
  - "DesignScreenShell places a data-design-controls-scroll hook on whichever element is the ACTUAL phone scroller — the inner scroll div in the normal (non-simpleSidebar) case, the aside itself in simpleSidebar mode — because the outer aside also carries its own max-shell:overflow-y-auto per the plan's Layer 3 spec, and with a dev-only sidebarFooter present the outer aside's own box never overflows even though its scrolling child does; a test asserting scrollHeight > clientHeight on the wrong element would be structurally unable to pass."
  - "Orientation and the construction-overlay default use pointer-driven values computed fresh each render (never stored via an effect-driven setState or a render-time setState) after `npm run lint` flagged both react-hooks/set-state-in-effect and react-hooks/set-state-in-render as hard errors in this project's eslint-config-next core-web-vitals setup — a stricter constraint than the plan text's own phrasing ('this effect just keeps it in step') anticipated, worked around with plain computed values (see tech-stack patterns) rather than any effect at all."
  - "The rotate button and the phone's own live orientation take precedence differently by pointer, not by width: a coarse-pointer device at desktop width (a touchscreen laptop) still sees the rotate button (only max-shell:hidden gates its visibility) but the button has no visible effect while coarsePointer is true, since the rendered orientation always follows the device's own (orientation: portrait) media query whenever the pointer is coarse. This is the plan's own literal wording ('on a coarse-pointer device only, drive it from the phone's own orientation') taken at face value; the residual edge case (a touchscreen laptop with a landscape screen) is rare and not addressed by the plan or UI-SPEC."
  - "components/design/phone-menu.tsx and phone-top-bar.tsx both carry test-only hooks (data-phone-menu-account, an aria-label on the top bar's <header> role='banner') added because this suite's deliberately fake Clerk credentials never settle NavAuthControl's isLoaded to true, so an assertion on the rendered 'Sign in' text would test the harness's Clerk stand-in rather than the phone menu's own composition."

requirements-completed: []

coverage:
  - id: D1
    description: "Two CSS switches (--breakpoint-shell, coarse custom-variant) declared once in app/globals.css's @theme static / dark-variant block"
    requirement: "PHON-01"
    verification:
      - kind: other
        ref: "grep -c -- \"--breakpoint-shell: 820px\" app/globals.css == 1 (inside @theme static); grep -c \"@custom-variant coarse\" app/globals.css == 1"
        status: pass
    human_judgment: false
  - id: D2
    description: "app/layout.tsx viewport export (viewportFit cover, interactiveWidget resizes-content, no scale-limiting field) and an h-dvh height chain replacing h-full"
    requirement: "PHON-02"
    verification:
      - kind: other
        ref: "grep checks on app/layout.tsx: viewportFit=1, interactiveWidget=1, maximumScale/userScalable=0, h-dvh=2, h-full=0"
        status: pass
    human_judgment: false
  - id: D3
    description: "DesignScreenShell renders desktop byte-identical to the pre-existing five editors' hand-copied markup, with a phone stack layered on additively"
    requirement: "PHON-05"
    verification:
      - kind: e2e
        ref: "npx playwright test --project=desktop e2e/desktop-baseline.spec.ts e2e/desktop-regression.spec.ts — 7/7 passing, no snapshot regenerated, at every task in this plan"
        status: pass
    human_judgment: false
  - id: D4
    description: "TEMPLATE stacks on iphone/android: drawing pinned above a controls region that alone scrolls, drawing at least 90% of viewport width, six-tab bottom bar with TEMPLATE marked, all tabs >=44px"
    requirement: "PHON-01, PHON-06, TEST-01"
    verification:
      - kind: e2e
        ref: "e2e/phone-layout.spec.ts — 'phone shell' describe block, 5 tests x 2 phone projects"
        status: pass
    human_judgment: false
  - id: D5
    description: "Compact top bar (wordmark, Save, one Menu button) replaces the desktop nav row on design routes at phone width; the Menu button opens one popup holding Units/Theme and the account control"
    requirement: "PHON-01, D-08"
    verification:
      - kind: e2e
        ref: "e2e/phone-layout.spec.ts — 'phone compact top bar and the one menu' describe block, 2 tests x 2 phone projects"
        status: pass
    human_judgment: false
  - id: D6
    description: "TEMPLATE follows phone orientation on a coarse pointer (nose-up portrait, flat landscape); rotate button absent below the shell breakpoint; construction overlay (and its drag points) on by default on touch, off by default on desktop"
    requirement: "PHON-05, D-02, D-09, D-10, D-11"
    verification:
      - kind: e2e
        ref: "e2e/phone-layout.spec.ts — 'phone orientation and the construction overlay default' + desktop rotate/overlay tests"
        status: pass
    human_judgment: false
  - id: D7
    description: "The eight sliders that repeat what a TEMPLATE drag point sets fold into one closed Fine adjust group on a phone, last in the controls scroller, 44px tap target; desktop shows every slider open with no Fine adjust control"
    requirement: "D-03"
    verification:
      - kind: e2e
        ref: "e2e/phone-layout.spec.ts — 'phone Fine adjust group' + desktop no-Fine-adjust test"
        status: pass
    human_judgment: false

duration: 45min
completed: 2026-09-09
status: complete
---

# Phase 9 Plan 2: The Phone Shell, Bars and TEMPLATE's Touch Defaults Summary

**The phase's tracer: one shared `DesignScreenShell` (byte-identical desktop, `max-shell:`-only phone stack), the `dvh`/`coarse` CSS switches, a bottom tab bar and compact top-bar-with-one-menu, and TEMPLATE wired onto all of it — orientation follows the phone, the construction overlay is on by default on touch, and the eight sliders a drag point already sets fold into one closed "Fine adjust" row — proved on an iPhone and an Android with the five desktop baseline screenshots still matching to the pixel at every task.**

## Performance

- **Duration:** ~45 min
- **Tasks:** 4 (tracer + 3 auto), no deviations beyond what's recorded below
- **Files touched:** 14 (7 new, 7 modified)

## Accomplishments

- `app/globals.css`: `--breakpoint-shell: 820px` inside `@theme static` and a `@custom-variant coarse (@media (pointer: coarse))` beside the existing `dark` variant — the phase's two independent switches (width vs. pointer), declared once each
- `app/layout.tsx`: `export const viewport` (device-width, initialScale 1, `viewportFit: "cover"`, `interactiveWidget: "resizes-content"`, no scale-limiting field — WCAG 2.1 1.4.4) and `h-dvh` replacing `h-full` on `<html>`/`<body>`
- `components/design/design-screen-shell.tsx`: the one shared aside/main layout — desktop is the unprefixed base, byte-identical to what `outline-editor.tsx` used to hand-roll; every phone rule is a `max-shell:` addition. Full prop surface (`controls`, `canvas`, `wideView`, `sidebarFooter`, `outsideColumns`, `printHide`, `simpleSidebar`, `phonePinned`) built now so waves 3–4 never edit this file
- `components/outline/outline-editor.tsx` now renders through `DesignScreenShell` instead of its own duplicated markup (55 insertions / 61 deletions net — markup removed, not copied)
- `components/design/phone-tab-bar.tsx`: the six-tab bottom bar (`aria-label="Screens"`), reading `NAV_LINKS` from `site-nav.tsx` (now exported) rather than retyping the labels; mounted as the last child of `app/design/layout.tsx`
- `components/design/phone-top-bar.tsx` + `components/design/phone-menu.tsx`: the compact top bar (wordmark, `SaveButton`, one `Menu` button) and its single Base UI popup, stacking `SettingsMenuContent` (factored out of `components/settings-menu.tsx` so the desktop gear menu and this one can never drift) above `NavAuthControl`
- `components/design/use-viewer-media.ts`: `useCoarsePointer`/`usePortraitViewport`, the one sanctioned JS media-query read this phase allows, in the exact `useSyncExternalStore` shape `sign-in-banner.tsx` already uses
- TEMPLATE's board now turns with the phone on a coarse pointer (nose-up portrait, flat landscape), the rotate button carries `max-shell:hidden`, and the construction overlay (its five drag targets) is on by default on touch — all as plain computed render-time values, never state kept in sync by an effect (see Deviations)
- `components/design/fine-adjust-group.tsx` (`FineAdjustDisclosure`) + `components/outline/outline-controls.tsx`: the four repeating slider pairs (Width/Offset, Tail Rail/Nose Rail, Nose Angle/Fullness, Tail Angle/Fullness) fold behind one closed 44px "Fine adjust" row, last in the controls scroller, via CSS `order` and a `group`/`data-fine-adjust` pairing — no `SliderRow` instance duplicated
- `e2e/phone-layout.spec.ts` (new, 21 applicable tests across iphone/android/desktop): stacked layout, full-width drawing, one-scroller controls, six-tab bar, compact top bar + one menu, orientation + overlay defaults, Fine adjust group — every phone test paired with a desktop assertion proving the same surface is untouched there
- `npm test` (2285 tests, including `lib/units-isolation.test.ts`) and `npx tsc --noEmit` both stay clean throughout; `npx playwright test --project=desktop e2e/desktop-baseline.spec.ts e2e/desktop-regression.spec.ts` (7 tests) passes with **no snapshot regenerated** at every task

## Task Commits

Each task was committed atomically:

1. **Task 1 (tracer): One path all the way through — TEMPLATE on a phone, proved on an iPhone and an Android** — `8be04c7` (feat)
2. **Task 2: The compact top bar and the one menu** — `145e38b` (feat)
3. **Task 3: TEMPLATE follows the phone — nose-up when upright, drag points already showing** — `34a301b` (feat)
4. **Task 4: Fold the eight repeating TEMPLATE sliders into one "Fine adjust" group** — `cc60907` (feat)

## The shell's final prop surface (wave 3 depends on this)

```ts
interface DesignScreenShellProps {
  controls: ReactNode;        // the sidebar body
  canvas: ReactNode;          // normally a TabbedPanel wrapping the drawing
  wideView?: boolean;         // hides the sidebar entirely (outline/rocker only)
  sidebarFooter?: ReactNode;  // the dev-only "Copy preset values" row
  outsideColumns?: ReactNode; // sibling of the two-column root — FINS' ToeAimTableModal
  printHide?: boolean;        // sets data-print-hide on the root — RAILS
  simpleSidebar?: boolean;    // VOLUME's one-scrolling-box aside, no inner div, no footer
  phonePinned?: "66dvh" | "55dvh" | "50dvh" | "none"; // the phone pinned-area ceiling
}
```

Desktop rendering never changes regardless of these props' values below `shell:` width — every prop only ever adds `max-shell:` classes. Waves 3–4 pass props into this component; per the plan's own instruction, they must not edit `design-screen-shell.tsx` itself.

## Files Created/Modified

- `app/globals.css` — `--breakpoint-shell` token, `coarse` custom variant
- `app/layout.tsx` — `viewport` export, `h-dvh` height chain
- `app/design/layout.tsx` — mounts `PhoneTabBar` as the last child
- `components/design/design-screen-shell.tsx` — new, the shared shell
- `components/design/phone-tab-bar.tsx` — new, the bottom tab bar
- `components/design/phone-top-bar.tsx` — new, the compact top bar
- `components/design/phone-menu.tsx` — new, the one menu popup
- `components/design/use-viewer-media.ts` — new, the two media-query hooks
- `components/design/fine-adjust-group.tsx` — new, the disclosure header
- `components/site-nav.tsx` — exports `NAV_LINKS`; mounts `PhoneTopBar` as a sibling of the desktop `<nav>` on design routes; `max-shell:hidden` on that `<nav>` there
- `components/settings-menu.tsx` — factors `SettingsMenuContent` out of `SettingsMenu` so `PhoneMenu` can reuse it
- `components/outline/outline-editor.tsx` — renders through `DesignScreenShell`; orientation and construction-overlay defaults are pointer-driven computed values; rotate button carries `max-shell:hidden`
- `components/outline/outline-controls.tsx` — the four folded slider-pair rows get `max-shell:order-5N` + `max-shell:group-data-[fine-adjust=closed]:hidden`; `FineAdjustDisclosure` mounted last
- `e2e/phone-layout.spec.ts` — new, the phase's phone-shell proof

## Decisions Made

See `key-decisions` in the frontmatter for the full list. The one worth restating in plain English: **the plan's own text ("this effect just keeps it in step with the device") assumed an effect-based sync would be fine, but this project's linter now hard-errors on calling `setState` from inside either a `useEffect` body or the render body itself** (`react-hooks/set-state-in-effect` and `react-hooks/set-state-in-render`, both part of `eslint-config-next`'s `core-web-vitals` set). Orientation and the construction-overlay default were rebuilt as plain values computed fresh on every render instead — `coarsePointer ? liveOrientation : orientationState` and `constructionOverride ?? coarsePointer` — which needs zero `useEffect` and zero render-time `setState`, and behaves identically to what the plan described (touch drives the default, the toolbar toggle still overrides it, a fine pointer is completely unaffected). This is recorded as a deviation below since it changed the *mechanism* the plan named, not the *behavior* it specified.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Orientation/construction-overlay sync via `useEffect` violated this project's lint rules**
- **Found during:** Task 3, running `npm run lint` after the first implementation pass
- **Issue:** The plan's action text describes syncing `orientation` and `showConstruction` off `useCoarsePointer()`/`usePortraitViewport()` via a `useEffect` that calls `setOrientation`/`setShowConstruction`. `npm run lint` reported two `react-hooks/set-state-in-effect` errors — this codebase's `eslint-config-next` `core-web-vitals` setup hard-errors on calling `setState` synchronously inside an effect body, and (confirmed while designing the fix) also hard-errors on the React-docs "compare against previous render" pattern via `react-hooks/set-state-in-render`.
- **Fix:** Rebuilt both as plain computed values read fresh every render: `boardOrientation = coarsePointer ? (portrait ? "vertical" : "horizontal") : orientation` (orientation state itself, and the rotate button, are completely untouched on a fine pointer — D-10 holds exactly); `showConstruction = constructionOverride ?? coarsePointer`, where `constructionOverride` (`boolean | null`) is only ever set from the toolbar toggle's click handler, never from render or an effect. `wideView`'s existing force-overlay-on/restore logic was adapted to write `constructionOverride` instead of the (now-removed) `showConstruction` state setter.
- **Files modified:** `components/outline/outline-editor.tsx`
- **Verification:** `npm run lint` clean (0 errors), `npx tsc --noEmit` clean, all 21 applicable Playwright tests pass, `npm test` (2285 tests) unaffected.
- **Committed in:** `34a301b` (part of Task 3's own commit — found and fixed before that task was ever committed, so there is no separate fix commit)

**Total deviations:** 1 auto-fixed (Rule 1), mechanism-only — the observable behavior on both desktop and phone matches the plan's `<action>` text and every acceptance criterion exactly.

## Issues Encountered

None beyond the deviation above. One test-writing subtlety worth recording for later plans in this phase: `DesignScreenShell`'s non-`simpleSidebar` aside carries its own `max-shell:overflow-y-auto` (per the plan's Layer 3 spec) in addition to the inner scroll div's own `overflow-y-auto` — this is two nested overflow boxes by design, and the OUTER one never actually overflows (the flex layout sizes it to exactly its available space, with the inner div and the dev-only footer filling that space exactly). A Playwright assertion checking "the controls region really scrolls" has to target the INNER box specifically; `data-design-controls-scroll` was added to `design-screen-shell.tsx` as the stable hook for this (see key-decisions).

## Human verification deferred to end-of-phase UAT

- **PHON-02's real-device proof (unresolved edge-probe row, carried from the plan):** the automated suite asserts `document.scrollingElement.scrollHeight` never exceeds `clientHeight` and the height chain is `dvh`-based, but Playwright cannot reproduce Safari's dynamic toolbar. A real-iPhone-Safari check that scrolling the toolbar in and out never clips the pinned drawing or traps scroll is still needed.
- **A look at the phone shell on a real device:** the stacked layout, the compact top bar/menu, the bottom tab bar, orientation following a physical phone's rotation, and the Fine adjust group's touch target should all be confirmed on real iOS and Android hardware, not just Playwright's device emulation.
- **Manual desktop regression pass (VALIDATION.md Manual-Only table, PHON-05):** the plan's `<verification>` section calls for a human at a desktop browser (>=820px) to drag all five TEMPLATE points with a mouse, tab to every sidebar control and operate it with arrow keys, press the rotate button and the construction toggle, and toggle wide view — confirming nothing differs from the deployed site. This plan's automated equivalents (`e2e/desktop-baseline.spec.ts`'s five pixel-identical screenshots, `e2e/desktop-regression.spec.ts`'s real mouse-drag proof on the TEMPLATE widepoint) exercise the same surface and passed at every task, but the full manual pass itself — including keyboard-only slider operation and the wide-view toggle, which no automated test in this plan exercises — was not run by a human during this autonomous execution and is deferred to end-of-phase UAT per `workflow.human_verify_mode`.

## User Setup Required

None — no external service configuration required. No dependency was installed (`git diff package.json` is empty); the suite runs against the same fake, non-secret Clerk/database env `playwright.config.ts` already supplied from wave 1.

## Next Phase Readiness

- `design-screen-shell.tsx`'s prop surface is complete and stable — waves 3 (`09-03`, `09-04`) migrate ROCKER, RAILS, FINS and VOLUME onto it by passing props, never editing the file.
- `use-viewer-media.ts`'s two hooks are ready for `rocker-editor.tsx` (09-03) to reuse for its own orientation/overlay defaults.
- `e2e/phone-layout.spec.ts` is the phase's one phone-shell spec file; later plans extend it rather than starting new files, per this plan's own header comment.
- No blockers for 09-03 onward.

## Self-Check: PASSED

All 7 created files confirmed on disk (`components/design/design-screen-shell.tsx`, `phone-tab-bar.tsx`, `phone-top-bar.tsx`, `phone-menu.tsx`, `use-viewer-media.ts`, `fine-adjust-group.tsx`, `e2e/phone-layout.spec.ts`) and all 4 commits (`8be04c7`, `145e38b`, `34a301b`, `cc60907`) confirmed in `git log`. `git diff --diff-filter=D` against each commit's parent showed no unexpected deletions. No missing items.

---
*Phase: 09-the-design-screens-on-a-phone*
*Completed: 2026-09-09*
