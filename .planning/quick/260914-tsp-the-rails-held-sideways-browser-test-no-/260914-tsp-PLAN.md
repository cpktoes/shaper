---
phase: quick-260914-tsp
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/rails/rail-band-editor.tsx
  - e2e/phone-rails.spec.ts
  - CLAUDE.md
autonomous: true
requirements: [QT-260914-tsp]

estimate:
  # Three tasks, all small in edited lines and heavy only in care. Task 1 is four lines in a file
  # that must otherwise not move. Task 2 rewrites one test into two plus two helpers, with the
  # measured numbers written into the comments. Task 3 is one sentence in CLAUDE.md and then the
  # verification runs, whose Playwright output (three projects, then a five-times repeat, then the
  # desktop pair) is most of the token cost.
  tokens: 55000
  raw_tokens: 55000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "The held-sideways scroll check no longer passes by beating the page to the punch. It waits until the browser has taken over the drawing and the column has stopped changing shape, and only then measures — so the number it judges is the number a shaper is actually looking at."
    - "The scroll itself is proved at 340 dots tall — a real iPhone held sideways with Safari's own bar on screen — where three open rail sections genuinely overflow the drawing column and scrolling really does bring the Tail section into view. That test passes on every run, five out of five on repeat."
    - "The full 390 dots (the same phone with the toolbar hidden) is not quietly dropped: it stays in the file as a second test, declared as a known failure, because at that height the three open plots are shrunk to 40-dot slivers and there is nothing left to scroll. It runs the same body as the 340 test, so the day the plot fit stops shrinking on a short screen, Playwright says \"Expected to fail, but passed.\" and the marker comes off."
    - "When either test fails, it says why in numbers a person can act on: the column's content height, the column's own height, the viewport it was measured at, and how wide each of the three rail plots ended up."
    - "The rails screen gains one attribute that exists only so a test can tell when the browser has measured the plots. It draws nothing, moves nothing, and is never in the page the server sends — the browser sets it, and only after a real measurement."
    - "Nothing a mouse sees changes. The five desktop screenshot baselines under e2e/desktop-baseline.spec.ts-snapshots/ pass untouched and are NOT regenerated, and the desktop regression pass stays green."
    - "The rule that decides how big the rail plots draw is not touched. Whether three open plots should shrink to slivers on a short screen is the founder's call, filed as a follow-up, not decided here."
    - "CLAUDE.md's short-screen paragraph now says which of the two sideways heights is proved and which is recorded as a known failure, so the next person reading it is not misled by the 390 figure alone."
  artifacts:
    - e2e/phone-rails.spec.ts
    - components/rails/rail-band-editor.tsx
    - CLAUDE.md
  key_links:
    - "**WHY THE OLD TEST PASSED AT ALL — the race, measured 2026-09-14 on main at 38e3919.** The server renders every rail plot wrapper at the solver's 900px ceiling (`MAX_PLOT_W`). Before the browser hydrates, `<main>` at 844x390 is 1005px of content in a 297px box, so the test's own precondition (`scrollHeight > clientHeight`) holds and the scroll assertion passes. At hydration `rail-band-editor.tsx`'s `useLayoutEffect` solver measures the plots container (138px tall at 844x390) and fits all three open plots into it — chrome is 3 titles x (24px + 4px margin) + 2 gaps x 8px = 100px, leaving 38px, so each plot wrapper becomes 40px wide and `<main>` reads 297/297. `page.goto` resolves at the load event; hydration landed 250-400ms AFTER load on every run (webpack 1.3-4.0s from navigation start, Turbopack ~1.0s), and the test's steps usually fit inside that gap. Usually."
    - "**IT IS NOT A BUNDLER DIFFERENCE.** Both `IS_WEBPACK_TEST=1 next dev` and Turbopack `next dev` produced the identical ancestor chain (every `min-h-0`/`flex-1`/`h-full`/`overflow-y:auto` rule present and applied; container 138px, main 297px) and the identical 40px collapse after hydration. The stylesheets differ only in formatting. The 1005/297 reading taken against the real-key server on port 3000 is the PRE-hydration server layout — that server runs a real `pk_test_` Clerk key whose dev-browser handshake keeps a fresh Playwright page from hydrating at all. Port 3000 is never touched by this work."
    - "**THERE IS NO READY-MADE HYDRATION SIGNAL.** `window.__NEXT_HYDRATED` does not exist here — Next only sets it under its own `__NEXT_TEST_MODE`. Hence the one test-only attribute in Task 1. The precedent for waiting on a value a client effect writes is `e2e/summary-preview.spec.ts` (`page.waitForFunction` on the scaler's inline `--order-form-preview-scale`), and this follows it."
    - "**THE SOLVER'S CLIFF, MEASURED AFTER HYDRATION AND A SETTLED LAYOUT AT 844 WIDE** (main clientHeight = viewport height - 93; plots container = main - 159): 390 -> container 138, plots 40px, main 297/297, scrollTop 0. 360 -> 108, 8px, 267/267, 0. 353 -> 101, 1px, 260/260, 0. 352 -> 100, 416px (full width), 554/259, scrollTop 295. 345 -> 93, 416px, 554/252, 302. 340 -> 88, 416px, 554/247, 307 (three of three runs identical; the Tail title's top moved from 501 into the column). 330 -> 78, 416px, 554/237, 317. The cliff is exactly \"container height <= the three titles' chrome (100px)\": at or below it `availablePlotH` is <= 0, `widthFromHeight` is 0, and the solver falls back to `min(containerWidth, MAX_PLOT_W)` = full width, so the plots are big and the column overflows and scrolls. Above it the plots shrink continuously."
    - "**WHY 340 IS THE REAL PHONE.** A real iPhone 14 held sideways is about 844 CSS px wide (measured 2026-09-11; CLAUDE.md's Layout section records it, and warns that the emulator's 750 is not hardware). Safari's own landscape bar leaves the page about 340 — the same height Playwright's `devices[\"iPhone 14 landscape\"]` descriptor uses. The founder's own sweep bounds it independently: with TWO sections open the chrome is 64px so the plots fit small, with THREE it is 100px so they go full width and nothing scrolled before the 09-12 fix — *\"one at a time is fine, two are too small to view, and 3 makes the big which is nice but the window doesn't scroll\"* (10-SWEEP-2.md). That behaviour only exists between 316 and 352 dots tall. 340 sits inside it; 390 is the same phone with the toolbar hidden, which the app's own Hide Toolbar tip asks for."
    - "**THE HOOK IS THE ONLY PRODUCTION CHANGE, AND IT IS PIXEL-INERT.** `data-rail-plot-fit=\"measured\"` on the `data-rail-plot-row=\"desktop\"` container, set from a `useState(false)` flag flipped inside the solver's own `recompute`, so React batches it into the same render as `setPlotWidth`. Same idiom as `data-design-controls-scroll` (design-screen-shell.tsx) and `data-drag-target` (outline/rocker viewers). A `data-*` attribute with no CSS behind it costs no pixel, which is what keeps the desktop baselines untouched — but the baselines are RUN, not assumed."
    - "**THE FLAG FLIPS ONLY ON A REAL MEASUREMENT.** `recompute` has a degenerate early return (container width or height <= 0, or no open sections) for the initial paint and for a hidden pane — on a portrait phone the desktop plots row is `max-shell:hidden`, so it measures 0 and takes that branch forever. The flag must NOT flip there, or the attribute would mean \"this effect ran\" instead of \"the browser measured this container\", and a portrait-phone page would wear it while carrying no measurement at all."
    - "**WHY ONE STABLE FRAME IS NOT ENOUGH.** The fit re-runs on every resize (`ResizeObserver`), so the first measurement is not always the last. The second wait therefore requires the column's scrollHeight and clientHeight unchanged for 10 consecutive animation frames (`{ polling: \"raf\" }`), with the running reading kept on `window` under a namespaced key. No `waitForTimeout` anywhere — a sleep would be the same race with a longer fuse."
    - "**THE 390 CASE MUST FAIL, NOT SKIP.** A skipped test is invisible; an expected failure is a standing note that runs. It shares the SAME body helper as the 340 case, so it fails on the precondition with the same loud message, and the day the plot fit changes Playwright reports \"Expected to fail, but passed.\" (confirmed in node_modules/playwright/lib/runner/index.js) — at which point the `test.fail` is deleted and this becomes the 390 proof."
    - "**A WORKTREE CANNOT RUN TURBOPACK.** `npm run dev` fails inside a worktree with Turbopack's \"Could not find the Next.js package\", so every Playwright run here is `PW_PORT=3161 IS_WEBPACK_TEST=1 npx playwright test …`. The suite starts its own dev server on that port; port 3000 is the shaper's own and is never touched."
