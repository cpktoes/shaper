import { devices, expect, test, type Page } from "@playwright/test";

/**
 * TEST-01's proof for Phase 9's tracer (09-02): TEMPLATE stacks on the iphone and android
 * projects — the drawing pinned across the full width above a controls region that alone
 * scrolls, and the six-tab bottom bar under the thumb — while the desktop project proves the
 * sidebar-beside-canvas shell and both phone bars are untouched. Later plans in this phase (top
 * bar and menu, orientation) extend this same file rather than starting a new one.
 */

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";
// 260909-hny insurance: today this changes no measurement, because the toolbar tip is already
// `display: none` in every Playwright project (see e2e/phone-toolbar-tip.spec.ts's header
// comment). It's dismissed here anyway so that if Playwright's WebKit ever implements
// `-webkit-touch-callout`, a strip does not silently appear above every pinned-height and
// bounding-box assertion in this file.
const TOOLBAR_TIP_DISMISSAL_KEY = "shaper-toolbar-tip-dismissed";
const SCREEN_LABELS = ["TEMPLATE", "ROCKER", "RAILS", "VOLUME", "FINS", "SUMMARY"];

/** Matches desktop-baseline.spec.ts's own approach: dismiss the sign-in banner via
 * sessionStorage, set before navigation, so its own height never confuses a layout assertion. */
async function dismissSignInBanner(page: Page) {
  await page.addInitScript((key) => {
    window.sessionStorage.setItem(key, "true");
  }, BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, "true");
  }, TOOLBAR_TIP_DISMISSAL_KEY);
}

test.describe("phone shell — TEMPLATE stacks with the drawing pinned above the controls", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "phone-only shell assertions");
    await dismissSignInBanner(page);
  });

  test("the drawing sits above the controls region, spans the full width, and only the controls region scrolls", async ({
    page,
  }) => {
    await page.goto("/design/outline");

    const drawing = page.locator("main");
    const controls = page.locator("aside");
    await expect(drawing).toBeVisible();
    await expect(controls).toBeVisible();

    const drawingBox = await drawing.boundingBox();
    const controlsBox = await controls.boundingBox();
    if (!drawingBox || !controlsBox) throw new Error("missing bounding box");

    // Stacked, not side by side (PHON-01): the drawing's bottom edge sits at or above the
    // controls region's top edge.
    expect(drawingBox.y + drawingBox.height).toBeLessThanOrEqual(controlsBox.y + 1);

    const viewportSize = page.viewportSize();
    if (!viewportSize) throw new Error("no viewport size");
    // PHON-06: the drawing spans at least 90% of the viewport width.
    expect(drawingBox.width / viewportSize.width).toBeGreaterThanOrEqual(0.9);

    // Nothing scrolls sideways.
    const scrollWidth = await page.evaluate(() => document.scrollingElement?.scrollWidth ?? 0);
    expect(scrollWidth).toBe(viewportSize.width);

    // The page itself never scrolls — the controls region is the phone's one scroller.
    const doc = await page.evaluate(() => ({
      scrollHeight: document.scrollingElement?.scrollHeight ?? 0,
      clientHeight: document.scrollingElement?.clientHeight ?? 0,
    }));
    expect(Math.abs(doc.scrollHeight - doc.clientHeight)).toBeLessThanOrEqual(1);

    // ...while the controls region really is the scroller. The scrolling box itself is
    // `data-design-controls-scroll` (the inner scroll div on most screens, the aside itself on
    // VOLUME's simpler sidebar) — not necessarily `aside`, which can also carry a dev-only footer
    // as a sibling flex item and so never overflows itself even while its scrolling child does.
    const scroller = page.locator("[data-design-controls-scroll]");
    const controlsScroll = await scroller.evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }));
    expect(controlsScroll.scrollHeight).toBeGreaterThan(controlsScroll.clientHeight);
  });

  test("the bottom tab bar shows all six screens in order, TEMPLATE marked, every tab at least 44px", async ({
    page,
  }) => {
    await page.goto("/design/outline");

    const tabBar = page.getByRole("navigation", { name: "Screens" });
    await expect(tabBar).toBeVisible();

    const tabs = tabBar.getByRole("link");
    await expect(tabs).toHaveCount(6);
    expect(await tabs.allTextContents()).toEqual(SCREEN_LABELS);

    const templateTab = tabBar.getByRole("link", { name: "TEMPLATE" });
    await expect(templateTab).toHaveClass(/border-surf-accent/);

    for (const tab of await tabs.all()) {
      const box = await tab.boundingBox();
      if (!box) throw new Error("tab is missing a bounding box");
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.width).toBeGreaterThanOrEqual(44);
    }
  });

  // 09-REVIEW.md CR-01: the wide-view toggle is a desktop-only affordance (it widens the canvas
  // by removing the sidebar, and a phone's canvas is already full width), so it must never
  // strip a phone shaper's one way to reach every control.
  test("the wide-view button is hidden on a phone, and the controls stay reachable", async ({
    page,
  }) => {
    await page.goto("/design/outline");

    await expect(
      page.getByRole("button", { name: "Hide the sidebar for a wider view" }),
    ).toBeHidden();
    await expect(page.locator("[data-design-controls-scroll]").first()).toBeVisible();
  });

  // Held-out overflow check (UI-SPEC "Bottom tab bar / overflow"): at these three narrow phone
  // widths, all six labels render whole on one line — no wrap, clip or ellipsis.
  for (const width of [360, 375, 393]) {
    test(`all six tab labels stay whole at ${width}px wide`, async ({ page }) => {
      await page.setViewportSize({ width, height: 640 });
      await page.goto("/design/outline");

      const tabBar = page.getByRole("navigation", { name: "Screens" });
      const tabs = tabBar.getByRole("link");
      await expect(tabs).toHaveCount(6);

      // The bar must fit the screen as well as keep its labels whole: a row of six unshrinkable
      // tabs that spills past the edge makes the whole page scroll sideways (caught at 360px by
      // 09-04's held-out ROCKER check after the wave-3 merge).
      const docScrollWidth = await page.evaluate(() => document.scrollingElement?.scrollWidth ?? 0);
      expect(docScrollWidth, `the page scrolled sideways at ${width}px`).toBe(width);

      for (const tab of await tabs.all()) {
        const fit = await tab.evaluate((el) => ({
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
        }));
        expect(fit.scrollWidth).toBeLessThanOrEqual(fit.clientWidth);
        const text = await tab.textContent();
        expect(text ?? "").not.toContain("…");
      }
    });
  }
});

