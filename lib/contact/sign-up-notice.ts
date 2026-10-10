/**
 * The sign-up note (quick 261010-j2f). The founder, 2026-10-10: "Can I get an email notification
 * for every contact that signs up?" — read as every new ACCOUNT made through Clerk. When Clerk
 * tells the site's webhook (`app/api/webhooks/clerk/route.ts`) that an account was created, the
 * route hands the signed payload here, and this file builds one short plain-text email to
 * support@shaperassistant.com and sends it through the Contact form's own Resend call
 * (`sendWithResend`): who they are (name if given, email), how they signed up, and when, in
 * Pacific time.
 *
 * Failures answer "failed" or "skipped" and never throw out of `notifyFounderOfSignUp`: the webhook
 * answers 200 whatever happens to the email, so Clerk never retries a sign-up note (a retry storm
 * could end with Clerk switching off the endpoint that also carries account deletion). This file
 * logs nothing itself except the one line `sendWithResend` already writes (status and Resend's
 * error name only). The note carries the name, the primary email, the sign-up route and the time —
 * never the Clerk user id, the IP address, the browser or the picture — and nothing here is ever
 * written to a log.
 *
 * No React, Next or Clerk import: lib/contact/ may not import @clerk/ (boundary (d) in
 * delivery.test.ts), so `SignUpUser` below declares only the fields this file reads. tsc proves
 * Clerk's own `UserJSON` fits it at the one call in `lib/clerk-webhook.ts`.
 */

import {
  CONTACT_EMAIL_PATTERN,
  CONTACT_LIMITS,
  CONTACT_RECIPIENT,
  CONTACT_SENDER,
  oneLine,
  type ResendSendBody,
} from "./message";
import { sendWithResend, type ContactDelivery } from "./delivery";

/** The measured slice of Clerk's user payload (`UserJSON`) this file reads. */
export type SignUpUser = {
  first_name?: string | null;
  last_name?: string | null;
  primary_email_address_id?: string | null;
  email_addresses?: ReadonlyArray<{
    id?: string;
    email_address?: string;
    verification?: { strategy?: string } | null;
    linked_to?: ReadonlyArray<{ type?: string }>;
  }>;
  external_accounts?: ReadonlyArray<{
    provider?: string;
    verification?: { strategy?: string } | null;
  }>;
  password_enabled?: boolean;
  created_at?: number;
};

export type SignUpNoticeOutcome = "sent" | "skipped" | "failed";

/** The founder works from Oceanside, CA; the note's time is always read in Pacific time. */
export const SIGN_UP_NOTICE_TIME_ZONE = "America/Los_Angeles";

export const SIGN_UP_NOTICE_COPY = {
  subjectLead: "New Shaper Assistant sign-up:",
  subjectNoWho: "an account with no name or email",
  intro: "A new shaper just created an account on Shaper Assistant.",
  nameMissing: "(not given)",
  emailMissing: "(none on the account)",
  timeZoneLabel: "(Pacific time)",
  signOff: "Sent automatically by shaperassistant.com when an account is created.",
  methods: {
    google: "Google",
    emailPassword: "Email and password",
    other: "Other",
  },
} as const;

/** Clerk's own spelling is `oauth_google`; its types say "e.g. google" — both are accepted. */
function isGoogleProvider(provider: string | undefined): boolean {
  return provider === "oauth_google" || provider === "google";
}

function primaryEmailEntry(user: SignUpUser) {
  const entries = user.email_addresses ?? [];
  const wanted = user.primary_email_address_id;
  return (
    (wanted ? entries.find((entry) => entry.id === wanted) : undefined) ?? entries[0] ?? undefined
  );
}

