---
status: diagnosed
trigger: "G-09-6: On a real iPhone, the Print button in the RAILS screen's View Full Sized dialog does nothing when tapped (the shaper wrote \"print buttons dont do anything\", plural — check every Print button reachable on a phone)."
created: 2026-09-09T16:10:00Z
updated: 2026-09-09T17:40:00Z
mode: symptoms_prefilled, goal=find_root_cause_only
bug_class: Bohrbug on the shaper's iPhone (every tap, every Print button); not reproducible in Playwright's WebKit emulation, which cannot run the native print step (WebDriver-controlled pages skip Chrome::print) — so the app side was verified by counting window.print() calls and the iOS side by research + differential probes.
---

## Current Focus
<!-- OVERWRITE on each update - reflects NOW -->

hypothesis: CONFIRMED (app side) — the tap reaches window.print() correctly on a phone; nothing in the app, the dialog stack, the phone layout or the deployed build stops it. The sheet is suppressed by iOS's own print step downstream of that call. Leading iOS-side cause: the site is running as a Home-Screen web app (iOS 26 opens every Home-Screen site as a web app by default) where window.print() is a documented silent casualty; second candidate: Safari deferring the print until the page "finishes loading". One device check tells them apart (see Resolution).
test: done — see Evidence
expecting: n/a
next_action: return diagnosis (goal is find_root_cause_only). The worktree is disposable; this file is copied to /Users/kontoes/Code/shaper/.planning/debug/.

reasoning_checkpoint:
  hypothesis: "window.print() IS called, synchronously and under a live user activation, every time the phone Print button is tapped; the missing print sheet is iOS refusing/deferring the print outside the page's control — with the site launched as a Home-Screen web app (iOS 26 default) the most likely context, because window.print() is a known no-op there and the failure is silent and affects every Print button equally."
  confirming_evidence:
    - "Stubbed window.print counted 3/3 calls per tap kind (tap, click, raw touchscreen tap) on iphone+android projects, dev build; 1/1 on the deployed build; 2/2 with the emulation forced to look like iOS to Base UI; navigator.userActivation.isActive=true on every call; stack = onClick -> React executeDispatch (synchronous)."
    - "elementFromPoint at the button's centre is the button itself; enabled; pointer-events auto; 44px tall; no z-index above the dialog's z-50 on RAILS; body/html untouched by Base UI's scroll lock (page already overflow-hidden, so the lock is a no-op on iOS and non-iOS alike)."
    - "Deployed page: window.print is native; only third-party script is Clerk (no print/EventSource/WebSocket/preventDefault in the bundle); 0 requests pending after load on rails and summary; readyState complete."
    - "iOS 26 opens every site added to the Home Screen as a web app by default ('Open as Web App' toggle on by default — MacRumors, heise, iDownloadBlog, Apple Support); window.print() inside iOS home-screen/standalone web apps is documented as broken with 'open it in Safari' the only workaround (Apple dev forums 22911, 4009)."
  falsification_test: "On the shaper's iPhone, open https://shaper-coral.vercel.app/design/rails by typing the URL in Safari itself (address bar visible, not a Home-Screen icon) and tap Print: if the print sheet appears, standalone mode was the cause. If it still does nothing, tap Print and then switch on Airplane Mode: a sheet popping up the moment the network drops proves Safari was holding the print for a page that never 'finished loading'. If neither, it is an iOS/Safari-version issue on that device (note the iOS version)."
  fix_rationale: "The app cannot make iOS show a sheet it refuses; the durable fix is to stop depending on window.print() on a phone — produce the ruler-true rail as a PDF (jsPDF is already a dependency and already builds the Full Sized Template) so a shaper can AirPrint/share it from Safari or a web app alike — and/or detect standalone (`display-mode: standalone` / navigator.standalone) and tell the shaper to open the page in Safari. Either addresses the actual failure point (iOS's print step), not a symptom."
  blind_spots: "No real iOS device or Simulator here (Xcode is not installed); signed-in Clerk session not reproducible; the exact launch context of the shaper's phone is unknown. A device-level Safari setting or an iOS-version bug cannot be excluded without the device."
  candidate_causes:
    - "code: tap swallowed before the handler (coarse: hit ring, overlay, disabled, Base UI touch listener preventDefault, mouse-only binding) — ELIMINATED by measurement"
    - "config/build: deployed build differs (patched window.print, third-party script, stale deploy) — ELIMINATED by measurement on the deployed site"
    - "environment: iOS print policy (standalone web app no-op; deferred until loaded; 'automatic printing' block) — LEADING; standalone most consistent with a silent failure on every button"
    - "data/layout: zero-page print document on iOS — ELIMINATED (print-media document is 399px/1453px tall)"
  and_gate: "no — a single environmental condition (how the page is hosted/launched on the phone) explains every observation; no second simultaneous condition is required."

