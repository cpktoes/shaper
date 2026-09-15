import { expect, test, type Page } from "@playwright/test";

/**
 * 09-04's own proof, mirroring the dismiss-the-banner helper e2e/phone-layout.spec.ts and
 * e2e/phone-screens.spec.ts already use, kept in this file (rather than imported) so this plan
 * cannot collide with either — neither of those files is touched here.
 *
 * D-12: RAILS shows one rail cross-section at a time on a phone behind a NOSE/CENTER/TAIL switch;
 * D-13: the View Full Sized dialog tells a phone shaper the drawing is shrunk, not true size;
 * D-04: the rocker DATASHEET, the rails DATA table and the fins data panel keep every column and
 * scroll sideways inside their own box, never the page. PHON-05: none of it moves a desktop pixel.
 *
 * The Home-Screen web-app print note (G-09-6) is gated in CSS only, on an iOS-only
 * `@supports (-webkit-touch-callout: none)` guard alongside `display-mode: standalone` (gap-closure
 * CR-01) — see the comment in view-full-sized-dialog.tsx. This file used to carry an
 * android/CDP-only case that emulated `display-mode: standalone` via
 * `Emulation.setEmulatedMedia`, but that Chromium build never honours a display-mode override, so
 * the case always skipped itself, and with the iOS guard in place no Chromium build (this
 * project's `android`, or any future one) can ever render the note at all — a permanently skipping
 * test is noise, not a limitation, so it was removed. The Home-Screen appearance is instead proved
 * by view-full-sized-dialog.test.ts's compiled-CSS contract test (WR-01: it compiles the real
 * class chain through the app's own Tailwind pipeline and asserts the emitted `@supports` +
 * `@media (display-mode: standalone)` nesting) and by the on-device UAT check
 * (.planning/debug/phone-print-button-does-nothing.md) — an e2e cannot exercise a real iOS
 * Home-Screen launch at all.
 */

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";
// 260909-hny insurance: today this changes no measurement, because the toolbar tip is already
// `display: none` in every Playwright project (see e2e/phone-toolbar-tip.spec.ts's header
// comment). It's dismissed here anyway so that if Playwright's WebKit ever implements
// `-webkit-touch-callout`, a strip does not silently appear above every pinned-height and
// bounding-box assertion in this file.
const TOOLBAR_TIP_DISMISSAL_KEY = "shaper-toolbar-tip-dismissed";

/** Matches desktop-baseline.spec.ts's/phone-layout.spec.ts's own approach: dismiss the sign-in
 * banner via sessionStorage, set before navigation, so its own height never confuses a layout
 * assertion. */
async function dismissSignInBanner(page: Page) {
  await page.addInitScript((key) => {
    window.sessionStorage.setItem(key, "true");
  }, BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, "true");
  }, TOOLBAR_TIP_DISMISSAL_KEY);
}

const PRINT_COUNT_KEY = "__shaperPrintCallCount";

/** G-09-6's recurrence guard: a counting replacement for the browser's own print, installed in
 * the same addInitScript shape as dismissSignInBanner above. Init scripts only apply to
 * SUBSEQUENT navigations, so every case using this helper does its own page.goto after installing
 * it, even when beforeEach already navigated once. Turns the debug session's throwaway measurement
 * (a stubbed print counted 3/3 on both phone projects) into a kept test. */
async function stubPrintCounter(page: Page) {
  await page.addInitScript((key) => {
    (window as unknown as Record<string, number>)[key] = 0;
    window.print = () => {
      (window as unknown as Record<string, number>)[key] += 1;
    };
  }, PRINT_COUNT_KEY);
}

/** Reads the counter back through an explicit narrow type, never `any`, so `npx tsc --noEmit`
 * stays clean. */
async function readPrintCount(page: Page): Promise<number> {
  return page.evaluate((key) => (window as unknown as Record<string, number>)[key] ?? 0, PRINT_COUNT_KEY);
}

