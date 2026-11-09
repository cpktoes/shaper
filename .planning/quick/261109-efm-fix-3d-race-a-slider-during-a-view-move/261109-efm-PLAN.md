---
phase: quick-261109-efm
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - e2e/three-d-bay.spec.ts
  - components/3d/three-d-screen.tsx
autonomous: true
requirements: [QT-261109-efm]
estimate:
  # One executor in this worktree. Two tasks, two files: the checks first (run red), then a few lines in one screen
  # file (run green). Most of the cost is Playwright output. Calibration: factor 1, 0 samples.
  tokens: 30000
  raw_tokens: 30000
  tasks: 2
  confidence: low
must_haves:
  truths:
    - "On the 3D page, press Bottom, then Deck, and touch Rotate on Side while the board is still turning back deck up: the board lands deck up, rolled just the one step asked for (the panel reads 'Rotate on Side — 1° right'), and never lands bottom up again."
    - "On Turn the Board, press Nose, then Tail, and move Look Down the Rail to 6 while the board is still turning: the board lands with the tail toward you, six degrees off, and the slider reads 6. It never swings back with the nose toward you, and the slider is never pinned at its 25° limit."
    - "Everything else pressed during a move behaves as it did before: a second view button, a key on the drawing, a drag, a second finger, the zoom and the Room icon (tests 8b to 8e), and the locked-board 3D check x-3d, which now passes every time on the iPhone instead of only on a slow machine."
  artifacts:
    - path: "e2e/three-d-bay.spec.ts"
      provides: "Tests 8f and 8g in the 'the shaping bay' describe block, plus a key-on-a-slider kind of second press in pressDuringMove"
      contains: "8f."
    - path: "components/3d/three-d-screen.tsx"
      provides: "onRoll and onSight land a move under way before they read which face is up and which end is toward you"
      contains: "onRoll"
  key_links:
    - from: "components/3d/three-d-screen.tsx onRoll"
      to: "flippedRef.current (which face is up)"
      via: "finishMotion() called before totalRoll(shown, flippedRef.current) is worked out"
      pattern: "finishMotion\\(\\);"
    - from: "components/3d/three-d-screen.tsx onSight (Turn the Board branch)"
      to: "headingRef.current (which end is toward you)"
      via: "finishMotion() called at the top of onSight, before the walking test and before headingRef is read"
      pattern: "finishMotion\\(\\);"
---

<objective>
Fix a race on the 3D page. If a shaper touches a slider while a view button's move is still under way, the board
should land where the move was going and then take the slider's change from there.

Today, two sliders read the board's old state. Rotate on Side reads the face the board is leaving, and Look Down the
Rail reads the end the board is leaving. So pressing Bottom, then Deck, then touching Rotate on Side before the board
has finished turning back lands it bottom up again, rolled about 180°. Likewise Nose, then Tail, then Look Down the Rail
swings the nose back toward you, with the slider pinned at its limit. It is a timing bug: a fast machine shows it every
time, a slow one hides it. It was already there before Phase 17: x-3d fails 3/3 on the iPhone run alone on 49b737c3.

Purpose: the shaper's slider touch should be measured from the board they are about to see, not the one they just left.
The five view buttons already keep this promise (the comment above `onView`); the sliders should keep it too.

Output: two new browser checks (8f, 8g), shown failing first. Then a few-line fix in `components/3d/three-d-screen.tsx`
that turns them green, with no other behaviour changed.

Why there is no separate tracer task: the whole change is one path (a slider touched during a move), and Task 1's checks
drive that path end to end through the real page before Task 2 touches the source.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@components/3d/three-d-screen.tsx
@e2e/three-d-bay.spec.ts
@e2e/board-lock-screens.spec.ts
@lib/geometry/shaping-bay.ts

Work only inside the worktree /Users/kontoes/Code/shaper/.claude/worktrees/unruffled-jackson-c76275. Use absolute paths
and `git -C`. Never `cd` into a subfolder or another checkout. Never touch /Users/kontoes/Code/shaper itself, and never
name or read any `.env*` file. Do NOT push, merge to main or deploy.

<interfaces>
What the executor needs, so it does not have to explore. These are the current lines in
components/3d/three-d-screen.tsx (around 972–992):