## Symptoms
<!-- Written during gathering, then IMMUTABLE -->

expected: Tapping Print in the View Full Sized dialog on a phone opens the print sheet, and the printed rail is ruler-true (1:1), matching Phase 8's desktop guarantee, even though the on-screen phone view shows the rail shrunk with the plain "Shown smaller than actual size" line and no check bar.
actual: "print buttons dont do anything" — on the shaper's real iPhone (Safari), tapping Print produces no visible response: no print sheet, nothing.
errors: None reported (no console available on the phone).
reproduction: Test 6 in .planning/phases/09-the-design-screens-on-a-phone/09-UAT.md — open https://shaper-coral.vercel.app/design/rails on an iPhone, tap "View Full Sized", tap "Print". Reproduce locally with Playwright's `iphone` project (WebKit, iPhone 14) against the dev server.
started: Discovered during end-of-phase UAT on 2026-09-09, on the build deployed from commit 5c1627f. Phase 9 (plan 09-04, commit 38ce989 and later 09-05, 09-07 and the review fixes 312a3ee/7b75cee/48a6b8f) changed the View Full Sized dialog for phones and every shared button; before this phase the dialog was desktop-only.

## Eliminated
<!-- APPEND only - prevents re-investigating -->

- hypothesis: The tap never reaches the Print button's click handler on a touch phone (covered by another element, pointer-events, disabled state, a coarse: hit ring, a max-shell: rule, the Base UI focus trap, or a mouse-only binding).
  evidence: e2e/zz-print-probe.spec.ts (throwaway) on Playwright's iphone (WebKit, iPhone 14) and android (Chromium, Pixel 7) projects against the dev server: with window.print stubbed to count, tap() / click() / touchscreen.tap() each incremented the count (3/3 on both projects), every call had navigator.userActivation.isActive=true, the stack was onClick -> React executeDispatch (synchronous, inside the native click). document.elementFromPoint at the button's centre returned the button itself (button < dialog-footer < dialog-content < dialog-portal < body). Button attrs: BUTTON type=button, disabled=false, aria-disabled=null, pointer-events auto, visibility visible, opacity 1, height 44px, (pointer: coarse)=true, (width < 820px)=true. Same for SUMMARY's "Print Order Form" (1/1).
  timestamp: 2026-09-09T16:30Z

- hypothesis: A never-completing request (event-stream / long poll) keeps the deployed page "loading" in WebKit's eyes, so Safari's deferred print never fires.
  evidence: e2e/zz-print-probe-net.spec.ts (throwaway) against https://shaper-coral.vercel.app on the iphone and android projects, signed out: /design/rails — load at 805ms (WebKit) / 651ms (Chromium), networkidle at ~2.2s / 1.8s, 0 requests pending after 5s, 49 finished (Next chunks, fonts, Clerk's clerk-js/ui bundles via /__clerk, Clerk /v1/client + /v1/environment, Next RSC prefetches of the six routes); /design/summary — same shape, 0 pending, 51 finished. No EventSource, WebSocket or streaming response anywhere; the app has no API routes and no client fetch of its own; Clerk's served bundle has no EventSource/WebSocket. (Caveat: measured signed out; a signed-in Clerk session was not reproducible here — but the signed-in path only adds Server Action POSTs fired by Save/autosave, not at load.)
  timestamp: 2026-09-09T17:00Z

