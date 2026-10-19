import { devices, expect, test, type Locator, type Page } from "@playwright/test";
import { importedReadout } from "./helpers/imported-readout";
import { goToScreen } from "./helpers/screens";
import { openRocker } from "./helpers/blank-picker";

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
    const card = importedReadout(page.locator("aside"), "From TEMPLATE and ROCKER & FOIL");
    await expect(card).toBeVisible();
    expectComputerLook(await readoutFacts(card), 3, 1);
    await expect(card.locator("[data-readout-foot]")).toBeVisible();
    await expect(card.locator("[data-readout-foot]")).toHaveText("Rail shapes from RAILS");
  });

  test("ROCKER: the From TEMPLATE card — two columns, one row", async ({ page }) => {
    await openRocker(page);
    const card = importedReadout(page.locator("[data-rocker-inputs]"), "From TEMPLATE");
    await expect(card).toBeVisible();
    expectComputerLook(await readoutFacts(card), 2, 1);
    await expect(card.locator("[data-readout-foot]")).toHaveCount(0);
  });

  test("RAILS: the From ROCKER & FOIL card — three columns, one row", async ({ page }) => {
    await page.goto("/design/rails");
    const card = importedReadout(page.locator("aside"), "From ROCKER & FOIL");
    await expect(card).toBeVisible();
    expectComputerLook(await readoutFacts(card), 3, 1);
  });

  test("FINS: the From TEMPLATE card — a squash tail's four figures sit two by two", async ({ page }) => {
    await page.goto("/design/fins");
    const card = importedReadout(page.locator("aside"), "From TEMPLATE");
    await expect(card).toBeVisible();
    await expect(card.locator("dd")).toHaveCount(4);
    expectComputerLook(await readoutFacts(card), 2, 2);
  });

  test("FINS with a swallow tail: five readouts, three columns over two rows, nothing spills", async ({ page }) => {
    await page.goto("/design/outline");
    // Picked client-side and carried to FINS client-side: a page load would lose the board.
    await page.getByRole("button", { name: "swallow", exact: true }).click();
    await goToScreen(page, "FINS");
    const card = importedReadout(page.locator("aside"), "From TEMPLATE");
    await expect(card).toBeVisible();
    await expect(card.locator("dd")).toHaveCount(5);
    expectComputerLook(await readoutFacts(card), 3, 2);
  });

  test("an 820-wide computer window in Metric: nothing spills on any screen", async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 800 });
    await setMetricUnits(page);
    const screens: { path: string; caption: string; scope: string; columns: number; rows: number }[] = [
      { path: "/design/rocker", caption: "From TEMPLATE", scope: "[data-rocker-inputs]", columns: 2, rows: 1 },
      { path: "/design/rails", caption: "From ROCKER & FOIL", scope: "aside", columns: 3, rows: 1 },
      { path: "/design/volume", caption: "From TEMPLATE and ROCKER & FOIL", scope: "aside", columns: 3, rows: 1 },
      { path: "/design/fins", caption: "From TEMPLATE", scope: "aside", columns: 2, rows: 2 },
    ];
    for (const screen of screens) {
      await page.goto(screen.path);
      const card = importedReadout(page.locator(screen.scope), screen.caption);
      await expect(card, screen.path).toBeVisible();
      const facts = await readoutFacts(card);
      expect(facts.spills, `${screen.path} figures crossing the card's edge`).toEqual([]);
      expect(facts.dlOverflow, `${screen.path} list overflow`).toBeLessThanOrEqual(0);
      expect(facts.columns, `${screen.path} columns`).toBe(screen.columns);
      expect(facts.rows, `${screen.path} rows`).toBe(screen.rows);
    }

    // FINS with a swallow tail, carried client-side from TEMPLATE.
    await page.goto("/design/outline");
    await page.getByRole("button", { name: "swallow", exact: true }).click();
    await goToScreen(page, "FINS");
    const swallow = importedReadout(page.locator("aside"), "From TEMPLATE");
    await expect(swallow.locator("dd")).toHaveCount(5);
    const facts = await readoutFacts(swallow);
    expect(facts.spills, "FINS swallow figures crossing the card's edge").toEqual([]);
    expect(facts.dlOverflow).toBeLessThanOrEqual(0);
    expect(facts.columns).toBe(3);
    expect(facts.rows).toBe(2);
  });

  test("VOLUME in Metric: every figure still fits inside its card", async ({ page }) => {
    await setMetricUnits(page);
    await page.goto("/design/volume");
    const card = importedReadout(page.locator("aside"), "From TEMPLATE and ROCKER & FOIL");
    await expect(card).toBeVisible();
    await expect(card.locator("dd")).toHaveText(["182.9 cm", "48.3 cm", "6.4 cm"]);
    expectComputerLook(await readoutFacts(card), 3, 1);
  });
});

// ---------------------------------------------------------------------------------------------------
// Phones. The card's padding is 8px top and bottom and 10px at the sides under BOTH phone switches —
// the width rule (an upright phone) and the short-screen height rule (a phone held sideways) — and it
// must never let a figure cross its edge. Each walk logs the card's measured height so the numbers can
// be quoted (the founder's rule: phone real estate is expensive).
// ---------------------------------------------------------------------------------------------------

