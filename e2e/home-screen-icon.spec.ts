import { expect, test, type Page } from "@playwright/test";

/**
 * The circle logo on the Home Screen (quick 261010-km7, D-03, D-10, D-15): what the page's head
 * says to an iPhone and to Android, and what the manifest and the three icon files serve. The
 * point to prove is as much what is NOT there: no tag that opens the site as a standalone app
 * (that mode breaks Print on an iPhone), and the browser tab still pointing at the board drawing.
 */

async function head(page: Page, route: string) {
  await page.goto(route);
  const links = await page.locator("head link").evaluateAll((els) =>
    els.map((el) => ({
      rel: el.getAttribute("rel"),
      href: el.getAttribute("href"),
      sizes: el.getAttribute("sizes"),
      type: el.getAttribute("type"),
    })),
  );
  const metas = await page.locator("head meta").evaluateAll((els) =>
    els.map((el) => ({ name: el.getAttribute("name"), content: el.getAttribute("content") })),
  );
  return { links, metas };
}

test.describe("the head of the page (desktop project)", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "head tags do not vary by device");
  });

  for (const route of ["/", "/design/outline"]) {
    test(`${route}: manifest link, apple-touch-icon 180, the iOS label, no standalone tag, the tab keeps the board`, async ({
      page,
    }) => {
      const { links, metas } = await head(page, route);

      expect(links.some((l) => l.rel === "manifest" && l.href?.includes("manifest"))).toBe(true);

      const touch = links.find((l) => l.rel === "apple-touch-icon");
      expect(touch, "an apple-touch-icon link").toBeDefined();
      expect(touch!.sizes).toBe("180x180");

      const title = metas.find((m) => m.name === "apple-mobile-web-app-title");
      expect(title?.content).toBe("Shaper Assistant");

      expect(metas.find((m) => m.name === "mobile-web-app-capable")).toBeUndefined();
      expect(metas.find((m) => m.name === "apple-mobile-web-app-capable")).toBeUndefined();

      // The browser tab keeps today's board drawing.
      const tabIcons = links.filter((l) => l.rel === "icon");
      expect(tabIcons.some((l) => l.type === "image/svg+xml" && l.href?.includes("/icon.svg"))).toBe(true);
      expect(tabIcons.some((l) => l.href?.includes("home-screen-icon"))).toBe(false);
    });
  }

  test("the manifest serves display browser, the name, and the two icons, each of which is a PNG", async ({ request }) => {
    const response = await request.get("/manifest.webmanifest");
    expect(response.status()).toBe(200);
    const manifest = await response.json();
    expect(manifest.display).toBe("browser");
    expect(manifest.name).toBe("Shaper Assistant");
    expect(manifest.short_name).toBe("Shaper Assistant");
    expect(manifest.theme_color).toBeUndefined();
    expect(manifest.icons).toHaveLength(2);
    for (const icon of manifest.icons) {
      const png = await request.get(icon.src);
      expect(png.status(), icon.src).toBe(200);
      expect(png.headers()["content-type"]).toContain("image/png");
    }
  });

  test("the apple-touch-icon address serves a PNG", async ({ page, request }) => {
    const { links } = await head(page, "/");
    const touch = links.find((l) => l.rel === "apple-touch-icon");
    const png = await request.get(touch!.href!);
    expect(png.status()).toBe(200);
    expect(png.headers()["content-type"]).toContain("image/png");
  });
});
