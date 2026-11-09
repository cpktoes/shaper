import { expect, test, type Locator, type Page } from "@playwright/test";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";
import { BOARD_PRESETS } from "../lib/geometry/presets";
import { BOTTOM_CUT_NAMES, type BottomSectionKey } from "../lib/geometry/bottom";
import { forgetOpenBoardOnEveryLoad } from "./helpers/open-board";

/**
 * BOTTOM's panel, every row (Phase 17, plan 17-09): each of the eighteen names opens on its own rows and its starting
 * numbers on every preset, draws its shade and its section and fills DATA; the Teardrop closes to a point; the floor is
 * said in words. The CHANNELS block's own cases follow.
 *
 * No figure is typed: the rows are the UI-SPEC's table (the screen's words), every number is read off the page.
 */

const SECTION_WORD: Record<BottomSectionKey, string> = { nose: "Nose", center: "Center", tail: "Tail" };

/**
 * Each name's rows, in D-04's order (UI-SPEC § The side panel, the "Shown for" column): a single Off Rail; a double
 * (the Spiral Vee is one) Off Rail, Off Stringer, Trough At; the Tri-Plane Off Stringer; then every cut Start, Deepest
 * At, End, Depth; the Spiral Vee Vee Lift; Smoothness. A flat none.
 */
const STATIONS = ["Start", "Deepest At", "End", "Depth"];
const ROWS: Record<string, string[]> = {
  flat: [],
  single: ["Off Rail", ...STATIONS, "Smoothness"],
  double: ["Off Rail", "Off Stringer", "Trough At", ...STATIONS, "Smoothness"],
  spiral: ["Off Rail", "Off Stringer", "Trough At", ...STATIONS, "Vee Lift", "Smoothness"],
  triPlane: ["Off Stringer", ...STATIONS, "Smoothness"],
  liftOnly: [...STATIONS, "Smoothness"],
};
const KIND_OF: Record<string, keyof typeof ROWS> = {
  "Flat Entry": "flat",
  "Rolled Belly Entry": "liftOnly",
  "Teardrop Nose Concave": "single",
  "Blended Nose Concave": "single",
  "Slight Single Concave Entry": "single",
  "Reverse Vee Nose": "liftOnly",
  "Flat Center": "flat",
  "Deep Single Concave": "single",
  "Shallow Single Concave": "single",
  "Early Double Concave": "double",
  "Continuous Belly / Rolled Mid": "liftOnly",
  "Tri-Plane Hull Center": "triPlane",
  "Flat Exit": "flat",
  "Double Concave Exit": "double",
  "Panel Vee": "liftOnly",
  "Spiral Vee": "spiral",
  "Rolled Vee": "liftOnly",
  "Extending Single Concave": "single",
};
/** The five vees (D-04): the four vee cuts and the Spiral Vee's vee under its double. */
const VEES = ["Reverse Vee Nose", "Tri-Plane Hull Center", "Panel Vee", "Spiral Vee", "Rolled Vee"];
const CLOSES = "Closes to a point toward the center";

async function dismissStrips(page: Page) {
  await page.addInitScript((key) => window.sessionStorage.setItem(key, "true"), BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => window.localStorage.setItem(key, "true"), TOOLBAR_TIP_DISMISSAL_KEY);
}

/** Opens a preset from the home page and walks to BOTTOM by the top row, so the board stays the one opened. */
async function openBottom(page: Page, presetId: string) {
  const preset = BOARD_PRESETS.find((p) => p.id === presetId);
  if (!preset) throw new Error(`no ${presetId} preset`);
  await page.goto("/");
  const card = page.getByRole("button").filter({ hasText: "Start Shaping" }).filter({ hasText: preset.name }).first();
  await expect(async () => {
    await card.click();
    await expect(page).toHaveURL(/\/design\/outline$/, { timeout: 3_000 });
  }).toPass({ timeout: 60_000 });
  await page.locator("nav:not([aria-label])").getByRole("link", { name: "BOTTOM", exact: true }).click();
  await page.waitForURL("**/design/bottom");
}