---

<objective>
The browser check that proves a shaper can scroll the rails drawing on a phone held sideways has
been passing by accident, and this fixes that.

**What is wrong today.** When the rails screen first arrives from the server, the three rail
cross-sections are drawn at full size — the page has not yet been measured by the browser, so the
drawing is taller than the window and looks like it scrolls. A moment later the browser measures
the window for real and shrinks the three drawings to fit, and at 390 dots tall it shrinks them to
40-dot slivers, which fit with room to spare. The test was doing its measuring and its scrolling in
that moment before the browser took over, roughly a third of a second wide. It mostly won that race.
Sometimes it did not, and then it failed for a reason that had nothing to do with scrolling.

**What this changes.** The test now waits: first until the browser has measured the drawings at all,
then until the drawing column has stopped changing shape for ten frames running. Then it measures.
No sleeps, no guessing.

**What it now proves, and where.** A real iPhone held sideways is about 844 dots across, and with
Safari's own bar on screen the page is about 340 dots tall. At that height the three open sections
really are drawn big, the column really does overflow, and scrolling really does bring the Tail
section into view — exactly the complaint from the founder's sideways sweep, and exactly what the
09-12 fix was for. That is the test that must pass every single run.

**What it now records.** At the full 390 dots — the same phone with Safari's toolbar hidden, which
the app itself suggests — the three drawings collapse to slivers and there is nothing left to
scroll. That is not a scrolling bug and it is not this task's to fix; whether three open rail
sections should shrink that far on a short screen is the founder's call. So it stays in the file as
a second test, marked as a known failure, running the same steps. If the plot sizing ever changes,
Playwright announces that the known failure started passing, and the marker comes off.

