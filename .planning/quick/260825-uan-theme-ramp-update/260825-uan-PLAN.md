---
phase: quick-260825-uan
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/globals.css
  - lib/theme.ts
  - .planning/sketches/themes/colour-bench.html
autonomous: true
requirements: [QUICK-260825-uan]

estimate:
  tokens: 26000
  raw_tokens: 26000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "All four themes render the founder's exported palette: the 18 changed ramp values in app/globals.css read back exactly, and the other 50 ramp values are byte-unchanged."
    - "Phosphor's ramp is untouched — not one of its 17 values appears in the diff."
    - "The settings menu describes each theme by what is actually on screen: Chalk is no longer called crisp white with a cyan accent, and Slate is no longer described in terms of Chalk's ink."
    - "The Chalk and Slate ramp comments in globals.css state what the new values do, in plain English, rather than the scheme they replaced."
    - "The colour bench's Reset restores the same palette the app ships, and its contrast audit describes the live palette — PUBLISHED and the globals.css ramps agree value-for-value."
    - "Typecheck, lint, the full Vitest suite and a production build all pass."
  artifacts:
    - "app/globals.css"
    - "lib/theme.ts"
    - ".planning/sketches/themes/colour-bench.html"
  key_links:
    - "LAYER 2's four `:root.theme-*` blocks are NOT edited — each already carries all 17 var() mappings, so new ramp values flow through to the contract automatically."
    - "Bare `:root` and the `@media (prefers-color-scheme: dark)` block hold only var(--ramp-daylight-*) / var(--ramp-slate-*), never literals, so the no-JS defaults follow the new values with no edit."
    - "The bench's `board-fill` key is the CSS ramp's `fill` role; every other bench key matches its ramp suffix one-for-one."
    - "`--ramp-chalk-ink` is a prefix of `--ramp-chalk-ink-muted`, so every anchor must carry the colon and the value, not just the property name."
---

<objective>
Move the four theme ramps in `app/globals.css` LAYER 1 onto the palette the founder exported
from the colour bench, then bring the two things that describe or duplicate those values back
into step: the prose that the new values make false, and the bench's hand-kept `PUBLISHED`
copy.

Purpose: the exported palette is the founder's decision; the app should render it. But two of
the new values change what the themes *are*, and the repo currently explains them in terms of
the schemes they replace — including one line the shaper reads in the settings menu. Stale
prose about colour is the kind of thing that survives for months and misleads the next change.

Output: 18 ramp values updated, three comment blocks and two theme descriptions rewritten to
match, and the bench re-synced so its Reset and its audit describe the live palette.

Not a tracer-first plan: there is no architecture to prove. This is a value swap across three
files that are already wired to each other, and the wiring (LAYER 2, the bridge, the 228 call
sites) is verified untouched rather than rebuilt. No task-level `tdd="true"`: every change is a
CSS value, a comment, or a display string — the exception cases.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@app/globals.css
@lib/theme.ts
@.planning/sketches/themes/README.md
</context>

<scope_boundary>
Already checked, do not re-derive, do not edit:

- **LAYER 2 needs no edit.** All four `:root.theme-*` blocks were verified to carry exactly 17
  mappings each, the correct `color-scheme`, and zero mismatches against the founder's spec.
- **The bare `:root` defaults block and the `@media (prefers-color-scheme: dark)` block hold no
  colour literals** — only `var(--ramp-daylight-*)` / `var(--ramp-slate-*)`. They inherit.
- **`DEFAULT_LIGHT_THEME` / `DEFAULT_DARK_THEME`** in `lib/theme.ts` are already `daylight` /
  `slate`, which is what the founder's export expects.
- **The `@media print` block** references `--ramp-daylight-ground`, which does not change.
- **Phosphor's ramp is unchanged in every one of its 17 values.** Do not touch it.
- **No other live file duplicates these hexes.** A repo-wide search found the old values only in
  `app/globals.css`, the bench's `PUBLISHED`, and historical `.planning/` records. The records
  are a log of what was true at the time — leave every one of them alone.
- The bench's own chrome tokens near the top of `colour-bench.html` (`--ui-accent` and friends)
  style the bench itself, not Shaper. Not in scope.
</scope_boundary>

<palette>
## The 18 changed values in `app/globals.css` LAYER 1

