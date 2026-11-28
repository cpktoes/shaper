import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { THREE_D_COPY } from "../components/3d/three-d-copy";
import { BLEND_PINNED_HINT } from "../components/design/blend-pinned-copy";
import { BOARD_LOCK_COPY } from "../components/design/board-lock-copy";
import { hardEdgeBlendsFromSlider } from "../lib/geometry/blank-reasons";
import { DEFAULT_BOARD_SPEC } from "../lib/geometry/board";
import { DEFAULT_FIN_PLACEMENT_SPEC } from "../lib/geometry/fins";
import { formatDim } from "../lib/geometry/measure-display";
import { DEFAULT_RAIL_BAND_SPEC, hardEdgeEndsAt, noseBlendsFrom, noseEndsAt } from "../lib/geometry/rail-bands";
import { inchesToMm } from "../lib/geometry/units";
import { DEFAULT_VOLUME_SPEC } from "../lib/geometry/volume";
import type { DesignSnapshotFields } from "../lib/models/design-snapshot";
import { OPEN_BOARD_STORAGE_KEY, openBoardCopyJson } from "../lib/models/open-board";
import { goToScreen } from "./helpers/screens";

/**
 * Nose Rail Blends From and Nose Rail Ends At (quick 261127-kkw — the founder, 2026-11-27: "I think we need to add a
 * center to nose rail blend control like we did for the tail"; "1-5 as suggested, it's for shaping by hand"). The
 * nose's rail as set runs full from the nose tip back to Blends From, fades, and is the centre's rail by Ends At.
 *
 * - RAILS: the Nose Rail card's Advanced fold ends with the note the tail's rows carry, the two rows and Reset.
 *   On a board whose nose rail is the centre's the sliders move their labels and nothing else; on a board whose
 *   nose rail differs they move VOLUME's litres. A reload keeps them.
 * - The two are coupled as the tail's are; the Nose Rail card's own Reset puts them back (one Undo brings them
 *   back) and never touches the tail's pair, nor the tail's Reset the nose's; Metric reads centimetres; a locked
 *   board greys them; a kept pair that crosses opens as a valid pair.
 * - 3D: Rail Blend Controls shows the nose's two rows above the tail's two, over the very same two values RAILS
 *   shows. Moved on 3D, RAILS reads it; moved on RAILS, 3D follows. A computer and one phone prove it, as
 *   e2e/three-d-hard-edge.spec.ts does for the tail.
 *
 * Every expected figure is the app's own: its readers (`noseBlendsFrom`, `noseEndsAt`), its formatter (`formatDim`)
 * and its conversion (`inchesToMm`). The helpers are copied from e2e/rails-advanced.spec.ts and
 * e2e/three-d-hard-edge.spec.ts, which keep their own.
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

const UNITS_STORAGE_KEY = "shaper-units";

/** A label's centimetres ("Nose Rail Ends At — 46.7 cm" reads 46.7). */
function centimetres(text: string | null): number {
  const match = (text ?? "").replace(/ /g, " ").match(/ — ([\d.]+) cm$/);
  if (!match) throw new Error(`no centimetres in "${text}"`);
  return Number(match[1]);
}

/** The stock board a new visit opens, as the app's own defaults write it. */
function stockBoardFields(): DesignSnapshotFields {
  return {
    outline: DEFAULT_BOARD_SPEC.outline,
    rocker: DEFAULT_BOARD_SPEC.rocker,
    foil: DEFAULT_BOARD_SPEC.foil,
    rails: DEFAULT_RAIL_BAND_SPEC,
    fins: DEFAULT_FIN_PLACEMENT_SPEC,
    volume: DEFAULT_VOLUME_SPEC,
    finsImportTemplate: true,
    railsImportFoilThickness: true,
    boardName: "",
    finSystem: "fcs2",
    blank: null,
  };
}

/** The stock board with the nose's Symmetrical ticked: a nose rail that differs from the centre's, so its blend
 * moves the litres. */
function differingNoseFields(): DesignSnapshotFields {
  const fields = stockBoardFields();
  return { ...fields, rails: { ...fields.rails, nose: { ...fields.rails.nose, symmetrical: true } } };
}

