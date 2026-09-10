import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Source-contract tests for the shared rail-legend set (D-01, D-02) — proving structurally that
 * the nine ticks live in one session-only place read by both the RAILS tab and the printed sheet,
 * never in storage, never attached to a board. Same idiom as `rail-instructions-sheet.test.ts`:
 * read the real source, strip comments, assert a structural property, so a mention inside a doc
 * comment can never false-positive an assertion.
 */

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
}

function readStripped(relativePath: string): string {
  return stripComments(readFileSync(join(REPO_ROOT, relativePath), "utf8"));
}

const PROVIDER_PATH = "components/rails/rail-legend-provider.tsx";
const TICKS_PATH = "components/rails/rail-legend-ticks.tsx";
const LAYOUT_PATH = "app/design/layout.tsx";
const RAIL_INSTRUCTIONS_PATH = "components/rails/rail-instructions.tsx";

describe("the shared rail-legend set — one set of ticks for both screens (D-01), session-only (D-02)", () => {
  const providerSource = readStripped(PROVIDER_PATH);
  const ticksSource = readStripped(TICKS_PATH);
  const layoutSource = readStripped(LAYOUT_PATH);
  const railInstructionsSource = readStripped(RAIL_INSTRUCTIONS_PATH);

  it("holds the set in plain React state and nothing more (D-02)", () => {
    expect(providerSource).toMatch(/useState/);
    expect(providerSource).not.toMatch(/localStorage/);
    expect(providerSource).not.toMatch(/document\.cookie/);
    expect(providerSource).not.toMatch(/sessionStorage/);
    expect(providerSource).not.toMatch(/"use server"/);
    expect(providerSource).not.toMatch(/@\/app\/actions/);
    expect(providerSource).not.toMatch(/lib\/db/);
  });

  it("starts with every line drawn, seeded from GATEABLE_RAIL_REFERENCE_GROUPS", () => {
    expect(providerSource).toContain("GATEABLE_RAIL_REFERENCE_GROUPS");
  });

  it("is not board data (D-02) — neither the provider nor the ticks module mentions the design store", () => {
    expect(providerSource).not.toMatch(/useDesign/);
    expect(providerSource).not.toMatch(/design-store/);
    expect(ticksSource).not.toMatch(/useDesign/);
    expect(ticksSource).not.toMatch(/design-store/);
  });

  it("both screens read one set: the design layout mounts RailLegendProvider around props.children", () => {
    expect(layoutSource).toContain("RailLegendProvider");
    const openIndex = layoutSource.indexOf("<RailLegendProvider");
    const closeIndex = layoutSource.indexOf("</RailLegendProvider>");
    const childrenIndex = layoutSource.indexOf("props.children");
    expect(openIndex).toBeGreaterThan(-1);
    expect(closeIndex).toBeGreaterThan(openIndex);
    expect(childrenIndex).toBeGreaterThan(openIndex);
    expect(childrenIndex).toBeLessThan(closeIndex);
  });

  it("the RAILS tab no longer owns a private copy — it reads useRailLegend instead of its own Set state", () => {
    expect(railInstructionsSource).toContain("useRailLegend");
    expect(railInstructionsSource).not.toMatch(/useState<Set</);
  });

  it("the nine ticks are generated from RAIL_REFERENCE_LEGEND, never hand-listed", () => {
    expect(ticksSource).toMatch(/RAIL_REFERENCE_LEGEND\.map/);
    expect(ticksSource).not.toContain("Deck Mark 3 Center");
  });
});
