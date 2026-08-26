---
id: 260825-uan
slug: theme-ramp-update
date: 2026-08-25
type: quick
status: complete
---
# The app now renders the founder's exported palette — and Chalk is quietly just Daylight now

## What changed

The founder tuned a new palette on the colour bench and exported it. This task moved those 18
values into `app/globals.css`, so the app renders what was exported rather than the palette
from two days ago. Nothing about *how* theming works changed — no new token, no new wiring,
just new values flowing through machinery that was already correct.

Two of those value changes are bigger than a colour swap, so the prose that describes the
themes had to change with them:

- **Chalk is now Daylight with a blue accent.** The two light themes are byte-identical on 13
  of their 17 tokens — ground, sidebar, canvas, tab-active, panel, well, ink, ink-muted, line,
  line-faint, warning, on-warning and warning-ink all match exactly. Only `accent` (blue
  `#3490bc` vs. Daylight's sage `#8ec1b8`), `on-accent`, `accent-ink` and the board wash
  (`fill`) differ. Chalk's old identity — matte black ink, a cyan accent, a flat white canvas —
  is gone. **Worth a real product conversation:** is a settings-menu entry that differs from
  another entry in exactly one visual property (the accent hue) still two themes, or is it one
  theme with an accent picker? Nothing in this task decided that either way — it just made the
  menu's description honest about what's actually there (`Warm paper, blue accent`).

- **Slate's canvas and panel swapped roles.** Before, `canvas` sat flat on the ground and
  `panel` was the lifted surface. Now it's the reverse: `canvas` is lifted (`#1a1d25`) and
  `panel` sits on the ground (`#12141a`). In the app this means the drawing area now floats
  above the cards around it, instead of the cards floating above the drawing area. **This is
  the change most likely to look like a bug on sight** — anyone reviewing Slate in the browser
  will notice cards and canvas have traded depth, and it's worth knowing going in that this is
  the palette working as exported, not a regression.

A smaller side effect: in both light themes, `line-faint` now holds the same value as `line`,
so hairline dividers draw at the same weight as a control edge instead of receding faintly
behind it.

Three comment blocks in `globals.css` (Chalk, Slate, Daylight) and two description strings in
`lib/theme.ts` (what the shaper reads under each theme name in the settings menu) were rewritten
to describe what's actually on screen now, instead of the scheme they replaced.

The colour bench's hand-kept `PUBLISHED` copy — a planning artifact, not part of the app build —
was also updated so its Reset button restores this same palette and its contrast audit describes
it, rather than describing a palette the app no longer has. **That re-sync is done in the file
here, but the published bench artifact has not been redeployed yet** — that's a separate
follow-up (republish to the same URL, passing it explicitly, keeping the 🎨 favicon) that belongs
to whoever runs the next session with browser access, not to this task.

## Verified

- All 18 target values landed exactly once each, and only those 18 lines changed in
  `globals.css` — confirmed by a value readback against the plan's table and a `git diff
  --numstat` showing 18 added / 18 removed lines and nothing else.
- Phosphor's ramp (the green terminal theme) contributes zero lines to the diff — untouched, as
  required.
- The bench's `PUBLISHED` array and `globals.css` were compared value-for-value across all 68
  ramp declarations (4 themes × 17 roles); the drift check reports `BENCH-IN-SYNC 68 values`.
- `npx tsc --noEmit` — clean.
- `npm run lint` — clean (9 pre-existing warnings in unrelated files, 0 errors).
- `npm test` — full suite, 670/670 passing.
- `npm run build` — production build succeeds.
- Only the three declared files changed: `app/globals.css`, `lib/theme.ts`,
  `.planning/sketches/themes/colour-bench.html`. No other file — in particular no `.planning/`
  record of a previous palette — was touched.

**Contrast was audited before this change landed, not after.** All 26 pairings were computed
against the new values during planning, and all four themes clear every WCAG bar. Two pairings
sit exactly on the line on purpose and are not defects:

| Theme | Pairing | Ratio | Bar |
|---|---|---|---|
| Daylight and Chalk | `line` on `canvas` | 3.01:1 | 3:1 non-text |
| Daylight and Chalk | `line` on `well` | 3.01:1 | 3:1 non-text |

(Also close, both comfortably above their bar: `on-warning` on `warning` at 4.57:1 against a
4.5:1 text bar, `ink-muted` on `canvas` at 4.58:1 against 4.5:1, and Slate's `accent-ink` on
`well`/`canvas` at 4.61:1 / 4.70:1 against 4.5:1.) If a future change nudges any of these
further, that's a deliberate decision to re-tune, not a bug to "fix" back.

## What was learned

Nothing structural — this was a value swap through machinery already proven correct in prior
phases (LAYER 2's theme blocks, the bridge, the no-JS defaults all inherit from the ramp
automatically). The one thing worth carrying forward: `--ramp-chalk-ink` really is a prefix of
`--ramp-chalk-ink-muted`, and `#3490bc`/`#12141a`/`#1a1d25` really do collide across roles and
themes the way the plan warned. Anchoring every replacement on the full `property: value;` (or,
in the bench, the whole packed line) rather than a bare hex or a bare property name is what kept
all 27 replacements (18 in globals.css, 9 in the bench) landing exactly once with no
cross-contamination.

## Pending

- **Republish the colour bench artifact** to
  `https://claude.ai/code/artifact/4e019580-9da7-4a41-a0c2-efeca4a0350a` — the orchestrator's
  follow-up, not this task's. Source is synced; the live artifact is not.
- **Human verification of all four themes in the browser** (settings gear → each theme, a
  drawing screen and the Summary) is also the orchestrator's, not the executor's — this session
  drove no browser.