The rails screen itself gains exactly one thing: an invisible marker saying "the browser has
measured these drawings now", so the test has something honest to wait for. It draws nothing.

Purpose: a test that fails for the right reason and passes for the right reason, and an honest
written record of the one sideways height where the screen is still wrong.
Output: a settled, deterministic 340 check; a 390 known failure that runs; one pixel-inert hook;
one corrected paragraph in CLAUDE.md.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@components/rails/rail-band-editor.tsx
@components/design/design-screen-shell.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: the rails screen says when the browser has measured its drawings</name>
  <files>components/rails/rail-band-editor.tsx</files>
  <read_first>
    components/rails/rail-band-editor.tsx — the `useLayoutEffect` solver (~lines 131-170, the
    `recompute` function including its degenerate early return) and the
    `data-rail-plot-row="desktop"` container (~line 262).
    components/design/design-screen-shell.tsx — the comment block above
    `data-design-controls-scroll` (~lines 163-180), for the house idiom and the tone of the comment
    a test-only hook gets here.
  </read_first>
  <action>
    Add ONE test-only, pixel-inert attribute to this file and change nothing else in it.

    Beside the existing `const [plotWidth, setPlotWidth] = useState(MAX_PLOT_W);`, add a second
    piece of state, a boolean starting at `false`, named for what it records: the plot fit has been
    measured. Inside the solver's `recompute` — the same function that calls `setPlotWidth`, so
    React batches both into one render — set it to `true` ON THE REAL MEASUREMENT PATH ONLY, next
    to the final `setPlotWidth(...)` call. Do NOT set it on the degenerate early return (container
    width or height <= 0, or `sumOfVbH <= 0`): that branch is the initial paint before layout and
    the hidden-pane case, and on a portrait phone the desktop plots row is `max-shell:hidden` and
    measures zero forever, so flipping the flag there would make the attribute mean "this effect
    ran" instead of "the browser measured this container". Never reset it — once the browser has
    measured, it has measured.

    On the `data-rail-plot-row="desktop"` container div, render it as
    `data-rail-plot-fit={<flag> ? "measured" : undefined}` — `undefined` and not `false`, so the
    attribute is absent entirely rather than present-and-empty, and so it can never appear in the
    HTML the server sends.

    Write a comment above it in the same shape and the same plain English as
    `data-design-controls-scroll` in design-screen-shell.tsx: that it is a test-only, pixel-inert
    Playwright locator, and WHY the test needs it — the server draws these plots at the 900px
    ceiling and only the browser's own measurement decides their real size, so a test that measures
    before this attribute appears is measuring a page no shaper ever sees. Note in the same comment
    that it is deliberately absent when the container could not be measured.

    Do NOT change the fit rule, `MAX_PLOT_W`, the chrome arithmetic, the shell, or any CSS. Whether
    three open plots should shrink to slivers on a short screen is the founder's decision and is
    filed as a follow-up, not settled here.

    If `npm run lint` objects to setting state inside this effect, stop and report it rather than
    restructuring: the existing `setPlotWidth` is the identical shape in the identical function, so
    the same objection would already apply to shipped code.
  </action>
  <verify>
    <automated>cd $(git rev-parse --show-toplevel) && npx tsc --noEmit; npm run lint</automated>
  </verify>
  <done>
    `npx tsc --noEmit` reports nothing under `components/` or `e2e/` (phantom `LayoutProps` lines
    from `.next/types` alone are not a failure), `npm run lint` is clean, and the attribute is
    rendered conditionally from a browser-set flag, absent on the degenerate path. No other line of
    rail-band-editor.tsx changed.
  </done>
