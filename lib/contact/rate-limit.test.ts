import { describe, expect, it } from "vitest";
import {
  CONTACT_SEND_LIMIT,
  CONTACT_SEND_MAX_VISITORS,
  CONTACT_SEND_WINDOW_MS,
  CONTACT_VISITOR_KEY_MAX,
  CONTACT_VISITOR_UNKNOWN,
  contactVisitorKey,
  takeContactSendSlot,
  type ContactSendStore,
} from "./rate-limit";

/**
 * Quick 261006-g5q, Task 1: the Contact form's per-visitor limit, proved with a pretend clock —
 * every `nowMs` below is a plain number, and every test starts from its own empty store.
 */

const WINDOW = CONTACT_SEND_WINDOW_MS;

function sendTimes(store: ContactSendStore, key: string, times: number[]): boolean[] {
  return times.map((nowMs) => takeContactSendSlot({ store, key, nowMs }));
}

describe("the named numbers", () => {
  it("are five sends, one hour, 10,000 visitors and a 64-character key", () => {
    expect(CONTACT_SEND_LIMIT).toBe(5);
    expect(CONTACT_SEND_WINDOW_MS).toBe(3_600_000);
    expect(CONTACT_SEND_MAX_VISITORS).toBe(10_000);
    expect(CONTACT_VISITOR_KEY_MAX).toBe(64);
    expect(CONTACT_VISITOR_UNKNOWN).toBe("unknown");
  });
});

describe("takeContactSendSlot", () => {
  it("allows the first five sends from one visitor and refuses the sixth", () => {
    const store: ContactSendStore = new Map();
    expect(sendTimes(store, "a", [0, 1000, 2000, 3000, 4000])).toEqual([true, true, true, true, true]);
    expect(takeContactSendSlot({ store, key: "a", nowMs: 5000 })).toBe(false);
  });

  it("does not record a refused send, so retrying never pushes the wait further out", () => {
    const store: ContactSendStore = new Map();
    sendTimes(store, "a", [0, 1000, 2000, 3000, 4000]);
    takeContactSendSlot({ store, key: "a", nowMs: 5000 });
    takeContactSendSlot({ store, key: "a", nowMs: 6000 });
    expect(store.get("a")).toEqual([0, 1000, 2000, 3000, 4000]);
  });

  it("lets a send stop counting exactly one hour after it was made", () => {
    const store: ContactSendStore = new Map();
    sendTimes(store, "a", [0, 1000, 2000, 3000, 4000]);
    expect(takeContactSendSlot({ store, key: "a", nowMs: WINDOW - 1 })).toBe(false);
    expect(takeContactSendSlot({ store, key: "a", nowMs: WINDOW })).toBe(true);
    // The send at 1000 still counts until WINDOW + 1000.
    expect(takeContactSendSlot({ store, key: "a", nowMs: WINDOW })).toBe(false);
  });

  it("keeps visitors independent: one visitor at the limit never stops another", () => {
    const store: ContactSendStore = new Map();
    sendTimes(store, "a", [0, 1000, 2000, 3000, 4000]);
    expect(takeContactSendSlot({ store, key: "a", nowMs: 5000 })).toBe(false);
    expect(takeContactSendSlot({ store, key: "b", nowMs: 5000 })).toBe(true);
  });

  it("forgets a visitor once all their sends are older than the hour", () => {
    const store: ContactSendStore = new Map();
    sendTimes(store, "a", [0, 1000, 2000, 3000, 4000]);
    takeContactSendSlot({ store, key: "b", nowMs: WINDOW + 5000 });
    expect(store.size).toBe(1);
    expect(store.has("a")).toBe(false);
    expect(store.has("b")).toBe(true);
  });

  it("never holds more than maxVisitors, forgetting the one longest without a send", () => {
    const store: ContactSendStore = new Map();
    for (const [i, key] of ["a", "b", "c", "d"].entries()) {
      takeContactSendSlot({ store, key, nowMs: i, maxVisitors: 3 });
    }
    expect(store.size).toBe(3);
    expect(store.has("a")).toBe(false);
    expect(store.has("d")).toBe(true);
  });

  it("moves a visitor to the newest end when they send again, so the cap forgets someone else", () => {
    const store: ContactSendStore = new Map();
    for (const [i, key] of ["a", "b", "c", "a", "d"].entries()) {
      takeContactSendSlot({ store, key, nowMs: i, maxVisitors: 3 });
    }
    expect(store.size).toBe(3);
    expect(store.has("b")).toBe(false);
    expect([...store.keys()]).toEqual(["c", "a", "d"]);
  });

  it("honours custom numbers", () => {
    const store: ContactSendStore = new Map();
    expect(takeContactSendSlot({ store, key: "a", nowMs: 0, limit: 1, windowMs: 10 })).toBe(true);
    expect(takeContactSendSlot({ store, key: "a", nowMs: 5, limit: 1, windowMs: 10 })).toBe(false);
    expect(takeContactSendSlot({ store, key: "a", nowMs: 10, limit: 1, windowMs: 10 })).toBe(true);
  });
});

describe("contactVisitorKey", () => {
  it("takes the first address of x-forwarded-for", () => {
    expect(contactVisitorKey({ forwardedFor: "203.0.113.7, 10.0.0.1", realIp: null })).toBe("203.0.113.7");
  });

  it("trims surrounding spaces", () => {
    expect(contactVisitorKey({ forwardedFor: "  203.0.113.7  ,10.0.0.1", realIp: null })).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip when x-forwarded-for is missing", () => {
    expect(contactVisitorKey({ forwardedFor: null, realIp: "198.51.100.2" })).toBe("198.51.100.2");
  });

  it.each(["", " , "])("falls back to x-real-ip when x-forwarded-for is blank (%j)", (forwardedFor) => {
    expect(contactVisitorKey({ forwardedFor, realIp: "198.51.100.2" })).toBe("198.51.100.2");
  });

  it("is the shared 'unknown' key when both are missing or blank", () => {
    expect(contactVisitorKey({ forwardedFor: null, realIp: null })).toBe("unknown");
    expect(contactVisitorKey({ forwardedFor: " ", realIp: " , " })).toBe("unknown");
  });

  it("keeps an IPv6 address as it is", () => {
    expect(contactVisitorKey({ forwardedFor: "2001:db8::1", realIp: null })).toBe("2001:db8::1");
  });

  it("cuts a very long value to 64 characters", () => {
    const key = contactVisitorKey({ forwardedFor: "x".repeat(500), realIp: null });
    expect(key).toBe("x".repeat(64));
  });
});