Line numbers are from the current file and are a starting hint, not the anchor — anchor on the
full declaration text.

| Line | Declaration | Old | New |
|------|-------------|-----|-----|
| 93  | `--ramp-daylight-line-faint` | `#cec8b6` | `#897c58` |
| 100 | `--ramp-daylight-fill`       | `#f4f9f8` | `#d9f2ed` |
| 107 | `--ramp-chalk-canvas`        | `#ffffff` | `#dfdcd3` |
| 110 | `--ramp-chalk-well`          | `#f4f5f7` | `#dfdcd3` |
| 111 | `--ramp-chalk-ink`           | `#111111` | `#1f2a3b` |
| 112 | `--ramp-chalk-ink-muted`     | `#6b6b6b` | `#566171` |
| 113 | `--ramp-chalk-line`          | `#8d8d8d` | `#897c58` |
| 114 | `--ramp-chalk-line-faint`    | `#d5d5d5` | `#897c58` |
| 115 | `--ramp-chalk-accent`        | `#00e5ff` | `#3490bc` |
| 116 | `--ramp-chalk-on-accent`     | `#111111` | `#090e16` |
| 117 | `--ramp-chalk-accent-ink`    | `#00767f` | `#2b424c` |
| 119 | `--ramp-chalk-on-warning`    | `#111111` | `#1f2a3b` |
| 120 | `--ramp-chalk-warning-ink`   | `#c93f10` | `#ac3811` |
| 121 | `--ramp-chalk-fill`          | `#f0fdff` | `#d8ebf2` |
| 128 | `--ramp-slate-canvas`        | `#12141a` | `#1a1d25` |
| 130 | `--ramp-slate-panel`         | `#1a1d25` | `#12141a` |
| 136 | `--ramp-slate-accent`        | `#2d7495` | `#18526d` |
| 142 | `--ramp-slate-fill`          | `#152029` | `#1a2732` |

Everything else in LAYER 1 stays as it is. Chalk keeps `ground`, `sidebar`, `tab-active`,
`panel` at `#ffffff` and `warning` at `#ff5722`. Slate keeps `ground`, `sidebar`, `tab-active`
at `#12141a`, `well` at `#1b1f26`, and its `accent-ink` at `#3490bc` — note that Chalk's *new*
accent is the same hex as Slate's existing accent-ink, so a careless find-and-replace on
`#3490bc` would corrupt Slate.

## The same 18, as the bench's `PUBLISHED` keys

The bench stores the board wash under `board-fill`; every other key is the ramp suffix.

| Theme | Bench key | Old | New |
|-------|-----------|-----|-----|
| daylight | `"line-faint"`  | `#cec8b6` | `#897c58` |
| daylight | `"board-fill"`  | `#f4f9f8` | `#d9f2ed` |
| chalk | `canvas`          | `#ffffff` | `#dfdcd3` |
| chalk | `well`            | `#f4f5f7` | `#dfdcd3` |
| chalk | `ink`             | `#111111` | `#1f2a3b` |
| chalk | `"ink-muted"`     | `#6b6b6b` | `#566171` |
| chalk | `line`            | `#8d8d8d` | `#897c58` |
| chalk | `"line-faint"`    | `#d5d5d5` | `#897c58` |
| chalk | `accent`          | `#00e5ff` | `#3490bc` |
| chalk | `"on-accent"`     | `#111111` | `#090e16` |
| chalk | `"accent-ink"`    | `#00767f` | `#2b424c` |
| chalk | `"on-warning"`    | `#111111` | `#1f2a3b` |
| chalk | `"warning-ink"`   | `#c93f10` | `#ac3811` |
| chalk | `"board-fill"`    | `#f0fdff` | `#d8ebf2` |
| slate | `canvas`          | `#12141a` | `#1a1d25` |
| slate | `panel`           | `#1a1d25` | `#12141a` |
| slate | `accent`          | `#2d7495` | `#18526d` |
| slate | `"board-fill"`    | `#152029` | `#1a2732` |

`PUBLISHED` starts at line 505. The nine lines that carry these values are 508 and 510
(daylight), 512-515 (chalk, all four of its value lines), and 517, 519, 520 (slate). Phosphor's
entry, lines 521-525, does not change.

## Contrast: already audited, all four themes pass

