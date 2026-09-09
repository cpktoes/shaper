---
status: diagnosed
trigger: "G-09-4: On a desktop browser, tabbing through the design screens gives no visible indication of which slider has keyboard focus, and the tail-shape icon buttons on TEMPLATE barely show focus either."
created: 2026-09-09T16:00:00Z
updated: 2026-09-09T16:35:00Z
mode: symptoms_prefilled, goal=find_root_cause_only
---

## Current Focus
<!-- OVERWRITE on each update - reflects NOW -->

bug_class: bohrbug (deterministic — same DOM, same CSS, every Tab press)
state: ROOT CAUSE CONFIRMED (diagnose-only; no fix applied). Throwaway probes deleted; screenshots + JSON remain in the session scratchpad only.

reasoning_checkpoint:
  hypothesis: "Slider keyboard focus is invisible because the focus-visible ring is declared on the thumb DIV while Base UI focuses a clip-hidden nested <input>; tail tiles are faint because they have no focus style and inherit a 50%-opacity ring colour for the browser's fallback outline."
  confirming_evidence:
    - "Probe: after Tab, activeElement is INPUT[type=range]; thumb.matches(':focus-visible')=false; thumb box-shadow none; --tw-ring-shadow never set; screenshot shows bare thumb"
    - "Counterfactual: focusing the DIV itself (tabindex added) paints the 3px ring — the ring CSS is fine, only the selector target is wrong"
    - "Base UI source: tabIndex/type=range/keyboard handlers all on the nested input; input styled clip-path inset(50%); data-focused only via Field.Root"
    - "Tail tile: outline 'auto 1px oklab(0.468.../0.5)', box-shadow none — the browser's fallback ring in the base layer's ring/50 colour"
  falsification_test: "If Tab had landed on the DIV (activeElement = [data-slot=slider-thumb]) or the thumb's computed box-shadow had carried a 3px ring under keyboard focus, H1 would be false. Neither happened."
  fix_rationale: "Key the thumb ring on `:has(:focus-visible)` (Tailwind `has-focus-visible:`) or a `.slider-accent [data-slot=slider-thumb]:has(:focus-visible)` rule in globals.css — this matches the element Base UI actually focuses. Give the hand-rolled selection buttons an explicit focus-visible ring in the palette's accent at full opacity so they no longer depend on the browser fallback. Both are focus-only additions, so the at-rest desktop baselines stay pixel-identical."
  blind_spots: "Firefox not measured (not installed for Playwright); Safari measured only via Playwright WebKit's default keyboard mode, which never reaches these controls with plain Tab. Dark theme (slate) not screenshotted — same mechanism, ring #3490bc/50 on #12141a."
  candidate_causes:
    - "code: focus-visible ring on the thumb DIV, not on the focused nested input (C1) — CONFIRMED"
    - "code: hand-rolled tail/fin/rail buttons carry no focus style (C2) — CONFIRMED"
    - "config: --ring = --surf-accent-ink used at 50% opacity in base layer and shadcn rings (C3) — CONFIRMED as amplifier"
    - "config: .slider-accent [data-slot=slider-thumb] rule clobbering box-shadow — ELIMINATED (sets only border-color/background)"
    - "environment: dependency bump in phase 9 changing Base UI focus behaviour — ELIMINATED (package.json/lock unchanged for @base-ui/react 1.7.0)"
    - "data: none — no dependence on board values"
  and_gate: "Sliders: no — C1 alone fully accounts for 'no indicator' (even a full-opacity ring would not paint on an unmatched selector). Tail tiles: yes — 'barely' needs C2 (no own style, so the fallback outline is all there is) AND C3 (that fallback is painted at 50% of a muted token); fixing either alone would change the picture."