test.describe("phone compact top bar and the one menu", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "phone-only top bar assertions");
    await dismissSignInBanner(page);
  });

  test("the desktop link row is hidden and the compact top bar shows the wordmark, Save and Menu", async ({
    page,
  }) => {
    await page.goto("/design/outline");

    // The desktop screen-link row (SiteNav's own <nav>, distinguished from the phone tab bar's
    // <nav aria-label="Screens"> by carrying no aria-label at all) is present in the tree but
    // hidden by its own max-shell:hidden rule on a design route at phone width.
    const desktopNav = page.locator("nav:not([aria-label])");
    await expect(desktopNav).toBeHidden();

    const topBar = page.getByRole("banner");
    await expect(topBar).toBeVisible();
    await expect(topBar.getByRole("link", { name: "SHAPER ASSISTANT" })).toBeVisible();
    // SaveButton's own accessible name before the first save.
    await expect(topBar.getByRole("button", { name: "Save Board" })).toBeVisible();
    const menuButton = topBar.getByRole("button", { name: "Menu" });
    await expect(menuButton).toBeVisible();

    // The whole row is one non-wrapping line at 360px wide.
    await page.setViewportSize({ width: 360, height: 640 });
    const fit = await topBar.evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }));
    expect(Math.abs(fit.scrollHeight - fit.clientHeight)).toBeLessThanOrEqual(1);

    // D-01: at least 20px of clear air between the name and Save, measured in Save's own widest
    // face — this signed-out suite can only ever render the everyday filled "Save" button (the
    // three min-w-20 faces, Saving…/Saved/Not saved, all require a signed-in shaper), so the
    // real Save element's min-width is forced to 80px (min-w-20's own pixel value) for the
    // measurement, then restored — an honest worst-case gap, not one inferred from "no overflow".
    const gap = await topBar.evaluate((el) => {
      const wordmark = el.querySelector("a") as HTMLElement | null;
      const saveEl = el.querySelector("button[aria-label='Save Board']") as HTMLElement | null;
      if (!wordmark || !saveEl) throw new Error("missing wordmark or Save element");
      const originalMinWidth = saveEl.style.minWidth;
      saveEl.style.minWidth = "80px";
      const wordmarkRect = wordmark.getBoundingClientRect();
      const saveRect = saveEl.getBoundingClientRect();
      saveEl.style.minWidth = originalMinWidth;
      return saveRect.left - wordmarkRect.right;
    });
    expect(gap).toBeGreaterThanOrEqual(20);
  });

  test("the Menu button opens one popup holding both a units choice and the account control", async ({
    page,
  }) => {
    await page.goto("/design/outline");

    const menuButton = page.getByRole("banner").getByRole("button", { name: "Menu" });
    await menuButton.click();

    const popup = page.getByRole("menu");
    await expect(popup).toBeVisible();
    await expect(popup.getByText("Imperial")).toBeVisible();
    await expect(popup.getByText("Metric")).toBeVisible();
    // The account row (NavAuthControl) is the same component the desktop nav renders — located
    // by its own stable hook rather than a state-dependent label, since this suite's deliberately
    // fake Clerk credentials never settle `isLoaded` true (NavAuthControl's own documented
    // fallback while unresolved), so asserting on "Sign in" text would be testing this harness's
    // Clerk stand-in rather than the phone menu's own composition.
    await expect(popup.locator("[data-phone-menu-account]")).toBeVisible();
  });
});

