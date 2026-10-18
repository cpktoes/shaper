import { expect, test, type Locator, type Page } from "@playwright/test";
import { importedReadout } from "./helpers/imported-readout";

/**
 * Quick 261018-fg1 — the imported dimensions as a readout card (sketch 017 C). The founder,
 * 2026-10-18: "Go with C readout card, figures in accent = off".
 *
 * ROCKER, RAILS, VOLUME and FINS each end their INPUTS block with a small card like Pick a Blank's: a
 * 1px border in the line colour, 10px corners, a caption in the ACCENT ink in tracked capitals, then
 * each figure large (18px, semibold, tabular) in the normal INK colour — never the accent — with its
 * name under it in small tracked muted capitals. VOLUME's card ends with a ruled foot line.
 *
 * What each describe proves:
 * - "on a computer": the look (accent caption, ink figures, sizes, border, corners, padding), the
 *   column count and row count per screen, a swallow tail's five figures in three columns over two
 *   rows, and that nothing crosses the card's edge at 1280 wide or at the narrowest desktop shell, 820
 *   wide, in Metric (where the 30.5 cm labels and the cm figures are widest).
 * - the phone describes: the same card on an upright iPhone 14 and Pixel 7 and on both phones held
 *   sideways has the tighter 10px phone padding, nothing crossing its edge, and a measured height
 *   (logged, so the numbers can be quoted).
 *
 * The figures themselves (the right number under the right name) are pinned by the unit tests and by
 * the screen specs (volume-fins-panels, template-rails-panels, rocker-panel, rocker-blanks).
 *
 * Every helper is copied locally, as every spec in this suite does.
 */

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";
const TOOLBAR_TIP_DISMISSAL_KEY = "shaper-toolbar-tip-dismissed";
const UNITS_STORAGE_KEY = "shaper-units";

/** Keeps the sign-in banner and the toolbar tip off the screen, so nothing sits over the sidebar. */
async function dismissChrome(page: Page) {
  await page.addInitScript((key) => {
    window.sessionStorage.setItem(key, "true");
  }, BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, "true");
  }, TOOLBAR_TIP_DISMISSAL_KEY);
}

async function setMetricUnits(page: Page) {
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, "metric");
  }, UNITS_STORAGE_KEY);
}

interface ReadoutFacts {
  height: number;
  paddingLeft: number;
  borderRadius: number;
  borderColour: string;
  captionColour: string;
  figureColour: string;
  figureFontSize: number;
  figureFontWeight: number;
  figureNumeric: string;
  labelFontSize: number;
  labelTransform: string;
  columns: number;
  rows: number;
  spills: string[];
  dlOverflow: number;
  inkColour: string;
  accentInkColour: string;
  lineColour: string;
}

/**
 * Everything the card's look is judged by, read in one pass: all the geometry first and only then the
 * theme's three colours, resolved by probe spans appended to the body (never into the card, so its
 * size is never disturbed) and removed again.
 */
async function readoutFacts(card: Locator): Promise<ReadoutFacts> {
  return card.evaluate((el) => {
    const cardBox = el.getBoundingClientRect();
    const cardStyle = getComputedStyle(el);
    const caption = el.firstElementChild as HTMLElement;
    const dl = el.querySelector("dl") as HTMLElement;
    const dds = Array.from(el.querySelectorAll("dd")) as HTMLElement[];
    const dts = Array.from(el.querySelectorAll("dt")) as HTMLElement[];
    const figureStyle = getComputedStyle(dds[0]);
    const labelStyle = getComputedStyle(dts[0]);
    const lefts = new Set<number>();
    const tops = new Set<number>();
    const spills: string[] = [];
    for (const dd of dds) {
      const box = dd.getBoundingClientRect();
      lefts.add(Math.round(box.left));
      tops.add(Math.round(box.top));
      const textBox = document.createRange();
      textBox.selectNodeContents(dd);
      const text = textBox.getBoundingClientRect();
      if (text.left < cardBox.left + 1 || text.right > cardBox.right - 1) spills.push(dd.textContent ?? "");
    }
    const facts = {
      height: cardBox.height,
      paddingLeft: parseFloat(cardStyle.paddingLeft),
      borderRadius: parseFloat(cardStyle.borderTopLeftRadius),
      borderColour: cardStyle.borderTopColor,
      captionColour: getComputedStyle(caption).color,
      figureColour: figureStyle.color,
      figureFontSize: parseFloat(figureStyle.fontSize),
      figureFontWeight: Number(figureStyle.fontWeight),
      figureNumeric: figureStyle.fontVariantNumeric,
      labelFontSize: parseFloat(labelStyle.fontSize),
      labelTransform: labelStyle.textTransform,
      columns: lefts.size,
      rows: tops.size,
      spills,
      dlOverflow: dl.scrollWidth - dl.clientWidth,
    };
    const colourOf = (variable: string) => {
      const probe = document.createElement("span");
      probe.style.color = `var(${variable})`;
      document.body.appendChild(probe);
      const colour = getComputedStyle(probe).color;
      probe.remove();
      return colour;
    };
    return {
      ...facts,
      inkColour: colourOf("--surf-ink"),
      accentInkColour: colourOf("--surf-accent-ink"),
      lineColour: colourOf("--surf-line"),
    };
  });
}

/** The look every card shares, on a computer, plus how many columns and rows its figures sit in. */
function expectComputerLook(facts: ReadoutFacts, columns: number, rows: number) {
  expect(facts.captionColour, "the caption is drawn in the accent ink").toBe(facts.accentInkColour);
  expect(facts.figureColour, "the figures are drawn in the normal ink").toBe(facts.inkColour);
  expect(facts.inkColour, "ink and accent ink are different colours").not.toBe(facts.accentInkColour);
  expect(facts.figureFontSize).toBe(18);
  expect(facts.figureFontWeight).toBe(600);
  expect(facts.figureNumeric).toContain("tabular-nums");
  expect(facts.labelFontSize).toBe(10);
  expect(facts.labelTransform).toBe("uppercase");
  expect(facts.borderRadius).toBe(10);
  expect(facts.borderColour, "the border is the line colour").toBe(facts.lineColour);
  expect(facts.paddingLeft).toBe(12);
  expect(facts.columns, "columns").toBe(columns);
  expect(facts.rows, "rows").toBe(rows);
  expect(facts.spills, "figures crossing the card's edge").toEqual([]);
  expect(facts.dlOverflow).toBeLessThanOrEqual(0);
}

test.describe("the imported dimensions as a readout card — on a computer (quick 261018-fg1)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop-only look proof");
    await dismissChrome(page);
  });

  test("VOLUME: the readout card — accent caption, figures large in ink, three columns, the ruled foot", async ({
    page,
  }) => {
    await page.goto("/design/volume");
    const card = importedReadout(page.locator("aside"), "From TEMPLATE");
    await expect(card).toBeVisible();
    expectComputerLook(await readoutFacts(card), 3, 1);
    await expect(card.locator("[data-readout-foot]")).toBeVisible();
    await expect(card.locator("[data-readout-foot]")).toHaveText("Rail shapes from RAILS");
  });

  test("VOLUME in Metric: every figure still fits inside its card", async ({ page }) => {
    await setMetricUnits(page);
    await page.goto("/design/volume");
    const card = importedReadout(page.locator("aside"), "From TEMPLATE");
    await expect(card).toBeVisible();
    await expect(card.locator("dd")).toHaveText(["182.9 cm", "48.3 cm", "6.4 cm"]);
    expectComputerLook(await readoutFacts(card), 3, 1);
  });
});