WCAG 2.1 was computed for the bench's full 26-pairing list against the new values. **Zero
failures in any theme.** Some pairings land close to the bar on purpose — they are not bugs and
must not be "corrected" by a later change:

| Theme | Pairing | Ratio | Bar |
|-------|---------|-------|-----|
| Daylight and Chalk | `line` on `canvas` | 3.01:1 | 3:1 non-text |
| Daylight and Chalk | `line` on `well`   | 3.01:1 | 3:1 non-text |
| Daylight and Chalk | `on-warning` on `warning` | 4.57:1 | 4.5:1 text |
| Daylight and Chalk | `ink-muted` on `canvas` | 4.58:1 | 4.5:1 text |
| Slate | `accent-ink` on `well`   | 4.61:1 | 4.5:1 text |
| Slate | `accent-ink` on `canvas` | 4.70:1 | 4.5:1 text |

There is no automated AA test in this repo and adding one is not in scope here.

## What the new values change about the themes

These two facts are the reason Task 2 exists.

**Chalk is now Daylight with a blue accent.** After this change the two light themes are
byte-identical on 13 of their 17 tokens — ground, sidebar, canvas, tab-active, panel, well, ink,
ink-muted, line, line-faint, warning, on-warning and warning-ink all match. Only `accent`
(blue `#3490bc` against Daylight's sage `#8ec1b8`), `on-accent`, `accent-ink` and `fill` differ.
Chalk's old identity — matte black ink, cyan fills, a flat white canvas — is gone in all three
respects.

**Slate's canvas and panel swap roles.** `canvas` was flat on the ground and `panel` was the
lifted surface; now `canvas` is lifted (`#1a1d25`) and `panel` sits on the ground (`#12141a`).
Cards read as flat and the drawing area floats above them, the inverse of before.

**A side effect worth naming:** in both light themes `line-faint` now holds the same value as
`line`, so hairline dividers draw at the weight of a control edge instead of receding.
</palette>

<tasks>

<task type="auto">
  <name>Task 1: Move the four ramps onto the founder's exported palette</name>
  <files>app/globals.css</files>
  <reversibility rating="reversible">A value swap in one CSS block; `git revert` restores the previous palette exactly.</reversibility>
  <action>
Apply the 18 value changes listed in the "The 18 changed values" table above, in the LAYER 1
`:root` ramp block only (roughly lines 80-166). Nothing outside that block is edited in this
task — not LAYER 2, not the bridge, not the print block.

Editing this file is a known hazard recorded in project memory: indentation-sensitive anchors
are not unique here, because a two-space declaration can be a substring of a four-space copy
inside a media query. The `--ramp-*` names in this block are distinctive enough to be safe, but
two rules still apply and are not optional. First, every anchor must include the property name,
the colon, and the old value — `--ramp-chalk-ink` alone is a prefix of `--ramp-chalk-ink-muted`
and will match the wrong line. Second, confirm each replacement landed exactly once rather than
trusting the edit, then re-read the whole ramp block at the end and read the values back against
the table rather than assuming.

Do not find-and-replace on a bare hex. `#3490bc` is Chalk's new accent and is already Slate's
accent-ink; `#12141a` is Slate's new panel and is already its ground, sidebar and tab-active;
`#1a1d25` is Slate's new canvas and is currently its panel. Every one of those would be
corrupted by a value-only replace.

Leave the fourth theme's ramp — the green terminal one, lines 144 onward — completely alone.
Every one of its 17 values is unchanged, and the verify below proves it by checking that no ramp
line belonging to it appears in the diff at all.

Comments are Task 2's job. Change only values here.
  </action>
  <verify>
    <automated>grep -cE -- '--ramp-(daylight-(line-faint: #897c58|fill: #d9f2ed)|chalk-(canvas: #dfdcd3|well: #dfdcd3|ink: #1f2a3b|ink-muted: #566171|line: #897c58|line-faint: #897c58|accent: #3490bc|on-accent: #090e16|accent-ink: #2b424c|on-warning: #1f2a3b|warning-ink: #ac3811|fill: #d8ebf2)|slate-(canvas: #1a1d25|panel: #12141a|accent: #18526d|fill: #1a2732));' app/globals.css</automated>
    <automated>grep -cE -- '^  --ramp-[a-z]+-[a-z-]+: #[0-9a-f]{6};$' app/globals.css</automated>
    <automated>git diff -- app/globals.css | grep -cE '^[-+].*ramp-phos' || true</automated>
    <automated>git diff --numstat -- app/globals.css</automated>
  </verify>
  <done>
The first command prints `18` — all eighteen new declarations present, each on its own line.
The second prints `68` — four themes times seventeen roles, so nothing was lost or duplicated.
The third prints `0`: the green terminal ramp contributes no line to the diff. (`grep -c`
exits 1 when it counts nothing, which is why `|| true` is there; `0` on stdout is the pass.)
The fourth shows 18 added and 18 removed lines and nothing else — proof that only values moved
and no comment, mapping or blank line was disturbed.
  </done>
</task>

<task type="auto">
  <name>Task 2: Rewrite the prose the new values made false</name>
  <files>app/globals.css, lib/theme.ts</files>
  <action>
Three comment blocks in `app/globals.css` and two description strings in `lib/theme.ts` now
describe schemes that no longer exist. Rewrite them to say what is true of the new values,
rather than lightly editing the old wording — the point is that a reader who has never seen the
old palette gets a correct account.

Keep the house voice of the surrounding comments: plain English, explaining *why* the colours
sit where they do, written for a founder who is a shaper rather than a developer. Match the
existing comment width (roughly 100 columns) and the `/* -- Name (mode) ---...` header form.

**Chalk's ramp comment**, the block immediately above `--ramp-chalk-ground` (currently around
line 102). It presently claims a crisp-white scheme with matte black ink, bright cyan selection
fills, and the only flat white canvas among the light themes. All three claims are now false.
Replace the two body lines with a description of what Chalk actually is: Daylight's paper with
an ocean-blue accent in place of the sage; the two light themes now share all thirteen of their
neutrals — ground, canvas, ink, lines and warning — so the accent, the text that sits on it, the
accent's ink and the board wash are the only four values that differ; the choice between them is
about which accent you want in front of you all day, not about how light the page is.

