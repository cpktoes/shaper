import { createElement } from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Wordmark } from "./wordmark";
import { WORDMARK_BASELINE, WORDMARK_HEIGHT, WORDMARK_PATH, WORDMARK_WIDTH } from "./wordmark-path";

/**
 * The founder's logo as a drawn shape (quick 261010-km7): the component draws the outline, the
 * outline is a verbatim copy of brand/wordmark.svg, and the three places that used to spell the
 * name out as text now draw the logo instead. Since 2026-11-23 (quick 261123-dn6) the outline is
 * the founder's Inter logo, made from brand/inter/plain/inline-transparent.svg.
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

  it("renders one svg with the accessible name, currentColor fill and the logo's own box", () => {
    expect(html.match(/<svg/g)).toHaveLength(1);
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Shaper Assistant"');
    expect(html).toContain('fill="currentColor"');
    expect(html).toContain('viewBox="0 0 1629.93 188.77"');
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
    expect(baseline).toContain('viewBox="0 0 1629.93 147.95"');
    expect(baseline).toContain("overflow-visible");
    expect(html).not.toContain("overflow-visible");
  });
});

/**
 * Moves every number of a path the way brand/wordmark.svg was made: x by -7.62, y by +147.95, in
 * whole hundredths so nothing is rounded, written with two decimals, trailing zeros and then a
 * trailing dot dropped, "-0" as "0". A command letter sets what the numbers after it mean: M, L
 * and Q alternate x then y, H is all x, V is all y. Numbers are separated by one space, a command
 * letter needs none.
 */
function moved(d: string): string {
  const tokens = d.match(/[MLQHVZ]|-?\d+(?:\.\d+)?/g) ?? [];
  let command = "";
  let index = 0;
  let out = "";
  let afterNumber = false;
  for (const token of tokens) {
    if (/^[MLQHVZ]$/.test(token)) {
      command = token;
      index = 0;
      out += token;
      afterNumber = false;
      continue;
    }
    // Whole hundredths: split the text on the dot, never multiply a float.
    const negative = token.startsWith("-");
    const [whole, fraction = ""] = token.replace("-", "").split(".");
    const hundredths = (negative ? -1 : 1) * (Number(whole) * 100 + Number(fraction.padEnd(2, "0")));
    const isX = command === "H" || ((command === "M" || command === "L" || command === "Q") && index % 2 === 0);
    index++;
    const value = hundredths + (isX ? -762 : 14795);
    const abs = Math.abs(value);
    let text = `${value < 0 ? "-" : ""}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
    text = text.replace(/0+$/, "").replace(/\.$/, "");
    if (text === "-0") text = "0";
    out += (afterNumber ? " " : "") + text;
    afterNumber = true;
  }
  return out;
}

describe("WORDMARK_PATH", () => {
  const svg = readFileSync(join(REPO_ROOT, "brand", "wordmark.svg"), "utf8");

  it("equals the d attribute of brand/wordmark.svg character for character", () => {
    const match = svg.match(/ d="([^"]+)"/);
    expect(match).not.toBeNull();
    expect(WORDMARK_PATH).toBe(match![1]);
    expect(WORDMARK_PATH.length).toBeGreaterThan(5000);
  });

  it("carries the letters' own box: 1629.93 by 188.77, standing on a baseline 147.95 down", () => {
    expect(WORDMARK_WIDTH).toBe(1629.93);
    expect(WORDMARK_HEIGHT).toBe(188.77);
    expect(WORDMARK_BASELINE).toBe(147.95);
    expect(svg).toContain('viewBox="0 0 1629.93 188.77"');
  });

  it("is one even-odd path with no colour of its own", () => {
    expect(svg.match(/<path/g)).toHaveLength(1);
    expect(svg).toContain('fill-rule="evenodd"');
    expect(svg).not.toMatch(/fill="#|stroke|rgb\(/);
  });

  it("is the founder's Inter drawing moved, not redrawn", () => {
    const drawing = readFileSync(join(REPO_ROOT, "brand", "inter", "plain", "inline-transparent.svg"), "utf8");
    const parts = ["shaper", "assistant", "com"].map((id) => {
      const match = drawing.match(new RegExp(`<path id="${id}"[^>]*? d="([^"]+)"`));
      expect(match, `path ${id} in the drawing`).not.toBeNull();
      return match![1];
    });
    expect(parts.map(moved).join("")).toBe(WORDMARK_PATH);
  });
});

describe("brand/", () => {
  it("holds the founder's Inter drawings, the one-shape logo, the old Helvetica sources and a README", () => {
    for (const name of [
      "wordmark.svg",
      "README.md",
      "inter/plain/inline-transparent.svg",
      "inter/plain/round-transparent.svg",
      "inter/plain/round-black-on-white.svg",
      "inter/plain/round-black-on-white.png",
      "wordmark-black-on-white-source.jpg",
      "wordmark-white-on-grey-source.jpg",
      "circle-logo-source.jpg",
      "circle-logo-white-on-black-source.jpg",
      "circle-logo-clean-2000.png",
    ]) {
      expect(() => readFileSync(join(REPO_ROOT, "brand", ...name.split("/")))).not.toThrow();
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
