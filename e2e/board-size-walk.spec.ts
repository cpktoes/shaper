import { expect, test, type Page } from "@playwright/test";
import { presetDesignFields } from "../lib/blanks/preset-blanks";
import { DEFAULT_BOTTOM, pickCut, startingChannels, type BoardBottom } from "../lib/geometry/bottom";
import { TAIL_PRESETS } from "../lib/geometry/board";
import { LIVE_DESIGN_RULES, designBottomBoard, designFinPlacement, designSideProfile } from "../lib/geometry/design";
import { buildOutline } from "../lib/geometry/outline";
import { BOARD_PRESETS } from "../lib/geometry/presets";
import { degrees, inchesToMm } from "../lib/geometry/units";
import { DEFAULT_VOLUME_SPEC } from "../lib/geometry/volume";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import type { DesignSnapshotFields } from "../lib/models/design-snapshot";
import { OPEN_BOARD_STORAGE_KEY, openBoardCopyJson } from "../lib/models/open-board";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";
import { blankCards, closeBlankPicker, openBlankPicker, waitForBlankButton } from "./helpers/blank-picker";
import { goToScreen, type ScreenLabel } from "./helpers/screens";

/**
 * Quick 261113-si7: a 12'0" x 31" board and a 4'0" x 16" board, each walked through every design screen. The two
 * ends of what the app can now make are where something is most likely to be cut off or drawn over something else,
 * so on each screen this checks the three things a shaper would see go wrong:
 *
 * - no error in the browser's console;
 * - the drawing's own box sits inside the panel that holds it, and every word drawn inside it sits inside that
 *   drawing (nothing clipped by its edge);
 * - no word on the page straddles the edge of the window, and the page does not scroll sideways.
 *
 * The boards are opened the way a shaper's kept board is (`shaper-open-board` in this browser), so each screen is
 * reached by its own tab and the board comes along. The computer walks all eight screens, with a Spiral Vee and four
 * channels on BOTTOM and a Thruster then a Quad on FINS; an upright iPhone walks TEMPLATE, ROCKER and FINS.
 */

const FIRST_FRAME_MS = 30_000;

/** A preset's design as a hand-set board of this size (no blank: ROCKER's list is then asked what fits). */
function boardOf(lengthIn: number, widthIn: number, wide: boolean): DesignSnapshotFields {
  const preset = BOARD_PRESETS.find((p) => p.id === "longboard")!;
  const base = presetDesignFields(preset);
  const tail = wide ? TAIL_PRESETS.round : TAIL_PRESETS[base.outline.tail.kind];
  const outline = {
    ...base.outline,
    length: inchesToMm(lengthIn),
    widePointWidth: inchesToMm(widthIn),
    widePointOffset: inchesToMm(0),
    // The glider-ish 12'0" x 31": a round tail and a round nose (Nose Angle 90).
    ...(wide ? { noseAngle: degrees(90), tail: tail.tail, tailAngle: tail.tailAngle, tailFullness: tail.tailFullness } : {}),
  };
  const fields: DesignSnapshotFields = {
    ...base,
    outline,
    blank: null,
    volume: DEFAULT_VOLUME_SPEC,
    finsImportTemplate: true,
    railsImportFoilThickness: true,
    boardName: "",
    finSystem: "fcs2",
  };
  // A Spiral Vee on the tail and four channels, picked with the app's own functions for this very board.
  const board = designBottomBoard(
    fields.outline,
    buildOutline(fields.outline),
    designSideProfile(fields, LIVE_DESIGN_RULES),
    designFinPlacement(fields),
  );
  const cuts = pickCut(DEFAULT_BOTTOM, "tail", "Spiral Vee", board);
  const bottom: BoardBottom = { ...cuts, channels: startingChannels(4, board, cuts.channels) };
  return { ...fields, bottom };
}

const BOARDS = [
  { name: "a 12'0\" x 31\" glider", make: () => boardOf(144, 31, true), wide: true, length: `12'0"`, width: `31"` },
  { name: "a 4'0\" x 16\" board", make: () => boardOf(48, 16, false), wide: false, length: `4'0"`, width: `16"` },
] as const;

/**
 * Console errors and uncaught page errors, collected from the moment this is called. One kind of message is
 * left out: "Failed to load resource … 400" (a 403 on the iPhone's WebKit), which is the suite's stand-in Clerk key being
 * refused by Clerk's own server on every page of every spec (the key in `playwright.config.ts` is a deliberate non-secret) — nothing the
 * board has to do with.
 */
