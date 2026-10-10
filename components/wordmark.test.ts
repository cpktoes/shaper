import { createElement } from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Wordmark } from "./wordmark";
import { WORDMARK_PATH } from "./wordmark-path";

/**
 * The founder's logo as a drawn shape (quick 261010-km7): the component draws the traced outline,
 * the outline is a verbatim copy of brand/wordmark.svg, and the three places that used to spell
 * the name out as text now draw the logo instead.
 */

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
}

function readStripped(...parts: string[]): string {
  return stripComments(readFileSync(join(REPO_ROOT, ...parts), "utf8"));
}

describe("Wordmark", () => {
  const html = renderToStaticMarkup(createElement(Wordmark, { className: "w-full" }));

  it("renders one svg with the accessible name, currentColor fill and the traced box", () => {
    expect(html.match(/<svg/g)).toHaveLength(1);
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Shaper Assistant"');
    expect(html).toContain('fill="currentColor"');
    expect(html).toContain('viewBox="0 0 806.1 100"');
  });

  it("holds one even-odd path and no colour of its own", () => {
    expect(html.match(/<path/g)).toHaveLength(1);
    expect(html).toContain('fill-rule="evenodd"');
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(html).not.toMatch(/rgb\(|hsl\(|oklch\(/);
    expect(html).not.toContain("stroke");
  });

  it("merges the className it is handed", () => {
    expect(html).toContain("w-full");
  });

  it("cuts the box at the baseline when asked, and lets the p's tail paint below it", () => {
    const baseline = renderToStaticMarkup(createElement(Wordmark, { baseline: true }));
    expect(baseline).toContain('viewBox="0 0 806.1 79.6"');
    expect(baseline).toContain("overflow-visible");
    expect(html).not.toContain("overflow-visible");
  });
});

describe("WORDMARK_PATH", () => {
  it("equals the d attribute of brand/wordmark.svg character for character", () => {
    const svg = readFileSync(join(REPO_ROOT, "brand", "wordmark.svg"), "utf8");
    const match = svg.match(/ d="([^"]+)"/);
    expect(match).not.toBeNull();
    expect(WORDMARK_PATH).toBe(match![1]);
    expect(WORDMARK_PATH.length).toBeGreaterThan(5000);
  });
});

describe("brand/", () => {
  it("holds the founder's three images, the cleaned circle, the traced logo and a README", () => {
    for (const name of [
      "wordmark-black-on-white-source.jpg",
      "wordmark-white-on-grey-source.jpg",
      "circle-logo-source.jpg",
      "circle-logo-clean-2000.png",
      "wordmark.svg",
      "README.md",
    ]) {
      expect(() => readFileSync(join(REPO_ROOT, "brand", name))).not.toThrow();
    }
  });
});

describe("the places that used to spell the name out", () => {
  const files = [
    ["components", "site-nav.tsx"],
    ["components", "design", "phone-top-bar.tsx"],
    ["app", "global-error.tsx"],
  ];

  for (const parts of files) {
    it(`${parts.join("/")} draws the Wordmark and holds no capitalised name as text`, () => {
      const stripped = readStripped(...parts);
      expect(stripped).toContain("<Wordmark");
      expect(stripped).not.toContain("SHAPER ASSISTANT");
    });
  }
});
