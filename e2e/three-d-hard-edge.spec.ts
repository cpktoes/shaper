import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { THREE_D_COPY } from "../components/3d/three-d-copy";
import { presetDesignFields } from "../lib/blanks/preset-blanks";
import { DEFAULT_BOARD_SPEC } from "../lib/geometry/board";
import { formatDim } from "../lib/geometry/measure-display";
import { BOARD_PRESETS } from "../lib/geometry/presets";
import { defaultHardEdgeEndsAt } from "../lib/geometry/rail-bands";
import { inchesToMm, mm } from "../lib/geometry/units";
import { DEFAULT_VOLUME_SPEC } from "../lib/geometry/volume";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import type { DesignSnapshotFields } from "../lib/models/design-snapshot";
import { OPEN_BOARD_STORAGE_KEY, openBoardCopyJson } from "../lib/models/open-board";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";

/**
 * The tail's hard edge on the 3D panel (Phase 16, D-30 — the founder, 2026-11-04: "I'd like that control on both the
 * rails and the 3-D pages and they feed each other. Changing one changes the other."). The 3D panel draws RAILS' own
 * two rows over the very same two values: move Hard Edge Ends At on 3D and RAILS reads it and VOLUME's litres move;
 * move it on RAILS and the 3D row follows. While the tail's Hard Edge is off, the 3D rows are dimmed and out of reach,
 * under one line of reason.
 *
 * Each screen is opened by its address: the board in progress is kept in this browser (quick 261019-ep5), so every
 * address opens the same board, once the kept copy holds the change.
 */

async function dismissStrips(page: Page) {
  await page.addInitScript(
    ([bannerKey, tipKey]) => {
      window.sessionStorage.setItem(bannerKey, "true");
      window.localStorage.setItem(tipKey, "true");
    },
    [BANNER_DISMISSAL_KEY, TOOLBAR_TIP_DISMISSAL_KEY] as const,
  );
}

const isPhone = (testInfo: TestInfo) => testInfo.project.name !== "desktop";

// The stock 6'0" board (RAILS' own figures in e2e/rails-advanced.spec.ts): Blends From 18" and Ends At 30" when it
// says nothing, Ends At reaching the 36" centre at most. Every reading is the app's own formatter.
const STOCK_LENGTH = DEFAULT_BOARD_SPEC.outline.length;
const inches = (value: number) => formatDim(inchesToMm(value), "imperial");
const STOCK_END = formatDim(defaultHardEdgeEndsAt(STOCK_LENGTH), "imperial");
const STOCK_CENTRE = formatDim(mm(STOCK_LENGTH / 2), "imperial");

function threeDHardEdge(page: Page) {
  return page.locator("[data-three-d-hard-edge]");
}

function endsAtSlider(page: Page) {
  return page.getByRole("slider", { name: THREE_D_COPY.hardEdgeEndsAtSlider, exact: true });
}

/** One of the tail's stored hard-edge settings in the board this browser keeps, or null. */
async function kept(page: Page, key: "tailHardEdgeBlendsFrom" | "tailHardEdgeEndsAt"): Promise<number | null> {
  return page.evaluate(
    ([storageKey, field]) => {
      const raw = window.localStorage.getItem(storageKey);
      if (raw === null) return null;
      return (JSON.parse(raw).snapshot.design.rails[field] as number | undefined) ?? null;
    },
    [OPEN_BOARD_STORAGE_KEY, key] as const,
  );
}

/** VOLUME's Estimated Volume figure ("30.29 L"). The server's first paint is the stock board, so a figure the kept
 * board should have moved is waited for until it differs from `before`. */
async function litres(page: Page, before?: string): Promise<string> {
  await page.goto("/design/volume");
  const figure = page.getByText("Estimated Volume", { exact: true }).first().locator("xpath=following-sibling::span[1]/span[1]");
  await expect(figure).toHaveText(/^\d+\.\d\d L$/, { timeout: 60_000 });
  if (before !== undefined) await expect(figure).not.toHaveText(before, { timeout: 30_000 });
  return (await figure.textContent()) ?? "";
}

/** RAILS' tail group with its Advanced menu open (on a phone, its TAIL tab first). */
async function railsTail(page: Page, testInfo: TestInfo): Promise<Locator> {
  await page.goto("/design/rails");
  if (isPhone(testInfo)) {
    const tab = page.getByRole("tablist").filter({ hasText: "NOSE" }).getByRole("tab", { name: "TAIL" });
    await expect(async () => {
      await tab.click();
      await expect(tab).toHaveAttribute("aria-selected", "true", { timeout: 1_000 });
    }).toPass({ timeout: 60_000 });
  }
  const tail = page.locator('[data-rail-group="tail"]');
  const heading = tail.getByRole("button", { name: /^Advanced [▾▸]$/ });
  const body = heading.locator("xpath=following-sibling::div[1]");
  await expect(async () => {
    if ((await body.count()) === 0) await heading.click();
    await expect(body.getByRole("button", { name: /Reset Advanced Settings/ })).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 60_000 });
  return tail;
}

/** The 3D page, its panel live (React has taken the page over, so a key press reaches the slider). */
async function openThreeD(page: Page) {
  await page.goto("/design/3d");
  await expect(threeDHardEdge(page)).toBeVisible({ timeout: 60_000 });
  await page.waitForFunction(
    () => {
      const el = document.querySelector("[data-three-d-hard-edge]");
      return !!el && Object.keys(el).some((k) => k.startsWith("__react"));
    },
    undefined,
    { timeout: 60_000 },
  );
}

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "iphone", "a computer and one phone prove the shared value");
  test.setTimeout(240_000);
  await dismissStrips(page);
});

