import { devices, expect, test, type Locator, type Page } from "@playwright/test";
import {
  blankRockerLine,
  cardButton,
  catalogueCards,
  closeBlankPicker,
  customizeRockerButton,
  customRockerDialog,
  openBlankPicker,
  openCustomizeRocker,
  openRocker,
  pickBlankNamed,
  pickedCard,
  pickFirstFittingBlank,
  pickSavedBlank,
  savedCards,
} from "./helpers/blank-picker";

/**
 * ROCKER's Customize Rocker popup (quick 261016-mkb, sketch 016 D — the founder's pick, 2026-10-16):
 * the button under the blank card opens a popup where a shaper sets the blank's rocker the way they
 * order it from the maker, sees what each change does to the foam, and keeps it as a starred blank of
 * their own; the BLANK button and the DATASHEET then name the blank on two lines, its rocker under its
 * name, and the page's own drawing shows the bent foam with nothing coloured (D-08).
 *
 * Every browser test is signed out (Clerk never settles on the suite's fake keys), so the saved blanks
 * are this browser's own list; the account's path is proved by the unit tests. Never types a
 * catalogue name or figure: every one is read off the page.
 */

const SAVED_BLANKS_KEY = "shaper-saved-blanks";
const STARRED_BLANKS_KEY = "shaper-starred-blanks";
const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";
const TOOLBAR_TIP_DISMISSAL_KEY = "shaper-toolbar-tip-dismissed";
const FLOOR_HINT = "Floor — the tip would drop below the center";

async function dismissChrome(page: Page) {
  await page.addInitScript((key) => {
    window.sessionStorage.setItem(key, "true");
  }, BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, "true");
  }, TOOLBAR_TIP_DISMISSAL_KEY);
}

/** A localStorage value parsed, or null. */
async function stored(page: Page, key: string): Promise<unknown> {
  return page.evaluate((k) => {
    const raw = window.localStorage.getItem(k);
    return raw === null ? null : JSON.parse(raw);
  }, key);
}

/** The raw localStorage string, or null. */
async function storedRaw(page: Page, key: string): Promise<string | null> {
  return page.evaluate((k) => window.localStorage.getItem(k), key);
}

/** An inch figure as the app prints it — `4"`, `3/4"`, `4 3/4"`, `-1/4"` — in inches. */
function inches(text: string): number {
  const t = text.trim().replace(/"$/, "");
  const sign = t.startsWith("-") ? -1 : 1;
  const body = t.replace(/^[+-]/, "");
  const total = body.split(/\s+/).reduce((sum, part) => {
    if (part.includes("/")) {
      const [n, d] = part.split("/").map(Number);
      return sum + n / d;
    }
    return sum + Number(part);
  }, 0);
  return sign * total;
}

/** The popup's box once its opening animation has finished. */
async function settledBox(locator: Locator) {
  await locator.evaluate(async (el) => {
    await Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => undefined)));
  });
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return box!;
}

/**
 * One figure's value in the popup's drawing (quick 261017-ojc): `rail` is `card` (thickness, above the
 * foam) or `rocker` (the stack under it), `key` the station, `fig` which figure — `nat`, `custom`,
 * `board` or `blank`.
 */
function figure(dialog: Locator, rail: "card" | "rocker", key: string, fig: string): Locator {
  return dialog.locator(`[data-blank-view-${rail}="${key}"] [data-figure="${fig}"] [data-figure-value]`);
}

type Box = { x: number; y: number; width: number; height: number };

/** Every card, stack and title in the popup's drawing, with its box (quick 261017-ojc). */
async function labelBoxes(dialog: Locator): Promise<{ name: string; box: Box }[]> {
  const out: { name: string; box: Box }[] = [];
  for (const sel of ["[data-blank-view-card]", "[data-blank-view-rocker]", "[data-blank-view-title]"]) {
    for (const el of await dialog.locator(sel).all()) {
      const box = await el.boundingBox();
      if (box) out.push({ name: `${sel} ${(await el.getAttribute(sel.slice(1, -1))) ?? ""}`, box });
    }
  }
  return out;
}

/** Two boxes overlap. */
function meets(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

/** No two of the drawing's labels meet. */
async function expectLabelsApart(dialog: Locator) {
  const boxes = await labelBoxes(dialog);
  expect(boxes.length).toBeGreaterThan(0);
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      expect(meets(boxes[i].box, boxes[j].box), `${boxes[i].name} meets ${boxes[j].name}`).toBe(false);
    }
  }
}

/** The foam's drawn length on screen: its width lying flat, its height standing nose-up. */
async function foamLength(dialog: Locator, orientation: "flat" | "standing"): Promise<number> {
  const box = (await dialog.locator("[data-blank-silhouette]").boundingBox())!;
  return orientation === "flat" ? box.width : box.height;
}

/** A toolbar icon's touch size: its laid-out box (never scaled by the popup's opening animation) plus
 * the invisible touch box round it (P-11). */
async function touchSize(button: Locator): Promise<{ width: number; height: number }> {
  return button.evaluate((el) => {
    const b = el as HTMLElement;
    const after = getComputedStyle(b, "::after");
    const grow = after.content === "none" || after.position !== "absolute" ? 0 : -parseFloat(after.left || "0");
    return { width: b.offsetWidth + 2 * grow, height: b.offsetHeight + 2 * grow };
  });
}

/** Presses a key on a slider thumb until its spoken value reads `want` (at most `max` presses). */
async function pressUntil(page: Page, thumb: Locator, key: string, want: string, max = 64) {
  await thumb.focus();
  for (let i = 0; i < max; i++) {
    if ((await thumb.getAttribute("aria-valuetext")) === want) return;
    await page.keyboard.press(key);
  }
  await expect(thumb).toHaveAttribute("aria-valuetext", want);
}