```ts
// Each control writes its own plane. The other two come from the turn's exact angles, never from the rounded thumbs,
// so a whole-degree reading can never creep them (the plan's trap 1).
const setPlane = (change: Partial<RackAngles>) => {
  finishMotion();
  applyTurn(rackTurn({ ...rackAngles(turnRef.current), ...change }));
};
const onRaise = (end: RaisedEnd, heightMm: number) => { ... setPlane({ lift: ... }); };   // safe: reads only seat/end
const onRoll = (shown: number) => setPlane({ roll: totalRoll(shown, flippedRef.current) });  // BUG: reads before landing
// Look Down the Rail moves you on Walk Around. On Turn the Board you stay put, so it turns the board instead, the same few
// degrees, which gives the same line of sight down the rail with the room still.
const onSight = (sightDeg: number) => {
  if (!walkingRef.current) {
    setPlane({ swing: headingRef.current + sightDeg });   // BUG: reads headingRef before landing
    return;
  }
  finishMotion();
  applyViewer({ ...viewerRef.current, sightDeg });
};
```

- `finishMotion()` (line ~657) stops the animation frame and runs the pending `land()`. `land()` sets
  `flippedRef.current` and `headingRef.current` and re-reads the panel. When no move is under way it does nothing, so
  calling it twice is harmless.
- `moveTo`'s `land()` (line ~892) is the only place those two refs change during a move.
- `totalRoll(shown, flipped)` returns `wrap(shown + 180)` when flipped, else `shown`. `lookOfSwing(swing, heading)`
  clamps to ±`SIGHT_LIMIT_DEG` = ±25. Both are in lib/geometry/shaping-bay.ts.
- The sliders are in `components/3d/three-d-rack-controls.tsx`:
  - Rotate on Side: min −180, max 180, step 1, value = the shown roll.
  - Look Down the Rail: ±25, step `SIGHT_STEP_DEG` = 0.25.
  - Both call `onValueChange` → `onRoll` / `onSight`.
- Base UI 1.7 (`node_modules/@base-ui/react/slider/thumb/SliderThumb.js`) puts `onKeyDown` on the slider's own
  `<input type="range">`. It does not check `isTrusted` or which element has focus. It works out the new value from the
  slider's current reading (ArrowRight adds one step), then calls `onValueChange`. So a `keydown` dispatched to
  `input[aria-label="Rotate on Side"]` should take the same path as x-3d's `roll.press("ArrowRight")`. Task 1 must
  confirm this by running it.
- e2e/three-d-bay.spec.ts helpers to reuse:
  - `waitForBoard`, `turnOf`, `isTurn`, `slider(page, name)`, `view(page, name)`, `settled(host)`.
  - `pressDuringMove(page, first, second)` (lines 113–164). It clicks `first`, waits two animation frames inside the
    page (a move takes `VIEW_TURN_MS` = 400 ms), then delivers `second`, which can be `button`, `key` (on the drawing),
    `slider: { name, value }` (input + change events) or `pointers`.
  - Imports already present: `AT_REST`, `BOTTOM_UP`, `rackTurn`, `THREE_D_COPY` (`rotateOnSide` "Rotate on Side",
    `lookDownRail` "Look Down the Rail", `views.bottom/deck/nose/tail`).
- How the panel reads the roll: `THREE_D_COPY.rollValue(deg)` gives "flat" or "N° left/right". The row shows
  "Rotate on Side — 1° right". Test 1 finds it with
  `page.locator("[data-three-d-racks]").getByText(`${THREE_D_COPY.rotateOnSide} — 5° right`, { exact: true })`.