function card(page: Page, section: BottomSectionKey): Locator {
  return page.locator(`[data-bottom-card="${section}"]`);
}

/** Picks a name from a section's Cut menu, retried until React owns the menu so a click before hydration is never lost. */
async function pick(page: Page, section: BottomSectionKey, name: string) {
  const echo = card(page, section).locator("[data-bottom-cut-echo]");
  if ((await echo.textContent()) === name) return;
  await expect(async () => {
    await page.getByRole("combobox", { name: `${SECTION_WORD[section]} Cut` }).click();
    await page.getByRole("option", { name, exact: true }).click({ timeout: 2_000 });
    await expect(echo).toHaveText(name, { timeout: 2_000 });
  }).toPass({ timeout: 60_000 });
}

/** A slider's value as its track holds it (the station sliders: the distance from the nose). */
async function sliderValue(slider: Locator): Promise<number> {
  const now = await slider.getAttribute("aria-valuenow");
  return Number(now ?? (await slider.inputValue()));
}

/** The spoken names of a section card's sliders, in the order they are drawn. */
async function sliderNames(page: Page, section: BottomSectionKey): Promise<string[]> {
  return card(page, section)
    .getByRole("slider")
    .evaluateAll((els) => els.map((el) => el.getAttribute("aria-label") ?? ""));
}

const sectionPaths = (page: Page) =>
  page.locator("[data-bottom-section] path").evaluateAll((els) => els.map((el) => el.getAttribute("d") ?? "").join("|"));

