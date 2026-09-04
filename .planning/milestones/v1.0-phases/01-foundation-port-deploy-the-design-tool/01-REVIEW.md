---
phase: 01-foundation-port-deploy-the-design-tool
reviewed: 2026-08-21T16:13:40Z
depth: standard
files_reviewed: 21
files_reviewed_list:
  - .gitignore
  - README.md
  - app/design/layout.tsx
  - app/design/summary/summary.css
  - app/layout.tsx
  - app/page.tsx
  - components/design/design-store.tsx
  - components/fins/fin-placement-editor.tsx
  - components/fins/fin-viewer.tsx
  - components/outline/outline-editor.tsx
  - components/outline/outline-viewer.tsx
  - components/rails/rail-band-editor.tsx
  - components/setup/continue-board-card.tsx
  - components/setup/preset-card.tsx
  - components/setup/replace-board-dialog.tsx
  - components/setup/setup-screen.tsx
  - components/site-nav.tsx
  - components/ui/alert-dialog.tsx
  - components/volume/volume-estimator.tsx
  - lib/geometry/presets.test.ts
  - lib/geometry/presets.ts
  - next.config.ts
findings:
  critical: 0
  warning: 2
  info: 4
  total: 6
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-08-21T16:13:40Z
**Depth:** standard
**Files Reviewed:** 21
**Status:** issues_found

## Summary

Reviewed all 21 files from Phase 1's four plans (preset-to-editor tracer, setup-screen UI, Vercel
deployment, and live preset tuning). The geometry-in-`lib/`, units-centralization, and no-secrets
constraints all hold under direct verification, not just by reading the SUMMARY claims:

- Grepped every reviewed component for `Math.`/inline unit-conversion arithmetic outside
  `lib/geometry/`; only `outline-viewer.tsx` and `fin-viewer.tsx` compute anything beyond simple
  formatting, and both are documented, project-accepted diagram-layout math (pixel positions for
  an already-computed geometry, explicitly called out in `fin-viewer.tsx`'s own header comment as
  "diagram layout... not board geometry"), not a second implementation of rail-band/fin-placement/
  volume calculators.
- Confirmed no `.env*` file is tracked (`git ls-files | grep -iE '\.env'` → empty) and `.gitignore`
  carries the explicit `.env`/`.env.*`/`!.env.example` block.
- Rebuilt-verified the dev-only "Copy preset values" affordance claim independently rather than
  trusting the SUMMARY: `grep -rl "Copy preset values" .next/server .next/static` on the local
  production build returns zero matches (it does appear in `.next/dev/*`, which is `next dev`'s
  cache and never ships), and `curl https://shaper-coral.vercel.app/design/outline` on the live
  production URL also returns zero matches. `turbopackSourceMaps: false` is a real, recognized
  Next.js 16 config key (confirmed against `node_modules/next/dist/server/config-schema.js`), not
  a made-up flag. This constraint holds.

Two real state-management bugs were found in the "replace board" flow (`components/design/
design-store.tsx` + `components/setup/replace-board-dialog.tsx`) that undercut the confirm
dialog's own promise — see Warnings below. No Critical-severity issues were found.

## Warnings

### WR-01: "Discard & Start New" only replaces the outline, not the board

**File:** `components/design/design-store.tsx:134-135`
**Issue:** `applyPreset` only overwrites `state.outline`:
```ts
const applyPreset = (preset: BoardPreset) =>
  setState((prev) => ({ ...prev, outline: preset.outline, boardStarted: true }));
```
`rails`, `fins`, `volume`, `finsImportTemplate`, and `boardName` are left untouched. But
`components/setup/replace-board-dialog.tsx` tells the shaper: *"This replaces your current board
in progress."* with an action literally labeled **"Discard & Start New."**