/** The RAILS screen's own top-level VIEWER/DATA/INSTRUCTIONS strip, scoped by its unique label so
 * it is never confused with the phone-only NOSE/CENTER/TAIL switch nested inside its VIEWER tab —
 * both are `role="tablist"`, and only this one has "DATA" among its tab names. */
function railsPageTabs(page: Page) {
  return page.getByRole("tablist").filter({ hasText: "DATA" });
}

/** The phone-only NOSE/CENTER/TAIL switch (D-12), scoped the same way — the only tablist carrying
 * "NOSE" among its tab names. Absent entirely on the DATA/INSTRUCTIONS tabs and on a desktop
 * screen, where all open rails draw side by side instead. */
function railSwitchTabs(page: Page) {
  return page.getByRole("tablist").filter({ hasText: "NOSE" });
}

/** Every `<svg>` a RailSectionPlot instance renders that is actually visible right now, scoped to
 * the two `data-rail-plot-row` wrappers (`"desktop"`/`"phone"`) so a toolbar icon's own `<svg>`
 * (View Full Sized's Maximize2Icon) can never be miscounted as a rail plot. Both wrappers always
 * sit in the same server-rendered tree (chosen by `max-shell:`/`hidden` CSS, never a width check),
 * so counting only the visible ones is what distinguishes "one rail at a time" from "three rails,
 * two of them display:none". */
async function visiblePlotSvgs(page: Page) {
  const candidates = await page.locator('[data-rail-plot-row] svg').all();
  const visible: (typeof candidates)[number][] = [];
  for (const svg of candidates) {
    if (await svg.isVisible()) visible.push(svg);
  }
  return visible;
}

/** The shell's own root element (the flex row DesignScreenShell renders directly around `aside`
 * and `main`) — the ACTUAL phone scroller when `phonePinned="none"` collapses the pinned split.
 * `document.scrollingElement` is unusable for this: `app/layout.tsx`'s own `h-dvh` height chain
 * keeps `<html>`/`<body>` pinned to the viewport with `overflow: hidden` (09-02), so the page-level
 * scroll Phase 9 describes always happens on this inner element, never on the document itself —
 * matching the desktop-vs-phone split of D-01's own pinned-vs-none design. */
function shellRoot(page: Page) {
  return page.locator("div:has(> aside):has(> main)").first();
}

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