test.describe("the 3D panel's Hard Edge rows share RAILS' values (D-30)", () => {
  test("1. moved on 3D, RAILS reads it and VOLUME's litres move; moved on RAILS, 3D follows", async ({ page }, testInfo) => {
    const litresBefore = await litres(page);

    await openThreeD(page);
    const group = threeDHardEdge(page);
    await expect(group).toHaveAttribute("data-three-d-hard-edge", "on");
    await expect(group.getByText(THREE_D_COPY.hardEdgeHeading, { exact: true })).toBeVisible();
    await expect(group.getByText(`${THREE_D_COPY.hardEdgeBlendsFrom} — ${inches(18)}`, { exact: true })).toBeVisible();
    await expect(group.getByText(`${THREE_D_COPY.hardEdgeEndsAt} — ${STOCK_END}`, { exact: true })).toBeVisible();
    await expect(group.getByText(THREE_D_COPY.hardEdgeOffHint)).toHaveCount(0);

    // Ends At all the way to the centre, on the 3D panel.
    await endsAtSlider(page).press("End");
    await expect(group.getByText(`${THREE_D_COPY.hardEdgeEndsAt} — ${STOCK_CENTRE}`, { exact: true })).toBeVisible();
    await expect(endsAtSlider(page)).toHaveAttribute("aria-valuetext", THREE_D_COPY.hardEdgeFromTheTail(STOCK_CENTRE));
    await expect.poll(() => kept(page, "tailHardEdgeEndsAt"), { timeout: 10_000 }).toBe(mm(STOCK_LENGTH / 2));

    // RAILS reads the very same value, under the same spoken name.
    let tail = await railsTail(page, testInfo);
    await expect(tail.getByText(/^Hard Edge Ends At — /)).toHaveText(`Hard Edge Ends At — ${STOCK_CENTRE}`);
    await expect(endsAtSlider(page)).toHaveAttribute("aria-valuetext", THREE_D_COPY.hardEdgeFromTheTail(STOCK_CENTRE));

    // VOLUME's litres moved.
    expect(await litres(page, litresBefore)).not.toBe(litresBefore);

    // Moved on RAILS (down to its lowest, 2" past Blends From), the 3D row follows.
    tail = await railsTail(page, testInfo);
    await endsAtSlider(page).press("Home");
    const low = inches(20);
    await expect(tail.getByText(/^Hard Edge Ends At — /)).toHaveText(`Hard Edge Ends At — ${low}`);
    await expect.poll(() => kept(page, "tailHardEdgeEndsAt"), { timeout: 10_000 }).toBe(inchesToMm(20));
    await openThreeD(page);
    await expect(threeDHardEdge(page).getByText(`${THREE_D_COPY.hardEdgeEndsAt} — ${low}`, { exact: true })).toBeVisible();
    await expect(endsAtSlider(page)).toHaveAttribute("aria-valuetext", THREE_D_COPY.hardEdgeFromTheTail(low));
  });

  test("2. with the tail's Hard Edge off, the 3D rows are dimmed and out of reach, under their reason", async ({ page }) => {
    const preset = BOARD_PRESETS.find((p) => p.name === "Shortboard");
    if (!preset) throw new Error("no Shortboard preset");
    const base = presetDesignFields(preset);
    const fields: DesignSnapshotFields = {
      ...base,
      rails: { ...base.rails, tailHardEdge: false },
      volume: DEFAULT_VOLUME_SPEC,
      finsImportTemplate: true,
      railsImportFoilThickness: true,
      boardName: "",
      finSystem: "fcs2",
    };
    const raw = openBoardCopyJson(fields, { modelId: null, ownerId: null, locked: false, dirty: true });
    await page.addInitScript(([key, value]) => window.localStorage.setItem(key, value), [OPEN_BOARD_STORAGE_KEY, raw] as const);

    await openThreeD(page);
    const group = threeDHardEdge(page);
    await expect(group).toHaveAttribute("data-three-d-hard-edge", "off");
    await expect(group.getByText(THREE_D_COPY.hardEdgeOffHint, { exact: true })).toBeVisible();
    // The rows stay in their place and still read their values...
    await expect(group.getByText(new RegExp(`^${THREE_D_COPY.hardEdgeEndsAt} — `))).toBeVisible();
    // ...dimmed and inert: out of the keyboard's and a screen reader's reach.
    const rows = group.locator('[data-live="false"]');
    await expect(rows).toHaveAttribute("inert", "");
    await expect(rows).toHaveClass(/opacity-40/);
    // Both sliders sit inside the inert rows, and neither can take the keyboard's focus.
    const sliders = group.locator('input[type="range"]');
    await expect(sliders).toHaveCount(2);
    for (let i = 0; i < 2; i++) {
      expect(await sliders.nth(i).evaluate((el) => el.closest("[inert]") !== null)).toBe(true);
      await sliders.nth(i).evaluate((el) => (el as HTMLElement).focus());
      expect(await sliders.nth(i).evaluate((el) => document.activeElement === el)).toBe(false);
    }
    // The reason itself is not dimmed.
    const hintOpacity = await group
      .getByText(THREE_D_COPY.hardEdgeOffHint, { exact: true })
      .evaluate((el) => getComputedStyle(el).opacity);
    expect(hintOpacity).toBe("1");
  });
});
