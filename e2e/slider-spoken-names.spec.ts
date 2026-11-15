import { expect, test, type Page } from "@playwright/test";
import { pickFirstFittingBlank } from "./helpers/blank-picker";
import { dismissStrips, setMetricUnits } from "./helpers/guide";
import { openFoilAdvanced } from "./helpers/rocker-sidebar";
import { SCREENS } from "./helpers/screens";

/**
 * Every slider speaks its name and its printed value (quick 261115-dv3; the to-do of 2026-10-02, Phase 14 review
 * WR-01). On every design screen, every slider's accessible name is the name its label line prints, and its spoken
 * value is the value that line prints — in Imperial and in Metric — so a screen reader hears `Center Thickness,
 * 6.4 cm`, never `slider, 64`. Nothing is typed into this spec: it reads each row's own label line and holds the
 * slider to it.
 */

interface Spoken {
  screen: string;
  name: string | null;
  valueText: string | null;
  valueNow: string | null;
  /** The row's label line as printed, where the slider sits in a shared row; null for a hand-rolled slider. */
  rowLabel: string | null;
}

/** Every slider on the page, with what it says and what its row prints. */
async function spokenSliders(page: Page, screen: string): Promise<Spoken[]> {
  return page.evaluate((screen) => {
    const inputs = [...document.querySelectorAll<HTMLInputElement>('[data-slot="slider-thumb"] input[type="range"], [data-slot="slider-thumb"][role="slider"], [role="slider"]')];
    const seen = new Set<Element>();
    const out: Spoken[] = [];
    for (const el of inputs) {
      const thumb = el.closest('[data-slot="slider-thumb"]') ?? el;
      if (seen.has(thumb)) continue;
      seen.add(thumb);
      const root = el.closest('[data-slot="slider"]');
      // A shared row: the label line is the plain element just before the slider root. Board Length's row holds its
      // feet-and-inches pickers instead, so it has no label line to hold the slider to.
      const labelLine = root?.previousElementSibling;
      const plain = labelLine && labelLine.tagName === "DIV" && labelLine.querySelector("button, select, input") === null;
      const rowLabel = plain ? (labelLine.textContent ?? "").trim() : null;
      out.push({
        screen,
        name: el.getAttribute("aria-label"),
        valueText: el.getAttribute("aria-valuetext"),
        valueNow: el.getAttribute("aria-valuenow"),
        rowLabel,
      });
    }
    return out;
  }, screen);
}

/** The rows whose label line prints no value at all, so the slider's own number is what there is to say. */
const NAME_ONLY = new Set(["Board Type"]);

/**
 * A slider says at least what its row prints. Some rows say more on purpose — the rail nudges are named per rail
 * (`Nose Rail Apex Thickness nudge` under a row that prints `Apex Thickness`), FINS' twins by their pair, the tips as
 * thicknesses — so the row's name must be inside the spoken name (or start it), and the row's printed value inside the
 * spoken value, case aside. A row that prints no value (3D's raise rows keep theirs in a hint) holds the value to nothing.
 */
function problems(rows: Spoken[]): string[] {
  const out: string[] = [];
  const SEPARATOR = " — ";
  for (const row of rows) {
    const where = `${row.screen}: ${row.rowLabel ?? row.name ?? "?"}`;
    if (!row.name) out.push(`${where} — no name`);
    if (!row.valueText && !NAME_ONLY.has(row.name ?? "")) out.push(`${where} — no spoken value (aria-valuenow ${row.valueNow})`);
    if (!row.rowLabel || !row.name) continue;
    const at = row.rowLabel.indexOf(SEPARATOR);
    const rowName = (at > 0 ? row.rowLabel.slice(0, at) : row.rowLabel).trim().toLowerCase();
    const rowValue = at > 0 ? row.rowLabel.slice(at + SEPARATOR.length).trim().toLowerCase() : null;
    const name = row.name.toLowerCase();
    if (rowName !== "" && !name.includes(rowName) && !rowName.startsWith(name)) {
      out.push(`${where} — the name "${row.name}" does not say what the row prints`);
    }
    // The rail nudges print the mark and the nudge (`5/8" (0")`) and speak the mark; a spoken value and a printed one
    // must at least contain each other one way or the other.
    const spokenValue = row.valueText?.toLowerCase() ?? null;
    if (rowValue && spokenValue && !spokenValue.includes(rowValue) && !rowValue.includes(spokenValue)) {
      out.push(`${where} — the spoken value "${row.valueText}" does not say what the row prints`);
    }
  }
  return out;
}

