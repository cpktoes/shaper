import { expect, type Page } from "@playwright/test";

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
