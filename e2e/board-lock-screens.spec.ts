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

/** A fresh practice rack of this test's own, the sign-in banner and the toolbar tip out of the way. */
async function startPracticeRack(page: Page) {
  await page.addInitScript(
    ([bannerKey, tipKey]) => {
      window.sessionStorage.setItem(bannerKey, "true");
      window.localStorage.setItem(tipKey, "true");
    },
    [BANNER_DISMISSAL_KEY, TOOLBAR_TIP_DISMISSAL_KEY] as const,
  );
  await freshPracticeRack(page);
  await openRack(page);
}

/** Locks board `n` from its ⋯ menu on the rack (a board other than the first is pointed at first). */
async function lockFromRack(page: Page, n: number) {
  const name = board(n).name;
  if (n !== 1) await turnTo(page, n);
  await page.getByRole("button", { name: `Board actions for ${name}` }).click();
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  await menu.getByRole("menuitemcheckbox", { name: BOARD_LOCK_COPY.lockBoard }).click();
  await expect(page.getByRole("menu")).toHaveCount(0);
}

/** Opens board `n` with its caption's Open This Board and waits for the editor. */
async function openFromRack(page: Page, n: number) {
  const name = board(n).name;
  if (n !== 1) await turnTo(page, n);
  await captionFor(page, name).getByRole("button", { name: RACK_COPY.open }).click();
  await page.waitForURL("**/design/outline");
}

const unlockButton = (page: Page) =>
  page.getByRole("button", { name: BOARD_LOCK_COPY.unlockLabel }).filter({ visible: true });

/**
 * A locked practice board, open in the editor: a fresh practice rack, board `n` locked from its ⋯
 * menu, then opened with Open This Board. Board 1 is a preset with a blank; 2, 3 and 4 are the other
 * presets; 5 is a hand-set board with no blank.
 */
async function openLockedBoard(page: Page, n = 1) {
  await startPracticeRack(page);
  await lockFromRack(page, n);
  await openFromRack(page, n);
  // The lock has arrived in the editor once the top bar offers Unlock (a cold dev server may still be compiling).
  await expect(unlockButton(page)).toHaveCount(1, { timeout: 20_000 });
}

/** Whether the element is disabled to a mouse, a finger, the keyboard and a screen reader. */
const IS_DISABLED = (el: Element) =>
  (el as HTMLButtonElement).disabled === true ||
  (el as HTMLInputElement).readOnly === true ||
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

/**
 * The LOOK of a locked screen (follow-up to Plan 02, 2026-10-08): disabled is not enough, a locked
 * control and its label, caption, tick marks and thumb must all read as greyed, the way SliderRow's rows
 * do. For every board-changing control in `scope` (everything not `data-lock-exempt`) this measures the
 * effective opacity, the product of its own and every ancestor's up to `scope`, and requires 0.6 or
 * less for the control AND for every visible text in its row (the nearest ancestor that holds text
 * beyond any control's own; a "row" holding more than six controls, or more than 240 characters, is a
 * whole section, not a label, and is skipped). Returns what still reads as live, described, so a failure names it.
 */