- Projects in playwright.config.ts: `iphone`, `android`, `desktop`. The default mode is Turn the Board (test 8d relies on
  it).
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Two checks that touch a slider while the board is still turning back, shown failing on today's code</name>
  <files>e2e/three-d-bay.spec.ts</files>
  <precondition>Port 3163 has no listener (`lsof -nP -iTCP:3163 -sTCP:LISTEN` prints nothing), and no other `next dev` is running from this worktree. Never use port 3000 or 3005.</precondition>
  <behavior>
    - 8f: land Bottom first (deck down, Rotate on Side reads 0). Press Deck and, two frames into its turn, press
      ArrowRight on the Rotate on Side slider. After everything settles: Rotate on Side reads 1, the panel shows
      "Rotate on Side — 1° right", and the board's turn equals rackTurn({ ...AT_REST, roll: 1 }), deck up and rolled one
      step. On today's code the slider reads −179 (or "179° left") and the board is bottom up, so the check FAILS.
    - 8g: land Nose first (turn rackTurn({ ...AT_REST, swing: 180 }), Look Down the Rail reads 0). Press Tail and, two
      frames into its turn, set Look Down the Rail to 6. After settling: the slider reads 6 and the turn equals
      rackTurn({ ...AT_REST, swing: 6 }), tail toward you and six degrees off. On today's code the slider reads −25 and
      the turn is swing 186 (nose toward you), so the check FAILS.
  </behavior>
  <action>
    Do NOT touch components/3d/three-d-screen.tsx in this task.

    1. Extend `pressDuringMove` in e2e/three-d-bay.spec.ts with one more optional kind of second press, alongside
       `button`, `key`, `slider` and `pointers`: `sliderKey?: { name: string; key: string }`.
       - Inside the page, find `input[aria-label="<name>"]`, give it focus with `{ preventScroll: true }` so a phone
         layout does not scroll mid-move, then dispatch a `KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })`
         on that input.
       - Put it in the same position as the other second-press branches, after the two `frame()` awaits.
       - Add "a key on a slider" to the helper's doc comment.
       - Why a key: x-3d and a shaper's keyboard take this path (focus the slider, press an arrow). Base UI's
         `onKeyDown` lives on that input and works out the new value itself, so ArrowRight on a reading of 0 calls
         `onRoll(1)`.

    2. Add test 8f after test 8e and before test 9, inside `test.describe("the shaping bay", ...)`. Title, in the file's
       plain-English style: "8f. a slider touched while Deck is still turning back from Bottom reads from the deck:
       Rotate on Side moves one step from flat, and never rolls the board back bottom up". Steps:
       - `page.goto("/design/3d")`, then `host = await waitForBoard(page)`.
       - Click `view(page, THREE_D_COPY.views.bottom)`. Poll until `isTurn(turnOf(host), rackTurn(BOTTOM_UP))`
         (10 s timeout, as test 2 does), then `settled(host)`. Expect the Rotate on Side slider `toHaveValue("0")`.
       - `pressDuringMove(page, THREE_D_COPY.views.deck, { sliderKey: { name: THREE_D_COPY.rotateOnSide, key: "ArrowRight" } })`,
         then `settled(host)`.
       - Assert in this order:
         1. The Rotate on Side slider `toHaveValue("1")`. This comes first because its failure message tells you which
            path the red run took.
         2. The racks panel shows `${THREE_D_COPY.rotateOnSide} — 1° right` (same locator form as test 1).
         3. `isTurn(await turnOf(host), rackTurn({ ...AT_REST, roll: 1 }))` is true.

    3. Add test 8g right after 8f: "8g. and Look Down the Rail touched while Tail is still turning back from Nose turns
       from the tail, not the nose". Steps:
       - Go to the page and wait for the board.
       - Click `view(page, THREE_D_COPY.views.nose)`. Poll until `isTurn(..., rackTurn({ ...AT_REST, swing: 180 }))`,
         then `settled(host)`. Expect the Look Down the Rail slider `toHaveValue("0")`.
       - `pressDuringMove(page, THREE_D_COPY.views.tail, { slider: { name: THREE_D_COPY.lookDownRail, value: 6 } })`,
         then `settled(host)`.
       - Assert, slider first: Look Down the Rail `toHaveValue("6")`, then
         `isTurn(await turnOf(host), rackTurn({ ...AT_REST, swing: 6 }))` is true.
       - Stay in the default Turn the Board mode. Do not click a mode button.

    4. Run the new checks RED (command in verify). All four runs (8f and 8g on desktop and iphone) must fail, and fail
       for the right reason:
       - 8f's first assertion must show the slider at "-179" (the key reached the slider and the roll was taken from
         the bottom). If it shows "0" and the board is still flat, the dispatched key never reached Base UI's handler.
         In that case, switch 8f's second press to the existing `slider: { name: THREE_D_COPY.rotateOnSide, value: 1 }`
         path. That fires input + change events, which reach the same `onValueChange` → `onRoll(1)`. Then remove the
         now-unused `sliderKey` branch, re-run, and say which path you used, and why, in the SUMMARY.
       - 8g's first assertion must show "-25", the slider pinned at its limit with the nose toward you.
       - A timeout finding a button or a slider is NOT a valid red. Fix the selector and re-run.

    5. Commit only e2e/three-d-bay.spec.ts with `git -C <worktree> commit -F <message file in the scratchpad>`. Use a
       plain-English message about what happens on the screen. Subject:
       "test(quick-261109-efm): two checks that touch a slider while the board is still turning back from Bottom or Nose — they fail today".
       In the body, say what each check does and what today's code gets wrong: Rotate on Side lands the board bottom
       up again, and Look Down the Rail swings the nose back toward you. End with the trailer line
       "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>".
  </action>
  <verify>
    <automated>PW_PORT=3163 IS_WEBPACK_TEST=1 npx playwright test e2e/three-d-bay.spec.ts -g "8f|8g" --project=desktop --project=iphone --workers=1   # EXPECTED RED: 4 failed, 0 passed; 8f's slider received "-179", 8g's received "-25"</automated>
  </verify>
  <done>Tests 8f and 8g are in the "the shaping bay" describe block. On desktop and iphone, both fail against the unfixed screen for the reasons described (the board read from the face or end it was leaving), not for a missing element. The test file alone is committed with a plain-English message. The SUMMARY will say whether 8f used the key path or the slider fallback.</done>
