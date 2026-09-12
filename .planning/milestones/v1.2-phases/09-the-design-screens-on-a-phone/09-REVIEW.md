---
phase: 09-the-design-screens-on-a-phone
reviewed: 2026-09-09T00:00:00Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - app/globals.css
  - components/ui/button.tsx
  - components/ui/checkbox.tsx
  - components/ui/input.tsx
  - components/ui/select.tsx
  - components/outline/outline-controls.tsx
  - components/fins/fin-controls.tsx
  - components/rails/rail-controls.tsx
  - components/design/fine-adjust-group.tsx
  - e2e/keyboard-focus.spec.ts
  - components/rails/view-full-sized-dialog.tsx
  - components/rails/view-full-sized-dialog.test.ts
  - e2e/phone-rails.spec.ts
findings:
  critical: 1
  warning: 2
  info: 0
  total: 3
status: issues_found
---

# Phase 09 (gap closure): Code Review Report

**Reviewed:** 2026-09-09
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

This is a gap-closure review of the two plans that ran after the phase's own UAT: G-09-4 (keyboard
focus, plan 09-08) and G-09-6 (the phone Print button, plan 09-09). I reviewed the diff against
`a04a5b5` only, not the whole phase.

G-09-4's part is clean. The `:has(:focus-visible)` fix for the slider thumb is correctly targeted —
I confirmed Base UI's Slider really does put real keyboard focus on a hidden nested `<input
type="range">`, so keying the ring off the DIV that *contains* the focused element is the right
mechanism, and because the new rule is unlayered it deliberately outranks the thumb's existing
layered hover/active rings, exactly as the file's own comment describes. I also checked whether the
new `.focus-ring-accent` class or the `ring-ring/50` → `ring-ring` bump in the four shadcn primitives
could paint on a mouse click — they can't, by the same `:focus-visible` heuristic already relied on
elsewhere in the app — and I checked whether Base UI's `Checkbox` has the same hidden-nested-input
problem as `Slider` (it does not: its native `<input>` carries `tabIndex={-1}` and
`aria-hidden`, and real focus lands on the `<span role="checkbox">` that already carries the ring
classes, so the checkbox change is fully effective). All thirteen `focus-ring-accent` call sites
line up with every hand-rolled `<button>` in the four patched control files; none was missed.

G-09-6's mechanism (a CSS-only `max-shell:[@media(display-mode:standalone)]:` gate) is what I'd
flag. I compiled the exact class strings through this repo's own `@tailwindcss/postcss` to confirm
they produce valid, correctly-nested `@media` rules (they do), and traced through the D-13 phone
sentence, the footer's `data-print-hide` scoping, and the print-only paths to confirm none of this
reaches paper (it doesn't) and that the desktop dialog is untouched (it is). But the underlying
premise — that "launched as a Home-Screen web app" is the same thing as "window.print() is a silent
no-op, so tell the shaper to open Safari" — is true only for the one platform this was researched on
(iOS 26 Safari). The CSS condition it ships behind, `display-mode: standalone`, is not iOS-specific
at all, and I traced a concretely reachable case where it fires for a shaper for whom neither the
diagnosis nor the advice holds. See CR-01.

## Critical Issues

### CR-01: The Home-Screen print note assumes iOS/Safari, but its CSS trigger is not iOS-specific

**File:** `components/rails/view-full-sized-dialog.tsx:279-299`
**Issue:**

The whole fix is scoped to `.planning/debug/phone-print-button-does-nothing.md`'s finding that
`window.print()` is a documented silent no-op specifically **inside an iOS Home-Screen web app**
(iOS 26's "Open as Web App" default). Every piece of research in that debug doc, and every sentence
of the plan's `<objective>`, is about iPhone/iOS/Safari — there is no evidence anywhere that Chromium
(desktop or Android) has the same `window.print()` defect in a standalone window.

But the condition the fix actually gates on is `display-mode: standalone` — a plain CSS media
feature that is true for *any* browser's installed/standalone window, on any OS, regardless of
whether that browser has the iOS bug. Two concretely reachable cases where this ships the wrong
thing:

- **Desktop Chrome/Edge, "Open as window."** Any site — no web app manifest required — can be
  installed via Chrome's menu → "Cast, save, and share" → "Create shortcut" → "Open as window" (or
  the address-bar app-install icon Chromium offers on plenty of ordinary sites). That produces a
  `display-mode: standalone` window. If a shaper resizes that window below the 820px `--breakpoint-
  shell`, `max-shell:` also matches, and the Print button vanishes, replaced by "Printing isn't
  available from the Home-Screen app — open this page in Safari to print the full-sized rail." That
  shaper may well be on Windows or Linux, where Safari does not exist, and desktop Chrome's
  `window.print()` inside an installed app window is not known to be broken at all — the fix removes
  a working control and replaces it with unusable advice.
- **Android home-screen shortcuts**, the platform the plan's own e2e case (`android`, chosen only
  because it's the one engine Playwright's CDP can drive) exercises to prove the CSS gate — the same
  `display-mode: standalone` fires there too if the shaper's Android install path ever produces a
  standalone launch. "Open this page in Safari" is not actionable on Android.

The plan text (`09-09-PLAN.md`) never discusses non-iOS shapers as an audience; `android` appears in
it purely as the CDP-capable test engine, not as a platform this behavior was meant to affect. This
reads as an unexamined generalization from "I proved this on iOS" to "I'll gate on the CSS feature
that happens to be true on iOS," without checking that the same feature is also true — for different,
unverified reasons — everywhere else a standalone window exists.

**Fix:** Narrow the condition (or the copy) to the platform the diagnosis actually covers. Two
options, in order of how little they disturb this plan's existing shape:

```tsx
// Keep the CSS-only rule, but stop naming a browser the visitor may not have — the underlying
// promise ("this control is offered wherever it works") stays honest for every platform we
// have NOT verified is affected:
<p className="hidden text-sm text-surf-ink-muted max-shell:[@media(display-mode:standalone)]:block">
  {"Printing isn't available from a Home-Screen app on this device. Open this page in your browser instead to print the full-sized rail."}
