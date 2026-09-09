import { expect, test, type Page } from "@playwright/test";

/**
 * G-09-4's own proof (PHON-05): a shaper working from the keyboard can see which control they are
 * on. Before this plan, tabbing to a slider painted nothing at all — the ring was written on the
 * thumb, but Base UI gives real keyboard focus to a hidden `<input type="range">` nested inside
 * it — and the hand-rolled tail-shape tiles gave back only the browser's own half-strength
 * fallback outline. This file Tabs onto a real slider and a real tail-shape tile and reads back a
 * ring painted in the palette's own accent ink, so a regression here fails a build instead of a
 * shaper.
 *
 * `desktop` project only, deliberately not `iphone`/`android`: the debug session measured that
 * Playwright's WebKit mirrors Safari's default keyboard mode, where plain Tab reaches only text
 * fields and controls with an explicit tabindex — it never lands on a slider or a tail-shape tile
 * at all, so a WebKit run would assert nothing and every Tab-until-found loop would exhaust its
 * ceiling.
 */

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";

/** Matches every sibling spec's own approach: dismiss the sign-in banner via sessionStorage, set
 * before navigation, so its own height never confuses which element Tab reaches next. */
async function dismissSignInBanner(page: Page) {
  await page.addInitScript((key) => {
    window.sessionStorage.setItem(key, "true");
  }, BANNER_DISMISSAL_KEY);
}

/** Reads the ring colour off the page itself, rather than hard-coding a hex per theme: takes
 * `--surf-accent-ink` off the document element and turns its `#rrggbb` into the `rgb(r, g, b)`
 * form a computed `box-shadow` serialises to. Keying on the live token is what keeps this test
 * true in every theme (and if a theme's accent ink ever changes) instead of becoming a second,
 * drifting copy of a palette value. */
async function ringColorRgb(page: Page): Promise<string> {
  return page.evaluate(() => {
    const hex = getComputedStyle(document.documentElement)
      .getPropertyValue("--surf-accent-ink")
      .trim();
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${r}, ${g}, ${b})`;
  });
}

/** Presses Tab until `document.activeElement` sits inside an element matching `selector` with the
 * given (case-insensitive, trimmed) text content, with a generous ceiling so a genuine regression
 * reads as "never reached [what]" rather than a bare Playwright timeout. Matching against a CSS
 * selector plus text — evaluated fresh in the page on every press — is what lets one helper serve
 * both the slider thumb (matched by `data-slot`, no text) and the tail-shape buttons (matched by
 * their accessible text) without a second, near-duplicate loop. */
async function tabUntil(
  page: Page,
  selector: string,
  text: string | null,
  what: string,
  ceiling = 150,
) {
  for (let i = 0; i < ceiling; i++) {
    const found = await page.evaluate(
      ({ selector, text }) => {
        const active = document.activeElement;
        const el = active?.closest(selector) ?? null;
        if (!el) return false;
        if (text === null) return true;
        return el.textContent?.trim().toLowerCase() === text.toLowerCase();
      },
      { selector, text },
    );
    if (found) return;
    await page.keyboard.press("Tab");
  }
  throw new Error(`tabUntil: never reached ${what} within ${ceiling} Tab presses`);
}

test.describe("keyboard focus is visible on sliders and hand-rolled buttons", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop-only: WebKit's default keyboard mode never Tabs onto these controls at all");
    await dismissSignInBanner(page);
  });

  test("TEMPLATE: a slider thumb and the tail-shape tile both paint the accent-ink ring under Tab", async ({
    page,
  }) => {
    await page.goto("/design/outline");
    const ringColor = await ringColorRgb(page);

    // At-rest guard: before the keyboard ever touches the page, no slider thumb carries the ring.
    // This is what proves the change is focus-only.
    const firstThumb = page.locator('[data-slot="slider-thumb"]').first();
    await expect(firstThumb).toBeVisible();
    const restBoxShadow = await firstThumb.evaluate((el) => getComputedStyle(el).boxShadow);
    expect(restBoxShadow).not.toContain(ringColor);

    // Tab until focus lands inside a slider thumb, then read the ring off the thumb itself
    // (the element `:has(:focus-visible)` actually targets), not off document.activeElement,
    // which is the hidden range input inside it. Chromium defers the style recalculation that
    // follows a synthetic keyboard focus change by a beat — the same lag the debug session hit
    // reading a hover-triggered ring — so this polls rather than reading the computed style once.
    await tabUntil(page, '[data-slot="slider-thumb"]', null, "a slider thumb");
    await expect
      .poll(() =>
        page.evaluate(() => {
          const thumb = document.activeElement?.closest('[data-slot="slider-thumb"]');
          return thumb ? getComputedStyle(thumb).boxShadow : "none";
        }),
      )
      .toContain(ringColor);

    // Keep Tabbing to the tail-shape tile whose accessible name is "pin" (lowercase in the
    // accessibility tree; the visible capitalisation is a CSS transform, per touch-sizing.spec.ts).
    await tabUntil(page, "button", "pin", 'the "pin" tail-shape tile');
    await expect
      .poll(() =>
        page.evaluate(() => {
          const el = document.activeElement;
          return el ? getComputedStyle(el).boxShadow : "none";
        }),
      )
      .toContain(ringColor);
  });

  test("FINS: the Pin tail-shape button paints the same ring, proving the shared class reached FINS too", async ({
    page,
  }) => {
    await page.goto("/design/fins");
    const ringColor = await ringColorRgb(page);

    await tabUntil(page, "button", "Pin", 'the "Pin" button');
    await expect
      .poll(() =>
        page.evaluate(() => {
          const el = document.activeElement;
          return el ? getComputedStyle(el).boxShadow : "none";
        }),
      )
      .toContain(ringColor);
  });
});
