import { describe, expect, it } from "vitest";
import { AUTOSAVE_DEBOUNCE_MS, decideAutosave, nextStatusAfter } from "./autosave";

describe("decideAutosave", () => {
  it.each([
    {
      name: "signed out, dirty, with a modelId: idle (nothing to save to)",
      input: { signedIn: false, modelId: "model-1", dirty: true, inFlight: false },
      expected: "idle",
    },
    {
      name: "signed in, dirty, modelId null: idle (never saved, no home yet)",
      input: { signedIn: true, modelId: null, dirty: true, inFlight: false },
      expected: "idle",
    },
    {
      name: "signed in, dirty, modelId present, nothing in flight: save",
      input: { signedIn: true, modelId: "model-1", dirty: true, inFlight: false },
      expected: "save",
    },
    {
      name: "signed in, dirty, modelId present, already in flight: wait",
      input: { signedIn: true, modelId: "model-1", dirty: true, inFlight: true },
      expected: "wait",
    },
    {
      name: "signed in, not dirty, modelId present: idle",
      input: { signedIn: true, modelId: "model-1", dirty: false, inFlight: false },
      expected: "idle",
    },
  ])("$name", ({ input, expected }) => {
    expect(decideAutosave(input)).toBe(expected);
  });
});

describe("AUTOSAVE_DEBOUNCE_MS", () => {
  it("is a number between 800 and 3000 (long enough to not fire per-frame, short enough to feel instant)", () => {
    expect(typeof AUTOSAVE_DEBOUNCE_MS).toBe("number");
    expect(AUTOSAVE_DEBOUNCE_MS).toBeGreaterThanOrEqual(800);
    expect(AUTOSAVE_DEBOUNCE_MS).toBeLessThanOrEqual(3000);
  });
});

describe("nextStatusAfter", () => {
  it("maps a fulfilled attempt to saved", () => {
    const result: PromiseSettledResult<unknown> = { status: "fulfilled", value: undefined };
    expect(nextStatusAfter(result)).toBe("saved");
  });

  it("never maps a rejected attempt to saved — a lying save state is the one thing this module must never produce", () => {
    const result: PromiseSettledResult<unknown> = { status: "rejected", reason: new Error("network error") };
    expect(nextStatusAfter(result)).toBe("error");
    expect(nextStatusAfter(result)).not.toBe("saved");
  });
});
