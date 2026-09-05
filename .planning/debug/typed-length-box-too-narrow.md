---
status: diagnosed
trigger: "G-06-4 — On Metric, the typed Board Length box (the shared MeasureField) is not big enough for its text."
created: 2026-09-05T22:00:00Z
updated: 2026-09-05T22:20:00Z
mode: find_root_cause_only
symptoms_prefilled: true
---

## Current Focus
<!-- OVERWRITE on each update - reflects NOW -->

hypothesis: CONFIRMED — `MeasureField` hard-codes the retired `ImperialField`'s 64px box (`w-16 min-w-16 max-w-16`, 6px side padding, 1px border → a 50px content box). That box was tuned for short bare fraction cells in the ROCKER datasheet; a Metric Board Length string (`NNN.N cm`) measures 59–63px in Inter at 14px, so 9–13px of it is cut off in every one of the three sidebars.
test: Headless Chrome (the machine's Google Chrome 152) rendering the dev server's own Inter woff2 at 14px/400: canvas `measureText` for every string the field can produce, plus a replica `<input>` with the field's exact box (64/80/96px wide) reading `scrollWidth` vs `clientWidth`.
expecting: Metric length strings overflow at 64px and fit at 80/96px; bare datasheet strings fit at 64px. (Observed exactly that — see Evidence.)
next_action: None — return ROOT CAUSE FOUND to the orchestrator (goal: find_root_cause_only). Fix belongs to the gap-closure plan.
bug_class: bohrbug
known_pattern_candidate: none (first debug session in this project; no knowledge base yet)

reasoning_checkpoint:
  hypothesis: "MeasureField's fixed 64px box (50px content) is narrower than the rendered width of the Metric length string `NNN.N cm` (59–63px at text-sm in Inter), so the standalone Board Length field clips its own value on the Template Builder, Volume and Fins sidebars."
  confirming_evidence:
    - "Replica <input>, real Inter woff2, 14px: `365.0 cm` scrollWidth 74 vs clientWidth 62 (clipped 12px); `188.0 cm` 71 vs 62 (9px); `153.0 cm` 71 vs 62 (9px). Bare datasheet strings (`229`, `2 11/16\"`) fit."
    - "SSR of /design/outline with cookie shaper-units=metric ships `value=\"182.9 cm\"` inside `class=\"... h-7 w-16 min-w-16 max-w-16 ... px-1.5 text-right text-sm ...\"` — the exact box measured."
    - "Same string in the fallback font (Helvetica) also overflows (57.6px > 50px) — the cause is the box, not a font-loading failure."
    - "The 64px figure came verbatim from ImperialField (git bc6105d^), whose only real strings were ≤ `8 15/16\"` bare cells; the reuse was justified by character count (8 < 9), not rendered width."
  falsification_test: "If the replica input with the real Inter font at 64px had reported scrollWidth ≤ clientWidth for `188.0 cm`/`365.0 cm`, the box would not be the cause (something else — e.g. a wrapper clipping or a font-size override — would be). It reported 71–74 > 62."
  fix_rationale: "Widening the standalone (non-bare) box to ≥ 77px total gives the longest length string (`365.8 cm`, ≈63px) room; keeping bare mode at 64px leaves the datasheet's 540px floor and every imperial cell untouched. Addresses the mechanism (box < text), not a symptom (e.g. shrinking the font or dropping the ` cm` suffix, which D-08 requires)."
  blind_spots: "Not measured in the live page itself (no browser driver available to set the cookie) — measured in a replica with identical CSS and the identical font file. Bold/other weights not exercised (field is weight 400). Safari/Firefox not measured; their Inter advance widths are the same font metrics, so the ±1px difference cannot close a 9–13px gap."
  candidate_causes:
    - "code: fixed `w-16 min-w-16 max-w-16` inherited from ImperialField, sized for a different string class — CONFIRMED"
    - "config: a Tailwind `--spacing`/`--text-sm` override shrinking w-16 or enlarging text-sm — ELIMINATED (no overrides in globals.css; SSR classes are the plain defaults)"
    - "environment: Inter failing to load and a wider fallback font rendering — ELIMINATED as cause (real Inter overflows; fallback Helvetica overflows too)"
    - "data: formatLength producing an unexpectedly long string — ELIMINATED (`NNN.N cm` is exactly the D-08-specified format; 8 characters, as the spec said — the spec's error was equating characters with pixels)"
  and_gate: "no — the box alone accounts for the symptom. The metric string is the intended, specified display; nothing about it is wrong. Single cause."

## Symptoms
<!-- Written during gathering, then IMMUTABLE -->

expected: Typed Board Length field commits, clamps, reverts on bad input, and Imperial dropdowns are unaffected. The Metric value (e.g. `188.0 cm`, up to `365.0 cm`) should be fully readable inside the box on the Template Builder, Volume and Fins sidebars.
actual: User reported during UAT test 4 on the Template Builder with Metric chosen: "the box is not big enough for the text." The commit/clamp/revert behaviour itself was not reported as wrong.
errors: None reported
reproduction: Test 4 in .planning/phases/06-the-design-screens-in-metric/06-UAT.md — dev server on http://localhost:3000, pick Metric from the gear menu, open /design/outline, look at the box above the Board Length slider.
started: Discovered during end-of-phase UAT for Phase 6 (2026-09-05), right after the phase converted the design screens to the shaper's chosen units. The box is `components/design/measure-field.tsx`, added in plan 06-02 (commit 268b6fc), which reused the retired ImperialField's fixed classes (`h-7 w-16 min-w-16 max-w-16 ... px-1.5 text-right text-sm`).

## Eliminated
<!-- APPEND only - prevents re-investigating -->

- hypothesis: A Tailwind theme override (custom `--spacing` or `--text-sm`) makes `w-16` smaller than 64px or `text-sm` larger than 14px.
  evidence: `grep` of app/globals.css finds no `--spacing`, `--text-sm` or `--text-base` overrides (only `--radius-*`). The SSR'd input carries the plain classes; 64px / 6px / 14px are the Tailwind v4 defaults.
  timestamp: 2026-09-05T22:07:00Z

- hypothesis: Inter is not loading and a wider fallback font is what overflows.
  evidence: The dev page preloads Inter at /_next/static/media/83afe278b6a6bb3c-s.p.*.woff2 (CSS @font-face confirms family `Inter`). Measured with that exact file: `188.0 cm` = 59.4px, `365.0 cm` = 62.0px — both over the 50px content box. Fallback Helvetica measures 57.6px — also over. Font choice cannot rescue a 64px box.
  timestamp: 2026-09-05T22:15:00Z

- hypothesis: `formatLength`/`formatCentimetres` emits a longer string than the spec intends (e.g. extra decimals or a double unit).
  evidence: `formatLength(value, "metric")` = `${formatCentimetres(value)} cm`, `formatCentimetres` = `toFixed(1)`. SSR shows `182.9 cm` for the default 6'0" board — exactly the D-08 form. The data is correct.
  timestamp: 2026-09-05T22:16:00Z

- hypothesis: A wrapper (`inline-flex flex-col items-end` or the `mb-2 flex gap-2` row) squeezes the field narrower than its own class.
  evidence: The sidebar `<aside>` is `max-w-[400px] basis-[340px]` and the row holds one content-sized child — ~300px free. The field's own `min-w-16 max-w-16` pins it at 64px; nothing outside it is smaller than that. In the replica the 64px box's clientWidth was 62 (= 64 − 2px border), as expected.
  timestamp: 2026-09-05T22:16:00Z

## Evidence
<!-- APPEND only - facts discovered -->

- timestamp: 2026-09-05T22:00:00Z
  checked: Knowledge base (.planning/debug/knowledge-base.md) and resolved/ directory
  found: Neither exists — this is the project's first debug session. No prior pattern to test first. (MemPalace CLI not present; keyword fallback had nothing to scan.)
  implication: Proceed with fresh investigation.

- timestamp: 2026-09-05T22:01:00Z
  checked: components/design/measure-field.tsx (full read)
  found: Input className is `h-7 w-16 min-w-16 max-w-16 rounded-md border border-surf-line bg-surf-ground px-1.5 text-right text-sm text-surf-ink`. The comment above it justifies the 64px width by CHARACTER COUNT: "metric's longest is "365.0 cm" at 8 characters, still shorter than ImperialField's own "23 15/16\"" at 9". The width is identical for every family (length/dim/mark), every system, and both bare and suffixed modes.
  implication: The sizing was reasoned from character counts, not rendered width. Character count is a poor proxy: digits, `.`, a space and `cm` have different advance widths from fraction digits and `"`.

- timestamp: 2026-09-05T22:05:00Z
  checked: components/ui/input.tsx + lib/utils.ts (cn = twMerge(clsx))
  found: Base Input classes are `h-8 w-full min-w-0 ... px-2.5 py-1 text-base ... md:text-sm`. twMerge lets the field's `w-16 min-w-16 max-w-16 px-1.5 text-sm h-7` win over `w-full min-w-0 px-2.5 text-base h-8` (confirmed in the SSR class list — the losers are gone). Net box: width 64px (border-box via Tailwind preflight), 1px border each side, 6px horizontal padding each side → 50px content box for the text. Font size 14px in every viewport; weight 400; no `tabular-nums`, no letter-spacing.
  implication: The text has exactly 50px to live in, regardless of system or family.

- timestamp: 2026-09-05T22:06:00Z
  checked: git show bc6105d^:components/rocker/imperial-field.tsx (the retired ImperialField) + its only consumer (rocker datasheet)
  found: ImperialField was ONLY ever rendered inside the ROCKER datasheet's Thickness/Rocker cells, showing bare imperial fractions: thickness 0.125–5 in → longest `4 15/16"`, rocker lift 0–9 in → longest `8 15/16"`. Its `23 15/16"` comment was a theoretical maximum no bound reaches. It never rendered a feet-and-inches string, never a suffixed string, and was never a Board Length control (those were two `flex-1` Selects).
  implication: The 64px box was tuned by eye for short bare fraction cells in a table, then inherited verbatim by a standalone control that shows a longer class of string (`NNN.N cm`). The reuse assumed "same classes = same fit".

- timestamp: 2026-09-05T22:07:00Z
  checked: app/layout.tsx, app/globals.css, dev-server CSS @font-face map
  found: Body font is Inter (next/font/google, latin subset, variable weight) self-hosted at /_next/static/media/83afe278b6a6bb3c-s.p.*.woff2; `--font-body`/`--font-sans` both resolve to it. No `--spacing` or `--text-sm` overrides in globals.css.
  implication: Rendered width can be measured faithfully with the exact font file at 14px/400.

- timestamp: 2026-09-05T22:08:00Z
  checked: Ranges feeding the field — BOARD_LENGTH_RANGE_IN 60–120 in (outline/volume: 152.4–304.8 cm), fin-controls `{min:48,max:144}` in (fins: 121.9–365.8 cm), FOIL_THICKNESS_RANGE_IN 0.125–5 in, ROCKER_LIFT_RANGE_IN 0–9 in
  found: Metric standalone `length` strings are always `NNN.N cm` (8 characters) across the whole range — `122.0 cm` to `365.8 cm`. Bare metric marks in the datasheet are ≤3 digits (`229`). Strings the field renders today: Metric sidebars → `NNN.N cm`; Metric datasheet (bare) → `NN`/`NNN`; Imperial datasheet (bare) → `N N/16"`; Imperial sidebars → not the field (Selects).
  implication: The ONLY consumer that shows an 8-character suffixed string is the Metric Board Length control on the three sidebars — exactly the sites the UAT flagged.

- timestamp: 2026-09-05T22:09:00Z
  checked: Layout around the field — outline/volume/fins: `<div className="mb-2 flex gap-2">` holding one content-sized MeasureField (wrapper `inline-flex flex-col items-end`) inside an aside `max-w-[400px] flex-1 basis-[340px]`; datasheet: `min-w-[540px]` table, label col `flex-[1.1]`, five station cols `min-w-0 flex-1 justify-end`, `gap-2`
  found: In the sidebars nothing constrains the field's width but its own `w-16 min-w-16 max-w-16` — the row has ~300px free. In the datasheet at its 540px floor each station column is (540 − 5×8px gaps) / 6.1 ≈ 82px wide; a 64px box fits with ~18px spare, an 80px box with ~2px spare, a 96px box would overflow its column at the floor. The error line under the field is already `w-24` (96px).
  implication: Widening the standalone field costs nothing in the sidebars; widening the bare/datasheet cell to 96px would break the 540px floor, so a fix should widen per mode, not globally.

- timestamp: 2026-09-05T22:12:00Z
  checked: SSR of http://localhost:3000/design/outline with cookie `shaper-units=metric` (the server reads the cookie, so this is the exact first paint)
  found: `<input ... aria-label="Board Length" class="py-1 ... h-7 w-16 min-w-16 max-w-16 rounded-md border border-surf-line bg-surf-ground px-1.5 text-right text-sm text-surf-ink" value="182.9 cm"/>`. Without the cookie there is no Board Length input at all (Imperial renders the two Selects).
  implication: The shipped box is exactly the measured one; the shipped string for the default board is `182.9 cm`.

- timestamp: 2026-09-05T22:15:00Z
  checked: Headless Google Chrome 152 (`--headless=new --dump-dom`) on a local page embedding the dev server's Inter woff2; canvas measureText at `400 14px Inter`, plus a replica `<input>` (box-sizing border-box, 64/80/96px wide, padding 4px 6px, 1px border, 14px, right-aligned) reporting clientWidth/scrollWidth. Fonts confirmed loaded via `document.fonts.load` before measuring.
  found: |
    Rendered text widths (Inter 14px) vs the 50px content box:
      365.0 cm  62.0px  (over by 12.0)      304.8 cm  62.6px  (over by 12.6)
      188.0 cm  59.4px  (over by  9.4)      153.0 cm  59.0px  (over by  9.0)
      122.0 cm  59.5px  (over by  9.5)      182.9 cm  ≈59.5px (the default board)
      63.5 cm   53.4px  (over by  3.4)      229 mm    54.2px  (over by  4.2)   ← standalone dim/mark, not used by any consumer today
      229 (bare) 25.8px fits   127 (bare) 22.2px fits   67 (bare) 16.6px fits   51.4 (bare) 27.1px fits
      8 15/16"  52.5px  (over by  2.5)      4 15/16"  52.9px  (over by  2.9)   ← imperial datasheet cells, pre-existing
      2 11/16"  49.8px  fits (by 0.2)       2 5/8"    41.0px  fits              20 1/4"  47.6px fits
      23 15/16" 61.1px  (over by 11.1)  ← the "9 characters that fit" from the comment never fit either
      6'2"      27.9px  fits                10'0"     34.1px  fits              5'11 1/2" 53.6px (over by 3.6)
    Replica <input> ground truth (clientWidth = width − 2px border):
      64px box: 365.0 cm scrollWidth 74 > 62 CLIPPED · 188.0 cm 71 > 62 CLIPPED · 153.0 cm 71 > 62 CLIPPED · 8 15/16" 65 > 62 CLIPPED · 2 11/16" 62 fits · 229 fits · 6'2" fits
      80px box (w-20): every string above fits (365.0 cm scrollWidth 78 = clientWidth 78, ~4px spare)
      96px box (w-24): every string above fits with ≥16px spare
    For contrast, Helvetica (a plausible fallback) gives 365.0 cm = 57.6px — still over 50px.
  implication: Root cause confirmed and quantified. The Metric length string is 9–13px (about one and a half characters) wider than the box's content area, on every value in range. A total width of ≥77px is the mathematical minimum; `w-20` (80px) is the smallest Tailwind step that passes, `w-24` (96px) passes with comfortable margin and matches the error line's existing width. Secondary, pre-existing finding: imperial datasheet cells at 13/16 or 15/16 sixteenths overflow the same box by ~3px (the inch mark's edge clips) — present since Phase 4's ImperialField, never reported, unchanged by this bug.

- timestamp: 2026-09-05T22:17:00Z
  checked: Where the false "it fits" belief was codified — 06-UI-SPEC.md line 158 (overflow row: "365.0 cm (8 characters) is shorter than ... 23 15/16" (9 characters), so the existing fixed ~64px box (w-16) needs no resize"), 06-UI-SPEC.md lines 234–236 (standalone mode "reusing ImperialField's exact Input classes"), 06-02-PLAN.md line 38 (same claim as a must-hold) and line 205 (acceptance criterion asserting the exact class string), and the class comment in measure-field.tsx
  found: All four restate the same character-count argument; the plan's acceptance criterion pins the literal `w-16 min-w-16 max-w-16` string, so an executor could not have widened it without failing the plan. No existing gate measures rendered width (vitest runs in node; there is no browser test).
  implication: The fix has to touch the spec/plan wording (or at least the class comment) as well as the class, or the next verifier will flag the widened box as drift. "Why not caught": the overflow check was a design-time inference by character count, and nothing in test/lint/build renders text.

## Resolution
<!-- OVERWRITE as understanding evolves -->

root_cause: "`components/design/measure-field.tsx` fixes its Input at 64px (`w-16 min-w-16 max-w-16`, plus `px-1.5` and a 1px border → a 50px content box) for every family, system and mode. Those classes were copied verbatim from the retired `ImperialField`, whose only real content was short bare fraction cells in the ROCKER datasheet (≤ `8 15/16\"`). The standalone Metric Board Length string `NNN.N cm` renders 59–63px wide in Inter at 14px (every value from `122.0 cm` to `365.8 cm`), so 9–13px of it is clipped on the Template Builder, Volume and Fins sidebars. The reuse was justified — in the UI-SPEC, the plan and the code comment — by character count (8 < 9), which does not predict pixel width."
fix: "(not applied — diagnose-only) Suggested: make the width follow the mode. Standalone (the default, used by the three Board Length sites): `w-24 min-w-24 max-w-24` (96px; 82px content — fits `365.8 cm` ≈63px with ~19px spare, and lines up with the error line's existing `w-24`). Bare (datasheet cells): keep `w-16 min-w-16 max-w-16` so the 540px table floor (≈82px per station column) and every imperial cell stay byte-identical. `w-20` (80px; 66px content) is the tightest step that passes (~3–4px spare on `365.8 cm`) if a smaller box is preferred. Update the class comment, UI-SPEC line 158/234–236 and 06-02-PLAN line 38/205 so the recorded contract states the measured width, not a character count."
verification: "(not applied) After the change: SSR of /design/outline with `shaper-units=metric` shows the wider class on the Board Length input; in the browser `input.scrollWidth <= input.clientWidth` for `365.8 cm` on the Fins screen (set length to max) and for `304.8 cm` on Template Builder/Volume; ROCKER datasheet cells unchanged at 64px in both systems; Imperial sidebars unchanged (no MeasureField rendered)."
files_changed: []
oracle_type: derived
