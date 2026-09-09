---
phase: quick-260909-hny
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/models/toolbar-tip.ts
  - lib/models/toolbar-tip.test.ts
  - components/design/toolbar-tip.tsx
  - components/design/toolbar-tip.test.ts
  - app/design/layout.tsx
  - e2e/phone-toolbar-tip.spec.ts
  - e2e/phone-layout.spec.ts
  - e2e/phone-screens.spec.ts
  - e2e/phone-rails.spec.ts
  - e2e/touch-sizing.spec.ts
  - e2e/keyboard-focus.spec.ts
  - e2e/desktop-baseline.spec.ts
autonomous: true
requirements: [QT-260909-hny]

estimate:
  tokens: 70000
  raw_tokens: 70000
  tasks: 2
  confidence: low

must_haves:
  truths:
    - "The first time a shaper opens a design screen on an iPhone, a single quiet line appears under the top bar: a short note saying that hiding Safari's toolbar gives more room to draw, and how to do it — open the page menu in Safari's address bar and choose Hide Toolbar. Beside it is one Got it button."
    - "Tapping Got it makes the note disappear immediately and it never comes back on that phone — not on the next screen, not after a reload, not next week. It is remembered permanently in that browser, not just for the visit."
    - "The note is a strip in the flow of the page, above the drawing, never a pop-up over the top of it. A shaper can ignore it, scroll past it and keep shaping without ever tapping anything; nothing is blocked behind it."
    - "The note appears only on an iPhone or iPad browser, because the advice is Safari's own menu item. An Android phone, where the browser has no such option at all, never sees it and is not told to go looking for a setting that does not exist."
    - "The note never appears on a computer, at any window width, whether or not the screen is touch-capable — the width switch alone decides that, exactly like the phone tab bar and phone top bar already do."
    - "The note never appears on paper. Printing a full-sized rail template or an order form from a phone produces the same pages it does today, with no browser advice printed across the top of a shop drawing."
    - "Nothing is pushed toward adding the app to the Home Screen. That would remove the toolbar but silently break every Print button (.planning/debug/phone-print-button-does-nothing.md), so the note names only Safari's own Hide Toolbar, which keeps printing working."
    - "The Got it button is a full 44px tall under a finger, because it uses the app's shared Button at its normal size, which already grows to 44px on a touch pointer."
    - "No board number changes anywhere. Nothing under lib/geometry/ is read or written differently, no drawing moves, and the five desktop baseline screenshots still match pixel for pixel with no baseline regenerated."
    - "Every test that exists today still passes untouched: the whole vitest suite, both phone Playwright profiles, the desktop regression pass and the keyboard-focus pass."
  artifacts:
    - lib/models/toolbar-tip.ts
    - lib/models/toolbar-tip.test.ts
    - components/design/toolbar-tip.tsx
    - components/design/toolbar-tip.test.ts
    - app/design/layout.tsx
    - e2e/phone-toolbar-tip.spec.ts
  key_links:
    - "MEASURED AT PLANNING TIME, and it decides the whole test strategy: Playwright's WebKit does NOT implement `-webkit-touch-callout`. Probed directly with `webkit.launch()` + `devices['iPhone 14']`: `CSS.supports('(-webkit-touch-callout: none)')` returned **false** (and `CSS.supports('-webkit-touch-callout', 'none')` false too); Chromium + `devices['Pixel 7']` also false. So in EVERY Playwright project — iphone included — the tip resolves to `display: none`. The browser test therefore cannot assert the tip is visible, and must not pretend to. It asserts the two things it honestly can: the DOM contract (the element is attached when not dismissed, gone when dismissed) and the dismissal wiring (a dispatched click writes the key and the tip stays gone across a reload), plus a conditional visibility block that switches itself on automatically the day Playwright's WebKit gains the property."
    - "This is exactly why the element must stay IN the DOM and let CSS decide whether it paints — the `hidden max-shell:supports-[...]:flex` idiom `components/design/phone-tab-bar.tsx` and `components/design/phone-top-bar.tsx` already use — rather than being gated out in JavaScript by reading `CSS.supports` into React state. A JavaScript platform gate would leave literally nothing in the emulator's DOM to test, and would also cost a server/client snapshot disagreement and a frame of flash on a real phone. CSS gate for width and platform; React gate for dismissal only."
    - "`supports-[-webkit-touch-callout:none]:` is the app's ESTABLISHED CSS-only way to say 'this is iOS' — `components/rails/view-full-sized-dialog.tsx` (~line 276 and ~line 297) already ships it, with a long comment explaining that only iOS/iPadOS WebKit implements the property and there is no UA signal available to CSS. Copy the variant ORDER from that file exactly (`max-shell:` first, then `supports-[...]`), because that is the ordering already proven to compile in this Tailwind v4 setup."
    - "localStorage, not sessionStorage, and its own module. `lib/models/banner-dismissal.ts`'s doc comment argues at length for sessionStorage because the sign-in offer is meant to come back next visit; this tip must NOT come back. Adding a permanent key to that file would make its own doc comment a lie, so the tip gets `lib/models/toolbar-tip.ts` beside it, with the same try/catch discipline so a node test with no storage global and a Safari private window both degrade to 'not dismissed' instead of throwing."
    - "The hydration discipline from `components/auth/sign-in-banner.tsx` is copied verbatim, not approximated: `useSyncExternalStore` with a module-level listener set (the `storage` event fires only in OTHER tabs, and this tip only ever changes from a tap in THIS one) and a `getServerSnapshot` returning `false` — 'not dismissed' — because the server cannot see localStorage. No `setState` in an effect; React's `set-state-in-effect` lint rule flags that pattern."
    - "Mounted in `app/design/layout.tsx` immediately AFTER `<SignInBanner />` and before `{props.children}`, and it must be `flex-none`. That layout's own doc comment records why: each editor declares `flex-1`/`min-h-0` on its own root, so a `flex-none` strip in that column does not disturb the pinned-viewer height chain — `SignInBanner` already proves it. Anything other than `flex-none` there can steal height from the pinned drawing."
    - "The two banners stay INDEPENDENT — the tip is not suppressed while the sign-in banner is showing. Coupling them is tempting (two strips on a 390px phone is a lot) but a shaper who never dismisses the standing sign-in offer would then never see the tip at all, which is the founder's actual feature silently never shipping. Both are one-line strips, both dismiss in one tap, and the tip's tap is permanent."
    - "`data-print-hide` on the root strip is the whole print fix, and it reaches two printed surfaces at once: `app/design/rails/actual-size.css` and `app/design/summary/order-form.css` both already hide `[data-print-hide]`, and order-form.css does so unconditionally. Without it, a printed full-sized rail would carry browser advice across the top of a shop drawing."
    - "The desktop baseline screenshots in `e2e/desktop-baseline.spec.ts-snapshots/` are the final arbiter and are NEVER regenerated. `--update-snapshots` is forbidden in this task. The tip is `display: none` at desktop width, so it must contribute zero pixels; if a baseline moves, the gate is wrong, not the baseline."
    - "Six existing specs get the new localStorage dismissal added to their init script. Today this is insurance rather than a fix — the probe above proves the tip is already `display: none` in the emulator, so no height assertion is currently at risk — but the day Playwright's WebKit implements `-webkit-touch-callout`, every pinned-height and bounding-box assertion in the phone suite would silently shift by the height of a strip. Adding it now costs one line per file and removes that trap permanently. `e2e/touch-drag.spec.ts` and `e2e/desktop-regression.spec.ts` are deliberately NOT touched: neither dismisses the sign-in banner today either, both locate live bounding boxes rather than fixed offsets, and desktop-regression runs at a width where the tip cannot paint at all."
