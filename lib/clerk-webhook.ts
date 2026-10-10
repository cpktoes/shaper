import type { WebhookEvent } from "@clerk/nextjs/webhooks";
import type { SignUpNoticeOutcome, SignUpUser } from "./contact/sign-up-notice";

/**
 * Phase 13 item 11a (the founder's choice, 2026-09-30): Clerk calls the route that wires this
 * core when a shaper deletes their own account from Manage account, or the founder deletes it
 * from Clerk's dashboard. This file is the pure-ish middle of that path — no import from Clerk's
 * runtime, the database, `process.env` or `console`, so every behavior below is provable with
 * injected fakes (lib/clerk-webhook.test.ts) before anything touches a real request.
 *
 * The route is open to the internet on purpose (D-01 — nothing in this app is gated by sign-in,
 * and Clerk's own server is never signed in). Clerk's signature, verified by the deps.verify
 * function the route wires in, is the only guard; there is no auth() check here or anywhere on
 * this path.
 *
 * A bland "Webhook refused" answers every verification failure the same way, whether the request
 * carried no signature at all, a tampered body, or a stale secret — so a stranger probing the
 * address learns nothing about which check failed. A 500 ("Webhook failed") means "something on
 * this end went wrong, Clerk — please retry"; Clerk's own retry schedule is what eventually
 * cleans up a transient database hiccup. Errors are never logged: Drizzle's own query errors put
 * their SQL parameters — the Clerk user id being deleted — into the error's message, so passing
 * that message to `deps.log` would print exactly the identifier this file exists to keep private.
 *
 * Quick 261010-j2f: the same endpoint now handles a second event. A verified `user.created` tells
 * the founder, by email through `deps.notifySignUp`, that a new shaper made an account. Unlike a
 * failed delete, a failed or skipped sign-up email still answers 200 — the body says which
 * happened ("Sign-up email sent" / "...skipped: no email key on this server" / "...failed") and
 * shows in Clerk's Message log, where the founder can press Clerk's own Resend once the email
 * service is back. Answering 500 would make Clerk retry for a day and a half, risk a duplicate
 * (a Resend reply lost to the timeout may still have delivered), and could end with Clerk
 * switching off the endpoint that also carries account deletion. A thrown notifySignUp counts as
 * "failed"; the caught error is never logged, and no body or log line here ever carries the new
 * shaper's name, email address or Clerk id. The response bodies are seven fixed strings, none
 * identifying.
 */

export type AccountDataDeleted = { boards: number; settings: number };

export type ClerkWebhookLogLevel = "info" | "warn" | "error";

export type ClerkWebhookDeps = {
  signingSecretSet: boolean;
  verify: (request: Request) => Promise<WebhookEvent>;
  deleteAccountData: (clerkUserId: string) => Promise<AccountDataDeleted>;
  notifySignUp: (user: SignUpUser) => Promise<SignUpNoticeOutcome>;
  log: (level: ClerkWebhookLogLevel, line: string) => void;
};

/** The seven fixed response bodies that never carry anything identifying. */
export const CLERK_WEBHOOK_BODIES = Object.freeze({
  refused: "Webhook refused",
  ignored: "Ignored",
  nothingToDelete: "Nothing to delete",
  failed: "Webhook failed",
  signUpEmailSent: "Sign-up email sent",
  signUpEmailSkipped: "Sign-up email skipped: no email key on this server",
  signUpEmailFailed: "Sign-up email failed",
});

function textResponse(body: string, status: number): Response {
  return new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8" } });
}

export async function handleClerkWebhook(request: Request, deps: ClerkWebhookDeps): Promise<Response> {
  if (!deps.signingSecretSet) {
    deps.log("warn", "Clerk webhook: refused — no signing secret is set on this server");
    return textResponse(CLERK_WEBHOOK_BODIES.refused, 400);
  }

  let event: WebhookEvent;
  try {
    event = await deps.verify(request);
  } catch {
    // Never pass the caught error, its message or the request body to the log — see header.
    deps.log("warn", "Clerk webhook: refused — the signature did not verify");
    return textResponse(CLERK_WEBHOOK_BODIES.refused, 400);
  }

  return handleClerkEvent(event, deps);
}

export async function handleClerkEvent(event: WebhookEvent, deps: ClerkWebhookDeps): Promise<Response> {
  if (event.type === "user.created") {
    let outcome: SignUpNoticeOutcome;
    try {
      outcome = await deps.notifySignUp(event.data);
    } catch {
      // Never log the caught error or its message — it could carry the new shaper's email.
      outcome = "failed";
    }

    if (outcome === "sent") {
      deps.log("info", "Clerk webhook: user.created — sign-up email sent");
      return textResponse(CLERK_WEBHOOK_BODIES.signUpEmailSent, 200);
    }
    if (outcome === "skipped") {
      deps.log("info", "Clerk webhook: user.created — sign-up email skipped (no RESEND_API_KEY on this server)");
      return textResponse(CLERK_WEBHOOK_BODIES.signUpEmailSkipped, 200);
    }
    deps.log("error", "Clerk webhook: user.created — the sign-up email did not send; answering 200 so Clerk does not retry");
    return textResponse(CLERK_WEBHOOK_BODIES.signUpEmailFailed, 200);
  }

  if (event.type !== "user.deleted") {
    deps.log("info", `Clerk webhook: ignored event of type ${event.type}`);
    return textResponse(CLERK_WEBHOOK_BODIES.ignored, 200);
  }

  const clerkUserId = event.data.id;
  if (typeof clerkUserId !== "string" || clerkUserId.length === 0) {
    deps.log("info", "Clerk webhook: user.deleted carried no usable id — nothing to delete");
    return textResponse(CLERK_WEBHOOK_BODIES.nothingToDelete, 200);
  }

  try {
    const { boards, settings } = await deps.deleteAccountData(clerkUserId);
    deps.log(
      "info",
      `Clerk webhook: user.deleted — deleted saved boards ${boards}, settings rows ${settings}`,
    );
    return textResponse(`Deleted: saved boards ${boards}, settings rows ${settings}`, 200);
  } catch {
    // Never log the caught error or its message — see header (Drizzle's message carries the id).
    deps.log("error", "Clerk webhook: the delete failed; answering 500 so Clerk retries");
    return textResponse(CLERK_WEBHOOK_BODIES.failed, 500);
  }
}
