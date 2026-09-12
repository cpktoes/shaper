import { expect, test, type Page } from "@playwright/test";

/**
 * 260909-hny's own proof: the founder's own fallback for "Can we 'hide toolbar' in the phone
 * browser by default... Maybe a popup reminder on first entry if we can't force a hide from our
 * side" — a one-time note on an iPhone telling a shaper how to hide Safari's own toolbar.
 *
 * The honest limitation, recorded once here rather than re-litigated by a future reader:
 * Playwright's WebKit is desktop WebKit with a phone profile bolted on, and it does NOT implement
 * `-webkit-touch-callout`. Probed directly at planning time with a real `webkit.launch()` and
 * `devices['iPhone 14']`: `CSS.supports('(-webkit-touch-callout: none)')` returned **false** (and
 * on `devices['Pixel 7']` with Chromium too). So the tip resolves to `display: none` in EVERY
 * project here, `iphone` included, and no test below may claim to have SEEN it painted on an
 * emulated iPhone. The source-contract test from Task 1
 * (`components/design/toolbar-tip.test.ts`) is what actually guards the two CSS gates, since only
 * a real iPhone can prove them visually.
 *
 * D-10 (10-SWEEP-2.md, 2026-09-11): the tip's outer gate is now the `coarse` pointer variant, not
 * the phone-layout switch — so it is attached on every touch project at every viewport, upright or
 * sideways. The reason no test here can see it painted is unchanged and is still the emulator's
 * missing feature test, never the gate.
 */

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";
const TIP_DISMISSAL_KEY = "shaper-toolbar-tip-dismissed";

/** Dismisses only the sign-in banner, leaving the tip UNdismissed — this is the one file where
 * the tip must be present so it can be exercised. */
async function dismissSignInBannerOnly(page: Page) {
  await page.addInitScript((key) => {
    window.sessionStorage.setItem(key, "true");
  }, BANNER_DISMISSAL_KEY);
}

test.describe("the toolbar tip's DOM contract", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "phone-only DOM contract assertions");
    await dismissSignInBannerOnly(page);
  });

  test("the tip is attached with its wording and its print-hide attribute", async ({ page }) => {
    await page.goto("/design/outline");

    // Never toBeVisible() here — see the header comment. The element is display:none in every
    // Playwright project, so only its attachment and content can be asserted.
    const tip = page.locator("[data-toolbar-tip]");
    await expect(tip).toBeAttached();

    const text = (await tip.textContent()) ?? "";
    expect(text).toContain("the page menu in Safari's address bar");
    expect(text).toContain("Hide Toolbar");
    // Trap 1: neither the pre-iOS-26 glyph nor the iOS 26 ellipsis glyph may ever be named.
    expect(text).not.toContain("aA");
    expect(text).not.toContain("…");

    // React renders a bare boolean JSX attribute (`data-print-hide`) as the string "true", not
    // an empty string — matching what `SignInBanner`'s own `data-print-hide` renders as.
    await expect(tip).toHaveAttribute("data-print-hide", "true");
  });

  // D-10: the outer gate is now the coarse pointer variant, not the phone-layout switch, so the
  // tip must stay attached at BOTH orientations — no emulator here can paint it (see the header),
  // but this is the standing proof that the sideways reachability this plan delivers actually
  // exists in the DOM, at the real width real hardware reported (844x390 on an iPhone) rather than
  // Playwright's own stale 750x340 iPhone-landscape descriptor.
  test("the tip stays attached both upright and sideways at a real iPhone width (844x390)", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "iphone",
      "844x390 is the real iPhone sideways width this plan restores; this proves the pointer gate holds at that hardware size",
    );
    await page.goto("/design/outline");

    await expect(page.locator("[data-toolbar-tip]")).toBeAttached();

    await page.setViewportSize({ width: 844, height: 390 });
    await expect(page.locator("[data-toolbar-tip]")).toBeAttached();
  });
});