**Slate's ramp comment**, above `--ramp-slate-ground` (currently around line 123). It presently
describes Slate as Chalk on a cool matte black, which no longer means anything now that Chalk's
ink has changed underneath it, and it does not mention the surface inversion. Replace the body
with: the conventional dark, near-white text on a cool near-black, and still the only theme
that keeps a separate warning hue; panels now sit flat on the ground while the drawing canvas is
the one lifted surface — the reverse of the earlier arrangement, so the board floats and the
cards around it recede. Keep the closing `Default dark.` sentence.

**Daylight's ramp comment**, above `--ramp-daylight-ground` (currently around line 81). Its two
existing sentences stay true and should be kept as they are. Add one sentence recording the side
effect: `line-faint` now holds the same value as `line`, so hairline dividers draw at the weight
of a control edge rather than receding — deliberate, and shared with Chalk. Keep `Default light.`
at the end.

Do not write the token prefix for the green terminal theme's ramp into any comment text — Task 1
gates on that string being absent from the globals.css diff, and a comment line mentioning it
would trip the gate for no reason. Naming the theme in ordinary prose is fine; the literal
`--ramp-` form of its name is not.

**`lib/theme.ts`, the `THEMES` array.** Two of the four `description` fields are what the shaper
reads under the theme label in the settings menu (rendered at `components/settings-menu.tsx:83`),
and both now lie. Set Chalk's to `Warm paper, blue accent` and Slate's to
`Cool near-black, blue accent`. Leave Daylight (`Warm paper, sage accent`) and the green
terminal theme (`Monochrome green terminal`) exactly as they are. The four lines then read as a
set, and the one real difference between the two light themes is the thing the menu shows.
Change only the `description` values — no ids, labels or modes move, and the doc comment above
the array stays as written. `lib/theme.test.ts` asserts nothing about description text, so this
breaks no test.
  </action>
  <verify>
    <automated>grep -c 'description: "Warm paper, blue accent"' lib/theme.ts</automated>
    <automated>grep -c 'description: "Cool near-black, blue accent"' lib/theme.ts</automated>
    <automated>grep -c 'description: "Warm paper, sage accent"' lib/theme.ts</automated>
    <automated>grep -c 'description: "Monochrome green terminal"' lib/theme.ts</automated>
    <!-- planner-discipline-allow: crisp-white -->
    <!-- planner-discipline-allow: bright cyan -->
    <!-- planner-discipline-allow: flat white canvas -->
    <!-- planner-discipline-allow: Chalk on a cool matte black -->
    <automated>grep -ciE 'crisp-white|crisp white|bright cyan|flat white canvas|Chalk on a cool matte black|Chalk on matte black' app/globals.css lib/theme.ts || true</automated>
    <automated>git diff -- app/globals.css | grep -cE '^[-+].*ramp-phos' || true</automated>
    <automated>npx tsc --noEmit && npm run lint</automated>
  </verify>
  <done>