/** Sets the first nose change to +1/2" through its thumb. */
async function noseHalfInch(page: Page, dialog: Locator) {
  await pressUntil(page, dialog.getByRole("slider", { exact: true, name: "Nose rocker change" }), "ArrowRight", '+1/2"');
}

/**
 * A card's station table laid out on a card exactly 290 dots wide — the narrowest a flat card is drawn
 * (P-20): the card's own width, the table's full width, the room it has before the card's inner right
 * edge (a maker's table already uses the card's right-hand padding at this width, so the edge, not the
 * padding, is the limit), and how many lines the tallest rocker row label takes. The card's width is
 * put back after.
 */
async function tableAt290(card: Locator) {
  return card.evaluate((li) => {
    const el = li as HTMLElement;
    el.style.width = "290px";
    const table = el.querySelector("[data-station-table]") as HTMLElement;
    const labels = [...table.querySelectorAll("tbody th")].slice(2) as HTMLElement[];
    const labelLines = Math.max(
      ...labels.map((th) => Math.round(th.getBoundingClientRect().height / parseFloat(getComputedStyle(th).lineHeight))),
    );
    const out = {
      card: Math.round(el.getBoundingClientRect().width),
      table: table.scrollWidth,
      room: el.clientWidth - parseFloat(getComputedStyle(el).paddingLeft),
      labelLines,
    };
    el.style.width = "";
    return out;
  });
}

/**
 * P-20 on a 290-dot card: the saved card's table runs no further than the card's inner edge, or than
 * its maker's own card's table does at the same width (in Metric a maker's table already runs past
 * the edge at 290, measured 292 of 278) — so the two rocker rows never make a card wider.
 */
async function expectTableFits290(saved: Locator, picker: Locator, system: string) {
  const name = await saved.getAttribute("data-name");
  const twin = catalogueCards(picker).and(picker.locator(`li[data-name=${JSON.stringify(name)}]`));
  const fit = await tableAt290(saved);
  const maker = await tableAt290(twin);
  console.log(
    `[mkb P-20] ${system} at a 290-dot card: saved ${fit.table} of ${fit.room} (rocker labels ${fit.labelLines} lines), its maker's own card ${maker.table}`,
  );
  expect(fit.card).toBe(290);
  expect(fit.table).toBeLessThanOrEqual(Math.max(fit.room, maker.table));
}

/** The colour a CSS custom property resolves to, as the browser computes it. */
async function cssColour(page: Page, variable: string): Promise<string> {
  return page.evaluate((v) => {
    const probe = document.createElement("span");
    probe.style.color = `var(${v})`;
    document.body.appendChild(probe);
    const colour = getComputedStyle(probe).color;
    probe.remove();
    return colour;
  }, variable);
}