// A real sideways iPhone: Playwright's own `iPhone 14 landscape` reports an emulator's 750 x 340, so
// the viewport is swapped for the page Safari actually leaves on hardware, 844 x 340 (built the way
// rocker-live-controls.spec.ts builds it).
const {
  defaultBrowserType: iphoneLandscapeBrowserType,
  viewport: iphoneLandscapeEmulatorViewport,
  ...iphoneLandscapeRest
} = devices["iPhone 14 landscape"];
void iphoneLandscapeBrowserType;
void iphoneLandscapeEmulatorViewport;
const realSidewaysIphone = { ...iphoneLandscapeRest, viewport: { width: 844, height: 340 } };

const { defaultBrowserType: pixel7LandscapeBrowserType, ...pixel7Landscape } = devices["Pixel 7 landscape"];
void pixel7LandscapeBrowserType;

/** Tallest a phone card may stand: the measured heights are 74-117; this leaves room for a label that wraps. */
const MAX_PHONE_CARD_HEIGHT = 125;

/**
 * Walks ROCKER, RAILS, VOLUME and FINS on whatever phone the test runs as: the card is on the page,
 * wears the phone padding, has nothing crossing its edge, stands at most 125 dots tall — and its
 * height is logged.
 */
async function walkPhoneScreens(page: Page, device: string) {
  const screens = [
    { name: "ROCKER", path: "/design/rocker", caption: "From TEMPLATE", scope: "[data-rocker-inputs]" },
    { name: "RAILS", path: "/design/rails", caption: "From ROCKER & FOIL", scope: "aside" },
    { name: "VOLUME", path: "/design/volume", caption: "From TEMPLATE and ROCKER & FOIL", scope: "aside" },
    { name: "FINS", path: "/design/fins", caption: "From TEMPLATE", scope: "aside" },
  ];
  for (const screen of screens) {
    if (screen.name === "ROCKER") await openRocker(page);
    // WebKit can still be finishing the last page's own navigation when the next goto starts ("interrupted
    // by another navigation"), so a goto that was cut off is simply tried again.
    else await expect(async () => void (await page.goto(screen.path))).toPass({ timeout: 60_000 });
    const card = importedReadout(page.locator(screen.scope), screen.caption);
    await expect(card, `${device} ${screen.name}`).toBeVisible();
    await card.scrollIntoViewIfNeeded();
    const facts = await readoutFacts(card);
    console.log(`readout height: ${device} ${screen.name} ${facts.height}px`);
    expect(facts.paddingLeft, `${device} ${screen.name} phone padding`).toBe(10);
    expect(facts.spills, `${device} ${screen.name} figures crossing the card's edge`).toEqual([]);
    expect(facts.dlOverflow).toBeLessThanOrEqual(0);
    expect(facts.height, `${device} ${screen.name} height`).toBeLessThanOrEqual(MAX_PHONE_CARD_HEIGHT);
  }
}

test.describe("the imported dimensions as a readout card — on an upright phone (quick 261018-fg1)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "the phone projects, at their own viewports");
    await dismissChrome(page);
  });

  test("ROCKER, RAILS, VOLUME and FINS: tight padding, nothing crossing the card, heights logged", async ({
    page,
  }, testInfo) => {
    await walkPhoneScreens(page, `upright ${testInfo.project.name}`);
  });
});

test.describe("the imported dimensions as a readout card — on an iPhone held sideways, 844 x 340 (quick 261018-fg1)", () => {
  test.use({ ...realSidewaysIphone });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "iphone", "this describe supplies its own device (a real sideways iPhone)");
    await dismissChrome(page);
  });

  test("ROCKER, RAILS, VOLUME and FINS: tight padding, nothing crossing the card, heights logged", async ({
    page,
  }) => {
    await walkPhoneScreens(page, "sideways iPhone 844x340");
  });

  test("RAILS in Metric: the 30.5 cm labels fit and nothing spills", async ({ page }) => {
    await setMetricUnits(page);
    await page.goto("/design/rails");
    const card = importedReadout(page.locator("aside"), "From ROCKER & FOIL");
    await expect(card).toBeVisible();
    await card.scrollIntoViewIfNeeded();
    await expect(card.locator("dt")).toHaveText(["Nose @ 30.5 cm", "Center", "Tail @ 30.5 cm"]);
    const facts = await readoutFacts(card);
    console.log(`readout height: sideways iPhone 844x340 RAILS (Metric) ${facts.height}px`);
    expect(facts.spills).toEqual([]);
    expect(facts.dlOverflow).toBeLessThanOrEqual(0);
  });
});

test.describe("the imported dimensions as a readout card — on a Pixel 7 held sideways (quick 261018-fg1)", () => {
  test.use({ ...pixel7Landscape });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "android", "this describe supplies its own device (Pixel 7 landscape)");
    await dismissChrome(page);
  });

  test("ROCKER, RAILS, VOLUME and FINS: tight padding, nothing crossing the card, heights logged", async ({
    page,
  }) => {
    await walkPhoneScreens(page, "sideways Pixel 7");
  });
});
