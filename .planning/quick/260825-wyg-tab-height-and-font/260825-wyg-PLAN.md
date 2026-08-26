---
phase: quick-260825-wyg
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/viewer/tabbed-panel.tsx
autonomous: true
requirements: [QUICK-260825-wyg]

estimate:
  tokens: 16000
  raw_tokens: 16000
  tasks: 1
  confidence: low

must_haves:
  truths:
    - "On every design screen (Template, Rails, Volume, Fins) the panel tabs are visibly shorter — an inactive tab measures 30px tall where it measured 42px, an active tab 29px where it measured 41px."
    - "Tab labels are set in the app's heading treatment: 12px, wide architectural tracking, all caps — the same treatment as the menu bar links and the sidebar section headings."
    - "The active tab still joins its panel seamlessly: no hairline runs between the tab and the surface below it."
    - "The three-tab strip on the Fins screen still sits on one line — the wider tracking does not push MODEL INFO onto a second row or off the canvas."
  artifacts:
    - "components/viewer/tabbed-panel.tsx"
  key_links:
    - "The active tab keeps border-b-0 and the panel keeps -mt-px — the folder-tab join is untouched by this change"
    - "The single className const inside tabs.map is the only styling edit; the active/inactive colour branch below it is unchanged"
    - "All four consumers (outline-editor, rail-band-editor, fin-placement-editor, volume-estimator) inherit the change with zero edits"
---

<objective>
Shorten the panel tabs on all four design screens and set their labels in the app's heading
type treatment, matching the menu bar links and the sidebar section headings.

Purpose: the founder's read is that the tabs carry too much dead vertical space, and that
moving them onto the heading treatment (which is smaller type) buys back more of it. He is
right on both counts — the type change alone accounts for 4px of the 12px saving. The tabs
currently use 14px bold body type with no tracking and no caps, which is the only place in
the app's chrome that reads as body text where it should read as a label.

Output: `components/viewer/tabbed-panel.tsx` with one edited class string and one added
docstring sentence. No other file changes.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@components/viewer/tabbed-panel.tsx
</context>

<scope_boundary>
**The blast radius is `components/viewer/tabbed-panel.tsx` only.**

Do NOT edit the four consumers (`components/outline/outline-editor.tsx`,
`components/rails/rail-band-editor.tsx`, `components/fins/fin-placement-editor.tsx`,
`components/volume/volume-estimator.tsx`), `app/globals.css`, `components/site-nav.tsx`, or
`components/outline/outline-controls.tsx`. The nav and the sidebar heading are *references*
here — read them if you like, change neither.

Within `tabbed-panel.tsx`, do NOT touch: the panel `<div>` below the tab strip, the inner
content card, `panelClassName`, the active/inactive colour branch, the `interactive` logic,
the `role`/`aria-selected` attributes, or the border tokens. Type and vertical padding only.
</scope_boundary>

<already_researched>
Do not re-derive any of this. It was verified against the files.

**"All pages" is one file.** `TabbedPanel` is the only tab implementation in the app. It has
exactly four consumers, and it was extracted in quick task 260825-pkq specifically so that a
treatment change like this one is a single edit — its own docstring says so.

**The line to change** is the `className` const inside `tabs.map` (currently line 58):
`"rounded-t-lg border px-[18px] py-2.5 text-sm font-bold "`. That is 14px, bold, normal
tracking, sentence-case-capable, with 10px of padding above and below.

**The two references the founder named** agree on the three things that matter — 12px,
uppercase, architectural tracking — and differ only in weight:

- menu bar nav link (`site-nav.tsx:46`): `text-xs font-bold tracking-architectural uppercase`
- sidebar section heading (`outline-controls.tsx:78`): `text-xs font-display uppercase tracking-architectural font-extrabold`

**`font-display` is not a different typeface.** `app/globals.css` sets `--font-display` and
`--font-body` to the identical stack (`var(--font-inter), Inter, Roboto, sans-serif`), so
adding it changes zero pixels today. It is still worth adding: globals.css line ~599 states
the rule this codebase runs on — body text gets `font-body` by `@apply`, and *"Only headings
opt out, with an explicit `font-display`."* The tab is becoming heading type, so it should
carry the token that says so. If the two stacks ever diverge, the tab follows the headings —
which is exactly what the founder asked for.

