import { expect, test, type Page } from "@playwright/test";

/**
 * 260909-hq9's own proof: the founder reported the phone home screen ("Phone Homepage layout is
 * terrible. We should mimic the other phone page layout.") — Phase 9 gave the five design screens
 * a phone shell (`e2e/phone-layout.spec.ts`, `e2e/phone-screens.spec.ts`) and deliberately left `/`
 * out of scope for that phase. This file is the home screen's own standing proof, on both phone
 * projects and the desktop one, that `/` now wears the same shell.
 */

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";
const SCREEN_LABELS = ["TEMPLATE", "ROCKER", "RAILS", "VOLUME", "FINS", "SUMMARY"];

/** Matches the sibling phone specs' own approach: dismiss the sign-in banner via sessionStorage,
 * set before navigation, so its own height never confuses a layout assertion. The home screen
 * renders no sign-in banner itself, but carrying this helper matches the house pattern (each spec
 * file keeps its own copy rather than sharing one) and costs nothing. */
async function dismissSignInBanner(page: Page) {
  await page.addInitScript((key) => {
    window.sessionStorage.setItem(key, "true");
  }, BANNER_DISMISSAL_KEY);
}

test.describe("phone home screen — the compact top bar", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "phone-only shell assertions");
    await dismissSignInBanner(page);
  });

  test("the desktop link row is hidden, the compact top bar shows SHAPER ASSISTANT/Save/Menu, and SHAPER ASSISTANT is not a link here", async ({
    page,
  }) => {
    await page.goto("/");

    const desktopNav = page.locator("nav:not([aria-label])");
    await expect(desktopNav).toBeHidden();

    const topBar = page.getByRole("banner");
    await expect(topBar).toBeVisible();
    await expect(topBar.getByText("SHAPER ASSISTANT")).toBeVisible();
    // On the page it points at, the wordmark is plain text, not a dead-tap link.
    await expect(topBar.getByRole("link", { name: "SHAPER ASSISTANT" })).toHaveCount(0);
    await expect(topBar.getByRole("button", { name: "Save Board" })).toBeVisible();
    await expect(topBar.getByRole("button", { name: "Menu" })).toBeVisible();
  });
});

test.describe("phone home screen — the six-tab bottom bar is hidden here, shown once a board is picked (D-07)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "phone-only shell assertions");
    await dismissSignInBanner(page);
  });

  test("the Screens navigation is absent on the home route, and present after picking a preset", async ({
    page,
  }) => {
    await page.goto("/");

    // The six design tabs are noise while a shaper is still choosing a board (D-07) — the bar
    // must not just be visually hidden, it must not render at all, so the setup screen's cards
    // get the full 56px + safe-area it was costing them.
    await expect(page.getByRole("navigation", { name: "Screens" })).toHaveCount(0);

    const firstPreset = page.getByRole("button").filter({ hasText: "Start Shaping" }).first();
    await firstPreset.click();
    await page.waitForURL("**/design/outline");

    // The six labels in order, the marked tab and the 44px minimums are already asserted by
    // e2e/phone-layout.spec.ts's own six-tab test on this same route — not duplicated here.
    await expect(page.getByRole("navigation", { name: "Screens" })).toBeVisible();
  });
});

test.describe("phone home screen — nothing scrolls sideways or vertically", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "phone-only shell assertions");
    await dismissSignInBanner(page);
  });

  for (const width of [360, 375, 393]) {
    test(`at ${width}px wide, the page itself doesn't scroll in either direction`, async ({ page }) => {
      await page.setViewportSize({ width, height: 640 });
      await page.goto("/");

      const scrollWidth = await page.evaluate(() => document.scrollingElement?.scrollWidth ?? 0);
      expect(scrollWidth).toBe(width);

      const doc = await page.evaluate(() => ({
        scrollHeight: document.scrollingElement?.scrollHeight ?? 0,
        clientHeight: document.scrollingElement?.clientHeight ?? 0,
      }));
      expect(Math.abs(doc.scrollHeight - doc.clientHeight)).toBeLessThanOrEqual(1);
    });
  }
});

