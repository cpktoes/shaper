import { expect, test, type Page } from "@playwright/test";
import { RACK_COPY } from "../components/setup/rack-config";
import { GUIDE_COPY } from "../components/guide/guide-copy";
import { ROCKER_GUIDE_GROUPS, ROCKER_GUIDE_WORDS } from "../components/guide/words/rocker";
import { guideRockerInput } from "../lib/geometry/__fixtures__/guide-rocker-input";
import { guideCaptionText, guideSlug } from "../lib/geometry/guide-card";
import { buildRockerGuide, ROCKER_GUIDE_CARD_IDS } from "../lib/geometry/guide-rocker";
import { stationLabel } from "../lib/geometry/measure-display";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import { RACK_STAND_IN_ROUTE, standInRackRows } from "../lib/models/rack-stand-in";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";
import { forgetOpenBoardOnEveryLoad } from "./helpers/open-board";
import { freshPracticeRack } from "./helpers/practice-rack";
import { goToScreen } from "./helpers/screens";
import {
  columnsAcross,
  dismissStrips,
  guide,
  guideCard,
  guideCards,
  openGuide,
  openPreset,
  readGuideCards,
  setMetricUnits,
} from "./helpers/guide";

/**
 * ROCKER's GUIDE tab (Phase 18, plan 18-04): last on both of ROCKER's tab lists — VIEWER · PLANING · DATASHEET ·
 * GUIDE on a computer, VIEWER · TOP · PLANING · DATA · GUIDE on a phone or a narrow or short window — and
 * fourteen cards, each the open board from the side in its blank with its one setting pushed in muted dashes.
 *
 * Every word comes from the module the page reads (held to the founder's words page by a unit test), and every
 * tag and caption from the page's own builder run on the same board, never typed here. Tab words are read by
 * role name and drawn text (`innerText`), because TOP and DATA are short labels for TOP VIEW and DATASHEET.
 */

const COUNT = ROCKER_GUIDE_WORDS.length;
const ids = ROCKER_GUIDE_CARD_IDS;

/** The tabs' drawn words, in order. */
const tabWords = (page: Page) => page.getByRole("tablist").getByRole("tab").allInnerTexts();
const guideTab = (page: Page) => page.getByRole("tab", { name: GUIDE_COPY.tab, exact: true });

