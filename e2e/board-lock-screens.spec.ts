import { expect, test, type Locator, type Page } from "@playwright/test";
import { BOARD_LOCK_COPY } from "../components/design/board-lock-copy";
import { RACK_COPY } from "../components/setup/rack-config";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import { RACK_STAND_IN_ROUTE, standInRackRows } from "../lib/models/rack-stand-in";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";
import { goToScreen, type ScreenLabel } from "./helpers/screens";
import { freshPracticeRack } from "./helpers/practice-rack";

/**
 * The board lock, part 2 (quick 261008-lsy, Plan 02): on a locked board every control that changes
 * the board is greyed AND disabled on all six design screens, in every layout, while everything that
 * only changes the view keeps working, and Unlock brings every control back at once. Plan 01's
 * board-lock.spec.ts proves the lock itself; this file proves the greying.
 *
 * Saved boards only exist on the practice rack (`/test-rack`): this suite runs signed out with no
 * database. Board 1 is a preset with a blank; board 5 is a hand-set board (no blank), the only kind
 * ROCKER draws differently.
 */

const STAND_INS = standInRackRows(5);
const board = (n: number) => STAND_INS[n - 1];

const captionFor = (page: Page, name: string) => page.getByRole("group", { name: RACK_COPY.captionGroup(name) });

/** Opens the practice rack with five boards and waits until it has drawn them all. */
async function openRack(page: Page) {
  await page.goto(`${RACK_STAND_IN_ROUTE}?boards=5`);
  await expect(page.locator("[data-rack-board]")).toHaveCount(5);
  await expect(page.locator("[data-rack-art][data-turn]")).toHaveCount(5);
}

/** A mouse points at board `n` and rests until it has turned (the computer's hover rack). */
async function turnTo(page: Page, n: number) {
  const key = board(n).id;
  const box = await page.locator(`[data-rack-board="${key}"]`).boundingBox();
  if (!box) throw new Error(`no box for board ${key}`);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 8 });
  await expect(page.locator(`[data-rack-art="${key}"]`)).toHaveAttribute("data-turn", "90");
}

/**
 * A locked practice board, open in the editor: a fresh practice rack, board `n` locked from its ⋯
 * menu, then opened with Open This Board. The sign-in banner and the toolbar tip are out of the way.
 * Board 1 is the turned one on a fresh rack (a finger's rack, too); another board is pointed at first.
 */
async function openLockedBoard(page: Page, n = 1) {
  await page.addInitScript(
    ([bannerKey, tipKey]) => {
      window.sessionStorage.setItem(bannerKey, "true");
      window.localStorage.setItem(tipKey, "true");
    },
    [BANNER_DISMISSAL_KEY, TOOLBAR_TIP_DISMISSAL_KEY] as const,
  );
  await freshPracticeRack(page);
  await openRack(page);
  const name = board(n).name;
  if (n !== 1) await turnTo(page, n);
  await page.getByRole("button", { name: `Board actions for ${name}` }).click();
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  await menu.getByRole("menuitemcheckbox", { name: BOARD_LOCK_COPY.lockBoard }).click();
  await expect(page.getByRole("menu")).toHaveCount(0);
  await captionFor(page, name).getByRole("button", { name: RACK_COPY.open }).click();
  await page.waitForURL("**/design/outline");
}

/** Whether the element is disabled to a mouse, a finger, the keyboard and a screen reader. */
const IS_DISABLED = (el: Element) =>
  (el as HTMLButtonElement).disabled === true ||
  el.getAttribute("aria-disabled") === "true" ||
  el.hasAttribute("data-disabled");

/**
 * Every control in `scope` that changes the board must be disabled: buttons, typed boxes, select
 * triggers and tick boxes that are not marked `data-lock-exempt`. Returns the ones that are not,
 * described, so a failure names them.
 */
async function liveBoardControls(scope: Locator): Promise<string[]> {
  return scope.evaluate((root, isDisabledSource) => {
    const isDisabled = new Function(`return (${isDisabledSource})`)() as (el: Element) => boolean;
    const offenders: string[] = [];
    const candidates = root.querySelectorAll(
      'button, input:not([type="range"]), select, [role="checkbox"], [role="combobox"], [data-slot="select-trigger"]',
    );
    for (const el of candidates) {
      if (el.closest("[data-lock-exempt]")) continue;
      // Base UI's hidden twin of a tick box carries no interaction of its own.
      if (el.getAttribute("aria-hidden") === "true") continue;
      if (!isDisabled(el)) {
        const label = el.getAttribute("aria-label") ?? el.textContent?.trim().slice(0, 40) ?? "";
        offenders.push(`<${el.tagName.toLowerCase()}> "${label}"`);
      }
    }
    return offenders;
  }, IS_DISABLED.toString());
}

/** Every range input on the page is disabled (there is at least one), or none is. */
async function rangeInputsDisabled(page: Page): Promise<{ total: number; live: number }> {
  return page.evaluate(() => {
    const inputs = [...document.querySelectorAll('input[type="range"]')];
    return { total: inputs.length, live: inputs.filter((i) => !(i as HTMLInputElement).disabled).length };
  });
}

const pressUnlock = (page: Page) =>
  page.getByRole("button", { name: BOARD_LOCK_COPY.unlockLabel }).filter({ visible: true }).click();

/** Waits until the screen has drawn its sliders, then checks the generic rules on the controls column. */
async function expectGreyedScreen(page: Page, scope: Locator) {
  await expect(page.locator('input[type="range"]').first()).toBeAttached();
  const ranges = await rangeInputsDisabled(page);
  expect(ranges.total).toBeGreaterThan(0);
  expect(ranges.live, "range inputs still live on a locked board").toBe(0);
  expect(await liveBoardControls(scope), "board-changing controls still live on a locked board").toEqual([]);
}

test.describe("a locked board's controls are greyed on a computer (quick 261008-lsy, Plan 02)", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the computer's walk; the phones have their own tests");
  });

  test("s-template. every control that changes the board is disabled, the drawing has no grab points, viewing still works, and Unlock brings it all back", async ({
    page,
  }) => {
    await openLockedBoard(page);
    const controls = page.locator("[data-design-controls-scroll]");
    await expectGreyedScreen(page, controls);

    // Viewing still works: Show Construction ticks, and the drawing has no grab points.
    const construction = controls.getByRole("checkbox", { name: /View Construction Lines/ });
    await expect(construction).not.toHaveAttribute("data-disabled", /.*/);
    const before = await construction.getAttribute("aria-checked");
    await construction.click();
    await expect(construction).not.toHaveAttribute("aria-checked", before ?? "");
    await expect(page.locator("[data-drag-target]")).toHaveCount(0);

    await pressUnlock(page);
    await expect(page.getByRole("button", { name: BOARD_LOCK_COPY.unlockLabel })).toHaveCount(0);
    // Most sliders come back; the few that stay off are off for their own reasons (a diamond-only
    // depth on a round tail, a pinned tail block) and were off before the lock.
    await expect.poll(async () => (await rangeInputsDisabled(page)).live).toBeGreaterThanOrEqual(8);
    await expect.poll(() => page.locator("[data-drag-target]").count()).toBeGreaterThan(0);
  });
});

// The later tasks add their screens above; this keeps the helpers referenced until they do.
export type { ScreenLabel };
void goToScreen;
