import { expect, test, type Page } from "@playwright/test";

/**
 * PHON-03's proof: on the iphone and android projects, every control this plan resized —
 * buttons, the slider's hit ring, typed measure fields and checkbox rows — measures at least
 * 44 CSS px for a finger, and a typed field never zooms the page on focus. On the desktop
 * project the same controls measure exactly today's smaller sizes, proving every rule stayed
 * keyed to the pointer (`coarse:`), never to the viewport.
 *
 * This plan's own spec file (per its header note in the sibling `e2e/phone-layout.spec.ts`,
 * which owns the phone-shell surface and is not extended here) — later plans in this phase
 * extend THIS file rather than starting a new one for touch-sizing assertions.
 */

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";
const UNITS_STORAGE_KEY = "shaper-units";
// 260909-hny insurance: today this changes no measurement, because the toolbar tip is already
// `display: none` in every Playwright project (see e2e/phone-toolbar-tip.spec.ts's header
// comment). It's dismissed here anyway so that if Playwright's WebKit ever implements
// `-webkit-touch-callout`, a strip does not silently appear above every pinned-height and
// bounding-box assertion in this file.
const TOOLBAR_TIP_DISMISSAL_KEY = "shaper-toolbar-tip-dismissed";

/** Matches phone-layout.spec.ts's own approach: dismiss the sign-in banner via sessionStorage,
 * set before navigation, so its own height never confuses a layout assertion. */
async function dismissSignInBanner(page: Page) {
  await page.addInitScript((key) => {
    window.sessionStorage.setItem(key, "true");
  }, BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, "true");
  }, TOOLBAR_TIP_DISMISSAL_KEY);
}

/** Board Length only renders as a typed `MeasureField` in Metric — Imperial shows a pair of
 * feet/inches `Select` combos instead (D-08). Setting the browser preference before navigation
 * (the same storage key `components/units-provider.tsx` reads) is how this spec reaches a real
 * typed field on TEMPLATE and VOLUME without clicking through the phone menu on every test. */
async function setMetricUnits(page: Page) {
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, "metric");
  }, UNITS_STORAGE_KEY);
}

/** A slider thumb's touch target is invisible: `size-3` (12px) is the dot a shaper sees, and
 * `after:-inset-2`/`coarse:after:-inset-4` is a pseudo-element nobody can select directly. This
 * reads the pseudo-element's own computed `inset` (equal on all four sides, since the class is
 * a single `-inset-N` utility) and inflates the thumb's own bounding box by that amount on every
 * side — the union box the pseudo-element actually produces. */
async function slideThumbTargetBox(locator: ReturnType<Page["locator"]>) {
  return locator.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    const afterInset = getComputedStyle(el, "::after").top; // e.g. "-16px"; all four sides match
    const extend = Math.abs(parseFloat(afterInset));
    return { width: rect.width + extend * 2, height: rect.height + extend * 2 };
  });
}

/** Only `default` and `icon` Button instances are in this plan's scope (Task 1) — every other
 * size (`xs`/`sm`/`lg`/`icon-xs`/`icon-sm`/`icon-lg`) is deliberately left alone, and this
 * codebase's one `sm` button reachable from these two screens (the dev-only "Copy preset
 * values" footer) would fail a blanket assertion. `h-8`/`size-8` are the literal class tokens
 * unique to those two variants, so filtering on them (rather than scoping to a DOM region) finds
 * every in-scope button on the page — including the phone top bar's Save button — without
 * pulling in the ones this plan intentionally left untouched. */
const DEFAULT_OR_ICON_BUTTON = '[data-slot="button"].h-8, [data-slot="button"].size-8';

/** Opens RAILS's INSTRUCTIONS page, where the Flat / Domed pair lives. Retried, because a tap that
 * lands before the page has hydrated does nothing — and only tapped again while the pair is still
 * hidden, so a retry can never undo a switch that already happened. */
async function openRailInstructions(page: Page) {
  const tab = page.getByRole("tab", { name: "INSTRUCTIONS" });
  const flat = page.getByRole("button", { name: "Flat", exact: true });
  await expect(tab).toBeVisible();
  await expect(async () => {
    if (!(await flat.isVisible())) await tab.click();
    await expect(flat).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 20_000 });
}

