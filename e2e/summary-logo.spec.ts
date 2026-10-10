import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * The printed order form's logo and its footer address (quick 261010-km7, D-01, D-09, D-12, D-13,
 * D-16): the founder's logo heads page 1 alone in its bordered box and stands on the board name's
 * baseline on page 2, both in the sheet's own ink; and the address at the foot of every page,
 * www.ShaperAssistant.com, is a working link on screen (it opens a NEW tab, so the Summary page and
 * a signed-out shaper's unsaved board stay put) and in a PDF saved from the browser's print (one
 * link annotation per page).
 *
 * The "before" figures below were measured on 2026-10-10 before any code changed, on the desktop
 * project at 1280 x 1000 and on a touch phone: the page 2 strip stood 34.375 dots tall on screen and
 * 28.64 in print; the narrow sweep showed the sheets clipping [0, 19, 0] dots at 268 wide and [0, 0,
 * 0] at 300 (the Rail Band Instructions fit spec logged [0, 18-19, 0] and [0, 0-7, 0] on the same
 * days — the second sheet's own floor, not the first's). The old PDF carried two link annotations
 * on page 1 (the title block's address and the footer's) and one on each of pages 2 and 3.
 *
 * Copies its small helpers rather than importing from the three protected print gates
 * (summary-print-touch-box, summary-rail-key, summary-print-size), which are never edited.
 */

const PRINT_RAIL_INSTRUCTIONS_STORAGE_KEY = "shaper-print-rail-instructions";
const THEME_STORAGE_KEY = "shaper-theme";
const LOGO_NAME = "Shaper Assistant";

/** Measured 2026-10-10, before the change (see the head comment). */
const BEFORE_STRIP_SCREEN_PX = 34.375;
const BEFORE_STRIP_PRINT_PX = 28.64;
const BEFORE_SHEET_CLIP_PX: Record<number, [number, number, number]> = {
  268: [0, 19, 0],
  300: [0, 7, 0],
};

const NARROW_WIDTHS = [268, 300, 330, 360, 390, 420, 450, 479];
const WIDER_WIDTHS = [480, 531];

const DAYLIGHT_INK = "rgb(31, 42, 59)";

async function prepare(page: Page, theme = "daylight") {
  await page.addInitScript(
    ([railKey, themeKey, themeId]) => {
      window.sessionStorage.setItem("shaper-sign-in-banner-dismissed", "true");
      window.localStorage.setItem("shaper-toolbar-tip-dismissed", "true");
      window.localStorage.setItem(railKey, "true");
      window.localStorage.setItem(themeKey, themeId);
    },
    [PRINT_RAIL_INSTRUCTIONS_STORAGE_KEY, THEME_STORAGE_KEY, theme],
  );
}

async function openSummary(page: Page) {
  await page.goto("/design/summary");
  await expect(page.locator("[data-order-form-sheet]")).toHaveCount(3);
  // Let the preview scale and the print fit settle.
  await page.waitForTimeout(600);
}

async function box(locator: Locator) {
  const b = await locator.boundingBox();
  if (!b) throw new Error("no bounding box");
  return b;
}

/** Page 1's title block: the box holding the logo, in the header band. */
function titleBlock(page: Page) {
  return page.locator(".order-form-logo-col > div").first();
}

function refStrip(page: Page) {
  return page.locator(".order-form-band-refhead").first();
}

test.describe("the order form's logos (desktop project)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "computer-sized sheet; page.pdf is Chromium-headless only");
    await page.setViewportSize({ width: 1280, height: 1000 });
    await prepare(page);
    await openSummary(page);
  });

  test("page 1's title block holds the logo alone, filling its inside, centred, in the theme's ink", async ({ page }) => {
    const block = titleBlock(page);
    await expect(block.getByRole("img", { name: LOGO_NAME, exact: true })).toBeVisible();
    await expect(block.getByRole("link")).toHaveCount(0);
    // No rule inside the block: the only child is the logo.
    expect(await block.evaluate((el) => el.children.length)).toBe(1);
    expect(await block.evaluate((el) => el.textContent?.trim())).toBe("");

    const logo = block.getByRole("img", { name: LOGO_NAME, exact: true });
    const b = await box(block);
    const l = await box(logo);
    const style = await block.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        left: parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft),
        right: parseFloat(cs.borderRightWidth) + parseFloat(cs.paddingRight),
      };
    });
    const insideWidth = b.width - style.left - style.right;
    console.log(
      `[summary-logo] page 1 block ${b.width.toFixed(1)}x${b.height.toFixed(1)}, logo ${l.width.toFixed(1)}x${l.height.toFixed(1)}`,
    );
    expect(Math.abs(l.width - insideWidth)).toBeLessThanOrEqual(1);
    expect(l.x).toBeGreaterThanOrEqual(b.x - 0.01);
    expect(l.x + l.width).toBeLessThanOrEqual(b.x + b.width + 0.01);
    expect(l.y).toBeGreaterThanOrEqual(b.y - 0.01);
    expect(l.y + l.height).toBeLessThanOrEqual(b.y + b.height + 0.01);
    expect(Math.abs(l.x + l.width / 2 - (b.x + b.width / 2))).toBeLessThanOrEqual(1);
    expect(Math.abs(l.y + l.height / 2 - (b.y + b.height / 2))).toBeLessThanOrEqual(1);
    expect(await logo.evaluate((el) => getComputedStyle(el).color)).toBe(DAYLIGHT_INK);
  });

  test("page 2's strip carries the logo on the board name's baseline, and is no taller than before", async ({ page }) => {
    const strip = refStrip(page);
    const logo = strip.getByRole("img", { name: LOGO_NAME, exact: true });
    await expect(logo).toBeVisible();
    const logoBox = await box(logo);

    // An empty inline-block's bottom edge sits on its line's baseline: append one to the name's
    // span, read it, remove it.
    const nameBaseline = await strip.evaluate((el) => {
      const name = el.querySelector("span.truncate") as HTMLElement | null;
      if (!name) throw new Error("the board name span is missing");
      const probe = document.createElement("span");
      probe.style.cssText = "display:inline-block;width:0;height:0";
      name.appendChild(probe);
      const bottom = probe.getBoundingClientRect().bottom;
      probe.remove();
      return bottom;
    });
    console.log(
      `[summary-logo] page 2 logo ${logoBox.width.toFixed(1)}x${logoBox.height.toFixed(1)}, bottom ${(logoBox.y + logoBox.height).toFixed(2)}, name baseline ${nameBaseline.toFixed(2)}`,
    );
    expect(Math.abs(logoBox.y + logoBox.height - nameBaseline)).toBeLessThanOrEqual(0.5);

    const screenHeight = (await box(strip)).height;
    await page.emulateMedia({ media: "print" });
    const printHeight = (await box(strip)).height;
    await page.emulateMedia({ media: "screen" });
    console.log(`[summary-logo] page 2 strip ${screenHeight} on screen, ${printHeight} in print`);
    expect(screenHeight).toBeLessThanOrEqual(BEFORE_STRIP_SCREEN_PX + 0.5);
    expect(printHeight).toBeLessThanOrEqual(BEFORE_STRIP_PRINT_PX + 0.5);
  });

  test("in print, from Phosphor, both logos are drawn in the sheet's own ink", async ({ page }) => {
    // Re-open the page in the Phosphor theme (a dark one), then switch to print media.
    // (An init script registered later runs later, so it overrides the Daylight one set up above.)
    await page.addInitScript((key) => window.localStorage.setItem(key, "phosphor"), THEME_STORAGE_KEY);
    await page.reload();
    await expect(page.locator("[data-order-form-sheet]")).toHaveCount(3);
    const screenInk = await titleBlock(page).getByRole("img", { name: LOGO_NAME, exact: true }).evaluate((el) => getComputedStyle(el).color);
    expect(screenInk, "Phosphor's own green on screen").toBe("rgb(38, 208, 38)");
    await page.emulateMedia({ media: "print" });
    for (const logo of [
      titleBlock(page).getByRole("img", { name: LOGO_NAME, exact: true }),
      refStrip(page).getByRole("img", { name: LOGO_NAME, exact: true }),
    ]) {
      expect(await logo.evaluate((el) => getComputedStyle(el).color)).toBe(DAYLIGHT_INK);
    }
    await page.emulateMedia({ media: "screen" });
  });

  test("on screen, every sheet's footer address is a link nothing covers, and a click opens the site in a new tab", async ({
    page,
    context,
  }) => {
    await context.route("https://www.shaperassistant.com/**", (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: "<title>stand-in</title><p>stand-in site</p>" }),
    );
    const sheets = page.locator("[data-order-form-sheet]");
    for (let i = 0; i < 3; i += 1) {
      const link = sheets.nth(i).getByRole("link", { name: "www.ShaperAssistant.com", exact: true });
      await link.scrollIntoViewIfNeeded();
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", "https://www.ShaperAssistant.com");
      await expect(link).toHaveAttribute("target", "_blank");
      expect(await link.getAttribute("rel")).toContain("noopener");
      const covered = await link.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return !(top === el || el.contains(top));
      });
      expect(covered, `sheet ${i + 1}: the address is covered by something`).toBe(false);
    }

    const before = page.url();
    const first = sheets.first().getByRole("link", { name: "www.ShaperAssistant.com", exact: true });
    await first.scrollIntoViewIfNeeded();
    const popupPromise = context.waitForEvent("page");
    await first.click();
    const popup = await popupPromise;
    await popup.waitForLoadState("domcontentloaded");
    expect(popup.url()).toBe("https://www.shaperassistant.com/");
    // The Summary page stayed where it was.
    expect(page.url()).toBe(before);
    await expect(sheets).toHaveCount(3);
    await popup.close();
  });

  for (const format of ["Letter", "A4"] as const) {
    test(`in a saved PDF (${format}, background graphics off) there are three pages and one link per page, all to the site`, async ({
      page,
    }) => {
      const pdf = await page.pdf({ format, printBackground: false });
      const raw = pdf.toString("latin1");
      const pageCount = (raw.match(/\/Type\s*\/Page\b/g) ?? []).length;
      const addresses = [...raw.matchAll(/\/URI\s*\(([^)]*)\)/g)].map((m) => m[1]);
      const pagesWithAnnots = (raw.match(/\/Annots\s*\[/g) ?? []).length;
      console.log(`[summary-logo] ${format}: ${pageCount} pages, ${pagesWithAnnots} with links, addresses ${JSON.stringify(addresses)}`);
      expect(pageCount).toBe(3);
      expect(addresses).toHaveLength(3);
      expect(pagesWithAnnots).toBe(3);
      for (const address of addresses) {
        expect(address.toLowerCase().replace(/\/$/, "")).toBe("https://www.shaperassistant.com");
      }
    });
  }
});