async function greyedLookOffenders(scope: Locator): Promise<string[]> {
  return scope.evaluate((root) => {
    const MAX = 0.6;
    const offenders = new Set<string>();
    const visible = (el: Element) => el.getClientRects().length > 0;
    const effective = (el: Element) => {
      let o = 1;
      for (let n: Element | null = el; n && n !== root.parentElement; n = n.parentElement) {
        o *= Number(getComputedStyle(n).opacity);
      }
      return o;
    };
    const describe = (el: Element) => {
      const text = (el.getAttribute("aria-label") ?? el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
      return `<${el.tagName.toLowerCase()}> "${text}"`;
    };
    const SELECTOR =
      'button, input:not([type="range"]), select, [role="checkbox"], [role="combobox"], [data-slot="select-trigger"], [data-slot="slider-thumb"]';
    const controls = [...root.querySelectorAll(SELECTOR)].filter(
      (el) => !el.closest("[data-lock-exempt]") && el.getAttribute("aria-hidden") !== "true" && visible(el),
    );
    const controlSet = new Set(controls);
    const ownText = (el: Element) =>
      [...el.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? "").trim() !== "");
    for (const c of controls) {
      if (effective(c) > MAX) offenders.add(`${describe(c)} (the control itself, opacity ${effective(c).toFixed(2)})`);
      // The row: climb to the nearest ancestor holding visible text outside this control.
      // A control inside a <label> has that label for its row.
      let row: Element | null = c.closest("label") ?? c.parentElement;
      while (row && row !== root && !row.matches("label")) {
        const hasOtherText = [...row.querySelectorAll("*")].some(
          (t) => ownText(t) && visible(t) && !t.closest(SELECTOR) && !t.closest("[data-lock-exempt]"),
        );
        if (hasOtherText) break;
        row = row.parentElement;
      }
      if (!row || row === root) continue;
      const inRow = controls.filter((o) => row!.contains(o)).length;
      if (inRow > 6 || (row.textContent ?? "").length > 240) continue;
      for (const t of row.querySelectorAll("*")) {
        if ((c.contains(t) && t !== c) || !ownText(t) || !visible(t) || t.closest("[data-lock-exempt]")) continue;
        const r = t.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) continue;
        if (controlSet.has(t) || effective(t) <= MAX) continue;
        offenders.add(`${describe(t)} (text in ${describe(c)}'s row, opacity ${effective(t).toFixed(2)})`);
      }
    }
    return [...offenders];
  });
}

/** Opens every visible Advanced disclosure so its controls are on screen too. */
async function openAdvanced(scope: Locator) {
  const buttons = scope.getByRole("button", { name: /^Advanced/ });
  const n = await buttons.count();
  for (let i = 0; i < n; i++) {
    const b = buttons.nth(i);
    if (await b.isVisible()) await b.click();
  }
}

async function expectGreyedLook(scope: Locator, label: string) {
  const offenders = await greyedLookOffenders(scope);
  expect(offenders, `${label}: controls or labels that still read as live on a locked board:\n${offenders.join("\n")}`).toEqual([]);
}

/** After Unlock: some board-changing control in `scope` is live again (VOLUME and FINS keep most sliders
 * off for their own reasons while the board imports its template, but their tick boxes and pills come back). */
