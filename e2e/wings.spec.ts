import { expect, test, type Page } from "@playwright/test";

/**
 * Wings on the TEMPLATE page (quick 261014-wii, 2026-10-14; sketches 013 A and 014 B). A wing is a
 * step in the outline applied after the curve, its depth fading out by the tail pod; it is added,
 * set and removed from a WINGS tab beside VIEWER whose sidebar holds only the wing controls. This
 * file proves, in a real browser:
 *
 * - the tracer: the tab strip reads VIEWER and ADD WINGS; adding a wing changes the board on the
 *   VIEWER and the tab's label; removing it puts the board back exactly as it was;
 *
 * and grows with plan 01's later tasks (the popup and Show fins, the sidebar swap, the fin lock, the
 * window growing past 24") and plan 02's (grab points, phones, Metric).
 *
 * The banner/toolbar-tip dismissal helper is a local copy of `e2e/outline-ghost.spec.ts`'s own —
 * every spec in this suite copies it rather than sharing an import.
 */

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";
const TOOLBAR_TIP_DISMISSAL_KEY = "shaper-toolbar-tip-dismissed";

async function dismissSignInBanner(page: Page) {
  await page.addInitScript((key) => {
    window.sessionStorage.setItem(key, "true");
  }, BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, "true");
  }, TOOLBAR_TIP_DISMISSAL_KEY);
}

