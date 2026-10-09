import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TabbedPanel } from "./tabbed-panel";

/**
 * The tab strip gained one optional `trailing` slot for the board's name (quick 261008-raw). A
 * screen that does not pass it must draw exactly the markup it always has, so this compares three
 * real shapes against copies captured BEFORE the slot existed (`__fixtures__/tabbed-panel-before.json`
 * — captured from the file as it stood, never re-captured):
 *   a  TEMPLATE / VOLUME: one read-only label, phone chrome on
 *   b  RAILS' VIEWER / DATA / INSTRUCTIONS: three tabs, phone chrome on
 *   c  RAILS' View Full Sized dialog: three tabs, no phone chrome, an extra panel class
 */
const before = JSON.parse(
  readFileSync(new URL("./__fixtures__/tabbed-panel-before.json", import.meta.url), "utf8"),
) as { a: string; b: string; c: string };

const child = createElement("div", null, "x");

function render(props: Record<string, unknown>): string {
  return renderToStaticMarkup(createElement(TabbedPanel, props as never, child));
}

const SHAPE_A = { tabs: [{ id: "v", label: "VIEWER" }], active: "v", compactOnPhone: "drawing" };
const SHAPE_B = {
  tabs: [
    { id: "v", label: "VIEWER" },
    { id: "d", label: "DATA" },
    { id: "i", label: "INSTRUCTIONS" },
  ],
  active: "v",
  onSelect: () => {},
  compactOnPhone: "drawing",
};
const SHAPE_C = {
  tabs: [
    { id: "n", label: "NOSE" },
    { id: "c", label: "CENTER" },
    { id: "t", label: "TAIL" },
  ],
  active: "n",
  onSelect: () => {},
  panelClassName: "gap-4",
};

/** The two phone side-padding classes the tabs gained (P-3): the one difference from the capture. */
const PHONE_TAB_PADDING = " max-shell:px-2 [@media(max-height:500px)]:px-2";

describe("TabbedPanel without a trailing slot", () => {
  it("shape a: the same as before except each phone tab's 8-dot side padding", () => {
    const html = render(SHAPE_A);
    expect(html).toContain(PHONE_TAB_PADDING);
    expect(html.split(PHONE_TAB_PADDING).join("")).toBe(before.a);
  });
  it("shape b: the same as before except each phone tab's 8-dot side padding (one per tab)", () => {
    const html = render(SHAPE_B);
    expect(html.split(PHONE_TAB_PADDING).length - 1).toBe(3);
    expect(html.split(PHONE_TAB_PADDING).join("")).toBe(before.b);
  });
  it("shape c (the View Full Sized dialog): unchanged", () => {
    expect(render(SHAPE_C)).toBe(before.c);
  });
});

describe("TabbedPanel with a trailing slot", () => {
  it("puts the tabs in their own row (the tab list) and the trailing item beside it", () => {
    const html = render({ ...SHAPE_B, trailing: () => createElement("button", null, "Fish") });
    expect(html).toContain('role="tablist"');
    // The tab list holds only tabs: the trailing button comes after it closes.
    expect(html.indexOf("Fish")).toBeGreaterThan(html.indexOf("INSTRUCTIONS"));
    expect(html).toMatch(/<\/div><div class="ml-auto flex min-w-0"><button>Fish<\/button>/);
  });

  it("tells the trailing item whether the tabs carry the phone touch box", () => {
    const seen: boolean[] = [];
    render({ ...SHAPE_A, trailing: (s: { touchClearance: boolean }) => (seen.push(s.touchClearance), null) });
    render({ ...SHAPE_B, trailing: (s: { touchClearance: boolean }) => (seen.push(s.touchClearance), null) });
    render({ ...SHAPE_C, trailing: (s: { touchClearance: boolean }) => (seen.push(s.touchClearance), null) });
    expect(seen).toEqual([false, true, false]);
  });

  it("draws no band at all when bare (Wide View), so no trailing item either", () => {
    const html = render({ ...SHAPE_A, bare: true, trailing: () => createElement("button", null, "Fish") });
    expect(html).not.toContain("Fish");
  });
});