async function expectControlsBack(scope: Locator) {
  await expect.poll(async () => (await liveBoardControls(scope)).length).toBeGreaterThan(0);
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
  await expect
    .poll(async () => (await rangeInputsDisabled(page)).live, { message: "range inputs still live on a locked board" })
    .toBe(0);
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
  test("s-rocker. ROCKER (a board with a blank) is greyed on VIEWER and DATASHEET, the tabs still switch, and Unlock brings it back", async ({
    page,
  }) => {
    await openLockedBoard(page, 1);
    await goToScreen(page, "ROCKER");
    const controls = page.locator("[data-design-controls-scroll]");
    await expectGreyedScreen(page, controls);
    // The board carries a blank, so the blank controls are on screen, and greyed with the rest.
    await expect(controls.getByRole("button", { name: "Remove This Blank" })).toBeDisabled();

    // The tabs are viewing: they switch. On DATASHEET every typed cell is disabled too.
    await page.getByRole("tab", { name: "DATASHEET", exact: true }).click();
    await expect(page.getByRole("tab", { name: "DATASHEET", exact: true })).toHaveAttribute("aria-selected", "true");
    const typed = page.locator('input[type="text"]');
    expect(await typed.count()).toBeGreaterThan(2);
    expect(await typed.evaluateAll((els) => els.filter((e) => !(e as HTMLInputElement).disabled).length)).toBe(0);
    await expectGreyedScreen(page, controls);
    await page.getByRole("tab", { name: "VIEWER", exact: true }).click();
    await expect(page.getByRole("tab", { name: "VIEWER", exact: true })).toHaveAttribute("aria-selected", "true");

    await pressUnlock(page);
    await expect(page.getByRole("button", { name: BOARD_LOCK_COPY.unlockLabel })).toHaveCount(0);
    await expect.poll(async () => (await rangeInputsDisabled(page)).live).toBeGreaterThan(3);
    await page.getByRole("tab", { name: "DATASHEET", exact: true }).click();
    await expect.poll(() => typed.evaluateAll((els) => els.filter((e) => !(e as HTMLInputElement).disabled).length)).toBeGreaterThan(2);
  });

  test("s-rocker-hand-set. ROCKER on a hand-set board (no blank) is greyed too", async ({ page }) => {
    await openLockedBoard(page, 5);
    await goToScreen(page, "ROCKER");
    const controls = page.locator("[data-design-controls-scroll]");
    await expectGreyedScreen(page, controls);
    await expect(controls.getByRole("button", { name: "Remove This Blank" })).toHaveCount(0);
    await pressUnlock(page);
    await expect.poll(async () => (await rangeInputsDisabled(page)).live).toBeGreaterThan(3);
  });

  test("s-rails. RAILS is greyed, a section still opens and closes, the print tick still toggles, and Unlock brings it back", async ({
    page,
  }) => {
    await openLockedBoard(page, 1);
    await goToScreen(page, "RAILS");
    const controls = page.locator("[data-design-controls-scroll]");
    await expectGreyedScreen(page, controls);

    // Opening Advanced reveals more controls, and they are greyed as well.
    const advanced = controls.getByRole("button", { name: "Advanced" }).first();
    await advanced.click();
    await expectGreyedScreen(page, controls);
    const rangesOpen = (await rangeInputsDisabled(page)).total;

    // Closing a whole section is viewing: it works, and it takes its sliders with it.
    await controls.getByRole("button", { name: /Nose/ }).first().click();
    await expect.poll(async () => (await rangeInputsDisabled(page)).total).toBeLessThan(rangesOpen);

    // The print tick is not a board change.
    const printTick = controls.getByRole("checkbox", { name: /Include Rail Band Instructions in Print/ });
    const before = await printTick.getAttribute("aria-checked");
    await printTick.click();
    await expect(printTick).not.toHaveAttribute("aria-checked", before ?? "");

    await pressUnlock(page);
    await expect.poll(async () => (await rangeInputsDisabled(page)).live).toBeGreaterThan(0);
  });

  test("s-fins. FINS is greyed, the toe-in table still opens and closes, Fin Placement Callouts still toggles, and Unlock brings it back", async ({
    page,
  }) => {
    // No preset board draws the McKee toe-in table link, and a locked board cannot be changed to one. So:
    // open the mid-length quad unlocked, pick its McKee rear fins, go back to the rack, lock that very
    // board from its ⋯ (which takes effect in the open editor at once), and come back to FINS.
    await startPracticeRack(page);
    await openFromRack(page, 3);
    await goToScreen(page, "FINS");
    await page.getByRole("button", { name: "McKee SB/Gun" }).click();
    await page.goBack();
    await page.waitForURL("**/design/outline");
    await page.goBack();
    await page.waitForURL((url) => url.pathname === RACK_STAND_IN_ROUTE);
    await expect(page.locator("[data-rack-board]")).toHaveCount(5);
    await lockFromRack(page, 3);
    await page.goForward();
    await page.waitForURL("**/design/outline");
    await page.goForward();
    await page.waitForURL("**/design/fins");
    await expect(unlockButton(page)).toHaveCount(1);

    const controls = page.locator("[data-design-controls-scroll]");
    await expectGreyedScreen(page, controls);
    await controls.getByRole("button", { name: "Advanced" }).first().click();
    await expectGreyedScreen(page, controls);

    // The toe-in table link is viewing, so it stays live.
    const toeLink = controls.getByRole("button", { name: /aim tables/i }).first();
    await expect(toeLink).toBeEnabled();
    await toeLink.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await controls.getByRole("button", { name: /^Settings/ }).click();
    const callouts = controls.getByRole("checkbox", { name: /Fin Placement Callouts/ });
    const before = await callouts.getAttribute("aria-checked");
    await callouts.click();
    await expect(callouts).not.toHaveAttribute("aria-checked", before ?? "");

    await pressUnlock(page);
    await expect.poll(async () => (await rangeInputsDisabled(page)).live).toBeGreaterThan(0);
  });
  test("s-volume. VOLUME is greyed, and Unlock brings it back", async ({ page }) => {
    await openLockedBoard(page, 1);
    await goToScreen(page, "VOLUME");
    const controls = page.locator("[data-design-controls-scroll]");
    await expectGreyedScreen(page, controls);
    await pressUnlock(page);
    await expectControlsBack(controls);
  });

  test("s-summary. SUMMARY: the Board Name can't be typed in, the Fin System is greyed on screen but prints in full ink, printing still works, and Unlock brings it back", async ({
    page,
  }) => {
    await openLockedBoard(page, 1);
    await goToScreen(page, "SUMMARY");
    const form = page.locator("[data-order-form-page]");
    await expect(form).toBeVisible();
    // Nothing on the sheet that changes the board is live: the name is read-only, the Fin System disabled.
    expect(await liveBoardControls(form), "controls still live on a locked order form").toEqual([]);
    const boardName = form.getByRole("textbox", { name: /Board Name/ });
    await expect(boardName).toHaveAttribute("readonly", "");
    await expect(form.locator('input[type="text"]:not([readonly]):not([disabled])')).toHaveCount(0);
    const finSystem = form.locator("select");
    await expect(finSystem).toBeDisabled();
    // Typing into the read-only name changes nothing.
    const nameBefore = await boardName.inputValue();
    await boardName.click({ force: true });
    await page.keyboard.type("zzz");
    expect(await boardName.inputValue()).toBe(nameBefore);
    // Printing and exporting are viewing: they stay live.
    await expect(page.getByRole("button", { name: "Print Order Form" })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Export Template" })).toBeEnabled();

    const look = () =>
      finSystem.evaluate((el) => {
        const cs = getComputedStyle(el);
        const fill = (cs as unknown as Record<string, string>).webkitTextFillColor ?? "";
        return { opacity: cs.opacity, color: cs.color, fill, border: cs.borderTopColor, background: cs.backgroundColor };
      });
    // On screen it is greyed; on paper it is full ink.
    const onScreen = await look();
    expect(Number(onScreen.opacity)).toBeLessThan(1);
    expect(await boardName.evaluate((el) => Number(getComputedStyle(el.closest("label") ?? el).opacity))).toBeLessThanOrEqual(0.6);
    await page.emulateMedia({ media: "print" });
    const lockedPrint = await look();
    expect(lockedPrint.opacity).toBe("1");
    // The locked Board Name prints in full ink too: neither it nor any ancestor is dimmed in print.
    expect(
      await boardName.evaluate((el) => {
        let o = 1;
        for (let n: Element | null = el; n; n = n.parentElement) o *= Number(getComputedStyle(n).opacity);
        return o;
      }),
    ).toBe(1);
    await page.emulateMedia({ media: "screen" });

    // After Unlock the same select prints with exactly the same colours.
    await pressUnlock(page);
    await expect(finSystem).toBeEnabled();
    await page.emulateMedia({ media: "print" });
    const unlockedPrint = await look();
    expect(lockedPrint).toEqual(unlockedPrint);
    await page.emulateMedia({ media: "screen" });
    await expect(boardName).not.toHaveAttribute("readonly", "");
    expect(await boardName.evaluate((el) => Number(getComputedStyle(el.closest("label") ?? el).opacity))).toBe(1);
  });
});