test.describe("phone orientation and the construction overlay default", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "phone-only orientation/overlay assertions");
    await dismissSignInBanner(page);
  });

  test("the rotate button is gone and the drag points already show, with nobody tapping anything", async ({
    page,
  }) => {
    await page.goto("/design/outline");

    // D-05/D-11: on a phone, turning the phone does the rotate button's job.
    await expect(page.getByRole("button", { name: /^Rotate the board/ })).toBeHidden();

    // D-02: the construction overlay (and so its drag targets) is on by default on a touch
    // device — present the moment the screen opens, before any tap.
    const dragTargets = page.locator("[data-drag-target]");
    await expect(dragTargets.first()).toBeVisible();
    expect(await dragTargets.count()).toBeGreaterThan(0);
  });
});

// 260909-h3g: a phone held sideways is where the founder found this bug. An iPhone 14 held
// sideways reports 844 real CSS px and a Pixel 7 reports 863, both over the 820px shell
// breakpoint, which is how a width-only rule let a dead rotate button back on screen there.
// Playwright's own `iPhone 14 landscape` descriptor emulates 750px — UNDER the breakpoint — so a
// test written against it would pass with or without the fix and prove nothing. `Pixel 7
// landscape` (863px, chromium) is the descriptor that actually reproduces the complaint, so this
// describe supplies it directly and only runs on the `android` project (the chromium one that
// descriptor expects).
// `defaultBrowserType` is part of the descriptor but can't be set via `test.use` inside a
// describe (Playwright: "forces a new worker" — only allowed top-level or in the config file).
// It's redundant here anyway: the `android` project this describe is pinned to already runs
// chromium, which is what the descriptor asks for.
const { defaultBrowserType: pixel7LandscapeBrowserType, ...pixel7LandscapeViewport } =
  devices["Pixel 7 landscape"];
void pixel7LandscapeBrowserType;