---

<objective>
The first time a shaper opens a design screen on an iPhone, one quiet line explains how to hide
Safari's toolbar for more drawing room — and once they tap Got it, that phone never shows it again.

Purpose: the founder's request — "Can we 'hide toolbar' in the phone browser by default. It really
needs to be hidden to take advantage of the screens real estate effectively. Maybe a popup reminder
on first entry if we can't force a hide from our side." A website cannot hide Safari's or Chrome's
toolbar; there is no API for it, and the one trick that would (adding the site to the Home Screen so
it opens as a standalone app) silently breaks every Print button on iOS. So this plan builds the
founder's own fallback: tell the shaper, once, how to do it themselves.

Output: a one-time, in-flow tip strip above the design screens on iOS phones, with a permanent
per-phone dismissal, a pure tested visibility rule beside the sign-in banner's own, and browser
tests that are honest about what the emulator can and cannot prove.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md

@components/auth/sign-in-banner.tsx
@lib/models/banner-dismissal.ts
@lib/models/banner-dismissal.test.ts
@components/design/phone-tab-bar.tsx
@components/design/phone-top-bar.tsx
@app/design/layout.tsx
@components/ui/button.tsx
@e2e/phone-layout.spec.ts
@e2e/desktop-baseline.spec.ts
</context>

