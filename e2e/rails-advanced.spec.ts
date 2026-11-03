import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";

/**
 * Quick 261102-gec plan 02 (2026-11-02): the RAILS sidebar's fuller controls and the drawn finished
 * rail, proven in a browser on a computer and both phones.
 *
 * - Ratio runs 20/80 to 80/20 in halves, its readout fits the half-width column on one line and its
 *   three marks never touch (R8, PC14, PC15, measured M9).
 * - Deck Profile stops at 75% (R7, PC23).
 * - Each rail's Advanced menu: "Scaled from center by" on the nose and tail only, six nudge sliders
 *   in the founder's order, Use Single Tuck and the tail's Hard Edge hiding the tuck sliders, and Reset
 *   putting it all back (R10, R14, PC17-PC20). Plan 04 (R17, 2026-11-02) took the Deck Mark 2 and
 *   Bottom Tuck 2 sliders away — "Always in the middle is great" — and added the Domed Deck Band's
 *   under Deck Mark 3 (R18, PC32).
 * - The Domed Deck Band slider (plan 04, R18): ±2" in 1/16" steps, and the dome never lands on Deck
 *   Mark 3 — the founder's final ruling, "never let it equal Deck Mark 3" — even a moved one: it stops
 *   1/16" past it.
 * - The Finished Rail switch on VIEWER: on by default, one finished-rail line per visible plot and
 *   "Finished Rail" in the key; it hides and shows both (R13, PC21, PC22).
 * - On a phone the new sliders take a finger (R15).
 * - The Ghost Bands switch beside it (fast task, 2026-11-02): off by default, it fades every band and
 *   mark dot but the Apex Center's by one opacity, and it is disabled while the finished rail is hidden.
 * - The Sharp Bottom Tuck box (plan 05, R22 — the founder, 2026-11-02: "an advanced checkbox for leaving
 *   the bottom edge fairly sharp (follow the angle at bottom tuck 3)"): after Bottom Tuck 3 in every
 *   rail's Advanced menu, hidden with the tucks on a hard-edge tail, unticked by Reset. Ticked, the drawn
 *   finished rail keeps the Bottom Tuck 3 corner — one blend fewer — while the DATA tab never moves.
 *
 * Every expected reading is read off the page before the change and compared after it — never a typed
 * mark. The only typed figures are the founder's own windows and steps (20-80 by 0.5, the tips' scale 1.00, 75-100%,
 * the 1/16" step).
 *
 * It works with whichever rail is in view: on a computer all three rails' controls sit in the
 * sidebar; on an upright phone the NOSE/CENTER/TAIL switch over the drawing picks the one shown.
 */

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";
const TOOLBAR_TIP_DISMISSAL_KEY = "shaper-toolbar-tip-dismissed";

type RailKey = "nose" | "center" | "tail";
const RAIL_TITLE: Record<RailKey, string> = { nose: "Nose Rail", center: "Center Rail", tail: "Tail Rail" };
const DATA_COLUMN: Record<RailKey, number> = { nose: 0, center: 1, tail: 2 };

async function dismissStrips(page: Page) {
  await page.addInitScript((key) => window.sessionStorage.setItem(key, "true"), BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => window.localStorage.setItem(key, "true"), TOOLBAR_TIP_DISMISSAL_KEY);
}

const isPhone = (testInfo: TestInfo) => testInfo.project.name !== "desktop";

/** Opens RAILS on a fresh board and waits for React to have taken over the page (the toolbar's
 * buttons carry React's own props once hydrated), so a click or a key press is never lost. */
async function openRails(page: Page) {
  await dismissStrips(page);
  await page.goto("/design/rails");
  await page.waitForFunction(
    () => {
      const button = document.querySelector("[data-viewer-toolbar] button");
      return !!button && Object.keys(button).some((k) => k.startsWith("__reactProps"));
    },
    undefined,
    { timeout: 60_000 },
  );
}

function railsPageTabs(page: Page) {
  return page.getByRole("tablist").filter({ hasText: "DATA" });
}

/** Brings a rail's controls into view: on a phone, its NOSE/CENTER/TAIL tab; on a computer they
 * are always there. */
async function showRail(page: Page, testInfo: TestInfo, key: RailKey): Promise<Locator> {
  if (isPhone(testInfo)) {
    const tab = page.getByRole("tablist").filter({ hasText: "NOSE" }).getByRole("tab", { name: key.toUpperCase() });
    await expect(async () => {
      await tab.click();
      await expect(tab).toHaveAttribute("aria-selected", "true", { timeout: 1_000 });
    }).toPass({ timeout: 15_000 });
  }
  const group = page.locator(`[data-rail-group="${key}"]`);
  await expect(group.getByText(/^Deck Profile — /)).toBeVisible();
  return group;
}

