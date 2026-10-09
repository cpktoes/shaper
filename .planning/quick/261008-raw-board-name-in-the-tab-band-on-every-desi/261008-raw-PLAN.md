---
phase: quick-261008-raw
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/viewer/tabbed-panel.tsx
  - components/viewer/tabbed-panel.test.ts
  - components/viewer/__fixtures__/tabbed-panel-before.json
  - components/design/board-name-copy.ts
  - components/design/board-name-tab.tsx
  - components/design/board-name-tab.test.ts
  - components/design/design-store.tsx
  - components/design/save-button.tsx
  - components/setup/board-name-prompt.tsx
  - components/outline/outline-editor.tsx
  - components/rocker/rocker-editor.tsx
  - components/rails/rail-band-editor.tsx
  - components/volume/volume-estimator.tsx
  - components/fins/fin-placement-editor.tsx
  - app/design/actions.ts
  - lib/rack-stand-in-server.ts
  - lib/models/rack-stand-in.ts
  - lib/models/rack-stand-in.test.ts
  - app/test-rack/page.tsx
  - e2e/board-name-band.spec.ts
  - .planning/quick/261008-raw-board-name-in-the-tab-band-on-every-desi/pictures/
autonomous: true
requirements: [QT-261008-raw]
estimate:
  # One executor, SEQUENTIAL on the main checkout (branch main), then the founder looks before
  # anything ships. Three tasks: the tracer (a saved board renamed from TEMPLATE's band, end to end
  # through the practice rack), every screen + the never-saved and locked cases, then phones and the
  # measured proof at every width plus the five desktop pictures' diffs (not re-recorded).
  # Calibration: factor 1, 0 samples (estimate-calibration, 2026-10-08).
  tokens: 190000
  raw_tokens: 190000
  tasks: 3
  confidence: low
must_haves:
  truths:
    - "On TEMPLATE, ROCKER, RAILS, VOLUME and FINS the board's name sits right-aligned in the tab band, on the same line as the VIEWER / DATA / ... tabs, on a computer, an upright phone and a phone held sideways (founder spec + answer 2)."
    - "A board that has never been saved reads Untitled; clicking it opens the same name prompt the top bar's Save opens, and its Save names AND saves the board for the first time — signed out, the same sign-in step comes first (founder answer 1)."
    - "On a saved board, clicking the name opens Rename board pre-filled with the name; Save renames it (renameModel, the Board Rack's own rename) and the band, SUMMARY's Board Name and the Board Rack all show the new name (founder answer 1)."
    - "A locked board shows the rack's small muted padlock beside its name, and renaming it still works and leaves it locked (founder answer 3)."
    - "The name never pushes a tab off screen, never wraps, and never makes the band taller: the band's measured height is unchanged at every supported width, and a name that does not fit ends in an ellipsis (founder answer 2)."
    - "SUMMARY is unchanged: it has no band name; its order form already shows and edits the name."
  artifacts:
    - path: "components/design/board-name-tab.tsx"
      provides: "BoardNameTab: the name button in the tab band, its padlock, and its two popups (Rename board / Name this board)"
      exports: ["BoardNameTab"]
    - path: "components/design/board-name-copy.ts"
      provides: "every word the band name puts on screen (Untitled, the button's accessible name), pure"
      exports: ["BOARD_NAME_COPY", "bandBoardName", "boardNameButtonLabel"]
    - path: "components/viewer/tabbed-panel.tsx"
      provides: "a `trailing` slot right-aligned in the tab strip; byte-identical markup when unset"
    - path: "e2e/board-name-band.spec.ts"
      provides: "browser proof on a computer, both phones upright and sideways, every supported width"
  key_links:
    - from: "components/design/board-name-tab.tsx"
      to: "app/design/actions.ts renameModel"
      via: "Rename board's Save, then noteRenamed (locked) or setBoardName (unlocked) — the Board Rack's own branch"
      pattern: "renameModel\\("
    - from: "components/design/board-name-tab.tsx and components/design/save-button.tsx"
      to: "design-store saveForFirstTime"
      via: "one first-save implementation for both the top bar's Save and the band's Untitled"
      pattern: "saveForFirstTime\\("
    - from: "the five screens' TabbedPanel"
      to: "BoardNameTab"
      via: "trailing={(strip) => <BoardNameTab touchClearance={strip.touchClearance} />}"
      pattern: "trailing="
---

<objective>
Show which board the shaper is on, everywhere it matters: the board's name (or "Untitled") in the
coloured tab band above the drawing on TEMPLATE, ROCKER, RAILS, VOLUME and FINS, right-aligned
beside the tabs, shortened with "…" when it does not fit. Clicking or tapping it opens a small
popup with the name and a Save button: on a saved board it renames the board (the Board Rack's own
rename), on a never-saved board it names and saves it exactly as the top bar's Save does. A locked
board shows its padlock beside the name and can still be renamed.

