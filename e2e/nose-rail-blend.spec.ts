import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { DEFAULT_BOARD_SPEC } from "../lib/geometry/board";
import { formatDim } from "../lib/geometry/measure-display";
import { hardEdgeEndsAt, noseBlendsFrom, noseEndsAt } from "../lib/geometry/rail-bands";
import { inchesToMm } from "../lib/geometry/units";
import { OPEN_BOARD_STORAGE_KEY } from "../lib/models/open-board";
import { goToScreen } from "./helpers/screens";

/**
 * Nose Rail Blends From and Nose Rail Ends At (quick 261127-kkw — the founder, 2026-11-27: "I think we need to add a
 * center to nose rail blend control like we did for the tail"; "1-5 as suggested, it's for shaping by hand"). The
 * nose's rail as set runs full from the nose tip back to Blends From, fades, and is the centre's rail by Ends At.
 *
 * - RAILS: the Nose Rail card's Advanced fold ends with the note the tail's rows carry, the two rows and Reset.
 *   On a board whose nose rail is the centre's the sliders move their labels and nothing else; on a board whose
 *   nose rail differs they move VOLUME's litres. A reload keeps them.
 *
 * Every expected figure is the app's own: its readers (`noseBlendsFrom`, `noseEndsAt`), its formatter (`formatDim`)
 * and its conversion (`inchesToMm`). The helpers are copied from e2e/rails-advanced.spec.ts, which keeps its own.
 */

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";
const TOOLBAR_TIP_DISMISSAL_KEY = "shaper-toolbar-tip-dismissed";
const BLEND_NOTE = "These controls are invisible here and corresponding controls with visual verification are found on the 3D page.";

type RailKey = "nose" | "center" | "tail";

async function dismissStrips(page: Page) {
  await page.addInitScript((key) => window.sessionStorage.setItem(key, "true"), BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => window.localStorage.setItem(key, "true"), TOOLBAR_TIP_DISMISSAL_KEY);
}

const isPhone = (testInfo: TestInfo) => testInfo.project.name !== "desktop";

/** Opens RAILS and waits for React to have taken over the page, so a click or a key press is never lost. */
async function openRails(page: Page) {
  await dismissStrips(page);
  await page.goto("/design/rails");
  await page.waitForFunction(
    () => {
      const button = document.querySelector("[data-viewer-toolbar] button");
      return !!button && Object.keys(button).some((k) => k.startsWith("__reactProps"));
    },
    undefined,
    { timeout: 60_000 },
  );
}

/** Brings a rail's controls into view: on a phone, its NOSE/CENTER/TAIL tab; on a computer they are always there. */
async function showRail(page: Page, testInfo: TestInfo, key: RailKey): Promise<Locator> {
  if (isPhone(testInfo)) {
    const tab = page.getByRole("tablist").filter({ hasText: "NOSE" }).getByRole("tab", { name: key.toUpperCase() });
    await expect(async () => {
      await tab.click();
      await expect(tab).toHaveAttribute("aria-selected", "true", { timeout: 1_000 });
    }).toPass({ timeout: 15_000 });
  }
  const group = page.locator(`[data-rail-group="${key}"]`);
  await expect(group.getByText(/^Deck Profile — /)).toBeVisible();
  return group;
}