</task>

<task type="auto">
  <name>Task 2: the sideways check waits for the drawing to settle, and the 390 collapse is recorded</name>
  <files>e2e/phone-rails.spec.ts</files>
  <read_first>
    e2e/phone-rails.spec.ts — the whole file, and in particular the describe block "RAILS held
    sideways — the controls stay put, same bucket as a desktop mouse (D-10, CR-01)" (~line 289) and
    its third test (~lines 316-375), the one being replaced.
    e2e/summary-preview.spec.ts ~lines 250-262 — the precedent for waiting on a value a client
    effect writes, via `page.waitForFunction`.
    The `<reference_snippets>` section at the foot of this plan — sections A and B are the exact
    helper bodies to use.
  </read_first>
  <action>
    In `e2e/phone-rails.spec.ts`, replace the single test "iPhone sideways, 844x390: the drawing
    column scrolls, and the Tail section it hides becomes reachable" with two tests sharing one
    body, plus two file-local helpers. Leave every other test in the file, including the two
    "control heading IS still visible on INSTRUCTIONS" sideways tests, exactly as they are.

    Add the file-local helper `settledDrawingColumn(page)` verbatim from `<reference_snippets>`
    section A, placed with the file's other helpers near the top. It waits in two stages: first
    `page.waitForFunction` until `[data-rail-plot-row="desktop"][data-rail-plot-fit="measured"]`
    exists (Task 1's hook — the browser-has-measured signal), then, with `{ polling: "raf" }`, until
    `main`'s `scrollHeight` and `clientHeight` have been unchanged for 10 consecutive animation
    frames, keeping the running reading and the counter on `window` under the namespaced key
    `__shaperRailsSettle`. No `waitForTimeout` anywhere in this file. Type it narrowly through
    explicit `as unknown as Record<...>` casts, never `any`, matching `readPrintCount`'s existing
    idiom, so `npx tsc --noEmit` stays clean.

    Add the file-local helper `proveDrawingColumnScrolls(page, viewport)` verbatim from
    `<reference_snippets>` section B. It sets the viewport, navigates to `/design/rails`, waits with
    `settledDrawingColumn`, then runs the ORIGINAL test's assertions unchanged in their original
    order: the overflow precondition, `scrollTop` starts at 0, Tail is attached, Tail is below the
    fold before scrolling, scroll the column to its end, `scrollTop` moved, and the two post-scroll
    Tail bounds checks. The ONLY change to the assertions is the overflow precondition's failure
    message, which must now carry the measured numbers: the column's scrollHeight and clientHeight,
    the viewport it was measured at, and the inline `style.width` of each child of
    `[data-rail-plot-row="desktop"]` — reading, for example, "after hydration and a settled layout
    at 844x340, the drawing column's content (554px) fits inside the column (247px) — the three open
    rail plots were fitted to the column (wrappers 40px, 40px, 40px wide), so there is nothing here
    for the scroll fix to prove itself against".

    Then the two tests, both in the same describe block, each keeping the existing
    `test.skip(testInfo.project.name !== "iphone", …)` guard as its FIRST statement:

    (A) "iPhone sideways with Safari's bar showing, 844x340: the drawing column scrolls, and the
    Tail section it hides becomes reachable" — body is `proveDrawingColumnScrolls(page, { width:
    844, height: 340 })`. This one is expected to pass on every run.

    (B) "iPhone sideways with the toolbar hidden, 844x390: the three open plots collapse to slivers,
    so there is nothing to scroll (known, expected to fail)" — after the skip guard, declare it an
    expected failure with `test.fail(true, …)`, then the SAME helper at `{ width: 844, height: 390
    }`. The reason string must say that at this height the fit shrinks the three open plots to 40px
    slivers so the column has nothing to scroll, and that the day the plot fit stops shrinking on a
    short screen Playwright reports "Expected to fail, but passed.", at which point this `test.fail`
    is deleted and this becomes the 390 proof.

    Rewrite the comments above these two tests in this repo's plain English, recording, per
    `<reference_snippets>` section C: the race that made the old test flaky (the server draws the
    plots at the 900px ceiling; the browser's own measurement shrinks them a beat later; the old
    test only passed in the gap, 250-400ms wide); the measured cliff at 844 wide, including at least
    the 390 / 353 / 352 / 340 rows and the one-line reason for it (the cliff is where the container
    is no taller than the three titles' 100px of chrome); and where 340 comes from (a real iPhone 14
    sideways is about 844 dots across, measured 2026-09-11; Safari's own bar leaves the page about
    340, the height Playwright's own `iPhone 14 landscape` descriptor uses; bounded independently by
    the founder's two-open/three-open words in 10-SWEEP-2.md). Keep the existing citation of
    10-SWEEP-2.md and the founder's quote.

    Also fix the stale claim in the old comment — "at this real height, three open sections really
    do overflow the drawing column" — so it no longer says that about 390. It is true at 340 and
    false at 390, and the file must now say which is which.
  </action>
  <verify>
    <automated>cd $(git rev-parse --show-toplevel) && npx tsc --noEmit && npm run lint && PW_PORT=3161 IS_WEBPACK_TEST=1 npx playwright test e2e/phone-rails.spec.ts --project=iphone -g "held sideways"</automated>
  </verify>
  <done>
    Type-check and lint clean. In that Playwright run the 340 test passes, the 390 test is reported
    as an expected failure (never as an unexpected pass, never as a skip), and the two
    INSTRUCTIONS-heading sideways tests still pass. No `waitForTimeout` was added.
  </done>
</task>

<task type="auto">
  <name>Task 3: CLAUDE.md says which sideways height is proved, then the whole suite is run</name>
  <files>CLAUDE.md</files>
  <precondition>
    Playwright's browsers are already installed on this machine (`ls ~/Library/Caches/ms-playwright`
    lists chromium and webkit builds). If it does not, run `npx playwright install chromium webkit`
    once before the browser runs below.
  </precondition>
  <read_first>
    CLAUDE.md — the Layout section's "Short screen — height alone." paragraph (~lines 173-181).
    The `<reference_snippets>` section D at the foot of this plan — the exact replacement text.
  </read_first>
  <action>
    First, the documentation. In CLAUDE.md's Layout section, in the "Short screen — height alone."
    paragraph, apply `<reference_snippets>` section D: immediately after the sentence that ends
    "(10-SWEEP-2.md).", insert the two sentences recording that 390 is the screen while Safari's own
    bar leaves the page about 340 dots, that 340 is where `e2e/phone-rails.spec.ts` proves the
    scroll, and that at the full 390 (toolbar hidden) the rails plot fit shrinks three open plots to
    40-dot slivers so there is nothing to scroll — recorded in that same spec as an expected failure
    (quick 260914-tsp) until the founder decides how plots should fit on a short screen. Change no
    other word in that paragraph or anywhere else in CLAUDE.md; the only bytes that may move outside
    the inserted text are the line wrapping the insertion forces on the paragraph's closing
    sentence, whose words stay exactly as they are.

    Then the verification, all of it from inside this agent's own worktree, in this order, every one
    green before anything is committed. Never `--update-snapshots`. Never port 3000. Never
    `next dev` or Playwright from the main checkout.

      1. `npx tsc --noEmit` — a bare tsc in a worktree may report phantom `LayoutProps` errors out
         of `.next/types`; those alone are not a failure. Anything under `e2e/` or `components/` is.
      2. `npm run lint`
      3. `npm test` (vitest — unchanged by this work, so it must be untouched and green)
      4. `PW_PORT=3161 IS_WEBPACK_TEST=1 npx playwright test e2e/phone-rails.spec.ts` — all three
         projects.
      5. `PW_PORT=3161 IS_WEBPACK_TEST=1 npx playwright test e2e/phone-rails.spec.ts
         --project=iphone -g "held sideways" --repeat-each 5` — the 340 test passes 5/5, and the 390
         test is an expected failure 5/5, never once an unexpected pass.
      6. `PW_PORT=3161 IS_WEBPACK_TEST=1 npx playwright test e2e/desktop-baseline.spec.ts
         e2e/desktop-regression.spec.ts --project=desktop` — the hook is pixel-inert, so the desktop
         baselines pass as they stand.

    Record each command's real result in the summary. A command written down and not run is a
    failure of this task.

    Then two commits, in this order, subjects in plain English for a shaper:
      1. `test: the rails held-sideways check waits for the drawing to settle instead of racing the
         page` — carrying components/rails/rail-band-editor.tsx, e2e/phone-rails.spec.ts and
         CLAUDE.md together.
      2. the SUMMARY, written to the worktree-relative path
         `.planning/quick/260914-tsp-the-rails-held-sideways-browser-test-no-/260914-tsp-SUMMARY.md`
         and committed as `docs(quick-260914-tsp): …`, as the LAST commit — a removed worktree
         destroys anything uncommitted, so the summary must be committed here, not left on disk.
  </action>
  <verify>
    <automated>cd $(git rev-parse --show-toplevel) && npx tsc --noEmit && npm run lint && npm test && PW_PORT=3161 IS_WEBPACK_TEST=1 npx playwright test e2e/phone-rails.spec.ts && PW_PORT=3161 IS_WEBPACK_TEST=1 npx playwright test e2e/phone-rails.spec.ts --project=iphone -g "held sideways" --repeat-each 5 && PW_PORT=3161 IS_WEBPACK_TEST=1 npx playwright test e2e/desktop-baseline.spec.ts e2e/desktop-regression.spec.ts --project=desktop</automated>
  </verify>
  <done>
    All six checks green with their real output recorded: vitest untouched and passing; the whole
    phone-rails file passing across iphone/android/desktop with the 390 case reported as an expected
    failure; 5/5 on the repeat with no unexpected pass; the desktop baselines and regression pass
    with no snapshot regenerated. CLAUDE.md's short-screen paragraph names 340 as the proved height
    and 390 as the recorded known failure, with no other wording changed. Two commits exist, the
    summary committed last.
  </done>
</task>

</tasks>

<reference_snippets>

## A — `settledDrawingColumn`, for Task 2 (use verbatim)

```ts
const SETTLE_KEY = "__shaperRailsSettle";