Purpose: the founder's words (2026-10-08): "we need to know what board we're on."
Output: the name in the band on five screens, the rename and first-save popups wired to the real
save paths, the practice rack able to rename (so the browser suite and the founder's practice
server can try it), and measured browser proof at every width the app supports.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.planning/STATE.md
@.planning/quick/261008-lsy-board-lock-protect-a-saved-board-from-ac/261008-lsy-01-SUMMARY.md
@.planning/quick/261008-lsy-board-lock-protect-a-saved-board-from-ac/261008-lsy-02-SUMMARY.md

<founder_spec>
"Now, we need to know what board we're on. Untitled when not saved, or display (at least a portion
of) the name. Clicking on the name opens a popup where you can rename and hit a save button. The
name needs to be located somewhere consistent and visible on every page. Summary sheets already
have the name, so I suppose it can be different. I'm thinking that on all the other pages, the
board name can live right justified in the colored border between the viewer windows and the nav
bar; the area where the tabs are located."

Founder answers (locked):
1. Never-saved board: reads "Untitled"; clicking opens the same popup; its Save NAMES AND SAVES the
   board for the first time, exactly like the top bar's Save (components/design/save-button.tsx and
   its name prompt; signed out, the same sign-in step first). Saved board: Save renames it — the
   Board Rack's rename (app/design/actions.ts renameModel), rack and editor kept in step as after a
   rack rename.
2. Phones too: same place, right-aligned beside the tabs, shortened with "…" when it doesn't fit;
   tapping opens the same popup. Upright phone, sideways phone and computer.
3. A locked board shows the same small muted padlock beside the name as the Board Rack caption.
   Renaming works on a locked board (the lock protects the design, not the name).
Scope: TEMPLATE, ROCKER, RAILS, VOLUME, FINS. SUMMARY: nothing (confirmed at plan time — its order
form's "Shaper Use Only" box already carries an editable Board Name field, read-only while locked,
and page 2's header prints the name).
</founder_spec>

<planner_choices>
Each is the planner's call, made on the measurements below; the founder can overrule any at the
look before shipping.
- P-1 Look: the name is 12px semibold sentence case in muted ink (the drafting grammar's "12px
  semibold muted card lines"; uppercase tracked like the tabs would need 74.5 dots for "Untitled"
  instead of 45.5). On a computer a hover turns it to full ink with an underline; a pointer cursor;
  the app's `focus-ring-accent`. No pencil icon (it would cost 16 dots on the tightest phone strip).
- P-2 Box: the name's box is the tab's box minus its bottom border — `border border-b-0
  border-transparent`, the tabs' own vertical padding (`py-1.5`, and `py-0.5` under both phone rules)
  and the tabs' `text-xs` line — so it can never be taller than the active tab and the band's height
  cannot change on any screen. Inner padding: `px-3` on a computer (its text ends 12 dots in, in line
  with the panel's own 12-dot inset), `px-1.5` under both phone rules.
- P-3 Phone tabs tightened: under the existing phone-chrome opt-in (`compactOnPhone`, the same
  `max-shell:` + `[@media(max-height:500px)]:` pair, never a third rule) every tab's side padding goes
  from 18 to 8 dots. Without this, ROCKER's three tabs leave 10.6 dots at 360 wide and 40.6 on an
  iPhone — no room for even "Untitled". RAILS's phone-only NOSE/CENTER/TAIL row, which copies the tab
  classes "verbatim", gets the same 8 dots so the two stacked rows still match. Computers, the
  iPad-like 1180-wide touch screen, and RAILS's View Full Sized dialog keep 18.
- P-4 Touch box on a coarse pointer: on ROCKER, RAILS and FINS (tappable tab strips, which already
  carry 9 dots of clearance above and below on a phone) the name gets the tabs' exact 44-dot touch box.
  On TEMPLATE and VOLUME (a single read-only label, no clearance) the menu button sits right above the
  name's spot and the drawing's own buttons right below it, so the name's tap area fills only the free
  band: 2 dots past its top and bottom edges (25 dots tall on a phone, as wide as the name). Making it
  44 there would cost 18 dots of drawing height on those two screens — the founder's question 2 below.
- P-5 Untitled vs a typed name: per answer 1, a never-saved board always reads "Untitled", even if a
  name was typed into SUMMARY's Board Name box; the popup opens pre-filled with that typed name so
  nothing is lost. (Founder question 1 below.)
- P-6 Wide View (TEMPLATE and ROCKER, computers only) already removes the whole tab band; the name
  goes with it. (Founder question 3 below.)
- P-7 Accessible name: "Board name: Fish — rename" (saved), "Board name: Fish, locked — rename"
  (locked), "Board name: Untitled — name and save" (never saved). The button's tooltip (`title`) is the
  full name, so a shortened name can be read whole on a computer. The name sits OUTSIDE the
  `role="tablist"` element (a tab list may hold only tabs; `e2e/phone-rails.spec.ts` also finds the
  outer list by `hasText: "DATA"`, which a board named "Data..." would otherwise break).
- P-8 The button carries `data-lock-exempt` (renaming is allowed on a locked board; it never changes
  the design), so the lock's browser sweeps and inventory treat it as view-side.
</planner_choices>

<measured_at_plan_time>
Measured 2026-10-08 in headless Chrome against the founder's practice server (port 3005, read-only
page loads; a scripted copy of the planned name button injected into the live strip). Scripts:
the session scratchpad's measure-band.mjs / mock-band.mjs / mock-room.mjs.

Room right of the last tab today (dots), strip width in brackets:
| width | TEMPLATE | ROCKER | RAILS | VOLUME | FINS |
|---|---|---|---|---|---|
| 360 x 780 | 260 | 10.6 (3 tabs) | 19.7 | 242.8 | 40 |
| 375 x 667 | 275 | 25.6 | 34.7 | 257.8 | 55 |
| 390 x 844 iPhone | 290 | 40.6 | 49.7 | 272.8 | 70 |
| 412 x 915 Pixel 7 | 312 | 62.6 | 71.7 | 294.8 | 92 |
| 844 x 390 sideways | 392 | 142.6 | 151.7 | 374.8 | 172 |
| 863 x 360 sideways | 401.5 | 152.1 | 161.2 | 384.3 | 181.5 |
| 820 x 800 | 360 | 228.6 (2 tabs) | 119.7 | 342.8 | 140 |
| 1024 x 768 | 504 | 372.6 | 263.7 | 486.8 | 284 |
| 1280 x 800 | 760 | 628.6 | 519.7 | 742.8 | 540 |

Room for the name's TEXT with P-2/P-3 applied (6-dot gap to the last tab, the name's own padding):
| width | TEMPLATE | ROCKER | RAILS | VOLUME | FINS |
|---|---|---|---|---|---|
| 360 | 260 | 51 | 60 | 243 | 80 |
| 375 | 275 | 66 | 75 | 258 | 95 |
| 390 iPhone | 279+ | 81 | 90 | 273 | 110 |
| 412 Pixel 7 | 279+ | 103 | 112 | 279+ | 132 |
| 844 sideways | 279+ | 183 | 192 | 279+ | 212 |
| 863 sideways | 279+ | 192 | 201 | 279+ | 221 |
| 820 | 279+ | 197 | 88 | 279+ | 108 |
| 1024 | 279+ | 279+ | 232 | 279+ | 252 |
| 1280 | 279+ | 279+ | 279+ | 279+ | 279+ |
("279+" = the 45-character practice board "Uncle Bob's Overhead Point Break Rhino Chaser", 279 dots,
fits whole.) Name widths at 12px semibold: "Untitled" 45.5, "Fish" 24.1, "6'2 Fish" 46.2,
"Mid-length Quad" 98, "…" 11.5; the padlock adds 16 (12 + a 4 gap). So "Untitled" fits whole at every
width; a locked board on ROCKER at 360 has about 35 dots for its name.

