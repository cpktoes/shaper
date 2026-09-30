import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { describe, expect, it, vi } from "vitest";
import type { AccountDataDeleted, ClerkWebhookDeps, ClerkWebhookLogLevel } from "./clerk-webhook";
import { CLERK_WEBHOOK_BODIES, handleClerkWebhook } from "./clerk-webhook";
import { buildSignedWebhookRequest, buildUnsignedRequest, createTestSigningSecret } from "./clerk-webhook-test-signing";

/**
 * @clerk/nextjs/webhooks types verifyWebhook's parameter as NextRequest-only (`RequestLike`), but
 * its own implementation (node_modules/@clerk/nextjs/dist/cjs/webhooks.js) passes a plain Web
 * `Request` straight through to @clerk/backend's verifyWebhook unchanged when
 * `isRequestWebAPI(request)` is true — see app/api/webhooks/clerk/route.ts's matching comment.
 * This wraps that one cast so the real-signature cases below can call it with a standard Request.
 */
type ClerkVerifyRequest = Parameters<typeof verifyWebhook>[0];
function verifyReal(signingSecret: string) {
  return (r: Request) => verifyWebhook(r as unknown as ClerkVerifyRequest, { signingSecret });
}

/**
 * TDD RED for quick 260930-ckm, Task 1: the pure-ish core with every dependency injected as a
 * fake. Proves the eight behaviors the plan lists, including the real-signature cases (behavior
 * 8), before lib/clerk-webhook.ts exists. Every case also checks that no recorded log line and no
 * response body ever contains the shaper's Clerk user id, an email address, or a thrown error's
 * own message — because Drizzle's own query errors carry the id in their message, and this app
 * never repeats what Clerk tells it back into a log a stranger could read.
 */

const USER_ID = "user_test_2abc";
const EMAIL = "shaper@example.com";

type RecordedLog = { level: ClerkWebhookLogLevel; line: string };

function makeDeps(overrides: Partial<ClerkWebhookDeps> = {}): {
  deps: ClerkWebhookDeps;
  logs: RecordedLog[];
  verify: ReturnType<typeof vi.fn>;
  deleteAccountData: ReturnType<typeof vi.fn>;
} {
  const logs: RecordedLog[] = [];
  const verify = vi.fn(async () => ({
    type: "user.deleted",
    object: "event",
    data: { object: "user", id: USER_ID, deleted: true },
    event_attributes: { http_request: { client_ip: "", user_agent: "" } },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  })) as any;
  const deleteAccountData = vi.fn(async (): Promise<AccountDataDeleted> => ({ boards: 2, settings: 1 }));
  const deps: ClerkWebhookDeps = {
    signingSecretSet: true,
    verify,
    deleteAccountData,
    log: (level, line) => logs.push({ level, line }),
    ...overrides,
  };
  return { deps, logs, verify, deleteAccountData };
}

function fakeRequest(): Request {
  return new Request("https://www.shaperassistant.com/api/webhooks/clerk", { method: "POST", body: "{}" });
}

/** No response body text and no recorded log line may contain any of the given needles. */
function expectNothingLeaked(bodyText: string, logs: RecordedLog[], needles: string[]) {
  for (const needle of needles) {
    expect(bodyText).not.toContain(needle);
    for (const { line } of logs) {
      expect(line).not.toContain(needle);
    }
  }
}

