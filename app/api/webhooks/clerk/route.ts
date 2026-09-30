import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { handleClerkWebhook } from "@/lib/clerk-webhook";
import { deleteAccountData } from "@/lib/db/account-deletion";
import { db } from "@/lib/db/client";

/**
 * @clerk/nextjs/webhooks types verifyWebhook's parameter as NextRequest-only (`RequestLike`), but
 * its own implementation (node_modules/@clerk/nextjs/dist/cjs/webhooks.js) checks
 * `isRequestWebAPI(request)` first and, when true, passes a standard Web `Request` straight
 * through to @clerk/backend's verifyWebhook — which types its own parameter as plain `Request`.
 * The cast below bridges that upstream type gap; it changes nothing about what actually runs.
 */
type ClerkVerifyRequest = Parameters<typeof verifyWebhook>[0];

/**
 * https://www.shaperassistant.com/api/webhooks/clerk — the address Clerk calls when a shaper
 * deletes their own account (Manage account -> Delete account) or the founder deletes one from
 * Clerk's dashboard. The founder's four setup steps (turning the button on, adding this endpoint
 * in Clerk, and setting CLERK_WEBHOOK_SIGNING_SECRET in Vercel) live in quick plan 260930-ckm's
 * frontmatter, not in this file.
 *
 * No sign-in gate by design (D-01): Clerk's own server is never signed in, so an auth() check
 * here would refuse every real delivery. POST only — Clerk's signature, verified inside
 * handleClerkWebhook, is the only guard. lib/auth/open-access.test.ts fails if this file ever
 * grows a .protect() call, a redirect, or another HTTP-method export.
 */
export async function POST(request: Request): Promise<Response> {
  return handleClerkWebhook(request, {
    signingSecretSet: Boolean(process.env.CLERK_WEBHOOK_SIGNING_SECRET?.trim()),
    verify: (r) => verifyWebhook(r as unknown as ClerkVerifyRequest),
    deleteAccountData: (id) => deleteAccountData(db, id),
    log: (level, line) => console[level](line),
  });
}
