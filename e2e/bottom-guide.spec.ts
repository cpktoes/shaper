import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { BOTTOM_COPY, CHANNELS_COPY } from "../components/bottom/bottom-copy";
import { BOTTOM_GUIDE_WORDS } from "../components/bottom/bottom-guide-words";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";
import { BOARD_PRESETS } from "../lib/geometry/presets";
import type { BottomSectionKey } from "../lib/geometry/bottom";
import { forgetOpenBoardOnEveryLoad } from "./helpers/open-board";
import { goToScreen } from "./helpers/screens";

/**
 * BOTTOM's GUIDE tab (Phase 17, plan 17-11; D-17, D-18; UI-SPEC §5, E18): nineteen cards in four groups — what each cut
 * is, what it does and how it is shaped, each with a cartoon of that cut on the board the shaper has open.
 *
 * The words are the founder's: every string is read from the module the screen reads (`bottom-guide-words.ts`, itself
 * held to his page by a unit test), never typed here. Sizes are read off the page.
 */

const SECTION_WORD: Record<BottomSectionKey, string> = { nose: "Nose", center: "Center", tail: "Tail" };
const FLATS = ["Flat Entry", "Flat Center", "Flat Exit"];

async function dismissStrips(page: Page) {
  await page.addInitScript((key) => window.sessionStorage.setItem(key, "true"), BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => window.localStorage.setItem(key, "true"), TOOLBAR_TIP_DISMISSAL_KEY);
}

/** Opens a preset from the home page and walks to BOTTOM by the top row (or ☰ and its tile on a phone). A computer's
 * preset card says `Start Shaping`; a phone's carries the board's litres. */
async function openBottom(page: Page, presetId: string) {
  const preset = BOARD_PRESETS.find((p) => p.id === presetId);
  if (!preset) throw new Error(`no ${presetId} preset`);
  await page.goto("/");
  const card = page
    .getByRole("button")
    .filter({ hasText: preset.name })
    .filter({ hasText: /Start Shaping|\d\.\d L/ })
    .first();
  await expect(async () => {
    if (!/\/design\/outline$/.test(page.url()) && (await card.count()) > 0) {
      await card.scrollIntoViewIfNeeded({ timeout: 2_000 });
      await card.click({ timeout: 2_000 });
    }
    await expect(page).toHaveURL(/\/design\/outline$/, { timeout: 5_000 });
  }).toPass({ timeout: 90_000 });
  await goToScreen(page, "BOTTOM");
  await expect(page.locator("[data-bottom-cut-line]")).toBeAttached({ timeout: 60_000 });
}

/** Opens the GUIDE tab, retried until React owns the tab so a tap before hydration is never lost. */
async function openGuide(page: Page) {
  const tab = page.getByRole("tab", { name: BOTTOM_COPY.guideTab, exact: true });
  await expect(async () => {
    await tab.click({ timeout: 2_000 });
    await expect(guide(page)).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 60_000 });
  await expect(cards(page)).toHaveCount(BOTTOM_GUIDE_WORDS.length);
}

const guide = (page: Page): Locator => page.locator("[data-bottom-guide]");
const cards = (page: Page): Locator => guide(page).locator("[data-guide-card]");
const cardOf = (page: Page, name: string): Locator => guide(page).locator(`[data-guide-card="${name}"]`);

/** The names of the cards that carry the `On this board` tag, in the page's order. */
async function tagged(page: Page): Promise<string[]> {
  return guide(page)
    .locator('[data-guide-card][data-guide-on="true"]')
    .evaluateAll((els) => els.map((el) => el.getAttribute("data-guide-card") ?? ""));
}

/** Picks a name from a section's Cut menu, retried until React owns the menu. */
async function pick(page: Page, section: BottomSectionKey, name: string) {
  const echo = page.locator(`[data-bottom-card="${section}"] [data-bottom-cut-echo]`);
  if ((await echo.textContent()) === name) return;
  await expect(async () => {
    await page.getByRole("combobox", { name: `${SECTION_WORD[section]} Cut` }).click();
    await page.getByRole("option", { name, exact: true }).click({ timeout: 2_000 });
    await expect(echo).toHaveText(name, { timeout: 2_000 });
  }).toPass({ timeout: 60_000 });
}