**`uppercase` is presentationally a no-op today.** All four call sites already pass uppercase
literals (`"VIEWER"`, `"DATA"`, `"ESTIMATE"`, `"MODEL INFO"`). Add it anyway so a future
lowercase label cannot silently break the treatment — but do not report it as a visible change.

**Height arithmetic.** Tailwind `text-sm` is 14px on a 20px line box; `text-xs` is 12px on a
16px line box. Border is 1px top and bottom on an inactive tab, 1px top only on the active one
(it sets `border-b-0`).

| | line box | padding | border | total |
|---|---|---|---|---|
| inactive, now | 20 | 20 (`py-2.5`) | 2 | **42px** |
| active, now | 20 | 20 | 1 | **41px** |
| inactive, after | 16 | 12 (`py-1.5`) | 2 | **30px** |
| active, after | 16 | 12 | 1 | **29px** |

12px returned to the canvas on every screen.

**No test or layout depends on this.** No test file references `TabbedPanel`, and no consumer
sets a fixed height that assumes the current tab size.
</already_researched>

<tasks>

<task type="auto">
  <name>Task 1: Put the tabs on the heading treatment and take 12px off their height</name>
  <files>components/viewer/tabbed-panel.tsx</files>
  <read_first>
    - `components/viewer/tabbed-panel.tsx` lines 52-83 — the tab strip, the `className` const,
      and the two render branches (`<span>` for a single-tab screen, `<button>` otherwise).
      Both branches consume the same const, so there is one edit, not two.
    - Lines 3-22 — the docstring. Keep it. Its explanation of the folder-tab join and of why
      the edge uses `--surf-line` rather than `--surf-line-faint` stays true after this change.
  </read_first>
  <action>
    Replace the `className` const's first string literal — currently
    `"rounded-t-lg border px-[18px] py-2.5 text-sm font-bold "` — with
    `"rounded-t-lg border px-[18px] py-1.5 text-xs font-display font-bold tracking-architectural uppercase "`.

    Keep the trailing space before the closing quote; the concatenation below depends on it.
    Leave the `(on ? ... : ...)` branch and everything else in the file alone.

    Four deliberate choices, so none of them looks arbitrary later:

    1. **`font-bold`, not `font-extrabold`.** The two references bracket a range: the nav link
       is bold, the sidebar heading is extrabold. Bold matches the nav exactly, is what the tab
       already uses (so weight is the one thing not changing), and is the right end of the
       range for an element that repeats up to three times in a row across the strip. The
       active/inactive distinction here is carried by surface and ink colour, never by weight.
    2. **`py-1.5`.** Six pixels above and below a 16px line box. The 12px caps have a cap
       height near 8.7px, so the line box already contributes roughly 3.6px of half-leading on
       each side — the optical gap above the letterforms lands near 9.6px, which is comfortable
       rather than tight. Do not go to `py-1`: that gives a 26px tab, close enough to the 24px
       floor below to feel cramped.
    3. **`px-[18px]` unchanged.** The founder asked for vertical height. And the horizontal
       case cuts the other way than instinct suggests: `--tracking-architectural` is 0.15em,
       which at 12px adds about 1.8px per character, so the labels get slightly *wider* despite
       the smaller size. Narrowing the side padding now would pinch them.
    4. **Nothing about the join changes.** No border width is touched, so the active tab still
       drops its bottom border and the panel's `-mt-px` still closes the seam.

    Then add one sentence to the docstring, in the paragraph that describes the tab strip,
    recording that the tab label deliberately carries the app's heading treatment — small,
    all-caps, architecturally tracked, the same as the menu bar links and the sidebar section
    headings — so a later editor does not "correct" it back toward body type. Keep it to a
    sentence or two in the existing voice. Do not restate the class names in the comment.

    A 30px tab is still a comfortable pointer target on the two screens where the tabs are
    interactive (Rails has two, Fins has three): it clears the 24x24 CSS px minimum in WCAG 2.2
    SC 2.5.8 with room to spare, and the labels make each tab far wider than tall.
  </action>
  <verify>
    <automated>