test.describe("ROCKER's GUIDE on a computer (18-04)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the computer's GUIDE; the phones' is the next block");
    await dismissStrips(page);
    await forgetOpenBoardOnEveryLoad(page);
  });

  test("the strip ends in GUIDE, which opens fourteen cards in four groups with the Shortboard's tags and captions", async ({ page }) => {
    test.setTimeout(240_000);
    await openPreset(page, "shortboard", "ROCKER");
    expect(await tabWords(page)).toEqual(["VIEWER", "PLANING", "DATASHEET", GUIDE_COPY.tab]);

    await openGuide(page, COUNT);
    await expect(guide(page)).toHaveAttribute("aria-label", GUIDE_COPY.regionLabel("rocker"));
    await expect(guide(page).locator("[data-guide-group]")).toHaveCount(ROCKER_GUIDE_GROUPS.length);
    for (const group of ROCKER_GUIDE_GROUPS) {
      const inGroup = guide(page).locator(`[data-guide-group="${guideSlug(group.name)}"]`);
      await expect(inGroup.getByRole("listitem")).toHaveCount(ROCKER_GUIDE_WORDS.filter((card) => card.group === group.name).length);
    }
    await expect(guideCards(page).locator("svg[data-guide-cartoon]")).toHaveCount(COUNT);

    // Every tag and caption is the builder's for this very board.
    const built = buildRockerGuide(guideRockerInput("shortboard"), "imperial");
    for (const card of ROCKER_GUIDE_WORDS) {
      const model = built.get(card.id)!;
      const onPage = guideCard(page, card.id);
      await expect(onPage.getByRole("heading", { level: 4 })).toHaveText(model.name ?? card.name);
      if (model.tag.kind === "none") await expect(onPage.locator("[data-guide-tag]")).toHaveCount(0);
      else await expect(onPage.locator("[data-guide-tag]")).toHaveText(model.tag.text);
      const caption = onPage.locator("[data-guide-caption]");
      if (model.caption.kind === "none") await expect(caption).toHaveCount(0);
      else expect(await caption.textContent()).toBe(guideCaptionText(model.caption));
    }
    // A pushed card draws its push in the push's own muted dashes; Blank pushes nothing.
    await expect(guideCard(page, ids.noseRocker).locator('path[stroke="var(--outline-push-line)"]').first()).toBeVisible();
    await expect(guideCard(page, ids.blank).locator('path[stroke="var(--outline-push-line)"]')).toHaveCount(0);
    // Nothing on a card can be pressed.
    await expect(guideCards(page).locator('button, a, input, select, [role="button"], [tabindex]')).toHaveCount(0);
    // Every sidebar control stays live beside the GUIDE: the Center Thickness slider is not dimmed.
    await expect(page.locator("aside").getByRole("slider").first()).toBeEnabled();
  });

  test("a Metric shaper reads a Thinning Start as a dim and the 12\" station as the page reads it", async ({ page }) => {
    test.setTimeout(240_000);
    await setMetricUnits(page);
    await openPreset(page, "shortboard", "ROCKER");
    await openGuide(page, COUNT);
    await expect(guideCard(page, ids.noseThinningStarts).locator("[data-guide-tag]")).toHaveText("30.5 cm · Automatic");
    await expect(guideCard(page, ids.fineTunes).getByRole("heading", { level: 4 })).toHaveText(
      `Nose @ ${stationLabel("metric")} · Tail @ ${stationLabel("metric")}`,
    );
    const built = buildRockerGuide(guideRockerInput("shortboard"), "metric");
    for (const [id, model] of built) {
      if (model.caption.kind === "none") continue;
      expect(await guideCard(page, id).locator("[data-guide-caption]").textContent(), id).toBe(guideCaptionText(model.caption));
    }
  });

  test("GUIDE stays open when the window narrows across 820 dots and widens back", async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: 1280, height: 800 });
    await openPreset(page, "shortboard", "ROCKER");
    await openGuide(page, COUNT);
    for (const width of [800, 1280]) {
      await page.setViewportSize({ width, height: 800 });
      await expect(guideTab(page)).toHaveAttribute("aria-selected", "true");
      await expect(guideCards(page)).toHaveCount(COUNT);
      const words = await tabWords(page);
      expect(words[words.length - 1], `${width}: GUIDE last`).toBe(GUIDE_COPY.tab);
      // Below 820 dots TOP VIEW and DATASHEET draw their short words; their names stay whole for a screen reader.
      if (width === 800) expect(words).toEqual(["VIEWER", "TOP", "PLANING", "DATA", GUIDE_COPY.tab]);
      else expect(words).toEqual(["VIEWER", "PLANING", "DATASHEET", GUIDE_COPY.tab]);
    }
  });

  test("where a card is 236 to 245 dots wide, Nose Thinning Starts wraps its tag under its name, right-aligned, nothing cut off", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await openPreset(page, "shortboard", "ROCKER");
    await openGuide(page, COUNT);
    const card = guideCard(page, ids.noseThinningStarts);
    let found = 0;
    for (let width = 1400; width >= 820 && !found; width -= 6) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))));
      const w = await card.evaluate((el) => el.getBoundingClientRect().width);
      if (w >= 236 && w <= 245) found = width;
    }
    expect(found, "a desktop width where the cards measure 236 to 245 dots").toBeGreaterThan(0);
    const rows = await card.evaluate((el) => {
      const box = el.getBoundingClientRect();
      const pad = parseFloat(getComputedStyle(el).paddingRight) + parseFloat(getComputedStyle(el).borderRightWidth);
      const name = el.querySelector("h4")!.getBoundingClientRect();
      const tag = el.querySelector("[data-guide-tag]")!.getBoundingClientRect();
      return { card: box.width, nameBottom: name.bottom, tagTop: tag.top, tagRight: tag.right, contentRight: box.right - pad };
    });
    test.info().annotations.push({ type: "wrap", description: `${found} wide: ${JSON.stringify(rows)}` });
    console.log(`[guide-rocker] cards ${rows.card.toFixed(1)} wide at a ${found}-dot window`);
    expect(rows.tagTop, "the tag sits under the name").toBeGreaterThanOrEqual(rows.nameBottom - 1);
    expect(Math.abs(rows.tagRight - rows.contentRight), "the tag is right-aligned").toBeLessThanOrEqual(1);
    for (const read of await readGuideCards(page)) {
      expect(read.clipped, `${read.card}: text cut off`).toEqual([]);
      expect(read.outside, `${read.card}: a part outside the card`).toEqual([]);
      expect(read.nameMeetsTag, `${read.card}: the name runs into its tag`).toBe(false);
    }
  });
});