/** How many cards sit side by side: the number of different left edges in the first group. */
async function columnsAcross(page: Page): Promise<{ columns: number; cardWidth: number }> {
  return guide(page)
    .locator('[data-guide-group="nose"] [data-guide-card]')
    .evaluateAll((els) => {
      const boxes = els.map((el) => el.getBoundingClientRect());
      return { columns: new Set(boxes.map((box) => Math.round(box.left))).size, cardWidth: Math.round(boxes[0].width) };
    });
}

/**
 * E18's backstop, read off the page: every card's height, and for every card that nothing in it is cut off — no line of
 * text wider or taller than its own box, the name and its tag side by side without touching, and every part inside the
 * card's own edge.
 */
async function readCards(page: Page) {
  return cards(page).evaluateAll((els) =>
    els.map((card) => {
      const box = card.getBoundingClientRect();
      const parts = [...card.querySelectorAll<HTMLElement | SVGElement>("h4, p, [data-guide-tag], svg")];
      const clipped = parts
        .filter((part): part is HTMLElement => part instanceof HTMLElement)
        .filter((part) => part.scrollWidth > part.clientWidth + 1 || part.scrollHeight > part.clientHeight + 1)
        .map((part) => part.tagName);
      const outside = parts
        .map((part) => ({ tag: part.tagName, rect: part.getBoundingClientRect() }))
        .filter(({ rect }) => rect.left < box.left - 0.5 || rect.right > box.right + 0.5 || rect.top < box.top - 0.5 || rect.bottom > box.bottom + 0.5)
        .map(({ tag }) => tag);
      const name = card.querySelector("h4")!.getBoundingClientRect();
      const tag = card.querySelector("[data-guide-tag]")?.getBoundingClientRect() ?? null;
      const art = card.querySelector("svg")!.getBoundingClientRect();
      return {
        card: card.getAttribute("data-guide-card") ?? "",
        width: box.width,
        height: box.height,
        clipped,
        outside,
        nameMeetsTag: tag !== null && name.right > tag.left + 0.5,
        artWidth: art.width,
        artHeight: art.height,
      };
    }),
  );
}

/** Every card whole, and every card's note brought fully into view by scrolling the cards alone — the page stays put. */
async function expectEveryCardWhole(page: Page) {
  const read = await readCards(page);
  expect(read).toHaveLength(BOTTOM_GUIDE_WORDS.length);
  for (const card of read) {
    expect(card.clipped, `${card.card}: text cut off`).toEqual([]);
    expect(card.outside, `${card.card}: a part outside the card`).toEqual([]);
    expect(card.nameMeetsTag, `${card.card}: the name runs into its tag`).toBe(false);
    expect(card.height, card.card).toBeGreaterThan(card.artHeight);
    // The cartoon is drawn whole, at its own 300 × 154 shape, across the card.
    expect(card.artWidth / card.artHeight, card.card).toBeCloseTo(300 / 154, 1);
    expect(card.artWidth, card.card).toBeGreaterThan(card.width * 0.85);
  }
  for (const card of BOTTOM_GUIDE_WORDS) {
    const note = cardOf(page, card.key).locator("[data-guide-how]");
    await note.scrollIntoViewIfNeeded();
    await expect(note, `${card.key}: the note is not wholly in view`).toBeInViewport({ ratio: 0.99 });
  }
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  return read;
}