<background>

## What a shaper sees today, and why

On an iPhone, Safari keeps its own strip of controls on screen — the address bar and the row of
browser buttons. On a 390-point-tall phone that is a real bite out of the space the board drawing
gets. Safari will collapse it while a page scrolls, but the design screens deliberately do not
scroll the page (the root layout clamps `body` to the visible viewport so the CONTROLS scroll
instead of the whole page), so that collapse never happens here. The result is exactly what the
founder reported: the drawing is smaller than it needs to be.

## What was ruled out, and why each one is a dead end

**Hiding it from our side.** There is no web API that hides a mobile browser's toolbar. The
Fullscreen API is not implemented on iPhone Safari at all, and on Android Chrome it applies to an
element, not the browser chrome, and requires a user gesture every time.

**A web app manifest with `display: standalone`.** This genuinely removes the toolbar — but only
for a site the shaper has added to their Home Screen, and inside an iOS Home-Screen web app
`window.print()` is a documented silent no-op. That is not a theory: it is the confirmed diagnosis
of the founder's own "print buttons dont do anything" report
(`.planning/debug/phone-print-button-does-nothing.md`), and `components/rails/view-full-sized-dialog.tsx`
already ships a message telling a Home-Screen shaper to open the page in Safari to print. Trading
away printing — the thing a shaper cuts foam from — for a taller drawing is not a trade this app
makes. **No manifest is added by this task, ever.**

**Android.** Chrome on Android has no "hide the toolbar" option of any kind; it simply collapses
on scroll. There is nothing to tell an Android shaper to do, so telling them anything would be
noise about a setting that does not exist.

**What is left, and it is the founder's own suggestion.** iOS Safari *does* let a person hide the
toolbar for good, from the page menu in the address bar. So the app's job is to say so, once,
quietly, on the one platform where the advice is true.

## The wording, and the two traps in it

> For more drawing room, tap the page menu in Safari's address bar and choose Hide Toolbar.

**Trap 1: never name the button's glyph.** The page menu button is labelled `aA` on iOS 17-25 and
`…` on iOS 26. Naming either one makes the sentence wrong for half the shapers reading it. "The
page menu in Safari's address bar" is true on every one of those versions.

**Trap 2: "Hide Toolbar" is Safari's own menu wording** and must be reproduced exactly, capitals
included, because a shaper is going to scan a menu for those two words.

## The three gates, and which technology owns each

| Gate | Owned by | How |
|------|----------|-----|
| Phone width only | CSS | `hidden max-shell:…:flex` — the `--breakpoint-shell` 820px token |
| iOS/iPadOS only | CSS | `supports-[-webkit-touch-callout:none]:` — the app's established iOS guard |
| Not yet dismissed | React | `useSyncExternalStore` over a localStorage key; element removed from the DOM |

Width and platform are CSS on purpose, so the element is always in the server-rendered tree and
there is no JavaScript width check, no flash between layouts, and — critically — something left in
the DOM for a browser test to assert on. Only dismissal is a React decision, exactly as with the
sign-in banner.

## What the emulator can and cannot prove — measured, not assumed

Probed at planning time with a real `webkit.launch()` and `devices['iPhone 14']`:

| Browser / profile | `CSS.supports('(-webkit-touch-callout: none)')` |
|-------------------|------------------------------------------------|
| Playwright WebKit, iPhone 14 profile | **false** |
| Playwright Chromium, Pixel 7 profile | **false** |

Playwright's WebKit is desktop WebKit with a phone profile bolted on; it does not implement the
iOS-only property. So the tip is `display: none` in every Playwright project, including `iphone`.
The browser test in Task 2 says so out loud and asserts what it honestly can instead of faking a
visibility check.

## What must not move

- The five desktop baseline screenshots still match with no `--update-snapshots`, ever.
- No printed page gains a line.
- `lib/geometry/*`, every viewer component, and `e2e/desktop-baseline.spec.ts-snapshots/` are not touched.
- No web app manifest is added.

