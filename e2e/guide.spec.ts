import { expect, test, type Locator, type Page } from "@playwright/test";
import { GUIDE_COPY } from "../components/guide/guide-copy";
import { GUIDE_PAGE_WORDS, GUIDE_WORDS, guidePageWords } from "../components/guide/guide-words";
import { GUIDE_IMPERIAL_FIGURE, guideImperialFigures } from "../components/guide/words/metric-sayings";
import { presetDesignFields } from "../lib/blanks/preset-blanks";
import { formatRockerNote } from "../lib/geometry/custom-rocker";
import { guideTemplateInput } from "../lib/geometry/__fixtures__/guide-template-input";
import { guideRockerInput } from "../lib/geometry/__fixtures__/guide-rocker-input";
import { GUIDE_PAGES, guideSlug, type GuidePage } from "../lib/geometry/guide-card";
import { buildTemplateGuide, TEMPLATE_GUIDE_CARD_IDS } from "../lib/geometry/guide-outline";
import { rockerGuideVariants } from "../lib/geometry/guide-rocker";
import { BOARD_PRESETS } from "../lib/geometry/presets";
import { forgetOpenBoardOnEveryLoad } from "./helpers/open-board";
import { columnsAcross, dismissStrips, guide, guideCard, guideCards, openGuide, openPreset, readGuideCards, setMetricUnits } from "./helpers/guide";
import { goToScreen, type ScreenLabel } from "./helpers/screens";

/**
 * All five GUIDEs together (Phase 18, plan 18-08, R13): every page's strip ends in GUIDE, every page shows
 * its own cards in the founder's order, the cards sit three, two and one across as the window narrows and
 * one across on a phone, no word on a card is cut off or sits on another, nothing on a card can be pressed,
 * the cards follow the board the moment a slider moves or another preset opens, and a Metric shaper reads
 * no inch figure anywhere in any GUIDE. Each page's own spec proves its page in detail; this one proves the
 * five agree.
 *
 * Every word and figure comes from the modules the pages themselves read (`components/guide/guide-words.ts`,
 * the five builders) — never typed here.
 */

const LABEL: Record<GuidePage, ScreenLabel> = {
  template: "TEMPLATE",
  rocker: "ROCKER",
  rails: "RAILS",
  volume: "VOLUME",
  fins: "FINS",
};
/** The phones walk VOLUME first, the page the GUIDE was first built on (18-01). */
const PHONE_ORDER: readonly GuidePage[] = ["volume", "template", "rocker", "rails", "fins"];
/** D-21's line (plan 18-02): the board's name is drawn only with 50 dots of room after the last tab — a
 * 44-dot box beside a 6-dot gap. */
const NAME_BOX_MIN = 44;
const NAME_ROOM = 50;
/** The narrowest a card may draw (UI-SPEC). */
const CARD_MIN = 236;

const countOf = (page: GuidePage) => guidePageWords(page).cards.length;

/** The page's own tab strip: the one tablist holding the GUIDE tab (RAILS' phone NOSE · CENTER · TAIL switch
 * is a second tablist). */
const pageStrip = (page: Page): Locator =>
  page.getByRole("tablist").filter({ has: page.getByRole("tab", { name: GUIDE_COPY.tab, exact: true }) });

/** Walks to a page and opens its GUIDE. */
async function openPageGuide(page: Page, guidePage: GuidePage): Promise<void> {
  await goToScreen(page, LABEL[guidePage]);
  await openGuide(page, countOf(guidePage));
}

/** Resizes and lets the page settle: two frames, then nothing scrolling sideways for a moment. */
async function resizeTo(page: Page, size: { width: number; height: number }): Promise<void> {
  await page.setViewportSize(size);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), { timeout: 5_000 })
    .toBe(true)
    .catch(() => undefined);
}

/**
 * The strip read off the page: each tab's words as the shaper sees them (`innerText`), its box and whether
 * its words fit it; the strip's own box; the board's name box when it is drawn; the page's sideways scroll.
 */