test.describe("phone held sideways — the rotate button stays gone even at a width wide enough for the desktop layout", () => {
  test.use({ ...pixel7LandscapeViewport });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "android",
      "this describe supplies its own device (Pixel 7 landscape)",
    );
    await dismissSignInBanner(page);
  });

  test("the rotate button is gone on both TEMPLATE and ROCKER, even though the screen is wide enough for the desktop layout", async ({
    page,
  }) => {
    await page.goto("/design/outline");

    // Load-bearing precondition: without this, a viewport that quietly fell under the shell
    // breakpoint would hide the button by the OLD width-only rule and prove nothing. Measured at
    // planning time: this device reports 863 CSS px and a coarse pointer.
    const preconditions = await page.evaluate(() => ({
      coarsePointer: window.matchMedia("(pointer: coarse)").matches,
      wideEnoughForDesktopShell: window.matchMedia("(min-width: 820px)").matches,
    }));
    expect(preconditions.coarsePointer).toBe(true);
    expect(preconditions.wideEnoughForDesktopShell).toBe(true);

    // The desktop side-by-side shell really is what rendered at this width — the same comparison
    // the desktop describe below makes.
    const sidebar = page.locator("aside");
    const canvas = page.locator("main");
    const sidebarBox = await sidebar.boundingBox();
    const canvasBox = await canvas.boundingBox();
    if (!sidebarBox || !canvasBox) throw new Error("missing bounding box");
    expect(sidebarBox.x + sidebarBox.width).toBeLessThanOrEqual(canvasBox.x + 1);

    await expect(page.getByRole("button", { name: /^Rotate the board/ })).toBeHidden();

    await page.goto("/design/rocker");
    await expect(page.getByRole("button", { name: /^Rotate the board/ })).toBeHidden();
  });
});

// 10-05: closing 10-VERIFICATION.md gap 4 — the layout switch stops being width-only. This is the
// exact case the fix targets: 863 x 360 (this same Pixel 7 landscape descriptor) used to render the
// DESKTOP shell above (width alone was 863px, over the old 820px switch), which is precisely why the
// board card and the Hide Toolbar tip disappeared sideways. After the fix, a coarse pointer on a
// screen shorter than 500px renders the phone stack regardless of width. This describe is
// deliberately separate from — and does not touch — the one above: that block still proves the
// desktop-style TABLET case is unaffected (task 2 re-points it at a real tablet, since 863 x 360 no
// longer carries that case after this change).
test.describe("phone held sideways — the phone stack renders, not the desktop shell (10-05)", () => {
  test.use({ ...pixel7LandscapeViewport });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "android",
      "this describe supplies its own device (Pixel 7 landscape)",
    );
    await dismissSignInBanner(page);
  });

  test("at 863 x 360 the phone stack renders: the six-screen bottom bar and compact top bar show, the desktop link row is hidden", async ({
    page,
  }) => {
    await page.goto("/design/outline");

    // Load-bearing precondition: this really is the short-touch screen the new rule targets,
    // before asserting anything about which shell rendered.
    const preconditions = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
      coarsePointer: window.matchMedia("(pointer: coarse)").matches,
    }));
    expect(preconditions.width).toBe(863);
    expect(preconditions.height).toBe(360);
    expect(preconditions.coarsePointer).toBe(true);

    const tabBar = page.getByRole("navigation", { name: "Screens" });
    await expect(tabBar).toBeVisible();

    const topBar = page.getByRole("banner");
    await expect(topBar).toBeVisible();

    // The desktop screen-link row (SiteNav's own bare <nav>, no aria-label) is present in the tree
    // but hidden by its own `max-shell:hidden` rule now that this width-and-height combination is
    // inside the phone stack.
    const desktopNav = page.locator("nav:not([aria-label])");
    await expect(desktopNav).toBeHidden();
  });
});

test.describe("phone controls — every slider sits in its own section", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "phone-only controls assertions");
    await dismissSignInBanner(page);
  });

  test("Width and Nose Angle are on screen the moment the page opens, with no Fine adjust row anywhere", async ({
    page,
  }) => {
    await page.goto("/design/outline");

    // No fold left to tap, on TEMPLATE or anywhere else — a hidden button would still fail this.
    await expect(page.getByRole("button", { name: "Fine adjust" })).toHaveCount(0);

    // Width is visible without tapping anything, because it never left the Widepoint Controls
    // section a shaper already sees on a desktop screen.
    const widthLabel = page.getByText(/^Width — /);
    await expect(widthLabel).toBeVisible();

    // It sits ABOVE the Settings checkbox at the bottom of the sidebar — proof it is back in its
    // own section instead of pushed to the end of the list.
    const settingsRow = page.getByText("View Construction Lines");
    const widthBox = await widthLabel.boundingBox();
    const settingsBox = await settingsRow.boundingBox();
    if (!widthBox || !settingsBox) throw new Error("missing bounding box");
    expect(widthBox.y).toBeLessThan(settingsBox.y);

    await page.goto("/design/rocker");

    await expect(page.getByRole("button", { name: "Fine adjust" })).toHaveCount(0);
    await expect(page.getByText(/^Nose Angle — /)).toBeVisible();
  });
});

