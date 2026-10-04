import { describe, expect, it } from "vitest";
import { screenStepsAround, screenWord } from "./screen-steps";

// A local copy of the six screens, in the order a board is shaped. The real list (NAV_LINKS in
// components/site-nav.tsx) cannot be imported here — it pulls Clerk and React client code into a
// node unit test — so e2e/step-nav.spec.ts walks the real list in a browser instead.
const SCREENS = [
  { href: "/design/outline", label: "TEMPLATE" },
  { href: "/design/rocker", label: "ROCKER" },
  { href: "/design/rails", label: "RAILS" },
  { href: "/design/volume", label: "VOLUME" },
  { href: "/design/fins", label: "FINS" },
  { href: "/design/summary", label: "SUMMARY" },
] as const;

describe("screenStepsAround", () => {
  it("TEMPLATE, the first screen, has nothing before it and ROCKER after it", () => {
    const steps = screenStepsAround(SCREENS, "/design/outline");
    expect(steps.previous).toBeNull();
    expect(steps.next).toBe(SCREENS[1]);
  });

  it("RAILS, in the middle, sits between ROCKER and VOLUME", () => {
    const steps = screenStepsAround(SCREENS, "/design/rails");
    expect(steps.previous).toBe(SCREENS[1]);
    expect(steps.next).toBe(SCREENS[3]);
  });

  it("SUMMARY, the last screen, has FINS before it and nothing after it — never wraps to TEMPLATE", () => {
    const steps = screenStepsAround(SCREENS, "/design/summary");
    expect(steps.previous).toBe(SCREENS[4]);
    expect(steps.next).toBeNull();
  });

  it("TEMPLATE never wraps back round to SUMMARY", () => {
    expect(screenStepsAround(SCREENS, "/design/outline").previous).toBeNull();
  });

  it("an address under a screen counts as that screen", () => {
    const steps = screenStepsAround(SCREENS, "/design/rocker/anything");
    expect(steps.previous).toBe(SCREENS[0]);
    expect(steps.next).toBe(SCREENS[2]);
  });

  it("a near miss with no slash is not a screen", () => {
    expect(screenStepsAround(SCREENS, "/design/outlines")).toEqual({ previous: null, next: null });
  });

  it("the home page, Contact, an empty address, null and undefined give no steps", () => {
    for (const path of ["/", "/contact", "", null, undefined]) {
      expect(screenStepsAround(SCREENS, path)).toEqual({ previous: null, next: null });
    }
  });

  it("an empty list gives no steps", () => {
    expect(screenStepsAround([], "/design/outline")).toEqual({ previous: null, next: null });
  });
});

describe("screenWord", () => {
  it("turns each of the six screens' capitals into the word a button reads", () => {
    expect(SCREENS.map((screen) => screenWord(screen.label))).toEqual([
      "Template",
      "Rocker",
      "Rails",
      "Volume",
      "Fins",
      "Summary",
    ]);
  });
});
