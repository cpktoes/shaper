import { describe, expect, it } from "vitest";
import { SITE_DESCRIPTION, SITE_METADATA, SITE_NAME, SITE_TITLE, SITE_URL } from "./metadata";

/**
 * TDD RED for quick 260930-fjm, Task 1: the root layout's metadata block, pinned so every shared
 * link shows the app's own card (P-10) and the founder's approved description (F-3) never drifts.
 */

describe("SITE_URL / SITE_NAME / SITE_TITLE", () => {
  it("SITE_URL is the live address", () => {
    expect(SITE_URL).toBe("https://www.shaperassistant.com");
  });

  it("SITE_NAME is the app's name", () => {
    expect(SITE_NAME).toBe("Shaper Assistant");
  });

  it("SITE_TITLE is the tab title", () => {
    expect(SITE_TITLE).toBe("Shaper Assistant — Surfboard Shaping and Design");
  });
});

describe("SITE_DESCRIPTION", () => {
  it("is the founder's approved line (F-3)", () => {
    expect(SITE_DESCRIPTION).toBe(
      "Design your surfboard — outline, rocker, foil and fins — with rail bands, fin placement and volume calculated from real shaping formulas.",
    );
  });

  it("is at most 160 characters", () => {
    expect(SITE_DESCRIPTION.length).toBeLessThanOrEqual(160);
  });

  it("has no double spaces and no leading or trailing whitespace", () => {
    expect(SITE_DESCRIPTION).not.toMatch(/  /);
    expect(SITE_DESCRIPTION).toBe(SITE_DESCRIPTION.trim());
  });
});

describe("SITE_METADATA", () => {
  it("metadataBase's href is exactly https://www.shaperassistant.com/", () => {
    expect(SITE_METADATA.metadataBase).toBeInstanceOf(URL);
    expect((SITE_METADATA.metadataBase as URL).href).toBe("https://www.shaperassistant.com/");
  });

  it("title equals SITE_TITLE and description equals SITE_DESCRIPTION", () => {
    expect(SITE_METADATA.title).toBe(SITE_TITLE);
    expect(SITE_METADATA.description).toBe(SITE_DESCRIPTION);
  });

  it("openGraph matches the approved shape and carries no images key", () => {
    expect(SITE_METADATA.openGraph).toMatchObject({
      type: "website",
      siteName: "Shaper Assistant",
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      url: "/",
      locale: "en_US",
    });
    expect(SITE_METADATA.openGraph).not.toHaveProperty("images");
  });

  it("twitter matches the approved shape and carries no images key", () => {
    expect(SITE_METADATA.twitter).toMatchObject({
      card: "summary_large_image",
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
    });
    expect(SITE_METADATA.twitter).not.toHaveProperty("images");
  });

  it("labels the Home Screen icon through apple-mobile-web-app-title, and never asks to open as a standalone app", () => {
    expect(SITE_METADATA.other).toMatchObject({ "apple-mobile-web-app-title": SITE_NAME });
    // Next's appleWebApp option defaults to "capable" and would write mobile-web-app-capable
    // "yes", opening the icon as a standalone app, which breaks Print on an iPhone.
    expect(SITE_METADATA).not.toHaveProperty("appleWebApp");
    expect(SITE_METADATA.other).not.toHaveProperty("mobile-web-app-capable");
    expect(SITE_METADATA.other).not.toHaveProperty("apple-mobile-web-app-capable");
  });
});