test.describe("phone shell — ROCKER's wide-view button is hidden too", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "phone-only shell assertions");
    await dismissSignInBanner(page);
  });

  // 09-REVIEW.md CR-01: same guard as TEMPLATE above, on the other screen the finding named.
  test("the wide-view button is hidden on a phone, and the controls stay reachable", async ({
    page,
  }) => {
    await page.goto("/design/rocker");

    await expect(
      page.getByRole("button", { name: "Hide the sidebar for a wider view" }),
    ).toBeHidden();
    await expect(page.locator("[data-design-controls-scroll]").first()).toBeVisible();
  });
});

test.describe("desktop shell — unchanged", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop-only shell assertions");
    await dismissSignInBanner(page);
  });

  test("the sidebar sits left of the canvas and the phone bars are hidden", async ({ page }) => {
    await page.goto("/design/outline");

    const sidebar = page.locator("aside");
    const canvas = page.locator("main");
    await expect(sidebar).toBeVisible();
    await expect(canvas).toBeVisible();

    const sidebarBox = await sidebar.boundingBox();
    const canvasBox = await canvas.boundingBox();
    if (!sidebarBox || !canvasBox) throw new Error("missing bounding box");
    expect(sidebarBox.x + sidebarBox.width).toBeLessThanOrEqual(canvasBox.x + 1);

    await expect(page.getByRole("navigation", { name: "Screens" })).toBeHidden();
    await expect(page.getByRole("banner")).toBeHidden();
  });

  test("the rotate button is visible and the drag targets stay hidden until the construction toggle is pressed", async ({
    page,
  }) => {
    await page.goto("/design/outline");

    // PHON-05: desktop's rotate button and off-by-default overlay are exactly what they are
    // today — unaffected by this plan's touch-only defaults.
    await expect(page.getByRole("button", { name: /^Rotate the board/ })).toBeVisible();

    const dragTargets = page.locator("[data-drag-target]");
    expect(await dragTargets.count()).toBe(0);

    await page.getByRole("button", { name: "Show construction lines" }).click();
    await expect(dragTargets.first()).toBeVisible();
  });

  // 260909-h3g: the guard on this change's central promise — pointer, not width, is what was
  // added to the rotate button, so a mouse-driven desktop keeps its button at every width on
  // both screens. ROCKER opens on its VIEWER tab, where this toolbar lives.
  test("the rotate button is visible on ROCKER too", async ({ page }) => {
    await page.goto("/design/rocker");

    await expect(page.getByRole("button", { name: /^Rotate the board/ })).toBeVisible();
  });

  // 09-REVIEW.md CR-01: proves the toggle still does its one real job on desktop, unaffected by
  // the phone-only guard added above.
  test("wide view still hides the sidebar on desktop, and pressing it again shows it", async ({
    page,
  }) => {
    await page.goto("/design/outline");

    const wideViewButton = page.getByRole("button", { name: "Hide the sidebar for a wider view" });
    await wideViewButton.click();
    await expect(page.locator("aside")).toBeHidden();

    await page.getByRole("button", { name: "Show the sidebar" }).click();
    await expect(page.locator("aside")).toBeVisible();
  });

  test("the desktop sidebar shows every slider with nothing to tap", async ({ page }) => {
    await page.goto("/design/outline");

    await expect(page.getByRole("button", { name: "Fine adjust" })).toBeHidden();
    await expect(page.getByText(/^Width — /)).toBeVisible();
  });
});
