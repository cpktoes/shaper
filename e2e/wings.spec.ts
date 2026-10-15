import { devices, expect, test, type Page } from "@playwright/test";
import { openAppSettings } from "./helpers/settings";

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

  test("desktop: the first wing locks to the front fin's trailing edge, moves with its offset, and unlocks where it stands", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop project only");

    await addFirstWing(page);
    const chip = page.locator('[data-wing-close-up] [data-callout-chip^="WING 1"]');
    // F21 / quick 261015-hz7 D5: the default thruster's front fin trails at 10.977", read as 11"; 3/16" deep.
    await expect(chip).toContainText('3/16" @ 11"');
    await expect(chip).toHaveAttribute("data-callout-chip", "WING 1 · FIN");
    const position = page.getByRole("slider", { name: "Wing 1 position from tail" });
    await expect(position).toBeDisabled();
    // D1: no Fin edge picker — the lock always follows the trailing edge.
    await expect(page.locator("aside").getByRole("button", { name: "Leading" })).toHaveCount(0);

    // The offset's End is +3" toward the nose: 10.977" + 3" reads 14".
    await page.getByRole("slider", { name: "Wing 1 offset from the fin" }).focus();
    await page.keyboard.press("End");
    await expect(chip).toContainText('@ 14"');

    await page.locator("aside").getByRole("checkbox", { name: "Lock to front fin" }).click();
    await expect(chip).toHaveAttribute("data-callout-chip", "WING 1");
    await expect(chip).toContainText('@ 14"');
    await expect(position).toBeEnabled();
  });

  test("desktop: a wing past 24 inches grows the close-up's window to hold it", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop project only");

    await addFirstWing(page);
    const closeUp = page.locator("[data-wing-close-up]");
    await expect(closeUp).toHaveAttribute("data-window-hi-in", "26.000");
    await page.locator("aside").getByRole("button", { name: "+ Add wing 2" }).click();
    // Quick 261015-hz7 (D2, D3): wing 1 is the forward wing, so it is wing 1 that goes up the board.
    await page.locator("aside").getByRole("checkbox", { name: "Lock to front fin" }).click();
    const position = page.getByRole("slider", { name: "Wing 1 position from tail" });
    await position.focus();
    await page.keyboard.press("End");
    // The default board's top is its widepoint, 35 1/2" (its centre is 36"), so the window reaches 35 1/2" + 3".
    await expect(closeUp).toHaveAttribute("data-window-hi-in", "38.500");
    await expect(closeUp.locator('[data-output-rail="Behind wing 1"]')).toBeVisible();
  });

  // -------------------------------------------------------------------------------------------
  // Quick 261015-hz7 (2026-10-15): the founder's fixes after the first preview — the slot locks
  // (D1), wing 2 behind wing 1 (D2) and the position top (D3).
  // -------------------------------------------------------------------------------------------

  test("desktop: on the Mid-length quad wing 2 locks to the rear fins, and wing 1 slid to its minimum pushes wing 2 to 2 inches", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop project only");

    await openPreset(page, "Mid-length");
    await addWingsOnTab(page);
    const sidebar = page.locator("aside");
    await sidebar.getByRole("button", { name: "+ Add wing 2" }).click();
    await expect(page.getByRole("tab", { name: "WINGS · 2" })).toBeVisible();

    // F7: the Mid-length's rear fins trail at 6 1/4"; wing 2 locks there.
    const wing2 = page.locator('[data-wing-controls="2"]');
    await expect(wing2.getByRole("checkbox", { name: "Lock to rear fin" })).toBeChecked();
    const chip2 = page.locator('[data-wing-close-up] [data-callout-chip^="WING 2"]');
    await expect(chip2).toHaveAttribute("data-callout-chip", "WING 2 · FIN");
    await expect(chip2).toContainText('@ 6 1/4"');

    // Wing 1 locked at the front fins' 12", its position row disabled.
    const position1 = page.getByRole("slider", { name: "Wing 1 position from tail" });
    await expect(position1).toBeDisabled();
    await expect(wingRow(page, 1, "Position from tail")).toHaveText('Position from tail — 12"');

    // Unlocked and slid to its minimum: 2" plus its 1/2" gap — and wing 2 pushed to its limit, the 2" floor.
    await page.locator('[data-wing-controls="1"]').getByRole("checkbox", { name: "Lock to front fin" }).click();
    await expect(position1).toBeEnabled();
    await position1.focus();
    await page.keyboard.press("Home");
    await expect(wingRow(page, 1, "Position from tail")).toHaveText('Position from tail — 2 1/2"');
    await expect(wingRow(page, 2, "Position from tail")).toHaveText('Position from tail — 2"');
  });

  test("desktop: a wing deeper than 3/16 inch at the front fins' trailing edge shows the founder's fin-box line, in both systems", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop project only");

    await addFirstWing(page);
    const warning = page.locator('[data-wing-fin-box-warning="1"]');
    await expect(wingRow(page, 1, "Depth")).toHaveText('Depth — 3/16"');
    await expect(warning).toHaveCount(0);

    const depth = page.getByRole("slider", { name: "Wing 1 depth" });
    await depth.focus();
    await page.keyboard.press("ArrowRight");
    await expect(wingRow(page, 1, "Depth")).toHaveText('Depth — 1/4"');
    // D4: 2 x 1/4" less 1/4" = 1/4".
    await expect(warning).toBeVisible();
    await expect(warning).toContainText('at least 1/4" behind');
    await expect(warning).toContainText("Check your fin box's spec too.");
    await page.keyboard.press("ArrowLeft");
    await expect(warning).toHaveCount(0);

    // Metric: one step deeper than 3/16" is 6 mm; 2 x 6 less 6.35 reads 6 mm, and 1/4" reads 6 mm.
    const dialog = await openAppSettings(page);
    await dialog.getByRole("group", { name: "Units" }).getByRole("button", { name: /^Metric/ }).click();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await depth.focus();
    await page.keyboard.press("ArrowRight");
    await expect(wingRow(page, 1, "Depth")).toHaveText("Depth — 6 mm");
    await expect(warning).toContainText("at least 6 mm behind");
    await expect(warning).toContainText("less 6 mm");
  });

  test("desktop: with wing 1 at 2 inches there is no room for wing 2, and the button says why", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop project only");

    await addFirstWing(page);
    const sidebar = page.locator("aside");
    await sidebar.getByRole("checkbox", { name: "Lock to front fin" }).click();
    const position = page.getByRole("slider", { name: "Wing 1 position from tail" });
    await position.focus();
    await page.keyboard.press("Home");
    await expect(wingRow(page, 1, "Position from tail")).toHaveText('Position from tail — 2"');
    const add = sidebar.getByRole("button", { name: "+ Add wing 2" });
    await expect(add).toBeDisabled();
    await expect(sidebar.locator("[data-wing-add-note]")).toHaveText(
      'No room for wing 2 — it sits at least 1/2" behind wing 1 and 2" from the tail.',
    );
    await position.focus();
    await page.keyboard.press("End");
    await expect(add).toBeEnabled();
    await expect(sidebar.locator("[data-wing-add-note]")).toHaveCount(0);
  });

  test("desktop: on the Mid-length a rear-locked wing 2 is held behind wing 1, and a thruster's wing 2 has no lock", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop project only");

    await openPreset(page, "Mid-length");
    await addWingsOnTab(page);
    const sidebar = page.locator("aside");
    await sidebar.getByRole("button", { name: "+ Add wing 2" }).click();
    await expect(sidebar.locator("[data-wing-held-note]")).toHaveCount(0);
    // F8: wing 1 at its front fins less 3" (9") with a 2" run puts wing 2's limit at 5".
    await page.getByRole("slider", { name: "Wing 1 offset from the fin" }).focus();
    await page.keyboard.press("Home");
    await page.getByRole("slider", { name: "Wing 1 run along the stringer" }).focus();
    await page.keyboard.press("End");
    await expect(wingRow(page, 1, "Position from tail")).toHaveText('Position from tail — 9"');
    await expect(sidebar.locator("[data-wing-held-note]")).toHaveText(
      'Held at 5" — wing 2 stays at least 4" behind wing 1.',
    );
    await expect(wingRow(page, 2, "Position from tail")).toHaveText('Position from tail — 5"');
  });

  test("desktop: on the default thruster wing 2 has no lock at all, and sits 3 inches behind wing 1", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop project only");

    await addFirstWing(page);
    const sidebar = page.locator("aside");
    await sidebar.getByRole("button", { name: "+ Add wing 2" }).click();
    await expect(page.locator('[data-wing-controls="2"]')).toBeVisible();
    await expect(sidebar.getByRole("checkbox", { name: "Lock to rear fin" })).toHaveCount(0);
    // F7: 10.977" less 3", floored onto the 1/16" grid.
    await expect(wingRow(page, 2, "Position from tail")).toHaveText('Position from tail — 7 15/16"');
    await expect(page.getByRole("slider", { name: "Wing 2 position from tail" })).toBeEnabled();
  });

  test("desktop: the empty ADD WINGS tab draws the bare tail with no card, and only the first wing opens the pop-up", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop project only");

    await page.goto("/design/outline");
    await page.getByRole("tab", { name: "ADD WINGS" }).click();
    await expect(page.locator("[data-wing-close-up]")).toBeVisible();
    await expect(page.getByText("No wings yet")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "+ Add a wing" })).toHaveCount(1);
    await page.locator("aside").getByRole("button", { name: "+ Add a wing" }).click();
    await expect(page.getByRole("dialog", { name: "Dial in your wing placement" })).toHaveCount(1);
    await page.getByRole("dialog").getByRole("button", { name: "Got it" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.locator("aside").getByRole("button", { name: "+ Add wing 2" }).click();
    await expect(page.getByRole("tab", { name: "WINGS · 2" })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
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
    // Quick 261015-hz7 (D2): wing 1 is the forward wing — unlock it and carry IT up the board.
    await page.locator("aside").getByRole("checkbox", { name: "Lock to front fin" }).click();
    await page.getByRole("button", { name: "Show construction lines" }).click();
    const closeUp = page.locator("[data-wing-close-up]");
    await expect(closeUp).toHaveAttribute("data-window-hi-in", "26.000");

    const position = wingRow(page, 1, "Position from tail");
    const before = inchesOf(await position.textContent());
    const ppi = await pixelsPerInch(page);
    const start = await grabCentre(page, 1, "outer");
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

  // ---------------------------------------------------------------------------------------------
  // Plan 02, Task 2 (P13): a narrow computer window, Metric, and FINS drawing the wing.
  // ---------------------------------------------------------------------------------------------

  test("desktop: at 1024 x 768 the close-up draws its compact frame, with no station dimensions", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop project only");

    await page.setViewportSize({ width: 1024, height: 768 });
    await addFirstWing(page);
    await expectCloseUpWhole(page, "compact");
  });

  test("desktop: in Metric the wing reads its position and widths in centimetres and its depth in millimetres, and a drag lands on a whole millimetre", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop project only");

    await page.goto("/design/outline");
    const dialog = await openAppSettings(page);
    const units = dialog.getByRole("group", { name: "Units" });
    await units.getByRole("button", { name: /^Metric/ }).click();
    await expect(units.getByRole("button", { name: /^Metric/ })).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);

    await page.getByRole("tab", { name: "ADD WINGS" }).click();
    await page.locator("aside").getByRole("button", { name: "+ Add a wing" }).click();
    await page.getByRole("dialog", { name: "Dial in your wing placement" }).getByRole("button", { name: "Got it" }).click();

    // F21, in Metric: the position is a dim (centimetres), the depth a mark (whole millimetres).
    const closeUp = page.locator("[data-wing-close-up]");
    // Quick 261015-hz7 (D5, F8): the first wing is 3/16" deep — 5 mm.
    await expect(closeUp.locator('[data-callout-chip^="WING 1"]')).toContainText("5 mm @ 27.9 cm");
    await expect(closeUp.locator('[data-output-rail="Ahead of wing 1"]')).toContainText("36.2 cm");
    await expect(closeUp.locator('[data-output-rail="Behind wing 1"]')).toContainText("35.0 cm");
    await expect(closeUp.locator('[data-output-rail^="Tail @"]')).toContainText("37.4 cm");
    await expect(wingRow(page, 1, "Depth")).toHaveText("Depth — 5 mm");

    // A drag of the inner point lands the stored depth on a whole millimetre.
    await page.getByRole("button", { name: "Show construction lines" }).click();
    const ppi = await pixelsPerInch(page);
    const start = await grabCentre(page, 1, "inner");
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x - ppi * 0.37, start.y, { steps: 5 });
    await page.mouse.up();
    await expect(wingRow(page, 1, "Depth")).not.toHaveText("Depth — 5 mm");
    await expect(wingRow(page, 1, "Depth")).toHaveText(/^Depth — \d+ mm$/);
    const stored = Number(await page.getByRole("slider", { name: "Wing 1 depth" }).getAttribute("aria-valuenow"));
    expect(Number.isInteger(stored)).toBe(true);
  });

  test("desktop: FINS draws the tail with the wing's step in it", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop project only");

    // A board without wings first: FINS' own tail drawing, with Import Template ticked (D8).
    await page.goto("/design/fins");
    const tail = page.locator('[data-fin-plot] path[stroke="var(--outline-ink)"]').first();
    await expect(tail).toBeVisible();
    const plain = await tail.getAttribute("d");

    await page.goto("/design/outline");
    await page.getByRole("tab", { name: "ADD WINGS" }).click();
    await page.locator("aside").getByRole("button", { name: "+ Add a wing" }).click();
    await page.getByRole("dialog", { name: "Dial in your wing placement" }).getByRole("link", { name: "Open FINS" }).click();
    await expect(page).toHaveURL(/\/design\/fins$/);
    await expect(tail).toBeVisible();
    await expect.poll(() => tail.getAttribute("d")).not.toBe(plain);
  });
});

