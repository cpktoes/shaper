import { expect, test, type Page } from "@playwright/test";

/**
 * Old Safari — iPhone and iPad software before 18.4 — gave every `<button>` a built-in
 * `align-items: flex-start` (WebKit bug 289441, fixed in Safari 18.4). The home page's board cards
 * are whole buttons laid out as a column, so on that Safari nothing inside them stretched to the
 * card's width and each board picture collapsed to an empty square about 26 dots wide: what the
 * founder's iPad 9th gen showed on 2026-10-04, upright and sideways, while their iPhone, on newer
 * software, drew the boards whole. `app/globals.css` undoes the rule for every button in its base
 * layer.
 *
 * No test browser carries the old rule any more (Playwright's WebKit is already fixed), so each
 * test puts it back: a stylesheet placed ahead of every other one, in a cascade layer of its own,
 * which makes it the weakest author rule on the page, as close to a browser's own default as a
 * page can get. Then every button's insides are measured before and after, and nothing may move.
 * With the fix taken out of `app/globals.css`, these tests reproduce the collapse: each board
 * picture drops to an empty square about 28 dots wide.
 */

const OLD_SAFARI_BUTTON_RULE = "@layer old-safari-button { button { align-items: flex-start; } }";

/** Same dismissal the sibling specs use, so the sign-in banner never shifts a measurement. */
async function dismissSignInBanner(page: Page) {
  await page.addInitScript(() => {
    window.sessionStorage.setItem("shaper-sign-in-banner-dismissed", "true");
  });
}

/** Every visible button and everything drawn inside it, as one size per element. */
async function measureButtonInsides(page: Page) {
  return page.evaluate(() => {
    const sizes: Record<string, { width: number; height: number; label: string }> = {};
    document.querySelectorAll("button").forEach((button, i) => {
      if (!button.checkVisibility()) return;
      const label = (button.getAttribute("aria-label") ?? button.textContent ?? "").trim().slice(0, 40);
      [button, ...button.querySelectorAll("*")].forEach((el, j) => {
        if (!el.checkVisibility()) return;
        const box = el.getBoundingClientRect();
        sizes[`${i}:${j}`] = { width: box.width, height: box.height, label };
      });
    });
    return sizes;
  });
}

/** Waits until React owns the page's buttons and every button's insides hold still between two
 * reads (a drawing can still be fitting itself just after the page loads), then returns the sizes. */
async function measureWhenSettled(page: Page) {
  await page.waitForFunction(() => {
    const button = document.querySelector("button");
    return !!button && Object.keys(button).some((key) => key.startsWith("__reactFiber"));
  });
  let previous = "";
  let sizes: Awaited<ReturnType<typeof measureButtonInsides>> = {};
  await expect(async () => {
    sizes = await measureButtonInsides(page);
    const current = JSON.stringify(sizes, (_, value) => (typeof value === "number" ? Math.round(value) : value));
    const unchanged = current === previous;
    previous = current;
    if (!unchanged) throw new Error("still settling");
  }).toPass({ timeout: 10_000, intervals: [150] });
  return sizes;
}

/** Put old Safari's button rule back, measure again, and require every size unchanged. */
async function expectOldSafariRuleChangesNothing(page: Page) {
  const before = await measureWhenSettled(page);
  expect(Object.keys(before).length).toBeGreaterThan(0);
  await page.evaluate((css) => {
    const style = document.createElement("style");
    style.textContent = css;
    document.head.prepend(style);
  }, OLD_SAFARI_BUTTON_RULE);
  // The rule really is on the page and really is outranked: a plain button, with no alignment of
  // its own, still computes `normal` (it computes `flex-start` without the fix).
  const plainButtonAlignment = await page.evaluate(() => {
    const probe = document.createElement("button");
    document.body.append(probe);
    const value = getComputedStyle(probe).alignItems;
    probe.remove();
    return value;
  });
  expect.soft(plainButtonAlignment).toBe("normal");
  const after = await measureButtonInsides(page);
  const moved = Object.entries(before)
    .filter(([key, size]) => {
      const now = after[key];
      return now !== undefined && (Math.abs(now.width - size.width) > 1 || Math.abs(now.height - size.height) > 1);
    })
    .map(([key, size]) => `${size.label} (${key}): ${Math.round(size.width)}x${Math.round(size.height)} -> ${Math.round(after[key].width)}x${Math.round(after[key].height)}`);
  expect(moved).toEqual([]);
}

/** The board picture's window inside each card: its outer box, the card's first child. */
async function boardPictureWidths(page: Page, cardText: string) {
  const cards = page.locator("button").filter({ hasText: cardText });
  await expect(cards.first()).toBeVisible();
  const widths: number[] = [];
  for (const card of await cards.all()) {
    const [cardBox, pictureBox] = await Promise.all([card.boundingBox(), card.locator(":scope > div").first().boundingBox()]);
    if (!cardBox || !pictureBox) throw new Error(`no box for a "${cardText}" card or its picture`);
    widths.push(pictureBox.width / cardBox.width);
  }
  return widths;
}

test.describe("old Safari's button rule (before 18.4) no longer squashes anything", () => {
  test.beforeEach(async ({ page }) => {
    await dismissSignInBanner(page);
  });

  test("the home page: every board card keeps its picture full width", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("button").filter({ hasText: "Start Shaping" })).toHaveCount(4);
    await expectOldSafariRuleChangesNothing(page);
    // Belt and braces on the one the founder saw: each picture still spans the card, inside its
    // 12-dot sand band (a collapsed picture measured about 7% of the card).
    for (const share of await boardPictureWidths(page, "Start Shaping")) expect(share).toBeGreaterThan(0.85);
  });

  test("the home page with a board in progress: its card keeps its picture too", async ({ page }) => {
    await page.goto("/");
    await page.locator("button").filter({ hasText: "Start Shaping" }).first().click();
    await page.waitForURL("**/design/outline");
    await page.getByRole("link", { name: "SHAPER ASSISTANT" }).filter({ visible: true }).first().click();
    await page.waitForURL((url) => url.pathname === "/");
    await expect(page.locator("button").filter({ hasText: "Continue This Board" })).toBeVisible();
    await expectOldSafariRuleChangesNothing(page);
    for (const share of await boardPictureWidths(page, "Continue This Board")) expect(share).toBeGreaterThan(0.85);
  });

  for (const path of ["/design/outline", "/design/rocker", "/design/rails", "/design/volume", "/design/fins", "/design/summary"]) {
    test(`${path}: no button's insides move`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("button").filter({ visible: true }).first()).toBeVisible();
      await expectOldSafariRuleChangesNothing(page);
    });
  }
});