test.describe("BOTTOM's panel: every cut's own rows, the Teardrop's tick box and the floor in words", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the panel's cards are the computer's; BOTTOM on a phone is 17-14's");
    await dismissStrips(page);
    await forgetOpenBoardOnEveryLoad(page);
  });

  for (const preset of BOARD_PRESETS) {
    test(`the eighteen names on the ${preset.name}: their own rows, Start ≥ Deepest ≥ End, the shade, the section and DATA`, async ({ page }) => {
      test.setTimeout(480_000);
      await openBottom(page, preset.id);
      const veeSections = new Map<string, string>();
      const warned: string[] = [];

      for (const section of ["nose", "center", "tail"] as const) {
        const names = BOTTOM_CUT_NAMES[section];
        // the flat first (it opens there), then the five cuts, then the flat again so the next section is cut alone
        for (const name of [...names, names[0]]) {
          await pick(page, section, name);
          const kind = KIND_OF[name];
          const want = ROWS[kind].map((row) => `${SECTION_WORD[section]} ${row}`);
          await expect.poll(() => sliderNames(page, section), { message: name }).toEqual(want);
          const flatNote = card(page, section).getByText("Nothing is cut in this section.", { exact: true });
          const shade = page.locator("[data-bottom-shade] path");

          if (kind === "flat") {
            await expect(flatNote).toBeVisible();
            await expect(shade).toHaveCount(0);
            continue;
          }
          await expect(flatNote).toHaveCount(0);
          expect(await shade.count(), `${name}'s shade`).toBeGreaterThan(0);

          // Start ≥ Deepest ≥ End from the tail: on a track that runs nose to tail, Start is nearest the nose.
          const slider = (row: string) => page.getByRole("slider", { name: `${SECTION_WORD[section]} ${row}`, exact: true });
          const [start, deepest, end] = [await sliderValue(slider("Start")), await sliderValue(slider("Deepest At")), await sliderValue(slider("End"))];
          expect(start, `${name}: Start from the nose`).toBeLessThanOrEqual(deepest);
          expect(deepest, `${name}: Deepest At from the nose`).toBeLessThanOrEqual(end);
          const tip = section === "nose" ? "nose" : "tail";
          await expect(card(page, section).getByText(new RegExp(`^Deepest At — .+ from the ${tip}$`))).toBeVisible();
          await expect(card(page, section).getByText(/^Smoothness — \d+%$/)).toBeVisible();

          // The tick box on the three Nose singles only, ticked by the Teardrop's starting numbers alone.
          const tick = card(page, section).getByRole("checkbox", { name: CLOSES });
          if (section === "nose" && kind === "single") {
            if (name === "Teardrop Nose Concave") await expect(tick).toBeChecked();
            else await expect(tick).not.toBeChecked();
          } else {
            await expect(tick).toHaveCount(0);
          }

          if (VEES.includes(name)) veeSections.set(name, await sectionPaths(page));
          if ((await card(page, section).locator("[data-bottom-floor]").count()) > 0) warned.push(name);

          // DATA fills its rows: some station has a cut under the straightedge.
          await page.getByRole("tab", { name: "DATA", exact: true }).click();
          const cells = page.locator("[data-bottom-depths] tbody tr td:nth-of-type(2)");
          await expect(cells.first()).toBeVisible();
          const deepestCells = await cells.allTextContents();
          expect(
            deepestCells.some((text) => text !== "—"),
            `${name}: a Deepest cut in DATA`,
          ).toBe(true);
          await page.getByRole("tab", { name: "VIEWER", exact: true }).click();
          await expect(page.locator("[data-bottom-top-view]")).toBeVisible();
        }
      }

      // The five vees' sections differ, pairwise.
      expect([...veeSections.keys()].sort()).toEqual([...VEES].sort());
      const drawn = [...veeSections.values()];
      expect(new Set(drawn).size, "five different sections").toBe(VEES.length);
      console.info(`${preset.name}: the floor sentence shows on a fresh pick of ${warned.length ? warned.join(", ") : "nothing"}`);
      // D-42 (the founder, "Warn, keep the numbers"): these two researched vees warn on their opening numbers.
      if (preset.id === "fish") expect(warned).toContain("Panel Vee");
      if (preset.id === "midlength") expect(warned).toContain("Spiral Vee");
    });
  }

  test("the Teardrop's tick box: ticking a Blended Nose Concave closes its shade to a point, and one Undo takes it back", async ({ page }) => {
    test.setTimeout(180_000);
    await openBottom(page, "shortboard");
    await pick(page, "nose", "Blended Nose Concave");
    const tick = card(page, "nose").getByRole("checkbox", { name: CLOSES });
    await expect(tick).not.toBeChecked();
    const shade = () => page.locator("[data-bottom-shade] path").evaluateAll((els) => els.map((el) => el.getAttribute("d")).join("|"));
    const open = await shade();
    await tick.click();
    await expect(tick).toBeChecked();
    await expect.poll(shade).not.toBe(open);
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(tick).not.toBeChecked();
    await expect.poll(shade).toBe(open);
    await expect(card(page, "nose").locator("[data-bottom-cut-echo]")).toHaveText("Blended Nose Concave");
  });

  test("a Rolled Belly Entry at 1/2\" on the Shortboard says the rail form under its Depth, in warning ink", async ({ page }) => {
    test.setTimeout(180_000);
    await openBottom(page, "shortboard");
    await pick(page, "nose", "Rolled Belly Entry");
    const depth = page.getByRole("slider", { name: "Nose Depth", exact: true });
    await depth.focus();
    await page.keyboard.press("End");
    await expect(card(page, "nose").getByText('Depth — 1/2"', { exact: true })).toBeVisible();
    const floor = card(page, "nose").locator("[data-bottom-floor]");
    await expect(floor).toHaveText('This cut leaves the rail under 1/4" near the nose: the rail is thinner there than the floor. Lower the Depth, or move the cut away from the tip.');
    // ROCKER's too-close line: the warning ink, carried by the sentence too, never by colour alone.
    const [ink, warning] = await floor.evaluate((el) => {
      const probe = document.createElement("span");
      probe.style.color = "var(--surf-warning-ink)";
      document.body.appendChild(probe);
      const want = getComputedStyle(probe).color;
      probe.remove();
      return [getComputedStyle(el).color, want];
    });
    expect(ink).toBe(warning);
  });
});