test.describe("RAILS on a phone — one rail at a time, nothing scrolling sideways", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "phone-only RAILS assertions");
    await dismissSignInBanner(page);
    await page.goto("/design/rails");
  });

  test("VIEWER: exactly one full-width rail behind a NOSE/CENTER/TAIL strip, and CENTER switches to it", async ({
    page,
  }) => {
    const switchTabs = railSwitchTabs(page);
    await expect(switchTabs).toBeVisible();
    await expect(switchTabs.getByRole("tab")).toHaveCount(3);
    await expect(switchTabs.getByRole("tab", { name: "NOSE" })).toHaveAttribute("aria-selected", "true");

    const visible = await visiblePlotSvgs(page);
    expect(visible, "expected exactly one visible rail plot on a phone").toHaveLength(1);

    // PHON-06's "spans at least 90% of the viewport width" is measured against the pinned drawing
    // AREA (`main`), the same convention e2e/phone-layout.spec.ts's own TEMPLATE test already
    // established for this identical wording — the pinned area's own share of the shell, not a
    // pixel count of ink inside whatever card chrome happens to wrap it at any given moment.
    const viewportSize = page.viewportSize();
    if (!viewportSize) throw new Error("no viewport size");
    const mainBox = await page.locator("main").boundingBox();
    if (!mainBox) throw new Error("main is missing a bounding box");
    expect(mainBox.width / viewportSize.width).toBeGreaterThanOrEqual(0.9);

    await switchTabs.getByRole("tab", { name: "CENTER" }).click();
    await expect(switchTabs.getByRole("tab", { name: "CENTER" })).toHaveAttribute("aria-selected", "true");
    await expect(switchTabs.getByRole("tab", { name: "NOSE" })).toHaveAttribute("aria-selected", "false");
    const stillOne = await visiblePlotSvgs(page);
    expect(stillOne, "still exactly one visible rail plot after switching").toHaveLength(1);
  });

  for (const tabName of ["VIEWER", "DATA", "INSTRUCTIONS"] as const) {
    test(`${tabName}: the document never scrolls sideways`, async ({ page }) => {
      if (tabName !== "VIEWER") {
        await railsPageTabs(page).getByRole("tab", { name: tabName }).click();
      }
      const viewportSize = page.viewportSize();
      if (!viewportSize) throw new Error("no viewport size");
      const scrollWidth = await page.evaluate(() => document.scrollingElement?.scrollWidth ?? 0);
      expect(scrollWidth).toBe(viewportSize.width);
    });
  }

  test("DATA: the table's own box scrolls sideways, the document does not, and scrolling reveals Tail", async ({
    page,
  }) => {
    await railsPageTabs(page).getByRole("tab", { name: "DATA" }).click();

    const viewportSize = page.viewportSize();
    if (!viewportSize) throw new Error("no viewport size");
    const docScrollWidth = await page.evaluate(() => document.scrollingElement?.scrollWidth ?? 0);
    expect(docScrollWidth, "the document itself scrolled sideways").toBe(viewportSize.width);

    const tableBox = page.locator("main .overflow-x-auto").first();
    await expect(tableBox).toBeVisible();
    const before = await tableBox.evaluate((el) => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }));
    expect(before.scrollWidth, "the table box does not scroll sideways at all").toBeGreaterThan(before.clientWidth);

    const tailHeader = tableBox.getByText("Tail", { exact: true });
    await expect(tailHeader).toBeAttached();

    await tableBox.evaluate((el) => {
      el.scrollLeft = el.scrollWidth;
    });
    const after = await tableBox.evaluate((el) => el.scrollLeft);
    expect(after, "scrolling the box to its end did not move it").toBeGreaterThan(0);

    const headerBox = await tailHeader.boundingBox();
    const boxBox = await tableBox.boundingBox();
    if (!headerBox || !boxBox) throw new Error("missing bounding box");
    expect(headerBox.x + headerBox.width, "the Tail column is still off the box's right edge after scrolling").toBeLessThanOrEqual(
      boxBox.x + boxBox.width + 1,
    );
  });

  test("INSTRUCTIONS: one vertical scroller, pinned split collapsed, everything reachable by scrolling down", async ({
    page,
  }) => {
    await railsPageTabs(page).getByRole("tab", { name: "INSTRUCTIONS" }).click();

    // The pinned split is gone (phonePinned="none"): the shell's own root becomes the phone's one
    // scroller (both the aside's controls and the drawing/content stack into it), unlike
    // VIEWER/DATA above where the controls region alone scrolls and this root does not.
    const root = await shellRoot(page).evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }));
    expect(root.scrollHeight, "the shell root does not scroll vertically on INSTRUCTIONS").toBeGreaterThan(
      root.clientHeight,
    );

    const exampleCard = page.getByText("Understanding Rail Markings");
    const legendCard = page.getByText("Turning Marks Into Rail Bands");
    const closingNote = page.getByText(/This rail band calculator is intended/);

    await expect(exampleCard).toBeVisible();
    await legendCard.scrollIntoViewIfNeeded();
    await expect(legendCard).toBeVisible();
    await closingNote.scrollIntoViewIfNeeded();
    await expect(closingNote).toBeVisible();
  });

  test("View Full Sized: the plain line shows, the check bar is hidden, and the title drops Actual Size", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "View Full Sized" }).click();

    await expect(page.getByText("Shown smaller than actual size — tap Print for the full-sized rail.")).toBeVisible();
    await expect(page.locator('[data-actual-size-box="check-bar"]')).not.toBeVisible();

    const dialogTitle = page.locator('[data-slot="dialog-title"]');
    const visibleTitleText = await dialogTitle.innerText();
    expect(visibleTitleText).not.toContain("Actual Size");
    expect(visibleTitleText).toContain("Nose Rail");

    await expect(page.getByRole("button", { name: "Print" })).toBeVisible();
  });

  test("View Full Sized: tapping Print in Safari really calls the browser's print, exactly once (G-09-6)", async ({
    page,
  }) => {
    await stubPrintCounter(page);
    // The stub is only live for navigations after this point (init scripts apply to SUBSEQUENT
    // loads) — beforeEach's own goto already happened before the stub was installed above, so this
    // case does its own fresh navigation.
    await page.goto("/design/rails");

    await page.getByRole("button", { name: "View Full Sized" }).click();
    await expect(page.getByRole("button", { name: "Print" })).toBeVisible();
    await expect(
      page.getByText(
        "Printing isn't available from the Home-Screen app — open this page in Safari to print the full-sized rail.",
      ),
    ).not.toBeVisible();

    // tap(), not click() — these are touch devices, and a tap is what a shaper does.
    await page.getByRole("button", { name: "Print" }).tap();
    await expect.poll(() => readPrintCount(page)).toBe(1);
  });

  // 10-11: the shaper's own words on 2026-09-11 — "rails keeps the controls under all 3 tabs."
  // INSTRUCTIONS is read-only reference content (rail-band-editor.tsx's own comment already said
  // so before this fix); on a phone the controls sit AFTER the content in scroll order, so reading
  // to the end used to land on a column of sliders that change nothing visible on that tab. This
  // proves the fix without proving a regression: the same heading must still be reachable on the
  // two tabs where it acts on something, so a fix that hid the controls everywhere cannot pass.
  test("rail-band controls: out of sight on INSTRUCTIONS, in sight on VIEWER and DATA", async ({ page }) => {
    const controlsHeading = page.getByText("Rail Band Calculator", { exact: true });

    // VIEWER is the tab this screen opens on.
    await expect(controlsHeading).toBeVisible();

    await railsPageTabs(page).getByRole("tab", { name: "DATA" }).click();
    await expect(controlsHeading).toBeVisible();

    await railsPageTabs(page).getByRole("tab", { name: "INSTRUCTIONS" }).click();
    await expect(controlsHeading).not.toBeVisible();

    // Switching back off INSTRUCTIONS restores it — nothing about the control itself is gone,
    // only its visibility on the one tab with nothing for it to target.
    await railsPageTabs(page).getByRole("tab", { name: "VIEWER" }).click();
    await expect(controlsHeading).toBeVisible();
  });

});