// -------------------------------------------------------------------------------------------------
// Plan 02, Task 2 (D3, P13, P14): the close-up on a phone, upright and sideways, and a thumb drag.
// -------------------------------------------------------------------------------------------------

/** On a phone: opens the WINGS tab and adds the first wing from the stacked controls' "+ Add a wing" (the empty tab has no card since quick 261015-hz7, D6). */
async function addFirstWingOnPhone(page: Page) {
  await page.goto("/design/outline");
  await page.getByRole("tab", { name: "ADD WINGS" }).click();
  await page.locator("[data-design-controls-scroll]").getByRole("button", { name: "+ Add a wing" }).click();
  const dialog = page.getByRole("dialog", { name: "Dial in your wing placement" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Got it" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "WINGS · 1" })).toBeVisible();
}

/**
 * The close-up drawn whole (quick 261015-hz7, D7, D8): every chip and read-out inside the drawing on
 * all four sides, and every chip's two lines of text inside its own box, side to side. With `frame`
 * it also checks which frame drew — the compact one has no station dimension. Nothing is wider than
 * the window. Every miss is collected before failing, so one run names them all.
 */
async function expectCloseUpWhole(page: Page, frame?: "compact" | "full") {
  const closeUp = page.locator("[data-wing-close-up]");
  if (frame) await expect(closeUp).toHaveAttribute("data-frame", frame);
  await expect(closeUp.locator("[data-callout-chip]").first()).toBeVisible();
  if (frame === "compact") await expect(closeUp.locator("[data-wing-station-dim]")).toHaveCount(0);
  const misses = await closeUp.evaluate((svg) => {
    const out: string[] = [];
    const s = svg.getBoundingClientRect();
    for (const part of svg.querySelectorAll("[data-callout-chip], [data-output-rail]")) {
      const box = part.getBoundingClientRect();
      const name = part.getAttribute("data-callout-chip") ?? part.getAttribute("data-output-rail");
      const past = { left: s.left - box.left, top: s.top - box.top, right: box.right - s.right, bottom: box.bottom - s.bottom };
      for (const [side, by] of Object.entries(past)) if (by > 0.5) out.push(`${name} past the ${side} by ${by.toFixed(1)} px`);
    }
    out.push(...chipTextMisses(svg));
    return out;

    function chipTextMisses(root: Element): string[] {
      const found: string[] = [];
      for (const chip of root.querySelectorAll("[data-callout-chip]")) {
        const rect = chip.querySelector("rect")?.getBoundingClientRect();
        if (!rect) continue;
        for (const text of chip.querySelectorAll("text")) {
          const t = text.getBoundingClientRect();
          const by = Math.max(rect.left - t.left, t.right - rect.right);
          if (by > 0.5) found.push(`${chip.getAttribute("data-callout-chip")} "${text.textContent}" past its chip by ${by.toFixed(1)} px`);
        }
      }
      return found;
    }
  });
  expect(misses).toEqual([]);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

/**
 * The VIEWER's chips clear of each other and of the drawing (quick 261015-hz7, D8, D9): every chip
 * and its text inside the drawing, every chip's text inside its own box side to side, and every two
 * chips at least the gap the WIDEPOINT / WP OFFSET pair keeps — upright, the pair's own step less a
 * chip, max(38, chip height) + 6 − chip height in drawing units; turned, 6 units — read at the
 * drawing's own scale, with a half-pixel tolerance.
 */
async function expectViewerChipsClear(page: Page, orientation: "upright" | "turned") {
  const silhouette = page.locator("[data-board-silhouette='outline']");
  await expect(silhouette).toBeVisible();
  await expect(page.locator('[data-callout-chip^="WING"]').first()).toBeVisible();
  const misses = await silhouette.evaluate((el, turned) => {
    let svg = (el as SVGElement).ownerSVGElement!;
    while (svg.ownerSVGElement) svg = svg.ownerSVGElement;
    const scale = svg.getScreenCTM()!.a;
    const s = svg.getBoundingClientRect();
    const out: string[] = [];
    const chips = [...svg.querySelectorAll("[data-callout-chip]")].map((chip) => ({
      name: chip.getAttribute("data-callout-chip") ?? "?",
      rect: chip.querySelector("rect")!.getBoundingClientRect(),
      texts: [...chip.querySelectorAll("text")].map((t) => ({ text: t.textContent, box: t.getBoundingClientRect() })),
    }));
    for (const c of chips) {
      const boxes = [{ what: "chip", box: c.rect }, ...c.texts.map((t) => ({ what: `"${t.text}"`, box: t.box }))];
      for (const { what, box } of boxes) {
        const past = { left: s.left - box.left, top: s.top - box.top, right: box.right - s.right, bottom: box.bottom - s.bottom };
        for (const [side, by] of Object.entries(past)) if (by > 0.5) out.push(`${c.name} ${what} past the drawing's ${side} by ${by.toFixed(1)} px`);
      }
      for (const t of c.texts) {
        const by = Math.max(c.rect.left - t.box.left, t.box.right - c.rect.right);
        if (by > 0.5) out.push(`${c.name} "${t.text}" past its chip by ${by.toFixed(1)} px`);
      }
    }
    for (let i = 0; i < chips.length; i++) {
      for (let j = i + 1; j < chips.length; j++) {
        const a = chips[i].rect;
        const b = chips[j].rect;
        const apart = Math.max(a.left - b.right, b.left - a.right, a.top - b.bottom, b.top - a.bottom);
        const chipH = Math.min(a.height, b.height);
        const need = turned ? 6 * scale : Math.max(38 * scale, chipH) + 6 * scale - chipH;
        if (apart < need - 0.5) out.push(`${chips[i].name} / ${chips[j].name} ${apart.toFixed(2)} px apart, need ${need.toFixed(2)}`);
      }
    }
    return out;
  }, orientation === "turned");
  expect(misses).toEqual([]);
}

/** The phone's own checks: the close-up above the stacked controls, the wing controls in them, and
 * none of the Template Builder's. */
async function expectPhoneWingsLayout(page: Page) {
  const closeUp = page.locator("[data-wing-close-up]");
  const controls = page.locator("[data-design-controls-scroll]");
  await expect(controls.getByText("Wings", { exact: true })).toBeVisible();
  await expect(page.getByText("Board Length")).toHaveCount(0);
  const drawing = await closeUp.boundingBox();
  const stack = await controls.boundingBox();
  if (!drawing || !stack) throw new Error("the close-up or the controls have no box");
  await expectCloseUpWhole(page, "compact");
  return { drawing, stack };
}

test.describe("wings on a phone held upright (plan 02)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "the phone projects only");
    await dismissSignInBanner(page);
  });

  test("the close-up draws compact and whole above the wing controls", async ({ page }) => {
    await addFirstWingOnPhone(page);
    const { drawing, stack } = await expectPhoneWingsLayout(page);
    expect(drawing.y + drawing.height).toBeLessThanOrEqual(stack.y + 1);
  });

  test("a thumb on wing 1's outer grab point pulls it toward the nose", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "android", "CDP touch dispatch is Chromium-only (the android project)");

    await addFirstWingOnPhone(page);
    // Construction is on by default for a touch screen (D-02), so the grab points show untouched.
    const grabs = page.locator("[data-wing-close-up] [data-wing-grab]");
    await expect(grabs).toHaveCount(2);
    const position = wingRow(page, 1, "Position from tail");
    const before = inchesOf(await position.textContent());
    const ppi = await pixelsPerInch(page);
    const start = await grabCentre(page, 1, "outer");

    // Copied from e2e/outline-ghost.spec.ts's own CDP touch drag, as every spec here copies it.
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: start.x, y: start.y }] });
    for (let step = 1; step <= 6; step++) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: start.x, y: start.y - (2 * ppi * step) / 6 }],
      });
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });

    await expect.poll(async () => inchesOf(await position.textContent())).toBeGreaterThan(before + 1);
  });
});