test.describe("BOTTOM's GUIDE: nineteen cards in the founder's words, each drawn on the open board (17-11, D-17, D-18)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the computer's GUIDE; the phones' is the next block");
    await dismissStrips(page);
    await forgetOpenBoardOnEveryLoad(page);
  });

  test("nineteen cards in four groups, every name and line the words module's own, a cartoon on each", async ({ page }) => {
    test.setTimeout(180_000);
    await openBottom(page, "shortboard");
    await openGuide(page);

    // A board not saved yet has no name: `your board`, never `your Untitled`.
    await expect(guide(page).locator("[data-guide-intro]")).toHaveText(BOTTOM_COPY.guideIntro(null));
    await expect(guide(page).locator("[data-guide-intro]")).toContainText("drawn on your board at its starting numbers");

    await expect(guide(page).getByRole("heading", { level: 3 })).toHaveText(Object.values(BOTTOM_COPY.guideGroups));
    for (const group of ["nose", "center", "tail", "channels"] as const) {
      const inGroup = guide(page).locator(`[data-guide-group="${group}"]`);
      const expected = BOTTOM_GUIDE_WORDS.filter((card) => card.section === group);
      await expect(inGroup.getByRole("list")).toHaveCount(1);
      await expect(inGroup.getByRole("listitem")).toHaveCount(expected.length);
      await expect(inGroup.getByRole("heading", { level: 4 })).toHaveText(expected.map((card) => card.key));
    }

    await expect(cards(page).locator("[data-guide-text]")).toHaveText(BOTTOM_GUIDE_WORDS.map((card) => `${card.is} ${card.does}`));
    await expect(cards(page).locator("[data-guide-how]")).toHaveText(
      BOTTOM_GUIDE_WORDS.map((card) => `${BOTTOM_COPY.guideHowToShape}${card.how}`),
    );
    // What it is reads in ink and bold, ahead of what it does.
    await expect(cards(page).locator("[data-guide-text] > span")).toHaveText(BOTTOM_GUIDE_WORDS.map((card) => card.is));

    // A cartoon on every card, in its own 300 × 154 box, hidden from a screen reader (the words say it).
    const art = cards(page).locator("svg[data-guide-cartoon]");
    await expect(art).toHaveCount(BOTTOM_GUIDE_WORDS.length);
    expect(new Set(await art.evaluateAll((els) => els.map((el) => `${el.getAttribute("viewBox")}|${el.getAttribute("aria-hidden")}`)))).toEqual(
      new Set(["0 0 300 154|true"]),
    );
    // A flat has no shade; a cut does.
    await expect(cardOf(page, "Flat Center").locator("[data-guide-shade]")).toHaveCount(0);
    await expect(cardOf(page, "Deep Single Concave").locator("[data-guide-shade] path").first()).toBeAttached();
  });

  test("the tag follows the board: the three flats to start, then the cuts picked, the channels once cut — and a card is never a control", async ({ page }) => {
    test.setTimeout(240_000);
    await openBottom(page, "shortboard");
    await openGuide(page);
    expect(await tagged(page)).toEqual(FLATS);
    await expect(guide(page).locator("[data-guide-tag]")).toHaveText(FLATS.map(() => BOTTOM_COPY.guideOnThisBoard));

    await pick(page, "center", "Deep Single Concave");
    await expect.poll(() => tagged(page)).toEqual(["Flat Entry", "Deep Single Concave", "Flat Exit"]);

    await expect(async () => {
      await page.getByRole("combobox", { name: "Channels", exact: true }).click();
      await page.getByRole("option", { name: CHANNELS_COPY.countOption(6), exact: true }).click({ timeout: 2_000 });
      await expect(page.locator("[data-bottom-channels-echo]")).not.toHaveText("None", { timeout: 2_000 });
    }).toPass({ timeout: 60_000 });
    await expect.poll(() => tagged(page)).toEqual(["Flat Entry", "Deep Single Concave", "Flat Exit", "Channels"]);

    // Nothing in the list can be pressed, and pressing a card changes nothing on the board.
    await expect(guide(page).locator('button, a, input, select, [role="button"], [tabindex]')).toHaveCount(0);
    const sliders = page.getByRole("slider");
    const before = await sliders.evaluateAll((els) => els.map((el) => `${el.getAttribute("aria-label")}=${el.getAttribute("aria-valuenow")}`));
    expect(before.length).toBeGreaterThan(5);
    for (const name of ["Deep Single Concave", "Panel Vee", "Rolled Belly Entry", "Channels"]) {
      await cardOf(page, name).click();
      await cardOf(page, name).locator("svg").click();
    }
    expect(await sliders.evaluateAll((els) => els.map((el) => `${el.getAttribute("aria-label")}=${el.getAttribute("aria-valuenow")}`))).toEqual(before);
    expect(await tagged(page)).toEqual(["Flat Entry", "Deep Single Concave", "Flat Exit", "Channels"]);
    await expect(page.locator('[data-bottom-card="center"] [data-bottom-cut-echo]')).toHaveText("Deep Single Concave");
  });

  test("the cartoons are the open board: the Fish redraws every card, and its tags are its own", async ({ page }) => {
    test.setTimeout(240_000);
    await openBottom(page, "shortboard");
    await pick(page, "center", "Deep Single Concave");
    await openGuide(page);
    const boardPaths = () => cards(page).locator("svg[data-guide-cartoon] > path:first-of-type").evaluateAll((els) => els.map((el) => el.getAttribute("d") ?? ""));
    const shortboard = await boardPaths();
    expect(shortboard).toHaveLength(BOTTOM_GUIDE_WORDS.length);
    // One board, so the same outline on every card.
    expect(new Set(shortboard).size).toBe(1);
    expect(await tagged(page)).toEqual(["Flat Entry", "Deep Single Concave", "Flat Exit"]);

    await openBottom(page, "fish");
    await openGuide(page);
    const fish = await boardPaths();
    expect(new Set(fish).size).toBe(1);
    expect(fish[0]).not.toBe(shortboard[0]);
    // The Fish opens flat: the tag is back on the three flats.
    expect(await tagged(page)).toEqual(FLATS);
  });

  test("three across at 1280, two at 1024, one at 820 — and the cards scroll inside the folder, never the page", async ({ page }) => {
    test.setTimeout(240_000);
    await openBottom(page, "shortboard");
    await openGuide(page);

    const at1280 = await columnsAcross(page);
    expect(at1280.columns).toBe(3);

    await page.setViewportSize({ width: 1024, height: 768 });
    await expect.poll(async () => (await columnsAcross(page)).columns).toBe(2);
    const at1024 = await columnsAcross(page);

    await page.setViewportSize({ width: 820, height: 800 });
    await expect.poll(async () => (await columnsAcross(page)).columns).toBe(1);
    const at820 = await columnsAcross(page);

    // Never narrower than the sketch's 236 dots, at any of the three.
    for (const size of [at1280, at1024, at820]) expect(size.cardWidth).toBeGreaterThanOrEqual(236);
    test.info().annotations.push({ type: "card widths", description: `1280: ${at1280.cardWidth} · 1024: ${at1024.cardWidth} · 820: ${at820.cardWidth}` });

    await page.setViewportSize({ width: 1280, height: 800 });
    await expect.poll(async () => (await columnsAcross(page)).columns).toBe(3);

    // The folder scrolls its cards; the page does not move.
    const scroller = guide(page);
    const room = await scroller.evaluate((el) => ({ content: el.scrollHeight, box: el.clientHeight, overflow: getComputedStyle(el).overflowY }));
    expect(room.overflow).toBe("auto");
    expect(room.content).toBeGreaterThan(room.box * 2);
    const first = cards(page).first();
    const topBefore = (await first.boundingBox())!.y;
    await scroller.hover();
    await page.mouse.wheel(0, 600);
    await expect.poll(() => scroller.evaluate((el) => el.scrollTop)).toBeGreaterThan(300);
    expect((await first.boundingBox())!.y).toBeLessThan(topBefore - 300);
    expect(await page.evaluate(() => ({ y: window.scrollY, page: document.documentElement.scrollHeight <= window.innerHeight }))).toEqual({ y: 0, page: true });
  });

  for (const size of [
    { width: 1280, height: 800 },
    { width: 1024, height: 768 },
  ]) {
    test(`no card's words are cut off at ${size.width}, and every note can be read whole inside the folder (E18)`, async ({ page }) => {
      test.setTimeout(240_000);
      await page.setViewportSize(size);
      await openBottom(page, "shortboard");
      await openGuide(page);
      const read = await expectEveryCardWhole(page);
      const heights = read.map((card) => Math.round(card.height));
      test.info().annotations.push({ type: "card heights", description: `${size.width}: ${Math.min(...heights)}–${Math.max(...heights)} dots` });
    });
  }

  test("the words are drawn as plain text: nothing under components/bottom writes raw HTML", () => {
    const dir = join(process.cwd(), "components", "bottom");
    const sources = readdirSync(dir).filter((name) => /\.tsx?$/.test(name) && !name.endsWith(".test.ts"));
    expect(sources).toContain("bottom-guide.tsx");
    for (const name of sources) expect(readFileSync(join(dir, name), "utf8"), name).not.toMatch(/dangerouslySetInnerHTML/);
  });
});

