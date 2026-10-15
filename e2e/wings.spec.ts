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

  // ---------------------------------------------------------------------------------------------
  // Plan 02, Task 2 (P13): a narrow computer window, Metric, and FINS drawing the wing.
  // ---------------------------------------------------------------------------------------------

  test("desktop: at 1024 x 768 the close-up draws its compact frame, with no station dimensions", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop project only");

    await page.setViewportSize({ width: 1024, height: 768 });
    await addFirstWing(page);
    await expectCompactCloseUpWhole(page);
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
    await expect(closeUp.locator('[data-callout-chip^="WING 1"]')).toContainText("10 mm @ 27.9 cm");
    await expect(closeUp.locator('[data-output-rail="Ahead of wing 1"]')).toContainText("36.2 cm");
    await expect(closeUp.locator('[data-output-rail="Behind wing 1"]')).toContainText("34.0 cm");
    await expect(closeUp.locator('[data-output-rail^="Tail @"]')).toContainText("37.4 cm");
    await expect(wingRow(page, 1, "Depth")).toHaveText("Depth — 10 mm");

    // A drag of the inner point lands the stored depth on a whole millimetre.
    await page.getByRole("button", { name: "Show construction lines" }).click();
    const ppi = await pixelsPerInch(page);
    const start = await grabCentre(page, 1, "inner");
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x - ppi * 0.37, start.y, { steps: 5 });
    await page.mouse.up();
    await expect(wingRow(page, 1, "Depth")).not.toHaveText("Depth — 10 mm");
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

/** On a phone: opens the WINGS tab and adds the first wing from the empty tab's own card. */
async function addFirstWingOnPhone(page: Page) {
  await page.goto("/design/outline");
  await page.getByRole("tab", { name: "ADD WINGS" }).click();
  await page.locator("[data-wings-empty]").getByRole("button", { name: "+ Add a wing" }).click();
  const dialog = page.getByRole("dialog", { name: "Dial in your wing placement" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Got it" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "WINGS · 1" })).toBeVisible();
}

/** The close-up drawn compact and whole: every chip and read-out inside the drawing, no station
 * dimension, nothing wider than the window. */
async function expectCompactCloseUpWhole(page: Page) {
  const closeUp = page.locator("[data-wing-close-up]");
  await expect(closeUp).toHaveAttribute("data-frame", "compact");
  await expect(closeUp.locator("[data-callout-chip]").first()).toBeVisible();
  await expect(closeUp.locator("[data-wing-station-dim]")).toHaveCount(0);
  const svg = await closeUp.boundingBox();
  if (!svg) throw new Error("the close-up has no box");
  // Every overflow is collected before failing, so one run names them all, by how far they stick out.
  const outside: string[] = [];
  for (const part of await closeUp.locator("[data-callout-chip], [data-output-rail]").all()) {
    const box = await part.boundingBox();
    if (!box) continue;
    const name = (await part.getAttribute("data-callout-chip")) ?? (await part.getAttribute("data-output-rail"));
    const past = {
      left: svg.x - box.x,
      top: svg.y - box.y,
      right: box.x + box.width - (svg.x + svg.width),
      bottom: box.y + box.height - (svg.y + svg.height),
    };
    for (const [side, by] of Object.entries(past)) {
      if (by > 0.5) outside.push(`${name} past the ${side} by ${by.toFixed(1)} px`);
    }
  }
  expect(outside).toEqual([]);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
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
  await expectCompactCloseUpWhole(page);
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
