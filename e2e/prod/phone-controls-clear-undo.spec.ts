import { expect, test, type Page } from "@playwright/test";
import { BANNER_DISMISSAL_KEY } from "../../lib/models/banner-dismissal";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../../lib/models/toolbar-tip";
import { SCREENS, goToScreen } from "../helpers/screens";

/**
 * Production-build proof that on a phone held upright the LAST control of every design screen can
 * be scrolled clear of the floating Undo/Redo pair (Phase 13 item 13's fix, 2026-10-03).
 *
 * The fault this spec first caught, on the live site: ROCKER's Tail Thinning Starts row is the last
 * control on the screen, and its Automatic button is right-aligned — exactly where the pair floats.
 * (Then it sat 12px above the old bottom tab bar; since quick 261003-q2f removed that bar it sits
 * 16px in from the window's bottom-right corner, plus the home-bar inset on a real iPhone.) With the controls scrolled to their very end the button sat under the
 * Redo button, with nothing below it to scroll it clear, so a tap landed on Redo. The button only
 * comes alive once a start has been set by hand, and setting one is itself an edit, so the pair was
 * always there when the button was needed.
 *
 * Why this lives under e2e/prod/ and runs against `next start`, never the dev server: in
 * development every design screen's controls end with the "Copy preset values" row (the shell's
 * `sidebarFooter`, dev only), which sits right where the pair floats — so on the dev server the
 * last real control always stops above the pair, and `e2e/touch-sizing.spec.ts`'s own hit test on
 * this same button passes whether the fault is there or not. Only a production build has the
 * layout a shaper actually gets.
 *
 * The first test is the general rule (no control on any of the six screens ends up under the pair,
 * and every control in the pair's column — the Back and Next pair included — ends at least 7.5 dots
 * above it, the 8 dots of daylight each screen's end room is sized for); the second is the named
 * case, taken with a real tap. The screens are walked the way a shaper on a phone does, through the
 * top bar's menu and its screen tiles (`e2e/helpers/screens.ts`).
 */

async function dismissPhoneBanners(page: Page) {
  await page.addInitScript((key) => window.sessionStorage.setItem(key, "true"), BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => window.localStorage.setItem(key, "true"), TOOLBAR_TIP_DISMISSAL_KEY);
}

/** Home, the first preset (it carries its own blank, so ROCKER has both Thinning Starts rows), then
 * one small change on TEMPLATE so there is something to take back and the pair is on screen. */
async function openAPresetWithThePairShowing(page: Page) {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByRole("button").filter({ hasText: "Start Shaping" }).first().click();
  await page.waitForURL("**/design/outline");
  const slider = page.getByRole("slider").filter({ visible: true }).first();
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeVisible();
}

async function openScreen(page: Page, screen: (typeof SCREENS)[number]) {
  await goToScreen(page, screen.label);
}

/** Sets a tip's Thinning Start by hand — the only state in which its Automatic button is live. */
async function setAStartByHand(page: Page, tip: "Nose" | "Tail") {
  const label = page.getByText(new RegExp(`^${tip} Thinning Starts — `));
  const before = await label.innerText();
  const slider = page.getByRole("slider", { name: `${tip} Thinning Starts`, exact: true });
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  await expect(label).not.toHaveText(before);
}

/** What a thumb does to reach the end of a screen: every scrolling box, and the page, to its end. */
async function scrollEverythingToItsEnd(page: Page) {
  await page.evaluate(() => {
    for (const el of Array.from(document.querySelectorAll<HTMLElement>("*"))) {
      const overflowY = getComputedStyle(el).overflowY;
      if ((overflowY === "auto" || overflowY === "scroll") && el.scrollHeight > el.clientHeight + 1) {
        el.scrollTop = el.scrollHeight;
      }
    }
    window.scrollTo(0, document.documentElement.scrollHeight);
  });
}

/** The smallest gap, in dots, between the pair's top edge and the bottom of any visible control whose
 * left-to-right span overlaps the pair's — negative when one reaches below the pair's top. */
async function smallestGapAboveThePair(page: Page): Promise<{ gap: number; control: string }> {
  return page.evaluate(() => {
    const pair = Array.from(document.querySelectorAll<HTMLElement>("button")).filter(
      (button) => /^(Undo|Redo)$/.test(button.getAttribute("aria-label") ?? "") && button.getBoundingClientRect().width > 0,
    );
    const pairBoxes = pair.map((button) => button.getBoundingClientRect());
    const pairLeft = Math.min(...pairBoxes.map((b) => b.left));
    const pairRight = Math.max(...pairBoxes.map((b) => b.right));
    const pairTop = Math.min(...pairBoxes.map((b) => b.top));
    let best = { gap: Infinity, control: "none" };
    const controls = Array.from(
      document.querySelectorAll<HTMLElement>(
        'button, a[href], input, select, textarea, [role="slider"], [role="tab"], [role="checkbox"], [role="radio"], [role="switch"], [role="combobox"], [data-slot="slider-thumb"]',
      ),
    );
    for (const el of controls) {
      if (pair.includes(el) || el.closest("header")) continue;
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      if (getComputedStyle(el).visibility === "hidden" || el.closest('[aria-hidden="true"]')) continue;
      if (box.right <= pairLeft || box.left >= pairRight) continue;
      // Scrolled out of sight above the window: nowhere near the pair.
      if (box.bottom <= 0) continue;
      const gap = pairTop - box.bottom;
      if (gap < best.gap) {
        const name = (el.getAttribute("aria-label") ?? el.textContent ?? el.tagName).replace(/\s+/g, " ").trim();
        best = { gap, control: name.slice(0, 60) };
      }
    }
    return best;
  });
}

