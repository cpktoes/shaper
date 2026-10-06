import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import {
  RESEND_SEND_URL,
  deliverContactMessage,
  isContactFormAvailable,
  resolveContactDelivery,
  sendWithResend,
  submitContact,
} from "./delivery";
import { buildResendRequest, type ContactFields, type ResendSendBody } from "./message";

/**
 * TDD RED for quick 260929-u1t, Task 1 (the sender reworked for Resend in quick 260929-w2k,
 * Task 1): the production-guarded delivery switch (P-3), the Resend HTTP call, and
 * submitContact's ordering (attempt, honeypot, validation, availability, deliver). The boundary
 * describe block at the bottom is the open-access.test.ts idiom: source-reading assertions that
 * guard the key's isolation mechanically rather than by review.
 */

const message: ResendSendBody = buildResendRequest({
  message: "Hello there",
  email: "jane@example.com",
  name: "Jane Smith",
});

describe("resolveContactDelivery", () => {
  it("stand-in switches on outside production with the flag and choice 'sent', ignoring a real key", () => {
    const delivery = resolveContactDelivery({
      nodeEnv: "development",
      standInFlag: "1",
      standInChoice: "sent",
      apiKey: "real",
    });
    expect(delivery).toEqual({ kind: "stand-in", outcome: "sent" });
  });

  it("choice 'failed' resolves to stand-in failed", () => {
    const delivery = resolveContactDelivery({
      nodeEnv: "development",
      standInFlag: "1",
      standInChoice: "failed",
      apiKey: "real",
    });
    expect(delivery).toEqual({ kind: "stand-in", outcome: "failed" });
  });

  it.each([undefined, "off", "SENT"])("choice %s resolves to none, even with an apiKey", (choice) => {
    const delivery = resolveContactDelivery({
      nodeEnv: "development",
      standInFlag: "1",
      standInChoice: choice,
      apiKey: "real",
    });
    expect(delivery).toEqual({ kind: "none" });
  });

  it.each(["true", ""])("flag %s is treated as off", (flag) => {
    const delivery = resolveContactDelivery({
      nodeEnv: "development",
      standInFlag: flag,
      standInChoice: "sent",
      apiKey: " k ",
    });
    expect(delivery).toEqual({ kind: "resend", apiKey: "k" });
  });

  it.each(["", "   ", undefined])("with the stand-in off, a blank apiKey %s resolves to none", (apiKey) => {
    const delivery = resolveContactDelivery({
      nodeEnv: "development",
      standInFlag: "true",
      standInChoice: "sent",
      apiKey,
    });
    expect(delivery).toEqual({ kind: "none" });
  });

  it("in production with the flag and choice set but no key, resolves to none", () => {
    const delivery = resolveContactDelivery({
      nodeEnv: "production",
      standInFlag: "1",
      standInChoice: "sent",
      apiKey: undefined,
    });
    expect(delivery).toEqual({ kind: "none" });
  });

  it("the stand-in can't switch on in production, even with the flag and choice set and a key present", () => {
    const delivery = resolveContactDelivery({
      nodeEnv: "production",
      standInFlag: "1",
      standInChoice: "sent",
      apiKey: "k",
    });
    expect(delivery).toEqual({ kind: "resend", apiKey: "k" });
  });

  it("nodeEnv 'test' behaves like 'development'", () => {
    const delivery = resolveContactDelivery({
      nodeEnv: "test",
      standInFlag: "1",
      standInChoice: "sent",
      apiKey: "real",
    });
    expect(delivery).toEqual({ kind: "stand-in", outcome: "sent" });
  });
});

describe("isContactFormAvailable", () => {
  it("is false only for none", () => {
    expect(isContactFormAvailable({ kind: "none" })).toBe(false);
    expect(isContactFormAvailable({ kind: "stand-in", outcome: "sent" })).toBe(true);
    expect(isContactFormAvailable({ kind: "stand-in", outcome: "failed" })).toBe(true);
    expect(isContactFormAvailable({ kind: "resend", apiKey: "k" })).toBe(true);
  });
});