describe("handleClerkWebhook", () => {
  it("1. no signing secret set on the server -> 400, verify and deleteAccountData never called, one warn line", async () => {
    const { deps, logs, verify, deleteAccountData } = makeDeps({ signingSecretSet: false });
    const response = await handleClerkWebhook(fakeRequest(), deps);

    expect(response.status).toBe(400);
    expect(await response.text()).toBe(CLERK_WEBHOOK_BODIES.refused);
    expect(verify).not.toHaveBeenCalled();
    expect(deleteAccountData).not.toHaveBeenCalled();
    expect(logs).toHaveLength(1);
    expect(logs[0].level).toBe("warn");
    expect(logs[0].line.toLowerCase()).toContain("signing secret");
  });

  it("2. verify rejects -> 400, deleteAccountData never called, one warn line that omits the thrown message", async () => {
    const thrown = new Error("Unable to verify incoming webhook: no matching signature found");
    const { deps, logs, deleteAccountData } = makeDeps({ verify: vi.fn(async () => Promise.reject(thrown)) });
    const response = await handleClerkWebhook(fakeRequest(), deps);

    expect(response.status).toBe(400);
    expect(await response.text()).toBe(CLERK_WEBHOOK_BODIES.refused);
    expect(deleteAccountData).not.toHaveBeenCalled();
    expect(logs).toHaveLength(1);
    expect(logs[0].level).toBe("warn");
    expect(logs[0].line).not.toContain(thrown.message);
    expect(logs[0].line).not.toContain("no matching signature");
  });

  it("3. user.deleted with an id -> deleteAccountData called once with that id, 200 with both counts, one info line", async () => {
    const { deps, logs, deleteAccountData } = makeDeps();
    const response = await handleClerkWebhook(fakeRequest(), deps);

    expect(deleteAccountData).toHaveBeenCalledTimes(1);
    expect(deleteAccountData).toHaveBeenCalledWith(USER_ID);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("Deleted: saved boards 2, settings rows 1");
    const infoLines = logs.filter((l) => l.level === "info");
    expect(infoLines).toHaveLength(1);
    expect(infoLines[0].line).toContain("user.deleted");
    expect(infoLines[0].line).toContain("2");
    expect(infoLines[0].line).toContain("1");
  });

  it("4. a repeat delivery resolving zero counts is still 200 and idempotent", async () => {
    const { deps } = makeDeps({ deleteAccountData: vi.fn(async () => ({ boards: 0, settings: 0 })) });
    const response = await handleClerkWebhook(fakeRequest(), deps);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("Deleted: saved boards 0, settings rows 0");
  });

  it.each([
    ["missing id", undefined],
    ["empty string id", ""],
    ["non-string id", 12345 as unknown as string],
  ])("5. user.deleted with %s -> 200 'Nothing to delete', deleteAccountData never called", async (_label, id) => {
    const { deps, deleteAccountData } = makeDeps({
      verify: vi.fn(async () => ({
        type: "user.deleted",
        object: "event",
        data: { object: "user", id, deleted: true },
        event_attributes: { http_request: { client_ip: "", user_agent: "" } },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      })) as any,
    });
    const response = await handleClerkWebhook(fakeRequest(), deps);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe(CLERK_WEBHOOK_BODIES.nothingToDelete);
    expect(deleteAccountData).not.toHaveBeenCalled();
  });

  it.each(["user.created", "session.created", "email.created"])(
    "6. %s is acknowledged and ignored, deleteAccountData never called, the log names the type",
    async (eventType) => {
      const { deps, logs, deleteAccountData } = makeDeps({
        verify: vi.fn(async () => ({
          type: eventType,
          object: "event",
          data: { object: "user", id: "irrelevant", email_addresses: [{ email_address: EMAIL }] },
          event_attributes: { http_request: { client_ip: "", user_agent: "" } },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        })) as any,
      });
      const response = await handleClerkWebhook(fakeRequest(), deps);
      const bodyText = await response.text();

      expect(response.status).toBe(200);
      expect(bodyText).toBe(CLERK_WEBHOOK_BODIES.ignored);
      expect(deleteAccountData).not.toHaveBeenCalled();
      expect(logs.some((l) => l.line.includes(eventType))).toBe(true);
      expectNothingLeaked(bodyText, logs, [EMAIL]);
    },
  );

  it("7. deleteAccountData rejects with an error whose message carries the id -> 500, one error line that omits it", async () => {
    const drizzleShapedError = new Error(`Failed query: delete from "models" ...\nparams: ["${USER_ID}"]`);
    const { deps, logs } = makeDeps({ deleteAccountData: vi.fn(async () => Promise.reject(drizzleShapedError)) });
    const response = await handleClerkWebhook(fakeRequest(), deps);
    const bodyText = await response.text();

    expect(response.status).toBe(500);
    expect(bodyText).toBe(CLERK_WEBHOOK_BODIES.failed);
    const errorLines = logs.filter((l) => l.level === "error");
    expect(errorLines).toHaveLength(1);
    expectNothingLeaked(bodyText, logs, [USER_ID, drizzleShapedError.message]);
  });

  it("8. real signatures: a correctly signed user.deleted reaches deleteAccountData and answers 200", async () => {
    const { key, secret } = createTestSigningSecret();
    const body = JSON.stringify({ type: "user.deleted", data: { object: "user", id: USER_ID, deleted: true } });
    const request = buildSignedWebhookRequest({ url: "https://www.shaperassistant.com/api/webhooks/clerk", body, key });
    const { deps, deleteAccountData } = makeDeps({ verify: verifyReal(secret) });

    const response = await handleClerkWebhook(request, deps);

    expect(deleteAccountData).toHaveBeenCalledWith(USER_ID);
    expect(response.status).toBe(200);
  });

  it("8. real signatures: the body changed after signing -> 400, deleteAccountData never called", async () => {
    const { key, secret } = createTestSigningSecret();
    const signedBody = JSON.stringify({ type: "user.deleted", data: { object: "user", id: USER_ID, deleted: true } });
    const signed = buildSignedWebhookRequest({ url: "https://www.shaperassistant.com/api/webhooks/clerk", body: signedBody, key });
    const tamperedBody = JSON.stringify({ type: "user.deleted", data: { object: "user", id: "user_someone_else", deleted: true } });
    const tampered = new Request(signed.url, { method: "POST", body: tamperedBody, headers: signed.headers });
    const { deps, deleteAccountData } = makeDeps({ verify: verifyReal(secret) });

    const response = await handleClerkWebhook(tampered, deps);

    expect(response.status).toBe(400);
    expect(await response.text()).toBe(CLERK_WEBHOOK_BODIES.refused);
    expect(deleteAccountData).not.toHaveBeenCalled();
  });

  it("8. real signatures: signed with a different runtime-generated key -> 400", async () => {
    const { secret } = createTestSigningSecret();
    const { key: wrongKey } = createTestSigningSecret();
    const body = JSON.stringify({ type: "user.deleted", data: { object: "user", id: USER_ID, deleted: true } });
    const request = buildSignedWebhookRequest({ url: "https://www.shaperassistant.com/api/webhooks/clerk", body, key: wrongKey });
    const { deps, deleteAccountData } = makeDeps({ verify: verifyReal(secret) });

    const response = await handleClerkWebhook(request, deps);

    expect(response.status).toBe(400);
    expect(deleteAccountData).not.toHaveBeenCalled();
  });

  it("8. real signatures: signed with a timestamp 10 minutes in the past -> 400", async () => {
    const { key, secret } = createTestSigningSecret();
    const body = JSON.stringify({ type: "user.deleted", data: { object: "user", id: USER_ID, deleted: true } });
    const tenMinutesAgo = Math.floor(Date.now() / 1000) - 10 * 60;
    const request = buildSignedWebhookRequest({
      url: "https://www.shaperassistant.com/api/webhooks/clerk",
      body,
      key,
      timestampSeconds: tenMinutesAgo,
    });
    const { deps, deleteAccountData } = makeDeps({ verify: verifyReal(secret) });

    const response = await handleClerkWebhook(request, deps);

    expect(response.status).toBe(400);
    expect(deleteAccountData).not.toHaveBeenCalled();
  });

  it("8. real signatures: no svix headers at all -> 400", async () => {
    const { secret } = createTestSigningSecret();
    const body = JSON.stringify({ type: "user.deleted", data: { object: "user", id: USER_ID, deleted: true } });
    const request = buildUnsignedRequest("https://www.shaperassistant.com/api/webhooks/clerk", body);
    const { deps, deleteAccountData } = makeDeps({ verify: verifyReal(secret) });

    const response = await handleClerkWebhook(request, deps);

    expect(response.status).toBe(400);
    expect(deleteAccountData).not.toHaveBeenCalled();
  });
});