test.describe("the toolbar tip's permanent dismissal", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "phone-only dismissal assertions");
    await dismissSignInBannerOnly(page);
  });

  test("tapping Got it hides the tip immediately, permanently, and on every design screen", async ({
    page,
  }) => {
    await page.goto("/design/outline");

    const tip = page.locator("[data-toolbar-tip]");
    await expect(tip).toBeAttached();

    // The Got it button has no bounding box while the CSS gate holds the tip at `display: none`
    // in this emulator, so a normal .click() (which requires actionability) cannot reach it —
    // and `getByRole` cannot find it either, since a `display: none` element is excluded from
    // the accessibility tree entirely. A plain CSS locator still resolves it in the DOM, and a
    // dispatched click still reaches React's root-level event delegation, so this proves the
    // dismissal WIRING even though it cannot prove the button was ever visually tappable here —
    // that half is what the source-contract test and a real iPhone are for.
    await tip.locator("button", { hasText: "Got it" }).dispatchEvent("click");

    await expect(tip).not.toBeAttached();

    const stored = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      TIP_DISMISSAL_KEY,
    );
    expect(stored).toBe("true");

    await page.reload();
    await expect(page.locator("[data-toolbar-tip]")).not.toBeAttached();

    // Once per phone, not once per screen. A client-side nav via the bottom tab bar (the same
    // path a shaper actually uses to move between design screens on a phone), not a second hard
    // `page.goto` — a WebKit-only dev-server quirk, reproducible on this exact describe, otherwise
    // races a hard navigation against a background Fast Refresh full reload the dev server
    // occasionally pushes right after the outline route's first paint (same root cause and fix as
    // e2e/phone-layout.spec.ts's own tablet describe, 10-05). Same assertion either way.
    await page.getByRole("navigation", { name: "Screens" }).getByRole("link", { name: "RAILS" }).click();
    await expect(page.locator("[data-toolbar-tip]")).not.toBeAttached();
  });
});

test.describe("the toolbar tip's conditional visibility", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "phone-only visibility assertions");
    await dismissSignInBannerOnly(page);
  });

  test("switches itself on when the emulator catches up to real iOS Safari", async ({
    page,
  }, testInfo) => {
    await page.goto("/design/outline");

    const supportsIOSGuard = await page.evaluate(() =>
      CSS.supports("(-webkit-touch-callout: none)"),
    );

    // Reports the gap rather than hiding it — see the header comment's probe. This is the
    // honest current state on every Playwright project, `iphone` included.
    test.skip(
      !supportsIOSGuard,
      `${testInfo.project.name}'s WebKit/Chromium does not implement -webkit-touch-callout, so the tip cannot paint here`,
    );

    const tip = page.locator("[data-toolbar-tip]");
    await expect(tip).toBeVisible();

    const tipBox = await tip.boundingBox();
    const viewportSize = page.viewportSize();
    if (!tipBox || !viewportSize) throw new Error("missing bounding box or viewport size");
    expect(tipBox.width).toBeGreaterThanOrEqual(viewportSize.width - 1);

    const gotIt = tip.getByRole("button", { name: "Got it" });
    const gotItBox = await gotIt.boundingBox();
    if (!gotItBox) throw new Error("Got it button is missing a bounding box");
    expect(gotItBox.height).toBeGreaterThanOrEqual(44);
  });
});

// D-10 stronger evidence: the gate used to be the layout switch, so a desktop mouse never seeing
// the tip was in part a width fact (1280px is a desktop width). Now the gate is the pointer alone,
// so this is a genuine touch-vs-mouse proof rather than a width coincidence — a desktop CAN be
// exactly 819px wide (still the phone layout) and still never see this tip, because it has no
// coarse pointer to satisfy the gate.
test.describe("the toolbar tip never appears on a computer", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop-only guard");
    await dismissSignInBannerOnly(page);
  });

  test("the tip is attached but hidden at 1280px, with the tip undismissed", async ({ page }) => {
    await page.goto("/design/outline");

    const tip = page.locator("[data-toolbar-tip]");
    await expect(tip).toBeAttached();
    await expect(tip).toBeHidden();

    const display = await tip.evaluate((el) => getComputedStyle(el).display);
    expect(display).toBe("none");
  });

  // IN-01 (10-REVIEW-3.md): the header comment above names 819px specifically ("a desktop CAN be
  // exactly 819px wide (still the phone layout) and still never see this tip"), but until now
  // nothing in this file ran at that width — the case above only ever measured 1280px. Cheap to
  // add and makes the comment's own claim true rather than merely correct-in-theory: 819px is
  // still under the 820px layout switch (so `max-shell:` reads phone here), yet the desktop
  // project's fine pointer still fails the tip's `coarse:` gate, so it must stay hidden regardless
  // of which layout the width selects.
  test("the tip is attached but hidden at 819px too — still under the width switch, still a fine pointer", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 819, height: 900 });
    await page.goto("/design/outline");

    const tip = page.locator("[data-toolbar-tip]");
    await expect(tip).toBeAttached();
    await expect(tip).toBeHidden();

    const display = await tip.evaluate((el) => getComputedStyle(el).display);
    expect(display).toBe("none");
  });
});
