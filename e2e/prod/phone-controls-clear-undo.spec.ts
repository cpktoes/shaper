import { expect, test, type Page } from "@playwright/test";
import { BANNER_DISMISSAL_KEY } from "../../lib/models/banner-dismissal";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../../lib/models/toolbar-tip";

/**
 * Production-build proof that on a phone held upright the LAST control of every design screen can
 * be scrolled clear of the floating Undo/Redo pair (Phase 13 item 13's fix, 2026-10-03).
 *
 * The fault this spec first caught, on the live site: ROCKER's Tail Thinning Starts row is the last
 * control on the screen, and its Automatic button is right-aligned — exactly where the pair floats,
 * 12px above the tab bar. With the controls scrolled to their very end the button sat under the
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
 * The first test is the general rule (no control on any of the six screens ends up under the pair);
 * the second is the named case, taken with a real tap.
 */

/** `components/site-nav.tsx`'s NAV_LINKS, hand-written the way every phone spec in this suite does
 * (importing it would pull the database client into Playwright's own Node process). */
const SCREENS = [
  { href: "/design/outline", label: "TEMPLATE" },
  { href: "/design/rocker", label: "ROCKER" },
  { href: "/design/rails", label: "RAILS" },
  { href: "/design/volume", label: "VOLUME" },
  { href: "/design/fins", label: "FINS" },
  { href: "/design/summary", label: "SUMMARY" },
] as const;

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
  await page.getByRole("navigation", { name: "Screens" }).getByRole("link", { name: screen.label }).click();
  await page.waitForURL(`**${screen.href}`);
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