/** The names of every control whose centre the pair covers, plus any small control whose box the
 * pair overlaps at all. Empty is what a shaper needs. */
async function controlsUnderThePair(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const pair = Array.from(document.querySelectorAll<HTMLElement>("button")).filter(
      (button) => /^(Undo|Redo)$/.test(button.getAttribute("aria-label") ?? "") && button.getBoundingClientRect().width > 0,
    );
    if (pair.length !== 2) return [`the Undo/Redo pair is not showing (${pair.length} of 2 buttons found)`];
    const pairBoxes = pair.map((button) => button.getBoundingClientRect());
    const nameOf = (el: Element) =>
      (el.getAttribute("aria-label") ?? el.textContent ?? el.tagName).replace(/\s+/g, " ").trim().slice(0, 60);
    const controls = Array.from(
      document.querySelectorAll<HTMLElement>(
        'button, a[href], input, select, textarea, [role="slider"], [role="tab"], [role="checkbox"], [role="radio"], [role="switch"], [role="combobox"], [data-slot="slider-thumb"]',
      ),
    );
    const found: string[] = [];
    for (const el of controls) {
      if (pair.includes(el)) continue;
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      if (getComputedStyle(el).visibility === "hidden" || el.closest('[aria-hidden="true"]')) continue;
      const cx = box.left + box.width / 2;
      const cy = box.top + box.height / 2;
      const hit = document.elementFromPoint(cx, cy);
      const centreIsThePair = !!hit && pair.some((button) => button === hit || button.contains(hit));
      const overlapsThePair = pairBoxes.some(
        (p) => !(box.right <= p.left || box.left >= p.right || box.bottom <= p.top || box.top >= p.bottom),
      );
      // A wide control (a slider's track, a text field) passing under the pair still has most of
      // itself in reach; a small one that overlaps at all has not.
      if (centreIsThePair || (overlapsThePair && box.width < 200)) found.push(nameOf(el));
    }
    return found;
  });
}

test.describe("on a phone, the last control always clears the floating Undo/Redo pair (production build)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name === "desktop",
      "on a computer the pair floats over the drawing's corner, never over the controls",
    );
    await dismissPhoneBanners(page);
  });

  test("with the pair showing and each screen scrolled to its very end, no control sits under it", async ({
    page,
  }) => {
    await openAPresetWithThePairShowing(page);
    for (const screen of SCREENS) {
      await openScreen(page, screen);
      if (screen.label === "ROCKER") {
        await setAStartByHand(page, "Nose");
        await setAStartByHand(page, "Tail");
      }
      await scrollEverythingToItsEnd(page);
      expect(await controlsUnderThePair(page), `${screen.label}: controls under the Undo/Redo pair`).toEqual([]);
      const smallest = await smallestGapAboveThePair(page);
      console.log(`[q2f] ${screen.label}: smallest gap above the pair ${smallest.gap} (${smallest.control})`);
      expect(smallest.gap, `${screen.label}: ${smallest.control} ends at least 7.5 dots above the pair`).toBeGreaterThanOrEqual(
        7.5,
      );
    }
  });

  test("ROCKER: the tail's Automatic button, the last control on the screen, takes a real tap", async ({ page }) => {
    await openAPresetWithThePairShowing(page);
    await openScreen(page, SCREENS[1]);
    await setAStartByHand(page, "Tail");
    await scrollEverythingToItsEnd(page);

    const automatic = page.getByRole("button", { name: "Use Automatic for the tail thinning start", exact: true });
    await expect(automatic).toHaveAttribute("aria-pressed", "false");

    // The button's whole touch box sits above the pair, with daylight between them.
    const box = await automatic.boundingBox();
    const undo = await page.getByRole("button", { name: "Undo", exact: true }).boundingBox();
    if (!box || !undo) throw new Error("the Automatic button or the Undo button is missing a bounding box");
    expect(box.y + box.height, "the Automatic button's bottom edge is above the pair's top edge").toBeLessThan(undo.y);

    // A real tap at the button's own centre: Playwright refuses it if anything else would take it.
    await automatic.click();
    await expect(automatic).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText(/^Tail Thinning Starts — /).locator("xpath=..").getByText("Picked automatically")).toBeVisible();
  });
});
