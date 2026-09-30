import { expect, test } from "@playwright/test";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE } from "../lib/site/metadata";
import { PREVIEW_IMAGE_ALT, PREVIEW_IMAGE_ROUTE, previewImageProblems } from "../lib/link-preview/preview-image";

/**
 * Quick 260930-fjm (Phase 13 item 12), Task 1: browser proof that a texted or posted link shows
 * the app's own card — every page's head carries the Open Graph and Twitter/X tags (P-9, P-10),
 * a link previewer that runs no scripts still sees them (measured against Next's own
 * `HTML_LIMITED_BOT_UA_RE`), and the picture itself loads at 1200 by 630.
 *
 * The dev server deliberately points the picture at itself (P-11) — this suite only checks the
 * picture's path, never its host; `e2e/prod/error-pages.spec.ts` (Task 3) checks the absolute
 * live address on a production build.
 */

test.describe("the link-preview tags and picture", () => {
  test("the home screen carries the link-preview tags", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/");

    // The plain `<meta name="description">` is deliberately page-specific (every screen sets its
    // own, unchanged by this task, P-10's "browser-tab titles still differ per page" applies to
    // this tag too) — a link previewer reads og:description, not this one, so that's what's
    // checked against SITE_DESCRIPTION below. This tag just needs to exist.
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /.+/);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", SITE_TITLE);
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute("content", SITE_DESCRIPTION);
    await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute("content", SITE_NAME);
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute("content", "website");
    await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute("content", "1200");
    await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute("content", "630");
    await expect(page.locator('meta[property="og:image:type"]')).toHaveAttribute("content", "image/png");
    await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute("content", PREVIEW_IMAGE_ALT);
    await expect(page.locator('meta[name="twitter:image:alt"]')).toHaveAttribute("content", PREVIEW_IMAGE_ALT);

    const ogUrl = await page.locator('meta[property="og:url"]').getAttribute("content");
    expect(ogUrl).toMatch(/^https:\/\/www\.shaperassistant\.com\/?$/);

    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
    await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute("content", SITE_TITLE);
    await expect(page.locator('meta[name="twitter:description"]')).toHaveAttribute("content", SITE_DESCRIPTION);

    const ogImage = await page.locator('meta[property="og:image"]').getAttribute("content");
    expect(ogImage).toBeTruthy();
    expect(new URL(ogImage!, "http://placeholder").pathname).toBe(PREVIEW_IMAGE_ROUTE);

    const twitterImage = await page.locator('meta[name="twitter:image"]').getAttribute("content");
    expect(twitterImage).toBeTruthy();
    expect(new URL(twitterImage!, "http://placeholder").pathname).toBe(PREVIEW_IMAGE_ROUTE);
  });

  test("a link previewer reads the tags in the page head without running scripts", async ({ request }) => {
    test.setTimeout(90_000);
    const response = await request.get("/", { headers: { "user-agent": "WhatsApp/2.23.20.0" } });
    const text = await response.text();
    const headText = text.slice(0, text.indexOf("</head>"));

    expect(headText).toContain('property="og:image"');
    expect(headText).toContain("/opengraph-image.png");
    expect(headText).toContain("summary_large_image");
    expect(headText).toContain(SITE_DESCRIPTION);
  });

  test("a design screen shares the same picture", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/design/rails");
    const ogImage = await page.locator('meta[property="og:image"]').getAttribute("content");
    expect(ogImage).toBeTruthy();
    expect(new URL(ogImage!, "http://placeholder").pathname).toBe(PREVIEW_IMAGE_ROUTE);
  });

  test("the preview picture loads at 1200 by 630", async ({ request }) => {
    test.setTimeout(90_000);
    const response = await request.get(PREVIEW_IMAGE_ROUTE);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toMatch(/^image\/png/);
    const body = await response.body();
    expect(previewImageProblems(new Uint8Array(body))).toEqual([]);
  });
});
