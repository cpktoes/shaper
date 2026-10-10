import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import manifest from "../../app/manifest";
import { SITE_NAME } from "./metadata";

/**
 * The circle logo as the Home Screen icon (quick 261010-km7, D-03, D-10, D-15): the manifest Android
 * reads, the three icon files and their sizes, and the promise that the browser tab keeps the
 * board drawing. Pure file and object reading, no browser.
 */

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));

/** A PNG's width and height, read from the header's bytes 16 to 23. */
function pngSize(path: string): { width: number; height: number } {
  const bytes = readFileSync(path);
  expect(bytes.subarray(1, 4).toString("latin1")).toBe("PNG");
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

describe("app/manifest.ts", () => {
  const result = manifest();

  it("names the app Shaper Assistant, short and long", () => {
    expect(result.name).toBe(SITE_NAME);
    expect(result.short_name).toBe(SITE_NAME);
  });

  it("opens at the home page in the ordinary browser, never as a standalone app", () => {
    expect(result.start_url).toBe("/");
    expect(result.display).toBe("browser");
  });

  it("asks for no theme colour (that would recolour the browser's bar)", () => {
    expect(result).not.toHaveProperty("theme_color");
  });

  it("lists exactly the 192 and 512 circle icons", () => {
    expect(result.icons).toEqual([
      { src: "/home-screen-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/home-screen-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ]);
  });
});

describe("the icon files", () => {
  it("are square PNGs of 192, 512 and 180", () => {
    expect(pngSize(join(REPO_ROOT, "public", "home-screen-icon-192.png"))).toEqual({ width: 192, height: 192 });
    expect(pngSize(join(REPO_ROOT, "public", "home-screen-icon-512.png"))).toEqual({ width: 512, height: 512 });
    expect(pngSize(join(REPO_ROOT, "app", "apple-icon.png"))).toEqual({ width: 180, height: 180 });
  });
});

describe("app/ and the browser tab", () => {
  it("holds no icon picture besides favicon.ico and icon.svg, so the tab keeps the board", () => {
    const icons = readdirSync(join(REPO_ROOT, "app")).filter((name) => /^icon[^/]*\.(png|jpe?g|ico|svg)$/i.test(name) || /^favicon/i.test(name));
    expect(icons.sort()).toEqual(["favicon.ico", "icon.svg"]);
  });
});