test.describe("phone home screen — the round trip proves both bars navigate", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "phone-only shell assertions");
    await dismissSignInBanner(page);
  });

  test("a preset tap opens TEMPLATE, and SHAPER ASSISTANT in the top bar there returns home with the rack showing", async ({
    page,
  }) => {
    await page.goto("/");

    const firstPreset = page.getByRole("button").filter({ hasText: "Start Shaping" }).first();
    await firstPreset.click();
    await page.waitForURL("**/design/outline");

    // On a design route the wordmark IS a link — this is the return path home.
    await page.getByRole("banner").getByRole("link", { name: "SHAPER ASSISTANT" }).click();
    await page.waitForURL("/");

    await expect(page.getByRole("heading", { name: "Your Boards" })).toBeVisible();

    const scrollWidth = await page.evaluate(() => document.scrollingElement?.scrollWidth ?? 0);
    const viewportSize = page.viewportSize();
    if (!viewportSize) throw new Error("no viewport size");
    expect(scrollWidth).toBe(viewportSize.width);
  });
});

test.describe("desktop home screen — unmoved", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop-only shell assertions");
    await dismissSignInBanner(page);
  });

  test("the desktop link row is visible with its six links, and neither phone bar renders", async ({
    page,
  }) => {
    await page.goto("/");

    const desktopNav = page.locator("nav:not([aria-label])");
    await expect(desktopNav).toBeVisible();
    for (const label of SCREEN_LABELS) {
      await expect(desktopNav.getByRole("link", { name: label })).toBeVisible();
    }

    await expect(page.getByRole("navigation", { name: "Screens" })).toBeHidden();
    await expect(page.getByRole("banner")).toBeHidden();
  });
});

// The rack card menu (the saved-board three-dot trigger and its Rename/Duplicate/Delete rows)
// cannot be reached by this suite: it runs signed out against a fake database, so no saved board
// and therefore no three-dot menu ever renders here. That control's thumb sizing is proved instead
// by the class checks in this task's own <verify>, and its real-device behaviour is Phase 10's.

