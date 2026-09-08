import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  GATEABLE_RAIL_REFERENCE_GROUPS,
  PLAN_REF_PATHS,
  PLAN_REF_VIEWBOX,
  REF_GROUP_COLORS,
  SIDE_REF_PATHS,
  SIDE_REF_VIEWBOX,
} from "./rail-reference-paths";

/**
 * Pins the ported `PLAN_REF_PATHS`/`SIDE_REF_PATHS`/viewBoxes/colours against
 * `reference/project/Rails.dc.html`'s own source — the mechanical proof that the port (RAIL-05,
 * D-01) is faithful and stays faithful, in the same "read the real source file and assert a
 * structural property" idiom as `lib/theme.test.ts` and `lib/units-isolation.test.ts`.
 */

const PROTOTYPE_SOURCE = readFileSync(new URL("../../reference/project/Rails.dc.html", import.meta.url), "utf8");

/** Extracts the literal immediately following the first `openChar` after `needle`, balancing
 * `openChar`/`closeChar` pairs — the same "read the prototype's own source rather than re-type
 * it" idiom `scripts/extract-prototype-rails-golden.mjs` already uses via `new Function()`. */
function extractBalanced(source: string, needle: string, openChar: string, closeChar: string): string {
  const at = source.indexOf(needle);
  if (at === -1) throw new Error(`"${needle}" not found in prototype source`);
  const start = source.indexOf(openChar, at);
  if (start === -1) throw new Error(`no "${openChar}" found after "${needle}"`);
  let depth = 0;
  let i = start;
  for (; i < source.length; i++) {
    if (source[i] === openChar) depth++;
    else if (source[i] === closeChar) {
      depth--;
      if (depth === 0) {
        i++;
        break;
      }
    }
  }
  return source.slice(start, i);
}

/** Evaluates a JS object/array literal extracted from the prototype's own source — bare-word,
 * single-quoted object syntax, not JSON, so `JSON.parse` cannot read it directly. Safe: the input
 * is this repo's own committed prototype file, never external or user-supplied data. */
function evalLiteral(literal: string): unknown {
  return new Function(`return (${literal});`)();
}

describe("rail-reference-paths (RAIL-05, D-01)", () => {
  it("PLAN_REF_PATHS is deeply equal to the prototype's own planRefPaths()", () => {
    const literal = extractBalanced(PROTOTYPE_SOURCE, "planRefPaths() {", "[", "]");
    expect(evalLiteral(literal)).toEqual(PLAN_REF_PATHS);
  });

  it("SIDE_REF_PATHS is deeply equal to the prototype's own sideRefPaths()", () => {
    const literal = extractBalanced(PROTOTYPE_SOURCE, "sideRefPaths() {", "[", "]");
    expect(evalLiteral(literal)).toEqual(SIDE_REF_PATHS);
  });

  it("the plan and side viewBox strings appear verbatim in the prototype source", () => {
    expect(PROTOTYPE_SOURCE).toContain(`viewBox="${PLAN_REF_VIEWBOX}"`);
    expect(PROTOTYPE_SOURCE).toContain(`viewBox="${SIDE_REF_VIEWBOX}"`);
  });

  it("every group used by either ported array has a REF_GROUP_COLORS entry matching the prototype's own colour maps", () => {
    const planColors = evalLiteral(
      extractBalanced(PROTOTYPE_SOURCE, "const colors = { deckMark1:", "{", "}"),
    ) as Record<string, string>;
    const sideColors = evalLiteral(
      extractBalanced(PROTOTYPE_SOURCE, "const colors = { black:", "{", "}"),
    ) as Record<string, string>;
    const prototypeColors: Record<string, string> = { ...planColors, ...sideColors };

    const groupsInUse = new Set([...PLAN_REF_PATHS, ...SIDE_REF_PATHS].map((p) => p.group));
    expect(groupsInUse.size).toBeGreaterThan(0);
    for (const group of groupsInUse) {
      expect(REF_GROUP_COLORS[group], `REF_GROUP_COLORS is missing "${group}"`).toBeDefined();
      expect(REF_GROUP_COLORS[group]).toBe(prototypeColors[group]);
    }
  });

  it("public/rail-bands-plan-bg.png exists and is byte-identical to the reference copy", () => {
    const publicUrl = new URL("../../public/rail-bands-plan-bg.png", import.meta.url);
    const referenceUrl = new URL("../../reference/project/assets/rail-bands-plan-bg.png", import.meta.url);
    expect(existsSync(publicUrl), "public/rail-bands-plan-bg.png does not exist").toBe(true);
    expect(readFileSync(publicUrl).equals(readFileSync(referenceUrl))).toBe(true);
  });

  it("the reference copy under reference/project/assets/ is untouched (it is never deleted or moved)", () => {
    const referenceUrl = new URL("../../reference/project/assets/rail-bands-plan-bg.png", import.meta.url);
    expect(existsSync(referenceUrl)).toBe(true);
  });

  it("the set of gateable groups is exactly nine — five plan groups plus four side groups, excluding the side outline", () => {
    expect(GATEABLE_RAIL_REFERENCE_GROUPS).toHaveLength(9);
    expect(GATEABLE_RAIL_REFERENCE_GROUPS).not.toContain("black");

    const planGroups = new Set(PLAN_REF_PATHS.map((p) => p.group));
    const sideGroups = new Set(SIDE_REF_PATHS.map((p) => p.group));
    expect(planGroups.size).toBe(5);
    expect(sideGroups.has("black")).toBe(true);
    expect(sideGroups.size - 1).toBe(4);

    for (const group of planGroups) expect(GATEABLE_RAIL_REFERENCE_GROUPS).toContain(group);
    for (const group of sideGroups) {
      if (group === "black") continue;
      expect(GATEABLE_RAIL_REFERENCE_GROUPS).toContain(group);
    }
  });
});