test.describe("Customize Rocker on a computer", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the computer's own window");
    await dismissChrome(page);
  });

  test("one nose slider bends the blank; Use and save as a new blank keeps it, stars it and names it under the blank", async ({ page }) => {
    await openRocker(page);
    const name = await pickFirstFittingBlank(page);
    await expect(blankRockerLine(page)).toHaveText("Natural");
    await expect(customizeRockerButton(page)).toContainText("Customize Rocker");

    const dialog = await openCustomizeRocker(page);
    await expect(dialog.getByRole("heading", { name: "Customize Rocker" })).toBeVisible();
    // The maker, read off the header: everything before ` {name} · Natural`.
    const note = (await dialog.locator("[data-customize-rocker-note]").innerText()).trim();
    const suffix = ` ${name} · Natural`;
    expect(note.endsWith(suffix)).toBe(true);
    const vendor = note.slice(0, note.length - suffix.length);
    expect(vendor.length).toBeGreaterThan(0);

    const thumb = dialog.getByRole("slider", { exact: true, name: "Nose rocker change" });
    await thumb.focus();
    for (let i = 0; i < 8; i++) await page.keyboard.press("ArrowRight");
    await dialog.getByRole("button", { name: "Use and save as a new blank" }).click();

    await expect(customRockerDialog(page)).toBeHidden();
    await expect(blankRockerLine(page)).toHaveText('+1/2"N');
    await expect(customizeRockerButton(page)).toContainText("Edit Custom Rocker");
    const saved = (await stored(page, SAVED_BLANKS_KEY)) as unknown[];
    expect(saved).toHaveLength(1);
    expect(await stored(page, STARRED_BLANKS_KEY)).toEqual([[vendor, `${name} +1/2"N`]]);
  });

  test("a tail Bend starts slider runs center to tail, left to right, the way the drawing lies (fast task 170)", async ({ page }) => {
    await openRocker(page);
    await pickFirstFittingBlank(page);
    const dialog = await openCustomizeRocker(page);

    // A +1/8" tail change from the center, so the bend has a mark to watch.
    await pressUntil(page, dialog.getByRole("slider", { exact: true, name: "Tail rocker change" }), "ArrowRight", '+1/8"');
    const tailBend = dialog.getByRole("slider", { exact: true, name: "Tail bend starts" });
    const tailRow = dialog.locator("[data-custom-rocker-change='tail-1']");
    // At the center the thumb sits at the LEFT end, under the "At the center" hint; "Near the tail" is on the right.
    await expect(tailBend).toHaveAttribute("aria-valuetext", "At the center");
    expect(await tailBend.getAttribute("aria-valuenow")).toBe(await tailBend.getAttribute("min"));
    await expect(tailRow).toContainText("At the center");
    await expect(tailRow).toContainText("Near the tail");
    const noseRow = dialog.locator("[data-custom-rocker-change='nose-1']");
    await expect(noseRow).toContainText("Near the nose");

    // Pushing the thumb right moves the bend toward the tail: fewer inches in, and the mark further right.
    await tailBend.focus();
    await page.keyboard.press("ArrowRight");
    const mark = dialog.locator('[data-rocker-overlay="bend-mark"]').first();
    await expect(mark).toHaveCount(1);
    const first = inches((await tailRow.locator("[data-slider-value-box]").nth(1).innerText()).replace(/ in$/, ""));
    const firstX = (await settledBox(mark)).x;
    await page.keyboard.press("ArrowRight");
    await expect(async () => {
      const now = inches((await tailRow.locator("[data-slider-value-box]").nth(1).innerText()).replace(/ in$/, ""));
      expect(now).toBe(first - 1);
      expect((await mark.boundingBox())!.x).toBeGreaterThan(firstX);
    }).toPass({ timeout: 5_000 });
  });

  test("the popup's size and layout, a second change that stacks, the floor, the colours, Show my board and the zoom", async ({ page }) => {
    await openRocker(page);
    await pickFirstFittingBlank(page);
    const dialog = await openCustomizeRocker(page);

    // 32 px in from the window's edges, never wider than 1180 (D-04, like PICK A BLANK).
    const box = await settledBox(page.locator("[data-customize-rocker-dialog]"));
    const viewport = page.viewportSize()!;
    expect(Math.abs(box.y - 32)).toBeLessThanOrEqual(1);
    expect(Math.abs(viewport.height - (box.y + box.height) - 32)).toBeLessThanOrEqual(1);
    expect(box.width).toBeLessThanOrEqual(1181);
    // The rows on the left, the drawing card beside them.
    const rows = (await dialog.locator("[data-customize-rocker-rows]").boundingBox())!;
    const card = (await dialog.locator("[data-custom-rocker-drawing]").boundingBox())!;
    expect(rows.x + rows.width).toBeLessThanOrEqual(card.x + 1);

    // Show my board starts Off — an icon in the drawing's upper right (quick 261017-ojc, D-08) — and the
    // card holds ONE drawing, the blank's, under its own heading (fast task 171; D-04).
    const showBoard = dialog.locator("[data-show-board]");
    await expect(showBoard).toHaveAttribute("aria-pressed", "false");
    await expect(dialog.locator("[data-custom-rocker-heading]")).toHaveText("Blank Dimensions");
    await expect(dialog.locator('[data-custom-rocker-drawing] svg[role="img"]')).toHaveCount(1);
    await expect(dialog.locator("[data-blank-view] [data-blank-view-rocker]")).toHaveCount(5);
    // Board off (D-02, D-03, P-4, P-5): five cards, each its station's name over one untagged figure;
    // five stacks, each the printed rocker (NAT) alone on a natural draft.
    const cards = dialog.locator("[data-blank-view-card]");
    await expect(cards).toHaveCount(5);
    for (const card of await cards.all()) {
      await expect(card.locator('[data-figure="blank"] [data-figure-value]')).toHaveCount(1);
      await expect(card.locator("[data-figure-tag]")).toHaveCount(0);
      await expect(card.locator("text")).toHaveCount(2);
      expect((await card.locator("text").first().textContent())!.length).toBeGreaterThan(0);
    }
    for (const stack of await dialog.locator("[data-blank-view-rocker]").all()) {
      await expect(stack.locator('[data-figure="nat"]')).toHaveCount(1);
      await expect(stack.locator('[data-figure="custom"]')).toHaveCount(0);
    }
    await expect(dialog.locator('[data-blank-view-title="thickness"]')).toHaveText("Thickness");
    await expect(dialog.locator('[data-blank-view-title="rocker"]')).toHaveText("Rocker");
    // A computer gets no Dimensions icon: the drawing has its room (D-07).
    await expect(dialog.locator("[data-show-dimensions]")).toBeHidden();

    // +1/2"N, then a second nose change at +1/2" from 18" in: the nose tip rises exactly 1" (D-05).
    await noseHalfInch(page, dialog);
    // Once any change is set, every stack reads NAT and CUSTOM, even where they agree (P-4).
    for (const stack of await dialog.locator("[data-blank-view-rocker]").all()) {
      await expect(stack.locator('[data-figure="nat"]')).toHaveCount(1);
      await expect(stack.locator('[data-figure="custom"]')).toHaveCount(1);
    }
    await dialog.getByRole("button", { name: "+ Add a second nose change" }).click();
    const secondAmount = dialog.getByRole("slider", { exact: true, name: "Second nose rocker change" });
    await pressUntil(page, secondAmount, "ArrowRight", '+1/2"');
    const firstBend = dialog.getByRole("slider", { exact: true, name: "Nose bend starts" });
    const secondBend = dialog.getByRole("slider", { exact: true, name: "Second nose bend starts" });
    await pressUntil(page, secondBend, "ArrowLeft", '18" in');
    await expect(async () => {
      const nat = await figure(dialog, "rocker", "noseTip", "nat").textContent();
      const custom = await figure(dialog, "rocker", "noseTip", "custom").textContent();
      expect(inches(custom!) - inches(nat!)).toBeCloseTo(1, 9);
    }).toPass({ timeout: 5_000 });
    await expect(dialog.locator("[data-customize-rocker-note]")).toContainText('+1/2"N +1/2"N18"');

    // The second change's Bend starts is capped one inch nearer the tip than the first's.
    const firstValue = Number(await firstBend.getAttribute("aria-valuenow"));
    expect(Number(await secondBend.getAttribute("max"))).toBe(firstValue - 1);
    // Moving the first below the second pushes the second ahead of it. (At the far end the second has
    // one place left, 3" in, so its track has no travel — its value box says where it sits.)
    await firstBend.focus();
    await page.keyboard.press("Home");
    const firstNow = Number(await firstBend.getAttribute("aria-valuenow"));
    const secondBox = dialog.locator("[data-custom-rocker-change='nose-2'] [data-slider-value-box]").nth(1);
    await expect(async () => {
      const secondNow = inches((await secondBox.innerText()).replace(/ in$/, ""));
      expect(secondNow).toBeLessThan(firstNow);
    }).toPass({ timeout: 5_000 });

    // The header's note: the first change in the first colour, the second in the second (D-07).
    const red = await cssColour(page, "--rocker-adjust-1");
    const blue = await cssColour(page, "--rocker-adjust-2");
    expect(red).not.toBe(blue);
    await expect(dialog.locator('[data-rocker-note-part="1"]').first()).toHaveCSS("color", red);
    await expect(dialog.locator('[data-rocker-note-part="2"]').first()).toHaveCSS("color", blue);

    // The tail's Rocker slider stops at its floor, and its hint says so (D-06).
    const tailAmount = dialog.getByRole("slider", { exact: true, name: "Tail rocker change" });
    await tailAmount.focus();
    await page.keyboard.press("Home");
    expect(await tailAmount.getAttribute("aria-valuenow")).toBe(await tailAmount.getAttribute("min"));
    await expect(dialog.locator("[data-rocker-floor-hint]")).toHaveText(FLOOR_HINT);

    // Show my board On: the board inside the SAME drawing of the bent blank (D-01), never a second one.
    await showBoard.click();
    await expect(showBoard).toHaveAttribute("aria-pressed", "true");
    await expect(dialog.locator("[data-custom-rocker-heading]")).toHaveText("Blank Dimensions & Your Board");
    await expect(dialog.locator('[data-custom-rocker-drawing] svg[role="img"]')).toHaveCount(1);
    await expect(dialog.locator('[data-custom-rocker-drawing] svg[role="img"] [data-board-silhouette="profile"]')).toBeVisible();
    // Each card carries BLANK and BOARD, each stack a BOARD figure (P-2, P-3, P-5).
    for (const card of await dialog.locator("[data-blank-view-card]").all()) {
      await expect(card.locator('[data-figure="blank"] [data-figure-tag]')).toHaveText("BLANK");
      await expect(card.locator('[data-figure="board"] [data-figure-tag]')).toHaveText("BOARD");
    }
    for (const stack of await dialog.locator("[data-blank-view-rocker]").all()) {
      await expect(stack.locator('[data-figure="board"] [data-figure-tag]')).toHaveText("BOARD");
    }

    // Nothing meets (D-01, P-8): no two labels, nothing outside the drawing, nothing under the heading,
    // the icons or the zoom control, and every card's texts inside its frame.
    await expectLabelsApart(dialog);
    const svgBox = (await dialog.locator("[data-blank-view]").boundingBox())!;
    console.log(`[ojc boxes] computer svg ${svgBox.width.toFixed(1)}×${svgBox.height.toFixed(1)}`);
    const chrome = [
      (await dialog.locator("[data-custom-rocker-drawing] [data-viewer-toolbar]").boundingBox())!,
      (await dialog.locator("[data-custom-rocker-drawing] [data-viewer-zoom]").boundingBox())!,
      (await dialog.locator("[data-custom-rocker-heading]").boundingBox())!,
    ];
    for (const { name, box: b } of await labelBoxes(dialog)) {
      expect(b.x >= svgBox.x - 0.5 && b.y >= svgBox.y - 0.5, name).toBe(true);
      expect(b.x + b.width <= svgBox.x + svgBox.width + 0.5 && b.y + b.height <= svgBox.y + svgBox.height + 0.5, name).toBe(true);
      for (const c of chrome) expect(meets(b, c), `${name} under the drawing's band`).toBe(false);
    }
    for (const card of await dialog.locator("[data-blank-view-card]").all()) {
      const frame = (await card.locator("rect").boundingBox())!;
      for (const text of await card.locator("text").all()) {
        const t = (await text.boundingBox())!;
        expect(t.x >= frame.x - 0.5 && t.x + t.width <= frame.x + frame.width + 0.5, `${await text.textContent()} across`).toBe(true);
        expect(t.y >= frame.y - 0.5 && t.y + t.height <= frame.y + frame.height + 0.5, `${await text.textContent()} down`).toBe(true);
      }
    }

    // The page's zoom works on the popup's drawing; 1x puts it back.
    const drawing = dialog.locator('[data-custom-rocker-drawing] svg[role="img"]');
    const base = await drawing.getAttribute("viewBox");
    await dialog.getByRole("button", { name: "Zoom in" }).click();
    await expect(drawing).not.toHaveAttribute("viewBox", base!);
    await dialog.getByRole("button", { name: "Back to 1x — the whole drawing" }).click();
    await expect(drawing).toHaveAttribute("viewBox", base!);
  });

  test("Cancel, Esc, the ✕ and a click outside change nothing", async ({ page }) => {
    await openRocker(page);
    await pickFirstFittingBlank(page);
    const before = {
      line: await blankRockerLine(page).innerText(),
      saved: await storedRaw(page, SAVED_BLANKS_KEY),
      starred: await storedRaw(page, STARRED_BLANKS_KEY),
    };
    const closers: [string, (dialog: Locator) => Promise<void>][] = [
      ["Cancel", (dialog) => dialog.getByRole("button", { name: "Cancel" }).click()],
      ["Esc", () => page.keyboard.press("Escape")],
      ["✕", (dialog) => dialog.getByRole("button", { name: "Close" }).click()],
      ["a click outside", () => page.mouse.click(8, 8)],
    ];
    for (const [how, close] of closers) {
      const dialog = await openCustomizeRocker(page);
      await noseHalfInch(page, dialog);
      await close(dialog);
      await expect(customRockerDialog(page), how).toBeHidden();
      await expect(blankRockerLine(page), how).toHaveText(before.line);
      expect(await storedRaw(page, SAVED_BLANKS_KEY), how).toBe(before.saved);
      expect(await storedRaw(page, STARRED_BLANKS_KEY), how).toBe(before.starred);
      // Reopened, the draft starts again from the board.
      const again = await openCustomizeRocker(page);
      await expect(again.getByRole("slider", { exact: true, name: "Nose rocker change" }), how).toHaveAttribute("aria-valuetext", '0"');
      await page.keyboard.press("Escape");
      await expect(customRockerDialog(page)).toBeHidden();
    }
  });

  test("saved: the DATASHEET's two-line name and its Natural Rocker over Custom Rocker; edit current; back to natural; one undo", async ({ page }) => {
    await openRocker(page);
    const name = await pickFirstFittingBlank(page);
    let dialog = await openCustomizeRocker(page);
    await noseHalfInch(page, dialog);
    await dialog.getByRole("button", { name: "Use and save as a new blank" }).click();
    await expect(blankRockerLine(page)).toHaveText('+1/2"N');

    // The DATASHEET (D-02, D-03).
    await page.getByRole("tab", { name: "DATASHEET" }).click();
    const sheet = page.locator("main");
    await expect(sheet.locator("[data-datasheet-blank-name]")).toContainText(/^BLANK — /);
    await expect(sheet.locator("[data-datasheet-blank-rocker]")).toHaveText('+1/2"N');
    await expect(sheet.locator('[data-datasheet-blank-row="rocker"]')).toContainText("Natural Rocker");
    const customRow = sheet.locator('[data-datasheet-blank-row="customRocker"]');
    await expect(customRow).toContainText("Custom Rocker");
    await expect(customRow.locator(":scope > div")).toHaveCount(6);
    await expect(sheet.locator("[data-datasheet-custom-rocker-note]")).toHaveText(
      'Natural Rocker is the catalog page\'s. Custom Rocker is the blank as ordered (+1/2"N) — check it on the foam.',
    );
    await page.getByRole("tab", { name: "VIEWER" }).click();

    // Edit Custom Rocker: Use and edit current blank keeps ONE saved blank and moves its star.
    dialog = await openCustomizeRocker(page);
    await expect(dialog.getByRole("heading", { name: "Edit Custom Rocker" })).toBeVisible();
    await pressUntil(page, dialog.getByRole("slider", { exact: true, name: "Nose rocker change" }), "ArrowRight", '+3/4"');
    await dialog.getByRole("button", { name: "Use and edit current blank" }).click();
    await expect(customRockerDialog(page)).toBeHidden();
    await expect(blankRockerLine(page)).toHaveText('+3/4"N');
    const saved = (await stored(page, SAVED_BLANKS_KEY)) as unknown[];
    expect(saved).toHaveLength(1);
    const starred = (await stored(page, STARRED_BLANKS_KEY)) as [string, string][];
    expect(starred.map(([, n]) => n)).toEqual([`${name} +3/4"N`]);

    // ↺ Natural rocker: the footer offers Use the natural rocker, and the blank reads Natural again.
    dialog = await openCustomizeRocker(page);
    await dialog.getByRole("button", { name: "↺ Natural rocker" }).click();
    await expect(dialog.getByRole("button", { name: "Use and save as a new blank" })).toHaveCount(0);
    await dialog.getByRole("button", { name: "Use the natural rocker" }).click();
    await expect(blankRockerLine(page)).toHaveText("Natural");
    // The saved blank stays.
    expect(((await stored(page, SAVED_BLANKS_KEY)) as unknown[]).length).toBe(1);

    // One undo brings the custom rocker back.
    await page.locator("[data-phone-undo-bar]").getByRole("button", { name: "Undo" }).click();
    await expect(blankRockerLine(page)).toHaveText('+3/4"N');
  });

  test("a saved blank is a card in Pick a Blank beside the maker's natural one, and picking it puts its rocker back (D-09, D-10)", async ({ page }) => {
    await openRocker(page);
    const name = await pickFirstFittingBlank(page);
    const dialog = await openCustomizeRocker(page);
    await noseHalfInch(page, dialog);
    await dialog.getByRole("button", { name: "Use and save as a new blank" }).click();
    await expect(customRockerDialog(page)).toBeHidden();
    await expect(blankRockerLine(page)).toHaveText('+1/2"N');

    // Take the blank off the board, then find the saved one in the popup.
    await page.getByRole("button", { name: "Remove This Blank" }).click();
    await expect(pickedCard(page)).toHaveCount(0);
    let picker = await openBlankPicker(page);
    const saved = savedCards(picker);
    await expect(saved).toHaveCount(1);
    await expect(saved).toHaveAttribute("data-group", "starred");
    await expect(saved.locator("[data-blank-name]")).toHaveText(name);
    await expect(saved.locator("[data-blank-card-rocker]")).toHaveText('+1/2"N');
    await expect(saved.locator("[data-saved-blank]")).toHaveText("Saved by you");
    const vendor = (await saved.getAttribute("data-vendor"))!;
    // The maker's natural blank is still listed, and not starred.
    const natural = catalogueCards(picker).and(
      picker.locator(`li[data-vendor=${JSON.stringify(vendor)}][data-name=${JSON.stringify(name)}]`),
    );
    await expect(natural).toHaveCount(1);
    await expect(natural).not.toHaveAttribute("data-group", "starred");
    await closeBlankPicker(page);

    // Picking the saved card puts its copy AND its rocker on the board.
    await pickSavedBlank(page, vendor, `${name} +1/2"N`);
    await expect(pickedCard(page).locator("[data-blank-name]")).toHaveText(name);
    await expect(blankRockerLine(page)).toHaveText('+1/2"N');
    await expect(customizeRockerButton(page)).toContainText("Edit Custom Rocker");

    // Only the saved card is marked as the board's.
    picker = await openBlankPicker(page);
    await expect(picker.locator("[data-on-board]")).toHaveCount(1);
    await expect(savedCards(picker).locator("[data-on-board]")).toHaveCount(1);
    await closeBlankPicker(page);

    // Picking the maker's natural card is a plain pick: the custom rocker clears (D-10).
    await pickBlankNamed(page, vendor, name);
    await expect(blankRockerLine(page)).toHaveText("Natural");
    await expect(customizeRockerButton(page)).toContainText("Customize Rocker");
    picker = await openBlankPicker(page);
    await expect(catalogueCards(picker).locator("[data-on-board]")).toHaveCount(1);
    await expect(savedCards(picker).locator("[data-on-board]")).toHaveCount(0);
  });

  test("every card names its rocker; a saved card reads NAT Rocker over Custom Rocker, fits a 290-dot card, and Remove asks once (D-02, D-03, P-20, P-21)", async ({ page }) => {
    await openRocker(page);
    const name = await pickFirstFittingBlank(page);
    const dialog = await openCustomizeRocker(page);
    await noseHalfInch(page, dialog);
    await dialog.getByRole("button", { name: "Use and save as a new blank" }).click();
    await expect(customRockerDialog(page)).toBeHidden();

    const picker = await openBlankPicker(page);
    // Every maker's card reads Natural under its name, and its pick button says so.
    const natural = catalogueCards(picker);
    const count = await natural.count();
    expect(count).toBeGreaterThan(10);
    expect(await natural.locator("[data-blank-card-rocker]").allInnerTexts()).toEqual(Array(count).fill("Natural"));
    const label = (await cardButton(natural.first()).getAttribute("aria-label"))!;
    expect(label).toMatch(/^Use .+ Natural(, doesn't fit: .*)?$/);

    // The saved card's table: Width, Thick, then NAT Rocker (the short form, P-20) over Custom Rocker.
    const saved = savedCards(picker);
    const rows = saved.locator("[data-station-table] tbody th");
    await expect(rows).toHaveText(["Width", "Thick", "NAT Rocker", "Custom Rocker"]);
    // Measured on a 290-dot card (P-20): the table stays inside the card, never wider than its maker's.
    await expectTableFits290(saved, picker, "imperial");

    // Remove asks once; Keep leaves it; Remove takes it and its star out of the list.
    await saved.locator("[data-remove-saved]").click();
    await expect(saved).toContainText("Remove this saved blank?");
    await saved.locator("[data-remove-saved-keep]").click();
    await expect(saved.locator("[data-remove-saved]")).toBeVisible();
    expect((await stored(page, SAVED_BLANKS_KEY)) as unknown[]).toHaveLength(1);
    await saved.locator("[data-remove-saved]").click();
    await saved.locator("[data-remove-saved-confirm]").click();
    await expect(savedCards(picker)).toHaveCount(0);
    expect(await stored(page, SAVED_BLANKS_KEY)).toEqual([]);
    expect(await stored(page, STARRED_BLANKS_KEY)).toEqual([]);
    await closeBlankPicker(page);
    // The board keeps its own copy and its rocker.
    await expect(pickedCard(page).locator("[data-blank-name]")).toHaveText(name);
    await expect(blankRockerLine(page)).toHaveText('+1/2"N');
  });

  test("on the page itself a custom blank draws as any blank — the overlay lives in the popup only (D-07, D-08)", async ({ page }) => {
    await openRocker(page);
    await pickFirstFittingBlank(page);
    let dialog = await openCustomizeRocker(page);
    await noseHalfInch(page, dialog);
    await dialog.getByRole("button", { name: "+ Add a second nose change" }).click();
    await dialog.getByRole("button", { name: "Use and save as a new blank" }).click();
    await expect(customRockerDialog(page)).toBeHidden();
    await expect(blankRockerLine(page)).toHaveText(/^\+1\/2"N \+1\/8"N\d+"$/);
    await expect(page.locator("[data-blank-silhouette]")).toBeVisible();
    await expect(page.locator("[data-rocker-overlay]")).toHaveCount(0);

    dialog = await openCustomizeRocker(page);
    await expect(dialog.locator('[data-rocker-overlay="natural"]')).toHaveCount(1);
    await expect(dialog.locator('[data-rocker-overlay="span-1"]')).toHaveCount(1);
    await expect(dialog.locator('[data-rocker-overlay="span-2"]')).toHaveCount(1);
    await expect(dialog.locator('[data-rocker-overlay="bend-mark"]')).toHaveCount(2);
  });
});

test.describe("Customize Rocker in Metric", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the computer's own window");
    await dismissChrome(page);
    await page.addInitScript(() => window.localStorage.setItem("shaper-units", "metric"));
  });

  test("the value boxes read millimetres and centimetres; the note stays in inches (D-01)", async ({ page }) => {
    await openRocker(page);
    await pickFirstFittingBlank(page);
    const dialog = await openCustomizeRocker(page);
    const rocker = dialog.getByRole("slider", { exact: true, name: "Nose rocker change" });
    await rocker.focus();
    for (let i = 0; i < 13; i++) await page.keyboard.press("ArrowRight");
    await expect(rocker).toHaveAttribute("aria-valuetext", "+13 mm");
    await expect(dialog.locator("[data-custom-rocker-change='nose-1'] [data-slider-value-box]").first()).toHaveText("+13 mm");
    await dialog.getByRole("button", { name: "+ Add a second nose change" }).click();
    await expect(dialog.getByRole("slider", { exact: true, name: "Second nose bend starts" })).toHaveAttribute("aria-valuetext", /^\d+\.\d cm in$/);
    await expect(dialog.locator("[data-customize-rocker-note]")).toContainText('"N');
    await expect(dialog.locator("[data-customize-rocker-note]")).toContainText('+1/2"N');
    // The drawing's figures are marks: whole millimetres, or a dash (CLAUDE.md Rule 2).
    await dialog.locator("[data-show-board]").click();
    const values = await dialog.locator("[data-blank-view] [data-figure-value]").allTextContents();
    expect(values.length).toBeGreaterThan(10);
    for (const v of values) expect(v).toMatch(/^-?\d+ mm$|^—$/);
  });

  test("a saved card's table reads its rows in millimetres and fits a 290-dot card; its note stays in inches (D-01, D-03, P-20)", async ({ page }) => {
    await openRocker(page);
    await pickFirstFittingBlank(page);
    const dialog = await openCustomizeRocker(page);
    const rocker = dialog.getByRole("slider", { exact: true, name: "Nose rocker change" });
    await rocker.focus();
    for (let i = 0; i < 13; i++) await page.keyboard.press("ArrowRight");
    await dialog.getByRole("button", { name: "Use and save as a new blank" }).click();
    await expect(customRockerDialog(page)).toBeHidden();
    const picker = await openBlankPicker(page);
    const saved = savedCards(picker);
    await expect(saved.locator("[data-blank-card-rocker]")).toHaveText('+1/2"N');
    await expect(saved.locator("[data-station-table] tbody th")).toHaveText([
      "Width (cm)",
      "Thick (mm)",
      "NAT Rocker (mm)",
      "Custom Rocker (mm)",
    ]);
    await expectTableFits290(saved, picker, "metric");
  });
});