async function readStrip(page: Page) {
  const strip = pageStrip(page);
  await expect(strip).toHaveCount(1);
  return strip.evaluate((list) => {
    // The strip is the row around the tab list and the name's slot.
    const s = (list.parentElement ?? list).getBoundingClientRect();
    const tabs = [...list.querySelectorAll<HTMLElement>('[role="tab"]')].map((tab) => {
      const r = tab.getBoundingClientRect();
      return { words: tab.innerText, top: r.top, bottom: r.bottom, left: r.left, right: r.right, fits: tab.scrollWidth <= tab.clientWidth + 1 };
    });
    const names = [...document.querySelectorAll<HTMLElement>("[data-board-name-band]")].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
    });
    const name = names.length > 0 ? names[0].getBoundingClientRect() : null;
    return {
      strip: { top: s.top, bottom: s.bottom, left: s.left, right: s.right },
      tabs,
      name: name ? { width: name.width, height: name.height } : null,
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    };
  });
}

/** Edge #1 and D-21 at one width: every tab word whole on one line, all on one top inside the strip, nothing
 * scrolling sideways, and the board's name either not drawn or drawn in a box at least 44 dots wide. */
async function expectStripRule(page: Page, where: string): Promise<void> {
  const read = await readStrip(page);
  test.info().annotations.push({ type: "strip", description: `${where}: ${JSON.stringify(read)}` });
  expect(read.tabs.length, where).toBeGreaterThanOrEqual(2);
  expect(read.tabs[read.tabs.length - 1].words, `${where}: GUIDE is the last tab`).toBe(GUIDE_COPY.tab);
  const top = read.tabs[0].top;
  for (const tab of read.tabs) {
    expect(tab.words, `${where}: ${tab.words} on one line`).not.toContain("\n");
    expect(tab.fits, `${where}: ${tab.words} whole`).toBe(true);
    expect(Math.abs(tab.top - top), `${where}: ${tab.words} on the strip's one top`).toBeLessThanOrEqual(0.5);
    expect(tab.left, `${where}: ${tab.words} inside the strip`).toBeGreaterThanOrEqual(read.strip.left - 0.5);
    expect(tab.right, `${where}: ${tab.words} inside the strip`).toBeLessThanOrEqual(read.strip.right + 0.5);
    expect(tab.right, `${where}: ${tab.words} on screen`).toBeLessThanOrEqual(read.innerWidth + 0.5);
  }
  expect(read.scrollWidth, `${where}: nothing scrolls sideways`).toBeLessThanOrEqual(read.innerWidth);
  if (read.name) expect(read.name.width, `${where}: the board's name, when drawn, has its 44-dot box`).toBeGreaterThanOrEqual(NAME_BOX_MIN - 0.5);
  // The room rule itself, read off the strip rather than a list of where the name shows: drawn with 50 dots
  // of room after the last tab, not drawn with less (a dot either side of the line is left to the browser).
  const room = read.strip.right - read.tabs[read.tabs.length - 1].right;
  if (room >= NAME_ROOM + 1) expect(read.name, `${where}: ${room.toFixed(1)} dots of room, so the name is drawn`).not.toBeNull();
  if (room <= NAME_ROOM - 1) expect(read.name, `${where}: ${room.toFixed(1)} dots of room, so the name is not drawn`).toBeNull();
}

/**
 * Every drawing label on every card, measured by the browser: any two that overlap (beyond a dot of glyph
 * spacing), and any that leaves its own window (a strip label the drawing). Each card is scrolled into view
 * first so it is laid out where it is read.
 */
async function drawingCollisions(page: Page, guidePage: GuidePage): Promise<string[]> {
  const out: string[] = [];
  for (const card of guidePageWords(guidePage).cards) {
    const el = guideCard(page, card.id);
    await el.scrollIntoViewIfNeeded();
    const found = await el.evaluate((cardEl) => {
      const svg = cardEl.querySelector("svg[data-guide-cartoon]")!;
      const art = svg.getBoundingClientRect();
      const labels = [...svg.querySelectorAll("text")].map((t) => {
        const clip = t.closest("g[clip-path]");
        const frame = clip?.parentElement?.querySelector(":scope > rect") ?? null;
        const within = frame ? frame.getBoundingClientRect() : art;
        return { text: t.textContent ?? "", box: t.getBoundingClientRect(), within };
      });
      const problems: string[] = [];
      labels.forEach((a, i) => {
        const w = a.within;
        if (a.box.left < w.left - 1 || a.box.right > w.right + 1 || a.box.top < w.top - 1 || a.box.bottom > w.bottom + 1) {
          problems.push(`"${a.text}" leaves its window`);
        }
        for (let j = i + 1; j < labels.length; j++) {
          const b = labels[j].box;
          const across = Math.min(a.box.right, b.right) - Math.max(a.box.left, b.left);
          const down = Math.min(a.box.bottom, b.bottom) - Math.max(a.box.top, b.top);
          if (across > 1 && down > 2) problems.push(`"${a.text}" meets "${labels[j].text}"`);
        }
      });
      return problems;
    });
    for (const problem of found) out.push(`${card.id}: ${problem}`);
  }
  return out;
}

