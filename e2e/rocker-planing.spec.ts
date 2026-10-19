import { expect, test, type Locator, type Page } from "@playwright/test";
import { openRocker } from "./helpers/blank-picker";
import { goToScreen } from "./helpers/screens";
import { openFoilAdvanced } from "./helpers/rocker-sidebar";

/**
 * The browser proof of ROCKER's PLANING tab (quick 261019-gqo, plan 02, 2026-10-19).
 *
 * The founder's words: "Lets move the controls data table (passes) to a new "PLANING" tab and add a OFF DECK
 * column too." Their answers: five stations with ROCKER, OFF DECK and OFF BOTTOM and the planer passes for the
 * deck and the bottom at every station (decision 1); PLANING sits before DATASHEET (decision 2); on a phone the
 * tabs use short words (D-11).
 *
 * What this proves, by the plan's decisions:
 * - D-08: on a computer the tabs read VIEWER, PLANING, DATASHEET left to right, and there is no TOP VIEW tab.
 * - D-09: with no blank picked PLANING asks the shaper to pick one first and draws no table.
 * - D-07, D-04: the Longboard preset's table, cell by cell, in Imperial and in Metric — ROCKER, OFF DECK and
 *   OFF BOTTOM with the whole passes plus what is left under each foam figure, and the Planer Max Depth note.
 *   The figures were measured at plan time with the app's own functions (plan figure M1).
 * - D-09: every sidebar control is live on PLANING — nothing inert — and two Deck Skin presses move the table and
 *   the sidebar's line together with no request leaving the page (plan figure M2); the Advanced fold opens from
 *   PLANING, shows Fine tune from and the two 12" rows live, and closes again.
 *
 * `dismissChrome` is copied from `e2e/rocker-live-controls.spec.ts`; opening ROCKER and picking a blank go through
 * `helpers/blank-picker.ts`, starting the Longboard through the setup screen as `rocker-cut.spec.ts` does.
 * Every describe title carries "261019-gqo".
 */

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";
const TOOLBAR_TIP_DISMISSAL_KEY = "shaper-toolbar-tip-dismissed";

async function dismissChrome(page: Page) {
  await page.addInitScript((key) => {
    window.sessionStorage.setItem(key, "true");
  }, BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, "true");
  }, TOOLBAR_TIP_DISMISSAL_KEY);
}

function tab(page: Page, name: "VIEWER" | "PLANING" | "DATASHEET" | "TOP VIEW"): Locator {
  return page.getByRole("tab", { name, exact: true });
}

/** The PLANING table's five station keys, nose to tail, and the five cells each carries. */
const STATIONS = ["noseTip", "nose12", "center", "tail12", "tailTip"] as const;
const CELLS = ["rocker", "offDeck", "offBottom", "deckPasses", "bottomPasses"] as const;
type Cell = (typeof CELLS)[number];

/** One cell of one station of the table, by the test hooks the tab carries. */
function planingCell(page: Page, station: (typeof STATIONS)[number], cell: Cell): Locator {
  return page.locator(`[data-rocker-planing-station="${station}"] [data-rocker-planing-cell="${cell}"]`);
}

/** Every cell of the table, station by station, as the page prints it. */
async function readTable(page: Page): Promise<Record<string, Record<Cell, string>>> {
  const out: Record<string, Record<Cell, string>> = {};
  for (const station of STATIONS) {
    const row = {} as Record<Cell, string>;
    for (const cell of CELLS) row[cell] = ((await planingCell(page, station, cell).innerText()) ?? "").trim();
    out[station] = row;
  }
  return out;
}