test.describe("phone home screen — margins, headings and thumb-sized cards", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "phone-only spacing assertions");
    await dismissSignInBanner(page);
  });

  test("the content sits 16px in from each edge, at the project's own width and at 800px", async ({
    page,
  }) => {
    await page.goto("/");

    const content = page.locator("[data-setup-content]");
    const atOwnWidth = await content.evaluate((el) => {
      const style = getComputedStyle(el);
      return { left: style.paddingLeft, right: style.paddingRight };
    });
    expect(atOwnWidth.left).toBe("16px");
    expect(atOwnWidth.right).toBe("16px");

    // The second measurement, at 800px — inside the 768-819px band below the 820px shell
    // breakpoint — proves no leftover desktop rule wins there.
    await page.setViewportSize({ width: 800, height: 640 });
    const at800 = await content.evaluate((el) => {
      const style = getComputedStyle(el);
      return { left: style.paddingLeft, right: style.paddingRight };
    });
    expect(at800.left).toBe("16px");
    expect(at800.right).toBe("16px");
  });

  test("the headline occupies a single line at 360px", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto("/");

    const headline = page.getByRole("heading", { name: "Shape a New Board" });
    const fit = await headline.evaluate((el) => {
      const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
      const height = el.getBoundingClientRect().height;
      return { lineHeight, height };
    });
    expect(fit.height).toBeLessThanOrEqual(fit.lineHeight * 1.5);
  });

  test("every preset card takes a full row, one under the other, each at least 44px tall", async ({
    page,
  }) => {
    await page.goto("/");

    const presetCards = page.getByRole("button").filter({ hasText: "Start Shaping" });
    const count = await presetCards.count();
    expect(count).toBeGreaterThan(1);

    const boxes = [];
    for (const card of await presetCards.all()) {
      const box = await card.boundingBox();
      if (!box) throw new Error("preset card is missing a bounding box");
      boxes.push(box);
    }

    const firstBox = boxes[0];
    for (let i = 0; i < boxes.length; i++) {
      expect(boxes[i].x).toBeCloseTo(firstBox.x, 0);
      expect(boxes[i].width).toBeCloseTo(firstBox.width, 0);
      expect(boxes[i].height).toBeGreaterThanOrEqual(44);
      if (i > 0) {
        expect(boxes[i].y).toBeGreaterThan(boxes[i - 1].y);
      }
    }
  });

  test("after the preset round trip, the rack heading is one line and the in-progress card matches a preset card's row", async ({
    page,
  }) => {
    await page.goto("/");

    const firstPreset = page.getByRole("button").filter({ hasText: "Start Shaping" }).first();
    await firstPreset.click();
    await page.waitForURL("**/design/outline");
    await page.getByRole("banner").getByRole("link", { name: "SHAPER ASSISTANT" }).click();
    await page.waitForURL("/");

    const rackHeading = page.getByRole("heading", { name: "Your Boards" });
    await expect(rackHeading).toBeVisible();
    const headingFit = await rackHeading.evaluate((el) => {
      const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
      const height = el.getBoundingClientRect().height;
      return { lineHeight, height };
    });
    expect(headingFit.height).toBeLessThanOrEqual(headingFit.lineHeight * 1.5);

    const presetCard = page.getByRole("button").filter({ hasText: "Start Shaping" }).first();
    const rackCard = page.getByRole("button").filter({ hasText: "Continue This Board" }).first();
    const presetBox = await presetCard.boundingBox();
    const rackBox = await rackCard.boundingBox();
    if (!presetBox || !rackBox) throw new Error("missing bounding box");
    expect(rackBox.x).toBeCloseTo(presetBox.x, 0);
    expect(rackBox.width).toBeCloseTo(presetBox.width, 0);

    const scrollWidth = await page.evaluate(() => document.scrollingElement?.scrollWidth ?? 0);
    const viewportSize = page.viewportSize();
    if (!viewportSize) throw new Error("no viewport size");
    expect(scrollWidth).toBe(viewportSize.width);
  });

  test("the Save and Menu buttons in the top bar each measure at least 44x44", async ({ page }) => {
    await page.goto("/");

    const topBar = page.getByRole("banner");
    const saveButton = topBar.getByRole("button", { name: "Save Board" });
    const menuButton = topBar.getByRole("button", { name: "Menu" });

    for (const button of [saveButton, menuButton]) {
      const box = await button.boundingBox();
      if (!box) throw new Error("button is missing a bounding box");
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });

  // D-08's fixed 387px cap is disproven by 10-SWEEP.md (a real phone held sideways read 757px on
  // a 237px-tall screen). The 2026-09-11 decision replaces it with a share of the screen the card
  // sits in: about three-quarters of the scroller's own visible height (one whole board plus the
  // top of the next), measured against `[data-setup-content]`'s scrolling ancestor rather than a
  // fixed pixel figure, so the assertion is correct at any viewport height by construction.
  test("every preset card is about three-quarters of the scroller's visible height, and its board drawing still reads as a distinct outline", async ({
    page,
  }) => {
    await page.goto("/");

    const scrollerHeight = await page.locator("[data-setup-content]").evaluate((el) => {
      let node: HTMLElement | null = el.parentElement;
      while (node) {
        const style = getComputedStyle(node);
        if (style.overflowY === "auto" || style.overflowY === "scroll") return node.clientHeight;
        node = node.parentElement;
      }
      throw new Error("no scrolling ancestor found for [data-setup-content]");
    });

    const presetCards = page.getByRole("button").filter({ hasText: "Start Shaping" });
    const cards = await presetCards.all();
    expect(cards.length).toBeGreaterThan(1);

    const pathWidths: number[] = [];
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const cardBox = await card.boundingBox();
      if (!cardBox) throw new Error("preset card is missing a bounding box");
      const ratio = cardBox.height / scrollerHeight;
      expect(ratio).toBeGreaterThanOrEqual(0.7);
      expect(ratio).toBeLessThanOrEqual(0.82);

      const path = card.locator('[data-board-silhouette="outline"]');
      const pathBox = await path.boundingBox();
      if (!pathBox) throw new Error("outline path is missing a bounding box");
      expect(pathBox.height).toBeGreaterThan(0);
      pathWidths.push(pathBox.width);

      // The thumbnail's inner box is now a MAXIMUM, not a fixed height — it must be strictly
      // less than the height the 340/620 aspect ratio alone would compute, which is what proves
      // the viewport-height cap actually applied here rather than the ratio quietly winning.
      // Three levels up from the path: path -> <g> -> <svg> (OutlineViewer's own root) -> the
      // capped well div.
      const thumbnailBox = path.locator("xpath=../../..");
      const box = await thumbnailBox.boundingBox();
      if (!box) throw new Error("thumbnail box is missing a bounding box");
      const ratioHeight = box.width * (620 / 340);
      expect(box.height).toBeLessThan(ratioHeight);
    }
    // The four presets stay tellable apart at the new size (this plan's own prohibition).
    expect(new Set(pathWidths.map((w) => Math.round(w))).size).toBeGreaterThan(1);

    // The second card's top edge falls inside the scroller's visible box — the "and the top of
    // the next one" half of the shaper's decision.
    const scrollerBox = await page
      .locator("[data-setup-content]")
      .evaluate((el) => el.parentElement?.getBoundingClientRect())
      .then((rect) => {
        if (!rect) throw new Error("no scroller rect");
        return rect;
      });
    const secondCardBox = await cards[1].boundingBox();
    if (!secondCardBox) throw new Error("second preset card is missing a bounding box");
    expect(secondCardBox.y).toBeLessThan(scrollerBox.y + scrollerBox.height);
  });
});

