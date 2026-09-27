import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * A source-contract test (lib/theme.test.ts's idiom): reads the extracted `TwoOptionToggle` and
 * the private `PillButton` it was copied from, and asserts the three class strings that define
 * the control's visual treatment agree byte-for-byte in both files — so the extraction stays a
 * copy rather than a third styling (UI-SPEC, "Flat/Domed toggle (D-18)").
 */

const BASE_CLASSES = "rounded-md border px-1 py-2.5 text-[11px] font-bold";
const ACTIVE_CLASSES = "border-surf-on-accent bg-surf-accent text-surf-on-accent";
const INACTIVE_CLASSES = "border-surf-line bg-surf-sidebar text-surf-ink";

function readSource(relativePath: string): string {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

describe("TwoOptionToggle", () => {
  const toggleSource = readSource("components/viewer/two-option-toggle.tsx");
  const finControlsSource = readSource("components/fins/fin-controls.tsx");
  const railInstructionsSource = readSource("components/rails/rail-instructions.tsx");

  it("carries the active-state class string", () => {
    expect(toggleSource).toContain(ACTIVE_CLASSES);
  });

  it("carries the inactive-state class string", () => {
    expect(toggleSource).toContain(INACTIVE_CLASSES);
  });

  it("carries the base class string", () => {
    expect(toggleSource).toContain(BASE_CLASSES);
  });

  it("copies all three class strings from fin-controls.tsx's PillButton, byte-for-byte", () => {
    expect(finControlsSource).toContain(BASE_CLASSES);
    expect(finControlsSource).toContain(ACTIVE_CLASSES);
    expect(finControlsSource).toContain(INACTIVE_CLASSES);
  });

  it("announces which pill is on, with aria-pressed on each", () => {
    expect(toggleSource).toContain("aria-pressed={active}");
  });

  it("can name the pair as a group for a screen reader, and only when asked to", () => {
    expect(toggleSource).toContain("ariaLabel?: string");
    expect(toggleSource).toContain("role=");
    expect(toggleSource).toContain('role={ariaLabel ? "group" : undefined}');
  });

  it("puts the accent focus ring before the unchanged base run and the 44px touch height after it", () => {
    expect(toggleSource).toContain("focus-ring-accent");
    expect(toggleSource).toContain("coarse:min-h-11");
    expect(toggleSource).toContain(`focus-ring-accent cursor-pointer ${BASE_CLASSES} coarse:min-h-11`);
  });

  it("is imported by rail-instructions.tsx", () => {
    expect(railInstructionsSource).toMatch(
      /import\s*\{\s*TwoOptionToggle\s*\}\s*from\s*["']@\/components\/viewer\/two-option-toggle["']/,
    );
  });
});