/**
 * Waits until the drawing column has stopped changing shape, so anything measured after this is
 * what a shaper is actually looking at — not the page as it briefly was before the browser took
 * over. Two signals, in order:
 *
 *  1. `data-rail-plot-fit="measured"` on the plots row (rail-band-editor.tsx). The server sends
 *     every rail plot at the 900px ceiling, so before the browser has measured anything the column
 *     is ~1005px of drawing inside a 297px box and merely LOOKS like it scrolls. That attribute
 *     appears only once the browser's own fit has run against a real measurement, so its presence
 *     is the "this page is real now" signal. There is no ready-made one: `window.__NEXT_HYDRATED`
 *     does not exist outside Next's own `__NEXT_TEST_MODE`.
 *  2. The column's own scrollHeight/clientHeight unchanged for 10 straight animation frames. The
 *     fit re-runs on every resize, so the first measurement is not always the last one.
 *
 * Deliberately no `waitForTimeout` — a sleep is the same race with a longer fuse.
 */
async function settledDrawingColumn(page: Page) {
  await page.waitForFunction(
    () => !!document.querySelector('[data-rail-plot-row="desktop"][data-rail-plot-fit="measured"]'),
  );
  await page.evaluate((key) => {
    delete (window as unknown as Record<string, unknown>)[key];
  }, SETTLE_KEY);
  await page.waitForFunction(
    (key) => {
      const main = document.querySelector("main");
      if (!main) return false;
      const store = window as unknown as Record<
        string,
        { scrollHeight: number; clientHeight: number; steady: number } | undefined
      >;
      const last = store[key];
      const steady =
        last && last.scrollHeight === main.scrollHeight && last.clientHeight === main.clientHeight
          ? last.steady + 1
          : 0;
      store[key] = { scrollHeight: main.scrollHeight, clientHeight: main.clientHeight, steady };
      return steady >= 10;
    },
    SETTLE_KEY,
    { polling: "raf" },
  );
}
```

## B — `proveDrawingColumnScrolls`, for Task 2 (use verbatim; the assertions after the precondition are the original test's, unchanged)

```ts
/** One body, two heights (see the two tests below) — so the height that still fails runs exactly
 * the same steps as the height that passes, and fails loudly on the same precondition. */
