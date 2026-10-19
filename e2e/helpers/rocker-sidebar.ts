import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Opens ROCKER's Advanced fold in the sidebar if it is closed (quick 261019-gqo, 2026-10-19, P-08).
 *
 * With a blank picked, FOIL ends with a fold titled `Advanced` that is closed whenever the screen opens
 * and holds `Fine tune from`, the Nose @ 12" and Tail @ 12" fine-tunes and ↺ Reset Fine-Tune. A spec that
 * reads or moves any of those calls this first. It clicks only when the fold shows ▸, so calling it
 * twice (or on an already-open fold) leaves the fold open rather than closing it, and it waits for the
 * `Fine tune from` pair to be visible before it returns.
 *
 * Call it on a tab where FOIL is live (VIEWER; PLANING once that tab exists): on the other tabs the
 * whole FOIL section is dimmed and inert and the click would do nothing.
 */
export async function openFoilAdvanced(page: Page): Promise<void> {
  const heading = page.locator("aside").getByRole("button", { name: /^Advanced\s*[▾▸]$/ });
  await heading.scrollIntoViewIfNeeded();
  if (((await heading.innerText()) ?? "").includes("▸")) await heading.click();
  await expect(page.locator("aside").getByRole("group", { name: "Fine tune from" })).toBeVisible();
}

/** Switches the drawing panel to VIEWER or DATASHEET and waits for it to be the selected tab. */
export async function showTab(page: Page, name: "VIEWER" | "DATASHEET"): Promise<void> {
  const tab = page.getByRole("tab", { name, exact: true });
  await tab.click();
  await expect(tab).toHaveAttribute("aria-selected", "true");
}

/**
 * The DATASHEET's YOUR BOARD Rocker row: its label, then the five stations nose to tail (nose tip, nose 12",
 * center, tail 12", tail tip). Since quick 261019-gqo (P-07) the station readouts are not in the sidebar, so a
 * spec that reads the board's rocker between controls reads it here — on DATASHEET — and makes every tap,
 * slide or press on VIEWER, where the sidebar is live. (PLANING brings the station numbers back in plan 02.)
 */
export function boardRockerCells(page: Page): Locator {
  return page.locator('[data-datasheet-board-row="rocker"] > div');
}

/** The DATASHEET's FOAM OFF Bottom row: its label, then the five stations nose to tail. */
export function boardFoamBottomCells(page: Page): Locator {
  return page.locator('[data-datasheet-foam-off="bottom"] > div');
}

/**
 * Every figure the old sidebar readouts showed, as one string, read where it lives now: the DATASHEET's YOUR
 * BOARD Rocker row and FOAM OFF Bottom row, all five stations each. The caller must already be on DATASHEET.
 * A slide of Placement moves the foam off the bottom at the tips well before it moves the rocker there by a
 * printed step, so a spec that waits for "the board moved" compares this whole string, as the old readout row
 * (rocker and off-bottom together) did.
 */
export async function datasheetReadings(page: Page): Promise<string> {
  await expect(boardRockerCells(page)).toHaveCount(6);
  await expect(boardFoamBottomCells(page)).toHaveCount(6);
  const rocker = await boardRockerCells(page).allTextContents();
  const foam = await boardFoamBottomCells(page).allTextContents();
  return `${rocker.slice(1).join("|")}//${foam.slice(1).join("|")}`;
}

/** Reads the readings above, then comes back to VIEWER. */
export async function readDatasheetReadings(page: Page): Promise<string> {
  await showTab(page, "DATASHEET");
  const readings = await datasheetReadings(page);
  await showTab(page, "VIEWER");
  return readings;
}

/** Reads the five station rocker readings off the DATASHEET, then comes back to VIEWER. */
export async function readBoardRocker(page: Page): Promise<string[]> {
  await showTab(page, "DATASHEET");
  await expect(boardRockerCells(page)).toHaveCount(6);
  const cells = await boardRockerCells(page).allTextContents();
  await showTab(page, "VIEWER");
  return cells.slice(1);
}
