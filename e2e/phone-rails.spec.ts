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
 */

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";

/** Matches desktop-baseline.spec.ts's/phone-layout.spec.ts's own approach: dismiss the sign-in
 * banner via sessionStorage, set before navigation, so its own height never confuses a layout
 * assertion. */
async function dismissSignInBanner(page: Page) {
  await page.addInitScript((key) => {
    window.sessionStorage.setItem(key, "true");
  }, BANNER_DISMISSAL_KEY);
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
});