The four description greps print `1` each: two rewritten, two untouched. The stale-claim grep
prints `0` for both files — none of the retired descriptions survives anywhere. The diff grep
still prints `0`, so no new comment text mentions the green ramp's token prefix. Typecheck and
lint pass. Reading the three comment blocks back, each one describes the values immediately
below it and a reader who never saw the old palette would not be misled.
  </done>
</task>

<task type="auto">
  <name>Task 3: Re-sync the colour bench's PUBLISHED copy</name>
  <files>.planning/sketches/themes/colour-bench.html</files>
  <action>
`.planning/sketches/themes/README.md` records this coupling and says plainly that re-syncing is
manual, that nothing enforces it and nothing can — the bench is a single standalone file with no
build step, which is what lets it run as an artifact at all — and that it is worth doing in the
same task as any ramp change. This is that ramp change. Left stale, the bench's Reset restores
the palette Task 1 just retired and its 26-row contrast audit describes a palette the app no
longer has.

Update the `PUBLISHED` array, which begins at line 505, to carry the same 18 new values, using
the bench-key table above. Nine lines change: two in the daylight entry, all four value lines in
the chalk entry, and three in the slate entry. The phosphor entry does not change.

The bench packs several key/value pairs onto each line, so anchor on the whole line rather than
on a single pair — several of these hexes repeat across themes and a narrow anchor will land in
the wrong entry. Two collisions to watch: `#dfdcd3` is already daylight's canvas and well and
becomes chalk's too, and `#3490bc` is already slate's accent-ink and becomes chalk's accent.
Confirm each line replacement landed exactly once.

Map `fill` to the bench's `board-fill` key. Change values only — no key is added, removed or
renamed, because the token contract itself is unchanged, so `GROUPS`, `EXPORT_KEYS` and `PAIRS`
all stay as they are. Do not touch the bench's own chrome tokens near the top of the file.

Do not attempt to publish or republish the artifact. That is a separate follow-up the
orchestrator runs, and it needs the artifact URL passed explicitly or it creates a second
artifact instead of updating the existing one.
  </action>
  <verify>
    <automated>node -e 'const fs=require("fs");const css=fs.readFileSync("app/globals.css","utf8");const b=fs.readFileSync(".planning/sketches/themes/colour-bench.html","utf8");const A={};for(const m of css.matchAll(/--ramp-([a-z]+)-([a-z-]+):\s*(#[0-9a-f]{6})/g))A[m[1]+"."+(m[2]==="fill"?"board-fill":m[2])]=m[3];const pub=b.slice(b.indexOf("const PUBLISHED"),b.indexOf("const state"));const B={};let id=null;for(const m of pub.matchAll(/id:"([a-z]+)"|"?([a-z-]+)"?:"(#[0-9a-f]{6})"/g)){if(m[1]){id=m[1];continue}B[id+"."+m[2]]=m[3]}const keys=[...new Set([...Object.keys(A),...Object.keys(B)])].sort();const bad=keys.filter(k=>A[k]!==B[k]);if(bad.length){console.error("DRIFT\n"+bad.map(k=>k+" css="+A[k]+" bench="+B[k]).join("\n"));process.exit(1)}console.log("BENCH-IN-SYNC",keys.length,"values")'</automated>
    <automated>git diff --numstat -- .planning/sketches/themes/colour-bench.html</automated>
  </verify>
  <done>