/** Opens a rail's Advanced fold and returns its body. */
async function openAdvanced(group: Locator): Promise<Locator> {
  const heading = group.getByRole("button", { name: /^Advanced [▾▸]$/ });
  const body = heading.locator("xpath=following-sibling::div[1]");
  await expect(async () => {
    if ((await body.count()) === 0) await heading.click();
    await expect(body.getByRole("button", { name: /Reset Advanced Settings/ })).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
  return body;
}

/** The text of each row in an Advanced body, top to bottom. */
async function advancedRows(body: Locator): Promise<string[]> {
  return body.evaluate((el) => Array.from(el.children).map((c) => (c.textContent ?? "").trim()));
}

function nudgeLabel(group: Locator, name: string): Locator {
  return group.getByText(new RegExp(`^${name} — `));
}

function nudgeThumb(page: Page, key: RailKey, name: string): Locator {
  return page.getByRole("slider", { name: `${RAIL_TITLE[key]} ${name} nudge`, exact: true });
}

/** The mark a nudge label reads ("Domed Deck Band — 4 9/16" (-2")" reads 4 9/16"), in sixteenths of an
 * inch — read off the page's own text (a non-breaking space read as a space), never a typed mark. */
async function markSixteenths(label: Locator): Promise<number> {
  const text = ((await label.textContent()) ?? "").replace(/\u00a0/g, " ");
  const mark = text.match(/ — (.+?)" \(/)?.[1];
  if (!mark) throw new Error(`no mark in "${text}"`);
  const inches = mark
    .split(" ")
    .map((part) => (part.includes("/") ? Number(part.split("/")[0]) / Number(part.split("/")[1]) : Number(part)))
    .reduce((a, b) => a + b, 0);
  return Math.round(inches * 16);
}

/** The slider inside the same row as a label line (SliderRow: the label is the row's first child). */
function rowSlider(label: Locator): Locator {
  return label.locator("xpath=..").getByRole("slider");
}

/** One rail's cell in the DATA tab's row named `label` ("—" when the row is empty for that rail). */
async function dataCell(page: Page, label: string, key: RailKey): Promise<string> {
  await railsPageTabs(page).getByRole("tab", { name: "DATA" }).click();
  const cell = await page.waitForFunction(
    ([rowLabel, column]) => {
      const row = Array.from(document.querySelectorAll("div")).find(
        (d) => d.children.length === 4 && d.children[0].textContent === rowLabel,
      );
      return row ? (row.children[column + 1].textContent ?? "") : null;
    },
    [label, DATA_COLUMN[key]] as const,
  );
  const text = (await cell.jsonValue()) as string;
  await railsPageTabs(page).getByRole("tab", { name: "VIEWER" }).click();
  return text;
}

/** The Ratio column of a rail: its readout, its slider and its three marks. */
function ratioColumn(group: Locator) {
  const readout = group.locator("[data-ratio-readout]");
  const column = readout.locator("xpath=../..");
  return { readout, slider: column.getByRole("slider"), marks: column.locator("[data-ratio-mark]") };
}

function familyColumn(group: Locator) {
  const heading = group.getByText(/^Family — /);
  return { heading, slider: heading.locator("xpath=..").getByRole("slider") };
}

test.describe("RAILS' fuller Advanced menu (quick 261102-gec plan 02)", () => {
  test.beforeEach(async ({ page }) => {
    await openRails(page);
  });

  test("1. the Nose rail's Advanced lists the scale, six nudges in the founder's order with the Domed Deck Band under Deck Mark 3, Single Tuck, Sharp Bottom Tuck after Bottom Tuck 3 and Reset; the Center rail's has no scale", async ({
    page,
  }, testInfo) => {
    const nose = await showRail(page, testInfo, "nose");
    const noseRows = await advancedRows(await openAdvanced(nose));
    const expected = [
      /^Scaled from center by — 1\.00$/,
      /^Apex Thickness — .+ \(.+\)$/,
      /^Deck Mark 1 — .+ \(.+\)$/,
      /^Deck Mark 3 — .+ \(.+\)$/,
      /^Domed Deck Band — .+ \(.+\)$/,
      /^Use Single Tuck$/,
      /^Bottom Tuck 1 — .+ \(.+\)$/,
      /^Bottom Tuck 3 — .+ \(.+\)$/,
      /^Sharp Bottom Tuck$/,
      /Reset Advanced Settings$/,
    ];
    expect(noseRows.length).toBe(expected.length);
    expected.forEach((re, i) => expect(noseRows[i]).toMatch(re));

    const center = await showRail(page, testInfo, "center");
    const centerRows = await advancedRows(await openAdvanced(center));
    expect(centerRows.length).toBe(expected.length - 1);
    expected.slice(1).forEach((re, i) => expect(centerRows[i]).toMatch(re));
    expect(centerRows.some((r) => r.startsWith("Scaled from center by"))).toBe(false);
    // Deck Mark 2 and Bottom Tuck 2 are always halfway (plan 04, R17): no slider of their own.
    for (const rows of [noseRows, centerRows]) {
      expect(rows.some((r) => r.startsWith("Deck Mark 2") || r.startsWith("Bottom Tuck 2"))).toBe(false);
    }
  });

  test("2. one step on Deck Mark 1's nudge reads +1/16\" and moves that rail's Deck Mark 1 on the DATA tab", async ({
    page,
  }, testInfo) => {
    const nose = await showRail(page, testInfo, "nose");
    const before = await dataCell(page, "Deck Mark 1", "nose");
    await openAdvanced(nose);
    const label = nudgeLabel(nose, "Deck Mark 1");
    const labelBefore = await label.textContent();
    await nudgeThumb(page, "nose", "Deck Mark 1").press("ArrowRight");
    await expect(label).toHaveText(/\(\+1\/16"\)$/);
    expect(await label.textContent()).not.toBe(labelBefore);
    const after = await dataCell(page, "Deck Mark 1", "nose");
    expect(after).not.toBe(before);
    // The label reads the mark the DATA tab shows.
    await showRail(page, testInfo, "nose");
    expect(await nudgeLabel(nose, "Deck Mark 1").textContent()).toContain(`Deck Mark 1 — ${after} (`);
  });

  test("3. Use Single Tuck hides the Bottom Tuck 1 slider and empties Bottom Tuck 1 and 2 on the DATA tab; unticking brings them back", async ({
    page,
  }, testInfo) => {
    const nose = await showRail(page, testInfo, "nose");
    const body = await openAdvanced(nose);
    await expect(nudgeLabel(nose, "Bottom Tuck 1")).toBeVisible();
    // Bottom Tuck 2 has no slider at all (plan 04, R17: always halfway to Bottom Tuck 1).
    await expect(nudgeLabel(nose, "Bottom Tuck 2")).toHaveCount(0);
    expect(await dataCell(page, "Bottom Tuck 1", "nose")).not.toBe("—");
    expect(await dataCell(page, "Bottom Tuck 2", "nose")).not.toBe("—");

    await showRail(page, testInfo, "nose");
    const single = body.getByRole("checkbox", { name: "Use Single Tuck" });
    await single.click();
    await expect(single).toBeChecked();
    await expect(nudgeLabel(nose, "Bottom Tuck 1")).toHaveCount(0);
    await expect(nudgeLabel(nose, "Bottom Tuck 2")).toHaveCount(0);
    await expect(nudgeLabel(nose, "Bottom Tuck 3")).toBeVisible();
    await expect(nudgeLabel(nose, "Domed Deck Band")).toBeVisible();
    expect(await dataCell(page, "Bottom Tuck 1", "nose")).toBe("—");
    expect(await dataCell(page, "Bottom Tuck 2", "nose")).toBe("—");

    await showRail(page, testInfo, "nose");
    await single.click();
    await expect(single).not.toBeChecked();
    await expect(nudgeLabel(nose, "Bottom Tuck 1")).toBeVisible();
    await expect(nudgeLabel(nose, "Bottom Tuck 2")).toHaveCount(0);
    expect(await dataCell(page, "Bottom Tuck 1", "nose")).not.toBe("—");
  });

  test("4. on the tail, Hard Edge (on by default) hides Use Single Tuck, the Bottom Tuck 1 and 3 sliders and Sharp Bottom Tuck while Deck Mark 3 and the Domed Deck Band show; off, they show", async ({
    page,
  }, testInfo) => {
    const tail = await showRail(page, testInfo, "tail");
    const hardEdge = tail.getByRole("checkbox", { name: "Hard Edge" });
    await expect(hardEdge).toBeChecked();
    const body = await openAdvanced(tail);
    await expect(body.getByRole("checkbox", { name: "Use Single Tuck" })).toHaveCount(0);
    // Plan 05 (R22): a hard edge is already sharp at the bottom, so its box hides with the tucks.
    await expect(body.getByRole("checkbox", { name: "Sharp Bottom Tuck" })).toHaveCount(0);
    for (const name of ["Bottom Tuck 1", "Bottom Tuck 2", "Bottom Tuck 3"]) {
      await expect(nudgeLabel(tail, name)).toHaveCount(0);
    }
    await expect(nudgeLabel(tail, "Deck Mark 3")).toBeVisible();
    await expect(nudgeLabel(tail, "Domed Deck Band")).toBeVisible();

    await hardEdge.click();
    await expect(hardEdge).not.toBeChecked();
    await expect(body.getByRole("checkbox", { name: "Use Single Tuck" })).toBeVisible();
    await expect(body.getByRole("checkbox", { name: "Sharp Bottom Tuck" })).toBeVisible();
    for (const name of ["Bottom Tuck 1", "Bottom Tuck 3"]) {
      await expect(nudgeLabel(tail, name)).toBeVisible();
    }
    await expect(nudgeLabel(tail, "Bottom Tuck 2")).toHaveCount(0);
    await expect(nudgeLabel(tail, "Domed Deck Band")).toBeVisible();
  });

  test("5. Center at Boxy and 80/20 trims its apex to fit and says so; one step back reads 79.5/20.5", async ({
    page,
  }, testInfo) => {
    // At scale 1, Family 1 and 80/20 the sheet's apex (0.4375 x t) is always more than the room the
    // rail leaves (0.4 x t - 1/8"), so the apex is trimmed at any thickness — no figure needed.
    const center = await showRail(page, testInfo, "center");
    await openAdvanced(center);
    const apex = nudgeLabel(center, "Apex Thickness");
    await expect(apex).not.toContainText("trimmed to fit");

    const family = familyColumn(center);
    await family.slider.press("Home");
    await expect(family.heading).toHaveText(/^Family — boxy$/);
    const ratio = ratioColumn(center);
    await ratio.slider.press("End");
    await expect(ratio.readout).toHaveText("Ratio — 80/20");
    await expect(apex).toContainText("trimmed to fit");
    await expect(apex).toHaveText(/, trimmed to fit$/);

    await ratio.slider.press("ArrowLeft");
    await expect(ratio.readout).toHaveText("Ratio — 79.5/20.5");
    await ratio.slider.press("Home");
    await expect(ratio.readout).toHaveText("Ratio — 20/80");
  });

  test("6. Reset Advanced Settings puts the nudges — the Domed Deck Band's too — and the scale back, unticks Sharp Bottom Tuck; on the tail it turns Hard Edge back on", async ({
    page,
  }, testInfo) => {
    // Plan 05 (R22): the Center Rail's Sharp Bottom Tuck ticked first; its Reset unticks it.
    const center = await showRail(page, testInfo, "center");
    const centerBody = await openAdvanced(center);
    const sharp = centerBody.getByRole("checkbox", { name: "Sharp Bottom Tuck" });
    await expect(sharp).not.toBeChecked();
    await sharp.click();
    await expect(sharp).toBeChecked();
    await centerBody.getByRole("button", { name: /Reset Advanced Settings/ }).click();
    await expect(sharp).not.toBeChecked();

    const nose = await showRail(page, testInfo, "nose");
    const body = await openAdvanced(nose);
    const scale = nose.getByText(/^Scaled from center by — /);
    const watched = [
      scale,
      nudgeLabel(nose, "Apex Thickness"),
      nudgeLabel(nose, "Deck Mark 1"),
      nudgeLabel(nose, "Domed Deck Band"),
      nudgeLabel(nose, "Bottom Tuck 3"),
    ];
    const before = await Promise.all(watched.map((l) => l.textContent()));

    await nudgeThumb(page, "nose", "Deck Mark 1").press("ArrowRight");
    await nudgeThumb(page, "nose", "Domed Deck Band").press("ArrowRight");
    await nudgeThumb(page, "nose", "Bottom Tuck 3").press("ArrowRight");
    await rowSlider(scale).press("ArrowLeft");
    await expect(nudgeLabel(nose, "Deck Mark 1")).toHaveText(/\(\+1\/16"\)$/);
    await expect(nudgeLabel(nose, "Domed Deck Band")).toHaveText(/\(\+1\/16"\)$/);
    await expect(nudgeLabel(nose, "Bottom Tuck 3")).toHaveText(/\(\+1\/16"\)$/);
    await expect(scale).not.toHaveText(before[0] ?? "");

    await body.getByRole("button", { name: /Reset Advanced Settings/ }).click();
    for (let i = 0; i < watched.length; i++) await expect(watched[i]).toHaveText(before[i] ?? "");
    // 1.00 since fast task 189 (R20, the founder: "Go with 1.00 as the default").
    await expect(scale).toHaveText("Scaled from center by — 1.00");

    const tail = await showRail(page, testInfo, "tail");
    const hardEdge = tail.getByRole("checkbox", { name: "Hard Edge" });
    await hardEdge.click();
    await expect(hardEdge).not.toBeChecked();
    const tailBody = await openAdvanced(tail);
    await tailBody.getByRole("button", { name: /Reset Advanced Settings/ }).click();
    await expect(hardEdge).toBeChecked();
  });

  test("7. Deck Profile runs 75% to 100%: at its Heavily Domed end the label's tapered thickness is the DATA tab's", async ({
    page,
  }, testInfo) => {
    const nose = await showRail(page, testInfo, "nose");
    const label = nose.getByText(/^Deck Profile — /);
    const slider = rowSlider(label);
    const bound = async (name: "min" | "max") =>
      (await slider.getAttribute(name)) ?? (await slider.getAttribute(`aria-value${name}`));
    expect(Number(await bound("min"))).toBe(75);
    expect(Number(await bound("max"))).toBe(100);
    await slider.press("End");
    await expect.poll(async () => Number(await slider.inputValue())).toBe(100);
    const tapered = (await label.textContent())?.match(/^Deck Profile — (.+) \(Tapered Thickness\)$/)?.[1];
    expect(tapered).toBeTruthy();
    expect(await dataCell(page, "Tapered Rail Thickness", "nose")).toBe(tapered);
  });
});

test.describe("the finished rail on VIEWER (quick 261102-gec plan 02, R13, PC21)", () => {
  test("8. the Finished Rail button starts pressed, draws one finished rail per visible plot and a key entry, and hides and shows them", async ({
    page,
  }) => {
    await openRails(page);
    const button = page.locator("[data-viewer-toolbar]").getByRole("button", { name: /finished rail$/ });
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect(button).toHaveAccessibleName("Hide finished rail");

    const counts = () =>
      page.evaluate(() => {
        const plots = Array.from(document.querySelectorAll("[data-rail-plot-row] [data-rail-section-plot]")).filter(
          (svg) => svg.getBoundingClientRect().width > 0,
        );
        return { plots: plots.length, rails: plots.reduce((n, svg) => n + svg.querySelectorAll("[data-finished-rail]").length, 0) };
      });
    const key = page.getByText("Finished Rail", { exact: true });

    await expect.poll(async () => (await counts()).plots).toBeGreaterThan(0);
    const on = await counts();
    expect(on.rails).toBe(on.plots);
    await expect(key).toBeVisible();

    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "false");
    await expect(button).toHaveAccessibleName("Show finished rail");
    await expect.poll(async () => (await counts()).rails).toBe(0);
    await expect(key).toHaveCount(0);

    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect.poll(async () => (await counts()).rails).toBe(on.plots);
    await expect(key).toBeVisible();
  });
});

test.describe("the Ratio column fits (quick 261102-gec plan 02, R8, M9)", () => {
  test("9. at its narrowest the Ratio readout stays on one line at 40.5/59.5 and its three marks never touch", async ({
    page,
  }, testInfo) => {
    // The narrowest RAILS column on a computer is an 820-dot window; on a phone, a 360-dot one.
    await page.setViewportSize(isPhone(testInfo) ? { width: 360, height: 780 } : { width: 820, height: 800 });
    await openRails(page);
    const nose = await showRail(page, testInfo, "nose");
    const ratio = ratioColumn(nose);
    const family = familyColumn(nose);
    // From the default 60/40 to 40.5/59.5: 39 half-steps down.
    await expect(ratio.readout).toHaveText("Ratio — 60/40");
    for (let i = 0; i < 39; i++) await ratio.slider.press("ArrowLeft");
    await expect(ratio.readout).toHaveText("Ratio — 40.5/59.5");

    const readoutBox = await ratio.readout.boundingBox();
    const familyBox = await family.heading.boundingBox();
    expect(readoutBox && familyBox).toBeTruthy();
    expect(readoutBox!.height).toBeLessThanOrEqual(familyBox!.height + 0.5);
    // The readout ends inside its own half column.
    const columnBox = await ratio.readout.locator("xpath=../..").boundingBox();
    expect(readoutBox!.x + readoutBox!.width).toBeLessThanOrEqual(columnBox!.x + columnBox!.width + 0.5);

    await expect(ratio.marks).toHaveText(["20/80", "50/50", "80/20"]);
    const boxes = await ratio.marks.evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect();
        return { left: r.left, right: r.right };
      }),
    );
    for (let i = 1; i < boxes.length; i++) expect(boxes[i].left).toBeGreaterThan(boxes[i - 1].right);
  });
});

test.describe("on a phone the new sliders take a finger (quick 261102-gec plan 02, R15)", () => {
  test("10. a touch on a nudge row's bar moves that mark", async ({ page }, testInfo) => {
    test.skip(!isPhone(testInfo), "a finger, on the phone projects");
    await openRails(page);
    const nose = await showRail(page, testInfo, "nose");
    await openAdvanced(nose);
    const label = nudgeLabel(nose, "Deck Mark 1");
    const before = await label.textContent();
    const bar = label.locator("xpath=..").locator('[data-slot="slider-track"]');
    await bar.scrollIntoViewIfNeeded();
    const box = await bar.boundingBox();
    if (!box) throw new Error("the nudge slider's bar has no box");
    const point = { x: box.x + box.width * 0.75, y: box.y + box.height / 2 };
    if (testInfo.project.name === "android") {
      // A real finger through Chromium's own touch input (e2e/slider-touch.spec.ts's touchTap).
      const client = await page.context().newCDPSession(page);
      await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point] });
      await page.waitForTimeout(50);
      await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    } else {
      await page.touchscreen.tap(point.x, point.y);
    }
    await expect(label).not.toHaveText(before ?? "");
    await expect(label).toHaveText(/\(\+.+\)$/);
  });
});

test.describe("the Ghost Bands switch on VIEWER (fast task, 2026-11-02)", () => {
  test("11. Ghost Bands starts off, fades every band and mark dot but the Apex Center's by one opacity, and is disabled while the finished rail is hidden", async ({
    page,
  }) => {
    await openRails(page);
    const toolbar = page.locator("[data-viewer-toolbar]");
    const finishedRail = toolbar.getByRole("button", { name: /finished rail$/ });
    const ghost = toolbar.getByRole("button", { name: /the bands/ });
    await expect(ghost).toBeEnabled();
    await expect(ghost).toHaveAttribute("aria-pressed", "false");
    await expect(ghost).toHaveAccessibleName("Ghost the bands");

    // Per visible plot: the band group's state and opacity, and each mark dot's own opacity (null when
    // it carries none — the attribute is left off entirely at full strength, so an unghosted plot is
    // byte-for-byte the drawing it always was).
    const state = () =>
      page.evaluate(() => {
        const plots = Array.from(document.querySelectorAll("[data-rail-plot-row] [data-rail-section-plot]")).filter(
          (svg) => svg.getBoundingClientRect().width > 0,
        );
        return plots.map((svg) => {
          const group = svg.querySelector("[data-rail-bands]");
          return {
            bands: group?.getAttribute("data-rail-bands") ?? null,
            bandOpacity: group?.getAttribute("opacity") ?? null,
            dotOpacities: Array.from(svg.querySelectorAll("circle")).map((c) => c.getAttribute("opacity")),
          };
        });
      });
    await expect.poll(async () => (await state()).length).toBeGreaterThan(0);
    for (const plot of await state()) {
      expect(plot.bands).toBe("full");
      expect(plot.bandOpacity).toBeNull();
      expect(plot.dotOpacities.every((o) => o === null)).toBe(true);
    }

    await ghost.click();
    await expect(ghost).toHaveAttribute("aria-pressed", "true");
    await expect(ghost).toHaveAccessibleName("Show the bands fully");
    await expect.poll(async () => (await state()).every((p) => p.bands === "ghosted")).toBe(true);
    for (const plot of await state()) {
      // One ghost strength, strictly between invisible and full, shared by the band group and every
      // faded dot — and exactly one dot per plot left at full strength: the Apex Center's.
      const strength = Number(plot.bandOpacity);
      expect(strength).toBeGreaterThan(0);
      expect(strength).toBeLessThan(1);
      const full = plot.dotOpacities.filter((o) => o === null);
      expect(full).toHaveLength(1);
      for (const o of plot.dotOpacities) if (o !== null) expect(Number(o)).toBe(strength);
    }

    // Hiding the finished rail disables the switch and brings the bands back at full strength; showing
    // it again restores the ghost the shaper had set.
    await finishedRail.click();
    await expect(ghost).toBeDisabled();
    await expect.poll(async () => (await state()).every((p) => p.bands === "full")).toBe(true);
    await finishedRail.click();
    await expect(ghost).toBeEnabled();
    await expect.poll(async () => (await state()).every((p) => p.bands === "ghosted")).toBe(true);
  });
});

test.describe("the Domed Deck Band slider (quick 261102-gec plan 04, R18)", () => {
  test("12. the dome runs ±2\" in 1/16\" steps and never lands on Deck Mark 3 — it stops 1/16\" past it, even when Deck Mark 3 moves; the DATA tab follows it and Reset puts it back", async ({
    page,
  }, testInfo) => {
    await openRails(page);
    const center = await showRail(page, testInfo, "center");
    const body = await openAdvanced(center);
    const dome = nudgeLabel(center, "Domed Deck Band");
    const deckMark3 = nudgeLabel(center, "Deck Mark 3");
    const domeThumb = nudgeThumb(page, "center", "Domed Deck Band");
    const ONE_SIXTEENTH = 1;
    const TWO_INCHES = 32; // the founder's ±2" window, in sixteenths

    // The window: the range input's own min and max (test 7's reading).
    const slider = rowSlider(dome);
    const bound = async (name: "min" | "max") =>
      (await slider.getAttribute(name)) ?? (await slider.getAttribute(`aria-value${name}`));
    expect(Number(await bound("min"))).toBe(-2);
    expect(Number(await bound("max"))).toBe(2);

    const first = await dome.textContent();
    expect(first).toMatch(/\(0"\)$/);
    const dome0 = await markSixteenths(dome);
    const deckMark3Text = await deckMark3.textContent();
    const deckMark3At0 = await markSixteenths(deckMark3);
    expect(dome0).toBeGreaterThan(deckMark3At0 + ONE_SIXTEENTH);

    await domeThumb.press("ArrowRight");
    await expect(dome).toHaveText(/\(\+1\/16"\)$/);
    expect(await markSixteenths(dome)).toBe(dome0 + ONE_SIXTEENTH);

    await domeThumb.press("End");
    await expect(dome).toHaveText(/\(\+2"\)$/);
    expect(await markSixteenths(dome)).toBe(dome0 + TWO_INCHES);
    await expect(deckMark3).toHaveText(deckMark3Text ?? "");

    // At -2" the sheet's 2.4 x T would land inside Deck Mark 3: the dome is held one sixteenth past it.
    await domeThumb.press("Home");
    await expect(dome).toHaveText(/\(-2"\)$/);
    const held = await markSixteenths(dome);
    expect(held).toBe(deckMark3At0 + ONE_SIXTEENTH);
    expect(held).not.toBe(deckMark3At0);
    expect(held).toBeGreaterThan(dome0 - TWO_INCHES);

    // Deck Mark 3 moved out to its end: the dome, still at -2", stays one sixteenth past the new mark.
    await nudgeThumb(page, "center", "Deck Mark 3").press("End");
    await expect(deckMark3).toHaveText(/\(\+1\/2"\)$/);
    const deckMark3Moved = await markSixteenths(deckMark3);
    expect(deckMark3Moved).toBeGreaterThan(deckMark3At0);
    await expect(dome).toHaveText(/\(-2"\)$/);
    expect(await markSixteenths(dome)).toBe(deckMark3Moved + ONE_SIXTEENTH);

    // On a domed deck the DATA tab carries a Domed Deck Band row; its centre cell is the label's mark.
    await rowSlider(center.getByText(/^Deck Profile — /)).press("End");
    const labelMark = ((await dome.textContent()) ?? "").replace(/\u00a0/g, " ").match(/ — (.+?) \(/)?.[1];
    expect(labelMark).toBeTruthy();
    expect((await dataCell(page, "Domed Deck Band", "center")).replace(/\u00a0/g, " ")).toBe(labelMark);

    await showRail(page, testInfo, "center");
    await body.getByRole("button", { name: /Reset Advanced Settings/ }).click();
    await expect(dome).toHaveText(first ?? "");
    await expect(deckMark3).toHaveText(deckMark3Text ?? "");
  });
});

test.describe("the plot row keeps clear of the corner toolbar (fast task, 2026-11-02)", () => {
  test("13. a plot wide enough to reach the corner buttons drops its row below them, and no axis number is cut by the box's edge", async ({
    page,
  }, testInfo) => {
    test.skip(isPhone(testInfo), "the computer's plot row — a phone draws one plot with no zoom row at 1x");
    const row = page.locator('[data-rail-plot-row="desktop"]');
    // The first plot's zoom row against the panel's corner toolbar, and the first plot's x-axis numbers
    // (the only `text-anchor="middle"` text on a VIEWER plot) against the box's own left edge.
    const geometry = () =>
      page.evaluate(() => {
        const box = (el: Element) => el.getBoundingClientRect();
        const plotRow = document.querySelector('[data-rail-plot-row="desktop"]')!;
        const toolbar = document.querySelector("[data-viewer-toolbar]")!;
        const zoom = document.querySelector('[aria-label="Zoom"]')!;
        const svg = plotRow.querySelector("[data-rail-section-plot]")!;
        const numbers = Array.from(svg.querySelectorAll("text")).filter((t) => t.getAttribute("text-anchor") === "middle");
        return {
          drop: plotRow.getAttribute("data-rail-plot-drop"),
          zoomClearsToolbar: box(zoom).right <= box(toolbar).left || box(zoom).top >= box(toolbar).bottom,
          zoomBelowToolbar: box(zoom).top >= box(toolbar).bottom,
          numbersInside: numbers.every((t) => box(t).left >= box(svg).left - 0.5),
          numberCount: numbers.length,
        };
      });

    // A wide window, the default board: the row sits where it always has, clear of the buttons.
    await page.setViewportSize({ width: 1280, height: 800 });
    await openRails(page);
    await expect(row).toHaveAttribute("data-rail-plot-fit", "measured");
    let g = await geometry();
    expect(g.drop).toBeNull();
    expect(g.zoomClearsToolbar).toBe(true);
    expect(g.numbersInside).toBe(true);
    expect(g.numberCount).toBeGreaterThan(0);

    // The centre's dome at +2": the plots grow until the zoom row would reach the buttons, so the whole
    // row drops below them — and the whole inch now past the axis's end gets no number to be cut.
    const center = await showRail(page, testInfo, "center");
    const body = await openAdvanced(center);
    await nudgeThumb(page, "center", "Domed Deck Band").press("End");
    await expect(row).toHaveAttribute("data-rail-plot-drop", /^\d+$/);
    await expect.poll(async () => (await geometry()).zoomBelowToolbar).toBe(true);
    g = await geometry();
    expect(g.zoomClearsToolbar).toBe(true);
    expect(g.numbersInside).toBe(true);
    expect(g.numberCount).toBeGreaterThan(0);

    // The narrowest computer window, the board put back: the plots fill the column, so the row drops
    // for every board there (the one place the overlap had always been).
    await body.getByRole("button", { name: /Reset Advanced Settings/ }).click();
    await page.setViewportSize({ width: 820, height: 800 });
    await openRails(page);
    await expect(row).toHaveAttribute("data-rail-plot-drop", /^\d+$/);
    await expect.poll(async () => (await geometry()).zoomBelowToolbar).toBe(true);
    expect((await geometry()).zoomClearsToolbar).toBe(true);
  });
});

test.describe("Bottom Tuck 3's window (fast task 188, R19)", () => {
  test("14. Bottom Tuck 3 runs ±3/4\" — the founder's window — and its label reads the nudge at each end", async ({
    page,
  }, testInfo) => {
    await openRails(page);
    const nose = await showRail(page, testInfo, "nose");
    await openAdvanced(nose);
    const label = nudgeLabel(nose, "Bottom Tuck 3");
    const slider = rowSlider(label);
    const bound = async (name: "min" | "max") =>
      (await slider.getAttribute(name)) ?? (await slider.getAttribute(`aria-value${name}`));
    expect(Number(await bound("min"))).toBe(-0.75);
    expect(Number(await bound("max"))).toBe(0.75);
    const thumb = nudgeThumb(page, "nose", "Bottom Tuck 3");
    await thumb.press("End");
    await expect(label).toHaveText(/\(\+3\/4"\)$/);
    await thumb.press("Home");
    await expect(label).toHaveText(/\(-3\/4"\)$/);
  });
});

test.describe("Symmetrical, and the tail's rule with Hard Edge (fast task 190, R21)", () => {
  test("15. every rail's box reads Symmetrical; on the tail ticking it turns Hard Edge off, ticking Hard Edge turns it off, and Reset turns Hard Edge on and it off", async ({
    page,
  }, testInfo) => {
    await openRails(page);
    for (const key of ["nose", "center"] as const) {
      const rail = await showRail(page, testInfo, key);
      await expect(rail.getByRole("checkbox", { name: "Symmetrical" })).toBeVisible();
      await expect(rail.getByRole("checkbox", { name: "Sym", exact: true })).toHaveCount(0);
    }
    const tail = await showRail(page, testInfo, "tail");
    const symmetrical = tail.getByRole("checkbox", { name: "Symmetrical" });
    const hardEdge = tail.getByRole("checkbox", { name: "Hard Edge" });
    // A new board's tail: Hard Edge on, Symmetrical off.
    await expect(hardEdge).toBeChecked();
    await expect(symmetrical).not.toBeChecked();

    await symmetrical.click();
    await expect(symmetrical).toBeChecked();
    await expect(hardEdge).not.toBeChecked();

    await hardEdge.click();
    await expect(hardEdge).toBeChecked();
    await expect(symmetrical).not.toBeChecked();

    // Symmetrical on again, then Reset Advanced Settings: Hard Edge back on, Symmetrical off with it.
    await symmetrical.click();
    await expect(symmetrical).toBeChecked();
    await expect(hardEdge).not.toBeChecked();
    const body = await openAdvanced(tail);
    await body.getByRole("button", { name: /Reset Advanced Settings/ }).click();
    await expect(hardEdge).toBeChecked();
    await expect(symmetrical).not.toBeChecked();
  });
});

/** The drawn finished rail of the Center plot in view on VIEWER — the computer's plot row or the phone's,
 * whichever is showing — as its path's `d` (Playwright calls a straight SVG line hidden, so the path is
 * read rather than asked whether it is visible). */
async function centerFinishedRailD(page: Page): Promise<string> {
  const handle = await page.waitForFunction(() => {
    const paths = Array.from(
      document.querySelectorAll('[data-rail-plot-row] [data-rail-section-plot="center"] [data-finished-rail]'),
    ).filter((p) => (p.closest("svg")?.getBoundingClientRect().width ?? 0) > 0);
    return paths.length === 1 ? paths[0].getAttribute("d") : null;
  });
  return (await handle.jsonValue()) as string;
}

/** How many blends a finished-rail path draws: its `Q` commands. */
const blendCount = (d: string) => d.split(" Q ").length - 1;

test.describe("the Sharp Bottom Tuck box (quick 261102-gec plan 05, R22)", () => {
  test("16. the Center Rail's Sharp Bottom Tuck starts unticked; ticking it drops exactly one blend from the drawn finished rail and leaves the DATA tab alone; unticking and Reset restore the drawing exactly", async ({
    page,
  }, testInfo) => {
    await openRails(page);
    const center = await showRail(page, testInfo, "center");
    const body = await openAdvanced(center);
    const box = body.getByRole("checkbox", { name: "Sharp Bottom Tuck" });
    await expect(box).not.toBeChecked();

    // Every expected value is read off the page before the change.
    const tucks = ["Bottom Tuck 1", "Bottom Tuck 2", "Bottom Tuck 3"];
    const dataBefore: string[] = [];
    for (const row of tucks) dataBefore.push(await dataCell(page, row, "center"));
    await showRail(page, testInfo, "center");
    const first = await centerFinishedRailD(page);
    expect(blendCount(first)).toBeGreaterThan(0);

    await box.click();
    await expect(box).toBeChecked();
    await expect.poll(() => centerFinishedRailD(page)).not.toBe(first);
    const sharp = await centerFinishedRailD(page);
    expect(blendCount(sharp)).toBe(blendCount(first) - 1);
    // The marks never move: the DATA tab reads exactly as before.
    for (let i = 0; i < tucks.length; i++) expect(await dataCell(page, tucks[i], "center")).toBe(dataBefore[i]);
    await showRail(page, testInfo, "center");

    if (!isPhone(testInfo)) {
      // View Full Sized draws through the same plot, so it shows the same blends. Scoped to the dialog: the
      // plain locator matches twice while it is open.
      await page.locator("[data-viewer-toolbar]").getByRole("button", { name: "View Full Sized" }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      const centerTab = dialog.getByRole("tab", { name: "Center" });
      if ((await centerTab.getAttribute("aria-selected")) !== "true") await centerTab.click();
      const full = dialog.locator('[data-rail-section-plot="center"] [data-finished-rail]');
      await expect.poll(async () => blendCount((await full.getAttribute("d")) ?? "")).toBe(blendCount(sharp));
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
    }

    // Unticking restores the first drawing exactly.
    await box.click();
    await expect(box).not.toBeChecked();
    await expect.poll(() => centerFinishedRailD(page)).toBe(first);

    // Ticked again, Reset Advanced Settings unticks it and restores the first drawing.
    await box.click();
    await expect(box).toBeChecked();
    await expect.poll(() => centerFinishedRailD(page)).not.toBe(first);
    await body.getByRole("button", { name: /Reset Advanced Settings/ }).click();
    await expect(box).not.toBeChecked();
    await expect.poll(() => centerFinishedRailD(page)).toBe(first);
  });
});