test.describe("Customize Rocker in a narrow browser window", () => {
  test.use({ viewport: { width: 760, height: 800 } });
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the computer's own window, made narrow");
    await dismissChrome(page);
  });

  test("the Dimensions icon shows by width, not by the pointer, and clears the figures (D-07)", async ({ page }) => {
    await openRocker(page);
    await pickFirstFittingBlank(page);
    const dialog = await openCustomizeRocker(page);
    const dimensions = dialog.locator("[data-show-dimensions]");
    await expect(dimensions).toBeVisible();
    await expect(dimensions).toHaveAttribute("aria-pressed", "true");
    await expect(dialog.locator("[data-blank-view-card]")).toHaveCount(5);
    await dimensions.click();
    await expect(dimensions).toHaveAttribute("aria-pressed", "false");
    await expect(dialog.locator("[data-blank-view-card]")).toHaveCount(0);
  });
});

/** The popup fills the whole viewport (±1). */
async function expectFullScreen(page: Page) {
  const box = await settledBox(page.locator("[data-customize-rocker-dialog]"));
  const viewport = page.viewportSize()!;
  expect(Math.abs(box.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(box.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(box.width - viewport.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(box.height - viewport.height)).toBeLessThanOrEqual(1);
}

test.describe("Customize Rocker on an upright phone", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "the phone projects, at their own viewports");
    await dismissChrome(page);
  });

  test("the popup fills the screen, the drawing pinned on top, the rows scrolling beneath it, every footer button a 44-dot box", async ({ page }) => {
    await openRocker(page);
    await pickFirstFittingBlank(page);
    const dialog = await openCustomizeRocker(page);
    await expectFullScreen(page);
    const viewport = page.viewportSize()!;
    const column = dialog.locator("[data-customize-rocker-drawing-column]");
    const rows = dialog.locator("[data-customize-rocker-rows]");
    const drawing = (await column.boundingBox())!;
    const rowsBox = (await rows.boundingBox())!;
    expect(drawing.y + drawing.height).toBeLessThanOrEqual(rowsBox.y + 1);
    expect(drawing.height).toBeLessThanOrEqual(viewport.height * 0.45 + 1);

    // Two changes at the tail, so the rows run long, then scroll them: the drawing stays put.
    await dialog.getByRole("slider", { exact: true, name: "Tail rocker change" }).focus();
    for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowRight");
    await dialog.getByRole("button", { name: "+ Add a second tail change" }).click();
    const { scrollHeight, clientHeight } = await rows.evaluate((el) => ({ scrollHeight: el.scrollHeight, clientHeight: el.clientHeight }));
    expect(scrollHeight).toBeGreaterThan(clientHeight);
    await rows.evaluate((el) => el.scrollTo({ top: el.scrollHeight }));
    const after = (await column.boundingBox())!;
    expect(Math.abs(after.y - drawing.y)).toBeLessThanOrEqual(1);

    for (const button of await dialog.locator("[data-customize-rocker-footer] button").all()) {
      const b = (await button.boundingBox())!;
      expect(b.height).toBeGreaterThanOrEqual(44);
    }
  });

  test("the drawing stands nose-up with its figures apart, and Dimensions off lets the foam fill it (D-07, P-6, P-10)", async ({ page }) => {
    await openRocker(page);
    await pickFirstFittingBlank(page);
    const dialog = await openCustomizeRocker(page);
    const dimensions = dialog.locator("[data-show-dimensions]");
    await expect(dimensions).toBeVisible();
    await expect(dimensions).toHaveAttribute("aria-pressed", "true");
    // Both icons are 44-dot touch boxes (P-11).
    for (const icon of [dialog.locator("[data-show-board]"), dimensions]) {
      const t = await touchSize(icon);
      expect(t.width).toBeGreaterThanOrEqual(44);
      expect(t.height).toBeGreaterThanOrEqual(44);
    }
    await noseHalfInch(page, dialog);
    await dialog.locator("[data-show-board]").click();
    await expect(dialog.locator('[data-blank-view-rocker] [data-figure="board"]')).toHaveCount(5);
    await expectLabelsApart(dialog);
    // Standing, the cards carry no station names (P-6): their figures only.
    for (const card of await dialog.locator("[data-blank-view-card]").all()) await expect(card.locator("text")).toHaveCount(2);
    const svgBox = (await dialog.locator("[data-blank-view]").boundingBox())!;
    const before = await foamLength(dialog, "standing");

    await dimensions.click();
    await expect(dimensions).toHaveAttribute("aria-pressed", "false");
    await expect(dialog.locator("[data-blank-view-card]")).toHaveCount(0);
    await expect(dialog.locator("[data-blank-view-rocker]")).toHaveCount(0);
    await expect(dialog.locator("[data-blank-view-title]")).toHaveCount(0);
    await expect(dialog.locator('[data-rocker-overlay="natural"]')).toHaveCount(1);
    await expect(dialog.locator('[data-board-silhouette="profile"]')).toBeVisible();
    const after = await foamLength(dialog, "standing");
    console.log(`[ojc P-10] upright phone ${page.viewportSize()!.width}×${page.viewportSize()!.height}: svg ${svgBox.width.toFixed(1)}×${svgBox.height.toFixed(1)}, foam ${before.toFixed(1)} → ${after.toFixed(1)} px long`);
    expect(after).toBeGreaterThanOrEqual(1.2 * before);
  });
});