test.describe("touch sizing — every control at least 44px for a finger", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "touch-only sizing assertions");
    await dismissSignInBanner(page);
    await setMetricUnits(page);
  });

  // ROCKER joined this loop in plan 11-12 (Phase 11): its Center Thickness box, the blank search
  // box and every slider it shows with no blank picked. It has no checkbox rows, so that one check
  // is generated for TEMPLATE and VOLUME only; the blank list, the text links and the DATASHEET's
  // typed cells are measured in the ROCKER-only test further down, once a blank is picked.
  for (const path of ["/design/outline", "/design/volume", "/design/rocker"] as const) {
    test(`${path}: every visible slider thumb's tap target is at least 44x44`, async ({ page }) => {
      await page.goto(path);
      const thumbs = page.locator('[data-slot="slider-thumb"]');
      await expect(thumbs.first()).toBeVisible();

      let checked = 0;
      for (const thumb of await thumbs.all()) {
        if (!(await thumb.isVisible())) continue;
        const box = await slideThumbTargetBox(thumb);
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
        checked += 1;
      }
      expect(checked).toBeGreaterThan(0);
    });

    test(`${path}: every visible typed measure field is at least 44px tall with 16px text`, async ({
      page,
    }) => {
      await page.goto(path);
      const fields = page.locator('[data-slot="input"]');
      await expect(fields.first()).toBeVisible();

      let checked = 0;
      for (const field of await fields.all()) {
        if (!(await field.isVisible())) continue;
        const box = await field.boundingBox();
        if (!box) throw new Error("measure field is missing a bounding box");
        expect(box.height).toBeGreaterThanOrEqual(44);
        const fontSize = await field.evaluate((el) => getComputedStyle(el).fontSize);
        // Exact string comparison (RESEARCH.md's own wording): a 15.5px field must fail, not
        // round into a pass.
        expect(fontSize).toBe("16px");
        checked += 1;
      }
      expect(checked).toBeGreaterThan(0);
    });

    test(`${path}: every visible default/icon button is at least 44x44`, async ({ page }) => {
      await page.goto(path);
      const buttons = page.locator(DEFAULT_OR_ICON_BUTTON);

      let checked = 0;
      for (const button of await buttons.all()) {
        if (!(await button.isVisible())) continue;
        const box = await button.boundingBox();
        if (!box) throw new Error("button is missing a bounding box");
        expect(box.height).toBeGreaterThanOrEqual(44);
        expect(box.width).toBeGreaterThanOrEqual(44);
        checked += 1;
      }
      expect(checked).toBeGreaterThan(0);
    });

    if (path === "/design/rocker") continue;

    test(`${path}: every visible checkbox row is at least 44px tall`, async ({ page }) => {
      await page.goto(path);
      const rows = page.locator('label:has([data-slot="checkbox"])');
      await expect(rows.first()).toBeVisible();

      let checked = 0;
      for (const row of await rows.all()) {
        if (!(await row.isVisible())) continue;
        const box = await row.boundingBox();
        if (!box) throw new Error("checkbox row is missing a bounding box");
        expect(box.height).toBeGreaterThanOrEqual(44);
        checked += 1;
      }
      expect(checked).toBeGreaterThan(0);
    });
  }

  test("every bottom tab bar tab is at least 44px tall", async ({ page }) => {
    await page.goto("/design/outline");
    const tabs = page.getByRole("navigation", { name: "Screens" }).getByRole("link");
    await expect(tabs.first()).toBeVisible();
    for (const tab of await tabs.all()) {
      const box = await tab.boundingBox();
      if (!box) throw new Error("tab is missing a bounding box");
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });

  test("focusing a typed measure field never zooms the page", async ({ page }) => {
    await page.goto("/design/volume");
    const field = page.locator('[data-slot="input"]').first();
    await expect(field).toBeVisible();
    await field.focus();
    // Playwright's WebKit/Chromium emulation does not reproduce iOS Safari's real auto-zoom
    // behaviour on a focused <16px field — this assertion guards against a regression in the
    // 16px rule itself (the fix RESEARCH.md's Pitfall 4 calls for), not a reproduction of the
    // iOS behaviour. The real proof is the end-of-phase device pass (see this plan's SUMMARY).
    const scale = await page.evaluate(() => window.visualViewport?.scale ?? 1);
    expect(scale).toBe(1);
  });

  // 09-REVIEW.md WR-02: the tail-shape grid, Fin Setup grid and PillButton rows are hand-rolled
  // <button>s, not the shared Button component, so they carry no `data-slot="button"` marker and
  // were left out of the sweep above entirely. The accessible name here is the button's raw text
  // content — TEMPLATE's tail-shape labels render lowercase and rely on a CSS `capitalize` for
  // their look, so this locator matches lowercase on purpose (the accessibility tree does not
  // reflect that CSS transform).
  test("TEMPLATE: every tail-shape button is at least 44px tall", async ({ page }) => {
    await page.goto("/design/outline");
    for (const shape of ["pin", "round", "diamond", "squash", "swallow"]) {
      const button = page.getByRole("button", { name: shape, exact: true });
      await expect(button).toBeVisible();
      const box = await button.boundingBox();
      if (!box) throw new Error(`${shape} tail-shape button is missing a bounding box`);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });

  test("FINS: every button in the tail-shape and Fin Setup grids is at least 44px tall", async ({
    page,
  }) => {
    await page.goto("/design/fins");
    const labels = ["Pin", "Round", "Diamond", "Squash", "Swallow", "Single Fin", "Twin", "Thruster", "2+1", "Quad"];
    for (const label of labels) {
      const button = page.getByRole("button", { name: label, exact: true });
      await expect(button).toBeVisible();
      const box = await button.boundingBox();
      if (!box) throw new Error(`"${label}" button is missing a bounding box`);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });

  // Plan 12-04 (12-UI-SPEC §4): the shared two-way pill (`TwoOptionToggle`) gained FINS's
  // `coarse:min-h-11`, so RAILS's Flat / Domed pair on the INSTRUCTIONS page is now as
  // finger-sized as FINS's pills already were.
  test("RAILS: the Flat / Domed pills on INSTRUCTIONS are each at least 44px tall", async ({ page }) => {
    await page.goto("/design/rails");
    await openRailInstructions(page);
    for (const label of ["Flat", "Domed"]) {
      const pill = page.getByRole("button", { name: label, exact: true });
      await expect(pill).toBeVisible();
      const height = await pill.evaluate((el) => (el as HTMLElement).offsetHeight);
      expect(height, `${label} pill height`).toBeGreaterThanOrEqual(44);
    }
  });

  // Plan 11-12 (11-UI-SPEC §15): the ROCKER controls that only exist once a blank is in play — every
  // blank row, every text link (they grow their row, not their glyph, on a touch pointer) and the
  // DATASHEET's typed cells. Names are read off the page, never typed in: the first row under FITS
  // THIS BOARD is picked, whatever the catalogue calls it.
  test("ROCKER: every blank row, every text link and every DATASHEET typed cell is finger-sized", async ({
    page,
  }) => {
    await page.goto("/design/rocker");
    const list = page.getByRole("list", { name: "Blanks" });
    await expect(list).toBeVisible({ timeout: 30_000 });
    // The streamed list is live only once React owns it — a tap before then is lost.
    await page.waitForFunction(() => {
      const el = document.querySelector('ul[aria-label="Blanks"] li[data-group="fits"] button');
      return !!el && Object.keys(el).some((key) => key.startsWith("__reactFiber"));
    });

    const heightOf = async (locator: ReturnType<Page["locator"]>, what: string) => {
      await expect(locator, `${what} is not on screen`).toBeVisible();
      const box = await locator.boundingBox();
      if (!box) throw new Error(`${what} is missing a bounding box`);
      return box.height;
    };

    // "Show all {n} blanks", and once opened, "Show Fewer".
    const showAll = page.getByRole("button", { name: /^Show all \d+ blanks$/ });
    expect(await heightOf(showAll, "Show all")).toBeGreaterThanOrEqual(44);
    await showAll.click();
    expect(await heightOf(page.getByRole("button", { name: "Show Fewer" }), "Show Fewer")).toBeGreaterThanOrEqual(44);

    // Clear Search, shown only when nothing matches.
    const search = page.getByRole("searchbox", { name: "Search blanks" });
    await search.fill("zzz");
    const clear = page.getByRole("button", { name: "Clear Search" });
    expect(await heightOf(clear, "Clear Search")).toBeGreaterThanOrEqual(44);
    await clear.click();
    await expect(search).toHaveValue("");

    // Pick the first blank that fits, then open Change Blank so the list shows under the picked card.
    const firstFit = list.locator('li[data-group="fits"] button').first();
    const name = (await firstFit.locator("[data-blank-name]").innerText()).trim();
    await firstFit.click();
    await expect(page.locator("[data-picked-blank]")).toContainText(name);

    const change = page.getByRole("button", { name: "Change Blank" });
    expect(await heightOf(change, "Change Blank")).toBeGreaterThanOrEqual(44);
    expect(await heightOf(page.getByRole("button", { name: "Remove This Blank" }), "Remove This Blank")).toBeGreaterThanOrEqual(44);
    expect(await heightOf(page.getByRole("button", { name: "↺ Reset Fine-Tune" }), "Reset Fine-Tune")).toBeGreaterThanOrEqual(44);
    await change.click();
    expect(await heightOf(page.getByRole("button", { name: "Keep This Blank" }), "Keep This Blank")).toBeGreaterThanOrEqual(44);

    // Every visible `Use …` row, fitting or greyed.
    const rows = page.getByRole("list", { name: "Blanks" }).getByRole("button", { name: /^Use / });
    await expect(rows.first()).toBeVisible();
    let checkedRows = 0;
    for (const row of await rows.all()) {
      if (!(await row.isVisible())) continue;
      const box = await row.boundingBox();
      if (!box) throw new Error("blank row is missing a bounding box");
      expect(box.height).toBeGreaterThanOrEqual(44);
      checkedRows += 1;
    }
    expect(checkedRows).toBeGreaterThan(0);

    // With a blank picked, every visible slider — placement and the two 12" fine-tunes among them.
    let checkedThumbs = 0;
    for (const thumb of await page.locator('[data-slot="slider-thumb"]').all()) {
      if (!(await thumb.isVisible())) continue;
      const box = await slideThumbTargetBox(thumb);
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      checkedThumbs += 1;
    }
    expect(checkedThumbs).toBeGreaterThan(0);

    // The DATASHEET's typed cells (the board's Thickness at Nose Tip, Center and Tail Tip).
    await page.getByRole("tab", { name: "DATASHEET" }).click();
    const cells = page.locator('main [data-slot="input"]');
    await expect(cells.first()).toBeVisible();
    let checkedCells = 0;
    for (const cell of await cells.all()) {
      if (!(await cell.isVisible())) continue;
      const box = await cell.boundingBox();
      if (!box) throw new Error("DATASHEET cell is missing a bounding box");
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(await cell.evaluate((el) => getComputedStyle(el).fontSize)).toBe("16px");
      checkedCells += 1;
    }
    expect(checkedCells).toBeGreaterThan(0);
  });
});

test.describe("touch sizing — desktop stays exactly today's smaller sizes", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop-only sizing assertions");
    await dismissSignInBanner(page);
    await setMetricUnits(page);
  });

  test("TEMPLATE: default button is 32px tall, typed field is 28px tall with 14px text, slider thumb target is 28px", async ({
    page,
  }) => {
    await page.goto("/design/outline");

    const button = page.locator(DEFAULT_OR_ICON_BUTTON).first();
    await expect(button).toBeVisible();
    const buttonBox = await button.boundingBox();
    if (!buttonBox) throw new Error("button is missing a bounding box");
    expect(buttonBox.height).toBe(32);

    const field = page.locator('[data-slot="input"]').first();
    await expect(field).toBeVisible();
    const fieldBox = await field.boundingBox();
    if (!fieldBox) throw new Error("measure field is missing a bounding box");
    expect(fieldBox.height).toBe(28);
    const fontSize = await field.evaluate((el) => getComputedStyle(el).fontSize);
    expect(fontSize).toBe("14px");

    const thumb = page.locator('[data-slot="slider-thumb"]').first();
    await expect(thumb).toBeVisible();
    const thumbBox = await slideThumbTargetBox(thumb);
    expect(thumbBox.width).toBe(28);
    expect(thumbBox.height).toBe(28);
  });

  // 09-REVIEW.md WR-02: proves coarse:min-h-11 stayed pointer-keyed — a mouse at desktop width
  // keeps exactly today's resting height on these hand-rolled grids, unchanged by the fix.
  test("TEMPLATE and FINS: tail-shape and Fin Setup buttons keep today's resting height on a mouse", async ({
    page,
  }) => {
    await page.goto("/design/outline");
    const pinButton = page.getByRole("button", { name: "pin", exact: true });
    await expect(pinButton).toBeVisible();
    const pinBox = await pinButton.boundingBox();
    if (!pinBox) throw new Error("pin tail-shape button is missing a bounding box");
    expect(pinBox.height).toBe(59.5);

    await page.goto("/design/fins");
    const finsPinButton = page.getByRole("button", { name: "Pin", exact: true });
    await expect(finsPinButton).toBeVisible();
    const finsPinBox = await finsPinButton.boundingBox();
    if (!finsPinBox) throw new Error("FINS Pin tail-shape button is missing a bounding box");
    expect(finsPinBox.height).toBe(65);

    const singleFinButton = page.getByRole("button", { name: "Single Fin", exact: true });
    await expect(singleFinButton).toBeVisible();
    const singleFinBox = await singleFinButton.boundingBox();
    if (!singleFinBox) throw new Error("Single Fin setup button is missing a bounding box");
    expect(singleFinBox.height).toBe(69);
  });

  // Plan 12-04: the two-way pill's new `coarse:min-h-11` is pointer-keyed — on a mouse RAILS's
  // Flat / Domed pills stay under a finger's 44px, at their old resting height.
  test("RAILS: the Flat / Domed pills stay their smaller resting height on a mouse", async ({ page }) => {
    await page.goto("/design/rails");
    await openRailInstructions(page);
    for (const label of ["Flat", "Domed"]) {
      const pill = page.getByRole("button", { name: label, exact: true });
      const height = await pill.evaluate((el) => (el as HTMLElement).offsetHeight);
      expect(height, `${label} pill height`).toBeLessThan(44);
    }
  });
});