/** Every card's layout: none narrower than 236 or wider than its list, no text cut off, nothing outside it. */
async function expectCardsLaidOut(page: Page, where: string): Promise<void> {
  const listWidth = await guide(page)
    .locator("ul")
    .first()
    .evaluate((el) => el.getBoundingClientRect().width);
  for (const card of await readGuideCards(page)) {
    expect(card.clipped, `${where} ${card.card}: text cut off`).toEqual([]);
    expect(card.outside, `${where} ${card.card}: a part outside the card`).toEqual([]);
    expect(card.nameMeetsTag, `${where} ${card.card}: the name runs into its tag`).toBe(false);
    expect(card.width, `${where} ${card.card}`).toBeGreaterThanOrEqual(CARD_MIN - 0.5);
    expect(card.width, `${where} ${card.card}`).toBeLessThanOrEqual(listWidth + 0.5);
  }
  const sideways = await guide(page).evaluate((el) => ({
    guide: el.scrollWidth <= el.clientWidth + 1,
    cards: [...el.querySelectorAll<HTMLElement>("[data-guide-card]")].filter((c) => c.scrollWidth > c.clientWidth + 1).map((c) => c.dataset.guideCard),
  }));
  expect(sideways.guide, `${where}: the GUIDE scrolls sideways`).toBe(true);
  expect(sideways.cards, `${where}: a card scrolls sideways`).toEqual([]);
}

/** The board's sidebar values: every control's value and every readout's words. */
async function sidebarValues(page: Page): Promise<string> {
  return page.locator("aside").first().evaluate((aside) => {
    const inputs = [...aside.querySelectorAll<HTMLInputElement>("input")].map((i) => `${i.name}|${i.value}|${i.checked}`);
    const aria = [...aside.querySelectorAll<HTMLElement>("[aria-valuenow], [aria-checked], [aria-pressed]")].map(
      (el) => `${el.getAttribute("aria-valuenow")}|${el.getAttribute("aria-checked")}|${el.getAttribute("aria-pressed")}`,
    );
    return JSON.stringify({ text: (aside as HTMLElement).innerText, inputs, aria });
  });
}