// The sideways phones, built as e2e/phone-sideways-top-bar.spec.ts builds them: Playwright's Pixel 7
// landscape descriptor, and a real sideways iPhone's 844 x 390 (the emulator's own 750 x 340 is not
// real hardware). `defaultBrowserType` cannot be set inside a describe and is redundant here.
const { defaultBrowserType: pixel7LandscapeBrowserType, ...pixel7Landscape } = devices["Pixel 7 landscape"];
void pixel7LandscapeBrowserType;
const {
  defaultBrowserType: iphoneLandscapeBrowserType,
  viewport: iphoneLandscapeEmulatorViewport,
  ...iphoneLandscapeRest
} = devices["iPhone 14 landscape"];
void iphoneLandscapeBrowserType;
void iphoneLandscapeEmulatorViewport;
const realSidewaysIphone = { ...iphoneLandscapeRest, viewport: { width: 844, height: 390 } };

/** Sideways: the desktop shell by width, the phone's compact top bar by height (CLAUDE.md
 * "Layout"), and the close-up compact and whole beside the wing controls. */
async function expectSidewaysWings(page: Page) {
  await addFirstWingOnPhone(page);
  await expect(page.getByRole("banner").getByRole("button", { name: "Menu" })).toBeVisible();
  await expectPhoneWingsLayout(page);
}