test.describe("BOTTOM's GUIDE on a phone: one card across, the cards scrolling under the pinned tabs (17-11, E18)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "the phones' GUIDE; the computer's is the block above");
    await dismissStrips(page);
    await forgetOpenBoardOnEveryLoad(page);
  });

  test("upright: nineteen cards one across, no words cut off, every note read whole without the page scrolling sideways", async ({ page }) => {
    test.setTimeout(240_000);
    await openBottom(page, "shortboard");
    await openGuide(page);
    expect((await columnsAcross(page)).columns).toBe(1);
    expect(await tagged(page)).toEqual(FLATS);

    const read = await readCards(page);
    for (const card of read) {
      expect(card.clipped, `${card.card}: text cut off`).toEqual([]);
      expect(card.outside, `${card.card}: a part outside the card`).toEqual([]);
      expect(card.nameMeetsTag, `${card.card}: the name runs into its tag`).toBe(false);
      expect(card.width, card.card).toBeGreaterThanOrEqual(236);
    }
    for (const card of BOTTOM_GUIDE_WORDS) {
      const note = cardOf(page, card.key).locator("[data-guide-how]");
      await note.scrollIntoViewIfNeeded();
      await expect(note, `${card.key}: the note is not wholly in view`).toBeInViewport({ ratio: 0.99 });
    }
    // Nothing is wider than the phone.
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const heights = read.map((card) => Math.round(card.height));
    test.info().annotations.push({ type: "card heights", description: `${Math.round(read[0].width)} wide: ${Math.min(...heights)}–${Math.max(...heights)} dots` });
  });

  test("held sideways: the same nineteen cards beside the controls, no words cut off, and every note can still be reached", async ({ page }, testInfo) => {
    test.setTimeout(240_000);
    // The sizes real hardware reports, never an emulator's swap (CLAUDE.md, Layout): a sideways iPhone is about 844 dots
    // wide and a Pixel 7 about 863 — both over 820, so both get the desktop shell, on a short screen.
    const sideways = testInfo.project.name === "android" ? { width: 863, height: 360 } : { width: 844, height: 390 };
    await page.setViewportSize(sideways);
    await openBottom(page, "shortboard");
    await openGuide(page);
    await expect(cards(page)).toHaveCount(BOTTOM_GUIDE_WORDS.length);

    const read = await readCards(page);
    for (const card of read) {
      expect(card.clipped, `${card.card}: text cut off`).toEqual([]);
      expect(card.outside, `${card.card}: a part outside the card`).toEqual([]);
      expect(card.nameMeetsTag, `${card.card}: the name runs into its tag`).toBe(false);
      expect(card.width, card.card).toBeGreaterThanOrEqual(236);
    }
    for (const card of BOTTOM_GUIDE_WORDS) {
      const note = cardOf(page, card.key).locator("[data-guide-how]");
      await note.scrollIntoViewIfNeeded();
      await expect(note, `${card.key}: the note is not wholly in view`).toBeInViewport({ ratio: 0.99 });
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const heights = read.map((card) => Math.round(card.height));
    test.info().annotations.push({
      type: "card heights",
      description: `${sideways.width}x${sideways.height}, ${(await columnsAcross(page)).columns} across, ${Math.round(read[0].width)} wide: ${Math.min(...heights)}–${Math.max(...heights)} dots`,
    });
  });
});