The drift check prints `BENCH-IN-SYNC 68 values` and exits 0 — every ramp role in globals.css
has an identical value under the matching bench key across all four themes, with `fill` and
`board-fill` reconciled. A count other than 68, or any `DRIFT` line, means a key was lost,
renamed or missed. The numstat shows 9 added and 9 removed lines and nothing else.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| *(none introduced)* | This plan changes colour literals, comments and two display strings. No input crosses a boundary, no dependency is added, no package manager runs, and no data is read or written at runtime. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-uan-01 | Information disclosure | Contrast of text against its surface | low | mitigate | Legibility is the only user-visible failure mode available to a palette change. All 26 pairings were computed against the new values before planning and all four themes pass; the six tight pairings are recorded above so a later change cannot mistake them for defects. |
| T-uan-02 | Tampering | `PUBLISHED` in `colour-bench.html` | low | mitigate | The bench is a planning artifact outside the app build and ships to no user. Left stale it misleads the next palette decision rather than any visitor. Task 3 re-syncs it and gates on a value-for-value comparison against `globals.css`. |
</threat_model>

<verification>
Run after all three tasks, from the repo root:

- `npx tsc --noEmit` — clean.
- `npm run lint` — clean.
- `npm test` — the full Vitest suite passes, roughly 670 tests. `lib/theme.test.ts` reads
  `app/globals.css` and asserts the registry and the default theme blocks agree; it does not
  assert any description text, so Task 2 is expected to leave it green.
- `npm run build` — succeeds. This is the check that a malformed CSS value would fail. Safe to
  run while the founder's dev server is up: this Next version writes development builds to
  `.next/dev` and production builds to `.next`, so the two do not collide
  (`node_modules/next/dist/docs/01-app/03-api-reference/06-cli/next.md`).
- Re-run Task 1's four greps and Task 3's drift check as a final pass, so the readback is taken
  against the finished tree rather than mid-plan.

<human-check>
Run by the ORCHESTRATOR, not the executor — the executor drives no browser.

At localhost:3000, step through all four themes from the settings gear and look at a drawing
screen and the summary in each:

- **Daylight** — unchanged apart from a slightly greener board wash and hairline dividers that
  now read at the same weight as control edges.
- **Chalk** — should now look like Daylight with a blue accent rather than a white theme. The
  canvas and wells carry Daylight's warm grey; selection fills and chips are blue, not cyan.
- **Slate** — the drawing canvas should sit *above* the cards, which now lie flat on the page.
  This is the inverse of how it read before and is the change most worth a second look.
- **Phosphor** — must be pixel-identical to before. Any difference here means Task 1 strayed.

Also open the settings menu itself and read the four description lines: each should describe
what the swatch beside it actually looks like.
</human-check>
</verification>

<success_criteria>
- 18 ramp values changed in `app/globals.css`, 68 ramp declarations total, Phosphor absent from
  the diff, and `git diff --numstat` on that file showing values-only churn plus the comment
  edits from Task 2.
- The Chalk, Slate and Daylight ramp comments describe the values beneath them.
- `lib/theme.ts` gives Chalk `Warm paper, blue accent` and Slate `Cool near-black, blue accent`;
  the other two are untouched.
- The bench drift check reports `BENCH-IN-SYNC 68 values`.
- Typecheck, lint, the Vitest suite and a production build all pass.
- No file outside the three in `files_modified` is changed. In particular, no `.planning/` record
  of a previous palette is rewritten.
</success_criteria>

<pending_followup>
**Republishing the bench artifact is the orchestrator's follow-up, not the executor's.** Once
Task 3 lands, the bench source and the published copy have diverged. Republish
`.planning/sketches/themes/colour-bench.html` to the SAME URL —
`https://claude.ai/code/artifact/4e019580-9da7-4a41-a0c2-efeca4a0350a` — passing the URL
explicitly, or a second artifact is created instead of the existing one being updated. Reading
the live artifact first is required if the session has not already seen its current version.
Keep the favicon 🎨: a changed tab icon reads as a different page. Both requirements are
recorded in `.planning/sketches/themes/README.md`.
</pending_followup>

<output>
Create `.planning/quick/260825-uan-theme-ramp-update/260825-uan-SUMMARY.md` when done.

Record in it: the 18 values as shipped, the two consequences the prose now carries (Chalk sharing
13 of 17 tokens with Daylight, and Slate's canvas/panel inversion), the six tight-but-passing
contrast pairings so a later change does not "fix" them, and the fact that the bench artifact is
re-synced in source but not yet republished.
</output>