/* -------------------------------------------------------------------------------------------- phones */

/** The board's name slot gives way under this much room (plan 18-02, D-21), and draws a box this wide. */
const NAME_ROOM = 50;
const NAME_BOX = 44;
const PHONE_WIDTHS = [
  { width: 360, height: 780 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 430, height: 932 },
];

/** A saved board, opened from a practice rack of this test's own — a saved board carries ROCKER's fullest
 * phone strip (TOP among its tabs). */
async function openSavedBoard(page: Page) {
  await page.addInitScript(
    ([bannerKey, tipKey]) => {
      window.sessionStorage.setItem(bannerKey, "true");
      window.localStorage.setItem(tipKey, "true");
    },
    [BANNER_DISMISSAL_KEY, TOOLBAR_TIP_DISMISSAL_KEY] as const,
  );
  await freshPracticeRack(page);
  await page.goto(`${RACK_STAND_IN_ROUTE}?boards=3`);
  await expect(page.locator("[data-rack-art][data-turn]")).toHaveCount(3);
  const first = standInRackRows(6)[0];
  await page.getByRole("group", { name: RACK_COPY.captionGroup(first.name) }).getByRole("button", { name: RACK_COPY.open }).click();
  await page.waitForURL("**/design/outline");
  await goToScreen(page, "ROCKER");
}

/** The strip that carries the board's name slot, measured: the tabs, the room after the last, the name. */
async function measureStrip(page: Page) {
  return page.evaluate(() => {
    const button = [...document.querySelectorAll<HTMLElement>("[data-board-name-band]")].find(
      (b) => b.closest<HTMLElement>('[class~="@container"]')?.parentElement?.getClientRects().length,
    );
    const slotEl = button?.closest<HTMLElement>('[class~="@container"]');
    const strip = slotEl?.parentElement;
    if (!strip || !slotEl) throw new Error("no strip with the board's name slot");
    const tabs = Array.from(strip.firstElementChild!.children).map((tab) => {
      const r = tab.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, height: r.height, word: (tab as HTMLElement).innerText.trim() };
    });
    const sr = strip.getBoundingClientRect();
    const drawn = button && button.getClientRects().length > 0 ? button.getBoundingClientRect() : null;
    return {
      tabs,
      stripLeft: sr.left,
      stripRight: sr.right,
      room: sr.right - tabs[tabs.length - 1].right,
      name: drawn ? { left: drawn.left, width: drawn.width } : null,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
    };
  });
}

async function settle(page: Page) {
  await page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))));
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), { timeout: 5_000 })
    .toBeLessThanOrEqual(0);
}