```bash
set -e
FILE=components/viewer/tabbed-panel.tsx

# The tab treatment, on a real code line (docstring lines are filtered out so prose
# in the comment can never satisfy this gate).
grep -v '^\s*\*' "$FILE" \
  | grep -c 'px-\[18px\] py-1.5 text-xs font-display font-bold tracking-architectural uppercase' \
  | grep -qx 1 || { echo "FAIL: tab class string is not the expected heading treatment"; exit 1; }

# Exactly one class string drives both render branches.
grep -c 'const className =' "$FILE" | grep -qx 1 \
  || { echo "FAIL: expected exactly one className const"; exit 1; }

# The folder-tab join is untouched.
grep -q 'border-surf-line border-b-0 bg-surf-tab-active text-surf-ink' "$FILE" \
  || { echo "FAIL: active tab branch changed"; exit 1; }
grep -q -- '-mt-px' "$FILE" || { echo "FAIL: panel seam pull-up lost"; exit 1; }
grep -q 'rounded-t-lg' "$FILE" || { echo "FAIL: tab corner rounding lost"; exit 1; }

# Blast radius: this file and planning artifacts only.
git status --porcelain | awk '{print $NF}' \
  | grep -v '^\.planning/' | grep -v '^components/viewer/tabbed-panel\.tsx$' | grep -q . \
  && { echo "FAIL: files outside the blast radius were modified"; exit 1; }

npx tsc --noEmit
npm run lint
npm test
npm run build
echo PASS
```
    </automated>
    <human-check>
      These are Tailwind classes, so the real proof is visual. **The executor must not drive a
      browser — this is for the orchestrator.**

      Run `npm run dev` and open `/design/rails`. It is the right screen for this: two tabs, so
      it shows the active and inactive states side by side.

      1. **Type match.** Compare a tab label against the RAILS link in the menu bar directly
         above it, and against a sidebar section heading to its left. All three should read as
         the same treatment — same size, same all-caps, same wide letter-spacing. The tab may
         look a hair lighter than the sidebar heading; that is intended (bold vs extrabold).
      2. **Height.** Measure an inactive tab in devtools: it should be **30px**, down from
         **42px**. The active tab should be **29px**, down from **41px**.
      3. **The join.** Zoom in where the active tab meets the panel below it. There must be no
         hairline, gap, or doubled border across that edge — the tab and the panel surface
         should read as one continuous shape.
      4. **Then check `/design/fins`** — three tabs, including the longest label, MODEL INFO.
         Confirm the strip still sits on one line and the labels are not crowded against their
         tab edges. The wider tracking makes each label slightly wider than before, so this is
         the one place the change could bite.
      5. Glance at `/design/outline` and `/design/volume` (single, non-interactive tabs) to
         confirm they picked up the same treatment.

      Optional nit worth a look, not worth pre-empting: CSS letter-spacing adds its space after
      the final character, so an all-caps label sits about 1.8px left of true centre within its
      padding. The menu bar and sidebar headings already have this. If it reads as off-centre
      on the tabs, that is a separate task.
    </human-check>
  </verify>
  <done>
    `components/viewer/tabbed-panel.tsx` sets the tab label in 12px bold all-caps with
    architectural tracking and the `font-display` token, at `py-1.5`; inactive tabs measure
    30px and active tabs 29px on all four design screens; the active tab still joins its panel
    with no visible seam; the Fins strip still fits on one line; the docstring records the
    treatment; `tsc`, lint, tests and build all pass; no other file is modified.
  </done>
</task>

</tasks>

<verification>
- One file changed: `components/viewer/tabbed-panel.tsx`.
- `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build` all clean.
- Automated greps confirm the new treatment is on a code line, that a single class string
  still feeds both render branches, and that `border-b-0` / `-mt-px` / `rounded-t-lg` survive.
- Human check confirms the type matches the nav and sidebar headings, the measured heights are
  30px / 29px, the tab-to-panel join is seamless, and the Fins three-tab strip does not wrap.
</verification>

<success_criteria>
The panel tabs on Template, Rails, Volume and Fins are 12px shorter and read as the app's
heading type rather than as body text, with the folder-tab-and-panel join intact and no
consumer edited.
</success_criteria>

<output>
Create `.planning/quick/260825-wyg-tab-height-and-font/260825-wyg-SUMMARY.md` when done
</output>