test.describe("wings on a Pixel 7 held sideways (plan 02)", () => {
  test.use({ ...pixel7Landscape });
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "android", "this describe supplies its own device (Pixel 7 landscape)");
    await dismissSignInBanner(page);
  });

  test("the close-up draws compact and whole, under the phone's compact top bar", async ({ page }) => {
    await expectSidewaysWings(page);
  });
});

test.describe("wings on a real iPhone held sideways (plan 02)", () => {
  test.use({ ...realSidewaysIphone });
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "iphone", "this describe supplies its own viewport (844 x 390, WebKit)");
    await dismissSignInBanner(page);
  });

  test("the close-up draws compact and whole, under the phone's compact top bar", async ({ page }) => {
    await expectSidewaysWings(page);
  });
});

/** Opens a preset from the home screen's cards by name — `e2e/phone-screen-tiles.spec.ts`'s own
 * `openPreset`, copied with its `toPass` retry (the card click flaked under three workers, F13). */
async function openPreset(page: Page, name: string) {
  await page.goto("/");
  const button = page.getByRole("button").filter({ hasText: "Start Shaping" }).filter({ hasText: name }).first();
  await expect(async () => {
    await button.click();
    await expect(page).toHaveURL(/\/design\/outline$/, { timeout: 3_000 });
  }).toPass({ timeout: 30_000 });
}