// CR-01 (10-REVIEW-3.md): D-10 landed one plan earlier in this same round and redefined the
// phone/desktop switch to read width alone again — so a phone turned sideways (about 844 CSS px on
// a real iPhone, about 863 on a real Pixel 7, both measured 2026-09-11) now clears the 820px
// cutoff and gets the DESKTOP shell, where `max-shell:hidden` (rail-band-editor.tsx) can never
// fire. The rail-band control heading therefore stays visible beside the INSTRUCTIONS reading on a
// sideways phone — the SAME bucket a real desktop mouse already occupies, and the same open
// question left for the founder's sweep (see rail-band-editor.tsx's own comment). This is
// DELIBERATE and PINNED here on purpose: these two tests assert that the heading IS visible, not
// that it is hidden, precisely so a future change cannot silently "fix" this one orientation
// without someone noticing the test that says it was decided this way.
test.describe("RAILS held sideways — the controls stay put, same bucket as a desktop mouse (D-10, CR-01)", () => {
  test.beforeEach(async ({ page }) => {
    await dismissSignInBanner(page);
  });

  test("iPhone sideways, 844x390: the rail-band control heading IS still visible on INSTRUCTIONS", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "iphone", "a real iPhone's sideways measurement is WebKit-specific");
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto("/design/rails");

    await railsPageTabs(page).getByRole("tab", { name: "INSTRUCTIONS" }).click();
    await expect(page.getByText("Rail Band Calculator", { exact: true })).toBeVisible();
  });

  test("Pixel 7 sideways, 863x360: the rail-band control heading IS still visible on INSTRUCTIONS", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "android", "a real Pixel 7's sideways measurement is Chromium-specific");
    await page.setViewportSize({ width: 863, height: 360 });
    await page.goto("/design/rails");

    await railsPageTabs(page).getByRole("tab", { name: "INSTRUCTIONS" }).click();
    await expect(page.getByText("Rail Band Calculator", { exact: true })).toBeVisible();
  });

  // 10-SWEEP-2.md, "The finding: RAILS sideways does not scroll" -- the founder's own words on a
  // real iPhone: "3 makes the big which is nice but the window doesn't scroll so you can only see
  // whatever is on top." All three rail sections are open by default, so simply landing on VIEWER
  // at a real sideways-phone height reproduces it with no extra toggling. This pins the fix
  // (`design-screen-shell.tsx`'s `overflow-y-auto` on the drawing column) against the REAL
  // element's own scrollHeight/clientHeight/scrollTop, never a CSS class name, and proves the
  // user-visible half of the fix too: the Tail section, pushed below the fold before scrolling,
  // is reachable after.
  //
  // 260914-tsp: the single 844x390 test that used to live here passed only when it beat the
  // browser to the page. The server always draws all three rail cross-sections at the solver's
  // 900px ceiling -- before the browser has measured anything, the drawing column looks like
  // 1005px of drawing crammed into a 297px box, and merely LOOKS like it scrolls. A beat later
  // `rail-band-editor.tsx`'s own solver measures the real container and shrinks the plots to fit,
  // and at 390 dots tall it shrinks them so far (three 40-dot slivers) that the column reads
  // 297/297 with nothing left to scroll. That beat measured 250-400ms after the page's own load
  // event on every run checked (2026-09-14); the old test's steps usually finished inside it,
  // because `page.goto` resolves at load, not at hydration -- "usually" was the whole guarantee.
  //
  // The cliff, measured after hydration settles at 844 wide (main's own height is the viewport
  // minus 93px of chrome; the plots container is main minus a further 159px):
  //
  //   page height | plots container | each plot wrapper  | column content / column | scrolled to
  //   390         | 138px            | 40px                | 297 / 297                | 0
  //   353         | 101px            | 1px                 | 260 / 260                | 0
  //   352         | 100px            | 416px (full width)  | 554 / 259                | 295
  //   340         | 88px             | 416px (full width)  | 554 / 247                | 307
  //
  // The cliff sits exactly where the plots container is no taller than the three section titles'
  // own chrome (100px): at or below it the solver has no height left to shrink into and falls back
  // to drawing the plots full width, so the column genuinely overflows and scrolls. Above it the
  // plots shrink continuously -- 1px at 353, all the way down to 40px at 390.
  //
  // Where 340 comes from: a real iPhone 14 held sideways is about 844 dots across (measured
  // 2026-09-11, recorded in CLAUDE.md's Layout section, which also warns that a test tool's own
  // emulated 750 is not real hardware). Safari's own landscape toolbar leaves the page about 340
  // dots tall -- the same height Playwright's own "iPhone 14 landscape" device descriptor uses.
  // The founder's own sideways sweep bounds it independently: with two sections open the chrome is
  // only 64px so the plots still fit small, but with three it is 100px, the plots go full width,
  // and -- before the 09-12 fix -- nothing scrolled (10-SWEEP-2.md). That is only true between
  // roughly 316 and 352 dots tall. 390 is the SAME phone with the toolbar hidden, which the app's
  // own Hide Toolbar tip invites a shaper to do.
  test("iPhone sideways with Safari's bar showing, 844x340: the drawing column scrolls, and the Tail section it hides becomes reachable", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "iphone", "a real iPhone's sideways measurement is WebKit-specific");
    await proveDrawingColumnScrolls(page, { width: 844, height: 340 });
  });

  test("iPhone sideways with the toolbar hidden, 844x390: the three open plots collapse to slivers, so there is nothing to scroll (known, expected to fail)", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "iphone", "a real iPhone's sideways measurement is WebKit-specific");
    test.fail(
      true,
      "at 844x390 the rail plot fit shrinks all three open plots to 40px slivers, so the drawing " +
        "column has nothing left to scroll. The day the plot fit stops shrinking this far on a " +
        'short screen, Playwright will report "Expected to fail, but passed." -- at which point ' +
        "this test.fail should be deleted, turning this into the 390 proof.",
    );
    await proveDrawingColumnScrolls(page, { width: 844, height: 390 });
  });
});