/** Puts a kept board in this browser's storage before the page's first load, as an earlier visit would (through the
 * app's own writer). Locked, it is kept as a saved board of an account — a lock belongs to a saved board. It is kept
 * once, on the first page this browser opens; after that the board's own edits are what the browser keeps. */
async function keepOpenBoard(page: Page, fields: DesignSnapshotFields, locked: boolean) {
  const raw = openBoardCopyJson(
    fields,
    locked
      ? { modelId: "nose-blend-locked-board", ownerId: "nose-blend-test-account", locked: true, dirty: false }
      : { modelId: null, ownerId: null, locked: false, dirty: true },
  );
  await page.addInitScript(
    ([key, value]) => {
      if (window.sessionStorage.getItem("e2e-nose-blend-seeded") === null) {
        window.localStorage.setItem(key, value);
        window.sessionStorage.setItem("e2e-nose-blend-seeded", "1");
      }
    },
    [OPEN_BOARD_STORAGE_KEY, raw] as const,
  );
}

/** One of the tail rail's two stored settings in the board this browser keeps, "absent" or null as `keptNoseRail`. */
async function keptTailRail(page: Page, key: "tailHardEdgeBlendsFrom" | "tailHardEdgeEndsAt"): Promise<number | "absent" | null> {
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

function tailBlendsFromSlider(page: Page): Locator {
  return page.getByRole("slider", { name: "Tail Rail blends from", exact: true });
}

function tailEndsAtSlider(page: Page): Locator {
  return page.getByRole("slider", { name: "Tail Rail ends at", exact: true });
}

test.describe("Nose Rail Blends From and Ends At: coupled, reset, Metric, locked (quick 261127-kkw)", () => {
  test("3. the two are coupled: Ends At stops 2\" past Blends From, and Blends From stops 2\" short of Ends At", async ({
    page,
  }, testInfo) => {
    await openRails(page);
    const { nose } = await noseAdvanced(page, testInfo);
    // From the defaults (12" / 36"): the end as low as it goes is 2" past the start…
    await endsAtSlider(page).press("Home");
    await expect(endsAtLabel(nose)).toHaveText(`Nose Rail Ends At — ${inches(14)}`);
    // …up a page (Base UI moves a slider 10 inches on PageUp) and the start then goes no higher than 2" short of that end…
    await endsAtSlider(page).press("PageUp");
    await expect(endsAtLabel(nose)).toHaveText(`Nose Rail Ends At — ${inches(24)}`);
    await blendsFromSlider(page).press("End");
    await expect(blendsFromLabel(nose)).toHaveText(`Nose Rail Blends From — ${inches(22)}`);
    // …and the end, taken down again, stops 2" past that start.
    await endsAtSlider(page).press("Home");
    await expect(endsAtLabel(nose)).toHaveText(`Nose Rail Ends At — ${inches(24)}`);
    // With the end back at the centre, the start's top is 30" (its own limit).
    await endsAtSlider(page).press("End");
    await expect(endsAtLabel(nose)).toHaveText(`Nose Rail Ends At — ${STOCK_END}`);
    await blendsFromSlider(page).press("End");
    await expect(blendsFromLabel(nose)).toHaveText(`Nose Rail Blends From — ${inches(30)}`);
    await blendsFromSlider(page).press("Home");
    await expect(blendsFromLabel(nose)).toHaveText(`Nose Rail Blends From — ${STOCK_START}`);
  });

  test("4. the Nose Rail's Reset Advanced Settings puts both back and the kept board then holds neither key; one Undo brings both back", async ({
    page,
  }, testInfo) => {
    await openRails(page);
    const { nose, body } = await noseAdvanced(page, testInfo);
    // Both off their slider's ends, one step each (they sit at the ends until moved).
    await blendsFromSlider(page).press("ArrowRight");
    await endsAtSlider(page).press("ArrowLeft");
    await expect(blendsFromLabel(nose)).toHaveText(`Nose Rail Blends From — ${inches(12.5)}`);
    await expect(endsAtLabel(nose)).toHaveText(`Nose Rail Ends At — ${inches(35.5)}`);
    await expect.poll(() => keptNoseRail(page, "noseRailBlendsFrom")).toBe(inchesToMm(12.5));
    await expect.poll(() => keptNoseRail(page, "noseRailEndsAt")).toBe(inchesToMm(35.5));

    await body.getByRole("button", { name: /Reset Advanced Settings/ }).click();
    await expect(blendsFromLabel(nose)).toHaveText(`Nose Rail Blends From — ${STOCK_START}`);
    await expect(endsAtLabel(nose)).toHaveText(`Nose Rail Ends At — ${STOCK_END}`);
    // Reset deletes both stored values rather than writing the defaults.
    await expect.poll(() => keptNoseRail(page, "noseRailBlendsFrom")).toBe("absent");
    await expect.poll(() => keptNoseRail(page, "noseRailEndsAt")).toBe("absent");

    const undo = page.locator("[data-phone-undo-bar]").getByRole("button", { name: "Undo" });
    await undo.click();
    await expect(blendsFromLabel(nose)).toHaveText(`Nose Rail Blends From — ${inches(12.5)}`);
    await expect(endsAtLabel(nose)).toHaveText(`Nose Rail Ends At — ${inches(35.5)}`);
  });

  test("5. each card's Reset puts back its own pair: the tail's leaves the nose's rows as set, and the nose's leaves the tail's", async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    const fields = stockBoardFields();
    await keepOpenBoard(
      page,
      {
        ...fields,
        rails: {
          ...fields.rails,
          tailHardEdgeBlendsFrom: inchesToMm(16),
          tailHardEdgeEndsAt: inchesToMm(28),
          noseRailBlendsFrom: inchesToMm(18),
          noseRailEndsAt: inchesToMm(30),
        },
      },
      false,
    );
    await openRails(page);
    let { nose } = await noseAdvanced(page, testInfo);
    await expect(blendsFromLabel(nose)).toHaveText(`Nose Rail Blends From — ${inches(18)}`, { timeout: 30_000 });
    await expect(endsAtLabel(nose)).toHaveText(`Nose Rail Ends At — ${inches(30)}`);

    // The tail's Reset: the tail's pair goes, the nose's stays.
    const tail = await showRail(page, testInfo, "tail");
    const tailBody = await openAdvanced(tail);
    await expect(tail.getByText(/^Tail Rail Blends From — /)).toHaveText(`Tail Rail Blends From — ${inches(16)}`);
    // One step on a tail slider first, so the board is this visit's own and its kept copy is written.
    await tailBlendsFromSlider(page).press("ArrowRight");
    await expect(tail.getByText(/^Tail Rail Blends From — /)).toHaveText(`Tail Rail Blends From — ${inches(16.5)}`);
    await tailBody.getByRole("button", { name: /Reset Advanced Settings/ }).click();
    await expect(tail.getByText(/^Tail Rail Blends From — /)).toHaveText(`Tail Rail Blends From — ${STOCK_START}`);
    await expect(tail.getByText(/^Tail Rail Ends At — /)).toHaveText(`Tail Rail Ends At — ${STOCK_END}`);
    await expect.poll(() => keptTailRail(page, "tailHardEdgeBlendsFrom")).toBe("absent");
    await expect.poll(() => keptTailRail(page, "tailHardEdgeEndsAt")).toBe("absent");
    expect(await keptNoseRail(page, "noseRailBlendsFrom")).toBe(inchesToMm(18));
    expect(await keptNoseRail(page, "noseRailEndsAt")).toBe(inchesToMm(30));
    ({ nose } = await noseAdvanced(page, testInfo));
    await expect(blendsFromLabel(nose)).toHaveText(`Nose Rail Blends From — ${inches(18)}`);
    await expect(endsAtLabel(nose)).toHaveText(`Nose Rail Ends At — ${inches(30)}`);

    // The tail's pair set again, then the nose's Reset: the nose's pair goes, the tail's stays.
    const tailAgain = await showRail(page, testInfo, "tail");
    await openAdvanced(tailAgain);
    await tailEndsAtSlider(page).press("Home");
    await expect(tailAgain.getByText(/^Tail Rail Ends At — /)).toHaveText(`Tail Rail Ends At — ${inches(14)}`);
    await expect.poll(() => keptTailRail(page, "tailHardEdgeEndsAt")).toBe(inchesToMm(14));
    const again = await noseAdvanced(page, testInfo);
    await again.body.getByRole("button", { name: /Reset Advanced Settings/ }).click();
    await expect(blendsFromLabel(again.nose)).toHaveText(`Nose Rail Blends From — ${STOCK_START}`);
    await expect(endsAtLabel(again.nose)).toHaveText(`Nose Rail Ends At — ${STOCK_END}`);
    await expect.poll(() => keptNoseRail(page, "noseRailBlendsFrom")).toBe("absent");
    await expect.poll(() => keptNoseRail(page, "noseRailEndsAt")).toBe("absent");
    expect(await keptTailRail(page, "tailHardEdgeEndsAt")).toBe(inchesToMm(14));
    const tailLast = await showRail(page, testInfo, "tail");
    await openAdvanced(tailLast);
    await expect(tailLast.getByText(/^Tail Rail Ends At — /)).toHaveText(`Tail Rail Ends At — ${inches(14)}`);
  });

  test("6. in Metric the rows read 30.5 cm and 91.4 cm; a keyboard step lands on the whole-centimetre track and each step after is 1.0 cm, stored as a whole millimetre", async ({
    page,
  }, testInfo) => {
    await page.addInitScript((key) => window.localStorage.setItem(key, "metric"), UNITS_STORAGE_KEY);
    await openRails(page);
    const { nose } = await noseAdvanced(page, testInfo);
    const metric = (value: number) => formatDim(inchesToMm(value), "metric");
    const start = formatDim(noseBlendsFrom({}, STOCK_LENGTH), "metric");
    const end = formatDim(noseEndsAt({}, STOCK_LENGTH), "metric");
    await expect(blendsFromLabel(nose)).toHaveText(`Nose Rail Blends From — ${start}`);
    await expect(endsAtLabel(nose)).toHaveText(`Nose Rail Ends At — ${end}`);
    expect(start).toBe(metric(12));
    expect(end).toBe(metric(36));
    expect(start).toBe("30.5 cm");
    expect(end).toBe("91.4 cm");
    await expect(blendsFromSlider(page)).toHaveAttribute("aria-valuetext", `${start} from the nose`);

    // 12" is 30.48 cm, between two whole centimetres of the Metric track, so the thumb sits at the track's own end
    // and the first keyboard step lands on the next centimetre — where the slider's own view puts it.
    const view = hardEdgeBlendsFromSlider(noseBlendsFrom({}, STOCK_LENGTH), noseEndsAt({}, STOCK_LENGTH), STOCK_LENGTH, "metric");
    const firstStep = view.toMm(view.value + view.step);
    await blendsFromSlider(page).press("ArrowRight");
    await expect(blendsFromLabel(nose)).not.toHaveText(`Nose Rail Blends From — ${start}`);
    const onTrack = centimetres(await blendsFromLabel(nose).textContent());
    expect(onTrack).toBeCloseTo(firstStep / 10, 5);
    expect(Number.isInteger(onTrack)).toBe(true);
    expect(onTrack).toBeGreaterThan(30.5);
    expect(onTrack - 30.5).toBeLessThanOrEqual(1.5 + 1e-9);
    await blendsFromSlider(page).press("ArrowRight");
    await expect(blendsFromLabel(nose)).not.toHaveText(`Nose Rail Blends From — ${onTrack.toFixed(1)} cm`);
    const next = centimetres(await blendsFromLabel(nose).textContent());
    expect(next - onTrack).toBeCloseTo(1.0, 5);
    await expect.poll(() => keptNoseRail(page, "noseRailBlendsFrom")).toBe(next * 10);
    expect(Number.isInteger(await keptNoseRail(page, "noseRailBlendsFrom"))).toBe(true);
  });

  test("7. on a locked board both rows are greyed and their sliders disabled", async ({ page }, testInfo) => {
    await keepOpenBoard(page, stockBoardFields(), true);
    await openRails(page);
    await expect(page.getByRole("button", { name: BOARD_LOCK_COPY.unlockLabel }).filter({ visible: true })).toHaveCount(1, {
      timeout: 30_000,
    });
    const { nose } = await noseAdvanced(page, testInfo);
    await expect(blendsFromLabel(nose)).toHaveText(`Nose Rail Blends From — ${STOCK_START}`);
    await expect(endsAtLabel(nose)).toHaveText(`Nose Rail Ends At — ${STOCK_END}`);
    for (const label of [blendsFromLabel(nose), endsAtLabel(nose)]) {
      await expect(label.locator("xpath=..")).toHaveClass(/opacity-40/);
    }
    await expect(blendsFromSlider(page)).toBeDisabled();
    await expect(endsAtSlider(page)).toBeDisabled();
  });

  test("8. a board kept with a nose pair that crosses (26\" / 20\") opens reading 26\" and the top of Ends At's slider, never a crossed pair", async ({
    page,
  }, testInfo) => {
    const fields = stockBoardFields();
    // The kept board's nose also carries a scale no new board has, so the test can see the kept board opened.
    await keepOpenBoard(
      page,
      {
        ...fields,
        rails: {
          ...fields.rails,
          nose: { ...fields.rails.nose, scaleFromCenter: 0.55 },
          noseRailBlendsFrom: inchesToMm(26),
          noseRailEndsAt: inchesToMm(20),
        },
      },
      false,
    );
    await openRails(page);
    const { nose } = await noseAdvanced(page, testInfo);
    await expect(nose.getByText(/^Scaled from center by — /)).toHaveText("Scaled from center by — 0.55", { timeout: 30_000 });
    await expect(blendsFromLabel(nose)).toHaveText(`Nose Rail Blends From — ${inches(26)}`);
    await expect(endsAtLabel(nose)).toHaveText(`Nose Rail Ends At — ${STOCK_END}`);
  });
});