/** On the TEMPLATE page already open: the WINGS tab, the first wing from the sidebar (or the phone's
 * stacked controls), and the dial-in pop-up closed. */
async function addWingsOnTab(page: Page) {
  await page.getByRole("tab", { name: "ADD WINGS" }).click();
  await page.getByRole("button", { name: "+ Add a wing" }).click();
  const dialog = page.getByRole("dialog", { name: "Dial in your wing placement" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Got it" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "WINGS · 1" })).toBeVisible();
}

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

// -------------------------------------------------------------------------------------------------
// Quick 261015-hz7 (2026-10-15, D7, D8, D9): every wing label fits — the close-up's read-outs and
// chips inside the drawing, every wing value inside its chip, and every VIEWER chip the pair's own
// gap from its neighbours — on five boards, on a computer and on both phones either way up.
// -------------------------------------------------------------------------------------------------

/** The five boards: the default board (no card to click) and the four preset cards. */
const FIVE_BOARDS = ["default", "Shortboard", "Fish", "Mid-length", "Longboard"] as const;
type BoardName = (typeof FIVE_BOARDS)[number];

/** Opens a board on TEMPLATE and adds its first wing on the WINGS tab. */
async function openBoardWithAWing(page: Page, board: BoardName) {
  if (board === "default") await page.goto("/design/outline");
  else await openPreset(page, board);
  await addWingsOnTab(page);
}

/**
 * Places the two wings by the sidebar (F13: End, Home and the arrow keys only). A: wing 1 unlocked
 * and slid to its top (a stinger), wing 2 where "+ Add wing 2" puts it — rear-locked on the
 * Mid-length. B: wing 1 at its top and wing 2 at its limit, 1/2" behind it (on the Mid-length its
 * rear lock unticked first).
 */
async function placeTwoWings(page: Page, placement: "A" | "B") {
  const lock1 = page.locator('[data-wing-controls="1"]').getByRole("checkbox", { name: "Lock to front fin" });
  if (await lock1.isChecked()) await lock1.click();
  const position1 = page.getByRole("slider", { name: "Wing 1 position from tail" });
  await expect(position1).toBeEnabled();
  await position1.focus();
  await page.keyboard.press("End");
  await page.getByRole("button", { name: "+ Add wing 2" }).click();
  await expect(page.getByRole("tab", { name: "WINGS · 2" })).toBeVisible();
  if (placement === "B") {
    const lock2 = page.locator('[data-wing-controls="2"]').getByRole("checkbox", { name: "Lock to rear fin" });
    if ((await lock2.count()) > 0 && (await lock2.isChecked())) await lock2.click();
    const position2 = page.getByRole("slider", { name: "Wing 2 position from tail" });
    await expect(position2).toBeEnabled();
    await position2.focus();
    await page.keyboard.press("End");
  }
}

/** The close-up whole, then the VIEWER's chips clear upright and — with the Rotate button, a
 * computer only — turned. */
async function expectWingLabelsFit(page: Page, orientation: "upright" | "turned" | "both") {
  await expectCloseUpWhole(page);
  await page.getByRole("tab", { name: "VIEWER" }).click();
  if (orientation === "turned") {
    await expectViewerChipsClear(page, "turned");
    return;
  }
  await expectViewerChipsClear(page, "upright");
  if (orientation === "both") {
    await page.getByRole("button", { name: "Rotate the board to horizontal" }).click();
    await expect(page.getByRole("button", { name: "Rotate the board to vertical" })).toBeVisible();
    await expectViewerChipsClear(page, "turned");
  }
}

/** The widest wing values (D8, F9): on the Longboard, wing 1 a step under its top with a depth a step
 * under 1" in Imperial (`15/16" @ 53 15/16"`), then both at their ends in Metric (`25 mm @ 137.1 cm`)
 * — each WING chip's value inside its chip on the close-up and the VIEWER. */
async function expectWidestWingValuesFit(page: Page, orientation: "upright" | "turned") {
  await openBoardWithAWing(page, "Longboard");
  const position = page.getByRole("slider", { name: "Wing 1 position from tail" });
  const depth = page.getByRole("slider", { name: "Wing 1 depth" });
  await position.focus();
  await page.keyboard.press("End");
  await page.keyboard.press("ArrowLeft");
  await depth.focus();
  await page.keyboard.press("End");
  await page.keyboard.press("ArrowLeft");
  const closeUpChip = page.locator('[data-wing-close-up] [data-callout-chip^="WING 1"]');
  await expect(closeUpChip).toContainText('15/16" @ 53 15/16"');
  await expectCloseUpWhole(page);
  await page.getByRole("tab", { name: "VIEWER" }).click();
  await expect(page.locator('[data-callout-chip="WING 1"]')).toContainText('15/16" @ 53 15/16"');
  await expectViewerChipsClear(page, orientation);

  const dialog = await openAppSettings(page);
  await dialog.getByRole("group", { name: "Units" }).getByRole("button", { name: /^Metric/ }).click();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await page.getByRole("tab", { name: /^WINGS/ }).click();
  await position.focus();
  await page.keyboard.press("End");
  await depth.focus();
  await page.keyboard.press("End");
  await expect(closeUpChip).toContainText("25 mm @ 137.1 cm");
  await expectCloseUpWhole(page);
  await page.getByRole("tab", { name: "VIEWER" }).click();
  await expect(page.locator('[data-callout-chip="WING 1"]')).toContainText("25 mm @ 137.1 cm");
  await expectViewerChipsClear(page, orientation);
}

test.describe("every wing label fits on a computer (quick 261015-hz7)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop project only");
    await dismissSignInBanner(page);
  });

  for (const board of FIVE_BOARDS) {
    for (const placement of ["A", "B"] as const) {
      test(`1024 x 768, ${board}, placement ${placement}: the close-up whole, the VIEWER's chips clear upright and turned`, async ({
        page,
      }) => {
        test.slow();
        await page.setViewportSize({ width: 1024, height: 768 });
        await openBoardWithAWing(page, board);
        await placeTwoWings(page, placement);
        await expectWingLabelsFit(page, "both");
      });
    }
  }

  test("1280 x 800, the default board, placement B: the close-up whole, the VIEWER's chips clear upright and turned", async ({
    page,
  }) => {
    test.slow();
    await page.setViewportSize({ width: 1280, height: 800 });
    await openBoardWithAWing(page, "default");
    await placeTwoWings(page, "B");
    await expectWingLabelsFit(page, "both");
  });

  test("1024 x 768: the widest wing values sit inside their chips, in Imperial and Metric", async ({ page }) => {
    test.slow();
    await page.setViewportSize({ width: 1024, height: 768 });
    await expectWidestWingValuesFit(page, "upright");
  });
});