function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(`page error: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    if (/^Failed to load resource: the server responded with a status of (400|403)/.test(message.text())) return;
    errors.push(`console error: ${message.text()}`);
  });
  return errors;
}

/**
 * Looks at what is on the screen now and returns every problem found, in plain words. Run in the page itself:
 * the drawing(s) are the big svgs outside the top bar, menus and dialogs.
 */
async function lookForClipping(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const problems: string[] = [];
    const vw = window.innerWidth;
    const shown = (el: Element) => {
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
      const box = el.getBoundingClientRect();
      return box.width > 0 && box.height > 0;
    };
    const scrollsAcross = (el: Element) => /(auto|scroll|hidden|clip)/.test(getComputedStyle(el).overflowX);

    if ((document.scrollingElement?.scrollWidth ?? 0) > vw + 1) {
      problems.push(`the page scrolls sideways (${document.scrollingElement?.scrollWidth} > ${vw})`);
    }

    // The drawings.
    const svgs = Array.from(document.querySelectorAll("svg")).filter((svg) => {
      const box = svg.getBoundingClientRect();
      return shown(svg) && box.width > 200 && box.height > 100 && !svg.closest("header, nav, button, [role=dialog], [role=menu]");
    });
    if (svgs.length === 0) problems.push("no drawing on the screen");
    for (const svg of svgs) {
      const box = svg.getBoundingClientRect();
      // Its panel: the nearest ancestor that clips what is drawn past its own edge.
      let panel: Element | null = svg.parentElement;
      while (panel && panel !== document.body) {
        const style = getComputedStyle(panel);
        if (style.overflowX !== "visible" || style.overflowY !== "visible") break;
        panel = panel.parentElement;
      }
      if (panel && panel !== document.body) {
        const p = panel.getBoundingClientRect();
        if (box.left < p.left - 1 || box.right > p.right + 1 || box.top < p.top - 1 || box.bottom > p.bottom + 1) {
          problems.push(
            `a drawing sticks out of its panel (drawing ${Math.round(box.left)}-${Math.round(box.right)} x ${Math.round(box.top)}-${Math.round(box.bottom)}, panel ${Math.round(p.left)}-${Math.round(p.right)} x ${Math.round(p.top)}-${Math.round(p.bottom)})`,
          );
        }
      }
      // Every word drawn inside it sits inside it.
      for (const text of Array.from(svg.querySelectorAll("text"))) {
        if (!shown(text)) continue;
        const t = text.getBoundingClientRect();
        // A word's box is its line height, which can reach a few dots past the ink above and below it: the BOTTOM
        // cross-section's "HEIGHT ×4" has its box 2.6 dots over its drawing's top edge on every board of every size
        // (measured on a plain 6'0" with a Spiral Vee as well), so the vertical allowance is 3 dots, the sides 1.
        if (t.left < box.left - 1 || t.right > box.right + 1 || t.top < box.top - 3 || t.bottom > box.bottom + 3) {
          problems.push(`"${(text.textContent ?? "").trim()}" is cut off by its drawing's edge`);
        }
      }
    }

    // Every word on the page: none straddles the window's edge unless a scroller that itself fits holds it.
    for (const el of Array.from(document.querySelectorAll("body *"))) {
      const own = Array.from(el.childNodes).some((n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? "").trim() !== "");
      if (!own || !shown(el) || el.closest("svg")) continue;
      const r = el.getBoundingClientRect();
      const straddles = (r.left < -1 && r.right > 0) || (r.left < vw && r.right > vw + 1);
      if (!straddles) continue;
      let held = false;
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
        if (scrollsAcross(a) && a.getBoundingClientRect().right <= vw + 1 && a.getBoundingClientRect().left >= -1) {
          held = true;
          break;
        }
      }
      if (!held) problems.push(`"${(el.textContent ?? "").trim().slice(0, 40)}" runs off the edge of the window`);
    }
    return problems;
  });
}

async function keepBoard(page: Page, fields: DesignSnapshotFields) {
  const raw = openBoardCopyJson(fields, { modelId: null, ownerId: null, locked: false, dirty: true });
  await page.addInitScript(
    ([banner, tip, key, value]) => {
      window.sessionStorage.setItem(banner, "true");
      window.localStorage.setItem(tip, "true");
      window.localStorage.setItem(key, value);
    },
    [BANNER_DISMISSAL_KEY, TOOLBAR_TIP_DISMISSAL_KEY, OPEN_BOARD_STORAGE_KEY, raw] as const,
  );
}

