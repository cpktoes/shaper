import { expect, test, type Page } from "@playwright/test";
import { GUIDE_COPY } from "../components/guide/guide-copy";
import { RAILS_GUIDE_GROUPS, RAILS_GUIDE_WORDS } from "../components/guide/words/rails";
import { guideRailsInput } from "../lib/geometry/__fixtures__/guide-rails-input";
import { guideCaptionText, guideSlug } from "../lib/geometry/guide-card";
import { buildRailsGuide, RAILS_GUIDE_CARD_IDS } from "../lib/geometry/guide-rails";
import { forgetOpenBoardOnEveryLoad } from "./helpers/open-board";
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
 * RAILS' GUIDE tab (Phase 18, plan 18-05): VIEWER · DATA · INSTRUCTIONS · GUIDE, and seventeen cards about the
 * page's controls, each drawn from the rails of the board that is open — the bands in the page's own colours,
 * the finished rail in ink, the one setting pushed in muted dashes.
 *
 * Every word is read from the module the page itself reads (`components/guide/words/rails.ts`, held to the
 * founder's words page by a unit test), and every tag and caption from the builder the page itself runs, never
 * typed here.
 */

const COUNT = RAILS_GUIDE_WORDS.length;
const TABS = ["VIEWER", "DATA", "INSTRUCTIONS", GUIDE_COPY.tab];
/** D-21's line (plan 18-02): the board's name is drawn only with this much room after the last tab. */
const NAME_ROOM = 50;

/** RAILS' own page strip — the one tablist carrying INSTRUCTIONS, never the phone's NOSE · CENTER · TAIL switch. */
const railsTabs = (page: Page) => page.getByRole("tablist").filter({ hasText: "INSTRUCTIONS" }).getByRole("tab");
/** The phone-only NOSE · CENTER · TAIL switch on VIEWER. */
const railSwitch = (page: Page) => page.getByRole("tablist").filter({ hasText: "NOSE" });

test.describe("RAILS' GUIDE on a computer (18-05)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the computer's GUIDE; the phones' is the next block");
    await dismissStrips(page);
    await forgetOpenBoardOnEveryLoad(page);
  });

  test("the strip ends in GUIDE, and GUIDE opens seventeen cards in three groups with the Shortboard's own tags and captions", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await openPreset(page, "shortboard", "RAILS");
    await expect(railsTabs(page)).toHaveText(TABS);

    await openGuide(page, COUNT);
    await expect(guide(page)).toHaveAttribute("aria-label", GUIDE_COPY.regionLabel("rails"));
    await expect(guide(page).locator("[data-guide-group]")).toHaveCount(RAILS_GUIDE_GROUPS.length);
    const built = buildRailsGuide(guideRailsInput("shortboard"), "imperial");
    for (const group of RAILS_GUIDE_GROUPS) {
      const inGroup = guide(page).locator(`[data-guide-group="${guideSlug(group.name)}"]`);
      const expected = RAILS_GUIDE_WORDS.filter((card) => card.group === group.name);
      await expect(inGroup.getByRole("listitem")).toHaveCount(expected.length);
      await expect(inGroup.getByRole("heading", { level: 4 })).toHaveText(expected.map((card) => built.get(card.id)!.name ?? card.name));
    }
    // A drawing on every card.
    await expect(guideCards(page).locator("svg[data-guide-cartoon]")).toHaveCount(COUNT);

    // Every tag and caption as the app's own rail maths works them out for the Shortboard.
    for (const card of RAILS_GUIDE_WORDS) {
      const model = built.get(card.id)!;
      const tag = guideCard(page, card.id).locator("[data-guide-tag]");
      if (model.tag.kind === "none") await expect(tag, card.name).toHaveCount(0);
      else await expect(tag, card.name).toHaveText(model.tag.text);
      const caption = guideCard(page, card.id).locator("[data-guide-caption]");
      if (model.caption.kind === "none") await expect(caption, card.name).toHaveCount(0);
      else await expect(caption, card.name).toHaveText(guideCaptionText(model.caption));
    }

    // The words are the module's, in order.
    await expect(guideCards(page).locator("[data-guide-text]")).toHaveText(RAILS_GUIDE_WORDS.map((card) => `${card.is} ${card.does}`));
    await expect(guideCards(page).locator("[data-guide-how]")).toHaveText(
      RAILS_GUIDE_WORDS.map((card) => `${GUIDE_COPY.howToShape}${card.how}`),
    );
  });

  test("the Longboard's toggles read the other state: no hard edge drawn as one, symmetrical drawn as not", async ({ page }) => {
    test.setTimeout(240_000);
    await openPreset(page, "longboard", "RAILS");
    await openGuide(page, COUNT);
    const built = buildRailsGuide(guideRailsInput("longboard"), "imperial");
    for (const id of [RAILS_GUIDE_CARD_IDS.hardEdge, RAILS_GUIDE_CARD_IDS.symmetrical, RAILS_GUIDE_CARD_IDS.ratio]) {
      await expect(guideCard(page, id).locator("[data-guide-caption]")).toHaveText(guideCaptionText(built.get(id)!.caption));
    }
    await expect(guideCard(page, RAILS_GUIDE_CARD_IDS.hardEdge).locator("[data-guide-caption]")).toHaveText("dashed · hard edge");
    await expect(guideCard(page, RAILS_GUIDE_CARD_IDS.hardEdge).locator("[data-guide-tag]")).toHaveCount(0);
    await expect(guideCard(page, RAILS_GUIDE_CARD_IDS.symmetrical)).toHaveAttribute("data-guide-on", "true");
  });

  test("a Metric shaper reads every mark in whole millimetres and Blends From · Ends At in centimetres, no inch mark anywhere", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await setMetricUnits(page);
    await openPreset(page, "shortboard", "RAILS");
    await openGuide(page, COUNT);
    const built = buildRailsGuide(guideRailsInput("shortboard"), "metric");
    const thickness = guideCard(page, RAILS_GUIDE_CARD_IDS.thickness);
    await expect(thickness.locator("[data-guide-tag]")).toHaveText("57 mm");
    await expect(thickness.getByRole("heading", { level: 4 })).toHaveText(built.get(RAILS_GUIDE_CARD_IDS.thickness)!.name!);
    for (const id of [RAILS_GUIDE_CARD_IDS.apexThickness, RAILS_GUIDE_CARD_IDS.deckMark1, RAILS_GUIDE_CARD_IDS.bottomTuck3]) {
      await expect(guideCard(page, id).locator("[data-guide-tag]")).toHaveText(/^\d+ mm$/);
      await expect(guideCard(page, id).locator("[data-guide-caption]")).toHaveText(/^dashed · [+-]\d+ mm$/);
    }
    await expect(guideCard(page, RAILS_GUIDE_CARD_IDS.blends).locator("[data-guide-tag]")).toHaveText(/^\d+\.\d cm · \d+\.\d cm$/);
    // No inch mark on any name, tag, caption or drawing label. The two prose lines that quote the 12" stations
    // (Import Rocker & Foil Values' is, Board Thickness' how) read their Metric sayings once plan 18-07 lands them.
    const figures = await guide(page)
      .locator("h4, [data-guide-tag], [data-guide-caption], svg[data-guide-cartoon] text")
      .evaluateAll((els) => els.map((el) => el.textContent ?? ""));
    expect(figures.length).toBeGreaterThan(COUNT);
    for (const text of figures) expect(text).not.toMatch(/\d\s*["″]|\d'/);
  });

  test("the cartoons draw in RAILS' own colours: every hue a RAILS cartoon uses is one VIEWER's own plot uses", async ({ page }) => {
    test.setTimeout(240_000);
    await openPreset(page, "shortboard", "RAILS");
    // VIEWER's plots: the band colours on their segment lines and the apex centre's dot.
    await expect(page.locator('[data-rail-plot-row="desktop"] svg').first()).toBeVisible({ timeout: 60_000 });
    const pageHues = await page.locator('[data-rail-plot-row="desktop"] svg').evaluateAll((svgs) => {
      const out = new Set<string>();
      for (const svg of svgs) {
        for (const el of svg.querySelectorAll("line[stroke], circle[fill]")) {
          const value = el.getAttribute(el.tagName === "line" ? "stroke" : "fill")!;
          if (!value.startsWith("color-mix")) out.add(value);
        }
      }
      return [...out];
    });
    await openGuide(page, COUNT);
    const guideHues = await guide(page)
      .locator("svg[data-guide-cartoon]")
      .evaluateAll((svgs) => {
        const out = new Set<string>();
        for (const svg of svgs) {
          for (const el of svg.querySelectorAll("path, line, circle, rect")) {
            for (const attr of ["stroke", "fill"]) {
              const value = el.getAttribute(attr);
              if (value && value !== "none" && !value.startsWith("var(--outline-")) out.add(value);
            }
          }
        }
        return [...out];
      });
    test.info().annotations.push({ type: "hues", description: JSON.stringify({ pageHues, guideHues }) });
    // The bands (five data hues and the ink of the connectors) and the apex: the page's own, nothing new.
    expect(guideHues.length).toBeGreaterThanOrEqual(6);
    for (const hue of guideHues) expect(pageHues, `${hue} is not one of VIEWER's own colours`).toContain(hue);
  });
});