/** The 3D panel's nose and tail groups inside Rail Blend Controls. */
function threeDNoseRail(page: Page): Locator {
  return page.locator("[data-three-d-nose-rail]");
}

function threeDTailRail(page: Page): Locator {
  return page.locator("[data-three-d-tail-rail]");
}

function threeDEndsAtSlider(page: Page): Locator {
  return page.getByRole("slider", { name: THREE_D_COPY.noseRailEndsAtSlider, exact: true });
}

function threeDBlendsFromSlider(page: Page): Locator {
  return page.getByRole("slider", { name: THREE_D_COPY.noseRailBlendsFromSlider, exact: true });
}

/** The 3D page with Rail Blend Controls open and live (React has taken the page over, so a key press reaches a slider). */
async function openThreeD(page: Page) {
  await page.goto("/design/3d");
  // The rows sit in Rail Blend Controls, folded until pressed; a press before React owns the page does nothing.
  const fold = page.getByRole("button", { name: new RegExp(THREE_D_COPY.railBlendHeading) });
  await expect(async () => {
    if ((await fold.getAttribute("aria-expanded")) !== "true") await fold.click();
    await expect(threeDNoseRail(page)).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 60_000 });
  await page.waitForFunction(
    () => {
      const el = document.querySelector("[data-three-d-nose-rail]");
      return !!el && Object.keys(el).some((k) => k.startsWith("__react"));
    },
    undefined,
    { timeout: 60_000 },
  );
}

