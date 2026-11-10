import { expect, test, type Locator, type Page } from "@playwright/test";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";
import { CHANNELS_COPY, channelAngleWords } from "../components/bottom/bottom-copy";
import { BOARD_PRESETS } from "../lib/geometry/presets";
import { BOTTOM_CUT_NAMES, CHANNEL_ANGLE_MAX, CHANNEL_STARTING_WIDTHS, type BottomSectionKey } from "../lib/geometry/bottom";
import { formatChannelAngle } from "../lib/geometry/bottom-print";
import { designFinPlacement } from "../lib/geometry/design";
import { frontFinToeDegrees } from "../lib/geometry/fins";
import { formatMark } from "../lib/geometry/measure-display";
import { bottomFloorScanSettled, showBottomSection } from "./helpers/bottom";
import { forgetOpenBoardOnEveryLoad } from "./helpers/open-board";
import { goToScreen } from "./helpers/screens";

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

/** Opens a preset from the home page and walks to BOTTOM by the top row (or ☰ and its tile on a phone), so the board
 * stays the one opened. A computer's preset card says `Start Shaping`; a phone's carries the board's litres. */
async function openBottom(page: Page, presetId: string) {
  const preset = BOARD_PRESETS.find((p) => p.id === presetId);
  if (!preset) throw new Error(`no ${presetId} preset`);
  await page.goto("/");
  const card = page
    .getByRole("button")
    .filter({ hasText: preset.name })
    .filter({ hasText: /Start Shaping|\d\.\d L/ })
    .first();
  await expect(async () => {
    // Tap only while the card is still on the page: under load the screen can change before the address does, and a
    // second tap would find no card. A phone's cards stand in a row that scrolls sideways, so the card is brought into
    // view first.
    if (!/\/design\/outline$/.test(page.url()) && (await card.count()) > 0) {
      await card.scrollIntoViewIfNeeded({ timeout: 2_000 });
      await card.click({ timeout: 2_000 });
    }
    await expect(page).toHaveURL(/\/design\/outline$/, { timeout: 5_000 });
  }).toPass({ timeout: 90_000 });
  await goToScreen(page, "BOTTOM");
}

function card(page: Page, section: BottomSectionKey): Locator {
  return page.locator(`[data-bottom-card="${section}"]`);
}

/** Picks a name from a section's Cut menu, retried until React owns the menu so a click before hydration is never lost. */
async function pick(page: Page, section: BottomSectionKey, name: string) {
  // On an upright phone only the section picked on the NOSE · CENTER · TAIL row is drawn (17-14): tap it first.
  await showBottomSection(page, section);
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
          // The floor's sentence lands a moment after the pick: it is looked for once the scan has run.
          await bottomFloorScanSettled(page);
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

/* ============ the CHANNELS block, inside TAIL (D-10, D-11) ============ */

/** The words a menu shows as picked (its value, without the chevron). */
function selected(page: Page, selectName: string): Locator {
  return page.getByRole("combobox", { name: selectName, exact: true }).locator("[data-slot=select-value]");
}

/** Picks an option from one of the block's menus by its spoken name, retried until React owns the menu. */
async function pickFrom(page: Page, selectName: string, option: string) {
  // A menu that is not drawn is one of the channels', which are TAIL's: on an upright phone they show only while
  // TAIL is the section picked (17-14).
  if (!(await page.getByRole("combobox", { name: selectName, exact: true }).isVisible())) await showBottomSection(page, "tail");
  const trigger = page.getByRole("combobox", { name: selectName, exact: true });
  await expect(async () => {
    await trigger.click();
    await page.getByRole("option", { name: option, exact: true }).click({ timeout: 2_000 });
    await expect(selected(page, selectName)).toHaveText(option, { timeout: 2_000 });
  }).toPass({ timeout: 60_000 });
}

/** The colour an element's text is drawn in, and the colour a theme ink resolves to on the same page. */
async function inkOf(locator: Locator, cssVar: string): Promise<{ text: string; ink: string }> {
  return locator.evaluate((el, name) => {
    const probe = document.createElement("span");
    probe.style.color = `var(${name})`;
    document.body.appendChild(probe);
    const ink = getComputedStyle(probe).color;
    probe.remove();
    return { text: getComputedStyle(el).color, ink };
  }, cssVar);
}

const channels = (page: Page) => page.locator("[data-bottom-channels]");
const widthLabel = (page: Page) => channels(page).getByText(/^Channel Width — /);
/** The Angle row's label and words (D-44) — drawn only for With the rail and Toe-in. */
const angleLabel = (page: Page) => channels(page).getByText(/^Angle — /);
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** `Channel Width — 1 3/4" · ramp 10° · last wall …` for a count's own starting width (the app's figure), never squeezed. */
const startingWidthLine = (count: 4 | 6 | 8) =>
  new RegExp(`^Channel Width — ${escapeRegExp(formatMark(CHANNEL_STARTING_WIDTHS[count], "imperial"))} · ramp \\d+° · last wall .+ off the rail$`);