/** The strip RAILS draws, measured as `board-name-band.spec.ts` measures it: the four tabs, the room after the
 * last, and the board's name when it is drawn. */
async function measureRailsStrip(page: Page) {
  return page.evaluate(() => {
    const strips = new Set<HTMLElement>();
    for (const button of document.querySelectorAll<HTMLElement>("[data-board-name-band]")) {
      const strip = button.closest<HTMLElement>('[class~="@container"]')?.parentElement;
      if (strip && strip.getClientRects().length > 0 && strip.getBoundingClientRect().width > 0) strips.add(strip);
    }
    if (strips.size !== 1) throw new Error(`expected one visible strip with a name slot, found ${strips.size}`);
    const strip = [...strips][0];
    const sr = strip.getBoundingClientRect();
    const tabs = [...strip.querySelectorAll<HTMLElement>('[role="tab"]')].map((tab) => {
      const r = tab.getBoundingClientRect();
      return { word: tab.innerText.trim(), left: r.left, right: r.right, top: r.top, height: r.height };
    });
    const button = strip.querySelector<HTMLElement>("[data-board-name-band]");
    const drawn = button !== null && button.getClientRects().length > 0;
    return {
      stripLeft: sr.left,
      stripRight: sr.right,
      tabs,
      room: sr.right - tabs[tabs.length - 1].right,
      name: drawn ? button!.getBoundingClientRect().width : null,
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
}

/** The drawing column and the page, on a phone. */
async function measurePinned(page: Page) {
  return page.evaluate(() => {
    const main = document.querySelector("main")!.getBoundingClientRect();
    const panel = document.querySelector("[data-viewer-panel]")!.getBoundingClientRect();
    return {
      innerHeight: window.innerHeight,
      innerWidth: window.innerWidth,
      scrollHeight: document.documentElement.scrollHeight,
      scrollWidth: document.documentElement.scrollWidth,
      main: main.height,
      panel: panel.height,
    };
  });
}

/**
 * On a phone (D-15, D-21, D-28): the four tab words whole on one line at every upright width, the board's name
 * stepping aside where the strip has no room for it (plan 18-02's rule), one card across, the page never
 * scrolling as a whole with GUIDE open, and VIEWER getting RAILS' own 50dvh pin and NOSE · CENTER · TAIL switch
 * back.
 */
test.describe("RAILS' GUIDE on a phone (18-05)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "the phones' GUIDE; the computer's is the block above");
    await dismissStrips(page);
    await forgetOpenBoardOnEveryLoad(page);
  });

  test("upright at 360, 375, 390, 412 and 430: four tabs on one line inside the strip, the name only where it has room", async ({
    page,
  }, testInfo) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await openPreset(page, "shortboard", "RAILS");
    await openGuide(page, COUNT);
    const rooms: Record<number, number> = {};
    for (const width of [360, 375, 390, 412, 430]) {
      await page.setViewportSize({ width, height: 844 });
      await expect.poll(() => page.evaluate(() => window.innerWidth)).toBe(width);
      await expect.poll(async () => (await measureRailsStrip(page)).scrollWidth, { timeout: 5_000 }).toBeLessThanOrEqual(width);
      const m = await measureRailsStrip(page);
      const where = `${testInfo.project.name} at ${width}`;
      rooms[width] = Math.round(m.room * 10) / 10;
      console.log(`[18-05] ${where}: room after GUIDE ${m.room.toFixed(1)}, name ${m.name === null ? "not drawn" : `drawn ${m.name.toFixed(1)} wide`}`);
      expect(m.tabs.map((tab) => tab.word), where).toEqual(TABS);
      expect(new Set(m.tabs.map((tab) => Math.round(tab.top))).size, `${where}: the four tabs share one top`).toBe(1);
      // One line each: no tab is taller than the others (a word wrapped onto a second line would double one).
      expect(new Set(m.tabs.map((tab) => Math.round(tab.height))).size, `${where}: every tab word on one line`).toBe(1);
      for (const tab of m.tabs) {
        expect(tab.left, `${where}: ${tab.word} inside the strip`).toBeGreaterThanOrEqual(m.stripLeft - 0.5);
        expect(tab.right, `${where}: ${tab.word} inside the strip`).toBeLessThanOrEqual(m.stripRight + 0.5);
      }
      expect(m.scrollWidth, `${where}: no sideways scroll`).toBeLessThanOrEqual(m.innerWidth);
      if (m.room < NAME_ROOM) expect(m.name, `${where}: under ${NAME_ROOM} dots of room the name is not drawn`).toBeNull();
      else {
        expect(m.name, `${where}: with ${NAME_ROOM} dots of room the name is drawn`).not.toBeNull();
        expect(m.name!, `${where}: the name's box`).toBeGreaterThanOrEqual(44);
      }
    }
    test.info().annotations.push({ type: "room after GUIDE", description: JSON.stringify(rooms) });
    // Plan 18-02 predicted the name gives way on RAILS below about 400 dots.
    expect(rooms[360]).toBeLessThan(NAME_ROOM);
    expect(rooms[375]).toBeLessThan(NAME_ROOM);
    expect(rooms[390]).toBeLessThan(NAME_ROOM);
    expect(rooms[412]).toBeGreaterThanOrEqual(NAME_ROOM);
    expect(rooms[430]).toBeGreaterThanOrEqual(NAME_ROOM);
  });

  test("upright: one card across, the page never scrolls, GUIDE holds 66dvh, and VIEWER gets its 50dvh and NOSE · CENTER · TAIL back", async ({
    page,
  }, testInfo) => {
    test.setTimeout(240_000);
    const upright = testInfo.project.name === "android" ? { width: 412, height: 915 } : { width: 390, height: 844 };
    await page.setViewportSize(upright);
    await openPreset(page, "shortboard", "RAILS");
    await expect(railSwitch(page)).toBeVisible({ timeout: 60_000 });
    const viewerBefore = await measurePinned(page);
    await openGuide(page, COUNT);
    await expect(railSwitch(page)).toHaveCount(0);

    expect((await columnsAcross(page, guideSlug(RAILS_GUIDE_GROUPS[0].name))).columns).toBe(1);
    for (const card of await readGuideCards(page)) {
      expect(card.clipped, `${card.card}: text cut off`).toEqual([]);
      expect(card.outside, `${card.card}: a part outside the card`).toEqual([]);
      expect(card.nameMeetsTag, `${card.card}: the name runs into its tag`).toBe(false);
    }
    const pinned = await measurePinned(page);
    test.info().annotations.push({ type: "pinned", description: JSON.stringify({ viewerBefore, pinned }) });
    expect(pinned.scrollHeight).toBe(pinned.innerHeight);
    expect(pinned.scrollWidth).toBeLessThanOrEqual(pinned.innerWidth);
    expect(pinned.main).toBeLessThanOrEqual(0.66 * pinned.innerHeight + 1);
    expect(pinned.panel).toBeGreaterThanOrEqual(0.66 * pinned.innerHeight - 41);

    const last = guideCard(page, RAILS_GUIDE_WORDS[COUNT - 1].id).locator("[data-guide-how]");
    await last.scrollIntoViewIfNeeded();
    await expect(last).toBeInViewport({ ratio: 0.99 });
    expect((await measurePinned(page)).scrollHeight).toBe(pinned.innerHeight);

    // Back to VIEWER: RAILS' own pin and its rail switch, exactly as before GUIDE was opened.
    await page.getByRole("tab", { name: "VIEWER", exact: true }).click();
    await expect(guide(page)).toHaveCount(0);
    await expect(railSwitch(page)).toBeVisible();
    await expect(railSwitch(page).getByRole("tab")).toHaveText(["NOSE", "CENTER", "TAIL"]);
    const viewerAfter = await measurePinned(page);
    expect(viewerAfter.main).toBeLessThanOrEqual(0.5 * viewerAfter.innerHeight + 1);
    expect(Math.abs(viewerAfter.main - viewerBefore.main)).toBeLessThanOrEqual(1);
  });
});
