import { describe, expect, it } from "vitest";
import { copyrightNotice } from "./footer";

/** The footer's copyright notice (quick 261006-fom, D-02): the founder's words, this year's date. */
describe("copyrightNotice", () => {
  it("reads the founder's notice for a day in 2026", () => {
    expect(copyrightNotice(new Date("2026-10-06T12:00:00Z"))).toBe("© 2026 Shaper Assistant. All rights reserved.");
  });

  it("follows the year: a day in 2027 reads 2027", () => {
    expect(copyrightNotice(new Date("2027-06-01T12:00:00Z"))).toBe("© 2027 Shaper Assistant. All rights reserved.");
  });

  it("uses today's year when no date is given", () => {
    expect(copyrightNotice()).toBe(`© ${new Date().getFullYear()} Shaper Assistant. All rights reserved.`);
  });
});