/** VOLUME's Estimated Volume figure, opened by its address. The server's first paint is the stock board, so a
 * figure the kept board should have moved is waited for until it differs from `before`. */
async function litresByAddress(page: Page, before?: string): Promise<string> {
  await page.goto("/design/volume");
  await expect(estimatedVolume(page)).toHaveText(/^\d+\.\d\d L$/, { timeout: 60_000 });
  if (before !== undefined) await expect(estimatedVolume(page)).not.toHaveText(before, { timeout: 30_000 });
  return (await estimatedVolume(page).textContent()) ?? "";
}

/** RAILS' nose group with its Advanced menu open, opened by its address. */
async function railsNoseByAddress(page: Page, testInfo: TestInfo): Promise<Locator> {
  await page.goto("/design/rails");
  let nose: Locator | null = null;
  await expect(async () => {
    nose = (await noseAdvanced(page, testInfo)).nose;
  }).toPass({ timeout: 60_000 });
  return nose!;
}

test.describe("the 3D page's Rail Blend Controls show the nose's two rows above the tail's, the same two values RAILS shows (quick 261127-kkw, D-04)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    // As e2e/three-d-hard-edge.spec.ts: a computer and one phone prove the shared value.
    test.skip(testInfo.project.name === "iphone", "a computer and one phone prove the shared value");
    test.setTimeout(240_000);
    await dismissStrips(page);
  });

  test("9. the nose's rows sit above the tail's and read the defaults; moved on 3D, RAILS reads it and VOLUME's litres move; moved on RAILS, 3D follows", async ({
    page,
  }, testInfo) => {
    await keepOpenBoard(page, differingNoseFields(), false);
    const litresBefore = await litresByAddress(page);

    await openThreeD(page);
    const group = threeDNoseRail(page);
    await expect(group.getByText(`${THREE_D_COPY.noseRailBlendsFrom} — ${STOCK_START}`, { exact: true })).toBeVisible();
    await expect(group.getByText(`${THREE_D_COPY.noseRailEndsAt} — ${STOCK_END}`, { exact: true })).toBeVisible();
    // The nose's group comes first inside Rail Blend Controls, the order RAILS' cards run.
    const order = await page.locator("[data-three-d-rail-blend]").evaluate((fold) => {
      const noseGroup = fold.querySelector("[data-three-d-nose-rail]");
      const tailGroup = fold.querySelector("[data-three-d-tail-rail]");
      if (!noseGroup || !tailGroup) return "missing";
      return noseGroup.compareDocumentPosition(tailGroup) & Node.DOCUMENT_POSITION_FOLLOWING ? "nose first" : "tail first";
    });
    expect(order).toBe("nose first");
    const rowLabels = await page
      .locator("[data-three-d-rail-blend]")
      .evaluate((fold) => Array.from(fold.querySelectorAll('input[type="range"]')).map((el) => el.getAttribute("aria-label")));
    expect(rowLabels).toEqual([
      THREE_D_COPY.noseRailBlendsFromSlider,
      THREE_D_COPY.noseRailEndsAtSlider,
      THREE_D_COPY.tailRailBlendsFromSlider,
      THREE_D_COPY.tailRailEndsAtSlider,
    ]);
    // Always live: nothing dimmed or out of reach, both sliders take the keyboard's focus; the tail's group still
    // holds exactly its own two.
    await expect(group.locator("[inert]")).toHaveCount(0);
    const sliders = group.locator('input[type="range"]');
    await expect(sliders).toHaveCount(2);
    for (let i = 0; i < 2; i++) {
      await expect(sliders.nth(i)).toBeEnabled();
      await sliders.nth(i).focus();
      expect(await sliders.nth(i).evaluate((el) => document.activeElement === el)).toBe(true);
    }
    await expect(threeDTailRail(page).locator('input[type="range"]')).toHaveCount(2);

    // Ends At all the way down, 2" past Blends From, on the 3D panel.
    await threeDEndsAtSlider(page).press("Home");
    const low = inches(14);
    await expect(group.getByText(`${THREE_D_COPY.noseRailEndsAt} — ${low}`, { exact: true })).toBeVisible();
    await expect(threeDEndsAtSlider(page)).toHaveAttribute("aria-valuetext", THREE_D_COPY.noseRailFromTheNose(low));
    await expect.poll(() => keptNoseRail(page, "noseRailEndsAt"), { timeout: 10_000 }).toBe(inchesToMm(14));

    // RAILS reads the very same value, under the same spoken name.
    let nose = await railsNoseByAddress(page, testInfo);
    await expect(endsAtLabel(nose)).toHaveText(`${THREE_D_COPY.noseRailEndsAt} — ${low}`, { timeout: 30_000 });
    await expect(endsAtSlider(page)).toHaveAttribute("aria-valuetext", THREE_D_COPY.noseRailFromTheNose(low));

    // VOLUME's litres moved: this board's nose rail differs from its centre's.
    expect(await litresByAddress(page, litresBefore)).not.toBe(litresBefore);

    // Moved on RAILS (Ends At up a page to 24", then Blends From to its top, 2" short of it), the 3D rows follow.
    nose = await railsNoseByAddress(page, testInfo);
    await expect(endsAtLabel(nose)).toHaveText(`${THREE_D_COPY.noseRailEndsAt} — ${low}`, { timeout: 30_000 });
    await endsAtSlider(page).press("PageUp");
    await expect(endsAtLabel(nose)).toHaveText(`Nose Rail Ends At — ${inches(24)}`);
    await blendsFromSlider(page).press("End");
    await expect(blendsFromLabel(nose)).toHaveText(`Nose Rail Blends From — ${inches(22)}`);
    await expect.poll(() => keptNoseRail(page, "noseRailBlendsFrom"), { timeout: 10_000 }).toBe(inchesToMm(22));
    await expect.poll(() => keptNoseRail(page, "noseRailEndsAt"), { timeout: 10_000 }).toBe(inchesToMm(24));
    await openThreeD(page);
    await expect(threeDNoseRail(page).getByText(`${THREE_D_COPY.noseRailBlendsFrom} — ${inches(22)}`, { exact: true })).toBeVisible({
      timeout: 30_000,
    });
    await expect(threeDNoseRail(page).getByText(`${THREE_D_COPY.noseRailEndsAt} — ${inches(24)}`, { exact: true })).toBeVisible();
    await expect(threeDBlendsFromSlider(page)).toHaveAttribute("aria-valuetext", THREE_D_COPY.noseRailFromTheNose(inches(22)));
  });

  test("10. on a locked board the 3D page greys both nose rows and disables their sliders", async ({ page }) => {
    await keepOpenBoard(page, stockBoardFields(), true);
    await openThreeD(page);
    const group = threeDNoseRail(page);
    const from = group.getByText(`${THREE_D_COPY.noseRailBlendsFrom} — ${STOCK_START}`, { exact: true });
    const ends = group.getByText(`${THREE_D_COPY.noseRailEndsAt} — ${STOCK_END}`, { exact: true });
    await expect(from).toBeVisible({ timeout: 30_000 });
    await expect(threeDBlendsFromSlider(page)).toBeDisabled({ timeout: 30_000 });
    await expect(threeDEndsAtSlider(page)).toBeDisabled();
    for (const label of [from, ends]) await expect(label.locator("xpath=..")).toHaveClass(/opacity-40/);
  });
});