</background>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1: A one-time note on an iPhone telling a shaper how to hide Safari's toolbar</name>
  <files>lib/models/toolbar-tip.ts, lib/models/toolbar-tip.test.ts, components/design/toolbar-tip.tsx, components/design/toolbar-tip.test.ts, app/design/layout.tsx</files>
  <read_first>
    `lib/models/banner-dismissal.ts` in full — the exported key constant, the `DISMISSED_VALUE`
    sentinel, the pure `shouldShowSignInBanner`, and both storage helpers with their try/catch
    guards and the doc comments explaining each. This is the module the new one mirrors.

    `lib/models/banner-dismissal.test.ts` in full — especially its `fakeSessionStorage` helper, its
    `afterEach` that deletes the injected global, and its four cases: no storage global at all,
    write-then-read, an unexpected stored value, and storage access that throws.

    `components/auth/sign-in-banner.tsx` in full — the module-level `dismissalListeners` set,
    `emitDismissalChange`, `subscribeToDismissal`, the `getServerDismissed` server snapshot, the
    `useSyncExternalStore` call, the `data-print-hide` attribute and the `flex flex-none` strip
    classes. Copy the shape, not the content.

    `components/design/phone-tab-bar.tsx` and `components/design/phone-top-bar.tsx` — the
    `hidden max-shell:flex` idiom and their doc comments on why both variants stay in the
    server-rendered tree.

    `components/rails/view-full-sized-dialog.tsx` around lines 270-305 — the two paragraphs using
    `max-shell:supports-[-webkit-touch-callout:none]:…` and the long comment explaining the iOS
    feature-detection guard. Match its variant ORDER exactly.

    `app/design/layout.tsx` in full (24 lines) — the flex column, where `SignInBanner` sits, and
    the doc comment about `flex-none` not disturbing the editors' `flex-1`/`min-h-0` sizing chain.

    `components/ui/button.tsx` — only the `size` variants block, to confirm `default` is
    `h-8 … coarse:h-11` (44px under a finger) so the Got it button inherits the touch rule instead
    of hand-rolling a height.

    `components/viewer/toolbar-button.test.ts` lines 1-50 — the house idiom for a source-contract
    test: read a real source file, strip its comments, assert a structural property, and build
    every needle from string parts so the test file can never match itself.
  </read_first>
  <behavior>
    Two test files, both written before the source and both failing first.

    **`lib/models/toolbar-tip.test.ts`** — mirrors `banner-dismissal.test.ts` case for case, with
    a `fakeLocalStorage` helper in place of its `fakeSessionStorage` and an `afterEach` that
    deletes the injected `localStorage` global:
    - Test 1: not dismissed, the note should show.
    - Test 2: dismissed, the note stays hidden.
    - Test 3: the exported key constant is a stable, non-empty string, and it is NOT the same
      string as the sign-in banner's key (import both and assert they differ) — two independent
      dismissals must never share one storage slot.
    - Test 4: with no storage global at all (the node default, and what a server render sees) the
      read returns false rather than throwing.
    - Test 5: the read returns back what the write wrote.
    - Test 6: an unexpected stored value reads as false rather than as dismissed.
    - Test 7: a storage object whose `getItem`/`setItem` throw (Safari private mode, blocked
      cookies) makes neither helper throw, and the read still returns false.

    **`components/design/toolbar-tip.test.ts`** — a source-contract test in the
    `components/viewer/toolbar-button.test.ts` idiom, reading `components/design/toolbar-tip.tsx`
    and `app/design/layout.tsx` as text with comments stripped. Every needle built from string
    parts, never one literal. This file is what proves the three CSS gates in a way no emulator
    can:
    - Test 8: the tip source carries the iOS feature-detection variant and the phone-width
      variant, in that order, on the same class — assert the combined variant prefix appears, and
      that the element's base display class is the hidden one.
    - Test 9: the tip source carries the print-hide attribute exactly once.
    - Test 10: the tip source reads its key and its rule from the shared model module (assert the
      module specifier appears) and never types the key string itself.
    - Test 11: the tip source uses the permanent browser store, not the per-visit one — assert the
      permanent store's name appears at least twice (the read and the write) in the model module
      it imports from, read as text.
    - Test 12: `app/design/layout.tsx` mounts the tip exactly once, and mounts it AFTER the
      sign-in banner (assert the index of the tip's element is greater than the index of the
      sign-in banner's element in the stripped source).
    - Test 13: the tip's strip carries the non-growing flex class, so it cannot steal height from
      the pinned drawing.
  </behavior>
  <action>
    Plain English for the shaper, and this is what the commit subject should say: the first time you
    open a design screen on an iPhone, one short line tells you how to hide Safari's toolbar so the
    board drawing gets the whole screen. Tap Got it and it is gone for good on that phone.

    **`lib/models/toolbar-tip.ts` — the rule and the remembering.**

    Export `TOOLBAR_TIP_DISMISSAL_KEY = "shaper-toolbar-tip-dismissed"`, matching the
    `shaper-`-prefixed naming every stored key in this codebase already uses
    (`shaper-theme`, `shaper-units`, `shaper-sign-in-banner-dismissed`). Keep a module-private
    sentinel value the same way `banner-dismissal.ts` keeps `DISMISSED_VALUE`.

    Export `shouldShowToolbarTip({ dismissed }: ShouldShowToolbarTipInput): boolean` returning
    `!dismissed`. It is a thin rule and the doc comment must say so honestly, and say WHY it is
    still the named place the rule lives: the width gate and the iOS gate are deliberately CSS's
    job, not this function's, so that the element stays in the server-rendered tree with no
    JavaScript width check and no flash between layouts — the same argument
    `components/design/phone-tab-bar.tsx` already makes for itself. One function, one input, and
    the two CSS gates named in prose right beside it so nobody later "fixes" this by pulling the
    platform check into JavaScript.

    Export `readToolbarTipDismissal()` and `writeToolbarTipDismissal()`, both reading and writing
    the browser's PERMANENT per-origin store rather than the per-visit one, and both wrapped in
    try/catch exactly as their sign-in-banner counterparts are, so a node test with no storage
    global, a server render, and a Safari private window all degrade to "not dismissed" instead of
    throwing. The doc comment must state the difference from `banner-dismissal.ts` and the reason:
    the sign-in offer is meant to come back next visit; this advice is read once and acted on
    once, and repeating it every visit would be nagging about something already done. Point at
    `banner-dismissal.ts` by name so a future reader finds the pair.

    Do NOT add this key to `banner-dismissal.ts`. Its own doc comment argues at length for the
    per-visit store; a permanent key in the same file makes that comment a lie.

    **`components/design/toolbar-tip.tsx` — the strip.**

    A `"use client"` component named `ToolbarTip`. Copy the dismissal plumbing from
    `sign-in-banner.tsx` structurally: a module-level `Set` of listeners, an emit function, a
    subscribe function returning its own cleanup, a `getServerDismissed` returning false, and one
    `useSyncExternalStore(subscribe, readToolbarTipDismissal, getServerDismissed)` call. The
    comment above the server-snapshot function must repeat why it returns false — the server cannot
    see the browser's store, so React hydrates against "not dismissed" and re-renders with the real
    value, and there is no hydration warning and no extra frame of a wrongly-shown strip. There is
    no Clerk `isLoaded` gate here, because this tip has nothing to do with being signed in.

    Return `null` when `shouldShowToolbarTip` says so. Otherwise render one `div` carrying:
    - `data-print-hide` — the whole print fix; both existing print stylesheets already hide it.
    - `data-toolbar-tip` — a pixel-inert test hook, the same idiom as `data-drag-target` and
      `data-design-controls-scroll`.
    - Class string, with `hidden` as the base display and the shown display restored only under
      BOTH gates stacked in the order `components/rails/view-full-sized-dialog.tsx` already proves
      compiles — the phone-width variant first, the iOS feature-detection variant second, then
      `flex`. Plus `flex-none` (load-bearing: the editors' own `flex-1`/`min-h-0` sizing chain is
      what pins the drawing, and a growing strip here steals from it), `items-center`, a small gap,
      `bg-surf-canvas`, `px-4 py-2`, and `text-surf-ink` — the sign-in banner's own strip classes,
      copied rather than approximated, so the two strips read as one family when both are up.

    Inside it: a `<p className="text-balance text-sm text-surf-ink">` holding exactly

    `For more drawing room, tap the page menu in Safari's address bar and choose Hide Toolbar.`

    Write a comment above that sentence recording BOTH traps: that the page-menu button is `aA` on
    iOS 17-25 and `…` on iOS 26 so neither glyph may ever be named, and that "Hide Toolbar" is
    Safari's own menu wording and must keep its capitals because a shaper will scan a menu for
    those two words. Add a second comment recording that this deliberately does not mention adding
    the site to the Home Screen — that would remove the toolbar but silently break every Print
    button on iOS — and point at `.planning/debug/phone-print-button-does-nothing.md`.

    Then the dismiss control: the shared `Button` from `@/components/ui/button` at `variant="outline"`
    and the default size, labelled `Got it`, with `onClick` writing the dismissal and emitting the
    change. Use the shared Button precisely so the 44px touch height is INHERITED from
    `coarse:h-11` rather than hand-typed here; say that in a one-line comment. Give it `shrink-0`
    so the sentence wraps instead of the button squashing.

    **`app/design/layout.tsx` — mounting it.**

    Import `ToolbarTip` and render it on the line immediately after `<SignInBanner />`, before
    `{props.children}`. Extend that file's existing doc comment (do not rewrite it) with a sentence
    saying the tip is mounted here for the same reason the sign-in banner is — once, so it appears
    on every design screen and nowhere else — that it sits BELOW the sign-in banner so the standing
    strip the app already ships keeps the position it has held for two phases while the newer,
    one-time, device-specific note sits closest to the drawing it is about to make room for, and
    that the two are deliberately independent: suppressing the tip while the sign-in offer is up
    would mean a shaper who never dismisses that offer never sees the tip at all.

    Nothing else in that file changes. `PhoneTabBar` stays the last child.
  </action>
  <verify>
    <automated>npx vitest run &amp;&amp; npx tsc --noEmit &amp;&amp; npm run lint &amp;&amp; test "$(grep -c '&lt;ToolbarTip' app/design/layout.tsx)" -ge 1 &amp;&amp; test "$(grep -c 'components/design/toolbar-tip' app/design/layout.tsx)" -ge 1 &amp;&amp; test "$(grep -c 'data-toolbar-tip' components/design/toolbar-tip.tsx)" -ge 1 &amp;&amp; test "$(grep -c 'localStorage' lib/models/toolbar-tip.ts)" -ge 2 &amp;&amp; ! grep -q 'manifest' app/layout.tsx</automated>
  </verify>
  <done>
    The whole vitest suite is green including the two new files; TypeScript and lint are clean;
    `app/design/layout.tsx` references `ToolbarTip` exactly twice (the import and the element);
    the strip carries its print-hide and test-hook attributes; the model module reads and writes
    the permanent browser store; and no web app manifest has appeared in the root layout.
  </done>
</task>

<task type="auto">
  <name>Task 2: Prove it in a real browser, and keep every existing phone test green</name>
  <files>e2e/phone-toolbar-tip.spec.ts, e2e/phone-layout.spec.ts, e2e/phone-screens.spec.ts, e2e/phone-rails.spec.ts, e2e/touch-sizing.spec.ts, e2e/keyboard-focus.spec.ts, e2e/desktop-baseline.spec.ts</files>
  <read_first>
    `e2e/phone-layout.spec.ts` lines 1-30 — the `BANNER_DISMISSAL_KEY` constant, the
    `dismissSignInBanner` helper's `addInitScript` shape, and the `test.skip` on the desktop
    project in `beforeEach`.

    `e2e/desktop-baseline.spec.ts` lines 1-40 — the same helper written for the desktop project,
    and how the five screenshots are taken.

    `e2e/touch-sizing.spec.ts` lines 14-35 — it already has TWO init scripts, one for the banner
    and one setting a units preference in the permanent store; the second is the exact shape the
    new dismissal takes.

    `e2e/phone-rails.spec.ts` lines 25-50, `e2e/phone-screens.spec.ts` lines 10-25,
    `e2e/keyboard-focus.spec.ts` lines 15-30 — each file's own copy of the helper.

    `playwright.config.ts` in full — the three projects (`iphone` WebKit, `android` Chromium,
    `desktop` Chromium at 1280x800), `PW_PORT`, and the deliberate non-secret Clerk env values.
  </read_first>
  <action>
    Plain English for the shaper, and this is what the commit subject should say: automated browser
    checks that the new note shows up in the right place, that tapping Got it really does remember
    it forever, and that nothing on a computer screen moved a pixel.

    **First, the honest limitation, written into the new spec's own header comment.** Playwright's
    WebKit is desktop WebKit with a phone profile bolted on and does not implement
    `-webkit-touch-callout`; this was probed directly at planning time and
    `CSS.supports('(-webkit-touch-callout: none)')` came back false on the `iphone` profile (and on
    `android` too). So the tip resolves to `display: none` in every project here, and no test in
    this file may claim to have seen it painted on an emulated iPhone. Record the probe and the
    result in the comment so the next reader does not re-litigate it — and record that the source
    contract test from Task 1 (`components/design/toolbar-tip.test.ts`) is what actually guards the
    CSS gates, since only a real iPhone can prove them visually.

    **New file `e2e/phone-toolbar-tip.spec.ts`.** Its own module-level constants for BOTH keys
    (the specs in this suite each carry their own literal copies rather than importing app code —
    follow that convention). A helper that dismisses only the sign-in banner via `addInitScript`,
    leaving the tip UNdismissed, since this file is the one place the tip must be present.

    Four cases:

    1. *Phone projects, DOM contract.* Skip on `desktop`. Go to `/design/outline`. Assert the
       `[data-toolbar-tip]` element is attached (`toBeAttached()`, never `toBeVisible()` — see the
       header comment). Assert its text contains the two load-bearing fragments: the phrase naming
       the page menu in Safari's address bar, and the exact menu wording with its capitals. Assert
       it names neither glyph — check the text does not contain the older button's two-letter label
       nor an ellipsis character. Assert the element carries the print-hide attribute.

    2. *Phone projects, permanent dismissal.* Skip on `desktop`. Go to `/design/outline`. The Got it
       button cannot be clicked normally — it has no bounding box while the CSS gate holds it at
       `display: none` — so dispatch a click on it (`locator.dispatchEvent('click')`), which React's
       root-level event delegation still handles. Then assert three things in order: the tip
       element is detached; the permanent store now holds the dismissal key; and after
       `page.reload()` the tip is STILL detached. Finally navigate to a second design screen
       (`/design/rails`) and assert it is detached there too — "once per phone", not "once per
       screen". Add a comment explaining why a dispatched click is used and that it is a limitation
       of testing a CSS-gated element in an emulator, not a shortcut.

    3. *Phone projects, conditional visibility — switches itself on when the emulator catches up.*
       Skip on `desktop`. Evaluate `CSS.supports('(-webkit-touch-callout: none)')` in the page. If
       it is false, `test.skip()` with the message naming the emulator limitation, so the run
       REPORTS the gap rather than hiding it. If it is ever true, assert the tip is visible, that
       its bounding box spans the viewport width, and that the Got it button's box is at least 44px
       tall. Write it so the day Playwright's WebKit implements the property, this case starts
       proving the real thing with no edit.

    4. *Desktop project, the guard.* Skip on every project except `desktop`. Go to
       `/design/outline` with the tip UNdismissed and assert `[data-toolbar-tip]` is attached but
       hidden — a real, passing assertion at 1280px, because the phone-width variant alone already
       holds it at `display: none` there regardless of the iOS gate. Assert its computed display is
       the hidden one. This is the case that proves a desktop shaper can never see it.

    **Then the init-script insurance in six existing specs.** In each of `e2e/phone-layout.spec.ts`,
    `e2e/phone-screens.spec.ts`, `e2e/phone-rails.spec.ts`, `e2e/touch-sizing.spec.ts`,
    `e2e/keyboard-focus.spec.ts` and `e2e/desktop-baseline.spec.ts`: add a module-level constant
    holding the tip's key beside the existing banner-key constant, and extend that file's existing
    dismissal helper to also write the tip's dismissal into the permanent store in the same
    `addInitScript` (or a second one, matching whatever shape that file already uses — `touch-sizing.spec.ts`
    already has two, so follow its lead there). Rename nothing and restructure nothing else.

    One shared comment line in each file explaining WHY, accurately: today this changes no
    measurement, because the tip is already `display: none` in the emulator; it is there so that if
    Playwright's WebKit ever implements `-webkit-touch-callout`, a strip does not silently appear
    above every pinned-height and bounding-box assertion in the phone suite.

    Do NOT touch `e2e/touch-drag.spec.ts` or `e2e/desktop-regression.spec.ts`. Neither dismisses
    the sign-in banner today either; both locate live bounding boxes rather than fixed offsets, and
    desktop-regression runs at a width where the tip cannot paint at all. Adding a dismissal to
    them would be cargo cult.

    **Finally, the pixel proof.** Re-run the desktop baseline screenshots and require all five to
    match with no baseline regenerated. `--update-snapshots` is forbidden in this task under every
    circumstance; if a baseline moves, the CSS gate is wrong and Task 1 must be fixed, not the
    screenshot.
  </action>
  <verify>
    <automated>PW_PORT=3119 npx playwright test &amp;&amp; test "$(grep -l 'shaper-toolbar-tip-dismissed' e2e/phone-layout.spec.ts e2e/phone-screens.spec.ts e2e/phone-rails.spec.ts e2e/touch-sizing.spec.ts e2e/keyboard-focus.spec.ts e2e/desktop-baseline.spec.ts | wc -l | tr -d ' ')" = "6" &amp;&amp; ! grep -q 'shaper-toolbar-tip-dismissed' e2e/touch-drag.spec.ts e2e/desktop-regression.spec.ts &amp;&amp; test -z "$(git status --porcelain e2e/desktop-baseline.spec.ts-snapshots/)"</automated>
  </verify>
  <done>
    The full Playwright suite passes on all three projects with `PW_PORT=3119`, including the four
    new cases (case 3 reporting as skipped with its emulator-limitation message, which is the
    honest current state); all six existing specs carry the tip's dismissal in their init script;
    `touch-drag.spec.ts` and `desktop-regression.spec.ts` are untouched; and
    `e2e/desktop-baseline.spec.ts-snapshots/` has no modified file — the five desktop screenshots
    matched without being regenerated.
  </done>
</task>

</tasks>

<execution_constraints>

- Work in a **git worktree**, never directly on the founder's checkout. Port 3000 is the founder's
  own dev server and must never be taken.
- Run `npm install --no-audit --no-fund` **once** in the worktree before any Playwright command.
- Every Playwright invocation carries `PW_PORT=3119`.
- Browsers are already installed. **Never run `npx playwright install`.**
- **Never** pass `--update-snapshots` to Playwright, for any reason.
- Use `npx vitest run` — never bare `vitest` (it watches and hangs).
- `npx tsc --noEmit` and `npm run lint` must both be clean before either commit.
- `npm run build` is run **on main after merge, by the orchestrator** — Turbopack will not resolve
  `next` from inside a worktree.
- Do **not** edit anything under `lib/geometry/`, any viewer component, `components/ui/*`, or
  `e2e/desktop-baseline.spec.ts-snapshots/`.
- Do **not** add a web app manifest, a `display: standalone` setting, or any "Add to Home Screen"
  prompt — that path breaks printing on iOS.
- Commit subjects are written for a shaper, not a developer: what changes on the board or the
  screen, never which component re-renders.

</execution_constraints>

<verification>

1. `npx vitest run` — the whole suite green, including `lib/models/toolbar-tip.test.ts` and
   `components/design/toolbar-tip.test.ts`.
2. `npx tsc --noEmit` — clean.
3. `npm run lint` — clean.
4. `PW_PORT=3119 npx playwright test` — all three projects green; the five desktop baseline
   screenshots match with no snapshot file modified in git.
5. `git status --porcelain e2e/desktop-baseline.spec.ts-snapshots/` — empty.
6. `grep -rn 'manifest' app/layout.tsx public/ 2>/dev/null` — no web app manifest was added.

</verification>

<success_criteria>

- A shaper opening a design screen on an iPhone for the first time sees one short line telling them
  how to hide Safari's toolbar, with a Got it button under their thumb at a full 44px.
- Tapping Got it removes it immediately and permanently on that phone — across screens, across
  reloads, across visits.
- It never appears on Android, never on a computer at any width, and never on paper.
- The visibility rule and the remembering live in one pure, tested module beside the sign-in
  banner's own, with the same storage-failure discipline and a doc comment recording why this one
  is permanent and that one is not.
- No board number, no drawing, and no desktop pixel changed.

</success_criteria>

<output>
Create `.planning/quick/260909-hny-a-one-time-tip-on-a-phone-explains-how-t/260909-hny-SUMMARY.md` when done
</output>