test.describe("desktop home screen — margins and headings unmoved", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop-only spacing assertions");
    await dismissSignInBanner(page);
  });

  test("the content sits 32px in from each edge, the headline is 30px, and the preset cards run four across", async ({
    page,
  }) => {
    await page.goto("/");

    const content = page.locator("[data-setup-content]");
    const padding = await content.evaluate((el) => getComputedStyle(el).paddingLeft);
    expect(padding).toBe("32px");

    const headline = page.getByRole("heading", { name: "Shape a New Board" });
    const fontSize = await headline.evaluate((el) => getComputedStyle(el).fontSize);
    expect(fontSize).toBe("30px");

    const presetCards = page.getByRole("button").filter({ hasText: "Start Shaping" });
    await expect(presetCards).toHaveCount(4);
    const boxes = [];
    for (const card of await presetCards.all()) {
      const box = await card.boundingBox();
      if (!box) throw new Error("preset card is missing a bounding box");
      boxes.push(box);
    }
    const topY = boxes[0].y;
    const distinctLeftEdges = new Set(boxes.map((box) => Math.round(box.x)));
    for (const box of boxes) {
      expect(box.y).toBeCloseTo(topY, 0);
    }
    expect(distinctLeftEdges.size).toBe(4);
  });

  // Measured today at 1280 x 800: card 222 x 494, thumbnail 170 x 310 — the assertion is written
  // as the computed width * 620/340 relationship rather than a hard-coded 310, so it stays true
  // if a future change moves the column width, and it proves the phone-only cap (D-08) never
  // reaches this project: the aspect ratio, not the 387px cap, still governs the box's height.
  test("the thumbnail box's height still follows its own width and the 340/620 ratio — the phone cap never reaches here", async ({
    page,
  }) => {
    await page.goto("/");

    const presetCards = page.getByRole("button").filter({ hasText: "Start Shaping" });
    const cards = await presetCards.all();
    expect(cards.length).toBe(4);

    for (const card of cards) {
      const cardBox = await card.boundingBox();
      if (!cardBox) throw new Error("preset card is missing a bounding box");
      expect(cardBox.height).toBeLessThan(520);

      const path = card.locator('[data-board-silhouette="outline"]');
      const thumbnailBox = path.locator("xpath=../../..");
      const box = await thumbnailBox.boundingBox();
      if (!box) throw new Error("thumbnail box is missing a bounding box");
      const ratioHeight = box.width * (620 / 340);
      expect(Math.abs(box.height - ratioHeight)).toBeLessThanOrEqual(1);
    }
  });

  // The 819/820px boundary, made measurable: the phone card cap is `width < 820px`, a strict
  // less-than, so nothing merges and nothing collides at the touching value (PHON-10 adjacency).
  // Run on a fine-pointer (desktop) project deliberately — the cap is a width rule and must not
  // depend on the pointer.
  test("at 819px the thumbnail box is capped at 387px, and at 820px it is back to the width/ratio height", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 819, height: 900 });
    await page.goto("/");

    const firstPath = page
      .getByRole("button")
      .filter({ hasText: "Start Shaping" })
      .first()
      .locator('[data-board-silhouette="outline"]');
    const thumbnailBox819 = firstPath.locator("xpath=../../..");
    const box819 = await thumbnailBox819.boundingBox();
    if (!box819) throw new Error("thumbnail box is missing a bounding box at 819px");
    expect(box819.height).toBe(387);

    await page.setViewportSize({ width: 820, height: 900 });
    const box820 = await thumbnailBox819.boundingBox();
    if (!box820) throw new Error("thumbnail box is missing a bounding box at 820px");
    const ratioHeight820 = box820.width * (620 / 340);
    expect(Math.abs(box820.height - ratioHeight820)).toBeLessThanOrEqual(1);
    expect(box820.height).not.toBe(387);
  });
});