</p>
```

or, if the copy must keep naming Safari specifically (because that is the one documented case),
scope the media condition to iOS as well so it cannot fire for a Chromium standalone window — e.g.
combine `display-mode: standalone` with a `pointer: coarse` and a UA-independent iOS signal is not
available in CSS, so the safer fix given the "CSS only, no JS" constraint is the copy change above,
not a platform-specific selector.

## Warnings

### WR-01: The one behavior this plan exists to ship has no real automated coverage

**File:** `e2e/phone-rails.spec.ts:230-273`, `components/rails/view-full-sized-dialog.test.ts:250-262`
**Issue:** Every automated check that touches the standalone-mode swap either (a) asserts against the
*source text* of the JSX (regex over the stripped `.tsx`, which can't catch a broken or mistyped
Tailwind arbitrary-variant selector — only that some string containing `display-mode:standalone`
exists somewhere in the file), or (b) is the one e2e case built to actually render the CSS, which
self-skips because "this Chromium build's `Emulation.setEmulatedMedia` does not honour a
`display-mode` feature override." That leaves zero automated coverage of the actual computed styles
a shaper would see in the one context this whole plan was written for. A typo in the arbitrary
variant (e.g. a stray space breaking Tailwind's bracket parsing, or `standalone` misspelled) would
still satisfy every `grep`-shaped acceptance criterion and every vitest case, and the Playwright
suite would report green on all three projects. The plan itself acknowledges this gap and defers to
a human on a real iPhone, which is a reasonable fallback for the *iOS* case, but there is no
equivalent verification path at all for CR-01's non-iOS cases, since nobody is checking those.
**Fix:** At minimum, add one Playwright test that manually forces the CSS condition without relying
on browser emulation — e.g. inject a stylesheet or `page.emulateMedia`-equivalent override (Chromium
supports forcing `prefers-color-scheme` via `page.emulateMedia`, but Playwright has no
`display-mode` equivalent either; a pragmatic substitute is a `page.addStyleTag` that overrides
`:root` with a custom property the component *could* read, or — more directly — write a small
Vitest/Testing-Library test that renders the component with `matchMedia` mocked... but note the
component intentionally reads no JS state for this, so the only way to verify the *rendered* CSS
today is a real device or a Chromium build whose CDP does honor `display-mode`). Track this as an
open verification gap rather than letting the self-skip read as coverage.

### WR-02: `tabUntil`'s 150-press ceiling is an unmeasured magic number

**File:** `e2e/keyboard-focus.spec.ts:52-74`
**Issue:** The ceiling is chosen by feel ("a generous ceiling") rather than derived from or asserted
against the actual number of focusable elements between page load and the target control. Every
future control added to the header, the nav, or the controls sidebar ahead of the first slider thumb
or the "pin" tile silently eats into this margin. When the ceiling is eventually exceeded, the
failure ("tabUntil: never reached [what] within 150 Tab presses") reads identically whether the ring
genuinely regressed or a new unrelated control simply pushed the target past position 150 — there's
no signal distinguishing "increase the ceiling" from "the fix broke."
**Fix:** Not blocking, but consider deriving the ceiling from a live count (e.g. `document.querySelectorAll('button, [tabindex]:not([tabindex="-1"]), a[href], input, select').length` at test start, with a small multiplier) so the ceiling scales with the page instead of being a fixed constant that has to be manually revisited.

---

_Reviewed: 2026-09-09_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