test.describe("ROCKER DATASHEET on a phone — the same sideways-scrolling box (D-04 held-out check)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "phone-only DATASHEET assertion");
    await dismissSignInBanner(page);
  });

  test("the DATASHEET box scrolls sideways at 360px while the document does not", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 700 });
    await page.goto("/design/rocker");
    await page.getByRole("tab", { name: "DATASHEET" }).click();

    const docScrollWidth = await page.evaluate(() => document.scrollingElement?.scrollWidth ?? 0);
    expect(docScrollWidth, "the document itself scrolled sideways at 360px").toBe(360);

    const tableBox = page.locator("main .overflow-x-auto").first();
    await expect(tableBox).toBeVisible();
    const box = await tableBox.evaluate((el) => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }));
    expect(box.scrollWidth, "the datasheet box does not scroll sideways at all").toBeGreaterThan(box.clientWidth);
  });
});

test.describe("RAILS on a desktop — unchanged (PHON-05)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop-only RAILS assertions");
    await dismissSignInBanner(page);
    await page.goto("/design/rails");
  });

  test("every open rail still draws side by side, and there is no NOSE/CENTER/TAIL strip", async ({ page }) => {
    const visible = await visiblePlotSvgs(page);
    expect(visible, "expected all three open rails visible side by side").toHaveLength(3);
    await expect(railSwitchTabs(page)).toHaveCount(0);
  });

  test("View Full Sized still shows the check bar, the caveat and the Actual Size title", async ({ page }) => {
    await page.getByRole("button", { name: "View Full Sized" }).click();

    await expect(page.locator('[data-actual-size-box="check-bar"]')).toBeVisible();
    await expect(
      page.getByText("This assumes a standard screen at 100% zoom — check it against the bar below."),
    ).toBeVisible();

    const dialogTitle = page.locator('[data-slot="dialog-title"]');
    const titleText = await dialogTitle.innerText();
    expect(titleText).toContain("Actual Size");
  });

  test("View Full Sized: the Print button is visible, and the Home-Screen note is not (G-09-6, PHON-05)", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "View Full Sized" }).click();

    await expect(page.getByRole("button", { name: "Print" })).toBeVisible();
    await expect(
      page.getByText(
        "Printing isn't available from the Home-Screen app — open this page in Safari to print the full-sized rail.",
      ),
    ).not.toBeVisible();
  });

  // 10-11: the phone fix above is gated on the phone layout (a class that only takes effect under
  // the max-shell breakpoint), so a mouse must never be able to reach it, on any of the three
  // tabs. This is the standing proof of that rather than an inference from the gate's name — it
  // would fail the moment the gate widened past a phone.
  //
  // The desktop side of the SAME oddity is left alone here on purpose, and it is still open: a
  // desktop mouse sees the rail-band control column beside the reading on INSTRUCTIONS too, and
  // none of those controls act on anything the reading shows there either. It was not changed
  // because nothing a mouse sees may change in this phase, and because the founder has not been
  // asked whether the desktop should someday match the phone. That is a question for them, not a
  // silent fix and not a silent drop.
  test("rail-band controls: visible on all three tabs to a mouse", async ({ page }) => {
    const controlsHeading = page.getByText("Rail Band Calculator", { exact: true });

    // VIEWER is the tab this screen opens on.
    await expect(controlsHeading).toBeVisible();

    await railsPageTabs(page).getByRole("tab", { name: "DATA" }).click();
    await expect(controlsHeading).toBeVisible();

    await railsPageTabs(page).getByRole("tab", { name: "INSTRUCTIONS" }).click();
    await expect(controlsHeading).toBeVisible();
  });
});