hypothesis_H1 (sliders): Keyboard focus lands on Base UI's nested visually-hidden `<input type="range">` inside the thumb, never on the `[data-slot=slider-thumb]` div. Tailwind compiles `focus-visible:ring-3` to `.focus-visible\:ring-3:focus-visible` on the DIV, so the selector never matches under keyboard navigation; the input's own default outline is clipped away by `clip-path: inset(50%)`. Net: zero focus indicator on every slider. (Mouse hover/active still key on the div itself, which is why the mouse path looks fine.)
hypothesis_H2 (tail-shape buttons): Hand-rolled `<button>`s have no focus style and no `outline-none`, so they get the browser's default `:focus-visible { outline: auto }`. The base layer `* { outline-ring/50 }` sets every element's outline-color to `--surf-accent-ink` (#48605c) at 50% — Chromium draws the auto ring in that colour, so it's a faint grey-green halo, "barely" visible.
test: throwaway e2e/zz-focus-probe.spec.ts — Tab through /design/outline in Chromium desktop, log activeElement (tag/type), thumb.matches(':focus-visible'), thumb computed box-shadow, tail button computed outline; screenshots; hover differential; forced-div-focus counterfactual.
expecting: H1 true → activeElement is INPUT[type=range], thumb.focusVisible=false, thumb.hasFocusVisible=true, thumb boxShadow 'none' (no 3px ring); hover → 3px ring present; forced div focus → ring present. H1 false → activeElement is the DIV and a 3px ring is in box-shadow. H2 true → tail button outline 'auto Npx rgba(72,96,92,0.5)-ish'.
next_action: hand ROOT CAUSE FOUND back to the orchestrator; a planner picks up the fix (has-focus-visible ring on the slider thumb via the .slider-accent hook in globals.css, plus an explicit accent focus ring on every hand-rolled selection button), then re-run `npm run test:e2e -- --project=desktop` to prove the at-rest baselines are unchanged and add a keyboard-focus e2e that Tabs to a slider and asserts a non-`none` thumb box-shadow

## Symptoms
<!-- Written during gathering, then IMMUTABLE -->

expected: On a desktop browser at least 820px wide, across all five design screens, tabbing to every sidebar control shows clearly which control is focused (visible focus ring on slider thumbs, buttons, checkboxes and selects), and every control behaves exactly as before this phase.
actual: Everything works, but keyboard focus is invisible on the sliders and barely visible on the tail-shape buttons. User: "all functions but you cannot tell which slider you're on when tabbing though, theres no indicator which you've selected and even the tail shape icons barely show which is currently selected wiht the tab"
errors: None reported.
reproduction: Test 4 in .planning/phases/09-the-design-screens-on-a-phone/09-UAT.md — open /design/outline on a desktop browser (>=820px), press Tab repeatedly through the sidebar, watch slider thumbs and tail-shape grid. Locally: Playwright `desktop` project (Chromium 1280x800), Tab until a slider thumb is document.activeElement, read computed box-shadow/outline, screenshot.
started: Discovered during end-of-phase UAT on 2026-09-09 on build 5c1627f. Orchestrator suspects pre-existing (slider thumb has carried focus-visible:ring-3 ring-ring/50 focus-visible:outline-hidden since 47f4ae9; tail-shape buttons never had a focus style).

## Eliminated
<!-- APPEND only - prevents re-investigating -->

- hypothesis: The app's `.slider-accent [data-slot="slider-thumb"]` rule in globals.css overrides the Tailwind ring's box-shadow (unlayered CSS beating @layer utilities).
  evidence: The rule sets only `border-color` and `background` (globals.css lines 711-714); the thumb's computed box-shadow under forced DIV focus shows the 3px ring intact.
  timestamp: 2026-09-09T16:07

- hypothesis: `--color-ring` is unset/transparent, so the ring paints as nothing.
  evidence: Runtime tokens: --ring = --color-ring = #48605c (daylight); the ring visibly paints on hover, forced focus, Select and Checkbox.
  timestamp: 2026-09-09T16:25

- hypothesis: Phase 9 regressed focus behaviour (via the `coarse:after:-inset-4` hit ring, a dependency bump, or a globals.css change).
  evidence: Thumb classes identical to 47f4ae9 apart from the coarse hit ring; package.json diff adds only Playwright; lockfile still resolves @base-ui/react 1.7.0; globals.css diff adds only the coarse variant and --breakpoint-shell. The `after:` pseudo has no background and cannot hide a box-shadow.
  timestamp: 2026-09-09T16:21

- hypothesis: The thumb's `after:-inset-2` pseudo-element paints over the ring.
  evidence: The pseudo has no background/border; the ring is visible through it on hover and forced focus.
  timestamp: 2026-09-09T16:20

## Evidence
<!-- APPEND only - facts discovered -->

- timestamp: 2026-09-09T16:00
  checked: .planning/debug/knowledge-base.md (worktree and main checkout)
  found: No knowledge base file exists; five prior resolved sessions in .planning/debug/ are about units/printing, none about focus.
  implication: No known-pattern candidate. Proceed with open investigation.

- timestamp: 2026-09-09T16:05
  checked: git show 47f4ae9:components/ui/slider.tsx vs HEAD; git diff 47f4ae9 HEAD -- app/globals.css
  found: Thumb class string identical except phase 9 inserted `coarse:after:-inset-4`. Pre-phase thumb already carried `ring-ring/50 ... focus-visible:ring-3 focus-visible:outline-hidden`. globals.css diff adds only `@custom-variant coarse` and `--breakpoint-shell: 820px` — no ring/focus/outline change.
  implication: Nothing in phase 9 touched focus styling of the slider or the palette's ring token. Strong evidence this is pre-existing, not a phase-9 regression (to be confirmed empirically).

- timestamp: 2026-09-09T16:06
  checked: app/globals.css ring token chain and base layer
  found: `--ring: var(--surf-accent-ink)` (line 545), bridged by `--color-ring: var(--ring)` (line 377). `--surf-accent-ink` = #48605c (daylight) / #3490bc (slate). Base layer (line 617): `* { @apply border-border outline-ring/50; }` — every element's outline-color is ring at 50%. Sidebar ground = #ffffff (daylight).
  implication: The ring token IS defined and is a muted grey-green; at 50% opacity over white it lands near #a3afad (~2.3:1 vs white, under the 3:1 UI boundary). The hand-rolled buttons inherit an outline-color of that same 50% mix, so any browser-default focus outline they still get is drawn faintly.

- timestamp: 2026-09-09T16:07
  checked: app/globals.css `.slider-accent` rules (lines 700-714)
  found: `.slider-accent [data-slot="slider-thumb"] { border-color: var(--surf-ink); background: var(--surf-accent); }` — no box-shadow, no outline.
  implication: The app's own slider styling does not overwrite the Tailwind ring box-shadow. Eliminated as the ring-suppressor.

- timestamp: 2026-09-09T16:08
  checked: components/outline/outline-controls.tsx (tail-shape grid, line 329-358), components/fins/fin-controls.tsx (PillButton line 110, tail-shape/fin-setup grids line 414-455), rails/rail-controls.tsx, design/fine-adjust-group.tsx
  found: Every hand-rolled <button> on the design screens has no focus-visible class and no outline-none; they rely on the browser default `:focus-visible { outline: auto }`. shadcn's Button/Checkbox/Select/Input all carry `outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50`.
  implication: Two distinct mechanisms to test: (a) sliders — the ring utility might never fire; (b) buttons — the default outline fires but is coloured by the base layer's `outline-ring/50`.

- timestamp: 2026-09-09T16:12
  checked: node_modules/@base-ui/react/slider/thumb/SliderThumb.js (v1.7.0), SliderThumbDataAttributes.js, @base-ui/utils/visuallyHidden.js
  found: Thumb "Renders a <div> element and a nested <input type='range'>" (line 56). `tabIndex`, `type: 'range'`, onKeyDown/onFocus/onBlur are all on the INPUT (lines 244-364). The input's style is `visuallyHidden` (position fixed, clip-path inset(50%), overflow hidden) with width/height 100%. The DIV has only onPointerDown + positioning style. `data-focused` on the thumb exists only "when wrapped in Field.Root" — components/ui/slider.tsx does not wrap in Field.Root.
  implication: Under keyboard navigation the focused element is the hidden input; the thumb div is never `:focus-visible`, so the shadcn class `focus-visible:ring-3` on the div cannot fire. `hover:ring-3`/`active:ring-3` do fire (pointer events hit the div). This is the mechanism for H1 — to be confirmed by measurement.

- timestamp: 2026-09-09T16:20
  checked: Playwright probe (throwaway e2e/zz-focus-probe*.spec.ts, desktop project, Chromium 1280x800 at deviceScaleFactor 3) — screenshots in scratchpad
  found: chromium-slider-focused.png (after Tab reaches a slider): bare thumb, NO ring. chromium-slider-hover.png (taken after moving the mouse onto the same thumb): 3px grey-green halo present in the picture (the JS computed-style read, taken before Chromium's deferred hover update, still reported none — treat the screenshot as the hover evidence, the forced-focus run below as the decisive one). chromium-slider-forced-div-focus.png (tabindex=0 added to the DIV and focused with focusVisible): same 3px halo present. chromium-tail-focused.png: faint grey-green rounded outline around the "Pin" tile. chromium-checkbox-focused.png / chromium-select-focused.png: grey-green ring visible (shadcn ring-3 ring-ring/50 + border-ring).
  implication: H1 CONFIRMED visually — the ring CSS itself is correct and paints whenever the DIV matches (hover, forced focus); it never paints under real keyboard focus because the DIV is not the focused element. H2 consistent — the tail tiles do get a browser auto outline, coloured by the base layer's ring/50, low contrast on white.

- timestamp: 2026-09-09T16:21
  checked: git diff 47f4ae9 HEAD -- package.json; git log 47f4ae9..HEAD on slider.tsx / globals.css / outline-controls / fin-controls; git log -S 'focus-visible:ring-3' -- components/ui/slider.tsx; git log -S '@base-ui/react' -- package.json
  found: package.json diff adds only @playwright/test and two scripts — @base-ui/react (^1.7.0), tailwindcss, shadcn unchanged. `focus-visible:ring-3` on the thumb dates from c408bb0 (quick-260818-kvp-03, the original outline editor build); Base UI from d51e1b6 (scaffold). Phase 9 commits touching these files: 4121b5b, 8be04c7, cc60907, 39eb654, effe16e, 48a6b8f — sizing/layout only (coarse: hit ring, min-h-11, fine-adjust fold, breakpoint).
  implication: NOT a phase-9 regression. The deployed site before phase 9 shipped the same Base UI thumb markup, the same focus classes and the same ring token, so it had the same invisible keyboard focus on sliders and the same faint tail tiles.

- timestamp: 2026-09-09T16:25
  checked: chromium-focus-probe.json (computed styles logged at each Tab on /design/outline, Chromium desktop 1280x800)
  found: Tab order: nav links (0-6), Settings, Save, two Select triggers (9-10), then step 11 = first slider. At step 11 activeElement is `INPUT type=range` (no data-slot), `input.matches(':focus-visible')=true`, input computed: position fixed, 10x10px, overflow hidden, `outline: auto 1px oklab(0.468 -0.029 -0.002 / 0.5)`. Its parent thumb DIV: `matches(':focus-visible')=false`, `:focus-within`=true, `:has(:focus-visible)`=true, `box-shadow: none`, `--tw-ring-shadow: 0 0 #0000` (never set), `--tw-ring-color: color-mix(in oklab, #48605c 50%, transparent)`. ArrowRight moved the value 72 -> 73 (keyboard works). Forced `focus({focusVisible:true})` on the DIV (tabindex added): `:focus-visible`=true and `box-shadow: ... oklab(0.468.../0.5) 0 0 0 3px` — the ring paints. Compiled CSS: `.focus-visible\:ring-3:focus-visible { --tw-ring-shadow: ... 3px ...; box-shadow: ... }` — keyed on the element carrying the class (the DIV). Tokens at runtime: --ring = --color-ring = --surf-accent-ink = #48605c; sidebar #fff; accent #8ec1b8; ink #1f2a3b.
  implication: H1 CONFIRMED by measurement. The slider's keyboard-focus ring is a `:focus-visible` rule on the wrong element — the thumb DIV, which Base UI never focuses; the element that IS focused is a 10x10 fixed, clip-path-hidden input whose own auto outline is clipped away. Nothing is painted.

- timestamp: 2026-09-09T16:26
  checked: chromium-focus-probe.json step 25 (tail tile "pin"), step 9 (Select trigger), step 36 (Checkbox)
  found: Tail tile: `matches(':focus-visible')=true`, `outline: auto 1px oklab(0.468 -0.029 -0.002 / 0.5)` (Chromium's UA focus ring, drawn in the base layer's `outline-ring/50` colour), `box-shadow: none`. Select trigger and Checkbox: `outline: none`, `box-shadow: ... oklab(0.468.../0.5) 0 0 0 3px` (shadcn's focus-visible:ring-3 ring-ring/50) — both visible in screenshots as a muted grey-green halo.
  implication: H2 CONFIRMED. The tail tiles have no focus style of their own; the only indicator is the browser's automatic outline, whose colour the app's base layer overrides to the muted accent-ink at 50% (~#a3afad on white, ~2.3:1). Faint, hence "barely". The shadcn controls use the same 50% ring colour at 3px — visible but equally muted; a consistent fix should raise this contrast for all of them.

- timestamp: 2026-09-09T16:27
  checked: webkit-focus-probe.json (Playwright WebKit, same page)
  found: 90 Tabs cycled only through: Settings, Save, the two Select triggers, the Checkbox, "Copy preset values", "Export Template", BODY. Never a slider input, never a tail tile, never a nav link. Forced DIV focus paints the same 3px ring as Chromium.
  implication: Secondary, platform-level: Playwright's WebKit mirrors Safari's default keyboard mode (Tab reaches only controls with an explicit tabindex / text fields / pop-ups). In default Safari a shaper cannot Tab onto a slider or tail tile at all (Option+Tab would); the UAT report — arrow keys worked — means the tester was in a browser that does reach them (Chrome/Edge/Firefox, or Safari with full keyboard access). Not the root cause; note for the planner.

- timestamp: 2026-09-09T16:32
  checked: chromium-focus-probe2.json — tabindex attributes, hidden-input geometry, programmatic input focus
  found: tabindex: slider hidden input = none (native), thumb DIV = none, tail tile = none, nav link = none; Select trigger / Checkbox / Save = "0" (Base UI's useButton). Hidden input computed: `clip-path: inset(50%)`, position fixed, 10x10px exactly over the thumb, overflow hidden. Focusing the input with focusVisible: activeElement=input, `input:focus-visible`=true, `thumb:focus-visible`=false, `thumb:has(:focus-visible)`=true, `thumb:focus-within`=true, thumb `box-shadow: none`, input `outline: auto 1px oklab(0.468.../0.5)` (clipped to nothing by inset(50%)).
  implication: Exactly the elements WebKit tabbed to are the ones with an explicit tabindex="0" — supports the Safari-default-mode reading above. And it pins the fix's selector: `:has(:focus-visible)` (Tailwind `has-focus-visible:`) on the thumb matches under keyboard focus; `:focus-visible` on the thumb never does. Base UI's `data-focused` on the thumb comes only from Field.Root's fieldState (SliderRoot.js line 219), which this app does not use.

- timestamp: 2026-09-09T16:33
  checked: the other four design screens' controls, statically
  found: Every slider on ROCKER/RAILS/VOLUME/FINS renders through the same components/ui/slider.tsx (via SliderRow or directly, all with className="slider-accent"). FINS' PillButton (fin-controls.tsx line 110), its tail-shape and fin-setup grids (lines 414-455), RAILS' section-toggle buttons (rail-controls.tsx line 85) and the Reset Advanced link-button (line 341) are all hand-rolled <button>s with no focus style, same as the TEMPLATE tail tiles.
  implication: Both mechanisms are component-level, so they reproduce identically on all five screens; the fix belongs in the shared slider styling and one shared treatment for the hand-rolled selection buttons.

## Resolution
<!-- OVERWRITE as understanding evolves -->

root_cause:
  - C1 (code, sliders — "no indicator"): components/ui/slider.tsx puts the keyboard focus ring (`focus-visible:ring-3 focus-visible:outline-hidden`) on the `SliderPrimitive.Thumb` DIV, but Base UI v1.7.0 gives keyboard focus to a nested, visually-hidden `<input type="range">` (clip-path inset(50%), 10x10px). The DIV is never `:focus-visible`, so the ring rule never matches; the input's own browser outline is clipped away. Result: zero focus indication on every slider, on all five screens. Mouse hover/active rings still key on the DIV, which is why the mouse path looks normal.
  - C2 (code, tail-shape tiles — "barely"): the hand-rolled <button>s in components/outline/outline-controls.tsx (and their FINS/RAILS siblings) have no focus style of their own, so the only indicator is the browser's automatic `outline: auto` ring …
  - C3 (config/palette, amplifier for C2 and for every shadcn ring): app/globals.css maps `--ring` to `--surf-accent-ink` (#48605c) and the base layer paints every element's outline in that colour at 50% (`* { outline-ring/50 }`); shadcn's own rings are `ring-ring/50` too. On the white sidebar that mix is roughly #a3afad (~2.3:1), so wherever a focus ring DOES paint it is a faint grey-green halo. C2 AND C3 together are what makes the tail tiles "barely" show focus.
  regression: NO — pre-existing since the outline editor was first built (c408bb0); phase 9 changed only hit-area sizing (`coarse:after:-inset-4`, `coarse:min-h-11`), no dependency versions, no ring/focus CSS. The deployed site before phase 9 behaved identically.
fix: (diagnose-only session — not applied)
verification: (n/a)
files_changed: []