test.describe("ROCKER's GUIDE on a phone (18-04)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "the phones' GUIDE; the computer's is the block above");
    await page.setViewportSize(PHONE_WIDTHS[2]);
  });

  test("upright at 360 to 430: five tabs whole on one line, the name giving way under 50 dots of room, one card across, the page never scrolling", async ({
    page,
  }, testInfo) => {
    test.setTimeout(300_000);
    await page.setViewportSize(PHONE_WIDTHS[2]);
    await openSavedBoard(page);
    await openGuide(page, COUNT);

    for (const size of PHONE_WIDTHS) {
      await page.setViewportSize(size);
      await settle(page);
      const m = await measureStrip(page);
      const where = `${testInfo.project.name} ${size.width}x${size.height}`;
      console.log(
        `[guide-rocker] ${where}: ${m.tabs.map((t) => t.word).join(" · ")}, room after GUIDE ${m.room.toFixed(1)}, ` +
          (m.name ? `name drawn, box ${m.name.width.toFixed(1)}` : "name not drawn"),
      );
      test.info().annotations.push({ type: "room", description: `${where}: ${m.room.toFixed(1)}` });
      expect(m.tabs.map((t) => t.word), where).toEqual(["VIEWER", "TOP", "PLANING", "DATA", GUIDE_COPY.tab]);
      for (const tab of m.tabs) {
        expect(Math.abs(tab.top - m.tabs[0].top), `${where}: every tab on one line`).toBeLessThanOrEqual(0.5);
        expect(Math.abs(tab.height - m.tabs[0].height), `${where}: no tab word wraps`).toBeLessThanOrEqual(0.5);
        expect(tab.left, `${where}: inside the strip`).toBeGreaterThanOrEqual(m.stripLeft - 0.5);
        expect(tab.right, `${where}: inside the strip`).toBeLessThanOrEqual(m.stripRight + 0.5);
      }
      expect(m.scrollWidth, `${where}: no sideways scroll`).toBeLessThanOrEqual(m.innerWidth);
      expect(m.scrollHeight, `${where}: the page itself never scrolls`).toBe(m.innerHeight);
      expect(Math.abs(m.room - NAME_ROOM), `${where}: the room is clear of the 50-dot line`).toBeGreaterThan(2);
      if (size.width <= 390) expect(m.name, `${where}: the name gives way`).toBeNull();
      else {
        expect(m.name, `${where}: the name is drawn`).not.toBeNull();
        expect(m.name!.width, `${where}: a 44-dot box or more`).toBeGreaterThanOrEqual(NAME_BOX - 0.5);
      }
      if (m.room < NAME_ROOM) expect(m.name, `${where}: under 50 dots, no name`).toBeNull();
      await expect(guideTab(page), where).toHaveAttribute("aria-selected", "true");
      expect((await columnsAcross(page, guideSlug(ROCKER_GUIDE_GROUPS[0].name))).columns, where).toBe(1);
    }

    for (const read of await readGuideCards(page)) {
      expect(read.clipped, `${read.card}: text cut off`).toEqual([]);
      expect(read.outside, `${read.card}: a part outside the card`).toEqual([]);
      expect(read.nameMeetsTag, `${read.card}: the name runs into its tag`).toBe(false);
    }
    // The last note can be reached by scrolling the cards alone.
    const last = guideCard(page, ROCKER_GUIDE_WORDS[COUNT - 1].id).locator("[data-guide-how]");
    await last.scrollIntoViewIfNeeded();
    await expect(last).toBeInViewport({ ratio: 0.99 });
  });

  test("held sideways: the desktop shell, GUIDE still last, and the room left for the board's name is logged", async ({ page }, testInfo) => {
    test.setTimeout(240_000);
    const sideways = testInfo.project.name === "android" ? { width: 863, height: 360 } : { width: 844, height: 390 };
    await page.setViewportSize(sideways);
    await openSavedBoard(page);
    await openGuide(page, COUNT);
    await settle(page);
    const m = await measureStrip(page);
    const where = `${testInfo.project.name} sideways ${sideways.width}x${sideways.height}`;
    console.log(
      `[guide-rocker] ${where}: ${m.tabs.map((t) => t.word).join(" · ")}, room after GUIDE ${m.room.toFixed(1)}, ` +
        (m.name ? `name drawn, box ${m.name.width.toFixed(1)}` : "name not drawn"),
    );
    test.info().annotations.push({ type: "room", description: `${where}: ${m.room.toFixed(1)}` });
    expect(m.tabs.map((t) => t.word)).toEqual(["VIEWER", "TOP VIEW", "PLANING", "DATASHEET", GUIDE_COPY.tab]);
    for (const tab of m.tabs) expect(Math.abs(tab.top - m.tabs[0].top), `${where}: one line`).toBeLessThanOrEqual(0.5);
    expect(m.scrollWidth).toBeLessThanOrEqual(m.innerWidth);
    // The room rule holds either way; whether the name shows is the band test's question (p2).
    if (m.room < NAME_ROOM) expect(m.name).toBeNull();
    else expect(m.name!.width).toBeGreaterThanOrEqual(NAME_BOX - 0.5);

    const side = await page.evaluate(() => {
      const aside = document.querySelector("aside")!.getBoundingClientRect();
      const main = document.querySelector("main")!.getBoundingClientRect();
      return aside.right <= main.left + 1;
    });
    expect(side, "the sidebar beside the drawing column").toBe(true);
    const last = guideCard(page, ROCKER_GUIDE_WORDS[COUNT - 1].id).locator("[data-guide-how]");
    await last.scrollIntoViewIfNeeded();
    await expect(last).toBeInViewport({ ratio: 0.99 });
  });
});
