import { expect, test, type Page } from "@playwright/test";
import { dismissStrips } from "./helpers/guide";

/**
 * The printed plan drawings' axis numbers settle on one size (quick 261115-evi; the to-do of 2026-11-14 from
 * 261113-vya's PDF comparison, where the same unchanged board printed them at 9 pt one time and 11 pt the next).
 *
 * The drawings pin their text to a box a ResizeObserver measures; the print fit pins the sheet to the paper inside
 * `beforeprint`. Whether the observer answered before the snapshot was a coin toss. Now the fit tells the drawings
 * to measure again in the same call, so the snapshot always sees the settled size. Two proofs, both on a computer
 * (the phone print path hands the page to the browser and pins nothing):
 *
 * 1. The instant `beforeprint` returns, every drawing's text on the sheets is already the size it settles to two
 *    frames later — read in one synchronous step, the way a print snapshot reads it.
 * 2. The same board printed to PDF five times gives five identical files, once each file's own clock and id are
 *    blanked (the only bytes a repeat print may change).
 */

const PRINTS = 5;

async function openSummary(page: Page): Promise<void> {
  await page.goto("/design/summary");
  await expect(page.locator("[data-order-form-sheet]").first()).toBeVisible({ timeout: 30_000 });
  // The drawings have measured their boxes once React owns them: wait for a pinned text to carry a size.
  await expect.poll(() => page.locator("[data-order-form-sheet] svg text").count(), { timeout: 30_000 }).toBeGreaterThan(10);
}

/** Every text on the sheets' drawings with its size in CSS px — its font size through its svg's own `meet` fit. */
function readTextSizes(): number[] {
  const out: number[] = [];
  for (const text of document.querySelectorAll<SVGTextElement>("[data-order-form-sheet] svg text")) {
    const svg = text.ownerSVGElement;
    if (!svg) continue;
    const vb = svg.viewBox.baseVal;
    if (!vb || vb.width <= 0 || vb.height <= 0) continue;
    const fit = Math.min(svg.clientWidth / vb.width, svg.clientHeight / vb.height);
    const size = parseFloat(getComputedStyle(text).fontSize);
    if (Number.isFinite(size) && Number.isFinite(fit)) out.push(Math.round(size * fit * 100) / 100);
  }
  return out;
}

/** Chromium's PDF writer stamps two clocks and an id; everything else a repeat print writes must be the same bytes. */
function stableBytes(pdf: Buffer): string {
  return pdf
    .toString("latin1")
    .replace(/\/CreationDate \(D:[^)]*\)/g, "/CreationDate (D:00000000000000Z)")
    .replace(/\/ModDate \(D:[^)]*\)/g, "/ModDate (D:00000000000000Z)")
    .replace(/\/ID \[<[0-9A-Fa-f]*> ?<[0-9A-Fa-f]*>\]/g, "/ID [<0> <0>]");
}

test.describe("the printed drawings' text is one size, print after print", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the computer's print path is the one that pins the sheets");
    await dismissStrips(page);
  });

  test("the instant beforeprint returns, every drawing's text is already the size it settles to", async ({ page }) => {
    await openSummary(page);
    const read = readTextSizes.toString();
    const readNow = (p: Page) => p.evaluate((r) => (new Function(`return (${r})()`) as () => number[])(), read);
    const sheetWidth = () => page.evaluate(() => document.querySelector<HTMLElement>("[data-order-form-sheet]")?.clientWidth ?? 0);
    // Settled on screen first: the sheet at its full design width, and the drawings' pinned text no longer moving.
    await expect.poll(sheetWidth, { timeout: 30_000 }).toBeGreaterThan(800);
    await expect
      .poll(async () => {
        const a = await readNow(page);
        await page.waitForTimeout(250);
        const b = await readNow(page);
        return JSON.stringify(a) === JSON.stringify(b) && a.length > 10;
      }, { timeout: 30_000 })
      .toBe(true);
    const onScreen = await readNow(page);

    // In screen media on purpose: a real print switches media and fires `beforeprint` in the same breath, so the
    // sheets change width under the drawings right then. Emulating print media first would lay the sheets out at
    // the paper's width long before the event, and the observers would have settled — the race would not be run.
    // Dispatching the event here pins the sheets inline exactly as a print does, and the race is run for real.
    const atOnce = await page.evaluate((r) => {
      const readSizes = new Function(`return (${r})()`) as () => number[];
      window.dispatchEvent(new Event("beforeprint"));
      return { sizes: readSizes(), sheet: document.querySelector<HTMLElement>("[data-order-form-sheet]")?.clientWidth ?? 0 };
    }, read);
    // The pin took: the sheet is the paper's width now, narrower than the screen's, so every drawing's box changed.
    expect(atOnce.sheet).toBeLessThan(760);
    expect(atOnce.sizes.length).toBe(onScreen.length);
    // Two frames later the observers have long delivered: the settled truth.
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const settled = await readNow(page);
    expect(atOnce.sizes).toEqual(settled);
    await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  });

  test(`the same board printed ${PRINTS} times gives ${PRINTS} identical PDFs`, async ({ page }) => {
    await openSummary(page);
    const prints: string[] = [];
    for (let i = 0; i < PRINTS; i += 1) {
      prints.push(stableBytes(await page.pdf({ format: "A4", printBackground: false })));
    }
    for (let i = 1; i < PRINTS; i += 1) {
      expect(prints[i] === prints[0], `print ${i + 1} differs from print 1 (${prints[i].length} vs ${prints[0].length} bytes)`).toBe(true);
    }
  });
});
