import { createHmac, randomBytes } from "node:crypto";

/**
 * Test-only Standard Webhooks v1 signing, shared by lib/clerk-webhook.test.ts (behavior 8) and
 * lib/clerk-webhook-route.test.ts (R1–R6). Not a `.test.ts` file itself — it holds no key of its
 * own, only the recipe for making one and using it to sign a request the same way Clerk's server
 * would. Proven against `node_modules/standardwebhooks/dist/index.js` at plan time: the Webhook
 * class base64-decodes the "whsec_"-prefixed secret back into the same raw key bytes used here,
 * so signing with the raw bytes and handing verifyWebhook the base64 secret land on the same HMAC.
 */

const WEBHOOK_ID_HEADER = "svix-id";
const WEBHOOK_TIMESTAMP_HEADER = "svix-timestamp";
const WEBHOOK_SIGNATURE_HEADER = "svix-signature";

/** A freshly generated signing key and the "whsec_..." secret string derived from it. */
export function createTestSigningSecret(): { key: Buffer; secret: string } {
  const key = randomBytes(24);
  return { key, secret: `whsec_${key.toString("base64")}` };
}

function sign(key: Buffer, msgId: string, timestamp: string, body: string): string {
  return createHmac("sha256", key).update(`${msgId}.${timestamp}.${body}`).digest("base64");
}

/** Builds a POST Request whose svix-* headers verify against `key` for the given raw `body`. */
export function buildSignedWebhookRequest(options: {
  url: string;
  body: string;
  key: Buffer;
  msgId?: string;
  timestampSeconds?: number;
}): Request {
  const msgId = options.msgId ?? "msg_test_1";
  const timestamp = String(options.timestampSeconds ?? Math.floor(Date.now() / 1000));
  const signature = sign(options.key, msgId, timestamp, options.body);
  return new Request(options.url, {
    method: "POST",
    body: options.body,
    headers: {
      "content-type": "application/json",
      [WEBHOOK_ID_HEADER]: msgId,
      [WEBHOOK_TIMESTAMP_HEADER]: timestamp,
      [WEBHOOK_SIGNATURE_HEADER]: `v1,${signature}`,
    },
  });
}

/** An unsigned POST Request carrying no svix-* headers at all, for the "no headers" case. */
export function buildUnsignedRequest(url: string, body: string): Request {
  return new Request(url, {
    method: "POST",
    body,
    headers: { "content-type": "application/json" },
  });
}