test.describe("all five GUIDEs on a computer (18-08)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the computer's GUIDEs; the phones' are the next block");
    await dismissStrips(page);
    await forgetOpenBoardOnEveryLoad(page);
  });

  test("every strip ends in GUIDE, FINS has no MODEL INFO, and each page's groups and cards are the words page's, in order", async ({
    page,
  }) => {
    test.setTimeout(600_000);
    await page.setViewportSize({ width: 1280, height: 800 });
    await openPreset(page, "shortboard", "TEMPLATE");
    for (const words of GUIDE_PAGE_WORDS) {
      await goToScreen(page, LABEL[words.page]);
      const tabs = pageStrip(page).getByRole("tab");
      await expect(tabs.last(), words.page).toHaveText(GUIDE_COPY.tab, { useInnerText: true });
      if (words.page === "fins") await expect(page.getByRole("tab", { name: "MODEL INFO" })).toHaveCount(0);
      await openGuide(page, words.cards.length);
      await expect(guide(page)).toHaveAttribute("aria-label", GUIDE_COPY.regionLabel(words.page));

      await expect(guide(page).locator("[data-guide-group]"), words.page).toHaveCount(words.groups.length);
      const groups = await guide(page)
        .locator("[data-guide-group]")
        .evaluateAll((els) => els.map((el) => el.getAttribute("data-guide-group")));
      expect(groups, words.page).toEqual(words.groups.map((g) => guideSlug(g.name)));
      for (const group of words.groups) {
        const ids = await guide(page)
          .locator(`[data-guide-group="${guideSlug(group.name)}"] [data-guide-card]`)
          .evaluateAll((els) => els.map((el) => el.getAttribute("data-guide-card")));
        expect(ids, `${words.page} ${group.name}`).toEqual(words.cards.filter((c) => c.group === group.name).map((c) => c.id));
      }
      // Every card has its drawing, its two sentences and its How to shape note; only FINS' fourteen a Model info note.
      for (const card of words.cards) {
        const el = guideCard(page, card.id);
        await expect(el.locator("svg[data-guide-cartoon]"), card.id).toHaveCount(1);
        await expect(el.locator("[data-guide-text]"), card.id).toHaveCount(1);
        await expect(el.locator("[data-guide-how]"), card.id).toHaveCount(1);
      }
      await expect(guideCards(page).locator("[data-guide-info]"), words.page).toHaveCount(words.cards.filter((c) => c.info !== null).length);
      // The no-inch rule the Metric test leans on does find the Imperial figures an Imperial shaper reads here.
      expect(GUIDE_IMPERIAL_FIGURE.test(await guide(page).innerText()), `${words.page}: an Imperial GUIDE reads inches`).toBe(true);
    }
    expect(GUIDE_WORDS).toHaveLength(84);
    expect(GUIDE_PAGE_WORDS.map((p) => p.cards.length)).toEqual([22, 14, 17, 8, 23]);
    expect(GUIDE_PAGE_WORDS.map((p) => p.cards.filter((c) => c.info !== null).length)).toEqual([0, 0, 0, 0, 14]);
  });

  test("three cards across at 1280, two at 1024, one at 820 — none narrower than 236, no text cut off — and the stacked layout at 819", async ({
    page,
  }) => {
    test.setTimeout(600_000);
    await page.setViewportSize({ width: 1280, height: 800 });
    await openPreset(page, "shortboard", "TEMPLATE");
    for (const words of GUIDE_PAGE_WORDS) {
      await openPageGuide(page, words.page);
      for (const [width, across] of [
        [1280, 3],
        [1024, 2],
        [820, 1],
      ] as const) {
        await resizeTo(page, { width, height: 800 });
        for (const group of words.groups) {
          const inGroup = words.cards.filter((c) => c.group === group.name).length;
          const read = await columnsAcross(page, guideSlug(group.name));
          expect(read.columns, `${words.page} ${group.name} at ${width}`).toBe(Math.min(across, inGroup));
        }
        await expectCardsLaidOut(page, `${words.page} at ${width}`);
        if (width === 820) {
          const shell = await page.evaluate(() => {
            const aside = document.querySelector("aside")!.getBoundingClientRect();
            const main = document.querySelector("main")!.getBoundingClientRect();
            return aside.right <= main.left + 1;
          });
          expect(shell, `${words.page}: the desktop shell at 820`).toBe(true);
        }
      }
      await resizeTo(page, { width: 1280, height: 800 });
    }
    // One dot narrower and the page is the stacked layout: the drawing above, the controls beneath.
    await resizeTo(page, { width: 819, height: 800 });
    const stacked = await page.evaluate(() => {
      const aside = document.querySelector("aside")!.getBoundingClientRect();
      const main = document.querySelector("main")!.getBoundingClientRect();
      return aside.top >= main.bottom - 1;
    });
    expect(stacked).toBe(true);
  });

  test("no drawing label sits on another or leaves its window, on any card of any page, at 1024", async ({ page }) => {
    test.setTimeout(600_000);
    await page.setViewportSize({ width: 1024, height: 768 });
    await openPreset(page, "shortboard", "TEMPLATE");
    const problems: string[] = [];
    for (const guidePage of GUIDE_PAGES) {
      await openPageGuide(page, guidePage);
      problems.push(...(await drawingCollisions(page, guidePage)));
    }
    expect(problems).toEqual([]);
  });

  test("nothing on a card can be pressed, and pressing a page's first card changes no value in its sidebar (D-10)", async ({ page }) => {
    test.setTimeout(600_000);
    await page.setViewportSize({ width: 1280, height: 800 });
    await openPreset(page, "shortboard", "TEMPLATE");
    for (const words of GUIDE_PAGE_WORDS) {
      await openPageGuide(page, words.page);
      await expect(guideCards(page).locator('button, a, input, select, textarea, [role="button"], [tabindex]'), words.page).toHaveCount(0);
      const before = await sidebarValues(page);
      const first = guideCard(page, words.cards[0].id);
      await first.click();
      await first.locator("svg").click();
      expect(await sidebarValues(page), words.page).toBe(before);
      await expect(guide(page), words.page).toBeVisible();
    }
  });

  test("the cards follow the board: a slider moved redraws its card in the same render, another preset redraws every card", async ({
    page,
  }) => {
    test.setTimeout(600_000);
    await page.setViewportSize({ width: 1280, height: 800 });
    await openPreset(page, "shortboard", "TEMPLATE");
    await openGuide(page, countOf("template"));
    const width = guideCard(page, TEMPLATE_GUIDE_CARD_IDS.width);
    const tag = width.locator("[data-guide-tag]");
    const push = width.locator('path[stroke="var(--outline-push-line)"]').first();
    const before = { tag: await tag.innerText(), d: await push.getAttribute("d") };
    // The sidebar's Width slider: the slider in the row whose label line reads "Width — …" (SliderRow).
    const slider = page.locator("aside").getByText(/^Width — /).locator("xpath=..").getByRole("slider");
    // A key press before React owns the slider is lost, so press until the board takes it (one step, Imperial 1/8").
    await expect(async () => {
      await slider.focus();
      await page.keyboard.press("ArrowRight");
      await expect(tag).not.toHaveText(before.tag, { timeout: 2_000 });
    }).toPass({ timeout: 60_000 });
    const after = { tag: await tag.innerText(), d: await push.getAttribute("d") };
    expect(after.d).not.toBe(before.d);
    await expect(guide(page)).toBeVisible();

    // Opening the Fish from the home page: every card is the Fish's — its swallow tail on this board.
    const fish = buildTemplateGuide(guideTemplateInput("fish"), "imperial");
    const shortboard = buildTemplateGuide(guideTemplateInput("shortboard"), "imperial");
    for (const id of [TEMPLATE_GUIDE_CARD_IDS.squash, TEMPLATE_GUIDE_CARD_IDS.swallow]) {
      expect(fish.get(id)!.tag, id).not.toEqual(shortboard.get(id)!.tag);
    }
    await openPreset(page, "fish", "TEMPLATE");
    await openGuide(page, countOf("template"));
    for (const id of [TEMPLATE_GUIDE_CARD_IDS.squash, TEMPLATE_GUIDE_CARD_IDS.swallow]) {
      const read = guideCard(page, id).locator("[data-guide-tag]");
      if (fish.get(id)!.tag.kind === "none") await expect(read, id).toHaveCount(0);
      else await expect(read, id).toHaveText(fish.get(id)!.tag.text);
    }
  });

  test("a Metric shaper reads no inch or foot figure anywhere in any GUIDE, the blank's own name and rocker code aside", async ({
    page,
  }) => {
    test.setTimeout(600_000);
    await setMetricUnits(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await openPreset(page, "shortboard", "TEMPLATE");
    // The two strings CLAUDE.md Rule 2 lets a Metric shaper read in inches: this board's blank's name, and
    // every maker's rocker code a ROCKER card can show (its own, and each one a card pushes).
    const shortboard = presetDesignFields(BOARD_PRESETS.find((p) => p.id === "shortboard")!);
    const exempt = [`${shortboard.blank.copy.vendor} ${shortboard.blank.copy.name}`];
    for (const plan of Object.values(rockerGuideVariants(guideRockerInput("shortboard"), "metric"))) {
      for (const pushed of plan.pushes) if (pushed.blank?.rocker?.changes.length) exempt.push(formatRockerNote(pushed.blank.rocker));
    }
    const allExempt = [...exempt, ...exempt.map((s) => s.toUpperCase())];
    for (const guidePage of GUIDE_PAGES) {
      await openPageGuide(page, guidePage);
      // What the shaper sees (innerText, capitals and all), and each part's own words (textContent, case kept).
      const seen = await guide(page).innerText();
      const parts = await guide(page)
        .locator("[data-guide-intro], h3, h4, [data-guide-tag], [data-guide-caption], [data-guide-text], [data-guide-info], [data-guide-how], svg text")
        .evaluateAll((els) => els.map((el) => el.textContent ?? ""));
      expect(parts.length, guidePage).toBeGreaterThan(countOf(guidePage) * 3);
      expect(guideImperialFigures(seen, allExempt), `${guidePage}: ${seen}`).toEqual([]);
      for (const text of parts) expect(guideImperialFigures(text, allExempt), `${guidePage}: ${text}`).toEqual([]);
    }
  });
});