</task>

<task type="auto">
  <name>Task 2: A slider touched during a move lands the move first, so it reads the face and the end the board was turning to</name>
  <files>components/3d/three-d-screen.tsx</files>
  <action>
    In components/3d/three-d-screen.tsx, around lines 972–992:

    1. `onRoll`: change it from an expression body to a block. Call `finishMotion();` first, then
       `setPlane({ roll: totalRoll(shown, flippedRef.current) })`. Once the move under way has landed, `flippedRef`
       holds the face it was putting up.

    2. `onSight`: move the existing `finishMotion();` from the Walk Around branch to the very top of the function,
       before the `walkingRef.current` test. Both branches then land the move first.
       - The Turn the Board branch then reads `headingRef.current`, which is now the end the move was turning toward you.
       - The Walk Around branch behaves exactly as before: it already landed first, and `land()` never changes
         `walkingRef`.

    3. Leave `setPlane` as it is. Keep its own `finishMotion()`, because `onRaise` relies on it. On `onRoll`'s and
       `onSight`'s path it now finds nothing under way, which is harmless. Do not change `setPlane`'s signature. Do not
       touch `onRaise`, `onKeyDown`, `onView`, `onMode`, `moveTo` or the pointer handlers. The orchestrator's audit found
       them all safe: each lands before it reads, or reads only what landing never changes.

    4. Comments, in plain English for a shaper-facing codebase:
       - Extend the comment above `setPlane`, keeping its existing point about the exact angles. Add that a slider
         touched while a view's move is still under way lands that move first. Rotate on Side then reads from the face
         the move was putting up, and Look Down the Rail from the end it was turning toward you: the same promise the
         comment above `onView` makes for the buttons.
       - Add one sentence recording what used to happen, citing quick 261109-efm: Bottom, then Deck, then a touch of
         Rotate on Side landed the board bottom up again.
       - Keep the existing comment above `onSight`, adjusting it only if it needs to mention the landing.
       - Do not write the bare statement `finishMotion();` inside a comment (the verify's structural check counts those
         statements).

    5. Run, all from the worktree root with absolute paths:
       - Task 1's two checks, now GREEN on desktop, iphone and android.
       - The rest of the "pressed during a move" family, 8b to 8e, on desktop and iphone.
       - x-3d on the iphone, three times.
       - `npm test` and `npm run lint`.
       - `npx tsc --noEmit`. It may report phantom `LayoutProps` errors in a worktree; only new errors in the touched
         files count. If route types are missing in this fresh worktree, run `npx next typegen` first.
       Run the Playwright commands one at a time on port 3163, never 3000 or 3005. If the web server will not start
       because another `next dev` holds this checkout, stop and report. Do not kill a process you did not start.

    6. Commit only components/3d/three-d-screen.tsx with `git -C <worktree> commit -F <message file in the scratchpad>`.
       Use a plain-English message.
       - Subject: "fix(quick-261109-efm): a slider touched while the board is still turning lands the turn first".
       - Body:
         - Press Bottom, then Deck, and touch Rotate on Side before the board has finished turning back. The board used
           to land bottom up again, rolled about 180°. Now it lands deck up, rolled just the step asked for.
         - On Turn the Board, Nose, then Tail, then Look Down the Rail used to swing the nose back toward you with the
           slider stuck at its limit. Now the board turns those few degrees off the tail.
         - The buttons, keys and drags behave as before.
         - It was a timing bug, so a fast machine showed it every time and a slow one hid it.
       - End with "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>".
  </action>
  <verify>
    <automated>PW_PORT=3163 IS_WEBPACK_TEST=1 npx playwright test e2e/three-d-bay.spec.ts -g "8f|8g" --project=desktop --project=iphone --project=android --workers=1</automated>
    <automated>PW_PORT=3163 IS_WEBPACK_TEST=1 npx playwright test e2e/three-d-bay.spec.ts -g "8b|8c|8d|8e" --project=desktop --project=iphone --workers=1</automated>
    <automated>PW_PORT=3163 IS_WEBPACK_TEST=1 npx playwright test e2e/board-lock-screens.spec.ts:851 --project=iphone --workers=1 --repeat-each=3</automated>
    <automated>sed -n '/const onRoll/,/const onKeyDown/p' /Users/kontoes/Code/shaper/.claude/worktrees/unruffled-jackson-c76275/components/3d/three-d-screen.tsx | grep -cE '^\s+finishMotion\(\);'   # expect 2 or more (onRoll, and the top of onSight)</automated>
    <automated>npm test && npm run lint</automated>
  </verify>
  <done>8f and 8g pass on desktop, iphone and android. 8b to 8e still pass. x-3d passes 3/3 on the iphone run alone. Vitest is green and lint is clean. tsc shows no new errors in three-d-screen.tsx. The fix is committed alone with a plain-English message, and the only source change is the landing order in onRoll and onSight plus their comments.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| slider input to the 3D scene | A slider's number already passes through Base UI's min/max/step clamp and `rackTurn`. Nothing new crosses here. The fix only changes when a pending animation lands. |

