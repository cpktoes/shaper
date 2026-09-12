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

// 10-05 (was 260909-h3g): a real iPhone held sideways reports about 844 CSS px and a real Pixel 7
// about 863, and the app's shaper-approved decision (10-SWEEP.md, 2026-09-11) is that BOTH stay in
// the phone stack now — a phone on its side is a phone. That retires this describe's original bed:
// 863 x 360 is no longer "a width wide enough for the desktop layout", it is the phone-stack case
// the block below this one covers. What this describe was actually proving — that a TOUCH device
// wide enough for the desktop shell still loses its rotate button (pointer, not width, decides
// that) — is still true, just not provable on a phone any more. `iPad Mini landscape` (1024 x 768,
// WebKit) is a genuinely tablet-sized touch screen: wide AND tall enough to keep the desktop shell
// under the new width-and-height rule, so it still carries the case this file was written for. Runs
// on the `iphone` project (the WebKit one the descriptor expects).
// `defaultBrowserType` is part of the descriptor but can't be set via `test.use` inside a describe
// (Playwright: "forces a new worker" — only allowed top-level or in the config file). It's
// redundant here anyway: the `iphone` project this describe is pinned to already runs WebKit.
const { defaultBrowserType: ipadMiniLandscapeBrowserType, ...ipadMiniLandscapeViewport } =
  devices["iPad Mini landscape"];
void ipadMiniLandscapeBrowserType;

// Still needed below for the phone-stack case (863 x 360, android/chromium project) — see that
// describe's own comment for why this same descriptor no longer carries the tablet case above.
const { defaultBrowserType: pixel7LandscapeBrowserType, ...pixel7LandscapeViewport } =
  devices["Pixel 7 landscape"];
void pixel7LandscapeBrowserType;

test.describe("touch tablet, sideways — the rotate button stays gone even though the screen keeps the desktop layout", () => {
  test.use({ ...ipadMiniLandscapeViewport });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "iphone",
      "this describe supplies its own device (iPad Mini landscape, WebKit)",
    );
    await dismissSignInBanner(page);
  });

  test("the rotate button is gone on both TEMPLATE and ROCKER, even though the screen keeps the desktop layout", async ({
    page,
  }) => {
    await page.goto("/design/outline");

    // Load-bearing precondition: a coarse pointer AND a screen at least 820 wide AND at least 500
    // tall — the exact bed the desktop-side variant's negation is meant to keep in the desktop
    // shell. Without all three, this proves nothing about the pointer-driven rotate-button rule.
    const preconditions = await page.evaluate(() => ({
      coarsePointer: window.matchMedia("(pointer: coarse)").matches,
      wideEnoughForDesktopShell: window.matchMedia("(min-width: 820px)").matches,
      tallEnoughForDesktopShell: window.matchMedia("(min-height: 500px)").matches,
    }));
    expect(preconditions.coarsePointer).toBe(true);
    expect(preconditions.wideEnoughForDesktopShell).toBe(true);
    expect(preconditions.tallEnoughForDesktopShell).toBe(true);

    // The desktop side-by-side shell really is what rendered at this width — the same comparison
    // the desktop describe below makes. This is the "an iPad sideways keeps the desktop layout"
    // half of the shaper's own decision (10-SWEEP.md).
    const sidebar = page.locator("aside");
    const canvas = page.locator("main");
    const sidebarBox = await sidebar.boundingBox();
    const canvasBox = await canvas.boundingBox();
    if (!sidebarBox || !canvasBox) throw new Error("missing bounding box");
    expect(sidebarBox.x + sidebarBox.width).toBeLessThanOrEqual(canvasBox.x + 1);

    await expect(page.getByRole("button", { name: /^Rotate the board/ })).toBeHidden();

    // Client-side nav via the desktop link row (visible here, since this viewport keeps the
    // desktop shell) rather than a second hard `page.goto` — a WebKit-only dev-server quirk,
    // reproducible on this exact viewport, otherwise races a hard navigation against a background
    // Fast-Refresh reload the dev server occasionally pushes right after the outline route's first
    // paint. A shaper would move between screens exactly this way (the desktop nav's own link),
    // so this is not a weaker proof of the rotate button's own rule — same assertion, a navigation
    // path already exercised by every other desktop-shell test in this file.
    await page.getByRole("link", { name: "ROCKER" }).click();
    await expect(page.getByRole("button", { name: /^Rotate the board/ })).toBeHidden();
  });
});