test.describe("all five GUIDEs on a phone (18-08)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "the phones' GUIDEs; the computer's are the block above");
    await dismissStrips(page);
    await forgetOpenBoardOnEveryLoad(page);
  });

  test("upright, VOLUME first: one card across, the page never scrolls, the pinned area holds 66dvh, and no label meets another at 390", async ({
    page,
  }, testInfo) => {
    test.setTimeout(900_000);
    const upright = testInfo.project.name === "android" ? { width: 412, height: 915 } : { width: 390, height: 844 };
    await page.setViewportSize(upright);
    await openPreset(page, "shortboard", "VOLUME");
    const problems: string[] = [];
    for (const guidePage of PHONE_ORDER) {
      await page.setViewportSize(upright);
      await openPageGuide(page, guidePage);
      const words = guidePageWords(guidePage);
      for (const group of words.groups) {
        expect((await columnsAcross(page, guideSlug(group.name))).columns, `${guidePage} ${group.name}`).toBe(1);
      }
      await expectCardsLaidOut(page, `${guidePage} upright`);
      const pinned = await page.evaluate(() => {
        const main = document.querySelector("main")!.getBoundingClientRect();
        const panel = document.querySelector("[data-guide]")!.closest("[data-viewer-panel]")!.getBoundingClientRect();
        return {
          innerHeight: window.innerHeight,
          innerWidth: window.innerWidth,
          scrollHeight: document.documentElement.scrollHeight,
          scrollWidth: document.documentElement.scrollWidth,
          main: main.height,
          panel: panel.height,
        };
      });
      test.info().annotations.push({ type: `${guidePage} pinned`, description: JSON.stringify(pinned) });
      expect(pinned.scrollHeight, `${guidePage}: the page never scrolls`).toBe(pinned.innerHeight);
      expect(pinned.scrollWidth, `${guidePage}: nothing scrolls sideways`).toBeLessThanOrEqual(pinned.innerWidth);
      expect(pinned.main, `${guidePage}: the pinned column`).toBeLessThanOrEqual(0.66 * pinned.innerHeight + 1);
      expect(pinned.panel, `${guidePage}: the card`).toBeGreaterThanOrEqual(0.66 * pinned.innerHeight - 41);
      // The drawing labels, measured on a 390-dot phone.
      await resizeTo(page, { width: 390, height: 844 });
      problems.push(...(await drawingCollisions(page, guidePage)));
    }
    expect(problems).toEqual([]);
  });

  test("held sideways: the desktop shell on every page, the cards whole, nothing scrolling sideways", async ({ page }, testInfo) => {
    test.setTimeout(900_000);
    const sideways = testInfo.project.name === "android" ? { width: 863, height: 360 } : { width: 844, height: 390 };
    await page.setViewportSize(sideways);
    await openPreset(page, "shortboard", "VOLUME");
    for (const guidePage of PHONE_ORDER) {
      await openPageGuide(page, guidePage);
      const side = await page.evaluate(() => {
        const aside = document.querySelector("aside")!.getBoundingClientRect();
        const main = document.querySelector("main")!.getBoundingClientRect();
        return { besides: aside.right <= main.left + 1, scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth };
      });
      expect(side.besides, `${guidePage}: the sidebar beside the drawing column`).toBe(true);
      expect(side.scrollWidth, guidePage).toBeLessThanOrEqual(side.innerWidth);
      for (const card of await readGuideCards(page)) {
        expect(card.clipped, `${guidePage} ${card.card}: text cut off`).toEqual([]);
        expect(card.width, `${guidePage} ${card.card}`).toBeGreaterThanOrEqual(CARD_MIN - 0.5);
      }
    }
  });
});

test.describe("every page's strip at every width a shaper uses (18-08, edge #1, D-21)", () => {
  test.beforeEach(async ({ page }) => {
    await dismissStrips(page);
    await forgetOpenBoardOnEveryLoad(page);
  });

  test("at 360, 375, 390, 412 and 430 on a phone and 820 on a computer: tab words whole on one top, nothing sideways, the name whole or not drawn", async ({
    page,
  }, testInfo) => {
    test.setTimeout(900_000);
    const desktop = testInfo.project.name === "desktop";
    const widths = desktop ? [820] : [360, 375, 390, 412, 430];
    const height = desktop ? 800 : 844;
    await page.setViewportSize({ width: widths[0], height });
    await openPreset(page, "shortboard", "VOLUME");
    for (const guidePage of PHONE_ORDER) {
      await goToScreen(page, LABEL[guidePage]);
      await openGuide(page, countOf(guidePage));
      for (const width of widths) {
        await resizeTo(page, { width, height });
        await expectStripRule(page, `${guidePage} at ${width}`);
      }
      await resizeTo(page, { width: widths[0], height });
    }
  });
});