/** Opens a rail's Advanced fold and returns its body. */
async function openAdvanced(group: Locator): Promise<Locator> {
  const heading = group.getByRole("button", { name: /^Advanced [▾▸]$/ });
  const body = heading.locator("xpath=following-sibling::div[1]");
  await expect(async () => {
    if ((await body.count()) === 0) await heading.click();
    await expect(body.getByRole("button", { name: /Reset Advanced Settings/ })).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
  return body;
}

/** The text of each row in an Advanced body, top to bottom. */
async function advancedRows(body: Locator): Promise<string[]> {
  return body.evaluate((el) => Array.from(el.children).map((c) => (c.textContent ?? "").trim()));
}

/** The Nose Rail card with its Advanced fold open. */
async function noseAdvanced(page: Page, testInfo: TestInfo): Promise<{ nose: Locator; body: Locator }> {
  const nose = await showRail(page, testInfo, "nose");
  const body = await openAdvanced(nose);
  return { nose, body };
}

function blendsFromLabel(nose: Locator): Locator {
  return nose.getByText(/^Nose Rail Blends From — /);
}

function endsAtLabel(nose: Locator): Locator {
  return nose.getByText(/^Nose Rail Ends At — /);
}

function blendsFromSlider(page: Page): Locator {
  return page.getByRole("slider", { name: "Nose Rail blends from", exact: true });
}

function endsAtSlider(page: Page): Locator {
  return page.getByRole("slider", { name: "Nose Rail ends at", exact: true });
}

/** VOLUME's Estimated Volume figure ("30.29 L"). */
function estimatedVolume(page: Page): Locator {
  return page.getByText("Estimated Volume", { exact: true }).first().locator("xpath=following-sibling::span[1]/span[1]");
}

/** VOLUME's litres as the page reads them, walked to from wherever the test is. */
async function volumeLitres(page: Page): Promise<string> {
  await goToScreen(page, "VOLUME");
  await expect(estimatedVolume(page)).toHaveText(/^\d+\.\d\d L$/);
  return (await estimatedVolume(page).textContent()) ?? "";
}

type NoseKey = "noseRailBlendsFrom" | "noseRailEndsAt";

/** One of the nose rail's two stored settings in the board this browser keeps (quick 261019-ep5): the number,
 * "absent" when the kept board has no such key, or null when no board is kept yet. */
async function keptNoseRail(page: Page, key: NoseKey): Promise<number | "absent" | null> {
  return page.evaluate(
    ([storageKey, field]) => {
      const raw = window.localStorage.getItem(storageKey);
      if (raw === null) return null;
      const rails = JSON.parse(raw).snapshot.design.rails as Record<string, unknown>;
      return field in rails ? (rails[field] as number) : "absent";
    },
    [OPEN_BOARD_STORAGE_KEY, key] as const,
  );
}

/** A distance as RAILS reads it in Imperial, from the app's own formatter. */
const inches = (value: number) => formatDim(inchesToMm(value), "imperial");

// The stock 6'0" board, which says nothing about its nose's blend: the sliders show 12" and the top of Ends At's
// slider, the board's centre.
const STOCK_LENGTH = DEFAULT_BOARD_SPEC.outline.length;
const STOCK_START = formatDim(noseBlendsFrom({}, STOCK_LENGTH), "imperial");
const STOCK_END = formatDim(noseEndsAt({}, STOCK_LENGTH), "imperial");

test.describe("Nose Rail Blends From and Ends At on RAILS (quick 261127-kkw)", () => {
  test("1. the Nose Rail's Advanced ends the note, Blends From — 12\", Ends At — 36\", Reset; on the stock board, whose nose rail is the centre's, moving Ends At moves its label and not VOLUME's litres", async ({
    page,
  }, testInfo) => {
    test.setTimeout(150_000);
    await openRails(page);
    let { nose, body } = await noseAdvanced(page, testInfo);
    const rows = await advancedRows(body);
    await expect(nose.getByText(BLEND_NOTE, { exact: true })).toBeVisible();
    expect(rows.at(-4)).toBe(BLEND_NOTE);
    expect(rows.at(-3)).toBe(`Nose Rail Blends From — ${STOCK_START}`);
    expect(rows.at(-2)).toBe(`Nose Rail Ends At — ${STOCK_END}`);
    expect(rows.at(-1)).toMatch(/^↺ Reset Advanced Settings$/);
    // The app's own readers give the founder's defaults: 12" and the board's centre, the tail's own.
    expect(STOCK_START).toBe(inches(12));
    expect(STOCK_END).toBe(inches(36));
    expect(STOCK_END).toBe(formatDim(hardEdgeEndsAt({}, STOCK_LENGTH), "imperial"));
    // Both thumbs sit at their slider's ends, and the spoken values agree with the labels.
    await expect(blendsFromSlider(page)).toHaveAttribute("aria-valuetext", `${STOCK_START} from the nose`);
    await expect(endsAtSlider(page)).toHaveAttribute("aria-valuetext", `${STOCK_END} from the nose`);

    const litresUntouched = await volumeLitres(page);

    // Ends At down to its lowest, 2" past Blends From.
    await goToScreen(page, "RAILS");
    ({ nose, body } = await noseAdvanced(page, testInfo));
    await endsAtSlider(page).press("Home");
    await expect(endsAtLabel(nose)).toHaveText(`Nose Rail Ends At — ${inches(14)}`);
    await expect(endsAtSlider(page)).toHaveAttribute("aria-valuetext", `${inches(14)} from the nose`);
    await expect.poll(() => keptNoseRail(page, "noseRailEndsAt")).toBe(inchesToMm(14));

    // The stock nose rail is the centre's rail, so there is nothing to blend: the litres read what they read (D-08).
    expect(await volumeLitres(page)).toBe(litresUntouched);
  });

  test("2. on a board whose nose rail differs (Symmetrical ticked on the nose), Ends At moves VOLUME's litres; a reload keeps both labels, and only the slider that moved is stored", async ({
    page,
  }, testInfo) => {
    test.setTimeout(180_000);
    await openRails(page);
    let { nose } = await noseAdvanced(page, testInfo);
    const symmetrical = nose.getByRole("checkbox", { name: "Symmetrical" });
    await symmetrical.click();
    await expect(symmetrical).toBeChecked();
    await expect(endsAtLabel(nose)).toHaveText(`Nose Rail Ends At — ${STOCK_END}`);

    const litresAtDefaults = await volumeLitres(page);

    await goToScreen(page, "RAILS");
    ({ nose } = await noseAdvanced(page, testInfo));
    await expect(nose.getByRole("checkbox", { name: "Symmetrical" })).toBeChecked();
    await endsAtSlider(page).press("Home");
    await expect(endsAtLabel(nose)).toHaveText(`Nose Rail Ends At — ${inches(14)}`);
    await expect(blendsFromLabel(nose)).toHaveText(`Nose Rail Blends From — ${STOCK_START}`);

    // A shorter nose rail hands over to the centre's sooner: a different amount of foam, enough for two decimals.
    const litresShort = await volumeLitres(page);
    expect(litresShort).not.toBe(litresAtDefaults);

    // The board this browser keeps holds Ends At in millimetres through the app's own conversion, and no Blends
    // From at all: that slider has not moved.
    await expect.poll(() => keptNoseRail(page, "noseRailEndsAt")).toBe(inchesToMm(14));
    expect(await keptNoseRail(page, "noseRailBlendsFrom")).toBe("absent");

    await page.reload();
    await goToScreen(page, "RAILS");
    ({ nose } = await noseAdvanced(page, testInfo));
    await expect(endsAtLabel(nose)).toHaveText(`Nose Rail Ends At — ${inches(14)}`, { timeout: 30_000 });
    await expect(blendsFromLabel(nose)).toHaveText(`Nose Rail Blends From — ${STOCK_START}`);
    await expect(nose.getByRole("checkbox", { name: "Symmetrical" })).toBeChecked();

    // Blends From moved: now it is stored too. (Ends At goes up a page first, to 24": with the end 2" past the
    // start, the start has nowhere to go and its slider is not drawn.)
    await endsAtSlider(page).press("PageUp");
    await expect(endsAtLabel(nose)).toHaveText(`Nose Rail Ends At — ${inches(24)}`);
    await blendsFromSlider(page).press("ArrowRight");
    await expect(blendsFromLabel(nose)).toHaveText(`Nose Rail Blends From — ${inches(12.5)}`);
    await expect.poll(() => keptNoseRail(page, "noseRailBlendsFrom")).toBe(inchesToMm(12.5));
  });
});