test.describe("BOTTOM's CHANNELS block, inside TAIL", () => {
  test.beforeEach(async ({ page }) => {
    await dismissStrips(page);
    await forgetOpenBoardOnEveryLoad(page);
  });

  test("channels: None to start; 4, 6 and 8 open at their starting widths unless the width was set by hand; None hides and keeps", async ({ page }) => {
    test.setTimeout(240_000);
    await openBottom(page, "shortboard");
    // On an upright phone the channels are TAIL's, drawn only while TAIL is the section picked (17-14).
    await showBottomSection(page, "tail");
    const tail = card(page, "tail");
    await expect(channels(page).locator("[data-bottom-channels-echo]")).toHaveText("None");
    await expect(selected(page, "Channels")).toHaveText("None");
    await expect(page.getByRole("slider", { name: "Channel Width", exact: true })).toHaveCount(0);
    await expect(tail.getByText("Nothing is cut in this section.", { exact: true })).toBeVisible();

    // Opening a set makes the channels the live cut and moves the section to their Deepest.
    await pickFrom(page, "Channels", "6 channels");
    await expect(page.locator("[data-bottom-live]")).toHaveAttribute("data-bottom-live", "channels");
    const deepest = ((await channels(page).getByText(/^Deepest At — /).textContent()) ?? "").replace(/^Deepest At — (.+) from the tail$/, "$1");
    await expect(page.getByText(/^SECTION · /).first()).toHaveText(new RegExp(`^SECTION · ${escapeRegExp(deepest)} FROM THE TAIL`));
    await expect(channels(page).locator("[data-bottom-channels-echo]")).toHaveText("6, cut after the Flat Exit");
    await expect(tail.getByText("Nothing is cut in this section but the channels.", { exact: true })).toBeVisible();
    await expect(channels(page).getByRole("slider")).toHaveCount(8);
    expect(await channels(page).getByRole("slider").evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")))).toEqual([
      "Channel Width",
      "Channels Off Stringer",
      "Channels Start",
      "Channels Stagger",
      "Channels Deepest At",
      "Channels End",
      "Channels Depth",
      "Channels Smoothness",
    ]);
    await expect(channels(page).getByText("Smoothness — 0% · a straight ramp", { exact: true })).toBeVisible();

    for (const count of [4, 8, 6] as const) {
      await pickFrom(page, "Channels", `${count} channels`);
      await expect(widthLabel(page)).toHaveText(startingWidthLine(count));
    }

    // A width set by hand (1 3/4" + four 1/16" steps = 2") survives every count and None.
    const width = page.getByRole("slider", { name: "Channel Width", exact: true });
    await width.focus();
    for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowRight");
    await expect(widthLabel(page)).toHaveText(/^Channel Width — 2" (· |\(.+ to fit\) · )/);
    await pickFrom(page, "Channels", "8 channels");
    await expect(widthLabel(page)).toHaveText(/^Channel Width — 2" (· |\(.+ to fit\) · )/);
    await pickFrom(page, "Channels", "None");
    await expect(page.getByRole("slider", { name: "Channel Width", exact: true })).toHaveCount(0);
    await expect(channels(page).locator("[data-bottom-channels-echo]")).toHaveText("None");
    await expect(tail.getByText("Nothing is cut in this section.", { exact: true })).toBeVisible();
    await pickFrom(page, "Channels", "4 channels");
    await expect(widthLabel(page)).toHaveText(/^Channel Width — 2" (· |\(.+ to fit\) · )/);
    // Each pick is one Undo.
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(selected(page, "Channels")).toHaveText("None");
  });

  test("channels: a squeezed set says what it was cut to in the muted ink; Stagger hides for All the same; Start names the longest pair", async ({ page }) => {
    test.setTimeout(240_000);
    await openBottom(page, "shortboard");
    await pickFrom(page, "Channels", "8 channels");
    const width = page.getByRole("slider", { name: "Channel Width", exact: true });
    await width.focus();
    await page.keyboard.press("End");
    await expect(widthLabel(page)).toHaveText(/^Channel Width — 4" \(.+ to fit\) · ramp \d+° · last wall .+ off the rail$/);
    const muted = await inkOf(widthLabel(page), "--surf-ink-muted");
    expect(muted.text).toBe(muted.ink);
    const warning = await inkOf(widthLabel(page), "--surf-warning-ink");
    expect(warning.text).not.toBe(warning.ink);

    await expect(channels(page).getByText(/^Start — .+ from the tail · the outer pair$/)).toBeVisible();
    await expect(channels(page).getByText(/^Stagger — .+ per channel · the inner pair starts .+ from the tail$/)).toBeVisible();
    await pickFrom(page, "Longest Channels", "Inner pair");
    await expect(channels(page).getByText(/^Start — .+ from the tail · the inner pair$/)).toBeVisible();
    await expect(channels(page).getByText(/^Stagger — .+ per channel · the outer pair starts .+ from the tail$/)).toBeVisible();
    await pickFrom(page, "Longest Channels", "All the same");
    await expect(page.getByRole("slider", { name: "Channels Stagger", exact: true })).toHaveCount(0);
    await expect(channels(page).getByText(/^Stagger — /)).toHaveCount(0);
    await expect(channels(page).getByText(/^Start — .+ from the tail$/)).toBeVisible();
  });

  for (const presetId of ["shortboard", "fish", "longboard"] as const) {
    test(`channels: the Run menu on the ${presetId} has three plain names, and Toe-in's Angle row reads the front fins' own toe (D-44)`, async ({ page }) => {
      test.setTimeout(180_000);
      const preset = BOARD_PRESETS.find((p) => p.id === presetId)!;
      // The toe the app itself works out for this preset's fins, written by the row's own words.
      const toe = frontFinToeDegrees(designFinPlacement({ outline: preset.outline, fins: preset.fins }));
      if (presetId === "longboard") expect(toe).toBe(0);
      else expect(toe).toBeGreaterThan(0);
      await openBottom(page, presetId);
      await pickFrom(page, "Channels", "6 channels");
      await expect(selected(page, "Channel Run")).toHaveText("Parallel");
      await expect(angleLabel(page)).toHaveCount(0);
      await page.getByRole("combobox", { name: "Channel Run", exact: true }).click();
      await expect(page.getByRole("option")).toHaveText(["Parallel", "With the rail", "Toe-in"]);
      await page.getByRole("option", { name: "Toe-in", exact: true }).click();
      await expect(selected(page, "Channel Run")).toHaveText("Toe-in");
      await expect(angleLabel(page)).toHaveText(`${CHANNELS_COPY.angle} — ${channelAngleWords("toe", toe, toe, false)}`);
    });
  }

  test("channels: the Angle row (D-44) — the rail's own to start, set by hand from the slider, Reset, and gone for Parallel", async ({ page }, testInfo) => {
    // NOT YET RUN (written 2026-11-10 with D-44; no dev server could start in the worktree it was built in).
    test.skip(testInfo.project.name !== "desktop", "the panel's cards are the computer's");
    test.setTimeout(240_000);
    await openBottom(page, "shortboard");
    await pickFrom(page, "Channels", "6 channels");
    const slider = page.getByRole("slider", { name: CHANNELS_COPY.angleSliderName, exact: true });
    const reset = page.getByRole("button", { name: CHANNELS_COPY.angleResetName, exact: true });
    // Parallel has no angle to set: no row, no slider.
    await expect(slider).toHaveCount(0);
    await expect(page.locator("[data-bottom-channel-angle]")).toHaveCount(0);

    // With the rail: the row appears directly under Run / Longest, reading the rail's own angle — a figure the page
    // works out, read off it here and never typed.
    await pickFrom(page, "Channel Run", "With the rail");
    await expect(angleLabel(page)).toHaveText(/^Angle — \d+\.\d° · the rail's own$/);
    const own = ((await angleLabel(page).textContent()) ?? "").replace(/^Angle — (\d+\.\d°) · the rail's own$/, "$1");
    expect(Number.parseFloat(own)).toBeGreaterThan(0);
    expect(Number.parseFloat(own)).toBeLessThanOrEqual(CHANNEL_ANGLE_MAX);
    await expect(reset).toHaveCount(0);
    await expect(channels(page).getByRole("slider")).toHaveCount(9);

    // The slider's two ends and one step, by the keyboard: every one is an angle set by hand, and says the rail's own.
    await slider.focus();
    await page.keyboard.press("End");
    await expect(angleLabel(page)).toHaveText(`Angle — ${formatChannelAngle(CHANNEL_ANGLE_MAX)} · set by hand · the rail's own is ${own}`);
    await page.keyboard.press("Home");
    await expect(angleLabel(page)).toHaveText(`Angle — ${formatChannelAngle(0)} · set by hand · the rail's own is ${own}`);
    await page.keyboard.press("ArrowRight");
    await expect(angleLabel(page)).toHaveText(`Angle — ${formatChannelAngle(0.5)} · set by hand · the rail's own is ${own}`);
    await expect(slider).toHaveAttribute("aria-valuetext", `${formatChannelAngle(0.5)} · set by hand · the rail's own is ${own}`);

    // Reset puts the rail's own back and takes itself away; it is one Undo.
    await expect(reset).toBeVisible();
    await reset.click();
    await expect(angleLabel(page)).toHaveText(`Angle — ${own} · the rail's own`);
    await expect(reset).toHaveCount(0);
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(angleLabel(page)).toHaveText(`Angle — ${formatChannelAngle(0.5)} · set by hand · the rail's own is ${own}`);

    // A different Run starts from that run's own angle, never the one set by hand for the last.
    await pickFrom(page, "Channel Run", "Toe-in");
    await expect(angleLabel(page)).toHaveText(/^Angle — \d+\.\d° · the fins' toe-in$/);
    await expect(reset).toHaveCount(0);
    await pickFrom(page, "Channel Run", "With the rail");
    await expect(angleLabel(page)).toHaveText(`Angle — ${own} · the rail's own`);

    // Parallel: the row goes.
    await pickFrom(page, "Channel Run", "Parallel");
    await expect(slider).toHaveCount(0);
    await expect(angleLabel(page)).toHaveCount(0);
    await expect(channels(page).getByRole("slider")).toHaveCount(8);
  });

  for (const width of [820, 1280]) {
    test(`channels at ${width} wide: the Width read-out wraps to a second line and the Run trigger never overflows its row (E10)`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "desktop", "a window's width, on a computer");
      test.setTimeout(180_000);
      await page.setViewportSize({ width, height: 800 });
      await openBottom(page, "longboard");
      await pickFrom(page, "Channels", "6 channels");
      // The longest of the three names since D-44 took the angle off the menu and gave it its own row.
      await pickFrom(page, "Channel Run", "With the rail");
      const lines = await widthLabel(page).evaluate((el) => el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight));
      expect(Math.round(lines), "the Width read-out's lines").toBeGreaterThanOrEqual(2);
      const run = page.getByRole("combobox", { name: "Channel Run", exact: true });
      const fit = await run.evaluate((el) => {
        const value = el.querySelector("[data-slot=select-value]") as HTMLElement;
        const row = el.parentElement!.parentElement!.getBoundingClientRect();
        const box = el.getBoundingClientRect();
        return {
          overflowsRow: box.right > row.right + 0.5 || box.left < row.left - 0.5,
          cut: value.scrollWidth > value.clientWidth,
          ellipsis: getComputedStyle(value).textOverflow === "ellipsis" && getComputedStyle(value).overflow === "hidden",
        };
      });
      expect(fit.overflowsRow).toBe(false);
      expect(fit.ellipsis).toBe(true);
      // At 1280 the column is wide enough and the name reads whole. At 820 the old `Toe-in (no toe)` (98.2 dots of
      // text in 84 of room) was measured cut with an ellipsis (UI-SPEC § Already done); `With the rail` measured 78.9
      // there, so it should read whole — but the trigger has NOT been re-measured in a browser since D-44, so 820
      // holds only the two rules above: never out of its row, and an ellipsis if it is ever cut.
      if (width === 1280) expect(fit.cut).toBe(false);
    });
  }
});