- hypothesis: A Base UI iOS-only branch (dialog scroll lock or another `ios`-gated behaviour) swallows the tap or leaves body position:fixed so iOS gets a zero-page print job.
  evidence: e2e/zz-print-probe-ios.spec.ts (throwaway): with navigator.platform forced to "iPhone" and maxTouchPoints to 5 (so @base-ui/utils/platform/os.js reports ios=true), tap() and touchscreen.tap() still called window.print (2/2, isActive=true); html/body inline styles stayed null with the dialog open (useScrollLock sees the page already overflow-hidden and only parks a MutationObserver — same on iOS and non-iOS); in print media the document is 399px tall with the dialog open and 1453px on SUMMARY (body position static, overflow visible). The only other ios-gated Base UI files (NumberFieldRoot, combobox live region, useOpenInteractionType via DialogTrigger's open-interaction tag) do not sit in the click path.
  timestamp: 2026-09-09T17:20Z

- hypothesis: The deployed production build wires Print differently from dev (stale deploy, patched window.print, third-party script).
  evidence: e2e/zz-print-probe-prod.spec.ts (throwaway) on the deployed site: window.print is `function print() { [native code] }`; readyState complete; standalone false in emulation; the Print button is on screen and top-most; a late stub counted 1 call with isActive=true on tap. Served HTML's only external script is /__clerk/npm/@clerk/clerk-js@6/dist/clerk.browser.js.
  timestamp: 2026-09-09T16:45Z

## Evidence
<!-- APPEND only - facts discovered -->

- timestamp: 2026-09-09T16:10Z
  checked: Phase 0 knowledge base — .planning/debug/knowledge-base.md
  found: File does not exist. Prior session files exist in .planning/debug/ (not archived), including view-full-sized-print-offset.md about this dialog's print output (Tailwind v4 `translate` vs `transform`).
  implication: No known-pattern match; this dialog's print path has needed care before.

- timestamp: 2026-09-09T16:12Z
  checked: components/rails/view-full-sized-dialog.tsx (read completely, HEAD 5c1627f)
  found: The Print button is `<Button type="button" onClick={() => window.print()}>` inside `<DialogFooter data-print-hide>`. Synchronous call inside the click — no async gap, no matchMedia/media check, no new window/iframe, no beforeprint hook. Phone branch (D-13) is purely CSS gating (max-shell:/print: classes) on the check bar, caveat, title suffix and plot wrapper.
  implication: If the handler fires, window.print() runs directly under user activation.

- timestamp: 2026-09-09T16:12Z
  checked: 09-UAT.md, 09-04-SUMMARY.md, 09-04-PLAN.md
  found: UAT test 6 failed ("print buttons dont do anything", major). 09-04 deferred "printing a rail from a phone" to human UAT; automation only proved actual-size.css and the @media print rules were byte-identical and that the phone CSS split rendered. e2e/phone-rails.spec.ts's dialog test stops at `expect(Print).toBeVisible()`. No planning doc mentions Home-Screen icons, web apps or standalone mode; nothing in phase 9 researched whether window.print() works on an iPhone at all.
  implication: The phone print path was never exercised by a machine or a person before the shaper tried it; the gap that let this ship is "no test ever asked a phone to print" — and Playwright cannot (automation-controlled WebKit skips the native print step), so the recurrence guard has to be a device check in UAT plus a handler-level assertion.

- timestamp: 2026-09-09T16:20Z
  checked: git diff 47f4ae9..HEAD on view-full-sized-dialog.tsx, rail-band-editor.tsx, button.tsx; git log 47f4ae9..HEAD; review-fix commits 312a3ee/7b75cee/48a6b8f
  found: Phase 9 did not touch the Print button or its handler: the dialog diff is CSS gating plus exporting firstOpenSection; button.tsx only gained `coarse:h-11` / `coarse:size-11`; rail-band-editor.tsx moved onto DesignScreenShell (data-print-hide on its root, as before). No commit adds a touchstart/pointerdown preventDefault, a global touch-action, or any z-index above 50 on RAILS (only FINS' ToeAimTableModal is z-[1000]). touch-none/select-none exist only on the outline/rocker drawing surfaces and the slider.
  implication: Nothing this phase shipped changes how the click reaches window.print(); Phase 9 simply made the dialog reachable on a phone for the first time.

- timestamp: 2026-09-09T16:22Z
  checked: grep for window.print across app/components/lib
  found: Exactly two call sites: components/rails/view-full-sized-dialog.tsx:281 and components/summary/use-print-fit.ts:162 (`printOrderForm = () => window.print()`, SUMMARY's order form, which also registers beforeprint/afterprint sheet-fitting listeners). Both direct, synchronous, under the click. Shared factors: the Button primitive, the root layout (html/body h-dvh overflow-hidden), an `@page { size: … }` rule (landscape in the dialog, portrait in order-form.css), and iOS Safari's own window.print().
  implication: The shaper's plural ("print buttons") fits a cause downstream of window.print() shared by every button, not something specific to the dialog.

- timestamp: 2026-09-09T16:30Z
  checked: e2e/zz-print-probe.spec.ts on iphone + android projects (dev server :3111)
  found: Handler runs on every input kind (see Eliminated). Print button box on iphone: x 25.7 / y 478.9 / 338.5x44 in a 390x664 viewport — fully on screen, no scrolling needed. SUMMARY's Print Order Form on a phone sits at x -21.6 (iphone) / -10.6 (android), y ~1100 — partly off the left edge and below the fold (the order-form sheet is not laid out for a phone yet; Phase 10) — but tap() still reached its handler.
  implication: The failure is downstream of the click.

- timestamp: 2026-09-09T16:45Z
  checked: e2e/zz-print-probe-prod.spec.ts — the deployed site on the iphone project, no init-script stub
  found: readyState complete; window.print native (own property, normal for a [Global] interface); navigator.standalone false in emulation; Print button on screen and top-most; late-stub tap counted 1 call with isActive=true. Only external script: Clerk via /__clerk (proxy.ts). No Vercel toolbar/analytics. App has no API routes and no client fetch/EventSource/WebSocket.
  implication: The deployed build behaves exactly like dev; nothing on the page overrides print.

- timestamp: 2026-09-09T16:50Z
  checked: Research — iOS/Safari window.print() behaviour (platform-specific → research route)
  found: MDN: "If the document is still loading when this function is called, then the document will finish loading before opening the print dialog." WHATWG list (2011) "Browsers delay window.print() action until page load finishes". launchdarkly/js-client-sdk #121: "Safari won't print until the page has finished loading, but the event-stream connection is preventing whatever event it's watching for from ever firing. If the network is disconnected, causing the stream to end, the print dialog immediately opens"; react-pdf-viewer #1542 "When using SSE, the print functionality doesn't work in Safari". iOS 10.3.3+: print() outside a user gesture shows "This website was blocked for automatic printing" (an alert — not what the shaper saw; and our call is inside the gesture). Home-screen/standalone web apps: Apple dev forums 22911 / 4009 — print sheet broken (no preview, printer greyed, or freezes); "the only workaround was not to use the app in standalone mode, just use it in Safari".
  implication: Two documented iOS-side mechanisms produce a silent no-op for every Print button on a site; both are outside the page's control.

- timestamp: 2026-09-09T17:05Z
  checked: Research — iOS 26 Home Screen behaviour
  found: iOS 26 (released 2025-09-15) changed Add to Home Screen: every website now opens as a web app by default; the share sheet's "Open as Web App" toggle is ON by default and must be switched off to get a plain Safari bookmark (MacRumors how-to; heise "Changed web app behaviour on the home screen"; iDownloadBlog "Safari opens every bookmark added to the Home Screen as a web app"; Apple Support "Turn a website into an app in Safari on iPhone"; Michael Tsai "Web Apps in iOS 26"). No manifest is required.
  implication: A shaper who added shaper-coral.vercel.app to the Home Screen at any point and launches it from the icon on iOS 26 is running the site as a standalone web app — no Safari address bar — where window.print() is documented as broken/no-op. That matches "print buttons don't do anything" on every button.

- timestamp: 2026-09-09T17:10Z
  checked: e2e/zz-print-probe-env.spec.ts — what the iphone emulation looks like to iOS detection; live touch listeners with the dialog open
  found: navigator.platform "MacIntel", maxTouchPoints 0, "ontouchstart" true, UA iPhone. Base UI's ios flag (`/^i(os$|p)/.test(platform) || (platform==="macintel" && maxTouchPoints > 1)`) is FALSE in the emulation, TRUE on a real iPhone — every earlier probe ran the non-iOS path. Live listeners: React's delegated set (touchstart/touchmove passive) and Base UI useDismiss's capture-phase click/pointer/mouse/touch listeners on the document (touchstart/touchmove passive → cannot preventDefault; outsidePress acts only outside the popup; the dialog root's touchend branch only classifies single-finger taps).
  implication: Needed the forced-iOS differential (done — see Eliminated #3); the non-iOS path cannot swallow the click and the iOS path, when forced, does not either.

- timestamp: 2026-09-09T17:30Z
  checked: Side finding — e2e/zz-print-probe-translate.spec.ts (throwaway), both phone projects, dev build
  found: With the dialog open and page.emulateMedia({media:"print"}), the popup goes position:static but its computed `translate` stays `-50% -50%` in WebKit (rect x -195) even though the dialog's own <style> is a live, enabled sheet containing `@media print { [data-view-full-sized-dialog] { translate: none !important } }` (document.contains true, not disabled, rules parsed). The identical rule injected via addStyleTag after the media switch takes effect immediately (`none`, rect x 0). Chromium readings are mid-animation (the enter animation re-runs on each media toggle) and unreliable. 08-07's post-merge check measured a REAL Chrome print after fix 2fd8941 (content inside the 8mm margins, check bar 143.99pt), so this is most likely an emulateMedia invalidation artifact rather than a broken reset.
  implication: Not the cause of "nothing happens" (it only affects where the rail lands on the paper), but a real-Safari print of the dialog has never been measured — worth one print-to-PDF check from macOS Safari when the phone print path is revisited.

## Resolution
<!-- OVERWRITE as understanding evolves -->

root_cause: The app is not at fault at any point up to and including the call: on a phone the tap lands on the Print button, Base UI passes the click straight through, and `window.print()` is invoked synchronously inside a live user activation — verified on the dev build and the deployed build, in WebKit and Chromium touch emulation, and with the emulation forced to present as iOS to Base UI. Nothing on the deployed page patches `print`, no request stays open, and the print-media document is not empty. What fails is iOS's own print step after that call, which the page cannot observe or influence. The most likely trigger, and the only one consistent with a completely silent failure on every Print button, is that the shaper's iPhone is running the site as a Home-Screen web app: iOS 26 now opens every Home-Screen site as a standalone web app by default (the "Open as Web App" toggle is on unless switched off), and `window.print()` inside an iOS standalone web app is documented as broken with "open it in Safari" the only workaround. The second candidate is Safari holding the print until the page "finishes loading" (never, if some request on that device stays open) — not reproducible here signed out. Underlying gap: `window.print()` is the only print path on the phone, and no test or UAT step ever confirmed a phone can print — Phase 9 asserted only that the print CSS was byte-identical, and Playwright cannot exercise the native print step at all.
fix: (not applied — diagnose-only) Direction: do not depend on `window.print()` on a phone. Build the ruler-true rail as a PDF with jsPDF (already a dependency; already builds the Full Sized Template) and offer "Save PDF" / share on phones so AirPrint works from Safari and from a web app alike; and/or detect standalone (`matchMedia("(display-mode: standalone)")` / `navigator.standalone`) and show "open this page in Safari to print". Apply the same to SUMMARY's Print Order Form (Phase 10). Add a phone-print step to UAT that records the launch context (Safari address bar visible vs Home-Screen icon).
verification: Device check for the shaper (30 seconds): (1) open https://shaper-coral.vercel.app/design/rails by typing the URL in Safari itself — if Print now works, the Home-Screen web app was the cause; (2) if it still does nothing, tap Print, then switch on Airplane Mode — a sheet appearing the moment the network drops proves Safari was waiting for the page to "finish loading"; (3) if neither, record the iOS version (an iOS/Safari-level issue on that device).
files_changed: []
files_involved:
  - components/rails/view-full-sized-dialog.tsx:281 — the only phone print path is a bare `window.print()`; correct in itself, but it has no fallback for iOS contexts where that call is a no-op
  - components/summary/use-print-fit.ts:162 — SUMMARY's `printOrderForm` is the same bare call (Phase 10's screen; shares the cause; its button also sits partly off a phone's left edge)
  - e2e/phone-rails.spec.ts — the phone dialog test stops at "Print button is visible" and never asserts the handler runs (a stub-count of window.print would at least pin the app side)
why_not_caught: No gate could have — Phase 9's automation only proved the print CSS was unchanged, the dialog e2e test only checked visibility, and Playwright/WebDriver cannot run the native print step; the only gate for "a phone can print" is a human on a device, and that step was deferred to end-of-phase UAT where it was found.
recurrence_guard: (proposed) a UAT step that records how the site was launched on the phone (Safari vs Home-Screen icon) before printing; an e2e assertion that tapping Print calls a stubbed window.print on the iphone/android projects; and, once the fix lands, a phone print path that does not depend on window.print().