/** Starts the Longboard preset from the setup screen and walks (client-side) to ROCKER. */
async function openLongboardRocker(page: Page) {
  await page.goto("/");
  const longboard = page.getByRole("button").filter({ hasText: "Longboard" }).filter({ hasText: "Start Shaping" });
  await expect(async () => {
    await longboard.first().click();
    await page.waitForURL("**/design/outline", { timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
  await goToScreen(page, "ROCKER");
}

/** A `SliderRow`'s slider, found by the start of its label line. */
function sliderUnder(page: Page, label: RegExp): Locator {
  return page.getByText(label).locator("xpath=..").getByRole("slider");
}

// Plan figure M1 — the Longboard preset's PLANING table at the default 1/8" (3 mm) Planer Max Depth.
const LONGBOARD_IMPERIAL: Record<(typeof STATIONS)[number], Record<Cell, string>> = {
  noseTip: { rocker: '4 5/8"', offDeck: '1/8"', offBottom: '7/16"', deckPasses: "1", bottomPasses: '3 + 1/16"' },
  nose12: { rocker: '2 1/4"', offDeck: '1/8"', offBottom: '3/16"', deckPasses: "1", bottomPasses: '1 + 1/16"' },
  center: { rocker: '0"', offDeck: '1/8"', offBottom: '3/16"', deckPasses: "1", bottomPasses: '1 + 1/16"' },
  tail12: { rocker: '1 15/16"', offDeck: '1/8"', offBottom: '3/16"', deckPasses: "1", bottomPasses: '1 + 1/16"' },
  tailTip: { rocker: '3 5/8"', offDeck: '1/8"', offBottom: '9/16"', deckPasses: "1", bottomPasses: '4 + 1/16"' },
};
const LONGBOARD_METRIC: Record<(typeof STATIONS)[number], Record<Cell, string>> = {
  noseTip: { rocker: "117 mm", offDeck: "3 mm", offBottom: "11 mm", deckPasses: "1", bottomPasses: "3 + 2 mm" },
  nose12: { rocker: "57 mm", offDeck: "3 mm", offBottom: "5 mm", deckPasses: "1", bottomPasses: "1 + 2 mm" },
  center: { rocker: "0 mm", offDeck: "3 mm", offBottom: "5 mm", deckPasses: "1", bottomPasses: "1 + 2 mm" },
  tail12: { rocker: "50 mm", offDeck: "3 mm", offBottom: "5 mm", deckPasses: "1", bottomPasses: "1 + 2 mm" },
  tailTip: { rocker: "92 mm", offDeck: "3 mm", offBottom: "14 mm", deckPasses: "1", bottomPasses: "4 + 2 mm" },
};

test.describe("ROCKER's PLANING tab on a computer (quick 261019-gqo)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the computer's own tab list; the phones have their own describes");
    await dismissChrome(page);
  });

  test("the tabs read VIEWER, PLANING, DATASHEET left to right, with no TOP VIEW tab", async ({ page }) => {
    await openRocker(page);
    await expect(tab(page, "PLANING")).toBeVisible({ timeout: 30_000 });
    await expect(tab(page, "TOP VIEW")).toHaveCount(0);
    const lefts: number[] = [];
    for (const name of ["VIEWER", "PLANING", "DATASHEET"] as const) {
      const box = await tab(page, name).boundingBox();
      expect(box, name).not.toBeNull();
      lefts.push(box!.x);
    }
    expect(lefts[0]).toBeLessThan(lefts[1]);
    expect(lefts[1]).toBeLessThan(lefts[2]);
  });

  test("with no blank picked, PLANING says to pick a blank first and draws no table", async ({ page }) => {
    await openRocker(page);
    await tab(page, "PLANING").click();
    await expect(tab(page, "PLANING")).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("[data-rocker-planing-empty]")).toHaveText(
      "Pick a blank first — the planing numbers come from the blank your board is cut from.",
    );
    await expect(page.locator("[data-rocker-planing]")).toHaveCount(0);
    await expect(page.locator("aside [inert]")).toHaveCount(0);
  });

  test("the Longboard's PLANING table reads the measured figures cell by cell, in Imperial and in Metric", async ({
    page,
  }) => {
    test.slow(); // the Longboard is started twice (Imperial, then Metric) in this one test
    await openLongboardRocker(page);
    await tab(page, "PLANING").click();
    await expect(page.locator("[data-rocker-planing]")).toBeVisible();
    await expect(page.locator("[data-rocker-planing-empty]")).toHaveCount(0);
    await expect(page.locator("[data-rocker-planing-station]")).toHaveCount(5);
    expect(await readTable(page)).toEqual(LONGBOARD_IMPERIAL);
    // The station names, nose to tail, and the note naming the shaper's Planer Max Depth.
    const names = page.locator("[data-rocker-planing-station]").locator("xpath=./div[1]");
    await expect(names).toHaveText(["Nose Tip", 'Nose @ 12"', "Center", 'Tail @ 12"', "Tail Tip"]);
    const note = page.locator("[data-rocker-planing-note]");
    await expect(note).toContainText('At 1/8" a pass — your Planer Max Depth.');
    await expect(note).toContainText("a figure after the + is the foam left for one last, lighter pass");
    await expect(note).not.toContainText("poke out");

    // The same board in Metric: the chosen system is read when the page loads, so set it and start again.
    await page.evaluate(() => window.localStorage.setItem("shaper-units", "metric"));
    await openLongboardRocker(page);
    await tab(page, "PLANING").click();
    await expect(page.locator("[data-rocker-planing-station]")).toHaveCount(5);
    expect(await readTable(page)).toEqual(LONGBOARD_METRIC);
    await expect(names).toHaveText(["Nose Tip", "Nose @ 30.5 cm", "Center", "Tail @ 30.5 cm", "Tail Tip"]);
    await expect(note).toContainText("At 3 mm a pass — your Planer Max Depth.");
  });

  test("every sidebar control is live on PLANING: two Deck Skin presses move the table and the sidebar line, with no request", async ({
    page,
  }) => {
    await openLongboardRocker(page);
    await tab(page, "PLANING").click();
    await expect(page.locator("[data-rocker-planing]")).toBeVisible();
    await expect(page.locator("aside [inert]")).toHaveCount(0);

    // R14: the Deck Skin is store state, so nothing goes to any server. Clerk's own sign-in boot traffic and
    // browser-internal blob: loads are left out (the filter `rocker-cut.spec.ts` uses).
    const requests: string[] = [];
    page.on("request", (request) => {
      const url = request.url();
      if (url.startsWith("blob:") || /clerk\.accounts\.dev|\/__clerk\//.test(url)) return;
      requests.push(`${request.method()} ${url}`);
    });

    const skin = sliderUnder(page, /^Deck Skin — /);
    await skin.focus();
    await skin.press("ArrowRight");
    await skin.press("ArrowRight");

    // Plan figure M2: 1/8" -> 1/4" Deck Skin. OFF DECK 1/4" (2) everywhere; the center's foam off the bottom
    // drops to 1/16" (0 + 1/16"); the tips and the 12" stations follow the same shift.
    const table = await readTable(page);
    for (const station of STATIONS) {
      expect(table[station].offDeck, station).toBe('1/4"');
      expect(table[station].deckPasses, station).toBe("2");
      expect(table[station].rocker, station).toBe(LONGBOARD_IMPERIAL[station].rocker);
    }
    expect(table.noseTip.offBottom).toBe('5/16"');
    expect(table.noseTip.bottomPasses).toBe('2 + 1/16"');
    for (const station of ["nose12", "center", "tail12"] as const) {
      expect(table[station].offBottom, station).toBe('1/16"');
      expect(table[station].bottomPasses, station).toBe('0 + 1/16"');
    }
    expect(table.tailTip.offBottom).toBe('7/16"');
    expect(table.tailTip.bottomPasses).toBe('3 + 1/16"');
    await expect(page.locator("[data-full-passes]")).toHaveText('Full passes at the center — Deck 2 · Bottom 0 + 1/16"');
    expect(requests, `requests during the presses: ${requests.join(", ")}`).toHaveLength(0);
  });

  test("the Advanced fold opens from PLANING, its Fine tune from pair and two 12\" rows are live, and it closes again", async ({
    page,
  }) => {
    await openLongboardRocker(page);
    await tab(page, "PLANING").click();
    await expect(page.locator("[data-rocker-planing]")).toBeVisible();
    await openFoilAdvanced(page);
    const aside = page.locator("aside");
    await expect(aside.getByRole("group", { name: "Fine tune from" })).toBeVisible();
    await expect(aside.getByText(/^Nose @ 12" — /)).toBeVisible();
    await expect(aside.getByText(/^Tail @ 12" — /)).toBeVisible();
    await expect(aside.getByRole("button", { name: /Reset Fine-Tune/ })).toBeVisible();
    await expect(page.locator("aside [inert]")).toHaveCount(0);
    // And it closes again.
    await aside.getByRole("button", { name: /^Advanced\s*[▾▸]$/ }).click();
    await expect(aside.getByRole("group", { name: "Fine tune from" })).toBeHidden();
    await expect(tab(page, "PLANING")).toHaveAttribute("aria-selected", "true");
  });
});