Band height with the injected name (unchanged in every case): phone 21 (TEMPLATE, VOLUME) and 31
(ROCKER, RAILS, FINS: 9 + 22); computer 29 and 30. The strip's rectangle in the desktop baseline
pictures (1280 x 800): x 412-1268, y 93-122. On TEMPLATE at 390 the top bar ends at y 48, the strip
runs y 50-71 and the drawing card's own buttons start at about y 74, right under the name's spot.
</measured_at_plan_time>

<interfaces>
- `components/viewer/tabbed-panel.tsx` — `TabbedPanel({ tabs, active, onSelect, children, panelClassName, bare, growOnShortScreen, compactOnPhone })`; `interactive = typeof onSelect === "function" && tabs.length > 1`; the strip is the `!bare` div (role tablist only when interactive); phone padding P-2/P-3 lines 114-131; the tab touch-box class string lines 161-163.
- `components/design/design-store.tsx` — `useDesign()` gives `boardName`, `modelId` (null = never saved), `locked`, `designSnapshotFields`, `setBoardName` (refused while locked; marks dirty so the autosave writes the new name), `noteRenamed(name)` (no dirty, no undo step — for a locked board), `markSaved(id, name)` (lines 815-823).
- `components/design/save-button.tsx` — `runFirstSave` (lines 77-87: saveModel(modelId, name, {...designSnapshotFields, boardName: name}) then markSaved), the signed-out resume (`resumeSaveAfterSignIn` ref + the isSignedIn effect, lines 89-124), `SignInDialog` and `BoardNamePrompt` mounted beside it.
- `components/setup/rename-dialog.tsx` — `RenameDialog({ open, onOpenChange, currentName, onRename })`, title "Rename board", pre-fills and re-arms on every open. Reuse as is.
- `components/setup/board-name-prompt.tsx` — `BoardNamePrompt({ open, onOpenChange, onSave })`, title "Name this board", starts empty.
- `components/setup/board-rack.tsx` lines 197-211 — the rack's rename: renameModel, then for the open board `noteRenamed` when locked, else `setBoardName`. The band copies this branch exactly.
- `components/setup/rack-caption.tsx` lines 96-106 — the padlock: lucide `LockIcon`, muted ink, `BOARD_LOCK_COPY.padlock` ("Locked") as its title.
- `app/design/actions.ts` — `renameModel(modelId, name): Promise<void>` (lines 171-202; no lock check, by the founder's rule) and `setModelLocked`'s signed-out stand-in branch (line 309) to mirror.
- `lib/rack-stand-in-server.ts` — `saveStandInLock` / `standInLocksForRequest` (lines 84-119) to mirror; `lib/models/rack-stand-in.ts` — `standInRowsWithLocks` (line 137); snapshot envelope is `{ version, design: { ...fields, boardName } }`; board 6 of `standInRackRows(6)` is the long name `STAND_IN_LONG_NAME`; board 1 is "Shortboard".
- `e2e/board-lock.spec.ts` lines 1-65 — the practice-rack helpers (startPracticeRack, openRack, openBoardMenu, chooseLockRow, openFromCaption) to copy; `e2e/phone-chrome.spec.ts` lines 133-215 (contentBox, topBarBox, assertTabTouchBox's probes) to copy; `e2e/helpers/screens.ts` `goToScreen` (client-side, keeps the open board).
</interfaces>
</context>

<tasks>

<task type="tracer">
  <name>Task 1: A saved board's name in TEMPLATE's tab band, renamed from there, end to end through the practice rack</name>
  <files>components/viewer/tabbed-panel.tsx, components/viewer/tabbed-panel.test.ts, components/viewer/__fixtures__/tabbed-panel-before.json, components/design/board-name-copy.ts, components/design/board-name-tab.tsx, components/design/board-name-tab.test.ts, components/outline/outline-editor.tsx, app/design/actions.ts, lib/rack-stand-in-server.ts, lib/models/rack-stand-in.ts, lib/models/rack-stand-in.test.ts, app/test-rack/page.tsx, e2e/board-name-band.spec.ts</files>
  <precondition>No `next dev` from this checkout is running before any Playwright command (Next 16 runs one per project directory): `lsof -nP -iTCP:3005 -sTCP:LISTEN` shows nothing. The founder's practice server on 3005 is stopped by the orchestrator, never by you — if it is still up, finish the vitest/tsc/lint steps, then stop and report.</precondition>
  <read_first>
    - components/viewer/tabbed-panel.tsx (whole file)
    - components/setup/rename-dialog.tsx, components/setup/board-rack.tsx lines 197-211, components/setup/rack-caption.tsx lines 90-110, components/design/board-lock-copy.ts
    - app/design/actions.ts lines 163-202 and 286-322; lib/rack-stand-in-server.ts lines 80-119; lib/models/rack-stand-in.ts lines 95-160; app/test-rack/page.tsx; lib/models/rack-stand-in.test.ts lines 150-170 and 230-260
    - components/design/slider-row.test.ts lines 1-30 (createElement + renderToStaticMarkup in the node test environment)
    - e2e/board-lock.spec.ts lines 1-105
  </read_first>
  <behavior>
    - bandBoardName(null, "") and bandBoardName(null, "Fish") are "Untitled"; bandBoardName("id", "Fish") is "Fish"; bandBoardName("id", "  ") is "Untitled".
    - boardNameButtonLabel gives "Board name: Fish — rename", "Board name: Fish, locked — rename", "Board name: Untitled — name and save".
    - standInRowsWithNames sets a named row's `name` and its snapshot's `design.boardName`, leaves other rows deep-equal, and every row still passes rackModelsFromRows.
    - TabbedPanel rendered without `trailing` gives exactly the markup captured before the edit, for the three captured shapes.
  </behavior>
  <action>
1. Before touching tabbed-panel.tsx, capture today's markup: a scratch script under the session
scratchpad (never under the repo or .planning — tsc and lint read loose .ts files there), run with
`npx tsx --tsconfig ./tsconfig.json <abs path>` from the repo root, renders TabbedPanel with
react-dom/server's renderToStaticMarkup (createElement, no JSX) in three shapes — (a) one tab
"VIEWER", no onSelect, compactOnPhone "drawing" (TEMPLATE); (b) three tabs VIEWER/DATA/INSTRUCTIONS
with onSelect, compactOnPhone "drawing" (RAILS); (c) three tabs NOSE/CENTER/TAIL with onSelect,
panelClassName "gap-4", no compactOnPhone (RAILS's View Full Sized dialog) — and writes
{ a, b, c } to components/viewer/__fixtures__/tabbed-panel-before.json. Then
components/viewer/tabbed-panel.test.ts asserts the same three renders still equal the fixture.
Commit the fixture; the script stays in the scratchpad.

2. TabbedPanel gets one new optional prop, `trailing?: (strip: { touchClearance: boolean }) =>
ReactNode`, documented in the file's own register like growOnShortScreen and compactOnPhone (who
passes it — the five drawing screens, never the View Full Sized dialog — and that unset it emits
markup byte-identical to before, proven by the fixture test). `touchClearance` is
`Boolean(compactOnPhone) && interactive`: true exactly when the strip carries the tab touch box and
its 9-dot clearance on a phone. When `trailing` is unset, render exactly today's strip. When set,
the strip div keeps today's classes and padding but carries no role; inside it, a div holding the
tabs (`flex flex-none gap-1.5`, role tablist when interactive, else no role), then a wrapper
`ml-auto flex min-w-0` holding `trailing(...)`. The tabs never shrink; only the name does (P-7).

3. components/design/board-name-copy.ts (pure, no React; header in the register of
board-lock-copy.ts): BOARD_NAME_COPY with `untitled: "Untitled"`; `bandBoardName(modelId,
boardName)` (P-5: "Untitled" whenever modelId is null, else the trimmed name or "Untitled");
`boardNameButtonLabel(name, { saved, locked })` (P-7 wordings).

4. components/design/board-name-tab.tsx ("use client"), `BoardNameTab({ touchClearance })`. Header
comment: what a shaper sees and why (founder spec and answers 1-3, P-1 to P-8). It reads useDesign()
and renders one `<button type="button" data-lock-exempt>` with: aria-label from
boardNameButtonLabel; title the full shown name; classes per P-1 and P-2 (`flex min-w-0 items-center
gap-1 whitespace-nowrap`, text-xs font-semibold text-surf-ink-muted, hover full ink + underline,
cursor-pointer, focus-ring-accent); the name in a `truncate` span; while locked, LockIcon size-3 in
muted ink after the name, aria-hidden, inside a span titled BOARD_LOCK_COPY.padlock and marked
`data-board-name-padlock` (never the warning colour). Touch box per P-4: when touchClearance, the
tabs' exact coarse class string (copy it from tabbed-panel.tsx lines 161-163); otherwise
`coarse:relative coarse:after:absolute coarse:after:inset-x-0 coarse:after:-inset-y-0.5
coarse:after:z-10 coarse:after:content-['']`. For this task the click handles a saved board only:
it opens RenameDialog with currentName = boardName, and onRename awaits renameModel(modelId, name),
then `noteRenamed(name)` when locked, else `setBoardName(name)` — the Board Rack's branch, with a
comment pointing at board-rack.tsx's handler and why (a stale name would be written back by the next
autosave). Task 2 adds the never-saved path.

5. TEMPLATE: outline-editor.tsx passes `trailing={(strip) => <BoardNameTab
touchClearance={strip.touchClearance} />}` to its TabbedPanel, with a one-line comment.

6. The practice rack can rename, mirroring the lock stand-in exactly. lib/rack-stand-in-server.ts:
`saveStandInName(modelId, name): Promise<boolean>` (same resolveRackStandInSave decision: off →
false, fail cookie → throw, slow → wait; same id pattern; a name of 1 to 200 characters after trim,
else false; kept per session in its own globalThis map; revalidatePath(RACK_STAND_IN_ROUTE)) and
`standInNamesForRequest(): Promise<Map<string, string>>`. lib/models/rack-stand-in.ts:
`standInRowsWithNames(rows, names)`. app/test-rack/page.tsx applies names, then locks. renameModel:
keep `await auth()` first; trim and refuse an empty name before the signed-out branch; when there
is no userId, return if saveStandInName took it, else throw "Sign in to rename a board." as today.
Update renameModel's doc comment (the stand-in sentence of setModelLocked's, adapted).
lib/models/rack-stand-in.test.ts gains the standInRowsWithNames cases (behavior above).