/** How the shaper arrived, in plain words. Order: Google, then the primary email's own route. */
export function signUpMethod(user: SignUpUser): string {
  const copy = SIGN_UP_NOTICE_COPY.methods;
  const primary = primaryEmailEntry(user);

  const googleByAccount = (user.external_accounts ?? []).some(
    (account) => isGoogleProvider(account.provider) || account.verification?.strategy === "oauth_google",
  );
  const googleByEmail =
    primary?.verification?.strategy === "from_oauth_google" ||
    (primary?.linked_to ?? []).some((link) => isGoogleProvider(link.type));
  if (googleByAccount || googleByEmail) return copy.google;

  const strategy = primary?.verification?.strategy;
  if ((strategy === "email_code" || strategy === "email_link") && user.password_enabled === true) {
    return copy.emailPassword;
  }

  return copy.other;
}

/**
 * "Saturday, October 10, 2026 at 2:15 PM PDT (Pacific time)". Assembled from `formatToParts` with
 * the Pacific time zone, so neither the server's own time zone nor an ICU version's joining words
 * can change it.
 */
export function formatSignUpTime(ms: number): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SIGN_UP_NOTICE_TIME_ZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  }).formatToParts(new Date(ms));
  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? "";
  return (
    `${part("weekday")}, ${part("month")} ${part("day")}, ${part("year")} at ` +
    `${part("hour")}:${part("minute")} ${part("dayPeriod")} ${part("timeZoneName")} ` +
    SIGN_UP_NOTICE_COPY.timeZoneLabel
  );
}

function capped(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) : text;
}

/** Name, primary email, route and time; name and email are "" when absent. */
export function describeSignUp(
  user: SignUpUser,
  fallbackNowMs: number,
): { name: string; email: string; method: string; when: string } {
  const name = capped(
    oneLine(`${user.first_name ?? ""} ${user.last_name ?? ""}`),
    CONTACT_LIMITS.nameMax,
  );
  const email = capped(oneLine(primaryEmailEntry(user)?.email_address ?? ""), CONTACT_LIMITS.emailMax);
  const created = user.created_at;
  const whenMs = typeof created === "number" && Number.isFinite(created) && created > 0 ? created : fallbackNowMs;
  return { name, email, method: signUpMethod(user), when: formatSignUpTime(whenMs) };
}

/** The exact Resend request: text only (never an `html` key), reply_to the shaper when valid. */
export function buildSignUpNotice(user: SignUpUser, nowMs: number): ResendSendBody {
  const copy = SIGN_UP_NOTICE_COPY;
  const { name, email, method, when } = describeSignUp(user, nowMs);
  const who = name !== "" ? name : email !== "" ? email : copy.subjectNoWho;
  const subject = capped(oneLine(`${copy.subjectLead} ${who}`), CONTACT_LIMITS.subjectMax);
  const text = [
    copy.intro,
    "",
    `Name: ${name !== "" ? name : copy.nameMissing}`,
    `Email: ${email !== "" ? email : copy.emailMissing}`,
    `Signed up with: ${method}`,
    `When: ${when}`,
    "",
    "--",
    copy.signOff,
  ].join("\n");
  const replyTo = email !== "" && CONTACT_EMAIL_PATTERN.test(email) ? email : CONTACT_RECIPIENT;
  return { from: CONTACT_SENDER, to: [CONTACT_RECIPIENT], subject, text, reply_to: replyTo };
}

/**
 * Sends the note through the Contact form's own Resend call. `none` (no key on this server, or the
 * browser suite's stand-in switch) is "skipped" with no network; the stand-in never touches the
 * network either. Anything thrown while building or sending is "failed".
 */
export async function notifyFounderOfSignUp(
  user: SignUpUser,
  deps: { delivery: ContactDelivery; nowMs: number; fetchImpl?: typeof fetch },
): Promise<SignUpNoticeOutcome> {
  const { delivery } = deps;
  if (delivery.kind === "none") return "skipped";
  if (delivery.kind === "stand-in") return delivery.outcome === "sent" ? "sent" : "failed";

  try {
    const body = buildSignUpNotice(user, deps.nowMs);
    const result = await sendWithResend(body, delivery.apiKey, deps.fetchImpl);
    return result.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}