test.describe("a phone's print widths (Chromium phone project)", () => {
  test("at every narrow width the address steps aside and the mark reads Page N of M alone; at 480 and up it is the link", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "android", "Chromium phone project, like the other print-width sweeps");
    test.setTimeout(120_000);
    await prepare(page);
    await openSummary(page);
    expect(await page.evaluate(() => window.matchMedia("(pointer: coarse)").matches)).toBe(true);

    for (const width of [...NARROW_WIDTHS, ...WIDER_WIDTHS]) {
      await page.setViewportSize({ width, height: 1400 });
      await page.emulateMedia({ media: "print" });
      await page.waitForTimeout(150);

      const marks = await page.locator("[data-order-form-sheet]").evaluateAll((sheets) =>
        sheets.map((sheet) => {
          const site = sheet.querySelector("span.order-form-mark-site") as HTMLElement | null;
          const right = site?.parentElement as HTMLElement | null;
          const lines = (el: HTMLElement | null) => {
            if (!el) return -1;
            const range = document.createRange();
            range.selectNodeContents(el);
            return new Set(Array.from(range.getClientRects()).map((r) => Math.round(r.top))).size;
          };
          return {
            display: site ? getComputedStyle(site).display : "missing",
            text: right?.innerText?.replace(/\s+/g, " ").trim() ?? "",
            rightLines: lines(right),
          };
        }),
      );
      const clips = await page
        .locator("[data-order-form-sheet]")
        .evaluateAll((sheets) => sheets.map((s) => Math.max(0, s.scrollHeight - s.clientHeight)));
      const block = await box(titleBlock(page));
      const logo = await box(titleBlock(page).getByRole("img", { name: LOGO_NAME, exact: true }));
      console.log(
        `[summary-logo] width=${width}  marks=${marks.map((m) => `${m.display}/${m.rightLines}`).join(",")}  clipped=[${clips.map((c) => c.toFixed(1)).join(", ")}]  logo ${logo.width.toFixed(1)}x${logo.height.toFixed(1)} in block ${block.width.toFixed(1)}x${block.height.toFixed(1)}`,
      );

      marks.forEach((mark, i) => {
        expect(mark.rightLines, `width=${width} sheet ${i + 1}: page mark on one line`).toBe(1);
        if (width < 480) {
          expect(mark.display, `width=${width} sheet ${i + 1}`).toBe("none");
          expect(mark.text).toMatch(/^Page \d of 3$/);
        } else {
          expect(mark.display, `width=${width} sheet ${i + 1}`).not.toBe("none");
          expect(mark.text).toMatch(/^www\.ShaperAssistant\.com · Page \d of 3$/);
        }
      });
      if (width >= 480) {
        const link = page.locator("[data-order-form-sheet]").first().getByRole("link", { name: "www.ShaperAssistant.com", exact: true });
        await expect(link).toBeVisible();
      }

      expect(logo.x).toBeGreaterThanOrEqual(block.x - 0.01);
      expect(logo.x + logo.width).toBeLessThanOrEqual(block.x + block.width + 0.01);
      expect(logo.y).toBeGreaterThanOrEqual(block.y - 0.01);
      expect(logo.y + logo.height).toBeLessThanOrEqual(block.y + block.height + 0.01);

      // No sheet clips more than it did before this change.
      const before = BEFORE_SHEET_CLIP_PX[width] ?? [0, 0, 0];
      clips.forEach((clip, i) =>
        expect(clip, `width=${width} sheet ${i + 1} clips ${clip}`).toBeLessThanOrEqual(before[i] + 1),
      );
      await page.emulateMedia({ media: "screen" });
    }
  });
});