// The real sideways iPhone (844 × 390, measured on hardware) and Pixel 7, built the way
// `blank-picker.spec.ts` builds them.
const {
  defaultBrowserType: iphoneLandscapeBrowserType,
  viewport: iphoneLandscapeEmulatorViewport,
  ...iphoneLandscapeRest
} = devices["iPhone 14 landscape"];
void iphoneLandscapeBrowserType;
void iphoneLandscapeEmulatorViewport;
const realSidewaysIphone = { ...iphoneLandscapeRest, viewport: { width: 844, height: 390 } };
const { defaultBrowserType: pixel7LandscapeBrowserType, ...pixel7Landscape } = devices["Pixel 7 landscape"];
void pixel7LandscapeBrowserType;

/** Sideways: full screen, the rows left of the drawing, and the five readings never meeting. */
async function sidewaysChecks(page: Page) {
  await openRocker(page);
  await pickFirstFittingBlank(page);
  const dialog = await openCustomizeRocker(page);
  await expectFullScreen(page);
  const rows = (await dialog.locator("[data-customize-rocker-rows]").boundingBox())!;
  const card = (await dialog.locator("[data-custom-rocker-drawing]").boundingBox())!;
  expect(rows.x + rows.width).toBeLessThanOrEqual(card.x + 1);
  // A change, so the stacks carry their CUSTOM figures too.
  await noseHalfInch(page, dialog);
  const readings = dialog.locator("[data-blank-view-rocker]");
  await expect(readings).toHaveCount(5);
  await expect(dialog.locator('[data-blank-view-rocker] [data-figure="custom"]')).toHaveCount(5);
  await expectLabelsApart(dialog);
  // The board on: still apart, and the drawing column scrolls to the last stack and the Rocker title
  // rather than clipping them (P-9).
  await dialog.locator("[data-show-board]").click();
  await expect(dialog.locator('[data-blank-view-rocker] [data-figure="board"]')).toHaveCount(5);
  await expectLabelsApart(dialog);
  const svgBox = (await dialog.locator("[data-blank-view]").boundingBox())!;
  const column = dialog.locator("[data-customize-rocker-drawing-column]");
  await column.evaluate((el) => el.scrollTo({ top: el.scrollHeight }));
  await page.waitForTimeout(200);
  const cardBox = (await dialog.locator("[data-custom-rocker-drawing]").boundingBox())!;
  const lastStack = (await readings.last().boundingBox())!;
  const rockerTitle = (await dialog.locator('[data-blank-view-title="rocker"]').boundingBox())!;
  for (const b of [lastStack, rockerTitle]) {
    expect(b.y >= cardBox.y - 0.5 && b.y + b.height <= cardBox.y + cardBox.height + 0.5).toBe(true);
  }
  const columnBox = (await column.boundingBox())!;
  expect(rockerTitle.y + rockerTitle.height).toBeLessThanOrEqual(columnBox.y + columnBox.height + 0.5);
  await column.evaluate((el) => el.scrollTo({ top: 0 }));
  // Dimensions off: the foam grows to fill the drawing (D-07, P-10).
  const dimensions = dialog.locator("[data-show-dimensions]");
  await expect(dimensions).toBeVisible();
  const before = await foamLength(dialog, "flat");
  await dimensions.click();
  await expect(dialog.locator("[data-blank-view-card]")).toHaveCount(0);
  const after = await foamLength(dialog, "flat");
  console.log(`[ojc P-10] sideways ${page.viewportSize()!.width}×${page.viewportSize()!.height}: svg ${svgBox.width.toFixed(1)}×${svgBox.height.toFixed(1)}, foam ${before.toFixed(1)} → ${after.toFixed(1)} px long`);
  expect(after).toBeGreaterThanOrEqual(1.2 * before);
}

test.describe("Customize Rocker on a real sideways iPhone (844 × 390)", () => {
  test.use({ ...realSidewaysIphone });
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "iphone", "this describe supplies its own device (a real sideways iPhone)");
    await dismissChrome(page);
  });

  test("fills the screen, rows beside the drawing, the readings apart", async ({ page }) => {
    await sidewaysChecks(page);
  });
});

test.describe("Customize Rocker on a Pixel 7 held sideways", () => {
  test.use({ ...pixel7Landscape });
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "android", "this describe supplies its own device (Pixel 7 landscape)");
    await dismissChrome(page);
  });

  test("fills the screen, rows beside the drawing, the readings apart", async ({ page }) => {
    await sidewaysChecks(page);
  });
});