test.describe("every wing label fits on a phone held upright (quick 261015-hz7)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "the phone projects only");
    await dismissSignInBanner(page);
  });

  for (const board of ["default", "Longboard"] as const) {
    test(`${board}, placement B: the close-up whole, the VIEWER's chips clear`, async ({ page }) => {
      test.slow();
      await openBoardWithAWing(page, board);
      await placeTwoWings(page, "B");
      await expectWingLabelsFit(page, "upright");
    });
  }
});

test.describe("every wing label fits on a Pixel 7 held sideways (quick 261015-hz7)", () => {
  test.use({ ...pixel7Landscape });
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "android", "this describe supplies its own device (Pixel 7 landscape)");
    await dismissSignInBanner(page);
  });

  for (const board of ["default", "Longboard"] as const) {
    test(`${board}, placement B: the close-up whole, the turned VIEWER's chips clear`, async ({ page }) => {
      test.slow();
      await openBoardWithAWing(page, board);
      await placeTwoWings(page, "B");
      await expectWingLabelsFit(page, "turned");
    });
  }
});

test.describe("every wing label fits on a real iPhone held sideways (quick 261015-hz7)", () => {
  test.use({ ...realSidewaysIphone });
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "iphone", "this describe supplies its own viewport (844 x 390, WebKit)");
    await dismissSignInBanner(page);
  });

  for (const board of ["default", "Longboard"] as const) {
    test(`${board}, placement B: the close-up whole, the turned VIEWER's chips clear`, async ({ page }) => {
      test.slow();
      await openBoardWithAWing(page, board);
      await placeTwoWings(page, "B");
      await expectWingLabelsFit(page, "turned");
    });
  }

  test("the widest wing values sit inside their chips, in Imperial and Metric", async ({ page }) => {
    test.slow();
    await expectWidestWingValuesFit(page, "turned");
  });
});