const DESIGN_SCREENS = SCREENS.filter((s) => s.label !== "SUMMARY");

async function sweep(page: Page, system: "imperial" | "metric" = "imperial"): Promise<{ rows: Spoken[]; problems: string[] }> {
  const rows: Spoken[] = [];
  for (const { href, label } of DESIGN_SCREENS) {
    await page.goto(href);
    await expect(page.getByRole("complementary").or(page.locator("[data-rocker-inputs]")).first()).toBeAttached({ timeout: 30_000 });
    // The chooser's saved pick is read once React owns the page; a Metric walk waits until a page reads in centimetres.
    // (`\s`, not a space: the app keeps a figure and its unit together with a no-break space.)
    // The 3D screen prints no length at rest (its raise rows read `on the rack`), so it is not held to one.
    if (system === "metric" && label !== "3D") await expect(page.locator("body")).toContainText(/\d\scm/, { timeout: 30_000 });
    if (label === "ROCKER") {
      // The blank rows (Placement, Deck Skin, the Thinning Starts, the fine-tunes) only exist with a blank picked.
      await pickFirstFittingBlank(page);
      await openFoilAdvanced(page);
    }
    // VOLUME and FINS import their inputs from the other screens until the shaper unticks that; their own sliders
    // only exist then.
    if (label === "VOLUME" || label === "FINS") {
      const imported = page.getByRole("checkbox", { name: "Import Designed Board" });
      await expect(imported).toBeVisible({ timeout: 30_000 });
      // Retried until the tap lands after hydration.
      await expect(async () => {
        if (await imported.isChecked()) await imported.click();
        await expect(imported).not.toBeChecked({ timeout: 1_000 });
      }).toPass({ timeout: 20_000 });
    }
    // Every closed Advanced fold on the screen (`Advanced ▸`), so its rows are counted too.
    for (const fold of await page.getByRole("button", { name: /^Advanced/ }).all()) {
      const name = (await fold.textContent()) ?? "";
      if (name.includes("▸") || (await fold.getAttribute("aria-expanded")) === "false") await fold.click();
    }
    await expect(page.locator('[data-slot="slider"]').first()).toBeAttached({ timeout: 30_000 });
    rows.push(...(await spokenSliders(page, label)));
  }
  return { rows, problems: problems(rows) };
}

test.describe("every slider speaks its name and its printed value", () => {
  // Seven screens in one walk, each compiled on first visit by the test server: a sweep, not a check.
  test.setTimeout(300_000);
  test.beforeEach(async ({ page }) => {
    await dismissStrips(page);
  });

  test("in Imperial, on every design screen", async ({ page }) => {
    const { rows, problems } = await sweep(page);
    expect(rows.length).toBeGreaterThan(40);
    expect(problems).toEqual([]);
    // A few by name, so the sweep is known to have found the real rows.
    const names = new Set(rows.map((r) => r.name));
    for (const name of ["Board Length", "Center Thickness", "Nose Angle", "Family", "Ratio", "Placement", "Deck Skin", "Fin Base Length"]) {
      expect(names, `no slider named ${name}`).toContain(name);
    }
  });

  test("in Metric, every spoken value reads in the shaper's system", async ({ page }) => {
    await setMetricUnits(page);
    const { rows, problems } = await sweep(page, "metric");
    expect(problems).toEqual([]);
    // A thickness is a mark (whole millimetres); a length is a dim (centimetres to one decimal) — CLAUDE.md's rule.
    const centre = rows.find((r) => r.screen === "ROCKER" && r.name === "Center Thickness");
    expect(centre?.valueText).toMatch(/^\d+ mm$/);
    const length = rows.find((r) => r.screen === "TEMPLATE" && r.name === "Board Length");
    expect(length?.valueText).toMatch(/^\d+\.\d cm$/);
  });
});