No new input, network call, storage, package, database change or saved value. The 3D view is never saved (D-17).

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-261109-efm-01 | Denial of service | `onRoll` / `onSight` landing a move in three-d-screen.tsx | low | accept | Landing early only cancels one pending animation frame and runs the move's own `land()` once (`finishMotion` clears `landingRef` before calling it). No new timer, loop or listener. |
| T-261109-efm-02 | Tampering | e2e helper `pressDuringMove` | low | accept | Test-only code that dispatches events in the suite's own browser against the local dev server on port 3163. It never runs in production. |
</threat_model>

<verification>
- RED first: Task 1's run shows 8f and 8g failing on the unfixed screen for the reasons described: 8f's slider "-179"
  (or, on the fallback path, the board bottom up), 8g's slider "-25".
- GREEN after: 8f and 8g pass on all three projects. 8b to 8e still pass. x-3d passes 3/3 on the iphone alone.
- `npm test` green, `npm run lint` clean, no new tsc errors in the touched files.
- Two commits, in order: the test commit, then the fix commit. Each touches one file, and each message is in plain
  English about the board on the screen.
- Human check (the founder's, at the end of the phase per `human_verify_mode`): on a phone or a computer, on the 3D
  page, press Bottom, then Deck, and touch Rotate on Side before the board finishes turning back. It should land deck
  up, rolled a degree or so, never bottom up.
</verification>

<success_criteria>
A slider touched while the board is still turning is measured from where the board was going: deck up after Deck, the
tail toward you after Tail. The two new checks prove it on a fast machine, where today's code fails every time, and
nothing else on the 3D page moves differently.
</success_criteria>

<output>
Create `/Users/kontoes/Code/shaper/.claude/worktrees/unruffled-jackson-c76275/.planning/quick/261109-efm-fix-3d-race-a-slider-during-a-view-move/261109-efm-SUMMARY.md`
when done. Record:
- the red run's failure lines;
- whether 8f used the key path or the slider fallback;
- the green runs' pass counts, including x-3d 3/3.
</output>