/**
 * Waits until the board on the page is the one kept for this test. The words are on the page before the app has
 * started (they are drawn on the server, for the stock 6'0" board), so a test that only waited for the words to
 * be there could look at the stock board and pass. This waits for them to say this board's length and width.
 */
async function boardHasOpened(page: Page, length: string, width: string) {
  await expect(page.getByText(/^Board Length — /)).toHaveText(`Board Length — ${length}`, { timeout: 30_000 });
  await expect(page.getByText(/^Width — /)).toHaveText(`Width — ${width}`);
}

/** Waits for a screen's drawing to be on the page and settled (its fit measured), then looks for clipping. */
async function checkScreen(page: Page, errors: string[], label: ScreenLabel) {
  await goToScreen(page, label);
  if (label === "3D") {
    await expect(page.locator("[data-board-3d]")).toHaveAttribute("data-board-state", "ready", { timeout: FIRST_FRAME_MS });
  } else {
    await expect(page.locator("svg").first()).toBeAttached();
  }
  // Let the drawing's own fit settle after layout (a measured scale arrives a frame or two later).
  await page.waitForTimeout(600);
  const problems = await lookForClipping(page);
  // The 3D page is a canvas and VOLUME is a page of numbers with no drawing, so only the words and the page's own
  // width are looked at there.
  const real = label === "3D" || label === "VOLUME" ? problems.filter((p) => p !== "no drawing on the screen") : problems;
  expect(real, `${label}: ${real.join("; ")}`).toEqual([]);
  expect(errors, `${label}: console`).toEqual([]);
}

test.describe("a board at each end of the new sizes, walked through the screens", () => {
  for (const { name, make, wide, length, width } of BOARDS) {
    test(`${name} on a computer: all eight screens, nothing clipped or crossed`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "desktop", "the computer walks all eight screens");
      test.slow();
      const errors = collectErrors(page);
      await keepBoard(page, make());
      await page.goto("/design/outline");
      await boardHasOpened(page, length, width);

      await checkScreen(page, errors, "TEMPLATE");

      // ROCKER: and what the blank list says (a 12'0" x 31" fits only the two long US Blanks SUP blocks).
      await checkScreen(page, errors, "ROCKER");
      await waitForBlankButton(page);
      const dialog = await openBlankPicker(page);
      const fits = await blankCards(dialog, "fits").locator("[data-blank-name]").allInnerTexts();
      if (wide) {
        expect(fits.map((n) => n.trim()).sort(), "what fits a 12'0\" x 31\"").toEqual([`12'1" EPS`, `12'6" EPS`]);
      } else {
        expect(fits.length, "a 4'0\" board fits plenty of blanks").toBeGreaterThan(10);
      }
      await closeBlankPicker(page);

      await checkScreen(page, errors, "BOTTOM");
      await checkScreen(page, errors, "RAILS");
      await checkScreen(page, errors, "VOLUME");

      // FINS: a Thruster, then a Quad.
      await checkScreen(page, errors, "FINS");
      for (const setup of ["Thruster", "Quad"]) {
        await expect(async () => {
          await page.getByRole("button", { name: setup, exact: true }).click({ timeout: 2_000 });
          await expect(page.getByRole("button", { name: setup, exact: true })).toBeVisible();
        }).toPass({ timeout: 20_000 });
        await page.waitForTimeout(400);
        const problems = await lookForClipping(page);
        expect(problems, `FINS ${setup}: ${problems.join("; ")}`).toEqual([]);
      }

      await checkScreen(page, errors, "SUMMARY");
      await checkScreen(page, errors, "3D");
    });

    test(`${name} on an upright iPhone: TEMPLATE, ROCKER and FINS, nothing clipped or crossed`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "iphone", "the phone walks TEMPLATE, ROCKER and FINS");
      test.slow();
      const errors = collectErrors(page);
      await keepBoard(page, make());
      await page.goto("/design/outline");
      await boardHasOpened(page, length, width);
      for (const label of ["TEMPLATE", "ROCKER", "FINS"] as const) await checkScreen(page, errors, label);
    });
  }
});