test.describe("a locked board's controls are greyed on a phone (quick 261008-lsy, Plan 02)", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "the phones' ☰ tiles, compact top bar and swipe rack");
  });

  const bar = (page: Page) => page.getByRole("banner");
  const phoneUnlock = (page: Page) => bar(page).getByRole("button", { name: BOARD_LOCK_COPY.unlockLabel });

  /** On a locked board every range input is disabled, the Undo and Redo pair is gone and Unlock is in the bar. */
  async function expectPhoneScreenGreyed(page: Page) {
    await expect(phoneUnlock(page)).toBeVisible();
    await expect(page.getByRole("button", { name: "Undo" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Redo" })).toHaveCount(0);
    await expect
      .poll(async () => (await rangeInputsDisabled(page)).live, { message: "range inputs still live on a locked board" })
      .toBe(0);
  }

  const stepNav = (page: Page) => page.getByRole("navigation", { name: "Back and Next", exact: true });

  test("p-screens. all six screens are greyed in turn, through the ☰ tiles and Back + Next, and Unlock on FINS brings its sliders back", async ({
    page,
  }) => {
    await openLockedBoard(page, 1);
    await expectPhoneScreenGreyed(page);
    const walk: ScreenLabel[] = ["ROCKER", "RAILS", "VOLUME"];
    for (const label of walk) {
      await goToScreen(page, label);
      await expectPhoneScreenGreyed(page);
      const controls = page.locator("[data-design-controls-scroll]");
      expect(await liveBoardControls(controls), `${label}: live controls on a locked board`).toEqual([]);
    }
    // Next, Next, then Back: FINS, SUMMARY, FINS again.
    await stepNav(page).getByRole("link", { name: /^Next screen/ }).click();
    await page.waitForURL("**/design/fins");
    await expectPhoneScreenGreyed(page);
    expect(await liveBoardControls(page.locator("[data-design-controls-scroll]")), "FINS: live controls").toEqual([]);
    await stepNav(page).getByRole("link", { name: /^Next screen/ }).click();
    await page.waitForURL("**/design/summary");
    await expectPhoneScreenGreyed(page);
    expect(await liveBoardControls(page.locator("[data-order-form-page]")), "SUMMARY: live controls").toEqual([]);
    await stepNav(page).getByRole("link", { name: /^Previous screen/ }).click();
    await page.waitForURL("**/design/fins");

    await phoneUnlock(page).click();
    await expect(phoneUnlock(page)).toHaveCount(0);
    await expectControlsBack(page.locator("[data-design-controls-scroll]"));
  });

  test("p-sideways. held sideways, TEMPLATE is greyed and the compact bar shows Unlock", async ({ page }, testInfo) => {
    await openLockedBoard(page, 1);
    await page.setViewportSize(testInfo.project.name === "iphone" ? { width: 844, height: 390 } : { width: 863, height: 360 });
    await expectPhoneScreenGreyed(page);
    await goToScreen(page, "RAILS");
    await expectPhoneScreenGreyed(page);
  });
});

test.describe("a locked board reads as greyed, label and all, on every screen (follow-up to Plan 02)", () => {
  /** Boards worth looking at on this project: the phones' swipe rack opens board 1 only. */
  const boardsFor = (project: string, wanted: number[]) => (project === "desktop" ? wanted : [1]);

  for (const [screen, boards] of [
    ["TEMPLATE", [1]],
    ["ROCKER", [1, 5]],
    ["RAILS", [1]],
    ["VOLUME", [1]],
    ["FINS", [1, 3]],
  ] as const) {
    test(`look-${screen.toLowerCase()}. every board-changing control and its label read as greyed`, async ({ page }, testInfo) => {
      for (const n of boardsFor(testInfo.project.name, [...boards])) {
        if (n !== boards[0]) await page.context().clearCookies();
        await openLockedBoard(page, n);
        if (screen !== "TEMPLATE") await goToScreen(page, screen);
        const controls = page.locator("[data-design-controls-scroll]");
        await expect(page.locator('input[type="range"]').first()).toBeAttached();
        await expectGreyedLook(controls, `${screen}, board ${n}`);
        if (process.env.LOOK_SHOTS) await page.screenshot({ path: `${process.env.LOOK_SHOTS}/${screen}-${n}-${testInfo.project.name}.png` });
        if (screen === "RAILS" || screen === "FINS") {
          await openAdvanced(controls);
          await expectGreyedLook(controls, `${screen} Advanced, board ${n}`);
        }
      }
    });
  }

  test("look-summary. the Board Name and Fin System read as greyed on the sheet", async ({ page }) => {
    await openLockedBoard(page, 1);
    await goToScreen(page, "SUMMARY");
    const form = page.locator("[data-order-form-page]");
    const opacity = (loc: Locator) => loc.evaluate((el) => {
      let o = 1;
      for (let n: Element | null = el; n; n = n.parentElement) o *= Number(getComputedStyle(n).opacity);
      return o;
    });
    expect(await opacity(form.getByRole("textbox", { name: /Board Name/ }))).toBeLessThanOrEqual(0.6);
    expect(await opacity(form.locator("select"))).toBeLessThanOrEqual(0.6);
  });
});
