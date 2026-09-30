import { describe, expect, it } from "vitest";
import { pageAddressOnly, pageAddressOnlyVisit } from "./page-address";

describe("pageAddressOnly", () => {
  it("leaves a plain address unchanged", () => {
    expect(pageAddressOnly("https://www.shaperassistant.com/design/rails")).toBe(
      "https://www.shaperassistant.com/design/rails",
    );
  });

  it("drops a query string", () => {
    expect(pageAddressOnly("https://www.shaperassistant.com/?ref=instagram")).toBe(
      "https://www.shaperassistant.com/",
    );
  });

  it("drops a hash — a sign-in dialog's own step", () => {
    expect(pageAddressOnly("https://www.shaperassistant.com/#/factor-one")).toBe(
      "https://www.shaperassistant.com/",
    );
  });

  it("drops both a query string and a hash, cutting at whichever comes first", () => {
    expect(
      pageAddressOnly("https://www.shaperassistant.com/design/outline?token=abc#/sso-callback"),
    ).toBe("https://www.shaperassistant.com/design/outline");
  });

  it("drops a click id such as fbclid", () => {
    expect(pageAddressOnly("https://www.shaperassistant.com/contact?fbclid=IwAR0abc")).toBe(
      "https://www.shaperassistant.com/contact",
    );
  });

  it("works on a relative address", () => {
    expect(pageAddressOnly("/privacy?x=1#y")).toBe("/privacy");
  });

  it("works on an empty string", () => {
    expect(pageAddressOnly("")).toBe("");
  });
});

describe("pageAddressOnlyVisit", () => {
  it("returns a new object with the trimmed url and the same type — pageview", () => {
    const event = { type: "pageview" as const, url: "https://example.com/design/fins?x=1" };
    const result = pageAddressOnlyVisit(event);
    expect(result).not.toBe(event);
    expect(result).toEqual({ type: "pageview", url: "https://example.com/design/fins" });
  });

  it("returns a new object with the trimmed url and the same type — event", () => {
    const event = { type: "event" as const, url: "https://example.com/contact#top" };
    const result = pageAddressOnlyVisit(event);
    expect(result).not.toBe(event);
    expect(result).toEqual({ type: "event", url: "https://example.com/contact" });
  });

  it("never mutates its input", () => {
    const event = { type: "pageview" as const, url: "https://example.com/?a=1" };
    const original = { ...event };
    pageAddressOnlyVisit(event);
    expect(event).toEqual(original);
  });

  it("never returns null", () => {
    const event = { type: "pageview" as const, url: "" };
    expect(pageAddressOnlyVisit(event)).not.toBeNull();
  });
});