test.describe("wings on the TEMPLATE page", () => {
  test.beforeEach(async ({ page }) => {
    await dismissSignInBanner(page);
  });

  test("desktop: add a wing from the WINGS tab, see the step on the VIEWER, and remove it again", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the tracer, desktop project only");

    await page.goto("/design/outline");
    const viewerTab = page.getByRole("tab", { name: "VIEWER" });
    await expect(viewerTab).toBeVisible();
    await expect(page.getByRole("tab", { name: "ADD WINGS" })).toBeVisible();

    const silhouette = page.locator("[data-board-silhouette='outline']");
    await expect(silhouette).toBeVisible();
    const original = await silhouette.getAttribute("d");

    await page.getByRole("tab", { name: "ADD WINGS" }).click();
    const sidebar = page.locator("aside");
    await expect(sidebar.getByText("Wings", { exact: true })).toBeVisible();
    await expect(sidebar.getByText("Board Length")).toHaveCount(0);

    await sidebar.getByRole("button", { name: "+ Add a wing" }).click();
    // The first wing opens the dial-in pop-up, which hides the page behind it until it closes.
    await page.getByRole("button", { name: "Got it" }).click();
    await expect(page.getByRole("tab", { name: "WINGS · 1" })).toBeVisible();

    await viewerTab.click();
    await expect(silhouette).toBeVisible();
    await expect.poll(() => silhouette.getAttribute("d")).not.toBe(original);

    await page.getByRole("tab", { name: "WINGS · 1" }).click();
    await sidebar.getByRole("button", { name: "Remove" }).click();
    await expect(page.getByRole("tab", { name: "ADD WINGS" })).toBeVisible();

    await viewerTab.click();
    await expect.poll(() => silhouette.getAttribute("d")).toBe(original);
  });

  /** Opens the WINGS tab and adds the first wing, closing the dial-in pop-up. */
  async function addFirstWing(page: Page) {
    await page.goto("/design/outline");
    await page.getByRole("tab", { name: "ADD WINGS" }).click();
    await page.locator("aside").getByRole("button", { name: "+ Add a wing" }).click();
    const dialog = page.getByRole("dialog", { name: "Dial in your wing placement" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Got it" }).click();
    await expect(dialog).toHaveCount(0);
  }

  test("desktop: the first wing switches Show fins on and asks you to dial it in against FINS", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop project only");

    await addFirstWing(page);
    const sidebar = page.locator("aside");
    await expect(sidebar.getByRole("checkbox", { name: /Show fins/ })).toBeChecked();
    await expect(page.locator("[data-wing-close-up] [data-fin-mark]").first()).toBeVisible();

    await page.getByRole("tab", { name: "VIEWER" }).click();
    await expect(page.locator("[data-fin-mark]").first()).toBeVisible();
    await expect(page.locator('[data-callout-chip="WING 1"]')).toBeVisible();

    // A second wing opens no pop-up.
    await page.getByRole("tab", { name: "WINGS · 1" }).click();
    await sidebar.getByRole("button", { name: "+ Add wing 2" }).click();
    await expect(page.getByRole("tab", { name: "WINGS · 2" })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    // Remove both, add again: the pop-up is back, and Open FINS goes to FINS.
    await sidebar.getByRole("button", { name: "Remove" }).first().click();
    await sidebar.getByRole("button", { name: "Remove" }).first().click();
    await expect(page.getByRole("tab", { name: "ADD WINGS" })).toBeVisible();
    await sidebar.getByRole("button", { name: "+ Add a wing" }).click();
    await page.getByRole("dialog").getByRole("link", { name: "Open FINS" }).click();
    await expect(page).toHaveURL(/\/design\/fins$/);
  });

  test("desktop: the WINGS sidebar holds only the wing controls", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop project only");

    await page.goto("/design/outline");
    const sidebar = page.locator("aside");
    await expect(sidebar.getByText("Template Builder")).toBeVisible();
    await page.getByRole("tab", { name: "ADD WINGS" }).click();
    await expect(sidebar.getByText("Wings", { exact: true })).toBeVisible();
    await expect(sidebar.getByText("Board Length")).toHaveCount(0);
    await expect(sidebar.getByText("Nose Controls")).toHaveCount(0);
    await expect(sidebar.getByText("Template Builder")).toHaveCount(0);
    await page.getByRole("tab", { name: "VIEWER" }).click();
    await expect(sidebar.getByText("Template Builder")).toBeVisible();
  });

  test("desktop: the first wing locks to the front fin, follows its leading edge, and unlocks where it stands", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop project only");

    await addFirstWing(page);
    const chip = page.locator('[data-wing-close-up] [data-callout-chip^="WING 1"]');
    // F21: the default thruster's front fin trails at 10.977", read as 11".
    await expect(chip).toContainText('3/8" @ 11"');
    await expect(chip).toHaveAttribute("data-callout-chip", "WING 1 · FIN");
    const position = page.getByRole("slider", { name: "Wing 1 position from tail" });
    await expect(position).toBeDisabled();

    await page.locator("aside").getByRole("button", { name: "Leading" }).click();
    await expect(chip).toContainText('@ 15 1/2"');

    await page.locator("aside").getByRole("checkbox", { name: "Lock to front fin" }).click();
    await expect(chip).toHaveAttribute("data-callout-chip", "WING 1");
    await expect(chip).toContainText('@ 15 1/2"');
    await expect(position).toBeEnabled();
  });

  test("desktop: a wing past 24 inches grows the close-up's window to hold it", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop project only");

    await addFirstWing(page);
    const closeUp = page.locator("[data-wing-close-up]");
    await expect(closeUp).toHaveAttribute("data-window-hi-in", "26.000");
    await page.locator("aside").getByRole("button", { name: "+ Add wing 2" }).click();
    const position = page.getByRole("slider", { name: "Wing 2 position from tail" });
    await position.focus();
    await page.keyboard.press("End");
    // The default board is 72" long, so its centre is 36" and the window reaches 36" + 3".
    await expect(closeUp).toHaveAttribute("data-window-hi-in", "39.000");
    await expect(closeUp.locator('[data-output-rail="Behind wing 2"]')).toBeVisible();
  });

  test("desktop: Got it closes the pop-up, Open FINS goes to FINS, and coming back lands on the VIEWER tab", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop project only");

    // A real click on "Got it" — not Escape — closes the pop-up (addFirstWing asserts it gone).
    await addFirstWing(page);
    await expect(page.getByRole("tab", { name: "WINGS · 1" })).toHaveAttribute("aria-selected", "true");

    // Remove it and add it again, so the pop-up opens a second time, and take Open FINS.
    const sidebar = page.locator("aside");
    await sidebar.getByRole("button", { name: "Remove" }).click();
    await sidebar.getByRole("button", { name: "+ Add a wing" }).click();
    await page.getByRole("dialog", { name: "Dial in your wing placement" }).getByRole("link", { name: "Open FINS" }).click();
    await expect(page).toHaveURL(/\/design\/fins$/);
    await expect(page.getByRole("dialog")).toHaveCount(0);

    // The founder's ruling (2026-10-15): coming back from FINS lands on VIEWER, the wing still there.
    await page.goBack();
    await expect(page).toHaveURL(/\/design\/outline$/);
    await expect(page.getByRole("tab", { name: "VIEWER" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tab", { name: "WINGS · 1" })).toBeVisible();
  });

  // ---------------------------------------------------------------------------------------------
  // Plan 02 (2026-10-15, D5, P11): the grab points, and the window held still while one is held.
  // ---------------------------------------------------------------------------------------------

  test("desktop: with construction on each wing has two grab points, and pulling the outer one moves the wing along the rail", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop project only");

    await addFirstWing(page);
    await page.locator("aside").getByRole("button", { name: "+ Add wing 2" }).click();
    await expect(page.getByRole("tab", { name: "WINGS · 2" })).toBeVisible();
    const grabs = page.locator("[data-wing-close-up] [data-wing-grab]");
    await expect(grabs).toHaveCount(0);
    await page.getByRole("button", { name: "Show construction lines" }).click();
    await expect(grabs).toHaveCount(4);
    await expect(page.locator("aside")).toContainText("View Construction Lines(the wing's grab points too)");

    const position = wingRow(page, 2, "Position from tail");
    const before = inchesOf(await position.textContent());
    const ppi = await pixelsPerInch(page);
    const start = await grabCentre(page, 2, "outer");
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x, start.y - ppi, { steps: 8 });
    await page.mouse.up();
    await expect.poll(async () => Math.abs(inchesOf(await position.textContent()) - before - 1)).toBeLessThanOrEqual(1 / 16 + 1e-9);
  });

  test("desktop: the close-up's window holds still while a grab point is held, even past 24 inches, and grows when it lifts", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop project only");

    await addFirstWing(page);
    await page.locator("aside").getByRole("button", { name: "+ Add wing 2" }).click();
    await page.getByRole("button", { name: "Show construction lines" }).click();
    const closeUp = page.locator("[data-wing-close-up]");
    await expect(closeUp).toHaveAttribute("data-window-hi-in", "26.000");

    const position = wingRow(page, 2, "Position from tail");
    const before = inchesOf(await position.textContent());
    const ppi = await pixelsPerInch(page);
    const start = await grabCentre(page, 2, "outer");
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await expect(closeUp).toHaveAttribute("data-held", "true");
    // A small pull first: the window reads what it read before the press.
    await page.mouse.move(start.x, start.y - ppi / 2, { steps: 4 });
    await expect(closeUp).toHaveAttribute("data-window-hi-in", "26.000");
    // One move that carries the wing to 25" — past the 24" the window grows at.
    await page.mouse.move(start.x, start.y - (25 - before) * ppi);
    await expect.poll(async () => inchesOf(await position.textContent())).toBeGreaterThan(24);
    await expect(closeUp).toHaveAttribute("data-window-hi-in", "26.000");
    await page.mouse.up();
    await expect(closeUp).not.toHaveAttribute("data-held", "true");
    const after = inchesOf(await position.textContent());
    // The window rule again: the furthest wing plus 3".
    await expect(closeUp).toHaveAttribute("data-window-hi-in", (after + 3).toFixed(3));
  });

  test("desktop: the inner grab point sets a wing's depth in and out and its run along the stringer", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop project only");

    await addFirstWing(page);
    await page.getByRole("button", { name: "Show construction lines" }).click();
    const depth = wingRow(page, 1, "Depth");
    const run = wingRow(page, 1, "Run along the stringer");
    const depthBefore = inchesOf(await depth.textContent());
    const runBefore = inchesOf(await run.textContent());
    const ppi = await pixelsPerInch(page);

    // Toward the stringer (the grab points sit on the right rail, so toward the left).
    let start = await grabCentre(page, 1, "inner");
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x - ppi / 2, start.y, { steps: 6 });
    await page.mouse.up();
    await expect.poll(async () => inchesOf(await depth.textContent())).toBeGreaterThan(depthBefore);

    // Tail-ward: the run grows.
    start = await grabCentre(page, 1, "inner");
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x, start.y + ppi, { steps: 6 });
    await page.mouse.up();
    await expect.poll(async () => inchesOf(await run.textContent())).toBeGreaterThan(runBefore);
  });
});