function fakeFetch(response: { ok: boolean; status: number; json: () => Promise<unknown> }) {
  return vi.fn().mockResolvedValue(response);
}

const SUCCESS_ID = "49a3999c-0ce1-4ea6-ab68-afcd6dc2e794";
const successResponse = () =>
  fakeFetch({ ok: true, status: 200, json: async () => ({ id: SUCCESS_ID }) });

describe("sendWithResend", () => {
  it("calls the Resend endpoint exactly once with method POST", async () => {
    const fetchImpl = successResponse();
    await sendWithResend(message, "re_test_key", fetchImpl);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toBe(RESEND_SEND_URL);
    expect(url).toBe("https://api.resend.com/emails");
    expect(options.method).toBe("POST");
  });

  it("sends the three pinned headers, exactly these", async () => {
    const fetchImpl = successResponse();
    await sendWithResend(message, "re_test_key", fetchImpl);
    const [, options] = fetchImpl.mock.calls[0];
    expect(options.headers).toEqual({
      Authorization: "Bearer re_test_key",
      "Content-Type": "application/json",
      "User-Agent": "shaper-assistant/1.0",
    });
  });

  it("the body equals JSON.stringify(body), never contains the key, and has no html key", async () => {
    const fetchImpl = successResponse();
    await sendWithResend(message, "re_test_key", fetchImpl);
    const [, options] = fetchImpl.mock.calls[0];
    expect(options.body).toBe(JSON.stringify(message));
    expect(options.body).not.toContain("re_test_key");
    expect(options.body).not.toContain("html");
  });

  it("passes AbortSignal.timeout(10_000)'s own returned signal to fetch (W-5)", async () => {
    const fakeSignal = { fake: "signal" } as unknown as AbortSignal;
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout").mockReturnValue(fakeSignal);
    const fetchImpl = successResponse();
    await sendWithResend(message, "re_test_key", fetchImpl);
    expect(timeoutSpy).toHaveBeenCalledWith(10_000);
    const [, options] = fetchImpl.mock.calls[0];
    expect(options.signal).toBe(fakeSignal);
    timeoutSpy.mockRestore();
  });

  it("counts as ok on 200 with a non-empty string id", async () => {
    const fetchImpl = successResponse();
    const result = await sendWithResend(message, "re_test_key", fetchImpl);
    expect(result.ok).toBe(true);
  });

  it("does not call console.error on success", async () => {
    const fetchImpl = successResponse();
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await sendWithResend(message, "re_test_key", fetchImpl);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("counts as a failure on 200 with an empty object (no id)", async () => {
    const fetchImpl = fakeFetch({ ok: true, status: 200, json: async () => ({}) });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await sendWithResend(message, "re_test_key", fetchImpl);
    expect(result.ok).toBe(false);
    spy.mockRestore();
  });

  it("counts as a failure on 200 with an empty string id", async () => {
    const fetchImpl = fakeFetch({ ok: true, status: 200, json: async () => ({ id: "" }) });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await sendWithResend(message, "re_test_key", fetchImpl);
    expect(result.ok).toBe(false);
    spy.mockRestore();
  });

  it("counts as a failure on 200 with a non-string id", async () => {
    const fetchImpl = fakeFetch({ ok: true, status: 200, json: async () => ({ id: 42 }) });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await sendWithResend(message, "re_test_key", fetchImpl);
    expect(result.ok).toBe(false);
    spy.mockRestore();
  });

  it("counts as a failure on 200 whose json() resolves null", async () => {
    const fetchImpl = fakeFetch({ ok: true, status: 200, json: async () => null });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await sendWithResend(message, "re_test_key", fetchImpl);
    expect(result.ok).toBe(false);
    spy.mockRestore();
  });

  it("counts as a failure on 200 whose json() throws a SyntaxError", async () => {
    const fetchImpl = fakeFetch({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("Unexpected token");
      },
    });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await sendWithResend(message, "re_test_key", fetchImpl);
    expect(result.ok).toBe(false);
    spy.mockRestore();
  });

  it("counts as a failure on 500 with an id, since a non-2xx carrying an id is still a failure", async () => {
    const fetchImpl = fakeFetch({ ok: false, status: 500, json: async () => ({ id: SUCCESS_ID }) });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await sendWithResend(message, "re_test_key", fetchImpl);
    expect(result.ok).toBe(false);
    spy.mockRestore();
  });

  it("counts as a failure on 403, the domain-not-verified shape", async () => {
    const fetchImpl = fakeFetch({
      ok: false,
      status: 403,
      json: async () => ({
        statusCode: 403,
        message: "The shaperassistant.com domain is not verified.",
        name: "validation_error",
      }),
    });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await sendWithResend(message, "re_test_key", fetchImpl);
    expect(result.ok).toBe(false);
    spy.mockRestore();
  });

  it("counts as a failure when fetch rejects with a network error", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("network down"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await sendWithResend(message, "re_test_key", fetchImpl);
    expect(result.ok).toBe(false);
    spy.mockRestore();
  });

  it("counts as a failure when fetch rejects with a timeout DOMException", async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValue(new DOMException("The operation was aborted due to timeout", "TimeoutError"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await sendWithResend(message, "re_test_key", fetchImpl);
    expect(result.ok).toBe(false);
    spy.mockRestore();
  });

  it("logs the exact status and errorName on a 422, with none of the key, the shaper's text or Resend's message reaching the log", async () => {
    const fetchImpl = fakeFetch({
      ok: false,
      status: 422,
      json: async () => ({
        statusCode: 422,
        name: "validation_error",
        message: "Invalid `to` field: jane@example.com — Hello there — re_test_key",
      }),
    });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await sendWithResend(message, "re_test_key", fetchImpl);
    expect(spy).toHaveBeenCalledExactlyOnceWith("Shaper: contact message did not send", {
      status: 422,
      errorName: "validation_error",
    });
    const serialized = JSON.stringify(spy.mock.calls[0]);
    expect(serialized).not.toContain("re_test_key");
    expect(serialized).not.toContain("Hello there");
    expect(serialized).not.toContain("jane@example.com");
    expect(serialized).not.toContain("Invalid `to` field");
    spy.mockRestore();
  });

  it("a thrown fetch logs exactly status null, errorName null", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("network down"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await sendWithResend(message, "re_test_key", fetchImpl);
    expect(spy).toHaveBeenCalledExactlyOnceWith("Shaper: contact message did not send", {
      status: null,
      errorName: null,
    });
    spy.mockRestore();
  });
});

describe("deliverContactMessage", () => {
  it("stand-in sent resolves ok true without touching the network", async () => {
    const fetchImpl = vi.fn();
    const result = await deliverContactMessage(message, { kind: "stand-in", outcome: "sent" }, fetchImpl);
    expect(result.ok).toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("stand-in failed resolves ok false without touching the network", async () => {
    const fetchImpl = vi.fn();
    const result = await deliverContactMessage(message, { kind: "stand-in", outcome: "failed" }, fetchImpl);
    expect(result.ok).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("none resolves ok false without touching the network", async () => {
    const fetchImpl = vi.fn();
    const result = await deliverContactMessage(message, { kind: "none" }, fetchImpl);
    expect(result.ok).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("resend goes through sendWithResend", async () => {
    const fetchImpl = fakeFetch({ ok: true, status: 200, json: async () => ({ id: SUCCESS_ID }) });
    const result = await deliverContactMessage(message, { kind: "resend", apiKey: "k" }, fetchImpl);
    expect(result.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

const validFields: ContactFields = {
  message: "Hello there",
  email: "jane@example.com",
  name: "Jane Smith",
  honeypot: "",
};

describe("submitContact", () => {
  it("a filled honeypot answers as sent without ever calling deliver, even when delivery would otherwise fail", async () => {
    const deliver = vi.fn();
    const result = await submitContact({
      fields: { ...validFields, honeypot: "https://spam.example" },
      delivery: { kind: "stand-in", outcome: "failed" },
      previous: undefined,
      deliver,
    });
    expect(result.status).toBe("sent");
    expect(result.replyTo).toBe("jane@example.com");
    expect(deliver).not.toHaveBeenCalled();
  });

  it("invalid fields resolve to invalid, with errors and echoed values, and deliver is never called", async () => {
    const deliver = vi.fn();
    const result = await submitContact({
      fields: { message: "", email: "not-an-email", name: "", honeypot: "" },
      delivery: { kind: "stand-in", outcome: "sent" },
      previous: undefined,
      deliver,
    });
    expect(result.status).toBe("invalid");
    expect(result.errors.message).toBeDefined();
    expect(result.errors.email).toBeDefined();
    expect(result.values).toEqual({ message: "", email: "not-an-email", name: "" });
    expect(deliver).not.toHaveBeenCalled();
  });

  it("valid fields but no delivery path resolves to failed, values echoed, deliver never called", async () => {
    const deliver = vi.fn();
    const result = await submitContact({
      fields: validFields,
      delivery: { kind: "none" },
      previous: undefined,
      deliver,
    });
    expect(result.status).toBe("failed");
    expect(result.values).toEqual({ message: "Hello there", email: "jane@example.com", name: "Jane Smith" });
    expect(deliver).not.toHaveBeenCalled();
  });

  it("valid fields, deliver ok true, resolves to sent with replyTo the checked email and values emptied", async () => {
    const deliver = vi.fn().mockResolvedValue({ ok: true });
    const result = await submitContact({
      fields: validFields,
      delivery: { kind: "resend", apiKey: "k" },
      previous: undefined,
      deliver,
    });
    expect(result.status).toBe("sent");
    expect(result.replyTo).toBe("jane@example.com");
    expect(result.values).toEqual({ message: "", email: "", name: "" });
    expect(deliver).toHaveBeenCalledTimes(1);
    expect(deliver).toHaveBeenCalledWith(
      buildResendRequest({ message: "Hello there", email: "jane@example.com", name: "Jane Smith" }),
      { kind: "resend", apiKey: "k" },
    );
  });

  it("deliver returning false resolves to failed with values echoed", async () => {
    const deliver = vi.fn().mockResolvedValue({ ok: false });
    const result = await submitContact({
      fields: validFields,
      delivery: { kind: "resend", apiKey: "k" },
      previous: undefined,
      deliver,
    });
    expect(result.status).toBe("failed");
    expect(result.values).toEqual({ message: "Hello there", email: "jane@example.com", name: "Jane Smith" });
  });

  it("deliver throwing resolves to failed", async () => {
    const deliver = vi.fn().mockRejectedValue(new Error("boom"));
    const result = await submitContact({
      fields: validFields,
      delivery: { kind: "resend", apiKey: "k" },
      previous: undefined,
      deliver,
    });
    expect(result.status).toBe("failed");
  });

  it("attempt is previous.attempt + 1", async () => {
    const deliver = vi.fn().mockResolvedValue({ ok: true });
    const result = await submitContact({
      fields: validFields,
      delivery: { kind: "resend", apiKey: "k" },
      previous: { status: "idle", errors: {}, values: { message: "", email: "", name: "" }, replyTo: "", attempt: 4 },
      deliver,
    });
    expect(result.attempt).toBe(5);
  });

  it.each([undefined, NaN, -1, 1.5])("a missing, non-integer or negative previous.attempt (%s) counts as 0", async (attempt) => {
    const deliver = vi.fn().mockResolvedValue({ ok: true });
    const previous =
      attempt === undefined
        ? undefined
        : { status: "idle" as const, errors: {}, values: { message: "", email: "", name: "" }, replyTo: "", attempt: attempt as number };
    const result = await submitContact({
      fields: validFields,
      delivery: { kind: "resend", apiKey: "k" },
      previous,
      deliver,
    });
    expect(result.attempt).toBe(1);
  });

  it("echoed values are capped: name at 200, email at 500, message at 10,000 characters", async () => {
    // Every field here is deliberately invalid (message over 5,000, email over 254, name over
    // 100), so this exercises the "invalid" echo path — the one place raw, untrusted, oversized
    // typed text needs its own independent cap, well above the field's own validation limit.
    const deliver = vi.fn().mockResolvedValue({ ok: false });
    const result = await submitContact({
      fields: {
        message: "m".repeat(20_000),
        email: `${"e".repeat(600)}@example.com`,
        name: "n".repeat(300),
        honeypot: "",
      },
      delivery: { kind: "resend", apiKey: "k" },
      previous: undefined,
      deliver,
    });
    expect(result.status).toBe("invalid");
    expect(result.values.name.length).toBe(200);
    expect(result.values.email.length).toBe(500);
    expect(result.values.message.length).toBe(10_000);
    expect(deliver).not.toHaveBeenCalled();
  });
});

describe("submitContact — the per-visitor limit (quick 261006-g5q)", () => {
  it("allowSend resolving false answers limited, keeps what was typed, and never delivers", async () => {
    const deliver = vi.fn().mockResolvedValue({ ok: true });
    const allowSend = vi.fn().mockResolvedValue(false);
    const result = await submitContact({
      fields: validFields,
      delivery: { kind: "resend", apiKey: "k" },
      previous: undefined,
      deliver,
      allowSend,
    });
    expect(result.status).toBe("limited");
    expect(result.errors).toEqual({});
    expect(result.replyTo).toBe("");
    expect(result.values).toEqual({ message: "Hello there", email: "jane@example.com", name: "Jane Smith" });
    expect(deliver).not.toHaveBeenCalled();
  });

  it("allowSend resolving true is asked once, before delivery, and the message sends", async () => {
    const deliver = vi.fn().mockResolvedValue({ ok: true });
    const allowSend = vi.fn().mockResolvedValue(true);
    const result = await submitContact({
      fields: validFields,
      delivery: { kind: "resend", apiKey: "k" },
      previous: undefined,
      deliver,
      allowSend,
    });
    expect(result.status).toBe("sent");
    expect(allowSend).toHaveBeenCalledTimes(1);
    expect(deliver).toHaveBeenCalledTimes(1);
    expect(allowSend.mock.invocationCallOrder[0]).toBeLessThan(deliver.mock.invocationCallOrder[0]);
  });

  it("a filled honeypot never asks the limit", async () => {
    const allowSend = vi.fn().mockResolvedValue(true);
    await submitContact({
      fields: { ...validFields, honeypot: "https://spam.example" },
      delivery: { kind: "resend", apiKey: "k" },
      previous: undefined,
      deliver: vi.fn(),
      allowSend,
    });
    expect(allowSend).not.toHaveBeenCalled();
  });

  it("a form with mistakes never asks the limit", async () => {
    const allowSend = vi.fn().mockResolvedValue(true);
    await submitContact({
      fields: { message: "", email: "not-an-email", name: "", honeypot: "" },
      delivery: { kind: "resend", apiKey: "k" },
      previous: undefined,
      deliver: vi.fn(),
      allowSend,
    });
    expect(allowSend).not.toHaveBeenCalled();
  });

  it("a server with no way to send never asks the limit", async () => {
    const allowSend = vi.fn().mockResolvedValue(true);
    await submitContact({
      fields: validFields,
      delivery: { kind: "none" },
      previous: undefined,
      deliver: vi.fn(),
      allowSend,
    });
    expect(allowSend).not.toHaveBeenCalled();
  });

  it("allowSend throwing answers failed with what was typed, and never delivers", async () => {
    const deliver = vi.fn().mockResolvedValue({ ok: true });
    const allowSend = vi.fn().mockRejectedValue(new Error("boom"));
    const result = await submitContact({
      fields: validFields,
      delivery: { kind: "resend", apiKey: "k" },
      previous: undefined,
      deliver,
      allowSend,
    });
    expect(result.status).toBe("failed");
    expect(result.values).toEqual({ message: "Hello there", email: "jane@example.com", name: "Jane Smith" });
    expect(deliver).not.toHaveBeenCalled();
  });
});

/**
 * Boundary block, the open-access.test.ts idiom: reads real source files and asserts structural
 * properties that guard the key's isolation mechanically, rather than by review.
 */
describe("boundary: the key never crosses where it shouldn't", () => {
  const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));

  function collectSourceFiles(dir: string): string[] {
    const entries = readdirSync(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...collectSourceFiles(full));
      } else if (/\.(ts|tsx)$/.test(entry.name)) {
        files.push(full);
      }
    }
    return files;
  }

  function stripComments(source: string): string {
    return source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n")
      .map((line) => line.replace(/\/\/.*$/, ""))
      .join("\n");
  }

  it("(a) lib/contact-server.ts's source contains the literal env reads", () => {
    const source = readFileSync(join(REPO_ROOT, "lib/contact-server.ts"), "utf8");
    expect(source).toContain("nodeEnv: process.env.NODE_ENV");
    expect(source).toContain("apiKey: process.env.RESEND_API_KEY");
  });

  it("(b) no non-test .ts/.tsx file under app/, components/ or lib/ names the key with the public-variable prefix", () => {
    // Built from parts so this test's own source never matches its own search needle.
    const publicPrefix = ["NEXT", "_PUBLIC_"].join("");
    const keyName = ["RESEND", "_API_KEY"].join("");
    const needle = publicPrefix + keyName;

    const dirs = ["app", "components", "lib"].map((d) => join(REPO_ROOT, d));
    const offenders: string[] = [];
    for (const dir of dirs) {
      for (const file of collectSourceFiles(dir)) {
        if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) continue;
        const stripped = stripComments(readFileSync(file, "utf8"));
        if (stripped.includes(needle)) offenders.push(file);
      }
    }
    expect(offenders, `Found the public-prefixed key name in: ${offenders.join(", ")}`).toEqual([]);
  });

  it("(c) no file under components/ imports lib/contact/delivery or lib/contact-server", () => {
    const deliverySpecifier = ["@/lib/contact", "/delivery"].join("");
    const serverSpecifier = ["@/lib/contact", "-server"].join("");
    const componentsDir = join(REPO_ROOT, "components");
    const offenders: string[] = [];
    for (const file of collectSourceFiles(componentsDir)) {
      if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) continue;
      const source = readFileSync(file, "utf8");
      if (source.includes(deliverySpecifier) || source.includes(serverSpecifier)) offenders.push(file);
    }
    expect(offenders, `Found a components/ import of the server-only modules in: ${offenders.join(", ")}`).toEqual(
      [],
    );
  });

  it("(e) app/actions/contact.ts hands the per-visitor limit to submitContact", () => {
    const source = readFileSync(join(REPO_ROOT, "app/actions/contact.ts"), "utf8");
    expect(stripComments(source)).toContain("allowSend: takeContactSendSlotForRequest");
  });

  it("(d) the non-test files in lib/contact/ import nothing from react, next, next/*, or @clerk/", () => {
    const contactDir = join(REPO_ROOT, "lib/contact");
    const offenders: string[] = [];
    for (const file of collectSourceFiles(contactDir)) {
      if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) continue;
      const source = readFileSync(file, "utf8");
      if (/from\s+["']react["']/.test(source) || /from\s+["']next(\/|["'])/.test(source) || /from\s+["']@clerk\//.test(source)) {
        offenders.push(file);
      }
    }
    expect(offenders, `Found a browser/server framework import in: ${offenders.join(", ")}`).toEqual([]);
  });
});