Reproduce: pick Shortboard → customize a rail-band thickness on `/design/rails` and set a board
name on `/design/summary` → return to `/` → pick Longboard → confirm "Discard & Start New". The
result is a Longboard outline still carrying the Shortboard's custom rail-band thickness and the
old board name — silently. Given this project's stated Core Value ("numbers a shaper trusts
enough to cut foam to"), a rail-band thickness manually tuned for one board shape silently
surviving into an unrelated board shape is exactly the kind of quiet data mismatch that
undermines that trust, and it directly contradicts what the confirmation dialog just told the
user would happen.
**Fix:** Either reset `rails`/`fins`/`volume`/`finsImportTemplate`/`boardName` to their defaults
inside `applyPreset` (matching the dialog's "replaces your current board" promise), or narrow the
dialog copy to say what actually happens (e.g., "This replaces your outline shape. Rail band, fin,
and volume settings are kept."). The former is more consistent with the "Discard & Start New"
action label:
```ts
const applyPreset = (preset: BoardPreset) =>
  setState(() => ({ ...DEFAULT_DESIGN_STATE, outline: preset.outline, boardStarted: true }));
```

### WR-02: `hasBoardInProgress` is only set by outline writes, not by rail/fin/volume edits

**File:** `components/design/design-store.tsx:137-150`
**Issue:** `updateRailSection`, `toggleTailHardEdge`, `updateFins`, and `updateVolume` never set
`boardStarted: true` — only `updateOutline` and `applyPreset` do. In the normal flow (always
starting from a preset on `/`) this is masked because `applyPreset` already flips the flag before
any rail/fin/volume screen is reachable. But it means the "board in progress" signal is really
"outline has been touched," not "the design has been touched," which is the same root cause as
WR-01 (only the outline is treated as the durable part of "the board"). If a future screen ever
lets a shaper reach `/design/rails`/`/design/fins`/`/design/volume` without having applied a
preset first (e.g. a deep link, or Phase 2's saved-model loading), edits made there would not
register as "in progress" and could be silently discarded by a later preset pick with no
confirmation at all.
**Fix:** Have `updateRailSection`, `toggleTailHardEdge`, `updateFins`, and `updateVolume` also set
`boardStarted: true`, consistent with `updateOutline`'s own comment ("a user who drags a slider
back to its default value has still started a board").

## Info

### IN-01: Dev-only "Copy preset values" reports success without confirming it

**File:** `components/outline/outline-editor.tsx:63-72`
**Issue:** `handleCopyPreset` sets `justCopiedPreset` (which renders the "Copied!" label) and logs
the text to the console unconditionally, before `navigator.clipboard.writeText(...)` has resolved
or rejected. If the clipboard write is rejected (permission denied, insecure context, etc.), the
button still claims success — the failure is swallowed by an empty `.catch()`. Low impact since
this is a development-only tool (confirmed excluded from production, see Summary), but it can
waste a shaper-tuning session if a developer trusts "Copied!" and pastes nothing.
**Fix:** Flip the state inside `.then()` instead of before the call, and surface the fallback (the
value is already in the console) more explicitly on rejection, e.g. a distinct "Copy failed — see
console" label.

### IN-02: `console.log` left in a user-triggered code path

**File:** `components/outline/outline-editor.tsx:65`
**Issue:** `console.log(text)` runs on every click of the dev-only button. It's plausibly
intentional (a fallback display of the captured preset source if clipboard access fails), but it's
indistinguishable from a debugging leftover at a glance, and nothing marks it as intentional other
than the surrounding comment three lines later.
**Fix:** If intentional, move the `console.log` inside the `.catch()` so it only fires when the
clipboard write actually failed, making the intent unambiguous instead of always logging.

### IN-03: `ContinueBoardCard` renders `boardName` untrimmed

**File:** `components/setup/continue-board-card.tsx:19-20`
**Issue:** The fallback check trims to test for emptiness (`boardName.trim().length > 0`) but then
renders the raw, untrimmed `boardName` in the card. A name like `"  My Board"` (leading
whitespace, e.g. from copy-paste) would display with a leading gap instead of being cleaned up.
**Fix:** `const displayName = trimmed.length > 0 ? trimmed : "Untitled Board";` using a single
`const trimmed = boardName.trim();` for both the check and the render.

### IN-04: README.md is unchanged create-next-app boilerplate apart from the appended Deployment section

**File:** `README.md:1-37`
**Issue:** Everything above the `## Deployment` section (added in plan 03) is still the generic
`create-next-app` template content — it never mentions Shaper, surfboard design, or what the app
actually does. Fine for a scratch repo, but this is now a publicly deployed product repo; the
README doesn't orient a new contributor or the project's own founder to what's here.
**Fix:** Replace the boilerplate intro with a short project description (PROJECT.md's "What This
Is" is ready to reuse) above the Deployment section — not blocking, but worth a follow-up pass.

---

_Reviewed: 2026-08-21T16:13:40Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
