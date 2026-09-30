import { expect, test } from "@playwright/test";
import { CLERK_WEBHOOK_BODIES } from "../lib/clerk-webhook";

/**
 * Quick 260930-ckm (Phase 13 item 11a): the from-the-outside proof that a stranger can't trigger
 * a deletion. Desktop project only — this is an HTTP proof against the dev server, not a
 * device-specific UI behavior, so it runs once rather than on every phone profile too
 * (e2e/desktop-regression.spec.ts's skip idiom).
 *
 * Signed requests are proved in lib/clerk-webhook-route.test.ts, because the dev server's real
 * signing secret (if it even has one) is not this test's to know. The real signed delivery is the
 * founder's own live test (quick plan 260930-ckm's user_setup step 4). It doesn't matter whether
 * the dev server has CLERK_WEBHOOK_SIGNING_SECRET set at all: an unsigned or forged request is
 * refused either way, with the same bland body.
 */

test.describe("POST /api/webhooks/clerk — unsigned and forged requests never reach the database", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop-only, HTTP proof — not a device-specific UI behavior");
  });

  test("E1. an unsigned POST is refused with the bland body, no redirect, and no user id echoed back", async ({
    request,
  }) => {
    const response = await request.post("/api/webhooks/clerk", {
      data: { type: "user.deleted", data: { object: "user", id: "user_playwright_fake", deleted: true } },
      headers: { "content-type": "application/json" },
      maxRedirects: 0,
    });

    expect(response.status()).toBe(400);
    const body = await response.text();
    expect(body).toBe(CLERK_WEBHOOK_BODIES.refused);
    expect(body).not.toContain("user_playwright_fake");
  });

  test("E2. a POST with made-up svix headers is refused the same way", async ({ request }) => {
    const response = await request.post("/api/webhooks/clerk", {
      data: { type: "user.deleted", data: { object: "user", id: "user_playwright_fake", deleted: true } },
      headers: {
        "content-type": "application/json",
        "svix-id": "msg_made_up",
        "svix-timestamp": String(Math.floor(Date.now() / 1000)),
        "svix-signature": "v1,bm90LWEtcmVhbC1zaWduYXR1cmU=",
      },
      maxRedirects: 0,
    });

    expect(response.status()).toBe(400);
    const body = await response.text();
    expect(body).toBe(CLERK_WEBHOOK_BODIES.refused);
    expect(body).not.toContain("user_playwright_fake");
  });

  test("E3. a GET is not served — the route answers POST only", async ({ request }) => {
    const response = await request.get("/api/webhooks/clerk", { maxRedirects: 0 });
    expect(response.status()).toBe(405);
  });
});