async function proveDrawingColumnScrolls(page: Page, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  await page.goto("/design/rails");

  const main = page.locator("main");
  await expect(main).toBeVisible();
  await settledDrawingColumn(page);

  // Prove the test is not vacuous: three open sections really do overflow the drawing column at
  // this height -- otherwise there is nothing here for the fix to prove itself against.
  const metrics = await main.evaluate((el) => ({
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
  }));
  const plotWidths = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>('[data-rail-plot-row="desktop"] > *')).map(
      (el) => el.style.width || "(unset)",
    ),
  );
  expect(
    metrics.scrollHeight,
    `after hydration and a settled layout at ${viewport.width}x${viewport.height}, the drawing column's content (${metrics.scrollHeight}px) fits inside the column (${metrics.clientHeight}px) — the three open rail plots were fitted to the column (wrappers ${plotWidths.join(", ")} wide), so there is nothing here for the scroll fix to prove itself against`,
  ).toBeGreaterThan(metrics.clientHeight);

  const scrollTopBefore = await main.evaluate((el) => el.scrollTop);
  expect(scrollTopBefore).toBe(0);

  const tailTitle = main.getByText("Tail", { exact: true });
  await expect(tailTitle).toBeAttached();

  const mainBoxBefore = await main.boundingBox();
  const tailBoxBefore = await tailTitle.boundingBox();
  if (!mainBoxBefore || !tailBoxBefore) throw new Error("missing bounding box");
  expect(
    tailBoxBefore.y,
    "the Tail section is already on screen before scrolling -- this test set up nothing to prove",
  ).toBeGreaterThanOrEqual(mainBoxBefore.y + mainBoxBefore.height - 1);

  // Scroll the drawing column to its end -- the real fix under test, not a CSS class assertion.
  await main.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  const scrollTopAfter = await main.evaluate((el) => el.scrollTop);
  expect(scrollTopAfter, "scrolling the drawing column did not move it").toBeGreaterThan(scrollTopBefore);

  // The user-visible point of the fix: the Tail section is now reachable, inside the column's own
  // visible bounds, not still hanging off the bottom.
  const mainBoxAfter = await main.boundingBox();
  const tailBoxAfter = await tailTitle.boundingBox();
  if (!mainBoxAfter || !tailBoxAfter) throw new Error("missing bounding box");
  expect(tailBoxAfter.y, "the Tail section is still above the column's own top edge").toBeGreaterThanOrEqual(
    mainBoxAfter.y - 1,
  );
  expect(
    tailBoxAfter.y + tailBoxAfter.height,
    "the Tail section is still below the fold after scrolling",
  ).toBeLessThanOrEqual(mainBoxAfter.y + mainBoxAfter.height + 1);
}
```

## C — the facts the two tests' comments must carry (Task 2, R4)

Write these in this repo's plain English, in the executor's own words; this is the content, not the
prose.

- **The race.** The old version of this test passed only when it beat the browser to the page. The
  server draws every rail plot at the solver's 900px ceiling, so before the browser measures
  anything the column is 1005px of drawing in a 297px box and looks like it scrolls. A beat later
  `rail-band-editor.tsx`'s solver measures the real container and fits all three open plots into it,
  and the column reads 297/297 with nothing to scroll. That beat was 250-400ms after the load event
  on every run measured (2026-09-14), and the old test's steps usually fit inside it. `page.goto`
  resolves at load, not at hydration, so "usually" was the whole guarantee.
- **The cliff, measured after hydration at 844 wide** (main clientHeight = viewport - 93; plots
  container = main - 159):

  | page height | plots container | each plot wrapper | column content / column | scrolled to |
  |---|---|---|---|---|
  | 390 | 138px | 40px | 297 / 297 | 0 |
  | 353 | 101px | 1px | 260 / 260 | 0 |
  | 352 | 100px | 416px (full width) | 554 / 259 | 295 |
  | 340 | 88px | 416px (full width) | 554 / 247 | 307 |

  The cliff is exactly "the container is no taller than the three titles' chrome (100px)": at or
  below it the solver has no height to fit into, gives up on shrinking and draws the plots full
  width, so the column overflows and scrolls. Above it the plots shrink continuously — 1px at 353,
  40px at 390.
- **Where 340 comes from.** A real iPhone 14 held sideways is about 844 dots across (measured
  2026-09-11; CLAUDE.md's Layout section records it and warns that a test tool's emulated 750 is not
  hardware). Safari's own landscape bar leaves the page about 340 dots, which is the height
  Playwright's own `iPhone 14 landscape` descriptor uses. The founder's sweep bounds it
  independently: two sections open leaves 64px of chrome so the plots fit small, three leaves 100px
  so they go full width and — before the 09-12 fix — nothing scrolled (10-SWEEP-2.md). That is only
  true between about 316 and 352 dots tall. 390 is the same phone with the toolbar hidden, which the
  app's own Hide Toolbar tip asks for.

## D — the CLAUDE.md insertion (Task 3, R5)

Replace exactly this (CLAUDE.md, Layout section, "Short screen — height alone." paragraph):

```
column scroll instead of clipping unreachable content — added for a phone held sideways (about
390 dots tall on a real iPhone), which lands in the desktop shell above and, unlike a real desktop
window, is short enough to need it (10-SWEEP-2.md). A real desktop window is never under 500 dots
tall, so that rule can never reach a mouse.
```

with exactly this:

```
column scroll instead of clipping unreachable content — added for a phone held sideways (about
390 dots tall on a real iPhone), which lands in the desktop shell above and, unlike a real desktop
window, is short enough to need it (10-SWEEP-2.md). That 390 is the screen; Safari's own bar leaves
the page about 340 dots, and 340 is the height `e2e/phone-rails.spec.ts` proves the scroll at. At
the full 390 — the toolbar hidden — the rails plot fit shrinks three open plots to 40-dot slivers,
so there is nothing left to scroll; that is recorded in the same spec as an expected failure (quick
260914-tsp) until the founder decides how plots should fit on a short screen. A real desktop window
is never under 500 dots tall, so that rule can never reach a mouse.
```

</reference_snippets>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| (none crossed) | This work adds no input path, no network call, no dependency and no stored data. One static `data-*` attribute is rendered, and one test file and one documentation paragraph change. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-260914-tsp-01 | Information disclosure | `data-rail-plot-fit` on the rails plots row | low | accept | The attribute's value is the constant string `measured`. It carries no board data, no account data and no measurement — only "the browser has run its fit". Nothing about a shaper or their boards can be read from it. |
| T-260914-tsp-02 | Tampering | e2e/phone-rails.spec.ts | low | mitigate | The 390 case is an expected FAILURE rather than a skip precisely so a known defect cannot hide as an absent test; Playwright reports an unexpected pass loudly if the underlying behaviour changes. |
| T-260914-tsp-SC | Tampering | package manager | low | accept | No package is installed, added or upgraded by this plan, so there is no supply-chain surface to gate. Playwright's browsers are already installed locally. |
</threat_model>

<verification>
- `npx tsc --noEmit` clean of anything under `e2e/` or `components/`.
- `npm run lint` clean.
- `npm test` (vitest) green and untouched — no geometry or unit test is in scope here.
- `PW_PORT=3161 IS_WEBPACK_TEST=1 npx playwright test e2e/phone-rails.spec.ts` — all three
  projects; the 390 case reported as an expected failure, never an unexpected pass.
- The same file, iphone only, `-g "held sideways" --repeat-each 5` — 5/5 on the 340 test, 5/5
  expected failure on the 390 test.
- `PW_PORT=3161 IS_WEBPACK_TEST=1 npx playwright test e2e/desktop-baseline.spec.ts
  e2e/desktop-regression.spec.ts --project=desktop` — green, with no snapshot regenerated and
  `--update-snapshots` never passed.
</verification>

<success_criteria>
- The 844x340 test passes deterministically, five runs out of five, and its scroll assertion is
  reached only after the drawing column has settled.
- The 844x390 test runs, fails on the overflow precondition with the measured numbers in its
  message, and is reported by Playwright as an expected failure.
- `rail-band-editor.tsx` changed by exactly one added state flag, its flip on the measured path,
  one conditional attribute and its comment — the fit rule untouched.
- The desktop baselines pass unchanged and unregenerated.
- CLAUDE.md distinguishes the 340 proved height from the 390 recorded failure.
- Two commits: the code and documentation together, then the summary last.
</success_criteria>

<output>
Create `.planning/quick/260914-tsp-the-rails-held-sideways-browser-test-no-/260914-tsp-SUMMARY.md`
when done, and commit it as the last commit — a removed worktree destroys anything left uncommitted.
</output>
