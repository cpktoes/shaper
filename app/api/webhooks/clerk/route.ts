import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { handleClerkWebhook } from "@/lib/clerk-webhook";
import { resolveContactDelivery } from "@/lib/contact/delivery";
import { notifyFounderOfSignUp } from "@/lib/contact/sign-up-notice";
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
 * It now also tells the founder about a new account (quick 261010-j2f): a signed `user.created`
 * sends one note to support@ through the Contact form's own Resend call, or is skipped with one
 * log line when this server has no RESEND_API_KEY. The founder's Clerk step (subscribing this
 * endpoint to user.created) lives in that quick plan's frontmatter. Everything comes from the
 * signed payload; the route never looks the shaper up from Clerk, and reads the environment per
 * request, never at module load.
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
    notifySignUp: (user) =>
      notifyFounderOfSignUp(user, {
        // A webhook carries no stand-in cookie, so the stand-in switch can only ever mean "skip".
        delivery: resolveContactDelivery({
          nodeEnv: process.env.NODE_ENV,
          standInFlag: process.env.SHAPER_CONTACT_STAND_IN,
          standInChoice: undefined,
          apiKey: process.env.RESEND_API_KEY,
        }),
        nowMs: Date.now(),
      }),
    log: (level, line) => console[level](line),
  });
}