/** A wing's slider row label (`Depth — 3/8"`), wherever the wing controls are drawn. */
function wingRow(page: Page, wing: number, label: string) {
  return page.locator(`[data-wing-controls="${wing}"]`).getByText(new RegExp(`^${label} — `));
}

/** The inches a row's label reads — `Position from tail — 15 1/2"` is 15.5. Imperial only. */
function inchesOf(text: string | null): number {
  const value = (text ?? "").split(" — ")[1] ?? "";
  const m = value.match(/^(-?)(\d+)?\s*(?:(\d+)\/(\d+))?"/);
  if (!m) throw new Error(`not an inch reading: ${text}`);
  const whole = Number(m[2] ?? 0);
  const fraction = m[3] ? Number(m[3]) / Number(m[4]) : 0;
  return (m[1] ? -1 : 1) * (whole + fraction);
}

/** Screen pixels per inch of board on the close-up: its own units per inch times the svg's scale. */
async function pixelsPerInch(page: Page): Promise<number> {
  return page
    .locator("[data-wing-close-up]")
    .evaluate((svg) => Number((svg as SVGSVGElement).dataset.unitsPerInch) * (svg as SVGSVGElement).getScreenCTM()!.a);
}

/** A grab point's centre on screen. */
async function grabCentre(page: Page, wing: number, point: "outer" | "inner"): Promise<{ x: number; y: number }> {
  const box = await page.locator(`[data-wing-grab="${point}"][data-wing="${wing}"]`).boundingBox();
  if (!box) throw new Error(`wing ${wing}'s ${point} grab point has no box`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}