/** True when a slider is drawn on a real track, its top above its bottom, so its handle shows. */
async function drawnWithAHandle(slider: Locator): Promise<boolean> {
  return slider.evaluate((el) => Number((el as HTMLInputElement).max) > Number((el as HTMLInputElement).min));
}

test.describe("a blend slider with nowhere to go is greyed and says why, nose and tail (fast 221)", () => {
  test("11. on RAILS, Ends At at its lowest greys Blends From, handle drawn, with a line under it at full strength; Ends At moved out brings it back — the nose's pair, then the tail's", async ({
    page,
  }, testInfo) => {
    test.setTimeout(180_000);
    await openRails(page);
    const { nose } = await noseAdvanced(page, testInfo);
    const noseHint = nose.locator("[data-blend-pinned-hint]");
    await expect(noseHint).toHaveCount(0);
    await expect(blendsFromSlider(page)).toBeEnabled();

    await endsAtSlider(page).press("Home");
    await expect(endsAtLabel(nose)).toHaveText(`Nose Rail Ends At — ${inches(14)}`);
    await expect(blendsFromSlider(page)).toBeDisabled();
    await expect(blendsFromLabel(nose).locator("xpath=..")).toHaveClass(/opacity-40/);
    await expect(noseHint).toHaveText(BLEND_PINNED_HINT.blendsFrom("nose"));
    expect(await noseHint.evaluate((el) => el.closest(".opacity-40") === null)).toBe(true);
    expect(await drawnWithAHandle(blendsFromSlider(page))).toBe(true);
    // Nothing is written for the greyed slider, its figure is the one it had, and Ends At stays live.
    await expect(blendsFromLabel(nose)).toHaveText(`Nose Rail Blends From — ${STOCK_START}`);
    await expect(blendsFromSlider(page)).toHaveAttribute("aria-valuetext", `${STOCK_START} from the nose`);
    await expect.poll(() => keptNoseRail(page, "noseRailEndsAt")).toBe(inchesToMm(14));
    expect(await keptNoseRail(page, "noseRailBlendsFrom")).toBe("absent");
    await expect(endsAtSlider(page)).toBeEnabled();

    await endsAtSlider(page).press("PageUp");
    await expect(noseHint).toHaveCount(0);
    await expect(blendsFromSlider(page)).toBeEnabled();
    await expect(blendsFromLabel(nose).locator("xpath=..")).not.toHaveClass(/opacity-40/);

    // The tail's pair, the same way.
    const tail = await showRail(page, testInfo, "tail");
    await openAdvanced(tail);
    const tailHint = tail.locator("[data-blend-pinned-hint]");
    await expect(tailHint).toHaveCount(0);
    await tailEndsAtSlider(page).press("Home");
    await expect(tail.getByText(/^Tail Rail Ends At — /)).toHaveText(`Tail Rail Ends At — ${inches(14)}`);
    await expect(tailBlendsFromSlider(page)).toBeDisabled();
    await expect(tailHint).toHaveText(BLEND_PINNED_HINT.blendsFrom("tail"));
    expect(await tailHint.evaluate((el) => el.closest(".opacity-40") === null)).toBe(true);
    expect(await drawnWithAHandle(tailBlendsFromSlider(page))).toBe(true);
    await expect(tailEndsAtSlider(page)).toBeEnabled();
    await tailEndsAtSlider(page).press("End");
    await expect(tailHint).toHaveCount(0);
    await expect(tailBlendsFromSlider(page)).toBeEnabled();
  });

  test("12. a locked board whose Ends At sits at its lowest greys both rows for the lock and shows no line", async ({ page }, testInfo) => {
    const fields = stockBoardFields();
    await keepOpenBoard(page, { ...fields, rails: { ...fields.rails, noseRailEndsAt: inchesToMm(14) } }, true);
    await openRails(page);
    await expect(page.getByRole("button", { name: BOARD_LOCK_COPY.unlockLabel }).filter({ visible: true })).toHaveCount(1, {
      timeout: 30_000,
    });
    const { nose } = await noseAdvanced(page, testInfo);
    await expect(endsAtLabel(nose)).toHaveText(`Nose Rail Ends At — ${inches(14)}`);
    await expect(blendsFromSlider(page)).toBeDisabled();
    await expect(endsAtSlider(page)).toBeDisabled();
    await expect(nose.locator("[data-blend-pinned-hint]")).toHaveCount(0);
  });

  test("13. on the 3D page the same: the nose's and the tail's Blends From grey with their lines while Ends At sits at its lowest", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === "iphone", "a computer and one phone prove the shared rows");
    test.setTimeout(240_000);
    await dismissStrips(page);
    await keepOpenBoard(page, stockBoardFields(), false);
    await openThreeD(page);
    const noseGroup = threeDNoseRail(page);
    const tailGroup = threeDTailRail(page);
    const tailFrom = tailGroup.getByRole("slider", { name: THREE_D_COPY.tailRailBlendsFromSlider, exact: true });
    const tailEnds = tailGroup.getByRole("slider", { name: THREE_D_COPY.tailRailEndsAtSlider, exact: true });
    await expect(page.locator("[data-blend-pinned-hint]")).toHaveCount(0);

    await threeDEndsAtSlider(page).press("Home");
    await expect(threeDBlendsFromSlider(page)).toBeDisabled();
    await expect(noseGroup.locator("[data-blend-pinned-hint]")).toHaveText(BLEND_PINNED_HINT.blendsFrom("nose"));
    expect(await drawnWithAHandle(threeDBlendsFromSlider(page))).toBe(true);
    await expect(tailGroup.locator("[data-blend-pinned-hint]")).toHaveCount(0);

    await tailEnds.press("Home");
    await expect(tailFrom).toBeDisabled();
    await expect(tailGroup.locator("[data-blend-pinned-hint]")).toHaveText(BLEND_PINNED_HINT.blendsFrom("tail"));
    expect(await drawnWithAHandle(tailFrom)).toBe(true);

    await threeDEndsAtSlider(page).press("End");
    await tailEnds.press("End");
    await expect(page.locator("[data-blend-pinned-hint]")).toHaveCount(0);
    await expect(threeDBlendsFromSlider(page)).toBeEnabled();
    await expect(tailFrom).toBeEnabled();
  });
});