// D-10 (10-SWEEP-2.md, 2026-09-11): the shaper's own verdict, holding a real phone sideways —
// "horizontal is useless, as there are no controls other than the drag. It was honestly better
// when it was treated as a normal browser rather than a phone." That reverts 10-05's
// width-and-height switch back to width alone, so a phone held sideways (about 844-863 real CSS
// px on real hardware, both over the 820px cutoff) now gets the DESKTOP shell — controls beside
// the board, not stacked above them with almost nothing left underneath. This describe used to
// prove the opposite (10-05's own rule); it now proves D-10 in a real browser. It is deliberately
// separate from — and does not touch the BODY of — the touch-tablet describe above, which now
// proves the same D-10 outcome on the OTHER real hardware width (a real iPhone held sideways).
test.describe("phone held sideways — the desktop shell renders, controls beside the board (D-10)", () => {
  test.use({ ...pixel7LandscapeViewport });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "android",
      "this describe supplies its own device (Pixel 7 landscape)",
    );
    await dismissSignInBanner(page);
  });

  test("at 863 x 360 (a real Pixel 7 turned sideways) the desktop shell renders: the desktop link row shows all six screens, the six-tab bottom bar and compact top bar are gone, and the rotate button is gone (a touch pointer's own job, not this switch's)", async ({
    page,
  }) => {
    await page.goto("/design/outline");

    // Load-bearing precondition: this really is the width real hardware reported, on a touch
    // device, before asserting anything about which shell rendered.
    const preconditions = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
      coarsePointer: window.matchMedia("(pointer: coarse)").matches,
    }));
    expect(preconditions.width).toBe(863);
    expect(preconditions.height).toBe(360);
    expect(preconditions.coarsePointer).toBe(true);

    // The desktop screen-link row (SiteNav's own bare <nav>, no aria-label) now renders — the
    // layout switch reads width alone again, and 863px clears the 820px cutoff.
    const desktopNav = page.locator("nav:not([aria-label])");
    await expect(desktopNav).toBeVisible();
    for (const label of SCREEN_LABELS) {
      await expect(desktopNav.getByRole("link", { name: label })).toBeVisible();
    }

    const tabBar = page.getByRole("navigation", { name: "Screens" });
    await expect(tabBar).toBeHidden();

    const topBar = page.getByRole("banner");
    await expect(topBar).toBeHidden();

    // Unchanged, because it was never a layout question: a touch device turning already turns the
    // board, so the Rotate button stays gone here too — this is the `coarse` pointer variant's own
    // job (app/globals.css), not the width switch this describe is about.
    await expect(page.getByRole("button", { name: /^Rotate the board/ })).toBeHidden();
  });
});

// PHON-10 adjacency: at exactly 820 dots, exactly one layout applies, decided by declaration
// rather than by which rule Tailwind happens to emit first (app/globals.css's own comment above
// `max-shell`/`shell`). Runs on the desktop project deliberately — a mouse, not a touch device —
// because after D-10 the switch reads width alone, so this boundary owes nothing to pointer type
// any more. Previously this pair was proved through the board card's height cap at 819/820px, but
// 10-09 moved that cap onto the `coarse` pointer variant (off this axis entirely), so the boundary
// needs its own standing test rather than a borrowed one.
test.describe("the 820px layout boundary — exactly one shell applies at each width (PHON-10)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "pointer-independent now — proved once, on a mouse");
    await dismissSignInBanner(page);
  });

  test("819px wide renders the phone stack, 820px wide renders the desktop shell", async ({ page }) => {
    const tabBar = page.getByRole("navigation", { name: "Screens" });
    const desktopNav = page.locator("nav:not([aria-label])");

    await page.setViewportSize({ width: 819, height: 900 });
    await page.goto("/design/outline");
    await expect(tabBar).toBeVisible();
    await expect(desktopNav).toBeHidden();

    await page.setViewportSize({ width: 820, height: 900 });
    await expect(tabBar).toBeHidden();
    await expect(desktopNav).toBeVisible();
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