7. components/design/board-name-tab.test.ts: the copy cases (behavior above), plus source
contracts: board-name-tab.tsx calls renameModel, uses noteRenamed and setBoardName on the
locked/unlocked branch, and its button carries data-lock-exempt.

8. e2e/board-name-band.spec.ts (header: what the spec proves and why the practice rack; copy the
practice-rack helpers from e2e/board-lock.spec.ts). Test "t1" (desktop project): open the practice
rack with 3 boards, open board 1 from its caption; on TEMPLATE the band's name button (found by its
accessible name, filtered visible) reads board 1's name, sits right of the VIEWER label and inside
the strip (its right edge within 1 dot of the strip's right edge), and the strip's height equals
the computer's measured 29; click it: "Rename board" opens with the field holding the name; type
"Tracer Fish", Save: the dialog closes and the band reads "Tracer Fish"; go back to the rack: the
caption group "Tracer Fish actions" is there; open it again: the band reads "Tracer Fish".

Commit subject in plain English, e.g. "Board name: the board's name now shows beside the VIEWER tab
on TEMPLATE, and clicking it renames the board".
  </action>
  <verify>
    <automated>npx vitest run components/viewer/tabbed-panel.test.ts components/design/board-name-tab.test.ts lib/models/rack-stand-in.test.ts lib/db/ownership.test.ts && npx tsc --noEmit -p . && npm run lint && PW_PORT=3191 npx playwright test e2e/board-name-band.spec.ts --project=desktop -g "t1"</automated>
  </verify>
  <acceptance_criteria>
    - The fixture test passes, so RAILS's View Full Sized dialog (and any strip with no `trailing`) renders exactly as before.
    - t1 passes: a saved board renamed from TEMPLATE's band shows its new name in the band, in the rack, and after reopening.
    - lib/db/ownership.test.ts still passes (renameModel awaits auth() first; still exactly five actions).
  </acceptance_criteria>
  <done>On a computer, TEMPLATE shows a saved board's name at the right end of its tab band; clicking it renames the board for real (practice rack in the browser suite, the account when signed in), and the Board Rack shows the new name.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Every drawing screen, the never-saved "Untitled" path, and the padlock on a locked board</name>
  <files>components/rocker/rocker-editor.tsx, components/rails/rail-band-editor.tsx, components/volume/volume-estimator.tsx, components/fins/fin-placement-editor.tsx, components/design/board-name-tab.tsx, components/design/board-name-tab.test.ts, components/design/design-store.tsx, components/setup/board-name-prompt.tsx, components/design/save-button.tsx, e2e/board-name-band.spec.ts</files>
  <precondition>Task 1 is committed; no `next dev` from this checkout is running (as Task 1).</precondition>
  <read_first>
    - components/design/save-button.tsx (whole file); components/setup/board-name-prompt.tsx (whole file)
    - components/design/design-store.tsx lines 255-300 and 395-412 (the context interface), 806-823 (markSaved), 1250-1300 (the autosave's own saveModel call), 1395-1450 (the context value)
    - each screen's TabbedPanel call: rocker-editor.tsx ~292, rail-band-editor.tsx ~279, volume-estimator.tsx ~50, fin-placement-editor.tsx ~102
    - components/auth/sign-in-dialog.tsx lines 60-80 (its title "Sign in to save your boards")
  </read_first>
  <behavior>
    - Source contract: save-button.tsx and board-name-tab.tsx both call saveForFirstTime and neither calls saveModel itself — one first save for both buttons.
    - Source contract: the five screen files each pass `trailing=` with BoardNameTab; summary files do not import BoardNameTab.
  </behavior>
  <action>
1. One first save (founder answer 1, "exactly like the top bar's Save"): add `saveForFirstTime(name:
string): Promise<void>` to the design store's context — the two steps of SaveButton's runFirstSave
(saveModel with a null id and the snapshot carrying the name being saved, then markSaved(id, name)),
doing nothing when the board already has a modelId, and guarded by a ref so a second call while
one is in flight returns the same promise instead of inserting a second board. Rejects on failure
(the dialogs show their own error). Document it beside markSaved. SaveButton's runFirstSave keeps
its own in-flight face and now awaits saveForFirstTime; drop the imports and fields it no longer
uses. Nothing else in SaveButton changes.

2. BoardNamePrompt gains an optional `initialName` (the field is re-filled with it every time the
prompt opens, using RenameDialog's `wasOpen` render-phase pattern; the existing reset on close
stays). SaveButton passes nothing, so its prompt behaves exactly as today.

3. BoardNameTab, never-saved board (modelId null): the button reads BOARD_NAME_COPY.untitled. Click
signed out: open SignInDialog and remember the intent in a ref; when isSignedIn turns true with the
ref set, open the name prompt — SaveButton's resume pattern, copied with a comment saying so. Click
signed in: open BoardNamePrompt with initialName = boardName (P-5) and onSave = saveForFirstTime.
After the save the band reads the new name (markSaved sets it) and the top bar shows "Saved". Mount
SignInDialog and BoardNamePrompt beside RenameDialog.

4. The other four screens pass the same `trailing` render prop as TEMPLATE, each with the one-line
comment: ROCKER (whichever of its two tab lists is showing), RAILS (the outer VIEWER/DATA/INSTRUCTIONS
panel only — never the View Full Sized dialog), VOLUME, FINS.

5. board-name-tab.test.ts gains the two source contracts (behavior above), written first and seen
failing, then green.

6. e2e (desktop project), added to e2e/board-name-band.spec.ts:
- "e1": open board 1; the band reads its name on TEMPLATE, ROCKER, RAILS, VOLUME and FINS (goToScreen,
  client-side); SUMMARY has no band name button and its Board Name field holds the name; rename from
  FINS to "Every Screen": TEMPLATE's band and SUMMARY's Board Name field both read it.
- "e2": a fresh /design/outline (nothing opened): the band reads "Untitled" with the accessible name
  "Board name: Untitled — name and save"; clicking it opens the dialog titled "Sign in to save your
  boards" — the same dialog the top bar's Save Board opens (press that too, after Escape, and compare
  titles).
- "e3": lock board 1 from its ⋯ menu, open it: the band shows its name and the padlock
  (`[data-board-name-padlock]` visible, title "Locked"), accessible name "..., locked — rename";
  rename to "Locked Fish": the band reads it, the padlock stays, Unlock is still in the top bar; back
  on the rack the caption reads "Locked Fish" with its padlock.
- "e4": practice rack with the `fail` save cookie: rename shows "Couldn't save — check your connection
  and try again." and the dialog stays open; Escape: the band still reads the old name.

Commit subject in plain English, e.g. "Board name: every drawing screen shows the board's name;
Untitled boards save from it, locked boards show their padlock".
  </action>
  <verify>
    <automated>npx vitest run components/design && npx tsc --noEmit -p . && npm run lint && PW_PORT=3191 npx playwright test e2e/board-name-band.spec.ts e2e/board-lock.spec.ts e2e/board-lock-screens.spec.ts --project=desktop</automated>
  </verify>
  <acceptance_criteria>
    - t1, e1-e4 pass; board-lock.spec.ts and board-lock-screens.spec.ts still pass on the desktop project (the name button is view-side, P-8).
    - The two source contracts were seen failing before the edits, then pass.
    - A text locator in an existing spec that now also matches the band's name (a strict-mode "resolved to 2 elements") is narrowed to its own region, never by changing the band; any such fix is listed in the SUMMARY.
  </acceptance_criteria>
  <done>On a computer all five drawing screens show the board's name; Untitled takes the same sign-in and name-and-save path as the top bar's Save; a locked board shows its padlock and can still be renamed; SUMMARY is unchanged.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Phones — tabs tightened so the name fits beside three tabs, measured at every width, and the five desktop pictures' changes shown, not re-recorded</name>
  <files>components/viewer/tabbed-panel.tsx, components/viewer/tabbed-panel.test.ts, components/rails/rail-band-editor.tsx, e2e/board-name-band.spec.ts, .planning/quick/261008-raw-board-name-in-the-tab-band-on-every-desi/pictures/</files>
  <precondition>Tasks 1-2 are committed; no `next dev` from this checkout is running (as Task 1).</precondition>
  <read_first>
    - components/viewer/tabbed-panel.tsx lines 108-170 (as left by Task 1)
    - components/rails/rail-band-editor.tsx lines 398-440 (the phone NOSE/CENTER/TAIL row)
    - e2e/phone-chrome.spec.ts lines 120-250 and 446-500 (the helpers and the pinned TEMPLATE frame)
    - e2e/desktop-baseline.spec.ts lines 1-30 (the RE-RECORDED entry format, for the founder's later step)
  </read_first>
  <behavior>
    - The fixture test's shapes (a) and (b) (both pass compactOnPhone) now differ from the before-capture by exactly the added phone padding tokens on each tab and nothing else; shape (c), the View Full Sized dialog, is still byte-identical.
  </behavior>
  <action>
1. P-3: in TabbedPanel, under the existing `!bare && compactOnPhone` condition next to P-2's
`py-0.5`, add `max-shell:px-2 [@media(max-height:500px)]:px-2` to every tab, with a comment citing
the measured room (ROCKER 10.6 dots at 360 and 40.6 on an iPhone before; 51 and 81 for the name's
text after). In rail-band-editor.tsx's phone-only NOSE/CENTER/TAIL row change `px-[18px]` to `px-2`
(unprefixed, as that row's own comment explains) so the two stacked rows keep one look. Update the
fixture test for shapes (a) and (b) per behavior above (remove exactly those tokens, then compare to
the before-capture) — never re-capture the fixture.

2. e2e/board-name-band.spec.ts, phone projects (iphone, android), viewport set explicitly:
- "p1" upright — iPhone 390x844, Pixel 7 412x915, and on the android project also 360x780 and
  375x667 — on all five screens with board 1 open, then with board 6 (the long name) open: the strip
  height is 21 (TEMPLATE, VOLUME) or 31 (ROCKER, RAILS, FINS); every tab lies wholly inside the strip
  and inside the viewport; the name starts at least 6 dots right of the last tab and ends inside the
  strip; the name is one line (its height equals the active tab's within 1 dot); no sideways page
  scroll; board 6's name span has text-overflow ellipsis and scrollWidth > clientWidth on ROCKER.
  A fresh unsaved board on ROCKER at 360: "Untitled" shown whole (scrollWidth <= clientWidth).
  Touch: on ROCKER, RAILS and FINS the name's ::after is 44 tall and reaches 10 dots above and below
  it without reaching 1 dot above the top bar's bottom or 1 dot into the drawing (assertTabTouchBox's
  probes, copied); on TEMPLATE and VOLUME a point 1 dot above and 1 dot below the name still hits it,
  and a point 1 dot above the top bar's bottom edge and 1 dot inside the drawing area does not.
  Tapping the name opens "Rename board", wholly inside the viewport, its field's font-size at least
  16px (no zoom on focus).
- "p2" sideways — iPhone 844x390, Pixel 7 863x360 — the same geometry on all five screens with
  board 6 open, and the tap opens the dialog.
- "d1" (desktop project) at 1280x800, 1024x768 and 820x800 on all five screens with board 6 open:
  strip height 29 or 30; tabs keep 18-dot side padding; tabs wholly inside and left of the name; one
  line; RAILS at 820 shows the ellipsis; the button's title is the full name.

3. Re-run, all three projects: `PW_PORT=3191 npx playwright test e2e/board-name-band.spec.ts
e2e/phone-chrome.spec.ts e2e/phone-rails.spec.ts e2e/rocker-top-view.spec.ts e2e/touch-sizing.spec.ts
e2e/phone-sideways-top-bar.spec.ts e2e/board-lock.spec.ts e2e/board-lock-screens.spec.ts`. Fix a
broken assertion only when it pinned the old tab side padding or now meets the name, and say so.

4. The five desktop pictures (e2e/desktop-baseline.spec.ts) WILL change — "Untitled" now sits at
each band's right end. Run that spec without `--update-snapshots` (never pass it in this plan);
expect all five to fail. Copy each failure's expected, actual and diff PNG from test-results into
the quick folder's pictures/ (names like outline-desktop-expected.png), and with sharp (already in
node_modules; a scratch script in the scratchpad) compute each diff's changed-pixel bounding box.
Each box must lie inside the band's right end (x at least 1190, y between 93 and 123, from the
strip measured at plan time); a box anywhere else is a regression to fix, not a picture to show.
Record the five boxes and pixel counts in the SUMMARY under "Pictures for the founder".

5. Last: `npm test`, tsc and lint, then the full browser suite detached on PW_PORT=3191 (the
nohup + `E2E_EXIT=` marker recipe), reading its final line and exit code in their own step. The
only acceptable failures are the five desktop-baseline pictures; report the counts.

Commit subject in plain English, e.g. "Board name: on a phone the tabs sit a little closer
together so the board's name fits beside them, upright and sideways".
  </action>
  <verify>
    <automated>npx vitest run components/viewer/tabbed-panel.test.ts && npx tsc --noEmit -p . && PW_PORT=3191 npx playwright test e2e/board-name-band.spec.ts e2e/phone-chrome.spec.ts e2e/phone-rails.spec.ts e2e/rocker-top-view.spec.ts e2e/touch-sizing.spec.ts e2e/phone-sideways-top-bar.spec.ts</automated>
  </verify>
  <acceptance_criteria>
    - p1, p2 and d1 pass on their projects; the named phone specs still pass.
    - Five expected/actual/diff triples are in pictures/, each diff box inside the band's right end; the snapshot files under e2e/desktop-baseline.spec.ts-snapshots/ are unchanged in git.
    - The full suite's only failures are the five desktop-baseline pictures.
  </acceptance_criteria>
  <done>On every phone size the app supports, upright and sideways, the board's name fits beside the tabs (shortened with "…" when it must), is tappable, and the band is exactly as tall as before; the five changed computer pictures are ready for the founder to approve.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser → renameModel / saveModel (Server Actions) | the name and the board id are untrusted input |
| signed-out caller → practice-rack stand-in | test servers only; never a production build |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-raw-01 | Elevation of privilege | renameModel from the band | high | mitigate | unchanged server checks: `await auth()` first, the update scoped to the row id AND the owner (ownership.test.ts pins both); the band adds no new action |
| T-raw-02 | Spoofing | renameModel's new signed-out branch | high | mitigate | it reaches only `saveStandInName`, which is off unless NODE_ENV is not production (the literal `process.env.NODE_ENV` read, pinned by rack-stand-in.test.ts) and SHAPER_RACK_STAND_IN is "1"; otherwise it throws "Sign in to rename a board." exactly as today |
| T-raw-03 | Tampering | stand-in names in dev-server memory | low | mitigate | id pattern `^[A-Za-z0-9_-]{1,64}$`, names 1-200 characters after trim, kept per session cookie |
| T-raw-04 | Tampering | a rename racing an in-flight autosave of the old name | low | mitigate | the band copies the rack's branch: an unlocked board gets setBoardName, so the next autosave writes the new name; a locked board never autosaves |
| T-raw-05 | Tampering | a double first save (top bar Save and band Untitled at once) | low | mitigate | saveForFirstTime's in-flight guard returns the running save instead of inserting a second board |
| T-raw-06 | Information disclosure | the name rendered in the band and its tooltip | low | accept | React text and attribute escaping; the name is the shaper's own, shown only in their own browser |
</threat_model>

<verification>
- `npm test`, `npx tsc --noEmit -p .`, `npm run lint` pass.
- `PW_PORT=3191 npx playwright test e2e/board-name-band.spec.ts` passes on all three projects.
- The full browser suite's only failures are the five desktop-baseline pictures (read the EXIT line in its own call).
- No file under lib/geometry/ changed; no database schema, migration or `.env*` file touched; nothing pushed.
</verification>

<success_criteria>
A shaper on TEMPLATE, ROCKER, RAILS, VOLUME or FINS — on a computer, an upright phone or a phone held
sideways — can read which board they are on at the right end of the tab band, click or tap it to
rename it (or, on a never-saved board, to name and save it), and sees the padlock on a locked board;
the band is no taller, no tab moves off screen, and SUMMARY is as it was.
</success_criteria>

<ship_notes>
- Nothing is pushed by this plan. The founder looks first (the practice rack, `/test-rack?boards=6`,
  board 6 has the long name; or signed in on localhost against the development branch), including
  the five desktop pictures in pictures/ and the three questions in the hand-off.
- After the founder approves the pictures, and only then: stop any dev server from this checkout,
  run `PW_PORT=3191 npx playwright test e2e/desktop-baseline.spec.ts --project=desktop
  --update-snapshots`, and add a dated RE-RECORDED entry at the top of e2e/desktop-baseline.spec.ts's
  header (what changed — "Untitled" at each band's right end — the diff boxes, old and new SHA-256),
  as the earlier entries do; commit that on its own.
- No database change. But this work sits on top of the board lock (261008-lsy), which is not yet
  live: the push still waits for its production migration (check → `npm run db:migrate:prod` →
  check, commands in scripts/check-preference-columns.ts' header) and the founder's go.
- The founder's practice server on 3005 hot-reloads from this checkout, so it shows each task as it
  lands; it must be stopped before any Playwright run (one `next dev` per checkout).
</ship_notes>

<output>
Create `.planning/quick/261008-raw-board-name-in-the-tab-band-on-every-desi/261008-raw-SUMMARY.md`
when done. Commit messages and the SUMMARY explain each change in plain English: what it does to
the board or the screen.
</output>
